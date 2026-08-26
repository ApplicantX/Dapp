'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CustomAudioRecorder,
  BrowserSpeechEngine,
  speakFeedback,
  playSuccessChime,
} from '@/lib/speechEngine';
import { parseVoiceInput } from '@/lib/voiceParser';
import { StoreSettings, VoiceParseResult } from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import { AudioWaveform } from './AudioWaveform';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  language: Language;
  onActionParsed: (parsed: VoiceParseResult) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  settings,
  language,
  onActionParsed,
}) => {
  const t = translations[language];

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [parsedResult, setParsedResult] = useState<VoiceParseResult | null>(null);
  const [statusMessage, setStatusMessage] = useState(t.tapToSpeak);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>(language);

  const audioRecorderRef = useRef<CustomAudioRecorder | null>(null);
  const browserSpeechRef = useRef<BrowserSpeechEngine | null>(null);

  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setParsedResult(null);
      setStatusMessage(t.tapToSpeak);
    }
  }, [isOpen]);

  const startListening = async () => {
    try {
      setTranscript('');
      setParsedResult(null);
      setIsRecording(true);
      setStatusMessage(t.listening);

      // Initialize browser speech recognition for real-time live preview
      browserSpeechRef.current = new BrowserSpeechEngine(selectedLang);
      browserSpeechRef.current.start({
        onInterimResult: (text) => {
          setTranscript(text);
          const parsed = parseVoiceInput(text);
          setParsedResult(parsed);
        },
        onFinalResult: (text) => {
          setTranscript(text);
          const parsed = parseVoiceInput(text);
          setParsedResult(parsed);
        },
        onError: (err) => {
          console.warn('Browser speech error:', err);
        },
      });

      // Also record high quality audio stream with real-time waveform level
      audioRecorderRef.current = new CustomAudioRecorder();
      await audioRecorderRef.current.start((lvl) => {
        setAudioLevel(lvl);
      });
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      setStatusMessage('Microphone access needed. Please allow microphone permission.');
      setIsRecording(false);
    }
  };

  const stopListening = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setStatusMessage(t.processingAudio);

    // Stop browser speech engine
    if (browserSpeechRef.current) {
      browserSpeechRef.current.stop();
    }

    // Stop audio recorder and get blob
    let audioBlob: Blob | null = null;
    if (audioRecorderRef.current) {
      try {
        audioBlob = await audioRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recorder:', e);
      }
    }

    setAudioLevel(0);

    // If Whisper API Key is present or Whisper service is requested, try API transcription
    if (audioBlob && (settings.groqApiKey || settings.openaiApiKey)) {
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        if (settings.groqApiKey) formData.append('apiKey', settings.groqApiKey);
        else if (settings.openaiApiKey) formData.append('apiKey', settings.openaiApiKey);
        formData.append('service', settings.groqApiKey ? 'groq' : 'openai');
        formData.append('language', selectedLang);

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.transcript && data.transcript.trim().length > 0) {
            setTranscript(data.transcript);
            const parsed = parseVoiceInput(data.transcript);
            setParsedResult(parsed);
          }
        }
      } catch (e) {
        console.warn('API transcription fallback to browser transcript:', e);
      } finally {
        setIsTranscribing(false);
      }
    }

    // Evaluate final result
    const currentText = transcript;
    if (currentText.trim().length > 0) {
      const parsed = parseVoiceInput(currentText);
      setParsedResult(parsed);
      setStatusMessage('Voice processed! Review the details below.');
      if (settings.voiceFeedbackEnabled) {
        playSuccessChime();
        if (parsed.interpretedText) {
          speakFeedback(parsed.interpretedText, selectedLang);
        }
      }
    } else {
      setStatusMessage('No speech detected. Please tap and speak again.');
    }
  };

  const handleApplyResult = () => {
    if (!parsedResult) return;
    onActionParsed(parsedResult);
    onClose();
  };

  const handleChipClick = (example: string) => {
    setTranscript(example);
    const parsed = parseVoiceInput(example);
    setParsedResult(parsed);
    setStatusMessage('Sample command loaded. Tap "Apply Action" below.');
    if (settings.voiceFeedbackEnabled) {
      speakFeedback(parsed.interpretedText, selectedLang);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-800/80 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-600/40 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI Voice Assistant (બોલીને કામ કરો)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Speak to DAPP
          </h2>
          <p className="text-sm text-purple-200 font-medium mt-1">
            Tap the microphone and speak naturally in English, Hindi, or Gujarati.
          </p>

          {/* Language Selection within Modal */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => setSelectedLang('en')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedLang === 'en'
                  ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                  : 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
              }`}
            >
              English (Indian)
            </button>
            <button
              onClick={() => setSelectedLang('hi')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedLang === 'hi'
                  ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                  : 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
              }`}
            >
              हिन्दी (Hindi)
            </button>
            <button
              onClick={() => setSelectedLang('gu')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedLang === 'gu'
                  ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                  : 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
              }`}
            >
              ગુજરાતી (Gujarati)
            </button>
          </div>
        </div>

        {/* Center Giant Microphone Button & Visualizer */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="relative">
            {isRecording && (
              <>
                <div className="absolute -inset-4 rounded-full bg-gold-400/20 animate-ping" />
                <div className="absolute -inset-8 rounded-full bg-purple-500/25 animate-pulse" />
              </>
            )}

            <button
              onClick={isRecording ? stopListening : startListening}
              className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center border-4 transition-all transform active:scale-95 ${
                isRecording
                  ? 'bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 border-gold-300 shadow-[0_0_50px_rgba(244,63,94,0.7)]'
                  : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-gold-500 border-gold-400 shadow-purple-glow hover:scale-105'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-10 h-10 text-white animate-bounce" />
                  <span className="text-xs font-extrabold uppercase text-white mt-1">
                    Tap to Stop
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-12 h-12 text-white" />
                  <span className="text-xs font-extrabold uppercase text-gold-200 mt-1">
                    Tap to Speak
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Audio Waveform */}
          <div className="w-full mt-4">
            <AudioWaveform isRecording={isRecording} audioLevel={audioLevel} />
          </div>

          <p className="text-sm font-semibold text-gold-300 mt-2 text-center">
            {statusMessage}
          </p>
        </div>

        {/* Live / Processed Transcript Box */}
        {transcript && (
          <div className="bg-purple-900/80 border border-gold-500/30 rounded-2xl p-4 mb-4">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block mb-1">
              You Spoke:
            </span>
            <p className="text-base sm:text-lg font-bold text-white italic">
              "{transcript}"
            </p>
          </div>
        )}

        {/* AI Interpretation Card */}
        {parsedResult && parsedResult.action !== 'UNKNOWN' && (
          <div className="bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950 border-2 border-gold-400 rounded-2xl p-4 mb-6 shadow-gold-glow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-gold-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>AI Understood Action:</span>
              </div>
              <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-gold-500 text-purple-950">
                {parsedResult.action.replace('_', ' ')}
              </span>
            </div>

            <p className="text-base font-extrabold text-white mb-3">
              {parsedResult.interpretedText}
            </p>

            {/* Extracted Entity Tags */}
            <div className="flex flex-wrap gap-2 text-xs">
              {parsedResult.customerName && (
                <div className="bg-purple-800/80 px-2.5 py-1 rounded-lg border border-purple-600 text-purple-200 font-medium">
                  👤 Customer: <strong className="text-white">{parsedResult.customerName}</strong>
                </div>
              )}
              {parsedResult.amount && (
                <div className="bg-purple-800/80 px-2.5 py-1 rounded-lg border border-purple-600 text-purple-200 font-medium">
                  💰 Amount: <strong className="text-emerald-300">₹{parsedResult.amount.toLocaleString('en-IN')}</strong>
                </div>
              )}
              {parsedResult.grossWeight && (
                <div className="bg-purple-800/80 px-2.5 py-1 rounded-lg border border-purple-600 text-purple-200 font-medium">
                  ⚖️ Weight: <strong className="text-gold-300">{parsedResult.grossWeight}g</strong>
                </div>
              )}
              {parsedResult.itemDescription && (
                <div className="bg-purple-800/80 px-2.5 py-1 rounded-lg border border-purple-600 text-purple-200 font-medium">
                  💎 Item: <strong className="text-white">{parsedResult.itemDescription}</strong> ({parsedResult.purity || '22K'})
                </div>
              )}
              {parsedResult.interestRate && (
                <div className="bg-purple-800/80 px-2.5 py-1 rounded-lg border border-purple-600 text-purple-200 font-medium">
                  📈 Interest: <strong className="text-amber-300">{parsedResult.interestRate}%/month</strong>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleApplyResult}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-sm sm:text-base shadow-gold-glow transition-all active:scale-95"
              >
                <span>Confirm & Apply</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Sample Voice Command Chips for Mom */}
        <div>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-gold-400" />
            <span>Or try tapping these example voice commands:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              onClick={() =>
                handleChipClick('Add loan for Ramesh Patel 50,000 rupees on 20 gram 22 carat gold chain at 1.5%')
              }
              className="text-left bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/50 hover:border-gold-400/50 p-2.5 rounded-xl text-purple-200 transition-all font-medium"
            >
              🎙️ "Add loan for Ramesh Patel 50,000 on 20g gold chain"
            </button>

            <button
              onClick={() =>
                handleChipClick('Record interest payment of 2,700 rupees for Shardaben Shah')
              }
              className="text-left bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/50 hover:border-gold-400/50 p-2.5 rounded-xl text-purple-200 transition-all font-medium"
            >
              🎙️ "Record interest of 2,700 for Shardaben Shah"
            </button>

            <button
              onClick={() =>
                handleChipClick('રમેશભાઈ પટેલ માટે પચાસ હજાર રૂપિયા લોન ૨૦ ગ્રામ સોનાની ચેઇન પર')
              }
              className="text-left bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/50 hover:border-gold-400/50 p-2.5 rounded-xl text-purple-200 transition-all font-medium"
            >
              🎙️ "રમેશભાઈ માટે ૫૦,૦૦૦ ની લોન ૨૦ ગ્રામ સોનાની ચેઇન પર"
            </button>

            <button
              onClick={() => handleChipClick('Show overdue loans')}
              className="text-left bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/50 hover:border-gold-400/50 p-2.5 rounded-xl text-purple-200 transition-all font-medium"
            >
              🎙️ "Show overdue loans"
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
