import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShieldAlert,
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
} from "lucide-react";

export type NavGroupKey = "monitoring" | "analytics" | "admin" | "personal";

export interface NavItem {
  key: string;
  route: string;
  icon: LucideIcon;
  i18nKey: string;
  /** Quyền bắt buộc — user.permissions phải chứa giá trị này mới hiển thị */
  permission?: string;
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
    icon: ShieldAlert,
    i18nKey: "nav.incidents",
    permission: "PPE_INCIDENT_READ",
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
    icon: KeyRound,
    i18nKey: "nav.settings",
    group: "personal",
  },
];

/** Lọc menu theo permissions của user hiện tại */
export function getVisibleNavItems(permissions: string[]): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );
}

/** Guard 403: route → quyền bắt buộc. Route không nằm trong map = mở cho mọi user đã đăng nhập. */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  "/incidents": "PPE_INCIDENT_READ",
  "/cameras": "PPE_CAMERA_READ",
  "/sites": "PPE_SITE_READ",
  "/reports": "PPE_REPORTING_READ",
  "/ai-metrics": "PPE_AI_METRICS_READ",
  "/notifications": "NOTIFICATION_READ",
  "/users": "USER_READ",
  "/roles": "ROLE_READ",
  "/audit-logs": "AUDIT_LOG_READ",
  "/system": "SYSTEM_CONFIG_READ",
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

/** Map role → i18n key hiển thị badge */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "roles.ADMIN",
  SAFETY_MANAGER: "roles.SAFETY_MANAGER",
  SAFETY_OFFICER: "roles.SAFETY_OFFICER",
  MANAGER: "roles.MANAGER",
  USER: "roles.USER",
};
