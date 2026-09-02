'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Customer, Loan } from '@/lib/types';
import { CustomDirectAudioEngine } from '@/lib/speechEngine';
import {
  Search,
  Mic,
  MicOff,
  Plus,
  User,
  BookOpen,
  MapPin,
  Phone,
  ChevronRight,
  Volume2,
} from 'lucide-react';

interface CustomerListProps {
  customers: Customer[];
  loans: Loan[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomerModal: () => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  loans,
  onSelectCustomer,
  onOpenNewCustomerModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [speechLang, setSpeechLang] = useState<'auto' | 'en' | 'hi'>('auto');
  const speechEngineRef = useRef<CustomDirectAudioEngine | null>(null);

  // In-App Speech Recognition Voice Search Handler
  const startVoiceSearch = async () => {
    try {
      setIsVoiceSearching(true);
      setIsSpeaking(false);
      setVoiceSearchText('Listening... Speak customer name or village in English or Hindi.');
      speechEngineRef.current = new CustomDirectAudioEngine(speechLang);
      await speechEngineRef.current.start({
        onAudioLevel: (lvl) => setAudioLevel(lvl),
        onSpeechDetected: (speaking) => setIsSpeaking(speaking),
        onInterimResult: (text) => {
          setVoiceSearchText(text);
          if (text && text.trim()) {
            setSearchQuery(text.trim());
          }
        },
        onError: (err) => {
          alert(err);
          setIsVoiceSearching(false);
          setIsSpeaking(false);
        },
      });
    } catch (e) {
      console.warn('Voice search start error:', e);
      setIsVoiceSearching(false);
      setIsSpeaking(false);
    }
  };

  const stopVoiceSearch = async () => {
    if (!speechEngineRef.current) return;
    setVoiceSearchText('Transcribing with in-app engine...');
    setIsSpeaking(false);
    const transcript = await speechEngineRef.current.stop();
    setIsVoiceSearching(false);
    setAudioLevel(0);

    if (transcript && transcript.trim()) {
      setSearchQuery(transcript.trim());
      setVoiceSearchText('');
    } else {
      setVoiceSearchText('Microphone was quiet. Please speak clearly into your microphone.');
      setTimeout(() => setVoiceSearchText(''), 4000);
    }
  };

  // Fuzzy Search filter on Name & Village
  const filteredCustomers = useMemo(() => {
    const list = customers || [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((c) => {
      if (!c) return false;
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const villageMatch = (c.village || '').toLowerCase().includes(q);
      const diaryMatch = (c.diary || '').toLowerCase().includes(q);
      const pageMatch = String(c.pageNumber || '').toLowerCase().includes(q);
      const mobileMatch = c.mobile ? String(c.mobile).includes(q) : false;
      return nameMatch || villageMatch || diaryMatch || pageMatch || mobileMatch;
    });
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search Header Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name or village (e.g. Ramesh, Vova, 142)..."
              className="w-full pl-11 pr-10 py-3 rounded-full bg-white border border-zinc-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-zinc-900 placeholder-zinc-400 text-sm font-medium transition-all shadow-sm focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-full border border-zinc-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSpeechLang('auto')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  speechLang === 'auto'
                    ? 'bg-white text-purple-700 shadow-sm font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setSpeechLang('en')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  speechLang === 'en'
                    ? 'bg-white text-purple-700 shadow-sm font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setSpeechLang('hi')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  speechLang === 'hi'
                    ? 'bg-white text-purple-700 shadow-sm font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Voice Search Button */}
            <button
              onClick={isVoiceSearching ? stopVoiceSearch : startVoiceSearch}
              className={`flex items-center gap-2 px-4 py-3 rounded-full font-semibold text-xs sm:text-sm border transition-all duration-200 flex-shrink-0 ${
                isVoiceSearching
                  ? 'bg-rose-600 border-rose-500 text-white shadow-sm animate-pulse'
                  : 'bg-white hover:bg-purple-50 text-purple-700 border-zinc-200 hover:border-purple-200 shadow-sm'
              }`}
            >
              {isVoiceSearching ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-purple-600" />
                  <span className="hidden sm:inline">Voice Search</span>
                </>
              )}
            </button>

            {/* Add New Customer Button */}
            <button
              onClick={onOpenNewCustomerModal}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Customer</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Voice Search Feedback Banner */}
        {(isVoiceSearching || voiceSearchText) && (
          <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-purple-700 font-semibold uppercase tracking-wider block">
                {isVoiceSearching
                  ? isSpeaking
                    ? '● Voice Detected (Recording...)'
                    : '● Listening for Customer Name or Village...'
                  : 'Recognition Result:'}
              </span>
              <p className="text-sm font-semibold text-purple-950">
                "{voiceSearchText || 'Speak now...'}"
              </p>
            </div>

            {isVoiceSearching && (
              <div className="flex items-center gap-1 h-5 px-2 py-1 bg-white rounded-lg border border-purple-200">
                <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-purple-600 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(3, Math.round(audioLevel * 18 * (0.5 + 0.5 * Math.sin(i + Date.now() / 150))))}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Cards List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          <span>Matching Accounts ({filteredCustomers.length})</span>
          <span>Click to view details</span>
        </div>

        {filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredCustomers.map((cust) => {
              if (!cust) return null;
              const custLoans = (loans || []).filter((l) => l && l.customerId === cust.id);
              const activeLoans = custLoans.filter((l) => l && l.status === 'ACTIVE');

              let activeGoldGrams = 0;
              let activeSilverGrams = 0;
              let activeLoanTotal = 0;

              activeLoans.forEach((l) => {
                activeLoanTotal += Number(l.loanAmount) || 0;
                (l.ornaments || []).forEach((o) => {
                  if (!o) return;
                  if (o.metal === 'Gold') activeGoldGrams += Number(o.weight) || 0;
                  else activeSilverGrams += Number(o.weight) || 0;
                });
              });

              return (
                <div
                  key={cust.id}
                  onClick={() => onSelectCustomer(cust)}
                  className="cursor-pointer bg-white hover:bg-zinc-50/80 p-5 rounded-2xl border border-zinc-200/90 hover:border-purple-300 shadow-sm hover:shadow-card-hover transition-all duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Customer Info & Village */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 group-hover:text-purple-700 transition-colors">
                          {cust.name}
                        </h3>
                        {/* Village Pill */}
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 font-semibold text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-600" />
                          <span>{cust.village}</span>
                        </span>
                      </div>

                      {/* Diary & Page Reference */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200 text-zinc-700 font-medium flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {cust.diary} • <strong className="text-purple-700">Page {cust.pageNumber}</strong>
                          </span>
                        </span>

                        {cust.mobile && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Phone className="w-3 h-3" />
                            <span>{cust.mobile}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Active Ornaments & Loans Summary */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                      <div className="text-left sm:text-right">
                        {activeLoans.length > 0 ? (
                          <>
                            <div className="text-sm sm:text-base font-bold text-emerald-700">
                              ₹{activeLoanTotal.toLocaleString('en-IN')} Active
                            </div>
                            <div className="text-[11px] text-zinc-500 font-medium flex items-center sm:justify-end gap-2 mt-0.5">
                              {activeGoldGrams > 0 && <span className="text-purple-700 font-semibold">🪙 {activeGoldGrams}g Gold</span>}
                              {activeSilverGrams > 0 && <span>🥈 {activeSilverGrams}g Silver</span>}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-400 font-medium">
                            No Active Loans
                          </span>
                        )}
                      </div>

                      <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-purple-600 group-hover:text-white text-zinc-400 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-zinc-200 shadow-sm">
            <User className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-zinc-800">No customers found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4 mt-1">
              No matching records for "{searchQuery}". You can create a new customer now.
            </p>
            <button
              onClick={onOpenNewCustomerModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Customer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
