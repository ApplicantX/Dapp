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
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
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
      setLiveTranscript('Recording audio directly from microphone...');
      setParsedCards([]);
      setIsRecording(true);

      speechEngineRef.current = new CustomDirectAudioEngine('en');
      await speechEngineRef.current.start({
        onError: (err) => {
          alert(err);
          setIsRecording(false);
        },
      });
    } catch (e) {
      console.warn('Start recording error:', e);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!speechEngineRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    setLiveTranscript('Transcribing audio with Whisper AI...');

    const transcript = await speechEngineRef.current.stop();
    setIsProcessing(false);

    if (transcript && transcript.trim()) {
      setLiveTranscript(transcript);
      const results = parseBulkCustomersVoice(transcript, villages);
      setParsedCards(results);
    } else {
      setLiveTranscript('No speech detected in recording.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#130324] border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-modal my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-900/40 hover:bg-purple-800 text-purple-200 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Add Customer Account
            </h2>
            <p className="text-xs text-purple-200/60 font-medium">
              Custom AI voice or manual entry with physical diary reference.
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-[#1c0733] p-1 rounded-full border border-purple-500/15">
          <button
            type="button"
            onClick={() => setActiveTab('VOICE')}
            className={`flex-1 py-2 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'VOICE'
                ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                : 'text-purple-200/60 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Entry (Single or Bulk)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MANUAL')}
            className={`flex-1 py-2 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'MANUAL'
                ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                : 'text-purple-200/60 hover:text-white'
            }`}
          >
            <span>Manual Form</span>
          </button>
        </div>

        {/* VOICE TAB */}
        {activeTab === 'VOICE' && (
          <div className="space-y-5">
            <div className="flex flex-col items-center justify-center py-6 bg-[#1c0733]/60 rounded-3xl border border-purple-500/15">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 transition-all transform active:scale-95 ${
                  isRecording
                    ? 'bg-rose-600 border-rose-300 text-white shadow-[0_0_30px_rgba(225,29,72,0.6)] animate-pulse'
                    : isProcessing
                    ? 'bg-purple-800 border-purple-600 text-purple-300'
                    : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-gold-500 border-gold-400 shadow-purple-glow hover:scale-105'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-8 h-8 text-white animate-bounce" />
                    <span className="text-[10px] font-bold uppercase text-white mt-1">STOP</span>
                  </>
                ) : isProcessing ? (
                  <span className="text-[10px] font-bold">WAIT...</span>
                ) : (
                  <>
                    <Mic className="w-8 h-8 text-white" />
                    <span className="text-[10px] font-bold uppercase text-gold-200 mt-1">SPEAK</span>
                  </>
                )}
              </button>

              <p className="text-xs font-medium text-purple-200/70 mt-3 text-center px-4 max-w-md">
                {isRecording
                  ? 'Recording raw audio... Speak one or multiple customers. Tap STOP when finished.'
                  : isProcessing
                  ? 'Transcribing audio with Whisper AI...'
                  : 'Tap and speak: "Ramesh Mishra from Vova village, Diary 2026, Page 142"'}
              </p>
            </div>

            {liveTranscript && (
              <div className="bg-[#1c0733] p-3.5 rounded-2xl border border-purple-500/20 text-xs">
                <span className="font-semibold text-gold-300 uppercase tracking-wider block text-[10px] mb-0.5">
                  Transcription Output:
                </span>
                <p className="text-xs font-medium text-white italic">"{liveTranscript}"</p>
              </div>
            )}

            {parsedCards.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                  <span>Parsed Customers ({parsedCards.length})</span>
                </span>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {parsedCards.map((card, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1c0733] p-3.5 rounded-2xl border border-purple-500/15 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gold-300 bg-gold-500/10 px-2 py-0.5 rounded-full">
                          Customer #{idx + 1}
                        </span>
                        {parsedCards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParsedCard(idx)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="text-[10px] font-medium text-purple-200/60 block mb-1">Name</label>
                          <input
                            type="text"
                            value={card.name}
                            onChange={(e) => updateParsedCard(idx, { name: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#130324] border border-purple-500/20 text-white font-bold text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-purple-200/60 block mb-1">Village</label>
                          <input
                            type="text"
                            value={card.village}
                            onChange={(e) => updateParsedCard(idx, { village: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#130324] border border-purple-500/20 text-gold-200 font-bold text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-purple-200/60 block mb-1">Diary</label>
                          <input
                            type="text"
                            value={card.diary}
                            onChange={(e) => updateParsedCard(idx, { diary: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#130324] border border-purple-500/20 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-purple-200/60 block mb-1">Page Number</label>
                          <input
                            type="text"
                            value={card.pageNumber}
                            onChange={(e) => updateParsedCard(idx, { pageNumber: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#130324] border border-gold-500/40 text-gold-300 font-bold text-xs"
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
                    className="px-4 py-2 rounded-full text-purple-200/70 hover:text-white font-medium text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllBatch}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all"
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
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/80">
                Customer Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Mishra"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c0733] border border-purple-500/20 focus:border-gold-400/60 text-white font-bold text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-purple-200/80">
                  Village (ગામ) <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomVillage(!isCustomVillage)}
                  className="text-[11px] font-semibold text-gold-400 hover:underline"
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
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c0733] border border-gold-400 text-gold-200 font-bold text-sm focus:outline-none"
                />
              ) : (
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c0733] border border-purple-500/20 focus:border-gold-400/60 text-white font-bold text-sm focus:outline-none"
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
                <label className="text-xs font-semibold text-purple-200/80">
                  Diary Reference <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={diary}
                  onChange={(e) => setDiary(e.target.value)}
                  placeholder="e.g. Diary 2026"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c0733] border border-purple-500/20 text-white font-semibold text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gold-300">
                  Page Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="e.g. 142"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c0733] border border-gold-500/40 text-gold-300 font-bold text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/70">Mobile Number (Optional)</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9825123456"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c0733] border border-purple-500/20 text-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-purple-200/70 hover:text-white font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all"
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
