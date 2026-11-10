import { describe, expect, it } from 'bun:test';
import { AiServiceError, createAiGateway, interactionAudio, interactionText, retryDelay } from './ai-server';

const complete = (text = 'A complete answer') => ({ status: 'completed',
  steps: [{ type: 'thought', content: [{ type: 'text', text: 'Do not display this' }] },
    { type: 'model_output', content: [{ type: 'text', text }] }] });
const json = (value: unknown, status = 200, headers?: HeadersInit) => Response.json(value, { status, headers });
const gemini = { GEMINI_API_KEY: 'test-key', GEMINI_TEXT_MODELS: 'gemini-3.5-flash-lite,gemini-3.8-flash' };
const both = { ...gemini, GROQ_API_KEY: 'test-groq-key' };
function fixture(run?: (url: string, init: RequestInit) => Response | Promise<Response>, env = gemini) {
  const attempts: { url: string; init: RequestInit }[] = [];
  let time = Date.parse('2026-10-20T06:00:00Z');
  const gateway = createAiGateway({ env: () => env, now: () => time,
    fetch: (async (url, init) => {
      attempts.push({ url: String(url), init: init! });
      return run ? run(String(url), init!) : json(complete());
    }) as typeof fetch });
  return { gateway, attempts, advance: (ms: number) => { time += ms; } };
}

describe('AI failure handling without live API calls', () => {
  it('does not send requests with missing keys, placeholders or the kill switch', async () => {
    for (const env of [{}, { GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY' }, { ...gemini, AI_ENABLED: 'false' }]) {
      const f = fixture(undefined, env);
      await expect(f.gateway.text('rules', 'question')).rejects.toBeInstanceOf(AiServiceError);
      expect(f.attempts).toHaveLength(0);
    }
  });

  it('uses the documented REST schema and never puts a key in a URL', async () => {
    const f = fixture();
    expect((await f.gateway.text('rules', 'question')).value).toBe('A complete answer');
    const { url, init } = f.attempts[0];
    const body = JSON.parse(String(init.body));
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(url).not.toContain('test-key');
    expect(body.store).toBe(false);
    expect(body.model).toBe('gemini-3.5-flash-lite');
    expect(body.system_instruction).toBe('rules');
    expect(body.generation_config.max_output_tokens).toBe(1200);
  });

  it('switches models on a 429 and observes Retry-After on subsequent questions', async () => {
    const f = fixture((_url, init) => JSON.parse(String(init.body)).model === 'gemini-3.5-flash-lite'
      ? json({ error: { code: 429 } }, 429, { 'Retry-After': '90' }) : json(complete()));
    expect((await f.gateway.text('rules', 'one')).model).toBe('gemini/gemini-3.8-flash');
    await f.gateway.text('rules', 'two');
    expect(f.attempts).toHaveLength(3);
    f.advance(91_000);
    await f.gateway.text('rules', 'three');
    expect(f.attempts).toHaveLength(5);
  });

  it('does not repeatedly retry a zero/daily quota', async () => {
    const f = fixture((_url, init) => JSON.parse(String(init.body)).model === 'gemini-3.5-flash-lite'
      ? json({ error: { details: [{ quotaId: 'GenerateRequestsPerDayPerProject', quotaValue: '0' }] } }, 429)
      : json(complete()));
    await f.gateway.text('rules', 'one');
    f.advance(61_000);
    await f.gateway.text('rules', 'two');
    expect(f.attempts).toHaveLength(3);
  });

  it('uses an independent provider after authentication failure, without retrying the same key', async () => {
    const f = fixture(url => url.includes('googleapis') ? json({ error: {} }, 403)
      : json({ choices: [{ finish_reason: 'stop', message: { content: 'Backup answer' } }] }), both);
    expect((await f.gateway.text('rules', 'one')).value).toBe('Backup answer');
    expect(f.attempts).toHaveLength(2);
    const body = JSON.parse(String(f.attempts[1].init.body));
    expect(body.reasoning_effort).toBe('low');
    expect(body.include_reasoning).toBe(false);
    expect(body.model).toBe('openai/gpt-oss-20b');
    expect(new Headers(f.attempts[1].init.headers).get('authorization')).toBe('Bearer test-groq-key');
  });

  it('recovers from a missing model, malformed JSON and an incomplete interaction', async () => {
    for (const broken of [
      () => json({}, 404),
      () => new Response('{broken'),
      () => json({ ...complete('partial'), status: 'in_progress' }),
      () => json({ ...complete('partial'), status: 'incomplete' }),
    ]) {
      const f = fixture((_url, init) => JSON.parse(String(init.body)).model === 'gemini-3.5-flash-lite' ? broken() : json(complete()));
      expect((await f.gateway.text('rules', 'one')).value).toBe('A complete answer');
      expect(f.attempts).toHaveLength(2);
    }
  });

  it('rejects truncated fallback answers rather than caching them', async () => {
    const f = fixture(() => json({ choices: [{ finish_reason: 'length', message: { content: 'half' } }] }),
      { GEMINI_API_KEY: '', GROQ_API_KEY: 'test-groq-key' });
    await expect(f.gateway.text('rules', 'one')).rejects.toMatchObject({ reason: 'invalid_response' });
    expect(f.gateway.status().cachedResults).toBe(0);
  });

  it('deduplicates concurrent requests and distinguishes changed inputs', async () => {
    const f = fixture(async () => { await Promise.resolve(); return json(complete()); });
    const results = await Promise.all([f.gateway.text('rules', 'one'), f.gateway.text('rules', 'one')]);
    expect(f.attempts).toHaveLength(1);
    expect(results[1].cached).toBe(true);
    expect((await f.gateway.text('rules', 'one')).cached).toBe(true);
    await f.gateway.text('different profile and language', 'one');
    expect(f.attempts).toHaveLength(2);
    f.advance(31 * 60_000);
    expect((await f.gateway.text('rules', 'one')).cached).toBe(false);
    expect(f.attempts).toHaveLength(3);
  });

  it('counts failed calls and blocks additional spending while cached answers still work', async () => {
    const env = { ...gemini, AI_MAX_CALLS_PER_DAY: '1' };
    const f = fixture(undefined, env);
    await f.gateway.text('rules', 'one');
    await expect(f.gateway.text('rules', 'two')).rejects.toMatchObject({ reason: 'daily_limit' });
    expect((await f.gateway.text('rules', 'one')).cached).toBe(true);
    expect(f.attempts).toHaveLength(1);
    const failed = fixture(() => json({}, 503), env);
    await expect(failed.gateway.text('rules', 'one')).rejects.toBeInstanceOf(AiServiceError);
    expect(failed.attempts).toHaveLength(1);
  });

  it('enforces local RPM/TPM before making a request', async () => {
    const f = fixture(undefined, { ...gemini, GEMINI_TEXT_MODELS: 'gemini-3.5-flash-lite', AI_GEMINI_RPM: '1' });
    await f.gateway.text('rules', 'one');
    await expect(f.gateway.text('rules', 'two')).rejects.toMatchObject({ reason: 'rate_limit' });
    f.advance(61_000);
    await f.gateway.text('rules', 'two');
    expect(f.attempts).toHaveLength(2);
    const large = fixture(undefined, { ...gemini, AI_GEMINI_TPM: '100' });
    await expect(large.gateway.text('rules', 'one')).rejects.toMatchObject({ reason: 'rate_limit' });
    expect(large.attempts).toHaveLength(0);
  });

  it('uses provider remaining-token headers before hitting another 429', async () => {
    const f = fixture(() => json({ choices: [{ finish_reason: 'stop', message: { content: 'Answer' } }] }, 200,
      { 'x-ratelimit-remaining-tokens': '100', 'x-ratelimit-reset-tokens': '30s' }),
      { GEMINI_API_KEY: '', GROQ_API_KEY: 'test-groq-key' });
    await f.gateway.text('rules', 'one');
    await expect(f.gateway.text('rules', 'two')).rejects.toMatchObject({ reason: 'rate_limit' });
    expect(f.attempts).toHaveLength(1);
    f.advance(31_000);
    await f.gateway.text('rules', 'two');
    expect(f.attempts).toHaveLength(2);
  });

  it('reconciles token reservations with reported usage so follow-ups do not hit a false local limit', async () => {
    const env = { GEMINI_API_KEY: '', GROQ_API_KEY: 'test-groq-key' };
    const f = fixture(() => json({ choices: [{ finish_reason: 'stop', message: { content: 'Answer' } }], usage: { total_tokens: 500 } }), env);
    await f.gateway.text('rules', 'x'.repeat(9000));
    await f.gateway.text('rules', 'y'.repeat(9000));
    expect(f.attempts).toHaveLength(2);
    expect(f.gateway.status().usageByProvider.groq.reportedTokensUsed).toBe(1000);
    const unknown = fixture(() => json({ choices: [{ finish_reason: 'stop', message: { content: 'Answer' } }] }), env);
    await unknown.gateway.text('rules', 'x'.repeat(10000));
    await expect(unknown.gateway.text('rules', 'y'.repeat(10000))).rejects.toMatchObject({ reason: 'rate_limit' });
    expect(unknown.attempts).toHaveLength(1);
  });

  it('leaves headroom below Groq daily token quota even when request count is low', async () => {
    const f = fixture(() => json({ choices: [{ finish_reason: 'stop', message: { content: 'Answer' } }] }),
      { GEMINI_API_KEY: '', GROQ_API_KEY: 'test-groq-key' });
    for (let n = 0; n < 26; n++) {
      await f.gateway.text('rules', 'x'.repeat(10_000) + n);
      f.advance(61_000);
    }
    await expect(f.gateway.text('rules', 'x'.repeat(10_000) + 'next')).rejects.toMatchObject({ reason: 'daily_limit' });
    expect(f.attempts).toHaveLength(26);
  });

  it('refuses unreviewed and paid-only model IDs', async () => {
    const f = fixture(undefined, { ...gemini, GEMINI_TEXT_MODELS: 'gemini-4-argon,random-model' });
    await expect(f.gateway.text('rules', 'one')).rejects.toBeInstanceOf(AiServiceError);
    expect(f.attempts).toHaveLength(0);
  });

  it('does not try another model/provider after an explicit safety block', async () => {
    const f = fixture(() => json({ error: { code: 'PROHIBITED_CONTENT' } }, 400), both);
    await expect(f.gateway.text('rules', 'blocked question')).rejects.toMatchObject({ reason: 'blocked' });
    expect(f.attempts).toHaveLength(1);
  });

  it('bounds distinct concurrent operations while allowing duplicate requests to share work', async () => {
    const releases: (() => void)[] = [];
    const f = fixture(async () => {
      await new Promise<void>(resolve => releases.push(resolve));
      return json(complete());
    });
    const work = [1, 2, 3, 4].map(n => f.gateway.text('rules', 'question ' + n).catch(error => error));
    expect(f.attempts).toHaveLength(3);
    releases.forEach(release => release());
    const results = await Promise.all(work);
    expect(results[3]).toMatchObject({ reason: 'rate_limit' });
    expect(f.gateway.status().activeRequests).toBe(0);
  });

  it('times out a hung request and a response whose body stalls', async () => {
    for (const stallsAtBody of [false, true]) {
      const gateway = createAiGateway({ env: () => ({ ...gemini, GEMINI_TEXT_MODELS: 'gemini-3.5-flash-lite' }),
        attemptTimeoutMs: 15,
        fetch: (async (_url, init) => {
          if (!stallsAtBody) return new Promise<Response>((_resolve, reject) => {
            init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          });
          return new Response(new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"status":'));
              init!.signal!.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
            },
          }));
        }) as typeof fetch });
      await expect(gateway.text('rules', 'one')).rejects.toMatchObject({ reason: 'timeout' });
      expect(gateway.status().activeRequests).toBe(0);
    }
  });

  it('sends inline audio with no file-upload or deletion dependency', async () => {
    const f = fixture(() => json(complete('नमस्ते')));
    expect((await f.gateway.transcribe('YWJjZA==', 'audio/webm')).value).toBe('नमस्ते');
    const body = JSON.parse(String(f.attempts[0].init.body));
    expect(body.input[0]).toEqual({ type: 'audio', data: 'YWJjZA==', mime_type: 'audio/webm' });
    expect(f.attempts).toHaveLength(1);
  });

  it('uses multilingual Whisper before Gemini with the original recording', async () => {
    const f = fixture(url => url.includes('googleapis') ? json({}, 503) : json({ text: 'नमस्ते' }), both);
    expect((await f.gateway.transcribe('YWJjZA==', 'audio/webm')).value).toBe('नमस्ते');
    const form = f.attempts[0].init.body as FormData;
    expect(form.get('model')).toBe('whisper-large-v3-turbo');
    expect(form.get('response_format')).toBe('verbose_json');
    expect(form.get('language')).toBeNull();
    expect((form.get('file') as Blob).size).toBe(4);
  });

  it('ignores user-input and thought blocks, and rejects invalid audio', () => {
    expect(interactionText(complete('final'))).toBe('final');
    expect(() => interactionText({ status: 'completed', steps: [{ type: 'user_input', content: [{ type: 'text', text: 'echo' }] }] })).toThrow();
    expect(() => interactionAudio({ status: 'completed', steps: [{ type: 'model_output',
      content: [{ type: 'audio', data: 'bm90IHdhdg==' }] }] })).toThrow();
  });

  it('honours Retry-After seconds, HTTP dates and Google retry metadata', () => {
    const now = Date.parse('2026-10-20T06:00:00Z');
    expect(retryDelay(new Headers({ 'retry-after': '15' }), {}, now)).toBe(15_000);
    expect(retryDelay(new Headers({ 'retry-after': 'Tue, 20 Oct 2026 06:02:00 GMT' }), {}, now)).toBe(120_000);
    expect(retryDelay(new Headers(), { error: { details: [{ retryDelay: '90s' }] } }, now)).toBe(90_000);
  });
});
