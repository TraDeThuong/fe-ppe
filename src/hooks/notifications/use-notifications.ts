"use client";

import {
  useQuery,
  keepPreviousData,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";
import type { ApiError } from "@/lib/axios";
import type { ListNotificationsQuery, NotificationListResponse } from "@/types";

export interface UseNotificationsOptions
  extends Omit<
    UseQueryOptions<
      NotificationListResponse,
      ApiError,
      NotificationListResponse,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách thông báo có phân trang, lọc theo mức độ, kênh, trạng thái và tìm kiếm.
 * Tự động giữ lại dữ liệu trang trước (keepPreviousData) để trải nghiệm chuyển trang mượt mà.
 */
export function useNotifications(
  params?: ListNotificationsQuery,
  options?: UseNotificationsOptions,
) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationService.getNotifications(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30s cache để tránh gọi lặp
    ...options,
  });
}
