'use client';

import React from 'react';
import { AppData } from '@/lib/types';
import { exportToExcel, exportToJSON, importFromJSON } from '@/lib/storage';
import { X, FileSpreadsheet, Download, Upload, Database } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Data Export & Backup</h2>
            <p className="text-xs text-zinc-500 font-medium">
              Excel spreadsheets for records and JSON backups for full restoration.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* 1. Excel Export */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Multi-Sheet Excel Workbook (.xlsx)</span>
              </span>
              <p className="text-[11px] text-zinc-500">
                Exports 4 sheets: <strong>Customers, Loans, Ornaments,</strong> and <strong>History</strong>.
              </p>
            </div>

            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>
          </div>

          {/* 2. JSON Full Backup */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-700" />
                <span>Complete JSON Database Backup</span>
              </span>
              <p className="text-[11px] text-zinc-500">
                Full machine-readable backup for reconstruction or safe transfer.
              </p>
            </div>

            <button
              onClick={handleJSONExport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* 3. Restore JSON Backup */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-900">Restore Database</span>
              <p className="text-[11px] text-zinc-500">
                Restore customer and loan records from an exported JSON file.
              </p>
            </div>

            <label className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 font-semibold text-xs cursor-pointer transition-all flex-shrink-0 shadow-sm">
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>Select File</span>
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
