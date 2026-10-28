"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  isDayTime: boolean;
  currentHour: number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = "theme";
export const THEME_COOKIE_NAME = "ppe_theme";

// Mốc giờ ban ngày: 06:00 đến trước 18:00 (12 giờ ban ngày)
export const DAY_START_HOUR = 6;
// Mốc giờ ban đêm: 18:00 đến trước 06:00 sáng hôm sau (12 giờ ban đêm)
export const NIGHT_START_HOUR = 18;

/**
 * Kiểm tra thời gian thực hiện tại có thuộc khung ban ngày hay không:
 * - Ban ngày: 06:00:00 - 17:59:59 => true (Giao diện Sáng)
 * - Ban đêm: 18:00:00 - 05:59:59 => false (Giao diện Tối)
 */
export function isDayTimeNow(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR;
}

/**
 * Xác định theme hiển thị:
 * - Nếu theme là "system" => Tự động theo thời gian thực (ngày: "light", đêm: "dark")
 * - Nếu là "light" hoặc "dark" => Cố định theo lựa chọn của người dùng
 */
export function resolveRealtimeTheme(
  t: Theme,
  date: Date = new Date()
): "light" | "dark" {
  if (t === "system") {
    return isDayTimeNow(date) ? "light" : "dark";
  }
  return t;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [isDayTime, setIsDayTime] = useState<boolean>(true);
  const [currentHour, setCurrentHour] = useState<number>(() =>
    typeof window !== "undefined" ? new Date().getHours() : 12
  );

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      document.cookie = `${THEME_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Bỏ qua lỗi trong môi trường hạn chế localStorage (private browsing)
    }

    const now = new Date();
    const resolved = resolveRealtimeTheme(next, now);
    document.documentElement.setAttribute("data-theme", resolved);
    setResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    let initial: Theme = "system";
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        initial = stored;
      }
    } catch {
      initial = "system";
    }

    const now = new Date();
    const dayTime = isDayTimeNow(now);
    const resolved = resolveRealtimeTheme(initial, now);

    setThemeState(initial);
    setIsDayTime(dayTime);
    setCurrentHour(now.getHours());
    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);

    // Cơ chế chuyển đổi thời gian thực:
    // Định kỳ kiểm tra (15 giây) và lắng nghe visibilitychange / focus
    const checkRealtimeTheme = () => {
      const currentDate = new Date();
      const currentDayTime = isDayTimeNow(currentDate);
      setIsDayTime(currentDayTime);
      setCurrentHour(currentDate.getHours());

      let currentTheme: Theme = "system";
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          currentTheme = stored;
        }
      } catch {
        currentTheme = "system";
      }

      if (currentTheme === "system") {
        const nextResolved = currentDayTime ? "light" : "dark";
        setResolvedTheme((previous) => {
          if (previous !== nextResolved) {
            document.documentElement.setAttribute("data-theme", nextResolved);
          }
          return nextResolved;
        });
      }
    };

    const intervalId = window.setInterval(checkRealtimeTheme, 15_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkRealtimeTheme();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Đồng bộ tức thì giữa các tab trình duyệt
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextTheme = event.newValue as Theme | null;
        const validTheme: Theme =
          nextTheme === "light" || nextTheme === "dark" || nextTheme === "system"
            ? nextTheme
            : "system";
        setThemeState(validTheme);
        const nextResolved = resolveRealtimeTheme(validTheme);
        setResolvedTheme(nextResolved);
        document.documentElement.setAttribute("data-theme", nextResolved);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, isDayTime, currentHour }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
