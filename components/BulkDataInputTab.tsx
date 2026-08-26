'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppData, BulkCustomerLoanRecord } from '@/lib/types';
import { ContinuousSpeechEngine } from '@/lib/speechEngine';
import { parseBulkVoiceToExcelRecords } from '@/lib/voiceParser';
import { exportBulkRecordsToExcel, commitBulkRecordsToDatabase } from '@/lib/storage';
import {
  Mic,
  MicOff,
  FileSpreadsheet,
  Download,
  Database,
  Trash2,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ClipboardPaste,
  Edit3,
  RotateCcw,
  Volume2,
} from 'lucide-react';

interface BulkDataInputTabProps {
  appData: AppData;
  onCommitSuccess: (updatedData: AppData) => void;
}

export const BulkDataInputTab: React.FC<BulkDataInputTabProps> = ({
  appData,
  onCommitSuccess,
}) => {
  const [records, setRecords] = useState<BulkCustomerLoanRecord[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [committedCount, setCommittedCount] = useState<number | null>(null);

  const speechEngineRef = useRef<ContinuousSpeechEngine | null>(null);
  const lastProcessedLengthRef = useRef<number>(0);

  // Initialize with a few helpful starter records if empty
  useEffect(() => {
    if (records.length === 0) {
      const sampleBatch = [
        {
          id: 'starter-1',
          name: 'Ramesh Mishra',
          village: 'Vova',
          diary: 'Diary 2026',
          pageNumber: '142',
          mobile: '9825123456',
          loanAmount: 50000,
          metal: 'Silver' as const,
          category: 'Kandora',
          weight: 500,
          quantity: 1,
          rawSpeech: 'Ramesh Mishra from Vova village Diary 2026 Page 142 500g silver kandora 50000 rupees',
          status: 'VALID' as const,
        },
        {
          id: 'starter-2',
          name: 'Suresh Damor',
          village: 'Garbada',
          diary: 'Diary 2025',
          pageNumber: '84',
          mobile: '9426589123',
          loanAmount: 45000,
          metal: 'Gold' as const,
          category: 'Chain',
          weight: 18.5,
          quantity: 1,
          rawSpeech: 'Suresh Damor from Garbada Diary 2025 Page 84 18.5g gold chain 45000 rupees',
          status: 'VALID' as const,
        },
      ];
      setRecords(sampleBatch);
    }
  }, []);

  // Continuous Voice Stream handler
  const startContinuousCapture = async () => {
    try {
      setIsRecording(true);
      lastProcessedLengthRef.current = 0;

      speechEngineRef.current = new ContinuousSpeechEngine('en-IN');
      await speechEngineRef.current.start({
        onInterimResult: (transcript) => {
          setLiveTranscript(transcript);
        },
        onFinalResult: (transcript) => {
          setLiveTranscript(transcript);
          // Stream and parse new records as they are spoken
          const parsed = parseBulkVoiceToExcelRecords(transcript, appData.villages, appData.ornamentCategories);
          if (parsed.length > 0) {
            setRecords(parsed);
          }
        },
        onError: (err) => {
          console.warn('Continuous recording error:', err);
          setIsRecording(false);
        },
      });
    } catch (e) {
      console.warn('Voice stream start error:', e);
      setIsRecording(false);
    }
  };

  const stopContinuousCapture = () => {
    if (speechEngineRef.current) {
      const fullText = speechEngineRef.current.stop();
      if (fullText.trim()) {
        const parsed = parseBulkVoiceToExcelRecords(fullText, appData.villages, appData.ornamentCategories);
        if (parsed.length > 0) {
          setRecords(parsed);
        }
      }
    }
    setIsRecording(false);
  };

  // Handle Pasted Text Parsing
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const parsed = parseBulkVoiceToExcelRecords(pastedText, appData.villages, appData.ornamentCategories);
    if (parsed.length > 0) {
      setRecords((prev) => [...prev, ...parsed]);
      setShowPasteModal(false);
      setPastedText('');
    } else {
      alert('Could not parse customer records from pasted text. Please check text format.');
    }
  };

  // Inline Cell Edit
  const handleCellEdit = (id: string, field: keyof BulkCustomerLoanRecord, value: any) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          // Re-evaluate validation status
          if (updated.name && updated.village && updated.pageNumber) {
            updated.status = 'VALID';
            updated.warningMessage = undefined;
          }
          return updated;
        }
        return r;
      })
    );
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Add Empty Row
  const handleAddEmptyRow = () => {
    const newRec: BulkCustomerLoanRecord = {
      id: `manual-${Date.now()}`,
      name: '',
      village: 'Dahod',
      diary: 'Diary 2026',
      pageNumber: '',
      loanAmount: 50000,
      metal: 'Silver',
      category: 'Kandora',
      weight: 500,
      quantity: 1,
      rawSpeech: 'Manual Entry',
      status: 'WARNING',
      warningMessage: 'Please enter name and page number',
    };
    setRecords((prev) => [newRec, ...prev]);
  };

  // 1-Click Export to Excel
  const handleDownloadExcel = () => {
    if (records.length === 0) {
      alert('No customer records to export.');
      return;
    }
    exportBulkRecordsToExcel(records);
  };

  // Commit All to App Database
  const handleCommitToDatabase = () => {
    if (records.length === 0) return;
    const confirmCommit = window.confirm(
      `Commit all ${records.length} customer records and their loans directly to the app database?`
    );
    if (confirmCommit) {
      const updated = commitBulkRecordsToDatabase(appData, records);
      onCommitSuccess(updated);
      setCommittedCount(records.length);
      setTimeout(() => setCommittedCount(null), 4000);
    }
  };

  // Summary Metrics
  const totalPrincipal = useMemo(() => records.reduce((sum, r) => sum + (Number(r.loanAmount) || 0), 0), [records]);
  const totalGoldGrams = useMemo(() => records.filter((r) => r.metal === 'Gold').reduce((sum, r) => sum + (Number(r.weight) || 0), 0), [records]);
  const totalSilverGrams = useMemo(() => records.filter((r) => r.metal === 'Silver').reduce((sum, r) => sum + (Number(r.weight) || 0), 0), [records]);
  const warningCount = useMemo(() => records.filter((r) => r.status === 'WARNING').length, [records]);

  // Filtered rows
  const filteredRecords = useMemo(() => {
    if (!searchFilter.trim()) return records;
    const q = searchFilter.toLowerCase();
    return records.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.village.toLowerCase().includes(q) ||
        r.pageNumber.includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [records, searchFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Control Deck */}
      <div className="bg-[#130324]/90 p-6 sm:p-8 rounded-3xl border border-purple-500/20 shadow-card space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/25 text-gold-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>High-Throughput Voice Data Entry (500+ Customers)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif">
              Continuous Voice to Excel Engine
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/70 max-w-xl">
              Speak continuously without interruption. Every customer, village, physical page, and ornament is automatically captured into the live spreadsheet below with zero prompts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download Excel Button */}
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>

            {/* Commit to Database */}
            <button
              onClick={handleCommitToDatabase}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs sm:text-sm shadow-gold-glow transition-all active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>Save to App ({records.length})</span>
            </button>

            {/* Paste Transcript Button */}
            <button
              onClick={() => setShowPasteModal(true)}
              className="p-3 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-500/20 transition-all"
              title="Paste Bulk Text / Audio Transcript"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Continuous Microphone Button Deck */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-[#1c0733]/80 border border-purple-500/20">
          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? stopContinuousCapture : startContinuousCapture}
              className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 transition-all transform active:scale-95 flex-shrink-0 ${
                isRecording
                  ? 'bg-rose-600 border-rose-300 text-white shadow-[0_0_35px_rgba(225,29,72,0.7)] animate-pulse'
                  : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-gold-500 border-gold-400 shadow-purple-glow hover:scale-105'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-7 h-7 text-white animate-bounce" />
                  <span className="text-[10px] font-black uppercase text-white mt-0.5">STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-7 h-7 text-white" />
                  <span className="text-[10px] font-black uppercase text-gold-200 mt-0.5">RECORD</span>
                </>
              )}
            </button>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-300 block">
                {isRecording ? '● Live Continuous Recording Active' : 'Ready for Continuous Input'}
              </span>
              <p className="text-xs text-purple-200/80 max-w-md">
                {isRecording
                  ? 'Speak all 500+ customer accounts back-to-back. The microphone keeps listening through pauses until you tap STOP.'
                  : 'Tap RECORD and start speaking: "1. Ramesh Patel Vova village Diary 2026 Page 12 50000 silver kandora 500g, 2. Suresh Damor Garbada..."'}
              </p>
            </div>
          </div>

          {/* Committed Banner */}
          {committedCount && (
            <div className="px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              <span>Successfully imported {committedCount} accounts into App Database!</span>
            </div>
          )}
        </div>

        {/* Live Audio Transcript Box */}
        {liveTranscript && (
          <div className="bg-[#1c0733] p-4 rounded-2xl border border-purple-500/20 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-gold-300 uppercase tracking-wider text-[10px]">
                Live Speech Stream:
              </span>
              <span className="text-purple-300/60 text-[10px]">
                Auto-processing into table...
              </span>
            </div>
            <p className="text-xs font-medium text-white italic max-h-24 overflow-y-auto leading-relaxed">
              "{liveTranscript}"
            </p>
          </div>
        )}

        {/* High-Throughput Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="bg-[#1c0733]/80 p-3.5 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-purple-200/60 font-semibold uppercase tracking-wider block">
              Captured Rows
            </span>
            <span className="text-xl font-bold text-white mt-0.5 block">
              {records.length}
            </span>
          </div>

          <div className="bg-[#1c0733]/80 p-3.5 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-purple-200/60 font-semibold uppercase tracking-wider block">
              Total Principal
            </span>
            <span className="text-xl font-bold text-emerald-400 mt-0.5 block truncate">
              ₹{totalPrincipal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-[#1c0733]/80 p-3.5 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-gold-300/80 font-semibold uppercase tracking-wider block">
              Gold Weight
            </span>
            <span className="text-xl font-bold text-gold-300 mt-0.5 block">
              {totalGoldGrams.toFixed(1)}g
            </span>
          </div>

          <div className="bg-[#1c0733]/80 p-3.5 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-slate-300/80 font-semibold uppercase tracking-wider block">
              Silver Weight
            </span>
            <span className="text-xl font-bold text-slate-200 mt-0.5 block">
              {totalSilverGrams >= 1000
                ? `${(totalSilverGrams / 1000).toFixed(2)} kg`
                : `${totalSilverGrams.toFixed(0)}g`}
            </span>
          </div>

          <div className="bg-[#1c0733]/80 p-3.5 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-purple-200/60 font-semibold uppercase tracking-wider block">
              Status
            </span>
            <span
              className={`text-sm font-black mt-1.5 inline-flex items-center gap-1 ${
                warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {warningCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{warningCount} Warnings</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Ready</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Live Excel Spreadsheet Table */}
      <div className="bg-[#130324]/90 p-5 sm:p-6 rounded-3xl border border-purple-500/20 shadow-card space-y-4">
        {/* Table Search & Tool Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/60" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter captured rows (e.g. Ramesh, Vova, 142, Kandora)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1c0733] border border-purple-500/20 text-xs text-white placeholder-purple-200/40 focus:outline-none focus:border-gold-400/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddEmptyRow}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-gold-300 border border-purple-500/20 text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Row</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Clear all captured rows from the table?')) {
                  setRecords([]);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="overflow-x-auto rounded-2xl border border-purple-500/20">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#1c0733] text-purple-200/80 font-bold border-b border-purple-500/20 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[160px]">Customer Name</th>
                <th className="py-3 px-3 min-w-[120px]">Village (ગામ)</th>
                <th className="py-3 px-3 min-w-[110px]">Diary</th>
                <th className="py-3 px-3 min-w-[90px]">Page #</th>
                <th className="py-3 px-3 min-w-[110px]">Loan (₹)</th>
                <th className="py-3 px-3 min-w-[80px]">Metal</th>
                <th className="py-3 px-3 min-w-[120px]">Ornament</th>
                <th className="py-3 px-3 min-w-[90px]">Weight (g)</th>
                <th className="py-3 px-3 min-w-[60px]">Qty</th>
                <th className="py-3 px-3 min-w-[110px]">Mobile</th>
                <th className="py-3 px-3 min-w-[80px] text-center">Status</th>
                <th className="py-3 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 font-medium">
              {filteredRecords.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`hover:bg-purple-900/30 transition-colors ${
                    r.status === 'WARNING' ? 'bg-amber-950/15' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-center text-purple-300/60 font-mono text-[11px]">
                    {idx + 1}
                  </td>

                  {/* Customer Name */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => handleCellEdit(r.id, 'name', e.target.value)}
                      className="w-full bg-transparent text-white font-bold hover:bg-purple-900/40 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none focus:ring-1 focus:ring-gold-400"
                    />
                  </td>

                  {/* Village */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.village}
                      onChange={(e) => handleCellEdit(r.id, 'village', e.target.value)}
                      className="w-full bg-transparent text-gold-200 font-semibold hover:bg-purple-900/40 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                    />
                  </td>

                  {/* Diary */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.diary}
                      onChange={(e) => handleCellEdit(r.id, 'diary', e.target.value)}
                      className="w-full bg-transparent text-purple-200 hover:bg-purple-900/40 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-[11px]"
                    />
                  </td>

                  {/* Page # */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.pageNumber}
                      onChange={(e) => handleCellEdit(r.id, 'pageNumber', e.target.value)}
                      className="w-full bg-transparent text-gold-300 font-bold hover:bg-purple-900/40 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-center"
                    />
                  </td>

                  {/* Loan Amount */}
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      value={r.loanAmount}
                      onChange={(e) => handleCellEdit(r.id, 'loanAmount', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-emerald-400 font-bold hover:bg-purple-900/40 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none font-mono"
                    />
                  </td>

                  {/* Metal */}
                  <td className="py-2.5 px-3">
                    <select
                      value={r.metal}
                      onChange={(e) => handleCellEdit(r.id, 'metal', e.target.value)}
                      className="bg-transparent text-white hover:bg-purple-900/40 px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none font-semibold text-[11px]"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                    </select>
                  </td>

                  {/* Ornament Category */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.category}
                      onChange={(e) => handleCellEdit(r.id, 'category', e.target.value)}
                      className="w-full bg-transparent text-purple-100 hover:bg-purple-900/40 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                    />
                  </td>

                  {/* Weight */}
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      step="0.1"
                      value={r.weight}
                      onChange={(e) => handleCellEdit(r.id, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-gold-300 font-bold hover:bg-purple-900/40 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-right font-mono"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      value={r.quantity}
                      onChange={(e) => handleCellEdit(r.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-transparent text-purple-200 hover:bg-purple-900/40 px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-center font-mono text-[11px]"
                    />
                  </td>

                  {/* Mobile */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.mobile || ''}
                      placeholder="Optional"
                      onChange={(e) => handleCellEdit(r.id, 'mobile', e.target.value)}
                      className="w-full bg-transparent text-purple-300/70 hover:bg-purple-900/40 px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-[11px]"
                    />
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3 text-center">
                    {r.status === 'VALID' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        Valid
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/30 text-[10px] font-bold"
                        title={r.warningMessage}
                      >
                        Review
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleDeleteRow(r.id)}
                      className="p-1 rounded text-purple-400 hover:text-rose-400 transition-colors"
                      title="Remove Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paste Transcript Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#130324] border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-modal">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-gold-400" />
              <span>Paste 500+ Customer Text / Transcript</span>
            </h3>
            <p className="text-xs text-purple-200/70 mb-4">
              Paste long speech transcripts or numbered customer notes. The engine will instantly split and extract all customer names, villages, page numbers, loans, and ornaments into Excel rows.
            </p>

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="e.g. 1. Ramesh Patel Vova village Diary 2026 Page 12 50000 loan 500g silver kandora&#10;2. Suresh Damor Garbada Diary 2025 Page 84 18.5g gold chain 45000&#10;3. Bharat Bhabhor Limkheda Diary 2026 Page 55..."
              className="w-full p-4 rounded-2xl bg-[#1c0733] border border-purple-500/20 text-white text-xs font-mono focus:outline-none focus:border-gold-400/60 leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-full text-purple-200/70 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleParsePastedText}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Parse to Table</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
