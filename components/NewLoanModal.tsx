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
  Sparkles,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#130324] border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-modal my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-900/40 hover:bg-purple-800 text-purple-200 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              New Loan for {customer.name}
            </h2>
            <p className="text-xs text-purple-200/60 font-medium">
              Village: <strong className="text-gold-300">{customer.village}</strong> • {customer.diary}, Page {customer.pageNumber}
            </p>
          </div>
        </div>

        {/* Minimal Voice Bar */}
        <div className="bg-[#1c0733] p-4 rounded-2xl border border-purple-500/15 flex items-center justify-between gap-3 mb-5">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Voice Loan Capture</span>
            </span>
            <p className="text-xs text-purple-200/70">
              Speak amount and ornaments (e.g. *"500g silver kandora and 200g silver kada for 50,000 rupees"*).
            </p>
          </div>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs transition-all flex-shrink-0 active:scale-95 ${
              isRecording
                ? 'bg-rose-600 text-white border border-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.5)] animate-pulse'
                : 'bg-gold-500 hover:bg-gold-400 text-purple-950 shadow-gold-glow'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-3.5 h-3.5 animate-bounce" />
                <span>STOP</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Speak</span>
              </>
            )}
          </button>
        </div>

        {liveTranscript && (
          <div className="bg-[#1c0733] p-3 rounded-2xl border border-purple-500/20 text-xs mb-4">
            <span className="font-semibold text-gold-300 uppercase text-[10px] block mb-0.5">
              Captured Voice:
            </span>
            <p className="text-xs font-medium text-white italic">"{liveTranscript}"</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Loan Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1c0733] p-4 rounded-2xl border border-purple-500/15">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gold-300">
                Loan Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="500"
                required
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#130324] border border-gold-500/50 text-gold-300 font-bold text-lg focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/80">
                Loan Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#130324] border border-purple-500/20 text-white font-medium text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Ornaments List */}
          <div className="bg-[#1c0733] p-4 rounded-2xl border border-purple-500/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gem className="w-3.5 h-3.5 text-gold-400" />
                <span>Pledged Ornaments ({ornaments.length})</span>
              </span>

              <button
                type="button"
                onClick={addOrnament}
                className="flex items-center gap-1 text-[11px] font-bold text-gold-400 hover:text-gold-300 bg-gold-500/10 px-2.5 py-1 rounded-full border border-gold-500/20"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {ornaments.map((orn, idx) => (
                <div
                  key={orn.id || idx}
                  className="bg-[#130324] p-3 rounded-2xl border border-purple-500/15 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gold-300/80 text-[10px] uppercase">
                      Item #{idx + 1}
                    </span>
                    {ornaments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrnament(idx)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-purple-200/60 block mb-0.5">Metal</label>
                      <select
                        value={orn.metal}
                        onChange={(e) => updateOrnament(idx, { metal: e.target.value as MetalType })}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#1c0733] border border-purple-500/20 text-white font-semibold text-xs"
                      >
                        <option value="Gold">🪙 Gold (સોનું)</option>
                        <option value="Silver">🥈 Silver (ચાંદી)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-purple-200/60 block mb-0.5">Category</label>
                      <select
                        value={orn.category}
                        onChange={(e) => updateOrnament(idx, { category: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#1c0733] border border-purple-500/20 text-white font-semibold text-xs"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-gold-300 block mb-0.5">Weight (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={orn.weight}
                        onChange={(e) => updateOrnament(idx, { weight: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#1c0733] border border-gold-500/30 text-gold-300 font-bold text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-purple-200/60 block mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={orn.quantity}
                        onChange={(e) => updateOrnament(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#1c0733] border border-purple-500/20 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={orn.description || ''}
                      onChange={(e) => updateOrnament(idx, { description: e.target.value })}
                      placeholder="Optional notes (e.g. Heavy Kandora with floral bells)"
                      className="w-full px-2.5 py-1 rounded-lg bg-[#1c0733] border border-purple-500/15 text-purple-200/70 text-[11px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-purple-200/70">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lent against silver ornaments"
              className="w-full px-3 py-2 rounded-xl bg-[#1c0733] border border-purple-500/20 text-purple-200 text-xs focus:outline-none"
            />
          </div>

          {/* Actions */}
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
              <span>Save Loan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
