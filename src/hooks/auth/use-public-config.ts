"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { authKeys } from "./auth.query-keys";
import { ApiError } from "@/lib/axios";
import type { SystemPublicConfig } from "@/types";

export interface UsePublicConfigOptions
  extends Omit<
    UseQueryOptions<SystemPublicConfig, ApiError, SystemPublicConfig, readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook tải cấu hình hệ thống công khai và feature flags (GET /system/public).
 *
 * ĐẶC ĐIỂM:
 * - staleTime: Infinity (cấu hình hệ thống cố định trong suốt phiên người dùng).
 * - Cung cấp dữ liệu cho LocaleProvider ("app.locale") và điều khiển hiển thị
 *   nút đăng ký, đăng nhập social ("feature.registration.enabled", "feature.social_login.enabled").
 */
export function usePublicConfig(options?: UsePublicConfigOptions) {
  return useQuery({
    queryKey: authKeys.config(),
    queryFn: () => authService.getPublicConfig(),
    staleTime: Infinity,
    // Không retry khi mất kết nối hoàn toàn (status === 0) để UI báo offline ngay
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status >= 500 && failureCount < 2,
    // Chỉ thăm dò lại mỗi 10s khi đang lỗi; dừng polling ngay khi kết nối lại thành công
    refetchInterval: (query) => (query.state.status === "error" ? 10_000 : false),
    refetchOnWindowFocus: (query) => query.state.status === "error",
    refetchOnReconnect: true,
    ...options,
  });
}
