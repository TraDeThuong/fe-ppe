"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeContext, type PpeAlertEvent } from "@/contexts/RealtimeContext";
import { env } from "@/config/env";
import { ApiError, apiClient } from "@/lib/axios";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { stripEmojis } from "@/lib/strip-emojis";
import { toast } from "@/lib/toast";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { maintenanceQueryKeys } from "@/hooks/maintenance/maintenance.query-keys";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";
import { systemQueryKeys } from "@/hooks/system/system.query-keys";
import type { ZaloBotStatusDto, ZaloLinkedEventPayload } from "@/types";

// Event type từ notification-service (notification.service.ts)
const ALERT_EVENTS = [
  "notification:ppe_violation",
  "notification:incident_comment",
  "notification:new",
  "notification:broadcast",
] as const;

const READ_SYNC_EVENTS = [
  "notification:read",
  "notification:read_all",
] as const;

/** SSE không gửi được header/cookie an toàn → backend cấp ticket 1 lần qua REST */
async function fetchStreamTicket(signal: AbortSignal): Promise<string> {
  const requestOptions = { signal, suppressToast: true };
  const data = await apiClient.post<unknown, { ticket: string }>(
    "/notifications/stream-ticket",
    undefined,
    requestOptions,
  );
  return data.ticket;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<PpeAlertEvent | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    let source: EventSource | null = null;
    const controller = new AbortController();
    const { signal } = controller;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let inboxInvalidateTimer: NodeJS.Timeout | null = null;
    let retryAttempt = 0;

    // Gom các đợt SSE bắn dồn dập trong 1.5s thành 1 lần tải lại hộp thư, tránh spam hàng chục request phân trang
    const scheduleInboxInvalidate = () => {
      if (signal.aborted || inboxInvalidateTimer) return;
      inboxInvalidateTimer = setTimeout(() => {
        inboxInvalidateTimer = null;
        if (!signal.aborted) {
          void queryClient.invalidateQueries(
            { queryKey: notificationKeys.lists() },
            { cancelRefetch: false },
          );
          void queryClient.invalidateQueries(
            { queryKey: notificationKeys.unreadCount() },
            { cancelRefetch: false },
          );
        }
      }, 1500);
    };

    const scheduleReconnect = (baseDelayMs: number, retryAfterMs = 0) => {
      if (signal.aborted || reconnectTimer) return;
      const exponentialMs = Math.min(60_000, baseDelayMs * 2 ** Math.min(retryAttempt, 4));
      retryAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, Math.max(exponentialMs, retryAfterMs));
    };

    const connect = async () => {
      if (signal.aborted) return;
      try {
        const ticket = await fetchStreamTicket(signal);
        if (signal.aborted) return;

        source = new EventSource(
          `${env.apiBaseUrl}/notifications/stream?ticket=${encodeURIComponent(ticket)}`,
        );

        source.onopen = () => {
          retryAttempt = 0;
          setIsConnected(true);
        };

        source.onerror = () => {
          setIsConnected(false);
          // Đóng kết nối ngay để chặn browser EventSource tự retry vô tận với ticket cũ đã hết hạn
          source?.close();

          // Thử kết nối lại với backoff tăng dần nếu người dùng vẫn đang đăng nhập và chưa unmount
          scheduleReconnect(5000);
        };

        for (const eventName of ALERT_EVENTS) {
          source.addEventListener(eventName, (event) => {
            const msg = event as MessageEvent<string>;
            const raw = msg.data;
            const eventId = msg.lastEventId || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const record = parsed as Record<string, unknown>;
                for (const key of ["title", "content", "description", "subject"]) {
                  if (typeof record[key] === "string") {
                    record[key] = stripEmojis(record[key] as string);
                  }
                }
              }
              setLastAlert({ type: eventName, data: parsed, id: eventId });
              scheduleInboxInvalidate();
            } catch {
              setLastAlert({
                type: eventName,
                data: typeof raw === "string" ? stripEmojis(raw) : raw,
                id: eventId,
              });
              scheduleInboxInvalidate();
            }
          });
        }

        for (const eventName of READ_SYNC_EVENTS) {
          source.addEventListener(eventName, () => {
            void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          });
        }

        // Liên kết / hủy liên kết Zalo Bot (gửi /link hoặc /unlink trên Zalo, hoặc DELETE /zalo/binding)
        const refreshZaloQueries = () => {
          void queryClient.invalidateQueries({ queryKey: notificationKeys.zaloStatus() });
          void queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
        };

        source.addEventListener("notification:zalo_linked", (event) => {
          try {
            const msg = event as MessageEvent<string>;
            const parsed = msg.data ? (JSON.parse(msg.data) as Partial<ZaloLinkedEventPayload>) : null;
            if (parsed?.binding && typeof parsed.binding === "object") {
              const binding = parsed.binding;
              // Cập nhật lạc quan để card chuyển ngay sang "Đã liên kết", sau đó vẫn tải lại từ BE
              queryClient.setQueryData<ZaloBotStatusDto>(
                notificationKeys.zaloStatus(),
                (prev) => (prev ? { ...prev, linked: true, binding } : prev),
              );
            }
          } catch {
            // Payload lỗi vẫn làm mới query bên dưới
          }
          refreshZaloQueries();
          toast.success(
            pickLocaleText(
              "Đã liên kết Zalo Bot thành công. Cảnh báo sẽ được gửi tới hội thoại Zalo này.",
              "Zalo Bot linked successfully. Alerts will be delivered to this Zalo conversation.",
            ),
            { id: "zalo-bot-linked" },
          );
        });

        source.addEventListener("notification:zalo_unlinked", () => {
          queryClient.setQueryData<ZaloBotStatusDto>(
            notificationKeys.zaloStatus(),
            (prev) => (prev ? { ...prev, linked: false, binding: null } : prev),
          );
          refreshZaloQueries();
          // Cùng id với toast của useUnlinkZalo để không hiện 2 lần khi hủy từ Web
          toast.success(
            pickLocaleText("Đã hủy liên kết Zalo Bot.", "Zalo Bot has been unlinked."),
            { id: "zalo-bot-unlinked" },
          );
        });

        source.addEventListener("system:maintenance", () => {
          void queryClient.invalidateQueries({ queryKey: maintenanceQueryKeys.all });
        });

        source.addEventListener("system:feature_toggle", (event) => {
          try {
            const msg = event as MessageEvent<string>;
            if (msg.data) {
              const parsed = JSON.parse(msg.data) as {
                key?: unknown;
                enabled?: unknown;
              };
              if (
                parsed &&
                typeof parsed.key === "string" &&
                typeof parsed.enabled === "boolean"
              ) {
                queryClient.setQueryData<Record<string, unknown>>(
                  authKeys.config(),
                  (prev) =>
                    prev
                      ? { ...prev, [parsed.key as string]: parsed.enabled }
                      : prev,
                );
              }
            }
          } catch {
            // Bỏ qua lỗi parse payload SSE và luôn invalidate query bên dưới
          }
          void queryClient.invalidateQueries({ queryKey: authKeys.config() });
          void queryClient.invalidateQueries({
            queryKey: systemQueryKeys.featureFlags(),
          });
          void queryClient.invalidateQueries({ queryKey: systemQueryKeys.all });
        });
      } catch (err: unknown) {
        if (signal.aborted) return;
        setIsConnected(false);
        // User không có quyền SSE (403) -> dừng retry vô hạn
        if (err instanceof ApiError && err.status === 403) return;

        const retryAfterMs = err instanceof ApiError && err.status === 429
          ? (err.retryAfter ?? 60) * 1000
          : 0;
        scheduleReconnect(10_000, retryAfterMs);
      }
    };

    // Đợi React hoàn tất setup/cleanup của Strict Mode trước khi xin vé.
    queueMicrotask(() => void connect());

    return () => {
      controller.abort();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (inboxInvalidateTimer) {
        clearTimeout(inboxInvalidateTimer);
      }
      source?.close();
      setIsConnected(false);
    };
  }, [status, queryClient]);

  const contextValue = useMemo(
    () => ({ isConnected, lastAlert }),
    [isConnected, lastAlert],
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}
