'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type InnerOSMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  href?: string;
  accent?: 'blue' | 'amber';
  className?: string;
  onActivate?: () => void;
};

const SIZE_MAP = {
  sm: { box: 'h-9 w-9 rounded-xl text-lg', ring: 'ring-2' },
  md: { box: 'h-11 w-11 rounded-2xl text-xl', ring: 'ring-2' },
  lg: { box: 'h-16 w-16 rounded-2xl text-3xl', ring: 'ring-[3px]' },
} as const;

export default function InnerOSMark({
  size = 'md',
  interactive = true,
  href = '/app/modules',
  accent = 'blue',
  className = '',
  onActivate,
}: InnerOSMarkProps) {
  const router = useRouter();
  const [pulse, setPulse] = useState(false);
  const s = SIZE_MAP[size];

  const gradient =
    accent === 'amber'
      ? 'from-amber-500/90 via-orange-500/80 to-amber-600/90'
      : 'from-blue-500 via-indigo-500 to-purple-600';

  const ringColor = accent === 'amber' ? 'ring-amber-400/40' : 'ring-blue-400/40';

  const activate = () => {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 600);
    onActivate?.();
    if (href) router.push(href);
  };

  const inner = (
    <span
      className={`inneros-mark relative inline-flex ${s.box} items-center justify-center bg-gradient-to-br ${gradient} font-serif font-bold text-white shadow-lg shadow-blue-900/30 transition-transform duration-300 ${
        interactive ? 'hover:scale-105 active:scale-95' : ''
      } ${pulse ? 'inneros-mark-pulse' : ''} ${className}`}
    >
      <span className="relative z-10 select-none leading-none tracking-tight">I</span>
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
      {interactive ? (
        <span
          className={`pointer-events-none absolute -inset-1 rounded-[inherit] ${s.ring} ${ringColor} opacity-0 transition-opacity group-hover:opacity-100`}
        />
      ) : null}
    </span>
  );

  if (!interactive) return inner;

  if (href) {
    return (
      <Link
        href={href}
        onClick={(e) => {
          if (onActivate) {
            e.preventDefault();
            activate();
          } else {
            setPulse(true);
            window.setTimeout(() => setPulse(false), 600);
          }
        }}
        className="group inline-flex"
        aria-label="InnerOS — ir a módulos"
        title="InnerOS"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={activate} className="group inline-flex" aria-label="InnerOS" title="InnerOS">
      {inner}
    </button>
  );
}
