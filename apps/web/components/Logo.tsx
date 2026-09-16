import React from 'react';

interface LogoProps {
  variant?: 'mark' | 'full';
  size?: number;
  className?: string;
}

export default function Logo({ variant = 'full', size = 36, className = '' }: LogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect width="48" height="48" rx="12" fill="#0F172A" />
        <circle cx="24" cy="16" r="18" fill="url(#logo_highlight)" opacity="0.15" />
        <path
          d="M 24 10 A 14 14 0 1 1 11.5 29"
          stroke="url(#logo_arc_gradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line x1="24" y1="10" x2="24" y2="15" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38" y1="24" x2="33" y2="24" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3" fill="#FFFFFF" />
        <path d="M 24 24 L 32 18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <path d="M 24 24 L 30 32" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="18" r="2" fill="#38BDF8" />
        <circle cx="30" cy="32" r="2" fill="#818CF8" />
        <circle cx="15.5" cy="16" r="2" fill="#60A5FA" />

        <defs>
          <radialGradient
            id="logo_highlight"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(24 16) rotate(90) scale(18)"
          >
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="logo_arc_gradient" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="0.5" stopColor="#60A5FA" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect width="48" height="48" rx="12" fill="#0F172A" />
        <circle cx="24" cy="16" r="18" fill="url(#logo_full_highlight)" opacity="0.15" />
        <path
          d="M 24 10 A 14 14 0 1 1 11.5 29"
          stroke="url(#logo_full_arc)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line x1="24" y1="10" x2="24" y2="15" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38" y1="24" x2="33" y2="24" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3" fill="#FFFFFF" />
        <path d="M 24 24 L 32 18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <path d="M 24 24 L 30 32" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="18" r="2" fill="#38BDF8" />
        <circle cx="30" cy="32" r="2" fill="#818CF8" />
        <circle cx="15.5" cy="16" r="2" fill="#60A5FA" />

        <defs>
          <radialGradient
            id="logo_full_highlight"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(24 16) rotate(90) scale(18)"
          >
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="logo_full_arc" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="0.5" stopColor="#60A5FA" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-none">
          Open Social
        </h1>
        <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-1">
          Local-First Scheduler
        </p>
      </div>
    </div>
  );
}
