'use client';

import React from 'react';
import { Gem, Calculator, Users, FileSpreadsheet, History, Home } from 'lucide-react';

interface NavbarProps {
  currentView: 'HOME' | 'CUSTOMERS' | 'CALCULATOR';
  onNavigate: (view: 'HOME' | 'CUSTOMERS' | 'CALCULATOR') => void;
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
    <header className="sticky top-0 z-40 bg-purple-950/95 backdrop-blur-md border-b border-purple-800/80 shadow-royal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Store Branding (Gold Lettering) */}
          <div
            onClick={() => onNavigate('HOME')}
            className="cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 via-gold-500 to-purple-900 border-2 border-gold-300 flex items-center justify-center text-purple-950 shadow-gold-glow group-hover:scale-105 transition-transform">
              <Gem className="w-7 h-7 fill-purple-950/20" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide bg-gradient-to-r from-gold-300 via-gold-400 to-purple-200 bg-clip-text text-transparent uppercase font-serif">
                Dahod Jewellery
              </h1>
              <p className="text-[11px] text-purple-300 font-semibold tracking-wider">
                Gold & Silver Lending • Girvi Khata
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Home / Starting Screen */}
            <button
              onClick={() => onNavigate('HOME')}
              className={`p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentView === 'HOME'
                  ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                  : 'bg-purple-900/60 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-700/60'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>

            {/* Customer Details */}
            <button
              onClick={() => onNavigate('CUSTOMERS')}
              className={`p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentView === 'CUSTOMERS'
                  ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                  : 'bg-purple-900/60 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-700/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Customer Details</span>
            </button>

            {/* Compound Interest Calculator */}
            <button
              onClick={() => onNavigate('CALCULATOR')}
              className={`p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentView === 'CALCULATOR'
                  ? 'bg-gold-500 text-purple-950 shadow-gold-glow'
                  : 'bg-purple-900/60 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-700/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Calculator</span>
            </button>

            {/* Export */}
            <button
              onClick={onOpenExportModal}
              className="p-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-gold-300 border border-purple-700/60 transition-all"
              title="Export to Excel & Backup"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>

            {/* History */}
            <button
              onClick={onOpenHistoryModal}
              className="p-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-700/60 transition-all"
              title="Activity & Audit History"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
