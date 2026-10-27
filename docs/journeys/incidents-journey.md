# Hành trình xây dựng Trang Quản lý & Xử lý Vi phạm An toàn (/incidents & /incidents/[id]) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Trung tâm Xử lý Vi phạm Trang bị Bảo hộ & Sự cố An toàn (`/incidents` và `/incidents/[id]`) thuộc nhóm Giám sát An toàn (`safety-monitoring`) sau đăng nhập — danh sách sự cố vi phạm PPE do camera AI phát hiện thời gian thực, bảng điều khiển lọc đa tiêu chí, thẩm duyệt vi phạm (Xác nhận/Bác bỏ), quy trình xử lý khép kín (Lifecycle Stepper: Detected -> Under Review -> Confirmed/Dismissed -> Resolving -> Resolved -> Closed), phân công cán bộ an toàn điều phối (Incident Assignment), trao đổi nội bộ (Comments Timeline), giám định bằng chứng MinIO và xác thực toàn vẹn mã băm SHA-256 chống làm giả (Tamper Evidence Checksum Verification).  
> **Nguồn contract:** Backend `smart-ppe-incident-service` (cổng 8883 / Gateway Traefik cổng 80 tại `/api/v1/incidents` & `/api/v1/evidences`).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [cameras-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/cameras-journey.md) | [notifications-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/notifications-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền xem, duyệt, giải quyết, đóng và xóa sự cố, giám định bằng chứng)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — thẩm duyệt sự cố, phân công cán bộ điều phối, nghiệm thu đóng sự cố)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — nhận việc được phân công, cập nhật giải pháp khắc phục, gửi bình luận)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị hệ thống sự cố /incidents](#0-mục-tiêu--định-vị-hệ-thống-sự-cố-incidents)
1. [Khảo sát Backend Contract (smart-ppe-incident-service)](#1-khảo-sát-backend-contract-smart-ppe-incident-service)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Vòng đời Sự cố, Bounding Box AI & Checksum Toàn vẹn](#4-cơ-chế-kỹ-thuật-cốt-lõi-vòng-đời-sự-cố-bounding-box-ai--checksum-toàn-vẹn)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/incident.types.ts)](#bước-1--tầng-dtos--types-srctypesincidenttypests)
   - [Bước 2 — Tầng Service API (src/services/incident.service.ts)](#bước-2--tầng-service-api-srcservicesincidentservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/incidents/)](#bước-3--tầng-react-query-hooks-srchooksincidents)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components trang Danh sách (/incidents)](#bước-5--xây-dựng-các-ui-components-trang-danh-sách-incidents)
   - [Bước 6 — Xây dựng các UI Components trang Chi tiết (/incidents/[id])](#bước-6--xây-dựng-các-ui-components-trang-chi-tiết-incidentsid)
   - [Bước 7 — Xây dựng các Modal thẩm duyệt, phân công & giải quyết](#bước-7--xây-dựng-các-modal-thẩm-duyệt-phân-công--giải-quyết)
   - [Bước 8 — Lắp ráp 2 trang chính & Kiểm thử E2E](#bước-8--lắp-ráp-2-trang-chính--kiểm-thử-e2e)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị hệ thống sự cố /incidents

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Phân hệ Quản lý Sự cố (`/incidents` và `/incidents/[id]`) là trái tim vận hành của hệ thống Smart PPE. Mọi dữ liệu phân tích thị giác máy tính từ AI, mọi luồng video camera và cảnh báo an toàn đều hội tụ về đây dưới dạng các "Bản ghi Sự cố An toàn" (Safety Incidents). Hệ thống giải quyết 4 bài toán vận hành cốt lõi:

1. **Vòng đời Thẩm duyệt Chống Báo động Ảo (Human-in-the-loop Incident Lifecycle):** Dù mô hình AI YOLO có độ chính xác cao, các yếu tố môi trường (góc khuất, ngược sáng, công nhân đang ăn trưa trong lán trại) vẫn có thể gây hiểu nhầm. Hệ thống triển khai quy trình thẩm duyệt chuyên nghiệp: Cán bộ An toàn kiểm tra hình ảnh AI, bấm **Xác nhận (CONFIRM)** để chuyển thành sự cố chính thức hoặc **Bác bỏ (DISMISS)** kèm lý do cụ thể để huấn luyện lại mô hình.
2. **Điều phối & Khắc phục Hiện trường (Assignment & Remediation Dispatch):** Sau khi xác nhận vi phạm, Quản lý an toàn có thể phân công trực tiếp Cán bộ giám sát ca trực (`assignedToUserId`) kèm thời hạn chót (Deadline: 15 phút, 30 phút). Cán bộ hiện trường đến tận nơi xử lý, chụp ảnh khắc phục và nhập báo cáo giải pháp trước khi đổi trạng thái sang **Đã giải quyết (RESOLVED)**.
3. **Bằng chứng Thị giác Trực quan (Visual Evidence with AI Overlays):** Ảnh snapshot từ camera được hiển thị kèm khung hộp giới hạn (Bounding Box) phân biệt rõ: khung xanh bao quanh công nhân, khung đỏ cảnh báo phần đầu không đội mũ (`NO_HELMET`) hoặc thân trên không mặc áo phản quang (`NO_VEST`), kèm chỉ số độ tin cậy (`confidence`: 95%).
4. **Bảo đảm Tính Toàn vẹn Pháp lý của Bằng chứng (Tamper-proof Evidence Integrity):** Mọi ảnh chụp bằng chứng lưu trên MinIO đều được tính toán mã băm SHA-256 ngay khi tạo. Nút bấm **"Giám định toàn vẹn" (Verify Checksum)** cho phép đối chiếu mã băm thực tế của file với mã băm lưu trong DB, chứng minh bằng chứng không bị chỉnh sửa bằng Photoshop khi phục vụ điều tra tai nạn hoặc thanh tra bảo hiểm.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Trang Danh sách Sự cố (`/incidents`):**
     - Thống kê KPI: Tổng sự cố, Chờ thẩm duyệt (`DETECTED`), Đang xử lý (`RESOLVING`), Đã giải quyết (`RESOLVED`), Vi phạm Khẩn cấp (`CRITICAL`).
     - Bộ lọc đa năng: Lọc theo Công trường (`siteId`), Phân khu (`zoneId`), Camera (`cameraId`), Trạng thái, Mức độ nghiêm trọng (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), Loại vi phạm (`NO_HELMET`, `NO_VEST`, `RESTRICTED_AREA_ENTRY`), Cán bộ phụ trách, Khoảng ngày.
     - Tìm kiếm debounced theo mã sự cố, mô tả.
     - Bảng danh sách Neumorphic hiển thị ảnh thumbnail, badge mức độ, badge trạng thái, thời gian và các nút thao tác nhanh.
  2. **Trang Chi tiết Sự cố (`/incidents/[id]`):**
     - Thanh Header: Mã sự cố UUIDv7, Nút quay lại, Badge trạng thái lớn phát sáng.
     - Khối Trình chiếu Bằng chứng AI (Evidence Viewer): Ảnh snapshot độ nét cao có Bounding Box SVG hiển thị vị trí vi phạm, nút phóng to (Lightbox Zoom), nút tải ảnh gốc.
     - Trục Tiến trình Vòng đời (Lifecycle Stepper): `Phát hiện -> Thẩm duyệt -> Phân công -> Giải quyết -> Đóng sự cố`.
     - Thông tin Định danh Không gian & Thiết bị: Tên công trường, Phân khu, Mã camera, Độ tin cậy AI (Confidence %), Thời gian phát hiện (ISO).
     - Khối Phân công Điều phối (Assignment Card): Cán bộ phụ trách, Hạn xử lý, Mức ưu tiên.
     - Khối Thảo luận Hiện trường (Comments Timeline): Cho phép gửi bình luận trao đổi nội bộ.
     - Khối Giám định Pháp lý (Tamper Checksum Verification): Hiển thị mã băm SHA-256 và nút kiểm tra tính toàn vẹn.
  3. **Các Modal Tác vụ Nghiệp vụ:**
     - Modal Thẩm duyệt Sự cố (Review Dialog: Xác nhận / Bác bỏ kèm lý do).
     - Modal Phân công Cán bộ An toàn (Assign Officer Dialog).
     - Modal Giải quyết Sự cố (Resolve Dialog: Nhập giải pháp & Upload ảnh khắc phục).
     - Modal Đóng Sự cố (Close Dialog: Nghiệm thu cuối cùng).
  4. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không thay đổi worker phát hiện vi phạm chạy bằng Python trong `smart-ppe-ai-service`.
  - Không sửa đổi schema cơ sở dữ liệu của `smart-ppe-incident-service`.

---

## 1. Khảo sát Backend Contract (smart-ppe-incident-service)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-incident-service` (cổng 8883 / Gateway Traefik `/api/v1/incidents` & `/api/v1/evidences`):
- Controller: [incident.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-incident-service/src/modules/incident/incident.controller.ts)
- Routes: [incident.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-incident-service/src/modules/incident/incident.route.ts)
- DTOs: [incident.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-incident-service/src/modules/incident/incident.dto.ts)
- Evidence Storage: [evidence-storage.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-incident-service/src/modules/incident/evidence-storage.dto.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Danh sách Sự cố** | `GET` | `/api/v1/incidents` | `PPE_INCIDENT_READ` | Query: `siteId, zoneId, status, severity, violationType, page, limit...` | `{ success: true, data: IncidentItemDto[], meta: PaginationMeta }` |
| **Chi tiết Sự cố** | `GET` | `/api/v1/incidents/:id` | `PPE_INCIDENT_READ` | Params: `id (UUID)` | `{ success: true, data: IncidentDetailDto }` |
| **Tạo mới Thủ công** | `POST` | `/api/v1/incidents` | `PPE_INCIDENT_MANAGE` | Body: `CreateIncidentDto` | `{ success: true, message: string, data: IncidentItemDto }` (201) |
| **Cập nhật Sự cố** | `PUT` | `/api/v1/incidents/:id` | `PPE_INCIDENT_UPDATE` | Params: `id`, Body: `UpdateIncidentDto` | `{ success: true, message: string, data: IncidentItemDto }` |
| **Xóa Sự cố** | `DELETE`| `/api/v1/incidents/:id` | `PPE_INCIDENT_DELETE` | Params: `id` | `{ success: true, message: string }` |
| **Thẩm duyệt Sự cố** | `POST` | `/api/v1/incidents/:id/review` | `PPE_INCIDENT_REVIEW` | Params: `id`, Body: `{ action: 'CONFIRM'\|'DISMISS', reason?, notes? }` | `{ success: true, message: string, data: IncidentDetailDto }` |
| **Giải quyết Sự cố** | `POST` | `/api/v1/incidents/:id/resolve` | `PPE_INCIDENT_UPDATE` | Params: `id`, Body: `{ resolutionNote, correctiveAction }` | `{ success: true, message: string, data: IncidentDetailDto }` |
| **Đóng Sự cố** | `POST` | `/api/v1/incidents/:id/close` | `PPE_INCIDENT_MANAGE` | Params: `id`, Body: `{ closeNote? }` | `{ success: true, message: string, data: IncidentDetailDto }` |
| **Danh sách Phân công**| `GET` | `/api/v1/incidents/:id/assignments` | `PPE_INCIDENT_READ` | Params: `id` | `{ success: true, data: IncidentAssignmentDto[] }` |
| **Phân công Cán bộ** | `POST` | `/api/v1/incidents/:id/assignments` | `PPE_INCIDENT_MANAGE` | Params: `id`, Body: `{ assignedToUserId, priority, deadline?, note? }` | `{ success: true, message: string, data: IncidentAssignmentDto }` (201) |
| **Danh sách Bình luận**| `GET` | `/api/v1/incidents/:id/comments` | `PPE_INCIDENT_READ` | Params: `id` | `{ success: true, data: IncidentCommentDto[] }` |
| **Gửi Bình luận** | `POST` | `/api/v1/incidents/:id/comments` | `PPE_INCIDENT_UPDATE` | Params: `id`, Body: `{ comment }` | `{ success: true, message: string, data: IncidentCommentDto }` (201) |
| **Download Bằng chứng**| `GET` | `/api/v1/evidences/:id/download-url` | `PPE_INCIDENT_READ` | Params: `id` | `{ success: true, data: { downloadUrl: string, expiresIn: number } }` |
| **Giám định Checksum**| `GET` | `/api/v1/evidences/:id/verify-checksum`| `PPE_INCIDENT_READ` | Params: `id` | `{ success: true, data: { isTampered: boolean, expectedChecksum, actualChecksum } }` |

### 1.2 Trạng thái Vòng đời Sự cố (Incident Status Enum)
```typescript
export const INCIDENT_STATUS = {
  DETECTED: "DETECTED",         // AI mới phát hiện, chờ Cán bộ An toàn kiểm tra
  CONFIRMED: "CONFIRMED",       // Đã xác nhận đúng là vi phạm thực tế
  DISMISSED: "DISMISSED",       // Bác bỏ (Báo động ảo / Sai sót góc nhìn)
  IN_PROGRESS: "IN_PROGRESS",   // Đang trong quá trình xử lý hiện trường
  RESOLVED: "RESOLVED",         // Đã khắc phục vi phạm
  CLOSED: "CLOSED",             // Nghiệm thu hoàn tất và lưu trữ
} as const;
```

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/incidents/
│   ├── page.tsx                                      ← Server Component bọc Suspense danh sách (đã có)
│   ├── incidents-content.tsx                         ← NÂNG CẤP: Lắp ráp Bảng điều khiển Quản lý Sự cố
│   │
│   └── [id]/
│       ├── page.tsx                                  ← Server Component bọc Suspense chi tiết (đã có)
│       └── incident-detail-content.tsx               ← NÂNG CẤP: Lắp ráp Màn hình Chi tiết Sự cố & Giám định Bằng chứng
│
├── src/
│   ├── types/
│   │   ├── incident.types.ts                         ← MỚI: DTOs, Enums, BoundingBoxTypes, EvidenceTypes, LifecycleTypes
│   │   └── index.ts                                  ← SỬA: Re-export incident.types.ts
│   │
│   ├── services/
│   │   ├── incident.service.ts                       ← MỚI: Client gọi 14 endpoint của incident-service
│   │   └── index.ts                                  ← SỬA: Re-export incident.service.ts
│   │
│   ├── hooks/incidents/                              ← MỚI: Thư mục hooks quản lý sự cố
│   │   ├── index.ts                                  ← Export toàn bộ hooks
│   │   ├── incident.query-keys.ts                    ← Quản lý Query Keys chuẩn
│   │   ├── use-incidents.ts                          ← Lấy danh sách sự cố có lọc, tìm kiếm và phân trang
│   │   ├── use-incident-detail.ts                    ← Lấy chi tiết sự cố theo ID
│   │   ├── use-incident-lifecycle.ts                 ← Các mutations: Review, Resolve, Close sự cố
│   │   ├── use-incident-assignments.ts               ← Lấy & phân công cán bộ an toàn
│   │   ├── use-incident-comments.ts                  ← Lấy & gửi bình luận thảo luận
│   │   └── use-evidence-integrity.ts                 ← Kiểm tra Checksum SHA-256 tính toàn vẹn bằng chứng
│   │
│   ├── components/features/incidents/                ← MỚI: UI Components Neumorphism
│   │   ├── incident-kpi-summary.tsx                  ← 4 thẻ Bento Console thống kê nhanh
│   │   ├── incident-filter-toolbar.tsx               ← Thanh tìm kiếm, lọc Site/Zone/Camera/Status/Severity
│   │   ├── incident-table.tsx                        ← Bảng danh sách sự cố có phân trang
│   │   ├── incident-status-badge.tsx                 ← Huy hiệu trạng thái vòng đời phát sáng 3D
│   │   ├── incident-severity-badge.tsx               ← Huy hiệu mức độ nghiêm trọng (Critical: Đỏ, High: Cam...)
│   │   ├── incident-lifecycle-stepper.tsx            ← Trục tiến trình 5 bước vòng đời xử lý
│   │   ├── incident-evidence-viewer.tsx              ← Khung xem ảnh snapshot có SVG Bounding Box overlay
│   │   ├── incident-meta-card.tsx                    ← Khối thông tin địa điểm, camera, thời gian, confidence
│   │   ├── incident-assignment-card.tsx              ← Khối thông tin cán bộ phụ trách & deadline
│   │   ├── incident-comments-timeline.tsx            ← Trục thời gian trao đổi bình luận nội bộ
│   │   ├── incident-checksum-verifier.tsx            ← Khối hiển thị mã băm SHA-256 & trạng thái toàn vẹn
│   │   │
│   │   └── modals/                                   ← Các modal tương tác nghiệp vụ
│   │       ├── review-incident-modal.tsx             ← Modal Thẩm duyệt (Xác nhận / Bác bỏ có chọn lý do)
│   │       ├── assign-incident-modal.tsx             ← Modal Phân công cán bộ an toàn phụ trách
│   │       ├── resolve-incident-modal.tsx            ← Modal Nhập giải pháp khắc phục sự cố
│   │       └── close-incident-dialog.tsx             ← Hộp thoại Xác nhận Đóng sự cố
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "incidents.*"
│       └── en-US.json                                ← Bổ sung namespace "incidents.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục Màn hình Chi tiết Sự cố (`/incidents/[id]`)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Header: [← Quay lại Danh sách]  Mã: #INC-20261028-0012   [ 🔴 CRITICAL - CHỜ THẨM DUYỆT ]│
│         [ Nút: "✓ Thẩm duyệt" ]  [ Nút: "👤 Phân công" ]  [ Nút: "🛡️ Giải quyết" ]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [LIFECYCLE STEPPER]                                                                    │
│ (1) 🟢 Phát hiện AI ─── (2) 🟡 Thẩm duyệt ─── (3) ⚪ Phân công ─── (4) ⚪ Khắc phục ─── (5) ⚪ Đóng│
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│ CỘT TRÁI (7 CỘT): BẰNG CHỨNG THỊ GIÁC AI          │ CỘT PHẢI (5 CỘT): CHI TIẾT & TÁC VỤ│
│ ┌───────────────────────────────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ 🖼️ ẢNH SNAPSHOT BẰNG CHỨNG (1920x1080)        │ │ │ 📌 THÔNG TIN ĐỊA ĐIỂM & CAMERA │ │
│ │ ┌───────────────────────────────────────────┐ │ │ │ Công trường: Landmark Tower 81  │ │
│ │ │           [ 👤 KHUNG XANH ]               │ │ │ │ Phân khu: Giàn giáo Tầng 5     │ │
│ │ │        ┌─────────────────────┐            │ │ │ │ Camera: CAM-NORTH-01           │ │
│ │ │        │ ⚠️ KHÔNG ĐỘI MŨ (96%)│            │ │ │ │ Thời gian: 28/10 03:15:22      │ │
│ │ │        └─────────────────────┘            │ │ │ │ Loại: NO_HELMET (Mức CRITICAL) │ │
│ │ └───────────────────────────────────────────┘ │ │ └────────────────────────────────┘ │
│ │ [ 🔍 Phóng to ảnh ] [ 📥 Tải ảnh gốc ]         │ │ ┌────────────────────────────────┐ │
│ ├───────────────────────────────────────────────┤ │ │ 👤 ĐIỀU PHỐI & PHÂN CÔNG        │ │
│ │ 🔒 GIÁM ĐỊNH TÍNH TOÀN VẸN PHÁP LÝ            │ │ │ Phụ trách: Trần Văn C (Officer)  │ │
│ │ Mã băm SHA-256: 7f83b165...e3b0c442           │ │ │ Hạn xử lý: 03:45 (còn 20 phút) │ │
│ │ Trạng thái: 🟢 TOÀN VẸN (Không bị chỉnh sửa)  │ │ └────────────────────────────────┘ │
│ │ [ Nút: "Kiểm tra lại Checksum" ]              │ │ ┌────────────────────────────────┐ │
│ └───────────────────────────────────────────────┘ │ │ 💬 TRAO ĐỔI HIỆN TRƯỜNG         │ │
│                                                   │ │ Officer: "Đang lên tầng 5.."   │ │
│                                                   │ │ [ Nhập bình luận... ] [ Gửi ]  │ │
│                                                   │ └────────────────────────────────┘ │
└───────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: Vòng đời Sự cố, Bounding Box AI & Checksum Toàn vẹn

### 4.1 Cơ chế Vẽ Hộp Bounding Box Động bằng SVG
Component `incident-evidence-viewer.tsx`:
- Nhận tọa độ hộp vi phạm từ API: `{ x, y, width, height }` theo tỷ lệ chuẩn hóa `[0, 1]` hoặc pixel tuyệt đối.
- Sử dụng lớp phủ SVG (`<svg viewBox="0 0 100 100" preserveAspectRatio="none">`) đè lên thẻ `<img>`.
- Vẽ khung chữ nhật nổi bật:
  - Khung bao người (`person`): Viền nét đứt màu xanh dương dịu (`stroke="rgba(59,130,246,0.8)"`).
  - Khung vi phạm (`NO_HELMET` / `NO_VEST`): Viền đỏ cảnh báo phát sáng (`stroke="#ef4444" stroke-width="2"`), kèm thẻ Badge chữ nhật hiển thị tên vi phạm và độ tin cậy `96%`.

### 4.2 Giám định Bằng chứng Chống Làm giả (Tamper Checksum Verification)
Quy trình đảm bảo bằng chứng pháp lý:
1. Khi AI chụp ảnh, server tính toán mã SHA-256: `hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')` và lưu vào DB.
2. Tại màn hình chi tiết sự cố, người dùng bấm "Kiểm tra tính toàn vẹn".
3. Hook `useEvidenceIntegrity` gọi API `/api/v1/evidences/:id/verify-checksum`.
4. Backend tải stream file từ MinIO, băm lại SHA-256 và so sánh với giá trị lúc tạo.
5. Nếu khớp 100%: Giao diện hiện huy hiệu xanh lá "BẰNG CHỨNG TOÀN VẸN — ĐỦ HIỆU LỰC PHÁP LÝ". Nếu sai lệch (dù chỉ 1 bit): Báo động đỏ "CẢNH BÁO: BẰNG CHỨNG CÓ DẤU HIỆU BỊ CAN THIỆP".

---

## 5. Ma trận phân quyền & RBAC Access Control

| Vai trò | Xem Danh sách & Chi tiết | Thẩm duyệt (Confirm/Dismiss) | Phân công Điều phối | Giải quyết (Resolve) | Đóng Sự cố (Close) | Xóa Sự cố |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **SAFETY_MANAGER** | ✅ Có quyền | ✅ Có | ✅ Có | ✅ Có | ✅ Có | ❌ Chặn |
| **SAFETY_OFFICER** | ✅ Có quyền | ❌ Chặn | ❌ Chặn | ✅ Có (Khi được phân công)| ❌ Chặn | ❌ Chặn |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/incident.types.ts`)
- Định nghĩa `IncidentItem`, `IncidentDetail`, `EvidenceItem`, `IncidentAssignmentDto`, `IncidentCommentDto`.
- Enums: `IncidentStatus`, `IncidentSeverity`, `ViolationType`.
- DTOs: `ReviewIncidentDto`, `ResolveIncidentDto`, `CloseIncidentDto`, `CreateAssignmentDto`.

### Bước 2 — Tầng Service API (`src/services/incident.service.ts`)
Tạo `incidentService` bao bọc 14 hàm API:
- `getIncidents(params?: IncidentQuery)`
- `getIncidentById(id: string)`
- `reviewIncident(id: string, payload: ReviewIncidentDto)`
- `resolveIncident(id: string, payload: ResolveIncidentDto)`
- `closeIncident(id: string, payload: CloseIncidentDto)`
- `getAssignments(id: string)` & `assignOfficer(id: string, payload: CreateAssignmentDto)`
- `getComments(id: string)` & `addComment(id: string, comment: string)`
- `getEvidenceDownloadUrl(evidenceId: string)` & `verifyEvidenceIntegrity(evidenceId: string)`

### Bước 3 — Tầng React Query Hooks (`src/hooks/incidents/`)
- `incident.query-keys.ts`: Factory quản lý query keys: `incidentKeys.all`, `incidentKeys.list(filters)`, `incidentKeys.detail(id)`, `incidentKeys.assignments(id)`, `incidentKeys.comments(id)`.
- `use-incidents.ts`: Lấy danh sách sự cố có debounce search và filters.
- `use-incident-detail.ts`: Lấy chi tiết sự cố theo ID.
- `use-incident-lifecycle.ts`: Xử lý mutations review, resolve, close.
- `use-evidence-integrity.ts`: Xử lý kiểm tra mã băm SHA-256.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật `vi-VN.json` và `en-US.json`:
- `incidents.title`, `incidents.description`, `incidents.kpi.*`
- `incidents.status.*` (detected, confirmed, dismissed, inProgress, resolved, closed)
- `incidents.severity.*` (critical, high, medium, low)
- `incidents.actions.*` (review, confirm, dismiss, assign, resolve, close, verify)
- `incidents.evidence.*` (confidence, tamperProof, verified, tamperedAlert)

### Bước 5 — Xây dựng các UI Components trang Danh sách (`/incidents`)
- `incident-kpi-summary.tsx`: 4 thẻ Bento Console thống kê nhanh.
- `incident-filter-toolbar.tsx`: Thanh điều hướng lọc Site, Zone, Camera, Mức độ và Trạng thái.
- `incident-table.tsx`: Bảng dữ liệu Neumorphic hiển thị ảnh thumbnail, badge mức độ và nút "Xem chi tiết".

### Bước 6 — Xây dựng các UI Components trang Chi tiết (`/incidents/[id]`)
- `incident-evidence-viewer.tsx`: Bộ hiển thị ảnh snapshot có SVG Bounding Box overlay.
- `incident-lifecycle-stepper.tsx`: Trục tiến trình 5 bước vòng đời xử lý sự cố.
- `incident-meta-card.tsx` & `incident-assignment-card.tsx`: Các khối thông tin chi tiết.
- `incident-comments-timeline.tsx`: Khung chat/bình luận nội bộ có avatar và mốc thời gian.
- `incident-checksum-verifier.tsx`: Khối giám định mã băm SHA-256.

### Bước 7 — Xây dựng các Modal thẩm duyệt, phân công & giải quyết
- `review-incident-modal.tsx`: Modal cho phép chọn "Xác nhận vi phạm" hoặc "Bác bỏ" kèm lý do.
- `assign-incident-modal.tsx`: Modal chọn Cán bộ An toàn từ danh sách nhân sự và đặt deadline.
- `resolve-incident-modal.tsx`: Modal nhập giải pháp khắc phục hiện trường.
- `close-incident-dialog.tsx`: Hộp thoại xác nhận đóng và lưu trữ hồ sơ sự cố.

### Bước 8 — Lắp ráp 2 trang chính & Kiểm thử E2E
- Lắp ráp `app/(auth)/incidents/incidents-content.tsx`.
- Lắp ráp `app/(auth)/incidents/[id]/incident-detail-content.tsx`.
- Kiểm thử luồng hoàn chỉnh: Phát hiện -> Thẩm duyệt Xác nhận -> Phân công -> Giải quyết -> Đóng sự cố.
- Kiểm thử tính năng giám định Checksum mã băm SHA-256 thành công.

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Bác bỏ sự cố mà không nhập lý do | Báo lỗi inline "Vui lòng nhập lý do bác bỏ sự cố", chặn submit |
| **401 Unauthorized**| Hết hạn token khi đang thẩm duyệt sự cố | Chuyển hướng về `/login` |
| **403 Forbidden**   | Cán bộ an toàn thông thường cố gắng đóng sự cố | Nút bị ẩn, hiển thị Toast cảnh báo quyền hạn nếu cố tình gọi API |
| **404 Not Found**   | Không tìm thấy sự cố theo ID truyền trên URL | Hiển thị màn hình Empty State "Không tìm thấy sự cố này" kèm nút quay về danh sách |
| **Image Load Error**| Ảnh snapshot trên MinIO bị lỗi hoặc link presigned hết hạn | Hiển thị ảnh fallback kèm nút "Tạo lại link xem ảnh" |
| **500 Server Error**| Lỗi cơ sở dữ liệu khi cập nhật vòng đời | Toast báo lỗi màu đỏ, giữ nguyên modal để người dùng thử lại |

---

## 8. Checklist hoàn thiện nghiệm thu

- [ ] Cả 2 route `/incidents` và `/incidents/[id]` được bảo vệ bằng Route Guard với quyền `PPE_INCIDENT_READ`.
- [ ] 4 thẻ Bento Console phản ánh số liệu thực tế từ API.
- [ ] Bộ lọc đa tiêu chí lọc chính xác sự cố theo Công trường, Camera, Mức độ và Trạng thái.
- [ ] Khung xem bằng chứng hiển thị rõ nét ảnh snapshot kèm Bounding Box SVG nhận diện người và vật thể vi phạm.
- [ ] Trục tiến trình vòng đời (Lifecycle Stepper) cập nhật trạng thái chuẩn xác qua từng bước.
- [ ] Thao tác Thẩm duyệt (Xác nhận / Bác bỏ) hoạt động mượt mà.
- [ ] Thao tác Phân công cán bộ và Đóng sự cố kiểm soát đúng quyền hạn RBAC.
- [ ] Tính năng Giám định Mã băm Checksum SHA-256 chứng minh tính toàn vẹn của bằng chứng thành công.
- [ ] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) chuyển đổi tức thì không sót chuỗi.
- [ ] Thiết kế Neumorphism chuẩn mực, tương thích hoàn hảo Dark Mode và Light Mode.
