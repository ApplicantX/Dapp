'use client';

import React from 'react';
import { Customer, Loan, Ornament } from '@/lib/types';
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  Phone,
  Gem,
  Coins,
  Mic,
  XCircle,
  Edit2,
  Sparkles,
} from 'lucide-react';

interface CustomerDetailViewProps {
  customer: Customer;
  loans: Loan[];
  onBack: () => void;
  onOpenNewLoanModal: () => void;
  onCloseLoan: (loanId: string) => void;
  onEditDiaryPage: (customer: Customer) => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
  loans,
  onBack,
  onOpenNewLoanModal,
  onCloseLoan,
  onEditDiaryPage,
}) => {
  const customerLoans = loans.filter((l) => l.customerId === customer.id);
  const activeLoans = customerLoans.filter((l) => l.status === 'ACTIVE');
  const closedLoans = customerLoans.filter((l) => l.status === 'CLOSED');

  // Collect all currently active ornaments in vault
  const activeOrnaments: Ornament[] = [];
  let totalActiveGoldGrams = 0;
  let totalActiveSilverGrams = 0;
  let totalActiveLoanAmount = 0;

  activeLoans.forEach((l) => {
    totalActiveLoanAmount += l.loanAmount;
    l.ornaments.forEach((o) => {
      activeOrnaments.push(o);
      if (o.metal === 'Gold') totalActiveGoldGrams += o.weight;
      else totalActiveSilverGrams += o.weight;
    });
  });

  const handleCloseLoanClick = (loan: Loan) => {
    const confirmClose = window.confirm(
      `Are you sure you want to CLOSE this loan of ₹${loan.loanAmount.toLocaleString('en-IN')}? 

Pledged ornaments will be returned to customer and loan status will turn RED.`
    );
    if (confirmClose) {
      onCloseLoan(loan.id);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-purple-500/15">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-full bg-purple-900/40 hover:bg-purple-800/60 text-gold-300 border border-purple-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-serif">
                {customer.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-300 font-semibold text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gold-400" />
                <span>{customer.village}</span>
              </span>
            </div>
            {customer.mobile && (
              <p className="text-xs text-purple-200/70 mt-0.5 font-medium flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{customer.mobile}</span>
              </p>
            )}
          </div>
        </div>

        {/* Diary & Page Reference Card with Quick Edit */}
        <div className="flex items-center gap-3 bg-[#130324]/80 p-3 rounded-2xl border border-gold-500/30 shadow-card">
          <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-purple-200/60 uppercase tracking-wider block">
              Physical Diary Reference
            </span>
            <div className="text-xs sm:text-sm font-bold text-white">
              {customer.diary} • <span className="text-gold-300">Page {customer.pageNumber}</span>
            </div>
          </div>
          <button
            onClick={() => onEditDiaryPage(customer)}
            className="ml-1 p-2 rounded-xl bg-purple-900/50 hover:bg-purple-800 text-gold-300 border border-purple-500/20 text-xs transition-all"
            title="Move to new Diary or Page Number"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Held Ornaments in Vault (તિજોરીમાં રાખેલ દાગીના) */}
      <div className="bg-[#130324]/80 p-5 rounded-3xl border border-purple-500/15 shadow-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
            <Gem className="w-3.5 h-3.5 text-gold-400" />
            <span>Active Ornaments in Vault:</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Active: ₹{totalActiveLoanAmount.toLocaleString('en-IN')}
            </span>
            {totalActiveGoldGrams > 0 && (
              <span className="text-gold-300 bg-purple-900/40 px-2.5 py-0.5 rounded-full border border-gold-500/20">
                🪙 {totalActiveGoldGrams}g Gold
              </span>
            )}
            {totalActiveSilverGrams > 0 && (
              <span className="text-slate-200 bg-purple-900/40 px-2.5 py-0.5 rounded-full border border-slate-400/20">
                🥈 {totalActiveSilverGrams}g Silver
              </span>
            )}
          </div>
        </div>

        {activeOrnaments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeOrnaments.map((orn, idx) => (
              <div
                key={orn.id || idx}
                className="bg-[#1c0733]/80 p-3 rounded-2xl border border-purple-500/15 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-white text-xs sm:text-sm">
                    <span>{orn.metal === 'Gold' ? '🪙' : '🥈'}</span>
                    <span>{orn.category}</span>
                    {orn.quantity > 1 && (
                      <span className="text-[10px] bg-purple-900 px-1.5 py-0.5 rounded text-purple-200">
                        {orn.quantity} pcs
                      </span>
                    )}
                  </div>
                  {orn.description && (
                    <p className="text-[11px] text-purple-200/60 mt-0.5 truncate max-w-[180px]">
                      {orn.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-gold-300">{orn.weight}g</span>
                  <span className="text-[10px] text-purple-200/50 block font-medium">{orn.metal}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-purple-900/20 rounded-2xl border border-purple-500/10 text-center text-xs text-purple-200/60 font-medium">
            No active ornaments currently held in vault for this customer.
          </div>
        )}
      </div>

      {/* Single Primary Action: SPEAK NEW LOAN */}
      <div className="flex items-center justify-center py-2">
        <button
          onClick={onOpenNewLoanModal}
          className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-bold text-base shadow-gold-glow border border-gold-300 transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center text-gold-400">
            <Mic className="w-4 h-4 animate-pulse" />
          </div>
          <span>SPEAK NEW LOAN (+ નવો લોન)</span>
        </button>
      </div>

      {/* Loan History (Active & Closed Records) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200/60 flex items-center gap-2">
          <Coins className="w-4 h-4 text-gold-400" />
          <span>Loan Accounts & History ({customerLoans.length})</span>
        </h2>

        {customerLoans.length > 0 ? (
          <div className="space-y-3">
            {customerLoans.map((loan) => {
              const isActive = loan.status === 'ACTIVE';

              return (
                <div
                  key={loan.id}
                  className={`p-5 rounded-3xl border transition-all ${
                    isActive
                      ? 'bg-[#130324]/90 border-purple-500/20 shadow-card'
                      : 'bg-rose-950/20 border-rose-500/30 opacity-80'
                  }`}
                >
                  {/* Loan Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-500/10">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl sm:text-2xl font-bold text-white">
                        ₹{loan.loanAmount.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'CLOSED (છોડાવેલ)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-purple-200/70 font-medium">
                      <span>Date: <strong className="text-white">{loan.loanDate}</strong></span>
                      {!isActive && loan.closedDate && (
                        <span className="text-rose-400 font-semibold">
                          • Closed: {loan.closedDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pledged Ornaments List for this loan */}
                  <div className="my-3 space-y-1.5">
                    <span className="text-[10px] font-semibold text-purple-200/50 uppercase tracking-wider block">
                      Pledged Ornaments:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {loan.ornaments.map((orn) => (
                        <div
                          key={orn.id}
                          className="bg-[#1c0733]/60 p-2.5 rounded-xl border border-purple-500/10 flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-100 font-medium flex items-center gap-1.5">
                            <span>{orn.metal === 'Gold' ? '🪙' : '🥈'}</span>
                            <span>{orn.quantity}x {orn.category}</span>
                            {orn.description && (
                              <span className="text-purple-200/50 font-normal">({orn.description})</span>
                            )}
                          </span>
                          <span className="text-gold-300 font-bold">{orn.weight}g</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {loan.notes && (
                    <p className="text-xs text-purple-200/60 italic mb-2">
                      Note: {loan.notes}
                    </p>
                  )}

                  {/* Actions (Close Loan if Active) */}
                  {isActive && (
                    <div className="flex items-center justify-end pt-3 border-t border-purple-500/10">
                      <button
                        onClick={() => handleCloseLoanClick(loan)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>CLOSE LOAN (ખાતું બંધ કરો)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-[#130324]/40 rounded-3xl border border-purple-500/10 text-center text-xs text-purple-200/50 font-medium">
            No loans recorded for this customer yet. Tap <strong>SPEAK NEW LOAN</strong> above to add one.
          </div>
        )}
      </div>
    </div>
  );
};
