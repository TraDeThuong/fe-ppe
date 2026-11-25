"use client";

import { collectCatalog } from "@/lib/table-utils";
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
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { systemQueryKeys } from "@/hooks/system/system.query-keys";
import { ApiError } from "@/lib/axios";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";
import {
  ErrorCode,
  type CreateNotificationTemplatePayload,
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
      toast.success(
        pickLocaleText(
          `Đã tạo mẫu thông báo "${template.name}" thành công.`,
          `Notification template "${template.name}" created.`,
        ),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      if (error instanceof ApiError && error.code === ErrorCode.FEATURE_DISABLED) {
        void queryClient.invalidateQueries({ queryKey: authKeys.config() });
        void queryClient.invalidateQueries({ queryKey: systemQueryKeys.featureFlags() });
        handleMutationError(error, false);
      } else {
        handleMutationError(error, options?.suppressToast);
      }
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
      toast.success(
        pickLocaleText(
          `Đã cập nhật mẫu thông báo "${template.name}".`,
          `Notification template "${template.name}" updated.`,
        ),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      if (error instanceof ApiError && error.code === ErrorCode.FEATURE_DISABLED) {
        void queryClient.invalidateQueries({ queryKey: authKeys.config() });
        void queryClient.invalidateQueries({ queryKey: systemQueryKeys.featureFlags() });
        handleMutationError(error, false);
      } else {
        handleMutationError(error, options?.suppressToast);
      }
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
      toast.success(
        pickLocaleText(
          "Đã xóa mẫu thông báo.",
          "Notification template deleted.",
        ),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      if (error instanceof ApiError && error.code === ErrorCode.FEATURE_DISABLED) {
        void queryClient.invalidateQueries({ queryKey: authKeys.config() });
        void queryClient.invalidateQueries({ queryKey: systemQueryKeys.featureFlags() });
        handleMutationError(error, false);
      } else {
        handleMutationError(error, options?.suppressToast);
      }
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
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ code, payload }: TestSendTemplateVariables) =>
      notificationService.testSendTemplate(code, payload),
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.emailLogs() }),
      ]);
      toast.success(
        pickLocaleText(
          "Đã gửi thử nghiệm mẫu thông báo thành công.",
          "Test notification template sent successfully.",
        ),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      if (error instanceof ApiError && error.code === ErrorCode.FEATURE_DISABLED) {
        void queryClient.invalidateQueries({ queryKey: authKeys.config() });
        void queryClient.invalidateQueries({ queryKey: systemQueryKeys.featureFlags() });
        handleMutationError(error, false);
      } else {
        handleMutationError(error, options?.suppressToast);
      }
      await onError?.(...args);
    },
  });
}

export function useNotificationTemplatesCatalog() {
  return useQuery({ queryKey: notificationKeys.templates({ catalog: true }), queryFn: () => collectCatalog(async (page, limit) => {
    const response = await notificationService.getTemplates({ page, limit });
    return { items: response.data, meta: response.meta };
  }), staleTime: 60_000 });
}
