'use client';

import React, { useState, useEffect } from 'react';
import {
  LoanAccount,
  MarketRates,
  MetalType,
  PaymentRecord,
  StoreSettings,
  VoiceParseResult,
} from '@/lib/types';
import {
  getStoredLoans,
  getStoredRates,
  getStoredSettings,
  saveLoans,
  saveRates,
  saveSettings,
} from '@/lib/storage';
import { Language, translations } from '@/lib/translations';
import { Navbar } from '@/components/Navbar';
import { LiveRateBar } from '@/components/LiveRateBar';
import { DashboardStats } from '@/components/DashboardStats';
import { LoanList } from '@/components/LoanList';
import { VoiceAssistantModal } from '@/components/VoiceAssistantModal';
import { AddLoanModal } from '@/components/AddLoanModal';
import { PaymentModal } from '@/components/PaymentModal';
import { GirviReceiptModal } from '@/components/GirviReceiptModal';
import { CalculatorModal } from '@/components/CalculatorModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Mic, PlusCircle, Sparkles, Gem } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccessChime, speakFeedback } from '@/lib/speechEngine';

export default function HomePage() {
  // Global Data State
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [rates, setRates] = useState<MarketRates>(getStoredRates());
  const [settings, setSettings] = useState<StoreSettings>(getStoredSettings());
  const [language, setLanguage] = useState<Language>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  // Filters & Search
  const [currentFilter, setCurrentFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active item references for modals
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanAccount | null>(null);
  const [selectedLoanForReceipt, setSelectedLoanForReceipt] = useState<LoanAccount | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanAccount | null>(null);
  const [voiceParsedData, setVoiceParsedData] = useState<VoiceParseResult | null>(null);

  // Load Initial Data from Storage
  useEffect(() => {
    const loadedLoans = getStoredLoans();
    const loadedRates = getStoredRates();
    const loadedSettings = getStoredSettings();
    setLoans(loadedLoans);
    setRates(loadedRates);
    setSettings(loadedSettings);
    setLanguage(loadedSettings.language || 'en');
    setIsLoaded(true);
  }, []);

  const refreshData = () => {
    setLoans(getStoredLoans());
    setRates(getStoredRates());
    setSettings(getStoredSettings());
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    const updated = { ...settings, language: newLang };
    setSettings(updated);
    saveSettings(updated);
  };

  // Save or Update Loan
  const handleSaveLoan = (savedLoan: LoanAccount) => {
    setLoans((prev) => {
      const existingIdx = prev.findIndex((l) => l.id === savedLoan.id);
      let updated: LoanAccount[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = savedLoan;
      } else {
        updated = [savedLoan, ...prev];
      }
      saveLoans(updated);
      return updated;
    });
    setEditingLoan(null);
    setVoiceParsedData(null);
  };

  // Delete Loan
  const handleDeleteLoan = (loanId: string) => {
    if (window.confirm('Are you sure you want to delete this loan record?')) {
      setLoans((prev) => {
        const updated = prev.filter((l) => l.id !== loanId);
        saveLoans(updated);
        return updated;
      });
    }
  };

  // Record Payment or Settlement
  const handleSavePayment = (loanId: string, payment: PaymentRecord, settleNow: boolean = false) => {
    setLoans((prev) => {
      const updated = prev.map((loan) => {
        if (loan.id === loanId) {
          const updatedPayments = [...loan.payments, payment];
          const newStatus = settleNow ? 'SETTLED' : loan.status;
          return {
            ...loan,
            payments: updatedPayments,
            status: newStatus,
            settledDate: settleNow ? new Date().toISOString().split('T')[0] : loan.settledDate,
            settledAmount: settleNow ? payment.amount : loan.settledAmount,
            updatedAt: new Date().toISOString(),
          };
        }
        return loan;
      });
      saveLoans(updated);
      return updated;
    });
  };

  // Settle Loan directly
  const handleSettleLoan = (loan: LoanAccount) => {
    setSelectedLoanForPayment(loan);
    setIsPaymentOpen(true);
  };

  // Handle Voice Assistant Parsed Result
  const handleActionParsed = (result: VoiceParseResult) => {
    if (result.action === 'ADD_LOAN') {
      setVoiceParsedData(result);
      setEditingLoan(null);
      setIsAddLoanOpen(true);
    } else if (result.action === 'RECORD_PAYMENT') {
      if (result.customerName) {
        const match = loans.find((l) =>
          l.customerName.toLowerCase().includes(result.customerName!.toLowerCase())
        );
        if (match) {
          setSelectedLoanForPayment(match);
          setIsPaymentOpen(true);
          return;
        }
      }
      // If customer not matched directly, search for the customer
      if (result.customerName) {
        setSearchQuery(result.customerName);
      }
    } else if (result.action === 'SEARCH') {
      if (result.searchQuery) {
        setSearchQuery(result.searchQuery);
      }
    } else if (result.action === 'SHOW_OVERDUE') {
      setCurrentFilter('OVERDUE');
    } else if (result.action === 'SHOW_ACTIVE') {
      setCurrentFilter('ACTIVE');
    } else if (result.action === 'UPDATE_RATES') {
      setIsSettingsOpen(true);
    } else if (result.action === 'CALCULATE') {
      setIsCalculatorOpen(true);
    }
  };

  // Calculator Modal Hand-off to Add Loan
  const handleApplyCalculationToNewLoan = (
    metal: MetalType,
    weight: number,
    purity: string,
    safeAmount: number
  ) => {
    setVoiceParsedData({
      action: 'ADD_LOAN',
      metal,
      grossWeight: weight,
      netWeight: weight,
      purity,
      amount: safeAmount,
      confidence: 1,
      rawTranscript: 'Calculator Quote',
      interpretedText: `Creating loan for ${weight}g ${purity} ${metal}`,
    });
    setEditingLoan(null);
    setIsAddLoanOpen(true);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-950 text-gold-400">
        <div className="flex flex-col items-center gap-3">
          <Gem className="w-10 h-10 animate-bounce text-gold-400" />
          <span className="text-xl font-bold font-serif">Loading DAPP...</span>
        </div>
      </div>
    );
  }

  const t = translations[language];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Live Rates Ticker */}
      <LiveRateBar
        rates={rates}
        language={language}
        onEditRates={() => setIsSettingsOpen(true)}
      />

      {/* Main Navbar */}
      <Navbar
        settings={settings}
        language={language}
        onLanguageChange={handleLanguageChange}
        onOpenVoiceAssistant={() => setIsVoiceOpen(true)}
        onOpenAddLoan={() => {
          setEditingLoan(null);
          setVoiceParsedData(null);
          setIsAddLoanOpen(true);
        }}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Luxury Hero Voice Banner for Mom */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-purple-850 to-purple-950 rounded-3xl p-6 sm:p-8 border-2 border-gold-500/40 shadow-royal mb-6">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Voice-First Jewelry Khata (બોલીને હિસાબ રાખો)</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Welcome, {settings.ownerName || "Mom"}
              </h1>
              <p className="text-sm sm:text-base text-purple-200 font-medium max-w-xl">
                Just tap the big microphone button to record new gold/silver loans, record interest payments, or search any customer in your voice.
              </p>
            </div>

            {/* Giant Action Button in Hero */}
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="flex-shrink-0 flex items-center gap-3 px-8 py-5 rounded-3xl bg-gradient-to-r from-gold-500 via-gold-400 to-amber-500 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-lg shadow-gold-glow border-2 border-gold-300 transition-all transform hover:scale-105 active:scale-95 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-950 flex items-center justify-center text-gold-400 shadow-md group-hover:rotate-12 transition-transform">
                <Mic className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="text-xs uppercase tracking-widest text-purple-900 font-extrabold block">
                  One-Tap Voice
                </span>
                <span className="text-xl font-black">{t.tapToSpeak}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Dashboard Financial & Vault Stats */}
        <DashboardStats
          loans={loans}
          rates={rates}
          language={language}
          onFilterChange={(flt) => setCurrentFilter(flt)}
        />

        {/* Girvi Loan Book / Customer Ledger */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Gem className="w-6 h-6 text-gold-400" />
                <span>{t.girviKhata} (ગિરવે ખાતાવહી)</span>
              </h2>
              <p className="text-xs text-purple-300 font-medium mt-0.5">
                Complete records of all gold & silver customer loan accounts and accrued interest.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingLoan(null);
                setVoiceParsedData(null);
                setIsAddLoanOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-black text-sm shadow-gold-glow transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.addLoan}</span>
            </button>
          </div>

          <LoanList
            loans={loans}
            rates={rates}
            language={language}
            currentFilter={currentFilter}
            onFilterChange={setCurrentFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenAddLoan={() => {
              setEditingLoan(null);
              setVoiceParsedData(null);
              setIsAddLoanOpen(true);
            }}
            onRecordPayment={(loan) => {
              setSelectedLoanForPayment(loan);
              setIsPaymentOpen(true);
            }}
            onViewReceipt={(loan) => {
              setSelectedLoanForReceipt(loan);
              setIsReceiptOpen(true);
            }}
            onSettleLoan={handleSettleLoan}
            onEditLoan={(loan) => {
              setEditingLoan(loan);
              setVoiceParsedData(null);
              setIsAddLoanOpen(true);
            }}
            onDeleteLoan={handleDeleteLoan}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-purple-900/60 bg-purple-950/80 text-center text-xs text-purple-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gold-400 font-bold">
            <Gem className="w-4 h-4" />
            <span>{settings.storeName}</span>
          </div>
          <p className="text-purple-400">
            DAPP • Luxury Voice-First Gold & Silver Loan Management • Built with ❤️ for Mom
          </p>
          <div className="flex items-center gap-3 text-purple-300">
            <span>GST: {settings.gstNumber || '24AAAAA0000A1Z5'}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        settings={settings}
        language={language}
        onActionParsed={handleActionParsed}
      />

      <AddLoanModal
        isOpen={isAddLoanOpen}
        onClose={() => {
          setIsAddLoanOpen(false);
          setEditingLoan(null);
          setVoiceParsedData(null);
        }}
        existingLoans={loans}
        rates={rates}
        settings={settings}
        language={language}
        initialVoiceData={voiceParsedData}
        editingLoan={editingLoan}
        onSaveLoan={handleSaveLoan}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedLoanForPayment(null);
        }}
        loan={selectedLoanForPayment}
        settings={settings}
        language={language}
        onSavePayment={handleSavePayment}
      />

      <GirviReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedLoanForReceipt(null);
        }}
        loan={selectedLoanForReceipt}
        settings={settings}
        language={language}
      />

      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        rates={rates}
        settings={settings}
        language={language}
        onApplyToNewLoan={handleApplyCalculationToNewLoan}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        rates={rates}
        language={language}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
        onSaveRates={(newRates) => {
          setRates(newRates);
          saveRates(newRates);
        }}
        onRefreshData={refreshData}
      />
    </div>
  );
}
