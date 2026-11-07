'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loan } from '@/lib/types';
import { getLoanPrincipalDetails } from '@/lib/storage';
import { X, Check, IndianRupee, Calendar, FileText, AlertCircle, Sparkles } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  customerName: string;
  village: string;
  defaultRate?: number;
  onSavePayment: (
    loanId: string,
    paymentData: { date: string; amount: number; interestAmount?: number; notes?: string }
  ) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  loan,
  customerName,
  village,
  defaultRate = 18.0,
  onSavePayment,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState<number | ''>('');
  const [interestAmount, setInterestAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(todayStr);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loanDetails = useMemo(() => {
    if (!loan) return null;
    return getLoanPrincipalDetails(loan);
  }, [loan]);

  // Calculate suggested accrued interest up to chosen payment date
  const suggestedAccruedInterest = useMemo(() => {
    if (!loan || !loanDetails) return 0;
    const r = (Number(defaultRate) || 18.0) / 100;
    const loanStart = loan.loanDate || todayStr;
    const payDate = date || todayStr;

    const startMs = new Date(loanStart).getTime();
    const endMs = new Date(payDate).getTime();
    const diffDays = Math.max(0, (endMs - startMs) / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;

    const currentP = loanDetails.remainingPrincipal;
    if (currentP <= 0 || years <= 0) return 0;

    const accrued = currentP * (Math.pow(1 + r, years) - 1);
    return Math.round(accrued);
  }, [loan, loanDetails, date, defaultRate, todayStr]);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setInterestAmount('');
      setDate(todayStr);
      setNotes('');
      setError('');
    }
  }, [isOpen, todayStr]);

  if (!isOpen || !loan || !loanDetails) return null;

  const numericAmount = Number(amount) || 0;
  const numericInterest = interestAmount === '' ? 0 : Number(interestAmount) || 0;

  // Amount that goes towards reducing the principal
  const principalDeduction = Math.max(0, numericAmount - numericInterest);
  const newRemainingPrincipal = Math.max(0, loanDetails.remainingPrincipal - principalDeduction);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (numericInterest > numericAmount) {
      setError('Interest to deduct cannot exceed the total payment amount.');
      return;
    }
    if (numericInterest < 0) {
      setError('Interest amount cannot be negative.');
      return;
    }

    onSavePayment(loan.id, {
      date: date || todayStr,
      amount: numericAmount,
      interestAmount: numericInterest,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/70">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <IndianRupee className="w-3 h-3 text-emerald-600" />
              <span>Record Repayment</span>
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

        {/* Current Balance Status Bar */}
        <div className="p-4 bg-purple-50/40 border-b border-purple-100/60">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-purple-100 shadow-2xs">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Total Borrowed
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-800 mt-0.5 block">
                ₹{loanDetails.totalBorrowed.toLocaleString('en-IN')}
              </span>
              {loanDetails.totalTopUps > 0 && (
                <span className="text-[9px] text-purple-700 block">
                  (₹{loanDetails.initialPrincipal.toLocaleString('en-IN')} + ₹{loanDetails.totalTopUps.toLocaleString('en-IN')} topup)
                </span>
              )}
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-purple-100 shadow-2xs">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Total Repaid So Far
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 block">
                ₹{loanDetails.totalRepaid.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] text-purple-700 font-semibold uppercase tracking-wider block">
                Current Principal
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-purple-900 mt-0.5 block">
                ₹{loanDetails.remainingPrincipal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Payment Date *</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-medium focus:bg-white focus:border-purple-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Total Amount Paid */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
              <span>Total Amount Paid by Customer *</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="e.g. 10000"
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

          {/* Interest to Consider / Deduct */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                <span>Interest to Deduct / Consider</span>
              </label>

              {suggestedAccruedInterest > 0 && (
                <button
                  type="button"
                  onClick={() => setInterestAmount(suggestedAccruedInterest)}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-900 font-semibold bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Use Accrued: ₹{suggestedAccruedInterest.toLocaleString('en-IN')}</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-amber-800 leading-tight">
              Amount deducted first towards interest. Any remaining payment will reduce the principal.
            </p>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0 (or enter interest amount)"
                value={interestAmount}
                onChange={(e) => {
                  setInterestAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                  setError('');
                }}
                className="w-full pl-8 pr-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-950 font-bold text-sm focus:border-amber-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Live Breakdown Preview */}
          {numericAmount > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Payment Allocation Preview:
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-zinc-200">
                  <span className="text-[10px] text-amber-700 font-semibold block">Deducted for Interest:</span>
                  <span className="text-sm font-bold text-amber-800">
                    ₹{numericInterest.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-zinc-200">
                  <span className="text-[10px] text-emerald-700 font-semibold block">Deducted from Principal:</span>
                  <span className="text-sm font-extrabold text-emerald-800">
                    ₹{principalDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-200 font-semibold">
                <span className="text-zinc-600">New Remaining Principal:</span>
                <span className="text-sm font-black text-purple-900">
                  ₹{newRemainingPrincipal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Optional Note / Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Payment Note / Reference (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cash paid at shop, brought by nephew"
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
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Repayment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
