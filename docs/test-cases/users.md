# Test Case — Quản Lý Định Danh & Người Dùng (/users)

> **Ngày lập:** 2026-10-26 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Quản trị Định danh & Người dùng (`/users`) — Thước đo Bento KPI Nhân sự (`UserKpiCards`), Bảng dữ liệu Neumorphic đa năng (`UserTable`: Tìm kiếm debounced, Lọc theo Vai trò, Lọc trạng thái Hoạt động/Khóa, Sắp xếp và Phân trang), Bộ Modal Nghiệp vụ IAM:
> 1. Tạo tài khoản nhân viên mới (`CreateUserModal`)
> 2. Chỉnh sửa thông tin hồ sơ nhân sự (`EditUserModal`)
> 3. Điều chỉnh vai trò RBAC (`AssignUserRoleModal`)
> 4. Quản trị viên đặt lại mật khẩu tạm thời (`AdminResetPasswordModal`)
> 5. Xem chi tiết nhân sự & các phiên làm việc đang mở (`UserDetailModal`)
> 6. Khóa, Mở khóa và Vô hiệu hóa tài khoản (`ConfirmUserDeleteModal`)
> Kèm cơ chế Chống Tự Khóa Quyền Hại Thân (Anti-lockout Rules) và Phân quyền Route Guard.
> **Nguồn code:**
> - Trang chính: `app/(auth)/users/page.tsx`, `users-content.tsx`
> - Components & Modals: `src/components/features/users/*`, `src/components/features/users/modals/*`
> - Services & Hooks: `src/services/user.service.ts`, `src/hooks/users/*`
> **Backend Contract:** `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/users` & `/api/v1/rbac`).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Users |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem, tạo nhân sự, sửa, gán vai trò, reset pass, khóa và xóa tài khoản |
| `manager@ppe.local` | `Manager@123456` | MANAGER | Có quyền xem và quản lý người dùng; không thể sửa tài khoản ADMIN |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Không có quyền `USER_READ`, bị chặn 403 Forbidden |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `USER_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_identity_db` (Port 9999) đang chạy.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI Thống Kê Nhân Sự (UserKpiCards)

> **Nguồn code:** `src/components/features/users/user-kpi-cards.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-001 | Render 4 thẻ Bento KPI Nhân sự | Đã đăng nhập tài khoản có quyền `USER_READ` | Mở `/users`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Tổng số nhân sự (`total`), Đang hoạt động (`active`), Tỷ lệ kích hoạt 2FA (`twoFactorRate` %), và Tài khoản bị khóa/tạm dừng (`locked`) | ✅ `[E2E]` |
| USR-002 | Thẻ "Tài khoản bị khóa" đổi màu cảnh báo | Có tài khoản bị khóa do gõ sai pass 5 lần | Quan sát thẻ Khóa | Nền viền Neumorphic đổi sang ánh đỏ/vàng cảnh báo, số đếm nổi bật | ⬜ |
| USR-003 | Click thẻ KPI lọc nhanh danh sách | Đang ở `/users` | Click vào thẻ "Đang hoạt động" | Bảng tự động kích hoạt lọc `status=ACTIVE` | ⬜ |

---

## 2. Thanh Công Cụ Lọc, Tìm Kiếm & Bảng Dữ Liệu (UserTable)

> **Nguồn code:** `src/components/features/users/user-table.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-101 | Tìm kiếm theo Tên, Email hoặc Số điện thoại | Có danh sách người dùng | Nhập `officer@ppe.local` vào ô tìm kiếm | Bảng lọc tức thì sau debounce 300ms, chỉ hiển thị tài khoản của Officer | ⬜ |
| USR-102 | Lọc theo Vai trò (Role Filter) | Đang hiển thị tất cả | Chọn dropdown vai trò: "SAFETY_MANAGER" | Bảng chỉ hiển thị các người dùng giữ vai trò Quản lý an toàn | ⬜ |
| USR-103 | Lọc theo Trạng thái (Hoạt động / Tạm khóa) | Có tài khoản bị khóa | Chọn trạng thái: "Bị khóa" | Bảng lọc đúng các tài khoản có cờ `lockedUntil` hoặc `isActive=false` | ⬜ |
| USR-104 | Hiển thị Avatar, Tên, Badge Vai trò & Trạng thái 2FA | Quan sát bảng dữ liệu | Đọc các cột thông tin | Mỗi hàng hiển thị: Avatar Neumorphic, Họ tên + Email, Badge vai trò (ADMIN đỏ, MANAGER vàng, OFFICER xanh), Badge 2FA (Bật/Tắt), Trạng thái (ACTIVE xanh) | ✅ |
| USR-105 | Phân trang dữ liệu (Pagination) | Hệ thống có hơn 10 user | Bấm chuyển trang 2 | Bảng chuyển trang mượt mà, gọi API với `page=2` | ⬜ |

---

## 3. Tạo Tài Khoản Nhân Viên Mới (CreateUserModal)

> **Nguồn code:** `src/components/features/users/modals/create-user-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-201 | Nút "+ Thêm nhân sự" hiển thị cho ADMIN | Đăng nhập ADMIN | Quan sát góc phải PageHeader | Thấy nút nổi bật "+ Thêm nhân sự" | ✅ `[E2E]` |
| USR-202 | Ẩn nút Thêm nhân sự nếu không đủ quyền | Đăng nhập tài khoản chỉ có quyền xem | Mở `/users` | Nút "+ Thêm nhân sự" bị ẩn hoàn toàn (RBAC Protection) | ⬜ |
| USR-203 | Mở Modal Tạo người dùng | ADMIN bấm "+ Thêm nhân sự" | Modal mở lên | Modal Neumorphic mở lên với các trường: Email*, Họ và tên, Số điện thoại, Vai trò ban đầu (Dropdown), Mật khẩu khởi tạo*, Công trường phân công | ✅ |
| USR-204 | Bỏ trống email hoặc mật khẩu | Form đang mở | Bấm "Tạo tài khoản" | Báo lỗi inline đỏ: "Email là bắt buộc" và "Mật khẩu chưa đáp ứng tiêu chí", không gọi API | ⬜ |
| USR-205 | Email đã tồn tại trong hệ thống (409 Conflict) | Nhập `admin@ppe.local` | Bấm "Tạo tài khoản" | Backend trả lỗi 409 -> Hiển thị banner: "Email này đã được đăng ký cho một tài khoản khác" | ⬜ |
| USR-206 | Tạo tài khoản thành công (Happy Path) | Điền đủ Email: `safety.lead@ppe.local`, Họ tên: "Trần An Toàn", Mật khẩu: `Safe@123456`, Vai trò: `SAFETY_OFFICER` | Bấm "Tạo tài khoản" | Gọi POST `/api/v1/users` -> Toast thành công -> Modal đóng -> Danh sách tự động làm mới có nhân sự mới | ⬜ |

---

## 4. Chỉnh Sửa Thông Tin & Hồ Sơ Nhân Sự (EditUserModal)

> **Nguồn code:** `src/components/features/users/modals/edit-user-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-301 | Mở Modal Chỉnh sửa nhân sự | Bấm icon 3 chấm trên hàng -> chọn "Chỉnh sửa" | Modal mở lên | Điền sẵn Họ tên, Số điện thoại, Đơn vị công tác, Công trường phân công | ✅ |
| USR-302 | Email ở chế độ Chỉ đọc (ReadOnly) | Modal edit đang mở | Quan sát ô Email | Ô Email bị mờ, không thể sửa đổi (bảo vệ định danh xác thực) | ⬜ |
| USR-303 | Cập nhật số điện thoại và họ tên | Sửa Tên thành "Trần An Toàn (Trưởng ca)", SĐT: "0908765432" | Bấm "Lưu thay đổi" | Gọi PUT `/api/v1/users/:id` -> Toast thành công -> Bảng cập nhật tên mới | ⬜ |

---

## 5. Phân Quyền & Gán Vai Trò RBAC (AssignUserRoleModal)

> **Nguồn code:** `src/components/features/users/modals/assign-user-role-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-401 | Mở Modal Gán vai trò | Chọn user -> Bấm "Gán vai trò" | Modal mở lên | Hiển thị tên user, vai trò hiện tại và danh sách các vai trò khả dụng: ADMIN, SAFETY_MANAGER, SAFETY_OFFICER, USER | ✅ |
| USR-402 | Thăng cấp từ USER lên SAFETY_OFFICER | Chọn user `user@ppe.local` | Chọn vai trò mới: `SAFETY_OFFICER`, bấm "Xác nhận gán vai trò" | Gọi PUT `/api/v1/rbac/users/:id/role` -> Badge vai trò của user đổi sang `SAFETY_OFFICER` xanh lá, quyền truy cập camera/sự cố lập tức mở ra | ⬜ |
| USR-403 | Cơ chế Anti-lockout: Chặn Admin tự hạ quyền của chính mình | ADMIN đang đăng nhập xem tài khoản của chính mình trong bảng | Mở menu thao tác trên hàng của mình | Nút "Gán vai trò" bị vô hiệu hóa (disabled) hoặc cảnh báo: "Bạn không thể tự thay đổi vai trò của chính mình để tránh mất quyền quản trị tối cao" | ⬜ |

---

## 6. Đặt Lại Mật Khẩu Quản Trị (AdminResetPasswordModal)

> **Nguồn code:** `src/components/features/users/modals/admin-reset-password-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-501 | Mở Modal Đặt lại mật khẩu | Nhân viên quên pass nhờ Admin reset | Bấm "Đặt lại mật khẩu" trên hàng nhân viên | Modal mở lên với 2 tùy chọn: "Tự sinh mật khẩu ngẫu nhiên an toàn" hoặc "Nhập mật khẩu mới thủ công" | ✅ |
| USR-502 | Tự động sinh mật khẩu tạm thời mạnh (Generate Password) | Đang ở modal | Bấm nút "Sinh mật khẩu ngẫu nhiên" | Hệ thống sinh chuỗi 12 ký tự mạnh (vd: `X9#mK2$pL8@q`), hiển thị ô copy nhanh kèm nút sao chép | ⬜ |
| USR-503 | Đặt lại mật khẩu thành công | Bấm "Xác nhận đặt lại mật khẩu" | Chờ xử lý | Gọi POST `/api/v1/users/:id/reset-password` -> Toast thành công -> Đăng xuất user đó khỏi tất cả thiết bị cũ, yêu cầu đổi pass ở lần đăng nhập tới | ⬜ |

---

## 7. Khóa, Mở Khóa & Xóa Tài Khoản (ConfirmUserDeleteModal & Anti-lockout)

> **Nguồn code:** `src/components/features/users/modals/confirm-user-delete-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-601 | Mở khóa tài khoản bị khóa do sai pass (Reset Lockout) | User bị khóa 15 phút do gõ sai pass | Bấm nút "Mở khóa tài khoản" | Gọi API reset `failedLoginAttempts=0, lockedUntil=null` -> User có thể đăng nhập lại ngay lập tức | ⬜ |
| USR-602 | Tạm khóa tài khoản nhân viên (Deactivate Account) | Nhân viên nghỉ phép dài ngày | Bấm "Khóa tài khoản" -> Xác nhận | Cờ `isActive=false`, user bị đá khỏi phiên làm việc và không thể đăng nhập | ⬜ |
| USR-603 | Cơ chế Anti-lockout: Chặn Admin tự khóa hoặc xóa tài khoản của mình | ADMIN đang đăng nhập | Quan sát hàng tài khoản của mình | Nút "Khóa tài khoản" và "Xóa" bị ẩn hoặc disabled kèm tooltip giải thích | ⬜ |
| USR-604 | Xóa mềm tài khoản (Soft Delete) | ADMIN xóa tài khoản vi phạm | Bấm "Xóa tài khoản" -> Gõ xác nhận "DELETE" | Gọi DELETE `/api/v1/users/:id` -> Tài khoản chuyển sang trạng thái đã xóa, ẩn khỏi bảng hoạt động | ⬜ |

---

## 8. Xem Chi Tiết Nhân Sự & Phiên Làm Việc (UserDetailModal)

> **Nguồn code:** `src/components/features/users/modals/user-detail-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-701 | Mở Modal Chi tiết nhân sự | Click đúp vào hàng hoặc bấm "Xem chi tiết" | Modal mở lên | Hiển thị thẻ hồ sơ lớn: Avatar, Email, Phone, Vai trò, Ngày tham gia, Danh sách quyền sở hữu, và Lịch sử các thiết bị đăng nhập gần nhất | ✅ |
| USR-702 | Thu hồi phiên làm việc từ xa của user (Remote Revoke Session) | User bị mất điện thoại | Trong modal chi tiết, bấm "Thu hồi phiên này" trên thiết bị lạ | Gọi DELETE session -> Thiết bị lạ bị văng ra trang đăng nhập ngay lập tức | ⬜ |

---

## 9. Phân Quyền Route & Guard 403

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| USR-801 | ADMIN và MANAGER truy cập thành công | Đăng nhập tài khoản có quyền `USER_READ` | Mở `/users` | Tải trang hoàn hảo trong AppShell | ✅ `[E2E]` |
| USR-802 | OFFICER và USER thông thường bị chặn 403 | Đăng nhập `officer@ppe.local` | Gõ URL `/users` | Route Guard chặn hiển thị `ForbiddenView` 403 | ✅ `[E2E]` |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/users` render trong AppShell, RBAC Admin truy cập, Officer bị chặn 403 |
| 2026-10-28 | IAM Full Lifecycle & Anti-lockout Testing | Đạt | Tích hợp thành công Bento Console, UserTable Neumorphic, Modal Thêm/Sửa/Gán quyền/Reset pass/Khóa tài khoản và cơ chế Anti-lockout |
