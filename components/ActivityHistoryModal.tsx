'use client';

import React from 'react';
import { ActivityLog } from '@/lib/types';
import { X, Clock, User, ShieldCheck, History } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-royal my-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-purple-800 hover:bg-purple-700 text-purple-200 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/50 flex items-center justify-center text-gold-300">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Activity & Audit History</h2>
            <p className="text-xs text-purple-200 font-medium">
              Complete chronological audit trail of all customer and loan updates.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {logs.length > 0 ? (
            logs.map((log) => {
              const isCreate = log.action === 'CREATE_CUSTOMER';
              const isClose = log.action === 'CLOSE_LOAN';
              const isAdd = log.action === 'ADD_LOAN';
              const isMove = log.action === 'MOVE_DIARY_PAGE';

              return (
                <div
                  key={log.id}
                  className="bg-purple-900/60 p-4 rounded-2xl border border-purple-700/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-black uppercase text-[10px] tracking-wider border ${
                          isClose
                            ? 'bg-rose-900/60 text-rose-300 border-rose-500/50'
                            : isCreate
                            ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50'
                            : isAdd
                            ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                            : 'bg-purple-800 text-purple-200 border-purple-600'
                        }`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <strong className="text-sm font-bold text-white">
                        {log.customerName}
                      </strong>
                      <span className="text-purple-300">({log.village})</span>
                    </div>

                    <p className="text-purple-100 font-medium">{log.details}</p>
                  </div>

                  <div className="text-left sm:text-right text-purple-300 text-[11px] flex-shrink-0 font-medium">
                    <div>{new Date(log.timestamp).toLocaleDateString('en-IN')}</div>
                    <div className="text-purple-400">{new Date(log.timestamp).toLocaleTimeString('en-IN')}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-purple-300">
              No activity logs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
