"use client";

import { createContext, useContext } from "react";

/** Envelope SSE từ notification-service — sse-manager.service.ts (SseEvent) */
export interface PpeAlertEvent {
  type: string;
  data: unknown;
  id?: string;
}

export interface RealtimeContextValue {
  isConnected: boolean;
  lastAlert: PpeAlertEvent | null;
}

export const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  lastAlert: null,
});

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
