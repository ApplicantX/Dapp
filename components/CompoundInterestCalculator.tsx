'use client';

import React, { useState, useEffect } from 'react';
import { CalculatorItem } from '@/lib/types';
import { Calculator, Plus, Trash2, RotateCcw, ArrowLeft, Coins, Sparkles } from 'lucide-react';

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
      // Sample start date: 1 year ago for first item, 6 months ago for second
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
    const years = diffDays / 365.25; // Transparent fractional years

    // Compound Interest Formula: A = P * (1 + r)^t
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-purple-800">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-gold-300 border border-purple-700 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Compound Interest Calculator
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 font-medium">
              Jewellery loan calculations with Annual Compounding (ચક્રવૃદ્ધિ વ્યાજ ગણતરી)
            </p>
          </div>
        </div>

        {/* Global Annual Rate & Item Count Control */}
        <div className="flex flex-wrap items-center gap-3 bg-purple-950/80 p-2.5 rounded-2xl border border-gold-500/30">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gold-300">Annual Rate (% p.a.):</label>
            <input
              type="number"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
              className="w-20 px-3 py-1.5 rounded-xl bg-purple-900 border-2 border-gold-500 text-gold-300 font-black text-base focus:outline-none text-center"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-purple-200">No. of Items (1-20):</label>
            <select
              value={itemCount}
              onChange={(e) => handleItemCountChange(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-bold text-sm focus:outline-none"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Item' : 'Items'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Item Rows Table / Cards */}
      <div className="space-y-3">
        {computedRows.map((item, idx) => (
          <div
            key={item.id || idx}
            className="bg-purple-950/80 p-4 sm:p-5 rounded-2xl border border-purple-800 shadow-royal hover:border-gold-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-gold-300 bg-gold-500/15 px-2.5 py-0.5 rounded-md border border-gold-500/30">
                Loan Item #{idx + 1}
              </span>
              <span className="text-xs text-purple-300 font-medium">
                Time: <strong className="text-white">{item.daysElapsed} days</strong> ({item.yearsElapsed} yrs) @ {annualRate}% p.a.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Principal */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Principal Amount (₹)</label>
                <input
                  type="number"
                  step="500"
                  value={item.principal}
                  onChange={(e) => updateItem(idx, { principal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/90 border border-purple-700 text-white font-extrabold text-base focus:outline-none"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Start Date</label>
                <input
                  type="date"
                  value={item.startDate}
                  onChange={(e) => updateItem(idx, { startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900 border border-purple-700 text-white font-semibold text-xs focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">End Date (Today)</label>
                <input
                  type="date"
                  value={item.endDate}
                  onChange={(e) => updateItem(idx, { endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900 border border-purple-700 text-white font-semibold text-xs focus:outline-none"
                />
              </div>

              {/* Computed Interest Amount */}
              <div className="bg-purple-900/70 p-2.5 rounded-xl border border-purple-700/60 flex flex-col justify-center">
                <span className="text-[11px] text-purple-300 font-bold block">Compound Interest</span>
                <span className="text-lg font-black text-amber-300">
                  ₹{item.interestAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Computed Total Amount */}
              <div className="bg-gradient-to-br from-gold-500/20 to-purple-900/80 p-2.5 rounded-xl border border-gold-500/40 flex flex-col justify-center shadow-gold-glow">
                <span className="text-[11px] text-gold-300 font-bold block">Total Amount (P + I)</span>
                <span className="text-lg font-black text-gold-300">
                  ₹{item.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Summary Card (Grand Totals) */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-850 to-purple-950 p-6 rounded-3xl border-2 border-gold-500/50 shadow-royal">
        <div className="flex items-center gap-2 mb-3 text-gold-300 text-xs font-bold uppercase tracking-wider">
          <Coins className="w-4 h-4" />
          <span>Calculation Summary for {itemCount} Item{itemCount > 1 ? 's' : ''}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="bg-purple-950/80 p-4 rounded-2xl border border-purple-800">
            <span className="text-xs text-purple-300 font-bold block">Total Principal (કુલ મુદ્દલ)</span>
            <span className="text-2xl font-black text-white">
              ₹{grandTotalPrincipal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-purple-950/80 p-4 rounded-2xl border border-purple-800">
            <span className="text-xs text-amber-300 font-bold block">Total Annual Interest (કુલ વ્યાજ)</span>
            <span className="text-2xl font-black text-amber-300">
              ₹{grandTotalInterest.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-gradient-to-br from-gold-500/30 to-purple-900 p-4 rounded-2xl border-2 border-gold-400 shadow-gold-glow">
            <span className="text-xs text-gold-300 font-bold block">Grand Total Payable (કુલ રકમ)</span>
            <span className="text-3xl font-black text-gold-300">
              ₹{grandTotalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
