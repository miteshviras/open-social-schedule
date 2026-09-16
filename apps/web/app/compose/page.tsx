'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PenSquare,
  Clock,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Globe,
  Share2,
} from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  status: string;
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

export default function ComposePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [canonicalContent, setCanonicalContent] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'canonical' | string>('canonical');

  // Scheduling options
  const [isPublishNow, setIsPublishNow] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    return d.toISOString().slice(0, 16);
  });

  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/social-accounts');
        if (res.ok) {
          const data: SocialAccount[] = await res.json();
          setAccounts(data);
          if (data.length > 0) {
            setSelectedAccountIds([data[0].id]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id));

  // Platform limits validation
  const hasX = selectedAccounts.some((a) => a.provider === 'x');
  const xContent = overrides[selectedAccounts.find((a) => a.provider === 'x')?.id || ''] ?? canonicalContent;
  const isXOverLimit = hasX && xContent.length > 280;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedAccountIds.length === 0) {
      setErrorMsg('Please select at least one social channel to publish to.');
      return;
    }

    if (!canonicalContent.trim()) {
      setErrorMsg('Post content cannot be empty.');
      return;
    }

    if (isXOverLimit) {
      setErrorMsg('Your post for X exceeds the 280 character limit. Add a tailored override for X.');
      return;
    }

    try {
      setSubmitting(true);
      const publishAtUtc = isPublishNow
        ? new Date(Date.now() - 1000)
        : new Date(scheduleDate);

      const targets = selectedAccountIds.map((accId) => ({
        socialAccountId: accId,
        publishAtUtc: publishAtUtc.toISOString(),
        timezone,
        contentOverride: overrides[accId]?.trim() || undefined,
      }));

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalContent,
          targets,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create scheduled post.');
      }

      router.push('/queue');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Compose Post</h2>
        <p className="text-sm text-slate-500 mt-1">
          Create canonical content, set platform-specific overrides, and schedule across networks.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Channel Selector */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 shadow-xs">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Select Publishing Channels
          </label>
          {accounts.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">
              No connected accounts found.{' '}
              <a href="/accounts" className="text-blue-600 font-semibold underline">
                Connect a channel first.
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {accounts.map((acc) => {
                const isSelected = selectedAccountIds.includes(acc.id);
                return (
                  <button
                    type="button"
                    key={acc.id}
                    onClick={() => toggleAccount(acc.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold text-white ${
                        acc.provider === 'linkedin'
                          ? 'bg-[#0077B5]'
                          : acc.provider === 'x'
                          ? 'bg-black'
                          : 'bg-indigo-600'
                      }`}
                    >
                      {acc.provider === 'linkedin' ? 'in' : acc.provider === 'x' ? '𝕏' : 'M'}
                    </span>
                    <span>{acc.displayName}</span>
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ml-1 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Tabs (Canonical vs Platform Overrides) */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Tabs bar */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-4 pt-3 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('canonical')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
                activeTab === 'canonical'
                  ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Canonical Content
            </button>

            {selectedAccounts.map((acc) => (
              <button
                type="button"
                key={acc.id}
                onClick={() => setActiveTab(acc.id)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
                  activeTab === acc.id
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{acc.displayName} Override</span>
                {overrides[acc.id] && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 space-y-3">
            {activeTab === 'canonical' ? (
              <>
                <textarea
                  rows={7}
                  value={canonicalContent}
                  onChange={(e) => setCanonicalContent(e.target.value)}
                  placeholder="What's happening? Write your canonical social post here..."
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400"
                />

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Character count: {canonicalContent.length}</span>
                  {hasX && (
                    <span className={canonicalContent.length > 280 ? 'text-rose-600 font-bold' : ''}>
                      X Limit: {canonicalContent.length}/280 {canonicalContent.length > 280 && '(Exceeded - add X override)'}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-slate-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                  Customizing content for{' '}
                  <strong>{accounts.find((a) => a.id === activeTab)?.displayName}</strong>. If left blank,
                  the canonical post will be used.
                </div>
                <textarea
                  rows={6}
                  value={overrides[activeTab] || ''}
                  onChange={(e) =>
                    setOverrides({ ...overrides, [activeTab]: e.target.value })
                  }
                  placeholder={`Optional override for ${accounts.find((a) => a.id === activeTab)?.displayName}...`}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed text-slate-900"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Length: {(overrides[activeTab] || '').length}</span>
                  {accounts.find((a) => a.id === activeTab)?.provider === 'x' && (
                    <span className={(overrides[activeTab] || '').length > 280 ? 'text-rose-600 font-bold' : ''}>
                      {(overrides[activeTab] || '').length}/280
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Scheduling Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Timing & Schedule
            </label>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-700 font-medium cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublishNow}
                  onChange={(e) => setIsPublishNow(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Publish Now (Instant Queue)
              </label>
            </div>
          </div>

          {!isPublishNow && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1.5">
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Target Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || isXOverLimit}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition"
          >
            {isPublishNow ? <Send className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {submitting ? 'Saving...' : isPublishNow ? 'Publish Immediately' : 'Confirm Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}
