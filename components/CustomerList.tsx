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
  Sparkles,
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
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const speechEngineRef = useRef<CustomDirectAudioEngine | null>(null);

  // Custom Audio Voice Search Handler
  const startVoiceSearch = async () => {
    try {
      setIsVoiceSearching(true);
      setVoiceSearchText('Recording audio... Speak name or village.');
      speechEngineRef.current = new CustomDirectAudioEngine('en');
      await speechEngineRef.current.start({
        onError: (err) => {
          alert(err);
          setIsVoiceSearching(false);
        },
      });
    } catch (e) {
      console.warn('Voice search start error:', e);
      setIsVoiceSearching(false);
    }
  };

  const stopVoiceSearch = async () => {
    if (!speechEngineRef.current) return;
    setVoiceSearchText('Transcribing with Whisper AI...');
    const transcript = await speechEngineRef.current.stop();
    setIsVoiceSearching(false);
    if (transcript && transcript.trim()) {
      setSearchQuery(transcript.trim());
      setVoiceSearchText('');
    }
  };

  // Fuzzy Search filter on Name & Village
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const villageMatch = c.village.toLowerCase().includes(q);
      const diaryMatch = c.diary.toLowerCase().includes(q);
      const pageMatch = c.pageNumber.toLowerCase().includes(q);
      const mobileMatch = c.mobile ? c.mobile.includes(q) : false;
      return nameMatch || villageMatch || diaryMatch || pageMatch || mobileMatch;
    });
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search Header Bar (Google Material 3 Style) */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400/80" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name or village (e.g. Ramesh, Vova, 142)..."
              className="w-full pl-12 pr-10 py-3.5 rounded-full bg-[#130324]/90 border border-purple-500/20 focus:border-gold-400/60 focus:bg-[#1a0631] text-white placeholder-purple-200/40 text-sm sm:text-base font-medium transition-all shadow-card focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-purple-300 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Central Voice Search Button */}
          <button
            onClick={isVoiceSearching ? stopVoiceSearch : startVoiceSearch}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-xs sm:text-sm border transition-all duration-200 transform active:scale-95 flex-shrink-0 ${
              isVoiceSearching
                ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(225,29,72,0.5)] animate-pulse'
                : 'bg-purple-900/60 hover:bg-purple-800/80 text-gold-300 border-gold-500/30 hover:border-gold-400'
            }`}
          >
            {isVoiceSearching ? (
              <>
                <MicOff className="w-4 h-4 animate-bounce" />
                <span>STOP & SEARCH</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-gold-400" />
                <span className="hidden sm:inline">Voice Search</span>
              </>
            )}
          </button>

          {/* Add New Customer Button */}
          <button
            onClick={onOpenNewCustomerModal}
            className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs sm:text-sm shadow-gold-glow border border-gold-300 transition-all flex-shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Customer</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Voice Search Feedback Banner */}
        {isVoiceSearching && (
          <div className="bg-purple-900/60 p-3 rounded-2xl border border-gold-400/40 text-center animate-pulse">
            <span className="text-[11px] text-gold-300 font-semibold uppercase tracking-wider block">
              Recording Voice... Tap STOP & SEARCH when done.
            </span>
            <p className="text-sm font-bold text-white mt-0.5">
              "{voiceSearchText || 'Listening...'}"
            </p>
          </div>
        )}
      </div>

      {/* Customer Cards List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-2 text-xs font-semibold text-purple-200/50 uppercase tracking-wider">
          <span>Matching Accounts ({filteredCustomers.length})</span>
          <span>Click to view details</span>
        </div>

        {filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredCustomers.map((cust) => {
              const custLoans = loans.filter((l) => l.customerId === cust.id);
              const activeLoans = custLoans.filter((l) => l.status === 'ACTIVE');

              let activeGoldGrams = 0;
              let activeSilverGrams = 0;
              let activeLoanTotal = 0;

              activeLoans.forEach((l) => {
                activeLoanTotal += l.loanAmount;
                l.ornaments.forEach((o) => {
                  if (o.metal === 'Gold') activeGoldGrams += o.weight;
                  else activeSilverGrams += o.weight;
                });
              });

              return (
                <div
                  key={cust.id}
                  onClick={() => onSelectCustomer(cust)}
                  className="cursor-pointer bg-[#130324]/80 hover:bg-[#1c0733] p-5 rounded-2xl border border-purple-500/15 hover:border-gold-400/40 shadow-card hover:shadow-card-hover transition-all duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Customer Info & Village */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                          {cust.name}
                        </h3>
                        {/* Village Pill */}
                        <span className="px-2.5 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-300 font-semibold text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gold-400" />
                          <span>{cust.village}</span>
                        </span>
                      </div>

                      {/* Diary & Page Reference */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-purple-200/70">
                        <span className="bg-purple-900/40 px-2.5 py-0.5 rounded-md border border-purple-500/20 text-purple-200 font-medium flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-gold-400/80" />
                          <span>
                            {cust.diary} • <strong className="text-gold-300">Page {cust.pageNumber}</strong>
                          </span>
                        </span>

                        {cust.mobile && (
                          <span className="flex items-center gap-1 text-purple-300/80">
                            <Phone className="w-3 h-3" />
                            <span>{cust.mobile}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Active Ornaments & Loans Summary */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-purple-500/10">
                      <div className="text-left sm:text-right">
                        {activeLoans.length > 0 ? (
                          <>
                            <div className="text-sm sm:text-base font-bold text-emerald-400">
                              ₹{activeLoanTotal.toLocaleString('en-IN')} Active
                            </div>
                            <div className="text-[11px] text-gold-300/90 font-medium flex items-center sm:justify-end gap-2 mt-0.5">
                              {activeGoldGrams > 0 && <span>🪙 {activeGoldGrams}g Gold</span>}
                              {activeSilverGrams > 0 && <span>🥈 {activeSilverGrams}g Silver</span>}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-purple-300/50 font-medium">
                            No Active Loans
                          </span>
                        )}
                      </div>

                      <div className="w-8 h-8 rounded-full bg-purple-900/40 group-hover:bg-gold-500 group-hover:text-purple-950 text-purple-300 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-[#130324]/40 rounded-3xl border border-dashed border-purple-500/20">
            <User className="w-10 h-10 text-purple-400/40 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-white">No customers found</h3>
            <p className="text-xs text-purple-200/60 max-w-sm mx-auto mb-4 mt-1">
              No matching records for "{searchQuery}". You can create a new customer now.
            </p>
            <button
              onClick={onOpenNewCustomerModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all"
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
