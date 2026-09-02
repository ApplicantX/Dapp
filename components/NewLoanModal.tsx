'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Customer, MetalType, Ornament } from '@/lib/types';
import { CustomDirectAudioEngine } from '@/lib/speechEngine';
import { parseLoanVoice } from '@/lib/voiceParser';
import {
  X,
  Mic,
  MicOff,
  Coins,
  Gem,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  categories: string[];
  onSaveLoan: (customerId: string, loanData: { loanDate: string; loanAmount: number; ornaments: Ornament[]; notes?: string }) => void;
}

export const NewLoanModal: React.FC<NewLoanModalProps> = ({
  isOpen,
  onClose,
  customer,
  categories,
  onSaveLoan,
}) => {
  const [loanAmount, setLoanAmount] = useState<number>(50000);
  const [loanDate, setLoanDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [speechLang, setSpeechLang] = useState<'auto' | 'en' | 'hi'>('auto');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [ornaments, setOrnaments] = useState<Ornament[]>([
    {
      id: 'orn-init-1',
      metal: 'Silver',
      category: 'Kandora',
      weight: 500,
      quantity: 1,
      description: '',
    },
  ]);

  // Custom Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const speechEngineRef = useRef<CustomDirectAudioEngine | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (speechEngineRef.current) speechEngineRef.current.stop();
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);
      setLiveTranscript('');
      setLoanAmount(50000);
      setLoanDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setOrnaments([
        {
          id: `orn-${Date.now()}`,
          metal: 'Silver',
          category: 'Kandora',
          weight: 500,
          quantity: 1,
          description: '',
        },
      ]);
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setLiveTranscript('Listening... Speak loan amount and ornament details in English or Hindi.');
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
      console.warn('Start loan recording error:', e);
      setIsRecording(false);
      setIsSpeaking(false);
    }
  };

  const stopRecording = async () => {
    if (!speechEngineRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    setIsSpeaking(false);
    setLiveTranscript('Transcribing loan details with in-app engine (English & Hindi)...');

    const transcript = await speechEngineRef.current.stop();
    setIsProcessing(false);
    setAudioLevel(0);

    if (transcript && transcript.trim()) {
      setLiveTranscript(transcript);
      const parsed = parseLoanVoice(transcript, categories);
      if (parsed.loanAmount) setLoanAmount(parsed.loanAmount);
      if (parsed.loanDate) setLoanDate(parsed.loanDate);
      if (parsed.ornaments && parsed.ornaments.length > 0) {
        setOrnaments(
          parsed.ornaments.map((o, idx) => ({
            id: `orn-voice-${Date.now()}-${idx}`,
            metal: o.metal,
            category: o.category,
            weight: o.weight,
            quantity: o.quantity,
            description: '',
          }))
        );
      }
    } else {
      setLiveTranscript('Microphone was quiet. Please speak closer to your microphone and try again.');
    }
  };

  const updateOrnament = (index: number, updates: Partial<Ornament>) => {
    setOrnaments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const addOrnament = () => {
    setOrnaments((prev) => [
      ...prev,
      {
        id: `orn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        metal: 'Silver',
        category: 'Kada',
        weight: 200,
        quantity: 1,
        description: '',
      },
    ]);
  };

  const removeOrnament = (index: number) => {
    if (ornaments.length === 1) return;
    setOrnaments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    if (!loanAmount || loanAmount <= 0) {
      alert('Please enter a valid loan amount.');
      return;
    }

    if (ornaments.length === 0) {
      alert('Please add at least one ornament.');
      return;
    }

    onSaveLoan(customer.id, {
      loanDate,
      loanAmount: Number(loanAmount),
      ornaments,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen || !customer) return null;

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

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              New Loan for {customer.name}
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              Village: <strong className="text-purple-700">{customer.village}</strong> • {customer.diary}, Page {customer.pageNumber}
            </p>
          </div>
        </div>

        {/* Voice Bar with Language Switcher */}
        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Voice Loan Entry</span>
              </span>
              {/* Language Pills */}
              <div className="flex items-center bg-zinc-200/80 p-0.5 rounded-full text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSpeechLang('auto')}
                  className={`px-2 py-0.5 rounded-full transition-all ${
                    speechLang === 'auto' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'text-zinc-600'
                  }`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setSpeechLang('en')}
                  className={`px-2 py-0.5 rounded-full transition-all ${
                    speechLang === 'en' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'text-zinc-600'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setSpeechLang('hi')}
                  className={`px-2 py-0.5 rounded-full transition-all ${
                    speechLang === 'hi' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'text-zinc-600'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Speak amount and ornaments (e.g. *"500g silver kandora for 50,000 rupees"* or *"500 ग्राम चांदी कंदोरा पचास हजार रुपये"*).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {isRecording && (
              <div className="flex items-center gap-1 h-6 px-2 py-1 bg-white rounded-lg border border-zinc-200">
                <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isSpeaking ? 'bg-purple-600' : 'bg-zinc-300'
                    }`}
                    style={{
                      height: `${Math.max(3, Math.round(audioLevel * 18 * (0.4 + 0.6 * Math.sin(i + Date.now() / 150))))}px`,
                    }}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-xs transition-all flex-shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                  : isProcessing
                  ? 'bg-zinc-200 text-zinc-400'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </>
              ) : isProcessing ? (
                <span>Wait...</span>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Speak</span>
                </>
              )}
            </button>
          </div>
        </div>

        {(isRecording || liveTranscript) && (
          <div className="bg-white p-4 rounded-xl border-2 border-purple-500/30 shadow-sm text-xs space-y-1.5 mb-4 animate-in fade-in">
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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Loan Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="500"
                required
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-200 text-purple-700 font-bold text-base focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Loan Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-800 font-medium text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Gem className="w-3.5 h-3.5 text-purple-600" />
                <span>Pledged Ornaments ({ornaments.length})</span>
              </span>

              <button
                type="button"
                onClick={addOrnament}
                className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {ornaments.map((orn, idx) => (
                <div
                  key={orn.id || idx}
                  className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-700 text-[10px] uppercase">
                      Item #{idx + 1}
                    </span>
                    {ornaments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrnament(idx)}
                        className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-zinc-500 block mb-0.5">Metal</label>
                      <select
                        value={orn.metal}
                        onChange={(e) => updateOrnament(idx, { metal: e.target.value as MetalType })}
                        className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium text-xs focus:bg-white focus:border-purple-500"
                      >
                        <option value="Gold">🪙 Gold (સોનું / सोना)</option>
                        <option value="Silver">🥈 Silver (ચાંદી / चांदी)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-zinc-500 block mb-0.5">Category</label>
                      <select
                        value={orn.category}
                        onChange={(e) => updateOrnament(idx, { category: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium text-xs focus:bg-white focus:border-purple-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-zinc-600 block mb-0.5">Weight (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={orn.weight}
                        onChange={(e) => updateOrnament(idx, { weight: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs focus:bg-white focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-zinc-500 block mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={orn.quantity}
                        onChange={(e) => updateOrnament(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:bg-white focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={orn.description || ''}
                      onChange={(e) => updateOrnament(idx, { description: e.target.value })}
                      placeholder="Optional notes (e.g. Heavy Kandora with floral bells)"
                      className="w-full px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 text-[11px] focus:bg-white focus:border-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lent against silver ornaments"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
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
              <span>Save Loan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
