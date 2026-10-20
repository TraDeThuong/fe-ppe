"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeContext, type PpeAlertEvent } from "@/contexts/RealtimeContext";
import { env } from "@/config/env";
import { apiClient } from "@/lib/axios";

// Event type từ notification-service (notification.service.ts)
const ALERT_EVENTS = ["notification:ppe_violation", "notification:new"] as const;

/** SSE không gửi được header/cookie an toàn → backend cấp ticket 1 lần qua REST */
async function fetchStreamTicket(): Promise<string> {
  const data = (await apiClient.post("/notifications/stream-ticket")) as {
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

    (async () => {
      try {
        const ticket = await fetchStreamTicket();
        if (disposed) return;
        source = new EventSource(
          `${env.apiBaseUrl}/notifications/stream?ticket=${encodeURIComponent(ticket)}`,
        );
        source.onopen = () => setIsConnected(true);
        source.onerror = () => setIsConnected(false);
        for (const eventName of ALERT_EVENTS) {
          source.addEventListener(eventName, (event) => {
            const raw = (event as MessageEvent<string>).data;
            try {
              setLastAlert({ type: eventName, data: JSON.parse(raw) });
            } catch {
              setLastAlert({ type: eventName, data: raw });
            }
          });
        }
      } catch {
        setIsConnected(false);
      }
    })();

    return () => {
      disposed = true;
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
