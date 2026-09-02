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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl space-y-4">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Move Diary / Page</h3>
            <p className="text-xs text-zinc-500 font-medium">
              Customer: <strong className="text-purple-700">{customer.name}</strong> ({customer.village})
            </p>
          </div>
        </div>

        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600">
          Current reference: <strong>{customer.diary}</strong>, Page <strong>{customer.pageNumber}</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">New / Target Diary</label>
            <input
              type="text"
              required
              value={diary}
              onChange={(e) => setDiary(e.target.value)}
              placeholder="e.g. Diary 2026"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium text-xs focus:bg-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-purple-700">New Page Number (પાના નંબર)</label>
            <input
              type="text"
              required
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="e.g. 156"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-purple-200 text-purple-700 font-bold text-base focus:bg-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-zinc-500 hover:text-zinc-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
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
