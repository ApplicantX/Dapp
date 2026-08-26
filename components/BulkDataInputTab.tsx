'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppData, BulkCustomerLoanRecord } from '@/lib/types';
import { CustomHybridSpeechEngine } from '@/lib/speechEngine';
import { parseBulkVoiceToExcelRecords } from '@/lib/voiceParser';
import { exportBulkRecordsToExcel, commitBulkRecordsToDatabase } from '@/lib/storage';
import {
  Mic,
  MicOff,
  Download,
  Database,
  Trash2,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ClipboardPaste,
  KeyRound,
  X,
  Edit2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface BulkDataInputTabProps {
  appData: AppData;
  onCommitSuccess: (updatedData: AppData) => void;
}

export const BulkDataInputTab: React.FC<BulkDataInputTabProps> = ({
  appData,
  onCommitSuccess,
}) => {
  // Master Spreadsheet Rows (Saved & Confirmed)
  const [records, setRecords] = useState<BulkCustomerLoanRecord[]>([]);

  // Pending Batch for Review & Confirmation (User must verify before adding)
  const [pendingBatch, setPendingBatch] = useState<BulkCustomerLoanRecord[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Modals & UI Controls
  const [searchFilter, setSearchFilter] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [committedCount, setCommittedCount] = useState<number | null>(null);

  const speechEngineRef = useRef<CustomHybridSpeechEngine | null>(null);

  // Load API Key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('dahod_whisper_api_key') || '';
      setApiKey(savedKey);
    }
  }, []);

  // Start Audio Recording
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setLiveTranscript('');
      speechEngineRef.current = new CustomHybridSpeechEngine('en-IN');
      await speechEngineRef.current.start({
        onAudioLevel: (lvl) => setAudioLevel(lvl),
        onInterimResult: (text) => setLiveTranscript(text),
        onError: (err) => {
          alert(err);
          setIsRecording(false);
        },
      });
    } catch (e) {
      console.error('Recording start error:', e);
      setIsRecording(false);
    }
  };

  // Stop Recording -> Parse into Pending Review Deck (DOES NOT add directly!)
  const stopRecording = async () => {
    if (!speechEngineRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    setLiveTranscript('Transcribing and parsing customer statements...');

    const transcript = await speechEngineRef.current.stop(apiKey);
    setIsProcessing(false);
    setAudioLevel(0);

    if (transcript && transcript.trim()) {
      setLiveTranscript(transcript);
      const parsed = parseBulkVoiceToExcelRecords(transcript, appData.villages, appData.ornamentCategories);
      if (parsed.length > 0) {
        // Put into Pending Batch for User Verification
        setPendingBatch(parsed);
      } else {
        alert('Could not parse customer records from spoken audio. Please try speaking again.');
      }
    } else {
      setLiveTranscript('No words captured. Please tap RECORD and speak clearly.');
    }
  };

  // Parse Pasted Text into Pending Review Deck
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const parsed = parseBulkVoiceToExcelRecords(pastedText, appData.villages, appData.ornamentCategories);
    if (parsed.length > 0) {
      setPendingBatch(parsed);
      setShowPasteModal(false);
      setPastedText('');
    } else {
      alert('Could not parse customer records from text. Please verify format.');
    }
  };

  // User confirms the pending batch -> Add all to Master Table
  const handleConfirmAndAddAllToExcel = () => {
    if (pendingBatch.length === 0) return;
    setRecords((prev) => [...prev, ...pendingBatch]);
    setPendingBatch([]);
    setLiveTranscript('');
  };

  // Discard pending batch
  const handleDiscardPendingBatch = () => {
    if (window.confirm('Discard this spoken batch without adding to Excel?')) {
      setPendingBatch([]);
      setLiveTranscript('');
    }
  };

  // Edit item inside Pending Batch
  const handlePendingCellEdit = (id: string, field: keyof BulkCustomerLoanRecord, value: any) => {
    setPendingBatch((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
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

  const handleRemovePendingItem = (id: string) => {
    setPendingBatch((prev) => prev.filter((r) => r.id !== id));
  };

  // Edit item inside Master Table
  const handleMasterCellEdit = (id: string, field: keyof BulkCustomerLoanRecord, value: any) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
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

  const handleDeleteMasterRow = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddManualMasterRow = () => {
    const newRec: BulkCustomerLoanRecord = {
      id: `manual-${Date.now()}`,
      name: '',
      village: 'Dahod',
      diary: 'Diary 2026',
      pageNumber: `${records.length + 1}`,
      loanAmount: 50000,
      metal: 'Silver',
      category: 'Kandora',
      weight: 500,
      quantity: 1,
      rawSpeech: 'Manual Row',
      status: 'WARNING',
      warningMessage: 'Enter customer name',
    };
    setRecords((prev) => [...prev, newRec]);
  };

  // 1-Click Export to Excel
  const handleDownloadExcel = () => {
    if (records.length === 0) {
      alert('No customer records in the table to export. Please record or add records first.');
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

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('dahod_whisper_api_key', apiKey.trim());
    }
    setShowKeyModal(false);
    alert('Whisper Speech API Key saved!');
  };

  // Summary Metrics
  const totalPrincipal = useMemo(() => records.reduce((sum, r) => sum + (Number(r.loanAmount) || 0), 0), [records]);
  const totalGoldGrams = useMemo(() => records.filter((r) => r.metal === 'Gold').reduce((sum, r) => sum + (Number(r.weight) || 0), 0), [records]);
  const totalSilverGrams = useMemo(() => records.filter((r) => r.metal === 'Silver').reduce((sum, r) => sum + (Number(r.weight) || 0), 0), [records]);
  const warningCount = useMemo(() => records.filter((r) => r.status === 'WARNING').length, [records]);

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
      {/* Control Deck */}
      <div className="bg-[#130324]/90 p-6 sm:p-8 rounded-3xl border border-purple-500/20 shadow-card space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/25 text-gold-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Voice-to-Excel Stream & Review Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif">
              Bulk Voice Data Input (500+ Customers)
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/70 max-w-xl">
              Speak names and loan details back-to-back. The app captures everything, displays all parsed records for your review, and adds them to your Excel spreadsheet upon confirmation.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel ({records.length})</span>
            </button>

            <button
              onClick={handleCommitToDatabase}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>Save to App</span>
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="p-2.5 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-500/20 transition-all"
              title="Paste Bulk Text / Notes"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowKeyModal(true)}
              className={`p-2.5 rounded-full border transition-all ${
                apiKey
                  ? 'bg-purple-900/60 text-gold-300 border-gold-500/30'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/50 animate-pulse'
              }`}
              title="Whisper AI Key Settings"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio Recording Controller */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-[#1c0733]/80 border border-purple-500/20">
          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 transition-all transform active:scale-95 flex-shrink-0 ${
                isRecording
                  ? 'bg-rose-600 border-rose-300 text-white shadow-[0_0_35px_rgba(225,29,72,0.7)] animate-pulse'
                  : isProcessing
                  ? 'bg-purple-800 border-purple-600 text-purple-300 opacity-80'
                  : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-gold-500 border-gold-400 shadow-purple-glow hover:scale-105'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-7 h-7 text-white animate-bounce" />
                  <span className="text-[10px] font-black uppercase text-white mt-0.5">STOP</span>
                </>
              ) : isProcessing ? (
                <span className="text-[10px] font-bold">WAIT...</span>
              ) : (
                <>
                  <Mic className="w-7 h-7 text-white" />
                  <span className="text-[10px] font-black uppercase text-gold-200 mt-0.5">RECORD</span>
                </>
              )}
            </button>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-300 block">
                {isRecording
                  ? '● Recording Audio Stream (Speak names continuously)'
                  : isProcessing
                  ? '⏳ Transcribing with Whisper AI...'
                  : 'Click Record & Speak Customer Names'}
              </span>
              <p className="text-xs text-purple-200/80 max-w-md">
                {isRecording
                  ? 'Speak 1 to 20+ customer names back-to-back. Tap STOP when finished to review all parsed cards.'
                  : 'Example: "1. Nirvan from Vova Diary 2026 Page 142 50000 rupees silver kandora 500g, 2. Suresh Damor Garbada..."'}
              </p>
            </div>
          </div>

          {/* Audio Visualizer Waves */}
          {isRecording && (
            <div className="flex items-center gap-1 h-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gold-400 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, Math.round(audioLevel * 32 * (0.4 + 0.6 * Math.sin(i + Date.now() / 200))))}px`,
                  }}
                />
              ))}
            </div>
          )}

          {committedCount && (
            <div className="px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              <span>Imported {committedCount} accounts into App Database!</span>
            </div>
          )}
        </div>

        {/* Live Audio Transcript Box */}
        {liveTranscript && (
          <div className="bg-[#1c0733] p-4 rounded-2xl border border-purple-500/20 text-xs">
            <span className="font-bold text-gold-300 uppercase tracking-wider text-[10px] block mb-1">
              Speech Recognition Transcript:
            </span>
            <p className="text-xs font-medium text-white italic max-h-24 overflow-y-auto leading-relaxed">
              "{liveTranscript}"
            </p>
          </div>
        )}
      </div>

      {/* BATCH VERIFICATION & REVIEW DECK (Displayed after speaking 20+ names) */}
      {pendingBatch.length > 0 && (
        <div className="bg-[#18042e] p-6 sm:p-8 rounded-3xl border-2 border-gold-400 shadow-modal space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gold-500/30">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gold-500/20 text-gold-300 text-xs font-black uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Review Batch Before Adding</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Review {pendingBatch.length} Spoken Customer{pendingBatch.length > 1 ? 's' : ''}
              </h2>
              <p className="text-xs text-purple-200/80">
                Verify details or make quick edits. Nothing is added to the Excel sheet until you click confirm below.
              </p>
            </div>

            {/* Confirm & Discard Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscardPendingBatch}
                className="px-4 py-2.5 rounded-full bg-purple-900/60 hover:bg-rose-900/80 text-purple-200 hover:text-rose-200 border border-purple-500/30 text-xs font-semibold transition-all"
              >
                Discard Batch
              </button>
              <button
                onClick={handleConfirmAndAddAllToExcel}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-purple-950 font-black text-xs sm:text-sm shadow-gold-glow transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>CONFIRM & ADD ALL ({pendingBatch.length}) TO EXCEL</span>
              </button>
            </div>
          </div>

          {/* Numbered Customer Verification Cards */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pendingBatch.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#130324] p-4 rounded-2xl border border-purple-500/20 shadow-card space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gold-300 bg-gold-500/10 px-2.5 py-0.5 rounded-full">
                    Customer #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemovePendingItem(item.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
                  {/* Name */}
                  <div className="col-span-2 space-y-0.5">
                    <label className="text-[10px] font-bold text-purple-200/70">Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handlePendingCellEdit(item.id, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#1c0733] border border-purple-500/30 text-white font-bold text-xs focus:outline-none focus:border-gold-400"
                    />
                  </div>

                  {/* Village */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-purple-200/70">Village</label>
                    <input
                      type="text"
                      value={item.village}
                      onChange={(e) => handlePendingCellEdit(item.id, 'village', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#1c0733] border border-purple-500/30 text-gold-200 font-semibold text-xs focus:outline-none focus:border-gold-400"
                    />
                  </div>

                  {/* Diary */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-purple-200/70">Diary</label>
                    <input
                      type="text"
                      value={item.diary}
                      onChange={(e) => handlePendingCellEdit(item.id, 'diary', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#1c0733] border border-purple-500/30 text-white text-xs focus:outline-none"
                    />
                  </div>

                  {/* Page # */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gold-300">Page #</label>
                    <input
                      type="text"
                      value={item.pageNumber}
                      onChange={(e) => handlePendingCellEdit(item.id, 'pageNumber', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#1c0733] border border-gold-500/40 text-gold-300 font-bold text-xs text-center focus:outline-none"
                    />
                  </div>

                  {/* Loan Amount */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-emerald-400">Loan (₹)</label>
                    <input
                      type="number"
                      step="500"
                      value={item.loanAmount}
                      onChange={(e) => handlePendingCellEdit(item.id, 'loanAmount', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#1c0733] border border-purple-500/30 text-emerald-400 font-bold text-xs focus:outline-none font-mono"
                    />
                  </div>

                  {/* Metal */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-purple-200/70">Metal</label>
                    <select
                      value={item.metal}
                      onChange={(e) => handlePendingCellEdit(item.id, 'metal', e.target.value)}
                      className="w-full px-1.5 py-1.5 rounded-xl bg-[#1c0733] border border-purple-500/30 text-white font-semibold text-xs focus:outline-none"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                    </select>
                  </div>

                  {/* Ornament */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-purple-200/70">Ornament</label>
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => handlePendingCellEdit(item.id, 'category', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#1c0733] border border-purple-500/30 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-500/30">
            <button
              onClick={handleDiscardPendingBatch}
              className="px-4 py-2.5 rounded-full text-purple-200/70 hover:text-white text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAndAddAllToExcel}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-purple-950 font-black text-sm shadow-gold-glow transition-all active:scale-95"
            >
              <Check className="w-5 h-5" />
              <span>CONFIRM & ADD ALL ({pendingBatch.length}) TO EXCEL</span>
            </button>
          </div>
        </div>
      )}

      {/* MASTER EXCEL SPREADSHEET (Confirmed Records) */}
      <div className="bg-[#130324]/90 p-5 sm:p-6 rounded-3xl border border-purple-500/20 shadow-card space-y-4">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              Master Excel Grid ({records.length} Records)
            </h3>
            {records.length > 0 && (
              <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                Total: ₹{totalPrincipal.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-300/60" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter rows..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1c0733] border border-purple-500/20 text-xs text-white placeholder-purple-200/40 focus:outline-none focus:border-gold-400/60"
              />
            </div>

            <button
              onClick={handleAddManualMasterRow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-gold-300 border border-purple-500/20 text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Row</span>
            </button>

            {records.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all confirmed rows from the table?')) {
                    setRecords([]);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Grid Table */}
        {records.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-purple-500/20">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#1c0733] text-purple-200/80 font-bold border-b border-purple-500/20 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Customer Name</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Village (ગામ)</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Diary</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-center">Page #</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Loan (₹)</th>
                  <th className="py-2.5 px-3 min-w-[80px]">Metal</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Ornament</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-right">Weight (g)</th>
                  <th className="py-2.5 px-3 min-w-[50px] text-center">Qty</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Mobile</th>
                  <th className="py-2.5 px-3 min-w-[70px] text-center">Status</th>
                  <th className="py-2.5 px-3 w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10 font-medium">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-purple-900/30 transition-colors">
                    <td className="py-2 px-3 text-center text-purple-300/60 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => handleMasterCellEdit(r.id, 'name', e.target.value)}
                        className="w-full bg-transparent text-white font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.village}
                        onChange={(e) => handleMasterCellEdit(r.id, 'village', e.target.value)}
                        className="w-full bg-transparent text-gold-200 font-semibold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.diary}
                        onChange={(e) => handleMasterCellEdit(r.id, 'diary', e.target.value)}
                        className="w-full bg-transparent text-purple-200 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="text"
                        value={r.pageNumber}
                        onChange={(e) => handleMasterCellEdit(r.id, 'pageNumber', e.target.value)}
                        className="w-full bg-transparent text-gold-300 font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={r.loanAmount}
                        onChange={(e) => handleMasterCellEdit(r.id, 'loanAmount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-emerald-400 font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={r.metal}
                        onChange={(e) => handleMasterCellEdit(r.id, 'metal', e.target.value)}
                        className="bg-transparent text-white px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none font-semibold text-[11px]"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.category}
                        onChange={(e) => handleMasterCellEdit(r.id, 'category', e.target.value)}
                        className="w-full bg-transparent text-purple-100 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={r.weight}
                        onChange={(e) => handleMasterCellEdit(r.id, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-gold-300 font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-right font-mono"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        value={r.quantity}
                        onChange={(e) => handleMasterCellEdit(r.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-transparent text-purple-200 px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-center font-mono text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.mobile || ''}
                        placeholder="Optional"
                        onChange={(e) => handleMasterCellEdit(r.id, 'mobile', e.target.value)}
                        className="w-full bg-transparent text-purple-300/70 px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.status === 'VALID' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          Valid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          Review
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleDeleteMasterRow(r.id)}
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
        ) : (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-purple-500/20 bg-[#1c0733]/40">
            <Mic className="w-8 h-8 text-gold-400/50 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No rows in Excel table yet</h4>
            <p className="text-xs text-purple-200/60 max-w-sm mx-auto mt-1">
              Tap <strong>RECORD</strong> above, speak your customer names, and click <strong>CONFIRM</strong> to populate the table.
            </p>
          </div>
        )}
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#130324] border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-modal">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-gold-400" />
              <span>Paste Customer Text / Notes</span>
            </h3>
            <p className="text-xs text-purple-200/70 mb-4">
              Paste customer notes or transcripts. They will be parsed into the verification deck for your review before adding to Excel.
            </p>

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="e.g. 1. Nirvan from Vova Diary 2026 Page 142 50000 silver kandora 500g&#10;2. Suresh Damor Garbada Diary 2025 Page 84 45000 18.5g gold chain&#10;3. Ramesh Patel Limkheda..."
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
                <span>Parse to Review Deck</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#130324] border border-purple-500/20 rounded-3xl p-6 shadow-modal">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-gold-400" />
              <span>Whisper Speech Key</span>
            </h3>
            <p className="text-xs text-purple-200/70 mb-4">
              Enter your Groq API key (`gsk_...`) or OpenAI API key for high-accuracy Whisper AI speech transcription of Indian/Gujarati names.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_... or sk-..."
                className="w-full p-3 rounded-xl bg-[#1c0733] border border-purple-500/20 text-white text-xs font-mono focus:outline-none focus:border-gold-400"
              />

              <div className="flex items-center justify-between text-[11px] text-purple-300/60">
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-400 hover:underline"
                >
                  Get free Groq API key (14,400 free requests/day)
                </a>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-full text-purple-200/70 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all"
                >
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
