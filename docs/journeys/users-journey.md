# Hành trình xây dựng Trang Quản lý Người dùng (/users) — fe-ppe

> **Ngày lập:** 2026-10-26  
> **Phạm vi:** Trang Quản trị Danh tính & Nhân sự (`/users`) trong nhóm Quản trị hệ thống (`admin`) sau đăng nhập — danh sách nhân sự, thống kê KPI, bộ lọc tìm kiếm nâng cao, gán vai trò RBAC, đặt lại mật khẩu, quản lý phiên/thiết bị, khóa/xóa/khôi phục tài khoản.  
> **Nguồn contract:** Backend `smart-ppe-identity-service` (cổng 9999 / Gateway cổng 80).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [auth-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/auth-journey.md) | [dashboard-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/dashboard-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — có quyền truy cập và toàn quyền thao tác)  
> - `manager@ppe.local / Manager@123456` (MANAGER — có quyền xem và quản lý người dùng)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — không có quyền, test màn hình 403)  
> - `user@ppe.local / User@123456` (USER — không có quyền, test màn hình 403)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /users](#0-mục-tiêu--định-vị-trang-users)
1. [Khảo sát Backend Contract (identity-service)](#1-khảo-sát-backend-contract-identity-service)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Ma trận phân quyền & Cơ chế bảo vệ (Anti-lockout Rules)](#4-ma-trận-phân-quyền--cơ-chế-bảo-vệ-anti-lockout-rules)
5. [Kế hoạch triển khai chi tiết từng bước](#5-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/user.types.ts)](#bước-1--tầng-dtos--types-srctypesusertypests)
   - [Bước 2 — Tầng Service API (src/services/user.service.ts)](#bước-2--tầng-service-api-srcservicesuservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/users/)](#bước-3--tầng-react-query-hooks-srchooksusers)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị](#bước-5--xây-dựng-các-ui-components-hiển-thị)
   - [Bước 6 — Xây dựng các Modal & Drawer tương tác nghiệp vụ](#bước-6--xây-dựng-các-modal--drawer-tương-tác-nghiệp-vụ)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/users/users-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthusersusers-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
6. [Ma trận xử lý lỗi (Error Matrix)](#6-ma-trận-xử-lý-lỗi-error-matrix)
7. [Checklist hoàn thiện](#7-checklist-hoàn-thiện)

---

## 0. Mục tiêu & Định vị trang /users

### 0.1 Vai trò trong hệ thống Smart PPE
Trang `/users` (**Quản lý Người dùng**) là trung tâm quản trị định danh (IAM Directory) của dự án. Đây là mắt xích then chốt giải quyết bài toán phân quyền:
* **Khép kín vòng đời RBAC:** Khi tài khoản mới đăng ký qua `/register` hoặc Google OAuth, backend tự động gán vai trò mặc định là `USER` (bị hạn chế quyền, không xem được camera, công trường hay sự cố). Admin sử dụng trang này để gán vai trò thực tế (`SAFETY_MANAGER`, `SAFETY_OFFICER`, v.v.) qua API `PUT /api/v1/rbac/users/:id/role`.
* **Quản trị an ninh nhân sự:** Khóa tài khoản nghỉ việc/vi phạm, mở khóa tài khoản nhập sai pass nhiều lần, ép đổi mật khẩu lần đầu, reset mật khẩu tạm thời, thu hồi các phiên đăng nhập từ xa khi mất thiết bị.
* **Bảo vệ bằng Permission Gating:** Route yêu cầu quyền `USER_READ`. Chỉ `ADMIN` và `MANAGER` được phép truy cập. Các vai trò khác bị Route Guard chặn sang màn hình 403 Forbidden.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. Thống kê KPI nhanh: Tổng user, Đang hoạt động, Tỷ lệ bật 2FA, Tài khoản khóa/vô hiệu hóa.
  2. Bảng dữ liệu Neumorphic có tìm kiếm (search email/tên/phone), lọc theo Role, lọc theo trạng thái, sắp xếp và phân trang.
  3. Thao tác CRUD: Tạo nhân viên mới, Sửa thông tin cơ bản, Khóa/Vô hiệu hóa (soft delete), Khôi phục tài khoản (restore).
  4. Thao tác Phân quyền: Modal gán vai trò (tận dụng hook `useAssignUserRole`).
  5. Thao tác An ninh: Admin reset password (tự nhập hoặc sinh mật khẩu tạm thời), Drawer xem danh sách phiên/thiết bị và nút thu hồi phiên đăng nhập từ xa.
  6. Cơ chế Anti-lockout: Chặn Admin tự hạ quyền, tự khóa, tự xóa tài khoản của chính mình.
  7. Tương thích Dark/Light Mode, Responsive từ Mobile đến Desktop, Đa ngôn ngữ VI/EN.

* ❌ **Ngoài phạm vi:**
  - Không sửa đổi Prisma schema hay logic cơ bản của backend `identity-service` (backend đã có sẵn 100% API).
  - Không quản lý danh mục quyền hạn Permission (đây là phạm vi của trang `/roles`).

---

## 1. Khảo sát Backend Contract (identity-service)

Tất cả các endpoint dưới đây đã được triển khai sẵn trong `smart-ppe-identity-service` tại các file:
- Schema: [prisma/schema.prisma (model User)](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/prisma/schema.prisma#L10-L45)
- Controller: [src/modules/users/user.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/users/user.controller.ts)
- Routes: [src/modules/users/user.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/users/user.route.ts)
- RBAC Routes: [src/modules/rbac/rbac.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/rbac/rbac.route.ts#L100-L107)

### Bảng đối chiếu API chi tiết:

| Tính năng | Method | Endpoint | Yêu cầu Permission | Payload Request | Response |
|---|---|---|---|---|---|
| **Danh sách user** | `GET` | `/api/v1/users` | `USER_READ` | Query: `search, roleName, isActive, isDeleted, sortBy, order, page, limit` | `{ success: true, data: UserResponseDto[], meta: PaginationMeta }` |
| **Chi tiết user** | `GET` | `/api/v1/users/:id` | `USER_READ` | Params: `id (UUID)` | `{ success: true, data: UserResponseDto }` |
| **Tạo user mới** | `POST` | `/api/v1/users` | `USER_CREATE` | Body: `{ email, password, roleId, fullName?, phoneNumber?, mustChangePassword? }` | `{ success: true, data: UserResponseDto }` (201 Created) |
| **Cập nhật user** | `PUT` | `/api/v1/users/:id` | `USER_UPDATE` | Body: `{ fullName?, phoneNumber?, isActive? }` | `{ success: true, data: UserResponseDto }` |
| **Xóa mềm (Khóa)** | `DELETE` | `/api/v1/users/:id` | `USER_DELETE` | Params: `id (UUID)` | `{ success: true, message: string }` |
| **Khôi phục user** | `POST` | `/api/v1/users/:id/restore` | `USER_RESTORE` hoặc `USER_DELETE` | Params: `id (UUID)` | `{ success: true, message: string }` |
| **Admin Reset Pass**| `POST` | `/api/v1/users/:id/reset-password` | `USER_UPDATE` | Body: `{ newPassword?, mustChangePassword?: boolean }` | `{ success: true, data: { ...UserDto, temporaryPassword?: string } }` |
| **Gán vai trò** | `PUT` | `/api/v1/rbac/users/:id/role` | `USER_ROLE_ASSIGN` | Body: `{ roleId: string }` | `{ success: true, message: string }` |
| **Danh sách phiên** | `GET` | `/api/v1/users/:id/sessions` | `USER_READ` | Params: `id (UUID)` | `{ success: true, data: UserSessionDto[] }` |
| **Thu hồi 1 phiên** | `DELETE` | `/api/v1/users/:id/sessions/:sessionId` | `USER_UPDATE` | Params: `id, sessionId` | `{ success: true, message: string }` |
| **Thu hồi mọi phiên**| `DELETE` | `/api/v1/users/:id/sessions` | `USER_UPDATE` | Params: `id` | `{ success: true, message: string }` |
| **Danh sách thiết bị**| `GET` | `/api/v1/users/:id/devices` | `USER_READ` | Params: `id (UUID)` | `{ success: true, data: UserDeviceDto[] }` |

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

Tuân thủ nghiêm ngặt nguyên tắc của dự án:
1. **Pages không gọi service trực tiếp** — chỉ gọi hook React Query.
2. **Hook không chứa logic điều hướng** — chỉ xử lý cache state và mutate data.
3. **Mọi chuỗi UI hiển thị qua `t()`** của `useLocale`.
4. **Style Neumorphic đồng bộ** dùng tokens chuẩn (`tokens.css`) và surface component.

```
fe-ppe/
├── app/(auth)/users/
│   ├── page.tsx                                  ← Server component bọc Suspense (đã có)
│   └── users-content.tsx                         ← SỬA: Ghép nối toàn bộ UI trang /users
│
├── src/
│   ├── types/
│   │   ├── user.types.ts                         ← MỚI: DTOs, Query params, Payloads cho users
│   │   └── index.ts                              ← SỬA: Export user.types.ts
│   │
│   ├── services/
│   │   ├── user.service.ts                       ← MỚI: Client gọi 12 endpoint của identity-service
│   │   └── index.ts                              ← SỬA: Export user.service.ts
│   │
│   ├── hooks/users/                              ← MỚI: Folder hooks quản trị người dùng
│   │   ├── index.ts                              ← Export toàn bộ hooks
│   │   ├── user.query-keys.ts                    ← Query key factory chuẩn: ["users", ...]
│   │   ├── use-users.ts                          ← Hook lấy danh sách có phân trang & lọc
│   │   ├── use-user-detail.ts                    ← Hook lấy chi tiết 1 user
│   │   ├── use-user-sessions.ts                  ← Hook lấy danh sách phiên & thu hồi phiên
│   │   └── use-user-mutations.ts                 ← Hook create, update, delete, restore, reset-pass
│   │
│   ├── components/features/users/                ← MỚI: Thư mục chứa components của trang
│   │   ├── user-kpi-cards.tsx                    ← 4 thẻ KPI thống kê nhanh trên đầu trang
│   │   ├── user-filter-toolbar.tsx               ← Thanh tìm kiếm debounced + Lọc Role + Lọc Status
│   │   ├── user-table.tsx                        ← Bảng dữ liệu Neumorphic + Cột Avatar, Role, 2FA
│   │   ├── user-table-skeleton.tsx               ← Skeleton shimmer khi đang tải dữ liệu
│   │   ├── user-empty-state.tsx                  ← Màn hình khi không tìm thấy kết quả
│   │   ├── user-row-actions.tsx                  ← Menu 3 chấm thao tác trên từng dòng
│   │   │
│   │   └── modals/                               ← Các modal & drawer tương tác
│   │       ├── create-user-modal.tsx             ← Modal thêm người dùng mới
│   │       ├── assign-user-role-modal.tsx        ← Modal gán vai trò RBAC
│   │       ├── admin-reset-password-modal.tsx    ← Modal đặt lại mật khẩu / cấp mật khẩu tạm
│   │       ├── edit-user-modal.tsx               ← Modal sửa thông tin (Tên, SĐT, Kích hoạt)
│   │       ├── user-sessions-drawer.tsx          ← Drawer xem phiên đăng nhập & đăng xuất từ xa
│   │       └── confirm-user-delete-modal.tsx     ← Modal xác nhận khóa / xóa / khôi phục
│   │
│   └── i18n/
│       ├── vi-VN.json                            ← SỬA: Thêm namespace "users.*"
│       └── en-US.json                            ← SỬA: Thêm namespace "users.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục trang tổng thể (12 cột, Responsive)
```
┌────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon Users + "Quản lý Người dùng" + Badge "Directory"      │
│            + Nút nổi Neumorphic: "+ Thêm người dùng mới"               │
├────────────────────────────────────────────────────────────────────────┤
│ [KPI CARDS] 4 cột (Mobile: 1-2 cột, Desktop: 4 cột)                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│ │ 👥 Tổng số   │ │ 🟢 Đang HĐ   │ │ 🛡️ Đã bật 2FA│ │ 🔒 Bị khóa   │   │
│ │    28        │ │    26        │ │ 18 (64%)     │ │    2         │   │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ [FILTER TOOLBAR]                                                       │
│ [ 🔍 Tìm tên, email, sđt... ] [ Lọc vai trò ▼ ] [ Trạng thái ▼ ] [ 🔄 ]│
├────────────────────────────────────────────────────────────────────────┤
│ [NEUMORPHIC DATA TABLE] (Hộp lõm chống mỏi mắt, viền gờ 3D nổi)       │
│ Avatar & Tên   | Email         | Vai trò   | Trạng thái | 2FA | Actions│
│ ────────────────────────────────────────────────────────────────────── │
│ 👤 Nguyễn Văn A| admin@ppe.vn  | [ADMIN]   | ● Active   | 🛡️ | [ ⋯ ]  │
│ 👤 Trần Thị B  | officer@ppe.vn| [OFFICER] | ● Active   | 🛡️ | [ ⋯ ]  │
│ 👤 Lê Văn C    | user@ppe.vn   | [USER]    | ⚠️ Inactive | ⚪ | [ ⋯ ]  │
├────────────────────────────────────────────────────────────────────────┤
│ [PAGINATION FOOTER]                                                    │
│ Hiển thị 1 - 10 / 28 người dùng       « Trang trước [ 1 ] 2 3 [Sau »]  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Quy chuẩn Thiết kế Neumorphic & Role Badges

* **Huy hiệu vai trò (Role Badges) phân biệt trực quan:**
  * `ADMIN`: Nổi đỏ/tím (`bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400`).
  * `SAFETY_MANAGER`: Cảnh báo cam (`bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400`).
  * `SAFETY_OFFICER`: Xanh lam an toàn (`bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400`).
  * `MANAGER`: Xanh ngọc (`bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400`).
  * `USER`: Xám tối giản (`bg-muted/50 text-muted-foreground border-border`).

* **Trạng thái tài khoản (Status Indicator):**
  * **Hoạt động (`isActive: true`):** Chấm xanh `emerald-500`, hiệu ứng phát sáng nhẹ `shadow-[0_0_6px_rgba(16,185,129,0.4)]`.
  * **Vô hiệu hóa (`isActive: false`):** Chấm xám `slate-400` + nhãn "Vô hiệu hóa".
  * **Tạm khóa do nhập sai (`lockedUntil` còn hạn):** Chấm vàng hổ phách `amber-500` + nhãn "Tạm khóa".
  * **Đã xóa mềm (`deletedAt != null`):** Chấm đỏ `rose-500` + nhãn "Đã xóa".

* **Bảo mật hai lớp (2FA):**
  * Đã bật: Icon `ShieldCheck` màu xanh ngọc + tooltip "Đã kích hoạt 2FA TOTP".
  * Chưa bật: Icon `ShieldAlert` màu xám mờ + tooltip "Chưa kích hoạt 2FA".

---

## 4. Ma trận phân quyền & Cơ chế bảo vệ (Anti-lockout Rules)

### 4.1 Permission Gating trên giao diện

| Vị trí / Nút bấm | Quyền yêu cầu | Xử lý khi không đủ quyền |
|---|---|---|
| **Toàn trang `/users`** | `USER_READ` | Route Guard chuyển sang trang `ForbiddenView` (403) |
| **Nút "+ Thêm người dùng"** | `USER_CREATE` | Ẩn hoàn toàn nút khỏi PageHeader |
| **Nút "Phân vai trò"** | `USER_ROLE_ASSIGN` | Ẩn mục này trong menu Actions |
| **Nút "Chỉnh sửa"** | `USER_UPDATE` | Ẩn mục này trong menu Actions |
| **Nút "Đặt lại mật khẩu"** | `USER_UPDATE` | Ẩn mục này trong menu Actions |
| **Nút "Khóa / Xóa"** | `USER_DELETE` | Ẩn mục này trong menu Actions |
| **Nút "Khôi phục tài khoản"**| `USER_RESTORE` hoặc `USER_DELETE` | Chỉ hiện khi xem danh sách `isDeleted: true` |

### 4.2 Các nguyên tắc chống tự khóa (Anti-Lockout Protection)
Để ngăn ngừa tình trạng Admin vô tình tự làm mất quyền quản trị của hệ thống:
1. **Không cho Admin tự xóa chính mình:** So sánh `user.id === currentAdmin.id`. Nếu trùng, vô hiệu hóa nút Xóa tài khoản (disable kèm tooltip giải thích).
2. **Không cho Admin tự đổi vai trò của chính mình:** Tránh trường hợp Admin tự giáng chức mình xuống `USER` dẫn đến hệ thống không còn người quản trị.
3. **Không cho Admin tự vô hiệu hóa / khóa tài khoản của mình:** Công tắc kích hoạt `isActive` bị disabled đối với dòng tài khoản hiện tại.

---

## 5. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/user.types.ts`)
* Tạo file `src/types/user.types.ts` chứa đầy đủ interface:
  - `UserResponseDto`: thông tin người dùng từ backend (id, email, fullName, avatarUrl, phoneNumber, role, isActive, twoFactorEnabled, lockedUntil, deletedAt...).
  - `UserQueryDto`: tham số tìm kiếm và lọc (`search`, `roleName`, `isActive`, `isDeleted`, `sortBy`, `order`, `page`, `limit`).
  - `CreateUserPayload`: dữ liệu tạo người dùng (`email`, `password`, `roleId`, `fullName`, `phoneNumber`, `mustChangePassword`).
  - `UpdateUserPayload`: dữ liệu cập nhật (`fullName`, `phoneNumber`, `isActive`).
  - `AdminResetPasswordPayload`: `{ newPassword?: string; mustChangePassword?: boolean }`.
  - `UserSessionDto` & `UserDeviceDto`: thông tin phiên làm việc và thiết bị.
  - `UserListResponse`: `{ data: UserResponseDto[]; meta: PaginationMeta }`.
* Re-export tại `src/types/index.ts`.

### Bước 2 — Tầng Service API (`src/services/user.service.ts`)
* Tạo `userService` với các hàm RESTful tương ứng:
  ```ts
  export const userService = {
    getUsers(params?: UserQueryDto): Promise<UserListResponse>,
    getUserById(id: string): Promise<UserResponseDto>,
    createUser(payload: CreateUserPayload): Promise<UserResponseDto>,
    updateUser(id: string, payload: UpdateUserPayload): Promise<UserResponseDto>,
    deleteUser(id: string): Promise<{ message: string }>,
    restoreUser(id: string): Promise<{ message: string }>,
    adminResetPassword(id: string, payload: AdminResetPasswordPayload): Promise<AdminResetPasswordResponseDto>,
    getUserSessions(id: string): Promise<UserSessionDto[]>,
    revokeUserSession(id: string, sessionId: string): Promise<{ message: string }>,
    revokeAllUserSessions(id: string): Promise<{ message: string }>,
    getUserDevices(id: string): Promise<UserDeviceDto[]>,
  };
  ```
* Lưu ý: Xử lý an toàn tầng unwrap axios (đảm bảo lấy đủ cả `data` và `meta` phục vụ phân trang).
* Re-export tại `src/services/index.ts`.

### Bước 3 — Tầng React Query Hooks (`src/hooks/users/`)
* **`user.query-keys.ts`**:
  ```ts
  export const userKeys = {
    all: ["users"] as const,
    lists: () => [...userKeys.all, "list"] as const,
    list: (params?: UserQueryDto) => [...userKeys.lists(), params] as const,
    details: () => [...userKeys.all, "detail"] as const,
    detail: (id: string) => [...userKeys.details(), id] as const,
    sessions: (id: string) => [...userKeys.detail(id), "sessions"] as const,
    devices: (id: string) => [...userKeys.detail(id), "devices"] as const,
  };
  ```
* **`use-users.ts`**: Hook `useUsers(params)` gọi `userService.getUsers` với `keepPreviousData: true` giúp chuyển trang không bị giật layout.
* **`use-user-mutations.ts`**:
  - `useCreateUser`: Gọi `userService.createUser`, invalidate `userKeys.lists()`, toast thông báo thành công.
  - `useUpdateUser`: Gọi `userService.updateUser`, invalidate list + detail.
  - `useDeleteUser` & `useRestoreUser`: Xóa mềm / Khôi phục tài khoản.
  - `useAdminResetPassword`: Đặt lại mật khẩu.
  - Tái sử dụng hook `useAssignUserRole` đã có trong `src/hooks/rbac/use-role-mutations.ts`.
* **`use-user-sessions.ts`**: Hook đọc và xóa session của user.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Thêm namespace `"users"` vào cả hai file [vi-VN.json](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/src/i18n/vi-VN.json) và [en-US.json](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/src/i18n/en-US.json):
* Tiêu đề trang, breadcrumb, subtitle.
* Tên các thẻ KPI: "Tổng người dùng", "Đang hoạt động", "Bật 2FA", "Tạm khóa".
* Cột trong bảng: "Người dùng", "Email / SĐT", "Vai trò", "Trạng thái", "Bảo mật", "Ngày tạo", "Thao tác".
* Nhãn modal: Thêm mới, Sửa thông tin, Gán vai trò, Reset mật khẩu, Xem phiên đăng nhập, Xác nhận xóa.
* Thông báo toast: Thành công, thất bại, cảnh báo anti-lockout.

### Bước 5 — Xây dựng các UI Components hiển thị
1. **`user-kpi-cards.tsx`**:
   - 4 card Neumorphic: Tính toán nhanh từ dữ liệu `meta.total` và các trạng thái user.
   - Thể hiện icon sinh động (`Users`, `UserCheck`, `ShieldCheck`, `UserX`).
2. **`user-filter-toolbar.tsx`**:
   - Ô Input tìm kiếm tích hợp `useDebounce` 350ms (chống spam request khi người dùng gõ phím).
   - Dropdown chọn Vai trò (tự động load danh sách role từ API `useRoles`).
   - Dropdown chọn Trạng thái (Tất cả, Đang hoạt động, Đã vô hiệu hóa, Đã xóa mềm).
   - Nút reset bộ lọc về mặc định.
3. **`user-table.tsx`**:
   - Table bề mặt lõm `nm-inset` nhẹ, viền phân cách mờ.
   - Hiển thị avatar tròn (hoặc chữ cái viết tắt nếu không có ảnh), tên in đậm, email màu muted.
   - Hiển thị Role Badge theo mã màu quy định.
   - Menu thao tác 3 chấm `user-row-actions.tsx` với cơ chế click-outside đóng dropdown an toàn.
4. **`user-table-skeleton.tsx` & `user-empty-state.tsx`**:
   - Khung xương shimmer giả lập 5 hàng khi đang fetching dữ liệu.
   - Empty state tinh tế khi tìm kiếm không ra kết quả kèm nút "Xóa bộ lọc".

### Bước 6 — Xây dựng các Modal & Drawer tương tác nghiệp vụ
1. **`create-user-modal.tsx`**:
   - Form Neumorphic: Email, Mật khẩu, Họ tên, Số điện thoại, Chọn Role ban đầu.
   - Checkbox: "Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên" (`mustChangePassword`).
   - Validation kiểm tra định dạng email và checklist độ mạnh mật khẩu theo thời gian thực.
2. **`assign-user-role-modal.tsx`**:
   - Hiển thị role hiện tại của người dùng.
   - Danh sách Radio / Select chọn role mới kèm mô tả quyền hạn tóm tắt của role đó.
   - Cảnh báo màu vàng nổi bật nếu gán quyền `ADMIN`.
3. **`admin-reset-password-modal.tsx`**:
   - Tabs: "Tự nhập mật khẩu mới" hoặc "Hệ thống tự tạo mật khẩu ngẫu nhiên".
   - Sau khi reset thành công, hiển thị ô mật khẩu tạm thời kèm nút **Sao chép** 1-click để gửi cho nhân viên.
4. **`user-sessions-drawer.tsx`**:
   - Drawer trượt từ cạnh phải màn hình.
   - Danh sách các phiên đăng nhập: IP, Hệ điều hành, Trình duyệt, Thời gian đăng nhập cuối.
   - Nút "Thu hồi phiên này" và nút "Đăng xuất khỏi tất cả thiết bị".
5. **`confirm-user-delete-modal.tsx`**:
   - Hộp thoại cảnh báo Neumorphic màu đỏ: Xác nhận khóa/xóa mềm tài khoản.
   - Có cơ chế kiểm tra Anti-lockout (không cho phép xóa chính tài khoản Admin đang login).

### Bước 7 — Lắp ráp trang chính (`app/(auth)/users/users-content.tsx`)
* Thay thế nội dung placeholder tạm thời bằng toàn bộ các khối chức năng trên.
* Quản lý state tập trung: `search`, `roleName`, `isActive`, `page`, `limit`, và state mở các modal (`selectedUserForRole`, `selectedUserForResetPass`, `selectedUserForSessions`, `selectedUserForDelete`).
* Đảm bảo layout cuộn mượt mà, responsive tốt trên cả điện thoại (thanh menu hamburger không che khuất bảng).

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
* Kiểm thử các kịch bản theo role:
  1. Login Admin (`admin@ppe.local`) -> Vào `/users` -> Thấy đầy đủ giao diện, KPI, dữ liệu.
  2. Tạo mới 1 user -> Thấy xuất hiện trong bảng.
  3. Đổi role của user đó từ `USER` sang `SAFETY_OFFICER` -> Kiểm tra role badge cập nhật.
  4. Đăng nhập bằng tài khoản vừa đổi role -> Kiểm tra xem menu Sidebar có tự mở rộng thêm các mục Giám sát không.
  5. Thử tự xóa chính tài khoản Admin -> Kiểm tra nút bấm bị chặn và cảnh báo.
  6. Login bằng `officer@ppe.local` -> Gõ link `/users` -> Kiểm tra Route Guard 403 hoạt động chuẩn xác.

---

## 6. Ma trận xử lý lỗi (Error Matrix)

| Mã lỗi | Nguyên nhân | Phản hồi giao diện trên trang /users |
|---|---|---|
| **401 Unauthorized** | Phiên Admin hết hạn | Interceptor tự động refresh single-flight; nếu thất bại tự redirect về `/login`. |
| **403 Forbidden** | User không đủ quyền `USER_READ` | Route Guard tự động hiển thị component `ForbiddenView` (403), không crash trang. |
| **409 Duplicate Email** | Email đã được đăng ký trước đó | Form Create User báo lỗi đỏ ngay dưới ô Email: "Email này đã được sử dụng". |
| **400 Bad Request** | Mật khẩu yếu hoặc UUID không hợp lệ | Hiển thị thông báo lỗi chi tiết từ validation của backend qua Toast. |
| **404 User Not Found** | User đã bị xóa vĩnh viễn ở DB | Đóng modal, tự động invalidate lại danh sách `userKeys.lists()`, toast cảnh báo. |
| **Anti-lockout Violation**| Admin cố tình hạ quyền hoặc xóa chính mình | Chặn ngay tại Client UI (disabled nút) + Toast cảnh báo an toàn. |

---

## 7. Checklist hoàn thiện

- [ ] `src/types/user.types.ts`: Khai báo đủ DTOs, Query params và Response types.
- [ ] `src/services/user.service.ts`: Viết đủ 12 endpoint của identity-service.
- [ ] `src/hooks/users/`: Hoàn thành `useUsers`, `useUserMutations`, `useUserSessions`.
- [ ] `src/i18n/`: Đầy đủ nhãn tiếng Việt (`vi-VN.json`) và tiếng Anh (`en-US.json`).
- [ ] `src/components/features/users/`: Hoàn thành 4 thẻ KPI thống kê.
- [ ] `src/components/features/users/`: Hoàn thành Toolbar lọc (Search debounce, Role, Status).
- [ ] `src/components/features/users/`: Hoàn thành Bảng Neumorphic + Role Badges + Actions menu.
- [ ] `src/components/features/users/modals/`: Hoàn thành Modal Create, Assign Role, Reset Password, Sessions Drawer, Confirm Delete.
- [ ] Cơ chế Anti-lockout: Chặn Admin tự thao tác lên chính tài khoản của mình.
- [ ] `users-content.tsx`: Lắp ráp hoàn chỉnh, không còn code placeholder.
- [ ] Kiểm thử E2E: Test thành công luồng tạo user mới -> gán vai trò -> đăng nhập bằng user mới.
