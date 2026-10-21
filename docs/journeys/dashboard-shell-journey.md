# Hành trình xây dựng Khung Dashboard chung (AppShell) — fe-ppe

> **Ngày lập:** 2026-10-21
> **Phạm vi:** M1 trong `dashboard-journey.md` — background, sidebar, navbar, navigation registry, gating theo phân quyền, guard 403. **Chưa gọi API domain** (services/hooks ở M3), widget chuông/site-selector là placeholder UI.
> **Đọc kèm:** `docs/journeys/dashboard-journey.md` (kế hoạch tổng thể + ma trận phân quyền)
> **Tài khoản test (seed identity-service):** `admin@ppe.local / Admin@123456`, `manager@ppe.local / Manager@123456`, `officer@ppe.local / Officer@123456`, `user@ppe.local / User@123456`

---

## Mục lục

0. [Mục tiêu & phạm vi](#0-mục-tiêu--phạm-vi)
1. [Cấu trúc thư mục đích](#1-cấu-trúc-thư-mục-đích)
2. [Chuẩn bị & quy ước](#2-chuẩn-bị--quy-ước)
3. [Bước 1 — Thêm i18n keys cho shell](#bước-1--thêm-i18n-keys-cho-shell)
4. [Bước 2 — Navigation registry & gating](#bước-2--navigation-registry--gating)
5. [Bước 3 — SiteContext (global filter site)](#bước-3--sitecontext-global-filter-site)
6. [Bước 4 — AppShell + AppSidebar + AppHeader + sửa layout](#bước-4--appshell--appsidebar--appheader--sửa-layout)
7. [Bước 5 — UserMenu (avatar dropdown)](#bước-5--usermenu-avatar-dropdown)
8. [Bước 6 — NotificationBell (placeholder)](#bước-6--notificationbell-placeholder)
9. [Bước 7 — SiteSelector (placeholder)](#bước-7--siteselector-placeholder)
10. [Bước 8 — Polish: collapse, responsive, hover](#bước-8--polish-collapse-responsive-hover)
11. [Bước 9 — Kiểm thử E2E theo role](#bước-9--kiểm-thử-e2e-theo-role)
12. [Checklist hoàn thiện M1](#checklist-hoàn-thiện-m1)

---

## 0. Mục tiêu & phạm vi

**Mục tiêu:** xây khung giao diện chung cho mọi trang sau đăng nhập — 1 codebase, 1 layout, hiển thị khác nhau theo `user.permissions` ở 3 tầng:

1. **Sidebar**: menu lọc theo quyền (tầng chính).
2. **Guard 403**: vào route trực tiếp không đủ quyền → màn hình "Không có quyền" (tầng phòng thủ).
3. **Widget trong trang** (giai đoạn sau): nút thao tác lọc theo quyền.

**Phạm vi M1:** background + sidebar + navbar + gating + 403. Không gọi API domain; chuông thông báo và site selector là UI placeholder (có ghi chú TODO M3).

**Không làm trong M1:** nội dung dashboard (KPI/chart), services/hooks, prefetch role-based, trang stub cho các route.

---

## 1. Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/
│   └── layout.tsx                              ← SỬA: bọc AppShell
├── src/
│   ├── config/
│   │   └── navigation.ts                       ← MỚI: menu registry + gating + guard map
│   ├── contexts/
│   │   └── SiteContext.tsx                     ← MỚI: siteId global filter (client state)
│   ├── components/features/app-shell/          ← MỚI (folder)
│   │   ├── app-shell.tsx                       ←   khung: sidebar + header + main
│   │   ├── app-sidebar.tsx                     ←   menu 4 nhóm, collapse, active
│   │   ├── app-header.tsx                      ←   thanh trên (ghép các widget)
│   │   ├── user-menu.tsx                       ←   avatar + role badge + dropdown
│   │   ├── notification-bell.tsx               ←   chuông + dropdown (placeholder)
│   │   ├── site-selector.tsx                   ←   chọn site (placeholder)
│   │   └── forbidden-view.tsx                  ←   màn hình 403
│   └── i18n/
│       ├── vi-VN.json                          ← SỬA: thêm nav.*, header.*, roles.*...
│       └── en-US.json                          ← SỬA: tương tự
```

---

## 2. Chuẩn bị & quy ước

### 2.1 API có sẵn (dùng trong các bước)

| Nguồn | API | Ghi chú |
|---|---|---|
| `useAuth()` — `src/contexts/AuthContext.tsx` | `{ user: MeDto \| null, status, setUser, logout }` | `user.permissions: string[]`, `user.role: string`, `user.fullName`, `user.email`, `user.avatarUrl` |
| `useRealtime()` — `src/contexts/RealtimeContext.tsx` | `{ isConnected: boolean, lastAlert }` | SSE có thể đang lỗi 500 (BE) → `isConnected = false`, UI phải graceful |
| `useLocale()` — `src/providers/locale-provider.tsx` | `{ t(key), locale: "vi-VN" \| "en-US", setLocale }` | mọi chuỗi UI qua `t()` |
| `@ui/button` | `variant: primary \| danger \| outline \| hybrid \| sculpted \| aurora \| metal` | — |
| `@ui/theme-toggle` | `<ThemeToggle />` | có sẵn |
| `@ui/neumorphic-surface` | `level: flat \| raised \| raised-strong \| inset \| inset-strong`, `radius`, `clickable` | tuỳ chọn dùng thay shadow thủ công |

### 2.2 Design tokens (src/styles/tokens.css)

- Nền: `bg-background`; surface: `bg-card`
- Chữ: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-accent-foreground`
- Bóng neumorphic: `shadow-nm`, `shadow-nm-sm`, `shadow-nm-pressed`, `shadow-[var(--nm-inset)]`
- Viền ngăn cách: `border-(--shadow-dark)`

### 2.3 Quy ước code

- Không có `clsx`/`tailwind-merge` → nối class bằng template literal.
- Icon dùng `lucide-react` (đã có sẵn trong dependencies).
- Mọi component trong bước này đặt `"use client"` ở đầu file.
- Dropdown đóng khi click ra ngoài: pattern chung (lặp lại ở từng widget, không trừu tượng hóa sớm):

```tsx
useEffect(() => {
  if (!open) return;
  const onDocClick = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener("mousedown", onDocClick);
  return () => document.removeEventListener("mousedown", onDocClick);
}, [open]);
```

### 2.4 Chạy môi trường

```bash
# Docker Desktop mở sẵn (13 container BE)
cd fe-ppe && npm run dev   # app :3000 + design system :3001
```

---

## Bước 1 — Thêm i18n keys cho shell

**Mục tiêu:** mọi chuỗi hiển thị của shell có key trong cả 2 file ngôn ngữ — từ bước sau trở đi code không chứa chuỗi cứng.

**Files:** sửa `src/i18n/vi-VN.json`, `src/i18n/en-US.json`.

**Thực hiện:** thêm block sau vào cuối mỗi file (trước dấu `}` đóng cuối, nhớ dấu phẩy sau key cuối của file hiện tại):

`vi-VN.json`:

```json
  "nav.group.monitoring": "Giám sát",
  "nav.group.analytics": "Phân tích",
  "nav.group.admin": "Quản trị",
  "nav.group.personal": "Cá nhân",
  "nav.dashboard": "Tổng quan",
  "nav.incidents": "Sự cố",
  "nav.cameras": "Cameras",
  "nav.sites": "Sites & Zones",
  "nav.reports": "Báo cáo & Thống kê",
  "nav.aiMetrics": "Hiệu năng AI",
  "nav.notifications": "Thông báo",
  "nav.users": "Người dùng",
  "nav.roles": "Phân quyền",
  "nav.auditLogs": "Nhật ký hệ thống",
  "nav.system": "Hệ thống",
  "nav.settings": "Cài đặt tài khoản",
  "header.realtime.on": "Kết nối thời gian thực",
  "header.realtime.off": "Mất kết nối thời gian thực",
  "header.notifications.title": "Thông báo",
  "header.notifications.empty": "Chưa có thông báo",
  "header.notifications.viewAll": "Xem tất cả",
  "userMenu.security": "Cài đặt bảo mật",
  "userMenu.changePassword": "Đổi mật khẩu",
  "siteSelector.all": "Tất cả sites",
  "siteSelector.selected": "Site đã chọn",
  "siteSelector.placeholder": "Danh sách site sẽ hiển thị ở đây (M3 — gọi GET /sites)",
  "roles.ADMIN": "Quản trị viên",
  "roles.SAFETY_MANAGER": "Quản lý an toàn",
  "roles.SAFETY_OFFICER": "Cán bộ an toàn",
  "roles.MANAGER": "Quản lý hệ thống",
  "roles.USER": "Thành viên",
  "guard.forbiddenTitle": "Không có quyền truy cập",
  "guard.forbiddenBody": "Tài khoản của bạn không có quyền xem trang này. Liên hệ quản trị viên nếu cần.",
  "guard.backToDashboard": "Về Tổng quan"
```

`en-US.json` (cùng key, bản dịch):

```json
  "nav.group.monitoring": "Monitoring",
  "nav.group.analytics": "Analytics",
  "nav.group.admin": "Administration",
  "nav.group.personal": "Personal",
  "nav.dashboard": "Overview",
  "nav.incidents": "Incidents",
  "nav.cameras": "Cameras",
  "nav.sites": "Sites & Zones",
  "nav.reports": "Reports & Statistics",
  "nav.aiMetrics": "AI Performance",
  "nav.notifications": "Notifications",
  "nav.users": "Users",
  "nav.roles": "Roles",
  "nav.auditLogs": "Audit Logs",
  "nav.system": "System",
  "nav.settings": "Account Settings",
  "header.realtime.on": "Realtime connected",
  "header.realtime.off": "Realtime disconnected",
  "header.notifications.title": "Notifications",
  "header.notifications.empty": "No notifications yet",
  "header.notifications.viewAll": "View all",
  "userMenu.security": "Security settings",
  "userMenu.changePassword": "Change password",
  "siteSelector.all": "All sites",
  "siteSelector.selected": "Selected site",
  "siteSelector.placeholder": "Site list will appear here (M3 — GET /sites)",
  "roles.ADMIN": "Administrator",
  "roles.SAFETY_MANAGER": "Safety Manager",
  "roles.SAFETY_OFFICER": "Safety Officer",
  "roles.MANAGER": "System Manager",
  "roles.USER": "Member",
  "guard.forbiddenTitle": "Access denied",
  "guard.forbiddenBody": "Your account does not have permission to view this page. Contact an administrator if needed.",
  "guard.backToDashboard": "Back to Overview"
```

**Kiểm tra:**

- [ ] JSON hợp lệ (npm run dev không báo lỗi parse).
- [ ] `t("nav.incidents")` trả đúng chuỗi theo locale (test tạm ở dashboard-content.tsx rồi bỏ).

---

## Bước 2 — Navigation registry & gating

**Mục tiêu:** toàn bộ menu + guard route khai báo tập trung 1 file — sidebar/guard chỉ đọc, không chứa điều kiện quyền.

**Files:** tạo `src/config/navigation.ts`.

**Thực hiện:**

```ts
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, ShieldAlert, Cctv, Building2, BarChart3,
  Cpu, Bell, Users, ShieldCheck, ScrollText, Settings2, KeyRound,
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
  { key: "dashboard", route: "/dashboard", icon: LayoutDashboard, i18nKey: "nav.dashboard", group: "monitoring" },
  { key: "incidents", route: "/incidents", icon: ShieldAlert, i18nKey: "nav.incidents", permission: "PPE_INCIDENT_READ", group: "monitoring" },
  { key: "cameras", route: "/cameras", icon: Cctv, i18nKey: "nav.cameras", permission: "PPE_CAMERA_READ", group: "monitoring" },
  { key: "sites", route: "/sites", icon: Building2, i18nKey: "nav.sites", permission: "PPE_SITE_READ", group: "monitoring" },
  // Nhóm Phân tích
  { key: "reports", route: "/reports", icon: BarChart3, i18nKey: "nav.reports", permission: "PPE_REPORTING_READ", group: "analytics" },
  { key: "aiMetrics", route: "/ai-metrics", icon: Cpu, i18nKey: "nav.aiMetrics", permission: "PPE_AI_METRICS_READ", group: "analytics" },
  // Nhóm Quản trị
  { key: "users", route: "/users", icon: Users, i18nKey: "nav.users", permission: "USER_READ", group: "admin" },
  { key: "roles", route: "/roles", icon: ShieldCheck, i18nKey: "nav.roles", permission: "ROLE_READ", group: "admin" },
  { key: "auditLogs", route: "/audit-logs", icon: ScrollText, i18nKey: "nav.auditLogs", permission: "AUDIT_LOG_READ", group: "admin" },
  { key: "system", route: "/system", icon: Settings2, i18nKey: "nav.system", permission: "SYSTEM_CONFIG_READ", group: "admin" },
  // Nhóm Cá nhân
  { key: "notifications", route: "/notifications", icon: Bell, i18nKey: "nav.notifications", permission: "NOTIFICATION_READ", group: "personal" },
  { key: "settings", route: "/settings/security", icon: KeyRound, i18nKey: "nav.settings", group: "personal" },
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
```

**Kiểm tra:**

- [ ] TypeScript không báo lỗi (mọi icon import tồn tại).
- [ ] Test nhanh filter bằng console (node/tsx hoặc tạm trong dashboard-content):
  - `getVisibleNavItems(["NOTIFICATION_READ"])` → 3 item (dashboard, notifications, settings)
  - `getVisibleNavItems(["PPE_INCIDENT_READ", "PPE_CAMERA_READ", "PPE_SITE_READ", "NOTIFICATION_READ"])` → 6 item (dashboard, incidents, cameras, sites, notifications, settings), không có nhóm analytics/admin
  - `getVisibleNavItems([...đủ quyền ADMIN])` → 12 item
- [ ] `resolveRoutePermission("/incidents/abc")` → `"PPE_INCIDENT_READ"`; `resolveRoutePermission("/dashboard")` → `undefined`.

---

## Bước 3 — SiteContext (global filter site)

**Mục tiêu:** trạng thái "site đang chọn" dùng chung cho toàn app (sau này mọi query thống kê/incident nhận `siteId` từ đây). Client state = Context (đúng quy ước dự án, không zustand).

**Files:** tạo `src/contexts/SiteContext.tsx`.

**Thực hiện:**

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "ppe_site";

interface SiteContextValue {
  siteId: string | null;
  setSiteId: (id: string | null) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [siteId, setSiteIdState] = useState<string | null>(null);

  // Hydrate từ localStorage sau mount — tránh mismatch SSR
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSiteIdState(stored);
  }, []);

  const setSiteId = (id: string | null) => {
    setSiteIdState(id);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SiteContext.Provider value={{ siteId, setSiteId }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}
```

**Kiểm tra:**

- [ ] File compile không lỗi (chưa render — sẽ mount ở Bước 4).

---

## Bước 4 — AppShell + AppSidebar + AppHeader + sửa layout

**Mục tiêu:** sau bước này, mọi trang nhóm `(auth)` hiển thị khung: sidebar trái + header trên + main giữa, và guard 403 hoạt động.

**Files:**
- Tạo `src/components/features/app-shell/app-shell.tsx`
- Tạo `src/components/features/app-shell/app-sidebar.tsx`
- Tạo `src/components/features/app-shell/app-header.tsx`
- Tạo `src/components/features/app-shell/forbidden-view.tsx`
- Sửa `app/(auth)/layout.tsx`

### 4.1 `app-sidebar.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, HardHat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { NAV_GROUPS, getVisibleNavItems } from "@/config/navigation";
import { Button } from "@ui/button";

const COLLAPSED_KEY = "ppe_sidebar_collapsed";

export function AppSidebar() {
  const { user } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSED_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const items = getVisibleNavItems(user?.permissions ?? []);
  const groups = NAV_GROUPS.filter((g) =>
    items.some((item) => item.group === g.key),
  );

  const isActive = (route: string) =>
    pathname === route || pathname.startsWith(`${route}/`);

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-(--shadow-dark) bg-background transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-nm-sm">
          <HardHat className="h-5 w-5 text-primary" />
        </span>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-foreground">
            {t("app.name")}
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.key}>
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t(group.i18nKey)}
              </p>
            )}
            <ul className="space-y-1">
              {items
                .filter((item) => item.group === group.key)
                .map((item) => {
                  const active = isActive(item.route);
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.route}
                        title={collapsed ? t(item.i18nKey) : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-shadow ${
                          active
                            ? "bg-card text-primary shadow-nm-pressed"
                            : "text-foreground hover:shadow-nm-sm"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <span className="truncate">{t(item.i18nKey)}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Nút collapse */}
      <div className="border-t border-(--shadow-dark) p-3">
        <Button
          variant="outline"
          onClick={toggle}
          className="w-full justify-center"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
```

### 4.2 `forbidden-view.tsx`

```tsx
"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { Button } from "@ui/button";

export function ForbiddenView() {
  const { t } = useLocale();

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-nm">
        <ShieldX className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          {t("guard.forbiddenTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("guard.forbiddenBody")}
        </p>
        <Link href="/dashboard">
          <Button className="mt-6">{t("guard.backToDashboard")}</Button>
        </Link>
      </div>
    </div>
  );
}
```

### 4.3 `app-header.tsx` (phiên bản tối giản — mở rộng ở Bước 5–7)

```tsx
"use client";

import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { ThemeToggle } from "@ui/theme-toggle";

export function AppHeader() {
  const { isConnected } = useRealtime();
  const { t, locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-(--shadow-dark) bg-background px-4 md:px-6">
      {/* Bước 7: <SiteSelector /> */}
      <div className="flex-1" />

      {/* Trạng thái realtime */}
      <span
        title={t(isConnected ? "header.realtime.on" : "header.realtime.off")}
        className={`h-2.5 w-2.5 rounded-full ${
          isConnected ? "bg-emerald-500" : "bg-red-500"
        }`}
      />

      {/* Bước 6: <NotificationBell /> */}

      <ThemeToggle />

      <button
        type="button"
        onClick={() => setLocale(locale === "vi-VN" ? "en-US" : "vi-VN")}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:shadow-nm-sm"
      >
        {locale === "vi-VN" ? "EN" : "VI"}
      </button>

      {/* Bước 5: <UserMenu /> */}
    </header>
  );
}
```

### 4.4 `app-shell.tsx`

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { resolveRoutePermission } from "@/config/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ForbiddenView } from "./forbidden-view";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const required = resolveRoutePermission(pathname);
  const forbidden = Boolean(required) && !user?.permissions.includes(required);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {forbidden ? <ForbiddenView /> : children}
        </main>
      </div>
    </div>
  );
}
```

### 4.5 Sửa `app/(auth)/layout.tsx`

- Thêm import: `SiteProvider`, `AppShell`.
- Sửa **duy nhất** return cuối cùng (giữ nguyên 3 nhánh guard phía trên: `!user`, `!user.isActive`, `mustChange`):

```tsx
  return (
    <RealtimeProvider>
      <SiteProvider>
        <PrefetchProvider>
          <AppShell>{children}</AppShell>
        </PrefetchProvider>
      </SiteProvider>
    </RealtimeProvider>
  );
```

**Kiểm tra (chạy `npm run dev`, mở :3000):**

- [ ] Login `admin@ppe.local` → mọi trang (kể cả `/change-password`, `/settings/security`) có sidebar + header.
- [ ] Sidebar hiện đủ 4 nhóm, 12 item (ADMIN).
- [ ] Click item → chuyển trang, item active đổi style "pressed". Các route chưa tồn tại (VD `/incidents`) sẽ 404 nhưng shell vẫn bao quanh — chấp nhận (stub ở M2).
- [ ] Login `user@ppe.local` → sidebar chỉ còn Tổng quan, Thông báo, Cài đặt; gõ `/users` trực tiếp → màn hình 403 với nút "Về Tổng quan".
- [ ] Login `officer@ppe.local` → không thấy nhóm Quản trị/Phân tích; vào `/reports` → 403.
- [ ] Đổi theme dark/light, chuyển EN/VI → shell đổi theo, không sót chuỗi cứng.

---

## Bước 5 — UserMenu (avatar dropdown)

**Mục tiêu:** avatar + tên + role badge + dropdown (Cài đặt bảo mật, Đổi mật khẩu, Đăng xuất).

**Files:** tạo `src/components/features/app-shell/user-menu.tsx`; sửa `app-header.tsx` (thêm `<UserMenu />`).

**Thực hiện:**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { ROLE_LABELS } from "@/config/navigation";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Pattern đóng khi click ngoài — xem mục 2.3

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!user) return null;

  const initials = (user.fullName || user.email).slice(0, 2).toUpperCase();
  const roleLabelKey = ROLE_LABELS[user.role] ?? "roles.USER";

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:shadow-nm-sm";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 hover:shadow-nm-sm"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.fullName ?? ""}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
        )}
        <span className="hidden text-sm text-foreground md:inline">
          {user.fullName || user.email}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl bg-card p-2 shadow-nm">
          <div className="border-b border-(--shadow-dark) px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {user.fullName || user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              {t(roleLabelKey)}
            </span>
          </div>
          <div className="p-1">
            <Link href="/settings/security" onClick={() => setOpen(false)} className={itemClass}>
              <ShieldCheck className="h-4 w-4" />
              {t("userMenu.security")}
            </Link>
            <Link href="/change-password" onClick={() => setOpen(false)} className={itemClass}>
              <KeyRound className="h-4 w-4" />
              {t("userMenu.changePassword")}
            </Link>
            <button type="button" onClick={() => void logout()} className={itemClass}>
              <LogOut className="h-4 w-4" />
              {t("common.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Sửa `app-header.tsx`: thay comment `{/* Bước 5: <UserMenu /> */}` bằng `<UserMenu />` + import.

**Kiểm tra:**

- [ ] Avatar hiển thị ảnh (nếu có) hoặc chữ cái đầu; role badge đúng label tiếng Việt theo tài khoản.
- [ ] Dropdown mở/đóng; click ra ngoài đóng; click "Đăng xuất" → về `/login`.
- [ ] 2 link điều hướng đúng trang.

---

## Bước 6 — NotificationBell (placeholder)

**Mục tiêu:** nút chuông + dropdown có empty state. **Chưa gọi API** (M3: `GET /notifications/unread-count` + SSE).

**Files:** tạo `src/components/features/app-shell/notification-bell.tsx`; sửa `app-header.tsx`.

**Thực hiện:**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

/**
 * M1: UI placeholder — chưa gọi API notification (M3).
 * Badge unread: tạm ẩn cho tới khi có useUnreadCount (M3).
 */
export function NotificationBell() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Pattern đóng khi click ngoài — xem mục 2.3
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("header.notifications.title")}
        className="relative rounded-full p-2 text-foreground hover:shadow-nm-sm"
      >
        <Bell className="h-5 w-5" />
        {/* TODO M3: badge số chưa đọc — dùng useUnreadCount + SSE */}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl bg-card p-2 shadow-nm">
          <p className="px-3 py-2 text-sm font-semibold text-foreground">
            {t("header.notifications.title")}
          </p>
          {/* TODO M3: danh sách 10 thông báo gần nhất + nút đọc tất cả */}
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("header.notifications.empty")}
          </p>
          <div className="border-t border-(--shadow-dark) p-1">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-center text-sm text-primary hover:shadow-nm-sm"
            >
              {t("header.notifications.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

Sửa `app-header.tsx`: thay comment `{/* Bước 6: <NotificationBell /> */}` bằng `<NotificationBell />` + import.

**Kiểm tra:**

- [ ] Click chuông → dropdown hiện tiêu đề + "Chưa có thông báo" + link "Xem tất cả" → `/notifications` (404 ở M1 là chấp nhận — stub ở M2).
- [ ] Click ra ngoài đóng dropdown.

---

## Bước 7 — SiteSelector (placeholder)

**Mục tiêu:** dropdown chọn site ở đầu header — **ẩn hoàn toàn nếu user không có `PPE_SITE_READ`**. Chưa gọi API (M3: `GET /sites`).

**Files:** tạo `src/components/features/app-shell/site-selector.tsx`; sửa `app-header.tsx`.

**Thực hiện:**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useLocale } from "@/providers/locale-provider";

/**
 * M1: UI placeholder — chưa gọi GET /sites (M3).
 * Giá trị chọn nằm ở SiteContext — các trang sau dùng làm global filter.
 */
export function SiteSelector() {
  const { user } = useAuth();
  const { siteId } = useSite();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Pattern đóng khi click ngoài — xem mục 2.3
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Gating: ẩn hoàn toàn nếu không có quyền xem site
  if (!user?.permissions.includes("PPE_SITE_READ")) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground hover:shadow-nm-sm"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">
          {siteId ? t("siteSelector.selected") : t("siteSelector.all")}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl bg-card p-2 shadow-nm">
          {/* TODO M3: options từ useSites() + setSiteId */}
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t("siteSelector.placeholder")}
          </p>
        </div>
      )}
    </div>
  );
}
```

Sửa `app-header.tsx`: thay comment `{/* Bước 7: <SiteSelector /> */}` bằng `<SiteSelector />` + import.

**Kiểm tra:**

- [ ] `admin@ppe.local` / `manager@ppe.local` / `officer@ppe.local` → thấy "Tất cả sites" ở header.
- [ ] `user@ppe.local` → **không thấy** site selector.
- [ ] Dropdown mở hiện placeholder; đóng khi click ngoài.

---

## Bước 8 — Polish: collapse, responsive, hover

**Mục tiêu:** hoàn thiện trải nghiệm shell trước khi chuyển sang M2.

**Thực hiện:**

1. **Sidebar collapse** (đã có từ Bước 4) — kiểm tra: nhấn nút → thu về 64px chỉ còn icon (tooltip = `title`), refresh giữ trạng thái (localStorage).
2. **Responsive header**: các label ẩn dần theo breakpoint (`hidden sm:inline`, `hidden md:inline` — đã đặt sẵn). Kiểm tra ở cỡ mobile: header chỉ còn icon, không vỡ layout.
3. **Responsive sidebar (tuỳ chọn, gọn nhất)**: dưới `md`, sidebar ẩn hẳn + thêm nút hamburger trên header mở overlay. Nếu muốn tối giản ở M1, chấp nhận sidebar luôn hiển thị — ghi chú lại để xử lý ở M4 (polish nội dung).
4. **Hover states**: mọi phần tử click được có `hover:shadow-nm-sm` + `transition-shadow` — rà lại toàn bộ 6 component.
5. **Focus & a11y**: nút icon có `aria-label`/`title`; menu active có `aria-current="page"`.
6. **Chi tiết visual**:
   - `main` dùng `p-6`; trang con tự quyết định padding riêng nếu cần.
   - Dropdown z-index: `z-50` (trên nội dung, dưới toast).
   - Sidebar cuộn riêng (`overflow-y-auto` trên `nav`) khi menu dài (màn hình thấp).

**Kiểm tra:**

- [ ] Không có console error/warning (React key, hydration).
- [ ] Chạy `npm run build` (hoặc `npx tsc --noEmit`) không lỗi type.
- [ ] Thử 3 kích thước màn hình (mobile/tablet/desktop) không vỡ layout.

---

## Bước 9 — Kiểm thử E2E theo role

**Mục tiêu:** xác nhận gating 3 tầng đúng với ma trận phân quyền (dashboard-journey.md mục 3.1).

**Chuẩn bị:** 4 tài khoản seed — `admin@ppe.local / Admin@123456`, `manager@ppe.local / Manager@123456`, `officer@ppe.local / Officer@123456`, `user@ppe.local / User@123456`.

| # | Test | Kỳ vọng |
|---|---|---|
| 1 | Login ADMIN → xem sidebar | 4 nhóm, 12 item |
| 2 | ADMIN gõ `/users`, `/roles`, `/audit-logs`, `/system` | Không 403 |
| 3 | Login SAFETY_MANAGER | Không thấy nhóm Quản trị; thấy đủ Giám sát + Phân tích |
| 4 | MANAGER gõ `/users` | 403 (nhóm Quản trị ẩn) |
| 5 | Login SAFETY_OFFICER | Giám sát + Cá nhân; **không** thấy Báo cáo, AI metrics |
| 6 | OFFICER gõ `/reports` | 403 + nút "Về Tổng quan" hoạt động |
| 7 | Login USER (mới đăng ký) | Sidebar: Tổng quan, Thông báo, Cài đặt; **không** có site selector trên header |
| 8 | USER gõ `/incidents` | 403 |
| 9 | Mọi role: đổi theme + EN/VI | Shell đổi đúng, không chuỗi cứng |
| 10 | Mọi role: chuông thông báo | Mở dropdown empty state, đóng khi click ngoài |
| 11 | Mọi role: avatar menu | 3 mục; logout về `/login` |
| 12 | Sidebar collapse + refresh | Giữ trạng thái; icon-only có tooltip |
| 13 | Realtime dot | `isConnected=false` (SSE BE đang lỗi) → dot đỏ, tooltip "Mất kết nối" — app không crash, không spam toast |

---

## Checklist hoàn thiện M1

- [ ] `navigation.ts` là nguồn duy nhất của menu + guard map (không điều kiện quyền rải rác trong component).
- [ ] Sidebar: 4 nhóm, active = pressed, collapse + localStorage, nhóm rỗng tự ẩn.
- [ ] Header: site selector (gated), realtime dot, chuông, theme, locale, avatar menu.
- [ ] Guard 403 hoạt động với route con (`/incidents/:id`).
- [ ] Layout `(auth)` giữ nguyên 3 nhánh guard cũ (unauth/mustChange/inactive) — không hồi quy auth.
- [ ] i18n vi/en đầy đủ; không chuỗi cứng trong component shell.
- [ ] `tsc --noEmit` sạch; không console error.
- [ ] Đủ 13 test E2E ở Bước 9.

**Sau M1 → chuyển M2** (stub pages cho 12 route — dashboard-journey.md Bước 3): lúc đó mọi item sidebar bấm được mà không 404.
