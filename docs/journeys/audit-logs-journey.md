# Hành trình xây dựng Trang Nhật ký Kiểm toán & Truy vết An ninh (/audit-logs) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Nhật ký Kiểm toán & Truy vết An ninh Hệ thống (`/audit-logs`) thuộc nhóm Quản trị Hệ thống (`admin`) sau đăng nhập — theo dõi toàn diện lịch sử thay đổi cấu hình, thao tác phê duyệt sự cố PPE, biến động tài khoản và phân quyền, truy vết địa chỉ IP & thiết bị người dùng, kiểm tra chi tiết thay đổi (JSON Diff Before/After) và trích xuất dữ liệu tuân thủ chuẩn pháp lý (Export CSV/JSON).  
> **Nguồn contract:** Backend `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/audit-logs`).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [users-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/users-journey.md) | [system-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/system-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền xem nhật ký, xem chi tiết diff, xem timeline tài nguyên, trích xuất báo cáo kiểm toán CSV/JSON)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — có quyền xem nhật ký kiểm toán và xuất báo cáo phục vụ thanh tra an toàn)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /audit-logs](#0-mục-tiêu--định-vị-trang-audit-logs)
1. [Khảo sát Backend Contract (identity-service audit module)](#1-khảo-sát-backend-contract-identity-service-audit-module)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Bất biến (WORM), JSON Diff & Timeline Truy vết](#4-cơ-chế-kỹ-thuật-cốt-lõi-bất-biến-worm-json-diff--timeline-truy-vết)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/audit.types.ts)](#bước-1--tầng-dtos--types-srctypesaudittypests)
   - [Bước 2 — Tầng Service API (src/services/audit.service.ts)](#bước-2--tầng-service-api-srcservicesauditservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/audit/)](#bước-3--tầng-react-query-hooks-srchooksaudit)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị Neumorphism](#bước-5--xây-dựng-các-ui-components-hiển-thị-neumorphism)
   - [Bước 6 — Xây dựng Modal Chi tiết Diff & Hộp thoại Xuất Báo cáo](#bước-6--xây-dựng-modal-chi-tiết-diff--hộp-thoại-xuất-báo-cáo)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/audit-logs/audit-logs-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthaudit-logsaudit-logs-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /audit-logs

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Trang `/audit-logs` (**Nhật ký Kiểm toán An ninh & Vận hành**) đóng vai trò là chiếc "hộp đen" pháp lý của toàn bộ hệ sinh thái giám sát an toàn lao động. Trong các khu công nghiệp, công trường xây dựng và nhà máy sản xuất, việc truy cứu trách nhiệm khi xảy ra sự cố tai nạn đòi hỏi dữ liệu minh bạch, không thể bị xóa sửa hay chối bỏ (Non-repudiation). Trang này giải quyết 4 bài toán trọng yếu:

1. **Tính Bất biến & Chống Giả mạo Dữ liệu (WORM - Write Once, Read Many):** Mọi hành động nhạy cảm trong hệ thống (thay đổi quy tắc an toàn PPE, xác nhận/bác bỏ sự cố vi phạm của AI, gán vai trò nhân sự, thay đổi tham số hệ thống) đều được ghi nhận vĩnh viễn vào nhật ký kiểm toán. Hoàn toàn không có thao tác xóa hoặc chỉnh sửa bản ghi nhật ký.
2. **Minh bạch Biến động Dữ liệu (Fine-Grained JSON Diff):** Không chỉ lưu lại ai làm gì, hệ thống lưu giữ chính xác trạng thái trước (`oldValue`) và trạng thái sau (`newValue`) của từng thực thể, cho phép thanh tra viên an toàn nhìn thấy tức thì giá trị nào bị thay đổi với màu sắc trực quan (đỏ xóa / xanh thêm).
3. **Truy vết Pháp lý & Định danh Thiết bị (Device & Forensic Traceability):** Từng bản ghi kiểm toán ghi nhận chính xác: Tài khoản thực hiện (User ID, Email, Họ tên), Vai trò lúc thực hiện (Role), Địa chỉ IP nguồn, Chuỗi nhận diện trình duyệt/OS (User-Agent), và Mã sự cố / Tài nguyên liên quan (`targetType`, `targetId`).
4. **Phục vụ Kiểm toán & Tuân thủ An toàn Lao động (Safety Compliance Export):** Cung cấp công cụ xuất báo cáo kiểm toán định dạng CSV và JSON theo khoảng thời gian tùy chọn, đáp ứng tiêu chuẩn thanh tra của cơ quan quản lý an toàn vệ sinh lao động (OSHA/Bộ LĐ-TB&XH).

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Thống kê KPI Hoạt động Kiểm toán (Bento Summary):** 4 thẻ chỉ số: Tổng số hành động kiểm toán trong kỳ, Thao tác thay đổi cấu hình, Lượt thẩm duyệt vi phạm PPE, Tỷ lệ thao tác thành công (`SUCCESS` vs `FAILURE`).
  2. **Bộ lọc Nhanh Chuyên biệt (Quick View Presets):**
     - Tab Tất cả nhật ký (`/audit-logs`)
     - Tab Thay đổi Cấu hình Hệ thống (`/config-changes`)
     - Tab Thẩm duyệt Sự cố Vi phạm PPE (`/incident-reviews`)
  3. **Thanh Công cụ Lọc Đa tiêu chí (Advanced Filter Toolbar):**
     - Tìm kiếm từ khóa theo Người thực hiện, Mô tả hành động, IP nguồn.
     - Lọc theo Hành động: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `ASSIGN_ROLE`, `REVIEW_INCIDENT`, `TOGGLE_FEATURE`, v.v.
     - Lọc theo Loại tài nguyên (`targetType`): `USER`, `ROLE`, `PPE_INCIDENT`, `CAMERA`, `SITE`, `SAFETY_RULE`, `SYSTEM_CONFIG`.
     - Lọc theo Trạng thái thực thi (`SUCCESS`, `FAILED`).
     - Chọn khoảng thời gian (Từ ngày - Đến ngày).
  4. **Bảng Dữ liệu Neumorphic hiển thị Nhật ký:** Cột thời gian định dạng chuẩn, huy hiệu người dùng + vai trò, badge hành động màu sắc trực quan, tài nguyên tác động, IP, và nút "Xem chi tiết Diff".
  5. **Drawer / Modal So sánh Thay đổi (JSON Diff Viewer):**
     - Hiển thị so sánh song song 2 cột (Side-by-side) hoặc dạng gộp (Unified diff) giữa `oldValue` và `newValue`.
     - Hiển thị thông tin siêu dữ liệu (Metadata, Request ID, User-Agent, Thời gian mili-giây).
  6. **Modal Xuất Báo cáo Kiểm toán (Export Modal):** Chọn định dạng xuất (CSV / JSON), lọc khoảng ngày, tải trực tiếp về máy người dùng.
  7. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không cung cấp bất kỳ API hoặc nút bấm nào để SỬA (`PUT/PATCH`) hoặc XÓA (`DELETE`) bản ghi nhật ký kiểm toán (nguyên tắc an toàn dữ liệu WORM).
  - Không can thiệp vào cơ chế ghi log tự động bên trong các interceptor/middleware của backend.

---

## 1. Khảo sát Backend Contract (identity-service audit module)

Các endpoint dưới đây đã được triển khai hoàn chỉnh trong `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik `/api/v1/audit-logs`):
- Controller: [audit.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/audit/audit.controller.ts)
- Routes: [audit.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/audit/audit.route.ts)
- DTOs: [audit.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/audit/audit.dto.ts)
- Constants: [audit.constant.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/audit/audit.constant.ts) & [audit-log.constant.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/common/constants/audit-log.constant.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Thống kê KPI** | `GET` | `/api/v1/audit-logs/summary` | `AUDIT_LOG_READ` | Query: `fromDate, toDate, siteId?` | `{ success: true, data: AuditSummaryDto }` |
| **Lọc Đổi Cấu hình**| `GET` | `/api/v1/audit-logs/config-changes` | `AUDIT_LOG_READ` | Query: `page, limit, fromDate, toDate` | `{ success: true, data: AuditLogItemDto[], meta: PaginationMeta }` |
| **Lọc Duyệt Sự cố** | `GET` | `/api/v1/audit-logs/incident-reviews` | `AUDIT_LOG_READ` | Query: `page, limit, fromDate, toDate` | `{ success: true, data: AuditLogItemDto[], meta: PaginationMeta }` |
| **Xuất Báo cáo** | `GET` | `/api/v1/audit-logs/export` | `AUDIT_LOG_EXPORT` hoặc `AUDIT_LOG_READ` | Query: `format: 'csv'\|'json', fromDate, toDate, action?, targetType?` | File Download Stream (text/csv hoặc application/json) |
| **Timeline Tài nguyên**| `GET` | `/api/v1/audit-logs/resource/:targetType/:targetId` | `AUDIT_LOG_READ` | Params: `targetType, targetId`, Query: `page, limit` | `{ success: true, data: AuditLogItemDto[], meta: PaginationMeta }` |
| **Chi tiết 1 Bản ghi**| `GET` | `/api/v1/audit-logs/:id` | `AUDIT_LOG_READ` | Params: `id (UUID)` | `{ success: true, data: AuditLogDetailDto }` |
| **Danh sách Toàn bộ** | `GET` | `/api/v1/audit-logs` | `AUDIT_LOG_READ` | Query: `page, limit, userId, action, targetType, targetId, status, fromDate, toDate, search, sortBy, sortOrder` | `{ success: true, data: AuditLogItemDto[], meta: PaginationMeta }` |

### 1.2 Cấu trúc Bản ghi Chi tiết (AuditLogDetailDto)
```typescript
export interface AuditLogDetailDto {
  id: string;
  userId: string | null;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: string;             // Ví dụ: 'UPDATE_CONFIG', 'CONFIRM_INCIDENT', 'ASSIGN_ROLE'
  targetType: string;         // Ví dụ: 'SYSTEM_CONFIG', 'PPE_INCIDENT', 'USER'
  targetId: string | null;
  status: "SUCCESS" | "FAILED";
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;          // ISO UTC
}
```

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/audit-logs/
│   ├── page.tsx                                      ← Server Component bọc Suspense (đã có)
│   └── audit-logs-content.tsx                        ← NÂNG CẤP: Lắp ráp giao diện Nhật ký Kiểm toán hoàn chỉnh
│
├── src/
│   ├── types/
│   │   ├── audit.types.ts                            ← MỚI: DTOs, Enums, Query Params, Diff Types, Summary Types
│   │   └── index.ts                                  ← SỬA: Re-export audit.types.ts
│   │
│   ├── services/
│   │   ├── audit.service.ts                          ← MỚI: Client gọi 7 endpoints của identity-service audit module
│   │   └── index.ts                                  ← SỬA: Re-export audit.service.ts
│   │
│   ├── hooks/audit/                                  ← MỚI: Thư mục hooks quản lý kiểm toán
│   │   ├── index.ts                                  ← Export toàn bộ hooks
│   │   ├── audit.query-keys.ts                       ← Quản lý Query Keys chuẩn
│   │   ├── use-audit-logs.ts                         ← Lấy danh sách kiểm toán có phân trang, lọc và debounce search
│   │   ├── use-audit-summary.ts                      ← Lấy số liệu thống kê KPI
│   │   ├── use-audit-detail.ts                       ← Lấy chi tiết bản ghi & cấu trúc diff
│   │   └── use-export-audit-logs.ts                  ← Mutation kích hoạt tải file CSV/JSON
│   │
│   ├── components/features/audit-logs/               ← MỚI: UI Components Neumorphism
│   │   ├── audit-kpi-summary.tsx                     ← 4 thẻ Bento Console thống kê nhanh
│   │   ├── audit-tabs.tsx                            ← Thanh Tab: [Tất cả nhật ký] [Thay đổi cấu hình] [Duyệt sự cố PPE]
│   │   ├── audit-filter-toolbar.tsx                  ← Thanh tìm kiếm, lọc hành động, lọc loại tài nguyên, lọc ngày, nút Xuất báo cáo
│   │   ├── audit-log-table.tsx                       ← Bảng danh sách nhật ký Neumorphic có phân trang
│   │   ├── audit-action-badge.tsx                    ← Huy hiệu hiển thị loại hành động (Create: Xanh, Delete: Đỏ, Update: Vàng, Login: Tím)
│   │   ├── audit-diff-viewer.tsx                     ← Thành phần trực quan so sánh oldValue vs newValue (JSON Diff)
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── audit-detail-drawer.tsx               ← Drawer trượt từ phải sang xem chi tiết bản ghi, thiết bị và diff
│   │       └── export-audit-dialog.tsx               ← Hộp thoại chọn format (CSV/JSON) và khoảng ngày xuất
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "audit.*"
│       └── en-US.json                                ← Bổ sung namespace "audit.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục trang tổng thể (12 cột, Responsive)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon ShieldCheck + "Nhật ký Kiểm toán & An ninh" + Badge "IMMUTABLE WORM"  │
│            + [ Nút: "📥 Xuất dữ liệu kiểm toán (CSV/JSON)" ]  [ Nút: "🔄 Làm mới" ]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BENTO CONSOLE KPI CARDS] (4 cột desktop, 2 cột tablet, 1 cột mobile)                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│ │ 📋 Tổng nhật ký │ │ ⚙️ Đổi cấu hình │ │ 🛡️ Duyệt sự cố PPE│ │ ✅ Thành công % │           │
│ │     1,842      │ │       84       │ │      612       │ │     99.4%      │           │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [NEUMORPHIC TABS]                                                                      │
│ [ 📜 Tất cả Nhật ký (1,842) ]  [ ⚙️ Thay đổi Cấu hình (84) ]  [ 🚨 Thẩm duyệt Sự cố (612) ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [FILTER TOOLBAR]                                                                       │
│ [ 🔍 Tìm người dùng, IP, mô tả... ] [ Hành động ▼ ] [ Loại tài nguyên ▼ ] [ Khoảng ngày ▼ ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BẢNG DANH SÁCH NHẬT KÝ NEUMORPHIC]                                                    │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Thời gian      │ Người thực hiện     │ Hành động     │ Tài nguyên  │ Trạng thái│ IP │ │
│ ├────────────────┼─────────────────────┼───────────────┼─────────────┼───────────┼────┤ │
│ │ 28/10 03:15:22 │ admin@ppe.local     │ UPDATE_CONFIG │ SYSTEM_CONF │ 🟢 SUCCESS│..x │ │
│ │ 28/10 03:02:10 │ officer@ppe.local   │ CONFIRM_INCID │ INCIDENT-01 │ 🟢 SUCCESS│..x │ │
│ │ 28/10 02:40:55 │ Unknown IP (Failed) │ LOGIN_ATTEMPT │ AUTH        │ 🔴 FAILED │..x │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ [PAGINATION FOOTER]: Hiển thị 1 - 10 trên 1,842 bản ghi    « [ 1 ] 2 3 4 5 .. 185 »    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Quy chuẩn Trực quan Thẻ Hành động (Action Badges)
- **`CREATE` / `REGISTER` / `UPLOAD`:** Màu xanh ngọc lục bảo (`bg-success/10 text-success border-success/30`).
- **`UPDATE` / `ASSIGN_ROLE` / `TOGGLE_FEATURE`:** Màu hổ phách (`bg-warning/10 text-warning border-warning/30`).
- **`DELETE` / `REVOKE` / `LOCK_ACCOUNT`:** Màu đỏ thẩm quyền (`bg-danger/10 text-danger border-danger/30`).
- **`LOGIN` / `LOGOUT` / `2FA_VERIFY`:** Màu tím lam (`bg-info/10 text-info border-info/30`).
- **`REVIEW_INCIDENT` (CONFIRM/DISMISS):** Màu cam an toàn lao động (`bg-orange-500/10 text-orange-500 border-orange-500/30`).

---

## 4. Cơ chế kỹ thuật cốt lõi: Bất biến (WORM), JSON Diff & Timeline Truy vết

### 4.1 Cơ chế Hiển thị JSON Diff Thông minh
Khi mở Drawer xem chi tiết một hành động cập nhật (`UPDATE`):
1. Client bóc tách `oldValue` và `newValue` từ bản ghi `AuditLogDetailDto`.
2. Hệ thống duyệt qua tập hợp các khóa (keys) của cả 2 đối tượng:
   - Nếu key chỉ có trong `oldValue`: Đánh dấu là trường đã bị XÓA (màu đỏ gạch, kèm biểu tượng trừ `-`).
   - Nếu key chỉ có trong `newValue`: Đánh dấu là trường MỚI THÊM (màu xanh lá, kèm biểu tượng cộng `+`).
   - Nếu key có trong cả hai nhưng giá trị khác nhau: Hiển thị 2 dòng: giá trị cũ (gạch ngang màu đỏ) -> giá trị mới (tô sáng màu xanh).
   - Nếu key có giá trị không đổi: Ẩn đi hoặc làm mờ để người dùng tập trung vào phần biến động.

### 4.2 Xuất Báo cáo Luồng Trực tiếp (Direct Stream Download)
Hook `useExportAuditLogs` gọi trực tiếp endpoint `/api/v1/audit-logs/export` với `responseType: 'blob'`:
- Tự động bắt tiêu đề `Content-Disposition` để lấy tên file chuẩn: `audit_logs_YYYY-MM-DD.csv` hoặc `.json`.
- Sử dụng URL đối tượng ảo `window.URL.createObjectURL(blob)` để kích hoạt trình tải về của trình duyệt an toàn không bị chặn bởi pop-up blocker.
- Hiển thị thanh tiến trình giả lập (Spinner) trong suốt quá trình server tổng hợp dữ liệu xuất.

---

## 5. Ma trận phân quyền & RBAC Access Control

Route `/audit-logs` yêu cầu quyền `AUDIT_LOG_READ`. Thao tác xuất file yêu cầu thêm quyền `AUDIT_LOG_EXPORT`.

| Vai trò | Xem Danh sách & Filter | Xem Chi tiết JSON Diff | Xem Timeline Tài nguyên | Xuất file CSV/JSON |
|---|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có | ✅ Có (`AUDIT_LOG_EXPORT`) |
| **SAFETY_MANAGER** | ✅ Có quyền | ✅ Có | ✅ Có | ✅ Có (`AUDIT_LOG_READ`) |
| **SAFETY_OFFICER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/audit.types.ts`)
- Định nghĩa `AuditLogItem`, `AuditLogDetail`, `AuditSummaryDto`, `AuditLogQuery`.
- Enum `AuditAction`: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `REVIEW_INCIDENT`, `ASSIGN_ROLE`, v.v.
- Enum `AuditTargetType`: `USER`, `ROLE`, `PPE_INCIDENT`, `CAMERA`, `SITE`, `SYSTEM_CONFIG`, `SESSION`.

### Bước 2 — Tầng Service API (`src/services/audit.service.ts`)
Tạo `auditService` bao bọc các hàm API:
- `getLogs(params?: AuditLogQuery)`
- `getSummary(params?: { fromDate?: string; toDate?: string; siteId?: string })`
- `getConfigChanges(params?: PaginationParams)`
- `getIncidentReviews(params?: PaginationParams)`
- `getLogDetail(id: string)`
- `getResourceTrail(targetType: string, targetId: string)`
- `exportLogs(params: ExportAuditParams): Promise<Blob>`

### Bước 3 — Tầng React Query Hooks (`src/hooks/audit/`)
- `audit.query-keys.ts`: Factory quản lý query keys: `auditKeys.all`, `auditKeys.list(filters)`, `auditKeys.summary(filters)`, `auditKeys.detail(id)`.
- `use-audit-logs.ts`: Hook lấy danh sách nhật ký kèm debounce search và filter state.
- `use-audit-summary.ts`: Hook lấy số liệu 4 thẻ Bento Console.
- `use-audit-detail.ts`: Hook lấy dữ liệu chi tiết khi người dùng bấm vào dòng trong bảng.
- `use-export-audit-logs.ts`: Hook mutation xử lý gọi API xuất file và kích hoạt tải về.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật `vi-VN.json` và `en-US.json`:
- `audit.title`, `audit.description`, `audit.kpi.*`
- `audit.tabs.*` (all, configChanges, incidentReviews)
- `audit.table.*` (timestamp, user, action, target, status, ip, actions)
- `audit.drawer.*` (details, diffBefore, diffAfter, metadata, userAgent)
- `audit.export.*` (format, dateRange, downloading, success)

### Bước 5 — Xây dựng các UI Components hiển thị Neumorphism
- `audit-kpi-summary.tsx`: 4 thẻ Bento Console với icon bảo mật và thanh đo trực quan.
- `audit-filter-toolbar.tsx`: Thanh điều khiển Neumorphic chứa Input tìm kiếm debounced, các Select menu lọc loại hành động và khoảng ngày.
- `audit-log-table.tsx`: Bảng dữ liệu Neumorphic với hàng hover tương tác, phân trang đầy đủ.
- `audit-diff-viewer.tsx`: Bộ so sánh trực quan old vs new với syntax highlight nhẹ nhàng.

### Bước 6 — Xây dựng Modal Chi tiết Diff & Hộp thoại Xuất Báo cáo
- `audit-detail-drawer.tsx`: Drawer trượt mượt mà từ bên phải, hiển thị thông tin phiên, IP, hệ điều hành và khối JSON Diff.
- `export-audit-dialog.tsx`: Hộp thoại chọn định dạng xuất file (Radio CSV hoặc JSON) kèm nút xác nhận xuất.

### Bước 7 — Lắp ráp trang chính (`app/(auth)/audit-logs/audit-logs-content.tsx`)
Thay thế placeholder hiện tại bằng component hoàn chỉnh kết nối toàn bộ Hooks, Summary, Filter Toolbar, Table và Drawer.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm tra hiển thị bảng trên Mobile: tự động ẩn bớt các cột phụ (IP, User Agent) và ưu tiên hiển thị Cột Hành động + Thời gian.
- Kiểm tra tính toàn vẹn của file tải về khi xuất CSV (tiếng Việt có dấu UTF-8 BOM hiển thị chuẩn trong Microsoft Excel).
- Kiểm tra chặn quyền 403 đối với các tài khoản không có quyền `AUDIT_LOG_READ`.

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Khoảng ngày tìm kiếm không hợp lệ (Từ ngày > Đến ngày) | Hiển thị cảnh báo inline dưới ô chọn ngày, chặn submit |
| **401 Unauthorized**| Hết hạn phiên làm việc khi đang xem trang | Chuyển hướng về `/login` |
| **403 Forbidden**   | Cán bộ an toàn hoặc người dùng thông thường truy cập | Hiển thị màn hình 403 Forbidden kèm nút quay về Dashboard |
| **404 Not Found**   | Bản ghi audit log ID không tồn tại | Đóng Drawer và thông báo Toast "Không tìm thấy chi tiết bản ghi này" |
| **500 Server Error**| Lỗi cơ sở dữ liệu khi tổng hợp file export | Hiển thị Toast lỗi "Không thể xuất báo cáo kiểm toán lúc này. Vui lòng thử lại sau" |
| **Network Failure** | Đứt kết nối khi đang tải danh sách | Hiển thị Error State với nút "Thử lại" (Retry) |

---

## 8. Checklist hoàn thiện nghiệm thu

- [x] Route `/audit-logs` được bảo vệ bằng Route Guard với quyền `AUDIT_LOG_READ`.
- [x] 4 thẻ Bento Console hiển thị đúng số liệu thống kê từ API `/api/v1/audit-logs/summary`.
- [x] Thẻ KPI Neumorphic tương tác cao: hiệu ứng lún sâu (sunken effect) khi chọn, footer "Xem chi tiết v" / "Thu gọn ^", đồng bộ URL query `?stat=total-logs|config-changes|incident-reviews|success-rate`.
- [x] Khung chi tiết mở rộng `AuditStatsDetailPanel` mở ra ngay dưới stats với 4 góc nhìn chuyên sâu: Phân tích WORM & phân bổ hành động, Biến động cấu hình có đối chiếu JSON Diff, Thống kê thẩm duyệt sự cố PPE của Cán bộ an toàn, và Chẩn đoán an ninh & điều tra lỗi truy cập bất thường (Forensic Failed Logs).
- [x] Chuyển đổi mượt mà giữa 3 Tab: Tất cả, Thay đổi Cấu hình, và Thẩm duyệt Sự cố PPE kèm đồng bộ URL `?tab=...`.
- [x] Bộ lọc Hành động, Loại tài nguyên (`targetType`), Trạng thái (`SUCCESS`/`FAILED`), Tìm kiếm debounce và Nút "Đặt lại bộ lọc".
- [x] Bộ phân trang `AuditLogTable` đầy đủ: hiển thị bản ghi hiện tại, nút Trước/Sau, chọn số lượng bản ghi mỗi trang (10, 20, 50, 100).
- [x] Drawer Chi tiết hiển thị rõ ràng thông tin người dùng, IP, User-Agent và bộ so sánh JSON Diff (old vs new).
- [x] Tính năng Xuất báo cáo tải về thành công file CSV và JSON định dạng chuẩn.
- [x] Tuyệt đối không có hành động sửa hoặc xóa bản ghi kiểm toán trên giao diện (Tuân thủ nguyên tắc WORM).
- [x] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) đồng bộ 100%.
- [x] Giao diện Neumorphic thẩm mỹ cao, tương thích hoàn hảo Dark Mode và Light Mode.
