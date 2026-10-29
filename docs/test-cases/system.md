# Test Case — Quản Trị Cấu Hình & Hạ Tầng Hệ Thống (/system)

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Quản trị Cấu hình & Vận hành Hạ tầng (`/system`) — Thước đo Bento KPI Vận hành (`SystemKpiSummary`), 4 Tab Chức năng Chuyên sâu (`SystemTabs` đồng bộ URL `?tab=`):
> 1. Tab Công tắc tính năng tức thời (`tab=flags` — `FeatureFlagsTab`, `FeatureFlagCard`, `ToggleFlagDialog`)
> 2. Tab Danh mục Cấu hình Biến động Runtime (`tab=configs` — `SystemConfigTable`, `SystemConfigToolbar`, `CreateConfigModal`, `EditConfigModal`, `DeleteConfigDialog`)
> 3. Tab Ma trận Giám sát Sức khỏe Dịch vụ (`tab=health` — `SystemHealthMatrix`: Theo dõi nhịp tim & độ trễ 8 microservices, DB, Kafka, MinIO, Redis, Traefik Gateway)
> 4. Tab Thông số Nền tảng & Phiên bản Môi sinh (`tab=platform` — `SystemInfoPanel`: Git SHA, Build version, Node runtime, Memory usage).
> **Nguồn code:**
> - Trang chính: `app/(auth)/system/page.tsx`, `system-content.tsx`
> - Components: `src/components/features/system/*`, `src/components/features/system/modals/*`
> - Services & Hooks: `src/services/system.service.ts`, `src/hooks/system/*`
> **Backend Contract:** `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/system`) và Health Check Endpoints của các microservices.

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ System |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem và thay đổi cấu hình, toggle feature flags, xem ma trận health check |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem cấu hình và giám sát sức khỏe dịch vụ (Read-only); không được sửa đổi |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Không có quyền `SYSTEM_CONFIG_READ`, bị chặn 403 Forbidden |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `SYSTEM_CONFIG_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker cụm 8 microservices đang chạy.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI & Thống Kê Tổng Quan Vận Hành (SystemKpiSummary)

> **Nguồn code:** `src/components/features/system/system-kpi-summary.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SYS-001 | Render 4 thẻ Bento KPI Vận hành Hệ thống | Đăng nhập tài khoản có quyền `SYSTEM_CONFIG_READ` | Mở `/system`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Cấu hình đang kích hoạt (`activeConfigs`), Sức khỏe cụm dịch vụ (`servicesHealth`), Tỷ lệ Uptime hệ thống (`uptimeRate` %), và Feature Flags đang bật (`enabledFlags`) | ✅ `[E2E]` |
| SYS-002 | Trạng thái Sức khỏe Cụm dịch vụ (HEALTHY) | Tất cả 8 dịch vụ đều phản hồi HTTP 200 | Quan sát thẻ Sức khỏe | Badge xanh lá "KHỎE MẠNH (8/8 ONLINE)" kèm icon Khiên xanh phát sáng | ✅ |
| SYS-003 | Cảnh báo Dịch vụ bị gián đoạn (DEGRADED / DOWN) | Có 1 dịch vụ (ví dụ AI service) mất kết nối | Quan sát thẻ Sức khỏe | Thẻ chuyển sang ánh đỏ gạch cảnh báo: "SUY GIẢM (7/8 ONLINE) - 1 Dịch vụ mất tín hiệu" | ⬜ |

---

## 2. Tab 1: Công Tắc Tính Năng Tức Thời (Feature Flags Hot-toggle)

> **Nguồn code:** `src/components/features/system/feature-flags-tab.tsx`, `feature-flag-card.tsx`, `modals/toggle-flag-dialog.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SYS-101 | Render Lưới các Cờ Tính Năng (Feature Flags Grid) | Mở Tab "Cờ tính năng" (`tab=flags`) | Quan sát danh sách cờ | Hiển thị các thẻ tính năng: Đăng ký tài khoản tự do (`feature.registration.enabled`), Kênh gửi thông báo (`feature.notifications.enabled`), Đăng nhập Google OAuth (`feature.social_login.enabled`), Phân tích AI Camera (`feature.ai_stream.enabled`) | ✅ |
| SYS-102 | Bật/Tắt công tắc Switch kích hoạt Hộp thoại Xác nhận | ADMIN click gạt switch trên cờ "Đăng ký tài khoản" | Gạt switch | Switch không đổi trạng thái ngay mà mở hộp thoại `ToggleFlagDialog` cảnh báo tác động hệ thống | ✅ |
| SYS-103 | Hủy bỏ thay đổi cờ | Hộp thoại đang mở | Bấm "Hủy bỏ" | Hộp thoại đóng lại, Switch giữ nguyên trạng thái cũ | ⬜ |
| SYS-104 | Xác nhận Bật/Tắt cờ tính năng (Hot-toggle) | ADMIN bấm "Xác nhận chuyển đổi" | Chờ xử lý | Gọi PATCH `/api/v1/system/configs/:key` -> Toast thành công -> Cờ đổi trạng thái ngay lập tức trên toàn hệ thống mà không cần build lại code | ⬜ |
| SYS-105 | Hiển thị cờ ở chế độ Chỉ đọc cho Manager | Đăng nhập `manager@ppe.local` | Mở Tab Cờ tính năng | Các switch bị disabled, không thể gạt chuyển trạng thái (RBAC Protection) | ⬜ |

---

## 3. Tab 2: Danh Mục Biến Cấu Hình Động Runtime (System Configs)

> **Nguồn code:** `src/components/features/system/system-config-table.tsx`, `system-config-toolbar.tsx`, `modals/create-config-modal.tsx`, `edit-config-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SYS-201 | Render Bảng Cấu hình Động | Chọn Tab "Cấu hình hệ thống" (`tab=configs`) | Quan sát bảng dữ liệu | Hiển thị các tham số: Khóa cấu hình (`key`), Giá trị hiện tại (`value`), Kiểu dữ liệu (STRING, NUMBER, BOOLEAN, JSON), Nhóm danh mục (SECURITY, SYSTEM, NOTIFICATION), Thao tác | ✅ |
| SYS-202 | Tìm kiếm biến cấu hình theo Khóa | Có nhiều biến | Nhập `jwt` vào ô tìm kiếm | Bảng lọc tức thì hiển thị `auth.jwt.access_token_expires_in` | ⬜ |
| SYS-203 | Lọc theo Nhóm danh mục (Category) | Chọn dropdown Category | Chọn "BẢO MẬT (SECURITY)" | Bảng lọc đúng các biến liên quan đến mật khẩu, thời gian sống token, số lần thử đăng nhập | ⬜ |
| SYS-204 | Mở Modal Thêm mới Biến cấu hình | ADMIN click nút "+ Thêm tham số" trên Toolbar | Modal mở lên | Modal Neumorphic mở lên với các trường: Mã khóa (vd: `system.camera.ping_timeout`), Giá trị, Kiểu dữ liệu, Nhóm danh mục, Mô tả | ✅ |
| SYS-205 | Mở Modal Chỉnh sửa Giá trị Cấu hình | Bấm nút "Sửa" trên biến `auth.max_login_attempts` | Modal edit mở lên | Cho phép sửa giá trị từ `5` sang `3` lần thử | ✅ |
| SYS-206 | Lưu thay đổi cấu hình thành công & Ghi Audit Log | Bấm "Lưu cấu hình" | Chờ xử lý | Gọi PUT `/api/v1/system/configs/:key` -> Toast "Cập nhật tham số thành công" -> Biến động được tự động ghi nhận vào Audit Log | ⬜ |
| SYS-207 | Xóa biến cấu hình tùy chỉnh | Bấm icon Thùng rác trên biến tự tạo -> Xác nhận | Gửi DELETE -> Biến bị gỡ bỏ | ⬜ |

---

## 4. Tab 3: Ma Trận Giám Sát Sức Khỏe Dịch Vụ (SystemHealthMatrix)

> **Nguồn code:** `src/components/features/system/system-health-matrix.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SYS-301 | Render Ma trận Giám sát Hạ tầng 8 Microservices | Chọn Tab "Sức khỏe dịch vụ" (`tab=health`) | Quan sát lưới dịch vụ | Hiển thị đầy đủ các dịch vụ: Identity Service (:9999), Site Service (:8887), Camera Service (:8886), Incident Service (:8885), Reporting Service (:8888), Notification Service (:8889), Media Service (:8890), AI Vision Service (:8000) | ✅ |
| SYS-302 | Giám sát Hạ tầng Phụ trợ (Infra Components) | Kéo xuống khối hạ tầng | Quan sát các khối phụ trợ | Hiển thị trạng thái: Cơ sở dữ liệu PostgreSQL, Bộ đệm Redis Pub/Sub, Hàng đợi sự kiện Kafka, Lưu trữ MinIO Object Storage, Traefik API Gateway | ✅ |
| SYS-303 | Đo lường Độ trễ Nhịp tim (Heartbeat Latency ms) | Các dịch vụ đang chạy | Đọc chỉ số trên từng thẻ | Mỗi thẻ dịch vụ hiển thị độ trễ phản hồi (ví dụ: `Identity: 12ms`, `Site: 18ms`, `Incident: 15ms`), badge trạng thái xanh `HEALTHY` | ⬜ |
| SYS-304 | Nút "Kiểm tra lại toàn bộ sức khỏe" (Health Check Refresh) | Đang ở tab Health | Bấm nút "Làm mới sức khỏe" trên Header | Kích hoạt gọi đồng thời endpoint `/health` của toàn bộ dịch vụ, cập nhật trạng thái mới nhất | ⬜ |
| SYS-305 | Mô phỏng Dịch vụ gặp sự cố (Degraded Alert) | Dừng thử 1 container phụ trợ | Bấm làm mới | Thẻ dịch vụ tương ứng chuyển sang màu đỏ `UNHEALTHY`, hiển thị chi tiết mã lỗi kết nối | ⬜ |

---

## 5. Tab 4: Thông Số Nền Tảng & Môi Sinh Vận Hành (SystemInfoPanel)

> **Nguồn code:** `src/components/features/system/system-info-panel.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SYS-401 | Render Thông số Nền tảng Hệ thống | Chọn Tab "Thông tin nền tảng" (`tab=platform`) | Quan sát thông số | Hiển thị: Phiên bản ứng dụng (`v1.2.0-prod`), Mã Git Commit SHA (`e81433c`), Môi trường chạy (`production`), Node.js Runtime version, Múi giờ hệ thống (`Asia/Ho_Chi_Minh +07:00`) | ✅ |
| SYS-402 | Giám sát Tài nguyên Bộ nhớ Frontend / Server | Server đang chạy | Đọc các chỉ số bộ nhớ | Hiển thị dung lượng RAM tiêu thụ (Heap Used / Heap Total) | ⬜ |

---

## 6. Phân Quyền Route & Guard 403

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SYS-501 | ADMIN truy cập `/system` thành công | Đăng nhập `admin@ppe.local` | Mở `/system` | Trang tải mượt mà trong AppShell | ✅ `[E2E]` |
| SYS-502 | MANAGER truy cập `/system` ở chế độ xem | Đăng nhập `manager@ppe.local` | Mở `/system` | Xem được ma trận sức khỏe và cờ tính năng; các nút thêm/sửa/xóa bị ẩn | ⬜ |
| SYS-503 | OFFICER và USER thông thường bị chặn 403 | Đăng nhập `officer@ppe.local` | Gõ URL `/system` | Route Guard chặn hiển thị `ForbiddenView` 403 | ✅ `[E2E]` |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/system` render trong AppShell, RBAC Admin truy cập, Officer bị chặn 403 |
| 2026-10-28 | Microservices Health Matrix & Feature Flags Testing | Đạt | Tích hợp thành công Bento Console, Feature Flags Switch Grid, ToggleFlagDialog, Ma trận sức khỏe 8 dịch vụ và Bảng biến cấu hình runtime |
