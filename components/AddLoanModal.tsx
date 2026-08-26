'use client';

import React, { useState, useEffect } from 'react';
import {
  CollateralItem,
  LoanAccount,
  MarketRates,
  MetalType,
  OrnamentType,
  StoreSettings,
  VoiceParseResult,
} from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import {
  calculateEstimatedValue,
  generateNextLoanNumber,
} from '@/lib/storage';
import { playSuccessChime, speakFeedback } from '@/lib/speechEngine';
import confetti from 'canvas-confetti';
import {
  X,
  Plus,
  Trash2,
  Gem,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLoans: LoanAccount[];
  rates: MarketRates;
  settings: StoreSettings;
  language: Language;
  initialVoiceData?: VoiceParseResult | null;
  editingLoan?: LoanAccount | null;
  onSaveLoan: (loan: LoanAccount) => void;
}

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  isOpen,
  onClose,
  existingLoans,
  rates,
  settings,
  language,
  initialVoiceData,
  editingLoan,
  onSaveLoan,
}) => {
  const t = translations[language];

  // Customer Form State
  const [loanNumber, setLoanNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [principalAmount, setPrincipalAmount] = useState<number>(50000);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(settings.defaultInterestRate || 1.5);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Collateral Items State
  const [collateralList, setCollateralList] = useState<CollateralItem[]>([
    {
      id: 'col-init-1',
      metal: 'GOLD',
      itemType: 'CHAIN',
      description: '22K Gold Chain',
      grossWeight: 20,
      netWeight: 20,
      purity: '22K (916)',
      estimatedValue: 0,
    },
  ]);

  // Set 6-month default due date
  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setDueDate(d.toISOString().split('T')[0]);
  }, []);

  // Initialize or populate from Voice Data or Edit Loan
  useEffect(() => {
    if (!isOpen) return;

    if (editingLoan) {
      setLoanNumber(editingLoan.loanNumber);
      setCustomerName(editingLoan.customerName);
      setCustomerPhone(editingLoan.customerPhone);
      setCustomerAddress(editingLoan.customerAddress || '');
      setPrincipalAmount(editingLoan.principalAmount);
      setMonthlyInterestRate(editingLoan.monthlyInterestRate);
      setStartDate(editingLoan.startDate);
      setDueDate(editingLoan.dueDate);
      setNotes(editingLoan.notes || '');
      setCollateralList(editingLoan.collateral);
    } else {
      const nextNum = generateNextLoanNumber(existingLoans);
      setLoanNumber(nextNum);

      if (initialVoiceData) {
        if (initialVoiceData.customerName) setCustomerName(initialVoiceData.customerName);
        if (initialVoiceData.customerPhone) setCustomerPhone(initialVoiceData.customerPhone);
        if (initialVoiceData.amount) setPrincipalAmount(initialVoiceData.amount);
        if (initialVoiceData.interestRate) setMonthlyInterestRate(initialVoiceData.interestRate);

        const metal: MetalType = initialVoiceData.metal || 'GOLD';
        const itemType: OrnamentType = initialVoiceData.itemType || 'CHAIN';
        const gross = initialVoiceData.grossWeight || 20;
        const net = initialVoiceData.netWeight || gross;
        const purity = initialVoiceData.purity || (metal === 'GOLD' ? '22K (916)' : '999 Fine Silver');
        const desc = initialVoiceData.itemDescription || `${purity} ${itemType}`;
        const val = calculateEstimatedValue(metal, net, purity, rates);

        setCollateralList([
          {
            id: 'col-voice-1',
            metal,
            itemType,
            description: desc,
            grossWeight: gross,
            netWeight: net,
            purity,
            estimatedValue: val,
          },
        ]);
      } else {
        // Fresh blank loan
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setPrincipalAmount(50000);
        setMonthlyInterestRate(settings.defaultInterestRate || 1.5);
        setNotes('');
        const val = calculateEstimatedValue('GOLD', 20, '22K (916)', rates);
        setCollateralList([
          {
            id: `col-${Date.now()}`,
            metal: 'GOLD',
            itemType: 'CHAIN',
            description: '22K Gold Chain',
            grossWeight: 20,
            netWeight: 20,
            purity: '22K (916)',
            estimatedValue: val,
          },
        ]);
      }
    }
  }, [isOpen, editingLoan, initialVoiceData, existingLoans, rates, settings]);

  // Recalculate collateral valuation whenever weights/purity change
  const updateCollateralItem = (index: number, updates: Partial<CollateralItem>) => {
    setCollateralList((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], ...updates };
      item.estimatedValue = calculateEstimatedValue(item.metal, item.netWeight, item.purity, rates);
      copy[index] = item;
      return copy;
    });
  };

  const addCollateralItem = () => {
    const newItem: CollateralItem = {
      id: `col-${Date.now()}-${Math.random()}`,
      metal: 'GOLD',
      itemType: 'RING',
      description: '22K Gold Ring',
      grossWeight: 10,
      netWeight: 10,
      purity: '22K (916)',
      estimatedValue: calculateEstimatedValue('GOLD', 10, '22K (916)', rates),
    };
    setCollateralList([...collateralList, newItem]);
  };

  const removeCollateralItem = (index: number) => {
    if (collateralList.length === 1) return;
    setCollateralList(collateralList.filter((_, i) => i !== index));
  };

  // Total Collateral Valuation & Safe 75% LTV
  const totalCollateralValuation = collateralList.reduce((sum, c) => sum + c.estimatedValue, 0);
  const safeLTVAmount = Math.round(totalCollateralValuation * (settings.safeLTVPercentage / 100));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter the customer name');
      return;
    }
    if (!principalAmount || principalAmount <= 0) {
      alert('Please enter a valid principal loan amount');
      return;
    }

    const loanToSave: LoanAccount = {
      id: editingLoan ? editingLoan.id : `loan-${Date.now()}`,
      loanNumber: loanNumber || generateNextLoanNumber(existingLoans),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || 'Not Provided',
      customerAddress: customerAddress.trim(),
      collateral: collateralList,
      principalAmount: Number(principalAmount),
      monthlyInterestRate: Number(monthlyInterestRate),
      startDate,
      dueDate,
      status: editingLoan ? editingLoan.status : 'ACTIVE',
      payments: editingLoan ? editingLoan.payments : [],
      notes: notes.trim(),
      createdAt: editingLoan ? editingLoan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveLoan(loanToSave);
    playSuccessChime();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    if (settings.voiceFeedbackEnabled) {
      speakFeedback(
        `Loan of ${loanToSave.principalAmount} rupees for ${loanToSave.customerName} saved successfully.`,
        language
      );
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full bg-purple-800/80 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-600/40 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <Gem className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {editingLoan ? 'Edit Loan Account' : 'New Girvi Loan Account (નવું ખાતું)'}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 font-medium">
              Token #{loanNumber} • Enter customer details and gold/silver collateral.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Customer Info */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800/80">
            <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>Customer Information (ગ્રાહકની વિગત)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-200">
                  {t.customerName} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-4 py-3 rounded-xl bg-purple-900/80 border-2 border-purple-700/60 focus:border-gold-400 text-white font-bold text-base focus:outline-none"
                />
              </div>

              {/* Customer Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-200">
                  {t.phone}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9825123456"
                  className="w-full px-4 py-3 rounded-xl bg-purple-900/80 border-2 border-purple-700/60 focus:border-gold-400 text-white font-bold text-base focus:outline-none"
                />
              </div>

              {/* Customer Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-200">
                  {t.address}
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Satellite, Ahmedabad"
                  className="w-full px-4 py-3 rounded-xl bg-purple-900/80 border-2 border-purple-700/60 focus:border-gold-400 text-white font-medium text-base focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Collateral Ornaments (Girvi Items) */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gem className="w-4 h-4" />
                <span>Collateral Ornaments (ગિરવે દાગીના)</span>
              </h3>
              <button
                type="button"
                onClick={addCollateralItem}
                className="flex items-center gap-1 text-xs font-extrabold text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/40 px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Item</span>
              </button>
            </div>

            <div className="space-y-4">
              {collateralList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-purple-900/70 p-4 rounded-2xl border border-purple-700/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gold-300 uppercase">
                      Item #{idx + 1}
                    </span>
                    {collateralList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCollateralItem(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    {/* Metal */}
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-xs font-bold text-purple-200">Metal</label>
                      <select
                        value={item.metal}
                        onChange={(e) =>
                          updateCollateralItem(idx, {
                            metal: e.target.value as MetalType,
                            purity: e.target.value === 'GOLD' ? '22K (916)' : '999 Fine Silver',
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-purple-700 text-white font-bold text-sm focus:outline-none"
                      >
                        <option value="GOLD">🪙 Gold</option>
                        <option value="SILVER">🥈 Silver</option>
                      </select>
                    </div>

                    {/* Ornament Description */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-purple-200">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateCollateralItem(idx, { description: e.target.value })}
                        placeholder="e.g. 22K Solid Chain"
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-purple-700 text-white font-medium text-sm focus:outline-none"
                      />
                    </div>

                    {/* Gross Weight */}
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-xs font-bold text-purple-200">Gross Wt (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.grossWeight}
                        onChange={(e) =>
                          updateCollateralItem(idx, {
                            grossWeight: parseFloat(e.target.value) || 0,
                            netWeight: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-purple-700 text-white font-bold text-sm focus:outline-none"
                      />
                    </div>

                    {/* Net Weight */}
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-xs font-bold text-gold-300">Net Wt (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.netWeight}
                        onChange={(e) =>
                          updateCollateralItem(idx, { netWeight: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-purple-950 border-2 border-gold-500/50 text-gold-300 font-extrabold text-sm focus:outline-none"
                      />
                    </div>

                    {/* Purity */}
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-xs font-bold text-purple-200">Purity</label>
                      <select
                        value={item.purity}
                        onChange={(e) => updateCollateralItem(idx, { purity: e.target.value })}
                        className="w-full px-2 py-2 rounded-xl bg-purple-950 border border-purple-700 text-gold-200 font-bold text-xs focus:outline-none"
                      >
                        {item.metal === 'GOLD' ? (
                          <>
                            <option value="24K">24K (99.9%)</option>
                            <option value="22K (916)">22K (916 Hallmark)</option>
                            <option value="18K">18K (75%)</option>
                            <option value="14K">14K (58.5%)</option>
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

                  {/* Market Value Tag */}
                  <div className="text-right text-xs text-purple-300 font-medium">
                    Calculated Market Value:{' '}
                    <strong className="text-gold-300 font-bold">
                      ₹{item.estimatedValue.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Valuation & Safe LTV Guideline */}
            <div className="mt-4 p-3 bg-purple-900/60 rounded-xl border border-gold-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-purple-200">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span>
                  Total Vault Valuation:{' '}
                  <strong className="text-gold-300 font-extrabold text-sm">
                    ₹{totalCollateralValuation.toLocaleString('en-IN')}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  Recommended Safe Lending (75% Limit):{' '}
                  <strong className="text-white text-sm">
                    ₹{safeLTVAmount.toLocaleString('en-IN')}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Loan Terms */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800/80">
            <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              <span>Loan Amount & Interest Terms (લોન અને વ્યાજ)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Principal Loan Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gold-300">
                  {t.loanAmount} (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="500"
                  required
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl bg-purple-900/90 border-2 border-gold-500 text-gold-300 font-black text-xl focus:outline-none"
                />
              </div>

              {/* Monthly Interest Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-200">
                  Interest Rate (% per month)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={monthlyInterestRate}
                  onChange={(e) => setMonthlyInterestRate(parseFloat(e.target.value) || 1.5)}
                  className="w-full px-4 py-3 rounded-xl bg-purple-900/90 border-2 border-purple-700 focus:border-gold-400 text-white font-extrabold text-lg focus:outline-none"
                />
                <span className="text-xs text-purple-300 block">
                  = ₹{Math.round(principalAmount * (monthlyInterestRate / 100)).toLocaleString('en-IN')}/mo
                </span>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-200">
                  {t.startDate}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-purple-900/90 border border-purple-700 text-white font-semibold text-sm focus:outline-none"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-200">
                  {t.dueDate} (6/12 Mo)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-purple-900/90 border border-purple-700 text-white font-semibold text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-sm transition-all"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-base shadow-gold-glow transition-all active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{editingLoan ? 'Update Account' : 'Save Girvi Loan (ખાતું સેવ કરો)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
