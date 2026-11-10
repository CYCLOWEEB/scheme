import { afterEach, describe, expect, it } from 'bun:test';
import { readAdvisorResponse, requestAdvisor, requestSpeech, requestTranscription } from './ai-client';
import { normalizeAdvisorInput, relevantSchemes } from './ai-guidance';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const stream = (events: unknown[]) => new Response(events.map(e => JSON.stringify(e)).join('\n') + '\n');
const answer = () => stream([{ type: 'meta', source: 'live', model: 'test-model' },
  { type: 'delta', text: 'A complete reply' }, { type: 'done' }]);

describe('AI client recovery', () => {
  it('rejects a disconnected stream, a provider error and invalid metadata', async () => {
    for (const events of [
      [{ type: 'meta', source: 'live' }, { type: 'delta', text: 'Half a reply' }],
      [{ type: 'meta', source: 'live' }, { type: 'delta', text: 'Half' }, { type: 'error' }],
      [{ type: 'meta', source: 'invalid' }, { type: 'delta', text: 'text' }, { type: 'done' }],
      [{ type: 'meta', source: 'live' }, { type: 'done' }],
    ]) await expect(readAdvisorResponse(stream(events))).rejects.toBeInstanceOf(Error);
  });

  it('handles UTF-8 split across network chunks', async () => {
    const bytes = new TextEncoder().encode([{ type: 'meta', source: 'live' },
      { type: 'delta', text: 'योजना की जानकारी' }, { type: 'done' }].map(e => JSON.stringify(e)).join('\n'));
    const response = new Response(new ReadableStream({ start(controller) {
      for (let offset = 0; offset < bytes.length; offset += 2) controller.enqueue(bytes.subarray(offset, offset + 2));
      controller.close();
    } }));
    expect((await readAdvisorResponse(response)).text).toBe('योजना की जानकारी');
  });

  it('provides clearly marked catalogue guidance when the app server is offline', async () => {
    globalThis.fetch = (async () => { throw new TypeError('offline'); }) as typeof fetch;
    const result = await requestAdvisor(normalizeAdvisorInput({ tool: 'summary', schemeIds: ['nsfdc-mfs'], language: 'hi' }));
    expect(result.source).toBe('local');
    expect(result.reason).toBe('unavailable');
    expect(result.text).toContain('सूक्ष्म');
  });

  it('caches complete live results but not failed results', async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return calls === 1 ? new Response('', { status: 503 }) : answer(); }) as typeof fetch;
    const input = normalizeAdvisorInput({ query: 'unique-cache-test-question' });
    expect((await requestAdvisor(input)).source).toBe('local');
    expect((await requestAdvisor(input)).source).toBe('live');
    expect((await requestAdvisor(input)).source).toBe('cached');
    expect(calls).toBe(2);
  });

  it('preserves cancellation instead of displaying a fallback for an abandoned request', async () => {
    const controller = new AbortController();
    globalThis.fetch = (async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as typeof fetch;
    const result = requestAdvisor(normalizeAdvisorInput({ query: 'cancellation test' }), controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('reuses generated speech and does not cache a failed speech response', async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return calls === 1 ? new Response('', { status: 503 })
      : new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/wav' } }); }) as typeof fetch;
    const signal = new AbortController().signal;
    await expect(requestSpeech('Unique speech test', 'en', signal)).rejects.toThrow();
    expect((await requestSpeech('Unique speech test', 'en', signal)).size).toBe(3);
    expect((await requestSpeech('Unique speech test', 'en', signal)).size).toBe(3);
    expect(calls).toBe(2);
  });

  it('aborts transcription and rejects unusable transcripts', async () => {
    globalThis.fetch = (async () => Response.json({ transcript: '' })) as typeof fetch;
    await expect(requestTranscription('YWJjZA==', 'audio/webm', 'hi', new AbortController().signal)).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(requestTranscription('YWJjZA==', 'audio/webm', 'hi', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('passes recording duration so the server can avoid an incompatible speech endpoint', async () => {
    let payload: Record<string, unknown> = {};
    globalThis.fetch = (async (_url, init) => {
      payload = JSON.parse(String(init!.body));
      return Response.json({ transcript: 'मुझे योजना बताइए', language: 'hi' });
    }) as typeof fetch;
    const result = await requestTranscription('YWJjZA==', 'audio/webm', 'en', new AbortController().signal, 12.5);
    expect(payload.durationSeconds).toBe(12.5);
    expect(result.language).toBe('hi');
  });

  it('keeps the selected scheme on follow-ups and recognises explicit changes/comparisons', () => {
    const followup = normalizeAdvisorInput({ query: 'What is the interest rate?',
      history: [{ sender: 'user', text: 'Tell me about NSFDC-MFS' }] });
    expect(relevantSchemes(followup)[0].id).toBe('nsfdc-mfs');
    const comparison = normalizeAdvisorInput({ query: 'Compare MFS vs AMY' });
    expect(relevantSchemes(comparison).map(s => s.id)).toEqual(['nsfdc-mfs', 'nsfdc-amy']);
    const changed = normalizeAdvisorInput({ query: 'Explain education loan', schemeName: 'Micro Finance Scheme (MFS)' });
    expect(relevantSchemes(changed).every(s => s.projectTypes.includes('education_domestic'))).toBe(true);
  });

  it('retrieves common spoken names in English and Hindi without matching parts of unrelated words', () => {
    for (const query of ['Tell me about MUDRA', 'मुद्रा योजना के बारे में बताइए']) {
      expect(relevantSchemes(normalizeAdvisorInput({ query })).map(s => s.id)).toEqual(['pmmy']);
    }
    expect(relevantSchemes(normalizeAdvisorInput({ query: 'Explain PM Vishwakarma' })).map(s => s.id)).toEqual(['pm-vishwakarma']);
    expect(relevantSchemes(normalizeAdvisorInput({ query: 'Please explain my family circumstances' }))).toHaveLength(0);
  });

  it('retains a changed chat subject and resolves comparisons with the preceding scheme', () => {
    const schemeName = 'Micro Finance Scheme (MFS)';
    const history = [{ sender: 'user', text: 'Tell me about MUDRA' }, { sender: 'assistant', text: 'MUDRA facts' }];
    const followup = normalizeAdvisorInput({ query: 'What interest rate applies?', schemeName, history });
    expect(relevantSchemes(followup).map(s => s.id)).toEqual(['pmmy']);
    const comparison = normalizeAdvisorInput({ query: 'Compare it with AMY', schemeName, history });
    expect(relevantSchemes(comparison).map(s => s.id)).toEqual(['pmmy', 'nsfdc-amy']);
    const continued = normalizeAdvisorInput({ query: 'Which papers do they have in common?', schemeName,
      history: [...history, { sender: 'user', text: 'Compare it with AMY' }] });
    expect(relevantSchemes(continued).map(s => s.id)).toEqual(['pmmy', 'nsfdc-amy']);
    const changed = normalizeAdvisorInput({ query: 'Compare MFS and ELS instead', schemeName, history });
    expect(relevantSchemes(changed).map(s => s.id)).toEqual(['nsfdc-mfs', 'nsfdc-els']);
    const later = normalizeAdvisorInput({ query: 'And the conditions?', schemeName, schemeIds: ['pmmy'],
      history: [{ sender: 'user', text: 'What rate applies?' }, { sender: 'assistant', text: 'The lender sets it.' }] });
    expect(relevantSchemes(later).map(s => s.id)).toEqual(['pmmy']);
  });
});
