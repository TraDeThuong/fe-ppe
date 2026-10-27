"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  handleMutationError,
  type MutationHookOptions,
} from "@/hooks/auth/auth-hook-utils";
import { toast } from "@/lib/toast";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";
import type { ApiError } from "@/lib/axios";
import type {
  NotificationPreferenceDto,
  UpdateNotificationPreferencePayload,
} from "@/types";

export interface UsePreferencesOptions
  extends Omit<
    UseQueryOptions<
      NotificationPreferenceDto[],
      ApiError,
      NotificationPreferenceDto[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách cấu hình kênh nhận thông báo của người dùng hiện tại.
 */
export function useNotificationPreferences(options?: UsePreferencesOptions) {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationService.getPreferences(),
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Hook cập nhật cấu hình kênh nhận thông báo (Bật/tắt kênh hoặc gạt ngưỡng độ nghiêm trọng chống Alert Fatigue).
 */
export function useUpdateNotificationPreference(
  options?: MutationHookOptions<
    NotificationPreferenceDto,
    UpdateNotificationPreferencePayload
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: UpdateNotificationPreferencePayload) =>
      notificationService.updatePreference(payload),
    onSuccess: async (...args) => {
      const [updated] = args;
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
      toast.success(
        `Đã lưu cấu hình kênh "${updated.channel}" (Ngưỡng: ${updated.severityThreshold}).`,
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
