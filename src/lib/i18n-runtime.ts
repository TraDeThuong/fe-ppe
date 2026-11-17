import { getClientCookie } from "@/lib/cookie";

export type RuntimeLocale = "vi-VN" | "en-US";

/**
 * Đọc locale đang kích hoạt bên ngoài React tree (Axios interceptors,
 * QueryClient global cache, mutation hooks và services).
 */
export function getRuntimeLocale(): RuntimeLocale {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage?.getItem("ppe.locale");
      if (stored === "en-US" || stored === "vi-VN") {
        return stored;
      }
    } catch {
      // Bỏ qua nếu localStorage bị chặn bởi sandbox / privacy mode
    }
  }

  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement?.lang;
    if (htmlLang === "en-US" || htmlLang === "vi-VN") {
      return htmlLang;
    }
    const cookieLocale = getClientCookie("ppe_locale");
    if (cookieLocale === "en-US" || cookieLocale === "vi-VN") {
      return cookieLocale;
    }
  }

  return "vi-VN";
}

export function isRuntimeVietnamese(): boolean {
  return getRuntimeLocale() === "vi-VN";
}

export function pickLocaleText(vi: string, en: string): string {
  return isRuntimeVietnamese() ? vi : en;
}
