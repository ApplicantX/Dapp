'use client';

import React, { useState, useEffect } from 'react';
import { CalculatorItem } from '@/lib/types';
import { Calculator, ArrowLeft, Coins } from 'lucide-react';

interface CompoundInterestCalculatorProps {
  defaultRate?: number;
  onBackToHome?: () => void;
}

export const CompoundInterestCalculator: React.FC<CompoundInterestCalculatorProps> = ({
  defaultRate = 18.0,
  onBackToHome,
}) => {
  const [itemCount, setItemCount] = useState<number>(2);
  const [annualRate, setAnnualRate] = useState<number>(defaultRate);
  const [items, setItems] = useState<CalculatorItem[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Initialize items
  useEffect(() => {
    const initial: CalculatorItem[] = [];
    for (let i = 0; i < itemCount; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (i === 0 ? 12 : 6));
      const sDate = d.toISOString().split('T')[0];

      initial.push({
        id: `calc-item-${i + 1}`,
        principal: i === 0 ? 50000 : 25000,
        startDate: sDate,
        endDate: todayStr,
        annualRate: defaultRate,
        yearsElapsed: 0,
        interestAmount: 0,
        totalAmount: 0,
      });
    }
    setItems(initial);
  }, []);

  // Update item count
  const handleItemCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setItemCount(validCount);

    setItems((prev) => {
      if (validCount > prev.length) {
        const added: CalculatorItem[] = [];
        for (let i = prev.length; i < validCount; i++) {
          added.push({
            id: `calc-item-${i + 1}`,
            principal: 10000,
            startDate: todayStr,
            endDate: todayStr,
            annualRate: annualRate,
            yearsElapsed: 0,
            interestAmount: 0,
            totalAmount: 0,
          });
        }
        return [...prev, ...added];
      } else {
        return prev.slice(0, validCount);
      }
    });
  };

  // Update an individual item
  const updateItem = (index: number, updates: Partial<CalculatorItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Calculate annual compounding: A = P * (1 + r)^t, Interest = A - P
  const calculateRow = (item: CalculatorItem, rateToUse: number) => {
    const p = Number(item.principal) || 0;
    const r = (Number(rateToUse) || 0) / 100;

    const start = new Date(item.startDate).getTime();
    const end = new Date(item.endDate).getTime();
    const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;

    const total = p * Math.pow(1 + r, years);
    const interest = total - p;

    return {
      yearsElapsed: Math.round(years * 100) / 100,
      daysElapsed: Math.round(diffDays),
      interestAmount: Math.round(interest),
      totalAmount: Math.round(total),
    };
  };

  // Totals
  let grandTotalPrincipal = 0;
  let grandTotalInterest = 0;
  let grandTotalAmount = 0;

  const computedRows = items.map((item) => {
    const res = calculateRow(item, annualRate);
    grandTotalPrincipal += Number(item.principal) || 0;
    grandTotalInterest += res.interestAmount;
    grandTotalAmount += res.totalAmount;
    return { ...item, ...res };
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-purple-500/15">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2.5 rounded-full bg-purple-900/40 hover:bg-purple-800 text-gold-300 border border-purple-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-serif">
              Compound Interest Calculator
            </h1>
            <p className="text-xs text-purple-200/60 font-medium">
              Jewellery loan annual compounding calculation (ચક્રવૃદ્ધિ વ્યાજ)
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 bg-[#130324]/80 p-2 rounded-2xl border border-purple-500/20">
          <div className="flex items-center gap-2 px-2">
            <label className="text-xs font-bold text-gold-300">Rate (% p.a.):</label>
            <input
              type="number"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 rounded-xl bg-purple-900/60 border border-gold-500/40 text-gold-300 font-bold text-sm focus:outline-none text-center"
            />
          </div>

          <div className="flex items-center gap-2 px-2 border-l border-purple-500/20">
            <label className="text-xs font-semibold text-purple-200/70">Items:</label>
            <select
              value={itemCount}
              onChange={(e) => handleItemCountChange(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl bg-purple-900/60 border border-purple-500/30 text-white font-bold text-xs focus:outline-none"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Item Rows */}
      <div className="space-y-3">
        {computedRows.map((item, idx) => (
          <div
            key={item.id || idx}
            className="bg-[#130324]/80 p-5 rounded-3xl border border-purple-500/15 shadow-card hover:border-gold-400/40 transition-all space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-gold-300 bg-gold-500/10 px-2.5 py-0.5 rounded-full font-bold">
                Item #{idx + 1}
              </span>
              <span className="text-purple-200/60">
                {item.daysElapsed} days ({item.yearsElapsed} yrs) @ {annualRate}% p.a.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Principal */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-200/70">Principal (₹)</label>
                <input
                  type="number"
                  step="500"
                  value={item.principal}
                  onChange={(e) => updateItem(idx, { principal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c0733] border border-purple-500/20 text-white font-bold text-sm focus:outline-none focus:border-gold-400/60"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-200/70">Start Date</label>
                <input
                  type="date"
                  value={item.startDate}
                  onChange={(e) => updateItem(idx, { startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c0733] border border-purple-500/20 text-white text-xs font-medium focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-200/70">End Date</label>
                <input
                  type="date"
                  value={item.endDate}
                  onChange={(e) => updateItem(idx, { endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c0733] border border-purple-500/20 text-white text-xs font-medium focus:outline-none"
                />
              </div>

              {/* Interest */}
              <div className="bg-[#1c0733]/80 p-2.5 rounded-xl border border-purple-500/10 flex flex-col justify-center">
                <span className="text-[10px] text-purple-200/60 font-semibold uppercase">Interest</span>
                <span className="text-base font-bold text-amber-300">
                  ₹{item.interestAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Total */}
              <div className="bg-gold-500/10 p-2.5 rounded-xl border border-gold-500/30 flex flex-col justify-center">
                <span className="text-[10px] text-gold-300/80 font-semibold uppercase">Total (P + I)</span>
                <span className="text-base font-extrabold text-gold-300">
                  ₹{item.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grand Totals Summary Card */}
      <div className="bg-[#130324]/90 p-6 rounded-3xl border border-gold-500/30 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="bg-[#1c0733] p-4 rounded-2xl border border-purple-500/15">
            <span className="text-xs text-purple-200/60 font-semibold uppercase tracking-wider block">
              Total Principal
            </span>
            <span className="text-2xl font-bold text-white mt-1 block">
              ₹{grandTotalPrincipal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-[#1c0733] p-4 rounded-2xl border border-purple-500/15">
            <span className="text-xs text-amber-300/80 font-semibold uppercase tracking-wider block">
              Total Interest
            </span>
            <span className="text-2xl font-bold text-amber-300 mt-1 block">
              ₹{grandTotalInterest.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-gold-500/15 p-4 rounded-2xl border border-gold-400/40 shadow-gold-glow">
            <span className="text-xs text-gold-300 font-bold uppercase tracking-wider block">
              Grand Total
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-gold-300 mt-1 block">
              ₹{grandTotalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
