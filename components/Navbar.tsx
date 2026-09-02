'use client';

import React from 'react';
import { Gem, Calculator, Users, FileSpreadsheet, History, Home, Mic } from 'lucide-react';

interface NavbarProps {
  currentView: 'HOME' | 'CUSTOMERS' | 'CALCULATOR' | 'BULK_INPUT';
  onNavigate: (view: 'HOME' | 'CUSTOMERS' | 'CALCULATOR' | 'BULK_INPUT') => void;
  onOpenExportModal: () => void;
  onOpenHistoryModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenExportModal,
  onOpenHistoryModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Store Info */}
          <div
            onClick={() => onNavigate('HOME')}
            className="cursor-pointer flex items-center gap-3 group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm group-hover:bg-purple-700 transition-colors">
              <Gem className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900">
                  Dahod Jewellery
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                  Lending
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium hidden sm:block">
                Gold & Silver Diary Ledger
              </p>
            </div>
          </div>

          {/* Clean Pill Navigation */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center bg-zinc-100 p-1 rounded-full border border-zinc-200/80">
              <button
                onClick={() => onNavigate('HOME')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentView === 'HOME'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Home</span>
              </button>

              <button
                onClick={() => onNavigate('BULK_INPUT')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentView === 'BULK_INPUT'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-purple-600" />
                <span>Voice Input</span>
              </button>

              <button
                onClick={() => onNavigate('CUSTOMERS')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentView === 'CUSTOMERS'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Customers</span>
              </button>

              <button
                onClick={() => onNavigate('CALCULATOR')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentView === 'CALCULATOR'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calculator</span>
              </button>
            </nav>

            <div className="h-5 w-px bg-zinc-200 mx-1 hidden sm:block" />

            {/* Utility Actions */}
            <div className="flex items-center gap-1">
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
