import { NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-server';
import { aiErrorResponse, readAiRequest, RequestError } from '@/lib/ai-http';
import { normalizeSpeechLanguage, transcriptLanguage } from '@/lib/ai-language';

export const runtime = 'nodejs';
export const maxDuration = 35;
const AUDIO_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/mpeg', 'audio/mp3']);

export async function POST(req: Request) {
  try {
    const body = await readAiRequest(req, 3_600_000);
    const audio = typeof body.audio === 'string' ? body.audio : '';
    const declared = typeof body.mimeType === 'string' ? body.mimeType.split(';', 1)[0].toLowerCase() : '';
    const mimeType = declared === 'audio/mp4' ? 'audio/m4a' : declared;
    if (!audio || audio.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) throw new RequestError('A browser recording is required.');
    if (audio.length > 3_500_000) throw new RequestError('Please record a shorter question.', 413);
    if (!AUDIO_TYPES.has(mimeType)) throw new RequestError('Unsupported audio format. Try Chrome or Edge.', 415);
    const duration = body.durationSeconds;
    if (duration !== undefined && (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || duration > 60)) {
      throw new RequestError('Invalid recording duration. Try recording again.');
    }
    const result = await aiGateway().transcribe(audio, mimeType, duration as number | undefined);
    if (result.value.length > 2000) throw new RequestError('That question is too long. Record a shorter question.', 413);
    const language = result.language ?? transcriptLanguage(result.value, normalizeSpeechLanguage(body.languageHint) ?? 'en');
    return NextResponse.json({ transcript: result.value, language, model: result.model,
      source: result.cached ? 'cached' : 'live' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return aiErrorResponse(error); }
}
