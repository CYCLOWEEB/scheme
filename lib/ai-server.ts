// Server imports only. No credentials, prompts or recordings are written to disk.
import { createHash } from 'node:crypto';
import type { AiFailure } from './ai-types';
import { normalizeSpeechLanguage, SARVAM_SPEECH_LANGUAGES } from './ai-language';

type Provider = 'gemini' | 'sarvam' | 'groq';
type Kind = 'text' | 'transcribe' | 'tts';
type Env = Record<string, string | undefined>;
type Json = Record<string, unknown>;
interface Target { provider: Provider; model: string }
interface WindowUse { at: number; tokens: number }
interface ModelUse {
  minute: WindowUse[]; day: string; calls: number; tokensToday: number; blockedUntil: number;
  remainingTokens?: number; tokensReset?: number; remainingRequests?: number; requestsReset?: number;
}
interface CacheEntry { value: unknown; expires: number; bytes: number }
export interface Generated<T> { value: T; model: string; cached: boolean; language?: string }

export class AiServiceError extends Error {
  constructor(public reason: AiFailure, public retryAfter = 0) {
    super(reason);
    this.name = 'AiServiceError';
  }
}

const TEXT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'] as const;
const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
// Use production models by default. Qwen remains an explicitly selected preview.
const GROQ_TEXT_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'] as const;
const GROQ_STT_MODEL = 'whisper-large-v3-turbo';
const SARVAM_TEXT_MODEL = 'sarvam-105b';
const SARVAM_STT_MODEL = 'saaras:v4';
const SARVAM_TTS_MODEL = 'bulbul:v3';
const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const CACHE_TTL = 30 * 60_000;
const CACHE_BYTES = 12 * 1024 * 1024;
const MAX_IN_FLIGHT = 3;

function integer(env: Env, name: string, fallback: number, maximum: number) {
  const value = Number(env[name]);
  return env[name] !== undefined && Number.isInteger(value) && value >= 0 && value <= maximum ? value : fallback;
}

function configuredKey(value: string | undefined) {
  const key = value?.trim() || '';
  return /^(YOUR_|REPLACE_|PASTE_)/i.test(key) ? '' : key;
}

function durationMs(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parts = [...value.matchAll(/([\d.]+)(ms|s|m|h)/g)];
  const result = parts.reduce((sum, match) => sum + Number(match[1])
    * ({ ms: 1, s: 1000, m: 60_000, h: 3_600_000 }[match[2]] ?? 0), 0);
  return result > 0 && Number.isFinite(result) ? result : fallback;
}

function object(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
}

// Abort must end our wait even if a transport ignores AbortSignal.
async function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let abort: () => void = () => undefined;
  const stopped = new Promise<never>((_, reject) => {
    abort = () => reject(new AiServiceError('timeout'));
    signal.addEventListener('abort', abort, { once: true });
  });
  try { return await Promise.race([work, stopped]); }
  finally { signal.removeEventListener('abort', abort); }
}

async function boundedJson(response: Response, signal: AbortSignal, maximum: number): Promise<unknown> {
  if (!response.body) throw new AiServiceError('invalid_response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let complete = false;
  try {
    if (Number(response.headers.get('content-length')) > maximum) throw new AiServiceError('invalid_response');
    while (true) {
      const { value, done } = await abortable(reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new AiServiceError('invalid_response');
      chunks.push(value);
    }
    complete = true;
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new AiServiceError('invalid_response'); }
  } finally {
    if (!complete) void reader.cancel().catch(() => undefined);
    // An ignored transport abort may leave read() pending; cancellation releases it.
    try { reader.releaseLock(); } catch { /* Pending transport cleanup. */ }
  }
}

// Read only final model output: never accidentally return user input or thoughts.
export function interactionContent(value: unknown): Json[] {
  const response = object(value);
  if (response.status !== 'completed') throw new AiServiceError('invalid_response');
  return (Array.isArray(response.steps) ? response.steps : []).flatMap(step => {
    const item = object(step);
    return item.type === 'model_output' && Array.isArray(item.content) ? item.content.map(object) : [];
  });
}

export function interactionText(value: unknown) {
  const text = interactionContent(value).filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text as string).join('').trim();
  if (!text || text.length > 20_000) throw new AiServiceError('invalid_response');
  return text;
}

export function interactionAudio(value: unknown) {
  const block = interactionContent(value).findLast(part => part.type === 'audio' && typeof part.data === 'string');
  return wavAudio(block?.data);
}

function wavAudio(data: unknown) {
  if (typeof data !== 'string' || !data || data.length > 10_000_000 || data.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new AiServiceError('invalid_response');
  const bytes = Buffer.from(data, 'base64');
  // Explicitly request WAV and verify the container before sending it to a browser.
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF'
    || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new AiServiceError('invalid_response');
  return { data: bytes.toString('base64'), mimeType: 'audio/wav' };
}

// CLI speech probes have WAV duration in their container. Browser recordings
// supply their elapsed recording time; unknown/long audio skips Sarvam's 30s REST API.
function wavDuration(audio: string, mimeType: string) {
  if (mimeType !== 'audio/wav') return undefined;
  const bytes = Buffer.from(audio, 'base64');
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return undefined;
  let byteRate = 0;
  let dataBytes = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + size;
    if (end > bytes.length) return undefined;
    const tag = bytes.toString('ascii', offset, offset + 4);
    if (tag === 'fmt ' && size >= 16) byteRate = bytes.readUInt32LE(offset + 16);
    if (tag === 'data') dataBytes += size;
    offset = end + (size % 2);
  }
  return byteRate > 0 && dataBytes > 0 ? dataBytes / byteRate : undefined;
}

export function retryDelay(headers: Headers, body: unknown, now: number) {
  const header = headers.get('retry-after');
  const seconds = header ? Number(header) : NaN;
  let delay = Number.isFinite(seconds) ? seconds * 1000 : header ? Date.parse(header) - now : 60_000;
  const details = object(object(body).error).details;
  if (Array.isArray(details)) {
    for (const detail of details) {
      const match = String(object(detail).retryDelay || '').match(/^([\d.]+)s$/);
      if (match) delay = Math.max(delay || 0, Number(match[1]) * 1000);
    }
  }
  return Math.min(24 * 60 * 60_000, Math.max(1_000, Number.isFinite(delay) ? delay : 60_000));
}

// Isolated factory makes failures, timeouts, quotas and duplicate calls testable without spending credits.
export function createAiGateway(options: {
  env?: () => Env; fetch?: typeof fetch; now?: () => number; attemptTimeoutMs?: number; random?: () => number;
} = {}) {
  const environment = options.env ?? (() => process.env);
  const fetcher = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? Date.now;
  const uses = new Map<string, ModelUse>();
  const blockedProviders = new Map<string, { until: number; reason: AiFailure }>();
  const circuits = new Map<string, { failures: number; until: number; probe: boolean; reason: AiFailure }>();
  const cache = new Map<string, CacheEntry>();
  const pending = new Map<string, Promise<Generated<unknown>>>();
  let cacheBytes = 0;
  let day = '';
  let calls = 0;
  let sarvamReservedRupees = 0;
  let cacheHits = 0;
  let fallbackSuccesses = 0;
  const usageByProvider = Object.fromEntries(['gemini', 'groq', 'sarvam'].map(provider => [provider,
    { attempts: 0, successes: 0, failures: 0, estimatedTokensReserved: 0, reportedTokensUsed: 0 }])) as Record<Provider,
      { attempts: number; successes: number; failures: number; estimatedTokensReserved: number; reportedTokensUsed: number }>;

  function settings() {
    const env = environment();
    const selected = (env.GEMINI_TEXT_MODELS ?? TEXT_MODELS[0]).split(',').map(s => s.trim());
    const models = [...new Set(selected.filter(model => TEXT_MODELS.includes(model as typeof TEXT_MODELS[number])))];
    const groqModels = [...new Set((env.GROQ_TEXT_MODELS ?? GROQ_TEXT_MODELS[0]).split(',').map(s => s.trim())
      .filter(model => GROQ_TEXT_MODELS.includes(model as typeof GROQ_TEXT_MODELS[number])))];
    return { env, enabled: env.AI_ENABLED !== 'false', gemini: configuredKey(env.GEMINI_API_KEY),
      sarvam: configuredKey(env.SARVAM_API_KEY), groq: configuredKey(env.GROQ_API_KEY), models, groqModels,
      primary: env.AI_TEXT_PRIMARY === 'groq' ? 'groq' as const : 'gemini' as const,
      sarvamTextFallback: env.AI_SARVAM_TEXT_FALLBACK === 'true',
      sarvamBudget: integer(env, 'AI_SARVAM_MAX_ESTIMATED_RUPEES', 50, 200),
      cap: integer(env, 'AI_MAX_CALLS_PER_DAY', 60, 1000) };
  }

  function keyFor(provider: Provider) {
    const config = settings();
    return config[provider];
  }

  function fingerprint() {
    const config = settings();
    return createHash('sha256').update(JSON.stringify([config.enabled, config.gemini, config.sarvam, config.groq,
      config.models, config.groqModels, config.primary, config.sarvamTextFallback])).digest('hex');
  }

  function budgetKey(target: Target) {
    return createHash('sha256').update(keyFor(target.provider)).digest('hex') + ':' + target.provider + ':' + target.model;
  }

  function reserve(target: Target, tokens: number, kind: Kind, estimatedRupees: number) {
    const config = settings();
    const clock = now();
    const today = new Date(clock).toISOString().slice(0, 10);
    if (day !== today) { day = today; calls = 0; }
    if (calls >= config.cap) throw new AiServiceError('daily_limit');
    const id = budgetKey(target);
    const providerId = target.provider + ':' + fingerprint();
    const blocked = blockedProviders.get(providerId);
    if (blocked && blocked.until > clock) throw new AiServiceError(blocked.reason, Math.ceil((blocked.until - clock) / 1000));
    const use: ModelUse = uses.get(id) ?? { minute: [], day: today, calls: 0, tokensToday: 0, blockedUntil: 0 };
    if (use.day !== today) { use.day = today; use.calls = 0; use.tokensToday = 0; }
    use.minute = use.minute.filter(item => item.at > clock - 60_000);
    uses.set(id, use);
    const gemini = target.provider === 'gemini';
    const sarvam = target.provider === 'sarvam';
    const rpm = gemini ? integer(config.env, kind === 'tts' ? 'AI_GEMINI_TTS_RPM' : 'AI_GEMINI_RPM', kind === 'tts' ? 2 : 3, 60)
      : sarvam ? 6 : 10;
    const rpd = gemini ? integer(config.env, 'AI_GEMINI_RPD', 20, 1000) : sarvam ? 20 : 50;
    const tpm = gemini ? integer(config.env, 'AI_GEMINI_TPM', 12_000, 1_000_000)
      : kind === 'text' ? sarvam ? 20_000 : 7_000 : Infinity;
    if (use.blockedUntil > clock) throw new AiServiceError('rate_limit', Math.ceil((use.blockedUntil - clock) / 1000));
    if (use.calls >= rpd || (target.provider === 'groq' && kind === 'text' && use.tokensToday + tokens > 180_000)) throw new AiServiceError('daily_limit');
    // A conservative local reservation, never an assertion of provider balance.
    // It is lifetime-per-process and does NOT replenish at midnight or on key rotation.
    if (sarvam && sarvamReservedRupees + estimatedRupees > config.sarvamBudget) throw new AiServiceError('daily_limit');
    if ((use.tokensReset ?? 0) > clock && (use.remainingTokens ?? Infinity) < tokens) {
      throw new AiServiceError('rate_limit', Math.ceil((use.tokensReset! - clock) / 1000));
    }
    if ((use.requestsReset ?? 0) > clock && use.remainingRequests === 0) {
      throw new AiServiceError('rate_limit', Math.ceil((use.requestsReset! - clock) / 1000));
    }
    if (use.minute.length >= rpm || tokens + use.minute.reduce((sum, item) => sum + item.tokens, 0) > tpm) {
      throw new AiServiceError('rate_limit', 60);
    }
    const window = { at: clock, tokens };
    use.minute.push(window);
    use.calls++;
    use.tokensToday += tokens;
    if ((use.tokensReset ?? 0) > clock && use.remainingTokens !== undefined) use.remainingTokens -= tokens;
    if ((use.requestsReset ?? 0) > clock && use.remainingRequests !== undefined) use.remainingRequests--;
    calls++; // Failed attempts consume the allowance too. Reserve before the first await.
    usageByProvider[target.provider].attempts++;
    usageByProvider[target.provider].estimatedTokensReserved += tokens;
    if (sarvam) sarvamReservedRupees += estimatedRupees;
    return { use, window, day: today };
  }

  async function request(target: Target, kind: Kind, body: Json | FormData, tokens: number, deadline: number, estimatedRupees = 0) {
    const remaining = deadline - now();
    if (remaining < 200) throw new AiServiceError('timeout');
    const reservation = reserve(target, tokens, kind, estimatedRupees);
    const controller = new AbortController();
    // Give every independent provider time within the overall operation deadline.
    const timeoutMs = Math.min(options.attemptTimeoutMs ?? (kind === 'text' ? 18_000 : kind === 'transcribe' ? 7_500 : 8_000), remaining);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const isForm = body instanceof FormData;
      const url = target.provider === 'gemini' ? INTERACTIONS_URL
        : target.provider === 'sarvam' ? 'https://api.sarvam.ai/' + (kind === 'text' ? 'v1/chat/completions' : kind === 'tts' ? 'text-to-speech' : 'speech-to-text')
        : 'https://api.groq.com/openai/v1/' + (kind === 'text' ? 'chat/completions' : 'audio/transcriptions');
      const headers: Record<string, string> = target.provider === 'gemini'
        ? { 'x-goog-api-key': keyFor('gemini') } : target.provider === 'sarvam'
          ? { 'api-subscription-key': keyFor('sarvam') } : { Authorization: 'Bearer ' + keyFor('groq') };
      if (!isForm) headers['Content-Type'] = 'application/json';
      const response = await abortable(fetcher(url, { method: 'POST', headers,
        body: isForm ? body : JSON.stringify(body), signal: controller.signal, cache: 'no-store' }), controller.signal);
      if (target.provider === 'groq') {
        const use = uses.get(budgetKey(target))!;
        const tokenHeader = response.headers.get('x-ratelimit-remaining-tokens');
        const requestHeader = response.headers.get('x-ratelimit-remaining-requests');
        if (tokenHeader !== null && Number.isFinite(Number(tokenHeader))) {
          use.remainingTokens = Math.max(0, Number(tokenHeader));
          use.tokensReset = now() + durationMs(response.headers.get('x-ratelimit-reset-tokens'), 60_000);
        }
        if (requestHeader !== null && Number.isFinite(Number(requestHeader))) {
          use.remainingRequests = Math.max(0, Number(requestHeader));
          use.requestsReset = now() + durationMs(response.headers.get('x-ratelimit-reset-requests'), 60_000);
        }
      }
      // Keep the timer active through body consumption, including a stalled JSON body.
      let value: unknown;
      try { value = await boundedJson(response, controller.signal, kind === 'tts' ? 11_000_000 : 128_000); }
      catch (error) {
        // A proxy can return HTML for a genuine 429/503. Retain the HTTP status.
        if (response.ok || controller.signal.aborted) throw error;
        value = null;
      }
      const providerError = object(object(value).error);
      if (/safety|prohibited_content|content_filter/i.test(String(providerError.code ?? '') + String(providerError.status ?? ''))) {
        throw new AiServiceError('blocked');
      }
      if (!response.ok) {
        const use = uses.get(budgetKey(target))!;
        if (response.status === 401 || response.status === 403) {
          blockedProviders.set(target.provider + ':' + fingerprint(), { until: now() + 5 * 60_000, reason: 'authentication' });
          throw new AiServiceError('authentication');
        }
        if (response.status === 402) {
          // Credits are shared across Sarvam APIs. Pause the entire provider,
          // rather than paying for more attempts on another model with no balance.
          blockedProviders.set(target.provider + ':' + fingerprint(), { until: now() + 24 * 60 * 60_000, reason: 'daily_limit' });
          throw new AiServiceError('daily_limit');
        }
        if (response.status === 429) {
          const delay = retryDelay(response.headers, value, now());
          // A daily/zero quota cannot be fixed by immediately retrying the same model.
          const quota = JSON.stringify(value);
          const daily = /per.?day|daily|quotaValue["\s:]+["]?0(?:["},\s]|$)/i.test(quota);
          use.blockedUntil = now() + (daily ? 24 * 60 * 60_000 : delay);
          throw new AiServiceError(daily ? 'daily_limit' : 'rate_limit', Math.ceil(delay / 1000));
        }
        if ([400, 404, 410].includes(response.status)) {
          use.blockedUntil = now() + 10 * 60_000;
          throw new AiServiceError('model_unavailable');
        }
        use.blockedUntil = now() + 30_000;
        throw new AiServiceError('unavailable');
      }
      if (controller.signal.aborted) throw new AiServiceError('timeout');
      if (!value) throw new AiServiceError('invalid_response');
      // Reservations protect concurrent requests. Once the provider reports real
      // usage, release the unused tokens so normal follow-up requests are not
      // rejected as if every answer consumed its entire maximum output budget.
      const usage = object(object(value).usage);
      const actualTokens = usage.total_tokens
        ?? (typeof usage.total_input_tokens === 'number' && typeof usage.total_output_tokens === 'number'
          ? usage.total_input_tokens + usage.total_output_tokens : undefined);
      if (kind === 'text' && typeof actualTokens === 'number' && Number.isSafeInteger(actualTokens)
        && actualTokens > 0 && actualTokens <= 10_000_000) {
        reservation.window.tokens = actualTokens;
        if (reservation.use.day === reservation.day) reservation.use.tokensToday += actualTokens - tokens;
        usageByProvider[target.provider].reportedTokensUsed += actualTokens;
      }
      return value;
    } catch (error) {
      if (controller.signal.aborted) throw new AiServiceError('timeout');
      if (error instanceof AiServiceError) throw error;
      throw new AiServiceError('unavailable');
    } finally {
      clearTimeout(timer);
    }
  }

  function evict() {
    for (const [key, entry] of cache) {
      if (entry.expires <= now()) { cache.delete(key); cacheBytes -= entry.bytes; }
    }
    while (cache.size > 64 || cacheBytes > CACHE_BYTES) {
      const first = cache.entries().next().value;
      if (!first) break;
      cacheBytes -= first[1].bytes;
      cache.delete(first[0]);
    }
  }

  async function generate<T>(kind: Kind, input: unknown, worker: (deadline: number) => Promise<{ value: T; model: string; language?: string }>): Promise<Generated<T>> {
    const config = settings();
    if (!config.enabled) throw new AiServiceError('disabled');
    if (!config.gemini && !config.sarvam && !config.groq) throw new AiServiceError('not_configured');
    // Keys are hashed; complete validated results alone enter the bounded memory cache.
    const key = createHash('sha256').update(fingerprint() + kind + JSON.stringify(input)).digest('hex');
    evict();
    const hit = cache.get(key);
    if (hit) { cacheHits++; return { ...hit.value as Generated<T>, cached: true }; }
    const inflight = pending.get(key);
    if (inflight) { const result = await inflight as Generated<T>; cacheHits++; return { ...result, cached: true }; }
    if (pending.size >= MAX_IN_FLIGHT) throw new AiServiceError('rate_limit', 5);
    const work = worker(now() + (kind === 'text' ? 36_000 : kind === 'transcribe' ? 24_000 : 18_000)).then(result => {
      const value = { ...result, cached: false };
      const bytes = Buffer.byteLength(JSON.stringify(value));
      cache.set(key, { value, expires: now() + CACHE_TTL, bytes });
      cacheBytes += bytes;
      evict();
      return value;
    });
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  }

  async function tryTargets<T>(targets: Target[], deadline: number, run: (target: Target, attemptDeadline: number) => Promise<T>) {
    let failure = new AiServiceError('not_configured');
    for (const [index, target] of targets.entries()) {
      if (now() >= deadline) throw new AiServiceError('timeout');
      const id = budgetKey(target);
      const circuit = circuits.get(id);
      if (circuit && (circuit.until > now() || circuit.probe)) {
        failure = new AiServiceError(circuit.reason, Math.max(1, Math.ceil((circuit.until - now()) / 1000)));
        continue;
      }
      // Allow one recovery probe after cooldown, even under concurrent traffic.
      if (circuit) circuit.probe = true;
      const before = usageByProvider[target.provider].attempts;
      let attempted = false;
      try {
        const attemptDeadline = Math.min(deadline, now() + Math.floor((deadline - now()) / (targets.length - index)));
        const work = run(target, attemptDeadline);
        attempted = usageByProvider[target.provider].attempts > before;
        const value = await work;
        circuits.delete(id);
        usageByProvider[target.provider].successes++;
        if (index > 0) fallbackSuccesses++;
        return { value, model: target.provider + '/' + target.model };
      }
      catch (error) {
        failure = error instanceof AiServiceError ? error : new AiServiceError('unavailable');
        if (attempted) usageByProvider[target.provider].failures++;
        // Avoid paying/waiting for the same broken endpoint on every new question.
        if (attempted && ['timeout', 'unavailable', 'invalid_response'].includes(failure.reason)) {
          const failures = (circuit?.failures ?? 0) + 1;
          const delay = Math.min(300_000, 30_000 * 2 ** Math.min(failures - 1, 4))
            + Math.floor((options.random ?? Math.random)() * 1000);
          circuits.set(id, { failures, until: now() + delay, probe: false, reason: failure.reason });
        }
        // Do not route safety refusals through another provider.
        if (failure.reason === 'blocked') break;
      } finally {
        const current = circuits.get(id);
        if (current) current.probe = false;
      }
    }
    throw failure;
  }

  return {
    async text(system: string, prompt: string, validation?: { key: string; check: (text: string) => void }) {
      const generated = await generate('text', [system, prompt, validation?.key], async deadline => {
        const config = settings();
        const google: Target[] = config.gemini ? config.models.map(model => ({ provider: 'gemini', model })) : [];
        const groq: Target[] = config.groq ? config.groqModels.map(model => ({ provider: 'groq', model })) : [];
        // Try the independent provider before another model from the same service.
        const targets: Target[] = config.primary === 'groq' ? [...groq.slice(0, 1), ...google.slice(0, 1), ...groq.slice(1), ...google.slice(1)]
          : [...google.slice(0, 1), ...groq.slice(0, 1), ...google.slice(1), ...groq.slice(1)];
        // Preserve speech credits by default; a third paid chat route is opt-in.
        if (config.sarvam && config.sarvamTextFallback) targets.push({ provider: 'sarvam', model: SARVAM_TEXT_MODEL });
        return tryTargets(targets, deadline, async (target, attemptDeadline) => {
          const checked = (text: string) => { validation?.check(text); return text; };
          // Conservative estimate also reserves room for output against Groq's TPM.
          const outputTokens = target.provider === 'groq' && target.model.startsWith('openai/') ? 1800 : 900;
          const tokens = Math.ceil((system.length + prompt.length) / 2) + (target.provider === 'groq' ? outputTokens : 1200);
          if (target.provider === 'gemini') {
            const response = await request(target, 'text', { model: target.model, input: prompt,
              system_instruction: system, generation_config: { thinking_level: target.model === TEXT_MODELS[0] ? 'minimal' : 'low', max_output_tokens: 1200 },
              store: false }, tokens, attemptDeadline);
            const record = object(response);
            if (/safety|blocked/i.test(JSON.stringify(record.error ?? ''))) throw new AiServiceError('blocked');
            return checked(interactionText(response));
          }
          const sarvam = target.provider === 'sarvam';
          // Disable Sarvam's default reasoning: its hidden tokens otherwise use
          // the output budget, which can yield an empty/truncated spoken answer.
          const response = object(await request(target, 'text', { model: target.model,
            messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
            ...(sarvam ? { max_tokens: 1200, reasoning_effort: null, stream: false }
              : { max_completion_tokens: outputTokens, reasoning_effort: target.model.startsWith('openai/') ? 'low' : 'none',
                include_reasoning: false }), temperature: 0.2 }, tokens, attemptDeadline,
            // Reserve one input token/UTF-8 byte plus template overhead and all
            // allowed output, at published 105B rates (Rs 15/60 per million).
            sarvam ? (Buffer.byteLength(system + prompt) + 512) * 15 / 1_000_000 + 1200 * 60 / 1_000_000 : 0));
          const choice = object(Array.isArray(response.choices) ? response.choices[0] : null);
          if (choice.finish_reason === 'content_filter') throw new AiServiceError('blocked');
          const text = object(choice.message).content;
          if (choice.finish_reason !== 'stop' || typeof text !== 'string' || !text.trim() || text.length > 20_000) throw new AiServiceError('invalid_response');
          return checked(text.trim());
        });
      });
      // Cached/coalesced responses must meet this caller's validation too.
      validation?.check(generated.value);
      return generated;
    },
    transcribe(audio: string, mimeType: string, durationSeconds?: number) {
      const duration = wavDuration(audio, mimeType) ?? durationSeconds;
      return generate('transcribe', [audio, mimeType, duration], async deadline => {
        const config = settings();
        const targets: Target[] = [];
        if (config.sarvam && duration !== undefined && Number.isFinite(duration) && duration > 0 && duration <= 30) {
          targets.push({ provider: 'sarvam', model: SARVAM_STT_MODEL });
        }
        if (config.groq) targets.push({ provider: 'groq', model: GROQ_STT_MODEL });
        if (config.gemini) targets.push({ provider: 'gemini', model: TRANSCRIBE_MODEL });
        const result = await tryTargets(targets, deadline, async (target, attemptDeadline) => {
          if (target.provider === 'gemini') return { transcript: interactionText(await request(target, 'transcribe', {
            model: target.model, input: [{ type: 'audio', data: audio, mime_type: mimeType }],
            generation_config: { transcription_config: { language_codes: [] } }, store: false,
          }, 2000, attemptDeadline)), language: undefined };
          const form = new FormData();
          form.set('model', target.model);
          if (target.provider === 'sarvam') {
            form.set('mode', 'transcribe');
            form.set('language_code', 'unknown');
          } else {
            // Verbose output includes detected language without an extra LLM call.
            form.set('response_format', 'verbose_json');
            form.set('temperature', '0');
          }
          const extension = mimeType.split('/')[1] === 'm4a' ? 'm4a' : mimeType.split('/')[1];
          form.set('file', new Blob([Buffer.from(audio, 'base64')], { type: mimeType }), 'question.' + extension);
          const response = object(await request(target, 'transcribe', form, 0, attemptDeadline,
            target.provider === 'sarvam' ? 30 * 30 / 3600 : 0));
          const transcript = target.provider === 'sarvam' ? response.transcript : response.text;
          if (typeof transcript !== 'string' || !transcript.trim() || transcript.length > 2000) throw new AiServiceError('invalid_response');
          return { transcript: transcript.trim(), language: normalizeSpeechLanguage(
            target.provider === 'sarvam' ? response.language_code : response.language) };
        });
        return { value: result.value.transcript, language: result.value.language, model: result.model };
      });
    },
    speech(text: string, language: string) {
      return generate('tts', [text, language], async deadline => {
        const config = settings();
        const targets: Target[] = [];
        // Never silently truncate a reply to meet the vendor's character limit.
        if (config.sarvam && text.length <= 2500 && SARVAM_SPEECH_LANGUAGES.has(language)) {
          targets.push({ provider: 'sarvam', model: SARVAM_TTS_MODEL });
        }
        if (config.gemini) targets.push({ provider: 'gemini', model: TTS_MODEL });
        return tryTargets(targets, deadline, async (target, attemptDeadline) => {
          if (target.provider === 'sarvam') {
            const response = object(await request(target, 'tts', { model: target.model, text,
              language_code: language + '-IN', speaker: 'shubh', output_audio_codec: 'wav',
              speech_sample_rate: 24000, pace: 1 }, Math.ceil(text.length / 2), attemptDeadline, text.length * 30 / 10_000));
            // A single text returns one audio file. Reject unexpected extra files
            // rather than playing just the first portion of a reply.
            if (!Array.isArray(response.audios) || response.audios.length !== 1) throw new AiServiceError('invalid_response');
            return wavAudio(response.audios[0]);
          }
          return interactionAudio(await request(target, 'tts', {
            model: target.model,
            input: [{ type: 'user_input', content: [{ type: 'text', text,
              annotations: [{ type: 'speech_metadata', style: 'Warm, clear delivery in ' + language + '.' }] }] }],
            response_format: { type: 'audio', mime_type: 'audio/wav' },
            generation_config: { speech_config: [{ voice: 'Kore', language }] }, store: false,
          }, Math.ceil(text.length / 2), attemptDeadline));
        });
      });
    },
    status() {
      const config = settings();
      const today = new Date(now()).toISOString().slice(0, 10);
      return { enabled: config.enabled, geminiConfigured: Boolean(config.gemini), sarvamConfigured: Boolean(config.sarvam), groqConfigured: Boolean(config.groq),
        primaryTextProvider: config.primary, fallbackTextProvider: config.primary === 'gemini' ? 'groq' : 'gemini',
        sarvamTextFallbackEnabled: config.sarvamTextFallback,
        pipeline: { text: [
          ...(config.primary === 'groq' && config.groq ? ['groq'] : []),
          ...(config.gemini && config.models.length ? ['gemini'] : []),
          ...(config.primary === 'gemini' && config.groq ? ['groq'] : []),
          ...(config.gemini && config.models.length > 1 ? ['gemini alternate'] : []),
          ...(config.sarvam && config.sarvamTextFallback ? ['sarvam'] : []),
        ],
          transcription: ['sarvam', 'groq', 'gemini', 'browser transcript'], speech: ['sarvam', 'gemini', 'browser speech'] },
        textModels: config.models, groqTextModels: config.groqModels, transcriptionModel: TRANSCRIBE_MODEL, speechModel: TTS_MODEL,
        sarvamModels: { text: SARVAM_TEXT_MODEL, transcription: SARVAM_STT_MODEL, speech: SARVAM_TTS_MODEL },
        sarvamEstimatedRupeesReservedThisProcess: Number(sarvamReservedRupees.toFixed(4)),
        sarvamMaxEstimatedRupeesPerProcess: config.sarvamBudget,
        callsThisProcessToday: day === today ? calls : 0, maxCallsPerProcessPerDay: config.cap,
        usageByProvider: structuredClone(usageByProvider), cacheHits, fallbackSuccesses,
        activeRequests: pending.size, cachedResults: cache.size, quotasVerified: false,
        circuits: [...circuits.entries()].map(([id, circuit]) => ({
          target: id.split(':').slice(1).join(':'), state: circuit.until > now() ? 'open' : circuit.probe ? 'half_open' : 'ready_to_probe',
          reason: circuit.reason, failures: circuit.failures, retryAfterSeconds: Math.max(0, Math.ceil((circuit.until - now()) / 1000)),
        })),
        note: 'Account quotas and billing tier must be checked in the provider dashboard. Local guards are per server process.' };
    },
  };
}

type Gateway = ReturnType<typeof createAiGateway>;
const globalState = globalThis as typeof globalThis & { schemeLensAiGateway?: Gateway };
export function aiGateway() {
  return globalState.schemeLensAiGateway ??= createAiGateway();
}
