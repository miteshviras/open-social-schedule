'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Key,
} from 'lucide-react';

interface XSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function XSetupGuideModal({ isOpen, onClose }: XSetupGuideModalProps) {
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

  const redirectUrl = 'http://localhost:3000/api/auth/x/callback';
  const envSnippet = `# X (Twitter) Developer Configuration
X_CLIENT_ID=your_client_id_here
X_CLIENT_SECRET=your_client_secret_here
X_REDIRECT_URI=http://localhost:3000/api/auth/x/callback
X_SCOPES=tweet.read,tweet.write,users.read,offline.access`;

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
      aria-labelledby="x-setup-guide-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-6 transform transition-all animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
              𝕏
            </div>
            <div>
              <h3 id="x-setup-guide-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                X (Twitter) Developer App Setup Guide
              </h3>
              <p className="text-xs text-slate-500">
                Follow these 4 steps to configure OAuth 2.0 PKCE and enable tweet scheduling.
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
            Common Pitfalls on X (Twitter) OAuth 2.0:
          </div>
          <p className="leading-relaxed text-amber-900">
            Connecting to X will fail if any of the following are true in the X Developer Portal:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-amber-800">
            <li>
              <strong>Standalone App</strong>: Your app must be assigned to a <strong>Project</strong>. Standalone apps cannot use API v2 endpoints.
            </li>
            <li>
              <strong>Read-Only Permissions</strong>: App permissions must be set to <strong>Read and write</strong>. If left as "Read", posting tweets will return <code>403 Forbidden</code>.
            </li>
            <li>
              <strong>Wrong Credentials</strong>: Do not copy the Consumer "API Key & Secret". You must copy the <strong>OAuth 2.0 Client ID and Client Secret</strong> from the User Authentication Settings.
            </li>
            <li>
              <strong>Callback URI Mismatch</strong>: The Callback URL in the portal must match <code>http://localhost:3000/api/auth/x/callback</code> character-for-character.
            </li>
          </ul>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Step 1: Open Developer Portal & Verify Project
              </span>
              <a
                href="https://developer.x.com/en/portal/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
              >
                Open X Portal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Navigate to the <strong>Projects & Apps</strong> section. Ensure your App is nested inside a <strong>Project</strong> (e.g. "Default Project" or create a new project). Click on your app to open its settings.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Step 2: Set Up User Authentication Settings (OAuth 2.0 PKCE)
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                Required
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Under your App Settings, scroll down to <strong>User authentication settings</strong> and click <strong>Set up</strong> (or <strong>Edit</strong>):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                <strong className="text-slate-900 block">App Permissions</strong>
                <span className="text-[11px] text-indigo-700 font-semibold block">
                  Select: "Read and write"
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Enables creating tweets, reading profile info, and posting media.
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                <strong className="text-slate-900 block">Type of App</strong>
                <span className="text-[11px] text-indigo-700 font-semibold block">
                  Select: "Web App, Automated App or Bot"
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Enables confidential client OAuth 2.0 with PKCE verification.
                </span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Step 3: Configure Callback URI & Website URL
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              In the <strong>App info</strong> section of User authentication settings, enter the following URLs:
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  Callback URI / Redirect URL:
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 break-all select-all">
                    {redirectUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(redirectUrl, setCopiedUrl)}
                    className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer shadow-2xs"
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
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  Website URL:
                </label>
                <code className="block p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
                  http://localhost:3000
                </code>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic pt-1">
              *Click <strong>Save</strong> at the bottom of the page to apply changes.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-700" />
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
              Upon saving, X will show your <strong>OAuth 2.0 Client ID</strong> and <strong>Client Secret</strong>. Copy them into your project root's <code>.env</code> file:
            </p>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
              {envSnippet}
            </pre>
            <div className="text-[11px] text-slate-500 space-y-0.5">
              <p>
                Default scopes automatically included: <code className="font-bold text-slate-700">tweet.read,tweet.write,users.read,offline.access</code>.
              </p>
              <p className="text-amber-700 font-medium">
                Note: <code>offline.access</code> ensures your refresh token is automatically saved and renewed.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Once saved, return here and click <strong>Connect 𝕏</strong>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Got It, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
