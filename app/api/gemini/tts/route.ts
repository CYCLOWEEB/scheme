import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SPEECH_CHARACTERS = 5000;
const GEMINI_TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

function findAudioBlock(value: unknown): { data: string; mimeType: string } | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const audio = findAudioBlock(item);
      if (audio) return audio;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (record.type === 'audio' && typeof record.data === 'string') {
    return {
      data: record.data,
      mimeType: typeof record.mime_type === 'string' && record.mime_type.startsWith('audio/')
        ? record.mime_type
        : 'audio/wav',
    };
  }

  const outputAudio = record.output_audio && typeof record.output_audio === 'object'
    ? record.output_audio as Record<string, unknown>
    : null;
  if (outputAudio && typeof outputAudio.data === 'string') {
    return {
      data: outputAudio.data,
      mimeType: typeof outputAudio.mime_type === 'string' && outputAudio.mime_type.startsWith('audio/')
        ? outputAudio.mime_type
        : 'audio/wav',
    };
  }

  for (const child of Object.values(record)) {
    const audio = findAudioBlock(child);
    if (audio) return audio;
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON request is required.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'A JSON object is required.' }, { status: 400 });
  }

  const request = body as Record<string, unknown>;
  const text = typeof request.text === 'string' ? request.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'Text is required for speech generation.' }, { status: 400 });
  if (text.length > MAX_SPEECH_CHARACTERS) {
    return NextResponse.json({ error: 'The spoken reply is too long to read aloud.' }, { status: 413 });
  }

  const language = typeof request.language === 'string' ? request.language : 'en';
  const languageName = ({
    en: 'English', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali',
  } as Record<string, string>)[language];
  if (!languageName) return NextResponse.json({ error: 'Unsupported speech language.' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return NextResponse.json({ error: 'Gemini speech is not configured. Add GEMINI_API_KEY to the server environment.' }, { status: 503 });
  }

  try {
    const response = await fetch(GEMINI_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'gemini-3.8-flash-lite-tts',
        input: [{
          type: 'user_input',
          content: [{
            type: 'text',
            text,
            annotations: [{
              type: 'speech_metadata',
              style: `Warm, clear conversational delivery in ${languageName}.`,
            }],
          }],
        }],
        response_format: { type: 'audio', mime_type: 'audio/wav' },
        generation_config: { speech_config: [{ voice: 'Kore', language }] },
        store: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      console.error(`Gemini TTS request failed with status ${response.status}.`);
      return NextResponse.json(
        { error: response.status === 429 ? 'Gemini speech is busy. Please try again shortly.' : 'Gemini could not generate spoken audio.' },
        { status: response.status === 429 ? 503 : 502 },
      );
    }

    const audio = findAudioBlock(result);
    if (!audio) {
      console.error('Gemini TTS response did not contain audio.');
      return NextResponse.json({ error: 'Gemini returned no playable audio.' }, { status: 502 });
    }

    return new Response(new Uint8Array(Buffer.from(audio.data, 'base64')), {
      headers: {
        'Content-Type': audio.mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Gemini speech generation took too long. Try again.' }, { status: 504 });
    }
    console.error('Gemini TTS request failed.');
    return NextResponse.json({ error: 'Gemini speech could not be reached. Check the network and try again.' }, { status: 502 });
  }
}
