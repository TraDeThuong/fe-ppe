import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShieldAlert,
  ClipboardCheck,
  Images,
  Cctv,
  Building2,
  BarChart3,
  Cpu,
  Bell,
  Users,
  ShieldCheck,
  ScrollText,
  Settings2,
  KeyRound,
  Wrench,
  CalendarClock,
  Webhook,
} from "lucide-react";

export type NavGroupKey = "monitoring" | "analytics" | "admin" | "personal";

export interface NavItem {
  key: string;
  route: string;
  /** Tiền tố dùng để highlight trạng thái active khi route mặc định là sub-route (vd: /settings/profile -> /settings) */
  activePrefix?: string;
  /** Các route phụ (ẩn khỏi sidebar) vẫn highlight mục này khi đang đứng trên route đó (vd: /evidences -> incidents) */
  extraActiveRoutes?: readonly string[];
  icon: LucideIcon;
  i18nKey: string;
  /** Quyền bắt buộc — user.permissions phải chứa giá trị này mới hiển thị */
  permission?: string;
  /** Hoặc user.permissions chứa ít nhất 1 quyền trong danh sách này */
  anyPermissions?: readonly string[];
  /** Tạm ẩn khỏi sidebar/menu điều hướng nhưng vẫn giữ route */
  hidden?: boolean;
  group: NavGroupKey;
}

export interface NavGroup {
  key: NavGroupKey;
  i18nKey: string;
  order: number;
}

export const NAV_GROUPS: readonly NavGroup[] = [
  { key: "monitoring", i18nKey: "nav.group.monitoring", order: 1 },
  { key: "analytics", i18nKey: "nav.group.analytics", order: 2 },
  { key: "admin", i18nKey: "nav.group.admin", order: 3 },
  { key: "personal", i18nKey: "nav.group.personal", order: 4 },
];

export const NAV_ITEMS: readonly NavItem[] = [
  // Nhóm Giám sát
  {
    key: "dashboard",
    route: "/dashboard",
    icon: LayoutDashboard,
    i18nKey: "nav.dashboard",
    group: "monitoring",
  },
  {
    key: "incidents",
    route: "/incidents",
    extraActiveRoutes: ["/evidences"],
    icon: ShieldAlert,
    i18nKey: "nav.incidents",
    permission: "PPE_INCIDENT_READ",
    group: "monitoring",
  },
  {
    key: "incidentAssignments",
    route: "/incidents/assignments",
    icon: ClipboardCheck,
    i18nKey: "nav.incidentAssignments",
    permission: "PPE_INCIDENT_READ",
    hidden: true,
    group: "monitoring",
  },
  {
    key: "evidences",
    route: "/evidences",
    icon: Images,
    i18nKey: "nav.evidences",
    permission: "PPE_INCIDENT_READ",
    hidden: true,
    group: "monitoring",
  },
  {
    key: "cameras",
    route: "/cameras",
    icon: Cctv,
    i18nKey: "nav.cameras",
    permission: "PPE_CAMERA_READ",
    group: "monitoring",
  },
  {
    key: "sites",
    route: "/sites",
    icon: Building2,
    i18nKey: "nav.sites",
    permission: "PPE_SITE_READ",
    group: "monitoring",
  },
  // Nhóm Phân tích
  {
    key: "reports",
    route: "/reports",
    icon: BarChart3,
    i18nKey: "nav.reports",
    permission: "PPE_REPORTING_READ",
    group: "analytics",
  },
  {
    key: "aiMetrics",
    route: "/ai-metrics",
    icon: Cpu,
    i18nKey: "nav.aiMetrics",
    permission: "PPE_AI_METRICS_READ",
    group: "analytics",
  },
  // Nhóm Quản trị
  {
    key: "users",
    route: "/users",
    icon: Users,
    i18nKey: "nav.users",
    permission: "USER_READ",
    group: "admin",
  },
  {
    key: "roles",
    route: "/roles",
    icon: ShieldCheck,
    i18nKey: "nav.roles",
    permission: "ROLE_READ",
    group: "admin",
  },
  {
    key: "auditLogs",
    route: "/audit-logs",
    icon: ScrollText,
    i18nKey: "nav.auditLogs",
    permission: "AUDIT_LOG_READ",
    group: "admin",
  },
  {
    key: "system",
    route: "/system",
    icon: Settings2,
    i18nKey: "nav.system",
    permission: "SYSTEM_CONFIG_READ",
    group: "admin",
  },
  {
    key: "maintenance",
    route: "/maintenance",
    icon: Wrench,
    i18nKey: "nav.maintenance",
    anyPermissions: ["MAINTENANCE_READ", "MAINTENANCE_MANAGE"],
    group: "admin",
  },
  {
    key: "scheduledTasks",
    route: "/scheduled-tasks",
    icon: CalendarClock,
    i18nKey: "nav.scheduledTasks",
    permission: "CRON_JOB_READ",
    group: "admin",
  },
  {
    key: "integrations",
    route: "/integrations",
    icon: Webhook,
    i18nKey: "nav.integrations",
    anyPermissions: ["API_KEY_READ", "WEBHOOK_READ"],
    hidden: true,
    group: "admin",
  },
  // Nhóm Cá nhân
  {
    key: "notifications",
    route: "/notifications",
    icon: Bell,
    i18nKey: "nav.notifications",
    permission: "NOTIFICATION_READ",
    group: "personal",
  },
  {
    key: "settings",
    route: "/settings/profile",
    activePrefix: "/settings",
    icon: KeyRound,
    i18nKey: "nav.settings",
    group: "personal",
  },
];

export interface VisibleNavOptions {
  /** Khi bật bảo trì toàn diện (MAINTENANCE), chỉ giữ lại trang /maintenance */
  maintenanceLocked?: boolean;
  role?: string;
}

export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isMaintenanceBypassed(
  user?: { role?: string | null; permissions?: readonly string[] } | null,
): boolean {
  if (!user) return false;
  return Boolean(
    isAdminRole(user.role) ||
      user.permissions?.includes("MAINTENANCE_MANAGE") ||
      user.permissions?.includes("MAINTENANCE_BYPASS"),
  );
}

/** Chỉ trả về true khi hệ thống đang bật bảo trì toàn diện (không áp dụng cho READ_ONLY) */
export function isFullMaintenanceMode(
  status?: { enabled?: boolean; status?: string } | null,
): boolean {
  return Boolean(status?.enabled) && status?.status === "MAINTENANCE";
}

/** Kiểm tra một mục sidebar có đang active theo pathname hiện tại hay không */
export function isNavItemActive(
  pathname: string | null | undefined,
  item: Pick<NavItem, "route" | "activePrefix" | "extraActiveRoutes">,
  allItems: readonly Pick<NavItem, "route" | "activePrefix" | "extraActiveRoutes">[],
): boolean {
  if (!pathname) return false;
  const candidatePrefixes = [
    item.activePrefix ?? item.route,
    ...(item.extraActiveRoutes ?? []),
  ];
  const matchedPrefix = candidatePrefixes.find(
    (prefix) =>
      pathname === prefix ||
      pathname === item.route ||
      pathname.startsWith(`${prefix}/`),
  );
  if (!matchedPrefix) return false;
  if (pathname === matchedPrefix || pathname === item.route) return true;
  return !allItems.some((other) => {
    const otherPrefixes = [
      other.activePrefix ?? other.route,
      ...(other.extraActiveRoutes ?? []),
    ];
    return otherPrefixes.some(
      (otherPrefix) =>
        otherPrefix !== matchedPrefix &&
        otherPrefix.length > matchedPrefix.length &&
        (pathname === otherPrefix || pathname.startsWith(`${otherPrefix}/`)),
    );
  });
}

/** Lọc menu theo permissions của user hiện tại */
export function getVisibleNavItems(
  permissions: string[],
  options?: VisibleNavOptions,
): NavItem[] {
  if (options?.maintenanceLocked) {
    const maintenanceItem = NAV_ITEMS.find(
      (item) => item.route === "/maintenance",
    );
    if (!maintenanceItem) return [];
    const canManage =
      isAdminRole(options.role) ||
      permissions.includes("MAINTENANCE_MANAGE");
    return canManage ? [maintenanceItem] : [];
  }

  return NAV_ITEMS.filter((item) => {
    if (item.hidden) return false;
    if (isAdminRole(options?.role)) return true;
    if (item.anyPermissions && item.anyPermissions.length > 0) {
      return item.anyPermissions.some((p) => permissions.includes(p));
    }
    return !item.permission || permissions.includes(item.permission);
  });
}

/** Guard 403: route → quyền bắt buộc. Route không nằm trong map = mở cho mọi user đã đăng nhập. */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  "/incidents": "PPE_INCIDENT_READ",
  "/evidences": "PPE_INCIDENT_READ",
  "/cameras": "PPE_CAMERA_READ",
  "/sites": "PPE_SITE_READ",
  "/reports": "PPE_REPORTING_READ",
  "/ai-metrics": "PPE_AI_METRICS_READ",
  "/notifications": "NOTIFICATION_READ",
  "/users": "USER_READ",
  "/roles": "ROLE_READ",
  "/audit-logs": "AUDIT_LOG_READ",
  "/system": "SYSTEM_CONFIG_READ",
  "/scheduled-tasks": "CRON_JOB_READ",
};

/** Guard 403 cho các route chỉ cần ít nhất 1 quyền trong danh sách */
export const ROUTE_ANY_PERMISSIONS: Record<string, readonly string[]> = {
  "/integrations": ["API_KEY_READ", "WEBHOOK_READ"],
  "/maintenance": ["MAINTENANCE_READ", "MAINTENANCE_MANAGE"],
};

/** Tìm quyền bắt buộc của route hiện tại — khớp route cha dài nhất (hỗ trợ /incidents/:id) */
export function resolveRoutePermission(pathname: string): string | undefined {
  const candidates = Object.keys(ROUTE_PERMISSIONS).filter(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  candidates.sort((a, b) => b.length - a.length);
  const matched = candidates[0];
  return matched ? ROUTE_PERMISSIONS[matched] : undefined;
}

export function canAccessAiSandbox(
  permissions: readonly string[] = [],
  role?: string,
): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" ||
    (permissions.includes("PPE_AI_METRICS_READ") &&
      permissions.includes("PPE_MODEL_MANAGE"));
}

/** Kiểm tra quyền truy cập route (hỗ trợ cả single permission và anyPermissions) */
export function hasRouteAccess(
  pathname: string,
  permissions: readonly string[] = [],
  role?: string,
): boolean {
  if (pathname === "/ai-metrics/test" || pathname.startsWith("/ai-metrics/test/")) {
    return canAccessAiSandbox(permissions, role);
  }
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;

  const anyCandidates = Object.keys(ROUTE_ANY_PERMISSIONS).filter(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  anyCandidates.sort((a, b) => b.length - a.length);
  if (anyCandidates[0]) {
    const allowed = ROUTE_ANY_PERMISSIONS[anyCandidates[0]];
    return allowed.some((p) => permissions.includes(p));
  }

  const required = resolveRoutePermission(pathname);
  return required === undefined || permissions.includes(required);
}

/** Map role → i18n key hiển thị badge */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "roles.ADMIN",
  SAFETY_MANAGER: "roles.SAFETY_MANAGER",
  SAFETY_OFFICER: "roles.SAFETY_OFFICER",
  MANAGER: "roles.MANAGER",
  USER: "roles.USER",
};
