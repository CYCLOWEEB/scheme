import { NextRequest, NextResponse } from 'next/server';

const LANGUAGE_CODES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN',
};

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'A valid JSON request is required.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A JSON object is required.' }, { status: 400 });
    }
    const request = body as { action?: unknown; text?: unknown; language_code?: unknown };
    if (request.action !== 'tts') {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    if (typeof request.text !== 'string' || !request.text.trim()) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }
    if (request.text.length > 2500) {
      return NextResponse.json({ error: 'Text must be 2,500 characters or fewer.' }, { status: 413 });
    }

    const languageCode = typeof request.language_code === 'string'
      ? request.language_code
      : 'en-IN';
    if (!Object.values(LANGUAGE_CODES).includes(languageCode)) {
      return NextResponse.json({ error: 'Unsupported speech language.' }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey || apiKey === 'YOUR_SARVAM_API_KEY') {
      return NextResponse.json({ configured: false }, { status: 200 });
    }

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        text: request.text.trim(),
        language_code: languageCode,
        speaker: 'simran',
        model: 'bulbul:v3',
        output_audio_codec: 'mp3',
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Speech generation is temporarily unavailable.' },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      );
    }

    const data = await response.json();
    const audio = Array.isArray(data.audios) && typeof data.audios[0] === 'string' ? data.audios[0] : null;
    if (!audio) {
      return NextResponse.json({ error: 'Speech service returned no audio.' }, { status: 502 });
    }
    return NextResponse.json({ configured: true, audio, contentType: 'audio/mpeg' });
  } catch {
    return NextResponse.json({ error: 'Speech generation failed. Please try browser speech instead.' }, { status: 502 });
  }
}
