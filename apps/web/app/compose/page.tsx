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

  // AI Assistant generator state
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'thought-leadership' | 'punchy' | 'casual' | 'educational'>('thought-leadership');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<{
    topic: string;
    tone: string;
    canonicalContent: string;
    variations: { linkedin: string; x: string };
    suggestedHashtags: string[];
    characterCounts: { linkedin: number; x: number };
  } | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  async function handleAiGenerate() {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          tone: aiTone,
          platforms: ['linkedin', 'x'],
        }),
      });
      if (!res.ok) throw new Error('Failed to generate draft with AI.');
      const data = await res.json();
      setAiDrafts(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Generation error');
    } finally {
      setAiGenerating(false);
    }
  }

  function applyAiDrafts() {
    if (!aiDrafts) return;
    setCanonicalContent(aiDrafts.variations.linkedin || aiDrafts.canonicalContent);
    const updatedOverrides = { ...overrides };
    const xAcc = accounts.find((a) => a.provider === 'x');
    if (xAcc && aiDrafts.variations.x) {
      updatedOverrides[xAcc.id] = aiDrafts.variations.x;
    }
    setOverrides(updatedOverrides);
    setAiNotice('Draft content applied to editor! Review below and click "Confirm Schedule" when ready.');
    setShowAiAssistant(false);
    setTimeout(() => setAiNotice(null), 8000);
  }

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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Compose Post</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create canonical content, set platform-specific overrides, or generate with AI via MCP.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAiAssistant((prev) => !prev)}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs hover:from-indigo-700 hover:to-blue-700 transition"
        >
          <Sparkles className="w-4 h-4 text-indigo-200" />
          {showAiAssistant ? 'Hide AI Assistant' : 'Generate with AI'}
        </button>
      </div>

      {aiNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{aiNotice}</span>
        </div>
      )}

      {/* AI Assistant Drawer / Panel */}
      {showAiAssistant && (
        <div className="bg-gradient-to-b from-indigo-50/60 to-white p-4 sm:p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-indigo-950">AI Content Generator (MCP-Powered)</h3>
                <p className="text-xs text-indigo-600/80">
                  Generate platform-optimized drafts for LinkedIn and X, review side-by-side, then schedule in one click.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              What would you like to post about?
            </label>
            <textarea
              rows={3}
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. Announcing our new open-source release with native Model Context Protocol (MCP) support and local data privacy..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />

            {/* Prompt Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400">Quick ideas:</span>
              {[
                'Product launch announcement',
                'Engineering architecture breakdown',
                'Weekly productivity tip',
                'Local-first privacy manifesto',
              ].map((chip) => (
                <button
                  type="button"
                  key={chip}
                  onClick={() => setAiTopic(chip)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selector & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Tone:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['thought-leadership', 'professional', 'punchy', 'casual', 'educational'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setAiTone(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                      aiTone === t
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiTopic.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition"
            >
              {aiGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Drafts...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Drafts
                </>
              )}
            </button>
          </div>

          {/* Drafts Preview & Review Step */}
          {aiDrafts && (
            <div className="pt-4 border-t border-indigo-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Generated Platform Variations (Review & Agree)
                </h4>
                <span className="text-xs text-indigo-600 font-medium">Ready to apply</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LinkedIn Version */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0077B5] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-[#0077B5] text-white flex items-center justify-center text-[10px]">in</span>
                      LinkedIn Version
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {aiDrafts.characterCounts.linkedin} chars
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {aiDrafts.variations.linkedin}
                  </p>
                </div>

                {/* X Version */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-black text-white flex items-center justify-center text-[10px]">𝕏</span>
                      X / Twitter Version
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        aiDrafts.characterCounts.x <= 280
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {aiDrafts.characterCounts.x} / 280 chars
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {aiDrafts.variations.x}
                  </p>
                </div>
              </div>

              {/* Action: Apply to Editor */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={applyAiDrafts}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs flex items-center justify-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Agree & Apply to Composer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Channel Selector */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 space-y-3 shadow-xs">
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
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {accounts.map((acc) => {
                const isSelected = selectedAccountIds.includes(acc.id);
                return (
                  <button
                    type="button"
                    key={acc.id}
                    onClick={() => toggleAccount(acc.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${
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
          <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-3 sm:px-4 pt-3 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('canonical')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap flex-shrink-0 ${
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
                className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
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
          <div className="p-4 sm:p-6 space-y-3">
            {activeTab === 'canonical' ? (
              <>
                <textarea
                  rows={7}
                  value={canonicalContent}
                  onChange={(e) => setCanonicalContent(e.target.value)}
                  placeholder="What's happening? Write your canonical social post here..."
                  className="w-full p-3 sm:p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400"
                />

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 gap-2">
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
                  className="w-full p-3 sm:p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed text-slate-900"
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
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 space-y-5 shadow-xs">
          <div className="flex flex-col xs:flex-row sm:items-center justify-between gap-2">
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
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
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
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition text-center"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || isXOverLimit}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition"
          >
            {isPublishNow ? <Send className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {submitting ? 'Saving...' : isPublishNow ? 'Publish Immediately' : 'Confirm Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}
