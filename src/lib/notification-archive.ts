import type { NotificationItemDto } from "@/types";
import { isNotificationRead, type NotificationInboxSnapshot } from "./notification-inbox";

const DAY_MS = 24 * 60 * 60 * 1000;
const DB_NAME = "ppe-notification-archive";
const STORE = "accounts";

export interface NotificationArchiveState {
  enabled: boolean;
  retentionDays: number;
  lastRunAt: number | null;
  checkRequested: boolean;
  /** A timestamp marks an archived delivery. Null protects a restored delivery from auto cleanup. */
  marks: Record<string, number | null>;
}

export const defaultNotificationArchive: NotificationArchiveState = {
  enabled: false,
  retentionDays: 30,
  lastRunAt: null,
  checkRequested: false,
  marks: {},
};

export function isValidRetentionDays(days: number) {
  return Number.isInteger(days) && days >= 1 && days <= 365;
}

export function isArchiveCheckDue(state: NotificationArchiveState, now: number) {
  return state.enabled && (state.checkRequested || state.lastRunAt === null || now - state.lastRunAt >= DAY_MS);
}

function getDeliveryIdentities(snapshot: NotificationInboxSnapshot) {
  const aliases = snapshot.broadcastAliases ?? {};
  const byOwner = new Map(Object.entries(aliases).map(([shared, owner]) => [owner, shared]));
  return (item: NotificationItemDto) => (item.mergedIds?.length ? item.mergedIds : [item.id]).map((id) => {
    const counterpart = byOwner.get(id) ?? (Object.hasOwn(aliases, id) ? aliases[id] : undefined);
    return counterpart ? [id, counterpart] : [id];
  });
}

function getArchiveTimestamp(
  item: NotificationItemDto,
  identities: string[][],
  marks: NotificationArchiveState["marks"],
) {
  if (!isNotificationRead(item) || item.unreadIds?.length) return undefined;
  let newest = -Infinity;
  for (const delivery of identities) {
    let timestamp = -Infinity;
    for (const id of delivery) {
      if (!Object.hasOwn(marks, id)) continue;
      const mark = marks[id];
      if (mark === null) return undefined;
      timestamp = Math.max(timestamp, mark);
    }
    if (timestamp === -Infinity) return undefined;
    newest = Math.max(newest, timestamp);
  }
  return newest;
}

export function selectArchiveItems(
  snapshot: NotificationInboxSnapshot,
  state: NotificationArchiveState,
  view: "active" | "archived",
) {
  if (Object.keys(state.marks).length === 0) return view === "active" ? snapshot.items : [];
  const getIdentities = getDeliveryIdentities(snapshot);
  if (view === "active") {
    return snapshot.items.filter((item) => getArchiveTimestamp(item, getIdentities(item), state.marks) === undefined);
  }
  return snapshot.items.flatMap((item) => {
    const timestamp = getArchiveTimestamp(item, getIdentities(item), state.marks);
    return timestamp === undefined ? [] : [{ item, timestamp }];
  }).sort((a, b) => b.timestamp - a.timestamp).map(({ item }) => item);
}

type ArchiveAction = { type: "manual"; ids: ReadonlySet<string> } | { type: "auto" } | { type: "restore"; id: string };

export function applyArchiveAction(
  state: NotificationArchiveState,
  snapshot: NotificationInboxSnapshot,
  action: ArchiveAction,
  now: number,
): { state: NotificationArchiveState; count: number } {
  const automatic = action.type === "auto";
  if (automatic && !isArchiveCheckDue(state, now)) return { state, count: 0 };

  const getIdentities = getDeliveryIdentities(snapshot);
  const updates = new Map<string, number | null>();
  const cutoff = now - state.retentionDays * DAY_MS;
  let count = 0;
  for (const item of snapshot.items) {
    if (!isNotificationRead(item) || item.unreadIds?.length) continue;
    if (action.type === "manual" && !action.ids.has(item.id)) continue;
    if (action.type === "restore" && action.id !== item.id) continue;

    const identities = getIdentities(item);
    const archived = getArchiveTimestamp(item, identities, state.marks) !== undefined;
    if (action.type === "restore" ? !archived : archived) continue;

    const ids = identities.flat();
    if (automatic && !(new Date(item.createdAt).getTime() < cutoff &&
      ids.every((id) => state.marks[id] !== null))) continue;

    for (const id of ids) updates.set(id, action.type === "restore" ? null : now);
    count++;
  }

  if (count === 0 && !automatic) return { state, count };
  return {
    state: {
      ...state,
      marks: count ? { ...state.marks, ...Object.fromEntries(updates) } : state.marks,
      lastRunAt: automatic ? now : state.lastRunAt,
      checkRequested: automatic ? false : state.checkRequested,
    },
    count,
  };
}

export function changeArchiveSettings(
  state: NotificationArchiveState,
  enabled: boolean,
  retentionDays: number,
): NotificationArchiveState {
  if (!isValidRetentionDays(retentionDays)) throw new Error("Invalid notification retention period");
  if (state.enabled === enabled && state.retentionDays === retentionDays) return state;
  return { ...state, enabled, retentionDays, checkRequested: enabled };
}

export const notificationArchiveChannel = "ppe-notification-archive";

export class NotificationArchiveStorageError extends Error {
  constructor(cause: unknown) {
    super("Notification archive storage is unavailable", { cause });
  }
}

function openArchiveDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Notification archive database upgrade is blocked"));
  });
}

/** Read the latest account state and write the result in the same transaction across tabs. */
export async function transactNotificationArchive(
  userId: string,
  update?: (state: NotificationArchiveState) => { state: NotificationArchiveState; count: number },
) {
  let database: IDBDatabase | undefined;
  try {
    database = await openArchiveDatabase();
    const tx = database.transaction(STORE, update ? "readwrite" : "readonly");
    const accounts = tx.objectStore(STORE);
    return await new Promise<{ state: NotificationArchiveState; count: number; changed: boolean }>((resolve, reject) => {
      const request = accounts.get(userId);
      let result: { state: NotificationArchiveState; count: number; changed: boolean };
      let updateError: unknown;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(updateError ?? tx.error);
      request.onsuccess = () => {
        try {
          const previous = (request.result as NotificationArchiveState | undefined) ?? defaultNotificationArchive;
          const next = update?.(previous) ?? { state: previous, count: 0 };
          result = { ...next, changed: next.state !== previous };
          if (result.changed) accounts.put(next.state, userId);
        } catch (error) {
          updateError = error;
          tx.abort();
        }
      };
    });
  } catch (error) {
    if (error instanceof NotificationArchiveInboxUnavailable) throw error;
    throw new NotificationArchiveStorageError(error);
  } finally {
    database?.close();
  }
}

export class NotificationArchiveInboxUnavailable extends Error {}
