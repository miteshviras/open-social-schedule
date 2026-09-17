'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  Cpu,
  Layers,
  Terminal,
  CheckCircle2,
  Copy,
  Clock,
  Send,
  AlertCircle,
  ShieldCheck,
  Radio,
  Wifi,
  Activity,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface McpToolMeta {
  name: string;
  category: 'Content & Posts' | 'Accounts' | 'Scheduling' | 'Publishing' | 'Diagnostics';
  description: string;
  isMutating: boolean;
  parameters: Record<string, string>;
  samplePayload: Record<string, any>;
}

interface SocialAccount {
  id: string;
  provider: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  status: string;
}

interface McpConnectedClient {
  id: string;
  name: string;
  badge: string;
  status: 'connected' | 'standby' | 'ready';
  transport: 'stdio' | 'in-process' | 'sse';
  lastActive: string | null;
  toolCallsCount: number;
  description: string;
  version: string;
}

interface McpActivityLog {
  id: string;
  timestamp: string;
  clientName: string;
  toolName: string;
  durationMs: number;
  status: 'success' | 'error';
}

const CLIENT_OPTIONS = [
  { id: 'claude-desktop', name: 'Claude Desktop', badge: 'Most Popular', desc: 'Anthropic Claude for macOS & Windows with desktop tool access' },
  { id: 'claude-code', name: 'Claude Code', badge: 'CLI', desc: 'Anthropic research agent running directly in terminal sessions' },
  { id: 'cursor', name: 'Cursor', badge: 'IDE', desc: 'AI-first code editor with native Model Context Protocol support' },
  { id: 'antigravity', name: 'Antigravity', badge: 'Agentic IDE', desc: 'Google Antigravity autonomous multi-agent developer environment' },
  { id: 'cline', name: 'Cline (VS Code)', badge: 'Extension', desc: 'Autonomous coding agent extension for Visual Studio Code' },
  { id: 'windsurf', name: 'Windsurf', badge: 'IDE', desc: 'Codeium AI IDE with integrated MCP capabilities' },
  { id: 'codex', name: 'Codex CLI', badge: 'CLI', desc: 'Command-line code execution and workflow agent' },
  { id: 'generic', name: 'Generic MCP Client', badge: 'Standard', desc: 'Any client implementing the Model Context Protocol stdio specification' },
];

type TabType = 'ai-generator' | 'connected' | 'connectors' | 'catalog' | 'console';

export default function McpHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ai-generator');
  const [status, setStatus] = useState<any>(null);
  const [tools, setTools] = useState<McpToolMeta[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Connected MCP Clients & Activity State
  const [clientsData, setClientsData] = useState<{
    totalClients: number;
    connectedCount: number;
    clients: McpConnectedClient[];
    recentActivity: McpActivityLog[];
  }>({
    totalClients: 6,
    connectedCount: 2,
    clients: [],
    recentActivity: [],
  });
  const [pingingClientId, setPingingClientId] = useState<string | null>(null);
  const [pingFeedback, setPingFeedback] = useState<{ clientId: string; message: string } | null>(null);

  function handleTabChange(tabId: TabType) {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab') as TabType;
      if (t && ['ai-generator', 'connected', 'connectors', 'catalog', 'console'].includes(t)) {
        setActiveTab(t);
      }
    }
  }, []);

  // Connectors Setup State
  const [selectedClient, setSelectedClient] = useState('claude-desktop');
  const [clientConfig, setClientConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // AI Content Generator State
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'thought-leadership' | 'professional' | 'punchy' | 'casual' | 'educational'>('thought-leadership');
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<any>(null);
  const [editedLinkedin, setEditedLinkedin] = useState('');
  const [editedX, setEditedX] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isPublishNow, setIsPublishNow] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0);
    return d.toISOString().slice(0, 16);
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<any>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Interactive Console State
  const [selectedTool, setSelectedTool] = useState('social_list_accounts');
  const [rawParameters, setRawParameters] = useState('{}');
  const [executing, setExecuting] = useState(false);
  const [consoleResult, setConsoleResult] = useState<any>(null);
  const [consoleError, setConsoleError] = useState<string | null>(null);
  const [toolFilterCategory, setToolFilterCategory] = useState<string>('All');

  async function loadData() {
    try {
      setLoading(true);
      const [statusRes, toolsRes, accountsRes, clientsRes] = await Promise.all([
        fetch('/api/mcp/status'),
        fetch('/api/mcp/tools'),
        fetch('/api/social-accounts'),
        fetch('/api/mcp/clients'),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (toolsRes.ok) {
        const t = await toolsRes.json();
        setTools(t.tools || []);
      }
      if (accountsRes.ok) {
        const accs: SocialAccount[] = await accountsRes.json();
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccountIds([accs[0].id]);
      }
      if (clientsRes.ok) {
        setClientsData(await clientsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/mcp/config/${selectedClient}`);
        if (res.ok) {
          const data = await res.json();
          setClientConfig(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadConfig();
  }, [selectedClient]);

  useEffect(() => {
    const tool = tools.find((t) => t.name === selectedTool);
    if (tool && tool.samplePayload) {
      setRawParameters(JSON.stringify(tool.samplePayload, null, 2));
    } else {
      setRawParameters('{}');
    }
  }, [selectedTool, tools]);

  async function handlePingClient(clientId: string) {
    try {
      setPingingClientId(clientId);
      const res = await fetch(`/api/mcp/clients/${clientId}/ping`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setPingFeedback({ clientId, message: `Handshake OK (${result.latencyMs}ms latency)` });
        // Reload client data to update status
        const updated = await fetch('/api/mcp/clients');
        if (updated.ok) setClientsData(await updated.json());
        const sRes = await fetch('/api/mcp/status');
        if (sRes.ok) setStatus(await sRes.json());
        setTimeout(() => setPingFeedback(null), 5000);
      }
    } catch (err) {
      console.error('Failed to ping MCP client:', err);
    } finally {
      setPingingClientId(null);
    }
  }

  async function handleGenerateAI() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setScheduleError(null);
    setScheduleSuccess(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: prompt,
          tone,
          platforms: ['linkedin', 'x'],
        }),
      });
      if (!res.ok) throw new Error('Failed to generate content');
      const data = await res.json();
      setDrafts(data);
      setEditedLinkedin(data.variations.linkedin);
      setEditedX(data.variations.x);
    } catch (err: any) {
      setScheduleError(err.message || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleScheduleAgreedPost() {
    if (selectedAccountIds.length === 0) {
      setScheduleError('Please select at least one connected channel.');
      return;
    }
    if (!editedLinkedin.trim() && !editedX.trim()) {
      setScheduleError('Post content cannot be empty.');
      return;
    }

    setScheduling(true);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const publishAtUtc = isPublishNow
        ? new Date(Date.now() - 1000).toISOString()
        : new Date(scheduleDate).toISOString();

      const targets = selectedAccountIds.map((accId) => {
        const acc = accounts.find((a) => a.id === accId);
        const override = acc?.provider === 'x' ? editedX : undefined;
        return {
          socialAccountId: accId,
          publishAtUtc,
          timezone: 'UTC',
          contentOverride: override,
        };
      });

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalContent: editedLinkedin || editedX,
          targets,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to schedule post.');
      }

      const created = await res.json();
      setScheduleSuccess({
        message: isPublishNow
          ? 'Post enqueued for immediate publication by local worker!'
          : 'Post successfully scheduled across your selected accounts!',
        post: created,
      });
    } catch (err: any) {
      setScheduleError(err.message || 'Error scheduling post.');
    } finally {
      setScheduling(false);
    }
  }

  async function handleExecuteTool() {
    setExecuting(true);
    setConsoleResult(null);
    setConsoleError(null);

    try {
      let parsed = {};
      try {
        parsed = JSON.parse(rawParameters);
      } catch (err) {
        throw new Error('Invalid JSON in parameters field.');
      }

      const res = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: selectedTool,
          parameters: parsed,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Execution failed');
      }
      setConsoleResult(data);
      // Reload clients to refresh tool counters
      const updated = await fetch('/api/mcp/clients');
      if (updated.ok) setClientsData(await updated.json());
    } catch (err: any) {
      setConsoleError(err.message);
    } finally {
      setExecuting(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filteredTools = toolFilterCategory === 'All'
    ? tools
    : tools.filter((t) => t.category === toolFilterCategory);

  const connectedCount = clientsData.connectedCount || status?.connectedClientsCount || 2;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner & Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-8 rounded-2xl shadow-md relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="w-4 sm:w-5 h-4 sm:h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Model Context Protocol (MCP) Surface
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active & Listening
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
              MCP AI Connectors & Content Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Exposes a native local MCP server for Claude, Cursor, Antigravity, and Codex. Generate drafts, inspect parameters, and schedule content locally with zero third-party cloud exposure.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full md:w-auto">
            <div className="bg-white/5 backdrop-blur border border-white/10 px-2.5 py-2 sm:px-3 sm:py-3 rounded-xl text-center">
              <div className="text-base sm:text-lg font-bold text-white font-mono">{tools.length || 23}</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Tools</div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 px-2.5 py-2 sm:px-3 sm:py-3 rounded-xl text-center">
              <div className="text-base sm:text-lg font-bold text-white font-mono">{accounts.length}</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Channels</div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 px-2.5 py-2 sm:px-3 sm:py-3 rounded-xl text-center">
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                {status?.queue?.scheduled ?? 0}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">In Queue</div>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('connected')}
              className="bg-white/5 hover:bg-white/15 backdrop-blur border border-emerald-500/30 px-2.5 py-2 sm:px-3 sm:py-3 rounded-xl text-center transition cursor-pointer group"
              title="Click to inspect connected MCP clients"
            >
              <div className="text-base sm:text-lg font-bold text-emerald-300 font-mono flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {connectedCount}
              </div>
              <div className="text-[10px] sm:text-[11px] text-emerald-300/80 font-medium group-hover:text-white">
                Connected MCPs
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ai-generator', label: 'AI Generator & Review', icon: Sparkles },
          { id: 'connected', label: `Connected MCPs (${connectedCount})`, icon: Radio },
          { id: 'connectors', label: 'Client Connectors Setup', icon: Cpu },
          { id: 'catalog', label: 'MCP Tools Catalog', icon: Layers },
          { id: 'console', label: 'Interactive Test Console', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap flex-shrink-0 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI Generator & Review (User Approval Workflow) */}
      {activeTab === 'ai-generator' && (
        <div className="space-y-6">
          {/* Connected MCP Presence Bar right on top of the Generator */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/20 to-blue-50/30 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected MCP Clients:
              </span>
              {clientsData.clients.filter((c) => c.status === 'connected').map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {c.name}
                </span>
              ))}
              {clientsData.clients.filter((c) => c.status !== 'connected').slice(0, 2).map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                  {c.name} (Ready)
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('connected')}
              className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Manage & View All ({connectedCount} Active) &rarr;
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Generate Post with AI & Review Before Scheduling
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI generates formatted LinkedIn and X copy. Review and edit all content, then click schedule to publish to your selected accounts.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Post Topic or Idea
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Announcing our new open-source MCP social scheduler! Explain local-first data privacy and Claude integration..."
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] font-medium text-slate-400">Quick templates:</span>
                {[
                  'Product launch milestone announcement',
                  'Why local-first architecture matters for privacy',
                  '3 engineering lessons from building an MCP server',
                  'Weekly community update & open-source roadmap',
                ].map((tmpl) => (
                  <button
                    type="button"
                    key={tmpl}
                    onClick={() => setPrompt(tmpl)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition cursor-pointer"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Tone:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['thought-leadership', 'professional', 'punchy', 'casual', 'educational'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                        tone === t
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={generating || !prompt.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {generating ? (
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
          </div>

          {/* Drafts Review, Editable Fields & Schedule Action */}
          {drafts && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Review & Edit Platform Variations
                  </h4>
                  <span className="text-xs text-slate-500">
                    Feel free to tweak text directly in the boxes below before approving.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LinkedIn Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0077B5] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-[#0077B5] text-white flex items-center justify-center text-[10px]">in</span>
                      LinkedIn Copy (Long-form / Hook)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {editedLinkedin.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={editedLinkedin}
                    onChange={(e) => setEditedLinkedin(e.target.value)}
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                  />
                </div>

                {/* X Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-black text-white flex items-center justify-center text-[10px]">𝕏</span>
                      X Copy (Concise / Tweet)
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        editedX.length <= 280
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {editedX.length} / 280 characters
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={editedX}
                    onChange={(e) => setEditedX(e.target.value)}
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-black leading-relaxed font-sans"
                  />
                </div>
              </div>

              {/* Target Platforms & Schedule Options */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Select Publishing Channels
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {accounts.length === 0 ? (
                      <span className="text-xs text-slate-500">
                        No accounts connected.{' '}
                        <Link href="/accounts" prefetch={false} className="text-blue-600 font-semibold underline">
                          Connect an account
                        </Link>
                      </span>
                    ) : (
                      accounts.map((acc) => {
                        const isSel = selectedAccountIds.includes(acc.id);
                        return (
                          <button
                            type="button"
                            key={acc.id}
                            onClick={() => {
                              setSelectedAccountIds((prev) =>
                                prev.includes(acc.id)
                                  ? prev.filter((x) => x !== acc.id)
                                  : [...prev, acc.id]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
                              isSel
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] text-white ${
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
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isSel ? 'text-blue-600' : 'text-slate-300'}`} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Timing */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
                  <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 sm:gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isPublishNow}
                        onChange={(e) => setIsPublishNow(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Publish Immediately (Next Worker Poll)</span>
                    </label>

                    {!isPublishNow && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* One-Click Schedule Button */}
                  <button
                    type="button"
                    onClick={handleScheduleAgreedPost}
                    disabled={scheduling || selectedAccountIds.length === 0 || (!editedLinkedin.trim() && !editedX.trim())}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {scheduling ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        {isPublishNow ? 'Approve & Publish Now' : 'Approve & Schedule Post'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {scheduleSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">{scheduleSuccess.message}</p>
                    <p className="text-emerald-700 font-mono text-[11px]">
                      Post ID: {scheduleSuccess.post.id} ({scheduleSuccess.post.targets?.length || 1} target channels)
                    </p>
                    <div className="pt-1">
                      <Link href="/queue" prefetch={false} className="font-semibold text-emerald-800 underline hover:text-emerald-950">
                        View scheduled item in Queue &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {scheduleError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{scheduleError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Connected MCPs (Active Sessions & Live Clients) */}
      {activeTab === 'connected' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Active MCP Clients & AI Connections
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time status of AI tools connected to Open Social Scheduler via Model Context Protocol. Run handshake tests to verify connectivity.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
            </div>

            {/* Clients Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {clientsData.clients.map((c) => {
                const isConnected = c.status === 'connected';
                const isPinging = pingingClientId === c.id;
                const feedback = pingFeedback?.clientId === c.id ? pingFeedback.message : null;

                return (
                  <div
                    key={c.id}
                    className={`p-5 rounded-xl border transition flex flex-col justify-between space-y-4 ${
                      isConnected
                        ? 'bg-gradient-to-b from-emerald-50/40 to-white border-emerald-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <h4 className="text-sm font-bold text-slate-900 truncate">{c.name}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            isConnected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Ready'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {c.description}
                      </p>

                      <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 space-y-1.5 text-[11px] font-mono">
                        <div className="flex justify-between text-slate-500">
                          <span>Transport:</span>
                          <span className="font-semibold text-slate-800">{c.transport.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tool Requests:</span>
                          <span className="font-semibold text-slate-800">{c.toolCallsCount} executed</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Last Active:</span>
                          <span className="font-semibold text-slate-800">
                            {c.lastActive ? new Date(c.lastActive).toLocaleTimeString() : 'Awaiting call'}
                          </span>
                        </div>
                      </div>

                      {feedback && (
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 animate-fadeIn">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {feedback}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handlePingClient(c.id)}
                        disabled={isPinging}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        {isPinging ? (
                          <>
                            <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                            Pinging...
                          </>
                        ) : (
                          <>
                            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                            Test Handshake
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(c.id);
                          handleTabChange('connectors');
                        }}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition cursor-pointer"
                        title="View client configuration"
                      >
                        Config
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Activity Stream */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Recent MCP Tool Invocations & Event Stream
              </h4>
              <span className="text-xs text-slate-400">Real-time execution log</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">MCP Client</th>
                    <th className="p-2.5">Tool Name</th>
                    <th className="p-2.5">Latency</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {clientsData.recentActivity.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-2.5 text-slate-500 font-sans">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2.5 font-sans font-semibold text-slate-900">{log.clientName}</td>
                      <td className="p-2.5 text-blue-600 font-bold">{log.toolName}</td>
                      <td className="p-2.5 text-slate-600">{log.durationMs}ms</td>
                      <td className="p-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> SUCCESS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Connectors Setup */}
      {activeTab === 'connectors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {CLIENT_OPTIONS.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedClient(c.id)}
                className={`p-4 rounded-xl text-left border transition relative space-y-1.5 cursor-pointer ${
                  selectedClient === c.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{c.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {c.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{c.desc}</p>
              </button>
            ))}
          </div>

          {clientConfig && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    Configuration for {CLIENT_OPTIONS.find((c) => c.id === selectedClient)?.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Target: {clientConfig.pathHint}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(clientConfig.cliCommand || JSON.stringify(clientConfig.config, null, 2))}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  {copied ? 'Copied!' : 'Copy Configuration'}
                </button>
              </div>

              {clientConfig.cliCommand ? (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Run in your terminal:</span>
                  <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
                    {clientConfig.cliCommand}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Add to your client config JSON:</span>
                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-80">
                    {JSON.stringify(clientConfig.config, null, 2)}
                  </pre>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Local-first Zero Trust:</strong> All tool execution happens over stdio processes on your computer. Tokens are never transmitted to external servers.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Tools Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 items-center">
            {['All', 'Content & Posts', 'Accounts', 'Scheduling', 'Publishing', 'Diagnostics'].map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setToolFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  toolFilterCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTools.map((tool) => (
              <div
                key={tool.name}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {tool.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        tool.isMutating
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {tool.isMutating ? 'Mutating' : 'Read-only'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{tool.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {Object.keys(tool.parameters).length} parameter(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTool(tool.name);
                      handleTabChange('console');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    Test in Console &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Interactive Test Console */}
      {activeTab === 'console' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                Interactive MCP Tool Runner
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Execute any of the 23 MCP tools directly in the browser and view latency and response outputs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Select MCP Tool</label>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  {tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Parameters (JSON)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const t = tools.find((x) => x.name === selectedTool);
                      if (t?.samplePayload) setRawParameters(JSON.stringify(t.samplePayload, null, 2));
                    }}
                    className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset Sample
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={rawParameters}
                  onChange={(e) => setRawParameters(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-900 text-slate-100"
                />
              </div>

              <button
                type="button"
                onClick={handleExecuteTool}
                disabled={executing}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                {executing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executing Tool...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Execute Tool
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Execution Result</label>
                {consoleResult && (
                  <span className="text-[11px] font-mono text-emerald-600 font-semibold">
                    {consoleResult.durationMs}ms latency
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-[250px] p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs overflow-auto max-h-[360px]">
                {consoleError ? (
                  <div className="text-rose-400 font-sans text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{consoleError}</span>
                  </div>
                ) : consoleResult ? (
                  <pre className="text-emerald-400">
                    {JSON.stringify(consoleResult.result, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-500 italic">
                    Select a tool and click "Execute Tool" to view live JSON response...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
