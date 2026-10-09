'use client';

import React, { useState, useMemo } from 'react';
import { Loan, LoanPayment, LoanTopUp } from '@/lib/types';
import { getLoanPrincipalDetails } from '@/lib/storage';
import {
  X,
  Calculator,
  Calendar,
  Percent,
  ArrowRight,
  Clock,
  Coins,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface LoanInterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  customerName: string;
  village: string;
  diary: string;
  pageNumber: string;
  defaultRate?: number;
}

interface TimelineEvent {
  type: 'TOPUP' | 'REPAYMENT';
  date: string;
  amount: number;
  interestAmount?: number;
  principalAmount?: number;
  notes?: string;
  id: string;
}

interface CalculationSegment {
  index: number;
  label: string;
  startDate: string;
  endDate: string;
  days: number;
  years: number;
  principal: number;
  interest: number;
  event?: TimelineEvent;
  resultingPrincipal: number;
}

export const LoanInterestModal: React.FC<LoanInterestModalProps> = ({
  isOpen,
  onClose,
  loan,
  customerName,
  village,
  diary,
  pageNumber,
  defaultRate = 18.0,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [rate, setRate] = useState<number>(defaultRate);
  const [asOfDate, setAsOfDate] = useState<string>(todayStr);
  const [copied, setCopied] = useState<boolean>(false);

  const loanPrincipalDetails = useMemo(() => {
    if (!loan) return null;
    return getLoanPrincipalDetails(loan);
  }, [loan]);

  // Calculate annual compounding timeline breakdown factoring in top-ups & repayments
  const calculation = useMemo(() => {
    if (!loan || !loanPrincipalDetails) return null;

    const r = (Number(rate) || 0) / 100;
    const loanStartDate = loan.loanDate || todayStr;
    const targetEndDate = asOfDate || todayStr;

    // Collect all timeline events up to targetEndDate
    const events: TimelineEvent[] = [];

    // 1. Top-ups
    (loan.topUps || []).forEach((t) => {
      if (t && t.date && t.date <= targetEndDate && Number(t.amount) > 0) {
        events.push({
          type: 'TOPUP',
          date: t.date,
          amount: Number(t.amount) || 0,
          notes: t.notes,
          id: t.id,
        });
      }
    });

    // 2. Repayments
    (loan.payments || []).forEach((p) => {
      if (p && p.date && p.date <= targetEndDate && Number(p.amount) > 0) {
        const amt = Number(p.amount) || 0;
        const intAmt = typeof p.interestAmount === 'number' ? p.interestAmount : 0;
        const princAmt = typeof p.principalAmount === 'number'
          ? p.principalAmount
          : Math.max(0, amt - intAmt);

        events.push({
          type: 'REPAYMENT',
          date: p.date,
          amount: amt,
          interestAmount: intAmt,
          principalAmount: princAmt,
          notes: p.notes,
          id: p.id,
        });
      }
    });

    // Sort chronologically
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const segments: CalculationSegment[] = [];
    let currentPrincipal = Number(loan.loanAmount) || 0;
    let currentDate = loanStartDate;
    let totalGrossInterest = 0;
    let totalInterestPaidInRepayments = 0;
    let totalPrincipalRepaid = 0;
    let totalTopUps = 0;

    const dayMs = 1000 * 60 * 60 * 24;

    if (events.length === 0) {
      // Single continuous period from loanDate to asOfDate
      const startMs = new Date(loanStartDate).getTime();
      const endMs = new Date(targetEndDate).getTime();
      const diffDays = Math.max(0, Math.round((endMs - startMs) / dayMs));
      const years = diffDays / 365.25;

      const interest = currentPrincipal > 0 ? currentPrincipal * (Math.pow(1 + r, years) - 1) : 0;
      const roundedInterest = Math.round(interest);
      totalGrossInterest = roundedInterest;

      segments.push({
        index: 1,
        label: 'Full Loan Period',
        startDate: loanStartDate,
        endDate: targetEndDate,
        days: diffDays,
        years: Math.round(years * 100) / 100,
        principal: currentPrincipal,
        interest: roundedInterest,
        resultingPrincipal: currentPrincipal,
      });
    } else {
      let segmentIndex = 1;

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const evDate = ev.date;

        // Interest accrued from currentDate to event date
        const startMs = new Date(currentDate).getTime();
        const evMs = new Date(evDate).getTime();
        const diffDays = Math.max(0, Math.round((evMs - startMs) / dayMs));
        const years = diffDays / 365.25;

        const segInterest = currentPrincipal > 0 ? Math.round(currentPrincipal * (Math.pow(1 + r, years) - 1)) : 0;
        totalGrossInterest += segInterest;

        let nextPrincipal = currentPrincipal;

        if (ev.type === 'TOPUP') {
          totalTopUps += ev.amount;
          nextPrincipal = currentPrincipal + ev.amount;
        } else {
          // Repayment: interest deducted first, then principal
          totalInterestPaidInRepayments += ev.interestAmount || 0;
          totalPrincipalRepaid += ev.principalAmount || 0;
          nextPrincipal = Math.max(0, currentPrincipal - (ev.principalAmount || 0));
        }

        segments.push({
          index: segmentIndex++,
          label: ev.type === 'TOPUP' ? `Period to Top-Up #${i + 1}` : `Period to Repayment #${i + 1}`,
          startDate: currentDate,
          endDate: evDate,
          days: diffDays,
          years: Math.round(years * 100) / 100,
          principal: currentPrincipal,
          interest: segInterest,
          event: ev,
          resultingPrincipal: nextPrincipal,
        });

        currentPrincipal = nextPrincipal;
        currentDate = evDate;
      }

      // Final segment from last event date to asOfDate
      if (currentDate <= targetEndDate) {
        const startMs = new Date(currentDate).getTime();
        const endMs = new Date(targetEndDate).getTime();
        const diffDays = Math.max(0, Math.round((endMs - startMs) / dayMs));
        const years = diffDays / 365.25;

        const segInterest = currentPrincipal > 0 ? Math.round(currentPrincipal * (Math.pow(1 + r, years) - 1)) : 0;
        totalGrossInterest += segInterest;

        segments.push({
          index: segmentIndex++,
          label: 'Current Period (After Updates)',
          startDate: currentDate,
          endDate: targetEndDate,
          days: diffDays,
          years: Math.round(years * 100) / 100,
          principal: currentPrincipal,
          interest: segInterest,
          resultingPrincipal: currentPrincipal,
        });
      }
    }

    const initialPrincipal = Number(loan.loanAmount) || 0;
    const totalBorrowed = initialPrincipal + totalTopUps;
    const remainingPrincipal = currentPrincipal;

    // Remaining interest: total accrued interest minus interest already paid in partial payments
    const netRemainingInterest = Math.max(0, totalGrossInterest - totalInterestPaidInRepayments);
    const finalSettlementAmount = remainingPrincipal + netRemainingInterest;

    // Total days across entire loan span
    const totalStartMs = new Date(loanStartDate).getTime();
    const totalEndMs = new Date(targetEndDate).getTime();
    const totalDaysElapsed = Math.max(0, Math.round((totalEndMs - totalStartMs) / dayMs));

    return {
      segments,
      initialPrincipal,
      totalTopUps,
      totalBorrowed,
      totalPrincipalRepaid,
      totalInterestPaidInRepayments,
      remainingPrincipal,
      totalGrossInterest,
      netRemainingInterest,
      finalSettlementAmount,
      totalDaysElapsed,
      eventsCount: events.length,
    };
  }, [loan, loanPrincipalDetails, rate, asOfDate, todayStr]);

  if (!isOpen || !loan || !calculation) return null;

  const handleCopySummary = () => {
    const text = `Dahod Jewellery Lending - Interest Breakdown
Customer: ${customerName} (${village})
Diary: ${diary}, Page: ${pageNumber}
Loan Date: ${loan.loanDate}
As-of Date: ${asOfDate}
Annual Rate: ${rate}% p.a.
Initial Principal: ₹${calculation.initialPrincipal.toLocaleString('en-IN')}
Total Top-Ups: ₹${calculation.totalTopUps.toLocaleString('en-IN')}
Total Borrowed: ₹${calculation.totalBorrowed.toLocaleString('en-IN')}
Principal Repaid: ₹${calculation.totalPrincipalRepaid.toLocaleString('en-IN')}
Interest Paid in Repayments: ₹${calculation.totalInterestPaidInRepayments.toLocaleString('en-IN')}
Remaining Principal: ₹${calculation.remainingPrincipal.toLocaleString('en-IN')}
Net Accrued Compound Interest: ₹${calculation.netRemainingInterest.toLocaleString('en-IN')}
Final Settlement Amount (P + I): ₹${calculation.finalSettlementAmount.toLocaleString('en-IN')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                <span>Annual Compounding (ચક્રવૃદ્ધિ વ્યાજ)</span>
              </div>
              <h2 className="text-lg font-bold text-zinc-900 leading-snug">
                {customerName} • <span className="text-zinc-500 font-medium text-sm">{village}</span>
              </h2>
              <span className="text-[11px] text-zinc-400">
                {diary} • Page {pageNumber} • Loan Date: {loan.loanDate}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Controls Bar: Rate & As-of Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
            {/* Rate Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                <Percent className="w-3 h-3 text-purple-600" />
                <span>Annual Interest Rate (% p.a.)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="100"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 text-purple-950 font-bold text-sm focus:border-purple-600 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-600">
                  % p.a.
                </span>
              </div>
            </div>

            {/* As-Of Date Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-600" />
                <span>Calculate As-Of Date (તારીખ)</span>
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 text-zinc-900 font-semibold text-xs focus:border-purple-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Total Borrowed
              </span>
              <span className="text-sm font-bold text-zinc-900 mt-0.5 block">
                ₹{calculation.totalBorrowed.toLocaleString('en-IN')}
              </span>
              {calculation.totalTopUps > 0 && (
                <span className="text-[9px] text-purple-700 block">
                  (+₹{calculation.totalTopUps.toLocaleString('en-IN')} topup)
                </span>
              )}
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Principal Repaid
              </span>
              <span className="text-sm font-bold text-emerald-700 mt-0.5 block">
                ₹{calculation.totalPrincipalRepaid.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Remaining Principal
              </span>
              <span className="text-sm font-extrabold text-purple-800 mt-0.5 block">
                ₹{calculation.remainingPrincipal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                Total Duration
              </span>
              <span className="text-sm font-bold text-zinc-800 mt-0.5 block">
                {calculation.totalDaysElapsed} days
              </span>
            </div>
          </div>

          {/* Step-by-Step Period Calculation Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Compounding Breakdown by Period ({calculation.segments.length})</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                Formula: A = P × (1 + {rate}%)^(days/365.25)
              </span>
            </div>

            <div className="space-y-2">
              {calculation.segments.map((seg) => (
                <div
                  key={seg.index}
                  className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 font-bold text-[10px] border border-purple-100">
                        Stage {seg.index}
                      </span>
                      <span className="font-semibold text-zinc-800">{seg.label}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                      <span>{seg.startDate}</span>
                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                      <span className="font-semibold text-zinc-800">{seg.endDate}</span>
                      <span className="text-purple-700 font-bold">
                        ({seg.days} days / {seg.years} yrs)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium uppercase block">
                        Principal in Period
                      </span>
                      <span className="font-bold text-zinc-800">
                        ₹{seg.principal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-purple-600 font-semibold uppercase block">
                        Period Interest
                      </span>
                      <span className="font-extrabold text-purple-800">
                        ₹{seg.interest.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {seg.event && seg.event.type === 'TOPUP' && (
                      <div>
                        <span className="text-[10px] text-purple-600 font-semibold uppercase flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-purple-600" />
                          <span>Top-Up Added</span>
                        </span>
                        <span className="font-bold text-purple-800">
                          + ₹{seg.event.amount.toLocaleString('en-IN')}
                        </span>
                        {seg.event.notes && (
                          <span className="text-[9px] text-zinc-400 block truncate">
                            ({seg.event.notes})
                          </span>
                        )}
                      </div>
                    )}

                    {seg.event && seg.event.type === 'REPAYMENT' && (
                      <div>
                        <span className="text-[10px] text-emerald-600 font-semibold uppercase flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          <span>Repayment Paid</span>
                        </span>
                        <span className="font-bold text-emerald-700">
                          ₹{seg.event.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] text-zinc-500 block">
                          (Int: ₹{(seg.event.interestAmount || 0).toLocaleString('en-IN')}, Princ: -₹{(seg.event.principalAmount || 0).toLocaleString('en-IN')})
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase block">
                        Resulting Principal
                      </span>
                      <span className="font-extrabold text-zinc-900">
                        ₹{seg.resultingPrincipal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Grand Settlement Box */}
          <div className="bg-gradient-to-br from-purple-700 to-purple-900 p-5 rounded-3xl text-white shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-purple-500/50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Final Settlement Calculation (ખાતું પૂરું કરવા માટે)
              </span>
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                title="Copy breakdown to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-2xs">
                <span className="text-[11px] text-purple-200 font-medium block">
                  Remaining Principal
                </span>
                <span className="text-xl font-bold text-white mt-1 block">
                  ₹{calculation.remainingPrincipal.toLocaleString('en-IN')}
                </span>
                {calculation.totalTopUps > 0 && (
                  <span className="text-[10px] text-purple-200/80 block mt-0.5">
                    (Total Borrowed: ₹{calculation.totalBorrowed.toLocaleString('en-IN')})
                  </span>
                )}
              </div>

              <div className="bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-2xs">
                <span className="text-[11px] text-purple-200 font-medium block">
                  Net Accrued Interest
                </span>
                <span className="text-xl font-bold text-amber-300 mt-1 block">
                  ₹{calculation.netRemainingInterest.toLocaleString('en-IN')}
                </span>
                {calculation.totalInterestPaidInRepayments > 0 && (
                  <span className="text-[10px] text-purple-200/80 block mt-0.5">
                    (₹{calculation.totalInterestPaidInRepayments.toLocaleString('en-IN')} paid in repayments)
                  </span>
                )}
              </div>

              <div className="bg-white/20 p-3 rounded-2xl border border-white/20 backdrop-blur-2xs">
                <span className="text-[11px] text-purple-100 font-bold uppercase tracking-wider block">
                  Net Settlement Payable
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  ₹{calculation.finalSettlementAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-purple-200/90 italic pt-1 text-center sm:text-left">
              * Annually compounding rate of {rate}% p.a. calculated with intermediate top-ups and repayments up to {asOfDate}.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-zinc-800 hover:bg-zinc-900 text-white font-semibold text-xs transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
