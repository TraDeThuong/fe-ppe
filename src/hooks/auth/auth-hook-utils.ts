"use client";

import type { UseMutationOptions } from "@tanstack/react-query";
import { ApiError } from "@/lib/axios";
import { toast } from "@/lib/toast";
import { ErrorCode } from "@/types";

export interface MutationHookOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables>, "mutationFn"> {
  /** Khi true, bỏ qua thông báo toast lỗi tự động của hook để component tự xử lý (ví dụ inline form error) */
  suppressToast?: boolean;
}

/**
 * Kiểm tra xem lỗi đã được Axios interceptor hoặc cơ chế form inline xử lý chưa:
 * 1. Status 0 (mất mạng), Status >= 500 (lỗi máy chủ), 429 RATE_LIMIT_EXCEEDED -> interceptor đã toast toàn cục.
 * 2. 422 VALIDATION_ERROR -> hiển thị trực tiếp dưới các trường form (inline error), không toast đè.
 */
export function shouldToastError(error: unknown, suppressToast?: boolean): boolean {
  if (suppressToast) return false;

  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) return false;
    if (error.status === 429 && error.code === ErrorCode.RATE_LIMIT_EXCEEDED) return false;
    if (error.status === 422 || error.code === ErrorCode.VALIDATION_ERROR) return false;
  }

  return true;
}

/**
 * Hiển thị toast thông báo lỗi nghiệp vụ đúng ngữ cảnh nếu chưa được interceptor xử lý.
 */
export function handleMutationError(error: unknown, suppressToast?: boolean): void {
  if (!shouldToastError(error, suppressToast)) return;

  if (error instanceof ApiError) {
    toast.error(error.message || "Đã xảy ra lỗi trong quá trình xử lý.");
    return;
  }

  if (error instanceof Error) {
    toast.error(error.message || "Đã xảy ra lỗi không xác định.");
    return;
  }

  toast.error("Đã xảy ra lỗi. Vui lòng thử lại.");
}
