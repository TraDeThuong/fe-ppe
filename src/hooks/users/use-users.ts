"use client";

import { useQuery, keepPreviousData, type UseQueryOptions } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "./user.query-keys";
import type { ApiError } from "@/lib/axios";
import type { UserListResponse, UserQueryParams } from "@/types";

export interface UseUsersOptions
  extends Omit<
    UseQueryOptions<UserListResponse, ApiError, UserListResponse, readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách người dùng có phân trang, lọc theo vai trò, trạng thái và tìm kiếm.
 * Tự động giữ lại dữ liệu trang trước (keepPreviousData) để trải nghiệm chuyển trang mượt mà.
 */
export function useUsers(params?: UserQueryParams, options?: UseUsersOptions) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.getUsers(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30s cache để tránh gọi lặp
    ...options,
  });
}
