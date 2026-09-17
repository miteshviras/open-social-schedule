'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Send,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
} from 'lucide-react';
import { DeleteConfirmModal, type DeleteModalTarget } from '../../components/DeleteConfirmModal';

interface Attempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  finishedAt?: string;
  outcome: string;
  errorCode?: string;
  errorMessageSafe?: string;
}

interface PostTarget {
  id: string;
  publishAtUtc: string;
  timezone: string;
  status: string;
  contentOverride?: string;
  attemptCount: number;
  post: {
    id: string;
    canonicalContent: string;
  };
  socialAccount: {
    id: string;
    provider: string;
    displayName: string;
    avatarUrl?: string;
  };
  attempts?: Attempt[];
}

export default function QueuePage() {
  const [targets, setTargets] = useState<PostTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalTarget | null>(null);
  const [deletingMode, setDeletingMode] = useState<'permanent' | 'cancel' | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function loadTargets() {
    try {
      setLoading(true);
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/post-targets${query}`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTargets();
  }, [filter]);

  async function handlePublishNow(id: string) {
    try {
      const res = await fetch(`/api/post-targets/${id}/publish`, { method: 'POST' });
      if (res.ok) await loadTargets();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConfirmDelete(mode: 'permanent' | 'cancel') {
    if (!deleteTarget) return;
    try {
      setDeletingMode(mode);
      const url =
        mode === 'permanent'
          ? `/api/post-targets/${deleteTarget.id}?permanent=true`
          : `/api/post-targets/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete target');
      }
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      setToast({
        type: 'success',
        message:
          mode === 'permanent'
            ? `Target #${deletedId.slice(-8)} permanently deleted.`
            : `Target #${deletedId.slice(-8)} schedule canceled.`,
      });
      await loadTargets();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Error deleting target.' });
    } finally {
      setDeletingMode(null);
    }
  }

  async function toggleDetails(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    try {
      const res = await fetch(`/api/post-targets/${id}`);
      if (res.ok) {
        const full = await res.json();
        setTargets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, attempts: full.attempts } : t))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Schedule Queue</h2>
          <p className="text-sm text-slate-500 mt-1">
            Track queued jobs, inspect delivery attempts, and manage scheduled publishing.
          </p>
        </div>

        <button
          onClick={loadTargets}
          className="p-2 self-start text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs - scrollable on mobile */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'all', label: 'All Targets' },
          { id: 'scheduled', label: 'Scheduled' },
          { id: 'publishing', label: 'Publishing' },
          { id: 'published', label: 'Published' },
          { id: 'failed', label: 'Failed' },
          { id: 'canceled', label: 'Canceled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap flex-shrink-0 ${
              filter === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Target Items List */}
      {targets.length === 0 ? (
        <div className="bg-white p-10 sm:p-12 text-center rounded-xl border border-slate-200 space-y-2">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No post targets in this view</p>
          <p className="text-xs text-slate-400">
            Compose a post or adjust your status filter above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {targets.map((target) => {
            const isExpanded = expandedId === target.id;
            const content = target.contentOverride || target.post.canonicalContent;

            return (
              <div
                key={target.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Provider & Content */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          target.socialAccount.provider === 'linkedin'
                            ? 'bg-[#0077B5]'
                            : target.socialAccount.provider === 'x'
                            ? 'bg-black'
                            : 'bg-indigo-600'
                        }`}
                      >
                        {target.socialAccount.provider === 'linkedin'
                          ? 'in'
                          : target.socialAccount.provider === 'x'
                          ? '𝕏'
                          : 'M'}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {target.socialAccount.displayName}
                      </span>
                      {target.contentOverride && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Tailored Override
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/queue/${target.id}`}
                      className="block group"
                      title="View scheduled target details"
                    >
                      <p className="text-sm text-slate-800 group-hover:text-blue-600 transition leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
                        {content}
                      </p>
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        Due: {new Date(target.publishAtUtc).toLocaleString()} ({target.timezone})
                      </span>
                      {target.attemptCount > 0 && (
                        <span>Attempts: {target.attemptCount}</span>
                      )}
                    </div>
                  </div>

                  {/* Right (Desktop) / Bottom Row (Mobile): Status & Action Buttons */}
                  <div className="flex flex-row sm:flex-col sm:items-end justify-between items-center gap-2.5 flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        target.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : target.status === 'publishing'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          : target.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : target.status === 'retryable_failure'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : target.status === 'canceled'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}
                    >
                      {target.status.toUpperCase()}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Show / View Page Link */}
                      <Link
                        href={`/queue/${target.id}`}
                        className="p-1.5 sm:px-2 sm:py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        title="Show target details"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">Show</span>
                      </Link>

                      {/* Edit Page Link */}
                      <Link
                        href={`/queue/${target.id}/edit`}
                        className="p-1.5 sm:px-2 sm:py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        title="Edit scheduled target"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </Link>

                      {/* Delete Button (Opens Confirmation Modal) */}
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            id: target.id,
                            provider: target.socialAccount.provider,
                            displayName: target.socialAccount.displayName,
                            username: undefined,
                            publishAtUtc: target.publishAtUtc,
                            timezone: target.timezone,
                            status: target.status,
                            content,
                            attemptCount: target.attemptCount,
                          })
                        }
                        className="p-1.5 sm:px-2 sm:py-1 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Delete or cancel target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>

                      {target.status === 'scheduled' && (
                        <button
                          onClick={() => handlePublishNow(target.id)}
                          className="px-2.5 sm:px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Publish immediately"
                        >
                          <Send className="w-3 h-3" />
                          <span className="hidden xs:inline">Publish</span> Now
                        </button>
                      )}

                      {(target.status === 'failed' || target.status === 'retryable_failure') && (
                        <button
                          onClick={() => handlePublishNow(target.id)}
                          className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}

                      <button
                        onClick={() => toggleDetails(target.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Audit history"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Attempt Logs Accordion */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3 sm:p-4 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Publish Execution History
                    </div>

                    {!target.attempts || target.attempts.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No attempts recorded yet. Worker will claim this job when due.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {target.attempts.map((att) => (
                          <div
                            key={att.id}
                            className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                Attempt #{att.attemptNumber}
                              </span>
                              <span
                                className={`font-bold ${
                                  att.outcome === 'success' ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {att.outcome.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px]">
                              Started: {new Date(att.startedAt).toLocaleString()}
                            </p>
                            {att.errorMessageSafe && (
                              <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 font-mono text-[11px] break-words">
                                {att.errorMessageSafe}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        target={deleteTarget}
        deletingMode={deletingMode}
      />
    </div>
  );
}
