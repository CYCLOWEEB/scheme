import { afterEach, describe, expect, it } from 'bun:test';
import { createAiGateway } from './ai-server';
import { POST as advisor } from '../app/api/ai/advisor/route';
import { POST as transcribe } from '../app/api/ai/transcribe/route';
import { POST as tts } from '../app/api/ai/tts/route';
import { GET as status } from '../app/api/ai/status/route';
import { readAdvisorResponse } from './ai-client';
import { advisorPrompt, normalizeAdvisorInput } from './ai-guidance';

const state = globalThis as typeof globalThis & { schemeLensAiGateway?: ReturnType<typeof createAiGateway> };
const original = state.schemeLensAiGateway;
afterEach(() => { state.schemeLensAiGateway = original; });
const req = (body: unknown, headers?: HeadersInit) => new Request('http://localhost:3000/api/gemini/advisor',
  { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const completion = (text: string) => ({ status: 'completed',
  steps: [{ type: 'model_output', content: [{ type: 'text', text }] }] });

describe('AI routes', () => {
  it('shows honest catalogue guidance without a key, including Hindi', async () => {
    state.schemeLensAiGateway = createAiGateway({ env: () => ({}) });
    for (const language of ['en', 'hi']) {
      const response = await advisor(req({ tool: 'summary', schemeIds: ['nsfdc-mfs'], language }));
      const result = await readAdvisorResponse(response);
      expect(result.source).toBe('local');
      expect(result.reason).toBe('not_configured');
      expect(result.text).toContain(language === 'hi' ? 'सूक्ष्म' : 'Micro Finance');
    }
  });

  it('uses the live model for all five tools and passes readiness and calculated figures', async () => {
    const systems: string[] = [];
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test', AI_GEMINI_RPM: '60', AI_GEMINI_TPM: '100000' }),
      fetch: (async (_url, init) => {
        systems.push(JSON.parse(String(init!.body)).system_instruction);
        return Response.json(completion('Generated using the supplied context.'));
      }) as typeof fetch });
    for (const tool of ['recommendations', 'summary', 'comparison', 'documents', 'repayment']) {
      const result = await readAdvisorResponse(await advisor(req({ tool, schemeIds: ['nsfdc-mfs', 'nsfdc-amy'],
        readyDocumentIndices: [0], repayment: { projectCost: 120000, principal: 108000, annualRate: 6.5,
          graceMonths: 3, repaymentMonths: 33, monthlyEmi: 3641, totalInterest: 12153, totalPayment: 120153,
          ownContribution: 10000, otherFunding: 0, fundingGap: 2000 } })));
      expect(result).toMatchObject({ source: 'live', text: 'Generated using the supplied context.' });
    }
    expect(systems).toHaveLength(5);
    expect(systems[3]).toContain('Marked ready:');
    expect(systems[4]).toContain('"monthlyEmi":3641');
  });

  it('falls back on complete provider failure without exposing raw errors or keys', async () => {
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'secret-test-key' }),
      fetch: (async () => Response.json({ error: { message: 'internal-secret-detail' } }, { status: 503 })) as typeof fetch });
    const response = await advisor(req({ query: 'How does this scheme differ from a grant?', schemeName: 'Micro Finance Scheme (MFS)' }));
    const result = await readAdvisorResponse(response);
    expect(result.source).toBe('local');
    expect(result.text).toContain('₹1.25');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('returns cached answers only for matching scheme, profile and language', async () => {
    let calls = 0;
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test' }),
      fetch: (async (_url, init) => {
        calls++;
        const system = JSON.parse(String(init?.body)).system_instruction;
        return Response.json(completion(system.includes('Reply in language code hi.') ? 'योजना की शर्तें देखें।' : 'Grounded answer'));
      }) as typeof fetch });
    const body = { tool: 'summary', query: 'Explain this scheme for a first-time applicant.', schemeIds: ['nsfdc-mfs'], language: 'en' };
    expect((await readAdvisorResponse(await advisor(req(body)))).source).toBe('live');
    expect((await readAdvisorResponse(await advisor(req(body)))).source).toBe('cached');
    expect(await readAdvisorResponse(await advisor(req({ ...body, language: 'hi' })))).toMatchObject({
      source: 'live', text: 'योजना की शर्तें देखें।', language: 'hi',
    });
    expect(calls).toBe(2);
  });

  it('rejects oversized, malformed and cross-origin input before contacting a provider', async () => {
    let calls = 0;
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test' }),
      fetch: (async () => { calls++; throw new Error('Should not call'); }) as typeof fetch });
    expect((await advisor(req({ query: 'x'.repeat(2001) }))).status).toBe(413);
    expect((await advisor(req({ query: 'hi' }, { Origin: 'https://another-site.test' }))).status).toBe(403);
    expect((await advisor(req([]))).status).toBe(400);
    expect((await advisor(new Request('http://localhost/api', { method: 'POST', body: '{' }))).status).toBe(400);
    expect((await transcribe(req({ audio: 'bad', mimeType: 'audio/webm' }))).status).toBe(400);
    expect((await tts(req({ text: 'x'.repeat(5001) }))).status).toBe(413);
    expect(calls).toBe(0);
  });

  it('accepts the actual browser host when Next normalises the internal request URL', async () => {
    state.schemeLensAiGateway = createAiGateway({ env: () => ({}) });
    for (const host of ['127.0.0.1:3000', '192.168.1.5:3000']) {
      const response = await advisor(req({ query: 'Explain MFS' }, { Host: host, Origin: 'http://' + host }));
      expect(response.status).toBe(200);
      expect((await readAdvisorResponse(response)).text).toContain('6.5%');
    }
    const remote = await advisor(req({ query: 'Explain MFS' }, {
      Host: 'scheme.example', 'X-Forwarded-Proto': 'https', Origin: 'https://scheme.example' }));
    expect(remote.status).toBe(200);
    expect((await advisor(req({ query: 'Explain MFS' }, { Host: '127.0.0.1:3000', Origin: 'https://attacker.example' }))).status).toBe(403);
  });

  it('preserves Hindi and distinguishes missing speech service from a successful transcript', async () => {
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test' }),
      fetch: (async () => Response.json(completion('मुझे योजना बताइए'))) as typeof fetch });
    const response = await transcribe(req({ audio: 'YWJjZA==', mimeType: 'audio/webm;codecs=opus', languageHint: 'en' }));
    expect(await response.json()).toMatchObject({ transcript: 'मुझे योजना बताइए', language: 'hi', source: 'live' });
    state.schemeLensAiGateway = createAiGateway({ env: () => ({}) });
    expect((await transcribe(req({ audio: 'YWJjZA==', mimeType: 'audio/webm' }))).status).toBe(503);
  });

  it('validates and caches playable WAV responses', async () => {
    const wav = Buffer.alloc(48);
    wav.write('RIFF', 0); wav.write('WAVE', 8);
    let calls = 0;
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test' }),
      fetch: (async () => { calls++; return Response.json({ status: 'completed', steps: [{ type: 'model_output',
        content: [{ type: 'audio', data: wav.toString('base64'), mime_type: 'audio/wav' }] }] }); }) as typeof fetch });
    const response = await tts(req({ text: 'Hello', language: 'en' }));
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect((await response.arrayBuffer()).byteLength).toBe(48);
    expect((await tts(req({ text: 'Hello', language: 'en' }))).headers.get('x-ai-source')).toBe('cached');
    expect(calls).toBe(1);
  });

  it('reports configuration without probing models or revealing secrets', async () => {
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'secret-test-key' }) });
    const data = await status().json();
    expect(data.geminiConfigured).toBe(true);
    expect(data.quotasVerified).toBe(false);
    expect(data.knowledge.directChatOverviews).toBe(false);
    expect(data.callsThisProcessToday).toBe(0);
    expect(JSON.stringify(data)).not.toContain('secret-test-key');
  });

  it('uses the independent provider for advisor and short recording routes without Gemini/Groq', async () => {
    const calls: string[] = [];
    state.schemeLensAiGateway = createAiGateway({ env: () => ({ SARVAM_API_KEY: 'test-sarvam-secret', AI_SARVAM_TEXT_FALLBACK: 'true' }),
      fetch: (async (url) => {
        calls.push(String(url));
        return String(url).endsWith('speech-to-text') ? Response.json({ transcript: 'मुझे योजना बताइए' })
          : Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'A grounded Sarvam answer' } }] });
      }) as typeof fetch });
    const result = await readAdvisorResponse(await advisor(req({ query: 'Explain this scheme for a first-time applicant.', schemeIds: ['nsfdc-mfs'] })));
    expect(result).toMatchObject({ source: 'live', model: 'sarvam/sarvam-105b', text: 'A grounded Sarvam answer' });
    const transcript = await transcribe(req({ audio: 'YWJjZA==', mimeType: 'audio/webm;codecs=opus', durationSeconds: 10 }));
    expect(await transcript.json()).toMatchObject({ transcript: 'मुझे योजना बताइए', language: 'hi', model: 'sarvam/saaras:v4' });
    for (const durationSeconds of ['10', 0, -1, 61]) {
      expect((await transcribe(req({ audio: 'YWJjZA==', mimeType: 'audio/webm', durationSeconds }))).status).toBe(400);
    }
    expect(calls).toHaveLength(2);
    const config = await status().json();
    expect(config.sarvamConfigured).toBe(true);
    expect(JSON.stringify(config)).not.toContain('test-sarvam-secret');
  });

  it('keeps sensitive identity fields out and bounds conversation/context', () => {
    const input = normalizeAdvisorInput({ query: 'Could I get a loan?', language: 'hi',
      profile: { name: 'Private name', district: 'Private district' },
      history: Array.from({ length: 20 }, () => ({ sender: 'user', text: 'x'.repeat(9000) })) });
    const prompt = advisorPrompt(input);
    expect(input.history).toHaveLength(4);
    expect(input.history![0].text).toHaveLength(1200);
    expect(prompt.system).not.toContain('Private');
    expect(prompt.system).toContain('default zeroes');
    expect(prompt.system).toContain('no listed match');
    expect(prompt.system).toContain('Devanagari');
  });

  it('fits the demo recommendations inside backup token guards without dropping conditions', () => {
    const profile = { category: 'SC', categoryProvided: true, annualFamilyIncome: 140000, incomeProvided: true,
      projectType: 'micro_business', projectTypeProvided: true, estimatedCost: 120000, ownContribution: 10000,
      hasCasteCertificate: true, hasIncomeCertificate: true, age: 28, newEnterpriseStatus: 'yes',
      streetVendorStatus: 'yes', scStOwnedMseStatus: 'yes', projectLocationArea: 'urban' };
    const input = normalizeAdvisorInput({ tool: 'recommendations',
      schemeIds: ['nsfdc-mfs', 'nsfdc-amy', 'nsfdc-uny'], profile });
    const { system, prompt } = advisorPrompt(input);
    expect(Math.ceil((system.length + prompt.length) / 2) + 1800).toBeLessThan(7000);
    expect(system).toContain('cooperative or small finance bank');
    expect(system).toContain('conditionsToConfirm');
    expect(system).toContain('₹2,000');
  });
});
