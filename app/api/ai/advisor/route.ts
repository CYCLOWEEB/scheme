// Provider-neutral endpoint. Keep /api/gemini/advisor working for existing clients.
export const runtime = 'nodejs';
export const maxDuration = 45;
export { POST } from '../../gemini/advisor/route';
