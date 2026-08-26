'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '@/lib/types';
import { X, BookOpen, CheckCircle2 } from 'lucide-react';

interface EditDiaryPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  diaries: string[];
  onSaveDiaryPage: (customerId: string, newDiary: string, newPageNumber: string) => void;
}

export const EditDiaryPageModal: React.FC<EditDiaryPageModalProps> = ({
  isOpen,
  onClose,
  customer,
  diaries,
  onSaveDiaryPage,
}) => {
  const [diary, setDiary] = useState('');
  const [pageNumber, setPageNumber] = useState('');

  useEffect(() => {
    if (customer) {
      setDiary(customer.diary);
      setPageNumber(customer.pageNumber);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diary.trim() || !pageNumber.trim()) {
      alert('Please enter both diary name and page number.');
      return;
    }

    onSaveDiaryPage(customer.id, diary.trim(), pageNumber.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0114]/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#130324] border border-purple-500/20 rounded-3xl p-6 shadow-modal">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-900/40 hover:bg-purple-800 text-purple-200 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Move Diary / Page</h3>
            <p className="text-xs text-purple-200/60 font-medium">
              Customer: <strong className="text-gold-300">{customer.name}</strong> ({customer.village})
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#1c0733] rounded-2xl border border-purple-500/15 mb-4 text-xs text-purple-200/70">
          Current reference: <strong>{customer.diary}</strong>, Page <strong>{customer.pageNumber}</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-purple-200/80">New / Target Diary</label>
            <input
              type="text"
              required
              value={diary}
              onChange={(e) => setDiary(e.target.value)}
              placeholder="e.g. Diary 2026"
              className="w-full px-3 py-2 rounded-xl bg-[#1c0733] border border-purple-500/20 text-white font-semibold text-xs focus:outline-none focus:border-gold-400/60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gold-300">New Page Number (પાના નંબર)</label>
            <input
              type="text"
              required
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="e.g. 156"
              className="w-full px-3 py-2 rounded-xl bg-[#1c0733] border border-gold-500/40 text-gold-300 font-bold text-base focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-purple-200/70 hover:text-white text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold-500 hover:bg-gold-400 text-purple-950 font-bold text-xs shadow-gold-glow transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Update Reference</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
