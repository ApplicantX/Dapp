'use client';

import React from 'react';
import { MarketRates } from '@/lib/types';
import { Sparkles, TrendingUp, Edit3 } from 'lucide-react';
import { Language, translations } from '@/lib/translations';

interface LiveRateBarProps {
  rates: MarketRates;
  language: Language;
  onEditRates: () => void;
}

export const LiveRateBar: React.FC<LiveRateBarProps> = ({ rates, language, onEditRates }) => {
  const t = translations[language];

  return (
    <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 border-y border-gold-500/30 px-4 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-gold-400 font-semibold tracking-wide">
          <Sparkles className="w-4 h-4 text-gold-400 animate-pulse" />
          <span className="text-xs uppercase tracking-wider text-purple-200">
            {t.rates}:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
          {/* 24K Gold */}
          <div className="flex items-center gap-1.5 bg-purple-900/80 px-3 py-1 rounded-full border border-gold-500/20">
            <span className="text-xs text-gold-300">24K Gold (10g):</span>
            <span className="text-gold-400 font-bold tracking-tight">
              ₹{rates.gold24kPer10g.toLocaleString('en-IN')}
            </span>
          </div>

          {/* 22K 916 Gold */}
          <div className="flex items-center gap-1.5 bg-purple-900/80 px-3 py-1 rounded-full border border-gold-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <span className="text-xs text-gold-200 font-semibold">22K 916 (10g):</span>
            <span className="text-gold-300 font-extrabold tracking-tight">
              ₹{rates.gold22kPer10g.toLocaleString('en-IN')}
            </span>
          </div>

          {/* 18K Gold */}
          <div className="hidden md:flex items-center gap-1.5 bg-purple-900/80 px-3 py-1 rounded-full border border-gold-500/20">
            <span className="text-xs text-purple-200">18K (10g):</span>
            <span className="text-gold-300 font-semibold">
              ₹{rates.gold18kPer10g.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Silver */}
          <div className="flex items-center gap-1.5 bg-purple-900/80 px-3 py-1 rounded-full border border-silver-400/30">
            <span className="text-xs text-slate-300">Silver 999 (1 Kg):</span>
            <span className="text-slate-100 font-bold tracking-tight">
              ₹{rates.silverPerKg.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Edit Rates Button */}
        <button
          onClick={onEditRates}
          className="flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 px-3 py-1 rounded-full transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Update Rates</span>
        </button>
      </div>
    </div>
  );
};
