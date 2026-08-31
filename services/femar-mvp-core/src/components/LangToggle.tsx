'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';

type LangToggleProps = {
  className?: string;
};

export default function LangToggle({ className = '' }: LangToggleProps) {
  const { lang, toggleLang, copy } = useInnerOSLang();

  return (
    <button
      type="button"
      onClick={toggleLang}
      className={`flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-300 backdrop-blur-md transition hover:border-zinc-600 hover:text-white ${className}`}
      aria-label={copy.common.switchLanguage}
    >
      <Languages className="h-4 w-4" />
      {copy.common.langToggle}
    </button>
  );
}
