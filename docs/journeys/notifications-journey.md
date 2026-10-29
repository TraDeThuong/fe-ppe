# Hành trình xây dựng Trung tâm Thông báo & Cảnh báo An toàn (/notifications) — fe-ppe

> **Ngày lập:** 2026-10-29  
> **Phạm vi:** Phân hệ Trung tâm Thông báo & Cảnh báo An toàn (`/notifications`) thuộc hệ sinh thái Smart PPE Monitoring — kiểm soát toàn bộ luồng truyền phát thông báo đa kênh (In-app, Email, Webhook, Zalo ZNS), tiếp nhận sự kiện cảnh báo vi phạm trang bị bảo hộ thời gian thực qua Server-Sent Events (SSE), tích hợp bộ âm thanh cảnh báo độc quyền bằng Web Audio API Synthesizer, 4 thẻ Bento Stats tương tác mở rộng chi tiết (sunken neumorphism), hệ thống 12 mẫu thông báo cố định chuẩn hóa cho toàn dự án và trình quản lý tùy biến thông báo cho người dùng.  
> **Nguồn contract:** Backend `smart-ppe-notification-service` (cổng 8889 / Traefik Gateway `/api/v1/notifications`), Kafka Event Backbone (`events-notification-queue`), Redis SSE Ticket Manager.  
> **Tài liệu tham khảo:** [system-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/system-journey.md) | [notifications.md (Test Cases)](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/test-cases/notifications.md) | [SYSTEM_ARCHITECTURE_CAMERA_SITE_INCIDENT_AI.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/SYSTEM_ARCHITECTURE_CAMERA_SITE_INCIDENT_AI.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền xem hộp thư, phát lệnh broadcast, tạo/sửa/xóa mẫu thông báo tùy chỉnh, xem nhật ký email)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — xem thông báo công trường, phát thông báo khẩn cấp, tùy biến mẫu thông báo an toàn)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — xem hộp thư cá nhân/công trường, đánh dấu đã đọc, tùy biến ngưỡng nhận tin & âm thanh)  
> - `user@ppe.local / User@123456` (USER — xem thông báo cá nhân, nhận diện âm thanh cảnh báo)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /notifications](#0-mục-tiêu--định-vị-trang-notifications)
1. [Khảo sát Backend Contract & Ma trận Sự kiện Hệ thống](#1-khảo-sát-backend-contract--ma-trận-sự-kiện-hệ-thống)
2. [Bộ Tổng hợp Âm thanh Cảnh báo (Web Audio API Synthesizer Sound Engine)](#2-bộ-tổng-hợp-âm-thanh-cảnh-báo-web-audio-api-synthesizer-sound-engine)
3. [Kiến trúc Thống kê Bento KPI Tương tác & Khung Chi tiết Mở rộng](#3-kiến-trúc-thống-kê-bento-kpi-tương-tác--khung-chi-tiết-mở-rộng)
4. [Hệ thống 12 Mẫu Thông báo Cố định & Khả năng Tự Custom](#4-hệ-thống-12-mẫu-thông-báo-cố-định--khả-năng-tự-custom)
5. [Tích hợp Chuông Thông báo Trên Header & Realtime SSE](#5-tích-hợp-chuông-thông-báo-trên-header--realtime-sse)
6. [Tối ưu Trải nghiệm Responsive Mobile (375px - 1440px)](#6-tối-ưu-trải-nghiệm-responsive-mobile-375px---1440px)
7. [Đồng bộ Đa ngôn ngữ (i18n Tiếng Việt & Tiếng Anh)](#7-đồng-bộ-đa-ngôn-ngữ-i18n-tiếng-việt--tiếng-anh)
8. [Ma trận Phân quyền RBAC & Checklist Nghiệm thu](#8-ma-trận-phân-quyền-rbac--checklist-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /notifications

### 0.1 Vai trò trong Hệ sinh thái Smart PPE Monitoring
Hệ sinh thái Smart PPE gồm 8 microservices, camera streaming AI, sự cố an toàn lao động và thiết bị công trường. Trang `/notifications` đóng vai trò là **Bộ não Cảnh báo & Trung tâm Điều hành Thông tin tức thời**:

1. **Phản xạ Khẩn cấp Tức thì (Instant Critical Feedback):** Khi camera AI phát hiện vi phạm (công nhân làm việc trên giàn giáo không đội nón bảo hộ, không mặc áo phản quang, xâm nhập vùng cấm), thông báo được đẩy qua luồng SSE trong vòng `< 100ms`, kích hoạt còi báo động khẩn cấp trên trình duyệt và rung biểu tượng chuông trên Header.
2. **Chống Kiệt Huệ Cảnh Báo (Anti-Alert Fatigue Engine):** Cho phép người vận hành phân cấp ngưỡng nhận tin theo từng kênh. Ví dụ: Kênh Web In-App nhận mọi cấp độ; Kênh Email chỉ nhận mức `CRITICAL` và `HIGH` để tránh tràn ngập hộp thư của chỉ huy công trường.
3. **Tiêu chuẩn hóa Mẫu Thông báo Toàn dự án (Standardized Template System):** Đóng gói sẵn 12 mẫu hệ thống chuẩn tương ứng với toàn bộ các sự kiện thực tế trong hệ thống (vi phạm PPE, phân công sự cố, mất tín hiệu camera, cảnh báo đăng nhập lạ, xuất file báo cáo). Đồng thời trao quyền cho Admin/Safety Manager tự tạo các mẫu thông báo chuyên biệt theo đặc thù từng dự án xây dựng.
4. **Không phụ thuộc Tệp tin Ngoài (Zero Network Dependency Audio):** Tích hợp bộ tổng hợp âm thanh chân thực bằng Web Audio API độc quyền, hoạt động 100% offline, không có độ trễ tải mạng, không bị lỗi CORS hay mất file âm thanh.

---

## 1. Khảo sát Backend Contract & Ma trận Sự kiện Hệ thống

### 1.1 Chi tiết REST Endpoints (`smart-ppe-notification-service` — Cổng 8889 / Traefik `/api/v1/notifications`)

| Phân hệ | Phương thức | Endpoint | Yêu cầu Quyền | Chức năng nghiệp vụ |
|---|---|---|---|---|
| **Realtime SSE** | `POST` | `/api/v1/notifications/stream-ticket` | Đã xác thực | Cấp vé 1 lần dùng để mở luồng SSE bảo mật |
| | `GET` | `/api/v1/notifications/stream?ticket=...` | Ticket hợp lệ | Mở luồng SSE nhận sự kiện `notification:ppe_violation` |
| **Hộp thư** | `GET` | `/api/v1/notifications` | Đã xác thực | Lọc danh sách thông báo (phân trang, search, severity, channel) |
| | `GET` | `/api/v1/notifications/unread-count` | Đã xác thực | Lấy số lượng thông báo chưa đọc |
| | `PATCH` | `/api/v1/notifications/:id/read` | Đã xác thực | Đánh dấu 1 thông báo là đã đọc |
| | `PATCH` | `/api/v1/notifications/read-all` | Đã xác thực | Đánh dấu toàn bộ hộp thư là đã đọc |
| | `DELETE` | `/api/v1/notifications/:id` | Đã xác thực | Xóa 1 bản tin khỏi hộp thư cá nhân |
| **Tùy chọn** | `GET` | `/api/v1/notifications/preferences` | Đã xác thực | Lấy danh sách cấu hình kênh & ngưỡng nghiêm trọng |
| | `PUT` | `/api/v1/notifications/preferences` | Đã xác thực | Cập nhật trạng thái kênh & ngưỡng lọc |
| **Phát lệnh** | `POST` | `/api/v1/notifications/broadcast` | `NOTIFICATION_CREATE` | Phát thông báo khẩn cấp diện rộng tới toàn bộ người dùng |
| | `POST` | `/api/v1/notifications/send` | `NOTIFICATION_CREATE` | Gửi thông báo chỉ định theo userIds và channels |
| **Mẫu thông báo** | `GET` | `/api/v1/notifications/templates` | `NOTIFICATION_TEMPLATE_READ` | Danh sách các mẫu email & thông báo đẩy |
| | `POST` | `/api/v1/notifications/templates` | `NOTIFICATION_TEMPLATE_MANAGE`| Tạo mẫu thông báo tùy chỉnh mới |
| | `PUT` | `/api/v1/notifications/templates/:id` | `NOTIFICATION_TEMPLATE_MANAGE`| Sửa nội dung tiêu đề, văn phong của mẫu |
| | `DELETE` | `/api/v1/notifications/templates/:id` | `NOTIFICATION_TEMPLATE_MANAGE`| Xóa mẫu tùy chỉnh người dùng |
| | `POST` | `/api/v1/notifications/templates/:code/preview` | `NOTIFICATION_TEMPLATE_READ` | Xem trước mẫu render với biến dữ liệu giả lập |
| | `POST` | `/api/v1/notifications/templates/:code/test-send`| `NOTIFICATION_TEMPLATE_MANAGE`| Bắn thử nghiệm mẫu tới email kiểm toán |

---

## 2. Bộ Tổng hợp Âm thanh Cảnh báo (Web Audio API Synthesizer Sound Engine)

### 2.1 Kiến trúc Kỹ thuật (`src/services/sound.service.ts`)
Thay vì sử dụng các file `.mp3` hoặc `.wav` bên ngoài dễ bị chặn bởi chính sách Autoplay của trình duyệt hoặc tải chậm khi mạng công trường yếu, giải pháp xây dựng một **Audio Synthesizer Engine** dựa trên `AudioContext`:

```
┌───────────────────────────────────────────────────────────────┐
│               WEB AUDIO API SYNTHESIZER ENGINE                │
│                                                               │
│   OscillatorNode ───────> GainNode (Envelope) ────> Destination│
│    [Frequency Sweep]        [ADSR Amplitude]         [Speakers]│
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Danh mục 5 Cấu hình Âm thanh Độc quyền (Audio Presets)

| Preset Key | Tên Tiếng Việt | Tên Tiếng Anh | Cấu hình Âm học | Tình huống áp dụng |
|---|---|---|---|---|
| `critical` | **Còi báo động khẩn cấp** | Emergency Siren | Sóng Sawtooth biến thiên dồn dập giữa `880Hz` và `660Hz` nhịp `0.15s` chu kỳ kép | Cảnh báo vi phạm PPE nguy cơ cao, báo động toàn công trường |
| `warning` | **Chuông cảnh báo tam âm** | Triple Warning Chime | 3 nốt nhạc Triangle tăng dần tần số: `587Hz` (D5) → `740Hz` (F#5) → `880Hz` (A5) | Mất kết nối camera, phân công sự cố an toàn, cảnh báo bảo mật |
| `info` | **Giọt nước thanh thoát** | Glass Bubble Pop | Sóng Sine quét nhẹ từ `523Hz` lên `784Hz` với độ tắt nhanh `0.25s` | Bản tin hệ thống thông thường, cập nhật vai trò, phân quyền |
| `success` | **Hợp âm thành công** | Harmonic Success Chord | Hợp âm Đô trưởng rải C-Major Triad (`523Hz` + `659Hz` + `784Hz` + `1046Hz`) | Khắc phục xong sự cố, xuất file báo cáo thành công |
| `radio` | **Bộ đàm điều phối** | Walkie-talkie Chirp | Hai xung sóng vuông dứt khoát `950Hz` (0.06s) và `1200Hz` (0.1s) | Tin phát lệnh khẩn cấp Broadcast toàn công trường |

### 2.3 Khung giờ Yên tĩnh (Quiet Hours / Do Not Disturb)
- Tự động tắt tiếng các thông báo thông thường (`NORMAL`, `LOW`) trong khoảng thời gian nghỉ đêm (mặc định `22:00` đến `06:00`).
- Riêng sự cố `CRITICAL` vẫn được phát còi báo động để đảm bảo tính mạng công nhân.

---

## 3. Kiến trúc Thống kê Bento KPI Tương tác & Khung Chi tiết Mở rộng

Tuân thủ triết lý thiết kế đã hoàn thiện xuất sắc tại trang Quản trị Vai trò (`/roles`):
- 4 thẻ thống kê Neumorphic:
  1. **Tổng thông báo (`total`)**: Thống kê số lượng theo mọi kênh và phân loại mức độ.
  2. **Tin chưa đọc (`unread`)**: Hàng đợi các bản tin chờ người dùng tiếp nhận và xử lý.
  3. **Cảnh báo PPE (`ppeAlerts`)**: Toàn bộ cảnh báo vi phạm trang bị bảo hộ lao động.
  4. **Đã xử lý / Tỷ lệ đọc (`resolved`)**: Đo lường tỷ lệ đọc tin, nhịp tim SSE và trạng thái Audio Synthesizer.

### 3.1 Hiệu ứng Neumorphic Sunken (Chìm sâu khi được chọn)
Khi click vào bất kỳ thẻ stat nào:
```css
/* Sunken Neumorphic Shadow Tokens */
transform: translateY(6px);
box-shadow: inset 6px 6px 14px var(--shadow-dark),
            inset -6px -6px 14px var(--shadow-light),
            inset 2px 2px 4px rgba(0,0,0,0.18);
```
- Nút footer tự động đổi sang `Thu gọn` (icon `ChevronUp`).
- Đồng bộ trực tiếp với URL Search Param `?stat=total`, `?stat=unread`, `?stat=ppe-alerts`, `?stat=resolved`.
- Khung nội dung chi tiết `NotificationStatsDetailPanel` mở ra ngay dưới hàng stats với thanh phản quang Specular Rim Top Highlight.

---

## 4. Hệ thống 12 Mẫu Thông báo Cố định & Khả năng Tự Custom

### 4.1 Danh mục 12 Mẫu Thông báo Cố định Toàn dự án (Predefined System Catalog)

```
Smart PPE Notification Catalog
├── 1. Giám sát & An toàn PPE (Safety Monitoring)
│   ├── PPE_VIOLATION_ALERT      (Còi khẩn cấp - Vi phạm trang bị mũ, áo, găng, kính)
│   ├── PPE_INCIDENT_ASSIGNED    (Chuông tam âm - Phân công cán bộ xử lý sự cố)
│   ├── PPE_INCIDENT_RESOLVED    (Hợp âm thành công - Sự cố đã khắc phục và đóng)
│   └── PPE_SITE_ALERT_TRIGGERED (Còi khẩn cấp - Chỉ số rủi ro an toàn toàn site vượt ngưỡng)
│
├── 2. Hạ tầng Camera & AI (Infrastructure & AI)
│   ├── CAMERA_OFFLINE_ALERT     (Chuông tam âm - Camera mất luồng RTSP quá 30 giây)
│   ├── CAMERA_TAMPER_ALERT      (Chuông tam âm - Camera bị che ống kính hoặc lệch góc quay)
│   └── AI_INFERENCE_DEGRADED    (Giọt nước - Độ trễ nhận diện YOLO vượt 150ms)
│
├── 3. Bảo mật & Quản trị Danh tính (Security & Identity)
│   ├── VERIFY_EMAIL             (Giọt nước - Thư xác thực kích hoạt tài khoản)
│   ├── RESET_PASSWORD           (Chuông tam âm - Token khôi phục mật khẩu)
│   ├── NEW_DEVICE_ALERT         (Chuông tam âm - Phát hiện đăng nhập từ IP lạ)
│   └── ROLE_ASSIGNED            (Giọt nước - Cập nhật phân quyền / vai trò mới)
│
└── 4. Báo cáo & Vận hành (Operations & Reporting)
    ├── REPORT_EXPORT_READY      (Hợp âm thành công - File Excel/PDF đã sẵn sàng tải về)
    └── CUSTOM_BROADCAST         (Bộ đàm - Thông báo điều hành khẩn cấp toàn công trường)
```

### 4.2 Các Biến động Hỗ trợ (Dynamic Template Placeholders)
Người dùng có thể bấm trực tiếp các thẻ chip để chèn biến vào nội dung mẫu:
- `{{userName}}`: Họ và tên người nhận hoặc người vi phạm.
- `{{siteName}}`: Tên công trường đang giám sát.
- `{{zoneName}}`: Phân khu, tầng hoặc vị trí lắp đặt camera.
- `{{cameraCode}}`: Mã định danh camera (VD: `CAM-NORTH-04`).
- `{{violationType}}`: Loại vi phạm trang bị bảo hộ (`NO_HARDHAT`, `NO_SAFETY_VEST`, v.v.).
- `{{timestamp}}`: Thời điểm xảy ra sự cố theo giờ Việt Nam.
- `{{actionUrl}}`: Đường dẫn điều hướng trực tiếp tới hồ sơ xử lý.

### 4.3 Khả năng Tự Custom Thông báo (User-defined Templates & Dispatch)
- **Modal Tạo Mẫu Mới (`CreateNotificationTemplateModal`)**: Tự đặt mã `code`, kênh gửi, phân loại mức độ, chọn âm thanh chuông cảnh báo kèm nút nghe thử tức thì, soạn thảo tiêu đề và văn bản Markdown.
- **Modal Chỉnh Sửa Mẫu (`EditNotificationTemplateModal`)**: Sửa đổi nội dung câu chữ và bật/tắt cờ `ACTIVE / INACTIVE`.
- **Hộp thoại Xóa Mẫu (`DeleteNotificationTemplateDialog`)**: Cơ chế an toàn — Các mẫu hệ thống (`isSystem = true`) được bảo vệ không thể xóa nhằm chống làm gãy quy trình tự động; chỉ cho phép xóa các mẫu tùy chỉnh do người dùng tạo.
- **Modal Gửi Thông Báo Tùy Chỉnh (`CustomDispatchNotificationModal`)**: Cho phép người chỉ huy chọn mẫu có sẵn hoặc gõ tin nhắn tự do, chọn phạm vi nhận tin (Toàn công trường, Cán bộ An toàn, Ban Chỉ huy) và kích hoạt gửi tức thì kèm âm thanh báo động.

---

## 5. Tích hợp Chuông Thông báo Trên Header & Realtime SSE

### 5.1 Kiến trúc Kết nối SSE & Vé Truy cập 1 Lần
Do SSE không thể truyền trực tiếp Authorization header bảo mật, hệ thống áp dụng luồng Ticket 1 lần:
```
Client (AppHeader)                     Notification Service
     │                                           │
     ├─── POST /api/v1/notifications/stream-ticket ─>│ (Xác thực JWT)
     │<── { ticket: "uuid", expiresIn: 60 } ─────┤ (Cấp ticket Redis)
     │                                           │
     ├─── GET /api/v1/notifications/stream?ticket ─>│ (Bắt đầu luồng SSE)
     │<── event: notification:ppe_violation ─────┤ (Đẩy dữ liệu real-time)
```

### 5.2 Phản xạ Chuông Header (`notification-bell.tsx`)
Khi nhận sự kiện `lastAlert`:
1. Phân loại mức độ nghiêm trọng: sự cố vi phạm PPE được gắn mức `CRITICAL`.
2. Kích hoạt bộ tổng hợp âm thanh `playAlert("CRITICAL")` (nếu âm thanh đang bật).
3. Biểu tượng chuông thực hiện hiệu ứng rung lắc (wiggle & bounce animation) trong 1.6 giây.
4. Cập nhật số đếm badge chưa đọc.
5. Trên popover thả xuống có nút bật/tắt nhanh âm thanh (`Volume2 / VolumeX`) cho phép người dùng tắt/bật chuông nhanh chỉ với 1 click.

---

## 6. Tối ưu Trải nghiệm Responsive Mobile (375px - 1440px)

- **Màn hình Điện thoại (375px - 640px):**
  - Bento 4 stats xếp dạng lưới 2x2 gọn gàng, chạm vào là chìm sâu Neumorphic.
  - Detail panel hiển thị dạng thẻ card dọc nhỏ gọn, cuộn mượt mà với thanh cuộn ẩn.
  - Bộ lọc template hiển thị dưới dạng thanh cuộn ngang (horizontal scrollable chips) tiện cho thao tác vuốt ngón tay cái.
  - Các nút hành động chính (Nghe thử, Xem trước, Sửa) được tối ưu kích thước touch target đạt chuẩn Apple HIG (`44x44px`).
- **Màn hình Tablet & Desktop (768px - 1440px):**
  - Bento 4 stats dàn trải 4 cột tiêu chuẩn.
  - Detail panel và bảng danh sách templates hiển thị dạng bảng Neumorphic đầy đủ thông tin (Code, Title, Domain, Channel, Audio Cue, Actions).

---

## 7. Đồng bộ Đa ngôn ngữ (i18n Tiếng Việt & Tiếng Anh)

Toàn bộ các khóa chuỗi ngôn ngữ được quản lý tập trung và đồng bộ 100% giữa hai tệp `src/i18n/vi-VN.json` và `src/i18n/en-US.json`:
- Nhóm thông số KPI: `notifications.stats.*` (total, unread, ppeAlerts, resolved, collapse, viewDetail).
- Nhóm bộ âm thanh: `notifications.sound.*` (title, enabled, muted, volume, test, quietHours).
- Nhóm mẫu khuôn mẫu: `notifications.templates.*` (systemBadge, customBadge, createCustom, edit, delete, preview, testSend).
- Nhóm gửi tùy chỉnh: `notifications.custom.*` (dispatchTitle, dispatchBtn).

---

## 8. Ma trận Phân quyền RBAC & Checklist Nghiệm thu

### 8.1 Ma trận Phân quyền Truy cập

| Hành động | ADMIN | SAFETY_MANAGER | SAFETY_OFFICER | USER |
|---|:---:|:---:|:---:|:---:|
| Xem Hộp thư Thông báo | ✅ | ✅ | ✅ | ✅ |
| Đánh dấu Đã đọc / Xóa bản tin | ✅ | ✅ | ✅ | ✅ |
| Tùy chỉnh Kênh & Ngưỡng nhận tin | ✅ | ✅ | ✅ | ✅ |
| Cài đặt Âm thanh & Khung giờ yên tĩnh | ✅ | ✅ | ✅ | ✅ |
| Phát Thông báo Khẩn cấp (Broadcast) | ✅ | ✅ | ✅ | ❌ |
| Gửi Thông báo Tùy chỉnh (Custom Dispatch) | ✅ | ✅ | ❌ | ❌ |
| Tạo Mẫu Thông báo Tùy chỉnh | ✅ | ✅ | ❌ | ❌ |
| Sửa / Tắt kích hoạt Mẫu Thông báo | ✅ | ✅ | ❌ | ❌ |
| Xóa Mẫu Thông báo Người dùng | ✅ | ❌ | ❌ | ❌ |
| Xem Nhật ký Chuyển phát Email | ✅ | ❌ | ❌ | ❌ |

### 8.2 Checklist Hoàn thiện Nghiệm thu

- [x] Giao diện 4 thẻ Stats Bento tương tự trang Role, khi click vào thì khung nội dung chi tiết mở ra ngay bên dưới.
- [x] Hiệu ứng chìm sâu Neumorphic (`sunkenClass`) với âm sâu 2 lớp, không viền xanh thô, nút bấm chuyển đổi Xem chi tiết / Thu gọn.
- [x] Đồng bộ trạng thái chọn stat với URL query param `?stat=total|unread|ppe-alerts|resolved`.
- [x] Tích hợp bộ tổng hợp âm thanh Web Audio API Synthesizer (5 âm thanh đặc thù cho từng loại thông báo).
- [x] Điều chỉnh âm lượng, nút bật/tắt toàn hệ thống, chọn âm thanh cho từng mức độ nghiêm trọng và khung giờ yên tĩnh DND.
- [x] Tích hợp âm thanh chuông cảnh báo và hiệu ứng rung lắc với Icon Chuông trên Header khi nhận sự kiện SSE.
- [x] Bổ sung nút Mute/Unmute nhanh ngay trên Popover chuông ở Header.
- [x] Xây dựng danh mục 12 mẫu thông báo cố định hệ thống bao phủ toàn bộ sự kiện dự án.
- [x] Hỗ trợ tạo mẫu thông báo tùy chỉnh (`CreateNotificationTemplateModal`) với bộ chèn biến động nhanh.
- [x] Hỗ trợ chỉnh sửa mẫu (`EditNotificationTemplateModal`) và xóa an toàn mẫu custom (`DeleteNotificationTemplateDialog`).
- [x] Hỗ trợ soạn và gửi thông báo tùy chỉnh / theo mẫu (`CustomDispatchNotificationModal`).
- [x] Đồng bộ đa ngôn ngữ 100% tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`).
- [x] Tối ưu giao diện Responsive hoàn hảo trên Mobile (375px), Tablet (768px) và Desktop (1440px).
- [x] Viết tài liệu hành trình đầy đủ chi tiết (`notifications-journey.md`).
