import { NextRequest, NextResponse } from 'next/server';

const LANGUAGE_CODES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN',
};
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const STT_KEYTERMS = [
  'NSFDC',
  'NSKFDC',
  'PM SURAJ',
  'Aajeevika Micro-Finance Yojana',
  'Udyam Nidhi Yojana',
  'Sanitation Workers Rehabilitation Scheme',
  'Scheme Lens',
];

async function transcribeSpeech(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'A valid audio form is required.' }, { status: 400 });
  }

  if (form.get('action') !== 'stt') {
    return NextResponse.json({ error: 'Unknown speech action.' }, { status: 400 });
  }
  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: 'A non-empty audio recording is required.' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'The audio recording must be 15 MB or smaller.' }, { status: 413 });
  }

  const requestedLanguage = form.get('language_code');
  const languageCode = typeof requestedLanguage === 'string' ? requestedLanguage : 'en-IN';
  if (languageCode !== 'unknown' && !Object.values(LANGUAGE_CODES).includes(languageCode)) {
    return NextResponse.json({ error: 'Unsupported speech language.' }, { status: 400 });
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey || apiKey === 'YOUR_SARVAM_API_KEY' || apiKey === 'nope') {
    return NextResponse.json({ error: 'Voice recognition is not configured. Please type your question.' }, { status: 503 });
  }

  const sarvamForm = new FormData();
  sarvamForm.append('file', audio, audio.name || 'recording.webm');
  sarvamForm.append('model', 'saaras:v4');
  sarvamForm.append('mode', 'transcribe');
  sarvamForm.append('language_code', languageCode);
  sarvamForm.append('keyterms', JSON.stringify(STT_KEYTERMS));

  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey },
    body: sarvamForm,
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const status = response.status === 429 ? 503 : 502;
    return NextResponse.json({ error: 'Speech recognition is temporarily unavailable. Please type your question and try again later.' }, { status });
  }

  let data: { transcript?: unknown; language_code?: unknown; language_probability?: unknown };
  try {
    data = await response.json();
  } catch {
    return NextResponse.json({ error: 'Speech recognition returned an invalid response.' }, { status: 502 });
  }
  if (typeof data.transcript !== 'string' || !data.transcript.trim()) {
    return NextResponse.json({ error: 'No speech was recognized. Please try again or type your question.' }, { status: 422 });
  }

  return NextResponse.json({
    transcript: data.transcript.trim(),
    language_code: typeof data.language_code === 'string' ? data.language_code : null,
    language_probability: typeof data.language_probability === 'number' ? data.language_probability : null,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('content-type')?.toLowerCase().includes('multipart/form-data')) {
      return await transcribeSpeech(req);
    }

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
    if (!apiKey || apiKey === 'YOUR_SARVAM_API_KEY' || apiKey === 'nope') {
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
    return NextResponse.json({ error: 'Speech request failed. Please try again or type your question.' }, { status: 502 });
  }
}
