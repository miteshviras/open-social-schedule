'use client';

import React, { useEffect, useRef } from 'react';
import {
  Trash2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  X,
  ShieldAlert,
} from 'lucide-react';

export interface DeleteModalTarget {
  id: string;
  provider: string;
  displayName: string;
  username?: string;
  publishAtUtc: string;
  timezone: string;
  status: string;
  content: string;
  attemptCount?: number;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'permanent' | 'cancel') => Promise<void>;
  target: DeleteModalTarget | null;
  deletingMode: 'permanent' | 'cancel' | null;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  target,
  deletingMode,
}: DeleteConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deletingMode) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, deletingMode, onClose]);

  if (!isOpen || !target) return null;

  const isCanceled = target.status === 'canceled';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deletingMode) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-5 transform transition-all animate-in zoom-in-95 duration-150"
      >
        {/* Header with Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Confirm Target Deletion
              </h3>
              <p className="text-xs text-slate-500">
                Please confirm before removing this scheduled post.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={Boolean(deletingMode)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Summary Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                  target.provider === 'linkedin'
                    ? 'bg-[#0077B5]'
                    : target.provider === 'x'
                    ? 'bg-black'
                    : 'bg-indigo-600'
                }`}
              >
                {target.provider === 'linkedin'
                  ? 'in'
                  : target.provider === 'x'
                  ? '𝕏'
                  : 'M'}
              </span>
              <span className="font-bold text-slate-900">{target.displayName}</span>
              {target.username && (
                <span className="text-slate-400">@{target.username}</span>
              )}
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                target.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : target.status === 'failed'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : target.status === 'canceled'
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {target.status}
            </span>
          </div>

          <p className="text-slate-700 leading-relaxed italic line-clamp-3 bg-white p-2.5 rounded-lg border border-slate-100">
            "{target.content}"
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 text-[11px] pt-0.5">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Due: {new Date(target.publishAtUtc).toLocaleString()} ({target.timezone})
            </span>
            <span className="font-mono text-slate-400">
              #{target.id.slice(-8)}
            </span>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Permanent Delete</strong> will completely erase this post and its execution history from the database. <strong>Cancel Schedule</strong> keeps the record for auditing.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(deletingMode)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            Keep Post (Back)
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {!isCanceled && (
              <button
                type="button"
                onClick={() => onConfirm('cancel')}
                disabled={Boolean(deletingMode)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingMode === 'cancel' ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-amber-600" />
                    Cancel Schedule Only
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onConfirm('permanent')}
              disabled={Boolean(deletingMode)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {deletingMode === 'permanent' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Permanently Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
