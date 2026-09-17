'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '../Logo';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  PenSquare,
  Layers,
  Share2,
  Cpu,
  Bot,
  Menu,
  X,
  Plus,
} from 'lucide-react';

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [workerHealth, setWorkerHealth] = useState<'healthy' | 'checking' | 'offline'>('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

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
    { href: '/mcp', label: 'MCP AI Hub', icon: Bot },
  ];

  // Mobile bottom navigation items (thumb-friendly primary actions)
  const bottomNavItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/queue', label: 'Queue', icon: Clock },
    { href: '/compose', label: 'Compose', icon: PenSquare, isPrimary: true },
    { href: '/accounts', label: 'Accounts', icon: Share2 },
    { href: '/mcp', label: 'MCP Hub', icon: Bot },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="p-5 border-b border-slate-100">
            <Link href="/" prefetch={false} className="hover:opacity-90 transition inline-block">
              <Logo size={36} />
            </Link>
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
                  prefetch={false}
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

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 flex flex-col justify-between border-r border-slate-200 shadow-2xl md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <div>
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <Link href="/" prefetch={false} onClick={() => setMobileMenuOpen(false)}>
              <Logo size={32} />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
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
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
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

        {/* Drawer Bottom Status */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/70">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-600 flex items-center gap-1.5 font-medium">
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

          <div className="text-[11px] text-slate-400 px-1 leading-relaxed">
            Database & tokens encrypted with AES-256 locally at rest.
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Mobile hamburger + Mark Logo OR Desktop status badges */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 md:hidden transition"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" prefetch={false} className="md:hidden flex items-center gap-2">
              <Logo variant="mark" size={28} />
              <span className="font-bold text-sm tracking-tight text-slate-900">Open Social</span>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                v0.1.0 MVP
              </span>
              <span className="text-xs font-medium text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                MCP Native Interface Ready
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick health badge for mobile */}
            <span
              className={`md:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                workerHealth === 'healthy'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  workerHealth === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {workerHealth === 'healthy' ? 'Online' : 'Checking'}
            </span>

            <Link
              href="/compose"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">New Post</span>
              <span className="xs:hidden sm:hidden">Post</span>
            </Link>
          </div>
        </header>

        {/* Page View Body with bottom padding for mobile navigation */}
        <main className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed for quick thumb access) */}
      <nav
        className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 md:hidden px-3 py-1.5 flex justify-around items-center shadow-lg"
        aria-label="Mobile quick navigation"
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="flex flex-col items-center justify-center -mt-4 group"
              >
                <div className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-active:scale-95 transition">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-blue-600 mt-0.5">Post</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
