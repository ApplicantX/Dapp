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
  const customerLoans = (loans || []).filter((l) => l && l.customerId === customer?.id);
  const activeLoans = customerLoans.filter((l) => l && l.status === 'ACTIVE');

  // Collect all currently active ornaments in vault
  const activeOrnaments: Ornament[] = [];
  let totalActiveGoldGrams = 0;
  let totalActiveSilverGrams = 0;
  let totalActiveLoanAmount = 0;

  activeLoans.forEach((l) => {
    totalActiveLoanAmount += Number(l.loanAmount) || 0;
    (l.ornaments || []).forEach((o) => {
      if (!o) return;
      activeOrnaments.push(o);
      if (o.metal === 'Gold') totalActiveGoldGrams += Number(o.weight) || 0;
      else totalActiveSilverGrams += Number(o.weight) || 0;
    });
  });

  const handleCloseLoanClick = (loan: Loan) => {
    const confirmClose = window.confirm(
      `Are you sure you want to CLOSE this loan of ₹${loan.loanAmount.toLocaleString('en-IN')}? 

Pledged ornaments will be returned to customer.`
    );
    if (confirmClose) {
      onCloseLoan(loan.id);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 hover:text-purple-700 border border-zinc-200 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                {customer.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 font-semibold text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-purple-600" />
                <span>{customer.village}</span>
              </span>
            </div>
            {customer.mobile && (
              <p className="text-xs text-zinc-500 mt-0.5 font-medium flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{customer.mobile}</span>
              </p>
            )}
          </div>
        </div>

        {/* Diary & Page Reference Card with Quick Edit */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Physical Diary Reference
            </span>
            <div className="text-xs sm:text-sm font-bold text-zinc-900">
              {customer.diary} • <span className="text-purple-700">Page {customer.pageNumber}</span>
            </div>
          </div>
          <button
            onClick={() => onEditDiaryPage(customer)}
            className="ml-1 p-2 rounded-xl bg-zinc-50 hover:bg-purple-50 text-zinc-600 hover:text-purple-700 border border-zinc-200 text-xs transition-all"
            title="Move to new Diary or Page Number"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Held Ornaments in Vault */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-zinc-800 text-xs font-bold uppercase tracking-wider">
            <Gem className="w-3.5 h-3.5 text-purple-600" />
            <span>Active Ornaments in Vault:</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Active: ₹{totalActiveLoanAmount.toLocaleString('en-IN')}
            </span>
            {totalActiveGoldGrams > 0 && (
              <span className="text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                🪙 {totalActiveGoldGrams}g Gold
              </span>
            )}
            {totalActiveSilverGrams > 0 && (
              <span className="text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
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
                className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-900 text-xs sm:text-sm">
                    <span>{orn.metal === 'Gold' ? '🪙' : '🥈'}</span>
                    <span>{orn.category}</span>
                    {orn.quantity > 1 && (
                      <span className="text-[10px] bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-700">
                        {orn.quantity} pcs
                      </span>
                    )}
                  </div>
                  {orn.description && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[180px]">
                      {orn.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-zinc-900">{orn.weight}g</span>
                  <span className="text-[10px] text-zinc-500 block font-medium">{orn.metal}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-center text-xs text-zinc-500 font-medium">
            No active ornaments currently held in vault for this customer.
          </div>
        )}
      </div>

      {/* Single Primary Action: SPEAK NEW LOAN */}
      <div className="flex items-center justify-center py-2">
        <button
          onClick={onOpenNewLoanModal}
          className="flex items-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm hover:shadow-card-hover transition-all"
        >
          <Mic className="w-4 h-4" />
          <span>Speak New Loan (+ નવો લોન)</span>
        </button>
      </div>

      {/* Loan History */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <Coins className="w-4 h-4 text-purple-600" />
          <span>Loan Accounts & History ({customerLoans.length})</span>
        </h2>

        {customerLoans.length > 0 ? (
          <div className="space-y-3">
            {customerLoans.map((loan) => {
              const isActive = loan.status === 'ACTIVE';

              return (
                <div
                  key={loan.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-white border-zinc-200 shadow-sm'
                      : 'bg-zinc-50/70 border-zinc-200 opacity-80'
                  }`}
                >
                  {/* Loan Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg sm:text-xl font-bold text-zinc-900">
                        ₹{loan.loanAmount.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'CLOSED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                      <span>Date: <strong className="text-zinc-800">{loan.loanDate}</strong></span>
                      {!isActive && loan.closedDate && (
                        <span className="text-rose-600 font-semibold">
                          • Closed: {loan.closedDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pledged Ornaments List */}
                  <div className="my-3 space-y-1.5">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Pledged Ornaments:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {loan.ornaments.map((orn) => (
                        <div
                          key={orn.id}
                          className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs"
                        >
                          <span className="text-zinc-800 font-medium flex items-center gap-1.5">
                            <span>{orn.metal === 'Gold' ? '🪙' : '🥈'}</span>
                            <span>{orn.quantity}x {orn.category}</span>
                            {orn.description && (
                              <span className="text-zinc-400 font-normal">({orn.description})</span>
                            )}
                          </span>
                          <span className="text-zinc-900 font-bold">{orn.weight}g</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {loan.notes && (
                    <p className="text-xs text-zinc-500 italic mb-2">
                      Note: {loan.notes}
                    </p>
                  )}

                  {/* Actions (Close Loan if Active) */}
                  {isActive && (
                    <div className="flex items-center justify-end pt-3 border-t border-zinc-100">
                      <button
                        onClick={() => handleCloseLoanClick(loan)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Close Loan (ખાતું બંધ કરો)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-2xl border border-zinc-200 text-center text-xs text-zinc-400 font-medium">
            No loans recorded for this customer yet. Tap <strong>Speak New Loan</strong> above to add one.
          </div>
        )}
      </div>
    </div>
  );
};
