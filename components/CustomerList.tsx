'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Customer, Loan } from '@/lib/types';
import { ContinuousSpeechEngine } from '@/lib/speechEngine';
import {
  Search,
  Mic,
  MicOff,
  PlusCircle,
  User,
  BookOpen,
  MapPin,
  Phone,
  Gem,
  Coins,
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
  const speechEngineRef = useRef<ContinuousSpeechEngine | null>(null);

  // Voice Search Handler
  const startVoiceSearch = async () => {
    try {
      setIsVoiceSearching(true);
      setVoiceSearchText('Listening for customer name or village...');
      speechEngineRef.current = new ContinuousSpeechEngine('en-IN');
      await speechEngineRef.current.start({
        onInterimResult: (transcript) => {
          setVoiceSearchText(transcript);
          setSearchQuery(transcript);
        },
        onFinalResult: (transcript) => {
          setVoiceSearchText(transcript);
          setSearchQuery(transcript);
        },
        onError: (err) => {
          console.warn('Voice search error:', err);
          setIsVoiceSearching(false);
        },
      });
    } catch (e) {
      console.warn('Voice search start error:', e);
      setIsVoiceSearching(false);
    }
  };

  const stopVoiceSearch = () => {
    if (speechEngineRef.current) {
      const finalResult = speechEngineRef.current.stop();
      if (finalResult) {
        setSearchQuery(finalResult);
      }
    }
    setIsVoiceSearching(false);
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
    <div className="space-y-6">
      {/* Search Bar & Primary Actions */}
      <div className="bg-purple-950/80 p-5 rounded-3xl border border-purple-800 shadow-royal space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or village (e.g. Ramesh, Vova, 142)..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-purple-900/90 border-2 border-purple-700/60 focus:border-gold-400 focus:outline-none text-white placeholder-purple-300 font-bold text-base sm:text-lg transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs bg-purple-800 hover:bg-purple-700 text-purple-200 px-2 py-1 rounded-md"
              >
                Clear
              </button>
            )}
          </div>

          {/* Central Voice Search Button */}
          <button
            onClick={isVoiceSearching ? stopVoiceSearch : startVoiceSearch}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm sm:text-base border-2 transition-all transform active:scale-95 ${
              isVoiceSearching
                ? 'bg-rose-600 border-gold-300 text-white shadow-[0_0_25px_rgba(225,29,72,0.6)] animate-pulse'
                : 'bg-gradient-to-r from-purple-700 via-purple-600 to-gold-500 hover:from-purple-600 hover:to-gold-400 text-white border-gold-400/50 shadow-purple-glow'
            }`}
          >
            {isVoiceSearching ? (
              <>
                <MicOff className="w-5 h-5 animate-bounce" />
                <span>STOP LISTENING</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-gold-200" />
                <span>Voice Search (બોલીને શોધો)</span>
              </>
            )}
          </button>

          {/* Add New Customer Button */}
          <button
            onClick={onOpenNewCustomerModal}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-black text-sm sm:text-base shadow-gold-glow border border-gold-300 transition-all active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ New Customer</span>
          </button>
        </div>

        {/* Voice Search Transcript Banner if active */}
        {isVoiceSearching && (
          <div className="bg-purple-900/90 p-3 rounded-2xl border border-gold-400 text-center animate-pulse">
            <span className="text-xs text-gold-300 font-bold uppercase tracking-wider block mb-1">
              🎙️ Continuous Voice Search Active (Speak name or village):
            </span>
            <p className="text-base font-extrabold text-white">
              "{voiceSearchText || 'Listening...'}"
            </p>
          </div>
        )}
      </div>

      {/* Customer Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
          <span>Matching Accounts ({filteredCustomers.length})</span>
          <span>Click any customer to open account</span>
        </div>

        {filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredCustomers.map((cust) => {
              // Customer's loans and ornaments
              const custLoans = loans.filter((l) => l.customerId === cust.id);
              const activeLoans = custLoans.filter((l) => l.status === 'ACTIVE');
              const closedLoans = custLoans.filter((l) => l.status === 'CLOSED');

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
                  className="cursor-pointer bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 p-5 rounded-3xl border border-purple-800 hover:border-gold-400 shadow-royal transition-all group hover:scale-[1.01]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Name, Village & Diary Reference */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-gold-300 transition-colors">
                          {cust.name}
                        </h3>
                        {/* Village Badge (Crucial for disambiguating duplicate names) */}
                        <span className="px-3 py-1 rounded-full bg-gold-500/20 border border-gold-400/40 text-gold-300 font-extrabold text-xs tracking-wider flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Village: {cust.village}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-purple-200">
                        {/* Diary & Page Reference */}
                        <span className="bg-purple-850 px-2.5 py-1 rounded-lg border border-purple-700 text-purple-100 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-gold-400" />
                          <span>
                            {cust.diary} • <strong className="text-gold-300">Page {cust.pageNumber}</strong>
                          </span>
                        </span>

                        {cust.mobile && (
                          <span className="flex items-center gap-1 text-purple-300">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{cust.mobile}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Active Ornaments & Loan Summary */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-purple-800">
                      <div className="text-left sm:text-right">
                        {activeLoans.length > 0 ? (
                          <>
                            <div className="text-base sm:text-lg font-black text-emerald-300">
                              ₹{activeLoanTotal.toLocaleString('en-IN')} Active
                            </div>
                            <div className="text-xs text-gold-300 font-bold flex items-center sm:justify-end gap-2 mt-0.5">
                              {activeGoldGrams > 0 && <span>🪙 {activeGoldGrams}g Gold</span>}
                              {activeSilverGrams > 0 && <span>🥈 {activeSilverGrams}g Silver</span>}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs font-bold text-purple-400 bg-purple-900/60 px-3 py-1 rounded-full">
                            No Active Loans ({closedLoans.length} Closed in History)
                          </div>
                        )}
                      </div>

                      <div className="w-10 h-10 rounded-2xl bg-purple-900 group-hover:bg-gold-500 group-hover:text-purple-950 text-gold-300 flex items-center justify-center transition-all">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-purple-950/40 rounded-3xl border-2 border-dashed border-purple-800">
            <User className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No customers found</h3>
            <p className="text-xs text-purple-300 max-w-sm mx-auto mb-4">
              No matching records found for "{searchQuery}". You can add this customer now.
            </p>
            <button
              onClick={onOpenNewCustomerModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-black text-sm shadow-gold-glow transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Customer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
