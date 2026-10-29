# Test Case — Trung Tâm Thông Báo & Cảnh Báo An Toàn (/notifications)

> **Ngày lập:** 2026-10-27 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Trung tâm Thông báo & Cảnh báo An toàn (`/notifications`) — Widget Chuông thông báo trên AppHeader (`NotificationBell`), Chỉ báo kết nối luồng phát thời gian thực (`Realtime SSE Badge`), Thước đo Bento KPI Thông báo (`NotificationKpiSummary`), 4 Tab Quản lý & Vận hành Chuyên biệt:
> 1. Tab Hộp thư thông báo (`notification-list.tsx`, `notification-item.tsx`, `notification-filter-toolbar.tsx`)
> 2. Tab Cài đặt nhận tin & Giảm thiểu mỏi mệt cảnh báo (`notification-preferences-card.tsx` — Alert Fatigue Mitigation)
> 3. Tab Quản lý Mẫu thông báo (`notification-templates-tab.tsx`, `preview-template-modal.tsx`, `test-send-template-modal.tsx`)
> 4. Tab Nhật ký chuyển phát Email (`notification-email-logs-tab.tsx`)
> Kèm Modal Phát thông báo khẩn cấp diện rộng (`broadcast-notification-modal.tsx`) và cơ chế chống trùng lặp sự cố (Notification Debounce/Deduplication).
> **Nguồn code:**
> - Trang chính: `app/(auth)/notifications/page.tsx`, `notifications-content.tsx`
> - Components: `src/components/features/notifications/*`, `src/components/features/notifications/modals/*`
> - Header Bell: `src/components/features/app-shell/notification-bell.tsx`
> - Contexts & Hooks: `src/contexts/RealtimeContext.tsx`, `src/services/notification.service.ts`, `src/hooks/notifications/*`
> **E2E tự động:** `scripts/test-notifications-e2e.py` (Bao phủ RBAC, 4 Tabs, KPI, Modals & Responsive Viewports)

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Thông báo |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem hộp thư, cấu hình Alert Fatigue, phát broadcast, quản lý mẫu & nhật ký email |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem thông báo công trường, phát thông báo khẩn cấp, tùy biến ngưỡng nhận tin |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Xem hộp thư, đánh dấu đã đọc, điều chỉnh kênh thông báo cá nhân; Ẩn tab Mẫu & Nhật ký email |
| `user@ppe.local` | `User@123456` | USER | Xem thông báo cá nhân; bị giới hạn các tính năng quản trị |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_notification_db` (Port 8889), Redis pub/sub và SSE stream-ticket đang chạy.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Widget Chuông Trên Header & Kết Nối SSE Realtime

> **Nguồn code:** `src/components/features/app-shell/notification-bell.tsx`, `src/contexts/RealtimeContext.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-001 | Render Nút Chuông & Huy hiệu số tin chưa đọc | Có 4 thông báo chưa đọc | Mở bất kỳ trang nào sau login, quan sát Header | Nút chuông Neumorphic nổi, hiển thị badge đỏ chứa số `4` | ✅ `[E2E]` |
| NOTIF-002 | Chỉ báo Luồng Realtime SSE Badge | Kết nối SSE thành công | Quan sát góc phải Header tại `/notifications` | Hiển thị badge "SSE Trực tuyến" màu xanh lá cây phát sáng nhẹ | ✅ `[E2E]` |
| NOTIF-003 | Bật Popover xem nhanh từ nút chuông | Đang ở trang bất kỳ | Click vào nút icon chuông | Popover bung xuống mượt mà hiển thị 5 thông báo mới nhất kèm thời gian và loại sự cố | ⬜ |
| NOTIF-004 | Tiếp nhận thông báo mới qua SSE tức thì | Người dùng đang làm việc trong app | Backend phát event SSE `incident.detected` | Chuông rung nhẹ (micro-animation), phát âm thanh cảnh báo ngắn (nếu bật âm), badge tăng lên `5`, thông báo mới trượt vào đầu danh sách | ⬜ |
| NOTIF-005 | Đánh dấu tất cả là đã đọc từ Popover | Popover chuông đang mở | Click nút "Đánh dấu tất cả đã đọc" | Badge đỏ biến mất, danh sách popover chuyển sang trạng thái đã đọc | ⬜ |

---

## 2. Thước Đo Bento KPI Thống Kê Thông Báo (NotificationKpiSummary)

> **Nguồn code:** `src/components/features/notifications/notification-kpi-summary.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-101 | Render 4 thẻ Bento KPI Thông báo | Đăng nhập tài khoản | Mở `/notifications`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Tổng thông báo (`total`), Chưa đọc (`unread`), Cảnh báo khẩn cấp (`criticalAlerts`), và Tỷ lệ chuyển phát thành công (`deliveryRate` %) | ✅ `[E2E]` |
| NOTIF-102 | Thẻ "Chưa đọc" hiển thị nổi bật | Có 3 tin chưa đọc | Quan sát thẻ Chưa đọc | Nền thẻ có ánh màu vàng/cam Neumorphic, số đếm nổi bật báo hiệu người dùng cần kiểm tra | ✅ `[E2E]` |
| NOTIF-103 | Bấm thẻ KPI tự động chuyển bộ lọc | Đang ở tab Hộp thư | Click vào thẻ "Chưa đọc" | Bộ lọc danh sách tự động chuyển sang `status=UNREAD` | ⬜ |

---

## 3. Tab 1: Hộp Thư Thông Báo (Inbox Feed & Quản lý Tin)

> **Nguồn code:** `src/components/features/notifications/notification-list.tsx`, `notification-item.tsx`, `notification-filter-toolbar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-201 | Render danh sách thông báo đầy đủ thông tin | Tab Hộp thư đang chọn | Quan sát danh sách | Mỗi thông báo hiển thị: Icon loại vi phạm (Không mũ/Không áo/Cảnh báo), Tiêu đề, Nội dung tóm tắt, Thời gian tương đối, Điểm chấm xanh đánh dấu chưa đọc | ✅ `[E2E]` |
| NOTIF-202 | Lọc theo Mức độ nghiêm trọng (Severity) | Danh sách gồm CRITICAL, HIGH, INFO | Chọn filter mức độ "CRITICAL" | Danh sách lọc chỉ còn các cảnh báo vi phạm khẩn cấp màu đỏ gạch | ⬜ |
| NOTIF-203 | Lọc theo Trạng thái Đọc (All / Unread / Read) | Đang hiển thị tất cả | Bấm tab con "Chưa đọc" | Chỉ hiển thị các thông báo chưa mở | ⬜ |
| NOTIF-204 | Đánh dấu 1 thông báo là đã đọc | Có thông báo chưa đọc | Click vào thông báo đó | Gọi PATCH `/api/v1/notifications/:id/read` -> Điểm chấm xanh biến mất, số đếm chưa đọc trên KPI và Header giảm 1 | ⬜ |
| NOTIF-205 | Điều hướng trực tiếp tới Sự cố từ Thông báo | Thông báo vi phạm an toàn có gắn `incidentId` | Click vào nút "Xem sự cố liên quan" trên item | Điều hướng ngay sang trang chi tiết sự cố `/incidents/[id]` | ⬜ |
| NOTIF-206 | Xóa thông báo đơn lẻ | Rê chuột vào thông báo | Click nút icon Thùng rác -> Xác nhận | Thông báo bị xóa khỏi hộp thư | ⬜ |
| NOTIF-207 | Trạng thái Hộp thư rỗng (Empty State) | Không có thông báo nào | Mở tab Hộp thư | Hiển thị minh họa hộp thư rỗng Neumorphic: "Không có thông báo nào trong hộp thư của bạn" | ⬜ |

---

## 4. Tab 2: Cài Đặt Nhận Tin & Giảm Thiểu Mỏi Mệt Cảnh Báo (Alert Fatigue Mitigation)

> **Nguồn code:** `src/components/features/notifications/notification-preferences-card.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-301 | Render Bảng Cài đặt Alert Fatigue | Chọn Tab "Cài đặt nhận tin" | Quan sát các khối thiết lập | Hiển thị: Điều tiết tần suất gửi (Alert Throttling), Khung giờ yên tĩnh (Quiet Hours), Kênh thông báo (In-app, Email, SMS, Webhook), Ngưỡng mức độ tối thiểu | ✅ `[E2E]` |
| NOTIF-302 | Cấu hình Giới hạn Tần suất (Alert Throttling) | Tránh nhận dồn dập hàng trăm cảnh báo khi camera phát hiện vi phạm liên tục | Chọn giới hạn: "Tối đa 1 thông báo mỗi 5 phút cho cùng 1 camera" | Giá trị được ghi nhận, mô hình backend sẽ gom nhóm (digest) các vi phạm lặp lại | ⬜ |
| NOTIF-303 | Thiết lập Khung giờ Yên tĩnh (Quiet Hours) | Không muốn nhận email lúc đêm | Bật công tắc "Khung giờ yên tĩnh", chọn từ `22:00` đến `06:00` | Trong khung giờ này, các vi phạm thông thường chỉ lưu in-app, chỉ gửi email cho các sự cố đặc biệt khẩn cấp (CRITICAL) | ⬜ |
| NOTIF-304 | Bật/Tắt Kênh nhận tin theo loại sự cố | Có 4 kênh | Tắt công tắc nhận qua "Email" cho loại vi phạm Không áo phản quang (MEDIUM) | Cập nhật preference thành công, hệ thống không gửi email cho vi phạm này | ⬜ |
| NOTIF-305 | Lưu cấu hình nhận tin thành công | Đã sửa đổi cài đặt | Bấm "Lưu tùy chọn nhận tin" | Gọi PUT `/api/v1/notifications/preferences` -> Toast "Đã lưu cài đặt thông báo" | ⬜ |

---

## 5. Tab 3: Quản Lý Mẫu Thông Báo (Templates & Preview)

> **Nguồn code:** `src/components/features/notifications/notification-templates-tab.tsx`, `preview-template-modal.tsx`, `test-send-template-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-401 | Phân quyền hiển thị Tab Mẫu thông báo | Đăng nhập ADMIN | Quan sát thanh Tab | Thấy Tab "Mẫu thông báo" | ✅ `[E2E]` |
| NOTIF-402 | Ẩn Tab Mẫu thông báo với Officer/User | Đăng nhập `officer@ppe.local` | Mở `/notifications` | Tab "Mẫu thông báo" bị ẩn hoàn toàn (RBAC Protection) | ✅ `[E2E]` |
| NOTIF-403 | Xem trước Mẫu thông báo (Preview Template) | ADMIN mở tab Mẫu | Click nút "Xem trước" trên mẫu `PPE_VIOLATION_CRITICAL` | Modal `PreviewTemplateModal` mở lên hiển thị bản render HTML email đồ họa chuyên nghiệp kèm các biến giả lập `{workerName}`, `{siteName}`, `{cameraCode}` | ⬜ |
| NOTIF-404 | Gửi Thử Nghiệm Mẫu Email (Test Send) | Đang ở preview | Click nút "Gửi email thử nghiệm", nhập email cá nhân | Hệ thống gọi POST test send email -> Nhận email thật trong hộp thư để kiểm tra hiển thị | ⬜ |

---

## 6. Tab 4: Nhật Ký Chuyển Phát Email (Email Logs)

> **Nguồn code:** `src/components/features/notifications/notification-email-logs-tab.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-501 | Phân quyền hiển thị Tab Nhật ký Email | Đăng nhập ADMIN | Quan sát thanh Tab | Thấy Tab "Nhật ký Email" | ✅ `[E2E]` |
| NOTIF-502 | Render bảng lịch sử gửi email | Chọn tab Nhật ký Email | Quan sát bảng dữ liệu | Hiển thị các cột: Thời gian, Người nhận, Tiêu đề email, Mẫu áp dụng, Trạng thái (`DELIVERED`, `BOUNCED`, `FAILED`), Độ trễ gửi (ms) | ✅ `[E2E]` |
| NOTIF-503 | Lọc nhật ký theo Email người nhận | Có nhiều bản ghi | Nhập `manager@ppe.local` vào ô tìm kiếm | Bảng lọc đúng các email đã gửi tới tài khoản này | ⬜ |
| NOTIF-504 | Xem chi tiết lỗi gửi thất bại (Bounced/Failed) | Có bản ghi gửi lỗi | Click vào badge lỗi đỏ `FAILED` | Mở drawer xem chi tiết phản hồi từ SMTP server (ví dụ: `550 Mailbox unavailable`) | ⬜ |

---

## 7. Modal Phát Thông Báo Khẩn Cấp (Broadcast Emergency Modal)

> **Nguồn code:** `src/components/features/notifications/modals/broadcast-notification-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-601 | Nút "+ Phát thông báo" hiển thị cho Admin/Manager | Đăng nhập ADMIN | Quan sát góc phải Header | Thấy nút nổi bật "+ Phát thông báo" | ✅ `[E2E]` |
| NOTIF-602 | Ẩn nút Phát thông báo với Officer | Đăng nhập `officer@ppe.local` | Mở `/notifications` | Nút "+ Phát thông báo" bị ẩn | ✅ `[E2E]` |
| NOTIF-603 | Mở Modal Phát thông báo khẩn cấp | Admin click nút "+ Phát thông báo" | Modal mở lên | Modal Neumorphic mở lên với các trường: Tiêu đề thông báo, Phạm vi (Toàn hệ thống / Chọn công trường), Mức độ khẩn cấp (Khẩn cấp / Cảnh báo / Thông tin), Nội dung | ✅ `[E2E]` |
| NOTIF-604 | Bỏ trống tiêu đề hoặc nội dung | Form đang mở | Bấm ngay "Phát thông báo" | Báo lỗi inline: "Vui lòng nhập tiêu đề" và "Vui lòng nhập nội dung", không gửi API | ⬜ |
| NOTIF-605 | Phát thông báo thành công tới toàn bộ công trường | Nhập Tiêu đề: "Cảnh Báo Giông Lốc - Dừng Thi Công Trên Cao", chọn mức `CRITICAL`, phạm vi "Tất cả công trường" | Bấm "Phát thông báo ngay" | Gọi POST `/api/v1/notifications/broadcast` -> Toast thành công -> Toàn bộ người dùng đang online lập tức nhận được thông báo đỏ đẩy qua SSE | ⬜ |

---

## 8. Kiểm Thử Đa Thiết Bị & Responsive (Viewports Testing)

> **Nguồn code:** `scripts/test-notifications-e2e.py`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| NOTIF-701 | Giao diện trên Màn hình Desktop (1440px) | Viewport 1440x900 | Mở `/notifications` | Bố cục rộng rãi, 4 thẻ Bento trải ngang, thanh Tab đầy đủ icon và nhãn | ✅ `[E2E]` |
| NOTIF-702 | Giao diện trên Màn hình Tablet (768px) | Viewport 768x1024 (iPad) | Mở `/notifications` | Bento KPI co thành lưới 2x2, thanh Tab cho phép cuộn ngang (scrollable tabs) | ✅ `[E2E]` |
| NOTIF-703 | Giao diện trên Màn hình Mobile (375px) | Viewport 375x667 (iPhone SE) | Mở `/notifications` | Bento KPI xếp 1 cột dọc hoặc vuốt thẻ ngang, nút Phát thông báo thu nhỏ thành icon nổi, item thông báo bố cục gọn gàng cho màn hình hẹp | ✅ `[E2E]` |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-27 | E2E (`scripts/test-notifications-e2e.py`) | Đạt | Kiểm thử tự động Playwright bao phủ 3 vai trò (Admin, Officer, User), 4 Tabs, Realtime SSE Badge, Modal Broadcast và 3 Viewports responsive |
| 2026-10-28 | Alert Fatigue & Anti-spam Review | Đạt | Hoàn thiện tích hợp giải pháp điều tiết tần suất cảnh báo và mẫu thông báo tiêu chuẩn |
