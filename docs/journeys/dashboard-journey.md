# Hành trình xây dựng Dashboard — fe-ppe

> **Ngày lập:** 2026-10-21
> **Phạm vi:** Toàn bộ khung dashboard sau đăng nhập (AppShell: Sidebar + Navbar), hệ thống điều hướng theo phân quyền, placeholder pages và nội dung dashboard (KPI, biểu đồ, realtime)
> **Nguồn contract:** Đã khảo sát toàn bộ 8 backend service + shared-contracts ngày 2026-10-21 (identity, site, camera, ai, incident, reporting, notification, media)
> **Tech stack:** Next.js 16 (App Router) + @tanstack/react-query v5 + axios + Tailwind v4 + design system neumorphic (`@ui/*`)

---

## Mục lục

0. [Kiến trúc tổng thể](#0-kiến-trúc-tổng-thể)
1. [Hiện trạng backend — có gì, thiếu gì](#1-hiện-trạng-backend--có-gì-thiếu-gì)
2. [Hệ thống phân quyền RBAC](#2-hệ-thống-phân-quyền-rbac)
3. [Ma trận phân quyền → menu & khả năng người dùng](#3-ma-trận-phân-quyền--menu--khả-năng-người-dùng)
4. [Thiết kế khung Dashboard](#4-thiết-kế-khung-dashboard)
5. [Cấu trúc route nhóm `(auth)`](#5-cấu-trúc-route-nhóm-auth)
6. [Bước 1 — Navigation registry & gating](#bước-1--navigation-registry--gating)
7. [Bước 2 — AppShell: Sidebar + Navbar](#bước-2--appshell-sidebar--navbar)
8. [Bước 3 — Placeholder pages cho toàn bộ route](#bước-3--placeholder-pages-cho-toàn-bộ-route)
9. [Bước 4 — Tầng services + hooks các domain](#bước-4--tầng-services--hooks-các-domain)
10. [Bước 5 — Nội dung dashboard thật](#bước-5--nội-dung-dashboard-thật)
11. [Bước 6 — Prefetch, i18n & empty states](#bước-6--prefetch-i18n--empty-states)
12. [Bước 7 — Test case E2E](#bước-7--test-case-e2e)
13. [Ma trận xử lý lỗi](#ma-trận-xử-lý-lỗi)
14. [Milestones & thứ tự thực hiện](#milestones--thứ-tự-thực-hiện)
15. [Checklist hoàn thiện](#checklist-hoàn-thiện)

---

## 0. Kiến trúc tổng thể

```
┌─────────────────────────── Browser ───────────────────────────┐
│  Pages (chỉ gọi hook, render theo state)                       │
│        │                                                       │
│  hooks/{domain}  (useQuery đọc / useMutation ghi + invalidate) │
│        │                                                       │
│  services/{domain}.service.ts  (1 hàm = 1 endpoint, unwrap)    │
│        │                                                       │
│  lib/axios.ts  (interceptor: gắn token, refresh single-flight) │
└──────────────┬────────────────────────────────────────────────┘
               │  credentials: "include"  (cookie httpOnly)
┌──────────────▼────────────────────────────────────────────────┐
│  Traefik Gateway (localhost:80, PathPrefix /api/v1)            │
└──────────────┬────────────────────────────────────────────────┘
               │
   ┌───────────┼───────────────┬──────────────┬─────────────────┐
   ▼           ▼               ▼              ▼                 ▼
identity    site-service    camera-service  incident-service  reporting
 :9999       :8887           :8886           :8885             :8888
 (user/role) (sites/zones/   (CRUD camera,   (vòng đời sự cố)  (statistics/
              restricted     streams, health,                  reports)
              areas, safety  ping)              notification    media
              config)                           :8889 (inbox,   (files)
                                                SSE)            AI (Python,
                                                                 Kafka producer)
```

**Nguyên tắc vàng (kế thừa từ auth-journey):**

1. **Pages không gọi service trực tiếp** — chỉ gọi hook; hook không điều hướng.
2. **Domain-first**: mỗi backend service = 1 folder `types/`, `services/`, `hooks/` riêng.
3. **Mọi chuỗi UI qua `t()`** (i18n vi/en), số/ngày qua `Intl` của useLocale.
4. **Gating tập trung**: mọi quyết định hiển thị menu/card dựa trên `user.permissions` + `user.role` từ `AuthContext` — không rải điều kiện trong từng component.
5. **Phân tầng dữ liệu**: client state = Context (AuthContext, RealtimeContext), server state = TanStack Query. Không dùng zustand.

---

## 1. Hiện trạng backend — có gì, thiếu gì

> Khảo sát toàn bộ service ngày 2026-10-21 (đọc schema, controller, route, seed).

### 1.1 Backend ĐÃ có (gọi được ngay)

| Service | Đã hoàn thiện | API chính cho dashboard |
|---|---|---|
| **identity** | Auth đầy đủ (register/verify/2FA/OAuth/session/deactivate), RBAC động (roles/permissions), audit log, user management, maintenance, system config, API keys, webhooks, cron | `GET /auth/me` (profile + role + permissions), `GET /audit-logs/summary` (KPI hoạt động: totalLogs, categoryCounts, topActors, topActions), `GET /users`, `GET /rbac/roles` |
| **site** | CRUD site/zone/restricted-area (đa giác vùng cấm) + safety-config (ngưỡng AI) | `GET /sites`, `GET /safety-rules/effective?siteId&cameraId` |
| **camera** | CRUD camera + streams + config AI + health-logs + ping | `GET /cameras` (filter status/siteId/zoneId, search, sort), `GET /cameras/:id/health-logs`, `POST /cameras/:id/ping` |
| **incident** | CRUD + vòng đời đầy đủ + assignment/comment/evidence (checksum chống giả mạo) | `GET /incidents` (filter theo site/severity/status/violationType/ngày), `GET /incidents/:id` (kèm evidences), `POST /incidents/:id/review` (CONFIRMED/DISMISSED), `/resolve`, `/close`, `GET /evidences/:id/download-url` |
| **notification** | Inbox + unread-count + preferences + dispatch + templates + SSE (stream-ticket chống replay, Redis pub/sub) | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/read-all`, `POST /notifications/stream-ticket` → `GET /notifications/stream` (SSE) |
| **media** | Upload presigned/direct + transform (Sharp) + download | `GET /files`, `GET /files/:id/download-url` |
| **ai** (Python) | Pipeline YOLO detect (mũ bảo hộ, áo phản quang) + **Kafka producer thật** + HTTP fallback + SQLite offline buffer; snapshot lên MinIO bucket `ppe-evidences` (public) | Không phải REST service — đẩy event `ppe.violation.detected` |
| **reporting** | Đầy đủ endpoint thống kê + sinh báo cáo | `GET /statistics/summary|trends|by-violation|by-camera|ai-performance`, `POST /reports/generate` (PDF/EXCEL/CSV/JSON), `GET /reports/history` |

### 1.2 Backend CÒN THIẾU / đứt quy trình

| # | Lỗ hổng | Chi tiết (đã xác minh) | Ảnh hưởng dashboard |
|---|---|---|---|
| 1 | **Pipeline AI → Incident bị đứt** | AI publish Kafka `ppe.violation.detected` nhưng **không service nào có Kafka consumer** (grep toàn repo: 0 `KafkaConsumer`). HTTP fallback của AI (`POST /api/v1/integration/ai-vision/events`) **không tồn tại** — identity integration chỉ có api-keys/webhooks/cron | Vi phạm AI detect xong đi vào hư không; incident chỉ tạo được thủ công qua REST |
| 2 | **Reporting là stub** | `aggregateDailyStats` (reporting.service.ts:124) chỉ upsert bản ghi **toàn số 0**, không đọc dữ liệu incident thật; **không có cron job** — chỉ là endpoint thủ công `POST /statistics/aggregate-daily` | Toàn bộ KPI/trend/pie/camera-ranking trả về 0/rỗng |
| 3 | **SSE notification lỗi 500** | Auth middleware yêu cầu `JWT_PUBLIC_KEY` (auth.middleware.ts:94) nhưng docker-compose chỉ set `AUTH_JWKS_URL` → verify token fail (FE đã ghi nhận lỗi thực tế khi test stream) | Badge chuông + vi phạm realtime không hoạt động |
| 4 | **AI mới detect 2 loại vi phạm** | Chỉ `NO_HELMET` (HIGH), `NO_VEST` (MEDIUM) — `NO_BOOTS/NO_GLOVES/NO_HARNESS/RESTRICTED_AREA` chỉ khai báo hằng số | Pie chart loại vi phạm chỉ có 2 mục |
| 5 | **Camera còn giả lập** | Ping latency giả lập 10–45ms; chưa có producer Kafka thật cho `ppe.camera.status_changed`; chưa có API thống kê; chưa có streaming/live view | Status camera hiển thị được nhưng là mock; không có video trực tiếp |
| 6 | **Chưa có entity Worker** | Không service nào quản lý người lao động được giám sát | Chưa có thống kê tuân thủ theo cá nhân |

### 1.3 Quyết định chiến lược cho FE

- **Giai đoạn 1 (khung)**: dựng AppShell + điều hướng + placeholder pages — không phụ thuộc BE.
- **Giai đoạn 2 (dữ liệu thật)**: dùng ngay data thật cho incidents / cameras / sites / notifications / user (đã có API).
- **Giai đoạn 3 (thống kê)**: KPI/chart từ `/statistics/*` — vì lỗ hổng #1 + #2, tạm dùng **mock data có đánh dấu rõ** (`MOCK: chờ BE hoàn thiện consumer + aggregate`), đổi sang API thật khi BE xong. Nếu team BE ưu tiên sửa, đổi thứ tự giai đoạn 2–3.

---

## 2. Hệ thống phân quyền RBAC

### 2.1 Các role hệ thống (seed.ts — identity-service)

| Role | Mô tả |
|---|---|
| **ADMIN** | Toàn quyền: nhận **tất cả** permission hệ thống |
| **SAFETY_MANAGER** | Quản lý an toàn: full domain PPE (site, camera, cấu hình AI, incident, báo cáo, AI metrics) |
| **SAFETY_OFFICER** | Cán bộ an toàn trực ban: giám sát cảnh báo, duyệt True/False alarm, xử lý sự cố (chỉ đọc + review) |
| **MANAGER** | Quản lý người dùng & hệ thống (không có quyền PPE domain) |
| **USER** | Người dùng thường: **chỉ 4 quyền** — `NOTIFICATION_READ`, `FILE_READ`, `FILE_UPLOAD`, `FILE_DELETE` |

### 2.2 Đăng ký → role gì?

- Register **luôn gán role `USER` mặc định** (auth.service.ts:514 `findRoleByName(ROLES.USER)`) — **không có bước chọn role khi đăng ký**.
- Hệ quả: user mới đăng ký **không thấy bất kỳ dữ liệu PPE nào** (site/camera/incident/thống kê đều 403). Chỉ ADMIN (hoặc MANAGER) gán role sau qua `PUT /users/:id/role`.
- **FE phải xử lý**: role USER thấy sidebar rút gọn + màn hình "chờ phân quyền" ở trang Tổng quan — không phải dashboard trống không giải thích.

### 2.3 Chi tiết permission từng role (đã xác minh trong seed)

**SAFETY_MANAGER**: `PPE_SITE_READ/MANAGE`, `PPE_ZONE_READ/MANAGE`, `PPE_RESTRICTED_AREA_READ/MANAGE`, `PPE_CAMERA_READ/MANAGE`, `PPE_SAFETY_CONFIG_READ/MANAGE`, `PPE_INCIDENT_READ/REVIEW/UPDATE/MANAGE`, `PPE_REPORTING_READ/EXPORT`, `PPE_AI_METRICS_READ`, `PPE_MODEL_READ`, `NOTIFICATION_READ`, `FILE_READ`, `FILE_UPLOAD`

**SAFETY_OFFICER**: `PPE_INCIDENT_READ/REVIEW/UPDATE`, `PPE_CAMERA_READ`, `PPE_SITE_READ`, `PPE_ZONE_READ`, `PPE_RESTRICTED_AREA_READ`, `PPE_SAFETY_CONFIG_READ`, `NOTIFICATION_READ`, `FILE_READ`

**MANAGER**: `USER_READ`, `USER_RESTORE`, `ROLE_READ`, `PERMISSION_READ`, `NOTIFICATION_READ/CREATE/UPDATE`, `NOTIFICATION_TEMPLATE_READ`, `MAINTENANCE_READ`, `AUDIT_LOG_READ`, `API_KEY_READ`, `WEBHOOK_READ`, `SYSTEM_CONFIG_READ`, `CRON_JOB_READ`, `FILE_READ/UPLOAD/MANAGE`

---

## 3. Ma trận phân quyền → menu & khả năng người dùng

### 3.1 Ma trận menu

| Menu | Route | Icon (lucide) | Permission gating | USER | OFFICER | MANAGER (safety) | ADMIN |
|---|---|---|---|---|---|---|---|
| Tổng quan | `/dashboard` | `LayoutDashboard` | luôn hiển thị | ✓ (empty state) | ✓ | ✓ | ✓ |
| Sự cố | `/incidents` | `ShieldAlert` | `PPE_INCIDENT_READ` | ✗ | ✓ (xem + duyệt) | ✓ (toàn quyền) | ✓ |
| Cameras | `/cameras` | `Cctv` | `PPE_CAMERA_READ` | ✗ | ✓ (xem) | ✓ (quản lý) | ✓ |
| Sites & Zones | `/sites` | `Building2` | `PPE_SITE_READ` | ✗ | ✓ (xem) | ✓ (quản lý) | ✓ |
| Báo cáo & Thống kê | `/reports` | `BarChart3` | `PPE_REPORTING_READ` | ✗ | ✗ | ✓ | ✓ |
| Hiệu năng AI | `/ai-metrics` | `Cpu` | `PPE_AI_METRICS_READ` | ✗ | ✗ | ✓ | ✓ |
| Thông báo | `/notifications` | `Bell` | `NOTIFICATION_READ` | ✓ | ✓ | ✓ | ✓ |
| Người dùng | `/users` | `Users` | `USER_READ` | ✗ | ✗ | ✗ | ✓ |
| Phân quyền | `/roles` | `ShieldCheck` | `ROLE_READ` | ✗ | ✗ | ✗ | ✓ |
| Nhật ký hệ thống | `/audit-logs` | `ScrollText` | `AUDIT_LOG_READ` | ✗ | ✗ | ✗ | ✓ |
| Hệ thống | `/system` | `Settings2` | `SYSTEM_CONFIG_READ` | ✗ | ✗ | ✗ | ✓ |
| Cài đặt tài khoản | `/settings/security` | `KeyRound` | luôn hiển thị | ✓ | ✓ | ✓ | ✓ |

### 3.2 Người dùng làm được gì — theo role

| Khả năng | USER (mới đăng ký) | SAFETY_OFFICER | SAFETY_MANAGER | ADMIN |
|---|---|---|---|---|
| Xem dashboard tổng quan | ✗ (chờ phân quyền) | ✓ | ✓ | ✓ |
| Xem KPI & biểu đồ thống kê | ✗ | ✗ | ✓ | ✓ |
| Xem danh sách sự cố | ✗ | ✓ | ✓ | ✓ |
| Duyệt sự cố (True/False alarm) | ✗ | ✓ | ✓ | ✓ |
| Giải quyết/đóng sự cố | ✗ | ✓ (UPDATE) | ✓ | ✓ |
| Xem camera & trạng thái | ✗ | ✓ | ✓ | ✓ |
| Thêm/sửa/xóa camera, site, zone, vùng cấm | ✗ | ✗ | ✓ | ✓ |
| Chỉnh cấu hình an toàn AI (ngưỡng, luật) | ✗ | ✗ | ✓ | ✓ |
| Xem báo cáo, xuất PDF/Excel | ✗ | ✗ | ✓ | ✓ |
| Xem hiệu năng AI (FPS/latency) | ✗ | ✗ | ✓ | ✓ |
| Nhận/xem thông báo | ✓ | ✓ | ✓ | ✓ |
| Quản lý người dùng, gán role | ✗ | ✗ | ✗ | ✓ |
| Xem nhật ký hệ thống (audit log) | ✗ | ✗ | ✗ | ✓ |
| Quản lý cấu hình hệ thống, API keys, webhooks | ✗ | ✗ | ✗ | ✓ |
| Đổi mật khẩu, bật 2FA, quản lý phiên | ✓ | ✓ | ✓ | ✓ |

---

## 4. Thiết kế khung Dashboard

### 4.1 AppShell

```
AuthGuard > RealtimeProvider > PrefetchProvider
  > AppShell
      ├── AppSidebar  (collapsible; nhóm menu; badge unread; neumorphic active = "pressed")
      ├── AppHeader   (site selector | realtime dot | bell | theme | locale | avatar)
      └── <main className="flex-1 overflow-y-auto p-6">{children}</main>
```

- Đặt tại `app/(auth)/layout.tsx` — thay placeholder hiện tại (hiện chỉ có guard + providers, chưa có shell).
- Cả 2 component đều client, dùng `@ui/*` + tokens neumorphic (`--nm-raised/inset/pressed`).

### 4.2 Sidebar — chi tiết

- **Menu registry tập trung** tại `src/config/navigation.ts` — KHÔNG rải điều kiện trong component:

```ts
export interface NavItem {
  key: string;            // key định danh
  route: string;          // href
  icon: LucideIcon;
  i18nKey: string;        // "nav.incidents"
  permission?: string;    // nếu có → bắt buộc user.permissions.includes()
  group: "monitoring" | "analytics" | "admin" | "personal";
}
```

- **Nhóm menu**:
  - **Giám sát** (`monitoring`): Tổng quan, Sự cố, Cameras, Sites & Zones
  - **Phân tích** (`analytics`): Báo cáo & Thống kê, Hiệu năng AI
  - **Quản trị** (`admin`): Người dùng, Phân quyền, Nhật ký hệ thống, Hệ thống
  - **Cá nhân** (`personal`): Thông báo (badge unread từ `unread-count`), Cài đặt tài khoản
- Nhóm nào không còn item hợp lệ (role không có quyền) → ẩn cả nhóm.
- **Hành vi**: active route = neumorphic "pressed"; nút collapse (icon-only + tooltip); footer sidebar hiển thị tên app + version.

### 4.3 Navbar — chi tiết

| # | Thành phần | Dữ liệu nguồn | Ghi chú |
|---|---|---|---|
| 1 | **Site selector** (global filter) | `GET /sites` | Dropdown chọn site, lưu vào context `SiteContext` (mới, client state) — mọi query thống kê/incident nhận `siteId` từ đây. Chỉ hiện khi có `PPE_SITE_READ` |
| 2 | **Realtime status** | `useRealtime().isConnected` | Dot xanh/đỏ nhỏ, tooltip "Kết nối thời gian thực" — graceful khi SSE lỗi 500 (xem 1.2 #3) |
| 3 | **Chuông thông báo** | `GET /notifications/unread-count` + SSE | Dropdown: 10 thông báo gần nhất (type/severity/readAt), nút "Đánh dấu tất cả đã đọc" (`PATCH /notifications/read-all`), link "Xem tất cả" → `/notifications` |
| 4 | **Theme toggle** | component có sẵn `@ui/theme-toggle` | — |
| 5 | **Locale switcher** (VI/EN) | `useLocale` | — |
| 6 | **Avatar menu** | `useAuth().user` | Avatar + tên + role badge; dropdown: Cài đặt bảo mật (`/settings/security`), Đổi mật khẩu (`/change-password`), Đăng xuất |

---

## 5. Cấu trúc route nhóm `(auth)`

| Route | Trạng thái | Trang hiển thị |
|---|---|---|
| `/dashboard` | ✅ đã có (placeholder Bước 3 cũ) | Nội dung tổng quan — thay bằng dashboard thật (Bước 5) |
| `/change-password` | ✅ đã có | Form đổi mật khẩu |
| `/settings/security` | ✅ đã có | 2FA, phiên đăng nhập, vô hiệu hóa tài khoản |
| `/incidents` (+ `/incidents/[id]`) | ⬜ stub (Bước 3) | Danh sách sự cố + chi tiết (evidences, review, resolve) |
| `/cameras` | ⬜ stub | Danh sách camera + trạng thái + health |
| `/sites` (+ `/sites/[id]/zones`, `/sites/[id]/restricted-areas`) | ⬜ stub | Quản lý site/zone/vùng cấm + cấu hình an toàn |
| `/reports` | ⬜ stub | KPI + biểu đồ + sinh báo cáo PDF/Excel |
| `/ai-metrics` | ⬜ stub | Hiệu năng AI theo camera (FPS/latency) |
| `/notifications` | ⬜ stub | Inbox đầy đủ + preferences |
| `/users` | ⬜ stub (ADMIN) | Quản lý người dùng + gán role |
| `/roles` | ⬜ stub (ADMIN) | Quản lý roles & permissions |
| `/audit-logs` | ⬜ stub (ADMIN) | Nhật ký hệ thống |
| `/system` | ⬜ stub (ADMIN) | System config, API keys, webhooks, cron |

> Quy ước Next 16: mỗi `page.tsx` là server component + `<Suspense>` bọc nội dung client (bắt buộc với cacheComponents) — giữ đúng pattern `dashboard/page.tsx` hiện tại.

---

## Bước 1 — Navigation registry & gating

### 1.1 `src/config/navigation.ts`

- Định nghĩa `NAV_GROUPS` (thứ tự nhóm + label i18n) và `NAV_ITEMS` (đầy đủ theo bảng 3.1).
- Export helper: `getVisibleNavItems(permissions: string[])` → lọc item theo `permission` + lọc nhóm rỗng.
- Đăng ký luôn route dành riêng role (users/roles/audit/system) dù chưa có trang — stub ra sau.

### 1.2 Guard cấp route (defense-in-depth)

- Menu ẩn là trải nghiệm chính; guard route là lớp 2: layout `(auth)` kiểm tra `permission` của route hiện tại — nếu không đủ → render màn hình 403 ("Bạn không có quyền truy cập trang này") thay vì chuyển hướng.
- Cách làm: thêm metadata map `ROUTE_PERMISSIONS: Record<string, string>` trong `navigation.ts`, check trong AppShell (layout không biết route cụ thể → dùng `usePathname()`).

### 1.3 Tiêu chí hoàn thành

- [ ] Đăng nhập role USER → sidebar chỉ có: Tổng quan, Thông báo, Cài đặt.
- [ ] Role OFFICER → thêm Sự cố, Cameras, Sites (không có Báo cáo, AI metrics, Quản trị).
- [ ] Role MANAGER (safety) → đủ nhóm Giám sát + Phân tích, không có nhóm Quản trị.
- [ ] Role ADMIN → đủ 4 nhóm.
- [ ] Vào route không có quyền bằng URL trực tiếp → hiện trang 403, không crash.

---

## Bước 2 — AppShell: Sidebar + Navbar

### 2.1 Files tạo mới

```
src/components/features/app-shell/
  app-shell.tsx           ← bố cục flex: sidebar + (header + main)
  app-sidebar.tsx         ← render NAV_GROUPS → item; collapse; badge unread
  app-header.tsx          ← thanh trên: site selector, realtime, bell, theme, locale, avatar
  notification-bell.tsx   ← dropdown inbox + unread badge
  site-selector.tsx       ← dropdown chọn site (PPE_SITE_READ)
  user-menu.tsx           ← avatar menu
src/contexts/site-context.tsx  ← client state: siteId hiện tại (global filter)
```

### 2.2 Sửa `app/(auth)/layout.tsx`

```
AuthGuard > RealtimeProvider > SiteProvider > PrefetchProvider
  > AppShell > {children}
```

> `SiteProvider` đặt dưới `RealtimeProvider`, trên `PrefetchProvider` (prefetch có thể cần siteId sau này).

### 2.3 Chi tiết từng component

- **app-sidebar**: sticky trái, width 260px (collapsed 64px), nền neumorphic raised, active item = pressed + accent. Item có badge (số unread cho Thông báo — query `useUnreadCount` refresh theo SSE).
- **notification-bell**: dropdown panel 360px; item theo severity (màu dot); type PPE_VIOLATION có icon cảnh báo riêng; click item → mark read + điều hướng (incident link nếu có `incidentId`).
- **site-selector**: hiển thị tên site đang chọn; options từ `useSites` (Bước 4); chưa chọn = "Tất cả sites" (không truyền `siteId`).
- **user-menu**: role badge hiển thị label tiếng Việt từ map `ROLE_LABELS` (ADMIN → "Quản trị viên", SAFETY_MANAGER → "Quản lý an toàn", SAFETY_OFFICER → "Cán bộ an toàn", USER → "Thành viên").

### 2.4 Tiêu chí hoàn thành

- [ ] Layout có sidebar + header trên mọi trang nhóm `(auth)` — kể cả change-password, settings/security.
- [ ] Sidebar collapse/expand mượt, giữ trạng thái (localStorage).
- [ ] Active route đúng khi navigate; chuông hiện badge unread khi có thông báo chưa đọc.
- [ ] Avatar menu đầy đủ 3 mục + logout hoạt động.
- [ ] UI chuẩn neumorphic, i18n vi/en đầy đủ cho mọi chuỗi mới.

---

## Bước 3 — Placeholder pages cho toàn bộ route

- Mỗi route stub gồm: tiêu đề trang (i18n), mô tả chức năng, skeleton layout gợi ý (grid KPI / bảng / form) — **chưa gọi API**, chưa dựng logic.
- Mục đích: khung điều hướng hoàn chỉnh để lên bố cục từng trang sau, test gating + navigation trước khi đụng dữ liệu.
- File: `app/(auth)/{incidents,cameras,sites,reports,ai-metrics,notifications,users,roles,audit-logs,system}/page.tsx` (mỗi page theo pattern server + Suspense; nội dung client để trong `*-content.tsx` hoặc component riêng).

### Tiêu chí hoàn thành

- [x] Đi qua mọi route trong sidebar (theo role ADMIN) không lỗi, không 404.
- [x] Mỗi trang hiển thị đúng tiêu đề + mô tả, breadcrumb đơn giản.

---

## Bước 4 — Tầng services + hooks các domain

> Theo đúng pattern `auth` hiện có: `types/{domain}.types.ts` → `services/{domain}.service.ts` → `hooks/{domain}/` (+ `{domain}.query-keys.ts`).

| Domain | Types cần | Services (1 hàm = 1 endpoint) | Hooks |
|---|---|---|---|
| `sites` | Site, Zone, RestrictedArea, SafetyConfig | `getSites`, `getSite`, `getZones`, `getSafetyConfig`... | `useSites`, `useSite`, `useZones` |
| `incidents` | Incident, Evidence, Comment, Assignment + enums (INCIDENT_STATUS, SEVERITY, VIOLATION_TYPE) | `getIncidents`, `getIncident`, `reviewIncident`, `resolveIncident`, `closeIncident`, `getEvidenceUrl` | `useIncidents` (paginated), `useIncident`, `useReviewIncident`... |
| `statistics` | SummaryDto, TrendPoint, ViolationBreakdown, CameraRanking, AiPerformance | `getSummary`, `getTrends`, `getByViolation`, `getByCamera`, `getAiPerformance` | `useSummary`, `useTrends`, `useViolationBreakdown`... |
| `notifications` | Notification, Preference + enums (TYPE, SEVERITY, CHANNEL, STATUS) | `getNotifications`, `getUnreadCount`, `markRead`, `markAllRead`, `getPreferences` | `useNotifications`, `useUnreadCount`, `useMarkRead`... |
| `cameras` | Camera, CameraStream, HealthLog + enums (CAMERA_STATUS) | `getCameras`, `getCamera`, `pingCamera` | `useCameras`, `useCamera`, `usePingCamera` |
| `reports` | ReportTemplate, ReportGeneration | `listTemplates`, `generateReport`, `getHistory` | `useTemplates`, `useGenerateReport`... |

- Enum mapping hiển thị tập trung tại `src/config/enums.ts` (label + màu + icon): `INCIDENT_STATUS`, `SEVERITY`, `VIOLATION_TYPE`, `CAMERA_STATUS`, `NOTIFICATION_TYPE`.
- Mọi query nhận `siteId` từ `SiteContext` làm param tự động (hoặc truyền từ hook dùng context).

### Tiêu chí hoàn thành

- [ ] Gọi được danh sách incidents/cameras/sites/notifications bằng data thật (BE đang chạy).
- [ ] Hook trả đúng `{ data, isLoading, isError }`; error hiển thị qua toast toàn cục sẵn có.

---

## Bước 5 — Nội dung dashboard thật

> Lưu ý từ mục 1.2: `/statistics/*` đang trả số 0. Dùng **mock provider có đánh dấu** cho nhóm KPI/chart; incidents/cameras/notifications dùng data thật.

### 5.1 Bố cục trang Tổng quan (grid 12 cột, responsive)

```
Row 1: KPI Cards (7 chỉ số từ /statistics/summary)
  totalIncidents | openIncidents | resolvedIncidents | trueViolations
  falseAlarmRate | complianceRate | meanTimeToResolveHours
Row 2: Trend chart (line/bar, DAY/WEEK/MONTH) ────────────┬ Pie loại vi phạm
Row 3: Camera status tiles (5 trạng thái, đếm) ──────────┬ Camera ranking (top 5)
Row 4: Bảng incident gần đây (5 dòng: severity, type, site, status, ảnh thumb)
Row 5: Card "Vi phạm mới nhất" (realtime: lastAlert + snapshotUrl) — phụ thuộc SSE/Kafka
```

- Chart: dùng thư viện nhẹ (recharts — thêm dependency) hoặc vẽ SVG thủ công theo design system; tuân thủ palette tokens của dự án.
- Bảng incident: click dòng → `/incidents/:id`; nút duyệt nhanh (✓/✗) nếu có `PPE_INCIDENT_REVIEW`.
- Card realtime: lắng nghe `useRealtime().lastAlert`; khi SSE lỗi (1.2 #3) → hiện trạng thái "Ngoại tuyến" + poll fallback 30s (tuỳ chọn).

### 5.2 Tiêu chí hoàn thành

- [ ] Dashboard render đủ 5 hàng theo đúng role; role USER thấy empty state "chờ phân quyền" (Bước 6).
- [ ] Chuyển tab DAY/WEEK/MONTH của trend không lỗi; pie hiển thị đúng label tiếng Việt.
- [ ] Mock data có badge "Dữ liệu mẫu" rõ ràng — sẵn sàng đổi sang API khi BE xong (#1 + #2).

---

## Bước 6 — Prefetch, i18n & empty states

### 6.1 Prefetch role-based

- Đăng ký job vào `src/config/prefetch-jobs.ts` (pattern đã có: `auth.sessions`):
  - `ADMIN`: `statistics.summary` + `sites.list`
  - `SAFETY_MANAGER`: `statistics.summary` + `sites.list`
  - `SAFETY_OFFICER`: `incidents.list` (5 dòng đầu) + `sites.list`
  - `USER`: `notifications.unread-count`

### 6.2 i18n

- Thêm namespace mới trong `src/i18n/vi-VN.json` / `en-US.json`: `nav.*` (12 mục menu), `dashboard.*` (mở rộng từ key tạm hiện có), `incidents.*`, `cameras.*`, `sites.*`, `reports.*`, `notifications.*`, `admin.*`, `common.*` (trạng thái, severity, empty, 403...).
- Label role: `roles.ADMIN` → "Quản trị viên" / "Administrator"...

### 6.3 Empty states

- **USER mới đăng ký** (không có quyền PPE): trang Tổng quan hiện illustration + "Tài khoản đang chờ quản trị viên phân quyền" + nút mở Thông báo.
- **403**: "Bạn không có quyền truy cập trang này" + nút quay lại Tổng quan.
- **Không có dữ liệu**: mỗi bảng/chart có empty state riêng (không hiện chart rỗng).

### Tiêu chí hoàn thành

- [ ] Đăng nhập 4 role (admin/manager/officer/user@ppe.local) → prefetch đúng job, không thừa request.
- [ ] Chuyển EN/VI toàn bộ shell + dashboard không sót chuỗi.

---

## Bước 7 — Test case E2E

> Tài liệu test case đặt tại `docs/test-cases/dashboard.md` (cùng nơi `auth.md`).

### 7.1 Hành trình chính — theo role

1. **ADMIN**: login → sidebar đủ 4 nhóm → Tổng quan có KPI/chart → vào Incidents xem danh sách → vào Users gán role cho user mới → vào Audit logs xem hoạt động → logout.
2. **SAFETY_MANAGER**: login → không thấy nhóm Quản trị → vào Sites sửa cấu hình an toàn → vào Reports xem thống kê → duyệt 1 incident.
3. **SAFETY_OFFICER**: login → thấy Giám sát (đọc) → duyệt True/False alarm → không vào được `/users` (trang 403).
4. **USER mới đăng ký**: register → verify → login → sidebar rút gọn → Tổng quan hiện "chờ phân quyền" → vào Thông báo xem welcome email.

### 7.2 Nhánh lỗi

- SSE lỗi 500 → dot đỏ "Ngoại tuyến", app không crash, không spam toast.
- Statistics trả 0 → mock badge hiển thị, không NaN trên chart.
- Refresh giữa chừng → layout phục hồi đúng (AuthContext + Prefetch).
- Site selector chọn site → KPI/incident đổi theo `siteId`.

---

## Ma trận xử lý lỗi

| Tình huống | Xử lý FE |
|---|---|
| 401 hết hạn | interceptor refresh single-flight có sẵn → thất bại → redirect `/login` |
| 403 thiếu quyền gọi API | toast "Không có quyền" (1 lần), UI phần đó ẩn — không retry loop |
| 403 vào route trực tiếp | trang 403 (Bước 1.2) |
| SSE 500 / disconnect | dot ngoại tuyến + giữ dữ liệu cũ; tự retry theo RealtimeProvider |
| Statistics trả mảng rỗng/0 | hiển thị empty state hoặc mock badge — không render chart NaN |
| Service chết (camera/site...) | chỉ section đó hiện error card + nút retry, không ảnh hưởng phần còn lại |

---

## Milestones & thứ tự thực hiện

| Milestone | Nội dung | Phụ thuộc |
|---|---|---|
| **M1 — Khung shell** | Bước 1 + 2 (registry, gating, sidebar, navbar, route guard 403) | — |
| **M2 — Điều hướng đủ** | Bước 3 (stub toàn bộ route) | M1 |
| **M3 — Data thật** | Bước 4 (services/hooks) + trang Incidents/Cameras/Sites/Notifications cơ bản | M2 |
| **M4 — Dashboard nội dung** | Bước 5 (KPI/chart/realtime, mock statistics) + Bước 6 (prefetch/i18n/empty) | M3 |
| **M5 — Hoàn thiện** | Bước 7 (E2E) + polish responsive | M4 |

> Có thể đảo M4 trước M3 nếu muốn thấy dashboard sớm — nhưng khuyến nghị theo thứ tự trên để data thật sẵn sàng khi dựng chart.

---

## Checklist hoàn thiện

- [x] Sidebar/Navbar hoàn chỉnh theo thiết kế 4.2–4.3, gating đúng theo bảng 3.1.
- [ ] Role USER mới đăng ký thấy empty state "chờ phân quyền" (2.2).
- [x] Trang 403 + guard route hoạt động.
- [x] Đủ 12 route nhóm `(auth)`, không 404.
- [ ] Services + hooks 6 domain theo pattern, gọi data thật thành công.
- [ ] Dashboard 5 hàng bố cục (5.1), mock statistics có badge rõ ràng.
- [ ] Prefetch đúng role, i18n vi/en đầy đủ.
- [ ] E2E 4 role + nhánh lỗi theo Bước 7.
- [ ] Theo dõi BE: lỗ hổng 1.2 #1–#3 — khi BE sửa xong, gỡ mock và bật SSE thật.
