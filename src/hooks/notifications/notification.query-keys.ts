/**
 * Query Key Factory cho phân hệ Thông báo (Notification Module).
 * Tuân thủ quy chuẩn quản lý cache của TanStack Query:
 * - Dễ dàng invalidate theo cấp bậc hoặc theo từng query cụ thể.
 */
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params?: unknown) => [...notificationKeys.lists(), params] as const,
  inbox: (userId: string) => [...notificationKeys.lists(), "inbox", userId] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
  templates: (params?: unknown) =>
    params === undefined ? [...notificationKeys.all, "templates"] as const : [...notificationKeys.all, "templates", params] as const,
  templateDetail: (code: string) =>
    [...notificationKeys.all, "templates", "detail", code] as const,
  emailLogs: (params?: unknown) =>
    params === undefined
      ? ([...notificationKeys.all, "email-logs"] as const)
      : ([...notificationKeys.all, "email-logs", params] as const),
};
