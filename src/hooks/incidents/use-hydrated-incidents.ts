"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useUsers } from "@/hooks/users";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { ResponsiblePersonRef } from "@/lib/incident-workflow";
import type {
  IncidentAssignmentItem,
  IncidentItem,
  UserResponseDto,
} from "@/types";

export interface UseHydratedIncidentsResult {
  incidents: IncidentItem[];
  isHydratingAssignments: boolean;
  usersById: ReadonlyMap<string, ResponsiblePersonRef>;
  siteManagersBySiteId: ReadonlyMap<string, ResponsiblePersonRef[]>;
  siteOfficersBySiteId: ReadonlyMap<string, ResponsiblePersonRef[]>;
  allUsers: UserResponseDto[];
}

export interface UseHydratedIncidentsOptions {
  enabled?: boolean;
  /** The list API already returns assignments, so only enrich their assignee names. */
  fetchMissingAssignments?: boolean;
  /**
   * Có tải phân công cho hồ sơ đã CLOSED hay không (mặc định: false để tránh bão N+1
   * khi lịch sử có hàng chục hồ sơ đã đóng; chỉ bật cho SAFETY_OFFICER khi cần đếm việc đã hoàn tất).
   */
  includeClosed?: boolean;
  /** Giới hạn tối đa số sự cố cần hydrate trong 1 lượt để bảo vệ rate-limit */
  maxHydrateCount?: number;
}

// ── Bộ điều tiết Concurrency & Circuit Breaker 429 cho hydration nền ──────────
const MAX_CONCURRENT_ASSIGNMENT_FETCHES = 4;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 20 * 1000;

let activeFetches = 0;
let rateLimitedUntilMs = 0;
const pendingQueue: Array<() => void> = [];

function getHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
  }
  return undefined;
}

function getRetryAfterMs(error: unknown): number {
  if (error && typeof error === "object" && "retryAfter" in error) {
    const seconds = Number((error as { retryAfter?: unknown }).retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 60 * 1000);
    }
  }
  return DEFAULT_RATE_LIMIT_COOLDOWN_MS;
}

async function fetchAssignmentsThrottled(
  incidentId: string,
  signal?: AbortSignal,
): Promise<IncidentAssignmentItem[]> {
  if (Date.now() < rateLimitedUntilMs) {
    return [];
  }

  if (activeFetches >= MAX_CONCURRENT_ASSIGNMENT_FETCHES) {
    await new Promise<void>((resolve) => {
      pendingQueue.push(resolve);
    });
  }

  if (signal?.aborted || Date.now() < rateLimitedUntilMs) {
    const next = pendingQueue.shift();
    if (next) next();
    return [];
  }

  activeFetches += 1;
  try {
    return await incidentService.getAssignments(incidentId, {
      signal,
      suppressToast: true,
    });
  } catch (error) {
    if (getHttpStatus(error) === 429) {
      rateLimitedUntilMs = Date.now() + getRetryAfterMs(error);
      return [];
    }
    throw error;
  } finally {
    activeFetches = Math.max(0, activeFetches - 1);
    const next = pendingQueue.shift();
    if (next) next();
  }
}

/**
 * Hydrate mảng `assignments` và tên thật của Cán bộ / Quản lý phụ trách cho danh sách sự cố
 * mà không cần thay đổi Backend `GET /api/v1/incidents`.
 *
 * Chống bão request (HTTP 429):
 * - Bỏ qua ngay sự cố có `_count.assignments === 0`, `PENDING_REVIEW`, `DISMISSED` (và `CLOSED` nếu không bật `includeClosed`).
 * - Điều tiết tối đa 4 request song song qua hàng đợi nội bộ, kèm circuit breaker tự nghỉ khi gặp 429.
 * - Cache 5 phút (`staleTime: 5 * 60 * 1000`), không tự refetch khi focus/reconnect, không spam toast lỗi nền.
 */
export function useHydratedIncidents(
  rawIncidents: readonly IncidentItem[],
  options?: UseHydratedIncidentsOptions,
): UseHydratedIncidentsResult {
  const enabled = options?.enabled ?? true;
  const fetchMissingAssignments = options?.fetchMissingAssignments ?? true;
  const includeClosed = options?.includeClosed ?? false;
  const maxHydrateCount = options?.maxHydrateCount ?? 30;
  const { user } = useAuth();
  const can = useCan();
  const canReadUsers = can("USER_READ");
  const { sites } = useEntityLookup({ enabled });

  const { data: usersData } = useUsers(
    { limit: 100 },
    { enabled: enabled && canReadUsers },
  );
  const allUsers = useMemo<UserResponseDto[]>(
    () => usersData?.data ?? [],
    [usersData?.data],
  );

  const { usersById, siteManagersBySiteId, siteOfficersBySiteId } = useMemo(() => {
    const uMap = new Map<string, ResponsiblePersonRef>();
    const mgrBySite = new Map<string, ResponsiblePersonRef[]>();
    const offBySite = new Map<string, ResponsiblePersonRef[]>();

    const addSitePerson = (
      targetMap: Map<string, ResponsiblePersonRef[]>,
      siteId: string,
      person: ResponsiblePersonRef,
    ) => {
      if (!siteId) return;
      const list = targetMap.get(siteId) || [];
      if (!list.some((item) => item.id === person.id)) {
        list.push(person);
        targetMap.set(siteId, list);
      }
    };

    // 1. Từ danh sách contactOfficers của các Site (luôn khả dụng với mọi role có PPE_SITE_READ)
    for (const site of sites) {
      for (const off of site.contactOfficers || []) {
        if (off.userId && off.name) {
          const ref: ResponsiblePersonRef = {
            id: off.userId,
            name: off.name,
            role: off.roleTitle || "SAFETY_OFFICER",
          };
          uMap.set(off.userId, ref);
          addSitePerson(offBySite, site.id, ref);
        }
      }
    }

    // 2. Từ danh sách Users hệ thống (khả dụng cho ADMIN / SAFETY_MANAGER / MANAGER)
    for (const u of allUsers) {
      const roleName = (u.role?.name || "").toUpperCase();
      const ref: ResponsiblePersonRef = {
        id: u.id,
        name: u.fullName || u.email || `#${u.id.slice(0, 8)}`,
        email: u.email || undefined,
        role: roleName || undefined,
      };
      uMap.set(u.id, ref);

      const userSites = Array.isArray(u.siteIds) ? u.siteIds : [];
      if (roleName === "SAFETY_MANAGER" || roleName === "MANAGER") {
        for (const sid of userSites) {
          addSitePerson(mgrBySite, sid, ref);
        }
      } else if (roleName === "SAFETY_OFFICER") {
        for (const sid of userSites) {
          addSitePerson(offBySite, sid, ref);
        }
      }
    }

    // 3. Từ chính tài khoản đang đăng nhập (đảm bảo SAFETY_OFFICER luôn thấy đúng tên mình)
    if (user?.id) {
      const myRole = (user.role || "").toUpperCase();
      const myRef: ResponsiblePersonRef = {
        id: user.id,
        name: user.fullName || user.email || `#${user.id.slice(0, 8)}`,
        email: user.email || undefined,
        role: myRole || undefined,
      };
      uMap.set(user.id, myRef);

      const mySites = [
        ...(user.siteId ? [user.siteId] : []),
        ...(Array.isArray(user.siteIds) ? user.siteIds : []),
      ];
      if (myRole === "SAFETY_MANAGER" || myRole === "MANAGER") {
        for (const sid of mySites) {
          addSitePerson(mgrBySite, sid, myRef);
        }
      } else if (myRole === "SAFETY_OFFICER") {
        for (const sid of mySites) {
          addSitePerson(offBySite, sid, myRef);
        }
      }
    }

    return {
      usersById: uMap,
      siteManagersBySiteId: mgrBySite,
      siteOfficersBySiteId: offBySite,
    };
  }, [allUsers, sites, user]);

  // Ưu tiên hydrate CONFIRMED -> RESOLVED -> CLOSED (nếu bật includeClosed), giới hạn theo maxHydrateCount
  const idsNeedingFetch = useMemo(() => {
    if (!enabled || !fetchMissingAssignments) return [];
    const prioritized: string[] = [];
    const secondary: string[] = [];

    for (const inc of rawIncidents) {
      if (Array.isArray(inc.assignments)) continue;
      if (inc.status === "PENDING_REVIEW" || inc.status === "DISMISSED") continue;
      if (inc.status === "CLOSED" && !includeClosed) continue;

      const assignmentCount = inc._count?.assignments;
      const shouldFetch =
        typeof assignmentCount === "number"
          ? assignmentCount > 0
          : inc.status === "CONFIRMED" || inc.status === "RESOLVED";

      if (!shouldFetch) continue;

      if (inc.status === "CONFIRMED") {
        prioritized.push(inc.id);
      } else {
        secondary.push(inc.id);
      }
    }

    return Array.from(new Set([...prioritized, ...secondary])).slice(
      0,
      maxHydrateCount,
    );
  }, [enabled, fetchMissingAssignments, includeClosed, maxHydrateCount, rawIncidents]);

  const assignmentQueries = useQueries({
    queries: idsNeedingFetch.map((incidentId) => ({
      queryKey: incidentKeys.assignments(incidentId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchAssignmentsThrottled(incidentId, signal),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled,
    })),
  });

  const fetchedAssignmentsByIncidentId = useMemo(() => {
    const map = new Map<string, IncidentAssignmentItem[]>();
    idsNeedingFetch.forEach((id, index) => {
      const data = assignmentQueries[index]?.data;
      if (Array.isArray(data)) {
        map.set(id, data);
      }
    });
    return map;
  }, [idsNeedingFetch, assignmentQueries]);

  const isHydratingAssignments = assignmentQueries.some((q) => q.isLoading);

  const hydratedIncidents = useMemo<IncidentItem[]>(() => {
    return rawIncidents.map((inc) => {
      const rawAssignments: IncidentAssignmentItem[] = Array.isArray(
        inc.assignments,
      )
        ? inc.assignments
        : fetchedAssignmentsByIncidentId.get(inc.id) ?? [];

      const enrichedAssignments = rawAssignments.map((a) => {
        const assigneeId =
          a.assignedTo ||
          (a as unknown as { assignedToUserId?: string }).assignedToUserId ||
          "";
        const resolvedPerson = assigneeId ? usersById.get(assigneeId) : undefined;
        return {
          ...a,
          assignedTo: assigneeId || a.assignedTo,
          assignedToName:
            a.assignedToName ||
            resolvedPerson?.name ||
            (assigneeId ? `#${assigneeId.slice(0, 8)}` : undefined),
          assignedToEmail: a.assignedToEmail || resolvedPerson?.email,
        };
      });

      return {
        ...inc,
        assignments: enrichedAssignments,
      };
    });
  }, [rawIncidents, fetchedAssignmentsByIncidentId, usersById]);

  return {
    incidents: hydratedIncidents,
    isHydratingAssignments,
    usersById,
    siteManagersBySiteId,
    siteOfficersBySiteId,
    allUsers,
  };
}
