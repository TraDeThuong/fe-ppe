"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { authService } from "@/services/auth.service";
import { getConfig, SYSTEM_CONFIG_KEYS } from "@/lib/system-config";
import viDict from "@/i18n/vi-VN.json";
import enDict from "@/i18n/en-US.json";

export type Locale = "vi-VN" | "en-US";

export const LOCALES: Locale[] = ["vi-VN", "en-US"];
export const DEFAULT_LOCALE: Locale = "vi-VN";

const STORAGE_KEY = "ppe.locale";
const COOKIE_NAME = "ppe_locale";

const dictionaries: Record<Locale, Record<string, string>> = {
  "vi-VN": viDict,
  "en-US": enDict,
};

function isLocale(value: unknown): value is Locale {
  return value === "vi-VN" || value === "en-US";
}

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Dịch chuỗi UI; fallback về vi-VN rồi về chính key nếu dict thiếu */
  t: (key: string, params?: Record<string, string | number>) => string;
  number: Intl.NumberFormat;
  dateTime: Intl.DateTimeFormat;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  const configQuery = useQuery({
    queryKey: authKeys.config(),
    queryFn: () => authService.getPublicConfig(),
    staleTime: Infinity,
  });

  // Nguồn ưu tiên 1 (đồng bộ, trước paint): user đã chọn trong localStorage
  useLayoutEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
    }
  }, []);

  // Nguồn ưu tiên 2 (bất đồng bộ): "app.locale" từ GET /system/public
  useEffect(() => {
    if (isLocale(localStorage.getItem(STORAGE_KEY))) return;
    const serverLocale = getConfig(configQuery.data, SYSTEM_CONFIG_KEYS.locale);
    if (isLocale(serverLocale)) {
      setLocaleState(serverLocale);
    }
  }, [configQuery.data]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        localStorage.setItem(STORAGE_KEY, next);
        // Cookie để server components/proxy đọc được locale sau này
        document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      },
      t: (key: string, params?: Record<string, string | number>) => {
        let text = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return text;
      },
      number: new Intl.NumberFormat(locale),
      dateTime: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
