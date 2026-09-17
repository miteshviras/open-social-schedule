'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Bot,
  RefreshCw,
  Edit3,
  Download,
  Scissors,
  Check,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: 'linkedin' | 'x' | 'mock' | string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  status: string;
}

interface StagedTarget {
  socialAccountId: string;
  provider: string;
  displayName: string;
  content: string;
  charCount: number;
  charLimit: number;
  isValid: boolean;
  validationError?: string;
}

interface StagedPost {
  id: string;
  rowIndex: number;
  canonicalContent: string;
  linkedinContent: string;
  xContent: string;
  publishAtUtc: string;
  publishAtLocalDisplay: string;
  targets: StagedTarget[];
  isValid: boolean;
  validationError?: string;
}

interface McpClientInfo {
  id: string;
  name: string;
  badge: string;
  status: 'connected' | 'standby' | 'ready';
  description: string;
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

  // Connected Social Accounts
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Target Platform Selection: 'both' | 'linkedin' | 'x'
  const [platformMode, setPlatformMode] = useState<'both' | 'linkedin' | 'x'>('both');
  const [selectedLinkedinAccountId, setSelectedLinkedinAccountId] = useState<string>('');
  const [selectedXAccountId, setSelectedXAccountId] = useState<string>('');

  // Input Method Tab: 'ai' | 'text' | 'csv'
  const [inputTab, setInputTab] = useState<'ai' | 'text' | 'csv'>('ai');

  // AI Bulk Generator Settings
  const [aiTopic, setAiTopic] = useState('Essential engineering principles for reliable fullstack architecture');
  const [aiCount, setAiCount] = useState(5);
  const [aiTone, setAiTone] = useState<'thought-leadership' | 'professional' | 'punchy' | 'educational' | 'casual'>('thought-leadership');
  const [selectedMcpClientId, setSelectedMcpClientId] = useState('antigravity');
  const [mcpThinking, setMcpThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string>('');
  const [thinkingElapsed, setThinkingElapsed] = useState(0);

  // Manual Text Input Settings
  const [textDelimiter, setTextDelimiter] = useState<'line' | 'block'>('block');
  const [manualText, setManualText] = useState(
    `Why self-hosting your social scheduler protects your core business data
---
Mastering the Model Context Protocol (MCP): 5 mental models for agentic developers
---
How to structure a production TypeScript monorepo with zero unnecessary tooling
---
Why durable asynchronous state machines are essential for background workers
---
10 high-leverage habits of senior software architects`
  );
  const [manualLinkedinText, setManualLinkedinText] = useState('');
  const [manualXText, setManualXText] = useState('');
  const [manualSeparateTabs, setManualSeparateTabs] = useState(false);

  // Cadence & Timing Settings
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

  // Staged Items (Preview Grid)
  const [stagedPosts, setStagedPosts] = useState<StagedPost[]>([]);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inline Row Editor Modal
  const [editingPost, setEditingPost] = useState<StagedPost | null>(null);

  // Available MCP Clients
  const mcpClients: McpClientInfo[] = [
    {
      id: 'antigravity',
      name: 'Google Antigravity',
      badge: 'Autonomous Agent',
      status: 'connected',
      description: 'Native AGY agent with DeepMind reasoning & multi-turn workflows',
    },
    {
      id: 'gemini',
      name: 'Gemini 2.5 Flash',
      badge: 'Direct LLM',
      status: 'connected',
      description: 'High-speed structured social media generation',
    },
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      badge: 'MCP Client',
      status: 'ready',
      description: 'Anthropic Claude Desktop MCP bridge',
    },
    {
      id: 'cursor',
      name: 'Cursor IDE',
      badge: 'IDE Client',
      status: 'ready',
      description: 'Cursor IDE MCP background integration',
    },
  ];

  // Load connected accounts on mount
  useEffect(() => {
    async function load() {
      try {
        setLoadingAccounts(true);
        const res = await fetch('/api/social-accounts');
        if (res.ok) {
          const data: SocialAccount[] = await res.json();
          setAccounts(data);

          const li = data.find((a) => a.provider === 'linkedin' && a.status === 'active');
          const x = data.find((a) => a.provider === 'x' && a.status === 'active');
          const mock = data.find((a) => a.provider === 'mock');

          if (li) setSelectedLinkedinAccountId(li.id);
          else if (mock) setSelectedLinkedinAccountId(mock.id);

          if (x) setSelectedXAccountId(x.id);
          else if (mock) setSelectedXAccountId(mock.id);
        }
      } catch (err) {
        console.error('Failed to load social accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    load();
  }, []);

  // Timer for thinking state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mcpThinking) {
      setThinkingElapsed(0);
      interval = setInterval(() => {
        setThinkingElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mcpThinking]);

  // Helpers to get accounts
  const linkedinAccounts = accounts.filter((a) => a.provider === 'linkedin' || a.provider === 'mock');
  const xAccounts = accounts.filter((a) => a.provider === 'x' || a.provider === 'mock');

  // AI Bulk Generate
  async function handleAIBulkGenerate() {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!aiTopic.trim()) {
      setErrorMsg('Please enter a topic or theme for the AI bulk generator.');
      return;
    }

    if (platformMode === 'linkedin' && !selectedLinkedinAccountId) {
      setErrorMsg('Please select a target LinkedIn account.');
      return;
    }
    if (platformMode === 'x' && !selectedXAccountId) {
      setErrorMsg('Please select a target X (Twitter) account.');
      return;
    }
    if (platformMode === 'both' && (!selectedLinkedinAccountId || !selectedXAccountId)) {
      setErrorMsg('Please select both a LinkedIn and X account for cross-platform scheduling.');
      return;
    }

    try {
      setMcpThinking(true);
      setThinkingStep('Connecting to AI agent & analyzing campaign topic...');

      setTimeout(() => {
        setThinkingStep(`Synthesizing ${aiCount} angles & formatting LinkedIn structured copy...`);
      }, 800);

      setTimeout(() => {
        setThinkingStep('Formulating punchy <=280-char tweets with hashtags for X...');
      }, 1600);

      const targetPlatforms = platformMode === 'both' ? ['linkedin', 'x'] : [platformMode];

      const res = await fetch('/api/schedules/bulk-ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          count: Number(aiCount),
          tone: aiTone,
          platforms: targetPlatforms,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate bulk posts via AI');
      }

      const data = await res.json();
      const generatedPosts = data.posts || [];

      await createStagedPreviewFromRawItems(
        generatedPosts.map((p: any) => ({
          canonical: p.canonicalContent,
          linkedin: p.linkedin || p.canonicalContent,
          x: p.x || p.canonicalContent,
        }))
      );

      setSuccessMsg(`Generated ${generatedPosts.length} posts tailored for ${platformMode === 'both' ? 'LinkedIn & X' : platformMode.toUpperCase()}!`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setMcpThinking(false);
    }
  }

  function splitRawText(text: string, delimiter: 'line' | 'block'): string[] {
    if (delimiter === 'block') {
      return text
        .split(/\n\s*---\s*\n/)
        .map((b) => b.trim())
        .filter((b) => b.length > 0);
    } else {
      return text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }
  }

  // Manual Text Preview
  async function handleManualTextPreview() {
    setErrorMsg(null);
    setSuccessMsg(null);

    let items: Array<{ canonical: string; linkedin: string; x: string }> = [];

    if (platformMode === 'both' && manualSeparateTabs) {
      const liBlocks = splitRawText(manualLinkedinText, textDelimiter);
      const xBlocks = splitRawText(manualXText, textDelimiter);
      const maxLen = Math.max(liBlocks.length, xBlocks.length);

      if (maxLen === 0) {
        setErrorMsg('Please enter at least one post.');
        return;
      }

      for (let i = 0; i < maxLen; i++) {
        const li = liBlocks[i] || xBlocks[i] || '';
        const x = xBlocks[i] || liBlocks[i] || '';
        items.push({ canonical: li || x, linkedin: li, x });
      }
    } else {
      const rawBlocks = splitRawText(manualText, textDelimiter);
      if (rawBlocks.length === 0) {
        setErrorMsg('Please enter at least one post.');
        return;
      }

      items = rawBlocks.map((content) => {
        let xTweet = content;
        if (xTweet.length > 280) xTweet = xTweet.slice(0, 275) + '...';
        return { canonical: content, linkedin: content, x: xTweet };
      });
    }

    await createStagedPreviewFromRawItems(items);
  }

  // CSV Upload
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      parseCsvContent(content);
    };
    reader.readAsText(file);
  }

  async function parseCsvContent(csv: string) {
    try {
      const lines = csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        setErrorMsg('CSV file is empty or missing data rows.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      const contentIdx = headers.findIndex((h) => h.includes('content') || h.includes('post') || h.includes('text'));
      const linkedinIdx = headers.findIndex((h) => h.includes('linkedin'));
      const xIdx = headers.findIndex((h) => h.includes('x') || h.includes('tweet') || h.includes('twitter'));

      const rawItems: Array<{ canonical: string; linkedin: string; x: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        values.push(cur.trim());

        const masterText = contentIdx >= 0 ? values[contentIdx] : values[0] || '';
        const liText = linkedinIdx >= 0 ? values[linkedinIdx] : masterText;
        const xText = xIdx >= 0 ? values[xIdx] : (masterText.length > 280 ? masterText.slice(0, 275) + '...' : masterText);

        if (masterText || liText || xText) {
          rawItems.push({
            canonical: masterText || liText || xText,
            linkedin: liText || masterText,
            x: xText || masterText,
          });
        }
      }

      if (rawItems.length === 0) {
        setErrorMsg('Could not find valid post content columns in the uploaded CSV.');
        return;
      }

      await createStagedPreviewFromRawItems(rawItems);
      setSuccessMsg(`Parsed ${rawItems.length} posts from CSV.`);
    } catch (err: any) {
      setErrorMsg(`Failed to parse CSV: ${err.message}`);
    }
  }

  function downloadSampleCsv() {
    let csvHeader = '';
    let csvSample = '';

    if (platformMode === 'both') {
      csvHeader = 'topic,linkedin_content,x_content';
      csvSample = `10 Engineering Principles,"Most software architectures fail because they prioritize theoretical elegance over operational simplicity. Here are 3 core rules to ship reliably:\\n\\n• Keep component boundaries clean\\n• Strong types always beat documentation\\n• Instrument metrics from day one\\n\\nWhat is your #1 design principle? #SoftwareArchitecture","Most software architectures fail from over-complexity. Keep boundaries clean, enforce strict types, and instrument metrics early. #DevCommunity"
MCP in 5 Steps,"The Model Context Protocol (MCP) is revolutionizing AI agent tool calling. Here is how to configure local-first MCP servers with zero friction:\\n\\n1. Standardize schema definitions\\n2. Decouple worker state machine\\n3. Encrypt sensitive credentials\\n\\nRead our full breakdown on GitHub! #AI #OpenSource","The Model Context Protocol (MCP) is revolutionizing AI agent workflows. Decoupled state machines and encrypted vaults keep systems rock solid. #AI"`;
    } else {
      csvHeader = 'topic,content';
      csvSample = `Engineering Leadership,"Great engineering leaders protect their team's focus above all else. Clear boundaries and high trust produce high velocity."
Clean Code,"Refactoring is not a special occasion; it is the natural habit of continuous maintenance. Clean code is code that is easy to delete."`;
    }

    const blob = new Blob([`${csvHeader}\n${csvSample}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = platformMode === 'both' ? 'open_social_bulk_cross_platform_template.csv' : 'open_social_bulk_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Create Preview via Backend
  async function createStagedPreviewFromRawItems(
    rawItems: Array<{ canonical: string; linkedin: string; x: string }>
  ) {
    if (rawItems.length === 0) return;

    try {
      setGenerating(true);

      const targetAccounts: Array<{ id: string; provider: string }> = [];
      if (platformMode === 'linkedin' || platformMode === 'both') {
        if (selectedLinkedinAccountId) {
          targetAccounts.push({ id: selectedLinkedinAccountId, provider: 'linkedin' });
        }
      }
      if (platformMode === 'x' || platformMode === 'both') {
        if (selectedXAccountId) {
          targetAccounts.push({ id: selectedXAccountId, provider: 'x' });
        }
      }

      if (targetAccounts.length === 0) {
        throw new Error('Please select at least one connected social account to schedule posts.');
      }

      const rows = rawItems.map((item) => ({
        content: item.canonical,
        targets: targetAccounts.map((acc) => ({
          socialAccountId: acc.id,
          provider: acc.provider,
          contentOverride: acc.provider === 'linkedin' ? item.linkedin : item.x,
        })),
      }));

      const cadence = {
        startDateUtc: new Date(startDate).toISOString(),
        timezone,
        intervalMinutes: Number(intervalMinutes) || 120,
      };

      const res = await fetch('/api/schedules/bulk-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, cadence }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to calculate schedule preview');
      }

      const data = await res.json();
      const previewItems = data.items || [];

      const staged: StagedPost[] = previewItems.map((pi: any, idx: number) => {
        const raw = rawItems[idx];
        const targets: StagedTarget[] = (pi.targets || []).map((t: any) => ({
          socialAccountId: t.socialAccountId,
          provider: t.provider,
          displayName: t.displayName,
          content: t.content,
          charCount: t.charCount,
          charLimit: t.charLimit,
          isValid: t.isValid,
          validationError: t.validationError,
        }));

        return {
          id: `staged_${idx + 1}_${Date.now()}`,
          rowIndex: pi.rowIndex,
          canonicalContent: pi.content,
          linkedinContent: raw?.linkedin || pi.content,
          xContent: raw?.x || pi.content,
          publishAtUtc: pi.publishAtUtc,
          publishAtLocalDisplay: pi.publishAtLocalDisplay,
          targets,
          isValid: pi.isValid,
          validationError: pi.validationError,
        };
      });

      setStagedPosts(staged);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function deleteRow(index: number) {
    const updated = stagedPosts.filter((_, i) => i !== index);
    setStagedPosts(
      updated.map((p, i) => ({
        ...p,
        rowIndex: i + 1,
      }))
    );
  }

  function handleSaveEdit(updated: StagedPost) {
    setStagedPosts((prev) =>
      prev.map((p) => {
        if (p.id !== updated.id) return p;

        const updatedTargets = p.targets.map((tgt) => {
          const effectiveContent = tgt.provider === 'linkedin' ? updated.linkedinContent : updated.xContent;
          const charCount = effectiveContent.length;
          const isTgtValid = charCount <= tgt.charLimit && charCount > 0;
          let err: string | undefined;
          if (charCount === 0) err = 'Content cannot be empty.';
          else if (charCount > tgt.charLimit) {
            err = `Exceeds ${tgt.provider.toUpperCase()} limit of ${tgt.charLimit} characters (${charCount} chars).`;
          }

          return {
            ...tgt,
            content: effectiveContent,
            charCount,
            isValid: isTgtValid,
            validationError: err,
          };
        });

        const isAllValid = updatedTargets.every((t) => t.isValid);
        const primaryError = updatedTargets.find((t) => !t.isValid)?.validationError;

        return {
          ...p,
          canonicalContent: updated.canonicalContent,
          linkedinContent: updated.linkedinContent,
          xContent: updated.xContent,
          targets: updatedTargets,
          isValid: isAllValid,
          validationError: primaryError,
        };
      })
    );
    setEditingPost(null);
  }

  function autoCondenseX(index: number) {
    setStagedPosts((prev) =>
      prev.map((p, idx) => {
        if (idx !== index) return p;

        let condensed = p.xContent;
        if (condensed.length > 275) {
          condensed = condensed.slice(0, 272) + '...';
        }

        const updatedTargets = p.targets.map((tgt) => {
          if (tgt.provider !== 'x') return tgt;
          return {
            ...tgt,
            content: condensed,
            charCount: condensed.length,
            isValid: condensed.length <= 280,
            validationError: undefined,
          };
        });

        return {
          ...p,
          xContent: condensed,
          targets: updatedTargets,
          isValid: updatedTargets.every((t) => t.isValid),
          validationError: updatedTargets.find((t) => !t.isValid)?.validationError,
        };
      })
    );
  }

  async function handleCommitAll() {
    setErrorMsg(null);
    if (stagedPosts.length === 0) return;

    const invalidPosts = stagedPosts.filter((p) => !p.isValid);
    if (invalidPosts.length > 0) {
      setErrorMsg(`Cannot commit: ${invalidPosts.length} post(s) contain validation errors. Please review character limits highlighted below.`);
      return;
    }

    try {
      setCommitting(true);

      const items = stagedPosts.map((p) => ({
        content: p.canonicalContent,
        publishAtUtc: p.publishAtUtc,
        timezone,
        targets: p.targets.map((tgt) => ({
          socialAccountId: tgt.socialAccountId,
          contentOverride: tgt.content,
          publishAtUtc: p.publishAtUtc,
          timezone,
        })),
      }));

      const res = await fetch('/api/schedules/bulk-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default_local_user',
          items,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to commit bulk schedule.');
      }

      const created = await res.json();
      setSuccessMsg(`Successfully scheduled ${stagedPosts.length} posts (${created.length} platform targets)! Redirecting to queue...`);

      setTimeout(() => {
        router.push('/queue');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCommitting(false);
    }
  }

  const validCount = stagedPosts.filter((p) => p.isValid).length;
  const invalidCount = stagedPosts.length - validCount;
  const totalTargetsCount = stagedPosts.reduce((acc, p) => acc + p.targets.length, 0);


  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-600" />
            Bulk Post Scheduler
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate or import batches of posts tailored for LinkedIn, X (Twitter), or both with automated interval spacing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/queue"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            View Schedule Queue
          </Link>
          <button
            onClick={downloadSampleCsv}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="Download formatted CSV spreadsheet template"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Download CSV Template
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: Target Platform & Social Account Selection */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Select Target Social Media
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Configure content formats and account bindings
          </span>
        </div>

        {/* Platform Selection Segmented Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Both */}
          <button
            type="button"
            onClick={() => setPlatformMode('both')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
              platformMode === 'both'
                ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#0077B5] text-white text-xs font-bold flex items-center justify-center">
                  in
                </span>
                <span className="w-6 h-6 rounded bg-black text-white text-xs font-bold flex items-center justify-center">
                  𝕏
                </span>
              </div>
              {platformMode === 'both' && <Check className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">Both (LinkedIn &amp; X)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Dual formatting: Rich long-form for LinkedIn + condensed &le;280 chars for X
              </div>
            </div>
          </button>

          {/* LinkedIn Only */}
          <button
            type="button"
            onClick={() => setPlatformMode('linkedin')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
              platformMode === 'linkedin'
                ? 'border-[#0077B5] bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded bg-[#0077B5] text-white text-xs font-bold flex items-center justify-center">
                in
              </span>
              {platformMode === 'linkedin' && <Check className="w-4 h-4 text-[#0077B5]" />}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">LinkedIn Only</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Professional feed posts, rich takeaways, hooks, up to 3,000 characters
              </div>
            </div>
          </button>

          {/* X (Twitter) Only */}
          <button
            type="button"
            onClick={() => setPlatformMode('x')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
              platformMode === 'x'
                ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded bg-black text-white text-xs font-bold flex items-center justify-center">
                𝕏
              </span>
              {platformMode === 'x' && <Check className="w-4 h-4 text-slate-900" />}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">X (Twitter) Only</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Punchy, concise posts strictly capped under 280 characters with hashtags
              </div>
            </div>
          </button>
        </div>

        {/* Account Bindings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* LinkedIn Account Picker */}
          {(platformMode === 'linkedin' || platformMode === 'both') && (
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <span className="w-4 h-4 rounded bg-[#0077B5] text-white text-[10px] font-bold flex items-center justify-center">
                  in
                </span>
                Target LinkedIn Profile / Page
              </label>
              {linkedinAccounts.length > 0 ? (
                <select
                  value={selectedLinkedinAccountId}
                  onChange={(e) => setSelectedLinkedinAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {linkedinAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayName} ({acc.provider.toUpperCase()}) {acc.status !== 'active' ? `[${acc.status}]` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <span>No LinkedIn account connected yet.</span>
                  <Link href="/accounts" className="text-blue-700 font-bold hover:underline flex items-center gap-0.5">
                    Connect <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* X Account Picker */}
          {(platformMode === 'x' || platformMode === 'both') && (
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <span className="w-4 h-4 rounded bg-black text-white text-[10px] font-bold flex items-center justify-center">
                  𝕏
                </span>
                Target X (Twitter) Handle
              </label>
              {xAccounts.length > 0 ? (
                <select
                  value={selectedXAccountId}
                  onChange={(e) => setSelectedXAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {xAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayName} {acc.username ? `@${acc.username}` : ''} ({acc.provider.toUpperCase()})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <span>No X account connected yet.</span>
                  <Link href="/accounts" className="text-blue-700 font-bold hover:underline flex items-center gap-0.5">
                    Connect <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Input Method (AI Bulk Generator vs Manual Text vs CSV) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Step Header & Tab Navigation */}
        <div className="p-5 sm:p-6 pb-0 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Create or Import Content
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Choose your preferred creation method
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-px">
            <button
              onClick={() => setInputTab('ai')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                inputTab === 'ai'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Bulk Generator (MCP / Gemini)
            </button>

            <button
              onClick={() => setInputTab('text')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                inputTab === 'text'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Manual Text &amp; Multi-line Blocks
            </button>

            <button
              onClick={() => setInputTab('csv')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                inputTab === 'csv'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV Spreadsheet Import
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* TAB 1: AI BULK GENERATOR */}
          {inputTab === 'ai' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Topic / Prompt */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Campaign Topic or Theme
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. 5 tips for modern web architecture, Daily productivity tips..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[11px] text-slate-400">
                    The AI agent generates complementary angles with tailored {platformMode === 'both' ? 'LinkedIn and X' : platformMode} variations.
                  </span>
                </div>

                {/* Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Post Count ({aiCount} posts)
                  </label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={3}>3 Posts</option>
                    <option value={5}>5 Posts (Recommended)</option>
                    <option value={10}>10 Posts</option>
                    <option value={15}>15 Posts</option>
                    <option value={20}>20 Posts</option>
                  </select>
                </div>

                {/* Tone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Voice Tone
                  </label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="thought-leadership">Thought-Leadership</option>
                    <option value="professional">Professional</option>
                    <option value="punchy">Punchy &amp; Direct</option>
                    <option value="educational">Educational &amp; Step-by-Step</option>
                    <option value="casual">Casual / Conversational</option>
                  </select>
                </div>
              </div>

              {/* MCP Agent Selector */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Connected Agent:</span>
                  <select
                    value={selectedMcpClientId}
                    onChange={(e) => setSelectedMcpClientId(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-800"
                  >
                    {mcpClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.badge})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAIBulkGenerate}
                  disabled={mcpThinking || generating}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {mcpThinking ? `Generating ${aiCount} Posts (${thinkingElapsed}s)...` : `Generate ${aiCount} Posts with AI`}
                </button>
              </div>

              {/* Live Thinking Status Box */}
              {mcpThinking && (
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 animate-in fade-in duration-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      Agent Thinking &amp; Structuring ({thinkingElapsed}s)
                    </span>
                    <span className="text-[10px] bg-indigo-200/70 text-indigo-800 font-mono px-2 py-0.5 rounded">
                      Model Context Protocol
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800 font-medium">
                    {thinkingStep}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL TEXT / BLOCKS */}
          {inputTab === 'text' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Delimiter Mode:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                    <button
                      type="button"
                      onClick={() => setTextDelimiter('block')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                        textDelimiter === 'block' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Multi-Line Blocks (<code className="text-[10px] font-mono">---</code>)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextDelimiter('line')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                        textDelimiter === 'line' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      One Post Per Line
                    </button>
                  </div>
                </div>

                {platformMode === 'both' && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualSeparateTabs}
                      onChange={(e) => setManualSeparateTabs(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Provide separate LinkedIn &amp; X text columns
                  </label>
                )}
              </div>

              {platformMode === 'both' && manualSeparateTabs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#0077B5] flex items-center gap-1 mb-1">
                      <span>LinkedIn Posts ({splitRawText(manualLinkedinText, textDelimiter).length} detected)</span>
                    </label>
                    <textarea
                      rows={8}
                      value={manualLinkedinText}
                      onChange={(e) => setManualLinkedinText(e.target.value)}
                      placeholder={textDelimiter === 'block' ? 'Paste full LinkedIn posts separated by ---\n\nPost 1...\n---\nPost 2...' : 'One post per line...'}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1 mb-1">
                      <span>X (Twitter) Posts ({splitRawText(manualXText, textDelimiter).length} detected)</span>
                    </label>
                    <textarea
                      rows={8}
                      value={manualXText}
                      onChange={(e) => setManualXText(e.target.value)}
                      placeholder={textDelimiter === 'block' ? 'Paste tweets under 280 chars separated by ---\n\nTweet 1...\n---\nTweet 2...' : 'One tweet per line...'}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={8}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={
                      textDelimiter === 'block'
                        ? 'Paste multi-paragraph posts separated by ---\n\nExample Post 1 with bullet points...\n---\nExample Post 2...'
                        : 'Paste your posts here, one per line...'
                    }
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>
                      {splitRawText(manualText, textDelimiter).length} post(s) detected
                    </span>
                    <span>
                      {textDelimiter === 'block' ? 'Using "---" divider between posts' : 'Splitting by newline'}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleManualTextPreview}
                disabled={generating}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                {generating ? 'Processing Posts...' : 'Parse & Generate Staging Preview'}
              </button>
            </div>
          )}

          {/* TAB 3: CSV SPREADSHEET */}
          {inputTab === 'csv' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 sm:p-8 text-center transition bg-slate-50/50">
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 hover:underline">
                      Click to choose CSV file
                    </span>
                    <span className="text-xs text-slate-500"> or drag and drop here</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Supports columns: <code className="font-mono text-slate-600">content</code>, <code className="font-mono text-slate-600">linkedin_content</code>, <code className="font-mono text-slate-600">x_content</code>, <code className="font-mono text-slate-600">date</code>, <code className="font-mono text-slate-600">time</code>.
                  </p>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Need the correct column structure? Download our pre-built template:</span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 3: Cadence & Automated Spacing Configuration */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Cadence &amp; Scheduling Interval
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Automated spacing prevents rate limits and spam flags
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Start Date & Time */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              First Post Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Interval */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Interval Between Posts
            </label>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
              <option value={120}>Every 2 hours (Recommended)</option>
              <option value={240}>Every 4 hours</option>
              <option value={360}>Every 6 hours</option>
              <option value={720}>Every 12 hours</option>
              <option value={1440}>Every 24 hours (Daily)</option>
              <option value={2880}>Every 2 days</option>
              <option value={10080}>Weekly (Every 7 days)</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Display Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* STEP 4: Interactive Staging & Review Table */}
      {stagedPosts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
          <div className="p-5 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Review Staged Posts ({stagedPosts.length} posts &bull; {totalTargetsCount} targets)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect platform formatting, character limits, and publish times before committing to the schedule queue.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCommitAll}
              disabled={committing || invalidCount > 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {committing ? 'Committing to Queue...' : `Schedule All (${stagedPosts.length}) Posts Now`}
            </button>
          </div>

          {/* Staging Summary Pill */}
          <div className="px-5 sm:px-6 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validCount} Valid
            </span>
            {invalidCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                {invalidCount} Errors (Check Character Limits)
              </span>
            )}
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500">
              Starts: <strong className="text-slate-700">{stagedPosts[0]?.publishAtLocalDisplay}</strong> ({timezone})
            </span>
          </div>

          {/* Staging Grid */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-44">Publish Time ({timezone})</th>
                  <th className="p-3 w-28">Target(s)</th>
                  <th className="p-3">Content Preview</th>
                  <th className="p-3 w-24 text-center">Length</th>
                  <th className="p-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stagedPosts.map((post, idx) => {
                  const xTarget = post.targets.find((t) => t.provider === 'x');
                  const liTarget = post.targets.find((t) => t.provider === 'linkedin');
                  const isXOverLimit = xTarget ? xTarget.charCount > 280 : false;

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center text-slate-400 font-mono font-bold">
                        {post.rowIndex}
                      </td>

                      {/* Scheduled Time */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {post.publishAtLocalDisplay}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {intervalMinutes >= 1440
                            ? `Day ${idx + 1}`
                            : `+${(idx * intervalMinutes) / 60}h from start`}
                        </div>
                      </td>

                      {/* Targets */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {post.targets.map((tgt) => (
                            <span
                              key={tgt.socialAccountId}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                tgt.provider === 'linkedin'
                                  ? 'bg-blue-100 text-[#0077B5]'
                                  : tgt.provider === 'x'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {tgt.provider === 'linkedin' ? 'in' : tgt.provider === 'x' ? '𝕏' : tgt.provider}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Content Preview */}
                      <td className="p-3 space-y-1.5 max-w-md">
                        {platformMode === 'both' ? (
                          <div className="space-y-1">
                            {/* LinkedIn content */}
                            <div className="p-2 bg-blue-50/40 rounded-lg border border-blue-100 text-slate-800 text-[11px] leading-relaxed line-clamp-2">
                              <span className="font-bold text-[#0077B5] mr-1">[LinkedIn]:</span>
                              {post.linkedinContent}
                            </div>
                            {/* X content */}
                            <div className={`p-2 rounded-lg border text-[11px] leading-relaxed line-clamp-2 ${
                              isXOverLimit
                                ? 'bg-rose-50 border-rose-200 text-rose-900'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}>
                              <span className="font-bold text-slate-900 mr-1">[𝕏 Tweet]:</span>
                              {post.xContent}
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-800 text-xs leading-relaxed line-clamp-3">
                            {post.canonicalContent}
                          </div>
                        )}

                        {post.validationError && (
                          <div className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{post.validationError}</span>
                          </div>
                        )}
                      </td>

                      {/* Length / Character Counts */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {xTarget ? (
                          <div className="space-y-0.5">
                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                                isXOverLimit
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              𝕏 {xTarget.charCount}/280
                            </span>
                            {liTarget && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                in {liTarget.charCount}/3000
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-600">
                            {post.canonicalContent.length} chars
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {isXOverLimit && (
                            <button
                              type="button"
                              onClick={() => autoCondenseX(idx)}
                              title="1-Click AI Auto-Condense for X"
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingPost(post)}
                            title="Edit post content"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRow(idx)}
                            title="Remove from batch"
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inline Row Editor Modal */}
      {editingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                Edit Staged Post #{editingPost.rowIndex}
              </h4>
              <button
                onClick={() => setEditingPost(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>

            {platformMode === 'both' ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#0077B5]">
                      LinkedIn Version
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {editingPost.linkedinContent.length} / 3000 chars
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={editingPost.linkedinContent}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, linkedinContent: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-900">
                      X (Twitter) Version (Limit: 280 chars)
                    </label>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        editingPost.xContent.length > 280 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {editingPost.xContent.length} / 280 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={editingPost.xContent}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, xContent: e.target.value })
                    }
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 ${
                      editingPost.xContent.length > 280
                        ? 'border-rose-300 ring-rose-500/20'
                        : 'border-slate-200 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Post Content
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {editingPost.canonicalContent.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={editingPost.canonicalContent}
                  onChange={(e) =>
                    setEditingPost({
                      ...editingPost,
                      canonicalContent: e.target.value,
                      linkedinContent: e.target.value,
                      xContent: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingPost)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
