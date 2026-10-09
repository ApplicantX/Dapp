'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loan } from '@/lib/types';
import { getLoanPrincipalDetails } from '@/lib/storage';
import { X, Check, ArrowUpRight, Calendar, FileText, AlertCircle, Gem } from 'lucide-react';

interface AddTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  customerName: string;
  village: string;
  onSaveTopUp: (
    loanId: string,
    topUpData: { date: string; amount: number; notes?: string }
  ) => void;
}

export const AddTopUpModal: React.FC<AddTopUpModalProps> = ({
  isOpen,
  onClose,
  loan,
  customerName,
  village,
  onSaveTopUp,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(todayStr);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loanDetails = useMemo(() => {
    if (!loan) return null;
    return getLoanPrincipalDetails(loan);
  }, [loan]);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDate(todayStr);
      setNotes('');
      setError('');
    }
  }, [isOpen, todayStr]);

  if (!isOpen || !loan || !loanDetails) return null;

  const numericAmount = Number(amount) || 0;
  const newTotalBorrowed = loanDetails.totalBorrowed + numericAmount;
  const newRemainingPrincipal = loanDetails.remainingPrincipal + numericAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter an additional loan amount greater than zero.');
      return;
    }

    onSaveTopUp(loan.id, {
      date: date || todayStr,
      amount: numericAmount,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/70">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <ArrowUpRight className="w-3 h-3 text-purple-600" />
              <span>Add Top-Up Loan (વધારાનો ઉપાડ)</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900">
              {customerName} • <span className="text-zinc-500 font-medium text-sm">{village}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pledged Jewelry Badge */}
        <div className="px-5 py-3 bg-purple-50/50 border-b border-purple-100/60 flex items-center gap-2 text-xs">
          <Gem className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-purple-900 font-semibold">Same Jewelry Collateral: </span>
            <span className="text-zinc-600">
              {(loan.ornaments || []).map((o) => `${o.quantity}x ${o.weight}g ${o.metal} ${o.category}`).join(', ')}
            </span>
          </div>
        </div>

        {/* Current Balance Status Bar */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200/80">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                Initial Loan
              </span>
              <span className="font-bold text-zinc-800 mt-0.5 block">
                ₹{loanDetails.initialPrincipal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                Past Top-Ups
              </span>
              <span className="font-bold text-purple-700 mt-0.5 block">
                ₹{loanDetails.totalTopUps.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-[10px] text-purple-700 font-semibold uppercase tracking-wider block">
                Current Principal
              </span>
              <span className="font-extrabold text-purple-900 mt-0.5 block">
                ₹{loanDetails.remainingPrincipal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Additional Loan Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
              <span>Additional Loan Amount (વધારાની રકમ) *</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                  setError('');
                }}
                autoFocus
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-base focus:bg-white focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Top-Up Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Top-Up Date (તારીખ) *</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-medium focus:bg-white focus:border-purple-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Live Balance Impact Preview */}
          {numericAmount > 0 && (
            <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 font-medium">New Total Borrowed:</span>
                <span className="font-bold text-zinc-900">
                  ₹{newTotalBorrowed.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-purple-200/60">
                <span className="text-purple-900 font-bold">New Remaining Principal:</span>
                <span className="text-sm font-extrabold text-purple-950">
                  ₹{newRemainingPrincipal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Optional Note / Purpose */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Note / Reason (નોંધ - optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Additional loan for crop / seeds"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:bg-white focus:border-purple-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-zinc-600 hover:text-zinc-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Top-Up Loan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
