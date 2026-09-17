'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit3,
  AlertTriangle,
  Globe,
  Sparkles,
} from 'lucide-react';

interface TargetDetail {
  id: string;
  postId: string;
  publishAtUtc: string;
  timezone: string;
  status: string;
  contentOverride?: string;
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

const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
];

export default function EditQueueTargetPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [target, setTarget] = useState<TargetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [content, setContent] = useState('');
  const [publishDateTime, setPublishDateTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [isOverrideOnly, setIsOverrideOnly] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/post-targets/${id}`);
        if (!res.ok) throw new Error('Target not found');
        const data: TargetDetail = await res.json();
        setTarget(data);

        // Pre-fill form fields
        const currentContent = data.contentOverride || data.post.canonicalContent;
        setContent(currentContent);
        setIsOverrideOnly(Boolean(data.contentOverride));
        setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

        // Convert UTC date to local ISO string formatted for datetime-local input
        const dateObj = new Date(data.publishAtUtc);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        setPublishDateTime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      } catch (err: any) {
        setError(err.message || 'Failed to load post target for editing.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError('Post content cannot be empty.');
      return;
    }
    if (!publishDateTime) {
      setError('Please select a valid scheduled date and time.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Parse selected datetime into UTC Date
      const selectedDate = new Date(publishDateTime);
      if (isNaN(selectedDate.getTime())) {
        throw new Error('Invalid date selected.');
      }

      const payload: any = {
        publishAtUtc: selectedDate.toISOString(),
        timezone,
      };

      if (isOverrideOnly) {
        payload.contentOverride = content.trim();
      } else {
        payload.content = content.trim();
        payload.contentOverride = null; // Clear override to inherit canonical
      }

      // If target was previously failed, retryable_failure, or canceled, reset to scheduled
      if (target && (target.status === 'failed' || target.status === 'retryable_failure' || target.status === 'canceled')) {
        payload.status = 'scheduled';
      }

      const res = await fetch(`/api/post-targets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save changes.');
      }

      // Redirect back to Show page
      router.push(`/queue/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading target for editing...</p>
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
        <p className="text-sm text-slate-500">The target you are trying to edit does not exist.</p>
        <Link
          href="/queue"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Schedule Queue
        </Link>
      </div>
    );
  }

  const isTwitter = target.socialAccount.provider === 'x';
  const charLimit = isTwitter ? 280 : 3000;
  const charCount = content.length;
  const isOverLimit = charCount > charLimit;
  const willResetStatus =
    target.status === 'failed' ||
    target.status === 'retryable_failure' ||
    target.status === 'canceled';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/queue/${id}`}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Back to Details"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Edit Scheduled Post
              </h2>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                #{id.slice(-8)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Modify the copy, reschedule publication timing, or adjust timezone.
            </p>
          </div>
        </div>

        {/* Channel Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
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
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
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

      {/* Reset Status Notice */}
      {willResetStatus && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-900 text-xs sm:text-sm flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Status Reset Notice:</span> This post is currently{' '}
            <span className="font-mono uppercase font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200 text-[11px]">
              {target.status}
            </span>
            . Saving changes will automatically reset it to{' '}
            <span className="font-mono uppercase font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 text-[11px]">
              SCHEDULED
            </span>{' '}
            so the background publishing worker will claim and execute it when due.
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Post Content Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              Post Copy
            </label>
            <span
              className={`text-xs font-mono font-semibold ${
                isOverLimit ? 'text-rose-600' : 'text-slate-500'
              }`}
            >
              {charCount} / {charLimit} chars
            </span>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            placeholder="Write your post content here..."
            className={`w-full p-3.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 leading-relaxed transition ${
              isOverLimit
                ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                : 'border-slate-200 focus:ring-blue-100 focus:border-blue-500'
            }`}
            required
          />

          {isOverLimit && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Post copy exceeds {target.socialAccount.provider} maximum limit of {charLimit} characters.
            </p>
          )}

          {/* Override checkbox */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <input
              type="checkbox"
              id="isOverrideOnly"
              checked={isOverrideOnly}
              onChange={(e) => setIsOverrideOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="isOverrideOnly" className="text-xs text-slate-600 font-medium cursor-pointer">
              Apply as a platform-specific tailored override (keeps master post unchanged)
            </label>
          </div>
        </div>

        {/* Timing & Timezone Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Publication Timing
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DateTime Local */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={publishDateTime}
                onChange={(e) => setPublishDateTime(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                required
              />
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
              >
                {!COMMON_TIMEZONES.includes(timezone) && (
                  <option value={timezone}>{timezone} (Current)</option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/queue/${id}`}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving || isOverLimit}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-2 transition cursor-pointer ${
              saving || isOverLimit
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
