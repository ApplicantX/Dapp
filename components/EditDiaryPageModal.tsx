'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '@/lib/types';
import { X, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 shadow-royal">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-800 hover:bg-purple-700 text-purple-200 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Move Diary / Page</h3>
            <p className="text-xs text-purple-200 font-medium">
              Customer: <strong className="text-gold-300">{customer.name}</strong> ({customer.village})
            </p>
          </div>
        </div>

        <div className="p-3 bg-purple-900/60 rounded-xl border border-purple-700 mb-4 text-xs text-purple-200">
          Current reference: <strong>{customer.diary}</strong>, Page <strong>{customer.pageNumber}</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-200">New / Target Diary</label>
            <input
              type="text"
              required
              value={diary}
              onChange={(e) => setDiary(e.target.value)}
              placeholder="e.g. Diary 2026"
              className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border border-purple-700 text-white font-bold text-sm focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gold-300">New Page Number (પાના નંબર)</label>
            <input
              type="text"
              required
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="e.g. 156"
              className="w-full px-3 py-2.5 rounded-xl bg-purple-900 border-2 border-gold-500 text-gold-300 font-black text-lg focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-purple-950 font-black text-xs shadow-gold-glow transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Update Reference</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
