import { localAdvisorAnswer, type AdvisorInput } from './ai-guidance';
import type { AdvisorResult, AiFailure, AiSource } from './ai-types';
import { normalizeSpeechLanguage, transcriptLanguage } from './ai-language';

const answers = new Map<string, { result: AdvisorResult; expires: number }>();
const speech = new Map<string, { blob: Blob; expires: number }>();

export async function requestSpeech(text: string, language: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const key = language + ':' + text;
  const saved = speech.get(key);
  if (saved && saved.expires > Date.now()) return saved.blob;
  const response = await fetch('/api/ai/tts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }), signal: AbortSignal.any([signal, AbortSignal.timeout(22_000)]),
  });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Speech unavailable');
  const blob = await response.blob();
  signal.throwIfAborted();
  if (!blob.size || blob.size > 8 * 1024 * 1024) throw new Error('Invalid speech audio');
  speech.set(key, { blob, expires: Date.now() + 30 * 60_000 });
  let size = [...speech.values()].reduce((sum, entry) => sum + entry.blob.size, 0);
  while (speech.size > 8 || size > 8 * 1024 * 1024) {
    const first = speech.entries().next().value;
    if (!first) break;
    size -= first[1].blob.size;
    speech.delete(first[0]);
  }
  return blob;
}

export async function requestTranscription(audio: string, mimeType: string, languageHint: string, signal: AbortSignal, durationSeconds?: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.throwIfAborted();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 28_000);
  try {
    const response = await fetch('/api/ai/transcribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, mimeType, languageHint, durationSeconds }), signal: controller.signal,
    });
    const result = await response.json() as { transcript?: unknown; language?: unknown };
    if (!response.ok || typeof result.transcript !== 'string' || !result.transcript.trim()) throw new Error('Speech recognition unavailable');
    return { transcript: result.transcript.trim(), language: normalizeSpeechLanguage(result.language)
      ?? transcriptLanguage(result.transcript, languageHint) };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

// A complete terminator and metadata are required. Partial replies never become
// successful answers, speech input or cache entries.
export async function readAdvisorResponse(response: Response): Promise<AdvisorResult> {
  if (!response.ok || !response.body) throw new Error('Advisor unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let text = '';
  let source: AiSource | undefined;
  let model: string | undefined;
  let reason: AiFailure | undefined;
  let language: string | undefined;
  let completed = false;
  const event = (line: string) => {
    if (!line.trim()) return;
    const item = JSON.parse(line) as Record<string, unknown>;
    if (completed) throw new Error('Unexpected data after the complete reply');
    if (item.type === 'error') throw new Error('Incomplete advisor reply');
    if (item.type === 'meta') {
      if (!['live', 'cached', 'catalogue', 'local'].includes(String(item.source))) throw new Error('Invalid answer source');
      source = item.source as AiSource;
      model = typeof item.model === 'string' ? item.model : undefined;
      reason = typeof item.reason === 'string' ? item.reason as AiFailure : undefined;
      language = normalizeSpeechLanguage(item.language);
    } else if (item.type === 'delta' && typeof item.text === 'string') {
      text += item.text;
      if (text.length > 20_000) throw new Error('Reply too long');
    } else if (item.type === 'done') completed = true;
    else throw new Error('Invalid advisor event');
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      if (pending.length > 100_000) throw new Error('Reply too large');
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) event(line);
      if (done) break;
    }
    if (pending.trim()) event(pending);
    if (!completed || !source || !text.trim()) throw new Error('Incomplete advisor reply');
    return { text, source, model, reason, language };
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally { reader.releaseLock(); }
}

export async function requestAdvisor(input: AdvisorInput, signal?: AbortSignal): Promise<AdvisorResult> {
  signal?.throwIfAborted();
  const key = JSON.stringify(input);
  const hit = answers.get(key);
  if (hit && hit.expires > Date.now()) return { ...hit.result, source: 'cached' };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 42_000);
  try {
    const response = await fetch('/api/ai/advisor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), signal: controller.signal,
    });
    const result = await readAdvisorResponse(response);
    signal?.throwIfAborted();
    if (result.source === 'live' || result.source === 'cached') {
      for (const [id, entry] of answers) if (entry.expires <= Date.now()) answers.delete(id);
      if (answers.size >= 48) answers.delete(answers.keys().next().value!);
      answers.set(key, { result, expires: Date.now() + 30 * 60_000 });
    }
    return result;
  } catch {
    // Deliberate cancellation must not replace a newer question with fallback text.
    signal?.throwIfAborted();
    return { text: localAdvisorAnswer(input), source: 'local', language: input.language === 'hi' ? 'hi' : 'en',
      reason: controller.signal.aborted ? 'timeout' : 'unavailable' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
