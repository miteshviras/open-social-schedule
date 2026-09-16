'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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

  async function handleCancel(id: string) {
    if (!confirm('Cancel this scheduled publication?')) return;
    try {
      const res = await fetch(`/api/post-targets/${id}`, { method: 'DELETE' });
      if (res.ok) await loadTargets();
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleDetails(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Fetch attempt details if not present
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
    <div className="space-y-8">
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

      {/* Filter Tabs */}
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
            className={`px-3.5 py-1.5 rounded-lg transition ${
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
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-2">
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
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Provider & Content */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${
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

                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap line-clamp-3">
                      {content}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Due: {new Date(target.publishAtUtc).toLocaleString()} ({target.timezone})
                      </span>
                      {target.attemptCount > 0 && (
                        <span>Attempts: {target.attemptCount}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Status & Action Buttons */}
                  <div className="flex flex-col sm:items-end gap-2.5 flex-shrink-0">
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

                    <div className="flex items-center gap-2">
                      {target.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handlePublishNow(target.id)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            title="Publish immediately"
                          >
                            <Send className="w-3 h-3" />
                            Publish Now
                          </button>
                          <button
                            onClick={() => handleCancel(target.id)}
                            className="px-3 py-1.5 bg-slate-50 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {(target.status === 'failed' || target.status === 'retryable_failure') && (
                        <button
                          onClick={() => handlePublishNow(target.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}

                      <button
                        onClick={() => toggleDetails(target.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 transition"
                        title="Audit history"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Attempt Logs Accordion */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/50 p-4 rounded-lg">
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
                              <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 font-mono text-[11px]">
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
    </div>
  );
}
