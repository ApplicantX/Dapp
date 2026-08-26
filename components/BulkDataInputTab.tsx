'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppData, BulkCustomerLoanRecord } from '@/lib/types';
import { CustomDirectAudioEngine } from '@/lib/speechEngine';
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
  Key,
  KeyRound,
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [committedCount, setCommittedCount] = useState<number | null>(null);

  const audioEngineRef = useRef<CustomDirectAudioEngine | null>(null);

  // Load API Key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('dahod_whisper_api_key') || '';
      setApiKey(savedKey);
    }
  }, []);

  // Initialize with sample records if empty
  useEffect(() => {
    if (records.length === 0) {
      const sampleBatch: BulkCustomerLoanRecord[] = [
        {
          id: 'starter-1',
          name: 'Ramesh Mishra',
          village: 'Vova',
          diary: 'Diary 2026',
          pageNumber: '142',
          mobile: '9825123456',
          loanAmount: 50000,
          metal: 'Silver',
          category: 'Kandora',
          weight: 500,
          quantity: 1,
          rawSpeech: 'Ramesh Mishra from Vova village Diary 2026 Page 142 500g silver kandora 50000 rupees',
          status: 'VALID',
        },
        {
          id: 'starter-2',
          name: 'Suresh Damor',
          village: 'Garbada',
          diary: 'Diary 2025',
          pageNumber: '84',
          mobile: '9426589123',
          loanAmount: 45000,
          metal: 'Gold',
          category: 'Chain',
          weight: 18.5,
          quantity: 1,
          rawSpeech: 'Suresh Damor from Garbada Diary 2025 Page 84 18.5g gold chain 45000 rupees',
          status: 'VALID',
        },
      ];
      setRecords(sampleBatch);
    }
  }, []);

  // Custom Audio Recording Start
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setLiveTranscript('Recording audio... Speak customer names, villages, diaries, and loans.');
      audioEngineRef.current = new CustomDirectAudioEngine('en');
      await audioEngineRef.current.start({
        onAudioLevel: (lvl) => setAudioLevel(lvl),
        onError: (err) => {
          alert(err);
          setIsRecording(false);
        },
      });
    } catch (e) {
      console.error('Audio recording start error:', e);
      setIsRecording(false);
    }
  };

  // Custom Audio Recording Stop & Direct Whisper Transcription
  const stopRecording = async () => {
    if (!audioEngineRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    setLiveTranscript('Processing audio with custom Whisper AI engine...');

    const transcript = await audioEngineRef.current.stop(apiKey);
    setIsProcessing(false);
    setAudioLevel(0);

    if (transcript && transcript.trim()) {
      setLiveTranscript(transcript);
      const parsed = parseBulkVoiceToExcelRecords(transcript, appData.villages, appData.ornamentCategories);
      if (parsed.length > 0) {
        setRecords((prev) => [...parsed, ...prev]);
      }
    } else {
      setLiveTranscript('No transcript returned. Please ensure an API key is configured or paste text below.');
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('dahod_whisper_api_key', apiKey.trim());
    }
    setShowKeyModal(false);
    alert('Whisper Speech API Key saved successfully!');
  };

  // Handle Pasted Text Parsing
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const parsed = parseBulkVoiceToExcelRecords(pastedText, appData.villages, appData.ornamentCategories);
    if (parsed.length > 0) {
      setRecords((prev) => [...parsed, ...prev]);
      setShowPasteModal(false);
      setPastedText('');
    } else {
      alert('Could not parse customer records from text. Please verify format.');
    }
  };

  // Inline Cell Edit
  const handleCellEdit = (id: string, field: keyof BulkCustomerLoanRecord, value: any) => {
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
      `Commit all ${records.length} customer records and their loans directly into the app database?`
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
      {/* Control Deck */}
      <div className="bg-[#130324]/90 p-6 sm:p-8 rounded-3xl border border-purple-500/20 shadow-card space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/25 text-gold-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Dedicated AI Audio Engine (No Browser Speech API)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif">
              Custom Voice to Excel Engine
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/70 max-w-xl">
              Captures raw audio directly from your microphone and transcribes with Whisper AI. Every customer and loan item streams into the spreadsheet with zero repeated prompts.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleCommitToDatabase}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>Save to App ({records.length})</span>
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="p-2.5 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-500/20 transition-all"
              title="Paste Bulk Text / Audio Transcript"
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
              title="Configure Whisper AI Speech Key"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Audio Recorder Bar */}
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
                  ? '● Live Audio Recording (Direct Web Audio)'
                  : isProcessing
                  ? '⏳ Transcribing with Whisper AI...'
                  : 'Ready to Record Voice Data'}
              </span>
              <p className="text-xs text-purple-200/80 max-w-md">
                {isRecording
                  ? 'Microphone is capturing raw audio. Speak customer details continuously and tap STOP when done.'
                  : 'Click RECORD and speak: "1. Ramesh Patel Vova village Diary 2026 Page 12 50000 silver kandora 500g, 2. Suresh Damor Garbada..."'}
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
              Whisper Audio Transcription Output:
            </span>
            <p className="text-xs font-medium text-white italic max-h-24 overflow-y-auto leading-relaxed">
              "{liveTranscript}"
            </p>
          </div>
        )}

        {/* Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="bg-[#1c0733]/80 p-3 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-purple-200/60 font-semibold uppercase block">Rows</span>
            <span className="text-lg font-bold text-white block">{records.length}</span>
          </div>

          <div className="bg-[#1c0733]/80 p-3 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-purple-200/60 font-semibold uppercase block">Total Loan (₹)</span>
            <span className="text-lg font-bold text-emerald-400 block truncate">₹{totalPrincipal.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-[#1c0733]/80 p-3 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-gold-300/80 font-semibold uppercase block">Gold Weight</span>
            <span className="text-lg font-bold text-gold-300 block">{totalGoldGrams.toFixed(1)}g</span>
          </div>

          <div className="bg-[#1c0733]/80 p-3 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-slate-300/80 font-semibold uppercase block">Silver Weight</span>
            <span className="text-lg font-bold text-slate-200 block">
              {totalSilverGrams >= 1000 ? `${(totalSilverGrams / 1000).toFixed(2)} kg` : `${totalSilverGrams.toFixed(0)}g`}
            </span>
          </div>

          <div className="bg-[#1c0733]/80 p-3 rounded-2xl border border-purple-500/15 text-center">
            <span className="text-[10px] text-purple-200/60 font-semibold uppercase block">Status</span>
            <span className={`text-xs font-bold mt-1 inline-block ${warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {warningCount > 0 ? `${warningCount} Warnings` : 'All Valid'}
            </span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Data Grid */}
      <div className="bg-[#130324]/90 p-5 sm:p-6 rounded-3xl border border-purple-500/20 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/60" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter table rows (e.g. Ramesh, Vova, 142)..."
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

        {/* Table */}
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
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => handleCellEdit(r.id, 'name', e.target.value)}
                      className="w-full bg-transparent text-white font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.village}
                      onChange={(e) => handleCellEdit(r.id, 'village', e.target.value)}
                      className="w-full bg-transparent text-gold-200 font-semibold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.diary}
                      onChange={(e) => handleCellEdit(r.id, 'diary', e.target.value)}
                      className="w-full bg-transparent text-purple-200 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-[11px]"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.pageNumber}
                      onChange={(e) => handleCellEdit(r.id, 'pageNumber', e.target.value)}
                      className="w-full bg-transparent text-gold-300 font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-center"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      value={r.loanAmount}
                      onChange={(e) => handleCellEdit(r.id, 'loanAmount', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-emerald-400 font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={r.metal}
                      onChange={(e) => handleCellEdit(r.id, 'metal', e.target.value)}
                      className="bg-transparent text-white px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none font-semibold text-[11px]"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.category}
                      onChange={(e) => handleCellEdit(r.id, 'category', e.target.value)}
                      className="w-full bg-transparent text-purple-100 px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      step="0.1"
                      value={r.weight}
                      onChange={(e) => handleCellEdit(r.id, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-gold-300 font-bold px-1.5 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-right font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      value={r.quantity}
                      onChange={(e) => handleCellEdit(r.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-transparent text-purple-200 px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-center font-mono text-[11px]"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={r.mobile || ''}
                      placeholder="Optional"
                      onChange={(e) => handleCellEdit(r.id, 'mobile', e.target.value)}
                      className="w-full bg-transparent text-purple-300/70 px-1 py-0.5 rounded focus:bg-[#1c0733] focus:outline-none text-[11px]"
                    />
                  </td>
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

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#130324] border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-modal">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-gold-400" />
              <span>Paste 500+ Customer Transcript</span>
            </h3>
            <p className="text-xs text-purple-200/70 mb-4">
              Paste your long customer notes or recorded transcript. Every entry will be parsed into Excel rows automatically.
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

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#130324] border border-purple-500/20 rounded-3xl p-6 shadow-modal">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-gold-400" />
              <span>Whisper AI Speech Key</span>
            </h3>
            <p className="text-xs text-purple-200/70 mb-4">
              Enter your Groq API key (`gsk_...`) or OpenAI API key for lightning-fast, high-accuracy speech transcription of Indian/Gujarati names.
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
