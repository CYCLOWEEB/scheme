import { NextResponse } from 'next/server';
import { AiServiceError } from './ai-server';

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readAiRequest(req: Request, maxBytes = 32_000): Promise<Record<string, unknown>> {
  const origin = req.headers.get('origin');
  if (origin) {
    const requestUrl = new URL(req.url);
    // Next can normalise req.url to localhost even when the browser uses
    // 127.0.0.1 or a LAN hostname. Host is the actual HTTP request destination;
    // comparing only req.url rejects valid browser calls to every AI endpoint.
    const host = req.headers.get('host') ?? requestUrl.host;
    const forwardedProtocol = req.headers.get('x-forwarded-proto');
    const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
      ? forwardedProtocol + ':' : requestUrl.protocol;
    if (!['http:', 'https:'].includes(protocol) || origin !== new URL(`${protocol}//${host}`).origin) {
      throw new RequestError('Use this service from the app.', 403);
    }
  }
  if (Number(req.headers.get('content-length')) > maxBytes) throw new RequestError('That request is too large.', 413);
  if (!req.body) throw new RequestError('A JSON request is required.');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestError('That request is too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new RequestError('A valid JSON request is required.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('A JSON object is required.');
  return value as Record<string, unknown>;
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  const reason = error instanceof AiServiceError ? error.reason : 'unavailable';
  const retry = error instanceof AiServiceError ? error.retryAfter : 0;
  const status = reason === 'rate_limit' || reason === 'daily_limit' ? 429 : 503;
  return NextResponse.json({ error: 'Live AI is unavailable. Use the browser voice or type your question.', reason },
    { status, headers: { 'Cache-Control': 'no-store', ...(retry ? { 'Retry-After': String(retry) } : {}) } });
}
