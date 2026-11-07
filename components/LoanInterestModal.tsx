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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border-2 border-zinc-200 shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header: Large, High-Contrast */}
        <div className="flex items-center justify-between p-6 border-b-2 border-zinc-100 bg-zinc-50/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Calculator className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs sm:text-sm font-black uppercase tracking-wider mb-1">
                <span>Annual Compounding (ચક્રવૃદ્ધિ વ્યાજ)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 leading-tight">
                {customerName} • <span className="text-zinc-600 font-bold text-lg sm:text-xl">{village}</span>
              </h2>
              <span className="text-xs sm:text-sm text-zinc-500 font-semibold block mt-0.5">
                {diary} • Page {pageNumber} • Loan Date: {loan.loanDate}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Controls Bar: Rate & As-of Date with Big Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/70 p-5 rounded-2xl border-2 border-purple-200">
            {/* Rate Input */}
            <div className="space-y-1.5">
              <label className="text-sm sm:text-base font-extrabold text-purple-950 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-purple-700 stroke-[2.5]" />
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
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-purple-300 text-purple-950 font-black text-xl sm:text-2xl focus:border-purple-600 focus:outline-none shadow-2xs"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-purple-600">
                  % p.a.
                </span>
              </div>
            </div>

            {/* As-Of Date Input */}
            <div className="space-y-1.5">
              <label className="text-sm sm:text-base font-extrabold text-purple-950 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-700 stroke-[2.5]" />
                <span>Calculate As-Of Date (તારીખ)</span>
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-purple-300 text-zinc-950 font-bold text-base sm:text-lg focus:border-purple-600 focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Metrics Bar: Large Senior-Citizen Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-zinc-200">
              <span className="text-xs sm:text-sm text-zinc-500 font-extrabold uppercase tracking-wider block">
                Total Borrowed
              </span>
              <span className="text-lg sm:text-2xl font-black text-zinc-900 mt-1 block">
                ₹{calculation.totalBorrowed.toLocaleString('en-IN')}
              </span>
              {calculation.totalTopUps > 0 && (
                <span className="text-xs text-purple-700 font-bold block mt-0.5">
                  (+₹{calculation.totalTopUps.toLocaleString('en-IN')} topup)
                </span>
              )}
            </div>

            <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-zinc-200">
              <span className="text-xs sm:text-sm text-zinc-500 font-extrabold uppercase tracking-wider block">
                Principal Repaid
              </span>
              <span className="text-lg sm:text-2xl font-black text-emerald-700 mt-1 block">
                ₹{calculation.totalPrincipalRepaid.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-200">
              <span className="text-xs sm:text-sm text-purple-800 font-extrabold uppercase tracking-wider block">
                Remaining Principal
              </span>
              <span className="text-lg sm:text-2xl font-black text-purple-950 mt-1 block">
                ₹{calculation.remainingPrincipal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-zinc-200">
              <span className="text-xs sm:text-sm text-zinc-500 font-extrabold uppercase tracking-wider block">
                Total Duration
              </span>
              <span className="text-lg sm:text-2xl font-black text-zinc-900 mt-1 block">
                {calculation.totalDaysElapsed} days
              </span>
            </div>
          </div>

          {/* Step-by-Step Period Calculation Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-zinc-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                <span>Compounding Breakdown by Period ({calculation.segments.length})</span>
              </span>
              <span className="text-xs sm:text-sm text-zinc-500 font-semibold">
                Formula: A = P × (1 + {rate}%)^(days/365.25)
              </span>
            </div>

            <div className="space-y-3">
              {calculation.segments.map((seg) => (
                <div
                  key={seg.index}
                  className="bg-white p-5 rounded-2xl border-2 border-zinc-200 shadow-2xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-black text-xs sm:text-sm border border-purple-200">
                        Stage {seg.index}
                      </span>
                      <span className="font-extrabold text-zinc-900 text-sm sm:text-base">{seg.label}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 font-semibold">
                      <span>{seg.startDate}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
                      <span className="font-bold text-zinc-900">{seg.endDate}</span>
                      <span className="text-purple-800 font-black">
                        ({seg.days} days / {seg.years} yrs)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    <div>
                      <span className="text-xs text-zinc-500 font-bold uppercase block">
                        Principal in Period
                      </span>
                      <span className="font-extrabold text-zinc-900 text-base sm:text-lg">
                        ₹{seg.principal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-purple-700 font-extrabold uppercase block">
                        Period Interest
                      </span>
                      <span className="font-black text-purple-900 text-base sm:text-lg">
                        ₹{seg.interest.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {seg.event && seg.event.type === 'TOPUP' && (
                      <div>
                        <span className="text-xs text-purple-700 font-extrabold uppercase flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-purple-700 stroke-[2.5]" />
                          <span>Top-Up Added</span>
                        </span>
                        <span className="font-black text-purple-900 text-base sm:text-lg">
                          + ₹{seg.event.amount.toLocaleString('en-IN')}
                        </span>
                        {seg.event.notes && (
                          <span className="text-xs text-zinc-500 block truncate">
                            ({seg.event.notes})
                          </span>
                        )}
                      </div>
                    )}

                    {seg.event && seg.event.type === 'REPAYMENT' && (
                      <div>
                        <span className="text-xs text-emerald-700 font-extrabold uppercase flex items-center gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                          <span>Repayment Paid</span>
                        </span>
                        <span className="font-black text-emerald-900 text-base sm:text-lg">
                          ₹{seg.event.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-zinc-600 block">
                          (Int: ₹{(seg.event.interestAmount || 0).toLocaleString('en-IN')}, Princ: -₹{(seg.event.principalAmount || 0).toLocaleString('en-IN')})
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-xs text-zinc-600 font-extrabold uppercase block">
                        Resulting Principal
                      </span>
                      <span className="font-black text-zinc-950 text-base sm:text-lg">
                        ₹{seg.resultingPrincipal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Grand Settlement Box: Huge Senior-Citizen Output */}
          <div className="bg-gradient-to-br from-purple-700 to-purple-900 p-6 sm:p-7 rounded-3xl text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-purple-400/50 pb-3">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider text-purple-100">
                Final Settlement Calculation (ખાતું પૂરું કરવા માટે)
              </span>
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-bold transition-colors shadow-2xs"
                title="Copy breakdown to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300 stroke-[2.5]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="bg-white/10 p-4 sm:p-5 rounded-2xl border border-white/15 backdrop-blur-2xs">
                <span className="text-xs sm:text-sm text-purple-200 font-bold block">
                  Remaining Principal
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-1.5 block">
                  ₹{calculation.remainingPrincipal.toLocaleString('en-IN')}
                </span>
                {calculation.totalTopUps > 0 && (
                  <span className="text-xs text-purple-200/90 font-medium block mt-1">
                    (Total Borrowed: ₹{calculation.totalBorrowed.toLocaleString('en-IN')})
                  </span>
                )}
              </div>

              <div className="bg-white/10 p-4 sm:p-5 rounded-2xl border border-white/15 backdrop-blur-2xs">
                <span className="text-xs sm:text-sm text-purple-200 font-bold block">
                  Net Accrued Interest
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-300 mt-1.5 block">
                  ₹{calculation.netRemainingInterest.toLocaleString('en-IN')}
                </span>
                {calculation.totalInterestPaidInRepayments > 0 && (
                  <span className="text-xs text-purple-200/90 font-medium block mt-1">
                    (₹{calculation.totalInterestPaidInRepayments.toLocaleString('en-IN')} paid in repayments)
                  </span>
                )}
              </div>

              <div className="bg-white/20 p-4 sm:p-5 rounded-2xl border border-white/25 backdrop-blur-2xs">
                <span className="text-xs sm:text-sm text-purple-100 font-black uppercase tracking-wider block">
                  Net Settlement Payable
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white mt-1.5 block">
                  ₹{calculation.finalSettlementAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-purple-200/90 italic pt-1 text-center sm:text-left">
              * Annually compounding rate of {rate}% p.a. calculated with intermediate top-ups and repayments up to {asOfDate}.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-zinc-100 bg-zinc-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl bg-zinc-900 hover:bg-black text-white font-extrabold text-sm sm:text-base transition-colors shadow-2xs"
          >
            Close (બંધ કરો)
          </button>
        </div>
      </div>
    </div>
  );
};
