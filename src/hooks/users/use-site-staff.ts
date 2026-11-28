"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import type { UserResponseDto } from "@/types";
import { userKeys } from "./user.query-keys";

export interface SiteStaffResult {
  /** Nhân sự của các công trường; `null` khi BE chưa có `/users/site-staff` (dùng cách cũ). */
  users: UserResponseDto[] | null;
  isLoading: boolean;
}

/**
 * Nhân sự đang hoạt động của một hoặc nhiều công trường qua `GET /users/site-staff?siteId=`
 * (hợp đồng mục 5). Không cần USER_READ. Mỗi công trường 1 request, cache 5 phút.
 */
export function useSiteStaff(siteIds: readonly string[], enabled = true): SiteStaffResult {
  const ids = useMemo(() => [...new Set(siteIds.filter(Boolean))].sort(), [siteIds]);
  const queries = useQueries({
    queries: ids.map((siteId) => ({
      queryKey: [...userKeys.all, "site-staff", siteId] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) => userService.getSiteStaff(siteId, { signal }),
      enabled: enabled && Boolean(siteId),
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });

  const isLoading = enabled && queries.some((q) => q.isLoading);
  const dataKey = queries.map((q) => (q.data === null ? "x" : q.data ? q.data.length : "-")).join("|");

  const users = useMemo<UserResponseDto[] | null>(() => {
    if (!enabled || ids.length === 0) return null;
    // Một công trường báo "chưa hỗ trợ" hoặc lỗi → coi như BE chưa có endpoint.
    if (queries.some((q) => q.data === null || q.isError)) return null;
    if (queries.some((q) => q.data === undefined)) return null;
    const byId = new Map<string, UserResponseDto>();
    queries.forEach((q, index) => {
      for (const u of q.data ?? []) {
        const prev = byId.get(u.id);
        const siteIdsOfUser = new Set([...(prev?.siteIds ?? []), ...(u.siteIds ?? []), ids[index]]);
        byId.set(u.id, { ...prev, ...u, siteIds: [...siteIdsOfUser] });
      }
    });
    return [...byId.values()];
  }, [enabled, ids, dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { users, isLoading };
}
