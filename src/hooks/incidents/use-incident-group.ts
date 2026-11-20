"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { incidentKeys } from "./incident.query-keys";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";
import { encodeIncidentGroup, groupProgress, type IncidentGroupContext } from "@/lib/incident-group";
import {
  ensureIncidentGroupCompletion, loadIncidentGroup, resolveIncidentGroupMembers,
  type GroupDelivery, type GroupResolveResult, type UploadedGroupEvidence,
} from "@/lib/incident-group-actions";

export interface GroupResolutionInput { resolutionNote: string; afterFixFile?: File | null }

export function useIncidentGroup(group: IncidentGroupContext | null, options: {
  userId?: string; officerName?: string; enabled: boolean; canResolve: boolean;
  lastAlert?: { data: unknown } | null;
}) {
  const { userId, officerName, enabled, canResolve, lastAlert } = options;
  const client = useQueryClient();
  const scope = group ? `${userId}:${encodeIncidentGroup(group)}` : `${userId}:none`;
  const [workingScope, setWorkingScope] = useState<string | null>(null);
  const queryKey = useMemo(() => [...incidentKeys.all, "dispatch-group", scope] as const, [scope]);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => loadIncidentGroup(group!, signal),
    enabled: enabled && !!group && !!userId && workingScope !== scope,
    retry: false, staleTime: 10_000,
    refetchInterval: 30_000, refetchIntervalInBackground: false, refetchOnWindowFocus: true,
  });
  const snapshot = enabled && userId && !query.error ? query.data : undefined;
  const progress = group ? groupProgress(group, snapshot?.rows ?? []) : null;
  const [deliveryState, setDelivery] = useState<{ scope: string; value: GroupDelivery } | null>(null);
  const [lastResult, setLastResult] = useState<{ scope: string; value: GroupResolveResult } | null>(null);
  const workLock = useRef(false);
  const completionAttempt = useRef<string | null>(null);
  const uploads = useRef<{ scope: string; data: UploadedGroupEvidence }>({ scope, data: new Map() });
  if (uploads.current.scope !== scope) uploads.current = { scope, data: new Map() };
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    const active = new AbortController();
    operation.current = active;
    return () => active.abort();
  }, [scope, enabled, canResolve]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!enabled || !group || !userId) throw new Error("Không có quyền đọc nhóm sự cố.");
    const fresh = await loadIncidentGroup(group, signal ?? operation.current?.signal);
    client.setQueryData(queryKey, fresh);
    return fresh;
  }, [enabled, group, userId, client, queryKey]);

  useEffect(() => {
    if (!enabled || !group || !lastAlert?.data || typeof lastAlert.data !== "object") return;
    const alert = lastAlert.data as Record<string, unknown>;
    if (group.incidentIds.includes(String(alert.incidentId || alert.id || ""))) {
      void client.invalidateQueries({ queryKey });
    }
  }, [enabled, group, lastAlert, client, queryKey]);

  const sendCompletion = useCallback(async (retryDelivery = false) => {
    if (!group || !userId || !enabled || !canResolve || group.assignedTo !== userId || workLock.current) return;
    workLock.current = true;
    setWorkingScope(scope);
    completionAttempt.current = scope;
    const signal = operation.current?.signal;
    try {
      await client.cancelQueries({ queryKey });
      const result = await ensureIncidentGroupCompletion({ group, userId, officerName, retryDelivery, signal });
      if (signal?.aborted) return;
      client.setQueryData(queryKey, result.snapshot);
      setDelivery({ scope, value: result.delivery });
      void client.invalidateQueries({ queryKey: notificationKeys.all });
    } catch (error) {
      if (!signal?.aborted) setDelivery({ scope, value: { state: "failed", deliveredTo: [], message: error instanceof Error ? error.message : "Không gửi được tổng kết." } });
    } finally { workLock.current = false; setWorkingScope(null); }
  }, [group, userId, enabled, canResolve, scope, officerName, client, queryKey]);

  useEffect(() => {
    if (!progress?.complete) {
      if (completionAttempt.current === scope) completionAttempt.current = null;
      return;
    }
    if (workingScope === scope || completionAttempt.current === scope) return;
    void sendCompletion();
  }, [progress?.complete, scope, workingScope, sendCompletion]);

  const resolveMembers = useCallback(async (ids: string[], payload: GroupResolutionInput) => {
    if (!group || !userId || !enabled || !canResolve || workLock.current) throw new Error("Không thể xử lý nhóm lúc này.");
    workLock.current = true;
    setWorkingScope(scope);
    const signal = operation.current?.signal;
    try {
      await client.cancelQueries({ queryKey });
      const result = await resolveIncidentGroupMembers({ group, ids, userId, ...payload, uploadedEvidence: uploads.current.data, signal });
      signal?.throwIfAborted();
      for (const incident of result.succeeded) {
        uploads.current.data.delete(incident.id);
        client.setQueryData([...incidentKeys.detail(incident.id), "user", userId], incident);
      }
      setLastResult({ scope, value: result });
      const fresh = await refresh(signal);
      void client.invalidateQueries({ queryKey: incidentKeys.lists() });
      void client.invalidateQueries({ queryKey: incidentKeys.statusCountsRoot() });
      void client.invalidateQueries({ queryKey: reportingKeys.all });
      return { ...result, snapshot: fresh };
    } finally { workLock.current = false; setWorkingScope(null); }
  }, [group, userId, enabled, canResolve, scope, client, refresh]);

  return { group, snapshot, progress, query, refresh, resolveMembers, sendCompletion,
    readable: enabled && !!userId,
    busy: workingScope === scope,
    canAct: enabled && canResolve && !!group && !!userId && group.assignedTo === userId,
    delivery: deliveryState?.scope === scope ? deliveryState.value : null,
    lastResult: lastResult?.scope === scope ? lastResult.value : null,
  };
}

export type IncidentGroupController = ReturnType<typeof useIncidentGroup>;
