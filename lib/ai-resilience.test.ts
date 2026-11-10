import { describe, expect, it } from 'bun:test';
import { createAiGateway } from './ai-server';
import { advisorValidation } from './ai-validation';
import { advisorPrompt, normalizeAdvisorInput } from './ai-guidance';
import { preparedToolAnswer } from './ai-tools';
import { SCHEMES_DATABASE } from './schemes-data';

const completion = (text: string) => ({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text }] }] });
const backup = (text: string) => ({ choices: [{ finish_reason: 'stop', message: { content: text } }] });
const env = { GEMINI_API_KEY: 'test', GROQ_API_KEY: 'test-backup' };

describe('financial answer acceptance', () => {
  it('accepts published catalogue figures for every scheme in English and Hindi', () => {
    for (const scheme of SCHEMES_DATABASE) for (const language of ['en', 'hi']) {
      const input = normalizeAdvisorInput({ tool: 'summary', schemeIds: [scheme.id], language });
      const text = preparedToolAnswer({ tool: 'summary', schemeIds: [scheme.id] }, language);
      expect(() => advisorValidation(input).check(text)).not.toThrow();
    }
  });

  it('rejects invented rates, loan amounts, external URLs and exposed reasoning', () => {
    const validation = advisorValidation(normalizeAdvisorInput({ tool: 'summary', schemeIds: ['nsfdc-mfs'] }));
    for (const text of ['Borrow ₹9 crore.', 'The rate is 0.01%.', 'The rate is 125000%.',
      'दर ९९ प्रतिशत है।', 'The rate is 99–6.5%.', 'Borrow ₹1–9 crore.',
      'Apply at https://fraud.example/loan.', '<think>Private reasoning</think>Answer']) {
      expect(() => validation.check(text)).toThrow();
    }
    expect(() => validation.check('Up to Rs 1.25 lakh at 6.5%, subject to the published conditions.')).not.toThrow();
  });

  it('rejects English-only replies when the document planner requests Hindi', () => {
    const input = normalizeAdvisorInput({ tool: 'documents', schemeIds: ['nsfdc-mfs'], language: 'hi' });
    const validation = advisorValidation(input);
    expect(() => validation.check('Prepare your identity and income documents.')).toThrow();
    expect(() => validation.check('पहचान और आय के प्रमाण तैयार करें।')).not.toThrow();
  });

  it('lets the backup replace an unsupported financial claim before success or caching', async () => {
    const input = normalizeAdvisorInput({ tool: 'summary', schemeIds: ['nsfdc-mfs'] });
    const { system, prompt } = advisorPrompt(input);
    const gateway = createAiGateway({ env: () => env, fetch: (async url => Response.json(String(url).includes('googleapis')
      ? completion('Your loan is ₹9 crore at 0.01%.') : backup('MFS lists a maximum of ₹1.25 lakh at 6.5%, subject to conditions.'))) as typeof fetch });
    const result = await gateway.text(system, prompt, advisorValidation(input));
    expect(result.model).toBe('groq/openai/gpt-oss-20b');
    expect(result.value).not.toContain('9 crore');
    expect((await gateway.text(system, prompt, advisorValidation(input))).cached).toBe(true);
    expect(gateway.status().usageByProvider.gemini).toMatchObject({ successes: 0, failures: 1 });
  });

  it('never caches an answer rejected by every provider', async () => {
    const input = normalizeAdvisorInput({ tool: 'summary', schemeIds: ['nsfdc-mfs'] });
    const gateway = createAiGateway({ env: () => env, fetch: (async url => Response.json(String(url).includes('googleapis')
      ? completion('Borrow ₹9 crore.') : backup('Borrow ₹9 crore.'))) as typeof fetch });
    await expect(gateway.text('facts', 'question', advisorValidation(input))).rejects.toMatchObject({ reason: 'ungrounded_response' });
    expect(gateway.status().cachedResults).toBe(0);
    expect(gateway.status().circuits).toHaveLength(0);
  });

  it('accepts confirmed profile figures and common Indian currency formatting without changing factual scope', () => {
    const input = normalizeAdvisorInput({ tool: 'recommendations', schemeIds: ['nsfdc-mfs'], profile: {
      category: 'SC', categoryProvided: true, annualFamilyIncome: 140000, incomeProvided: true,
      projectType: 'micro_business', projectTypeProvided: true, estimatedCost: 120000, ownContribution: 10000, age: 28,
    } });
    expect(() => advisorValidation(input).check('Your ₹1.20 L project and ₹1,40,000 family income, with ₹10 000 contributed, leave a ₹2,000 gap after a ₹1.08 L loan estimate.')).not.toThrow();
    expect(() => advisorValidation(input).check('Your family income is ₹9 lakh.')).toThrow();
  });
});

describe('transport and circuit recovery', () => {
  it('fails over even when the primary ignores abort, including stalled response bodies', async () => {
    for (const bodyStalls of [false, true]) {
      let attempts = 0;
      const gateway = createAiGateway({ env: () => env, attemptTimeoutMs: 10,
        fetch: (async url => {
          attempts++;
          if (!String(url).includes('googleapis')) return Response.json(backup('Complete backup answer'));
          return bodyStalls ? new Response(new ReadableStream({ start(controller) {
            controller.enqueue(new TextEncoder().encode('{"status":'));
          } })) : new Promise<Response>(() => undefined);
        }) as typeof fetch });
      expect((await gateway.text('facts', 'question')).value).toBe('Complete backup answer');
      expect(attempts).toBe(2);
      expect(gateway.status().activeRequests).toBe(0);
    }
  });

  it('rejects oversized chunked JSON and fails over without retaining the response', async () => {
    const gateway = createAiGateway({ env: () => env, fetch: (async url => String(url).includes('googleapis')
      ? new Response(JSON.stringify(completion('x'.repeat(130_000)))) : Response.json(backup('Complete backup answer'))) as typeof fetch });
    expect((await gateway.text('facts', 'question')).value).toBe('Complete backup answer');
  });

  it('backs off repeatedly failing models, allows one recovery probe, then resets on success', async () => {
    let time = Date.parse('2026-10-31T06:00:00Z');
    let broken = true;
    let calls = 0;
    let release: () => void = () => undefined;
    let hold = false;
    const gateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test', AI_GEMINI_RPM: '60' }),
      now: () => time, random: () => 0, fetch: (async () => {
        calls++;
        if (hold) await new Promise<void>(resolve => { release = resolve; });
        return broken ? Response.json({}, { status: 503 }) : Response.json(completion('Recovered'));
      }) as typeof fetch });
    await expect(gateway.text('facts', 'first')).rejects.toMatchObject({ reason: 'unavailable' });
    time += 31_000;
    await expect(gateway.text('facts', 'second')).rejects.toMatchObject({ reason: 'unavailable' });
    expect(gateway.status().circuits[0]).toMatchObject({ failures: 2, retryAfterSeconds: 60 });
    time += 31_000;
    await expect(gateway.text('facts', 'third')).rejects.toMatchObject({ reason: 'unavailable' });
    expect(calls).toBe(2);
    time += 30_000;
    broken = false; hold = true;
    const first = gateway.text('facts', 'recovery probe');
    await expect(gateway.text('facts', 'another probe')).rejects.toMatchObject({ reason: 'unavailable' });
    expect(calls).toBe(3);
    release();
    expect((await first).value).toBe('Recovered');
    expect(gateway.status().circuits).toHaveLength(0);
  });

  it('honours an HTML proxy rate-limit response and never retries during Retry-After', async () => {
    let calls = 0;
    const gateway = createAiGateway({ env: () => ({ GEMINI_API_KEY: 'test' }),
      fetch: (async () => { calls++; return new Response('<html>Too many requests</html>', { status: 429, headers: { 'Retry-After': '120' } }); }) as typeof fetch });
    await expect(gateway.text('facts', 'first')).rejects.toMatchObject({ reason: 'rate_limit', retryAfter: 120 });
    await expect(gateway.text('facts', 'second')).rejects.toMatchObject({ reason: 'rate_limit' });
    expect(calls).toBe(1);
  });

  it('supports a reviewed alternate Groq model when one model is retired', async () => {
    const models: string[] = [];
    const gateway = createAiGateway({ env: () => ({ GROQ_API_KEY: 'test', GROQ_TEXT_MODELS: 'openai/gpt-oss-20b,openai/gpt-oss-120b' }),
      fetch: (async (_url, init) => {
        const body = JSON.parse(String(init!.body)); models.push(body.model);
        return models.length === 1 ? Response.json({}, { status: 404 }) : Response.json(backup('Alternate answer'));
      }) as typeof fetch });
    expect((await gateway.text('facts', 'question')).model).toBe('groq/openai/gpt-oss-120b');
    expect(models).toEqual(['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);
  });
});
