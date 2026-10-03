'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  languageCode?: string;
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
  ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK', uz: 'uz-UZ', vi: 'vi-VN', ja: 'ja-JP',
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
  return /[\u0900-\u097F]/.test(text) ? 'hi' : fallback;
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
  isActive = true,
}: VoiceAIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Namaste! Scheme, loan ya documents ke baare mein poochhein. Main ek pehla idea de sakta hoon; final faisla agency karti hai.`,
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [listeningState, setIsListening] = useState<boolean>(false);
  const [generatingSpeechState, setIsGeneratingSpeech] = useState<boolean>(false);
  const [speakingState, setIsSpeaking] = useState<boolean>(false);
  const [pendingVoiceAudioState, setHasPendingVoiceAudio] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioRef = useRef<Blob | null>(null);
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
  const isListening = isActive && listeningState;
  const hasPendingVoiceAudio = isActive && pendingVoiceAudioState;
  const isGeneratingSpeech = isActive && generatingSpeechState;
  const isSpeaking = isActive && speakingState;

  // Suggested Prompts
  const suggestedPrompts = [
    { label: 'Could I get a loan?', query: 'Based on the details in my profile, could I get a loan? Which listed schemes might fit, and what do I still need to confirm?' },
    { label: 'Small business loan', query: 'What is the current NSFDC Micro Finance Scheme loan limit, rate, and repayment period?' },
    { label: 'Education Loan', query: 'What are the current NSFDC education loan limit and admission requirements?' },
    { label: 'Find an official agency', query: 'How can I find an authorized channel agency and apply safely?' },
  ];

  // Auto scroll to bottom of chat
  useEffect(() => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messages]);

  const discardVoiceCapture = useCallback(() => {
    if (voiceRecordingTimeoutRef.current !== null) {
      window.clearTimeout(voiceRecordingTimeoutRef.current);
      voiceRecordingTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder) {
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
    recognitionRef.current?.abort();
    discardVoiceCapture();
    ttsAbortRef.current?.abort();
    audioRef.current?.pause();
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
    audioRef.current?.pause();
    audioRef.current = null;
    browserSpeechRef.current = null;
    window.speechSynthesis?.cancel();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    queueMicrotask(() => {
      setIsListening(false);
      setHasPendingVoiceAudio(false);
      setIsGeneratingSpeech(false);
      setIsSpeaking(false);
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
    audioRef.current?.pause();
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
  };

  const speakText = async (text: string, languageCode = language) => {
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
    setVoiceStatus('Generating spoken reply with Gemini…');
    let generationTimedOut = false;
    let browserFallbackStarted = false;
    const timeoutId = window.setTimeout(() => {
      generationTimedOut = true;
      controller.abort();
    }, 20_000);
    ttsTimeoutRef.current = timeoutId;

    const tryBrowserSpeech = () => {
      if (browserFallbackStarted || (controller.signal.aborted && !generationTimedOut)) return;
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
        utterance.lang = languageCode === 'hi' ? 'hi-IN' : 'en-IN';
        const localePrefix = languageCode === 'hi' ? 'hi' : 'en';
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
      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText, language: languageCode }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        window.clearTimeout(timeoutId);
        if (ttsTimeoutRef.current === timeoutId) ttsTimeoutRef.current = null;
        throw new Error(typeof data.error === 'string' ? data.error : 'Gemini could not create spoken audio.');
      }

      const audioBlob = await response.blob();
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
      if (ttsAbortRef.current === controller) {
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
      const recordingReady = new Promise<Blob | null>(resolve => {
        activeRecorder.ondataavailable = event => {
          if (event.data.size) audioChunksRef.current.push(event.data);
        };
        activeRecorder.onstop = () => {
          const chunkMimeType = audioChunksRef.current.find(chunk => chunk.type)?.type;
          const recording = new Blob(audioChunksRef.current, { type: activeRecorder.mimeType || chunkMimeType || 'audio/webm' });
          const savedRecording = recording.size ? recording : null;
          recordedAudioRef.current = savedRecording;
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
      setHasPendingVoiceAudio(false);
      activeRecorder.start(250);
      setIsListening(true);
      voiceRecordingTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          setVoiceStatus('Recording stopped at 45 seconds. Review the transcript, then press Send.');
          mediaRecorderRef.current.stop();
          setIsListening(false);
          recognitionRef.current?.stop();
        }
      }, 45_000);
      return true;
    } catch {
      if (recorder) {
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
      setVoiceStatus('Recording. Stop when you are done; Gemini will transcribe and detect English or Hindi when you press Send.');
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
        setVoiceStatus('Listening. Live text is a preview; Gemini checks the recording language when you send.');
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
        setInputQuery(fullPreview);
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
        ? 'Browser live text is unavailable, but Gemini will transcribe the recording after you press Send.'
        : 'The browser could not start speech recognition. Check microphone access and try again.');
    }
  };

  const handleSendMessage = async (
    queryToSend?: string,
    options: { autoSpeak?: boolean; languageCode?: string } = {},
  ) => {
    if (isLoading) return;
    const query = (queryToSend ?? inputQuery).trim();
    const audioPending = Boolean(recordedAudioRef.current || mediaRecorderRef.current);
    if (!query && !audioPending) return;
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
    let advisorController: AbortController | null = null;
    let advisorTimeoutId: number | null = null;
    let advisorTimedOut = false;
    try {
      let finalQuery = query;
      const voiceAudio = await stopVoiceCapture();
      recordedAudioRef.current = null;
      setHasPendingVoiceAudio(false);
      if (voiceAudio) {
        try {
          const transcriptionController = new AbortController();
          const transcriptionTimeoutId = window.setTimeout(() => transcriptionController.abort(), 56_000);
          let transcribeResponse: Response;
          try {
            transcribeResponse = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: await blobToBase64(voiceAudio),
                mimeType: voiceAudio.type || 'audio/webm',
                languageHint: language === 'hi' ? 'hi' : 'en',
              }),
              signal: transcriptionController.signal,
            });
          } finally {
            window.clearTimeout(transcriptionTimeoutId);
          }
          const transcriptResult = await transcribeResponse.json().catch(() => ({}));
          if (!transcribeResponse.ok) {
            throw new Error(typeof transcriptResult.error === 'string' ? transcriptResult.error : 'Gemini could not detect the spoken language.');
          }
          if (typeof transcriptResult.transcript !== 'string' || !transcriptResult.transcript.trim()) {
            throw new Error('No speech was recognized. Try again or type your question.');
          }
          responseLanguage = transcriptResult.language === 'hi'
            || /[\u0900-\u097F]/.test(transcriptResult.transcript)
            || /[\u0900-\u097F]/.test(finalQuery)
            ? 'hi'
            : 'en';
          if (!voiceTextWasEdited) {
            finalQuery = [voiceBaseText, transcriptResult.transcript.trim()].filter(Boolean).join(' ');
          }
          setMessages(prev => prev.map(message => message.id === userMsgId ? { ...message, text: finalQuery } : message));
        } catch (error) {
          if (!finalQuery) {
            throw error instanceof DOMException && error.name === 'AbortError'
              ? new Error('Speech detection took too long. Try speaking again or type your question.')
              : error;
          }
          responseLanguage = languageFromTranscript(finalQuery, responseLanguage);
          setVoiceStatus('Automatic language detection was unavailable; using your editable browser transcript.');
        }
      }
      if (!finalQuery) throw new Error('No speech was recognized. Try again or type your question.');
      retryQuery = finalQuery;

      advisorController = new AbortController();
      advisorTimeoutId = window.setTimeout(() => {
        advisorTimedOut = true;
        advisorController?.abort();
      }, 50_000);
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: advisorController.signal,
        body: JSON.stringify({
          query: finalQuery,
          language: responseLanguage,
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'The advisor could not process your question. Please try again.');
      }
      if (!res.body) throw new Error('The advisor response stream was unavailable. Please try again.');

      messageCounterRef.current += 1;
      const aiMsgId = `ai-${messageCounterRef.current}`;
      const assistantMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: '',
        languageCode: responseLanguage,
      };
      incompleteAssistantMessageId = aiMsgId;
      setMessages(prev => [...prev, assistantMsg]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pendingLine = '';
      let reply = '';
      let streamError = '';
      const applyEvent = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as { type?: unknown; text?: unknown; error?: unknown };
        if (event.type === 'delta' && typeof event.text === 'string') {
          reply += event.text;
          setMessages(prev => prev.map(message => message.id === aiMsgId ? { ...message, text: reply } : message));
        } else if (event.type === 'error') {
          streamError = typeof event.error === 'string' ? event.error : 'The advisor stream ended unexpectedly.';
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        pendingLine += decoder.decode(value, { stream: !done });
        const lines = pendingLine.split('\n');
        pendingLine = lines.pop() || '';
        for (const line of lines) applyEvent(line.trimEnd());
        if (done) break;
      }
      if (pendingLine.trim()) applyEvent(pendingLine.trimEnd());
      if (streamError) throw new Error(streamError);
      if (!reply.trim()) throw new Error('The advisor returned an empty answer. Please try again.');
      incompleteAssistantMessageId = null;
      if (autoSpeak) void speakText(reply, responseLanguage);
    } catch (err) {
      if (incompleteAssistantMessageId) {
        setMessages(prev => prev.filter(message => message.id !== incompleteAssistantMessageId));
      }
      if (retryQuery) setInputQuery(retryQuery);
      const errorMessage = advisorTimedOut
        ? 'The reply took too long and was stopped. Your question is back in the box; try again or use the official scheme links on this page.'
        : err instanceof DOMException && err.name === 'AbortError'
        ? 'The request was stopped. Your question is back in the box; try again or use the official scheme links on this page.'
        : err instanceof Error
        ? err.message
        : 'There was an error communicating with the advisor. Please check your internet connection and try again.';
      setVoiceStatus(errorMessage);
      messageCounterRef.current += 1;
      const errorId = `err-${messageCounterRef.current}`;
      setMessages(prev => [...prev, { id: errorId, sender: 'assistant', text: errorMessage }]);
    } finally {
      if (advisorTimeoutId !== null) window.clearTimeout(advisorTimeoutId);
      setIsLoading(false);
    }
  };

  const conversationStatus = isListening
    ? 'Listening'
    : isLoading
      ? 'Thinking'
      : isGeneratingSpeech
        ? 'Generating speech'
        : isSpeaking
          ? 'Speaking'
          : 'Ready';
  const hasVoiceError = /failed|denied|unavailable|not running|cannot read|could not|no speech|too long|offline|error|not supported|blocked/i.test(voiceStatus);

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
                <span className={`h-2 w-2 rounded-full ${isListening ? 'recording-glow bg-rose-500' : isGeneratingSpeech || isLoading || isSpeaking ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {conversationStatus}
              </span>
            </div>
            <h2 id="assistant-heading" className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Ask about a scheme
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              Speak or type in English or Hindi. Check your words, then tap Send. Replies can be read aloud.
            </p>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              Gemini gets your recording when you tap Send. You can edit the words first.
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
              onClick={() => {
                voiceInputPendingRef.current = false;
                handleSendMessage(prompt.query, { autoSpeak: false });
              }}
              disabled={isLoading || isListening || hasPendingVoiceAudio}
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
              <p className="text-[11px] text-slate-500">Scheme information</p>
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
                {message.sender === 'assistant' && message.text && (
                  <div className="mt-2 flex justify-end border-t border-slate-100 pt-1.5">
                    <button
                      type="button"
                      onClick={() => { void speakText(message.text, message.languageCode || language); }}
                      className="button-motion inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-800"
                      aria-label={`${isSpeaking || isGeneratingSpeech ? 'Stop reading' : 'Read'} this reply aloud`}
                      title="Read reply aloud with Gemini"
                    >
                      {isSpeaking || isGeneratingSpeech ? <VolumeX className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span>{isSpeaking || isGeneratingSpeech ? 'Stop' : 'Listen'}</span>
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
                <span>One moment…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <form onSubmit={(event) => { event.preventDefault(); void handleSendMessage(); }} className="flex items-center gap-2">
            <button
              type="button"
              id="voice-mic-btn"
              onClick={toggleListening}
              disabled={isLoading}
              className={`button-motion inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${isListening ? 'recording-glow border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800'}`}
              aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
              aria-pressed={isListening}
              title={isListening ? 'Stop listening and review the transcript' : 'Start browser speech recognition'}
            >
              {isListening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                <span>{isListening ? 'Stop' : 'Speak'}</span>
            </button>
            <label htmlFor="chat-query-input" className="sr-only">Your question</label>
            <input
              type="text"
              id="chat-query-input"
              value={inputQuery}
              disabled={isLoading}
              onChange={(event) => {
                if (voiceInputPendingRef.current || hasPendingVoiceAudio) voiceInputEditedRef.current = true;
                setInputQuery(event.target.value);
                setVoiceStatus('');
              }}
              placeholder={isListening ? 'Listening…' : 'Ask about a scheme or loan'}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white sm:px-4"
            />
            <button
              type="submit"
              id="send-chat-btn"
              disabled={(!inputQuery.trim() && !hasPendingVoiceAudio) || isLoading}
              className="button-motion inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white shadow-xs hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send question"
              title="Send question"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <p role="status" aria-live="polite" aria-atomic="true" className={`mt-2 min-h-5 text-xs ${isListening ? 'font-semibold text-rose-700' : isLoading || isGeneratingSpeech ? 'font-medium text-amber-800' : hasVoiceError ? 'text-rose-700' : 'text-slate-500'}`}>
            {voiceStatus || (isListening ? 'Listening. Stop when done, check your words, then tap Send.' : 'Speak, check your words, then tap Send.')}
          </p>
        </div>
      </div>
    </section>
  );
}
