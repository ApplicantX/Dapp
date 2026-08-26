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
    <header className="sticky top-0 z-40 bg-[#0d011a]/85 backdrop-blur-xl border-b border-purple-500/10 shadow-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Minimal Luxury Logo */}
          <div
            onClick={() => onNavigate('HOME')}
            className="cursor-pointer flex items-center gap-3.5 group select-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 via-gold-500 to-purple-900 border border-gold-300/60 flex items-center justify-center text-[#0a0114] shadow-gold-glow group-hover:scale-105 transition-all duration-300">
              <Gem className="w-6 h-6 fill-current opacity-90" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-serif">
                  Dahod Jewellery
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-300 border border-gold-500/20">
                  Lending
                </span>
              </div>
              <p className="text-xs text-purple-200/60 font-medium">
                Gold & Silver Diary Ledger
              </p>
            </div>
          </div>

          {/* Google-Style Pill Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <nav className="flex items-center bg-purple-900/40 p-1.5 rounded-full border border-purple-500/15">
              <button
                onClick={() => onNavigate('HOME')}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                  currentView === 'HOME'
                    ? 'bg-gold-500 text-purple-950 shadow-gold-glow font-bold'
                    : 'text-purple-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Home</span>
              </button>

              <button
                onClick={() => onNavigate('BULK_INPUT')}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                  currentView === 'BULK_INPUT'
                    ? 'bg-gold-500 text-purple-950 shadow-gold-glow font-bold'
                    : 'text-gold-300/90 hover:text-gold-200 hover:bg-white/5'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Data Input (500+)</span>
              </button>

              <button
                onClick={() => onNavigate('CUSTOMERS')}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                  currentView === 'CUSTOMERS'
                    ? 'bg-gold-500 text-purple-950 shadow-gold-glow font-bold'
                    : 'text-purple-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Customers</span>
              </button>

              <button
                onClick={() => onNavigate('CALCULATOR')}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                  currentView === 'CALCULATOR'
                    ? 'bg-gold-500 text-purple-950 shadow-gold-glow font-bold'
                    : 'text-purple-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calculator</span>
              </button>
            </nav>

            <div className="h-6 w-px bg-purple-500/20 mx-1 hidden sm:block" />

            {/* Utility Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenExportModal}
                className="p-2.5 rounded-full bg-purple-900/30 hover:bg-purple-800/50 text-gold-300 hover:text-gold-200 border border-gold-500/20 transition-all duration-200"
                title="Export Excel & Backup"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenHistoryModal}
                className="p-2.5 rounded-full bg-purple-900/30 hover:bg-purple-800/50 text-purple-200/70 hover:text-white border border-purple-500/20 transition-all duration-200"
                title="Activity & Audit History"
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
