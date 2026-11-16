import { ApiError } from "@/lib/axios";

/**
 * Xác định lỗi phản hồi có phải do mất kết nối / máy chủ không phản hồi hay không.
 */
export function isConnectionOrServerError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500;
  }
  return true;
}

export interface LoginServerAvailabilityInput {
  publicConfigError: unknown;
  isPublicConfigError: boolean;
  maintenanceError: unknown;
  isMaintenanceError: boolean;
  maintenanceEnabled?: boolean;
}

/**
 * Xác định trạng thái máy chủ không khả dụng cho màn hình đăng nhập.
 * Khi hệ thống đang ở chế độ bảo trì (maintenanceEnabled === true),
 * máy chủ vẫn đang phản hồi để Admin có thể đăng nhập.
 */
export function isLoginServerUnavailable({
  publicConfigError,
  isPublicConfigError,
  maintenanceError,
  isMaintenanceError,
  maintenanceEnabled,
}: LoginServerAvailabilityInput): boolean {
  if (maintenanceEnabled) return false;

  const maintenanceFailed =
    isMaintenanceError && isConnectionOrServerError(maintenanceError);
  const configFailed =
    isPublicConfigError && isConnectionOrServerError(publicConfigError);

  return maintenanceFailed || configFailed;
}

