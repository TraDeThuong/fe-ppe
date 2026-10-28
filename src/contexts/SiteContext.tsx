"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "ppe_site";

interface SiteContextValue {
  siteId: string | null;
  setSiteId: (id: string | null) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [siteId, setSiteIdState] = useState<string | null>(null);

  // Hydrate từ localStorage sau mount — tránh mismatch SSR
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSiteIdState(stored);
  }, []);

  const setSiteId = (id: string | null) => {
    setSiteIdState(id);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SiteContext.Provider value={{ siteId, setSiteId }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    return {
      siteId: null,
      setSiteId: () => {},
    };
  }
  return ctx;
}
