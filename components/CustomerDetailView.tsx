'use client';

import React, { useState } from 'react';
import { Customer, Loan, Ornament } from '@/lib/types';
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  Phone,
  Gem,
  Coins,
  PlusCircle,
  Mic,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  AlertCircle,
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

Pledged ornaments will be marked as returned to customer and loan status will turn RED.`
    );
    if (confirmClose) {
      onCloseLoan(loan.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-purple-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-gold-300 border border-purple-700 transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Customers</span>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {customer.name}
              </h1>
              <span className="px-3 py-0.5 rounded-full bg-gold-500/20 border border-gold-400/50 text-gold-300 font-extrabold text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{customer.village}</span>
              </span>
            </div>
            {customer.mobile && (
              <p className="text-xs text-purple-200 mt-1 font-semibold flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                <span>{customer.mobile}</span>
              </p>
            )}
          </div>
        </div>

        {/* Diary & Page Reference Card with Quick Edit */}
        <div className="flex items-center gap-3 bg-purple-950/90 p-3 rounded-2xl border-2 border-gold-500/40 shadow-gold-glow">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
              Physical Diary Reference
            </span>
            <div className="text-sm font-black text-white">
              {customer.diary} • <span className="text-gold-300 text-base">Page {customer.pageNumber}</span>
            </div>
          </div>
          <button
            onClick={() => onEditDiaryPage(customer)}
            className="ml-2 p-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-gold-300 border border-purple-700 text-xs font-bold transition-all"
            title="Move to new Diary or Page Number"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Held Ornaments in Vault (તિજોરીમાં રાખેલ દાગીના) */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 p-5 rounded-3xl border border-purple-800 shadow-royal">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-gold-300 text-sm font-black uppercase tracking-wider">
            <Gem className="w-4 h-4" />
            <span>Active Ornaments in Vault (તિજોરીમાં જમા દાગીના):</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
              Total Active Loan: ₹{totalActiveLoanAmount.toLocaleString('en-IN')}
            </span>
            {totalActiveGoldGrams > 0 && (
              <span className="text-gold-300 bg-purple-900 px-2.5 py-1 rounded-lg border border-gold-500/30">
                🪙 {totalActiveGoldGrams}g Gold
              </span>
            )}
            {totalActiveSilverGrams > 0 && (
              <span className="text-slate-200 bg-purple-900 px-2.5 py-1 rounded-lg border border-slate-400/30">
                🥈 {totalActiveSilverGrams}g Silver
              </span>
            )}
          </div>
        </div>

        {activeOrnaments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeOrnaments.map((orn, idx) => (
              <div
                key={orn.id || idx}
                className="bg-purple-950/80 p-3.5 rounded-2xl border border-purple-700/60 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                    <span>{orn.metal === 'Gold' ? '🪙' : '🥈'}</span>
                    <span>{orn.category}</span>
                    {orn.quantity > 1 && (
                      <span className="text-xs bg-purple-800 px-1.5 py-0.5 rounded text-purple-200">
                        {orn.quantity} pcs
                      </span>
                    )}
                  </div>
                  {orn.description && (
                    <p className="text-xs text-purple-300 mt-0.5 truncate max-w-[200px]">
                      {orn.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-gold-300">{orn.weight}g</span>
                  <span className="text-[10px] text-purple-300 block font-medium">{orn.metal}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-purple-950/40 rounded-2xl border border-purple-800/60 text-center text-xs text-purple-300">
            No active ornaments currently held in vault for this customer.
          </div>
        )}
      </div>

      {/* Single Primary Action: SPEAK NEW LOAN */}
      <div className="flex items-center justify-center">
        <button
          onClick={onOpenNewLoanModal}
          className="flex items-center justify-center gap-3 px-8 py-4 rounded-3xl bg-gradient-to-r from-gold-500 via-gold-400 to-amber-500 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-lg shadow-gold-glow border-2 border-gold-300 transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-950 flex items-center justify-center text-gold-400">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <span>SPEAK NEW LOAN (+ નવો લોન)</span>
        </button>
      </div>

      {/* Loan History (Active & Closed Records) */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
          <Coins className="w-5 h-5 text-gold-400" />
          <span>Customer Loan Accounts & History ({customerLoans.length})</span>
        </h2>

        {customerLoans.length > 0 ? (
          <div className="space-y-4">
            {customerLoans.map((loan, idx) => {
              const isActive = loan.status === 'ACTIVE';

              return (
                <div
                  key={loan.id}
                  className={`p-5 rounded-3xl border-2 transition-all ${
                    isActive
                      ? 'bg-purple-950/90 border-gold-500/40 shadow-royal'
                      : 'bg-rose-950/30 border-rose-600/60 opacity-90'
                  }`}
                >
                  {/* Loan Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-800/80">
                    <div className="flex items-center gap-3">
                      <span className="text-xl sm:text-2xl font-black text-white">
                        ₹{loan.loanAmount.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                            : 'bg-rose-600/30 text-rose-300 border-rose-500/50'
                        }`}
                      >
                        {isActive ? 'ACTIVE LOAN' : 'CLOSED LOAN (છોડાવેલ)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-purple-200">
                      <span>Loan Date: <strong className="text-white">{loan.loanDate}</strong></span>
                      {!isActive && loan.closedDate && (
                        <span className="text-rose-300 font-bold">
                          • Closed On: {loan.closedDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pledged Ornaments List for this specific loan */}
                  <div className="my-3 space-y-2">
                    <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                      Pledged Ornaments on this Loan:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {loan.ornaments.map((orn) => (
                        <div
                          key={orn.id}
                          className="bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/50 flex items-center justify-between text-xs font-semibold"
                        >
                          <span className="text-white flex items-center gap-1">
                            {orn.metal === 'Gold' ? '🪙' : '🥈'} {orn.quantity}x {orn.category}
                            {orn.description && <span className="text-purple-300 font-normal">({orn.description})</span>}
                          </span>
                          <span className="text-gold-300 font-bold">{orn.weight}g</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {loan.notes && (
                    <p className="text-xs text-purple-300 italic mb-3">
                      Note: {loan.notes}
                    </p>
                  )}

                  {/* Actions (Close Loan if Active) */}
                  {isActive && (
                    <div className="flex items-center justify-end pt-3 border-t border-purple-800/80">
                      <button
                        onClick={() => handleCloseLoanClick(loan)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-600/50 text-xs font-bold transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>CLOSE LOAN (ખાતું બંધ કરો / દાગીનો પાછો આપો)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-purple-950/40 rounded-3xl border border-purple-800 text-center text-xs text-purple-300">
            No loans recorded for this customer yet. Tap <strong>SPEAK NEW LOAN</strong> above to add one.
          </div>
        )}
      </div>
    </div>
  );
};
