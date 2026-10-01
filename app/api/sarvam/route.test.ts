import { afterEach, describe, expect, it } from 'bun:test';
import type { NextRequest } from 'next/server';
import { POST } from './route';

const originalFetch = globalThis.fetch;
const originalSarvamKey = process.env.SARVAM_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSarvamKey === undefined) delete process.env.SARVAM_API_KEY;
  else process.env.SARVAM_API_KEY = originalSarvamKey;
});

function transcriptionRequest(audioSize = 6, languageCode = 'hi-IN') {
  const form = new FormData();
  form.append('action', 'stt');
  form.append('audio', new Blob([new Uint8Array(audioSize)], { type: 'audio/webm' }), 'question.webm');
  form.append('language_code', languageCode);
  return new Request('http://localhost/api/sarvam', { method: 'POST', body: form });
}

describe('Sarvam Saaras v4 speech recognition route', () => {
  it('sends the recording to the Saaras v4 endpoint and returns its transcript', async () => {
    process.env.SARVAM_API_KEY = 'test-subscription-key';
    const captured: { form: FormData | null; headers: HeadersInit | undefined } = { form: null, headers: undefined };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe('https://api.sarvam.ai/speech-to-text');
      captured.headers = init?.headers;
      captured.form = init?.body as FormData;
      return new Response(JSON.stringify({
        transcript: 'क्या मुझे ऋण मिल सकता है?',
        language_code: 'hi-IN',
        language_probability: 0.98,
      }), { status: 200 });
    }) as typeof fetch;

    const response = await POST(await transcriptionRequest() as unknown as NextRequest);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.transcript).toBe('क्या मुझे ऋण मिल सकता है?');
    expect(captured.headers).toEqual({ 'api-subscription-key': 'test-subscription-key' });
    expect(captured.form?.get('model')).toBe('saaras:v4');
    expect(captured.form?.get('mode')).toBe('transcribe');
    expect(captured.form?.get('language_code')).toBe('hi-IN');
    expect(JSON.parse(String(captured.form?.get('keyterms')))).toContain('NSFDC');
  });

  it('rejects unsupported languages without calling Sarvam', async () => {
    process.env.SARVAM_API_KEY = 'test-subscription-key';
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const response = await POST(await transcriptionRequest(6, 'fr-FR') as unknown as NextRequest);

    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it('returns a clear setup error when the Sarvam key is missing', async () => {
    delete process.env.SARVAM_API_KEY;

    const response = await POST(await transcriptionRequest() as unknown as NextRequest);
    const result = await response.json();

    expect(response.status).toBe(503);
    expect(result.error).toContain('not configured');
  });
});
