"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "ppe_site";

interface SiteContextValue {
  siteId: string | null;
  isReady: boolean;
  setSiteId: (id: string | null) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [siteId, setSiteIdState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Hydrate từ localStorage sau mount — tránh mismatch SSR
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSiteIdState(stored);
    setIsReady(true);
  }, []);

  const setSiteId = (id: string | null) => {
    setSiteIdState(id);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SiteContext.Provider value={{ siteId, setSiteId, isReady }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    return {
      siteId: null,
      isReady: true,
      setSiteId: () => {},
    };
  }
  return ctx;
}
