'use client';

import React, { useState, useEffect } from 'react';
import { CalculatorItem } from '@/lib/types';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface CompoundInterestCalculatorProps {
  defaultRate?: number;
  onBackToHome?: () => void;
}

export const CompoundInterestCalculator: React.FC<CompoundInterestCalculatorProps> = ({
  defaultRate = 18.0,
  onBackToHome,
}) => {
  // Default to 1 item as requested
  const [itemCount, setItemCount] = useState<number>(1);
  const [annualRate, setAnnualRate] = useState<number>(defaultRate);
  const [items, setItems] = useState<CalculatorItem[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Initialize with exactly 1 item by default
  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    const sDate = d.toISOString().split('T')[0];

    const initial: CalculatorItem[] = [
      {
        id: 'calc-item-1',
        principal: 50000,
        startDate: sDate,
        endDate: todayStr,
        annualRate: defaultRate,
        yearsElapsed: 0,
        interestAmount: 0,
        totalAmount: 0,
      },
    ];
    setItems(initial);
  }, []);

  // Update item count from select dropdown
  const handleItemCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setItemCount(validCount);

    setItems((prev) => {
      if (validCount > prev.length) {
        const added: CalculatorItem[] = [];
        for (let i = prev.length; i < validCount; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() - 6);
          const sDate = d.toISOString().split('T')[0];

          added.push({
            id: `calc-item-${i + 1}`,
            principal: 25000,
            startDate: sDate,
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

  // Add a single item dynamically
  const handleAddItem = () => {
    if (itemCount >= 20) return;
    const newCount = itemCount + 1;
    setItemCount(newCount);
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    const sDate = d.toISOString().split('T')[0];

    setItems((prev) => [
      ...prev,
      {
        id: `calc-item-${Date.now()}`,
        principal: 25000,
        startDate: sDate,
        endDate: todayStr,
        annualRate: annualRate,
        yearsElapsed: 0,
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 hover:text-purple-700 border border-zinc-200 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
              Interest Calculator
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Annual compounding jewellery loan calculation (ચક્રવૃદ્ધિ વ્યાજ)
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <label className="text-xs font-medium text-zinc-600">Rate (% p.a.):</label>
            <input
              type="number"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 rounded-xl bg-zinc-50 border border-zinc-200 text-purple-700 font-bold text-sm focus:bg-white focus:border-purple-500 focus:outline-none text-center"
            />
          </div>

          <div className="flex items-center gap-2 px-2 border-l border-zinc-200">
            <label className="text-xs font-medium text-zinc-600">Items:</label>
            <select
              value={itemCount}
              onChange={(e) => handleItemCountChange(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'item' : 'items'}
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
            className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-sm hover:border-purple-300 transition-all space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full font-semibold">
                  Item #{idx + 1}
                </span>
                <span className="text-zinc-500">
                  {item.daysElapsed} days ({item.yearsElapsed} yrs) @ {annualRate}% p.a.
                </span>
              </div>
              {computedRows.length > 1 && (
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="text-zinc-400 hover:text-rose-600 p-1 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Principal */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-600">Principal (₹)</label>
                <input
                  type="number"
                  step="500"
                  value={item.principal}
                  onChange={(e) => updateItem(idx, { principal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-900 font-semibold text-sm focus:bg-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-600">Start Date</label>
                <input
                  type="date"
                  value={item.startDate}
                  onChange={(e) => updateItem(idx, { startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-800 text-xs font-medium focus:bg-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-600">End Date</label>
                <input
                  type="date"
                  value={item.endDate}
                  onChange={(e) => updateItem(idx, { endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-800 text-xs font-medium focus:bg-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Interest */}
              <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 flex flex-col justify-center">
                <span className="text-[10px] text-purple-700 font-medium uppercase tracking-wider">Interest</span>
                <span className="text-base font-bold text-purple-800">
                  ₹{item.interestAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Total */}
              <div className="bg-purple-100/70 p-2.5 rounded-xl border border-purple-200 flex flex-col justify-center">
                <span className="text-[10px] text-purple-900 font-semibold uppercase tracking-wider">Total (P + I)</span>
                <span className="text-base font-extrabold text-purple-950">
                  ₹{item.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ))}

        {computedRows.length < 20 && (
          <button
            onClick={handleAddItem}
            className="w-full py-2.5 rounded-2xl border border-dashed border-zinc-300 hover:border-purple-400 bg-white hover:bg-purple-50/30 text-xs font-semibold text-zinc-600 hover:text-purple-700 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Item</span>
          </button>
        )}
      </div>

      {/* Grand Totals Summary Card */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">
              Total Principal
            </span>
            <span className="text-2xl font-bold text-zinc-900 mt-1 block">
              ₹{grandTotalPrincipal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
            <span className="text-xs text-purple-700 font-semibold uppercase tracking-wider block">
              Total Interest
            </span>
            <span className="text-2xl font-bold text-purple-800 mt-1 block">
              ₹{grandTotalInterest.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-purple-600 p-4 rounded-xl text-white shadow-sm">
            <span className="text-xs text-purple-100 font-semibold uppercase tracking-wider block">
              Grand Total
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white mt-1 block">
              ₹{grandTotalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
