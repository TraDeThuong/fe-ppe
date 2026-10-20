"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { eventBus } from "@/lib/event-bus";
import { toast } from "@/lib/toast";
import { tokenStore } from "@/lib/token";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/lib/axios";
import type { SessionDto } from "@/types";
import { authKeys } from "./auth.query-keys";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

export interface UseSessionsOptions
  extends Omit<
    UseQueryOptions<SessionDto[], ApiError, SessionDto[], readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách các phiên đăng nhập đang hoạt động (GET /auth/sessions).
 *
 * ĐẶC ĐIỂM:
 * - staleTime: 60 giây.
 * - Mỗi phần tử SessionDto có cờ `isCurrent: boolean` để nhận diện phiên làm việc trên trình duyệt hiện tại.
 */
export function useSessions(options?: UseSessionsOptions) {
  return useQuery({
    queryKey: authKeys.sessions(),
    queryFn: () => authService.getSessions(),
    staleTime: 60 * 1000,
    ...options,
  });
}

export interface RevokeSessionInput {
  id: string;
  isCurrent?: boolean;
}

/**
 * Hook thu hồi một phiên làm việc cụ thể theo sessionId (DELETE /auth/sessions/:id).
 *
 * ĐẶC ĐIỂM:
 * - Chấp nhận truyền `id: string` hoặc đối tượng `{ id: string, isCurrent?: boolean }`.
 * - Nếu thu hồi chính phiên hiện tại (`isCurrent === true`): kích hoạt luồng đăng xuất,
 *   xóa tokenStore, xóa server cache và chuyển về trang đăng nhập.
 * - Nếu thu hồi phiên khác: invalidate cache danh sách sessions.
 */
export function useRevokeSession(
  options?: MutationHookOptions<{ message: string }, string | RevokeSessionInput>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables) => {
      const id = typeof variables === "string" ? variables : variables.id;
      return authService.revokeSession(id);
    },
    onSuccess: async (...args) => {
      const [data, variables] = args;
      const isCurrent = typeof variables === "string" ? false : Boolean(variables.isCurrent);

      if (isCurrent) {
        tokenStore.clear();
        queryClient.clear();
        auth?.setUser(null);
        eventBus.emit("auth:session-expired");
        toast.success("Phiên đăng nhập hiện tại đã được thu hồi.");
      } else {
        await queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
        toast.success(data.message || "Thu hồi phiên đăng nhập thành công!");
      }

      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

/**
 * Hook thu hồi toàn bộ các phiên làm việc khác ngoại trừ phiên hiện tại (DELETE /auth/sessions).
 */
export function useRevokeOtherSessions(
  options?: MutationHookOptions<{ message: string }, { refreshToken?: string } | void>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (variables) => authService.revokeOtherSessions(variables || undefined),
    onSuccess: async (...args) => {
      const [data] = args;
      await queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
      toast.success(data.message || "Đã thu hồi tất cả các phiên đăng nhập khác!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
