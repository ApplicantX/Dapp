'use client';

import React, { useState, useEffect } from 'react';
import { AppData, Customer, Loan, Ornament } from '@/lib/types';
import {
  getStoredData,
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
import { BulkDataInputTab } from '@/components/BulkDataInputTab';
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
  ArrowRight,
  Sparkles,
  Mic,
  FileSpreadsheet,
} from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<AppData>(getStoredData());
  const [isLoaded, setIsLoaded] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState<'HOME' | 'CUSTOMERS' | 'CALCULATOR' | 'BULK_INPUT'>('HOME');
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0114] text-gold-400">
        <div className="flex flex-col items-center gap-3">
          <Gem className="w-10 h-10 animate-pulse text-gold-400" />
          <span className="text-sm font-semibold tracking-wider text-purple-200/80">
            Dahod Jewellery Lending
          </span>
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
    <div className="min-h-screen flex flex-col bg-transparent text-slate-100">
      {/* Minimal Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'CUSTOMERS') setSelectedCustomer(null);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* VIEW 1: HOME STARTING SCREEN */}
        {currentView === 'HOME' && (
          <div className="space-y-10 sm:space-y-12">
            {/* Minimalist Luxury Hero */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gold-500/10 border border-gold-500/25 text-gold-300 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Continuous Voice to Excel & Diary Ledger</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-serif">
                Dahod Jewellery & Lending
              </h1>
              <p className="text-sm sm:text-base text-purple-200/70 leading-relaxed">
                Speak details for 500+ customer loans at once with auto-capture to Excel, or lookup physical diary pages and calculate compound interest.
              </p>
            </div>

            {/* PRIMARY OPTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Card 1: Data Input (500+ Continuous Voice to Excel) */}
              <div
                onClick={() => setCurrentView('BULK_INPUT')}
                className="cursor-pointer group relative bg-gradient-to-br from-gold-500/15 via-[#1c0733] to-[#130324] p-8 rounded-3xl border-2 border-gold-400/50 hover:border-gold-300 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gold-500/20 border border-gold-300/60 flex items-center justify-center text-gold-300 mb-6 group-hover:scale-110 group-hover:bg-gold-500/30 transition-all duration-300 shadow-gold-glow">
                    <Mic className="w-7 h-7 animate-pulse" />
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-gold-500 text-purple-950 text-[10px] font-black uppercase tracking-wider mb-2">
                    Continuous Speech
                  </div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-gold-300 transition-colors">
                    Data Input (500+)
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-200/70 mt-2 font-normal leading-relaxed">
                    Speak 500+ customers at once. Automatically streams into an Excel spreadsheet with zero repeated confirmation prompts.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-purple-500/20 flex items-center justify-between text-gold-300 font-bold text-xs sm:text-sm">
                  <span>Start Voice Entry</span>
                  <div className="w-7 h-7 rounded-full bg-gold-500/20 flex items-center justify-center group-hover:bg-gold-500 group-hover:text-purple-950 transition-all">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Card 2: Customer Details */}
              <div
                onClick={() => {
                  setSelectedCustomer(null);
                  setCurrentView('CUSTOMERS');
                }}
                className="cursor-pointer group relative bg-[#130324]/80 hover:bg-[#1c0733] p-8 rounded-3xl border border-purple-500/20 hover:border-gold-400/50 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-gold-400 mb-6 group-hover:scale-110 transition-all duration-300 shadow-sm">
                    <Users className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-gold-300 transition-colors">
                    Customer Details
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-200/70 mt-2 font-normal leading-relaxed">
                    Search customer names and villages, view physical diary & page references, active vault ornaments, and single loan entry.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-purple-500/10 flex items-center justify-between text-gold-400 font-semibold text-xs sm:text-sm">
                  <span>View Accounts ({data.customers.length})</span>
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 flex items-center justify-center group-hover:bg-gold-500 group-hover:text-purple-950 transition-all">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Card 3: Compound Interest Calculator */}
              <div
                onClick={() => setCurrentView('CALCULATOR')}
                className="cursor-pointer group relative bg-[#130324]/80 hover:bg-[#1c0733] p-8 rounded-3xl border border-purple-500/20 hover:border-gold-400/50 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-gold-400 mb-6 group-hover:scale-110 transition-all duration-300 shadow-sm">
                    <Calculator className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-gold-300 transition-colors">
                    Interest Calculator
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-200/70 mt-2 font-normal leading-relaxed">
                    Independent jewellery loan utility with annual compounding. Calculate 1 to 20 items with custom rates and dates.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-purple-500/10 flex items-center justify-between text-gold-400 font-semibold text-xs sm:text-sm">
                  <span>Open Calculator</span>
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 flex items-center justify-center group-hover:bg-gold-500 group-hover:text-purple-950 transition-all">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Clutter-Free Stats Bar */}
            <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4">
              <div className="bg-[#130324]/60 p-4 rounded-2xl border border-purple-500/15 text-center">
                <span className="text-[11px] text-purple-200/60 font-semibold uppercase tracking-wider block">
                  Customers
                </span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {data.customers.length}
                </span>
              </div>

              <div className="bg-[#130324]/60 p-4 rounded-2xl border border-purple-500/15 text-center">
                <span className="text-[11px] text-purple-200/60 font-semibold uppercase tracking-wider block">
                  Active Loans
                </span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  ₹{totalActivePrincipal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-[#130324]/60 p-4 rounded-2xl border border-purple-500/15 text-center">
                <span className="text-[11px] text-gold-300/80 font-semibold uppercase tracking-wider block">
                  Vault Gold
                </span>
                <span className="text-2xl font-bold text-gold-300 mt-1 block">
                  {totalActiveGoldGrams.toFixed(1)}g
                </span>
              </div>

              <div className="bg-[#130324]/60 p-4 rounded-2xl border border-purple-500/15 text-center">
                <span className="text-[11px] text-slate-300/80 font-semibold uppercase tracking-wider block">
                  Vault Silver
                </span>
                <span className="text-2xl font-bold text-slate-200 mt-1 block">
                  {totalActiveSilverGrams >= 1000
                    ? `${(totalActiveSilverGrams / 1000).toFixed(2)} kg`
                    : `${totalActiveSilverGrams.toFixed(0)}g`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DATA INPUT TAB (500+ CONTINUOUS VOICE TO EXCEL STREAM) */}
        {currentView === 'BULK_INPUT' && (
          <BulkDataInputTab
            appData={data}
            onCommitSuccess={(updated) => setData(updated)}
          />
        )}

        {/* VIEW 3: CUSTOMER MANAGEMENT FLOW */}
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

        {/* VIEW 4: COMPOUND INTEREST CALCULATOR FLOW */}
        {currentView === 'CALCULATOR' && (
          <CompoundInterestCalculator
            defaultRate={data.defaultAnnualInterestRate || 18.0}
            onBackToHome={() => setCurrentView('HOME')}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="mt-auto py-6 border-t border-purple-500/10 bg-[#0a0114]/80 text-xs text-purple-200/50">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gold-400/80 font-medium">
            <Gem className="w-3.5 h-3.5" />
            <span>Dahod Jewellery & Gold/Silver Lending</span>
          </div>
          <p>
            Internal Family Lending Record • Physical Diary Remains Legal Source of Truth
          </p>
          <div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="text-gold-400 hover:text-gold-300 font-semibold transition-colors"
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
