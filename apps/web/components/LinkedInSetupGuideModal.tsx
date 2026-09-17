'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Terminal,
} from 'lucide-react';

interface LinkedInSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LinkedInSetupGuideModal({ isOpen, onClose }: LinkedInSetupGuideModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const redirectUrl = 'http://localhost:3000/api/auth/linkedin/callback';
  const envSnippet = `# LinkedIn Developer Configuration
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback
LINKEDIN_SCOPES=openid,profile,w_member_social`;

  function copyText(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-6 transform transition-all animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0077B5] text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs">
              in
            </div>
            <div>
              <h3 id="setup-guide-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                LinkedIn Developer App Setup Guide
              </h3>
              <p className="text-xs text-slate-500">
                Follow these 4 steps to configure OAuth and enable post scheduling.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diagnostic Callout */}
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            Why LinkedIn shows "Bummer, something went wrong":
          </div>
          <p className="leading-relaxed text-amber-900">
            LinkedIn will <strong>immediately display that error</strong> if:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-amber-800">
            <li>Your app requested a scope (e.g. <code>w_member_social</code>) that has not been approved under the <strong>Products</strong> tab.</li>
            <li>The <strong>Authorized redirect URL</strong> in the LinkedIn portal does not match <code>http://localhost:3000/api/auth/linkedin/callback</code> character-for-character, or you forgot to click <strong>Update</strong> to save it.</li>
          </ul>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Step 1: Create App in Developer Portal
              </span>
              <a
                href="https://www.linkedin.com/developers/apps"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
              >
                Open LinkedIn Developers <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click <strong>Create App</strong>, enter an App Name, link it to your LinkedIn Company/Showcase Page, and upload any logo icon.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Step 2: Add Required Products (Crucial!)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                Instant Approval
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              In your app dashboard, navigate to the <strong>Products</strong> tab and request access to both:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                <strong className="text-slate-900 block">1. Share on LinkedIn</strong>
                <span className="text-[11px] text-slate-500 block">
                  Grants scope: <code className="font-mono text-indigo-600 font-bold">w_member_social</code>
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  Required to publish posts to your feed
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                <strong className="text-slate-900 block">2. Sign In with LinkedIn (OIDC)</strong>
                <span className="text-[11px] text-slate-500 block">
                  Grants scopes: <code className="font-mono text-indigo-600 font-bold">openid</code>, <code className="font-mono text-indigo-600 font-bold">profile</code>
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  Required to fetch name & profile avatar
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              *Verify that both products show status <strong>"Added"</strong> with a green checkmark.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
              Step 3: Configure Authorized Redirect URL
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Go to the <strong>Auth</strong> tab &rarr; <strong>OAuth 2.0 settings</strong> &rarr; <strong>Authorized redirect URLs for your app</strong>, click the <strong>+</strong> icon, and paste:
            </p>

            <div className="flex items-center gap-2">
              <code className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 break-all select-all">
                {redirectUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText(redirectUrl, setCopiedUrl)}
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer shadow-2xs"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 bg-amber-50/90 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Important:</strong> Click the <strong>"Update"</strong> (checkmark) button after pasting, otherwise LinkedIn will not save the URL!
              </span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Step 4: Save Credentials in your .env file
              </span>
              <button
                type="button"
                onClick={() => copyText(envSnippet, setCopiedEnv)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedEnv ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">Snippet Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Template</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              From the <strong>Auth</strong> tab, copy your <strong>Client ID</strong> and <strong>Primary Client Secret</strong> into your project root's <code>.env</code> file:
            </p>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
              {envSnippet}
            </pre>
            <p className="text-[11px] text-slate-500">
              Notice: Default scopes are set to <code className="font-bold text-slate-700">openid,profile,w_member_social</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Once saved, return here and click <strong>Connect LinkedIn</strong>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Got It, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
