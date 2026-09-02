'use client';

import React from 'react';
import { ActivityLog } from '@/lib/types';
import { X, History } from 'lucide-react';

interface ActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
}

export const ActivityHistoryModal: React.FC<ActivityHistoryModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-zinc-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl my-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Activity & Audit History</h2>
            <p className="text-xs text-zinc-500 font-medium">
              Chronological audit trail of customer and loan operations.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {logs.length > 0 ? (
            logs.map((log) => {
              const isCreate = log.action === 'CREATE_CUSTOMER';
              const isClose = log.action === 'CLOSE_LOAN';
              const isAdd = log.action === 'ADD_LOAN';

              return (
                <div
                  key={log.id}
                  className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider border ${
                          isClose
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isCreate
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isAdd
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <strong className="text-sm font-semibold text-zinc-900">
                        {log.customerName}
                      </strong>
                      <span className="text-zinc-500">({log.village})</span>
                    </div>

                    <p className="text-zinc-700 font-normal">{log.details}</p>
                  </div>

                  <div className="text-left sm:text-right text-zinc-400 text-[11px] flex-shrink-0">
                    <div>{new Date(log.timestamp).toLocaleDateString('en-IN')}</div>
                    <div className="text-zinc-400">{new Date(log.timestamp).toLocaleTimeString('en-IN')}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-zinc-400">
              No activity logs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
