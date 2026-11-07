'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppData, BulkCustomerLoanRecord } from '@/lib/types';
import { CustomHybridSpeechEngine } from '@/lib/speechEngine';
import { parseBulkVoiceToExcelRecords } from '@/lib/voiceParser';
import { exportBulkRecordsToExcel } from '@/lib/storage';
import { dbCommitBulkRecords, fetchDatabase } from '@/lib/db';
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
  ClipboardPaste,
  KeyRound,
  X,
  Check,
  Globe,
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
  // Master Spreadsheet Rows (Saved & Confirmed)
  const [records, setRecords] = useState<BulkCustomerLoanRecord[]>([]);

  // Pending Batch for Review & Confirmation (User must verify before adding)
  const [pendingBatch, setPendingBatch] = useState<BulkCustomerLoanRecord[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [speechLanguage, setSpeechLanguage] = useState<'auto' | 'en' | 'hi'>('en');

  // Modals & UI Controls
  const [searchFilter, setSearchFilter] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [committedCount, setCommittedCount] = useState<number | null>(null);

  const speechEngineRef = useRef<CustomHybridSpeechEngine | null>(null);

  // Load API Key from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('dahod_whisper_api_key') || '';
      setApiKey(savedKey);
    }
  }, []);

  // Start Audio Recording with Built-In Speech Engine
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setLiveTranscript('');
      setIsSpeaking(false);

      speechEngineRef.current = new CustomHybridSpeechEngine(speechLanguage);
      await speechEngineRef.current.start({
        onAudioLevel: (lvl) => setAudioLevel(lvl),
        onSpeechDetected: (speaking) => setIsSpeaking(speaking),
        onInterimResult: (text) => setLiveTranscript(text),
        onError: (err) => {
          alert(err);
          setIsRecording(false);
          setIsSpeaking(false);
        },
      });
    } catch (e) {
      console.error('Recording start error:', e);
      setIsRecording(false);
      setIsSpeaking(false);
    }
  };

  // Stop Recording -> Process via In-App Neural Engine & Parse Records
  const stopRecording = async () => {
    if (!speechEngineRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    setIsSpeaking(false);
    setLiveTranscript('Transcribing audio with in-app engine (English & Hindi)...');

    const transcript = await speechEngineRef.current.stop(apiKey);
    setIsProcessing(false);
    setAudioLevel(0);

    if (transcript && transcript.trim()) {
      setLiveTranscript(transcript);
      const parsed = parseBulkVoiceToExcelRecords(transcript, appData.villages, appData.ornamentCategories);
      if (parsed.length > 0) {
        setPendingBatch(parsed);
      } else {
        alert('Could not extract structured loan entries from the spoken statement. Please review the speech transcript below.');
      }
    } else {
      const stats = speechEngineRef.current?.getDebugStats();
      if (stats && stats.recordedBytes > 500) {
        setLiveTranscript(
          `Audio captured (${Math.round(stats.recordedBytes / 1024)} KB). The local AI model did not detect distinct customer words in the audio. Please try speaking closer to your microphone or checking your input volume.`
        );
      } else {
        setLiveTranscript('No audio data was received from the microphone. Please check browser microphone permissions and ensure your microphone is selected in System Settings.');
      }
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
  const handleCommitToDatabase = async () => {
    if (records.length === 0) return;
    const confirmCommit = window.confirm(
      `Commit all ${records.length} customer records and their loans directly to the Supabase database?`
    );
    if (confirmCommit) {
      try {
        await dbCommitBulkRecords(records);
        const live = await fetchDatabase();
        onCommitSuccess(live);
        setCommittedCount(records.length);
        setTimeout(() => setCommittedCount(null), 4000);
      } catch (err: any) {
        console.error('Bulk commit error:', err);
        alert(`Failed to commit records to Supabase: ${err?.message || err}`);
      }
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('dahod_whisper_api_key', apiKey.trim());
    }
    setShowKeyModal(false);
    alert('Optional Cloud Key saved!');
  };

  // Summary Metrics
  const totalPrincipal = useMemo(() => records.reduce((sum, r) => sum + (Number(r.loanAmount) || 0), 0), [records]);
  const totalGoldGrams = useMemo(() => records.filter((r) => r.metal === 'Gold').reduce((sum, r) => sum + (Number(r.weight) || 0), 0), [records]);
  const totalSilverGrams = useMemo(() => records.filter((r) => r.metal === 'Silver').reduce((sum, r) => sum + (Number(r.weight) || 0), 0), [records]);

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
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>In-App Neural Speech Engine (English & Hindi)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
              Voice Data Input
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-xl">
              Speak customer loan records continuously in English, Hindi, or Hinglish. Automatically parsed into structured spreadsheet rows without requiring external API keys.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-full border border-zinc-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSpeechLanguage('auto')}
                className={`px-3 py-1 rounded-full transition-all ${
                  speechLanguage === 'auto'
                    ? 'bg-white text-purple-700 shadow-sm font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Automatically detect English or Hindi speech"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setSpeechLanguage('en')}
                className={`px-3 py-1 rounded-full transition-all ${
                  speechLanguage === 'en'
                    ? 'bg-white text-purple-700 shadow-sm font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setSpeechLanguage('hi')}
                className={`px-3 py-1 rounded-full transition-all ${
                  speechLanguage === 'hi'
                    ? 'bg-white text-purple-700 shadow-sm font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                हिन्दी
              </button>
            </div>

            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel ({records.length})</span>
            </button>

            <button
              onClick={handleCommitToDatabase}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Database className="w-4 h-4" />
              <span>Save to App</span>
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-all"
              title="Paste Bulk Text / Notes"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowKeyModal(true)}
              className={`p-2 rounded-full border transition-all ${
                apiKey
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:text-zinc-800'
              }`}
              title="Optional Cloud Key Settings"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio Recording Controller */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center border transition-all transform active:scale-95 flex-shrink-0 ${
                isRecording
                  ? 'bg-rose-600 border-rose-400 text-white shadow-md animate-pulse'
                  : isProcessing
                  ? 'bg-zinc-200 border-zinc-300 text-zinc-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 border-purple-500 text-white shadow-sm hover:scale-105'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-6 h-6 text-white" />
                  <span className="text-[9px] font-bold uppercase text-white mt-0.5">STOP</span>
                </>
              ) : isProcessing ? (
                <span className="text-[9px] font-bold">WAIT...</span>
              ) : (
                <>
                  <Mic className="w-6 h-6 text-white" />
                  <span className="text-[9px] font-bold uppercase text-white mt-0.5">RECORD</span>
                </>
              )}
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 block">
                  {isRecording
                    ? isSpeaking
                      ? '● Speaking Detected (Recording Audio)'
                      : '● Listening for Speech...'
                    : isProcessing
                    ? '⏳ Transcribing with In-App Neural Engine...'
                    : 'Click Record & Speak Customer Loans'}
                </span>
                {isRecording && isSpeaking && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] animate-pulse">
                    Voice Active
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 max-w-md">
                {isRecording
                  ? 'Speak continuously in English, Hindi, or Hinglish. Tap STOP when finished to review.'
                  : 'English: "1. Nirvan from Vova Diary 2026 Page 142 50000 rupees silver kandora 500g" • हिन्दी: "1. सुरेश डामोर गरबाड़ा डायरी 2026 पेज 50 पचास हजार रुपये चांदी कंदोरा 500 ग्राम"'}
              </p>
            </div>
          </div>

          {/* Audio Visualizer Waves */}
          {isRecording && (
            <div className="flex items-center gap-1 h-8 px-3 py-1 bg-white rounded-xl border border-zinc-200 shadow-sm">
              <Volume2 className="w-4 h-4 text-purple-600 mr-1" />
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isSpeaking ? 'bg-purple-600' : 'bg-zinc-300'
                  }`}
                  style={{
                    height: `${Math.max(4, Math.round(audioLevel * 28 * (0.4 + 0.6 * Math.sin(i + Date.now() / 150))))}px`,
                  }}
                />
              ))}
            </div>
          )}

          {committedCount && (
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Imported {committedCount} accounts into App Database!</span>
            </div>
          )}
        </div>

        {/* Live Audio Transcript Box */}
        {/* Live Speech Stream Card (Always visible while recording or when text exists) */}
        {(isRecording || liveTranscript) && (
          <div className="bg-white p-5 rounded-2xl border-2 border-purple-500/30 shadow-sm space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-purple-800 uppercase tracking-wider">
                {isRecording ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                    </span>
                    <span>Live Speech Recognition:</span>
                  </>
                ) : (
                  <span>Recognized Statement:</span>
                )}
              </span>
              <span className="text-[11px] font-medium text-zinc-500">
                {isRecording
                  ? isSpeaking
                    ? 'Transcribing live...'
                    : 'Listening for words...'
                  : isProcessing
                  ? 'Finalizing transcription...'
                  : 'Ready'}
              </span>
            </div>

            <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 min-h-[56px] flex items-center">
              <p className="text-sm sm:text-base font-semibold text-zinc-900 leading-relaxed">
                {liveTranscript ? (
                  <span>{liveTranscript}</span>
                ) : (
                  <span className="text-zinc-400 font-normal italic">
                    Start speaking in English or Hindi... your words will transcribe here live in real-time.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BATCH VERIFICATION & REVIEW DECK */}
      {pendingBatch.length > 0 && (
        <div className="bg-purple-50/40 p-6 sm:p-8 rounded-2xl border border-purple-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Review Batch Before Adding</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                Review {pendingBatch.length} Spoken Customer{pendingBatch.length > 1 ? 's' : ''}
              </h2>
              <p className="text-xs text-zinc-500">
                Verify details or make edits. Nothing is added to the Excel sheet until you confirm below.
              </p>
            </div>

            {/* Confirm & Discard Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscardPendingBatch}
                className="px-4 py-2 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 text-xs font-medium transition-all"
              >
                Discard Batch
              </button>
              <button
                onClick={handleConfirmAndAddAllToExcel}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                <span>CONFIRM & ADD ALL ({pendingBatch.length})</span>
              </button>
            </div>
          </div>

          {/* Numbered Customer Verification Cards */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pendingBatch.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">
                    Customer #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemovePendingItem(item.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-xs">
                  {/* Name */}
                  <div className="col-span-2 space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-500">Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handlePendingCellEdit(item.id, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Village */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-500">Village</label>
                    <input
                      type="text"
                      value={item.village}
                      onChange={(e) => handlePendingCellEdit(item.id, 'village', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 font-semibold text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Diary */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-500">Diary</label>
                    <input
                      type="text"
                      value={item.diary}
                      onChange={(e) => handlePendingCellEdit(item.id, 'diary', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Page # */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-purple-700">Page #</label>
                    <input
                      type="text"
                      value={item.pageNumber}
                      onChange={(e) => handlePendingCellEdit(item.id, 'pageNumber', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-purple-200 text-purple-700 font-bold text-xs text-center focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Loan Amount */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-emerald-700">Loan (₹)</label>
                    <input
                      type="number"
                      step="500"
                      value={item.loanAmount}
                      onChange={(e) => handlePendingCellEdit(item.id, 'loanAmount', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-emerald-700 font-bold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Metal */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-500">Metal</label>
                    <select
                      value={item.metal}
                      onChange={(e) => handlePendingCellEdit(item.id, 'metal', e.target.value)}
                      className="w-full px-1.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-semibold text-xs focus:bg-white focus:outline-none"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                    </select>
                  </div>

                  {/* Ornament */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-500">Ornament</label>
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => handlePendingCellEdit(item.id, 'category', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Weight (g) */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-500">Weight (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={item.weight}
                      onChange={(e) => handlePendingCellEdit(item.id, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-semibold text-xs text-center focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Qty */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-zinc-500">Qty</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={item.quantity}
                      onChange={(e) => handlePendingCellEdit(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 font-semibold text-xs text-center focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-purple-100">
            <button
              onClick={handleDiscardPendingBatch}
              className="px-4 py-2 rounded-full text-zinc-500 hover:text-zinc-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAndAddAllToExcel}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>CONFIRM & ADD ALL ({pendingBatch.length}) TO EXCEL</span>
            </button>
          </div>
        </div>
      )}

      {/* MASTER EXCEL SPREADSHEET (Confirmed Records) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-900">
              Master Excel Grid ({records.length} Records)
            </h3>
            {records.length > 0 && (
              <span className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Total: ₹{totalPrincipal.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter rows..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleAddManualMasterRow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-purple-50 text-zinc-700 hover:text-purple-700 border border-zinc-200 text-xs font-semibold transition-all"
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Grid Table */}
        {records.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Customer Name</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Village</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Diary</th>
                  <th className="py-2.5 px-3 min-w-[70px] text-center">Page #</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Loan (₹)</th>
                  <th className="py-2.5 px-3 min-w-[75px]">Metal</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Ornament</th>
                  <th className="py-2.5 px-3 min-w-[75px] text-right">Weight (g)</th>
                  <th className="py-2.5 px-3 min-w-[50px] text-center">Qty</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Mobile</th>
                  <th className="py-2.5 px-3 min-w-[65px] text-center">Status</th>
                  <th className="py-2.5 px-3 w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => handleMasterCellEdit(r.id, 'name', e.target.value)}
                        className="w-full bg-transparent text-zinc-900 font-semibold px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.village}
                        onChange={(e) => handleMasterCellEdit(r.id, 'village', e.target.value)}
                        className="w-full bg-transparent text-zinc-800 px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.diary}
                        onChange={(e) => handleMasterCellEdit(r.id, 'diary', e.target.value)}
                        className="w-full bg-transparent text-zinc-700 px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="text"
                        value={r.pageNumber}
                        onChange={(e) => handleMasterCellEdit(r.id, 'pageNumber', e.target.value)}
                        className="w-full bg-transparent text-purple-700 font-bold px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={r.loanAmount}
                        onChange={(e) => handleMasterCellEdit(r.id, 'loanAmount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-emerald-700 font-bold px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={r.metal}
                        onChange={(e) => handleMasterCellEdit(r.id, 'metal', e.target.value)}
                        className="bg-transparent text-zinc-800 px-1 py-0.5 rounded focus:bg-purple-50 focus:outline-none font-medium text-[11px]"
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
                        className="w-full bg-transparent text-zinc-800 px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={r.weight}
                        onChange={(e) => handleMasterCellEdit(r.id, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-zinc-900 font-semibold px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none text-right"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={r.quantity}
                        onChange={(e) => handleMasterCellEdit(r.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-transparent text-zinc-700 px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.mobile || ''}
                        onChange={(e) => handleMasterCellEdit(r.id, 'mobile', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-zinc-500 px-1.5 py-0.5 rounded focus:bg-purple-50 focus:outline-none text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.status === 'VALID' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-semibold">
                          OK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-semibold" title={r.warningMessage}>
                          Check
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleDeleteMasterRow(r.id)}
                        className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete Row"
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
          <div className="py-12 px-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-center space-y-2">
            <Mic className="w-8 h-8 text-zinc-300 mx-auto" />
            <h4 className="text-sm font-semibold text-zinc-700">Spreadsheet is empty</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Tap the RECORD button above and speak customer loans in English or Hindi, or paste text to populate the grid.
            </p>
          </div>
        )}
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl space-y-4">
            <button
              onClick={() => setShowPasteModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Paste Bulk Text / Notes</h3>
              <p className="text-xs text-zinc-500">Paste spoken transcript or written notes in English or Hindi to auto-parse into rows.</p>
            </div>
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="e.g. 1. Nirvan from Vova Diary 2026 Page 142 50000 rupees silver kandora 500g... or 1. सुरेश डामोर गरबाड़ा डायरी 2026 पेज 50 पचास हजार रुपये..."
              className="w-full p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-500 font-mono"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleParsePastedText}
                className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm"
              >
                Parse into Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Key Settings Modal (Optional) */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl space-y-4">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Optional Cloud Accelerator</h3>
              <p className="text-xs text-zinc-500">
                The app already includes a built-in neural speech recognition engine running locally on your Mac with zero keys. If you want ultra-fast cloud processing, you can optionally provide a Groq or OpenAI key below.
              </p>
            </div>
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_... or sk-..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm"
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
