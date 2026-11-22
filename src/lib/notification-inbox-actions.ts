import { BROADCAST_USER_ID, recordLocalBroadcastState, type NotificationInboxSnapshot } from "./notification-inbox";

export async function applyNotificationInboxAction(params: {
  snapshot: NotificationInboxSnapshot | undefined; userId: string;
  action: "read" | "read-all" | "delete"; id?: string;
}, service: {
  markAsRead: (id: string) => Promise<unknown>;
  markAllAsRead: () => Promise<unknown>;
  deleteNotification: (id: string) => Promise<unknown>;
}): Promise<NotificationInboxSnapshot> {
  const { snapshot, userId, action, id } = params;
  if (!snapshot || !userId) throw new Error("Chưa tải đầy đủ hộp thư. Vui lòng làm mới trước khi thao tác.");
  const item = snapshot.items.find((row) => row.id === id);
  if (action !== "read-all" && !item) throw new Error("Thông báo không còn trong hộp thư hiện tại.");
  if (item && item.userId !== userId && item.userId !== BROADCAST_USER_ID) throw new Error("Không có quyền thay đổi thông báo này.");
  const canRead = (status: string) => ["SENT", "DELIVERED"].includes(status);
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
