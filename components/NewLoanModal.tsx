'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Customer, MetalType, Ornament } from '@/lib/types';
import { ContinuousSpeechEngine } from '@/lib/speechEngine';
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
  Calendar,
  Sparkles,
  AlertCircle,
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

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const speechEngineRef = useRef<ContinuousSpeechEngine | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
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
      setLiveTranscript('');
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
      console.warn('Start loan recording error:', e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (speechEngineRef.current) {
      const fullText = speechEngineRef.current.stop();
      if (fullText.trim()) {
        const parsed = parseLoanVoice(fullText, categories);
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
      }
    }
    setIsRecording(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full bg-purple-800/80 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-600/40 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              New Loan for {customer.name}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 font-medium">
              Village: <strong className="text-gold-300">{customer.village}</strong> • {customer.diary}, Page {customer.pageNumber}
            </p>
          </div>
        </div>

        {/* Voice Capture Bar */}
        <div className="bg-purple-950/70 p-4 rounded-2xl border border-purple-800 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice Loan Entry (બોલીને લોન દાખલ કરો)</span>
            </span>
            <p className="text-xs text-purple-200">
              Speak amount and ornaments (e.g. *"500g silver kandora and 200g silver kada for 50,000 rupees"*).
            </p>
          </div>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all transform active:scale-95 ${
              isRecording
                ? 'bg-rose-600 text-white border-2 border-gold-300 animate-pulse'
                : 'bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 shadow-gold-glow'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 animate-bounce" />
                <span>STOP RECORDING</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Speak Statement</span>
              </>
            )}
          </button>
        </div>

        {liveTranscript && (
          <div className="bg-purple-900/80 p-3.5 rounded-2xl border border-gold-500/30 text-xs mb-5">
            <span className="font-bold text-gold-300 uppercase tracking-wider block mb-1">
              Captured Voice:
            </span>
            <p className="text-sm font-bold text-white italic">"{liveTranscript}"</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Loan Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-950/70 p-4 rounded-2xl border border-purple-800">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gold-300">
                Loan Amount (રૂપિયા / INR) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="500"
                required
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-purple-900 border-2 border-gold-500 text-gold-300 font-black text-xl focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200">
                Loan Date (તારીખ) <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-purple-900 border border-purple-700 text-white font-bold text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Separate Ornaments Section (Section 7: Do not combine ornaments) */}
          <div className="bg-purple-950/70 p-4 sm:p-5 rounded-2xl border border-purple-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gem className="w-4 h-4" />
                <span>Pledged Physical Ornaments ({ornaments.length})</span>
              </h3>

              <button
                type="button"
                onClick={addOrnament}
                className="flex items-center gap-1 text-xs font-extrabold text-gold-300 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/40 px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Ornament</span>
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {ornaments.map((orn, idx) => (
                <div
                  key={orn.id || idx}
                  className="bg-purple-900/70 p-3.5 rounded-2xl border border-purple-700 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-gold-300 uppercase text-[11px]">
                      Ornament #{idx + 1}
                    </span>
                    {ornaments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrnament(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Metal */}
                    <div>
                      <label className="text-[11px] font-bold text-purple-200 block mb-1">Metal</label>
                      <select
                        value={orn.metal}
                        onChange={(e) => updateOrnament(idx, { metal: e.target.value as MetalType })}
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-purple-700 text-white font-bold"
                      >
                        <option value="Gold">🪙 Gold (સોનું)</option>
                        <option value="Silver">🥈 Silver (ચાંદી)</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-[11px] font-bold text-purple-200 block mb-1">Category</label>
                      <select
                        value={orn.category}
                        onChange={(e) => updateOrnament(idx, { category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-purple-700 text-white font-bold"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="text-[11px] font-bold text-gold-300 block mb-1">Weight (Grams)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={orn.weight}
                        onChange={(e) => updateOrnament(idx, { weight: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border-2 border-gold-500/60 text-gold-300 font-black text-sm"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="text-[11px] font-bold text-purple-200 block mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={orn.quantity}
                        onChange={(e) => updateOrnament(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-purple-700 text-white font-bold text-sm"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <input
                      type="text"
                      value={orn.description || ''}
                      onChange={(e) => updateOrnament(idx, { description: e.target.value })}
                      placeholder="Optional notes: e.g. Heavy Kandora with floral bells"
                      className="w-full px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-800 text-purple-100 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-purple-200">Loan Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lent against silver kandora for crop season"
              className="w-full px-3 py-2 rounded-xl bg-purple-900 border border-purple-700 text-purple-100 text-xs focus:outline-none"
            />
          </div>

          {/* Submit */}
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
              <span>Save Loan (લોન સેવ કરો)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
