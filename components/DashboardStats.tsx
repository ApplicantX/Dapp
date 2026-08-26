'use client';

import React from 'react';
import { LoanAccount, MarketRates } from '@/lib/types';
import { Coins, ShieldAlert, Sparkles, UserCheck, TrendingUp, Vault } from 'lucide-react';
import { Language, translations } from '@/lib/translations';
import { calculateAccruedInterest } from '@/lib/storage';

interface DashboardStatsProps {
  loans: LoanAccount[];
  rates: MarketRates;
  language: Language;
  onFilterChange: (filter: 'ALL' | 'ACTIVE' | 'OVERDUE' | 'SETTLED') => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  loans,
  rates,
  language,
  onFilterChange,
}) => {
  const t = translations[language];

  // Calculations
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE');

  // Total Outstanding Principal for active/overdue loans
  const totalOutstanding = loans
    .filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
    .reduce((sum, l) => {
      const principalRepaid = l.payments
        .filter((p) => p.type === 'PRINCIPAL')
        .reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, l.principalAmount - principalRepaid);
    }, 0);

  // Total Gold in Vault (grams)
  let totalGoldGrams = 0;
  let totalGoldValue = 0;
  let totalSilverGrams = 0;
  let totalSilverValue = 0;

  loans
    .filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
    .forEach((l) => {
      l.collateral.forEach((c) => {
        if (c.metal === 'GOLD') {
          totalGoldGrams += c.netWeight;
          totalGoldValue += c.estimatedValue;
        } else {
          totalSilverGrams += c.netWeight;
          totalSilverValue += c.estimatedValue;
        }
      });
    });

  // Total Monthly Expected Interest
  const monthlyExpectedInterest = loans
    .filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
    .reduce((sum, l) => {
      const { monthlyInterestAmount } = calculateAccruedInterest(l);
      return sum + monthlyInterestAmount;
    }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-6">
      {/* 1. Total Outstanding Loans */}
      <div
        onClick={() => onFilterChange('ACTIVE')}
        className="cursor-pointer bg-gradient-to-br from-purple-900/90 via-purple-850 to-purple-950 p-5 rounded-2xl border border-gold-500/30 shadow-royal hover:border-gold-400 transition-all group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
            {t.totalOutstanding}
          </span>
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-400/40 flex items-center justify-center text-gold-300 group-hover:scale-110 transition-transform">
            <Coins className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-gold-300">
            <span className="bg-gold-500/20 px-2 py-0.5 rounded-md border border-gold-500/30">
              {activeLoans.length} Active Accounts
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Gold in Vault */}
      <div className="bg-gradient-to-br from-purple-900/90 via-purple-850 to-purple-950 p-5 rounded-2xl border border-gold-500/30 shadow-royal">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gold-300">
            {t.totalGoldInVault}
          </span>
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-400">
            <Vault className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-gold-300 tracking-tight">
            {totalGoldGrams.toFixed(1)} <span className="text-lg font-bold">grams</span>
          </div>
          <div className="mt-2 text-xs text-purple-200 font-medium">
            Vault Valuation: <span className="text-gold-200 font-bold">₹{totalGoldValue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* 3. Total Silver in Vault */}
      <div className="bg-gradient-to-br from-purple-900/90 via-purple-850 to-purple-950 p-5 rounded-2xl border border-silver-400/30 shadow-royal">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {t.totalSilverInVault}
          </span>
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-400/40 flex items-center justify-center text-slate-200">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            {totalSilverGrams >= 1000
              ? `${(totalSilverGrams / 1000).toFixed(2)} kg`
              : `${totalSilverGrams.toFixed(0)} grams`}
          </div>
          <div className="mt-2 text-xs text-purple-200 font-medium">
            Silver Valuation: <span className="text-slate-200 font-bold">₹{totalSilverValue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* 4. Monthly Interest & Overdue Alerts */}
      <div
        onClick={() => onFilterChange('OVERDUE')}
        className={`cursor-pointer p-5 rounded-2xl border shadow-royal transition-all group ${
          overdueLoans.length > 0
            ? 'bg-gradient-to-br from-amber-950/90 via-purple-900 to-purple-950 border-amber-500/50 hover:border-amber-400'
            : 'bg-gradient-to-br from-purple-900/90 via-purple-850 to-purple-950 border-gold-500/30 hover:border-gold-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
            {t.monthlyInterestExpected}
          </span>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              overdueLoans.length > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
            }`}
          >
            {overdueLoans.length > 0 ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 tracking-tight">
            ₹{monthlyExpectedInterest.toLocaleString('en-IN')}
            <span className="text-xs text-purple-300 font-medium ml-1">/mo</span>
          </div>
          <div className="mt-2">
            {overdueLoans.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                {overdueLoans.length} Overdue Account{overdueLoans.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> All loans on track
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
