import type { ListNotificationsQuery, NotificationItemDto, NotificationListResponse } from "@/types";

export const BROADCAST_USER_ID = "00000000-0000-0000-0000-000000000000";
export interface NotificationInboxSnapshot { items: NotificationItemDto[]; rawTotal: number }
interface InboxReceipts { aliases: Record<string, string>; read: string[]; dismissed: string[] }
const memory = new Map<string, InboxReceipts>();
const storageKey = (userId: string) => `ppe.notification-inbox.v1:${userId}`;

function receipts(userId: string): InboxReceipts {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) || "null");
    if (saved?.v === 1 && saved.aliases && typeof saved.aliases === "object" && !Array.isArray(saved.aliases) &&
      Object.entries(saved.aliases).every(([id, owner]) => id && typeof owner === "string") &&
      Array.isArray(saved.read) && saved.read.every((id: unknown) => typeof id === "string") &&
      Array.isArray(saved.dismissed) && saved.dismissed.every((id: unknown) => typeof id === "string")) {
      memory.set(userId, saved);
      return saved;
    }
  } catch { /* Storage may be unavailable. Keep account-scoped receipts in memory. */ }
  return memory.get(userId) ?? { aliases: {}, read: [], dismissed: [] };
}
function saveReceipts(userId: string, value: InboxReceipts) {
  memory.set(userId, value);
  try { localStorage.setItem(storageKey(userId), JSON.stringify({ ...value, v: 1 })); } catch { /* Best effort. */ }
}
export function recordLocalBroadcastState(userId: string, ids: string[], action: "read" | "dismissed") {
  const value = receipts(userId);
  value[action] = [...new Set([...value[action], ...ids])];
  saveReceipts(userId, value);
}
export const isNotificationRead = (item: NotificationItemDto) => item.status === "READ" || item.isRead === true || !!item.readAt;

function broadcastFingerprint(item: NotificationItemDto): string | null {
  if (item.incidentId || item.templateId || item.channel !== "IN_APP" || !["SENT", "READ", "DELIVERED"].includes(item.status)) return null;
  const created = new Date(item.createdAt).getTime();
  if (!Number.isFinite(created)) return null;
  // A broadcast writes both deliveries in one DB statement. Require the exact timestamp
  // and payload; never merge intentional sends made at different times.
  return JSON.stringify([created, item.title, item.content, item.severity, item.actionUrl ?? "", item.metadata ?? null]);
}

/** Prefer owned deliveries; match global/owned pairs one-to-one, never two owned records. */
export function normalizeNotificationInbox(raw: NotificationItemDto[], userId: string): NotificationInboxSnapshot {
  const saved = receipts(userId);
  const owned = new Map<string, NotificationItemDto[]>();
  const globals: NotificationItemDto[] = [];
  for (const item of raw) {
    if (item.userId !== userId && item.userId !== BROADCAST_USER_ID) throw new Error("Dữ liệu hộp thư không thuộc tài khoản hiện tại.");
    const key = broadcastFingerprint(item);
    if (item.userId === userId && key) {
      const group = owned.get(key) ?? []; group.push(item); owned.set(key, group);
    } else if (item.userId === BROADCAST_USER_ID && key) globals.push(item);
  }
  const usedOwned = new Set(Object.values(saved.aliases));
  for (const item of globals) {
    if (saved.aliases[item.id]) continue;
    const counterpart = owned.get(broadcastFingerprint(item)!)?.find((candidate) => !usedOwned.has(candidate.id));
    if (counterpart) { saved.aliases[item.id] = counterpart.id; usedOwned.add(counterpart.id); }
  }
  saveReceipts(userId, saved);
  const dismissed = new Set(saved.dismissed);
  const read = new Set(saved.read);
  const items = raw.filter((item) => item.userId !== BROADCAST_USER_ID || (!saved.aliases[item.id] && !dismissed.has(item.id)))
    .map((item) => item.userId === BROADCAST_USER_ID && read.has(item.id) ? { ...item, status: "READ" as const, isRead: true } : item)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id));
  return { items, rawTotal: raw.length };
}

function parseBoundaryTimestamp(raw: string, endOfDay: boolean): number {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    return endOfDay
      ? new Date(year, month, day, 23, 59, 59, 999).getTime()
      : new Date(year, month, day, 0, 0, 0, 0).getTime();
  }
  return Date.parse(raw);
}

export function notificationInboxPage(snapshot: NotificationInboxSnapshot, params: ListNotificationsQuery = {}): NotificationListResponse {
  const search = params.search?.trim().toLocaleLowerCase();
  const fromTs = params.fromDate ? parseBoundaryTimestamp(params.fromDate, false) : undefined;
  const toTs = params.toDate ? parseBoundaryTimestamp(params.toDate, true) : undefined;
  const items = snapshot.items.filter((item) => {
    if (params.isRead !== undefined && isNotificationRead(item) !== params.isRead) return false;
    if (params.status && item.status !== params.status) return false;
    if (params.channel && item.channel !== params.channel) return false;
    if (params.severity && item.severity !== params.severity) return false;
    if (params.incidentId && item.incidentId !== params.incidentId) return false;
    if (search && !`${item.title}\n${item.content}`.toLocaleLowerCase().includes(search)) return false;
    if (params.type === "ALERT" && !["HIGH", "CRITICAL"].includes(item.severity)) return false;
    if (params.type === "NOTIFICATION" && !["LOW", "NORMAL", "MEDIUM"].includes(item.severity)) return false;
    if (params.type && !["ALERT", "NOTIFICATION"].includes(params.type) && item.type !== params.type && item.severity !== params.type) return false;
    const date = new Date(item.createdAt).getTime();
    return (fromTs === undefined || !Number.isFinite(fromTs) || date >= fromTs) &&
      (toTs === undefined || !Number.isFinite(toTs) || date <= toTs);
  });
  const limit = Math.max(1, params.limit ?? 20);
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const page = Math.min(Math.max(1, params.page ?? 1), totalPages);
  return { data: items.slice((page - 1) * limit, page * limit), meta: { page, limit, total: items.length, totalPages } };
}

export interface NotificationInboxRange { fromDate?: string; toDate?: string }

/** Walk inclusive time windows instead of unstable OFFSET pages. Re-read the boundary
 * timestamp and union IDs; publish only after every row in the original total is covered. */
export async function collectNotificationInbox(
  fetchPage: (page: number, limit: number, range?: NotificationInboxRange) => Promise<NotificationListResponse>,
  signal?: AbortSignal,
) {
  const limit = 100;
  const rows = new Map<string, NotificationItemDto>();
  let expectedTotal: number | undefined;
  let boundary: number | undefined;
  for (let request = 0; request < 250; request++) {
    signal?.throwIfAborted();
    const response = await fetchPage(1, limit, boundary === undefined ? undefined : { toDate: new Date(boundary).toISOString() });
    signal?.throwIfAborted();
    const meta = response.meta;
    if (!meta || !Number.isSafeInteger(meta.total) || meta.total < 0 || meta.total > 10_000 ||
      meta.page !== 1 || meta.limit !== limit || !Number.isSafeInteger(meta.totalPages) ||
      (meta.totalPages !== Math.ceil(meta.total / limit) && !(meta.total === 0 && meta.totalPages === 1)) ||
      response.data.length !== Math.min(limit, meta.total)) {
      throw new Error("Chưa đọc được đầy đủ hộp thư hoặc metadata không hợp lệ (giới hạn 10.000 bản ghi).");
    }
    if (expectedTotal === undefined) expectedTotal = meta.total;
    const pageIds = new Set<string>();
    let oldest = Infinity;
    let previous = Infinity;
    for (const item of response.data) {
      const time = new Date(item.createdAt).getTime();
      if (!item.id || pageIds.has(item.id) || !Number.isFinite(time) || time > previous ||
        (boundary !== undefined && time > boundary)) {
        throw new Error("Thứ tự hoặc dữ liệu hộp thư không hợp lệ. Vui lòng làm mới.");
      }
      pageIds.add(item.id);
      rows.set(item.id, item);
      previous = time;
      oldest = Math.min(oldest, time);
    }
    if (rows.size === expectedTotal) return [...rows.values()];
    if (meta.total <= limit) {
      if (rows.size !== expectedTotal) throw new Error("Hộp thư đã thay đổi trong lúc tải. Vui lòng làm mới.");
      return [...rows.values()];
    }
    if (rows.size > expectedTotal) throw new Error("Hộp thư đã thay đổi trong lúc tải. Vui lòng làm mới.");
    if (boundary !== undefined && oldest >= boundary) {
      // Exactly 100 records at one timestamp fills the page and prevents cursor progress.
      // Verify that complete bucket before moving one millisecond below it.
      const time = new Date(boundary).toISOString();
      const bucket = await fetchPage(1, limit, { fromDate: time, toDate: time });
      signal?.throwIfAborted();
      const count = bucket.meta?.total;
      if (Number.isSafeInteger(count) && count >= 0 && count <= limit && bucket.meta.page === 1 &&
        bucket.meta.limit === limit && bucket.meta.totalPages === Math.ceil(count / limit) && bucket.data.length === count &&
        new Set(bucket.data.map((item) => item.id)).size === count &&
        bucket.data.every((item) => item.id && new Date(item.createdAt).getTime() === boundary)) {
        bucket.data.forEach((item) => rows.set(item.id, item));
        boundary -= 1;
        continue;
      }
      throw new Error("Chưa thể tải đầy đủ các thông báo cùng thời điểm. Số liệu trước đó được giữ lại; vui lòng thử lại.");
    }
    boundary = oldest;
  }
  throw new Error("Chưa đọc được đầy đủ hộp thư. Vui lòng thử lại.");
}
