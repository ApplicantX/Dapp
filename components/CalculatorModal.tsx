'use client';

import React, { useState } from 'react';
import { MarketRates, MetalType, StoreSettings } from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import { calculateEstimatedValue } from '@/lib/storage';
import {
  X,
  Calculator,
  Gem,
  Coins,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: MarketRates;
  settings: StoreSettings;
  language: Language;
  onApplyToNewLoan: (metal: MetalType, weight: number, purity: string, safeAmount: number) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  rates,
  settings,
  language,
  onApplyToNewLoan,
}) => {
  const t = translations[language];

  const [metal, setMetal] = useState<MetalType>('GOLD');
  const [weight, setWeight] = useState<number>(25);
  const [purity, setPurity] = useState<string>('22K (916)');
  const [interestRate, setInterestRate] = useState<number>(settings.defaultInterestRate || 1.5);

  if (!isOpen) return null;

  const marketValue = calculateEstimatedValue(metal, weight, purity, rates);
  const safe75 = Math.round(marketValue * 0.75);
  const max80 = Math.round(marketValue * 0.8);
  const monthlyInterest = Math.round(safe75 * (interestRate / 100));

  const handleApply = () => {
    onApplyToNewLoan(metal, weight, purity, safe75);
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t.calculator}
            </h2>
            <p className="text-xs text-purple-200 font-medium">
              Instant Gold & Silver Loan Valuation (ઝડપી ગણતરી)
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Metal Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-200">Select Metal</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMetal('GOLD');
                  setPurity('22K (916)');
                }}
                className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  metal === 'GOLD'
                    ? 'bg-gold-500 text-purple-950 shadow-gold-glow border-2 border-gold-300'
                    : 'bg-purple-900 text-purple-200 border border-purple-700'
                }`}
              >
                <span>🪙 Gold (સોનું)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMetal('SILVER');
                  setPurity('999 Fine Silver');
                }}
                className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  metal === 'SILVER'
                    ? 'bg-slate-200 text-purple-950 shadow-sm border-2 border-slate-300'
                    : 'bg-purple-900 text-purple-200 border border-purple-700'
                }`}
              >
                <span>🥈 Silver (ચાંદી)</span>
              </button>
            </div>
          </div>

          {/* Weight in Grams & Purity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200">
                Net Weight (Grams)
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-purple-900/90 border-2 border-gold-500/60 text-gold-300 font-black text-xl focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200">Purity</label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl bg-purple-900/90 border border-purple-700 text-gold-200 font-bold text-sm focus:outline-none"
              >
                {metal === 'GOLD' ? (
                  <>
                    <option value="24K">24K (99.9% Pure)</option>
                    <option value="22K (916)">22K (916 Hallmark)</option>
                    <option value="18K">18K (75% Gold)</option>
                    <option value="14K">14K (58.5% Gold)</option>
                  </>
                ) : (
                  <>
                    <option value="999 Fine Silver">999 Fine Silver</option>
                    <option value="92.5 Silver">92.5 Sterling</option>
                    <option value="800 Silver">80% Silver</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-200">
              Monthly Interest Rate (%)
            </label>
            <div className="flex items-center gap-2">
              {[1.0, 1.5, 2.0, 2.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInterestRate(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    interestRate === r
                      ? 'bg-gold-500 text-purple-950 shadow-sm'
                      : 'bg-purple-900 text-purple-200 border border-purple-700'
                  }`}
                >
                  {r}% / mo
                </button>
              ))}
            </div>
          </div>

          {/* Calculation Results Card */}
          <div className="bg-purple-950/80 p-5 rounded-2xl border-2 border-gold-500/40 shadow-gold-glow space-y-3 mt-4">
            <div className="flex items-center justify-between text-xs text-purple-200">
              <span>Full Market Valuation:</span>
              <strong className="text-lg font-bold text-white">
                ₹{marketValue.toLocaleString('en-IN')}
              </strong>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-950/50 rounded-xl border border-emerald-500/40">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Recommended Loan (75% LTV):</span>
              </div>
              <span className="text-xl font-black text-emerald-300">
                ₹{safe75.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-purple-200">
              <span>Monthly Interest Accrual (@ {interestRate}%):</span>
              <strong className="text-gold-300 font-extrabold text-sm">
                ₹{monthlyInterest.toLocaleString('en-IN')} / month
              </strong>
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={handleApply}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-base shadow-gold-glow transition-all active:scale-95"
          >
            <span>Create Loan with This Valuation</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
