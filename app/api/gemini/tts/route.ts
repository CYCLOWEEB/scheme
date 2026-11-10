import { aiGateway } from '@/lib/ai-server';
import { aiErrorResponse, readAiRequest, RequestError } from '@/lib/ai-http';

export const runtime = 'nodejs';
export const maxDuration = 25;

export async function POST(req: Request) {
  try {
    const body = await readAiRequest(req);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const language = typeof body.language === 'string' ? body.language : 'en';
    if (!text) throw new RequestError('Text is required for speech.');
    if (text.length > 5000) throw new RequestError('The reply is too long to read aloud.', 413);
    if (!/^[a-z]{2,3}$/.test(language)) throw new RequestError('Use a valid language code for speech.');
    const result = await aiGateway().speech(text, language);
    return new Response(new Uint8Array(Buffer.from(result.value.data, 'base64')), {
      headers: { 'Content-Type': result.value.mimeType, 'Cache-Control': 'no-store',
        'X-AI-Source': result.cached ? 'cached' : 'live' },
    });
  } catch (error) { return aiErrorResponse(error); }
}
