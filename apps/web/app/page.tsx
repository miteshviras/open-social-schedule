'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Send,
} from 'lucide-react';

interface PostTarget {
  id: string;
  publishAtUtc: string;
  timezone: string;
  status: string;
  contentOverride?: string;
  post: {
    canonicalContent: string;
  };
  socialAccount: {
    id: string;
    provider: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
  };
}

export default function DashboardOverview() {
  const [targets, setTargets] = useState<PostTarget[]>([]);
  const [accountsCount, setAccountsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [targetsRes, accountsRes] = await Promise.all([
        fetch('/api/post-targets'),
        fetch('/api/social-accounts'),
      ]);

      if (targetsRes.ok) {
        const data = await targetsRes.json();
        setTargets(data);
      }

      if (accountsRes.ok) {
        const accounts = await accountsRes.json();
        setAccountsCount(accounts.length);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const scheduledCount = targets.filter((t) => t.status === 'scheduled').length;
  const publishedCount = targets.filter((t) => t.status === 'published').length;
  const failedCount = targets.filter((t) => t.status === 'failed' || t.status === 'retryable_failure').length;

  const nextUp = targets
    .filter((t) => t.status === 'scheduled')
    .sort((a, b) => new Date(a.publishAtUtc).getTime() - new Date(b.publishAtUtc).getTime())[0];

  async function handlePublishNow(targetId: string) {
    try {
      const res = await fetch(`/api/post-targets/${targetId}/publish`, { method: 'POST' });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to publish now:', err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitor queued publications, connected channels, and delivery status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/compose"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition"
          >
            <Sparkles className="w-4 h-4" />
            Schedule Post
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled In Queue</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{scheduledCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Published Posts</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1.5">{publishedCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Failed / Retrying</p>
            <p className={`text-3xl font-extrabold mt-1.5 ${failedCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {failedCount}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${failedCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connected Accounts</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{accountsCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Share2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Next Post Up Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Clock className="w-3.5 h-3.5" />
              Next Scheduled Publication
            </div>

            {nextUp ? (
              <>
                <h3 className="text-xl font-bold tracking-tight text-white line-clamp-2">
                  &ldquo;{nextUp.contentOverride || nextUp.post.canonicalContent}&rdquo;
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="capitalize font-bold text-white px-2 py-0.5 rounded bg-white/10">
                      {nextUp.socialAccount.provider}
                    </span>
                    ({nextUp.socialAccount.displayName})
                  </span>
                  <span>•</span>
                  <span>Due: {new Date(nextUp.publishAtUtc).toLocaleString()} ({nextUp.timezone})</span>
                </div>
              </>
            ) : (
              <div className="py-2">
                <p className="text-base text-slate-300">No posts currently scheduled in the queue.</p>
                <p className="text-xs text-slate-400 mt-1">Compose a single post or import a bulk batch to begin.</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {nextUp && (
              <button
                onClick={() => handlePublishNow(nextUp.id)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Publish Immediately
              </button>
            )}
            <Link
              href="/queue"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              View Full Queue
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/calendar"
          className="group p-6 bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-sm transition space-y-3"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition">
            Calendar Planner
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Visualize your social schedule on a monthly calendar grid. Reschedule easily.
          </p>
        </Link>

        <Link
          href="/bulk"
          className="group p-6 bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-sm transition space-y-3"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition">
            Bulk CSV Scheduler
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Schedule 100+ posts at once with automated cadence rules and live validation preview.
          </p>
        </Link>

        <Link
          href="/accounts"
          className="group p-6 bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-sm transition space-y-3"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition">
            <Share2 className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition">
            Social Channels
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage your LinkedIn and X connections with secure token encryption at rest.
          </p>
        </Link>
      </div>
    </div>
  );
}
