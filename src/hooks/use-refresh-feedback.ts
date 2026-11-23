"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/providers/locale-provider";

export type RefreshFeedbackPhase = "idle" | "spinning" | "success" | "error";

export interface UseRefreshFeedbackOptions {
  onRefresh?: () => unknown;
  /** Trạng thái fetching bên ngoài (ví dụ từ TanStack Query isFetching / isRefetching) */
  isRefreshing?: boolean;
  /** Nếu true khi phiên refresh kết thúc sẽ hiển thị trạng thái lỗi thay vì thành công */
  hasError?: boolean;
  /** Thời gian xoay tối thiểu để mắt người nhìn thấy rõ phản hồi (mặc định 450ms) */
  minSpinMs?: number;
  /** Thời gian giữ icon ✓ / trạng thái "Đã cập nhật" sau khi tải xong (mặc định 1500ms) */
  feedbackDurationMs?: number;
}

export interface UseRefreshFeedbackResult {
  phase: RefreshFeedbackPhase;
  isSpinning: boolean;
  isSuccess: boolean;
  isError: boolean;
  lastSyncedAt: Date | null;
  lastSyncedLabel: string | null;
  trigger: () => void;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

/**
 * Chuẩn hóa phản hồi xúc giác & thị giác cho mọi nút Làm mới:
 * 1. Đảm bảo icon xoay tối thiểu `minSpinMs` (450ms) dù API local trả về < 50ms.
 * 2. Sau khi cả thời gian xoay tối thiểu lẫn API hoàn tất, chuyển sang trạng thái ✓ xanh trong `feedbackDurationMs` (1.5s).
 * 3. Lưu mốc giờ đồng bộ gần nhất (`lastSyncedLabel`) để hiển thị ở Header / tooltip.
 */
export function useRefreshFeedback({
  onRefresh,
  isRefreshing = false,
  hasError = false,
  minSpinMs = 450,
  feedbackDurationMs = 1500,
}: UseRefreshFeedbackOptions): UseRefreshFeedbackResult {
  const { locale } = useLocale();
  const [phase, setPhase] = useState<RefreshFeedbackPhase>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const mountedRef = useRef(true);
  const manualActiveRef = useRef(false);
  const minElapsedRef = useRef(false);
  const promiseSettledRef = useRef(true);
  const promiseRejectedRef = useRef(false);
  const externalRefreshingRef = useRef(isRefreshing);
  const hasErrorRef = useRef(hasError);

  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  externalRefreshingRef.current = isRefreshing;
  hasErrorRef.current = hasError;

  const clearTimers = useCallback(() => {
    if (minTimerRef.current !== null) {
      clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  const tryFinish = useCallback(() => {
    if (!mountedRef.current || !manualActiveRef.current) return;
    if (!minElapsedRef.current || !promiseSettledRef.current) return;
    if (externalRefreshingRef.current) return;

    manualActiveRef.current = false;
    const failed = promiseRejectedRef.current || hasErrorRef.current;

    if (!failed) {
      setLastSyncedAt(new Date());
      setPhase("success");
    } else {
      setPhase("error");
    }

    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      if (mountedRef.current && !manualActiveRef.current) {
        setPhase("idle");
      }
    }, failed ? Math.max(feedbackDurationMs, 1800) : feedbackDurationMs);
  }, [feedbackDurationMs]);

  useEffect(() => {
    if (!isRefreshing && manualActiveRef.current) {
      tryFinish();
    }
  }, [isRefreshing, tryFinish]);

  const trigger = useCallback(() => {
    if (!onRefresh) return;
    if (manualActiveRef.current || externalRefreshingRef.current) return;

    clearTimers();
    manualActiveRef.current = true;
    minElapsedRef.current = false;
    promiseSettledRef.current = false;
    promiseRejectedRef.current = false;
    setPhase("spinning");

    minTimerRef.current = setTimeout(() => {
      minTimerRef.current = null;
      minElapsedRef.current = true;
      tryFinish();
    }, minSpinMs);

    try {
      const result = onRefresh();
      if (isPromiseLike(result)) {
        Promise.resolve(result).then(
          () => {
            promiseSettledRef.current = true;
            tryFinish();
          },
          () => {
            promiseRejectedRef.current = true;
            promiseSettledRef.current = true;
            tryFinish();
          },
        );
      } else {
        promiseSettledRef.current = true;
      }
    } catch {
      promiseRejectedRef.current = true;
      promiseSettledRef.current = true;
      tryFinish();
    }
  }, [clearTimers, minSpinMs, onRefresh, tryFinish]);

  const lastSyncedLabel = useMemo(() => {
    if (!lastSyncedAt) return null;
    try {
      return lastSyncedAt.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return lastSyncedAt.toTimeString().slice(0, 8);
    }
  }, [lastSyncedAt, locale]);

  return {
    phase,
    isSpinning: phase === "spinning" || Boolean(isRefreshing),
    isSuccess: phase === "success",
    isError: phase === "error",
    lastSyncedAt,
    lastSyncedLabel,
    trigger,
  };
}
