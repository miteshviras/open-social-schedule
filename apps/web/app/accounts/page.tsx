'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: string;
  providerAccountId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  status: string;
  createdAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  async function loadAccounts() {
    try {
      setLoading(true);
      const res = await fetch('/api/social-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function startOAuth(provider: string) {
    try {
      setConnecting(provider);
      const res = await fetch(`/api/auth/${provider}/url`);
      if (res.ok) {
        const data = await res.json();
        // Redirect browser to OAuth authorization URL
        window.location.href = data.url;
      } else {
        alert(`Failed to start ${provider} connection flow. Check API status.`);
      }
    } catch (err: any) {
      alert(`OAuth connection error: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  }

  async function connectMockAccount() {
    try {
      setConnecting('mock');
      const res = await fetch('/api/social-accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'mock',
          providerAccountId: `mock_user_${Date.now()}`,
          displayName: 'Demo Creator (Mock)',
          username: 'democreator',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
          accessToken: 'mock_demo_access_token_123',
        }),
      });

      if (res.ok) {
        await loadAccounts();
      }
    } catch (err) {
      console.error('Failed to connect mock account:', err);
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm('Are you sure you want to disconnect this social account?')) return;

    try {
      const res = await fetch(`/api/social-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to disconnect account:', err);
    }
  }

  const linkedinAccount = accounts.find((a) => a.provider === 'linkedin');
  const xAccount = accounts.find((a) => a.provider === 'x');
  const mockAccounts = accounts.filter((a) => a.provider === 'mock');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Connected Social Accounts</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your LinkedIn, X, and local testing profiles. All credentials stay encrypted locally.
        </p>
      </div>

      {/* Security Guarantee Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Zero-Cloud Security:</span> OAuth access tokens and refresh tokens are
          encrypted with <strong>AES-256-GCM</strong> on your local disk before hitting the database. Tokens are
          never logged, never sent to third-party telemetry, and never exposed to the web UI or MCP clients.
        </div>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LinkedIn Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-6 shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0077B5] text-white flex items-center justify-center font-bold text-base">
                  in
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">LinkedIn</h3>
                  <p className="text-xs text-slate-500">v2 / UGC Posts</p>
                </div>
              </div>

              {linkedinAccount ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  Not Connected
                </span>
              )}
            </div>

            {linkedinAccount ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                {linkedinAccount.avatarUrl ? (
                  <img
                    src={linkedinAccount.avatarUrl}
                    alt={linkedinAccount.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {linkedinAccount.displayName[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-slate-900 truncate">
                    {linkedinAccount.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500">ID: {linkedinAccount.providerAccountId.slice(0, 16)}...</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect your LinkedIn profile to schedule and publish posts directly to your main feed.
              </p>
            )}
          </div>

          <div>
            {linkedinAccount ? (
              <button
                onClick={() => handleDisconnect(linkedinAccount.id)}
                className="w-full py-2 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect Account
              </button>
            ) : (
              <button
                onClick={() => startOAuth('linkedin')}
                disabled={connecting === 'linkedin'}
                className="w-full py-2 px-3 bg-[#0077B5] hover:bg-[#005c8d] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                {connecting === 'linkedin' ? 'Redirecting...' : 'Connect LinkedIn'}
              </button>
            )}
          </div>
        </div>

        {/* X (Twitter) Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-6 shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-bold text-base">
                  𝕏
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">X (Twitter)</h3>
                  <p className="text-xs text-slate-500">API v2 / PKCE</p>
                </div>
              </div>

              {xAccount ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  Not Connected
                </span>
              )}
            </div>

            {xAccount ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                {xAccount.avatarUrl ? (
                  <img
                    src={xAccount.avatarUrl}
                    alt={xAccount.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {xAccount.displayName[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-slate-900 truncate">{xAccount.displayName}</p>
                  <p className="text-[11px] text-slate-500">@{xAccount.username || 'user'}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect your X profile using OAuth 2.0 PKCE to schedule tweets with real-time character constraints.
              </p>
            )}
          </div>

          <div>
            {xAccount ? (
              <button
                onClick={() => handleDisconnect(xAccount.id)}
                className="w-full py-2 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect Account
              </button>
            ) : (
              <button
                onClick={() => startOAuth('x')}
                disabled={connecting === 'x'}
                className="w-full py-2 px-3 bg-black hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                {connecting === 'x' ? 'Redirecting...' : 'Connect 𝕏'}
              </button>
            )}
          </div>
        </div>

        {/* Mock / Demo Provider Card */}
        <div className="bg-white rounded-xl border border-indigo-200/80 p-6 flex flex-col justify-between space-y-6 shadow-xs bg-gradient-to-b from-indigo-50/20 to-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Demo / Mock Channel</h3>
                  <p className="text-xs text-slate-500">Zero Setup Required</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {mockAccounts.length > 0 ? `${mockAccounts.length} Active` : 'Ready'}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Test scheduling, queueing, worker execution, and retries locally without needing real social developer API keys.
            </p>

            {mockAccounts.length > 0 && (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {mockAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={acc.avatarUrl!}
                        alt={acc.displayName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-slate-800 truncate">{acc.displayName}</span>
                    </div>
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={connectMockAccount}
              disabled={connecting === 'mock'}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {connecting === 'mock' ? 'Connecting...' : 'Add Mock Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
