# Hành trình xây dựng Trang Quản trị Cấu hình & Hạ tầng Hệ thống (/system) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Quản trị Cấu hình & Vận hành Hạ tầng (`/system`) thuộc nhóm Quản trị Hệ thống (`admin`) sau đăng nhập — quản lý danh mục cấu hình động (Dynamic System Configs), bảng điều khiển công tắc tính năng (Feature Flags Hot-toggle), ma trận giám sát sức khỏe dịch vụ (Service Health & Infrastructure Matrix), thông số bảo mật vận hành và thông tin phiên bản phần mềm.  
> **Nguồn contract:** Backend `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/system`) và Health Check API của các Microservices trong cụm Docker.  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [users-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/users-journey.md) | [audit-logs-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/audit-logs-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền xem và thay đổi cấu hình hệ thống, toggle feature flags, xem ma trận health check)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — chỉ có quyền xem cấu hình phục vụ vận hành, không được chỉnh sửa)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /system](#0-mục-tiêu--định-vị-trang-system)
1. [Khảo sát Backend Contract (identity-service & Infra Health)](#1-khảo-sát-backend-contract-identity-service--infra-health)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Hot-toggle, Cache Invalidation & System Diagnostic](#4-cơ-chế-kỹ-thuật-cốt-lõi-hot-toggle-cache-invalidation--system-diagnostic)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/system.types.ts)](#bước-1--tầng-dtos--types-srctypessystemtypests)
   - [Bước 2 — Tầng Service API (src/services/system.service.ts)](#bước-2--tầng-service-api-srcservicessystemservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/system/)](#bước-3--tầng-react-query-hooks-srchookssystem)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị Neumorphism](#bước-5--xây-dựng-các-ui-components-hiển-thị-neumorphism)
   - [Bước 6 — Xây dựng các Modal & Drawer tương tác nghiệp vụ](#bước-6--xây-dựng-các-modal--drawer-tương-tác-nghiệp-vụ)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/system/system-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthsystemsystem-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /system

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Trang `/system` (**Trung tâm Cấu hình & Vận hành Hạ tầng**) là đầu mối kiểm soát kỹ thuật cao nhất của nền tảng Smart PPE Monitoring. Hệ thống bao gồm 8 microservices, message broker Kafka, lưu trữ MinIO và cơ sở dữ liệu PostgreSQL. Trang này giải quyết 4 bài toán quản trị chiến lược:

1. **Quản trị Biến cấu hình Động (Runtime Dynamic Configuration):** Thay vì phải sửa file `.env` và restart lại các container docker trong quá trình nhà máy đang vận hành (gây gián đoạn giám sát an toàn), Admin có thể điều chỉnh các tham số hệ thống ngay trên giao diện (thời gian sống token, ngưỡng cảnh báo, giới hạn kích thước upload, múi giờ mặc định).
2. **Công tắc Tính năng Tức thời (Instant Feature Flags Hot-toggle):** Cho phép bật/tắt an toàn các module mà không cần deploy lại mã nguồn: bật/tắt đăng ký tự do (`feature.registration.enabled`), module gửi thông báo (`feature.notifications.enabled`), cổng tích hợp webhooks (`feature.webhooks.enabled`), và kênh phân tích AI (`feature.ai.enabled`).
3. **Giám sát Sức khỏe Dịch vụ Thời gian thực (Microservices Health Matrix):** Hiển thị bảng điều khiển nhịp tim (Heartbeat & Latency) của tất cả 8 microservices và hạ tầng phụ trợ (PostgreSQL, Kafka, MinIO, Redis, Traefik). Khi có dịch vụ bị gián đoạn hoặc phản hồi chậm quá 500ms, hệ thống lập tức báo động đỏ.
4. **Đồng bộ & Bàn giao Trạng thái Cache (Cache Invalidation & Audit Sync):** Mọi thao tác chỉnh sửa tham số cấu hình hoặc bật/tắt cờ tính năng đều được tự động lưu vết vào hệ thống Audit Log (`smart-ppe-identity-service`) với đầy đủ diff trước/sau để phục vụ hậu kiểm.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Thống kê KPI Vận hành (Bento Console):** 4 thẻ thống kê: Tổng số cấu hình đang kích hoạt, Trạng thái sức khỏe cụm dịch vụ (Healthy/Degraded/Down), Tỷ lệ uptime hệ thống, Số lượng Feature Flags đang bật.
  2. **Bảng điều khiển Feature Flags (Neumorphic Switch Grid):** Thẻ trực quan cho từng cờ tính năng, mô tả công năng, tác động khi bật/tắt, kèm công tắc chuyển trạng thái tức thì có xác nhận an toàn.
  3. **Bảng Quản lý Biến cấu hình (System Configuration Grid):**
     - Phân loại theo 4 danh mục chuẩn: `GENERAL` (Chung), `SECURITY` (Bảo mật & Phiên), `INTEGRATION` (Tích hợp MinIO, Kafka, Mail, SMS), `FEATURE_FLAG`.
     - Tìm kiếm theo key hoặc mô tả; lọc theo Category và trạng thái Public/Private.
     - Modal tạo mới cấu hình, Modal chỉnh sửa giá trị (hỗ trợ nhập String, Number, Boolean, JSON object có validation cú pháp).
     - Hộp thoại cảnh báo rủi ro khi xóa cấu hình hệ thống.
  4. **Ma trận Giám sát Hạ tầng & Dịch vụ (Health Check Matrix):**
     - Bảng trạng thái nhịp tim của 8 microservices: `identity-service` (9999), `camera-service` (8881), `site-service` (8882), `incident-service` (8883), `media-service` (8884), `reporting-service` (8885), `notification-service` (8889), `ai-service` (8000).
     - Trạng thái kết nối phụ trợ: PostgreSQL Database, Kafka Message Broker, MinIO Object Storage.
     - Thời gian phản hồi (Latency ms) và Uptime của từng node. Nút bấm "Kiểm tra lại toàn bộ" (Refresh Diagnostics).
  5. **Thông tin Nền tảng (Platform & Build Info):** Phiên bản Contract chung (`2.1.0-PPE-STABLE`), Commit hash, Múi giờ máy chủ, Thời điểm khởi động gần nhất.
  6. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), thích ứng hoàn hảo Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không can thiệp trực tiếp vào file cấu hình `docker-compose.yml` trên ổ đĩa vật lý (chỉ tương tác qua REST API quản lý cấu hình trong DB).
  - Không khởi động lại container Docker từ xa (thực hiện qua SSH/Docker socket riêng của DevOps).

---

## 1. Khảo sát Backend Contract (identity-service & Infra Health)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-identity-service` (cổng 9999, Traefik Gateway `/api/v1/system`):
- Controller: [system-config.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/system-config/system-config.controller.ts)
- Routes: [system-config.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/system-config/system-config.route.ts)
- DTOs: [system-config.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/system-config/system-config.dto.ts)
- Constants: [system-config.constant.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/common/constants/system-config.constant.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Public Configs** | `GET` | `/api/v1/system/public` | Public (Không cần auth) | Không | `{ success: true, data: Record<string, unknown> }` |
| **Danh sách Cấu hình**| `GET` | `/api/v1/system/configs` | `SYSTEM_CONFIG_READ` | Query: `category, isPublic, search, page, limit` | `{ success: true, data: SystemConfigItemDto[], meta: PaginationMeta }` |
| **Chi tiết Cấu hình** | `GET` | `/api/v1/system/configs/:key` | `SYSTEM_CONFIG_READ` | Params: `key` | `{ success: true, data: SystemConfigItemDto }` |
| **Tạo mới Cấu hình** | `POST` | `/api/v1/system/configs` | `SYSTEM_CONFIG_MANAGE`| Body: `{ key, value, description?, category?, isPublic? }` | `{ success: true, message: string, data: SystemConfigItemDto }` (201) |
| **Cập nhật Cấu hình** | `PUT` | `/api/v1/system/configs/:key` | `SYSTEM_CONFIG_MANAGE`| Params: `key`, Body: `{ value?, description?, category?, isPublic? }` | `{ success: true, message: string, data: SystemConfigItemDto }` |
| **Bật/Tắt Feature Flag**| `PATCH`| `/api/v1/system/features/:key/toggle`| `SYSTEM_CONFIG_MANAGE`| Params: `key`, Body: `{ enabled: boolean, description? }` | `{ success: true, message: string, data: SystemConfigItemDto }` |
| **Xóa Cấu hình** | `DELETE`| `/api/v1/system/configs/:key` | `SYSTEM_CONFIG_MANAGE`| Params: `key` | `{ success: true, message: string }` |
| **Health Check Chung**| `GET` | `/api/v1/health` hoặc `/health` | Đã xác thực | Không | `{ success: true, data: SystemHealthReportDto }` |

### 1.2 Danh mục Constants & Feature Flags chuẩn

```typescript
// Các danh mục cấu hình
export const SYSTEM_CONFIG_CATEGORY = {
  GENERAL: "GENERAL",
  FEATURE_FLAG: "FEATURE_FLAG",
  INTEGRATION: "INTEGRATION",
  SECURITY: "SECURITY",
} as const;

// Các cờ tính năng tích hợp sẵn
export const FEATURE_FLAGS = {
  REGISTRATION_ENABLED: "feature.registration.enabled",
  NOTIFICATIONS_ENABLED: "feature.notifications.enabled",
  WEBHOOKS_ENABLED: "feature.webhooks.enabled",
  AI_ENABLED: "feature.ai.enabled",
  SOCIAL_LOGIN_ENABLED: "feature.social_login.enabled",
} as const;
```

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

Tuân thủ cấu trúc đồng nhất của dự án `fe-ppe`:

```
fe-ppe/
├── app/(auth)/system/
│   ├── page.tsx                                      ← Server Component bọc Suspense (đã có)
│   └── system-content.tsx                            ← NÂNG CẤP: Lắp ráp giao diện Trung tâm Cấu hình Hệ thống
│
├── src/
│   ├── types/
│   │   ├── system.types.ts                           ← MỚI: DTOs, Enums, FeatureFlagKeys, HealthReportTypes
│   │   └── index.ts                                  ← SỬA: Re-export system.types.ts
│   │
│   ├── services/
│   │   ├── system.service.ts                         ← MỚI: Client gọi API system-config & health checks
│   │   └── index.ts                                  ← SỬA: Re-export system.service.ts
│   │
│   ├── hooks/system/                                 ← MỚI: Thư mục hooks quản lý cấu hình hệ thống
│   │   ├── index.ts                                  ← Export toàn bộ hooks
│   │   ├── system.query-keys.ts                      ← Quản lý Query Keys chuẩn
│   │   ├── use-system-configs.ts                     ← Lấy danh sách cấu hình, lọc category, tìm kiếm, phân trang
│   │   ├── use-feature-flags.ts                      ← Lấy & toggle cờ tính năng tức thì (optimistic update)
│   │   ├── use-system-mutations.ts                   ← Thêm, sửa, xóa biến cấu hình
│   │   └── use-system-health.ts                      ← Lấy ma trận nhịp tim & độ trễ cụm 8 microservices
│   │
│   ├── components/features/system/                   ← MỚI: UI Components Neumorphism
│   │   ├── system-kpi-summary.tsx                    ← 4 thẻ Bento Console thống kê nhanh
│   │   ├── system-tabs.tsx                           ← Thanh Tab: [Cờ tính năng] [Biến cấu hình] [Sức khỏe Dịch vụ] [Thông tin Build]
│   │   ├── feature-flag-card.tsx                     ← Thẻ bật/tắt từng Feature Flag kiểu 3D Neumorphism
│   │   ├── feature-flags-tab.tsx                     ← Bảng lưới chứa toàn bộ các Feature Flag
│   │   ├── system-config-toolbar.tsx                 ← Thanh tìm kiếm, lọc category, nút "+ Thêm biến cấu hình"
│   │   ├── system-config-table.tsx                   ← Bảng danh sách cấu hình với nút sửa/xóa/xem chi tiết
│   │   ├── system-health-matrix.tsx                  ← Bảng ma trận 8 dịch vụ, độ trễ ms, trạng thái UP/DOWN
│   │   ├── system-info-panel.tsx                     ← Bảng thông tin phiên bản, commit hash, thời gian máy chủ
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── create-config-modal.tsx               ← Modal tạo mới biến cấu hình
│   │       ├── edit-config-modal.tsx                 ← Modal chỉnh sửa giá trị biến cấu hình
│   │       ├── toggle-flag-dialog.tsx                ← Dialog xác nhận bật/tắt cờ tính năng
│   │       └── delete-config-dialog.tsx              ← Dialog xác nhận xóa cấu hình
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "system.*"
│       └── en-US.json                                ← Bổ sung namespace "system.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục trang tổng thể (12 cột, Responsive)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon Settings2 + "Quản trị Hệ thống & Hạ tầng" + Badge "SYSTEM CORE"       │
│            + [ Nút: "🔄 Kiểm tra sức khỏe toàn bộ" ]  [ Nút: "+ Thêm cấu hình" ]       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BENTO CONSOLE KPI CARDS] (4 cột desktop, 2 cột tablet, 1 cột mobile)                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│ │ ⚙️ Tổng cấu hình │ │ 🟢 Cụm Dịch vụ  │ │ 🚀 Feature Flags │ │ ⏱️ Uptime TB    │           │
│ │       38       │ │  8/8 Khỏe mạnh │ │   4/5 Đang bật   │ │    99.98%      │           │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [NEUMORPHIC TABS]                                                                      │
│ [ 🚀 Công tắc Tính năng (5) ]  [ 📋 Biến Cấu hình (38) ]  [ 🩺 Nhịp tim Dịch vụ ]  [ ℹ️ Hạ tầng ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Khi ở Tab 1: [CÔNG TẮC TÍNH NĂNG (FEATURE FLAGS)]                                      │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐     │ │
│ │ │ 🌐 Cho phép Đăng ký Tự do          │ │ 🔔 Trung tâm Thông báo Realtime    │     │ │
│ │ │ key: feature.registration.enabled  │ │ key: feature.notifications.enabled │     │ │
│ │ │ Người dùng mới có thể tạo acc      │ │ Bật SSE và đẩy cảnh báo tức thời   │     │ │
│ │ │ Trạng thái: [ BẬT - Xanh ] (Switch)│ │ Trạng thái: [ BẬT - Xanh ] (Switch)│     │ │
│ │ └────────────────────────────────────┘ └────────────────────────────────────┘     │ │
│ │ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐     │ │
│ │ │ 🧠 Khung Phân tích AI Camera       │ │ 🪝 Tích hợp Webhooks Bên Ngoài      │     │ │
│ │ │ key: feature.ai.enabled            │ │ key: feature.webhooks.enabled      │     │ │
│ │ │ Kích hoạt pipeline phát hiện PPE   │ │ Bắn sự kiện ra hệ thống ERP/Telegram│    │ │
│ │ │ Trạng thái: [ BẬT - Xanh ] (Switch)│ │ Trạng thái: [ TẮT - Xám ] (Switch) │     │ │
│ │ └────────────────────────────────────┘ └────────────────────────────────────┘     │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ Khi ở Tab 3: [NHỊP TIM DỊCH VỤ & HẠ TẦNG]                                              │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Dịch vụ / Cổng          │ Loại        │ Trạng thái │ Độ trễ (Latency) │ Uptime    │ │
│ ├─────────────────────────┼─────────────┼────────────┼──────────────────┼───────────┤ │
│ │ identity-service (:9999)│ Auth / Core │ 🟢 HEALTHY │ 12 ms            │ 14d 6h    │ │
│ │ camera-service (:8881)  │ Stream RTSP │ 🟢 HEALTHY │ 28 ms            │ 14d 6h    │ │
│ │ incident-service (:8883)│ Incident Hub│ 🟢 HEALTHY │ 15 ms            │ 14d 6h    │ │
│ │ ai-service (:8000)      │ YOLO Engine │ 🟢 HEALTHY │ 42 ms            │ 3d 2h     │ │
│ │ PostgreSQL Database     │ Storage DB  │ 🟢 ONLINE  │ 3 ms             │ 30d 12h   │ │
│ │ Apache Kafka (:9092)    │ Event Broker│ 🟢 ONLINE  │ 5 ms             │ 30d 12h   │ │
│ │ MinIO Object Storage    │ S3 Media    │ 🟢 ONLINE  │ 8 ms             │ 30d 12h   │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: Hot-toggle, Cache Invalidation & System Diagnostic

### 4.1 Cơ chế Optimistic Update cho Feature Flags
Khi người dùng gạt công tắc Feature Flag:
1. Giao diện thay đổi ngay lập tức (UI Optimistic update) tạo phản hồi xúc giác mượt mà (chuyển đổi màu sắc xanh/xám, hiệu ứng bóng nổi `nm-inset`).
2. Gửi request `PATCH /api/v1/system/features/:key/toggle`.
3. Nếu thành công: Invalidate `["system-configs"]` và bắn Toast thông báo màu xanh.
4. Nếu thất bại: Rollback lại trạng thái công tắc cũ, rung nhẹ viền đỏ (Shake animation) và hiển thị Toast lỗi chi tiết từ máy chủ.

### 4.2 Giám sát Sức khỏe Đa Dịch vụ (Health Check Polling)
Client thực hiện thăm dò nhịp tim song song qua `Promise.allSettled`:
- Kiểm tra các dịch vụ thông qua Traefik gateway `/health` và các cổng backend độc lập.
- Tính toán chỉ số RTT (Round Trip Time) bằng `performance.now()` để ghi nhận độ trễ tính bằng mili-giây (`latencyMs`).
- Đánh giá trạng thái tự động:
  - `HEALTHY` (Xanh lá): Dịch vụ phản hồi 200 OK và RTT < 150ms.
  - `DEGRADED` (Hổ phách): Dịch vụ phản hồi 200 OK nhưng RTT >= 150ms.
  - `DOWN` (Đỏ cảnh báo): Dịch vụ phản hồi lỗi hoặc timeout quá 3000ms.

---

## 5. Ma trận phân quyền & RBAC Access Control

Route `/system` được bảo vệ bằng Route Guard với quyền yêu cầu tối thiểu là `SYSTEM_CONFIG_READ`.

| Vai trò | Quyền xem trang | Bật/Tắt Feature Flags | Thêm / Sửa Biến cấu hình | Xóa Cấu hình | Xem Sức khỏe Hạ tầng |
|---|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **SAFETY_MANAGER** | ✅ Chỉ xem (`READ`) | ❌ Bị vô hiệu hóa | ❌ Bị vô hiệu hóa | ❌ Bị vô hiệu hóa | ✅ Có |
| **SAFETY_OFFICER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/system.types.ts`)
Định nghĩa đầy đủ kiểu dữ liệu phản ánh chính xác backend:
- `SystemConfigCategory`: `"GENERAL" | "FEATURE_FLAG" | "INTEGRATION" | "SECURITY"`.
- `SystemConfigItem`: `{ id, key, value, description, category, isPublic, createdAt, updatedAt }`.
- `CreateSystemConfigDto`, `UpdateSystemConfigDto`, `ToggleFeatureFlagDto`.
- `ServiceHealthItem`: `{ name, serviceCode, port, status: "HEALTHY" | "DEGRADED" | "DOWN", latencyMs: number, uptime?: string, lastChecked: string }`.

### Bước 2 — Tầng Service API (`src/services/system.service.ts`)
Tạo `systemService` bao bọc các lời gọi axios chuẩn:
- `getConfigs(params?: SystemConfigQuery)`
- `getConfigByKey(key: string)`
- `createConfig(payload: CreateSystemConfigDto)`
- `updateConfig(key: string, payload: UpdateSystemConfigDto)`
- `toggleFeatureFlag(key: string, payload: ToggleFeatureFlagDto)`
- `deleteConfig(key: string)`
- `checkServicesHealth()`: Quét và trả về ma trận trạng thái của 8 services.

### Bước 3 — Tầng React Query Hooks (`src/hooks/system/`)
- `system.query-keys.ts`: Factory quản lý key: `systemKeys.all`, `systemKeys.configs(filters)`, `systemKeys.health`.
- `use-system-configs.ts`: Hook lấy danh sách cấu hình, hỗ trợ debounced search.
- `use-feature-flags.ts`: Hook chuyên dụng lọc ra các cấu hình `FEATURE_FLAG` và hàm mutation toggle có optimistic response.
- `use-system-health.ts`: Hook lấy trạng thái sức khỏe có refetchInterval tùy chọn (mặc định 30 giây).

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Thêm đầy đủ nhãn ngôn ngữ vào `vi-VN.json` và `en-US.json`:
- `system.title`, `system.description`, `system.kpi.*`
- `system.tabs.*` (featureFlags, configs, health, platform)
- `system.flags.*` (tên và mô tả của từng cờ tính năng)
- `system.actions.*` (add, edit, delete, toggle, refresh)
- `system.dialogs.*` (xác nhận toggle, xóa cấu hình nguy hiểm)

### Bước 5 — Xây dựng các UI Components hiển thị Neumorphism
- `system-kpi-summary.tsx`: 4 thẻ Bento Console phong cách Neumorphic Soft 3D.
- `feature-flag-card.tsx`: Card nổi với nút Switch lõm/lồi, có đèn led báo hiệu trạng thái hoạt động.
- `system-config-table.tsx`: Bảng dữ liệu Neumorphic hiển thị badge danh mục (`SECURITY`, `GENERAL`, `INTEGRATION`), kiểu giá trị (JSON, boolean, string) và các action buttons.
- `system-health-matrix.tsx`: Bảng ma trận các node mạng kèm thanh hiển thị độ trễ mili-giây và chỉ báo màu trực quan.

### Bước 6 — Xây dựng các Modal & Drawer tương tác nghiệp vụ
- `create-config-modal.tsx`: Form nhập Key, Category, Value (có dropdown chọn định dạng value: boolean, string, number, json) và Switch `isPublic`.
- `edit-config-modal.tsx`: Cho phép sửa Value và Description, ngăn sửa đổi Key đã tồn tại.
- `toggle-flag-dialog.tsx`: Hộp thoại cảnh báo tác động người dùng khi bật/tắt tính năng cốt lõi.
- `delete-config-dialog.tsx`: Hộp thoại xác nhận yêu cầu gõ lại tên Key trước khi xóa để tránh thao tác nhầm.

### Bước 7 — Lắp ráp trang chính (`app/(auth)/system/system-content.tsx`)
Thay thế placeholder hiện tại bằng component hoàn chỉnh kết nối toàn bộ Hooks, Bento Summary, Tabs và Modals.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm thử hiển thị hoàn hảo trên các độ phân giải: Mobile (375px), Tablet (768px), Desktop (1440px).
- Kiểm tra trạng thái Dark Mode và Light Mode không bị lóa hoặc mất độ tương phản chữ.
- Kiểm tra quyền truy cập 403 đối với tài khoản `user@ppe.local`.

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Giá trị JSON cấu hình nhập vào sai cú pháp | Báo lỗi ngay dưới ô textarea "JSON không hợp lệ", chặn submit |
| **401 Unauthorized**| Phiên đăng nhập hết hạn khi đang chỉnh sửa | Chuyển hướng về `/login` kèm thông báo đăng nhập lại |
| **403 Forbidden**   | User thường hoặc Safety Officer vào trang `/system` | Hiển thị màn hình chuẩn 403 Forbidden kèm nút quay về Dashboard |
| **404 Not Found**   | Key cấu hình cần sửa đã bị xóa bởi Admin khác | Toast báo lỗi "Cấu hình không còn tồn tại", tự động refresh danh sách |
| **409 Conflict**    | Tạo mới cấu hình có Key đã trùng trong DB | Báo lỗi inline "Mã key cấu hình này đã tồn tại" |
| **500 Server Error**| Backend gặp sự cố khi lưu DB | Hiển thị Toast lỗi màu đỏ và giữ nguyên dữ liệu trong modal để không mất công nhập |
| **Network Timeout** | Một trong các microservice không phản hồi khi check health | Đánh dấu node đó là `DOWN` trong ma trận, không làm treo toàn bộ trang |

---

## 8. Checklist hoàn thiện nghiệm thu

- [x] Route `/system` được bảo vệ đúng quyền `SYSTEM_CONFIG_READ`.
- [x] 4 thẻ Bento Console hiển thị số liệu thực tế từ API.
- [x] Tab Công tắc Tính năng (Feature Flags) hiển thị đúng 5 cờ mặc định và toggle mượt mà không cần reload trang.
- [x] Bảng Biến cấu hình (System Configs) hỗ trợ lọc theo danh mục, tìm kiếm debounced và phân trang.
- [x] Modal Thêm/Sửa cấu hình validate đúng định dạng JSON/Boolean/String.
- [x] Tab Nhịp tim Dịch vụ quét được trạng thái của cụm 8 services và báo độ trễ chính xác.
- [x] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) chuyển đổi tức thì không sót chuỗi.
- [x] Thiết kế Neumorphism chuẩn mực, tương thích hoàn hảo Dark Mode và Light Mode.
