import { toast as hotToast, type ToastOptions } from "react-hot-toast";

/**
 * Wrapper duy nhất quanh react-hot-toast — mọi toast trong app gọi qua đây.
 * Khi thiết kế lại toast theo design system, chỉ sửa file này.
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => hotToast.success(message, options),
  error: (message: string, options?: ToastOptions) => hotToast.error(message, options),
  loading: (message: string, options?: ToastOptions) => hotToast.loading(message, options),
  dismiss: (toastId?: string) => hotToast.dismiss(toastId),
};
