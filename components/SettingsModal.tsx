'use client';

import React, { useState } from 'react';
import { MarketRates, StoreSettings } from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import { exportDatabaseBackup, importDatabaseBackup } from '@/lib/storage';
import {
  X,
  Settings,
  Store,
  TrendingUp,
  Volume2,
  Key,
  Download,
  Upload,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  rates: MarketRates;
  language: Language;
  onSaveSettings: (newSettings: StoreSettings) => void;
  onSaveRates: (newRates: MarketRates) => void;
  onRefreshData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  rates,
  language,
  onSaveSettings,
  onSaveRates,
  onRefreshData,
}) => {
  const t = translations[language];

  const [formSettings, setFormSettings] = useState<StoreSettings>({ ...settings });
  const [formRates, setFormRates] = useState<MarketRates>({ ...rates });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formSettings);
    onSaveRates({ ...formRates, lastUpdated: new Date().toISOString() });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dapp-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDatabaseBackup(content);
      if (success) {
        alert('Data successfully restored from backup!');
        onRefreshData();
        onClose();
      } else {
        alert('Failed to read backup file. Please check file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-800/80 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-600/40 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {t.settings} (સેટિંગ્સ)
            </h2>
            <p className="text-xs text-purple-200 font-medium">
              Configure store details, live gold rates, and voice assistant preferences.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Live Gold & Silver Market Rates */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-gold-500/30">
            <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Live Gold & Silver Rates (આજના ભાવ)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gold-300">24K Gold (10g)</label>
                <input
                  type="number"
                  value={formRates.gold24kPer10g}
                  onChange={(e) =>
                    setFormRates({ ...formRates, gold24kPer10g: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-gold-300 font-black text-base focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gold-200">22K 916 (10g)</label>
                <input
                  type="number"
                  value={formRates.gold22kPer10g}
                  onChange={(e) =>
                    setFormRates({ ...formRates, gold22kPer10g: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border-2 border-gold-500 text-gold-300 font-black text-base focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">18K Gold (10g)</label>
                <input
                  type="number"
                  value={formRates.gold18kPer10g}
                  onChange={(e) =>
                    setFormRates({ ...formRates, gold18kPer10g: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-bold text-base focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Silver 999 (1 Kg)</label>
                <input
                  type="number"
                  value={formRates.silverPerKg}
                  onChange={(e) =>
                    setFormRates({ ...formRates, silverPerKg: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-slate-500 text-slate-100 font-black text-base focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Store Details */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800">
            <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Store className="w-4 h-4" />
              <span>Store Information (દુકાનની વિગતો)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Store Name</label>
                <input
                  type="text"
                  value={formSettings.storeName}
                  onChange={(e) => setFormSettings({ ...formSettings, storeName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-bold text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Store Tagline / Subtitle</label>
                <input
                  type="text"
                  value={formSettings.storeTagline}
                  onChange={(e) => setFormSettings({ ...formSettings, storeTagline: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-medium text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Phone Number</label>
                <input
                  type="text"
                  value={formSettings.phone}
                  onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-semibold text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Default Monthly Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formSettings.defaultInterestRate}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, defaultInterestRate: parseFloat(e.target.value) || 1.5 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-gold-300 font-extrabold text-sm focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-purple-200">Address (Printed on Girvi Receipt)</label>
                <input
                  type="text"
                  value={formSettings.address}
                  onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-medium text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Speech & AI Whisper Configuration */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800">
            <h3 className="text-sm font-bold text-gold-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Key className="w-4 h-4" />
              <span>Voice Engine & Optional Whisper API Key</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-900/60 rounded-xl border border-purple-700/50">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Voice Confirmations & Audio Feedback
                  </span>
                  <span className="text-xs text-purple-300">
                    Speaks back confirmations in clear voice after actions
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formSettings.voiceFeedbackEnabled}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, voiceFeedbackEnabled: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-gold-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">
                  Groq / OpenAI Whisper API Key (Optional for ultra-fast cloud AI transcription)
                </label>
                <input
                  type="password"
                  value={formSettings.groqApiKey || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, groqApiKey: e.target.value })}
                  placeholder="gsk_... or sk-..."
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-mono text-xs focus:outline-none"
                />
                <span className="text-[11px] text-purple-300 block">
                  Leave blank to use the built-in real-time speech engine with Indian accent models.
                </span>
              </div>
            </div>
          </div>

          {/* 4. Backup & Restore */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                Database Backup & Sync
              </span>
              <span className="text-xs text-purple-300">
                Safely save all loans, customers, and ledger history to a file.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-gold-300 font-bold text-xs border border-purple-700 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs border border-purple-700 cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                <span>Restore Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-purple-950 font-black text-sm shadow-gold-glow transition-all active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>{t.saveChanges}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
