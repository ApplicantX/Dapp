'use client';

import React from 'react';
import { Gem, Calculator, Users, FileSpreadsheet, History, Home, Mic } from 'lucide-react';

interface NavbarProps {
  currentView: 'HOME' | 'CUSTOMERS' | 'CALCULATOR' | 'BULK_INPUT';
  onNavigate: (view: 'HOME' | 'CUSTOMERS' | 'CALCULATOR' | 'BULK_INPUT') => void;
  onOpenExportModal: () => void;
  onOpenHistoryModal: () => void;
  isCloudConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenExportModal,
  onOpenHistoryModal,
  isCloudConnected = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-sm w-full">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-2 sm:py-0 sm:h-20 gap-2 sm:gap-4">
          {/* Top Row on Mobile: Logo & Utility Buttons */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            {/* Logo */}
            <div
              onClick={() => onNavigate('HOME')}
              className="cursor-pointer flex items-center gap-2.5 group select-none flex-shrink-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm group-hover:bg-purple-700 transition-colors">
                <Gem className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-xl font-extrabold tracking-tight text-zinc-900 truncate">
                    Dahod Jewellery
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 flex-shrink-0">
                    Lending
                  </span>
                  {isCloudConnected && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 font-medium hidden sm:block">
                  Gold & Silver Diary Ledger
                </p>
              </div>
            </div>

            {/* Mobile Utility Actions (Visible on small screens beside logo) */}
            <div className="flex items-center gap-1 sm:hidden">
              <button
                onClick={onOpenExportModal}
                className="p-1.5 rounded-xl text-zinc-600 hover:text-purple-700 hover:bg-purple-50 border border-zinc-200 transition-colors"
                title="Export Excel & Backup"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenHistoryModal}
                className="p-1.5 rounded-xl text-zinc-600 hover:text-purple-700 hover:bg-purple-50 border border-zinc-200 transition-colors"
                title="Activity History"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Pills: Reordered (Calculator FIRST after Home) and Mobile-Responsive */}
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            <nav className="flex items-center bg-zinc-100 p-1 rounded-2xl sm:rounded-full border border-zinc-200/80 w-full sm:w-auto justify-between sm:justify-start gap-0.5 sm:gap-1">
              {/* 1. Home */}
              <button
                onClick={() => onNavigate('HOME')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all flex-1 sm:flex-initial justify-center ${
                  currentView === 'HOME'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Home</span>
              </button>

              {/* 2. Calculator (FIRST Option as requested!) */}
              <button
                onClick={() => onNavigate('CALCULATOR')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all flex-1 sm:flex-initial justify-center ${
                  currentView === 'CALCULATOR'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-purple-600" />
                <span>Calculator</span>
              </button>

              {/* 3. Customers */}
              <button
                onClick={() => onNavigate('CUSTOMERS')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all flex-1 sm:flex-initial justify-center ${
                  currentView === 'CUSTOMERS'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Accounts</span>
              </button>

              {/* 4. Voice Input */}
              <button
                onClick={() => onNavigate('BULK_INPUT')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all flex-1 sm:flex-initial justify-center ${
                  currentView === 'BULK_INPUT'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-purple-600" />
                <span>Voice</span>
              </button>
            </nav>

            <div className="h-5 w-px bg-zinc-200 mx-1 hidden sm:block" />

            {/* Desktop Utility Actions */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={onOpenExportModal}
                className="p-2 rounded-full text-zinc-600 hover:text-purple-700 hover:bg-purple-50 border border-zinc-200 transition-colors"
                title="Export Excel & Backup"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenHistoryModal}
                className="p-2 rounded-full text-zinc-600 hover:text-purple-700 hover:bg-purple-50 border border-zinc-200 transition-colors"
                title="Activity History"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
