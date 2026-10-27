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
import type {
  CreateNotificationTemplatePayload,
  NotificationTemplateItemDto,
  PreviewTemplatePayload,
  PreviewTemplateResponse,
  TemplateListResponse,
  TemplateQueryParams,
  TestSendTemplatePayload,
  UpdateNotificationTemplatePayload,
} from "@/types";

export interface UseTemplatesOptions
  extends Omit<
    UseQueryOptions<
      TemplateListResponse,
      ApiError,
      TemplateListResponse,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách mẫu thông báo (Templates).
 */
export function useNotificationTemplates(
  params?: TemplateQueryParams,
  options?: UseTemplatesOptions,
) {
  return useQuery({
    queryKey: notificationKeys.templates(params),
    queryFn: () => notificationService.getTemplates(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Hook lấy chi tiết một mẫu thông báo theo mã code.
 */
export function useNotificationTemplate(code: string) {
  return useQuery({
    queryKey: notificationKeys.templateDetail(code),
    queryFn: () => notificationService.getTemplateByCode(code),
    enabled: Boolean(code),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook tạo mẫu thông báo mới.
 */
export function useCreateNotificationTemplate(
  options?: MutationHookOptions<
    NotificationTemplateItemDto,
    CreateNotificationTemplatePayload
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: CreateNotificationTemplatePayload) =>
      notificationService.createTemplate(payload),
    onSuccess: async (...args) => {
      const [template] = args;
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.templates(),
      });
      toast.success(`Đã tạo mẫu thông báo "${template.name}" thành công.`);
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface UpdateTemplateVariables {
  id: string;
  payload: UpdateNotificationTemplatePayload;
}

/**
 * Hook chỉnh sửa nội dung câu chữ hoặc tiêu đề của mẫu thông báo.
 */
export function useUpdateNotificationTemplate(
  options?: MutationHookOptions<
    NotificationTemplateItemDto,
    UpdateTemplateVariables
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ id, payload }: UpdateTemplateVariables) =>
      notificationService.updateTemplate(id, payload),
    onSuccess: async (...args) => {
      const [template] = args;
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.templates(),
      });
      toast.success(`Đã cập nhật mẫu thông báo "${template.name}".`);
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
 * Hook xóa mẫu thông báo.
 */
export function useDeleteNotificationTemplate(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => notificationService.deleteTemplate(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.templates(),
      });
      toast.success("Đã xóa mẫu thông báo.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface PreviewTemplateVariables {
  code: string;
  payload: PreviewTemplatePayload;
}

/**
 * Hook xem trước nội dung mẫu thông báo sau khi render với biến giả định.
 */
export function usePreviewNotificationTemplate(
  options?: MutationHookOptions<
    PreviewTemplateResponse,
    PreviewTemplateVariables
  >,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ code, payload }: PreviewTemplateVariables) =>
      notificationService.previewTemplate(code, payload),
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
    onSuccess,
  });
}

export interface TestSendTemplateVariables {
  code: string;
  payload: TestSendTemplatePayload;
}

/**
 * Hook gửi thử nghiệm mẫu thông báo tới email hoặc in-app để duyệt văn phong.
 */
export function useTestSendNotificationTemplate(
  options?: MutationHookOptions<{ message: string }, TestSendTemplateVariables>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ code, payload }: TestSendTemplateVariables) =>
      notificationService.testSendTemplate(code, payload),
    onSuccess: async (...args) => {
      toast.success("Đã gửi thử nghiệm mẫu thông báo thành công.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
