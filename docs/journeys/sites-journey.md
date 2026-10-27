# Hành trình xây dựng Trang Quản lý Công trường, Phân khu & Vùng cấm (/sites) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Quản lý Công trường & Thiết lập An toàn Không gian (`/sites`) thuộc nhóm Giám sát An toàn (`safety-monitoring`) sau đăng nhập — quản lý danh mục công trường/nhà máy xây dựng, phân cấp khu vực hoạt động (Zones & Workspaces), thiết lập vùng cấm/vùng nguy hiểm cao (Restricted Danger Zones), cấu hình tiêu chuẩn trang bị bảo hộ bắt buộc theo từng công trường (Per-Site Safety PPE Requirements), và đồng bộ hóa với bộ chọn công trường toàn cục trên Header (`SiteSelector`).  
> **Nguồn contract:** Backend `smart-ppe-site-service` (cổng 8882 / Gateway Traefik cổng 80 tại `/api/v1/sites` & `/api/v1/safety-rules`).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [cameras-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/cameras-journey.md) | [incidents-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/incidents-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền tạo công trường mới, cấu hình phân khu, thiết lập vùng cấm và quy tắc an toàn)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — quản lý các phân khu và cấu hình an toàn trong phạm vi công trường được phân công)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — xem thông tin công trường, xem danh sách phân khu và vùng cấm để giám sát)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /sites](#0-mục-tiêu--định-vị-trang-sites)
1. [Khảo sát Backend Contract (smart-ppe-site-service)](#1-khảo-sát-backend-contract-smart-ppe-site-service)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Phân cấp Không gian, Vùng cấm & Cấu hình PPE](#4-cơ-chế-kỹ-thuật-cốt-lõi-phân-cấp-không-gian-vùng-cấm--cấu-hình-ppe)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/site.types.ts)](#bước-1--tầng-dtos--types-srctypessitetypests)
   - [Bước 2 — Tầng Service API (src/services/site.service.ts)](#bước-2--tầng-service-api-srcservicessiteservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/sites/)](#bước-3--tầng-react-query-hooks-srchookssites)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị Neumorphism](#bước-5--xây-dựng-các-ui-components-hiển-thị-neumorphism)
   - [Bước 6 — Xây dựng Modal & Drawer tương tác nghiệp vụ Site](#bước-6--xây-dựng-modal--drawer-tương-tác-nghiệp-vụ-site)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/sites/sites-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthsitessites-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /sites

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Trang `/sites` (**Quản lý Công trường & Không gian An toàn**) là nền móng định danh không gian địa lý của dự án Smart PPE. Toàn bộ camera, thiết bị IoT, sự cố an toàn và báo cáo thống kê đều gắn liền với một công trường và một phân khu cụ thể. Trang này giải quyết 4 bài toán quản trị thực tế:

1. **Phân cấp Không gian 3 Tầng (Three-Tier Spatial Hierarchy):** Mô hình hóa cấu trúc không gian công trường theo 3 cấp độ: `Công trường (Site) -> Phân khu (Zone) -> Vùng nguy hiểm/Vùng cấm (Restricted Area)`. Cho phép nhà thầu quản lý đồng thời nhiều dự án (ví dụ: Landmark Tower, Nhà máy Lọc dầu Nghi Sơn, Cảng Quốc tế Cái Mép).
2. **Thiết lập Tiêu chuẩn Bảo hộ Riêng biệt (Per-Site Safety PPE Configuration):** Mỗi địa điểm thi công có đặc thù rủi ro khác nhau. Trang này cho phép bật/tắt yêu cầu bắt buộc đối với từng loại trang bị bảo hộ: Mũ bảo hộ (`hard_hat`), Áo phản quang (`safety_vest`), Găng tay bảo hộ (`gloves`), Giày mũi thép (`safety_boots`), Kính chắn tia lửa (`goggles`), Dây an toàn trên cao (`safety_harness`).
3. **Kiểm soát Vùng Nguy hiểm Cao (Restricted Danger Zones Engine):** Khoanh vùng các khu vực có nguy cơ tai nạn chết người (trạm biến áp cao thế, miệng hố thang máy, hành lang bán kính quay của cần cẩu tháp). Khi camera AI nhận diện có người xuất hiện trong vùng này (bất kể có đủ đồ bảo hộ hay không), hệ thống lập tức kích hoạt sự cố mức độ Khẩn cấp (`CRITICAL`).
4. **Đồng bộ hóa Không gian Toàn cục (Global Site Context Synchronization):** Đồng bộ dữ liệu 2 chiều với thành phần `SiteSelector` trên thanh tiêu đề Header. Khi người dùng chọn công trường ở Header, toàn bộ thông tin phân khu, camera và số liệu sự cố tự động lọc theo ngữ cảnh công trường đó.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Thống kê KPI Công trường (Bento Console):** 4 thẻ chỉ số: Tổng số công trường đang hoạt động, Tổng số phân khu (Zones), Số vùng cấm có cảnh báo nguy hiểm (`Restricted Areas`), Tỷ lệ tuân thủ an toàn trung bình.
  2. **Bảng Danh sách Công trường Neumorphic:** Hiển thị tên công trường, mã nhận diện (`code`), địa chỉ, người phụ trách an toàn, số điện thoại khẩn cấp, số lượng camera đang trực, trạng thái (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
  3. **Drawer Quản lý Phân khu & Vùng cấm (Zones & Danger Areas Drawer):**
     - Danh sách các phân khu thuộc công trường đang chọn (Khu giàn giáo, Hầm kỹ thuật, Kho hóa chất).
     - Danh sách các vùng cấm với mức độ rủi ro (`CRITICAL`, `HIGH`).
     - Thao tác thêm, sửa, xóa phân khu và vùng cấm trực tiếp.
  4. **Modal Cấu hình Yêu cầu An toàn (Site Safety Rules Config Modal):**
     - Bảng chuyển mạch Neumorphic Switch bật/tắt yêu cầu bắt buộc: Mũ bảo hộ, Áo phản quang, Giày bảo hộ, Kính mắt, Dây đai an toàn.
     - Thiết lập ngưỡng thời gian vi phạm tối thiểu trước khi bắn cảnh báo (Temporal Confirmation: từ 1.0 đến 5.0 giây).
  5. **Modal Tạo mới / Chỉnh sửa Công trường:** Nhập Tên, Mã định danh (`SITE-LANDMARK-01`), Địa chỉ, Tọa độ bản đồ (Kinh độ/Vĩ độ), Thông tin người liên hệ khẩn cấp.
  6. **Hộp thoại Xác nhận Xóa Công trường:** Cảnh báo các camera và dữ liệu lịch sử liên đới trước khi xóa.
  7. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không vẽ bản đồ 3D BIM phức tạp (sử dụng bản đồ trực quan 2D và sơ đồ phân khu dạng danh mục lưới).
  - Không thay đổi mã nguồn backend tính toán vi phạm không gian trong `smart-ppe-ai-service`.

---

## 1. Khảo sát Backend Contract (smart-ppe-site-service)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-site-service` (cổng 8882 / Gateway Traefik `/api/v1/sites` & `/api/v1/safety-rules`):
- Controller: [site.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-site-service/src/modules/site/site.controller.ts)
- Routes: [site.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-site-service/src/modules/site/site.route.ts)
- Safety Rule Route: [safety-rule.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-site-service/src/modules/safety-rule/safety-rule.route.ts)
- Validation: [site.validation.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-site-service/src/modules/site/site.validation.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Danh sách Công trường**| `GET` | `/api/v1/sites` | `PPE_SITE_READ` | Query: `search, status, page, limit` | `{ success: true, data: SiteItemDto[], meta: PaginationMeta }` |
| **Chi tiết Công trường** | `GET` | `/api/v1/sites/:id` | `PPE_SITE_READ` | Params: `id (UUID)` | `{ success: true, data: SiteDetailDto }` |
| **Tạo mới Công trường** | `POST` | `/api/v1/sites` | `PPE_SITE_MANAGE` | Body: `CreateSiteDto` | `{ success: true, message: string, data: SiteItemDto }` (201) |
| **Cập nhật Công trường** | `PUT` | `/api/v1/sites/:id` | `PPE_SITE_MANAGE` | Params: `id`, Body: `UpdateSiteDto` | `{ success: true, message: string, data: SiteItemDto }` |
| **Xóa Công trường** | `DELETE`| `/api/v1/sites/:id` | `PPE_SITE_MANAGE` | Params: `id` | `{ success: true, message: string }` |
| **Lấy Cấu hình An toàn**| `GET` | `/api/v1/sites/:id/safety-config` | `PPE_SAFETY_CONFIG_READ` | Params: `id` | `{ success: true, data: SiteSafetyConfigDto }` |
| **Lưu Cấu hình An toàn**| `PUT` | `/api/v1/sites/:id/safety-config` | `PPE_SAFETY_CONFIG_MANAGE` | Params: `id`, Body: `UpdateSiteSafetyConfigDto` | `{ success: true, message: string, data: SiteSafetyConfigDto }` |
| **Danh sách Phân khu** | `GET` | `/api/v1/sites/:id/zones` | `PPE_ZONE_READ` | Params: `id`, Query: `search, page, limit` | `{ success: true, data: ZoneItemDto[] }` |
| **Tạo mới Phân khu** | `POST` | `/api/v1/sites/:id/zones` | `PPE_ZONE_MANAGE` | Params: `id`, Body: `CreateZoneDto` | `{ success: true, message: string, data: ZoneItemDto }` (201) |
| **Danh sách Vùng cấm** | `GET` | `/api/v1/sites/:id/restricted-areas` | `PPE_ZONE_READ` | Params: `id`, Query: `search, page, limit` | `{ success: true, data: RestrictedAreaDto[] }` |
| **Tạo mới Vùng cấm** | `POST` | `/api/v1/sites/:id/restricted-areas` | `PPE_ZONE_MANAGE` | Params: `id`, Body: `CreateRestrictedAreaDto` | `{ success: true, message: string, data: RestrictedAreaDto }` (201) |
| **Quy tắc Mặc định Hệ thống**|`GET`| `/api/v1/safety-rules/system-default` | `PPE_SAFETY_CONFIG_READ` | Không | `{ success: true, data: SafetyRuleItemDto[] }` |

### 1.2 Cấu hình Tiêu chuẩn An toàn (SiteSafetyConfigDto)
```typescript
export interface SiteSafetyConfigDto {
  siteId: string;
  requireHardHat: boolean;         // Mũ bảo hộ
  requireSafetyVest: boolean;      // Áo phản quang
  requireSafetyBoots: boolean;     // Giày mũi thép
  requireGloves: boolean;          // Găng tay bảo hộ
  requireGoggles: boolean;         // Kính bảo hộ
  requireSafetyHarness: boolean;   // Dây an toàn trên cao
  confirmationTimeSeconds: number; // Ngưỡng xác nhận vi phạm (mặc định 2.0 giây)
  strictZoneMode: boolean;         // Chế độ giám sát nghiêm ngặt
  updatedAt: string;
}
```

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/sites/
│   ├── page.tsx                                      ← Server Component bọc Suspense (đã có)
│   └── sites-content.tsx                             ← NÂNG CẤP: Lắp ráp giao diện Quản lý Công trường hoàn chỉnh
│
├── src/
│   ├── types/
│   │   ├── site.types.ts                             ← MỚI: DTOs, Enums, ZoneTypes, RestrictedAreaTypes, SafetyConfig
│   │   └── index.ts                                  ← SỬA: Re-export site.types.ts
│   │
│   ├── services/
│   │   ├── site.service.ts                           ← MỚI: Client gọi 12 endpoint của site-service
│   │   └── index.ts                                  ← SỬA: Re-export site.service.ts
│   │
│   ├── hooks/sites/                                  ← MỚI: Thư mục hooks quản lý công trường
│   │   ├── index.ts                                  ← Export toàn bộ hooks
│   │   ├── site.query-keys.ts                        ← Quản lý Query Keys chuẩn
│   │   ├── use-sites.ts                              ← Lấy danh sách công trường, tìm kiếm, phân trang
│   │   ├── use-site-detail.ts                        ← Lấy chi tiết công trường
│   │   ├── use-site-safety-config.ts                 ← Lấy & Cập nhật yêu cầu an toàn PPE của công trường
│   │   ├── use-site-zones.ts                         ← Quản lý danh sách phân khu (Zones)
│   │   ├── use-restricted-areas.ts                   ← Quản lý danh sách vùng cấm nguy hiểm
│   │   └── use-site-mutations.ts                     ← Tạo, sửa, xóa công trường
│   │
│   ├── components/features/sites/                    ← MỚI: UI Components Neumorphism
│   │   ├── site-kpi-summary.tsx                      ← 4 thẻ Bento Console thống kê nhanh
│   │   ├── site-toolbar.tsx                          ← Thanh tìm kiếm, lọc trạng thái, nút "+ Thêm công trường"
│   │   ├── site-card-grid.tsx                        ← Lưới thẻ công trường Neumorphic 3D
│   │   ├── site-table.tsx                            ← Bảng danh sách công trường chi tiết
│   │   ├── site-safety-badges.tsx                    ← Huy hiệu các trang bị bảo hộ bắt buộc của site (Mũ, Áo, Giày)
│   │   ├── zone-list-panel.tsx                       ← Bảng quản lý phân khu trong Drawer
│   │   ├── restricted-area-panel.tsx                 ← Bảng quản lý vùng cấm trong Drawer
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── create-site-modal.tsx                 ← Modal thêm mới công trường
│   │       ├── edit-site-modal.tsx                   ← Modal sửa thông tin công trường
│   │       ├── site-safety-config-modal.tsx          ← Modal bật/tắt yêu cầu PPE bắt buộc & thời gian xác nhận
│   │       ├── site-zones-drawer.tsx                 ← Drawer quản lý Phân khu & Vùng cấm nguy hiểm
│   │       ├── create-zone-dialog.tsx                ← Dialog thêm mới phân khu
│   │       ├── create-restricted-area-dialog.tsx     ← Dialog thêm mới vùng cấm
│   │       └── delete-site-dialog.tsx                ← Hộp thoại xác nhận xóa công trường
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "sites.*"
│       └── en-US.json                                ← Bổ sung namespace "sites.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục trang tổng thể (12 cột, Responsive)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon Building2 + "Quản lý Công trường & Vùng An toàn" + Badge "LOCATIONS"  │
│            + [ Nút: "+ Thêm Công trường" ]  [ Nút: "🔄 Làm mới" ]                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BENTO CONSOLE KPI CARDS] (4 cột desktop, 2 cột tablet, 1 cột mobile)                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│ │ 🏗️ Tổng công trường│ │ 📍 Tổng phân khu│ │ ⛔ Vùng cấm/Rủi ro│ │ 🛡️ Tuân thủ TB    │     │
│ │       5        │ │    18 Khu vực  │ │    6 Vùng cấm   │ │     94.2%      │           │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [FILTER TOOLBAR & VIEW CONTROLS]                                                       │
│ [ 🔍 Tìm tên công trường, mã site... ] [ Trạng thái: Đang hoạt động ▼ ] [ ⊞ Thẻ ] [ ☰ Bảng ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [LƯỚI THẺ CÔNG TRƯỜNG NEUMORPHIC]                                                      │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 🏗️ Landmark Tower 81 (SITE-LANDMARK-01)                           🟢 HOẠT ĐỘNG      │ │
│ │ 📍 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM                               │ │
│ │ 👤 Cán bộ phụ trách: Nguyễn Văn A • 📞 0903.123.456                                 │ │
│ │ 📹 8 Camera • 5 Phân khu • 2 Vùng cấm nguy hiểm                                    │ │
│ │ Bảo hộ bắt buộc: [ 👷 Mũ ] [ 🦺 Áo ] [ 🥾 Giày ] [ 🧤 Găng ]                       │ │
│ │ [ 📍 Quản lý Phân khu & Vùng cấm ] [ 🛡️ Cấu hình An toàn ] [ ✏️ Sửa ] [ 🗑️ Xóa ]     │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 🏭 Nhà máy Lọc dầu Nghi Sơn (SITE-NGHISON-02)                     🟢 HOẠT ĐỘNG      │ │
│ │ 📍 Khu kinh tế Nghi Sơn, Tĩnh Gia, Thanh Hóa                                       │ │
│ │ 👤 Cán bộ phụ trách: Trần Đình B • 📞 0912.888.999                                 │ │
│ │ 📹 12 Camera • 8 Phân khu • 3 Vùng cấm nguy hiểm                                   │ │
│ │ Bảo hộ bắt buộc: [ 👷 Mũ ] [ 🦺 Áo ] [ 🥾 Giày ] [ 🥽 Kính ] [ 🪢 Dây an toàn ]     │ │
│ │ [ 📍 Quản lý Phân khu & Vùng cấm ] [ 🛡️ Cấu hình An toàn ] [ ✏️ Sửa ] [ 🗑️ Xóa ]     │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: Phân cấp Không gian, Vùng cấm & Cấu hình PPE

### 4.1 Quy tắc Xác nhận Thời gian Vi phạm (Temporal Confirmation)
Mỗi công trường cho phép thiết lập tham số `confirmationTimeSeconds` (mặc định `2.0` giây):
- Khi AI camera phát hiện công nhân không đội mũ, bộ đếm thời gian bắt đầu chạy. Nếu công nhân đội mũ lại trong vòng dưới 2 giây (hoặc do góc quay bị che khuất thoáng qua), sự kiện được tự động loại bỏ để chống báo động rác (False Positive).
- Nếu vi phạm kéo dài vượt quá `confirmationTimeSeconds`, sự kiện được đóng băng và tạo thành bản ghi sự cố chính thức.

### 4.2 Cảnh báo Xâm nhập Vùng cấm Nguy hiểm (Restricted Areas)
- Vùng cấm gắn liền với phân khu (`zoneId`).
- Khi tạo vùng cấm, người quản trị chọn mức độ nghiêm trọng:
  - `CRITICAL` (Khu điện cao thế, giếng trời nguy hiểm): Bắn cảnh báo âm thanh tức thì trên toàn bộ giao diện dashboard và gửi notification khẩn cấp.
  - `HIGH` (Kho lưu trữ vật liệu nổ, khu bốc dỡ cần cẩu): Gửi thông báo tới cán bộ giám sát ca trực.

---

## 5. Ma trận phân quyền & RBAC Access Control

| Vai trò | Xem Danh sách Công trường | Tạo / Sửa Công trường | Cấu hình Tiêu chuẩn PPE | Thêm Phân khu & Vùng cấm | Xóa Công trường |
|---|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **SAFETY_MANAGER** | ✅ Có quyền | ❌ Chỉ xem | ✅ Có (Tại Site quản lý) | ✅ Có (Tại Site quản lý) | ❌ Bị vô hiệu hóa |
| **SAFETY_OFFICER** | ✅ Xem (`PPE_SITE_READ`) | ❌ Bị vô hiệu hóa | ❌ Bị vô hiệu hóa | ❌ Bị vô hiệu hóa | ❌ Bị vô hiệu hóa |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/site.types.ts`)
- Định nghĩa `SiteItem`, `SiteDetail`, `SiteSafetyConfigDto`, `ZoneItem`, `RestrictedAreaItem`.
- DTOs: `CreateSiteDto`, `UpdateSiteDto`, `CreateZoneDto`, `CreateRestrictedAreaDto`, `UpdateSiteSafetyConfigDto`.
- Enum `SiteStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED`.

### Bước 2 — Tầng Service API (`src/services/site.service.ts`)
Tạo `siteService` bao bọc 12 hàm API:
- `getSites(params?: SiteQuery)`
- `getSiteById(id: string)`
- `createSite(payload: CreateSiteDto)`
- `updateSite(id: string, payload: UpdateSiteDto)`
- `deleteSite(id: string)`
- `getSafetyConfig(id: string)`
- `updateSafetyConfig(id: string, payload: UpdateSiteSafetyConfigDto)`
- `getSiteZones(siteId: string)`
- `createZone(siteId: string, payload: CreateZoneDto)`
- `getRestrictedAreas(siteId: string)`
- `createRestrictedArea(siteId: string, payload: CreateRestrictedAreaDto)`

### Bước 3 — Tầng React Query Hooks (`src/hooks/sites/`)
- `site.query-keys.ts`: Factory quản lý query keys: `siteKeys.all`, `siteKeys.list(filters)`, `siteKeys.detail(id)`, `siteKeys.safetyConfig(id)`, `siteKeys.zones(id)`, `siteKeys.restrictedAreas(id)`.
- `use-sites.ts`: Lấy danh sách công trường.
- `use-site-safety-config.ts`: Quản lý yêu cầu bảo hộ của công trường.
- `use-site-zones.ts`: Quản lý danh sách phân khu.
- `use-restricted-areas.ts`: Quản lý danh sách vùng cấm.
- `use-site-mutations.ts`: Thêm, sửa, xóa công trường.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật `vi-VN.json` và `en-US.json`:
- `sites.title`, `sites.description`, `sites.kpi.*`
- `sites.safetyConfig.*` (hardHat, vest, boots, gloves, goggles, harness, confirmationTime)
- `sites.zones.*` (zoneName, zoneCode, description, addZone)
- `sites.restrictedAreas.*` (areaName, severity, dangerType, addRestrictedArea)

### Bước 5 — Xây dựng các UI Components hiển thị Neumorphism
- `site-kpi-summary.tsx`: 4 thẻ Bento Console thống kê nhanh.
- `site-card-grid.tsx`: Lưới thẻ công trường Neumorphic 3D hiển thị huy hiệu bảo hộ.
- `site-table.tsx`: Bảng dữ liệu chi tiết công trường.
- `zone-list-panel.tsx` & `restricted-area-panel.tsx`: Các khối panel quản lý trong Drawer.

### Bước 6 — Xây dựng Modal & Drawer tương tác nghiệp vụ Site
- `create-site-modal.tsx`: Form thêm mới công trường có nhập thông tin liên hệ và tọa độ.
- `site-safety-config-modal.tsx`: Modal với các nút Switch Neumorphic bật/tắt yêu cầu bảo hộ.
- `site-zones-drawer.tsx`: Drawer trượt hiển thị song song tab Phân khu và tab Vùng cấm nguy hiểm.
- `delete-site-dialog.tsx`: Hộp thoại xác nhận an toàn trước khi xóa công trường.

### Bước 7 — Lắp ráp trang chính (`app/(auth)/sites/sites-content.tsx`)
Thay thế placeholder hiện tại bằng component hoàn chỉnh kết nối toàn bộ Hooks, Bento Summary, Toolbar, Card Grid/Table và các Modal nghiệp vụ.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm tra tính đồng bộ khi chuyển đổi Site trên Header `SiteSelector`.
- Kiểm tra hiển thị responsive từ Mobile (thẻ dọc) đến Desktop (lưới 2 cột).
- Kiểm tra chặn quyền chỉnh sửa an toàn đối với tài khoản Cán bộ An toàn (`officer@ppe.local`).

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Tọa độ kinh độ/vĩ độ không hợp lệ hoặc thiếu tên công trường | Báo lỗi inline dưới ô nhập liệu, chặn submit |
| **401 Unauthorized**| Hết hạn phiên khi đang thiết lập cấu hình an toàn | Chuyển hướng về `/login` |
| **403 Forbidden**   | Cán bộ an toàn cố gắng xóa công trường hoặc đổi quy tắc PPE | Hiển thị Toast cảnh báo quyền hạn từ chối |
| **404 Not Found**   | Công trường cần sửa đã bị xóa trước đó | Toast báo lỗi, làm mới lại danh sách công trường |
| **409 Conflict**    | Trùng mã định danh công trường (`code` đã tồn tại) | Báo lỗi inline "Mã công trường này đã được đăng ký" |
| **500 Server Error**| Lỗi hệ thống cơ sở dữ liệu | Toast báo lỗi màu đỏ, giữ nguyên dữ liệu trong form để người dùng thử lại |

---

## 8. Checklist hoàn thiện nghiệm thu

- [x] Route `/sites` được bảo vệ bằng Route Guard với quyền `PPE_SITE_READ`.
- [x] 4 thẻ Bento Console hiển thị đúng số liệu thống kê công trường và phân khu.
- [x] Danh sách công trường hiển thị trực quan dưới cả 2 dạng: Thẻ 3D và Bảng dữ liệu.
- [x] Modal Cấu hình Tiêu chuẩn An toàn (PPE Requirements) lưu thành công các tùy chọn bảo hộ bắt buộc.
- [x] Drawer Quản lý Phân khu & Vùng cấm cho phép thêm/xóa Zone và Restricted Area mượt mà.
- [x] Đồng bộ hóa chuẩn xác với thành phần `SiteSelector` trên Header.
- [x] Thao tác Thêm, Sửa, Xóa công trường thực thi chuẩn mực với quyền `PPE_SITE_MANAGE`.
- [x] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) đồng bộ 100%.
- [x] Giao diện Neumorphic thẩm mỹ cao, tương thích hoàn hảo Dark Mode và Light Mode.
