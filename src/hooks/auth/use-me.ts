"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { authKeys } from "./auth.query-keys";
import type { ApiError } from "@/lib/axios";
import type { MeDto } from "@/types";

export interface UseMeOptions
  extends Omit<UseQueryOptions<MeDto, ApiError, MeDto, readonly unknown[]>, "queryKey" | "queryFn"> {}

/**
 * Hook truy vấn thông tin người dùng hiện tại (GET /auth/me).
 *
 * ĐẶC ĐIỂM:
 * - staleTime: 5 phút (tránh request thừa khi chuyển đổi qua lại giữa các trang).
 * - enabled: Chỉ tự động kích hoạt khi trạng thái AuthContext là "authenticated".
 * - Tái sử dụng cache đã được khôi phục sẵn ở AuthProvider (dedup request).
 */
export function useMe(options?: UseMeOptions) {
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.status === "authenticated";

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authService.getMe(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== undefined ? options.enabled : isAuthenticated,
    ...options,
  });
}
