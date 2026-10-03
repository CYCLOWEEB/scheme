import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_TRANSCRIBE_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const MAX_AUDIO_BASE64_LENGTH = 3_500_000;
const AUDIO_MIME_TYPES = new Set([
  'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/mpeg',
]);

function extractTranscript(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const transcript = extractTranscript(item);
      if (transcript) return transcript;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (typeof record.output_text === 'string' && record.output_text.trim()) return record.output_text.trim();
  if (record.type === 'text' && typeof record.text === 'string' && record.text.trim()) return record.text.trim();
  for (const child of Object.values(record)) {
    const transcript = extractTranscript(child);
    if (transcript) return transcript;
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
  const audio = typeof request.audio === 'string' ? request.audio : '';
  const languageHint = request.languageHint === 'hi' ? 'hi' : 'en';
  const declaredMimeType = typeof request.mimeType === 'string' ? request.mimeType.split(';', 1)[0].toLowerCase() : '';
  const mimeType = declaredMimeType === 'audio/mp4' ? 'audio/m4a' : declaredMimeType;
  if (!audio || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
    return NextResponse.json({ error: 'A browser audio recording is required.' }, { status: 400 });
  }
  if (audio.length > MAX_AUDIO_BASE64_LENGTH) {
    return NextResponse.json({ error: 'That recording is too large. Please record a shorter question.' }, { status: 413 });
  }
  if (!AUDIO_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'This browser audio format is not supported. Try Chrome or Edge.' }, { status: 415 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return NextResponse.json({ error: 'Gemini speech recognition is not configured. Add GEMINI_API_KEY to the server environment.' }, { status: 503 });
  }

  let uploadedFileName: string | null = null;
  try {
    const audioBytes = Buffer.from(audio, 'base64');
    const uploadStart = await fetch(`${GEMINI_UPLOAD_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(audioBytes.byteLength),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({ file: { display_name: 'lens-voice-question' } }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!uploadStart.ok) {
      console.error(`Gemini audio upload could not start with status ${uploadStart.status}.`);
      return NextResponse.json(
        { error: 'Gemini could not prepare that recording. Please try again.' },
        { status: 502 },
      );
    }

    const uploadUrl = uploadStart.headers.get('x-goog-upload-url');
    if (!uploadUrl || new URL(uploadUrl).hostname !== 'generativelanguage.googleapis.com') {
      console.error('Gemini audio upload did not return a valid upload URL.');
      return NextResponse.json({ error: 'Gemini could not prepare that recording. Please try again.' }, { status: 502 });
    }

    const upload = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(audioBytes.byteLength),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: audioBytes,
      signal: AbortSignal.timeout(18_000),
    });
    const uploadResult: unknown = await upload.json().catch(() => null);
    if (!upload.ok || !uploadResult || typeof uploadResult !== 'object' || !('file' in uploadResult)) {
      console.error(`Gemini audio upload failed with status ${upload.status}.`);
      return NextResponse.json({ error: 'Gemini could not prepare that recording. Please try again.' }, { status: 502 });
    }

    const file = (uploadResult as { file?: Record<string, unknown> }).file;
    const fileUri = typeof file?.uri === 'string' ? file.uri : '';
    uploadedFileName = typeof file?.name === 'string' && /^files\/[A-Za-z0-9-]+$/.test(file.name)
      ? file.name
      : null;
    if (!fileUri) {
      console.error('Gemini audio upload returned no file URI.');
      return NextResponse.json({ error: 'Gemini could not prepare that recording. Please try again.' }, { status: 502 });
    }

    const response = await fetch(GEMINI_TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'gemini-3.5-transcribe',
        input: [{ type: 'audio', uri: fileUri, mime_type: mimeType }],
        generation_config: { transcription_config: { language_codes: [] } },
        store: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      console.error(`Gemini transcription request failed with status ${response.status}.`);
      return NextResponse.json(
        { error: response.status === 429 ? 'Gemini speech recognition is busy. Please try again shortly.' : 'Gemini could not recognize that recording.' },
        { status: response.status === 429 ? 503 : 502 },
      );
    }

    const transcript = extractTranscript(result);
    if (!transcript) {
      return NextResponse.json({ error: 'No speech was recognized. Try again or type your question.' }, { status: 422 });
    }

    // Devanagari is a strong Hindi signal. Use the selected language for Latin-script Hindi.
    const language = /[\u0900-\u097F]/.test(transcript) ? 'hi' : languageHint;
    return NextResponse.json({ transcript, language }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Speech recognition took too long. Please try again.' }, { status: 504 });
    }
    console.error('Gemini transcription request failed.');
    return NextResponse.json({ error: 'Gemini could not recognize that recording. Check the connection and try again.' }, { status: 502 });
  } finally {
    if (uploadedFileName) {
      try {
        const deletion = await fetch(`https://generativelanguage.googleapis.com/v1beta/${uploadedFileName}`, {
          method: 'DELETE',
          headers: { 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(3_000),
        });
        if (!deletion.ok) console.error(`Gemini temporary audio deletion failed with status ${deletion.status}.`);
      } catch {
        console.error('Gemini temporary audio deletion could not be confirmed.');
      }
    }
  }
}
