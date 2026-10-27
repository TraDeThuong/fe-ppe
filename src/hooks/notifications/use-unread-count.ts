"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useRealtime } from "@/contexts/RealtimeContext";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";
import type { ApiError } from "@/lib/axios";

export interface UseUnreadCountOptions
  extends Omit<
    UseQueryOptions<number, ApiError, number, readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy số lượng thông báo chưa đọc của người dùng hiện tại.
 * Tự động đồng bộ với kết nối Realtime SSE: khi nhận sự kiện cảnh báo vi phạm PPE hoặc thông báo mới,
 * query sẽ tự động được refetch tức thì mà không cần reload trang.
 */
export function useUnreadCount(options?: UseUnreadCountOptions) {
  const queryClient = useQueryClient();
  const { lastAlert } = useRealtime();

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 15 * 1000,
    ...options,
  });

  // Tự động refetch unread-count và danh sách thông báo khi có sự kiện SSE mới
  useEffect(() => {
    if (lastAlert) {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    }
  }, [lastAlert, queryClient]);

  return query;
}
