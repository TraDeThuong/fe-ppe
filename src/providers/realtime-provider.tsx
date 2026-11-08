"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeContext, type PpeAlertEvent } from "@/contexts/RealtimeContext";
import { env } from "@/config/env";
import { apiClient } from "@/lib/axios";

// Event type từ notification-service (notification.service.ts)
const ALERT_EVENTS = [
  "notification:ppe_violation",
  "notification:new",
  "notification:broadcast",
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
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<PpeAlertEvent | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    let source: EventSource | null = null;
    let disposed = false;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = async () => {
      try {
        const ticket = await fetchStreamTicket();
        if (disposed) return;

        source = new EventSource(
          `${env.apiBaseUrl}/notifications/stream?ticket=${encodeURIComponent(ticket)}`,
        );

        source.onopen = () => setIsConnected(true);

        source.onerror = () => {
          setIsConnected(false);
          // Đóng kết nối ngay để chặn browser EventSource tự retry vô tận với ticket cũ đã hết hạn
          source?.close();

          // Thử kết nối lại bằng ticket mới sau 5 giây nếu người dùng vẫn đang đăng nhập và chưa unmount
          if (!disposed && !reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              if (!disposed) {
                connect();
              }
            }, 5000);
          }
        };

        for (const eventName of ALERT_EVENTS) {
          source.addEventListener(eventName, (event) => {
            const msg = event as MessageEvent<string>;
            const raw = msg.data;
            const eventId = msg.lastEventId || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            try {
              setLastAlert({ type: eventName, data: JSON.parse(raw), id: eventId });
            } catch {
              setLastAlert({ type: eventName, data: raw, id: eventId });
            }
          });
        }
      } catch {
        setIsConnected(false);
        if (!disposed && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (!disposed) {
              connect();
            }
          }, 10000);
        }
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
  }, [status]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastAlert }}>
      {children}
    </RealtimeContext.Provider>
  );
}
