'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Trash2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  ShieldAlert,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { DeleteConfirmModal } from '../../../../components/DeleteConfirmModal';

interface TargetDetail {
  id: string;
  postId: string;
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
    username?: string;
  };
}

export default function DeleteQueueTargetPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [target, setTarget] = useState<TargetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<'permanent' | 'cancel' | null>(null);
  const [pendingConfirmMode, setPendingConfirmMode] = useState<'permanent' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/post-targets/${id}`);
        if (!res.ok) throw new Error('Target not found');
        const data: TargetDetail = await res.json();
        setTarget(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load post target for deletion.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  async function handleDelete(mode: 'permanent' | 'cancel') {
    try {
      setDeleting(mode);
      setError(null);

      const url =
        mode === 'permanent'
          ? `/api/post-targets/${id}?permanent=true`
          : `/api/post-targets/${id}`;

      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete target.');
      }

      // Redirect back to queue
      router.push('/queue');
    } catch (err: any) {
      setError(err.message || 'Failed to delete target.');
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading target details...</p>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Target Not Found</h2>
        <p className="text-sm text-slate-500">The requested post target does not exist or has already been deleted.</p>
        <Link
          href="/queue"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Queue
        </Link>
      </div>
    );
  }

  const effectiveContent = target.contentOverride || target.post.canonicalContent;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Back Link */}
      <div className="flex items-center gap-2">
        <Link
          href={`/queue/${id}`}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          title="Back to Details"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-xs font-semibold text-slate-400">Back to Target Details</span>
      </div>

      {/* Danger Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <Trash2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Delete Scheduled Target?
        </h2>
        <p className="text-xs sm:text-sm text-rose-800 max-w-md mx-auto">
          Please confirm your deletion preference for this scheduled post. You can permanently erase it or cancel its schedule while keeping the audit record.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-white text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Target Preview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
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
            {target.socialAccount.username && (
              <span className="text-[11px] text-slate-400">@{target.socialAccount.username}</span>
            )}
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              target.status === 'published'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : target.status === 'failed'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : target.status === 'canceled'
                ? 'bg-slate-100 text-slate-500'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {target.status.toUpperCase()}
          </span>
        </div>

        {/* Content Excerpt */}
        <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-4 leading-relaxed font-normal">
            {effectiveContent}
          </p>
        </div>

        {/* Metadata Details */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Due: {new Date(target.publishAtUtc).toLocaleString()} ({target.timezone})
          </span>
          <span className="font-mono text-slate-400 text-[11px]">
            Target #{target.id.slice(-8)}
          </span>
          {target.attemptCount > 0 && (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-semibold">
              {target.attemptCount} attempt(s) recorded
            </span>
          )}
        </div>
      </div>

      {/* Deletion Options */}
      <div className="space-y-3">
        {/* Option 1: Permanent Hard Delete */}
        <div className="p-4 rounded-xl border border-rose-200 bg-white hover:border-rose-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Permanently Delete Record
            </div>
            <p className="text-xs text-slate-500">
              Completely purges this target and all execution attempt logs from the database. This action cannot be undone.
            </p>
          </div>

          <button
            onClick={() => setPendingConfirmMode('permanent')}
            disabled={Boolean(deleting)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition flex-shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Permanent Delete
          </button>
        </div>

        {/* Option 2: Soft Cancel Schedule */}
        {target.status !== 'canceled' && (
          <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <XCircle className="w-4 h-4 text-amber-600" />
                Cancel Schedule Only (Keep History)
              </div>
              <p className="text-xs text-slate-500">
                Halts background publishing and marks the target as canceled while preserving the record for auditing.
              </p>
            </div>

            <button
              onClick={() => setPendingConfirmMode('cancel')}
              disabled={Boolean(deleting)}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition flex-shrink-0 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Schedule
            </button>
          </div>
        )}
      </div>

      {/* Safe Return Button */}
      <div className="flex justify-center pt-2">
        <Link
          href={`/queue/${id}`}
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          Keep Post & Return to Details
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {target && (
        <DeleteConfirmModal
          isOpen={Boolean(pendingConfirmMode)}
          onClose={() => setPendingConfirmMode(null)}
          onConfirm={handleDelete}
          target={{
            id: target.id,
            provider: target.socialAccount.provider,
            displayName: target.socialAccount.displayName,
            username: target.socialAccount.username,
            publishAtUtc: target.publishAtUtc,
            timezone: target.timezone,
            status: target.status,
            content: effectiveContent,
            attemptCount: target.attemptCount,
          }}
          deletingMode={deleting}
        />
      )}
    </div>
  );
}
