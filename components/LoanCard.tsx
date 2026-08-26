'use client';

import React from 'react';
import { LoanAccount, MarketRates } from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import { calculateAccruedInterest } from '@/lib/storage';
import {
  Phone,
  MessageCircle,
  Receipt,
  CreditCard,
  CheckCircle,
  Calendar,
  Gem,
  Sparkles,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Share2,
} from 'lucide-react';

interface LoanCardProps {
  loan: LoanAccount;
  rates: MarketRates;
  language: Language;
  onRecordPayment: (loan: LoanAccount) => void;
  onViewReceipt: (loan: LoanAccount) => void;
  onSettleLoan: (loan: LoanAccount) => void;
  onEditLoan: (loan: LoanAccount) => void;
  onDeleteLoan: (loanId: string) => void;
}

export const LoanCard: React.FC<LoanCardProps> = ({
  loan,
  rates,
  language,
  onRecordPayment,
  onViewReceipt,
  onSettleLoan,
  onEditLoan,
  onDeleteLoan,
}) => {
  const t = translations[language];
  const {
    daysElapsed,
    monthsElapsed,
    monthlyInterestAmount,
    totalInterestDue,
    totalPaidInterest,
    netPendingInterest,
    currentTotalPayable,
  } = calculateAccruedInterest(loan);

  // Status Styling
  const statusStyles = {
    ACTIVE: {
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      label: 'ACTIVE GIRVI',
    },
    OVERDUE: {
      bg: 'bg-amber-500/20 text-amber-300 border-amber-400/50 animate-pulse',
      label: 'OVERDUE / ALERT',
    },
    SETTLED: {
      bg: 'bg-purple-800/40 text-purple-300 border-purple-600/40',
      label: 'SETTLED & RELEASED',
    },
    AUCTIONED: {
      bg: 'bg-rose-900/30 text-rose-300 border-rose-500/40',
      label: 'AUCTIONED',
    },
  };

  // WhatsApp Message Generator
  const generateWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `*DAPP Jewellers & Bankers - Girvi Statement*

` +
        `Dear *${loan.customerName}*,
` +
        `Loan Account: *${loan.loanNumber}*
` +
        `Principal Loan: *₹${loan.principalAmount.toLocaleString('en-IN')}*
` +
        `Monthly Interest Rate: *${loan.monthlyInterestRate}%*
` +
        `Pending Interest: *₹${netPendingInterest.toLocaleString('en-IN')}*
` +
        `Total Payable Today: *₹${currentTotalPayable.toLocaleString('en-IN')}*

` +
        `Ornaments in Vault: ${loan.collateral.map((c) => `${c.grossWeight}g ${c.description}`).join(', ')}

` +
        `For questions or interest payment, please contact us.`
    );
    const cleanPhone = loan.customerPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullPhone}?text=${text}`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/80 via-purple-850 to-purple-950 rounded-3xl p-5 sm:p-6 border border-purple-700/60 shadow-royal hover:border-gold-500/50 transition-all">
      {/* Top Bar: Customer Name, Loan Number & Status */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-purple-800/60">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {loan.customerName}
            </h3>
            <span className="px-2.5 py-0.5 rounded-lg bg-gold-500/15 border border-gold-400/40 text-gold-300 font-extrabold text-xs tracking-wider">
              {loan.loanNumber}
            </span>
          </div>

          {/* Contact Details */}
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-purple-200">
            <span className="font-semibold text-purple-100 flex items-center gap-1">
              📞 {loan.customerPhone}
            </span>
            {loan.customerAddress && (
              <span className="hidden sm:inline text-purple-300">
                📍 {loan.customerAddress}
              </span>
            )}
          </div>
        </div>

        {/* Action & Status Badges */}
        <div className="flex items-center gap-2">
          {/* WhatsApp Direct Share Button */}
          <a
            href={generateWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 transition-all flex items-center gap-1 text-xs font-bold"
            title="Send WhatsApp Reminder"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden md:inline">WhatsApp</span>
          </a>

          {/* Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
              statusStyles[loan.status].bg
            }`}
          >
            {statusStyles[loan.status].label}
          </span>
        </div>
      </div>

      {/* Middle Section: Collateral Ornaments */}
      <div className="my-4 bg-purple-950/70 rounded-2xl p-4 border border-purple-800/80">
        <div className="text-xs font-bold text-gold-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Gem className="w-3.5 h-3.5" />
          <span>Collateral Ornaments in Vault (તિજોરીમાં દાગીના):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {loan.collateral.map((item) => (
            <div
              key={item.id}
              className="bg-purple-900/60 p-3 rounded-xl border border-purple-700/50 flex items-start justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                  {item.metal === 'GOLD' ? '🪙' : '🥈'}
                  <span>{item.description}</span>
                </div>
                <div className="text-xs text-purple-200 mt-1 flex flex-wrap gap-2">
                  <span>Gross: <strong className="text-white">{item.grossWeight}g</strong></span>
                  <span>Net: <strong className="text-gold-300">{item.netWeight}g</strong></span>
                  <span className="bg-purple-800 px-1.5 rounded text-gold-200 font-semibold">{item.purity}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-purple-300 block">Valuation</span>
                <span className="text-xs font-bold text-gold-300">
                  ₹{item.estimatedValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financials & Accrued Interest Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Principal Loan */}
        <div className="bg-purple-900/60 p-3 rounded-2xl border border-purple-700/50">
          <span className="text-xs text-purple-300 block">{t.loanAmount}</span>
          <span className="text-lg sm:text-xl font-black text-white">
            ₹{loan.principalAmount.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Monthly Interest Rate */}
        <div className="bg-purple-900/60 p-3 rounded-2xl border border-purple-700/50">
          <span className="text-xs text-purple-300 block">Interest Rate</span>
          <span className="text-lg sm:text-xl font-black text-gold-300">
            {loan.monthlyInterestRate}% <span className="text-xs font-medium text-purple-200">/mo (₹{monthlyInterestAmount})</span>
          </span>
        </div>

        {/* Time Elapsed */}
        <div className="bg-purple-900/60 p-3 rounded-2xl border border-purple-700/50">
          <span className="text-xs text-purple-300 block">Time Elapsed</span>
          <span className="text-lg sm:text-xl font-black text-purple-200">
            {monthsElapsed} {monthsElapsed === 1 ? 'Month' : 'Months'}
            <span className="text-xs text-purple-400 block font-normal">({daysElapsed} days)</span>
          </span>
        </div>

        {/* Current Total Payable */}
        <div className="bg-gradient-to-br from-gold-500/20 to-purple-900/80 p-3 rounded-2xl border border-gold-500/40 shadow-gold-glow">
          <span className="text-xs text-gold-300 font-bold block">{t.todayPayable}</span>
          <span className="text-lg sm:text-xl font-black text-gold-300">
            ₹{currentTotalPayable.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-purple-200 block font-medium">
            (Int: ₹{netPendingInterest.toLocaleString('en-IN')})
          </span>
        </div>
      </div>

      {/* Payment History Preview (if any) */}
      {loan.payments.length > 0 && (
        <div className="mb-4 text-xs text-purple-200 bg-purple-950/40 p-2.5 rounded-xl border border-purple-800/40 flex flex-wrap items-center justify-between gap-2">
          <span>
            💸 <strong>{loan.payments.length} Payments Recorded</strong> | Total Interest Paid:{' '}
            <strong className="text-emerald-300">₹{totalPaidInterest.toLocaleString('en-IN')}</strong>
          </span>
          <span className="text-purple-300 italic">
            Last: {loan.payments[loan.payments.length - 1].date} (₹
            {loan.payments[loan.payments.length - 1].amount.toLocaleString('en-IN')})
          </span>
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-purple-800/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Record Payment Button */}
          {loan.status !== 'SETTLED' && (
            <button
              onClick={() => onRecordPayment(loan)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-extrabold text-xs shadow-gold-glow transition-all active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.recordPayment}</span>
            </button>
          )}

          {/* View / Print Receipt */}
          <button
            onClick={() => onViewReceipt(loan)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-gold-300 border border-purple-700/60 font-bold text-xs transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>{t.viewReceipt}</span>
          </button>

          {/* Settle & Release Collateral */}
          {loan.status !== 'SETTLED' && (
            <button
              onClick={() => onSettleLoan(loan)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{t.settleLoan}</span>
            </button>
          )}
        </div>

        {/* Edit & Delete Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEditLoan(loan)}
            className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-300 hover:text-white border border-purple-700/40 transition-all"
            title="Edit Loan"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteLoan(loan.id)}
            className="p-2 rounded-xl bg-purple-900/60 hover:bg-rose-900/80 text-purple-400 hover:text-rose-200 border border-purple-700/40 transition-all"
            title="Delete Loan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
