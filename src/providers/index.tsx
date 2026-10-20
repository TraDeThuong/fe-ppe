"use client";

import { ThemeProvider } from "./theme-provider";
import { ReactQueryProvider } from "./react-query-provider";
import { LocaleProvider } from "./locale-provider";
import { AuthProvider } from "./auth-provider";
import { ToastProvider } from "./toast-provider";

/**
 * Thứ tự bọc CHUẨN (xem auth-journey.md Bước 3.3):
 * Theme (ngoài cùng — mọi portal/toast ăn đúng theme)
 * → ReactQuery (Locale + Auth cần queryClient)
 * → Locale (Auth cần t() cho thông báo)
 * → Auth (session cho toàn cây)
 * → Toast (trong Theme để ăn đúng theme).
 * Realtime + Prefetch là scoped providers — chỉ mount tại app/(auth)/layout.tsx.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ReactQueryProvider>
        <LocaleProvider>
          <AuthProvider>
            {children}
            <ToastProvider />
          </AuthProvider>
        </LocaleProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
