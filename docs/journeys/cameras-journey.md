# Hành trình xây dựng Trang Quản lý Camera & Luồng Giám sát RTSP (/cameras) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Quản lý Camera & Luồng Giám sát Video Thông minh (`/cameras`) thuộc nhóm Giám sát An toàn (`safety-monitoring`) sau đăng nhập — quản lý danh mục thiết bị camera AI theo công trường/phân khu, trình chiếu video luồng trực tiếp (Live Video Stream Player RTSP/HLS/WebRTC), bố cục lưới đa camera (Multi-view Grid 1x1, 2x2, 3x3), cấu hình vùng nhận diện an toàn (AI Region of Interest - ROI Calibration), kiểm tra nhịp tim camera (Live Ping Test) và nhật ký ổn định luồng (Stream Health Logs).  
> **Nguồn contract:** Backend `smart-ppe-camera-service` (cổng 8881 / Gateway Traefik cổng 80 tại `/api/v1/cameras` & `/api/v1/camera-streams`).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [sites-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/sites-journey.md) | [ai-metrics-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/ai-metrics-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền cấu hình RTSP, thêm/xóa camera, cấu hình AI ROI, quản lý luồng)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — toàn quyền quản trị camera thuộc công trường phụ trách)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — xem danh sách, xem luồng trực tiếp live player, thực hiện Ping test)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /cameras](#0-mục-tiêu--định-vị-trang-cameras)
1. [Khảo sát Backend Contract (smart-ppe-camera-service)](#1-khảo-sát-backend-contract-smart-ppe-camera-service)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Video Player, Multi-grid, AI ROI & Ping Test](#4-cơ-chế-kỹ-thuật-cốt-lõi-video-player-multi-grid-ai-roi--ping-test)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/camera.types.ts)](#bước-1--tầng-dtos--types-srctypescameratypests)
   - [Bước 2 — Tầng Service API (src/services/camera.service.ts)](#bước-2--tầng-service-api-srcservicescameraservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/cameras/)](#bước-3--tầng-react-query-hooks-srchookscameras)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị Neumorphism](#bước-5--xây-dựng-các-ui-components-hiển-thị-neumorphism)
   - [Bước 6 — Xây dựng Modal & Drawer tương tác nghiệp vụ Camera](#bước-6--xây-dựng-modal--drawer-tương-tác-nghiệp-vụ-camera)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/cameras/cameras-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthcamerascameras-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /cameras

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Trang `/cameras` (**Trung tâm Giám sát Camera & Luồng Video**) là "đôi mắt" của toàn bộ hệ thống Smart PPE Monitoring. Mô hình thị giác máy tính AI chỉ có thể phát hiện vi phạm mũ bảo hộ, áo phản quang hoặc xâm nhập vùng cấm khi các luồng video RTSP/HLS từ camera công trường được tiếp nhận liên tục và ổn định. Trang này giải quyết 4 bài toán cốt lõi:

1. **Quản trị Hạ tầng Thiết bị Giám sát (Camera Infrastructure Management):** Quản lý tập trung hàng trăm camera phân bố khắp các công trường, khu vực giàn giáo, xưởng đúc và lối ra vào. Quản lý địa chỉ RTSP, thông số phân giải (1080p, 2K, 4K), tốc độ khung hình (FPS) và thông tin đăng nhập thiết bị.
2. **Trải nghiệm Giám sát Trực quan Thời gian thực (Realtime Multi-view Monitoring):** Cho phép Cán bộ An toàn chuyển đổi linh hoạt giữa chế độ Xem Danh sách (Table view) và Trung tâm Tác chiến Video (Video Wall Grid: 1x1 toàn màn hình, 2x2 cho 4 camera trọng yếu, hoặc 3x3 cho toàn khu vực) với độ trễ thấp (< 1.5 giây).
3. **Cấu hình Vùng Nhận diện AI Trực quan (Interactive AI ROI Calibration):** Cung cấp công cụ vẽ vùng quan tâm (Region of Interest) và vùng cấm (Restricted Polygon) trực tiếp lên ảnh chụp thực tế từ camera để mô hình YOLO chỉ tập trung quét người trong khu vực nguy hiểm, giảm tải tài nguyên tính toán và hạn chế cảnh báo rả (False Positives).
4. **Chẩn đoán & Tự phục hồi Kết nối (Heartbeat Diagnostic & Stream Health):** Đo lường liên tục độ trễ mạng (Latency), tỷ lệ rớt gói tin (Packet Loss), và tình trạng sụt giảm FPS. Cho phép kích hoạt nút "Kiểm tra kết nối" (Ping Test) tức thì để nhận biết camera nào bị mất nguồn hoặc đứt cáp mạng.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Thống kê KPI Camera (Bento Console):** 4 thẻ chỉ số: Tổng số camera đã kết nối, Camera đang hoạt động (`ONLINE`), Camera mất kết nối (`OFFLINE` / `DEGRADED`), Tỷ lệ ổn định luồng AI.
  2. **Bộ lọc & Chuyển đổi Chế độ Xem (View Mode Switcher):**
     - Bộ lọc theo Công trường (`siteId`), Phân khu (`zoneId`), Trạng thái (`ONLINE`, `OFFLINE`, `MAINTENANCE`).
     - Tìm kiếm từ khóa theo Tên camera, Mã vị trí (`cameraCode`), Địa chỉ IP.
     - Nút chuyển chế độ: **Dạng Thẻ/Bảng quản lý (Grid/Table View)** và **Chế độ Tác chiến Trực tiếp (Live Video Wall: 1x1, 2x2, 3x3)**.
  3. **Trình phát Video Neumorphic (HLS / WebRTC Stream Player):**
     - Trình phát video tích hợp HLS.js, có thanh hiển thị trạng thái luồng trực tiếp, badge FPS, độ trễ ms, và nút phóng to toàn màn hình.
     - Nút chụp ảnh bằng chứng tức thời (Instant Snapshot Capture).
  4. **Modal Thêm / Chỉnh sửa Camera:** Nhập Tên, Mã định danh (`CAM-NORTH-01`), Vị trí cụ thể, Chọn Site/Zone, Nhập URL luồng RTSP chính và RTSP phụ, Tốc độ khung hình (15 - 30 FPS).
  5. **Drawer Cấu hình Vùng Nhận diện AI (AI ROI Calibration Canvas):**
     - Tải ảnh snapshot hiện tại của camera.
     - Cung cấp công cụ vẽ khung chữ nhật hoặc đa giác (Polygon ROI) để giới hạn vùng quét AI.
     - Điều chỉnh độ nhạy chuyển động (Motion Sensitivity) và chu kỳ quét (Inference Interval).
  6. **Modal Nhật ký Sức khỏe & Ping Test (Camera Health Diagnostic):**
     - Nút bấm "Ping Camera" đo thời gian phản hồi tức thì.
     - Biểu đồ mini lịch sử độ trễ và tỷ lệ rớt gói tin trong 24 giờ qua.
  7. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không nhúng trực tiếp plugin ActiveX cũ của trình duyệt (chỉ sử dụng chuẩn video HTML5 hiện đại: HLS và WebRTC).
  - Không cấu hình phần cứng PTZ (quay/quét/zoom cơ học) của camera vật lý.

---

## 1. Khảo sát Backend Contract (smart-ppe-camera-service)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-camera-service` (cổng 8881 / Gateway Traefik `/api/v1/cameras` & `/api/v1/camera-streams`):
- Controller: [camera.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-camera-service/src/modules/camera/camera.controller.ts)
- Routes: [camera.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-camera-service/src/modules/camera/camera.route.ts)
- DTOs: [camera.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-camera-service/src/modules/camera/camera.dto.ts)
- Validation: [camera.validation.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-camera-service/src/modules/camera/camera.validation.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Danh sách Camera** | `GET` | `/api/v1/cameras` | `PPE_CAMERA_READ` | Query: `siteId, zoneId, status, search, page, limit` | `{ success: true, data: CameraItemDto[], meta: PaginationMeta }` |
| **Chi tiết Camera** | `GET` | `/api/v1/cameras/:id` | `PPE_CAMERA_READ` | Params: `id (UUID)` | `{ success: true, data: CameraDetailDto }` |
| **Thêm mới Camera** | `POST` | `/api/v1/cameras` | `PPE_CAMERA_MANAGE` | Body: `CreateCameraDto` | `{ success: true, message: string, data: CameraItemDto }` (201) |
| **Cập nhật Camera** | `PUT` | `/api/v1/cameras/:id` | `PPE_CAMERA_MANAGE` | Params: `id`, Body: `UpdateCameraDto` | `{ success: true, message: string, data: CameraItemDto }` |
| **Xóa Camera** | `DELETE`| `/api/v1/cameras/:id` | `PPE_CAMERA_MANAGE` | Params: `id` | `{ success: true, message: string }` |
| **Lấy Cấu hình AI ROI**| `GET` | `/api/v1/cameras/:id/config` | `PPE_CAMERA_READ` | Params: `id` | `{ success: true, data: CameraConfigDto }` |
| **Lưu Cấu hình AI ROI**| `PUT` | `/api/v1/cameras/:id/config` | `PPE_CAMERA_MANAGE` | Params: `id`, Body: `UpdateCameraConfigDto` | `{ success: true, message: string, data: CameraConfigDto }` |
| **Danh sách Luồng Stream**|`GET`| `/api/v1/cameras/:id/streams` | `PPE_CAMERA_READ` | Params: `id` | `{ success: true, data: CameraStreamDto[] }` |
| **Tạo Luồng Video** | `POST` | `/api/v1/cameras/:id/streams` | `PPE_CAMERA_MANAGE` | Params: `id`, Body: `CreateCameraStreamDto` | `{ success: true, data: CameraStreamDto }` (201) |
| **Nhật ký Sức khỏe** | `GET` | `/api/v1/cameras/:id/health-logs`| `PPE_CAMERA_READ`| Params: `id`, Query: `page, limit, fromDate, toDate`| `{ success: true, data: CameraHealthLogDto[] }` |
| **Ping Test Camera** | `POST` | `/api/v1/cameras/:id/ping` | `PPE_CAMERA_MANAGE` | Params: `id` | `{ success: true, data: { status, latencyMs, packetLoss, message } }` |

### 1.2 Trạng thái Vận hành Camera (Camera Status Enum)
- **`ONLINE`:** Camera đang truyền nhận luồng video bình thường, FPS ổn định (> 20 FPS).
- **`OFFLINE`:** Mất tín hiệu mạng hoặc mất nguồn điện, không thể kết nối tới RTSP URL.
- **`DEGRADED`:** Luồng video chập chờn, mất khung hình nghiêm trọng (FPS < 10 hoặc độ trễ > 3000ms).
- **`MAINTENANCE`:** Camera đang được bảo trì, tạm ngừng tiếp nhận luồng AI.

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/cameras/
│   ├── page.tsx                                      ← Server Component bọc Suspense (đã có)
│   └── cameras-content.tsx                           ← NÂNG CẤP: Lắp ráp giao diện Quản lý Camera & Video Wall
│
├── src/
│   ├── types/
│   │   ├── camera.types.ts                           ← MỚI: DTOs, Enums, StreamTypes, RoiTypes, HealthTypes
│   │   └── index.ts                                  ← SỬA: Re-export camera.types.ts
│   │
│   ├── services/
│   │   ├── camera.service.ts                         ← MỚI: Client gọi 11 endpoint của camera-service
│   │   └── index.ts                                  ← SỬA: Re-export camera.service.ts
│   │
│   ├── hooks/cameras/                                ← MỚI: Thư mục hooks quản lý camera
│   │   ├── index.ts                                  ← Export toàn bộ hooks
│   │   ├── camera.query-keys.ts                      ← Quản lý Query Keys chuẩn
│   │   ├── use-cameras.ts                            ← Lấy danh sách camera theo site/zone/status
│   │   ├── use-camera-detail.ts                      ← Lấy thông tin chi tiết camera & luồng stream
│   │   ├── use-camera-config.ts                      ← Lấy & Cập nhật AI ROI Calibration
│   │   ├── use-camera-health.ts                      ← Lấy lịch sử sức khỏe & Mutation Ping Test
│   │   └── use-camera-mutations.ts                   ← Thêm, sửa, xóa camera
│   │
│   ├── components/features/cameras/                  ← MỚI: UI Components Neumorphism
│   │   ├── camera-kpi-summary.tsx                    ← 4 thẻ Bento Console thống kê nhanh
│   │   ├── camera-toolbar.tsx                        ← Thanh tìm kiếm, lọc Site/Zone, nút Đổi chế độ xem (Grid / Wall)
│   │   ├── camera-table.tsx                          ← Bảng danh sách thiết bị có phân trang
│   │   ├── camera-card.tsx                           ← Thẻ camera Neumorphic hiển thị preview snapshot & trạng thái
│   │   ├── camera-video-wall.tsx                     ← Bảng tường video giám sát trực tiếp (Bố cục 1x1, 2x2, 3x3)
│   │   ├── camera-video-player.tsx                   ← Component Video Player nhúng HLS.js có overlay FPS/Status
│   │   ├── camera-roi-canvas.tsx                     ← Canvas tương tác vẽ đa giác phân vùng AI ROI
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── create-camera-modal.tsx               ← Modal thêm camera mới
│   │       ├── edit-camera-modal.tsx                 ← Modal chỉnh sửa thông số camera
│   │       ├── camera-roi-drawer.tsx                 ← Drawer cấu hình vùng nhận diện AI
│   │       ├── camera-health-dialog.tsx              ← Hộp thoại đo Ping và xem đồ thị sức khỏe mạng
│   │       └── delete-camera-dialog.tsx              ← Hộp thoại xác nhận xóa camera
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "cameras.*"
│       └── en-US.json                                ← Bổ sung namespace "cameras.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục Trung tâm Tác chiến Video (Live Video Wall Mode)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon Video + "Quản lý Camera & Luồng Giám sát" + Badge "LIVE STREAMS"      │
│            + [ Bố cục: [1x1] [2x2] [3x3] ]  [ Nút: "+ Thêm Camera" ] [ Nút: "🔄" ]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BENTO CONSOLE KPI CARDS] (4 cột desktop, 2 cột tablet, 1 cột mobile)                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│ │ 📹 Tổng camera  │ │ 🟢 Đang Online   │ │ 🔴 Mất kết nối │ │ ⚡ Độ trễ TB    │           │
│ │       24       │ │   22 Hoạt động   │ │   2 Ngoại tuyến  │ │     45 ms      │           │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [FILTER TOOLBAR & VIEW CONTROLS]                                                       │
│ [ Công trường: Landmark Tower ▼ ] [ Phân khu: Giàn giáo Tầng 5 ▼ ] [ 🔍 Tìm tên cam.. ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [KHUNG TRÌNH CHIẾU VIDEO WALL (Chế độ 2x2)]                                            │
│ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐         │
│ │ CAM-NORTH-01 • Giàn giáo Tầng 5    │ │ CAM-GATE-02 • Cổng chính Ra/Vào    │         │
│ │ 🟢 LIVE • 25 FPS • 42ms            │ │ 🟢 LIVE • 25 FPS • 38ms            │         │
│ │ ┌────────────────────────────────┐ │ │ ┌────────────────────────────────┐ │         │
│ │ │                                │ │ │ │                                │ │         │
│ │ │     [ VIDEO STREAM HLS ]       │ │ │ │     [ VIDEO STREAM HLS ]       │ │         │
│ │ │                                │ │ │ │                                │ │         │
│ │ └────────────────────────────────┘ │ │ └────────────────────────────────┘ │         │
│ │ [ 📸 Chụp ảnh ] [ 🩺 Ping ] [ ⚙️ ROI ]│ │ [ 📸 Chụp ảnh ] [ 🩺 Ping ] [ ⚙️ ROI ]│         │
│ └────────────────────────────────────┘ └────────────────────────────────────┘         │
│ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐         │
│ │ CAM-WAREHOUSE-03 • Xưởng Cơ khí    │ │ CAM-SOUTH-04 • Khu Bể chứa Gas     │         │
│ │ 🟢 LIVE • 24 FPS • 55ms            │ │ 🔴 OFFLINE • Mất tín hiệu mạng     │         │
│ │ ┌────────────────────────────────┐ │ │ ┌────────────────────────────────┐ │         │
│ │ │     [ VIDEO STREAM HLS ]       │ │ │ │   [ ⚠️ MẤT KẾT NỐI CAMERA ]    │ │         │
│ │ └────────────────────────────────┘ │ │ └────────────────────────────────┘ │         │
│ │ [ 📸 Chụp ảnh ] [ 🩺 Ping ] [ ⚙️ ROI ]│ │ [ 🔄 Thử lại ] [ 🩺 Chẩn đoán ]       │         │
│ └────────────────────────────────────┘ └────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: Video Player, Multi-grid, AI ROI & Ping Test

### 4.1 Cơ chế Phát Video Tối ưu với HLS.js
Trình phát `camera-video-player.tsx` sử dụng thư viện `hls.js`:
- Tự động nhận diện khả năng hỗ trợ Native HLS (Safari/iOS) hoặc khởi tạo HLS.js instance cho Chrome, Firefox, Edge.
- Bật cấu hình `lowLatencyMode: true` để giữ độ trễ luồng dưới 2 giây.
- Xử lý lỗi tự động: Khi gặp lỗi mạng `NETWORK_ERROR`, thực hiện phục hồi luồng `hls.startLoad()` với khoảng chờ lùi số mũ (exponential backoff). Nếu mất kết nối hoàn toàn, chuyển màn hình sang chế độ Fallback báo đỏ và hiện nút "Thử kết nối lại".

### 4.2 Công cụ Hiệu chuẩn Vùng Nhận diện AI (ROI Calibration Canvas)
Trong Drawer `camera-roi-drawer.tsx`:
1. Client gọi API lấy ảnh chụp tĩnh mới nhất từ luồng camera (`snapshotUrl`).
2. Tải ảnh lên thẻ `<canvas>` chuẩn tỷ lệ 16:9.
3. Cho phép người dùng dùng chuột nhấp các điểm tọa độ để tạo thành đa giác khép kín (Polygon Bounding Box) đại diện cho vùng cần quét PPE.
4. Tọa độ được chuẩn hóa về dải tỷ lệ phần trăm `[0.0, 1.0]` (ví dụ: `[{x: 0.15, y: 0.20}, {x: 0.85, y: 0.20}, ...]`) để đảm bảo không bị lệch tọa độ khi độ phân giải khung hình thay đổi.
5. Gửi tọa độ chuẩn hóa lên backend qua `PUT /api/v1/cameras/:id/config`.

---

## 5. Ma trận phân quyền & RBAC Access Control

| Vai trò | Xem Danh sách & Xem Video Live | Chụp ảnh Bằng chứng | Chạy Ping Test | Thêm / Sửa / Xóa Camera | Cấu hình AI ROI |
|---|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **SAFETY_MANAGER** | ✅ Có quyền | ✅ Có | ✅ Có | ✅ Có (Tại Site phụ trách) | ✅ Có |
| **SAFETY_OFFICER** | ✅ Xem luồng (`READ`) | ✅ Có | ✅ Có | ❌ Bị vô hiệu hóa | ❌ Bị vô hiệu hóa |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/camera.types.ts`)
- Định nghĩa `CameraItem`, `CameraDetail`, `CameraConfigDto`, `CameraStreamDto`, `CameraHealthLogDto`.
- Enum `CameraStatus`: `ONLINE`, `OFFLINE`, `DEGRADED`, `MAINTENANCE`.
- Kiểu tọa độ ROI: `RoiPoint = { x: number; y: number }`, `RoiPolygon = RoiPoint[]`.

### Bước 2 — Tầng Service API (`src/services/camera.service.ts`)
Tạo `cameraService` bao bọc các lời gọi API:
- `getCameras(params?: CameraQuery)`
- `getCameraById(id: string)`
- `createCamera(payload: CreateCameraDto)`
- `updateCamera(id: string, payload: UpdateCameraDto)`
- `deleteCamera(id: string)`
- `getCameraConfig(id: string)`
- `updateCameraConfig(id: string, payload: UpdateCameraConfigDto)`
- `getCameraStreams(id: string)`
- `pingCamera(id: string)`
- `getHealthLogs(id: string, params?: PaginationParams)`

### Bước 3 — Tầng React Query Hooks (`src/hooks/cameras/`)
- `camera.query-keys.ts`: Factory quản lý query keys: `cameraKeys.all`, `cameraKeys.list(filters)`, `cameraKeys.detail(id)`, `cameraKeys.config(id)`, `cameraKeys.health(id)`.
- `use-cameras.ts`: Lấy danh sách camera hỗ trợ lọc theo Site/Zone và debounced search.
- `use-camera-detail.ts`: Lấy chi tiết camera và các URL luồng video.
- `use-camera-config.ts`: Quản lý cấu hình AI ROI.
- `use-camera-health.ts`: Xử lý Ping test và lấy lịch sử nhịp tim.
- `use-camera-mutations.ts`: Thêm, sửa, xóa camera.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật `vi-VN.json` và `en-US.json`:
- `cameras.title`, `cameras.description`, `cameras.kpi.*`
- `cameras.views.*` (grid, table, wall1x1, wall2x2, wall3x3)
- `cameras.status.*` (online, offline, degraded, maintenance)
- `cameras.roi.*` (title, instructions, clearPoints, saveRoi, sensitivity)
- `cameras.ping.*` (testing, success, latency, packetLoss)

### Bước 5 — Xây dựng các UI Components hiển thị Neumorphism
- `camera-kpi-summary.tsx`: 4 thẻ Bento Console thống kê nhanh.
- `camera-toolbar.tsx`: Thanh điều hướng chứa dropdown chọn Site/Zone, ô tìm kiếm và bộ nút chọn bố cục Video Wall.
- `camera-video-player.tsx`: Trình phát HLS bọc khung Neumorphic với overlay nhịp tim LED xanh/đỏ.
- `camera-roi-canvas.tsx`: Bảng vẽ tương tác điểm ảnh trên snapshot.

### Bước 6 — Xây dựng Modal & Drawer tương tác nghiệp vụ Camera
- `create-camera-modal.tsx`: Form nhập thông tin RTSP, chọn Site/Zone và thiết lập FPS.
- `edit-camera-modal.tsx`: Form sửa thông tin camera.
- `camera-roi-drawer.tsx`: Drawer mở rộng từ bên phải để hiệu chuẩn vùng nhận diện AI.
- `camera-health-dialog.tsx`: Hộp thoại hiển thị kết quả Ping test tức thì.

### Bước 7 — Lắp ráp trang chính (`app/(auth)/cameras/cameras-content.tsx`)
Thay thế placeholder hiện tại bằng component hoàn chỉnh kết nối toàn bộ Hooks, Bento Summary, Toolbar, Chuyển đổi linh hoạt giữa Table/Card view và Live Video Wall.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm tra hiển thị Video Wall trên màn hình lớn (1080p, 2K): 4 luồng video hiển thị đồng thời mượt mà không bị tràn bộ nhớ.
- Kiểm tra tính tương thích trên Mobile: Tự động chuyển Video Wall về dạng cuộn dọc 1 cột.
- Kiểm tra hành vi khi camera mất kết nối (hiển thị trạng thái OFFLINE thay vì crash trình duyệt).

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | URL luồng RTSP không đúng định dạng `rtsp://...` | Báo lỗi inline dưới ô nhập URL, chặn submit |
| **401 Unauthorized**| Hết hạn token khi đang xem luồng video | Tạm dừng phát video, chuyển hướng về `/login` |
| **403 Forbidden**   | Cán bộ an toàn cố gắng xóa hoặc sửa cấu hình camera | Nút thao tác bị ẩn, API trả về 403 hiển thị Toast cảnh báo quyền hạn |
| **404 Not Found**   | Camera ID không tồn tại hoặc đã bị xóa | Toast báo lỗi "Camera không tồn tại", refresh lại danh sách |
| **409 Conflict**    | Trùng mã định danh camera (`cameraCode` đã tồn tại) | Báo lỗi inline "Mã camera này đã được đăng ký trên hệ thống" |
| **Video Stream Error**| Luồng HLS bị gián đoạn do đứt cáp camera | Hiển thị màn hình đen có icon cảnh báo và nút "Thử nạp lại luồng" |

---

## 8. Checklist hoàn thiện nghiệm thu

- [ ] Route `/cameras` được bảo vệ bằng Route Guard với quyền `PPE_CAMERA_READ`.
- [ ] 4 thẻ Bento Console hiển thị chính xác số lượng camera và trạng thái kết nối.
- [ ] Chuyển đổi mượt mà giữa Chế độ Danh sách và Chế độ Video Wall (1x1, 2x2, 3x3).
- [ ] Trình phát video HLS hoạt động trơn tru với độ trễ thấp trên các camera mẫu.
- [ ] Tính năng chụp ảnh snapshot tức thời hoạt động chuẩn xác.
- [ ] Drawer Cấu hình AI ROI cho phép vẽ và lưu tọa độ đa giác thành công.
- [ ] Nút Ping Test đo được độ trễ và tỷ lệ rớt gói tin thực tế.
- [ ] Thêm mới, chỉnh sửa và xóa camera hoạt động đầy đủ với quyền `PPE_CAMERA_MANAGE`.
- [ ] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) đồng bộ hoàn toàn.
- [ ] Giao diện Neumorphic thẩm mỹ cao, tương thích hoàn hảo Dark Mode và Light Mode.
