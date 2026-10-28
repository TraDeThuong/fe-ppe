# Hành trình Thiết kế & Xây dựng Trang Chi tiết Công trường (/sites/[id]) — Site Safety Command Center

> **Ngày lập:** 2026-10-28  
> **Trạng thái:** Bản đề xuất kiến trúc & Thiết kế nghiệp vụ (Chờ người dùng duyệt trước khi triển khai code)  
> **Phạm vi:** Trang Chi tiết & Trung tâm Điều hành An toàn Cấp Công trường (`/sites/[id]`) thuộc phân hệ Giám sát Không gian & Công trường (`safety-monitoring`).  
> **Mục tiêu:** Biến trang chi tiết công trường thành **Single-Pane-of-Glass Operational Hub** (Bảng điều hành tập trung), tích hợp liền mạch toàn bộ các phân hệ liên đới: Giám sát Camera AI trực tiếp, Luồng Cảnh báo & Vi phạm PPE thời gian thực, Quản lý Phân khu & Vùng cấm, Cấu hình Tiêu chuẩn Bảo hộ, và Báo cáo Phân tích An toàn định kỳ.  
> **Nguồn contract tích hợp:**
> - `smart-ppe-site-service` (cổng 8882/8891): Chi tiết công trường, phân khu (`zones`), vùng cấm (`restricted-areas`), cấu hình quy tắc PPE (`safety-config`), ban chỉ huy an toàn (`contact_officers`).
> - `smart-ppe-camera-service` (cổng 8883/8892): Danh sách camera AI đang quay tại công trường (`GET /api/v1/cameras?siteId=[id]`), luồng stream WebRTC/HLS/Snapshot.
> - `smart-ppe-incident-service` (cổng 8884/8893): Luồng sự cố vi phạm PPE được phát hiện tại công trường (`GET /api/v1/incidents?siteId=[id]`).
> - `smart-ppe-report-service` (cổng 8885/8894): Chỉ số tuân thủ an toàn, biểu đồ vi phạm theo giờ/ngày, phân tích rủi ro theo phân khu.
> - `smart-ppe-notification-service`: Kênh WebSocket / SSE nhận thông báo sự cố khẩn cấp theo ngữ cảnh công trường (`site:[id]:incidents`).

---

## Mục lục

0. [Tầm nhìn & Định vị Trung tâm Điều hành Công trường (Site Command Center)](#0-tầm-nhìn--định-vị-trung-tâm-điều-hành-công-trường-site-command-center)
1. [Khảo sát Nghiệp vụ & Dữ liệu Cần Thiết cho Trang Chi tiết](#1-khảo-sát-nghiệp-vụ--dữ-liệu-cần-thiết-cho-trang-chi-tiết)
2. [Cấu trúc Giao diện & Kiến trúc Phân Tab (Information Architecture)](#2-cấu-trúc-giao-diện--kiến-trúc-phân-tab-information-architecture)
   - [Hero Banner: Định danh, Bản đồ GPS & Ban Chỉ Huy](#hero-banner-định-danh-bản-đồ-gps--ban-chỉ-huy)
   - [Bento Console: Thước đo KPI Vận hành Cấp Công trường](#bento-console-thước-đo-kpi-vận-hành-cấp-công-trường)
   - [Tab 1: Camera AI Trực tiếp & Phân bố Không gian](#tab-1-camera-ai-trực-tiếp--phân-bố-không-gian)
   - [Tab 2: Sự cố Vi phạm PPE Thời gian thực](#tab-2-sự-cố-vi-phạm-ppe-thời-gian-thực)
   - [Tab 3: Bản đồ Phân khu (Zones) & Vùng cấm Nguy hiểm (Restricted Areas)](#tab-3-bản-đồ-phân-khu-zones--vùng-cấm-nguy-hiểm-restricted-areas)
   - [Tab 4: Tiêu chuẩn Bảo hộ Bắt buộc & Độ nhạy AI](#tab-4-tiêu-chuẩn-bảo-hộ-bắt-buộc--độ-nhạy-ai)
   - [Tab 5: Báo cáo Thống kê & Phân tích Xu hướng Rủi ro](#tab-5-báo-cáo-thống-kê--phân-tích-xu-hướng-rủi-ro)
   - [Tab 6: Ban Chỉ Huy, Phân công Ca trực & Danh bạ Khẩn cấp](#tab-6-ban-chỉ-huy-phân-công-ca-trực--danh-bạ-khẩn-cấp)
3. [Luồng Điều hướng & Trải nghiệm Người dùng (UX Interaction Flow)](#3-luồng-điều-hướng--trải-nghiệm-người-dùng-ux-interaction-flow)
4. [Kiến trúc Kỹ thuật & Cấu trúc Thư mục Đề xuất (Frontend)](#4-kiến-trúc-kỹ-thuật--cấu-trúc-thư-mục-đề-xuất-frontend)
5. [Đồng bộ Ngữ cảnh Toàn cục (Global Site Context Sync)](#5-đồng-bộ-ngữ-cảnh-toàn-cục-global-site-context-sync)
6. [Kế hoạch Thực hiện Từng Bước (Implementation Roadmap)](#6-kế-hoạch-thực-hiện-từng-bước-implementation-roadmap)
7. [Checklist Duyệt Thiết kế trước khi Lập trình](#7-checklist-duyệt-thiết-kế-trước-khi-lập-trình)

---

## 0. Tầm nhìn & Định vị Trung tâm Điều hành Công trường (Site Command Center)

Hiện tại, trang danh sách `/sites` đóng vai trò là danh mục tổng quan (Directory & Catalog). Tuy nhiên, đối với một Chỉ huy trưởng công trường, Giám đốc an toàn dự án, hoặc Cán bộ an toàn hiện trường (Safety Officer), họ cần một **trung tâm chỉ huy chuyên biệt cho từng công trường cụ thể** mà họ được phân công theo dõi.

### Khi truy cập `/sites/[id]`:
- **Ngữ cảnh cô lập và chính xác:** Toàn bộ thông tin không bị phân tán hoặc lẫn lộn với các công trường khác.
- **Tập trung hóa đa dịch vụ (Multi-service Aggregation):** Thay vì phải nhảy qua trang `/cameras`, `/incidents`, `/reports` rồi bấm lọc thủ công công trường, trang `/sites/[id]` tự động gom mọi dữ liệu liên quan đến công trường này vào một nơi.
- **Phản ứng khẩn cấp tức thì:** Nếu có sự cố tại công trường (ví dụ công nhân vào vùng cấm ở Zone B), trang này hiển thị camera góc quay đó, thông tin người phụ trách ca trực và số điện thoại hotline để bấm gọi ngay.

---

## 1. Khảo sát Nghiệp vụ & Dữ liệu Cần Thiết cho Trang Chi tiết

Trang `/sites/[id]` sẽ cần tập hợp 6 nhóm dữ liệu chính từ các dịch vụ backend:

```
                                  ┌──────────────────────────────────────────────┐
                                  │      SITE SAFETY COMMAND CENTER              │
                                  │             /sites/[id]                      │
                                  └──────────────────────┬───────────────────────┘
                                                         │
         ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
         │                   │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  SITE SERVICE   │ │ CAMERA SERVICE  │ │INCIDENT SERVICE │ │ REPORT SERVICE  │ │NOTIF / REALTIME │
│  (Port 8882)    │ │  (Port 8883)    │ │  (Port 8884)    │ │  (Port 8885)    │ │  (WebSocket)    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│• Tên, Mã, Đ/c   │ │• Cameras tại site│ │• Vi phạm PPE    │ │• % Tuân thủ     │ │• Cảnh báo nóng  │
│• Phân khu (Zone)│ │• Trạng thái Cam │ │• Ảnh chứng cứ   │ │• Giờ cao điểm   │ │• Đổi trạng thái │
│• Vùng cấm       │ │• RTSP Stream    │ │• Thẩm duyệt     │ │• Zone nguy cơ   │ │• Âm thanh bíp   │
│• Tiêu chuẩn PPE │ │• Zone lắp đặt   │ │• Mức độ rủi ro  │ │• Xuất PDF/Excel │ │                 │
│• Ban chỉ huy    │ │                 │ │                 │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2. Cấu trúc Giao diện & Kiến trúc Phân Tab (Information Architecture)

Giao diện được thiết kế theo phong cách **Neumorphism cao cấp, tối giản tông màu (Primary Teal `#14b8a6` & Accent Amber `#f59e0b`, loại bỏ các màu rực rỡ không cần thiết)**, đồng bộ với thiết kế đã làm tại `/roles` và `/sites`.

### 2.1 Hero Banner: Định danh, Bản đồ GPS & Ban Chỉ Huy
Nằm trên cùng của trang:
- **Breadcrumb & Nút điều hướng:** `← Quay lại danh sách công trường` | `Quản lý công trường` > `[Tên công trường]`.
- **Thông tin nhận diện:**
  - Tên công trường (H1), Mã định danh (`SITE-LANDMARK-01`), Trạng thái badge (`ACTIVE` / `INACTIVE`).
  - Địa chỉ thực tế, tọa độ kinh độ/vĩ độ (nếu có).
  - Mô tả quy mô, tổng diện tích, tính chất thi công.
- **Thẻ nhanh Ban Chỉ Huy An Toàn:**
  - Trưởng ban an toàn (Lead) + Chức danh + Số điện thoại chính.
  - Các cán bộ phó ban, giám sát viên kèm nút sao chép nhanh số điện thoại hoặc bấm gọi trực tiếp trên mobile (`tel:...`).
- **Thao tác nhanh (Action Bar):**
  - Nút `Chỉnh sửa thông tin site` (Mở modal edit).
  - Nút `Cấu hình quy tắc an toàn` (Mở drawer cấu hình PPE).
  - Nút `Tải báo cáo nhanh` (Export PDF tóm tắt tuần).

### 2.2 Bento Console: Thước đo KPI Vận hành Cấp Công trường
4 thẻ chỉ số nhanh (tương tự Bento Console của trang Role & Sites):
1. **Chỉ số tuân thủ an toàn trung bình (% Compliance):**
   - Giá trị phần trăm (ví dụ: `96.4%`), so sánh với tuần trước (`+2.1%`).
   - Đánh giá mức độ an toàn: Xuất sắc / Đạt tiêu chuẩn / Cảnh báo.
2. **Hệ thống Camera AI đang trực (Active Cameras):**
   - Tỷ lệ hoạt động: ví dụ `12/14 Đang trực` (kèm chỉ báo trực quan 2 camera mất tín hiệu).
3. **Sự cố An toàn chưa thẩm duyệt (Pending Incidents):**
   - Số lượng vi phạm trong ngày cần xử lý (ví dụ: `3 vi phạm`, có gắn nhãn cảnh báo đỏ nếu có vi phạm vùng cấm).
4. **Quy mô Không gian Quản lý (Spatial Structure):**
   - Tổng số Phân khu thi công (`5 Zones`) và Số Vùng cấm nguy hiểm (`2 Restricted Areas`).

---

### 2.3 Hệ thống Tab Nghiệp vụ Chuyên sâu (Content Tabs)

Trang sử dụng thanh Tab Neumorphic để phân tách rõ ràng các nhóm chức năng, tránh gây quá tải thông tin:

```
[ Tab 1: Camera Trực tiếp ]  [ Tab 2: Sự cố & Vi phạm ]  [ Tab 3: Phân khu & Vùng cấm ]  [ Tab 4: Tiêu chuẩn PPE ]  [ Tab 5: Báo cáo Thống kê ]  [ Tab 6: Ban Chỉ Huy ]
```

#### Tab 1: Camera AI Trực tiếp & Phân bố Không gian (Live Camera Feeds)
- **Mục đích:** Giúp chỉ huy và giám sát viên theo dõi trực tiếp hình ảnh hiện trường từ các camera thuộc công trường này.
- **Các thành phần chi tiết:**
  - Bộ lọc nhanh camera theo **Phân khu (Zone)** hoặc trạng thái (`Online` / `Offline`).
  - Lưới video thumbnail (Grid 2x2 hoặc 3x3) có thể phóng to Fullscreen.
  - Mỗi khung camera hiển thị:
    - Tên camera, Phân khu đang lắp đặt, độ phân giải, bitrate.
    - AI Overlay Toggle: Bật/tắt khung nhận diện người và đồ bảo hộ (Bounding box thời gian thực).
    - Cảnh báo trực quan: Nhấp nháy viền đỏ (`ring-danger`) ngay trên ô camera nếu AI vừa phát hiện vi phạm tại camera đó.
  - Nút `+ Gán Camera mới vào công trường này`.

#### Tab 2: Sự cố Vi phạm PPE Thời gian thực (Site Incidents Feed)
- **Mục đích:** Quản lý toàn bộ danh sách các vụ việc vi phạm phát hiện bởi AI riêng tại công trường này.
- **Các thành phần chi tiết:**
  - Bộ lọc: Theo mức độ nghiêm trọng (`CRITICAL` - Vùng cấm, `HIGH` - Không đội mũ trên cao, `MEDIUM` - Thiếu áo), Theo trạng thái (`Chờ duyệt`, `Đã xác nhận`, `Báo động giả`).
  - Bảng / Thẻ danh sách vi phạm:
    - Ảnh chụp bằng chứng AI (Crop đối tượng vi phạm, vẽ hộp giới hạn mũ/áo màu xanh/đỏ).
    - Thời điểm vi phạm, Camera phát hiện, Phân khu xảy ra.
    - Thời gian vi phạm liên tục (Duration, ví dụ: 4.2 giây).
    - Nút thẩm duyệt nhanh: `Xác nhận vi phạm` / `Bác bỏ (False Alarm)` / `Gửi thông báo nhắc nhở`.

#### Tab 3: Bản đồ Phân khu (Zones) & Vùng cấm Nguy hiểm (Restricted Areas)
- **Mục đích:** Quản lý cấu trúc không gian chi tiết và các khu vực có rủi ro tai nạn cao.
- **Các thành phần chi tiết:**
  - **Danh sách Phân khu (Zones):**
    - Tên phân khu (ví dụ: *Zone A - Khu móng hầm*, *Zone B - Khối tháp trung tâm*, *Zone C - Bãi tập kết vật tư*).
    - Số lượng camera đang quan sát phân khu này.
    - Thao tác: Thêm mới phân khu, Chỉnh sửa, Xóa.
  - **Danh sách Vùng cấm nguy hiểm (Restricted Areas):**
    - Tên vùng cấm (ví dụ: *Miệng hố thang máy tầng 12*, *Bán kính quay cẩu tháp 01*, *Trạm biến áp tạm 22kV*).
    - Mức độ rủi ro: `CRITICAL` (Cấm tuyệt đối mọi nhân sự) hoặc `HIGH`.
    - Quy tắc phản ứng: Kích hoạt còi hú hiện trường, bắn tin nhắn khẩn cấp cho chỉ huy trưởng.
    - Nút `+ Thêm vùng cấm mới`.

#### Tab 4: Tiêu chuẩn Bảo hộ Bắt buộc & Độ nhạy AI (PPE Safety Rules)
- **Mục đích:** Cấu hình và theo dõi tiêu chuẩn PPE áp dụng riêng cho công trường này.
- **Các thành phần chi tiết:**
  - Bảng chuyển mạch Neumorphic Switch kiểm soát 6 trang bị cốt lõi:
    - Mũ bảo hộ (`hard_hat`): Bắt buộc / Tùy chọn.
    - Áo phản quang (`safety_vest`): Bắt buộc / Tùy chọn.
    - Giày bảo hộ mũi thép (`safety_boots`): Bắt buộc / Tùy chọn.
    - Găng tay cơ khí (`gloves`): Bắt buộc / Tùy chọn.
    - Kính chắn bụi / tia lửa (`goggles`): Bắt buộc / Tùy chọn.
    - Dây đai an toàn trên cao (`safety_harness`): Bắt buộc / Tùy chọn.
  - Cấu hình thời gian xác thực AI (`Temporal Violation Threshold`): Từ `1.0s` đến `5.0s` để loại trừ trường hợp bị che khuất nhất thời.
  - Lịch sử thay đổi quy tắc an toàn (Audit log: ai đã đổi quy tắc, lúc mấy giờ).

#### Tab 5: Báo cáo Thống kê & Phân tích Xu hướng Rủi ro (Site Analytics & Reports)
- **Mục đích:** Báo cáo định lượng về tình hình an toàn để phục vụ giao ban tuần và đánh giá nhà thầu phụ.
- **Các thành phần chi tiết:**
  - Biểu đồ đường (Line chart): Xu hướng vi phạm theo các ngày trong tháng (so sánh tuần này vs tuần trước).
  - Biểu đồ nhiệt (Heatmap / Bar chart): Khung giờ hay xảy ra vi phạm nhất trong ngày (ví dụ: 10h30 - 11h30 trưa lúc công nhân tháo mũ nghỉ sớm, 14h00 đầu giờ chiều).
  - Xếp hạng phân khu rủi ro cao nhất (Top Risky Zones ranking).
  - Tỷ lệ tuân thủ theo từng loại trang bị bảo hộ (Đội mũ 98%, Áo 91%, Giày 85%).
  - Chức năng xuất file: `Xuất PDF Báo cáo An toàn Công trường` và `Xuất Excel chi tiết sự cố`.

#### Tab 6: Ban Chỉ Huy, Phân công Ca trực & Danh bạ Khẩn cấp (Safety Personnel & Contacts)
- **Mục đích:** Danh bạ liên lạc nhanh và sơ đồ tổ chức an toàn tại chỗ của công trường.
- **Các thành phần chi tiết:**
  - Danh sách toàn bộ cán bộ an toàn (Trưởng ban, Phó ban, Cán bộ giám sát) đã cấu hình.
  - Trạng thái trực: Đang trong ca trực / Nghỉ ca.
  - Các số điện thoại liên lạc trực tiếp (Số chính, hotline hiện trường, bộ đàm).
  - Danh bạ các cơ quan khẩn cấp ngoại vi gắn với địa bàn công trường:
    - Bệnh viện / Trạm cấp cứu gần nhất (Tên, địa chỉ, số hotline 115).
    - Đội Cảnh sát PCCC & CNCH phụ trách địa bàn (Số hotline 114).
    - Công an khu vực / Ban quản lý khu công nghiệp.

---

## 3. Luồng Điều hướng & Trải nghiệm Người dùng (UX Interaction Flow)

1. **Từ trang danh sách `/sites`:**
   - Người dùng click vào bất kỳ card công trường nào (hoặc click vào tên công trường trong bảng danh sách).
   - Card có con trỏ chuột dạng `cursor-pointer`, hiệu ứng hover êm ái nâng cao nhẹ (`hover:-translate-y-1`).
   - Router của Next.js chuyển hướng đến `/sites/[id]` (ví dụ: `/sites/60b9c3e4-8f0a-4c31-97b5-2fa823812d8a`).
2. **Xử lý ngữ cảnh toàn cục (Global Context):**
   - Khi trang `/sites/[id]` được mở, hệ thống tự động đồng bộ hóa `selectedSiteId` trên Header `SiteSelector` sang ID của công trường này.
3. **Trạng thái tải dữ liệu & Lỗi (Edge Cases):**
   - **Đang tải (Skeleton Loading):** Hiển thị khung Neumorphic Skeleton mượt mà cho Hero Banner, Bento Stats và Tab nội dung.
   - **Không tìm thấy công trường (404 Not Found):** Hiển thị màn hình thông báo thân thiện với nút `← Quay về danh sách công trường`.
   - **Không có quyền truy cập (403 Forbidden):** Nếu user không có quyền quản lý công trường này, hiển thị cảnh báo kèm hướng dẫn liên hệ quản trị viên.

---

## 4. Kiến trúc Kỹ thuật & Cấu trúc Thư mục Đề xuất (Frontend)

Cấu trúc file dự kiến khi triển khai:

```
fe-ppe/
├── app/
│   └── (auth)/
│       └── sites/
│           ├── page.tsx                           # Danh sách công trường (/sites)
│           ├── sites-content.tsx
│           └── [id]/                              # Trang Chi tiết Công trường (/sites/[id])
│               ├── page.tsx                       # Next.js Server Component (Metadata & params)
│               └── site-detail-content.tsx        # Client Component chính (Tabs, Stats, Data orchestration)
├── src/
│   ├── components/
│   │   └── features/
│   │       └── sites/
│   │           ├── detail/                        # Các component con chuyên sâu cho trang detail
│   │           │   ├── site-detail-hero.tsx       # Header, bản đồ GPS, thông tin cơ bản & hotline
│   │           │   ├── site-detail-kpi-bar.tsx    # 4 thẻ Bento thống kê an toàn của riêng site
│   │           │   ├── site-detail-tabs.tsx       # Điều hướng tab Neumorphic
│   │           │   ├── tabs/
│   │           │   │   ├── site-live-cameras-tab.tsx  # Tab 1: Video streams & camera grid
│   │           │   │   ├── site-incidents-tab.tsx     # Tab 2: Danh sách vi phạm tại site
│   │           │   │   ├── site-spatial-zones-tab.tsx # Tab 3: Quản lý Zones & Restricted areas
│   │           │   │   ├── site-safety-rules-tab.tsx  # Tab 4: Tiêu chuẩn PPE & độ nhạy AI
│   │           │   │   ├── site-analytics-tab.tsx     # Tab 5: Biểu đồ & báo cáo xu hướng
│   │           │   │   └── site-personnel-tab.tsx     # Tab 6: Ban chỉ huy & danh bạ khẩn cấp
│   ├── hooks/
│   │   └── sites/
│   │       ├── use-site-detail.ts                 # Đã có sẵn (React Query gọi GET /api/v1/sites/:id)
│   │       ├── use-site-cameras.ts                # Hook lấy danh sách camera thuộc site này
│   │       └── use-site-incidents.ts              # Hook lấy các sự cố vi phạm thuộc site này
```

---

## 5. Đồng bộ Ngữ cảnh Toàn cục (Global Site Context Sync)

Khi người dùng mở `/sites/[id]`:
- Hệ thống kích hoạt hook `useSiteContext()` để cập nhật công trường đang chọn vào `SiteSelector` trên Header.
- Khi người dùng bấm chuyển sang trang `/cameras` từ sidebar, trang `/cameras` sẽ tự động hiển thị danh sách camera của chính công trường này mà không bắt người dùng phải chọn lại.

---

## 6. Kế hoạch Thực hiện Từng Bước (Implementation Roadmap)

Quá trình xây dựng trang `/sites/[id]` sẽ được tiến hành sau khi người dùng phê duyệt tài liệu này:

- **Giai đoạn 1 (Điều hướng & Khung trang cơ bản):**
  1. Cập nhật `site-card-grid.tsx` và `site-table.tsx` để hỗ trợ click điều hướng vào `/sites/[id]`.
  2. Tạo route dynamic `app/(auth)/sites/[id]/page.tsx` và `site-detail-content.tsx`.
  3. Hoàn thiện Hero Banner (Thông tin site, ban chỉ huy, số điện thoại) và Bento KPI Bar.
  4. Tạo thanh Tabs điều hướng cơ bản.

- **Giai đoạn 2 (Tích hợp Phân khu, Vùng cấm & Quy tắc PPE):**
  1. Tích hợp Tab Phân khu (Zones) và Vùng cấm (Restricted Areas) trực tiếp trong trang thay vì chỉ dùng Drawer.
  2. Tích hợp Tab Cấu hình Tiêu chuẩn An toàn PPE (Hard hat, Vest, Boots, Gloves, v.v.).
  3. Tích hợp Tab Ban chỉ huy an toàn và danh bạ khẩn cấp ngoại vi.

- **Giai đoạn 3 (Tích hợp Camera & Cảnh báo Vi phạm Realtime):**
  1. Tích hợp API `smart-ppe-camera-service` để hiển thị các camera đang quay tại công trường này.
  2. Tích hợp API `smart-ppe-incident-service` hiển thị feed các sự cố PPE phát hiện tại công trường này.
  3. Kết nối WebSocket nhận tín hiệu cảnh báo nhấp nháy trực tiếp trên camera.

- **Giai đoạn 4 (Báo cáo Thống kê & Xuất dữ liệu):**
  1. Tích hợp biểu đồ tuân thủ an toàn theo tuần/tháng.
  2. Chức năng in / tải báo cáo an toàn dạng PDF/Excel.

---

## 7. Checklist Duyệt Thiết kế trước khi Lập trình

| STT | Hạng mục Đề xuất | Đánh giá | Trạng thái |
|:---:|---|---|:---:|
| 1 | URL định tuyến dạng `/sites/[id]` | Chuẩn Next.js App Router | ✅ Đã hoàn thành |
| 2 | Click vào card công trường chuyển hướng sang `/sites/[id]` | Trải nghiệm tự nhiên, rõ ràng | ✅ Đã hoàn thành |
| 3 | Hero Banner hiển thị Tên, Mã, Trạng thái, Ban chỉ huy, Hotline | Đầy đủ thông tin thiết yếu | ✅ Đã hoàn thành |
| 4 | Bento Stats 4 thẻ chỉ số nhanh cấp công trường | Trực quan, đồng bộ với `/roles` | ✅ Đã hoàn thành |
| 5 | Cấu trúc phân 6 Tab chuyên sâu (Cameras, Incidents, Zones, Rules, Reports, Contacts) | Tránh rối mắt, mở rộng tốt | ✅ Đã hoàn thành |
| 6 | Bảng màu tối giản (Chỉ dùng Primary Teal & Accent Amber, không rực rỡ) | Chuẩn Neumorphism tinh tế | ✅ Đã hoàn thành |
| 7 | Tích hợp song ngữ Việt - Anh (`vi-VN` / `en-US`) | Chuẩn hóa hệ thống i18n | ✅ Đã hoàn thành |
