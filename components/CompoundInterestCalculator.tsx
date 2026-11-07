'use client';

import React, { useState, useEffect } from 'react';
import { CalculatorItem } from '@/lib/types';
import { ArrowLeft, Plus, Trash2, Calculator, Percent, Coins, Clock } from 'lucide-react';

interface CompoundInterestCalculatorProps {
  defaultRate?: number;
  onBackToHome?: () => void;
}

export const CompoundInterestCalculator: React.FC<CompoundInterestCalculatorProps> = ({
  defaultRate = 18.0,
  onBackToHome,
}) => {
  // Rate state: allow empty string when backspacing so it never sticks to 0 or becomes 030
  const [annualRate, setAnnualRate] = useState<number | ''>(defaultRate);
  const [itemCount, setItemCount] = useState<number>(1);
  const [items, setItems] = useState<CalculatorItem[]>([]);

  // Initialize with exactly 1 item by default (1 Year, 0 Months)
  useEffect(() => {
    const initial: CalculatorItem[] = [
      {
        id: 'calc-item-1',
        principal: 50000,
        years: 1,
        months: 0,
        annualRate: defaultRate,
        yearsElapsed: 1,
        interestAmount: 0,
        totalAmount: 0,
      },
    ];
    setItems(initial);
  }, [defaultRate]);

  // Handle annual rate change cleanly (no leading zero bug)
  const handleRateChange = (raw: string) => {
    if (raw === '') {
      setAnnualRate('');
      return;
    }
    // Remove leading zeros if user typed a number like 030 -> 30
    const cleaned = raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.') ? raw.replace(/^0+/, '') : raw;
    const parsed = parseFloat(cleaned);
    setAnnualRate(isNaN(parsed) ? '' : parsed);
  };

  // Update item count from select dropdown
  const handleItemCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setItemCount(validCount);

    setItems((prev) => {
      if (validCount > prev.length) {
        const added: CalculatorItem[] = [];
        for (let i = prev.length; i < validCount; i++) {
          added.push({
            id: `calc-item-${Date.now()}-${i}`,
            principal: 25000,
            years: 1,
            months: 0,
            annualRate: annualRate === '' ? 0 : annualRate,
            yearsElapsed: 1,
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

  // Add a single item dynamically
  const handleAddItem = () => {
    if (itemCount >= 20) return;
    const newCount = itemCount + 1;
    setItemCount(newCount);

    setItems((prev) => [
      ...prev,
      {
        id: `calc-item-${Date.now()}`,
        principal: 25000,
        years: 1,
        months: 0,
        annualRate: annualRate === '' ? 0 : annualRate,
        yearsElapsed: 1,
        interestAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  // Remove a single item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
    setItemCount(nextItems.length);
  };

  // Update an individual item field cleanly without leading zeros
  const updateNumericField = (
    index: number,
    field: 'principal' | 'years' | 'months',
    raw: string
  ) => {
    let finalVal: number | '' = '';
    if (raw !== '') {
      const cleaned = raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.') ? raw.replace(/^0+/, '') : raw;
      const parsed = parseFloat(cleaned);
      finalVal = isNaN(parsed) ? '' : Math.max(0, parsed);
    }

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: finalVal };
      return copy;
    });
  };

  // Calculate annual compounding: A = P * (1 + r)^t, Interest = A - P
  const effectiveRate = annualRate === '' ? 0 : Number(annualRate);

  const calculateRow = (item: CalculatorItem, rateToUse: number) => {
    const p = item.principal === '' ? 0 : Number(item.principal) || 0;
    const r = (Number(rateToUse) || 0) / 100;
    const y = item.years === '' ? 0 : Number(item.years) || 0;
    const m = item.months === '' ? 0 : Number(item.months) || 0;

    const totalYears = y + m / 12;
    const total = totalYears > 0 && p > 0 ? p * Math.pow(1 + r, totalYears) : p;
    const interest = total - p;

    return {
      yearsElapsed: Math.round(totalYears * 100) / 100,
      interestAmount: Math.round(interest),
      totalAmount: Math.round(total),
    };
  };

  // Grand Totals
  let grandTotalPrincipal = 0;
  let grandTotalInterest = 0;
  let grandTotalAmount = 0;

  const computedRows = items.map((item) => {
    const res = calculateRow(item, effectiveRate);
    grandTotalPrincipal += item.principal === '' ? 0 : Number(item.principal) || 0;
    grandTotalInterest += res.interestAmount;
    grandTotalAmount += res.totalAmount;
    return { ...item, ...res };
  });

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl w-full mx-auto pb-16 px-1 sm:px-2">
      {/* 1. Header Bar: Responsive on Foldable Front Screens & Mobile */}
      <div className="bg-white p-4 sm:p-7 rounded-3xl border-2 border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-3 sm:p-4 rounded-2xl bg-zinc-100 hover:bg-purple-100 text-zinc-800 hover:text-purple-800 border-2 border-zinc-200 transition-all flex items-center gap-1.5 text-sm sm:text-base font-bold shadow-2xs flex-shrink-0"
              title="Go back to Home"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span className="hidden xs:inline">Back</span>
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight truncate">
                Interest Calculator
              </h1>
            </div>
            <p className="text-xs sm:text-base text-zinc-600 font-semibold mt-1">
              Annual Compounding Loan Calculator (ચક્રવૃદ્ધિ વ્યાજ ગણતરી)
            </p>
          </div>
        </div>

        {/* Global Controls: Responsive, Clean Inputs (No 030 Leading Zero) */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-purple-50/70 p-3 sm:p-4 rounded-2xl border-2 border-purple-200 shadow-sm">
          {/* Annual Rate */}
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-base font-extrabold text-purple-950 flex items-center gap-1">
              <Percent className="w-4 h-4 text-purple-700 stroke-[2.5]" />
              <span>Rate (% p.a.):</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max="100"
              placeholder="18"
              value={annualRate === '' ? '' : annualRate}
              onChange={(e) => handleRateChange(e.target.value)}
              className="w-20 sm:w-28 px-2.5 py-2 rounded-xl bg-white border-2 border-purple-300 text-purple-950 font-black text-lg sm:text-2xl text-center focus:border-purple-600 focus:outline-none shadow-2xs"
            />
          </div>

          <div className="h-7 w-px bg-purple-200 hidden xs:block" />

          {/* Item Count Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-base font-extrabold text-purple-950 flex items-center gap-1">
              <Coins className="w-4 h-4 text-purple-700 stroke-[2.5]" />
              <span>Pledges:</span>
            </label>
            <select
              value={itemCount}
              onChange={(e) => handleItemCountChange(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-xl bg-white border-2 border-purple-300 text-zinc-900 font-black text-sm sm:text-lg focus:border-purple-600 focus:outline-none shadow-2xs cursor-pointer"
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

      {/* 2. Calculator Items: Senior-Friendly, Big Inputs, Years & Months */}
      <div className="space-y-5 sm:space-y-6">
        {computedRows.map((item, idx) => {
          const yNum = item.years === '' ? 0 : Number(item.years) || 0;
          const mNum = item.months === '' ? 0 : Number(item.months) || 0;

          return (
            <div
              key={item.id || idx}
              className="bg-white p-4 sm:p-7 rounded-3xl border-2 border-zinc-200 shadow-md hover:border-purple-300 transition-all space-y-4 sm:space-y-5"
            >
              {/* Item Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b-2 border-zinc-100 pb-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm sm:text-lg font-black px-3.5 py-1 sm:py-1.5 rounded-full bg-purple-600 text-white shadow-2xs">
                    Item #{idx + 1}
                  </span>
                  <span className="text-xs sm:text-base font-extrabold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-700" />
                    <span>
                      {yNum > 0 ? `${yNum} Yr${yNum > 1 ? 's' : ''} ` : ''}
                      {mNum > 0 ? `${mNum} Mo${mNum > 1 ? 's' : ''} ` : ''}
                      {yNum === 0 && mNum === 0 ? '0 Mos ' : ''}
                      ({item.yearsElapsed} Yrs @ {effectiveRate}% p.a.)
                    </span>
                  </span>
                </div>

                {computedRows.length > 1 && (
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs sm:text-sm font-bold transition-colors ml-auto"
                    title="Remove this item"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.2]" />
                    <span className="hidden xs:inline">Remove</span>
                  </button>
                )}
              </div>

              {/* Inputs Grid: Principal, Years, Months (Clean, Senior-Friendly, No Leading Zeros) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                {/* Principal Amount (Large Field) */}
                <div className="sm:col-span-6 space-y-1.5 p-3 sm:p-4 rounded-2xl bg-zinc-50 border-2 border-zinc-200">
                  <label className="text-xs sm:text-base font-extrabold text-zinc-900 block">
                    Principal Amount (મુદ્દલ) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-lg sm:text-xl">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 50000"
                      value={item.principal === '' ? '' : item.principal}
                      onChange={(e) => updateNumericField(idx, 'principal', e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 sm:py-3 rounded-xl bg-white border-2 border-zinc-300 text-zinc-950 font-black text-lg sm:text-2xl focus:border-purple-600 focus:outline-none transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Years Selector / Input */}
                <div className="sm:col-span-3 space-y-1.5 p-3 sm:p-4 rounded-2xl bg-purple-50/50 border-2 border-purple-200">
                  <label className="text-xs sm:text-base font-extrabold text-purple-950 block">
                    Years (વર્ષ)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      placeholder="0"
                      value={item.years === '' ? '' : item.years}
                      onChange={(e) => updateNumericField(idx, 'years', e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-3 rounded-xl bg-white border-2 border-purple-300 text-purple-950 font-black text-lg sm:text-2xl text-center focus:border-purple-600 focus:outline-none shadow-2xs"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const curr = item.years === '' ? 0 : Number(item.years);
                          updateNumericField(idx, 'years', String(curr + 1));
                        }}
                        className="px-2 py-0.5 rounded-md bg-purple-200 hover:bg-purple-300 text-purple-900 font-black text-xs"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const curr = item.years === '' ? 0 : Number(item.years);
                          if (curr > 0) updateNumericField(idx, 'years', String(curr - 1));
                        }}
                        className="px-2 py-0.5 rounded-md bg-purple-200 hover:bg-purple-300 text-purple-900 font-black text-xs"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                {/* Months Selector / Input */}
                <div className="sm:col-span-3 space-y-1.5 p-3 sm:p-4 rounded-2xl bg-purple-50/50 border-2 border-purple-200">
                  <label className="text-xs sm:text-base font-extrabold text-purple-950 block">
                    Months (મહિના)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="11"
                      step="1"
                      placeholder="0"
                      value={item.months === '' ? '' : item.months}
                      onChange={(e) => updateNumericField(idx, 'months', e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-3 rounded-xl bg-white border-2 border-purple-300 text-purple-950 font-black text-lg sm:text-2xl text-center focus:border-purple-600 focus:outline-none shadow-2xs"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const curr = item.months === '' ? 0 : Number(item.months);
                          updateNumericField(idx, 'months', String(Math.min(11, curr + 1)));
                        }}
                        className="px-2 py-0.5 rounded-md bg-purple-200 hover:bg-purple-300 text-purple-900 font-black text-xs"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const curr = item.months === '' ? 0 : Number(item.months);
                          if (curr > 0) updateNumericField(idx, 'months', String(curr - 1));
                        }}
                        className="px-2 py-0.5 rounded-md bg-purple-200 hover:bg-purple-300 text-purple-900 font-black text-xs"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Months Stepper Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-zinc-500 font-bold mr-1">Quick Select:</span>
                {[
                  { label: '3 Mos', y: 0, m: 3 },
                  { label: '6 Mos', y: 0, m: 6 },
                  { label: '9 Mos', y: 0, m: 9 },
                  { label: '1 Year', y: 1, m: 0 },
                  { label: '1.5 Yrs', y: 1, m: 6 },
                  { label: '2 Yrs', y: 2, m: 0 },
                  { label: '3 Yrs', y: 3, m: 0 },
                ].map((pill) => (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => {
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], years: pill.y, months: pill.m };
                        return copy;
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-bold transition-all ${
                      item.years === pill.y && item.months === pill.m
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-zinc-100 hover:bg-purple-100 text-zinc-700 hover:text-purple-800 border-zinc-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Results Blocks: 2 Big High-Contrast Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                {/* Accrued Interest */}
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 border-2 border-purple-200 shadow-2xs flex flex-col justify-center">
                  <span className="text-xs sm:text-sm font-extrabold text-purple-800 uppercase tracking-wider block">
                    Accrued Interest (ચક્રવૃદ્ધિ વ્યાજ)
                  </span>
                  <span className="text-2xl sm:text-4xl font-black text-purple-900 mt-1 sm:mt-1.5 block tracking-tight">
                    ₹{item.interestAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Total Repayable */}
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-100/80 border-2 border-purple-300 shadow-2xs flex flex-col justify-center">
                  <span className="text-xs sm:text-sm font-black text-purple-950 uppercase tracking-wider block">
                    Total Repayable (કુલ મુદ્દલ + વ્યાજ)
                  </span>
                  <span className="text-2xl sm:text-4xl font-black text-purple-950 mt-1 sm:mt-1.5 block tracking-tight">
                    ₹{item.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Another Item Button */}
        {computedRows.length < 20 && (
          <button
            onClick={handleAddItem}
            className="w-full py-4 sm:py-5 rounded-3xl border-3 border-dashed border-purple-300 hover:border-purple-600 bg-white hover:bg-purple-50/50 active:scale-[0.99] text-base sm:text-lg font-black text-purple-800 hover:text-purple-900 flex items-center justify-center gap-2.5 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            <span>+ Add Another Item (બીજો દાગીનો ઉમેરો)</span>
          </button>
        )}
      </div>

      {/* 3. Grand Totals Summary Card: Massive Senior-Citizen Numbers */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl border-2 border-zinc-200 shadow-md space-y-4">
        <h3 className="text-sm sm:text-lg font-extrabold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
          <span>Grand Settlement Summary (કુલ સરવાળો)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          {/* Total Principal */}
          <div className="bg-zinc-50 p-4 sm:p-6 rounded-2xl border-2 border-zinc-200">
            <span className="text-xs sm:text-sm text-zinc-600 font-extrabold uppercase tracking-wider block">
              Total Principal (કુલ મુદ્દલ)
            </span>
            <span className="text-2xl sm:text-4xl font-black text-zinc-950 mt-1 sm:mt-2 block tracking-tight">
              ₹{grandTotalPrincipal.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Total Interest */}
          <div className="bg-purple-50 p-4 sm:p-6 rounded-2xl border-2 border-purple-200">
            <span className="text-xs sm:text-sm text-purple-800 font-extrabold uppercase tracking-wider block">
              Total Interest (કુલ વ્યાજ)
            </span>
            <span className="text-2xl sm:text-4xl font-black text-purple-900 mt-1 sm:mt-2 block tracking-tight">
              ₹{grandTotalInterest.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Grand Total */}
          <div className="bg-gradient-to-br from-purple-700 to-purple-900 p-4 sm:p-6 rounded-2xl text-white shadow-md">
            <span className="text-xs sm:text-sm text-purple-200 font-black uppercase tracking-wider block">
              Grand Total (કુલ પતાવટ રકમ)
            </span>
            <span className="text-2xl sm:text-5xl font-black text-white mt-1 sm:mt-2 block tracking-tight">
              ₹{grandTotalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
