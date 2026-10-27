"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
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
import type { EmailLogsListResponse, EmailLogsQueryParams } from "@/types";

export interface UseEmailLogsOptions
  extends Omit<
    UseQueryOptions<
      EmailLogsListResponse,
      ApiError,
      EmailLogsListResponse,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách nhật ký hàng đợi gửi email.
 */
export function useEmailLogs(
  params?: EmailLogsQueryParams,
  options?: UseEmailLogsOptions,
) {
  return useQuery({
    queryKey: notificationKeys.emailLogs(params),
    queryFn: () => notificationService.getEmailLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook yêu cầu gửi lại (Retry) email trong hàng đợi.
 */
export function useRetryEmail(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => notificationService.retryEmail(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.emailLogs(),
      });
      toast.success("Đã lên lịch gửi lại email.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
