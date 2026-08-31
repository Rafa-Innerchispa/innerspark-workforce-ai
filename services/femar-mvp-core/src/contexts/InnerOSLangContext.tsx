'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { t, type InnerOSLang } from '@/lib/innerosCopy';
import {
  DEFAULT_INNEROS_LANG,
  persistInnerOSLang,
  readStoredInnerOSLang,
  toggleInnerOSLang,
} from '@/lib/innerosLang';

type InnerOSLangContextValue = {
  lang: InnerOSLang;
  setLang: (lang: InnerOSLang) => void;
  toggleLang: () => void;
  copy: ReturnType<typeof t>;
};

const InnerOSLangContext = createContext<InnerOSLangContextValue | undefined>(undefined);

export function InnerOSLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<InnerOSLang>(DEFAULT_INNEROS_LANG);

  useEffect(() => {
    setLangState(readStoredInnerOSLang());
  }, []);

  const setLang = (next: InnerOSLang) => {
    setLangState(next);
    persistInnerOSLang(next);
  };

  const toggleLang = () => {
    setLang(toggleInnerOSLang(lang));
  };

  return (
    <InnerOSLangContext.Provider value={{ lang, setLang, toggleLang, copy: t(lang) }}>
      {children}
    </InnerOSLangContext.Provider>
  );
}

export function useInnerOSLang() {
  const context = useContext(InnerOSLangContext);
  if (!context) {
    throw new Error('useInnerOSLang must be used within InnerOSLangProvider');
  }
  return context;
}
