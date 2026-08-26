'use client';

import React, { useState, useMemo } from 'react';
import { LoanAccount, MarketRates } from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import { LoanCard } from './LoanCard';
import { Search, PlusCircle, Filter, ArrowUpDown, Gem, Sparkles } from 'lucide-react';

interface LoanListProps {
  loans: LoanAccount[];
  rates: MarketRates;
  language: Language;
  currentFilter: 'ALL' | 'ACTIVE' | 'OVERDUE' | 'SETTLED';
  onFilterChange: (filter: 'ALL' | 'ACTIVE' | 'OVERDUE' | 'SETTLED') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddLoan: () => void;
  onRecordPayment: (loan: LoanAccount) => void;
  onViewReceipt: (loan: LoanAccount) => void;
  onSettleLoan: (loan: LoanAccount) => void;
  onEditLoan: (loan: LoanAccount) => void;
  onDeleteLoan: (loanId: string) => void;
}

export const LoanList: React.FC<LoanListProps> = ({
  loans,
  rates,
  language,
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onOpenAddLoan,
  onRecordPayment,
  onViewReceipt,
  onSettleLoan,
  onEditLoan,
  onDeleteLoan,
}) => {
  const t = translations[language];
  const [metalFilter, setMetalFilter] = useState<'ALL' | 'GOLD' | 'SILVER'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'AMOUNT_DESC' | 'DUE_SOON' | 'NAME'>('NEWEST');

  // Filter & Sort Logic
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // 1. Status Filter
      if (currentFilter !== 'ALL' && loan.status !== currentFilter) {
        return false;
      }

      // 2. Metal Filter
      if (metalFilter !== 'ALL') {
        const hasMetal = loan.collateral.some((c) => c.metal === metalFilter);
        if (!hasMetal) return false;
      }

      // 3. Search Query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = loan.customerName.toLowerCase().includes(q);
        const matchesPhone = loan.customerPhone.includes(q);
        const matchesNumber = loan.loanNumber.toLowerCase().includes(q);
        const matchesItem = loan.collateral.some(
          (c) =>
            c.description.toLowerCase().includes(q) ||
            c.purity.toLowerCase().includes(q)
        );
        return matchesName || matchesPhone || matchesNumber || matchesItem;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'AMOUNT_DESC') {
        return b.principalAmount - a.principalAmount;
      }
      if (sortBy === 'DUE_SOON') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'NAME') {
        return a.customerName.localeCompare(b.customerName);
      }
      return 0;
    });
  }, [loans, currentFilter, metalFilter, searchQuery, sortBy]);

  const activeCount = loans.filter((l) => l.status === 'ACTIVE').length;
  const overdueCount = loans.filter((l) => l.status === 'OVERDUE').length;
  const settledCount = loans.filter((l) => l.status === 'SETTLED').length;

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-purple-950/80 p-4 sm:p-5 rounded-3xl border border-purple-800/80 shadow-royal space-y-4">
        {/* Search Bar with Giant Clear Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-purple-900/80 border-2 border-purple-700/60 focus:border-gold-400 focus:outline-none text-white placeholder-purple-300 font-semibold text-base sm:text-lg transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-purple-800 hover:bg-purple-700 text-purple-200 px-2 py-1 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-purple-900/90 p-1 rounded-2xl border border-purple-700/60">
            <button
              onClick={() => onFilterChange('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentFilter === 'ALL'
                  ? 'bg-gold-500 text-purple-950 shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {t.filterAll} ({loans.length})
            </button>

            <button
              onClick={() => onFilterChange('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentFilter === 'ACTIVE'
                  ? 'bg-emerald-500 text-purple-950 shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {t.filterActive} ({activeCount})
            </button>

            <button
              onClick={() => onFilterChange('OVERDUE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentFilter === 'OVERDUE'
                  ? 'bg-amber-500 text-purple-950 shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {t.filterOverdue} ({overdueCount})
            </button>

            <button
              onClick={() => onFilterChange('SETTLED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentFilter === 'SETTLED'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {t.filterSettled} ({settledCount})
            </button>
          </div>

          {/* Metal Filter & Sort Dropdown */}
          <div className="flex items-center gap-2">
            {/* Metal Filter */}
            <div className="flex items-center bg-purple-900/90 rounded-xl p-1 border border-purple-700/60 text-xs font-bold">
              <button
                onClick={() => setMetalFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  metalFilter === 'ALL'
                    ? 'bg-purple-700 text-white'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                All Metal
              </button>
              <button
                onClick={() => setMetalFilter('GOLD')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  metalFilter === 'GOLD'
                    ? 'bg-gold-500 text-purple-950'
                    : 'text-gold-300 hover:text-gold-200'
                }`}
              >
                🪙 Gold
              </button>
              <button
                onClick={() => setMetalFilter('SILVER')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  metalFilter === 'SILVER'
                    ? 'bg-slate-300 text-purple-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🥈 Silver
              </button>
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-purple-900/90 border border-purple-700/60 text-purple-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-gold-400"
            >
              <option value="NEWEST">Sort: Newest First</option>
              <option value="AMOUNT_DESC">Sort: Highest Amount</option>
              <option value="DUE_SOON">Sort: Due Soonest</option>
              <option value="NAME">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loan Cards List */}
      {filteredLoans.length > 0 ? (
        <div className="grid grid-cols-1 gap-5">
          {filteredLoans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              rates={rates}
              language={language}
              onRecordPayment={onRecordPayment}
              onViewReceipt={onViewReceipt}
              onSettleLoan={onSettleLoan}
              onEditLoan={onEditLoan}
              onDeleteLoan={onDeleteLoan}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-purple-950/40 rounded-3xl border-2 border-dashed border-purple-800/80">
          <div className="w-16 h-16 rounded-full bg-purple-900/80 border border-gold-500/30 flex items-center justify-center mx-auto text-gold-400 mb-4">
            <Gem className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            No loan accounts found
          </h3>
          <p className="text-sm text-purple-300 max-w-md mx-auto mb-6">
            {searchQuery
              ? `No records match "${searchQuery}". Try a different name or phone number.`
              : 'There are no loan records matching the selected filter.'}
          </p>
          <button
            onClick={onOpenAddLoan}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-black shadow-gold-glow transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create New Loan (+ G-100x)</span>
          </button>
        </div>
      )}
    </div>
  );
};
