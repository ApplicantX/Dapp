'use client';

import React, { useState } from 'react';
import { LoanAccount, PaymentRecord, StoreSettings } from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import { calculateAccruedInterest } from '@/lib/storage';
import { playSuccessChime, speakFeedback } from '@/lib/speechEngine';
import confetti from 'canvas-confetti';
import {
  X,
  CreditCard,
  CheckCircle,
  Coins,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanAccount | null;
  settings: StoreSettings;
  language: Language;
  onSavePayment: (loanId: string, payment: PaymentRecord, settleNow?: boolean) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  loan,
  settings,
  language,
  onSavePayment,
}) => {
  const t = translations[language];

  if (!isOpen || !loan) return null;

  const {
    monthsElapsed,
    monthlyInterestAmount,
    totalInterestDue,
    totalPaidInterest,
    netPendingInterest,
    currentTotalPayable,
  } = calculateAccruedInterest(loan);

  const [paymentType, setPaymentType] = useState<'INTEREST' | 'PRINCIPAL' | 'SETTLEMENT'>('INTEREST');
  const [amount, setAmount] = useState<number>(
    paymentType === 'INTEREST'
      ? netPendingInterest > 0
        ? netPendingInterest
        : monthlyInterestAmount
      : currentTotalPayable
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [notes, setNotes] = useState<string>('');

  const handleTypeChange = (type: 'INTEREST' | 'PRINCIPAL' | 'SETTLEMENT') => {
    setPaymentType(type);
    if (type === 'INTEREST') {
      setAmount(netPendingInterest > 0 ? netPendingInterest : monthlyInterestAmount);
    } else if (type === 'SETTLEMENT') {
      setAmount(currentTotalPayable);
    } else {
      setAmount(monthlyInterestAmount);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      date: paymentDate,
      amount: Number(amount),
      type: paymentType,
      notes: `${paymentMode}${notes ? ` - ${notes}` : ''}`,
      receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    };

    const isSettlement = paymentType === 'SETTLEMENT';
    onSavePayment(loan.id, newPayment, isSettlement);

    playSuccessChime();
    confetti({
      particleCount: isSettlement ? 120 : 60,
      spread: 80,
      origin: { y: 0.6 },
    });

    if (settings.voiceFeedbackEnabled) {
      speakFeedback(
        `Payment of ${amount} rupees for ${loan.customerName} recorded.`,
        language
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-800/80 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-600/40 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Record Payment (રકમ જમા)
            </h2>
            <p className="text-xs text-purple-200 font-medium">
              Customer: <strong className="text-gold-300">{loan.customerName}</strong> ({loan.loanNumber})
            </p>
          </div>
        </div>

        {/* Loan Financial Snapshot */}
        <div className="bg-purple-950/70 p-4 rounded-2xl border border-purple-800 mb-5 text-xs space-y-1.5">
          <div className="flex justify-between text-purple-200">
            <span>Principal Amount:</span>
            <strong className="text-white font-bold">₹{loan.principalAmount.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between text-purple-200">
            <span>Interest Rate:</span>
            <strong className="text-gold-300">{loan.monthlyInterestRate}% / mo (₹{monthlyInterestAmount})</strong>
          </div>
          <div className="flex justify-between text-purple-200">
            <span>Total Accrued Interest ({monthsElapsed} mo):</span>
            <strong className="text-purple-100">₹{totalInterestDue.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between text-purple-200">
            <span>Already Paid Interest:</span>
            <strong className="text-emerald-300">₹{totalPaidInterest.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between text-gold-300 font-bold pt-1 border-t border-purple-800/80 text-sm">
            <span>Pending Interest Due:</span>
            <span>₹{netPendingInterest.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-200">Payment Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('INTEREST')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  paymentType === 'INTEREST'
                    ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                    : 'bg-purple-900 text-purple-200 border border-purple-700'
                }`}
              >
                Interest (વ્યાજ)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('PRINCIPAL')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  paymentType === 'PRINCIPAL'
                    ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                    : 'bg-purple-900 text-purple-200 border border-purple-700'
                }`}
              >
                Principal (મુદ્દલ)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('SETTLEMENT')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  paymentType === 'SETTLEMENT'
                    ? 'bg-emerald-500 text-purple-950 shadow-sm'
                    : 'bg-purple-900 text-purple-200 border border-purple-700'
                }`}
              >
                Full Settle (છોડાવવું)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gold-300">
              Payment Amount (₹) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="50"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-purple-900/90 border-2 border-gold-500 text-gold-300 font-black text-xl focus:outline-none"
            />
          </div>

          {/* Date & Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200">Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white text-sm font-semibold focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200">Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white text-sm font-semibold focus:outline-none"
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI / GPay">📱 UPI / GPay</option>
                <option value="Bank Transfer">🏦 Bank Transfer</option>
                <option value="Cheque">📜 Cheque</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-200">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Month of August interest"
              className="w-full px-3 py-2 rounded-xl bg-purple-900 border border-purple-700 text-purple-100 text-sm focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-sm shadow-gold-glow transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{t.confirmPayment}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
