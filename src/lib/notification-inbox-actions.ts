import { BROADCAST_USER_ID, recordLocalBroadcastState, type NotificationInboxSnapshot } from "./notification-inbox";

export async function applyNotificationInboxAction(params: {
  snapshot: NotificationInboxSnapshot | undefined; userId: string;
  action: "read" | "read-many" | "read-all" | "delete"; id?: string; ids?: string[];
}, service: {
  markAsRead: (id: string) => Promise<unknown>;
  markAllAsRead: () => Promise<unknown>;
  deleteNotification: (id: string) => Promise<unknown>;
}): Promise<NotificationInboxSnapshot> {
  const { snapshot, userId, action, id, ids } = params;
  if (!snapshot || !userId) throw new Error("Chưa tải đầy đủ hộp thư. Vui lòng làm mới trước khi thao tác.");
  const canRead = (status: string) => ["SENT", "DELIVERED"].includes(status);

  if (action === "read-many") {
    const requestedSet = new Set(ids ?? []);
    const matched = snapshot.items.filter((row) => requestedSet.has(row.id));
    if (matched.length === 0) return snapshot;

    const ownedUnreadIds = new Set<string>();
    const broadcastIds: string[] = [];
    for (const row of matched) {
      if (row.userId !== userId && row.userId !== BROADCAST_USER_ID) {
        throw new Error("Không có quyền thay đổi thông báo này.");
      }
      if (row.userId === BROADCAST_USER_ID) {
        if (canRead(row.status)) broadcastIds.push(row.id);
      } else if (canRead(row.status)) {
        const siblings = row.unreadIds?.length ? row.unreadIds : [row.id];
        for (const sid of siblings) ownedUnreadIds.add(sid);
      }
    }

    if (ownedUnreadIds.size > 0) {
      await Promise.all([...ownedUnreadIds].map((targetId) => service.markAsRead(targetId)));
    }
    if (broadcastIds.length > 0) {
      recordLocalBroadcastState(userId, broadcastIds, "read");
    }

    return {
      ...snapshot,
      items: snapshot.items.map((row) =>
        requestedSet.has(row.id) && canRead(row.status)
          ? { ...row, status: "READ" as const, isRead: true, unreadIds: [] }
          : row,
      ),
    };
  }

  const item = snapshot.items.find((row) => row.id === id);
  if (action !== "read-all" && !item) throw new Error("Thông báo không còn trong hộp thư hiện tại.");
  if (item && item.userId !== userId && item.userId !== BROADCAST_USER_ID) throw new Error("Không có quyền thay đổi thông báo này.");
  if (action === "read-all") {
    await service.markAllAsRead();
    recordLocalBroadcastState(userId, snapshot.items.filter((row) => row.userId === BROADCAST_USER_ID && canRead(row.status)).map((row) => row.id), "read");
  } else if (item!.userId === BROADCAST_USER_ID) {
    // A shared broadcast is not owned by this user; do not PATCH/DELETE another owner's row.
    if (action === "delete") recordLocalBroadcastState(userId, [id!], "dismissed");
    else if (canRead(item!.status)) recordLocalBroadcastState(userId, [id!], "read");
  } else if (action === "delete") {
    const targetIds = item!.mergedIds?.length ? item!.mergedIds : [id!];
    await Promise.all(targetIds.map((targetId) => service.deleteNotification(targetId)));
  } else {
    const targetIds = item!.unreadIds?.length ? item!.unreadIds : [id!];
    await Promise.all(targetIds.map((targetId) => service.markAsRead(targetId)));
  }
  return { ...snapshot, items: snapshot.items.flatMap((row) => {
    if (action === "delete" && row.id === id) return [];
    if (action !== "delete" && (action === "read-all" || row.id === id) && canRead(row.status)) {
      return [{ ...row, status: "READ" as const, isRead: true, unreadIds: [] }];
    }
    return [row];
  }) };
}
