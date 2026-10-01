'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile } from '@/lib/types';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  HelpCircle, 
  ShieldAlert, 
  Bot, 
  User, 
  Loader2
} from 'lucide-react';

interface VoiceAIAssistantProps {
  language: string;
  currentSchemeName?: string;
  userProfile: UserProfile;
  isActive?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export default function VoiceAIAssistant({
  language,
  currentSchemeName,
  userProfile,
  isActive = true,
}: VoiceAIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Namaste! Ask about the schemes listed here, their published loan terms, or the details you entered. I can offer an early screen, but only the authorized scheme agency can decide on a loan.`,
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const startingRecordingRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageCounterRef = useRef<number>(1);

  // Suggested Prompts
  const suggestedPrompts = [
    { label: 'Could I get a loan?', query: 'Based on the details in my profile, could I get a loan? Which listed schemes might fit, and what do I still need to confirm?' },
    { label: 'Micro Finance Scheme', query: 'What is the current NSFDC Micro Finance Scheme loan limit, rate, and repayment period?' },
    { label: 'Education Loan', query: 'What are the current NSFDC education loan limit and admission requirements?' },
    { label: 'Find an official agency', query: 'How can I find an authorized channel agency and apply safely?' },
  ];

  // Auto scroll to bottom of chat
  useEffect(() => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messages]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) return;
    discardRecordingRef.current = true;
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
  }, [isActive]);

  useEffect(() => () => {
    discardRecordingRef.current = true;
    if (recordingTimeoutRef.current !== null) window.clearTimeout(recordingTimeoutRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
  }, []);

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setVoiceStatus('Transcribing with Sarvam Saaras v4...');
    const languageCodeMap: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN',
    };
    const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const form = new FormData();
    form.append('action', 'stt');
    form.append('audio', audioBlob, `voice-question.${extension}`);
    form.append('language_code', languageCodeMap[language] || 'unknown');

    try {
      const response = await fetch('/api/sarvam', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.transcript !== 'string') {
        throw new Error(typeof data.error === 'string' ? data.error : 'Speech recognition failed. Please type your question.');
      }
      setInputQuery(data.transcript);
      setVoiceStatus('Transcript ready. Check names and amounts, then press Send.');
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : 'Speech recognition failed. Please type your question.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleListening = async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      mediaRecorderRef.current.stop();
      return;
    }
    if (isListening || startingRecordingRef.current || isTranscribing) return;
    setVoiceStatus('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceStatus('This browser cannot record audio. Please type your question.');
      return;
    }

    startingRecordingRef.current = true;
    discardRecordingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isActiveRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const supportedMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = supportedMimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        discardRecordingRef.current = true;
        setVoiceStatus('Audio recording failed. Please try again or type your question.');
        setIsListening(false);
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      };
      recorder.onstop = () => {
        if (recordingTimeoutRef.current !== null) {
          window.clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsListening(false);
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (discardRecordingRef.current) {
          if (!isActiveRef.current) setVoiceStatus('');
          return;
        }
        const recording = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!recording.size) {
          setVoiceStatus('No speech was recorded. Please try again.');
          return;
        }
        void transcribeAudio(recording, recording.type);
      };
      recorder.start();
      setIsListening(true);
      setVoiceStatus('Recording. Tap the microphone again to finish; recordings stop after 29 seconds.');
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') {
          setVoiceStatus('Recording limit reached. Transcribing with Sarvam Saaras v4...');
          recorder.stop();
        }
      }, 29000);
    } catch {
      discardRecordingRef.current = true;
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsListening(false);
      setVoiceStatus('Microphone access was denied or unavailable. Please allow access or type your question.');
    } finally {
      startingRecordingRef.current = false;
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
        audio.onpause = () => setIsSpeaking(false);
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
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setVoiceStatus('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          query,
          language,
          schemeName: currentSchemeName,
          profile: {
            category: userProfile.category,
            categoryProvided: userProfile.categoryProvided,
            annualFamilyIncome: userProfile.annualFamilyIncome,
            incomeProvided: userProfile.incomeProvided,
            projectType: userProfile.projectType,
            projectTypeProvided: userProfile.projectTypeProvided,
            estimatedCost: userProfile.estimatedCost,
            ownContribution: userProfile.ownContribution,
            hasCasteCertificate: userProfile.hasCasteCertificate,
            hasIncomeCertificate: userProfile.hasIncomeCertificate,
            hasAdmission: userProfile.hasAdmission,
            hasSanitationWorkerEligibility: userProfile.hasSanitationWorkerEligibility,
            age: userProfile.age,
            newEnterpriseStatus: userProfile.newEnterpriseStatus,
            streetVendorStatus: userProfile.streetVendorStatus,
            scStOwnedMseStatus: userProfile.scStOwnedMseStatus,
            traditionalTrade: userProfile.traditionalTrade,
            hasPreviousTarunRepayment: userProfile.hasPreviousTarunRepayment,
            projectLocationArea: userProfile.projectLocationArea,
            hasEighthGradeEducation: userProfile.hasEighthGradeEducation,
          },
        })
      });

      const data = await res.json();
      const reply = typeof data.text === 'string'
        ? data.text
        : typeof data.error === 'string'
          ? data.error
          : 'I could not process your query at this moment. Please try again.';

      messageCounterRef.current += 1;
      const aiMsgId = `ai-${messageCounterRef.current}`;
      const assistantMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: reply
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
          text: 'There was an error communicating with the advisor. Please check your internet connection and try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const conversationStatus = isListening
    ? 'Listening'
    : isTranscribing
      ? 'Preparing transcript'
      : isLoading
        ? 'Thinking'
        : isSpeaking
          ? 'Speaking'
          : 'Ready';

  return (
    <section aria-labelledby="assistant-heading" className="space-y-4 sm:space-y-5">
      <div className="soft-arrive rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-blue-800 text-white shadow-sm sm:flex">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
                SCHEME LENS ADVISOR
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500" aria-live="polite">
                <span className={`h-2 w-2 rounded-full ${isListening ? 'recording-glow bg-rose-500' : isTranscribing || isLoading || isSpeaking ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {conversationStatus}
              </span>
            </div>
            <h2 id="assistant-heading" className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Ask about a scheme
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              Ask by voice or text about listed schemes. You can check the transcript before sending it.
            </p>
            {currentSchemeName && (
              <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-800">
                <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Question about {currentSchemeName}</span>
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200/80">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p><strong>Stay safe.</strong> Use official channels. Never share OTPs or pay anyone promising approval.</p>
        </div>
      </div>

      <div aria-label="Suggested questions" className="flex min-w-0 items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-slate-600 sm:text-xs">
          <HelpCircle className="h-4 w-4 text-sky-700" aria-hidden="true" /> Try asking
        </span>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-none">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => handleSendMessage(prompt.query)}
              disabled={isLoading || isTranscribing}
              className="button-motion min-h-10 shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="soft-arrive flex h-[270px] min-h-[270px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[520px] sm:min-h-0">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Scheme Lens</p>
              <p className="text-[11px] text-slate-500">Published scheme information</p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready to help
          </span>
        </div>

        <div role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
          {messages.map((message) => (
            <div key={message.id} className={`soft-arrive flex items-end gap-2.5 sm:gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.sender === 'assistant' && (
                <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white shadow-xs">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </div>
              )}
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[78%] sm:px-5 ${message.sender === 'user' ? 'rounded-br-md bg-sky-700 text-white shadow-sm' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-2xs'}`}>
                <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${message.sender === 'user' ? 'text-sky-100' : 'text-sky-800'}`}>
                  {message.sender === 'user' ? 'You' : 'Scheme Lens'}
                </p>
                <div className="whitespace-pre-line text-sm leading-relaxed sm:text-[15px]">
                  {message.text}
                </div>
                {message.sender === 'assistant' && (
                  <div className="mt-2 flex justify-end border-t border-slate-100 pt-1.5">
                    <button
                      type="button"
                      onClick={() => speakText(message.text)}
                      className="button-motion inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-800"
                      aria-label={`${isSpeaking ? 'Stop reading' : 'Read'} this reply aloud`}
                      title="Read reply aloud"
                    >
                      {isSpeaking ? <VolumeX className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                    </button>
                  </div>
                )}
              </div>
              {message.sender === 'user' && (
                <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white shadow-xs">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div role="status" className="flex items-end gap-2.5 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-2xs">
                <Loader2 className="h-4 w-4 animate-spin text-sky-700" aria-hidden="true" />
                <span>Putting together an answer…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <form onSubmit={(event) => { event.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
            <button
              type="button"
              id="voice-mic-btn"
              onClick={toggleListening}
              disabled={isTranscribing || isLoading}
              className={`button-motion inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${isListening ? 'recording-glow border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800'}`}
              aria-label={isListening ? 'Stop recording' : 'Record a voice question'}
              aria-pressed={isListening}
              title={isListening ? 'Tap to finish recording' : 'Tap to record a question'}
            >
              {isListening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
              <span>{isListening ? 'Stop' : 'Record'}</span>
            </button>
            <label htmlFor="chat-query-input" className="sr-only">Your question</label>
            <input
              type="text"
              id="chat-query-input"
              value={inputQuery}
              onChange={(event) => { setInputQuery(event.target.value); setVoiceStatus(''); }}
              placeholder={isListening ? 'Recording… tap Stop when you’re done' : isTranscribing ? 'Preparing your transcript…' : 'Ask about a scheme or loan…'}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white sm:px-4"
            />
            <button
              type="submit"
              id="send-chat-btn"
              disabled={!inputQuery.trim() || isLoading || isTranscribing}
              className="button-motion inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white shadow-xs hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send question"
              title="Send question"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <p role="status" aria-live="polite" aria-atomic="true" className={`mt-2 min-h-5 text-xs ${isListening ? 'font-semibold text-rose-700' : isTranscribing ? 'font-medium text-amber-800' : voiceStatus.includes('failed') || voiceStatus.includes('denied') || voiceStatus.includes('unavailable') ? 'text-rose-700' : 'text-slate-500'}`}>
            {voiceStatus || (isListening ? 'Recording. Tap Stop to review your transcript.' : 'You can edit a voice transcript before sending.')}
          </p>
        </div>
      </div>
    </section>
  );
}
