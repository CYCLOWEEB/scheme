'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import SchemeBotAvatar, { type SchemeBotActivity } from '@/components/SchemeBotAvatar';
import type { UserProfile } from '@/lib/types';
import { tr } from '@/lib/ui-copy';
import { requestAdvisor, requestSpeech, requestTranscription } from '@/lib/ai-client';
import { GeneratingAnimation } from '@/components/AIInsightPanel';
import { normalizeAdvisorInput, relevantSchemes } from '@/lib/ai-guidance';
import { aiFailureMessage, answerSourceLabel, type AiSource } from '@/lib/ai-types';
import { transcriptLanguage } from '@/lib/ai-language';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  ShieldAlert, 
  User, 
  X,
} from 'lucide-react';

interface VoiceAIAssistantProps {
  language: string;
  currentSchemeName?: string;
  userProfile: UserProfile;
  isSampleProfile?: boolean;
  isActive?: boolean;
  onActivityChange?: (activity: SchemeBotActivity) => void;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  languageCode?: string;
  source?: AiSource;
  note?: string;
}

interface BrowserSpeechResult {
  readonly 0: { readonly transcript: string };
  readonly isFinal: boolean;
}

interface BrowserSpeechResultList {
  readonly length: number;
  readonly [index: number]: BrowserSpeechResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: BrowserSpeechResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN',
  zh: 'zh-CN', yue: 'zh-HK', pt: 'pt-BR', fa: 'fa-IR', he: 'he-IL', uk: 'uk-UA',
  sr: 'sr-RS', sw: 'sw-KE', am: 'am-ET', as: 'as-IN', gu: 'gu-IN', kn: 'kn-IN',
  ml: 'ml-IN', pa: 'pa-IN', od: 'or-IN', ur: 'ur-PK', uz: 'uz-UZ', vi: 'vi-VN', ja: 'ja-JP',
  ko: 'ko-KR', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', nl: 'nl-NL',
  ar: 'ar-SA', tr: 'tr-TR', pl: 'pl-PL', ru: 'ru-RU', id: 'id-ID', th: 'th-TH',
  ms: 'ms-MY', ro: 'ro-RO', el: 'el-GR', hu: 'hu-HU', cs: 'cs-CZ', da: 'da-DK',
  sv: 'sv-SE', fi: 'fi-FI', no: 'nb-NO', nb: 'nb-NO', nn: 'nn-NO', tl: 'fil-PH',
  hr: 'hr-HR', bg: 'bg-BG', sk: 'sk-SK', sl: 'sl-SI', lt: 'lt-LT', lv: 'lv-LV',
  et: 'et-EE', is: 'is-IS', af: 'af-ZA', sq: 'sq-AL', hy: 'hy-AM', ka: 'ka-GE',
  az: 'az-AZ', kk: 'kk-KZ', mn: 'mn-MN', ne: 'ne-NP', si: 'si-LK', my: 'my-MM',
  km: 'km-KH', lo: 'lo-LA', ha: 'ha-NG', yo: 'yo-NG', haw: 'haw-US',
};

function speechLocale(languageCode: string) {
  return SPEECH_LOCALES[languageCode] || languageCode;
}

function cleanSpeechText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*#_`]/g, '')
    .trim();
}

function speechErrorMessage(error: string) {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'Allow microphone access in your browser, then try again.';
  }
  if (error === 'no-speech') return 'Didn’t hear anything. Try again and speak closer to the mic.';
  if (error === 'audio-capture') return 'No mic found. Connect one or type your question.';
  if (error === 'network') return 'Could not connect. Check your internet and try again.';
  return 'Listening stopped. Try again or type your question.';
}

function languageFromTranscript(text: string, fallback: string) {
  return transcriptLanguage(text, fallback);
}

function releaseAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.onplay = null;
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export default function VoiceAIAssistant({
  language,
  currentSchemeName,
  userProfile,
  isSampleProfile = false,
  isActive = true,
  onActivityChange,
  onClose,
}: VoiceAIAssistantProps) {
  const t = (text: string) => tr(language, text);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Namaste! Scheme, loan ya documents ke baare mein poochhein. Main ek pehla idea de sakta hoon; final faisla agency karti hai.`,
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [conversationSchemeName, setConversationSchemeName] = useState(currentSchemeName);
  const conversationSchemeIdsRef = useRef<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [listeningState, setIsListening] = useState<boolean>(false);
  const [generatingSpeechState, setIsGeneratingSpeech] = useState<boolean>(false);
  const [speakingState, setIsSpeaking] = useState<boolean>(false);
  const [pendingVoiceAudioState, setHasPendingVoiceAudio] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  const conversationRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioRef = useRef<Blob | null>(null);
  const recordedDurationRef = useRef<number | undefined>(undefined);
  const recordingStartedRef = useRef<number | null>(null);
  const recordingReadyRef = useRef<Promise<Blob | null> | null>(null);
  const voiceSessionRef = useRef(0);
  const voiceRecordingTimeoutRef = useRef<number | null>(null);
  const startingRecognitionRef = useRef(false);
  const recognitionBaseTextRef = useRef('');
  const browserVoiceTextRef = useRef('');
  const voiceInputEditedRef = useRef(false);
  const voiceInputPendingRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsTimeoutRef = useRef<number | null>(null);
  const browserSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const browserSpeechStartTimeoutRef = useRef<number | null>(null);
  const messageCounterRef = useRef<number>(1);
  const turnAbortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const isListening = isActive && listeningState;
  const hasPendingVoiceAudio = isActive && pendingVoiceAudioState;
  const isGeneratingSpeech = isActive && generatingSpeechState;
  const isSpeaking = isActive && speakingState;
  const activity: SchemeBotActivity = !isActive ? 'idle'
    : isListening ? 'listening'
    : isLoading || isGeneratingSpeech ? 'thinking'
    : isSpeaking ? 'speaking'
    : 'idle';

  useEffect(() => {
    onActivityChange?.(activity);
  }, [activity, onActivityChange]);

  // Suggested Prompts
  const suggestedPrompts = [
    { label: 'Could I get a loan?', query: language === 'hi' ? 'मेरी profile details के आधार पर क्या मुझे loan मिल सकता है? कौन-सी listed schemes मेरे लिए fit हो सकती हैं और मुझे क्या confirm करना होगा?' : 'Based on the details in my profile, could I get a loan? Which listed schemes might fit, and what do I still need to confirm?' },
    { label: 'Small business loan', query: language === 'hi' ? 'NSFDC Micro Finance Scheme की अभी की loan limit, ब्याज दर और repayment period क्या है?' : 'What is the current NSFDC Micro Finance Scheme loan limit, rate, and repayment period?' },
    { label: 'Education Loan', query: language === 'hi' ? 'NSFDC education loan की अभी की limit और admission की क्या शर्तें हैं?' : 'What are the current NSFDC education loan limit and admission requirements?' },
    { label: 'Find an official agency', query: language === 'hi' ? 'Authorized channel agency कैसे खोजूँ और सुरक्षित तरीके से apply कैसे करूँ?' : 'How can I find an authorized channel agency and apply safely?' },
  ];

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (!isActive) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const conversation = conversationRef.current;
    conversation?.scrollTo({ top: conversation.scrollHeight, behavior });
  }, [isActive, messages]);

  const discardVoiceCapture = useCallback(() => {
    recordedDurationRef.current = undefined;
    if (voiceRecordingTimeoutRef.current !== null) {
      window.clearTimeout(voiceRecordingTimeoutRef.current);
      voiceRecordingTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstart = null;
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    recordingReadyRef.current = null;
    audioChunksRef.current = [];
    recordedAudioRef.current = null;
  }, []);

  useEffect(() => () => {
    turnAbortRef.current?.abort();
    recognitionRef.current?.abort();
    discardVoiceCapture();
    ttsAbortRef.current?.abort();
    releaseAudio(audioRef.current);
    if (typeof window !== 'undefined') {
      if (ttsTimeoutRef.current !== null) window.clearTimeout(ttsTimeoutRef.current);
      if (browserSpeechStartTimeoutRef.current !== null) window.clearTimeout(browserSpeechStartTimeoutRef.current);
      if (browserSpeechRef.current) {
        browserSpeechRef.current.onend = null;
        browserSpeechRef.current.onerror = null;
      }
      window.speechSynthesis?.cancel();
    }
    browserSpeechRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, [discardVoiceCapture]);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) return;
    turnAbortRef.current?.abort();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    voiceSessionRef.current += 1;
    startingRecognitionRef.current = false;
    discardVoiceCapture();
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    if (ttsTimeoutRef.current !== null) {
      window.clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }
    if (browserSpeechStartTimeoutRef.current !== null) {
      window.clearTimeout(browserSpeechStartTimeoutRef.current);
      browserSpeechStartTimeoutRef.current = null;
    }
    releaseAudio(audioRef.current);
    audioRef.current = null;
    browserSpeechRef.current = null;
    window.speechSynthesis?.cancel();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    voiceInputPendingRef.current = false;
    queueMicrotask(() => {
      setIsListening(false);
      setHasPendingVoiceAudio(false);
      setIsGeneratingSpeech(false);
      setIsSpeaking(false);
      setVoiceStatus('');
    });
  }, [discardVoiceCapture, isActive]);

  const stopAudio = () => {
    if (ttsTimeoutRef.current !== null) {
      window.clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }
    if (browserSpeechStartTimeoutRef.current !== null) {
      window.clearTimeout(browserSpeechStartTimeoutRef.current);
      browserSpeechStartTimeoutRef.current = null;
    }
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    releaseAudio(audioRef.current);
    audioRef.current = null;
    if (browserSpeechRef.current) {
      browserSpeechRef.current.onend = null;
      browserSpeechRef.current.onerror = null;
      browserSpeechRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setIsGeneratingSpeech(false);
    setIsSpeaking(false);
    setVoiceStatus('');
  };

  const speakText = async (text: string, languageCode = language) => {
    if (!isActiveRef.current) return;
    if (isSpeaking || isGeneratingSpeech) {
      stopAudio();
      return;
    }
    const speechText = cleanSpeechText(text);
    if (!speechText) return;

    stopAudio();
    const controller = new AbortController();
    ttsAbortRef.current = controller;
    setIsGeneratingSpeech(true);
    setVoiceStatus('Generating spoken reply…');
    let generationTimedOut = false;
    let browserFallbackStarted = false;
    const timeoutId = window.setTimeout(() => {
      generationTimedOut = true;
      controller.abort();
    }, 20_000);
    ttsTimeoutRef.current = timeoutId;

    const tryBrowserSpeech = () => {
      if (!isActiveRef.current || browserFallbackStarted || (controller.signal.aborted && !generationTimedOut)) return;
      browserFallbackStarted = true;
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
        setVoiceStatus('Spoken audio is unavailable. Read the reply above or try Listen again.');
        setIsGeneratingSpeech(false);
        setIsSpeaking(false);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(speechText);
        let browserSpeechStarted = false;
        utterance.lang = speechLocale(languageCode);
        const localePrefix = languageCode;
        const matchingVoice = window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith(`${localePrefix}-`));
        if (matchingVoice) utterance.voice = matchingVoice;
        utterance.rate = 0.96;
        utterance.onstart = () => {
          browserSpeechStarted = true;
          if (browserSpeechStartTimeoutRef.current !== null) {
            window.clearTimeout(browserSpeechStartTimeoutRef.current);
            browserSpeechStartTimeoutRef.current = null;
          }
          setIsGeneratingSpeech(false);
          setIsSpeaking(true);
          setVoiceStatus('Using your browser voice. The written reply is above.');
        };
        utterance.onend = () => {
          if (browserSpeechRef.current !== utterance) return;
          if (browserSpeechStartTimeoutRef.current !== null) {
            window.clearTimeout(browserSpeechStartTimeoutRef.current);
            browserSpeechStartTimeoutRef.current = null;
          }
          browserSpeechRef.current = null;
          setIsSpeaking(false);
          setVoiceStatus('');
        };
        utterance.onerror = () => {
          if (browserSpeechRef.current !== utterance) return;
          if (browserSpeechStartTimeoutRef.current !== null) {
            window.clearTimeout(browserSpeechStartTimeoutRef.current);
            browserSpeechStartTimeoutRef.current = null;
          }
          browserSpeechRef.current = null;
          setIsSpeaking(false);
          setIsGeneratingSpeech(false);
          setVoiceStatus('Spoken audio is unavailable. Read the reply above or try Listen again.');
        };
        browserSpeechRef.current = utterance;
        setIsGeneratingSpeech(true);
        setIsSpeaking(false);
        setVoiceStatus('Using your browser voice. The written reply is above.');
        window.speechSynthesis.cancel();
        browserSpeechStartTimeoutRef.current = window.setTimeout(() => {
          browserSpeechStartTimeoutRef.current = null;
          if (browserSpeechRef.current !== utterance || browserSpeechStarted) return;
          browserSpeechRef.current = null;
          window.speechSynthesis.cancel();
          setIsGeneratingSpeech(false);
          setIsSpeaking(false);
          setVoiceStatus('Your browser voice did not start. Read the reply above or try Listen again.');
        }, 8_000);
        window.speechSynthesis.speak(utterance);
      } catch {
        if (browserSpeechStartTimeoutRef.current !== null) {
          window.clearTimeout(browserSpeechStartTimeoutRef.current);
          browserSpeechStartTimeoutRef.current = null;
        }
        setIsGeneratingSpeech(false);
        setIsSpeaking(false);
        setVoiceStatus('Spoken audio is unavailable. Read the reply above or try Listen again.');
      }
    };

    try {
      const audioBlob = await requestSpeech(speechText, languageCode, controller.signal);
      window.clearTimeout(timeoutId);
      if (ttsTimeoutRef.current === timeoutId) ttsTimeoutRef.current = null;
      const audioUrl = URL.createObjectURL(audioBlob);
      if (controller.signal.aborted) {
        URL.revokeObjectURL(audioUrl);
        return;
      }
      audioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay = () => {
        setIsGeneratingSpeech(false);
        setIsSpeaking(true);
        setVoiceStatus('');
      };
      const clearAudio = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
        }
        if (audioRef.current === audio) audioRef.current = null;
        setIsGeneratingSpeech(false);
        setIsSpeaking(false);
      };
      audio.onended = clearAudio;
      audio.onerror = () => {
        clearAudio();
        tryBrowserSpeech();
      };
      await audio.play();
    } catch (error) {
      if (controller.signal.aborted && !generationTimedOut) return;
      tryBrowserSpeech();
    } finally {
      window.clearTimeout(timeoutId);
      if (ttsTimeoutRef.current === timeoutId) ttsTimeoutRef.current = null;
      if (ttsAbortRef.current === controller && !audioRef.current && !browserFallbackStarted) {
        ttsAbortRef.current = null;
        setIsGeneratingSpeech(false);
      }
    }
  };

  const stopVoiceCapture = async () => {
    if (voiceRecordingTimeoutRef.current !== null) {
      window.clearTimeout(voiceRecordingTimeoutRef.current);
      voiceRecordingTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    const recordingReady = recordingReadyRef.current;
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    } catch {
      setVoiceStatus('The recording could not be stopped. Your written transcript is still available.');
    }
    if (recordingReady) {
      let timeoutId: number | null = null;
      const timedOut = Symbol('recording-stop-timeout');
      const result = await Promise.race([
        recordingReady,
        new Promise<typeof timedOut>(resolve => {
          timeoutId = window.setTimeout(() => resolve(timedOut), 3_000);
        }),
      ]);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (result === timedOut) {
        discardVoiceCapture();
        setVoiceStatus('The recording did not finish. Your written transcript is still available; you can also try speaking again.');
        return null;
      }
    }
    return recordedAudioRef.current;
  };

  const startVoiceCapture = async (sessionId: number) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return false;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (sessionId !== voiceSessionRef.current || !isActiveRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ].find(type => MediaRecorder.isTypeSupported(type));
      const activeRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder = activeRecorder;
      activeRecorder.onstart = event => { recordingStartedRef.current = event.timeStamp; };
      const recordingReady = new Promise<Blob | null>(resolve => {
        activeRecorder.ondataavailable = event => {
          if (event.data.size) audioChunksRef.current.push(event.data);
        };
        activeRecorder.onstop = event => {
          const chunkMimeType = audioChunksRef.current.find(chunk => chunk.type)?.type;
          const recording = new Blob(audioChunksRef.current, { type: activeRecorder.mimeType || chunkMimeType || 'audio/webm' });
          const savedRecording = recording.size ? recording : null;
          recordedAudioRef.current = savedRecording;
          // A little headroom avoids sending borderline 30s recordings to a
          // provider with a strict 30s cap. Missing timing stays unknown.
          recordedDurationRef.current = savedRecording && recordingStartedRef.current !== null
            ? Math.max(0.001, (event.timeStamp - recordingStartedRef.current) / 1000 + 0.25) : undefined;
          activeRecorder.onstart = null;
          audioChunksRef.current = [];
          mediaRecorderRef.current = null;
          mediaStreamRef.current?.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
          if (voiceRecordingTimeoutRef.current !== null) {
            window.clearTimeout(voiceRecordingTimeoutRef.current);
            voiceRecordingTimeoutRef.current = null;
          }
          recordingReadyRef.current = null;
          setHasPendingVoiceAudio(Boolean(savedRecording));
          resolve(savedRecording);
        };
        activeRecorder.onerror = () => {
          setVoiceStatus('The browser could not retain the recording for automatic language detection.');
          if (activeRecorder.state !== 'inactive') activeRecorder.stop();
        };
      });
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = activeRecorder;
      recordingReadyRef.current = recordingReady;
      audioChunksRef.current = [];
      recordedAudioRef.current = null;
      recordedDurationRef.current = undefined;
      setHasPendingVoiceAudio(false);
      recordingStartedRef.current = null;
      activeRecorder.start(250);
      setIsListening(true);
      voiceRecordingTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          setVoiceStatus('Recording stopped at 28 seconds. Review the transcript, then press Send.');
          mediaRecorderRef.current.stop();
          setIsListening(false);
          recognitionRef.current?.stop();
        }
      }, 28_000);
      return true;
    } catch {
      if (recorder) {
        recorder.onstart = null;
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') recorder.stop();
      }
      if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
      if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
      recordingReadyRef.current = null;
      audioChunksRef.current = [];
      stream?.getTracks().forEach(track => track.stop());
      if (sessionId === voiceSessionRef.current && isActiveRef.current) {
        setVoiceStatus('Audio capture is unavailable. The browser transcript can still be sent, but automatic language detection may be limited.');
      }
      return false;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      voiceSessionRef.current += 1;
      recognitionRef.current?.stop();
      if (!recognitionRef.current) setIsListening(false);
      void stopVoiceCapture().then(recording => {
        if (!isActiveRef.current) return;
        setIsListening(false);
        setVoiceStatus(recording
          ? 'Recording ready. Review or edit the live text, then press Send to detect the language.'
          : inputQuery.trim() ? 'Transcript ready. Review it and press Send.' : 'No speech was recorded. Try again or type your question.');
      });
      return;
    }
    if (startingRecognitionRef.current || isLoading) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const canCaptureAudio = Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
    if (!Recognition && !canCaptureAudio) {
      setVoiceStatus('This browser cannot record or recognize speech. Try Chrome or Edge, or type your question.');
      return;
    }

    stopAudio();
    setVoiceStatus('');
    recognitionBaseTextRef.current = inputQuery.trim();
    browserVoiceTextRef.current = inputQuery.trim();
    voiceInputEditedRef.current = false;
    startingRecognitionRef.current = Boolean(Recognition);
    voiceInputPendingRef.current = false;
    recordedAudioRef.current = null;
    setHasPendingVoiceAudio(false);
    voiceSessionRef.current += 1;
    const sessionId = voiceSessionRef.current;
    void startVoiceCapture(sessionId).then(captured => {
      if (!captured && !Recognition && sessionId === voiceSessionRef.current) setIsListening(false);
    });

    if (!Recognition) {
      setIsListening(true);
      setVoiceStatus('Recording. Stop when done, then Send to recognize your language.');
      return;
    }

    try {
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = speechLocale(language);
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        startingRecognitionRef.current = false;
        setIsListening(true);
        setVoiceStatus('Listening. Check the preview before sending your question.');
      };
      recognition.onresult = event => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) {
          transcript += `${event.results[index][0].transcript} `;
        }
        const recognizedText = transcript.trim();
        if (!recognizedText) return;
        voiceInputPendingRef.current = true;
        const baseText = recognitionBaseTextRef.current;
        const fullPreview = baseText ? `${baseText} ${recognizedText}` : recognizedText;
        browserVoiceTextRef.current = fullPreview;
        if (!voiceInputEditedRef.current) setInputQuery(fullPreview);
        setVoiceStatus('Text ready. Stop when done, check it, then tap Send.');
      };
      recognition.onerror = event => {
        startingRecognitionRef.current = false;
        setVoiceStatus(speechErrorMessage(event.error));
      };
      recognition.onend = () => {
        startingRecognitionRef.current = false;
        recognitionRef.current = null;
        const isRecorderStillActive = mediaRecorderRef.current?.state === 'recording';
        if (!isRecorderStillActive) setIsListening(false);
        if (!voiceInputPendingRef.current && !recordedAudioRef.current && !mediaRecorderRef.current && isActiveRef.current) {
          setVoiceStatus(current => current || 'No speech was recognized. Try again or type your question.');
        }
      };
      recognition.start();
      startingRecognitionRef.current = false;
      setIsListening(true);
    } catch {
      startingRecognitionRef.current = false;
      recognitionRef.current = null;
      if (!canCaptureAudio) setIsListening(false);
      setVoiceStatus(canCaptureAudio
        ? 'Live text is unavailable. Send the recording for speech recognition.'
        : 'The browser could not start speech recognition. Check microphone access and try again.');
    }
  };

  const handleSendMessage = async (
    queryToSend?: string,
    options: { autoSpeak?: boolean; languageCode?: string } = {},
  ) => {
    if (isLoading || sendingRef.current) return;
    const query = (queryToSend ?? inputQuery).trim();
    const audioPending = Boolean(recordedAudioRef.current || mediaRecorderRef.current);
    if (!query && !audioPending) return;
    sendingRef.current = true;
    const turnController = new AbortController();
    turnAbortRef.current = turnController;
    const browserPreview = browserVoiceTextRef.current.trim();
    const voiceTextWasEdited = voiceInputEditedRef.current || Boolean(browserPreview && query !== browserPreview);
    const voiceBaseText = recognitionBaseTextRef.current;
    let responseLanguage = options.languageCode || languageFromTranscript(query, language);
    const autoSpeak = options.autoSpeak ?? (voiceInputPendingRef.current || audioPending);
    voiceInputPendingRef.current = false;
    voiceSessionRef.current += 1;
    const activeRecognition = recognitionRef.current;
    recognitionRef.current = null;
    if (activeRecognition) {
      activeRecognition.onresult = null;
      activeRecognition.onend = null;
      activeRecognition.stop();
    }
    setIsListening(false);
    stopAudio();

    messageCounterRef.current += 1;
    const userMsgId = `user-${messageCounterRef.current}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query || 'Recognizing voice question…',
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setHasPendingVoiceAudio(false);
    setVoiceStatus(audioPending ? 'Detecting the spoken language and finalizing the transcript…' : '');
    setIsLoading(true);

    let retryQuery = query;
    let incompleteAssistantMessageId: string | null = null;
    try {
      let finalQuery = query;
      const voiceAudio = await stopVoiceCapture();
      turnController.signal.throwIfAborted();
      recordedAudioRef.current = null;
      setHasPendingVoiceAudio(false);
      // An explicitly edited transcript is already the user's final question.
      if (voiceAudio && !voiceTextWasEdited) {
        try {
          const transcriptResult = await requestTranscription(await blobToBase64(voiceAudio),
            voiceAudio.type || 'audio/webm', language, turnController.signal, recordedDurationRef.current);
          responseLanguage = transcriptResult.language;
          if (!voiceTextWasEdited) {
            finalQuery = [voiceBaseText, transcriptResult.transcript.trim()].filter(Boolean).join(' ');
          }
          setMessages(prev => prev.map(message => message.id === userMsgId ? { ...message, text: finalQuery } : message));
        } catch (error) {
          turnController.signal.throwIfAborted();
          if (!finalQuery) {
            recordedAudioRef.current = voiceAudio;
            setHasPendingVoiceAudio(true);
            if ((recordedDurationRef.current ?? 0) > 30) {
              throw new Error(t('This recording could not be transcribed. Try a question under 30 seconds, or type it.'));
            }
            throw error instanceof DOMException && error.name === 'AbortError'
              ? new Error('Speech detection took too long. Try speaking again or type your question.')
              : error;
          }
          responseLanguage = languageFromTranscript(finalQuery, responseLanguage);
          setVoiceStatus('Automatic language detection was unavailable; using your editable browser transcript.');
          setMessages(prev => prev.map(message => message.id === userMsgId
            ? { ...message, note: 'Using the browser transcript. Check that these words are correct.' } : message));
        }
      }
      if (!finalQuery) throw new Error('No speech was recognized. Try again or type your question.');
      retryQuery = finalQuery;

      const advisorInput = normalizeAdvisorInput({
          query: finalQuery,
          language: language === 'hi' ? 'hi' : responseLanguage,
          schemeName: currentSchemeName,
          schemeIds: conversationSchemeIdsRef.current,
          history: messages.filter(message => message.id !== 'welcome-msg' && message.source !== 'local')
            .slice(-4).map(message => ({ sender: message.sender, text: message.text })),
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
      });
      const schemes = relevantSchemes(advisorInput);
      conversationSchemeIdsRef.current = schemes.map(scheme => scheme.id);
      advisorInput.schemeIds = conversationSchemeIdsRef.current;
      setConversationSchemeName(schemes.map(scheme => scheme.name).join('; ') || undefined);
      const result = await requestAdvisor(advisorInput, turnController.signal);
      turnController.signal.throwIfAborted();
      // Offline catalogue recovery may be English. Use the actual reply language
      // rather than sending English fallback text to a different-language voice.
      responseLanguage = result.language || advisorInput.language;

      messageCounterRef.current += 1;
      const aiMsgId = `ai-${messageCounterRef.current}`;
      const assistantMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: result.text,
        languageCode: responseLanguage,
        source: result.source,
        note: result.source === 'local' ? aiFailureMessage(result.reason, language) : undefined,
      };
      incompleteAssistantMessageId = aiMsgId;
      setMessages(prev => [...prev, assistantMsg]);

      incompleteAssistantMessageId = null;
      if (autoSpeak) void speakText(result.text, responseLanguage);
    } catch (err) {
      if (incompleteAssistantMessageId) {
        setMessages(prev => prev.filter(message => message.id !== incompleteAssistantMessageId));
      }
      if (retryQuery) setInputQuery(retryQuery);
      if (turnController.signal.aborted) return;
      const errorMessage = err instanceof DOMException && err.name === 'AbortError'
        ? 'The request was stopped. Your question is back in the box; try again or use the official scheme links on this page.'
        : err instanceof Error
        ? err.message
        : 'There was an error communicating with the advisor. Please check your internet connection and try again.';
      setVoiceStatus(errorMessage);
      messageCounterRef.current += 1;
      const errorId = `err-${messageCounterRef.current}`;
      setMessages(prev => [...prev, { id: errorId, sender: 'assistant', text: errorMessage }]);
    } finally {
      if (turnAbortRef.current === turnController) turnAbortRef.current = null;
      sendingRef.current = false;
      setIsLoading(false);
    }
  };

  const conversationStatus = t(isListening
    ? 'Listening'
    : isLoading
      ? 'Thinking'
      : isGeneratingSpeech
        ? 'Generating speech'
        : isSpeaking
          ? 'Speaking'
          : 'Ready');
  const visibleMessages = messages.map(message => message.id === 'welcome-msg'
    ? { ...message, text: language === 'hi'
      ? 'नमस्ते! किसी scheme, loan या documents के बारे में पूछें। मैं शुरुआती जानकारी दे सकता हूँ; final फैसला agency करती है।'
      : 'Namaste! Scheme, loan ya documents ke baare mein poochhein. Main ek pehla idea de sakta hoon; final faisla agency karti hai.' }
    : message);
  const hasVoiceError = /failed|denied|unavailable|not running|cannot read|could not|no speech|too long|offline|error|not supported|blocked/i.test(voiceStatus);

  return (
    <section aria-labelledby="scheme-bot-heading" className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
            <SchemeBotAvatar className="h-11 w-11" animated={isActive} activity={activity} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="scheme-bot-heading" className="text-lg font-extrabold tracking-tight text-blue-950">Scheme Lens AI</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'recording-glow bg-rose-500' : isGeneratingSpeech || isLoading || isSpeaking ? 'bg-amber-500' : 'bg-blue-500'}`} />
              {conversationStatus}
              <span aria-hidden="true" className="text-blue-200">·</span>
              {t('Scheme information')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close voice chat')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-blue-100 hover:text-blue-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="scheme-bot-intro mt-2 text-xs text-slate-600">{t('Ask about schemes by voice or text.')}</p>
        {isSampleProfile && <p className="mt-2 text-xs font-semibold text-blue-700">{t('Sample profile · stays on this page')}</p>}
        {conversationSchemeName && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-blue-100 bg-white/80 px-2.5 py-1.5 text-xs text-blue-800">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{t('Question about')} {conversationSchemeName}</span>
          </p>
        )}
      </header>

      <div aria-label={t('Suggested questions')} className="scheme-bot-suggestions shrink-0 border-b border-blue-100 bg-white px-4 py-2.5">
        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => {
                voiceInputPendingRef.current = false;
                handleSendMessage(prompt.query, { autoSpeak: false, languageCode: language });
              }}
              disabled={isLoading || isListening || hasPendingVoiceAudio}
              className="min-h-10 shrink-0 whitespace-nowrap rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs font-medium text-blue-900 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t(prompt.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={conversationRef} role="log" aria-label={t('Conversation')} aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-blue-50/40 p-4">
          {visibleMessages.map((message) => (
            <div key={message.id} className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.sender === 'assistant' && (
                <div className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white">
                  <SchemeBotAvatar className="h-8 w-8" />
                </div>
              )}
              <div className={`min-w-0 max-w-[calc(100%-2.5rem)] rounded-2xl px-3.5 py-3 ${message.sender === 'user' ? 'rounded-br-md bg-blue-700 text-white shadow-sm' : 'rounded-bl-md border border-blue-100 bg-white text-slate-800 shadow-sm'}`}>
                <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${message.sender === 'user' ? 'text-blue-100' : 'text-blue-800'}`}>
                  {message.sender === 'user' ? t('You') : 'Scheme bot'}
                </p>
                <div className="whitespace-pre-line break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {message.text}
                </div>
                {message.source && <p className="mt-2 text-[11px] font-semibold text-slate-500">{answerSourceLabel(message.source, message.languageCode || language)}</p>}
                {message.note && <p className="mt-2 text-[11px]">{t(message.note)}</p>}
                {message.sender === 'assistant' && message.text && (
                  <div className="mt-2 flex justify-end border-t border-slate-100 pt-1.5">
                    <button
                      type="button"
                      onClick={() => { void speakText(message.text, message.languageCode || language); }}
                      className="button-motion inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-800"
                      aria-label={t(`${isSpeaking || isGeneratingSpeech ? 'Stop reading' : 'Read'} this reply aloud`)}
                      title={t('Read reply aloud')}
                    >
                      {isSpeaking || isGeneratingSpeech ? <VolumeX className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span>{isSpeaking || isGeneratingSpeech ? t('Stop') : t('Listen')}</span>
                    </button>
                  </div>
                )}
              </div>
              {message.sender === 'user' && (
                <div className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}

          {isLoading && <div className="overflow-hidden rounded-2xl border border-blue-100"><GeneratingAnimation language={language} /></div>}
        </div>

        <div className="shrink-0 border-t border-blue-100 bg-white p-3">
          <form onSubmit={(event) => { event.preventDefault(); void handleSendMessage(); }} className="flex items-center gap-2">
            <button
              type="button"
              id="voice-mic-btn"
              onClick={toggleListening}
              disabled={isLoading}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${isListening ? 'recording-glow border-rose-600 bg-rose-600 text-white' : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'}`}
              aria-label={t(isListening ? 'Stop voice recognition' : 'Start voice recognition')}
              aria-pressed={isListening}
              title={t(isListening ? 'Stop listening and review the transcript' : 'Start browser speech recognition')}
            >
              {isListening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
              <span className="sr-only">{isListening ? t('Stop') : t('Speak')}</span>
            </button>
            <label htmlFor="chat-query-input" className="sr-only">{t('Your question')}</label>
            <input
              type="text"
              id="chat-query-input"
              value={inputQuery}
              maxLength={2000}
              disabled={isLoading}
              onChange={(event) => {
                if (voiceInputPendingRef.current || hasPendingVoiceAudio) voiceInputEditedRef.current = true;
                setInputQuery(event.target.value);
                setVoiceStatus('');
              }}
              placeholder={t(isListening ? 'Listening…' : 'Ask about a scheme or loan')}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              id="send-chat-btn"
              disabled={(!inputQuery.trim() && !hasPendingVoiceAudio) || isLoading}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('Send question')}
              title={t('Send question')}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <p role="status" aria-live="polite" aria-atomic="true" className={`mt-2 max-h-20 min-h-5 overflow-y-auto overscroll-contain text-xs ${isListening ? 'font-semibold text-rose-700' : isLoading || isGeneratingSpeech ? 'font-medium text-amber-800' : hasVoiceError ? 'text-rose-700' : 'text-slate-500'}`}>
            {voiceStatus ? t(voiceStatus) : t(isListening ? 'Listening. Stop when done, check your words, then tap Send.' : 'Speak, check your words, then tap Send.')}
          </p>
          <p className="scheme-bot-recording-note mt-1 text-[11px] leading-relaxed text-slate-500">{t('Your recording is sent for transcription when needed. Edited text is used directly.')}</p>
        </div>
      </div>
      <div className="scheme-bot-safety flex shrink-0 items-start gap-2 border-t border-blue-100 bg-slate-50 px-4 py-2 text-[11px] leading-relaxed text-slate-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
        <p>{t('Use official channels. Never share OTPs or pay anyone promising approval.')}</p>
      </div>
    </section>
  );
}
