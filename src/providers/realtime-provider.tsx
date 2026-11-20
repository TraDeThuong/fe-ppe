"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeContext, type PpeAlertEvent } from "@/contexts/RealtimeContext";
import { env } from "@/config/env";
import { apiClient } from "@/lib/axios";
import { stripEmojis } from "@/lib/strip-emojis";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";

// Event type từ notification-service (notification.service.ts)
const ALERT_EVENTS = [
  "notification:ppe_violation",
  "notification:new",
  "notification:broadcast",
] as const;

const READ_SYNC_EVENTS = [
  "notification:read",
  "notification:read_all",
] as const;

/** SSE không gửi được header/cookie an toàn → backend cấp ticket 1 lần qua REST */
async function fetchStreamTicket(): Promise<string> {
  const data = (await apiClient.post(
    "/notifications/stream-ticket",
    undefined,
    { suppressToast: true } as any,
  )) as {
    ticket: string;
    expiresIn: number;
  };
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
    let disposed = false;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let retryAttempt = 0;

    const scheduleReconnect = (minDelayMs: number) => {
      if (disposed || reconnectTimer) return;
      const exponentialMs = Math.min(60_000, minDelayMs * 2 ** Math.min(retryAttempt, 4));
      retryAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!disposed) {
          void connect();
        }
      }, exponentialMs);
    };

    const connect = async () => {
      try {
        const ticket = await fetchStreamTicket();
        if (disposed) return;

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
              void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() }, { cancelRefetch: false });
            } catch {
              setLastAlert({
                type: eventName,
                data: typeof raw === "string" ? stripEmojis(raw) : raw,
                id: eventId,
              });
            }
          });
        }

        for (const eventName of READ_SYNC_EVENTS) {
          source.addEventListener(eventName, () => {
            void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          });
        }
      } catch (err: unknown) {
        setIsConnected(false);
        const statusCode =
          err && typeof err === "object" && "status" in err
            ? Number((err as { status?: unknown }).status)
            : 0;
        // Nếu bị rate-limit (429), chờ tối thiểu 60s trước khi xin ticket lại
        scheduleReconnect(statusCode === 429 ? 60_000 : 10_000);
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
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
