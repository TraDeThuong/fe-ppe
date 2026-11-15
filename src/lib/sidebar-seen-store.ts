const STORAGE_KEY = "ppe_sidebar_seen_v1";

export type SeenTrackableNavKey = "reports" | "auditLogs";

type SeenStoreMap = Record<string, Partial<Record<SeenTrackableNavKey, number>>>;

function readStore(): SeenStoreMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SeenStoreMap) : {};
  } catch {
    return {};
  }
}

function writeStore(store: SeenStoreMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

/**
 * Lấy mốc thời gian (epoch ms) lần cuối user xem một mục điều hướng cụ thể.
 */
export function getNavLastSeenAt(
  userId: string | undefined,
  navKey: SeenTrackableNavKey,
): number | null {
  if (!userId) return null;
  const store = readStore();
  const value = store[userId]?.[navKey];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Ghi nhận mốc thời gian user đã xem route tương ứng để reset badge "mới".
 */
export function markNavAsSeen(
  userId: string | undefined,
  navKey: SeenTrackableNavKey,
  timestampMs: number = Date.now(),
): number {
  if (!userId) return timestampMs;
  const store = readStore();
  const userEntry = store[userId] ?? {};
  store[userId] = {
    ...userEntry,
    [navKey]: timestampMs,
  };
  writeStore(store);
  return timestampMs;
}

