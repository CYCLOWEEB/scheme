import { aiGateway, AiServiceError } from '@/lib/ai-server';
import { advisorPrompt, localAdvisorAnswer, normalizeAdvisorInput } from '@/lib/ai-guidance';
import { advisorValidation } from '@/lib/ai-validation';
import { aiErrorResponse, readAiRequest, RequestError } from '@/lib/ai-http';
import type { AdvisorResult } from '@/lib/ai-types';

export const runtime = 'nodejs';
export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    const input = normalizeAdvisorInput(await readAiRequest(req));
    if (!input.query) throw new RequestError('A question is required.');
    if (input.query.length > 2000) throw new RequestError('Questions must be 2,000 characters or fewer.', 413);
    let result: AdvisorResult;
    try {
      const { system, prompt } = advisorPrompt(input);
      const answer = await aiGateway().text(system, prompt, advisorValidation(input));
      result = { text: answer.value, source: answer.cached ? 'cached' : 'live', model: answer.model, language: input.language };
    } catch (error) {
      result = { text: localAdvisorAnswer(input), source: 'local', language: input.language === 'hi' ? 'hi' : 'en',
        reason: error instanceof AiServiceError ? error.reason : 'unavailable' };
    }
    // Commit complete output only, so a fallback never mixes two models' text.
    const lines = [
      { type: 'meta', source: result.source, model: result.model, reason: result.reason, language: result.language },
      { type: 'delta', text: result.text },
      { type: 'done' },
    ];
    return new Response(lines.map(line => JSON.stringify(line)).join('\n') + '\n', {
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store',
        'X-AI-Source': result.source },
    });
  } catch (error) { return aiErrorResponse(error); }
}
