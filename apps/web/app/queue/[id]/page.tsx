'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Send,
  RefreshCw,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  History,
  ShieldCheck,
  Share2,
  FileText,
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
  providerRequestId?: string;
}

interface TargetDetail {
  id: string;
  postId: string;
  publishAtUtc: string;
  timezone: string;
  status: string;
  contentOverride?: string;
  attemptCount: number;
  publishedAt?: string;
  providerPostId?: string;
  createdAt: string;
  updatedAt: string;
  post: {
    id: string;
    canonicalContent: string;
    createdAt: string;
  };
  socialAccount: {
    id: string;
    provider: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
    status: string;
  };
  attempts: Attempt[];
}

export default function QueueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [target, setTarget] = useState<TargetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function loadDetails() {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/post-targets/${id}`);
      if (!res.ok) {
        throw new Error('Target not found');
      }
      const data = await res.json();
      setTarget(data);
    } catch (err: any) {
      console.error(err);
      setNotice({ type: 'error', message: err.message || 'Failed to load target details.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [id]);

  async function handlePublishNow() {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/post-targets/${id}/publish`, { method: 'POST' });
      if (res.ok) {
        setNotice({ type: 'success', message: 'Publishing triggered! The worker is processing this job.' });
        await loadDetails();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: err.error || 'Failed to trigger publishing.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Error triggering publish.' });
    } finally {
      setActionLoading(false);
    }
  }

  function handleCopyContent(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading scheduled target details...</p>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Scheduled Target Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested target ID <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{id}</code> may have been deleted or does not exist.
        </p>
        <Link
          href="/queue"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Schedule Queue
        </Link>
      </div>
    );
  }

  const effectiveContent = target.contentOverride || target.post.canonicalContent;
  const isTwitter = target.socialAccount.provider === 'x';
  const charLimit = isTwitter ? 280 : 3000;
  const charCount = effectiveContent.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/queue"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Back to Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Scheduled Post Target
              </h2>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                #{target.id.slice(-8)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Inspect delivery status, execution attempts, and manage scheduled publishing.
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Button */}
          <Link
            href={`/queue/${target.id}/edit`}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            Edit Target
          </Link>

          {/* Publish Now / Retry Button */}
          {(target.status === 'scheduled' || target.status === 'failed' || target.status === 'retryable_failure') && (
            <button
              onClick={handlePublishNow}
              disabled={actionLoading}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
                target.status === 'scheduled'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {target.status === 'scheduled' ? (
                <>
                  <Send className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  Publish Now
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  Retry Publish
                </>
              )}
            </button>
          )}

          {/* Delete Button */}
          <Link
            href={`/queue/${target.id}/delete`}
            className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            Delete
          </Link>
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Channel Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-xs flex-shrink-0 ${
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
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {target.socialAccount.displayName}
              </h3>
              {target.socialAccount.username && (
                <span className="text-xs text-slate-400">
                  @{target.socialAccount.username}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 capitalize">
              {target.socialAccount.provider} Channel • Account status: {target.socialAccount.status}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              target.status === 'published'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : target.status === 'publishing'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                : target.status === 'failed'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : target.status === 'retryable_failure'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : target.status === 'canceled'
                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                target.status === 'published'
                  ? 'bg-emerald-500'
                  : target.status === 'publishing'
                  ? 'bg-blue-500 animate-ping'
                  : target.status === 'failed'
                  ? 'bg-rose-500'
                  : target.status === 'retryable_failure'
                  ? 'bg-amber-500'
                  : target.status === 'canceled'
                  ? 'bg-slate-400'
                  : 'bg-blue-500'
              }`}
            />
            {target.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Content & Execution History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Post Content
                </h4>
                {target.contentOverride ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Platform Override
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    Canonical Post
                  </span>
                )}
              </div>

              <button
                onClick={() => handleCopyContent(effectiveContent)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words font-normal">
                {effectiveContent}
              </p>
            </div>

            {/* Character Count Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>
                Length: <strong className={charCount > charLimit ? 'text-rose-600' : 'text-slate-700'}>{charCount}</strong> / {charLimit} chars
              </span>
              {charCount > charLimit && (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Exceeds {target.socialAccount.provider} limit
                </span>
              )}
            </div>
          </div>

          {/* Audit & Execution History */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Execution & Delivery History
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {target.attempts.length} total attempt(s)
              </span>
            </div>

            {target.attempts.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-500">
                  No delivery attempts recorded yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  The background worker will claim and execute this publication when due.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {target.attempts.map((att) => (
                  <div
                    key={att.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          Attempt #{att.attemptNumber}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(att.startedAt).toLocaleString()}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          att.outcome === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {att.outcome === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {att.outcome.toUpperCase()}
                      </span>
                    </div>

                    {att.errorMessageSafe && (
                      <div className="p-3 bg-rose-50/80 rounded-lg border border-rose-200 text-rose-800 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Error Code: {att.errorCode || 'UNKNOWN'}</span>
                          {att.providerRequestId && (
                            <span className="font-mono text-[10px]">Req: {att.providerRequestId}</span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] break-words">
                          {att.errorMessageSafe}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Timing, Channel & Technical Metadata */}
        <div className="space-y-6">
          {/* Timing & Schedule */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Schedule & Timing
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Due Date & Time</span>
                <span className="font-bold text-slate-800 text-sm">
                  {new Date(target.publishAtUtc).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Target Timezone</span>
                <span className="font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block mt-0.5">
                  {target.timezone}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">UTC Timestamp</span>
                <span className="font-mono text-slate-600 text-[11px] break-all">
                  {target.publishAtUtc}
                </span>
              </div>

              {target.publishedAt && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Published At</span>
                  <span className="font-bold text-emerald-700">
                    {new Date(target.publishedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {target.providerPostId && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Remote Post ID</span>
                  <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded inline-block mt-0.5">
                    {target.providerPostId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Technical IDs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              Metadata & Identifiers
            </h4>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Target ID</span>
                <code className="font-mono text-[11px] text-slate-700 select-all break-all">
                  {target.id}
                </code>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Parent Post ID</span>
                <code className="font-mono text-[11px] text-slate-700 select-all break-all">
                  {target.postId}
                </code>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Created At</span>
                <span className="text-slate-600">
                  {new Date(target.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Last Updated</span>
                <span className="text-slate-600">
                  {new Date(target.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
