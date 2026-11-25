import {
  showIncidentToast,
  showToast,
  toast as hotToast,
  type IncidentToastInput,
  type ToastOptions,
} from "@ui/toaster";

export interface IncidentToastOptions {
  id?: string;
  /** Khóa gom nhóm thông minh khi nhiều sự cố cùng camera + cùng loại vi phạm bắn liên tiếp */
  burstKey?: string;
  /** Cửa sổ thời gian gom burst (mặc định 5000ms) */
  burstWindowMs?: number;
  duration?: number;
}

interface TrackedIncidentToast {
  toastId: string;
  burstKey?: string;
  count: number;
  lastUpdatedAt: number;
  expiresAt: number;
}

const DEFAULT_BURST_WINDOW_MS = 5000;
const MAX_ACTIVE_INCIDENT_TOASTS = 3;

const activeIncidentToasts: TrackedIncidentToast[] = [];

function pruneExpiredIncidentToasts(now: number) {
  for (let i = activeIncidentToasts.length - 1; i >= 0; i--) {
    if (activeIncidentToasts[i].expiresAt <= now) {
      activeIncidentToasts.splice(i, 1);
    }
  }
}

function dismissTrackedIncident(toastId?: string) {
  if (!toastId) {
    activeIncidentToasts.length = 0;
    return;
  }
  const idx = activeIncidentToasts.findIndex((item) => item.toastId === toastId);
  if (idx !== -1) {
    activeIncidentToasts.splice(idx, 1);
  }
}

/** Chỉ dùng cho unit test để đặt lại bộ đếm gom burst */
export function resetIncidentToastTracker() {
  activeIncidentToasts.length = 0;
}

function triggerIncidentToast(
  input: IncidentToastInput,
  options?: IncidentToastOptions,
): string {
  const now = Date.now();
  pruneExpiredIncidentToasts(now);

  const burstWindowMs = options?.burstWindowMs ?? DEFAULT_BURST_WINDOW_MS;
  const burstKey = options?.burstKey;

  // 1. Gom thông minh nếu cùng burstKey trong cửa sổ 5 giây
  if (burstKey) {
    const existing = activeIncidentToasts.find(
      (entry) =>
        entry.burstKey === burstKey && now - entry.lastUpdatedAt <= burstWindowMs,
    );

    if (existing) {
      const nextCount = existing.count + 1;
      const duration = options?.duration ?? input.durationMs ?? 8000;
      existing.count = nextCount;
      existing.lastUpdatedAt = now;
      existing.expiresAt = now + duration;

      return showIncidentToast(
        { ...input, burstCount: nextCount },
        {
          id: existing.toastId,
          duration: options?.duration,
          onDismissComplete: dismissTrackedIncident,
        },
      );
    }
  }

  // 2. Nếu trùng id chính xác → cập nhật tại chỗ, không cộng thêm vào giới hạn slot
  const requestedId = options?.id;
  const existingById = requestedId
    ? activeIncidentToasts.find((entry) => entry.toastId === requestedId)
    : undefined;

  if (!existingById) {
    // 3. Giới hạn tối đa 3 toast sự cố hiển thị cùng lúc để giữ viewport gọn sạch
    while (activeIncidentToasts.length >= MAX_ACTIVE_INCIDENT_TOASTS) {
      const oldest = activeIncidentToasts.shift();
      if (oldest) {
        hotToast.dismiss(oldest.toastId);
      }
    }
  }

  const toastId = showIncidentToast(
    { ...input, burstCount: input.burstCount ?? 1 },
    {
      id: requestedId,
      duration: options?.duration,
      onDismissComplete: dismissTrackedIncident,
    },
  );

  const duration = options?.duration ?? input.durationMs ?? 8000;
  if (existingById) {
    existingById.lastUpdatedAt = now;
    existingById.expiresAt = now + duration;
  } else {
    activeIncidentToasts.push({
      toastId,
      burstKey,
      count: input.burstCount ?? 1,
      lastUpdatedAt: now,
      expiresAt: now + duration,
    });
  }

  return toastId;
}

/**
 * Wrapper duy nhất quanh toast của design system (@ui/toaster) — mọi toast
 * trong app (kể cả cảnh báo sự cố PPE) gọi qua đây để ăn đúng giao diện gỗ tùy chỉnh (WoodenToast).
 */
export const toast = {
  success: (message: string, options?: ToastOptions) =>
    showToast(message, "success", options),
  error: (message: string, options?: { id?: string }) =>
    showToast(message, "error", options),
  info: (message: string, options?: { id?: string }) =>
    showToast(message, "blank", options),
  loading: (message: string, options?: { id?: string }) =>
    showToast(message, "loading", options),
  incident: (input: IncidentToastInput, options?: IncidentToastOptions) =>
    triggerIncidentToast(input, options),
  dismiss: (toastId?: string) => {
    dismissTrackedIncident(toastId);
    hotToast.dismiss(toastId);
  },
};

export type { IncidentToastInput };
