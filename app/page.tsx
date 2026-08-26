'use client';

import React, { useState, useEffect } from 'react';
import { AppData, Customer, Loan, Ornament } from '@/lib/types';
import {
  getStoredData,
  saveStoredData,
  addCustomer,
  addBatchCustomers,
  updateCustomer,
  addLoan,
  closeLoan,
} from '@/lib/storage';
import { Navbar } from '@/components/Navbar';
import { CustomerList } from '@/components/CustomerList';
import { CustomerDetailView } from '@/components/CustomerDetailView';
import { CompoundInterestCalculator } from '@/components/CompoundInterestCalculator';
import { NewCustomerModal } from '@/components/NewCustomerModal';
import { NewLoanModal } from '@/components/NewLoanModal';
import { EditDiaryPageModal } from '@/components/EditDiaryPageModal';
import { ActivityHistoryModal } from '@/components/ActivityHistoryModal';
import { ExportModal } from '@/components/ExportModal';
import {
  Calculator,
  Users,
  Gem,
  Coins,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<AppData>(getStoredData());
  const [isLoaded, setIsLoaded] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState<'HOME' | 'CUSTOMERS' | 'CALCULATOR'>('HOME');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal States
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isEditDiaryPageOpen, setIsEditDiaryPageOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    setData(getStoredData());
    setIsLoaded(true);
  }, []);

  const refreshData = () => {
    setData(getStoredData());
  };

  // Customer Actions
  const handleSaveCustomer = (newCust: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = addCustomer(data, newCust);
    setData(res.data);
    setSelectedCustomer(res.newCustomer);
    setCurrentView('CUSTOMERS');
  };

  const handleSaveBatchCustomers = (custList: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const updated = addBatchCustomers(data, custList);
    setData(updated);
    setCurrentView('CUSTOMERS');
  };

  const handleSaveDiaryPage = (customerId: string, newDiary: string, newPageNumber: string) => {
    const updated = updateCustomer(data, customerId, {
      diary: newDiary,
      pageNumber: newPageNumber,
    });
    setData(updated);
    if (selectedCustomer && selectedCustomer.id === customerId) {
      setSelectedCustomer({
        ...selectedCustomer,
        diary: newDiary,
        pageNumber: newPageNumber,
      });
    }
  };

  // Loan Actions
  const handleSaveLoan = (
    customerId: string,
    loanData: { loanDate: string; loanAmount: number; ornaments: Ornament[]; notes?: string }
  ) => {
    const updated = addLoan(data, customerId, loanData);
    setData(updated);
  };

  const handleCloseLoan = (loanId: string) => {
    const updated = closeLoan(data, loanId);
    setData(updated);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-950 text-gold-400">
        <div className="flex flex-col items-center gap-3">
          <Gem className="w-10 h-10 animate-bounce text-gold-400" />
          <span className="text-xl font-bold font-serif">Loading Dahod Jewellery Lending...</span>
        </div>
      </div>
    );
  }

  // Active Loan & Vault Calculations
  const activeLoans = data.loans.filter((l) => l.status === 'ACTIVE');
  let totalActivePrincipal = 0;
  let totalActiveGoldGrams = 0;
  let totalActiveSilverGrams = 0;

  activeLoans.forEach((l) => {
    totalActivePrincipal += l.loanAmount;
    l.ornaments.forEach((o) => {
      if (o.metal === 'Gold') totalActiveGoldGrams += o.weight;
      else totalActiveSilverGrams += o.weight;
    });
  });

  return (
    <div className="min-h-screen flex flex-col bg-purple-950 text-white">
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'CUSTOMERS') setSelectedCustomer(null);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: HOME STARTING SCREEN (Section 15: Two Large Options) */}
        {currentView === 'HOME' && (
          <div className="space-y-8">
            {/* Hero Welcome Banner */}
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-black uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4" />
                <span>Digital Diary & Voice Lending System</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-serif uppercase">
                Dahod Jewellery & Gold/Silver Lending
              </h1>
              <p className="text-sm sm:text-base text-purple-200 font-medium max-w-2xl mx-auto mt-2">
                Digitized customer physical diary lookup, active gold/silver held ornament records, and jewellery compound interest calculations.
              </p>
            </div>

            {/* TWO LARGE OPTIONS (Section 15 of Requirements) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Option 1: Compound Interest Calculator */}
              <div
                onClick={() => setCurrentView('CALCULATOR')}
                className="cursor-pointer group bg-gradient-to-br from-purple-900 via-purple-850 to-purple-950 p-8 sm:p-10 rounded-3xl border-2 border-gold-500/40 hover:border-gold-400 shadow-royal hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-gold-500/20 border-2 border-gold-400/60 flex items-center justify-center text-gold-300 mb-6 group-hover:rotate-6 transition-transform shadow-gold-glow">
                    <Calculator className="w-9 h-9" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-gold-300 transition-colors">
                    Compound Interest Calculator
                  </h2>
                  <p className="text-sm sm:text-base text-purple-200 mt-2 font-medium">
                    Independent tool for jewellery loan calculations with annual compounding. Calculate 1 to 20 items with custom rates and start/end dates.
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-2 text-gold-400 font-extrabold text-sm sm:text-base">
                  <span>Open Calculator (વ્યાજ ગણતરી)</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>

              {/* Option 2: Customer Details */}
              <div
                onClick={() => {
                  setSelectedCustomer(null);
                  setCurrentView('CUSTOMERS');
                }}
                className="cursor-pointer group bg-gradient-to-br from-purple-900 via-purple-850 to-purple-950 p-8 sm:p-10 rounded-3xl border-2 border-gold-500/40 hover:border-gold-400 shadow-royal hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-gold-500/20 border-2 border-gold-400/60 flex items-center justify-center text-gold-300 mb-6 group-hover:rotate-6 transition-transform shadow-gold-glow">
                    <Users className="w-9 h-9" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-gold-300 transition-colors">
                    Customer Details (ગ્રાહક ખાતાવહી)
                  </h2>
                  <p className="text-sm sm:text-base text-purple-200 mt-2 font-medium">
                    Search customer names and villages, view physical diary & page numbers, active held ornaments, loan history, and speak new loans.
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-2 text-gold-400 font-extrabold text-sm sm:text-base">
                  <span>Open Customer Records ({data.customers.length} Accounts)</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Quick Vault & Operational Summary */}
            <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="bg-purple-900/60 p-4 rounded-2xl border border-purple-800">
                <span className="text-xs text-purple-300 font-bold block">Total Customers</span>
                <span className="text-2xl font-black text-white">{data.customers.length}</span>
              </div>
              <div className="bg-purple-900/60 p-4 rounded-2xl border border-purple-800">
                <span className="text-xs text-purple-300 font-bold block">Active Loans Total</span>
                <span className="text-2xl font-black text-emerald-300">
                  ₹{totalActivePrincipal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-purple-900/60 p-4 rounded-2xl border border-purple-800">
                <span className="text-xs text-gold-300 font-bold block">Gold in Vault</span>
                <span className="text-2xl font-black text-gold-300">
                  {totalActiveGoldGrams.toFixed(1)}g
                </span>
              </div>
              <div className="bg-purple-900/60 p-4 rounded-2xl border border-purple-800">
                <span className="text-xs text-slate-300 font-bold block">Silver in Vault</span>
                <span className="text-2xl font-black text-slate-200">
                  {totalActiveSilverGrams >= 1000
                    ? `${(totalActiveSilverGrams / 1000).toFixed(2)} kg`
                    : `${totalActiveSilverGrams.toFixed(0)}g`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CUSTOMER MANAGEMENT FLOW */}
        {currentView === 'CUSTOMERS' && (
          <div>
            {selectedCustomer ? (
              <CustomerDetailView
                customer={selectedCustomer}
                loans={data.loans}
                onBack={() => setSelectedCustomer(null)}
                onOpenNewLoanModal={() => setIsNewLoanOpen(true)}
                onCloseLoan={handleCloseLoan}
                onEditDiaryPage={() => setIsEditDiaryPageOpen(true)}
              />
            ) : (
              <CustomerList
                customers={data.customers}
                loans={data.loans}
                onSelectCustomer={(cust) => setSelectedCustomer(cust)}
                onOpenNewCustomerModal={() => setIsNewCustomerOpen(true)}
              />
            )}
          </div>
        )}

        {/* VIEW 3: COMPOUND INTEREST CALCULATOR FLOW */}
        {currentView === 'CALCULATOR' && (
          <CompoundInterestCalculator
            defaultRate={data.defaultAnnualInterestRate || 18.0}
            onBackToHome={() => setCurrentView('HOME')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-purple-900/60 bg-purple-950/80 text-center text-xs text-purple-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gold-400 font-bold">
            <Gem className="w-4 h-4" />
            <span>Dahod Jewellery & Gold/Silver Lending</span>
          </div>
          <p className="text-purple-400">
            Internal Family Lending Record • Physical Diary Remains Legal Source of Truth
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="text-gold-400 hover:underline font-bold"
            >
              Export Excel & Backup
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        villages={data.villages}
        diaries={data.diaries}
        onSaveCustomer={handleSaveCustomer}
        onSaveBatchCustomers={handleSaveBatchCustomers}
      />

      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => setIsNewLoanOpen(false)}
        customer={selectedCustomer}
        categories={data.ornamentCategories}
        onSaveLoan={handleSaveLoan}
      />

      <EditDiaryPageModal
        isOpen={isEditDiaryPageOpen}
        onClose={() => setIsEditDiaryPageOpen(false)}
        customer={selectedCustomer}
        diaries={data.diaries}
        onSaveDiaryPage={handleSaveDiaryPage}
      />

      <ActivityHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        logs={data.activityLogs}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={data}
        onDataRestored={refreshData}
      />
    </div>
  );
}
