"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/query-client";
import { resolvePrefetchJobs } from "@/config/prefetch-jobs";

/** Prefetch chờ CPU/network rảnh — không tranh chấp render/điều hướng đầu tiên */
function runWhenIdle(fn: () => void): void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: 3000 });
    return;
  }
  setTimeout(fn, 0);
}

/**
 * Bước 8 — PrefetchProvider (xem auth-journey.md Bước 8):
 * - Chỉ chạy khi status === "authenticated" — luồng 2FA (chưa có session)
 *   và mustChangePassword (sắp bị đá sang đổi mật khẩu) bị bỏ qua.
 * - Chạy khi idle + khi tab quay lại visible; prefetchQuery tự no-op nếu
 *   cache còn tươi (bù refetchOnWindowFocus: false toàn cục).
 * - retry: false — prefetch nền không retry, trang cần sẽ tự fetch lại.
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();

  // Ref để callback idle/visibility không đọc status/user đã cũ (closure) sau logout
  const latest = useRef({ user, status });
  useEffect(() => {
    latest.current = { user, status };
  }, [user, status]);

  const prefetch = useCallback(() => {
    const { user: u, status: s } = latest.current;
    if (s !== "authenticated" || !u || u.mustChangePassword) return;
    for (const job of resolvePrefetchJobs(u)) {
      void queryClient.prefetchQuery({
        queryKey: job.queryKey,
        queryFn: job.queryFn,
        staleTime: job.staleTime,
        retry: false,
      });
    }
  }, []);

  // Lần đầu xác thực — chờ idle mới prefetch. StrictMode double-run vô hại:
  // GET sessions idempotent + prefetchQuery dedup với query đang chạy.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    runWhenIdle(() => {
      if (!cancelled) prefetch();
    });
    return () => {
      cancelled = true;
    };
  }, [status, prefetch]);

  // Tab quay lại visible → chạy lại (cache tươi thì no-op, hết staleTime thì refetch nền)
  useEffect(() => {
    if (status !== "authenticated") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") prefetch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [status, prefetch]);

  return <>{children}</>;
}
