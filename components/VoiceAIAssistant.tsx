'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Languages, 
  HelpCircle, 
  ShieldAlert, 
  Bot, 
  User, 
  Loader2,
  RefreshCw,
  Award
} from 'lucide-react';

interface VoiceAIAssistantProps {
  language: string;
  setLanguage: (lang: string) => void;
  currentSchemeName?: string;
  isActive?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function VoiceAIAssistant({
  language,
  setLanguage,
  currentSchemeName,
  isActive = true,
}: VoiceAIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Namaste! I am **Yojna Mitra (योजना मित्र)**, your AI Scheme & Channel Finance Advisor powered by Gemini 3.8 Flash and Indic Voice intelligence. 

I can explain selected NSFDC and NSKFDC credit schemes, estimate repayments, and point you to official documents and application channels. This assistant is informational; the scheme authority decides eligibility.

*Ask me anything by typing or tapping the microphone below!*`,
      timestamp: 'Just now'
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageCounterRef = useRef<number>(1);

  // Suggested Prompts
  const suggestedPrompts = [
    { label: 'Micro Finance Scheme', query: 'What is the current NSFDC Micro Finance Scheme loan limit, rate, and repayment period?' },
    { label: 'Udyam Nidhi rates', query: 'How do the Udyam Nidhi interest rates differ by lender?' },
    { label: 'Education Loan', query: 'What are the current NSFDC education loan limit and admission requirements?' },
    { label: 'Find official channels', query: 'How can I find an authorized channel agency and apply safely?' },
    { label: 'Sanitation worker loan', query: 'Who can apply under the sanitation workers rehabilitation scheme?' }
  ];

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
  }, []);

  // Web Speech API Voice Recognition Setup
  useEffect(() => {
    if (!isActive) return;
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Set language code based on user's choice
      const langCodeMap: Record<string, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        mr: 'mr-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        bn: 'bn-IN'
      };
      recognition.lang = langCodeMap[language] || 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      return () => {
        recognition.stop();
        recognitionRef.current = null;
      };
    }
  }, [language, isActive]);

  useEffect(() => {
    if (isActive) return;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    setIsListening(false);
    setIsSpeaking(false);
  }, [isActive]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please type your query.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Recognition start error:', err);
      }
    }
  };

  // Text to Speech
  const speakText = async (text: string) => {
    if (typeof window === 'undefined') return;

    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      audioRef.current = null;
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#_`]/g, '');
    const langCodeMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      bn: 'bn-IN'
    };
    setIsSpeaking(true);

    try {
      const response = await fetch('/api/sarvam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tts', text: cleanText.slice(0, 2500), language_code: langCodeMap[language] || 'en-IN' }),
      });
      const data = await response.json();
      if (response.ok && data.configured && typeof data.audio === 'string') {
        const audio = new Audio(`data:${data.contentType || 'audio/mpeg'};base64,${data.audio}`);
        audioRef.current = audio;
        audio.onended = () => { audioRef.current = null; setIsSpeaking(false); };
        audio.onerror = () => { audioRef.current = null; setIsSpeaking(false); };
        await audio.play();
        return;
      }
    } catch {
      // Native browser speech is the no-key and network-error fallback.
      audioRef.current?.pause();
      audioRef.current = null;
    }

    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = langCodeMap[language] || 'en-IN';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (queryToSend?: string) => {
    if (isLoading) return;
    const query = queryToSend || inputQuery;
    if (!query.trim()) return;

    messageCounterRef.current += 1;
    const userMsgId = `user-${messageCounterRef.current}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: 'Today'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          language,
          schemeName: currentSchemeName
        })
      });

      const data = await res.json();
      const reply = data.text || 'I could not process your query at this moment. Please try again.';

      messageCounterRef.current += 1;
      const aiMsgId = `ai-${messageCounterRef.current}`;
      const assistantMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: reply,
        timestamp: 'Today'
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Advisor fetch error:', err);
      messageCounterRef.current += 1;
      const errMsgId = `err-${messageCounterRef.current}`;
      setMessages(prev => [
        ...prev,
        {
          id: errMsgId,
          sender: 'assistant',
          text: 'There was an error communicating with the advisor. Please check your internet connection and try again.',
          timestamp: 'Today'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Indic Voice & AI Scheme Advisor
            </span>
            <span className="text-xs text-slate-500">
              Optional Sarvam voice • Browser speech fallback
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            AI Scheme Advisor (योजना मित्र)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Voice and text guidance about selected schemes. Confirm current eligibility, documents, and rates with the official authority.
          </p>
        </div>

        {/* Anti-Bribery Awareness Tag */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2 max-w-sm">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>
            <b>Stay safe:</b> Apply through the official portal or a listed channel agency. Never share OTPs or pay anyone claiming they can guarantee approval.
          </span>
        </div>
      </div>

      {/* Suggested Prompts Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-semibold text-slate-500 flex items-center gap-1 shrink-0">
          <HelpCircle className="w-3.5 h-3.5 text-sky-600" /> Quick Questions:
        </span>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.query)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-slate-700 hover:text-sky-800 hover:border-sky-300 transition-colors font-medium whitespace-nowrap shadow-2xs"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[520px]">
        {/* Chat Messages Log */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-line prose prose-sm max-w-none text-inherit">
                  {msg.text}
                </div>

                <div className={`mt-2 pt-1.5 flex items-center justify-between text-[10px] ${
                  msg.sender === 'user' ? 'text-sky-200 border-t border-sky-500/40' : 'text-slate-400 border-t border-slate-100'
                }`}>
                  <span>{msg.timestamp}</span>

                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.text)}
                      className="text-slate-500 hover:text-sky-600 flex items-center gap-1 font-medium cursor-pointer"
                      title="Read aloud"
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isSpeaking ? 'Stop' : 'Speak'}</span>
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-2xs flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                <span>Yojna Mitra is preparing a response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar with Voice Button */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Input Button */}
            <button
              type="button"
              id="voice-mic-btn"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Tap to speak query in your language'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input Text Box */}
            <input
              type="text"
              id="chat-query-input"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening now... speak clearly in Hindi, English, etc.'
                  : 'Type your scheme or loan question (e.g. eligibility, subsidy, nearest SCA)...'
              }
              className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
            />

            {/* Send Button */}
            <button
              type="submit"
              id="send-chat-btn"
              disabled={!inputQuery.trim() || isLoading}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white p-2.5 rounded-xl shadow-xs transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
