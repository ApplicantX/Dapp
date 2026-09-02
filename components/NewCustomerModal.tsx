'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Customer, ParsedCustomerVoice } from '@/lib/types';
import { CustomDirectAudioEngine } from '@/lib/speechEngine';
import { parseBulkCustomersVoice } from '@/lib/voiceParser';
import {
  X,
  Mic,
  MicOff,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  villages: string[];
  diaries: string[];
  onSaveCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveBatchCustomers: (customers: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  villages,
  diaries,
  onSaveCustomer,
  onSaveBatchCustomers,
}) => {
  const [activeTab, setActiveTab] = useState<'VOICE' | 'MANUAL'>('VOICE');

  // Custom Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speechLang, setSpeechLang] = useState<'auto' | 'en' | 'hi'>('auto');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [parsedCards, setParsedCards] = useState<ParsedCustomerVoice[]>([]);
  const speechEngineRef = useRef<CustomDirectAudioEngine | null>(null);

  // Manual Form State
  const [name, setName] = useState('');
  const [village, setVillage] = useState(villages[0] || 'Dahod');
  const [customVillage, setCustomVillage] = useState('');
  const [isCustomVillage, setIsCustomVillage] = useState(false);
  const [diary, setDiary] = useState(diaries[0] || 'Diary 2026');
  const [pageNumber, setPageNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      if (speechEngineRef.current) speechEngineRef.current.stop();
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);
      setLiveTranscript('');
      setParsedCards([]);
      setName('');
      setPageNumber('');
      setMobile('');
      setValidationError('');
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setLiveTranscript('Listening... Speak customer name and details in English or Hindi.');
      setParsedCards([]);
      setIsRecording(true);
      setIsSpeaking(false);

      speechEngineRef.current = new CustomDirectAudioEngine(speechLang);
      await speechEngineRef.current.start({
        onAudioLevel: (lvl) => setAudioLevel(lvl),
        onSpeechDetected: (speaking) => setIsSpeaking(speaking),
        onInterimResult: (text) => setLiveTranscript(text),
        onError: (err) => {
          alert(err);
          setIsRecording(false);
          setIsSpeaking(false);
        },
      });
    } catch (e) {
      console.warn('Start recording error:', e);
      setIsRecording(false);
      setIsSpeaking(false);
    }
  };

  const stopRecording = async () => {
    if (!speechEngineRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    setIsSpeaking(false);
    setLiveTranscript('Transcribing audio with in-app engine (English & Hindi)...');

    const transcript = await speechEngineRef.current.stop();
    setIsProcessing(false);
    setAudioLevel(0);

    if (transcript && transcript.trim()) {
      setLiveTranscript(transcript);
      const results = parseBulkCustomersVoice(transcript, villages);
      setParsedCards(results);
    } else {
      setLiveTranscript('Microphone was quiet. Please speak closer to your microphone and try again.');
    }
  };

  const updateParsedCard = (index: number, updates: Partial<ParsedCustomerVoice>) => {
    setParsedCards((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const removeParsedCard = (index: number) => {
    setParsedCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAllBatch = () => {
    if (parsedCards.length === 0) return;

    const invalid = parsedCards.find((c) => !c.name.trim() || !c.village.trim() || !c.pageNumber.trim());
    if (invalid) {
      alert(`Please fill in Name, Village, and Page Number for "${invalid.name || 'Customer'}" before saving.`);
      return;
    }

    const payload = parsedCards.map((c) => ({
      name: c.name.trim(),
      village: c.village.trim(),
      diary: c.diary.trim() || 'Diary 2026',
      pageNumber: c.pageNumber.trim(),
      mobile: c.mobile ? c.mobile.trim() : undefined,
    }));

    onSaveBatchCustomers(payload);
    onClose();
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const finalVillage = isCustomVillage ? customVillage.trim() : village.trim();

    if (!name.trim()) {
      setValidationError('Please enter the customer name.');
      return;
    }
    if (!finalVillage) {
      setValidationError('Please select or enter a village.');
      return;
    }
    if (!diary.trim()) {
      setValidationError('Please select or enter a diary reference.');
      return;
    }
    if (!pageNumber.trim()) {
      setValidationError('Please enter the physical diary page number.');
      return;
    }

    onSaveCustomer({
      name: name.trim(),
      village: finalVillage,
      diary: diary.trim(),
      pageNumber: pageNumber.trim(),
      mobile: mobile.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Add Customer Account
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              In-app voice or manual entry with physical diary reference.
            </p>
          </div>
        </div>

        {/* Mode Tabs & Language Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-full border border-zinc-200/80 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('VOICE')}
              className={`flex-1 py-1.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'VOICE'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANUAL')}
              className={`flex-1 py-1.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'MANUAL'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>Manual Form</span>
            </button>
          </div>

          {activeTab === 'VOICE' && (
            <div className="flex items-center bg-zinc-100 p-1 rounded-full border border-zinc-200 text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSpeechLang('auto')}
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  speechLang === 'auto' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'text-zinc-600'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setSpeechLang('en')}
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  speechLang === 'en' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'text-zinc-600'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setSpeechLang('hi')}
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  speechLang === 'hi' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'text-zinc-600'
                }`}
              >
                हिन्दी
              </button>
            </div>
          )}
        </div>

        {/* VOICE TAB */}
        {activeTab === 'VOICE' && (
          <div className="space-y-5">
            <div className="flex flex-col items-center justify-center py-6 bg-zinc-50 rounded-2xl border border-zinc-200">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center border transition-all transform active:scale-95 ${
                  isRecording
                    ? 'bg-rose-600 border-rose-400 text-white shadow-md animate-pulse'
                    : isProcessing
                    ? 'bg-zinc-200 border-zinc-300 text-zinc-400'
                    : 'bg-purple-600 hover:bg-purple-700 border-purple-500 text-white shadow-sm hover:scale-105'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-7 h-7 text-white" />
                    <span className="text-[9px] font-bold uppercase text-white mt-1">STOP</span>
                  </>
                ) : isProcessing ? (
                  <span className="text-[9px] font-bold">WAIT...</span>
                ) : (
                  <>
                    <Mic className="w-7 h-7 text-white" />
                    <span className="text-[9px] font-bold uppercase text-white mt-1">SPEAK</span>
                  </>
                )}
              </button>

              {isRecording && (
                <div className="flex items-center gap-1 h-6 px-3 py-1 mt-3 bg-white rounded-xl border border-zinc-200 shadow-sm">
                  <Volume2 className="w-3.5 h-3.5 text-purple-600 mr-1" />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isSpeaking ? 'bg-purple-600' : 'bg-zinc-300'
                      }`}
                      style={{
                        height: `${Math.max(3, Math.round(audioLevel * 20 * (0.4 + 0.6 * Math.sin(i + Date.now() / 150))))}px`,
                      }}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs font-medium text-zinc-500 mt-3 text-center px-4 max-w-md">
                {isRecording
                  ? isSpeaking
                    ? '● Voice Detected! Keep speaking...'
                    : 'Listening... Speak in English or Hindi. Tap STOP when finished.'
                  : isProcessing
                  ? 'Transcribing with in-app engine...'
                  : 'Tap and speak: "Ramesh Mishra from Vova village, Diary 2026, Page 142" or "सुरेश डामोर गरबाड़ा डायरी 2026 पेज 50"'}
              </p>
            </div>

            {(isRecording || liveTranscript) && (
              <div className="bg-white p-4 rounded-xl border-2 border-purple-500/30 shadow-sm text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    {isRecording ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                        </span>
                        <span>Live Speech Stream:</span>
                      </>
                    ) : (
                      <span>Transcription Output:</span>
                    )}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {isRecording ? (isSpeaking ? 'Speaking...' : 'Listening...') : 'Complete'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-900 leading-relaxed min-h-[36px] bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                  {liveTranscript || (
                    <span className="text-zinc-400 font-normal italic">
                      Speak now... words appear live as you talk.
                    </span>
                  )}
                </p>
              </div>
            )}

            {parsedCards.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Parsed Customers ({parsedCards.length})</span>
                </span>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {parsedCards.map((card, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                          Customer #{idx + 1}
                        </span>
                        {parsedCards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParsedCard(idx)}
                            className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="text-[10px] font-medium text-zinc-500 block mb-1">Name</label>
                          <input
                            type="text"
                            value={card.name}
                            onChange={(e) => updateParsedCard(idx, { name: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-semibold text-xs focus:bg-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-zinc-500 block mb-1">Village</label>
                          <input
                            type="text"
                            value={card.village}
                            onChange={(e) => updateParsedCard(idx, { village: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 font-semibold text-xs focus:bg-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-zinc-500 block mb-1">Diary</label>
                          <input
                            type="text"
                            value={card.diary}
                            onChange={(e) => updateParsedCard(idx, { diary: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs focus:bg-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-purple-700 block mb-1">Page Number</label>
                          <input
                            type="text"
                            value={card.pageNumber}
                            onChange={(e) => updateParsedCard(idx, { pageNumber: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-purple-200 text-purple-700 font-bold text-xs focus:bg-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save All Action */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-full text-zinc-500 hover:text-zinc-800 font-medium text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllBatch}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save {parsedCards.length} Customer{parsedCards.length > 1 ? 's' : ''}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL TAB */}
        {activeTab === 'MANUAL' && (
          <form onSubmit={handleSaveManual} className="space-y-4">
            {validationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Mishra"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-purple-500 text-zinc-900 font-semibold text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700">
                  Village (ગામ) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomVillage(!isCustomVillage)}
                  className="text-[11px] font-semibold text-purple-700 hover:underline"
                >
                  {isCustomVillage ? 'Choose from list' : '+ Enter new village'}
                </button>
              </div>

              {isCustomVillage ? (
                <input
                  type="text"
                  required
                  value={customVillage}
                  onChange={(e) => setCustomVillage(e.target.value)}
                  placeholder="Enter new village name..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-purple-300 text-zinc-900 font-semibold text-sm focus:bg-white focus:outline-none focus:border-purple-500"
                />
              ) : (
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-purple-500 text-zinc-800 font-semibold text-sm focus:outline-none"
                >
                  {villages.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Diary Reference <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={diary}
                  onChange={(e) => setDiary(e.target.value)}
                  placeholder="e.g. Diary 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium text-xs focus:bg-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-700">
                  Page Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="e.g. 142"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-purple-200 text-purple-700 font-bold text-sm focus:bg-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Mobile Number (Optional)</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9825123456"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-zinc-500 hover:text-zinc-800 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Customer</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
