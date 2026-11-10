import { afterEach, describe, expect, it } from 'bun:test';
import { createAiGateway } from './ai-server';
import { advisorPrompt, catalogueAdvisorAnswer, normalizeAdvisorInput } from './ai-guidance';
import { requestAdvisor, readAdvisorResponse, requestTranscription } from './ai-client';
import { normalizeSpeechLanguage, transcriptLanguage } from './ai-language';
import { SCHEMES_DATABASE } from './schemes-data';
import { POST as advisor } from '../app/api/ai/advisor/route';
import { POST as transcribe } from '../app/api/ai/transcribe/route';
import { POST as tts } from '../app/api/ai/tts/route';

const allKeys = { GEMINI_API_KEY: 'test-google', GROQ_API_KEY: 'test-groq', SARVAM_API_KEY: 'test-sarvam',
  GEMINI_TEXT_MODELS: 'gemini-3.5-flash-lite,gemini-3.8-flash' };
const googleAnswer = (text: string) => ({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text }] }] });
const groqAnswer = (text: string) => ({ choices: [{ finish_reason: 'stop', message: { content: text } }] });
const state = globalThis as typeof globalThis & { schemeLensAiGateway?: ReturnType<typeof createAiGateway> };
const originalGateway = state.schemeLensAiGateway;
const originalFetch = globalThis.fetch;
afterEach(() => { state.schemeLensAiGateway = originalGateway; globalThis.fetch = originalFetch; });
const req = (body: unknown) => new Request('http://localhost:3000/api/ai/advisor', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
function wav() {
  const bytes = Buffer.alloc(48);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(40, 4); bytes.write('WAVE', 8);
  return bytes.toString('base64');
}

describe('shared scheme knowledge and AI-first answers', () => {
  it('keeps complete dated records and distinct support types after moving the catalogue', () => {
    const ids = new Set<string>();
    for (const scheme of SCHEMES_DATABASE) {
      expect(ids.has(scheme.id)).toBe(false);
      ids.add(scheme.id);
      expect(scheme.name.length).toBeGreaterThan(0);
      expect(scheme.overview.length).toBeGreaterThan(0);
      expect(scheme.eligibilityBullets.length).toBeGreaterThan(0);
      expect(scheme.mandatoryDocuments.length).toBeGreaterThan(0);
      expect(new URL(scheme.sourceUrl).protocol).toBe('https:');
      expect(scheme.sourceReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const amount of [scheme.maxLoanAmount, scheme.minProjectCost, scheme.maxProjectCost, scheme.concessionalInterestRate]) {
        if (amount !== undefined) { expect(Number.isFinite(amount)).toBe(true); expect(amount).toBeGreaterThanOrEqual(0); }
      }
    }
    expect(ids.size).toBe(13);
    expect(new Set(SCHEMES_DATABASE.map(s => s.programType)).size).toBe(4);
  });

  it('tries the server for simple overviews and recovers honestly when offline', async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('offline'); }) as typeof fetch;
    for (const language of ['en', 'hi']) {
      const input = normalizeAdvisorInput({ query: language === 'hi' ? 'NSFDC-MFS क्या है?' : 'Explain NSFDC-MFS', language });
      expect((await requestAdvisor(input)).source).toBe('local');
      expect((await requestAdvisor(input)).text).toContain('6.5%');
    }
    expect(calls).toBe(4);
  });

  it('sends every explicitly requested AI tool to the server instead of bypassing the configured models', async () => {
    const tools = ['recommendations', 'summary', 'comparison', 'documents', 'repayment'];
    const requests: Record<string, unknown>[] = [];
    globalThis.fetch = (async (_url, init) => {
      requests.push(JSON.parse(String(init!.body)));
      return new Response([
        { type: 'meta', source: 'live', model: 'test-provider' },
        { type: 'delta', text: 'An answer generated for this request.' }, { type: 'done' },
      ].map(event => JSON.stringify(event)).join('\n'));
    }) as typeof fetch;
    for (const tool of tools) {
      const input = normalizeAdvisorInput({ tool, schemeIds: ['nsfdc-mfs', 'nsfdc-amy'] });
      expect(catalogueAdvisorAnswer(input)).toBeUndefined();
      expect((await requestAdvisor(input)).source).toBe('live');
    }
    expect(requests.map(request => request.tool)).toEqual(tools);
  });

  it('does not treat a different task or personal follow-up as a prepared overview', () => {
    expect(catalogueAdvisorAnswer(normalizeAdvisorInput({ query: 'Explain NSFDC-MFS' }))).toContain('₹1.25');
    for (const query of ['Would I qualify for NSFDC-MFS?', 'Explain NSFDC-MFS and compare it with AMY',
      'Explain NSFDC-MFS for someone whose income changed', 'Why would NSFDC-MFS fit me better?']) {
      expect(catalogueAdvisorAnswer(normalizeAdvisorInput({ query }))).toBeUndefined();
    }
    expect(catalogueAdvisorAnswer(normalizeAdvisorInput({ tool: 'summary', schemeIds: ['nsfdc-mfs'], language: 'ta' }))).toBeUndefined();
    expect(catalogueAdvisorAnswer(normalizeAdvisorInput({ tool: 'summary', schemeIds: ['nsfdc-mfs'], query: 'Explain the risks in more detail.' }))).toBeUndefined();
  });

  it('scopes every tool to relevant files and sends document fields without unrelated loan figures', () => {
    const { system } = advisorPrompt(normalizeAdvisorInput({ tool: 'documents', schemeIds: ['nsfdc-mfs'] }));
    expect(system).toContain(SCHEMES_DATABASE[0].mandatoryDocuments[0]);
    expect(system).toContain(SCHEMES_DATABASE[0].eligibilityBullets[0]);
    expect(system).toContain(SCHEMES_DATABASE[0].sourceReviewed);
    expect(system).not.toContain('Catalogue index');
    expect(system).not.toContain('"maxLoanAmount"');
    expect(system).not.toContain('Professional and capacity-building support');
  });
});

describe('bounded independent provider recovery', () => {
  it('tries Groq immediately after the first Gemini failure and reports cache/usage accurately', async () => {
    const attempts: string[] = [];
    const gateway = createAiGateway({ env: () => allKeys, fetch: (async (url) => {
      attempts.push(String(url));
      return String(url).includes('googleapis') ? Response.json({}, { status: 429 }) : Response.json(groqAnswer('Complete fallback answer'));
    }) as typeof fetch });
    expect((await gateway.text('Scheme facts', 'Interpret this')).model).toBe('groq/openai/gpt-oss-20b');
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toContain('groq.com');
    expect((await gateway.text('Scheme facts', 'Interpret this')).cached).toBe(true);
    expect(gateway.status()).toMatchObject({ primaryTextProvider: 'gemini', cacheHits: 1, fallbackSuccesses: 1,
      usageByProvider: { gemini: { attempts: 1, failures: 1 }, groq: { attempts: 1, successes: 1 }, sarvam: { attempts: 0 } } });
  });

  it('can prefer Groq and falls back to stable Gemini when Groq returns an incomplete reply', async () => {
    const attempts: string[] = [];
    const gateway = createAiGateway({ env: () => ({ ...allKeys, AI_TEXT_PRIMARY: 'groq' }), fetch: (async (url) => {
      attempts.push(String(url));
      return Response.json(String(url).includes('groq.com') ? { choices: [{ finish_reason: 'length', message: { content: 'partial' } }] }
        : googleAnswer('Complete answer'));
    }) as typeof fetch });
    expect((await gateway.text('rules', 'question')).model).toBe('gemini/gemini-3.5-flash-lite');
    expect(attempts[0]).toContain('groq.com');
    expect(attempts).toHaveLength(2);
  });

  it('recovers from a hung primary and cools it down for subsequent questions', async () => {
    const attempts: string[] = [];
    const gateway = createAiGateway({ env: () => allKeys, attemptTimeoutMs: 15, fetch: (async (url, init) => {
      attempts.push(String(url));
      if (String(url).includes('googleapis')) return new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')));
      });
      return Response.json(groqAnswer('Recovered answer'));
    }) as typeof fetch });
    expect((await gateway.text('rules', 'first')).value).toBe('Recovered answer');
    expect((await gateway.text('rules', 'second')).value).toBe('Recovered answer');
    expect(attempts.filter(url => url.includes('googleapis'))).toHaveLength(1);
    expect(attempts).toHaveLength(3);
  });

  it('reserves Sarvam for speech by default when both text providers fail', async () => {
    const calls: string[] = [];
    state.schemeLensAiGateway = createAiGateway({ env: () => allKeys, fetch: (async url => {
      calls.push(String(url)); return Response.json({}, { status: 503 });
    }) as typeof fetch });
    const result = await readAdvisorResponse(await advisor(req({ query: 'What should I check before choosing this option?', schemeIds: ['nsfdc-mfs'] })));
    expect(result.source).toBe('local');
    expect(result.text).toContain('6.5%');
    expect(calls).toHaveLength(3);
    expect(calls.some(url => url.includes('sarvam'))).toBe(false);
  });
});

describe('same-language voice pipeline', () => {
  it('carries Marathi through Sarvam transcription, grounded Gemini reasoning, and Sarvam playback', async () => {
    const calls: { url: string; body: RequestInit['body'] }[] = [];
    const spokenReply = 'ही योजना कोणासाठी आहे ते अधिकृत संस्थेकडून तपासा.';
    state.schemeLensAiGateway = createAiGateway({ env: () => allKeys, fetch: (async (url, init) => {
      calls.push({ url: String(url), body: init!.body });
      if (String(url).endsWith('/speech-to-text')) return Response.json({ transcript: 'ही योजना माझ्यासाठी योग्य आहे का?', language_code: 'mr-IN' });
      if (String(url).includes('googleapis')) return Response.json(googleAnswer(spokenReply));
      if (String(url).endsWith('/text-to-speech')) return Response.json({ audios: [wav()] });
      throw new Error('Unexpected provider call');
    }) as typeof fetch });
    const transcript = await (await transcribe(req({ audio: 'YWJjZA==', mimeType: 'audio/webm', durationSeconds: 12, languageHint: 'en' }))).json();
    expect(transcript.language).toBe('mr');
    const answer = await readAdvisorResponse(await advisor(req({ query: transcript.transcript, language: transcript.language, schemeIds: ['nsfdc-mfs'] })));
    expect(answer.text).toBe(spokenReply);
    expect((await tts(req({ text: answer.text, language: transcript.language }))).headers.get('content-type')).toBe('audio/wav');
    expect(calls).toHaveLength(3);
    expect(JSON.parse(String(calls[1].body)).system_instruction).toContain('language code mr');
    expect(JSON.parse(String(calls[1].body)).system_instruction).toContain('125000');
    expect(JSON.parse(String(calls[2].body))).toMatchObject({ language_code: 'mr-IN', text: spokenReply });
  });

  it('uses live reasoning for simple spoken overviews and caches all three stages', async () => {
    let calls = 0;
    state.schemeLensAiGateway = createAiGateway({ env: () => allKeys, fetch: (async url => {
      calls++;
      return String(url).includes('googleapis') ? Response.json(googleAnswer('MFS has a published 6.5% rate. Confirm conditions with the agency.'))
        : String(url).endsWith('/speech-to-text') ? Response.json({ transcript: 'Explain NSFDC-MFS', language_code: 'en-IN' })
        : Response.json({ audios: [wav()] });
    }) as typeof fetch });
    for (let turn = 0; turn < 2; turn++) {
      const transcript = await (await transcribe(req({ audio: 'YWJjZA==', mimeType: 'audio/webm', durationSeconds: 10 }))).json();
      const answer = await readAdvisorResponse(await advisor(req({ query: transcript.transcript, language: transcript.language })));
      expect(answer.source).toBe(turn === 0 ? 'live' : 'cached');
      expect(answer.text).toContain('6.5%');
      expect((await tts(req({ text: answer.text, language: transcript.language }))).status).toBe(200);
    }
    expect(calls).toBe(3);
  });

  it('falls back from Sarvam to multilingual Groq STT without translating the question', async () => {
    const calls: string[] = [];
    const gateway = createAiGateway({ env: () => allKeys, fetch: (async (url, init) => {
      calls.push(String(url));
      if (String(url).includes('sarvam')) return Response.json({}, { status: 503 });
      const form = init!.body as FormData;
      expect(form.get('response_format')).toBe('verbose_json');
      expect(form.get('language')).toBeNull();
      return Response.json({ text: 'எனக்கு இந்த திட்டத்தை விளக்குங்கள்', language: 'tamil' });
    }) as typeof fetch });
    expect(await gateway.transcribe('YWJjZA==', 'audio/webm', 5)).toMatchObject({ language: 'ta', model: 'groq/whisper-large-v3-turbo' });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('sarvam');
  });

  it('falls back to Gemini speech if Sarvam times out, keeping the same language', async () => {
    const calls: string[] = [];
    const gateway = createAiGateway({ env: () => allKeys, attemptTimeoutMs: 15, fetch: (async (url, init) => {
      calls.push(String(url));
      if (String(url).includes('sarvam')) return new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')));
      });
      expect(JSON.parse(String(init!.body)).generation_config.speech_config[0].language).toBe('gu');
      return Response.json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'audio', data: wav() }] }] });
    }) as typeof fetch });
    expect((await gateway.speech('યોજનાની માહિતી', 'gu')).model).toBe('gemini/gemini-3.8-flash-lite-tts');
    expect(calls).toHaveLength(2);
  });

  it('preserves detected English against a Hindi hint and supports Indic provider language codes', async () => {
    globalThis.fetch = (async () => Response.json({ transcript: 'Explain the scheme', language: 'en' })) as typeof fetch;
    expect((await requestTranscription('YWJjZA==', 'audio/webm', 'hi', new AbortController().signal, 5)).language).toBe('en');
    expect(normalizeSpeechLanguage('mr-IN')).toBe('mr');
    expect(normalizeSpeechLanguage('Hindi')).toBe('hi');
    expect(normalizeSpeechLanguage('unknown')).toBeUndefined();
    expect(transcriptLanguage('योजना समजावून सांगा', 'mr')).toBe('mr');
    expect(transcriptLanguage('எனக்கு உதவுங்கள்', 'en')).toBe('ta');
    expect(transcriptLanguage('తెలుగు', 'en')).toBe('te');
  });

  it('labels the actual language of catalogue recovery if cloud translation is unavailable', async () => {
    state.schemeLensAiGateway = createAiGateway({ env: () => ({}) });
    const result = await readAdvisorResponse(await advisor(req({ query: 'இந்த திட்டம் எனக்கு பொருந்துமா?', language: 'ta', schemeIds: ['nsfdc-mfs'] })));
    expect(result).toMatchObject({ source: 'local', language: 'en' });
    expect(result.text).toContain('Live translation is unavailable');
  });
});
