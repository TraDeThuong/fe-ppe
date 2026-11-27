import type { NotificationChannel, NotificationItemDto } from "@/types";

export const BROADCAST_USER_ID = "00000000-0000-0000-0000-000000000000";
const MULTI_CHANNEL_MERGE_WINDOW_MS = 10_000;
const CHANNEL_PRIORITY: Record<string, number> = {
  IN_APP: 0,
  WEB: 1,
  EMAIL: 2,
  ZALO_ZNS: 3,
  WEBHOOK: 4,
};

function channelRank(channel: string): number {
  return CHANNEL_PRIORITY[channel] ?? 99;
}

export function getNotificationChannels(item: NotificationItemDto): NotificationChannel[] {
  if (item.deliveredChannels && item.deliveredChannels.length > 0) {
    return item.deliveredChannels;
  }
  return [item.channel];
}
export interface NotificationInboxSnapshot {
  items: NotificationItemDto[];
  rawTotal: number;
  broadcastAliases?: Readonly<Record<string, string>>;
}
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

function multiChannelKey(item: NotificationItemDto): string {
  return JSON.stringify([
    item.userId,
    item.incidentId ?? "",
    item.templateId ?? "",
    item.title,
    item.content,
    item.severity,
    item.actionUrl ?? "",
  ]);
}

/**
 * Gộp các bản ghi phát đa kênh (VD: IN_APP + EMAIL) thuộc cùng một sự kiện phát thông báo
 * (cùng user, cùng incident/nội dung, khác kênh, tạo trong cùng đợt <= 10s) thành 1 mục duy nhất
 * để hộp thư, chuông thông báo và bộ đếm chưa đọc không bị nhân đôi.
 */
function mergeMultiChannelDeliveries(
  items: NotificationItemDto[],
  userId: string,
  broadcastOwnedIds: Set<string>,
): NotificationItemDto[] {
  interface MergeGroup {
    members: NotificationItemDto[];
    channels: Set<string>;
    anchorTime: number;
  }

  const output: NotificationItemDto[] = [];
  const groupsByKey = new Map<string, MergeGroup[]>();
  const allGroups: MergeGroup[] = [];

  for (const item of items) {
    // Chỉ gộp bản ghi thuộc sở hữu người dùng hiện tại, bỏ qua bản ghi broadcast dùng chung
    if (item.userId !== userId || broadcastOwnedIds.has(item.id)) {
      output.push(item);
      continue;
    }

    const ts = new Date(item.createdAt).getTime();
    if (!Number.isFinite(ts)) {
      output.push(item);
      continue;
    }

    const key = multiChannelKey(item);
    const candidates = groupsByKey.get(key) ?? [];
    const match = candidates.find(
      (group) =>
        !group.channels.has(item.channel) &&
        Math.abs(group.anchorTime - ts) <= MULTI_CHANNEL_MERGE_WINDOW_MS,
    );

    if (match) {
      match.members.push(item);
      match.channels.add(item.channel);
    } else {
      const nextGroup: MergeGroup = {
        members: [item],
        channels: new Set([item.channel]),
        anchorTime: ts,
      };
      candidates.push(nextGroup);
      groupsByKey.set(key, candidates);
      allGroups.push(nextGroup);
    }
  }

  for (const group of allGroups) {
    if (group.members.length === 1) {
      output.push(group.members[0]);
      continue;
    }

    const sorted = [...group.members].sort(
      (a, b) =>
        channelRank(a.channel) - channelRank(b.channel) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        b.id.localeCompare(a.id),
    );
    const primary = sorted[0];
    const deliveredChannels = Array.from(new Set(sorted.flatMap(getNotificationChannels)));
    const mergedIds = sorted.map((member) => member.id);
    const unreadMembers = sorted.filter((member) => !isNotificationRead(member));
    const unreadIds = unreadMembers.map((member) => member.id);
    const allRead = unreadIds.length === 0;
    const representativeUnread = unreadMembers[0];

    output.push({
      ...primary,
      status: allRead ? ("READ" as const) : representativeUnread.status,
      isRead: allRead,
      readAt: allRead
        ? (primary.readAt ?? sorted.find((member) => member.readAt)?.readAt ?? null)
        : null,
      evidenceUrl:
        primary.evidenceUrl ??
        sorted.find((member) => member.evidenceUrl)?.evidenceUrl ??
        null,
      actionUrl:
        primary.actionUrl ??
        sorted.find((member) => member.actionUrl)?.actionUrl ??
        null,
      deliveredChannels,
      mergedIds,
      unreadIds,
    });
  }

  return output;
}

/** Prefer owned deliveries; match global/owned pairs one-to-one, and collapse multi-channel duplicates of the same dispatch. */
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
  const afterBroadcast = raw
    .filter((item) => item.userId !== BROADCAST_USER_ID || (!saved.aliases[item.id] && !dismissed.has(item.id)))
    .map((item) => item.userId === BROADCAST_USER_ID && read.has(item.id) ? { ...item, status: "READ" as const, isRead: true } : item);

  const items = mergeMultiChannelDeliveries(afterBroadcast, userId, usedOwned)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id));
  return { items, rawTotal: raw.length, broadcastAliases: saved.aliases };
}
