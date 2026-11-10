// Shared by the speech gateway, API routes and browser. Preserve provider language
// metadata: Hindi and Marathi share a script, and romanised Indic speech is ambiguous.
const LANGUAGE_NAMES: Record<string, string> = {
  english: 'en', hindi: 'hi', marathi: 'mr', bengali: 'bn', tamil: 'ta', telugu: 'te',
  gujarati: 'gu', kannada: 'kn', malayalam: 'ml', punjabi: 'pa', odia: 'od', oriya: 'od',
  assamese: 'as', urdu: 'ur', nepali: 'ne', sanskrit: 'sa', sindhi: 'sd', konkani: 'kok', or: 'od',
  arabic: 'ar', chinese: 'zh', cantonese: 'yue', french: 'fr', german: 'de', italian: 'it', japanese: 'ja',
  korean: 'ko', portuguese: 'pt', russian: 'ru', spanish: 'es', turkish: 'tr', indonesian: 'id',
};

export const SARVAM_SPEECH_LANGUAGES = new Set(['en', 'hi', 'mr', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'pa', 'od']);

export function normalizeSpeechLanguage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim().toLowerCase();
  const code = LANGUAGE_NAMES[name] ?? name.split(/[-_]/)[0];
  return code !== 'und' && code !== 'unknown' && /^[a-z]{2,3}$/.test(code) ? code : undefined;
}

export function transcriptLanguage(text: string, fallback = 'en') {
  const hint = normalizeSpeechLanguage(fallback) ?? 'en';
  if (/[\u0900-\u097f]/.test(text)) return ['hi', 'mr', 'ne', 'sa', 'kok', 'mai', 'doi'].includes(hint) ? hint : 'hi';
  if (/[\u0980-\u09ff]/.test(text)) return hint === 'as' ? 'as' : 'bn';
  for (const [script, code] of [
    [/[\u0a00-\u0a7f]/, 'pa'], [/[\u0a80-\u0aff]/, 'gu'], [/[\u0b00-\u0b7f]/, 'od'],
    [/[\u0b80-\u0bff]/, 'ta'], [/[\u0c00-\u0c7f]/, 'te'], [/[\u0c80-\u0cff]/, 'kn'],
    [/[\u0d00-\u0d7f]/, 'ml'],
  ] as const) if (script.test(text)) return code;
  // Latin text alone cannot reliably distinguish English from romanised speech.
  return hint;
}
