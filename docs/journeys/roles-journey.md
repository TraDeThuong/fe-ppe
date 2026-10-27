# Hành trình xây dựng Trang Quản lý Vai trò & Phân quyền RBAC (/roles) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Quản lý Vai trò & Phân quyền Truy cập (`/roles`) thuộc nhóm Quản trị Hệ thống (`admin`) sau đăng nhập — danh mục vai trò hệ thống và vai trò tùy chỉnh, ma trận quyền hạn (Dynamic Permission Matrix) phân nhóm trực quan, gắn/gỡ quyền theo thời gian thực, cơ chế chống khóa quyền tự hại (Anti-lockout Rules) và đồng bộ tức thời với phiên làm việc của người dùng.  
> **Nguồn contract:** Backend `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/rbac`).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [users-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/users-journey.md) | [system-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/system-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền tạo, sửa vai trò, phân bổ quyền và cấu hình ma trận RBAC)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — chỉ xem vai trò và quyền hạn, không được sửa đổi quyền cốt lõi)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /roles](#0-mục-tiêu--định-vị-trang-roles)
1. [Khảo sát Backend Contract (identity-service rbac module)](#1-khảo-sát-backend-contract-identity-service-rbac-module)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Dynamic Permission Matrix & Anti-lockout Protection](#4-cơ-chế-kỹ-thuật-cốt-lõi-dynamic-permission-matrix--anti-lockout-protection)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Rà soát & Củng cố DTOs/Types (src/types/rbac.types.ts)](#bước-1--rà-soát--củng-cố-dtostypes-srctypesrbactypests)
   - [Bước 2 — Rà soát Tầng Service API (src/services/rbac.service.ts)](#bước-2--rà-soát-tầng-service-api-srcservicesrbacservicets)
   - [Bước 3 — Nâng cấp React Query Hooks (src/hooks/rbac/)](#bước-3--nâng-cấp-react-query-hooks-srchooksrbac)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị Neumorphism](#bước-5--xây-dựng-các-ui-components-hiển-thị-neumorphism)
   - [Bước 6 — Xây dựng Modal & Drawer tương tác nghiệp vụ RBAC](#bước-6--xây-dựng-modal--drawer-tương-tác-nghiệp-vụ-rbac)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/roles/roles-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthrolesroles-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /roles

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Trang `/roles` (**Quản lý Vai trò & Phân quyền RBAC**) là hạt nhân bảo mật của hệ thống Smart PPE. Mọi quyền truy cập API, hiển thị menu trên thanh điều hướng Sidebar, và các nút bấm tác vụ (Action Guards) đều phụ thuộc trực tiếp vào việc một vai trò sở hữu những quyền (`permissions`) nào. Trang này giải quyết 4 bài toán quản trị:

1. **Phân quyền Động theo Chuẩn RBAC (Role-Based Access Control):** Thay vì gán cứng quyền trong mã nguồn, hệ thống cho phép định nghĩa các vai trò linh hoạt theo vị trí công việc thực tế tại công trường (ví dụ: Trưởng ca Giám sát, Kỹ thuật viên Camera, Thanh tra An toàn Môi trường).
2. **Trực quan hóa Ma trận Quyền hạn (Interactive Permission Matrix):** Quyền được phân nhóm khoa học theo từng phân hệ chức năng (Quản trị Người dùng, Quản lý Camera RTSP, Giám sát Sự cố PPE, Công trường & Vùng cấm, Báo cáo & Thống kê, Cấu hình Hệ thống). Admin có thể chọn/bỏ chọn từng quyền chỉ bằng 1 cú nhấp chuột với phản hồi xúc giác Neumorphic rõ nét.
3. **Bảo vệ Tính toàn vẹn Hệ thống (System Roles & Anti-lockout Protection):** Khóa chặt các vai trò nòng cốt (`ADMIN`, `USER`) để ngăn ngừa trường hợp người quản trị vô tình xóa mất vai trò Admin tối cao hoặc tự tước đoạt quyền quản trị của chính mình.
4. **Đồng bộ Phiên Thời gian thực (Session Token Synchronization):** Khi một vai trò được cập nhật danh sách quyền, cơ chế kiểm tra token tự động cập nhật khả năng thao tác của người dùng trong phiên làm việc tiếp theo.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Thống kê KPI Phân quyền (Bento Summary):** 4 thẻ chỉ số: Tổng số vai trò, Vai trò hệ thống mặc định (`isSystem`), Tổng số quyền hạn phân nhóm trong hệ thống, Số lượng nhân sự đã được gán vai trò.
  2. **Bảng Danh sách Vai trò Neumorphic:** Hiển thị tên vai trò, mã định danh (`code`), mô tả, số lượng nhân sự đang giữ vai trò này, cờ `isSystem`, thời điểm tạo và các nút thao tác (Phân quyền, Sửa, Xóa).
  3. **Drawer / Modal Cấu hình Ma trận Quyền hạn (Permission Matrix Drawer):**
     - Hiển thị danh sách quyền theo cây danh mục (Accordion/Tabs) nhóm theo Domain: Auth/Identity, Users, Roles, Cameras, Sites, Incidents, Reports, Notifications, System.
     - Nút tác vụ nhanh: "Chọn tất cả trong nhóm", "Bỏ chọn tất cả", "Khôi phục mặc định".
     - Nút "Lưu quyền" (`syncRolePermissions`) lưu toàn bộ danh sách `permissionIds` bằng 1 API call duy nhất.
  4. **Modal Tạo mới Vai trò:** Nhập Tên vai trò, Mã code (viết hoa dạng `SAFETY_AUDITOR`), Mô tả và tích chọn các quyền khởi tạo.
  5. **Modal Chỉnh sửa Vai trò:** Cho phép sửa tên và mô tả vai trò (không cho sửa `code` đối với vai trò hệ thống).
  6. **Hộp thoại Xác nhận Xóa Vai trò:** Chặn xóa vai trò `isSystem: true` và cảnh báo nếu đang có nhân sự sử dụng vai trò này.
  7. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không tạo/sửa trực tiếp bảng danh mục quyền thô `permissions` (danh mục quyền được khởi tạo cố định qua seed migration của backend để đảm bảo tính đồng nhất với microservices).
  - Không can thiệp vào logic gán vai trò cho từng user đơn lẻ (việc này thực hiện tại trang `/users`).

---

## 1. Khảo sát Backend Contract (identity-service rbac module)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik `/api/v1/rbac`):
- Controller: [rbac.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/rbac/rbac.controller.ts)
- Routes: [rbac.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/rbac/rbac.route.ts)
- DTOs: [rbac.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/rbac/rbac.dto.ts)
- Permissions: [permission.constant.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/common/constants/permission.constant.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Danh sách Vai trò** | `GET` | `/api/v1/rbac/roles` | `ROLE_READ` | Query: `search, isSystem, page, limit` | `{ success: true, data: RoleItemDto[], meta: PaginationMeta }` |
| **Chi tiết Vai trò** | `GET` | `/api/v1/rbac/roles/:id` | `ROLE_READ` | Params: `id (UUID)` | `{ success: true, data: RoleDetailDto }` |
| **Tạo mới Vai trò** | `POST` | `/api/v1/rbac/roles` | `ROLE_CREATE` | Body: `{ name, code, description?, permissionIds? }` | `{ success: true, message: string, data: RoleItemDto }` (201) |
| **Cập nhật Vai trò** | `PUT` | `/api/v1/rbac/roles/:id` | `ROLE_UPDATE` | Params: `id`, Body: `{ name?, description? }` | `{ success: true, message: string, data: RoleItemDto }` |
| **Xóa Vai trò** | `DELETE`| `/api/v1/rbac/roles/:id` | `ROLE_DELETE` | Params: `id` | `{ success: true, message: string }` |
| **Danh mục Quyền** | `GET` | `/api/v1/rbac/permissions` | `PERMISSION_READ` | Query: `module?, search?` | `{ success: true, data: PermissionItemDto[] }` |
| **Quyền của 1 Vai trò**| `GET` | `/api/v1/rbac/roles/:id/permissions` | `ROLE_READ` | Params: `id` | `{ success: true, data: PermissionItemDto[] }` |
| **Đồng bộ Quyền Vai trò**| `POST` | `/api/v1/rbac/roles/:id/permissions` | `ROLE_PERMISSION_ASSIGN` | Params: `id`, Body: `{ permissionIds: string[] }` | `{ success: true, message: string }` |
| **Gỡ 1 Quyền** | `DELETE`| `/api/v1/rbac/roles/:id/permissions/:permissionId` | `ROLE_PERMISSION_ASSIGN` | Params: `id, permissionId` | `{ success: true, message: string }` |

### 1.2 Phân nhóm Quyền hạn Chuẩn (Permission Modules)
- **`IDENTITY & AUTH`:** Đăng nhập, xác thực 2FA, thu hồi phiên làm việc.
- **`USERS`:** `USER_READ`, `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`, `USER_ROLE_ASSIGN`.
- **`ROLES`:** `ROLE_READ`, `ROLE_CREATE`, `ROLE_UPDATE`, `ROLE_DELETE`, `ROLE_PERMISSION_ASSIGN`.
- **`CAMERAS`:** `PPE_CAMERA_READ`, `PPE_CAMERA_MANAGE`, `PPE_CAMERA_STREAM`.
- **`SITES`:** `PPE_SITE_READ`, `PPE_SITE_MANAGE`, `PPE_ZONE_READ`, `PPE_ZONE_MANAGE`, `PPE_SAFETY_CONFIG_MANAGE`.
- **`INCIDENTS`:** `PPE_INCIDENT_READ`, `PPE_INCIDENT_REVIEW`, `PPE_INCIDENT_UPDATE`, `PPE_INCIDENT_MANAGE`, `PPE_INCIDENT_DELETE`.
- **`REPORTING & AI`:** `PPE_REPORTING_READ`, `PPE_REPORTING_EXPORT`, `PPE_AI_METRICS_READ`, `PPE_MODEL_MANAGE`.
- **`NOTIFICATIONS`:** `NOTIFICATION_READ`, `NOTIFICATION_CREATE`, `NOTIFICATION_UPDATE`, `NOTIFICATION_TEMPLATE_MANAGE`.
- **`SYSTEM & AUDIT`:** `SYSTEM_CONFIG_READ`, `SYSTEM_CONFIG_MANAGE`, `AUDIT_LOG_READ`, `AUDIT_LOG_EXPORT`.

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/roles/
│   ├── page.tsx                                      ← Server Component bọc Suspense (đã có)
│   └── roles-content.tsx                             ← NÂNG CẤP: Lắp ráp giao diện Quản lý Vai trò hoàn chỉnh
│
├── src/
│   ├── types/
│   │   ├── rbac.types.ts                             ← ĐÃ CÓ: Hoàn thiện định nghĩa RoleItem, PermissionItem, Matrix
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── rbac.service.ts                           ← ĐÃ CÓ: Hoàn thiện client gọi 9 endpoint của rbac module
│   │   └── index.ts
│   │
│   ├── hooks/rbac/                                   ← NÂNG CẤP: Bộ hooks quản lý vai trò và ma trận quyền
│   │   ├── index.ts
│   │   ├── rbac.query-keys.ts                        ← Quản lý Query Keys chuẩn
│   │   ├── use-roles.ts                              ← Lấy danh sách vai trò, tìm kiếm và phân trang
│   │   ├── use-permissions.ts                        ← Lấy toàn bộ danh mục quyền hệ thống theo module
│   │   ├── use-role-permissions.ts                   ← Lấy danh sách quyền cụ thể của vai trò đang chọn
│   │   ├── use-role-mutations.ts                     ← Tạo, sửa, xóa vai trò
│   │   └── use-sync-role-permissions.ts              ← Mutation đồng bộ ma trận quyền (optimistic update)
│   │
│   ├── components/features/roles/                    ← MỚI: UI Components Neumorphism
│   │   ├── role-kpi-summary.tsx                      ← 4 thẻ Bento Console thống kê nhanh
│   │   ├── role-toolbar.tsx                          ← Thanh tìm kiếm, lọc vai trò hệ thống, nút "+ Tạo vai trò mới"
│   │   ├── role-card-grid.tsx                        ← Lưới thẻ vai trò Neumorphic Soft 3D
│   │   ├── role-table.tsx                            ← Bảng danh sách vai trò chi tiết có phân trang
│   │   ├── permission-matrix.tsx                     ← Bảng ma trận quyền hạn dạng lưới tương tác
│   │   ├── permission-group-accordion.tsx            ← Nhóm quyền thu gọn theo từng phân hệ (Users, Cameras, Incidents...)
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── create-role-modal.tsx                 ← Modal tạo mới vai trò
│   │       ├── edit-role-modal.tsx                   ← Modal chỉnh sửa thông tin vai trò
│   │       ├── permission-matrix-drawer.tsx          ← Drawer bên phải mở ma trận phân quyền chi tiết cho vai trò
│   │       └── delete-role-dialog.tsx                ← Hộp thoại xác nhận xóa vai trò kèm cảnh báo an toàn
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "roles.*" và "permissions.*"
│       └── en-US.json                                ← Bổ sung namespace "roles.*" và "permissions.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục trang tổng thể (12 cột, Responsive)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon Shield + "Quản lý Vai trò & Phân quyền RBAC" + Badge "SYSTEM ROLES"    │
│            + [ Nút: "+ Tạo vai trò mới" ]  [ Nút: "🔄 Làm mới" ]                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BENTO CONSOLE KPI CARDS] (4 cột desktop, 2 cột tablet, 1 cột mobile)                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│ │ 🛡️ Tổng vai trò │ │ 🔒 Vai trò Gốc   │ │ 🔑 Tổng quyền hạn│ │ 👥 Nhân sự đã gán│           │
│ │       6        │ │    4 Hệ thống  │ │    42 Quyền hạn  │ │      142 Người   │           │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [FILTER TOOLBAR & VIEW TOGGLE]                                                         │
│ [ 🔍 Tìm tên vai trò, mã code... ] [ Lọc: Tất cả ▼ ]     [ ⊞ Dạng thẻ ] [ ☰ Dạng bảng ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [LƯỚI THẺ VAI TRÒ NEUMORPHIC (ROLE CARDS GRID)]                                        │
│ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐     │ │
│ │ 👑 ADMIN (Quản trị viên Tối cao)   │ │ 🛡️ SAFETY_MANAGER (Quản lý An toàn) │     │ │
│ │ 42/42 quyền hạn • 3 nhân sự        │ │ 32/42 quyền hạn • 12 nhân sự       │     │ │
│ │ Quyền kiểm soát toàn diện hệ thống │ │ Giám sát sự cố, công trường, báo cáo│    │ │
│ │ [ 🔒 Vai trò Hệ thống ]            │ │ [ 🔒 Vai trò Hệ thống ]            │     │ │
│ │ [ 🔑 Phân quyền ] [ 👁️ Xem ]        │ │ [ 🔑 Phân quyền ] [ ✏️ Sửa ]         │     │ │
│ └────────────────────────────────────┘ └────────────────────────────────────┘     │ │
│ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐     │ │
│ │ 🦺 SAFETY_OFFICER (Cán bộ An toàn) │ │ 👤 USER (Nhân viên / Công nhân)    │     │ │
│ │ 18/42 quyền hạn • 45 nhân sự       │ │ 6/42 quyền hạn • 82 nhân sự        │     │ │
│ │ Thẩm duyệt sự cố PPE, theo dõi cam │ │ Xem thông báo cá nhân, hồ sơ        │     │ │
│ │ [ 🔒 Vai trò Hệ thống ]            │ │ [ 🔒 Vai trò Hệ thống ]            │     │ │
│ │ [ 🔑 Phân quyền ] [ ✏️ Sửa ]         │ │ [ 🔑 Phân quyền ] [ ✏️ Sửa ]         │     │ │
│ └────────────────────────────────────┘ └────────────────────────────────────┘     │ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: Dynamic Permission Matrix & Anti-lockout Protection

### 4.1 Quy tắc Chống Tự khóa Quản trị (Anti-lockout Rules)
1. **Bảo vệ Vai trò `ADMIN`:**
   - Cấm xóa vai trò `ADMIN` (Nút Xóa bị ẩn hoàn toàn).
   - Trong Drawer Ma trận Quyền hạn của `ADMIN`: Các quyền quản trị then chốt (`ROLE_READ`, `ROLE_UPDATE`, `ROLE_PERMISSION_ASSIGN`, `USER_ROLE_ASSIGN`, `SYSTEM_CONFIG_MANAGE`) luôn ở trạng thái Check cố định và `disabled`, không thể bỏ chọn nhằm ngăn chặn Admin tự tước quyền của chính vai trò này.
2. **Cảnh báo Vai trò Đang có Người dùng:**
   - Nếu vai trò có `userCount > 0`, khi bấm Xóa hệ thống sẽ hiển thị cảnh báo đỏ yêu cầu Admin chuyển toàn bộ người dùng sang vai trò khác tại trang `/users` trước khi xóa.

### 4.2 Tối ưu hóa Lưu Ma trận Quyền (Bulk Permission Sync)
Thay vì gửi hàng chục request thêm/xóa từng quyền riêng lẻ, client sử dụng API `POST /api/v1/rbac/roles/:id/permissions` nhận mảng `permissionIds: string[]`:
- So sánh state đang chọn trong Drawer với danh sách quyền ban đầu để hiển thị badge số lượng thay đổi ("+3 quyền mới, -1 quyền gỡ bỏ").
- Khi bấm "Lưu thay đổi", gửi 1 payload đồng nhất. Giao diện thực hiện Optimistic Update để người dùng không phải chờ đợi.

---

## 5. Ma trận phân quyền & RBAC Access Control

| Vai trò | Xem Danh sách Vai trò | Tạo Vai trò Mới | Sửa Tên/Mô tả | Cấu hình Ma trận Quyền | Xóa Vai trò Tùy chỉnh |
|---|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **SAFETY_MANAGER** | ✅ Xem (`ROLE_READ`) | ❌ Bị chặn | ❌ Bị chặn | ❌ Bị chặn | ❌ Bị chặn |
| **SAFETY_OFFICER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Rà soát & Củng cố DTOs/Types (`src/types/rbac.types.ts`)
- Kiểm tra tính đầy đủ của `RoleItem`, `RoleDetail`, `PermissionItem`, `AssignPermissionsDto`.
- Nhóm quyền theo enum `PermissionModule`: `AUTH`, `USERS`, `ROLES`, `CAMERAS`, `SITES`, `INCIDENTS`, `REPORTING`, `NOTIFICATIONS`, `SYSTEM`.

### Bước 2 — Rà soát Tầng Service API (`src/services/rbac.service.ts`)
- Hoàn thiện `rbacService.getRoles()`, `getRoleById()`, `createRole()`, `updateRole()`, `deleteRole()`.
- Hoàn thiện `rbacService.getPermissions()`, `getRolePermissions()`, `syncRolePermissions()`.

### Bước 3 — Nâng cấp React Query Hooks (`src/hooks/rbac/`)
- Cấu hình `rbac.query-keys.ts`.
- Hoàn thiện `useRoles`, `usePermissions`, `useRolePermissions`, `useRoleMutations`, `useSyncRolePermissions`.
- Tự động invalidate query `["rbac", "roles"]` và `["rbac", "roles", roleId, "permissions"]` sau khi mutation hoàn tất.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật đầy đủ bản dịch tên quyền và mô tả quyền hạn trong `vi-VN.json` và `en-US.json`:
- `roles.title`, `roles.description`, `roles.kpi.*`
- `roles.systemRoleBadge`, `roles.customRoleBadge`
- `permissions.modules.*` (tên hiển thị thân thiện của từng phân hệ)
- `roles.drawer.*` (tiêu đề ma trận, số quyền đã chọn, nút lưu, cảnh báo)

### Bước 5 — Xây dựng các UI Components hiển thị Neumorphism
- `role-kpi-summary.tsx`: 4 thẻ Bento Console thống kê nhanh.
- `role-card-grid.tsx`: Lưới hiển thị các thẻ vai trò Neumorphic 3D có hiệu ứng hover bóng mềm.
- `permission-group-accordion.tsx`: Danh mục accordion phân nhóm quyền có nút "Chọn tất cả" / "Bỏ chọn tất cả" cho từng phân hệ.

### Bước 6 — Xây dựng Modal & Drawer tương tác nghiệp vụ RBAC
- `permission-matrix-drawer.tsx`: Drawer trượt hiển thị toàn bộ cây quyền hạn với checkbox Neumorphic lõm (`nm-inset`).
- `create-role-modal.tsx`: Form tạo mới vai trò có validation mã code viết hoa không dấu.
- `edit-role-modal.tsx`: Form sửa tên và mô tả vai trò.
- `delete-role-dialog.tsx`: Hộp thoại xác nhận xóa an toàn.

### Bước 7 — Lắp ráp trang chính (`app/(auth)/roles/roles-content.tsx`)
Thay thế placeholder hiện tại bằng component hoàn chỉnh kết nối toàn bộ Hooks, Summary Cards, Grid/Table view và Permission Matrix Drawer.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm thử hiển thị hoàn hảo trên Mobile, Tablet, Desktop.
- Kiểm tra cơ chế chống xóa vai trò `isSystem`.
- Kiểm tra tính mượt mà khi tích chọn hàng loạt quyền trong Drawer Ma trận.

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Mã vai trò `code` chứa ký tự đặc biệt hoặc chữ thường | Báo lỗi inline "Mã vai trò chỉ được gồm chữ hoa và dấu gạch dưới" |
| **401 Unauthorized**| Hết hạn token khi đang cấu hình ma trận | Chuyển hướng về `/login` |
| **403 Forbidden**   | Tài khoản không có quyền `ROLE_READ` hoặc `ROLE_PERMISSION_ASSIGN` | Hiển thị màn hình 403 Forbidden |
| **404 Not Found**   | Vai trò đang xem bị xóa bởi một quản trị viên khác | Đóng Drawer và Toast báo lỗi "Vai trò không còn tồn tại" |
| **409 Conflict**    | Trùng mã vai trò `code` đã tồn tại trong cơ sở dữ liệu | Báo lỗi inline "Mã vai trò này đã được sử dụng" |
| **500 Server Error**| Lỗi hệ thống khi lưu ma trận quyền | Toast báo lỗi đỏ, giữ nguyên trạng thái checkbox để người dùng bấm thử lại |

---

## 8. Checklist hoàn thiện nghiệm thu

- [x] Route `/roles` được bảo vệ bằng Route Guard với quyền `ROLE_READ`.
- [x] 4 thẻ Bento Console hiển thị đúng thống kê từ API.
- [x] Hỗ trợ chuyển đổi linh hoạt giữa Dạng Thẻ (Grid) và Dạng Bảng (Table).
- [x] Drawer Ma trận Phân quyền hiển thị đầy đủ 42 quyền hạn phân theo 9 phân hệ.
- [x] Tính năng chọn tất cả / bỏ chọn theo phân hệ hoạt động chuẩn xác.
- [x] Cơ chế Anti-lockout bảo vệ vai trò `ADMIN` không thể bị xóa hoặc tước quyền cốt lõi.
- [x] Tạo mới, chỉnh sửa và xóa vai trò tùy chỉnh thành công.
- [x] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) chuyển đổi mượt mà.
- [x] Thiết kế Neumorphism chuẩn mực, tương thích hoàn hảo Dark Mode và Light Mode.
