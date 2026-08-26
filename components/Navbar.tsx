'use client';

import React from 'react';
import { StoreSettings } from '@/lib/types';
import { Mic, PlusCircle, Calculator, Settings, Gem, Volume2 } from 'lucide-react';
import { Language, translations } from '@/lib/translations';

interface NavbarProps {
  settings: StoreSettings;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenVoiceAssistant: () => void;
  onOpenAddLoan: () => void;
  onOpenCalculator: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  language,
  onLanguageChange,
  onOpenVoiceAssistant,
  onOpenAddLoan,
  onOpenCalculator,
  onOpenSettings,
}) => {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-40 bg-purple-950/95 backdrop-blur-md border-b border-purple-800/60 shadow-royal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Store Branding */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 via-gold-500 to-purple-900 border border-gold-300 shadow-gold-glow">
              <Gem className="w-7 h-7 text-purple-950 fill-purple-950/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-gold-300 via-gold-400 to-purple-200 bg-clip-text text-transparent">
                  DAPP
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-300 border border-gold-500/30">
                  Jewellers & Girvi
                </span>
              </div>
              <p className="text-xs text-purple-300 font-medium truncate max-w-xs sm:max-w-sm">
                {settings.storeName}
              </p>
            </div>
          </div>

          {/* Center / Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="hidden sm:flex items-center bg-purple-900/90 rounded-xl p-1 border border-purple-700/60">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-gold-500 text-purple-950 shadow-sm'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => onLanguageChange('hi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  language === 'hi'
                    ? 'bg-gold-500 text-purple-950 shadow-sm'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => onLanguageChange('gu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  language === 'gu'
                    ? 'bg-gold-500 text-purple-950 shadow-sm'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                ગુજરાતી
              </button>
            </div>

            {/* Giant Prominent Voice Button */}
            <button
              onClick={onOpenVoiceAssistant}
              className="relative group flex items-center gap-2.5 px-4 sm:px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-gold-500 hover:from-purple-500 hover:to-gold-400 text-white font-bold text-sm sm:text-base shadow-purple-glow border border-gold-400/50 transition-all transform active:scale-95 animate-pulse"
              title={t.tapToSpeak}
            >
              <div className="relative">
                <Mic className="w-5 h-5 text-white animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-400"></span>
                </span>
              </div>
              <span className="tracking-wide">{t.voiceAssistant}</span>
            </button>

            {/* Add New Loan Button */}
            <button
              onClick={onOpenAddLoan}
              className="flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-extrabold text-sm shadow-gold-glow border border-gold-300 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden md:inline">{t.addLoan}</span>
              <span className="md:hidden">New</span>
            </button>

            {/* Quick Calculator */}
            <button
              onClick={onOpenCalculator}
              className="p-2.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-gold-300 hover:text-gold-200 border border-purple-700/60 transition-all"
              title={t.calculator}
            >
              <Calculator className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-700/60 transition-all"
              title={t.settings}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
