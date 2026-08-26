'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Customer, ParsedCustomerVoice } from '@/lib/types';
import { ContinuousSpeechEngine } from '@/lib/speechEngine';
import { parseBulkCustomersVoice, parseSingleCustomerVoice } from '@/lib/voiceParser';
import {
  X,
  Mic,
  MicOff,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  MapPin,
  Phone,
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

  // Continuous Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [parsedCards, setParsedCards] = useState<ParsedCustomerVoice[]>([]);
  const speechEngineRef = useRef<ContinuousSpeechEngine | null>(null);

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
      stopRecording();
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
      setLiveTranscript('');
      setParsedCards([]);
      setIsRecording(true);

      speechEngineRef.current = new ContinuousSpeechEngine('en-IN');
      await speechEngineRef.current.start({
        onInterimResult: (transcript) => {
          setLiveTranscript(transcript);
        },
        onFinalResult: (transcript) => {
          setLiveTranscript(transcript);
        },
        onError: (err) => {
          console.warn('Voice recording error:', err);
          setIsRecording(false);
        },
      });
    } catch (e) {
      console.warn('Start recording error:', e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (speechEngineRef.current) {
      const fullText = speechEngineRef.current.stop();
      if (fullText.trim()) {
        const results = parseBulkCustomersVoice(fullText, villages);
        setParsedCards(results);
      }
    }
    setIsRecording(false);
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

    // Validate each customer card
    const invalid = parsedCards.find((c) => !c.name.trim() || !c.village.trim() || !c.pageNumber.trim());
    if (invalid) {
      alert(`Please fill in the missing Name, Village, or Page Number for "${invalid.name || 'Customer'}" before saving.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full bg-purple-800/80 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-600/40 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Add Customer Account (નવું ગ્રાહક ખાતું)
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 font-medium">
              Voice-first or manual entry with physical diary & page reference.
            </p>
          </div>
        </div>

        {/* Mode Tabs (Voice vs Manual) */}
        <div className="flex items-center gap-2 mb-6 bg-purple-900/90 p-1 rounded-2xl border border-purple-700">
          <button
            type="button"
            onClick={() => setActiveTab('VOICE')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'VOICE'
                ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Voice Entry (Single or Bulk)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MANUAL')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'MANUAL'
                ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <span>Manual Form</span>
          </button>
        </div>

        {/* VOICE TAB CONTENT */}
        {activeTab === 'VOICE' && (
          <div className="space-y-6">
            {/* Center Giant Microphone / STOP Button */}
            <div className="flex flex-col items-center justify-center py-4 bg-purple-950/70 rounded-3xl border border-purple-800">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 transition-all transform active:scale-95 ${
                  isRecording
                    ? 'bg-rose-600 border-gold-300 shadow-[0_0_40px_rgba(225,29,72,0.7)] animate-pulse'
                    : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-gold-500 border-gold-400 shadow-purple-glow hover:scale-105'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-10 h-10 text-white animate-bounce" />
                    <span className="text-xs font-black uppercase text-white mt-1">STOP</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10 text-white" />
                    <span className="text-xs font-black uppercase text-gold-200 mt-1">TAP & SPEAK</span>
                  </>
                )}
              </button>

              <p className="text-xs sm:text-sm font-semibold text-purple-200 mt-3 text-center px-4">
                {isRecording
                  ? 'Continuous listening... Speak one or multiple customers. Press STOP when done.'
                  : 'Tap the microphone and speak: "Ramesh Mishra from Vova village, Diary 2026, Page 142"'}
              </p>
            </div>

            {/* Live Transcript Display */}
            {liveTranscript && (
              <div className="bg-purple-900/80 p-4 rounded-2xl border border-gold-500/30 text-xs">
                <span className="font-bold text-gold-300 uppercase tracking-wider block mb-1">
                  Raw Voice Transcript:
                </span>
                <p className="text-sm font-bold text-white italic">"{liveTranscript}"</p>
              </div>
            )}

            {/* Parsed Numbered Customer Cards */}
            {parsedCards.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Parsed Customers ({parsedCards.length}) - Review & Edit:</span>
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {parsedCards.map((card, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-900/80 p-4 rounded-2xl border border-purple-700 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gold-300 bg-gold-500/20 px-2 py-0.5 rounded">
                          Customer #{idx + 1}
                        </span>
                        {parsedCards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParsedCard(idx)}
                            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-purple-200 block mb-1">Name</label>
                          <input
                            type="text"
                            value={card.name}
                            onChange={(e) => updateParsedCard(idx, { name: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-700 text-white font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-purple-200 block mb-1">Village</label>
                          <input
                            type="text"
                            value={card.village}
                            onChange={(e) => updateParsedCard(idx, { village: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-700 text-gold-200 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-purple-200 block mb-1">Diary</label>
                          <input
                            type="text"
                            value={card.diary}
                            onChange={(e) => updateParsedCard(idx, { diary: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-700 text-white font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-purple-200 block mb-1">Page Number</label>
                          <input
                            type="text"
                            value={card.pageNumber}
                            onChange={(e) => updateParsedCard(idx, { pageNumber: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-purple-950 border-2 border-gold-500/60 text-gold-300 font-black text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save All Customers Action */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllBatch}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-sm shadow-gold-glow transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>SAVE ALL {parsedCards.length} CUSTOMER{parsedCards.length > 1 ? 'S' : ''}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL FORM TAB CONTENT */}
        {activeTab === 'MANUAL' && (
          <form onSubmit={handleSaveManual} className="space-y-4">
            {validationError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Customer Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200">
                Customer Name (ગ્રાહકનું નામ) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Mishra"
                className="w-full px-4 py-3 rounded-xl bg-purple-900 border-2 border-purple-700 focus:border-gold-400 text-white font-bold text-base focus:outline-none"
              />
            </div>

            {/* Village Dropdown + Custom Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-200">
                  Village (ગામ) <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomVillage(!isCustomVillage)}
                  className="text-xs font-bold text-gold-300 hover:underline"
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
                  className="w-full px-4 py-3 rounded-xl bg-purple-900 border-2 border-gold-400 text-gold-200 font-bold text-base focus:outline-none"
                />
              ) : (
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-purple-900 border-2 border-purple-700 focus:border-gold-400 text-white font-bold text-base focus:outline-none"
                >
                  {villages.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Diary & Page Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-200">
                  Diary Reference <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={diary}
                  onChange={(e) => setDiary(e.target.value)}
                  placeholder="e.g. Diary 2026"
                  className="w-full px-4 py-3 rounded-xl bg-purple-900 border border-purple-700 text-white font-bold text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gold-300">
                  Page Number (પાના નંબર) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="e.g. 142"
                  className="w-full px-4 py-3 rounded-xl bg-purple-900 border-2 border-gold-500 text-gold-300 font-black text-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Mobile (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200">Mobile Number (Optional)</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9825123456"
                className="w-full px-4 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-medium text-sm focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-sm shadow-gold-glow transition-all active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Save Customer (ખાતું બનાવો)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
