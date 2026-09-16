'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Upload,
  Calendar,
  Clock,
  Globe,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileText,
  Sparkles,
} from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: string;
  displayName: string;
}

interface PreviewItem {
  rowIndex: number;
  content: string;
  socialAccountId: string;
  publishAtUtc: string;
  publishAtLocalDisplay: string;
  timezone: string;
  isValid: boolean;
  validationError?: string;
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

export default function BulkSchedulerPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [rawText, setRawText] = useState(
    `10 Growth Tactics for Engineers building products
Why self-hosting your social scheduler protects your business data
How to structure a TypeScript monorepo with zero fluff
Mastering the Model Context Protocol (MCP) in 5 steps
Why asynchronous state machines are essential for background workers`
  );

  const [intervalMinutes, setIntervalMinutes] = useState(120);
  const [startDate, setStartDate] = useState(() => {
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

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/social-accounts');
        if (res.ok) {
          const data = await res.json();
          setAccounts(data);
          if (data.length > 0) setSelectedAccountId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  // Parse lines or CSV
  function parseLines(): string[] {
    return rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  async function generatePreview() {
    setErrorMsg(null);
    if (!selectedAccountId) {
      setErrorMsg('Please select a target social account.');
      return;
    }

    const lines = parseLines();
    if (lines.length === 0) {
      setErrorMsg('Please enter at least one post to schedule.');
      return;
    }

    try {
      setPreviewing(true);
      const rows = lines.map((content) => ({
        content,
        socialAccountId: selectedAccountId,
      }));

      const cadence = {
        startDateUtc: new Date(startDate).toISOString(),
        timezone,
        intervalMinutes: Number(intervalMinutes) || 60,
      };

      const res = await fetch('/api/schedules/bulk-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, cadence }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate preview.');
      }

      const data = await res.json();
      setPreviewItems(data.items);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCommit() {
    if (previewItems.length === 0) return;
    const validOnly = previewItems.filter((i) => i.isValid);

    if (validOnly.length === 0) {
      setErrorMsg('No valid items to schedule. Please fix errors first.');
      return;
    }

    try {
      setCommitting(true);
      const res = await fetch('/api/schedules/bulk-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default_local_user',
          items: validOnly.map((i) => ({
            content: i.content,
            socialAccountId: i.socialAccountId,
            publishAtUtc: i.publishAtUtc,
            timezone: i.timezone,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to commit bulk schedule.');
      }

      router.push('/queue');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Post Scheduler</h2>
        <p className="text-sm text-slate-500 mt-1">
          Import up to 100+ posts, configure automated spacing intervals, preview validation, and commit.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input & Cadence Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Textarea */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Posts List (One per line or CSV)
            </label>
            <span className="text-xs text-slate-400">
              {parseLines().length} post{parseLines().length !== 1 ? 's' : ''} detected
            </span>
          </div>

          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste your posts here, one per line..."
            className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono leading-relaxed text-slate-800"
          />
        </div>

        {/* Right: Cadence Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Cadence & Timing
          </label>

          <div>
            <label className="text-xs text-slate-600 font-semibold block mb-1">
              Target Channel
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.displayName} ({acc.provider})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600 font-semibold block mb-1">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600 font-semibold block mb-1">
              Interval (Minutes between posts)
            </label>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
              <option value={120}>Every 2 hours</option>
              <option value={240}>Every 4 hours</option>
              <option value={720}>Every 12 hours</option>
              <option value={1440}>Every 24 hours (Daily)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600 font-semibold block mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Display Timezone
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

          <button
            type="button"
            onClick={generatePreview}
            disabled={previewing}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs mt-2"
          >
            {previewing ? 'Generating Preview...' : 'Generate Schedule Preview'}
          </button>
        </div>
      </div>

      {/* Interactive Preview Table */}
      {previewItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Generated Schedule Preview ({previewItems.length} rows)
              </h3>
              <p className="text-xs text-slate-500">
                Review generated publish times in your local timezone before confirming.
              </p>
            </div>

            <button
              onClick={handleCommit}
              disabled={committing || previewItems.filter((i) => i.isValid).length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              {committing ? 'Committing...' : `Commit All (${previewItems.filter((i) => i.isValid).length}) Posts`}
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-48">Publish Time ({timezone})</th>
                  <th className="p-3">Post Content</th>
                  <th className="p-3 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewItems.map((item) => (
                  <tr key={item.rowIndex} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 text-center text-slate-400 font-mono">{item.rowIndex}</td>
                    <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                      {item.publishAtLocalDisplay}
                    </td>
                    <td className="p-3 text-slate-800 line-clamp-1">{item.content}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {item.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                          title={item.validationError}
                        >
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
