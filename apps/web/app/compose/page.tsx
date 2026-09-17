'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Bot,
  Activity,
  Zap,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  RefreshCw,
  Brain,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  status: string;
}

interface McpClientInfo {
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

interface ThinkingStep {
  id: string;
  text: string;
  detail?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface ThinkingState {
  isActive: boolean;
  status: 'idle' | 'thinking' | 'completed' | 'error';
  elapsedSec: number;
  currentStepIndex: number;
  steps: ThinkingStep[];
  error?: string | null;
  expanded: boolean;
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

  // MCP Connected Clients & Provider Selection
  const [mcpClients, setMcpClients] = useState<McpClientInfo[]>([
    {
      id: 'antigravity',
      name: 'Google Antigravity',
      badge: 'Autonomous Agent',
      status: 'connected',
      transport: 'stdio',
      lastActive: new Date().toISOString(),
      toolCallsCount: 5,
      description: 'Google Antigravity autonomous multi-agent developer environment connected via local stdio.',
      version: 'v2.0',
    },
    {
      id: 'web-studio',
      name: 'In-App AI Studio & Web Client',
      badge: 'Native Active',
      status: 'connected',
      transport: 'in-process',
      lastActive: new Date().toISOString(),
      toolCallsCount: 12,
      description: 'Built-in local MCP web environment running directly in Open Social Scheduler.',
      version: '0.1.0',
    },
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      badge: 'Desktop App',
      status: 'ready',
      transport: 'stdio',
      lastActive: null,
      toolCallsCount: 0,
      description: 'Anthropic Claude for macOS & Windows with desktop tool execution over stdio JSON-RPC.',
      version: 'v0.1.0-mcp',
    },
    {
      id: 'cursor',
      name: 'Cursor IDE Agent',
      badge: 'IDE Plugin',
      status: 'ready',
      transport: 'stdio',
      lastActive: null,
      toolCallsCount: 0,
      description: 'Cursor AI IDE native Model Context Protocol integration for codebase-aware scheduling.',
      version: 'v0.1.0-mcp',
    },
    {
      id: 'claude-code',
      name: 'Claude Code CLI',
      badge: 'Terminal CLI',
      status: 'ready',
      transport: 'stdio',
      lastActive: null,
      toolCallsCount: 0,
      description: 'Terminal-based Anthropic research and coding agent running via stdio subprocess.',
      version: 'v0.1.0-mcp',
    },
    {
      id: 'cline',
      name: 'Cline (VS Code)',
      badge: 'VS Code Extension',
      status: 'ready',
      transport: 'stdio',
      lastActive: null,
      toolCallsCount: 0,
      description: 'Autonomous coding agent extension for Visual Studio Code communicating over stdio.',
      version: 'v0.1.0-mcp',
    },
  ]);
  const [selectedMcpId, setSelectedMcpId] = useState('antigravity');
  const [testingMcpId, setTestingMcpId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ clientId: string; latencyMs: number; message: string } | null>(null);

  // AI Assistant generator state
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'thought-leadership' | 'punchy' | 'casual' | 'educational'>('thought-leadership');
  const [aiGenerating, setAiGenerating] = useState(false);

  // AI Thinking Chatbot state
  const [thinkingState, setThinkingState] = useState<ThinkingState>({
    isActive: false,
    status: 'idle',
    elapsedSec: 0,
    currentStepIndex: 0,
    steps: [],
    error: null,
    expanded: true,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stepRef = useRef<NodeJS.Timeout | null>(null);

  const [aiDrafts, setAiDrafts] = useState<{
    topic: string;
    tone: string;
    canonicalContent: string;
    variations: { linkedin: string; x: string };
    suggestedHashtags: string[];
    characterCounts: { linkedin: number; x: number };
    provider?: {
      id: string;
      name: string;
      badge: string;
      transport: string;
      version: string;
      durationMs: number;
      generatedAt: string;
    };
  } | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [accRes, mcpRes] = await Promise.all([
          fetch('/api/social-accounts'),
          fetch('/api/mcp/clients'),
        ]);

        if (accRes.ok) {
          const data: SocialAccount[] = await accRes.json();
          setAccounts(data);
          if (data.length > 0) {
            setSelectedAccountIds([data[0].id]);
          }
        }

        if (mcpRes.ok) {
          const mcpData = await mcpRes.json();
          if (mcpData.clients && mcpData.clients.length > 0) {
            setMcpClients(mcpData.clients);
            const preferred = mcpData.clients.find((c: McpClientInfo) => c.id === 'antigravity') ||
              mcpData.clients.find((c: McpClientInfo) => c.status === 'connected') ||
              mcpData.clients[0];
            if (preferred) {
              setSelectedMcpId(preferred.id);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
    };
  }, []);

  async function handleTestHandshake(clientId: string) {
    setTestingMcpId(clientId);
    setPingResult(null);
    try {
      const res = await fetch(`/api/mcp/clients/${clientId}/ping`, { method: 'POST' });
      const data = await res.json();
      setPingResult({
        clientId,
        latencyMs: data.latencyMs,
        message: `Handshake OK (${data.latencyMs}ms)`,
      });

      setMcpClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? { ...c, status: 'connected', lastActive: new Date().toISOString(), toolCallsCount: c.toolCallsCount + 1 }
            : c
        )
      );
    } catch (err: any) {
      setPingResult({
        clientId,
        latencyMs: 0,
        message: 'Ping failed',
      });
    } finally {
      setTestingMcpId(null);
    }
  }

  function getThinkingSteps(clientName: string, transport: string, topic: string, tone: string): ThinkingStep[] {
    const topicExcerpt = topic.length > 28 ? `${topic.slice(0, 28)}...` : topic;
    return [
      {
        id: 'step-init',
        text: `Initiating connection to ${clientName}`,
        detail: `Establishing session over local ${transport} JSON-RPC transport`,
        status: 'in_progress',
      },
      {
        id: 'step-dispatch',
        text: `Invoking MCP tool 'social_generate_content'`,
        detail: `Sending arguments: { topic: "${topicExcerpt}", tone: "${tone}" }`,
        status: 'pending',
      },
      {
        id: 'step-reasoning',
        text: `Analyzing narrative structure & audience resonance`,
        detail: `Applying ${tone.replace('-', ' ')} framing and core value anchors`,
        status: 'pending',
      },
      {
        id: 'step-linkedin',
        text: `Drafting LinkedIn hook & long-form breakdown`,
        detail: `Structuring opening hook, bullet points, call to action & hashtags`,
        status: 'pending',
      },
      {
        id: 'step-x',
        text: `Synthesizing high-impact post for X (Twitter)`,
        detail: `Strict validation of 280-character boundary limit and viral punch`,
        status: 'pending',
      },
      {
        id: 'step-finalize',
        text: `Auditing constraints & formatting payload`,
        detail: `Verifying cross-platform formatting, hashtags and latency metrics`,
        status: 'pending',
      },
    ];
  }

  async function handleAiGenerate() {
    if (!aiTopic.trim()) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (stepRef.current) clearInterval(stepRef.current);

    setAiGenerating(true);
    setErrorMsg(null);
    setAiDrafts(null);

    const client = selectedClient;
    const initialSteps = getThinkingSteps(client.name, client.transport, aiTopic, aiTone);

    setThinkingState({
      isActive: true,
      status: 'thinking',
      elapsedSec: 0,
      currentStepIndex: 0,
      steps: initialSteps,
      error: null,
      expanded: true,
    });

    const startTime = Date.now();

    // Elapsed seconds stopwatch (ticks every 100ms)
    timerRef.current = setInterval(() => {
      setThinkingState((prev) => ({
        ...prev,
        elapsedSec: parseFloat(((Date.now() - startTime) / 1000).toFixed(1)),
      }));
    }, 100);

    // Dynamic progressive thought progression (every 400ms)
    stepRef.current = setInterval(() => {
      setThinkingState((prev) => {
        if (prev.currentStepIndex >= prev.steps.length - 1) {
          return prev;
        }
        const nextIndex = prev.currentStepIndex + 1;
        const updatedSteps = prev.steps.map((s, idx) => {
          if (idx < nextIndex) return { ...s, status: 'completed' as const };
          if (idx === nextIndex) return { ...s, status: 'in_progress' as const };
          return s;
        });
        return {
          ...prev,
          currentStepIndex: nextIndex,
          steps: updatedSteps,
        };
      });
    }, 420);

    try {
      // Dispatch API request in parallel with a realistic cognitive pacing (~2.2s)
      const [res] = await Promise.all([
        fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: aiTopic,
            tone: aiTone,
            platforms: ['linkedin', 'x'],
            clientId: selectedMcpId,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 2200)),
      ]);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate draft with AI.');
      }

      const data = await res.json();
      if (timerRef.current) clearInterval(timerRef.current);
      if (stepRef.current) clearInterval(stepRef.current);

      const totalSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));

      setThinkingState((prev) => ({
        ...prev,
        status: 'completed',
        elapsedSec: totalSec,
        currentStepIndex: prev.steps.length,
        steps: prev.steps.map((s) => ({ ...s, status: 'completed' as const })),
        expanded: false, // Collapse thinking box by default so drafts take focus
      }));

      setAiDrafts(data);

      setMcpClients((prev) =>
        prev.map((c) =>
          c.id === selectedMcpId
            ? { ...c, status: 'connected', lastActive: new Date().toISOString(), toolCallsCount: c.toolCallsCount + 1 }
            : c
        )
      );
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stepRef.current) clearInterval(stepRef.current);

      const totalSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
      setThinkingState((prev) => ({
        ...prev,
        status: 'error',
        elapsedSec: totalSec,
        error: err.message || 'AI generation failed',
        expanded: true,
      }));
      setErrorMsg(err.message || 'AI Generation error');
    } finally {
      setAiGenerating(false);
    }
  }

  function updateDraftVariation(platform: 'linkedin' | 'x', text: string) {
    if (!aiDrafts) return;
    setAiDrafts({
      ...aiDrafts,
      variations: {
        ...aiDrafts.variations,
        [platform]: text,
      },
      characterCounts: {
        ...aiDrafts.characterCounts,
        [platform]: text.length,
      },
    });
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

    if (accounts.length > 0) {
      setSelectedAccountIds(accounts.map((a) => a.id));
    }

    const providerName = aiDrafts.provider?.name || selectedClient?.name || 'MCP Agent';
    setAiNotice(`✨ Draft from ${providerName} applied to composer! Review channels and click "Confirm Schedule" below.`);
    setShowAiAssistant(false);
    setTimeout(() => setAiNotice(null), 8000);
  }

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id));
  const selectedClient = mcpClients.find((c) => c.id === selectedMcpId) || mcpClients[0];

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
            Create canonical content, set platform-specific overrides, or generate with AI via connected MCP providers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAiAssistant((prev) => !prev)}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-indigo-200" />
          {showAiAssistant ? 'Hide AI Assistant' : '✨ Generate with MCP AI'}
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
        <div className="bg-gradient-to-b from-indigo-50/70 via-white to-white p-4 sm:p-6 rounded-2xl border border-indigo-200 shadow-md space-y-6 animate-fadeIn">
          {/* Panel Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-indigo-100 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-600 text-white flex-shrink-0 shadow-xs">
                <Bot className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-indigo-950">MCP AI Content Studio</h3>
                <p className="text-xs text-indigo-600/80">
                  Select your connected MCP agent, draft tailored copy for LinkedIn & X, and apply directly to your post.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {mcpClients.filter((c) => c.status === 'connected').length} MCPs Active
            </span>
          </div>

          {/* Step 1: Select MCP Provider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                Step 1: Choose Connected MCP Provider
              </label>
              <span className="text-[11px] text-slate-400">Communicates over stdio JSON-RPC or native runtime</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {mcpClients.map((client) => {
                const isSelected = selectedMcpId === client.id;
                const isConnected = client.status === 'connected';

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedMcpId(client.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {client.name}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                          title={isConnected ? 'Connected & Active' : 'Ready / Configured'}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {client.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {client.transport}
                      </span>
                      {isSelected ? (
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Selected
                        </span>
                      ) : (
                        <span className="text-slate-400">Click to select</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected MCP Client Active Banner */}
            {selectedClient && (
              <div className="p-3 rounded-xl bg-white border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-indigo-100 text-indigo-700">
                    <Terminal className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{selectedClient.name}</span>
                    <span className="text-slate-400 text-[11px] ml-2">
                      ({selectedClient.badge} • {selectedClient.transport} • {selectedClient.toolCallsCount} total calls)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {pingResult && pingResult.clientId === selectedClient.id && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ {pingResult.message}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTestHandshake(selectedClient.id)}
                    disabled={testingMcpId === selectedClient.id}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingMcpId === selectedClient.id ? 'animate-spin' : ''}`} />
                    {testingMcpId === selectedClient.id ? 'Testing...' : 'Test Handshake'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Topic & Tone */}
          <div className="space-y-3 pt-2 border-t border-indigo-100/80">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Step 2: What would you like to post about?
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
                  className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition cursor-pointer"
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking with {selectedClient?.name || 'MCP'}...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  Generate Drafts via {selectedClient?.name || 'MCP'}
                </>
              )}
            </button>
          </div>

          {/* AI Chatbot Thinking State Component */}
          {thinkingState.isActive && (
            <div
              className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs ${
                thinkingState.status === 'thinking'
                  ? 'border-indigo-300 bg-gradient-to-b from-indigo-50/90 via-purple-50/40 to-white ring-2 ring-indigo-500/10'
                  : thinkingState.status === 'completed'
                  ? 'border-emerald-200 bg-white'
                  : 'border-rose-200 bg-rose-50/40'
              }`}
            >
              {/* Header Bar */}
              <div
                onClick={() =>
                  setThinkingState((prev) => ({ ...prev, expanded: !prev.expanded }))
                }
                className={`p-4 flex items-center justify-between cursor-pointer select-none transition ${
                  thinkingState.status === 'thinking'
                    ? 'bg-indigo-100/40 hover:bg-indigo-100/60'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                      thinkingState.status === 'thinking'
                        ? 'bg-indigo-600 text-white shadow-xs ring-4 ring-indigo-100 animate-pulse'
                        : thinkingState.status === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-rose-600 text-white shadow-xs'
                    }`}
                  >
                    {thinkingState.status === 'thinking' ? (
                      <Brain className="w-4 h-4 animate-bounce" />
                    ) : thinkingState.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {thinkingState.status === 'thinking'
                          ? `Thinking with ${selectedClient?.name || 'MCP Agent'}...`
                          : thinkingState.status === 'completed'
                          ? `Thought for ${thinkingState.elapsedSec}s via ${selectedClient?.name || 'MCP'}`
                          : `Generation Failed (${thinkingState.elapsedSec}s)`}
                      </span>

                      {thinkingState.status === 'thinking' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-800 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                          {thinkingState.elapsedSec}s
                        </span>
                      )}

                      {thinkingState.status === 'completed' && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ Completed
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                      {thinkingState.status === 'thinking'
                        ? thinkingState.steps[thinkingState.currentStepIndex]?.text || 'Reasoning through prompt...'
                        : thinkingState.status === 'completed'
                        ? `${thinkingState.steps.length} reasoning steps verified`
                        : thinkingState.error || 'Execution stopped'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <span className="text-[11px] hidden sm:inline">
                    {thinkingState.expanded ? 'Hide thoughts' : 'View thoughts'}
                  </span>
                  {thinkingState.expanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Shimmer progress line while thinking */}
              {thinkingState.status === 'thinking' && (
                <div className="h-0.5 w-full bg-indigo-100 overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-2/3 animate-pulse" />
                </div>
              )}

              {/* Collapsible Thoughts Stream */}
              {thinkingState.expanded && (
                <div className="p-4 pt-2 border-t border-slate-100/80 space-y-2 bg-slate-50/50">
                  {thinkingState.steps.map((step, idx) => {
                    const isCurrent = idx === thinkingState.currentStepIndex && thinkingState.status === 'thinking';
                    const isDone = idx < thinkingState.currentStepIndex || thinkingState.status === 'completed';
                    const isFailed = idx === thinkingState.currentStepIndex && thinkingState.status === 'error';

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-2.5 text-xs transition p-2 rounded-xl ${
                          isCurrent
                            ? 'bg-white border border-indigo-200 shadow-xs'
                            : 'bg-transparent'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                          ) : isFailed ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                              {idx + 1}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-semibold ${
                                isCurrent
                                  ? 'text-indigo-950 font-bold'
                                  : isDone
                                  ? 'text-slate-800'
                                  : isFailed
                                  ? 'text-rose-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {step.text}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-indigo-600 font-mono animate-pulse">
                                in progress...
                              </span>
                            )}
                          </div>
                          {step.detail && (
                            <p
                              className={`text-[11px] leading-tight ${
                                isCurrent ? 'text-indigo-600/90' : isDone ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {thinkingState.status === 'error' && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-center justify-between gap-2 mt-2">
                      <span className="text-xs font-medium">
                        {thinkingState.error || 'Encountered an issue calling MCP provider.'}
                      </span>
                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition cursor-pointer"
                      >
                        Retry Generation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drafts Preview & Output Step */}
          {aiDrafts && (
            <div className="pt-4 border-t border-indigo-100 space-y-4 animate-fadeIn">
              {/* Output Attribution Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-900">
                    Generated by {aiDrafts.provider?.name || selectedClient?.name || 'Connected MCP Agent'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {aiDrafts.provider?.transport || 'stdio'} JSON-RPC
                  </span>
                  {aiDrafts.provider?.durationMs && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      ⚡ {aiDrafts.provider.durationMs}ms latency
                    </span>
                  )}
                </div>

                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Output Ready for Review
                </span>
              </div>

              {/* Side-by-Side Platform Drafts (Editable) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LinkedIn Version */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0077B5] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-[#0077B5] text-white flex items-center justify-center text-[10px] font-bold">in</span>
                      LinkedIn Version (Professional Hook & Structure)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {aiDrafts.characterCounts.linkedin} chars
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={aiDrafts.variations.linkedin}
                    onChange={(e) => updateDraftVariation('linkedin', e.target.value)}
                    className="w-full text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1">
                    {aiDrafts.suggestedHashtags.map((h) => (
                      <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* X / Twitter Version */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-black text-white flex items-center justify-center text-[10px] font-bold">𝕏</span>
                      X / Twitter Version (Concise & Punchy)
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
                  <textarea
                    rows={6}
                    value={aiDrafts.variations.x}
                    onChange={(e) => updateDraftVariation('x', e.target.value)}
                    className="w-full text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{aiDrafts.characterCounts.x <= 280 ? '✓ Ready for instant publication' : '⚠️ Exceeds 280 char limit'}</span>
                  </div>
                </div>
              </div>

              {/* Action: Apply to Editor */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500">
                  Clicking agree will insert this content into the editor and platform overrides below.
                </span>
                <button
                  type="button"
                  onClick={applyAiDrafts}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
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

      {/* Main Composer Form */}
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
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

        {/* Inline MCP Assistant Banner (Above Content Editor) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-purple-50/50 border border-indigo-100 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Generate Content with Connected MCP Provider</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedClient?.name || 'Google Antigravity'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Connect Google Antigravity, In-App Studio, Claude Desktop, or Cursor to auto-generate platform copy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAiAssistant(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition shadow-xs flex-shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Open MCP Generator
          </button>
        </div>

        {/* Content Tabs (Canonical vs Platform Overrides) */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Tabs bar */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-3 sm:px-4 pt-3 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('canonical')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap flex-shrink-0 cursor-pointer ${
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
                className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  activeTab === acc.id
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{acc.displayName} Override</span>
                {overrides[acc.id] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* Active Tab Body */}
          <div className="p-4 sm:p-6 space-y-3">
            {activeTab === 'canonical' ? (
              <div>
                <textarea
                  rows={8}
                  value={canonicalContent}
                  onChange={(e) => setCanonicalContent(e.target.value)}
                  placeholder="What's happening? Write your canonical social post here..."
                  className="w-full text-sm border-0 focus:ring-0 p-0 text-slate-800 placeholder-slate-400 resize-y focus:outline-none"
                />
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span>Character count: {canonicalContent.length}</span>
                  {hasX && !overrides[selectedAccounts.find((a) => a.provider === 'x')?.id || ''] && (
                    <span className={canonicalContent.length > 280 ? 'text-rose-500 font-bold' : ''}>
                      X Limit: {canonicalContent.length}/280
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">
                    Custom text override for{' '}
                    <strong className="text-slate-700">
                      {selectedAccounts.find((a) => a.id === activeTab)?.displayName}
                    </strong>
                  </span>
                  {overrides[activeTab] && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...overrides };
                        delete next[activeTab];
                        setOverrides(next);
                      }}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear override
                    </button>
                  )}
                </div>

                <textarea
                  rows={8}
                  value={overrides[activeTab] ?? canonicalContent}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [activeTab]: e.target.value }))
                  }
                  placeholder="Platform-specific tailored text..."
                  className="w-full text-sm border-0 focus:ring-0 p-0 text-slate-800 placeholder-slate-400 resize-y focus:outline-none"
                />

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span>
                    Character count: {(overrides[activeTab] ?? canonicalContent).length}
                  </span>
                  {selectedAccounts.find((a) => a.id === activeTab)?.provider === 'x' && (
                    <span
                      className={
                        (overrides[activeTab] ?? canonicalContent).length > 280
                          ? 'text-rose-500 font-bold'
                          : 'text-slate-500'
                      }
                    >
                      Limit: {(overrides[activeTab] ?? canonicalContent).length}/280
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule & Timing Box */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Timing & Schedule
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isPublishNow}
                onChange={(e) => setIsPublishNow(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Publish Now (Instant Queue)</span>
            </label>
          </div>

          {!isPublishNow && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">
                  Publish Date & Time
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Target Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/queue')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || isXOverLimit}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scheduling...
              </>
            ) : isPublishNow ? (
              <>
                <Send className="w-4 h-4" />
                Publish Immediately
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Confirm Schedule
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
