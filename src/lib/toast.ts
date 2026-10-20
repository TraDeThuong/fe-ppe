import { showToast, toast as hotToast } from "@ui/toaster";

/**
 * Wrapper duy nhất quanh toast của design system (@ui/toaster) — mọi toast
 * trong app gọi qua đây để ăn đúng giao diện gỗ tùy chỉnh (WoodenToast).
 */
export const toast = {
  success: (message: string, options?: { id?: string }) => showToast(message, "success", options),
  error: (message: string, options?: { id?: string }) => showToast(message, "error", options),
  loading: (message: string, options?: { id?: string }) => showToast(message, "loading", options),
  dismiss: (toastId?: string) => hotToast.dismiss(toastId),
};
