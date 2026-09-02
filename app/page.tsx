'use client';

import React, { useState, useEffect } from 'react';
import { AppData, Customer, Loan, Ornament } from '@/lib/types';
import {
  getStoredData,
  resetToSampleData,
  addCustomer,
  addBatchCustomers,
  updateCustomer,
  addLoan,
  closeLoan,
} from '@/lib/storage';
import { initialAppData } from '@/lib/sampleData';
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
  ArrowRight,
  Sparkles,
  Mic,
} from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<AppData>(initialAppData);
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
    try {
      const stored = getStoredData();
      setData(stored);
    } catch (err) {
      console.error('Failed to load stored data:', err);
      setData(initialAppData);
    } finally {
      setIsLoaded(true);
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] text-purple-600 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Gem className="w-10 h-10 animate-pulse text-purple-600" />
          <span className="text-sm font-semibold tracking-wider text-zinc-700">
            Dahod Jewellery Lending
          </span>
          <p className="text-xs text-zinc-400">Loading ledger data...</p>
          <button
            onClick={() => {
              resetToSampleData();
              window.location.reload();
            }}
            className="mt-2 text-[11px] text-purple-600 hover:text-purple-800 underline font-medium"
          >
            Reset data to defaults & reload
          </button>
        </div>
      </div>
    );
  }

  // Active Loan & Vault Calculations
  const activeLoans = (data?.loans || []).filter((l) => l && l.status === 'ACTIVE');
  let totalActivePrincipal = 0;
  let totalActiveGoldGrams = 0;
  let totalActiveSilverGrams = 0;

  activeLoans.forEach((l) => {
    totalActivePrincipal += Number(l.loanAmount) || 0;
    (l.ornaments || []).forEach((o) => {
      if (!o) return;
      if (o.metal === 'Gold') totalActiveGoldGrams += Number(o.weight) || 0;
      else totalActiveSilverGrams += Number(o.weight) || 0;
    });
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-zinc-900">
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
            {/* Minimalist Hero */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Voice-First Lending Ledger & Diary Record</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold text-zinc-900 tracking-tight">
                Dahod Jewellery & Lending
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-2xl mx-auto">
                Speak customer loan details with automated transcription to Excel, lookup physical diary pages, and calculate compound interest cleanly.
              </p>
            </div>

            {/* PRIMARY OPTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Card 1: Data Input (Voice to Excel) */}
              <div
                onClick={() => setCurrentView('BULK_INPUT')}
                className="cursor-pointer group bg-white p-7 rounded-2xl border border-zinc-200 hover:border-purple-400 shadow-sm hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white mb-5 shadow-sm group-hover:scale-105 transition-transform">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider mb-2 border border-purple-100">
                    Continuous Speech
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 group-hover:text-purple-700 transition-colors">
                    Voice Data Input
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-normal leading-relaxed">
                    Speak customer loan records continuously. Stream into an Excel spreadsheet with review cards and one-click database commit.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-purple-700 font-semibold text-xs sm:text-sm">
                  <span>Start Voice Entry</span>
                  <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Card 2: Customer Details */}
              <div
                onClick={() => {
                  setSelectedCustomer(null);
                  setCurrentView('CUSTOMERS');
                }}
                className="cursor-pointer group bg-white p-7 rounded-2xl border border-zinc-200 hover:border-purple-400 shadow-sm hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 group-hover:bg-purple-50 flex items-center justify-center text-zinc-700 group-hover:text-purple-700 mb-5 transition-all">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 group-hover:text-purple-700 transition-colors">
                    Customer Accounts
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-normal leading-relaxed">
                    Search customer names and villages, lookup physical diary and page numbers, inspect vault ornaments, and add individual loans.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-zinc-700 group-hover:text-purple-700 font-semibold text-xs sm:text-sm">
                  <span>View Accounts ({data.customers.length})</span>
                  <div className="w-7 h-7 rounded-full bg-zinc-100 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Card 3: Compound Interest Calculator */}
              <div
                onClick={() => setCurrentView('CALCULATOR')}
                className="cursor-pointer group bg-white p-7 rounded-2xl border border-zinc-200 hover:border-purple-400 shadow-sm hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 group-hover:bg-purple-50 flex items-center justify-center text-zinc-700 group-hover:text-purple-700 mb-5 transition-all">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 group-hover:text-purple-700 transition-colors">
                    Interest Calculator
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-normal leading-relaxed">
                    Clean annual compounding utility. Defaults to a single item with flexible multi-item support and customizable interest rates.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-zinc-700 group-hover:text-purple-700 font-semibold text-xs sm:text-sm">
                  <span>Open Calculator</span>
                  <div className="w-7 h-7 rounded-full bg-zinc-100 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Scandinavian Stats Bar */}
            <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 text-center shadow-sm">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Customers
                </span>
                <span className="text-2xl font-bold text-zinc-900 mt-1 block">
                  {data.customers.length}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 text-center shadow-sm">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Active Principal
                </span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                  ₹{totalActivePrincipal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 text-center shadow-sm">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Vault Gold
                </span>
                <span className="text-2xl font-bold text-purple-700 mt-1 block">
                  {totalActiveGoldGrams.toFixed(1)}g
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 text-center shadow-sm">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Vault Silver
                </span>
                <span className="text-2xl font-bold text-zinc-800 mt-1 block">
                  {totalActiveSilverGrams >= 1000
                    ? `${(totalActiveSilverGrams / 1000).toFixed(2)} kg`
                    : `${totalActiveSilverGrams.toFixed(0)}g`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DATA INPUT TAB */}
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

      {/* Minimal Clean Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-200 bg-white text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-700 font-medium">
            <Gem className="w-3.5 h-3.5 text-purple-600" />
            <span>Dahod Jewellery & Lending Ledger</span>
          </div>
          <p className="text-zinc-400">
            Internal Record • Physical Diary Remains Legal Source of Truth
          </p>
          <div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="text-purple-700 hover:text-purple-900 font-semibold transition-colors"
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
