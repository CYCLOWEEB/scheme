import { describe, expect, it } from 'bun:test';
import { createAiGateway } from './ai-server';

const answer = (text = 'पूरा जवाब', finish = 'stop') => ({ choices: [{ finish_reason: finish,
  message: { content: text, reasoning_content: 'Never display this' } }] });
const json = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers });
function wav(seconds = 1) {
  const bytes = Buffer.alloc(44 + seconds * 48000);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24); bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes.toString('base64');
}
function fixture(respond: (url: string, init: RequestInit) => Response = () => json(answer()), extra: Record<string, string> = {}) {
  const attempts: { url: string; init: RequestInit }[] = [];
  let time = Date.parse('2026-10-20T06:00:00Z');
  const gateway = createAiGateway({ env: () => ({ SARVAM_API_KEY: 'test-sarvam-secret', AI_SARVAM_TEXT_FALLBACK: 'true', ...extra }), now: () => time,
    fetch: (async (url, init) => {
      attempts.push({ url: String(url), init: init! });
      return respond(String(url), init!);
    }) as typeof fetch });
  return { gateway, attempts, advance: (ms: number) => { time += ms; } };
}

describe('independent Sarvam recovery without paid/live requests', () => {
  it('works without Gemini or Groq and disables hidden reasoning with the documented request', async () => {
    const f = fixture();
    const result = await f.gateway.text('grounding rules', 'question');
    expect(result).toMatchObject({ value: 'पूरा जवाब', model: 'sarvam/sarvam-105b', cached: false });
    const { url, init } = f.attempts[0];
    expect(url).toBe('https://api.sarvam.ai/v1/chat/completions');
    expect(url).not.toContain('secret');
    expect(new Headers(init.headers).get('api-subscription-key')).toBe('test-sarvam-secret');
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'sarvam-105b', max_tokens: 1200,
      reasoning_effort: null, stream: false, messages: [{ role: 'system', content: 'grounding rules' }, { role: 'user', content: 'question' }] });
    const status = f.gateway.status();
    expect(status.sarvamConfigured).toBe(true);
    expect(status.quotasVerified).toBe(false);
    expect(JSON.stringify(status)).not.toContain('secret');
  });

  it('uses Sarvam after both Gemini models hit quota without needing a Groq key', async () => {
    const f = fixture(url => url.includes('googleapis') ? json({}, 429) : json(answer()),
      { GEMINI_API_KEY: 'test-google', GEMINI_TEXT_MODELS: 'gemini-3.5-flash-lite,gemini-3.8-flash' });
    expect((await f.gateway.text('rules', 'one')).model).toBe('sarvam/sarvam-105b');
    expect(f.attempts).toHaveLength(3);
    await f.gateway.text('rules', 'two');
    expect(f.attempts).toHaveLength(4);
    expect(f.attempts.every(attempt => !attempt.url.includes('groq'))).toBe(true);
  });

  it('rejects incomplete answers and does not reroute a content-filter refusal', async () => {
    for (const finish of ['length', 'content_filter']) {
      const f = fixture(() => json(answer('partial', finish)));
      await expect(f.gateway.text('rules', 'question')).rejects.toMatchObject({
        reason: finish === 'length' ? 'invalid_response' : 'blocked',
      });
      expect(f.gateway.status().cachedResults).toBe(0);
    }
    const filtered = fixture(() => json(answer('', 'content_filter')), { GROQ_API_KEY: 'test-groq' });
    await expect(filtered.gateway.text('rules', 'question')).rejects.toMatchObject({ reason: 'blocked' });
    expect(filtered.attempts).toHaveLength(1);
  });

  it('honors Sarvam Retry-After and resumes only after the cooldown', async () => {
    let quotaError = true;
    const f = fixture(() => quotaError ? json({}, 429, { 'Retry-After': '40' }) : json(answer()));
    await expect(f.gateway.text('rules', 'one')).rejects.toMatchObject({ reason: 'rate_limit' });
    quotaError = false;
    await expect(f.gateway.text('rules', 'two')).rejects.toMatchObject({ reason: 'rate_limit' });
    expect(f.attempts).toHaveLength(1);
    f.advance(41_000);
    await f.gateway.text('rules', 'two');
    expect(f.attempts).toHaveLength(2);
  });

  it('pauses all Sarvam APIs when shared credits are exhausted', async () => {
    const f = fixture(() => json({ error: { code: 'insufficient_credits' } }, 402));
    await expect(f.gateway.text('rules', 'question')).rejects.toMatchObject({ reason: 'daily_limit' });
    await expect(f.gateway.speech('Hello', 'en')).rejects.toMatchObject({ reason: 'daily_limit' });
    await expect(f.gateway.transcribe('YWJjZA==', 'audio/webm', 5)).rejects.toMatchObject({ reason: 'daily_limit' });
    expect(f.attempts).toHaveLength(1);
  });

  it('keeps failed attempts in the estimated allowance and does not refill it at midnight', async () => {
    const f = fixture(() => json({}, 503), { AI_SARVAM_MAX_ESTIMATED_RUPEES: '1' });
    await expect(f.gateway.speech('x'.repeat(333), 'en')).rejects.toMatchObject({ reason: 'unavailable' });
    expect(f.gateway.status().sarvamEstimatedRupeesReservedThisProcess).toBe(0.999);
    f.advance(24 * 60 * 60_000);
    await expect(f.gateway.speech('xx', 'en')).rejects.toMatchObject({ reason: 'daily_limit' });
    expect(f.attempts).toHaveLength(1);
  });

  it('serves cached audio after the local allowance is exhausted, without another reservation', async () => {
    const f = fixture(() => json({ audios: [wav()] }), { AI_SARVAM_MAX_ESTIMATED_RUPEES: '1' });
    const text = 'x'.repeat(333);
    await f.gateway.speech(text, 'en');
    await expect(f.gateway.speech('xx', 'en')).rejects.toMatchObject({ reason: 'daily_limit' });
    expect((await f.gateway.speech(text, 'en')).cached).toBe(true);
    expect(f.attempts).toHaveLength(1);
  });

  it('sends the original short WebM recording with automatic language detection', async () => {
    const f = fixture(() => json({ transcript: 'मुझे योजना बताइए', language_code: 'hi-IN' }));
    expect((await f.gateway.transcribe('YWJjZA==', 'audio/webm', 12)).value).toBe('मुझे योजना बताइए');
    expect(f.attempts[0].url).toBe('https://api.sarvam.ai/speech-to-text');
    const form = f.attempts[0].init.body as FormData;
    expect(form.get('model')).toBe('saaras:v4');
    expect(form.get('mode')).toBe('transcribe');
    expect(form.get('language_code')).toBe('unknown');
    expect((form.get('file') as Blob).size).toBe(4);
    expect(new Headers(f.attempts[0].init.headers).has('content-type')).toBe(false);
  });

  it('skips long and unknown-duration recordings, preserving the original duration limit for other providers', async () => {
    const f = fixture();
    for (const duration of [undefined, 30.1, 45, NaN]) {
      await expect(f.gateway.transcribe('YWJjZA==', 'audio/webm', duration)).rejects.toBeInstanceOf(Error);
    }
    // Read actual WAV duration before trusting a client-supplied duration.
    await expect(f.gateway.transcribe(wav(31), 'audio/wav', 1)).rejects.toBeInstanceOf(Error);
    expect(f.attempts).toHaveLength(0);
    expect(f.gateway.status().sarvamEstimatedRupeesReservedThisProcess).toBe(0);
    const gemini = fixture(() => json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'long transcript' }] }] }),
      { GEMINI_API_KEY: 'test-google' });
    expect((await gemini.gateway.transcribe('YWJjZA==', 'audio/webm', 45)).value).toBe('long transcript');
  });

  it('derives WAV duration for isolated English/Hindi CLI round trips', async () => {
    const f = fixture(() => json({ transcript: 'Hello' }));
    expect((await f.gateway.transcribe(wav(), 'audio/wav')).value).toBe('Hello');
    expect(f.attempts).toHaveLength(1);
  });

  it('requests stable Bulbul v3 WAV in the chosen language and rejects corrupt/partial audio', async () => {
    const f = fixture(() => json({ audios: [wav()] }));
    const result = await f.gateway.speech('नमस्ते', 'hi');
    expect(result.model).toBe('sarvam/bulbul:v3');
    expect(result.value.mimeType).toBe('audio/wav');
    expect(f.attempts[0].url).toBe('https://api.sarvam.ai/text-to-speech');
    expect(JSON.parse(String(f.attempts[0].init.body))).toMatchObject({ model: 'bulbul:v3', language_code: 'hi-IN',
      text: 'नमस्ते', speaker: 'shubh', output_audio_codec: 'wav', speech_sample_rate: 24000 });
    for (const audios of [['bm90IHdhdg=='], [wav(), wav()]]) {
      const broken = fixture(() => json({ audios }));
      await expect(broken.gateway.speech('Hello', 'en')).rejects.toMatchObject({ reason: 'invalid_response' });
    }
    const oversized = fixture();
    await expect(oversized.gateway.speech('x'.repeat(2501), 'en')).rejects.toBeInstanceOf(Error);
    expect(oversized.attempts).toHaveLength(0);
  });

  it('uses Sarvam speech first without waiting for Gemini', async () => {
    let calls = 0;
    const gateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test-google', SARVAM_API_KEY: 'test-sarvam' }), attemptTimeoutMs: 15,
      fetch: (async (url, init) => {
        calls++;
        if (String(url).includes('googleapis')) return new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
        return json({ audios: [wav()] });
      }) as typeof fetch });
    expect((await gateway.speech('Hello', 'en')).model).toBe('sarvam/bulbul:v3');
    expect(calls).toBe(1);
  });
});
