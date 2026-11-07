'use client';

import React, { useState } from 'react';
import { Customer, Loan, Ornament, LoanPayment, LoanTopUp } from '@/lib/types';
import { getLoanPrincipalDetails } from '@/lib/storage';
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  Phone,
  Gem,
  Mic,
  XCircle,
  Edit2,
  Calculator,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
} from 'lucide-react';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AddTopUpModal } from './AddTopUpModal';
import { LoanInterestModal } from './LoanInterestModal';

interface CustomerDetailViewProps {
  customer: Customer;
  loans: Loan[];
  onBack: () => void;
  onOpenNewLoanModal: () => void;
  onCloseLoan: (loanId: string) => void;
  onEditDiaryPage: (customer: Customer) => void;
  onAddPayment?: (
    loanId: string,
    paymentData: { date: string; amount: number; interestAmount?: number; notes?: string }
  ) => void;
  onDeletePayment?: (loanId: string, paymentId: string) => void;
  onAddTopUp?: (
    loanId: string,
    topUpData: { date: string; amount: number; notes?: string }
  ) => void;
  onDeleteTopUp?: (loanId: string, topUpId: string) => void;
  defaultRate?: number;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
  loans,
  onBack,
  onOpenNewLoanModal,
  onCloseLoan,
  onEditDiaryPage,
  onAddPayment,
  onDeletePayment,
  onAddTopUp,
  onDeleteTopUp,
  defaultRate = 18.0,
}) => {
  // Modal states
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [topUpLoan, setTopUpLoan] = useState<Loan | null>(null);
  const [calculatingLoan, setCalculatingLoan] = useState<Loan | null>(null);

  const customerLoans = (loans || []).filter((l) => l && l.customerId === customer?.id);
  const activeLoans = customerLoans.filter((l) => l && l.status === 'ACTIVE');

  // Vault Aggregations
  const activeOrnaments: Ornament[] = [];
  let totalActiveGoldGrams = 0;
  let totalActiveSilverGrams = 0;
  let totalActiveRemainingPrincipal = 0;

  activeLoans.forEach((l) => {
    const details = getLoanPrincipalDetails(l);
    totalActiveRemainingPrincipal += details.remainingPrincipal;

    (l.ornaments || []).forEach((o) => {
      if (!o) return;
      activeOrnaments.push(o);
      if (o.metal === 'Gold') totalActiveGoldGrams += Number(o.weight) || 0;
      else totalActiveSilverGrams += Number(o.weight) || 0;
    });
  });

  const handleCloseLoanClick = (loan: Loan) => {
    const details = getLoanPrincipalDetails(loan);
    const confirmClose = window.confirm(
      `Are you sure you want to CLOSE this loan?\n\nTotal Borrowed: ₹${details.totalBorrowed.toLocaleString('en-IN')}\nRemaining Principal: ₹${details.remainingPrincipal.toLocaleString('en-IN')}\n\nPledged ornaments will be returned to customer.`
    );
    if (confirmClose) {
      onCloseLoan(loan.id);
    }
  };

  const handleDeletePaymentClick = (loanId: string, payment: LoanPayment) => {
    const confirmDelete = window.confirm(
      `Delete repayment entry of ₹${payment.amount.toLocaleString('en-IN')} dated ${payment.date}?`
    );
    if (confirmDelete && onDeletePayment) {
      onDeletePayment(loanId, payment.id);
    }
  };

  const handleDeleteTopUpClick = (loanId: string, topUp: LoanTopUp) => {
    const confirmDelete = window.confirm(
      `Delete top-up loan entry of ₹${topUp.amount.toLocaleString('en-IN')} dated ${topUp.date}?`
    );
    if (confirmDelete && onDeleteTopUp) {
      onDeleteTopUp(loanId, topUp.id);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. TOP BAR: Large Back Button + Customer Identity Block */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <button
            onClick={onBack}
            className="p-3.5 sm:p-4 rounded-2xl bg-zinc-100 hover:bg-purple-100 text-zinc-800 hover:text-purple-800 border-2 border-zinc-200 transition-all flex items-center gap-2 text-base font-bold shadow-2xs flex-shrink-0"
            title="Go back to Customer List"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                {customer.name}
              </h1>
              <span className="px-3.5 py-1 rounded-full bg-purple-100 text-purple-900 font-bold text-sm sm:text-base border border-purple-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-700 stroke-[2.5]" />
                <span>{customer.village}</span>
              </span>
            </div>

            {customer.mobile && (
              <p className="text-sm sm:text-base text-zinc-600 font-semibold mt-1.5 flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-500" />
                <span>{customer.mobile}</span>
              </p>
            )}
          </div>
        </div>

        {/* Big Physical Diary Reference Block */}
        <div className="bg-purple-50/70 p-4 sm:p-5 rounded-2xl border-2 border-purple-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
                Physical Diary
              </span>
              <div className="text-lg sm:text-xl font-black text-purple-950">
                {customer.diary} • <span className="underline decoration-purple-400">Page {customer.pageNumber}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onEditDiaryPage(customer)}
            className="p-3 rounded-xl bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            title="Change diary or page number"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Change</span>
          </button>
        </div>
      </div>

      {/* 2. VAULT ORNAMENTS BLOCK (Big, clean visual cards) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5 text-zinc-900 font-extrabold text-base sm:text-lg">
            <Gem className="w-5 h-5 text-purple-600" />
            <span>Active Ornaments in Vault</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalActiveGoldGrams > 0 && (
              <span className="text-amber-900 bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200 font-extrabold text-sm sm:text-base">
                🪙 {totalActiveGoldGrams.toFixed(1)}g Gold
              </span>
            )}
            {totalActiveSilverGrams > 0 && (
              <span className="text-zinc-800 bg-zinc-100 px-3.5 py-1 rounded-full border border-zinc-200 font-extrabold text-sm sm:text-base">
                🥈 {totalActiveSilverGrams >= 1000
                  ? `${(totalActiveSilverGrams / 1000).toFixed(2)} kg`
                  : `${totalActiveSilverGrams.toFixed(0)}g`} Silver
              </span>
            )}
          </div>
        </div>

        {activeOrnaments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeOrnaments.map((orn, idx) => (
              <div
                key={orn.id || idx}
                className="bg-zinc-50 p-4 rounded-2xl border-2 border-zinc-200 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-zinc-900 text-base">
                    <span>{orn.metal === 'Gold' ? '🪙' : '🥈'}</span>
                    <span>{orn.category}</span>
                    {orn.quantity > 1 && (
                      <span className="text-xs bg-zinc-200 px-2 py-0.5 rounded-full text-zinc-800 font-bold">
                        {orn.quantity} pcs
                      </span>
                    )}
                  </div>
                  {orn.description && (
                    <p className="text-xs text-zinc-500 mt-1 font-medium truncate max-w-[200px]">
                      {orn.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-zinc-900">{orn.weight}g</span>
                  <span className="text-xs font-bold text-zinc-500 block uppercase">{orn.metal}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 font-medium py-2">
            No active ornaments currently held in vault for this customer.
          </p>
        )}
      </div>

      {/* 3. SPEAK NEW LOAN: Big High-Contrast Action Button */}
      <div className="flex justify-center py-1">
        <button
          onClick={onOpenNewLoanModal}
          className="flex items-center gap-3 px-8 sm:px-10 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-base sm:text-lg shadow-md hover:shadow-lg transition-all"
        >
          <Mic className="w-5 h-5 stroke-[2.5]" />
          <span>Speak New Loan</span>
        </button>
      </div>

      {/* 4. LOAN ACCOUNTS SECTION */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-zinc-700 flex items-center gap-2">
            <Coins className="w-5 h-5 text-purple-600" />
            <span>Loan Accounts ({customerLoans.length})</span>
          </h2>
          <span className="text-xs text-zinc-500 font-semibold">
            {activeLoans.length} Active • {customerLoans.length - activeLoans.length} Closed
          </span>
        </div>

        {customerLoans.length > 0 ? (
          <div className="space-y-6">
            {customerLoans.map((loan) => {
              const isActive = loan.status === 'ACTIVE';
              const details = getLoanPrincipalDetails(loan);
              const loanTopUps: LoanTopUp[] = Array.isArray(loan.topUps) ? loan.topUps : [];
              const loanPayments: LoanPayment[] = Array.isArray(loan.payments) ? loan.payments : [];

              return (
                <div
                  key={loan.id}
                  className={`rounded-3xl border-2 transition-all overflow-hidden ${
                    isActive
                      ? 'bg-white border-zinc-300 shadow-md'
                      : 'bg-zinc-50/80 border-zinc-200 opacity-80'
                  }`}
                >
                  {/* Hero Block: Huge Numbers for Remaining Principal */}
                  <div className="p-6 sm:p-7 border-b-2 border-zinc-100 bg-zinc-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Big Numbers Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 flex-1">
                      {/* 1. Remaining Principal (Most Important!) */}
                      <div className="p-4 rounded-2xl bg-purple-100/70 border-2 border-purple-300 col-span-2 sm:col-span-1">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900 block">
                          Remaining Principal
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-purple-950 mt-1 block">
                          ₹{details.remainingPrincipal.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* 2. Initial Loan */}
                      <div className="p-4 rounded-2xl bg-white border-2 border-zinc-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                          Initial Loan
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-zinc-900 mt-1 block">
                          ₹{details.initialPrincipal.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* 3. Top-Ups (if any) */}
                      <div className="p-4 rounded-2xl bg-white border-2 border-zinc-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 block">
                          Top-Ups
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-purple-900 mt-1 block">
                          {details.totalTopUps > 0
                            ? `+₹${details.totalTopUps.toLocaleString('en-IN')}`
                            : '₹0'}
                        </span>
                      </div>

                      {/* 4. Total Repaid (if any) */}
                      <div className="p-4 rounded-2xl bg-white border-2 border-zinc-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                          Repaid
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1 block">
                          {details.totalRepaid > 0
                            ? `-₹${details.totalRepaid.toLocaleString('en-IN')}`
                            : '₹0'}
                        </span>
                      </div>
                    </div>

                    {/* Status & Loan Date */}
                    <div className="flex items-center lg:flex-col lg:items-end justify-between gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-200">
                      <span
                        className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider border-2 ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'CLOSED'}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-600">
                        Loan Date: <strong className="text-zinc-900">{loan.loanDate}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 sm:p-7 space-y-6">
                    {/* Collateral Summary Banner */}
                    <div className="p-4 rounded-2xl bg-zinc-100/80 border border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Gem className="w-4 h-4 text-purple-700" />
                        <span className="font-bold text-zinc-700">Collateral:</span>
                        <span className="font-semibold text-zinc-900">
                          {loan.ornaments
                            .map((o) => `${o.quantity}x ${o.category} (${o.weight}g ${o.metal})`)
                            .join(', ')}
                        </span>
                      </div>
                      {loan.notes && (
                        <span className="text-xs text-zinc-500 italic">
                          Note: {loan.notes}
                        </span>
                      )}
                    </div>

                    {/* ONLY SHOW TOP-UPS IF THEY EXIST (NO EMPTY CARDS!) */}
                    {loanTopUps.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                          <ArrowUpRight className="w-4 h-4 text-purple-700 stroke-[2.5]" />
                          <span>Top-Up Loans Added on this Jewelry ({loanTopUps.length})</span>
                        </span>

                        <div className="space-y-2">
                          {loanTopUps.map((t, tIdx) => (
                            <div
                              key={t.id || tIdx}
                              className="bg-purple-50/60 p-3.5 rounded-2xl border-2 border-purple-200 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-xl bg-purple-200 text-purple-900 flex items-center justify-center font-bold text-xs">
                                  +{tIdx + 1}
                                </span>
                                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                                  <Calendar className="w-4 h-4 text-zinc-400" />
                                  <span>{t.date}</span>
                                </div>
                                {t.notes && (
                                  <span className="text-xs text-zinc-600 italic hidden sm:inline">
                                    — &quot;{t.notes}&quot;
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-black text-purple-950 text-base sm:text-lg">
                                  +₹{Number(t.amount).toLocaleString('en-IN')}
                                </span>
                                {isActive && onDeleteTopUp && (
                                  <button
                                    onClick={() => handleDeleteTopUpClick(loan.id, t)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Delete top-up entry"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ONLY SHOW REPAYMENTS IF THEY EXIST (NO EMPTY CARDS!) */}
                    {loanPayments.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <ArrowDownLeft className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                          <span>Recorded Repayments ({loanPayments.length})</span>
                        </span>

                        <div className="space-y-2">
                          {loanPayments.map((p, pIdx) => {
                            const intDeducted = Number(p.interestAmount) || 0;
                            const princReduced = typeof p.principalAmount === 'number'
                              ? p.principalAmount
                              : Math.max(0, (Number(p.amount) || 0) - intDeducted);

                            return (
                              <div
                                key={p.id || pIdx}
                                className="bg-emerald-50/70 p-3.5 rounded-2xl border-2 border-emerald-200 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-7 h-7 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-xs">
                                    #{pIdx + 1}
                                  </span>
                                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                                    <Calendar className="w-4 h-4 text-zinc-400" />
                                    <span>{p.date}</span>
                                  </div>
                                  <span className="text-xs text-zinc-600 hidden sm:inline">
                                    (Interest: ₹{intDeducted.toLocaleString('en-IN')}, Principal reduction: ₹{princReduced.toLocaleString('en-IN')})
                                  </span>
                                  {p.notes && (
                                    <span className="text-xs text-zinc-500 italic hidden md:inline">
                                      — &quot;{p.notes}&quot;
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-black text-emerald-950 text-base sm:text-lg">
                                    ₹{Number(p.amount).toLocaleString('en-IN')}
                                  </span>
                                  {isActive && onDeletePayment && (
                                    <button
                                      onClick={() => handleDeletePaymentClick(loan.id, p)}
                                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Delete payment entry"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 5. THE 4 BIG SENIOR-FRIENDLY ACTION BUTTON BLOCKS */}
                    <div className="pt-4 border-t-2 border-zinc-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {/* 1. Calculate Interest */}
                        <button
                          onClick={() => setCalculatingLoan(loan)}
                          className="p-4 sm:p-5 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white flex flex-col items-center justify-center text-center gap-1.5 shadow-sm hover:shadow-md transition-all group"
                        >
                          <Calculator className="w-6 h-6 stroke-[2.2] group-hover:scale-110 transition-transform" />
                          <span className="font-extrabold text-base">Calculate Interest</span>
                        </button>

                        {/* 2. Top-Up Loan */}
                        {isActive && (
                          <button
                            onClick={() => setTopUpLoan(loan)}
                            className="p-4 sm:p-5 rounded-2xl bg-purple-50 hover:bg-purple-100 active:scale-[0.98] text-purple-900 border-2 border-purple-300 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all group"
                          >
                            <ArrowUpRight className="w-6 h-6 text-purple-700 stroke-[2.5] group-hover:scale-110 transition-transform" />
                            <span className="font-extrabold text-base">+ Top-Up Loan</span>
                          </button>
                        )}

                        {/* 3. Record Payment */}
                        {isActive && (
                          <button
                            onClick={() => setPayingLoan(loan)}
                            className="p-4 sm:p-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-900 border-2 border-emerald-300 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all group"
                          >
                            <ArrowDownLeft className="w-6 h-6 text-emerald-700 stroke-[2.5] group-hover:scale-110 transition-transform" />
                            <span className="font-extrabold text-base">+ Record Payment</span>
                          </button>
                        )}

                        {/* 4. Close Loan */}
                        {isActive && (
                          <button
                            onClick={() => handleCloseLoanClick(loan)}
                            className="p-4 sm:p-5 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-900 border-2 border-rose-300 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all group"
                          >
                            <XCircle className="w-6 h-6 text-rose-700 stroke-[2.2] group-hover:scale-110 transition-transform" />
                            <span className="font-extrabold text-base">Close Loan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 bg-white rounded-3xl border-2 border-zinc-200 text-center text-base text-zinc-500 font-semibold">
            No loans recorded for this customer yet. Tap <strong>Speak New Loan</strong> above to add one.
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={!!payingLoan}
        onClose={() => setPayingLoan(null)}
        loan={payingLoan}
        customerName={customer.name}
        village={customer.village}
        defaultRate={defaultRate}
        onSavePayment={(loanId, paymentData) => {
          if (onAddPayment) {
            onAddPayment(loanId, paymentData);
          }
        }}
      />

      {/* Add Top-Up Loan Modal */}
      <AddTopUpModal
        isOpen={!!topUpLoan}
        onClose={() => setTopUpLoan(null)}
        loan={topUpLoan}
        customerName={customer.name}
        village={customer.village}
        onSaveTopUp={(loanId, topUpData) => {
          if (onAddTopUp) {
            onAddTopUp(loanId, topUpData);
          }
        }}
      />

      {/* Integrated Loan Interest Calculator Modal */}
      <LoanInterestModal
        isOpen={!!calculatingLoan}
        onClose={() => setCalculatingLoan(null)}
        loan={calculatingLoan}
        customerName={customer.name}
        village={customer.village}
        diary={customer.diary}
        pageNumber={customer.pageNumber}
        defaultRate={defaultRate}
      />
    </div>
  );
};
