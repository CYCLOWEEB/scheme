export type AiSource = 'live' | 'cached' | 'catalogue' | 'local';
export type AiFailure = 'not_configured' | 'disabled' | 'rate_limit' | 'daily_limit'
  | 'authentication' | 'model_unavailable' | 'timeout' | 'unavailable' | 'invalid_response' | 'ungrounded_response' | 'blocked';

export interface AdvisorResult {
  text: string;
  source: AiSource;
  model?: string;
  reason?: AiFailure;
  language?: string;
}

export function aiFailureMessage(reason: AiFailure | undefined, language: string) {
  const messages: Record<AiFailure, [string, string]> = {
    not_configured: ['AI service keys are missing on the server.', 'सर्वर पर AI सेवा की keys नहीं मिलीं।'],
    disabled: ['Live AI is switched off in the server settings.', 'सर्वर की settings में लाइव AI बंद है।'],
    rate_limit: ['AI has reached a temporary request limit. Try again in a minute.', 'AI की अस्थायी request सीमा पूरी हो गई है। एक मिनट बाद फिर कोशिश करें।'],
    daily_limit: ['The AI usage allowance has been reached. Check the provider quota or server allowance.', 'AI की उपयोग सीमा पूरी हो गई है। Provider का quota या सर्वर की सीमा जाँचें।'],
    authentication: ['The AI provider could not accept the configured key. Check its access settings.', 'AI provider ने दी गई key स्वीकार नहीं की। उसकी access settings जाँचें।'],
    model_unavailable: ['The configured AI model is unavailable. Check the model settings.', 'चुना गया AI model उपलब्ध नहीं है। Model की settings जाँचें।'],
    timeout: ['The AI service took too long to reply. Try again.', 'AI सेवा से जवाब आने में बहुत समय लगा। फिर कोशिश करें।'],
    unavailable: ['The AI service could not be reached. Try again.', 'AI सेवा से संपर्क नहीं हो सका। फिर कोशिश करें।'],
    invalid_response: ['The AI service returned an incomplete reply. Try again.', 'AI सेवा से अधूरा जवाब मिला। फिर कोशिश करें।'],
    ungrounded_response: ['The AI reply could not be checked against the supplied facts. Showing catalogue guidance.', 'AI के जवाब का दी गई जानकारी से मिलान नहीं हो पाया। कैटलॉग की जानकारी दिखाई जा रही है।'],
    blocked: ['The AI service could not answer this question. Try rephrasing it.', 'AI सेवा इस सवाल का जवाब नहीं दे सकी। सवाल दूसरे शब्दों में पूछें।'],
  };
  return (messages[reason ?? 'unavailable'] ?? messages.unavailable)[language === 'hi' ? 1 : 0];
}

export function answerSourceLabel(source: AiSource, language: string) {
  if (source === 'catalogue') return language === 'hi' ? 'योजना फ़ाइल से जानकारी' : 'Scheme file guidance';
  if (language === 'hi') return source === 'local' ? 'कैटलॉग से जानकारी · लाइव AI उपलब्ध नहीं'
    : source === 'cached' ? 'पिछला AI जवाब' : 'लाइव AI जवाब';
  return source === 'local' ? 'Catalogue guidance · live AI unavailable'
    : source === 'cached' ? 'Saved AI answer' : 'Live AI answer';
}
