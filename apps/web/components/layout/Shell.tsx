'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  PenSquare,
  Layers,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [workerHealth, setWorkerHealth] = useState<'healthy' | 'checking' | 'offline'>('checking');

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok') setWorkerHealth('healthy');
          else setWorkerHealth('offline');
        } else {
          setWorkerHealth('offline');
        }
      } catch {
        setWorkerHealth('offline');
      }
    }
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/queue', label: 'Schedule Queue', icon: Clock },
    { href: '/calendar', label: 'Calendar View', icon: Calendar },
    { href: '/compose', label: 'Compose Post', icon: PenSquare },
    { href: '/bulk', label: 'Bulk Scheduler', icon: Layers },
    { href: '/accounts', label: 'Connected Accounts', icon: Share2 },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              OS
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-none">
                Open Social
              </h1>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-1">
                Local-First Scheduler
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status / Local-first indicator */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Local Worker
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                workerHealth === 'healthy'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : workerHealth === 'checking'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  workerHealth === 'healthy'
                    ? 'bg-emerald-500 animate-pulse'
                    : workerHealth === 'checking'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              {workerHealth === 'healthy' ? 'Active' : workerHealth === 'checking' ? 'Checking' : 'Offline'}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 px-2 leading-relaxed">
            Database & tokens encrypted with AES-256 locally at rest.
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
              v0.1.0 MVP
            </span>
            <span className="text-xs font-medium text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              MCP Native Interface Ready
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/compose"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <PenSquare className="w-3.5 h-3.5" />
              New Post
            </Link>
          </div>
        </header>

        {/* Page View Body */}
        <main className="p-8 max-w-7xl w-full mx-auto flex-1">{children}</main>
      </div>
    </div>
  );
}
