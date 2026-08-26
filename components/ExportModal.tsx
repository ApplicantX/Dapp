'use client';

import React from 'react';
import { AppData } from '@/lib/types';
import { exportToExcel, exportToJSON, importFromJSON } from '@/lib/storage';
import { X, FileSpreadsheet, Download, Upload, ShieldCheck, Database } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onDataRestored: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  data,
  onDataRestored,
}) => {
  if (!isOpen) return null;

  const handleExcelExport = () => {
    exportToExcel(data);
  };

  const handleJSONExport = () => {
    exportToJSON(data);
  };

  const handleJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const restored = importFromJSON(content);
      if (restored) {
        alert('Database successfully restored from JSON backup!');
        onDataRestored();
        onClose();
      } else {
        alert('Failed to read or parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-800 hover:bg-purple-700 text-purple-200 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Data Export & Backup</h2>
            <p className="text-xs text-purple-200 font-medium">
              Excel spreadsheets for human review and complete JSON machine backups.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 1. Excel Export */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Multi-Sheet Excel Workbook (.xlsx)</span>
              </span>
              <p className="text-xs text-purple-300">
                Exports 4 sheets: <strong>Customers, Loans, Ornaments,</strong> and <strong>Activity History</strong>.
              </p>
            </div>

            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel</span>
            </button>
          </div>

          {/* 2. JSON Full Backup */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-gold-400" />
                <span>Complete JSON Database Backup</span>
              </span>
              <p className="text-xs text-purple-300">
                Full machine-readable backup for reconstruction or safe transfer to Google Drive.
              </p>
            </div>

            <button
              onClick={handleJSONExport}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-black text-xs shadow-gold-glow transition-all flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* 3. Restore JSON Backup */}
          <div className="bg-purple-950/70 p-5 rounded-2xl border border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white">Restore Database</span>
              <p className="text-xs text-purple-300">
                Restore all customer and loan records from a previously exported JSON backup file.
              </p>
            </div>

            <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 border border-purple-700 font-bold text-xs cursor-pointer transition-all flex-shrink-0">
              <Upload className="w-4 h-4" />
              <span>Select Backup File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleJSONImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
