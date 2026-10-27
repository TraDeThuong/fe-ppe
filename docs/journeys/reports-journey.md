# Hành trình xây dựng Trang Trung tâm Báo cáo & Phân tích An toàn (/reports) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Trung tâm Báo cáo & Phân tích Dữ liệu An toàn Lao động (`/reports`) thuộc nhóm Báo cáo & Phân tích (`reports-and-analytics`) sau đăng nhập — phân tích biểu đồ xu hướng vi phạm theo thời gian, tỷ trọng các loại vi phạm trang bị bảo hộ, bảng xếp hạng rủi ro theo công trường và camera, quản lý mẫu báo cáo tuân thủ (Report Templates), kích hoạt tiến trình tạo báo cáo tự động (PDF/Excel/CSV Export Engine) và quản lý lịch sử xuất file phục vụ thanh tra an toàn.  
> **Nguồn contract:** Backend `smart-ppe-reporting-service` (cổng 8885 / Gateway Traefik cổng 80 tại `/api/v1/reports` & `/api/v1/statistics`).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [dashboard-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/dashboard-journey.md) | [ai-metrics-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/ai-metrics-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền xem thống kê, cấu hình mẫu báo cáo, tạo và tải báo cáo PDF/Excel)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — xem phân tích an toàn, trích xuất báo cáo tuân thủ của công trường quản lý)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — xem các biểu đồ thống kê cơ bản, không có quyền xuất báo cáo tổng hợp)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /reports](#0-mục-tiêu--định-vị-trang-reports)
1. [Khảo sát Backend Contract (smart-ppe-reporting-service)](#1-khảo-sát-backend-contract-smart-ppe-reporting-service)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Report Generation Engine, Queue Polling & Visual Charts](#4-cơ-chế-kỹ-thuật-cốt-lõi-report-generation-engine-queue-polling--visual-charts)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/reporting.types.ts)](#bước-1--tầng-dtos--types-srctypesreportingtypests)
   - [Bước 2 — Tầng Service API (src/services/reporting.service.ts)](#bước-2--tầng-service-api-srcservicesreportingservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/reporting/)](#bước-3--tầng-react-query-hooks-srchooksreporting)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị Neumorphism](#bước-5--xây-dựng-các-ui-components-hiển-thị-neumorphism)
   - [Bước 6 — Xây dựng Modal Tạo Báo cáo & Lịch sử Xuất file](#bước-6--xây-dựng-modal-tạo-báo-cáo--lịch-sử-xuất-file)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/reports/reports-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthreportsreports-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /reports

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Trang `/reports` (**Trung tâm Báo cáo & Phân tích Dữ liệu An toàn Lao động**) là công cụ hoạch định chiến lược và chứng minh tuân thủ pháp lý của Ban Lãnh đạo và Bộ phận An toàn Sức khỏe Môi trường (HSE). Hệ thống chuyển hóa hàng triệu sự kiện vi phạm thô thành các báo cáo trực quan, có giá trị hành động cao. Trang này giải quyết 4 bài toán kinh doanh then chốt:

1. **Phân tích Xu hướng & Điểm mù An toàn (Safety Trend & Blind Spot Analytics):** Trực quan hóa diễn biến vi phạm theo thời gian (ngày, tuần, tháng) giúp phát hiện quy luật (ví dụ: các vi phạm không đội mũ thường tăng đột biến vào khung giờ 13:00 - 14:00 sau giờ nghỉ trưa, hoặc tập trung ở khu vực giàn giáo phía Bắc).
2. **Xếp hạng Rủi ro Camera & Công trường (Camera & Site Risk Profiling):** Tự động tổng hợp và xếp hạng các điểm nóng có tần suất vi phạm cao nhất, giúp Ban An toàn điều động cán bộ kiểm tra trọng điểm thay vì tuần tra dàn trải.
3. **Đa dạng Mẫu Báo cáo Chuẩn Hóa (Standardized Compliance Report Templates):** Cung cấp sẵn các mẫu báo cáo phục vụ mọi nhu cầu: Báo cáo Tuân thủ Ca làm việc Hàng ngày (Daily Shift Report), Báo cáo Tổng kết Tháng cho Ban Quản lý Dự án, Báo cáo Đột xuất cho Chủ đầu tư, và Hồ sơ Kiểm toán An toàn theo chuẩn thanh tra.
4. **Động cơ Xuất Báo cáo Tự động (Asynchronous Report Export Engine):** Xử lý sinh tài liệu nền (Background Document Generation) định dạng PDF (trình bày đồ họa đẹp mắt, sẵn sàng in ấn) và Excel/CSV (chứa dữ liệu bảng thô để nhập liệu vào các hệ sinh thái ERP/PowerBI của doanh nghiệp).

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Thống kê KPI Báo cáo (Bento Console):** 4 thẻ chỉ số: Tổng số vi phạm ghi nhận trong kỳ, Tỷ lệ tuân thủ toàn công trường, Điểm nóng rủi ro cao nhất (Camera Code), Số lượng báo cáo đã phát hành trong tháng.
  2. **Thanh Điều hướng & Bộ lọc Thời gian Neumorphic:** Lọc theo Công trường (`siteId`), Phân khu (`zoneId`), Khoảng thời gian (Hôm nay, 7 ngày qua, Tháng này, Tùy chọn ngày bắt đầu - kết thúc).
  3. **Biểu đồ Trực quan Đa chiều (Interactive Neumorphic Charts):**
     - Biểu đồ đường (Line Chart): Xu hướng vi phạm theo từng ngày.
     - Biểu đồ tròn/bánh (Donut Chart): Phân bố tỷ trọng các loại vi phạm (`NO_HELMET`, `NO_VEST`, `RESTRICTED_AREA`).
     - Biểu đồ cột ngang (Horizontal Bar Chart): Top 5 Camera ghi nhận nhiều vi phạm nhất.
  4. **Thẻ Mẫu Báo cáo Tiêu chuẩn (Report Templates Showcase):** Lưới các mẫu báo cáo có sẵn (Daily, Monthly, Audit) kèm nút "Xuất báo cáo ngay".
  5. **Modal Kích hoạt Tạo Báo cáo (Generate Report Modal):** Chọn mẫu báo cáo, chọn định dạng xuất (`PDF` hoặc `EXCEL`), chọn phạm vi công trường, tùy chọn đính kèm ảnh bằng chứng snapshot.
  6. **Bảng Lịch sử & Hàng đợi Xuất Báo cáo (Report Generation History & Queue):**
     - Theo dõi trạng thái sinh file (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
     - Nút "Tải về" (Download) trực tiếp khi file đã sẵn sàng kèm thời gian hết hạn của liên kết.
  7. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không nhúng công cụ chỉnh sửa template kéo thả phức tạp (Wysiwyg template builder) — các mẫu template được định nghĩa chuẩn hóa ở phía backend.
  - Không gửi báo cáo trực tiếp qua máy in vật lý.

---

## 1. Khảo sát Backend Contract (smart-ppe-reporting-service)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-reporting-service` (cổng 8885 / Gateway Traefik `/api/v1/statistics` & `/api/v1/reports`):
- Controller: [reporting.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-reporting-service/src/modules/reporting/reporting.controller.ts)
- Routes: [reporting.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-reporting-service/src/modules/reporting/reporting.route.ts)
- DTOs: [reporting.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-reporting-service/src/modules/reporting/reporting.dto.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Tổng quan Số liệu** | `GET` | `/api/v1/statistics/summary` | `PPE_REPORTING_READ` | Query: `siteId, fromDate, toDate` | `{ success: true, data: DashboardSummaryDto }` |
| **Xu hướng Vi phạm** | `GET` | `/api/v1/statistics/trends` | `PPE_REPORTING_READ` | Query: `siteId, interval: 'day'\|'week'\|'month', fromDate, toDate` | `{ success: true, data: TrendItemDto[] }` |
| **Phân loại Vi phạm** | `GET` | `/api/v1/statistics/by-violation` | `PPE_REPORTING_READ` | Query: `siteId, fromDate, toDate` | `{ success: true, data: ViolationDistributionDto[] }` |
| **Xếp hạng Camera** | `GET` | `/api/v1/statistics/by-camera` | `PPE_REPORTING_READ` | Query: `siteId, limit, fromDate, toDate` | `{ success: true, data: CameraRankingDto[] }` |
| **Danh sách Mẫu Báo cáo**|`GET`| `/api/v1/reports/templates` | `PPE_REPORTING_READ` | Không | `{ success: true, data: ReportTemplateDto[] }` |
| **Tạo mới Mẫu Báo cáo** |`POST`| `/api/v1/reports/templates` | `PPE_REPORTING_EXPORT` | Body: `CreateReportTemplateDto` | `{ success: true, data: ReportTemplateDto }` (201) |
| **Kích hoạt Tạo Báo cáo**|`POST`| `/api/v1/reports/generate` | `PPE_REPORTING_EXPORT` | Body: `{ templateId, siteId?, format: 'PDF'\|'EXCEL'\|'CSV', fromDate, toDate }` | `{ success: true, message: string, data: ReportGenerationDto }` |
| **Lịch sử Báo cáo** | `GET` | `/api/v1/reports/history` | `PPE_REPORTING_READ` | Query: `page, limit, status, format` | `{ success: true, data: ReportGenerationDto[], meta: PaginationMeta }` |
| **Tải Báo cáo Hoàn tất**| `GET` | `/api/v1/reports/:id/download` | `PPE_REPORTING_EXPORT` | Params: `id (UUID)` | `{ success: true, data: { downloadUrl: string, fileName: string } }` |

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/reports/
│   ├── page.tsx                                      ← Server Component bọc Suspense (đã có)
│   └── reports-content.tsx                           ← NÂNG CẤP: Lắp ráp giao diện Trung tâm Báo cáo hoàn chỉnh
│
├── src/
│   ├── types/
│   │   ├── reporting.types.ts                        ← MỚI: DTOs, Enums, ChartTypes, TemplateTypes, GenerationTypes
│   │   └── index.ts                                  ← SỬA: Re-export reporting.types.ts
│   │
│   ├── services/
│   │   ├── reporting.service.ts                      ← MỚI: Client gọi 9 endpoint của reporting-service
│   │   └── index.ts                                  ← SỬA: Re-export reporting.service.ts
│   │
│   ├── hooks/reporting/                             ← MỚI: Thư mục hooks quản lý báo cáo
│   │   ├── index.ts                                  ← Export toàn bộ hooks
│   │   ├── reporting.query-keys.ts                   ← Quản lý Query Keys chuẩn
│   │   ├── use-report-statistics.ts                  ← Lấy dữ liệu biểu đồ: Trends, By-violation, By-camera
│   │   ├── use-report-templates.ts                   ← Lấy danh sách mẫu template báo cáo
│   │   ├── use-report-history.ts                     ← Lấy hàng đợi và lịch sử xuất file
│   │   └── use-generate-report.ts                    ← Mutation kích hoạt tạo báo cáo kèm polling trạng thái
│   │
│   ├── components/features/reports/                  ← MỚI: UI Components Neumorphism
│   │   ├── report-kpi-summary.tsx                    ← 4 thẻ Bento Console thống kê nhanh
│   │   ├── report-filter-toolbar.tsx                 ← Thanh chọn Site, khoảng ngày, nút "+ Xuất Báo cáo"
│   │   ├── report-trend-chart.tsx                    ← Biểu đồ đường xu hướng vi phạm Neumorphic
│   │   ├── report-violation-donut.tsx                ← Biểu đồ tròn phân bố tỷ trọng vi phạm
│   │   ├── report-camera-ranking.tsx                 ← Bảng xếp hạng các camera điểm nóng rủi ro
│   │   ├── report-template-cards.tsx                 ← Lưới các thẻ mẫu báo cáo tiêu chuẩn (Daily, Monthly, Audit)
│   │   ├── report-history-table.tsx                  ← Bảng danh sách báo cáo đã xuất kèm nút Download
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── generate-report-modal.tsx             ← Modal chọn thông số và kích hoạt xuất file
│   │       └── template-detail-modal.tsx             ← Modal xem cấu trúc nội dung của mẫu báo cáo
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "reports.*"
│       └── en-US.json                                ← Bổ sung namespace "reports.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục trang tổng thể (12 cột, Responsive)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon BarChart3 + "Trung tâm Báo cáo & Phân tích An toàn" + Badge "ANALYTICS"│
│            + [ Nút: "+ Tạo Báo cáo Mới" ]  [ Nút: "📥 Lịch sử Xuất file (3)" ]          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BENTO CONSOLE KPI CARDS] (4 cột desktop, 2 cột tablet, 1 cột mobile)                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│ │ 📉 Tổng vi phạm │ │ 🛡️ Tỷ lệ Tuân thủ│ │ ⚠️ Điểm nóng rủi ro│ │ 📄 Báo cáo đã xuất│     │
│ │      184 vụ    │ │     94.5%      │ │ CAM-NORTH-01 (42)│ │    18 Hồ sơ    │           │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [FILTER TOOLBAR]: [ Công trường: Tất cả ▼ ] [ Khoảng ngày: 30 ngày qua ▼ ] [ 🔄 Tải lại]│
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│ CỘT TRÁI (8 CỘT): XU HƯỚNG THEO THỜI GIAN         │ CỘT PHẢI (4 CỘT): TỶ TRỌNG VI PHẠM │
│ ┌───────────────────────────────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ 📈 BIỂU ĐỒ XU HƯỚNG VI PHẠM (TREND LINE)      │ │ │ 🍩 PHÂN BỐ THEO LOẠI BẢO HỘ    │ │
│ │                                               │ │ │ 🔴 Không Mũ (NO_HELMET): 58%   │ │
│ │      /\                                       │ │ │ 🟠 Không Áo (NO_VEST):   32%   │ │
│ │  ___/  \______/\                              │ │ │ 🟣 Vùng cấm (RESTRICTED): 10%  │ │
│ │                  \______                      │ │ └────────────────────────────────┘ │
│ └───────────────────────────────────────────────┘ │                                    │
├───────────────────────────────────────────────────┴────────────────────────────────────┤
│ [BẢNG XẾP HẠNG CAMERA ĐIỂM NÓNG (RISK RANKING)]                                        │
│ 1. CAM-NORTH-01 (Giàn giáo Tầng 5) ── 42 vi phạm (Mức độ: CRITICAL)                    │
│ 2. CAM-WAREHOUSE-03 (Xưởng Hàn)    ── 28 vi phạm (Mức độ: HIGH)                        │
│ 3. CAM-GATE-02 (Cổng kiểm soát)    ── 12 vi phạm (Mức độ: MEDIUM)                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [MẪU BÁO CÁO TIÊU CHUẨN (TEMPLATES)] & [HÀNG ĐỢI XUẤT FILE]                            │
│ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐         │
│ │ 📄 Báo cáo Tuân thủ Hàng ngày      │ │ 📊 Báo cáo Tổng kết Tháng (HSE)    │         │
│ │ Thống kê ca làm việc, vi phạm nổi bật│ │ Phân tích xu hướng, so sánh chỉ số│        │
│ │ Định dạng: [ PDF ] [ EXCEL ]       │ │ Định dạng: [ PDF ] [ EXCEL ]       │         │
│ │ [ Nút: "Kích hoạt Xuất Báo cáo" ]  │ │ [ Nút: "Kích hoạt Xuất Báo cáo" ]  │         │
│ └────────────────────────────────────┘ └────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: Report Generation Engine, Queue Polling & Visual Charts

### 4.1 Quy trình Sinh Tài liệu Bất đồng bộ (Async Export & Polling)
Quá trình tạo tài liệu PDF/Excel tổng hợp hàng nghìn sự kiện kèm hình ảnh snapshot có thể mất từ 5 đến 15 giây. Nhằm tránh làm đơ giao diện người dùng:
1. Khi bấm "Kích hoạt Xuất Báo cáo", client gửi `POST /api/v1/reports/generate`.
2. Backend trả về ngay mã nhiệm vụ (`generationId`) với trạng thái `PENDING` hoặc `PROCESSING`.
3. Client đóng modal và kích hoạt polling qua React Query với tần suất 3 giây một lần:
   - Khi trạng thái chuyển sang `COMPLETED`: Dừng polling, kích hoạt âm thanh thông báo nhẹ, hiển thị Toast xanh "Báo cáo của bạn đã sẵn sàng!" kèm nút "Tải ngay".
   - Tự động thêm bản ghi vào Bảng Lịch sử Xuất file.
4. Khi người dùng bấm Tải, gọi `GET /api/v1/reports/:id/download` nhận link presigned MinIO tải trực tiếp về máy tính.

### 4.2 Thiết kế Đồ họa Biểu đồ Chuẩn Neumorphic Soft UI
Các biểu đồ được xây dựng với Vanilla SVG kết hợp các biến màu CSS từ hệ thống Design System:
- Đường cong xu hướng mượt mà (Bézier curves) có vùng bóng đổ phát sáng (Glow drop-shadow).
- Các điểm nút (Nodes) được tạo hiệu ứng nổi 3D (`nm-raised`), khi rê chuột (hover) sẽ hiển thị Tooltip kính mờ (Glassmorphism) ghi rõ ngày tháng và số lượng vi phạm cụ thể.

---

## 5. Ma trận phân quyền & RBAC Access Control

| Vai trò | Xem Thống kê & Biểu đồ | Xem Lịch sử Báo cáo | Xuất Báo cáo (PDF / Excel) | Tạo Mẫu Báo cáo Mới |
|---|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có (`PPE_REPORTING_EXPORT`) | ✅ Có |
| **SAFETY_MANAGER** | ✅ Có quyền | ✅ Có | ✅ Có (Site phụ trách) | ❌ Bị vô hiệu hóa |
| **SAFETY_OFFICER** | ✅ Xem (`READ`) | ✅ Có | ❌ Bị vô hiệu hóa | ❌ Bị vô hiệu hóa |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/reporting.types.ts`)
- Định nghĩa `DashboardSummaryDto`, `TrendItemDto`, `ViolationDistributionDto`, `CameraRankingDto`.
- Định nghĩa `ReportTemplateDto`, `ReportGenerationDto`, `GenerateReportPayload`.
- Enum `ReportFormat`: `PDF`, `EXCEL`, `CSV`.
- Enum `ReportGenerationStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.

### Bước 2 — Tầng Service API (`src/services/reporting.service.ts`)
Tạo `reportingService` bao bọc 9 hàm API:
- `getSummary(params?: FilterParams)`
- `getTrends(params?: TrendParams)`
- `getViolationDistribution(params?: FilterParams)`
- `getCameraRankings(params?: RankingParams)`
- `getTemplates()` & `getTemplateById(id: string)`
- `generateReport(payload: GenerateReportPayload)`
- `getReportHistory(params?: PaginationParams)`
- `getReportDownloadUrl(id: string)`

### Bước 3 — Tầng React Query Hooks (`src/hooks/reporting/`)
- `reporting.query-keys.ts`: Factory quản lý query keys: `reportingKeys.summary`, `reportingKeys.trends`, `reportingKeys.distribution`, `reportingKeys.rankings`, `reportingKeys.templates`, `reportingKeys.history`.
- `use-report-statistics.ts`: Lấy toàn bộ số liệu biểu đồ.
- `use-report-templates.ts`: Lấy danh sách mẫu template.
- `use-report-history.ts`: Lấy lịch sử xuất báo cáo.
- `use-generate-report.ts`: Xử lý gọi API sinh file và polling kết quả.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật `vi-VN.json` và `en-US.json`:
- `reports.title`, `reports.description`, `reports.kpi.*`
- `reports.charts.*` (trends, distribution, cameraRanking, dateRange)
- `reports.templates.*` (dailyCompliance, monthlySummary, auditReport)
- `reports.generate.*` (selectFormat, selectSite, generating, completed, downloadNow)
- `reports.history.*` (fileName, format, createdAt, status, actions)

### Bước 5 — Xây dựng các UI Components hiển thị Neumorphism
- `report-kpi-summary.tsx`: 4 thẻ Bento Console thống kê nhanh.
- `report-filter-toolbar.tsx`: Thanh điều hướng chọn Site và khoảng ngày.
- `report-trend-chart.tsx`: Biểu đồ đường Neumorphic hiển thị xu hướng.
- `report-violation-donut.tsx`: Biểu đồ bánh phân bố tỷ trọng vi phạm.
- `report-camera-ranking.tsx`: Danh sách xếp hạng điểm nóng rủi ro.
- `report-template-cards.tsx`: Lưới các thẻ mẫu báo cáo có nút thao tác nhanh.

### Bước 6 — Xây dựng Modal Tạo Báo cáo & Lịch sử Xuất file
- `generate-report-modal.tsx`: Modal cho phép chọn định dạng (PDF/Excel), công trường và khoảng ngày.
- `report-history-table.tsx`: Bảng danh sách các tài liệu đã xuất kèm trạng thái và nút Download.

### Bước 7 — Lắp ráp trang chính (`app/(auth)/reports/reports-content.tsx`)
Thay thế placeholder hiện tại bằng component hoàn chỉnh kết nối toàn bộ Hooks, Summary Cards, Biểu đồ, Danh mục Templates và Bảng Lịch sử.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm tra hiển thị biểu đồ sắc nét trên cả màn hình Desktop và Mobile.
- Kiểm tra tiến trình Polling tạo báo cáo tự động chuyển trạng thái khi file hoàn thành.
- Kiểm tra tính toàn vẹn của file PDF và Excel tải về máy.

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Khoảng ngày xuất báo cáo vượt quá 365 ngày | Báo lỗi inline "Khoảng thời gian xuất báo cáo tối đa là 1 năm", chặn submit |
| **401 Unauthorized**| Hết hạn phiên khi đang tạo báo cáo | Chuyển hướng về `/login` |
| **403 Forbidden**   | Cán bộ an toàn cố gắng xuất báo cáo tổng hợp | Ẩn nút tạo báo cáo, hiển thị Toast cảnh báo quyền hạn nếu gọi API |
| **404 Not Found**   | File báo cáo đã hết hạn trên MinIO | Toast báo lỗi "Liên kết tải về đã hết hạn. Vui lòng kích hoạt xuất lại báo cáo" |
| **500 Server Error**| Lỗi worker khi render file PDF | Đánh dấu trạng thái `FAILED` trong bảng lịch sử kèm nút "Thử lại" |

---

## 8. Checklist hoàn thiện nghiệm thu

- [ ] Route `/reports` được bảo vệ bằng Route Guard với quyền `PPE_REPORTING_READ`.
- [ ] 4 thẻ Bento Console hiển thị đúng số liệu thống kê tổng hợp từ API.
- [ ] Biểu đồ Xu hướng (Trends) và Phân bố Vi phạm (Donut) hiển thị trực quan, mượt mà.
- [ ] Bảng xếp hạng rủi ro Camera phản ánh chính xác các điểm nóng.
- [ ] Tính năng Kích hoạt Tạo Báo cáo hoạt động hoàn hảo cho cả định dạng PDF và Excel.
- [ ] Cơ chế Polling tự động bắt được trạng thái `COMPLETED` và mở nút Download.
- [ ] Bảng Lịch sử Báo cáo hiển thị đầy đủ các file đã xuất trong quá khứ.
- [ ] Phân quyền RBAC chặt chẽ cho hành động xuất file với quyền `PPE_REPORTING_EXPORT`.
- [ ] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) đồng bộ 100%.
- [ ] Thiết kế Neumorphism chuẩn mực, tương thích hoàn hảo Dark Mode và Light Mode.
