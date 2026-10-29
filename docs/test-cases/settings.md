# Test Case — Cài Đặt Hồ Sơ & Bảo Mật Tài Khoản (/settings)

> **Ngày lập:** 2026-10-21 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Cài đặt Tài khoản, Hồ sơ Cá nhân & Bảo mật Đa lớp (`/settings/profile`, `/settings/security`, `/change-password`):
> 1. Tab Hồ sơ Cá nhân (`/settings/profile` — `profile-settings-content.tsx`): Thẻ định danh cá nhân, Tải lên và cắt ảnh đại diện Avatar trực tiếp MinIO (`media-service`), Cập nhật Họ và tên, Số điện thoại di động Việt Nam, Ngôn ngữ giao diện (VI/EN) và Giao diện Sáng/Tối.
> 2. Tab Trung tâm Bảo mật (`/settings/security` — `security-settings-content.tsx`): 5 khối chuyên sâu:
>    - Thiết lập Xác thực 2 yếu tố (`two-factor-panel.tsx`, `backup-codes-modal.tsx`: Quét mã QR TOTP, nhập 6 số xác thực, cấp 8 mã dự phòng khẩn cấp, tải file .txt, tạo lại mã mới, tắt 2FA).
>    - Quản lý Phiên làm việc & Thiết bị (`sessions-panel.tsx`: Danh sách phiên, badge `isCurrent`, định danh thiết bị/OS/IP, thu hồi 1 phiên, đăng xuất khỏi tất cả thiết bị khác).
>    - Liên kết Tài khoản Mạng xã hội (`social-panel.tsx`: Liên kết / Hủy liên kết Google OAuth 2.0, bảo vệ Anti-lockout không cho gỡ nếu không có mật khẩu).
>    - Đổi Mật khẩu Chủ động (`password-panel.tsx` & `/change-password`: Checklist 5 tiêu chuẩn mật khẩu realtime, xác thực mật khẩu cũ).
>    - Vô hiệu hóa Tài khoản (`deactivate-panel.tsx`: Xác nhận mật khẩu, gửi email kích hoạt hủy tài khoản).
> **Nguồn code:**
> - Routes: `app/(auth)/settings/profile/page.tsx`, `app/(auth)/settings/security/page.tsx`, `app/(auth)/change-password/page.tsx`
> - Components: `src/components/features/auth/settings/*`
> - Services & Hooks: `src/services/auth.service.ts`, `src/services/user.service.ts`, `src/hooks/auth/*`
> **E2E tự động:** `scripts/test-step7-2-settings-security-e2e.py` (33/33 đạt) và `scripts/test-step7-2-change-password-e2e.py` (14/14 đạt) — các case có ghi chú `[E2E]`

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Ghi chú |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Không dùng để test hủy tài khoản |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Tài khoản quản lý |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Tài khoản cán bộ an toàn |
| `user@ppe.local` | `User@123456` | USER | Ưu tiên dùng để test đổi pass, 2FA, sessions, hủy tài khoản |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_identity_db` (Port 9999).

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Hồ Sơ Cá Nhân & Ảnh Đại Diện (/settings/profile)

> **Nguồn code:** `src/components/features/auth/settings/profile-settings-content.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SET-001 | Render Trang Hồ sơ Cá nhân | Đã đăng nhập tài khoản | Mở `http://localhost:3000/settings/profile` | Hiển thị: Avatar Neumorphic, Họ tên, Email (chỉ đọc), Ô nhập Số điện thoại, Vai trò RBAC (Badge chỉ đọc), Nút "Lưu thay đổi" | ✅ |
| SET-002 | Email ở chế độ Khóa bất biến | Form hồ sơ đang mở | Quan sát ô Email | Ô Email bị mờ, mang thuộc tính `disabled` hoặc `readOnly`, không cho phép sửa đổi định danh cốt lõi | ✅ |
| SET-003 | Kiểm tra định dạng Số điện thoại Việt Nam | Nhập số điện thoại sai (vd: `12345` hoặc chữ `abc`) | Bấm "Lưu thay đổi" | Báo lỗi inline: "Số điện thoại không hợp lệ (phải bắt đầu bằng 0 hoặc +84 và có 10 chữ số)", không gửi API | ⬜ |
| SET-004 | Cập nhật Họ tên và Số điện thoại thành công | Nhập Họ tên: "Nguyễn Văn An", SĐT: "0912345678" | Bấm "Lưu thay đổi" | Gọi PUT `/api/v1/users/me` -> Toast "Cập nhật hồ sơ thành công" -> Họ tên trên AppHeader UserMenu đổi ngay theo tên mới | ⬜ |
| SET-005 | Tải lên Ảnh Đại diện Mới (Avatar Upload) | Chuẩn bị ảnh JPG/PNG < 5MB | Bấm nút icon Camera trên Avatar -> Chọn file ảnh | Hiển thị thanh tiến trình tải lên, gửi file lên `media-service` MinIO -> Avatar tự động cập nhật ảnh mới sắc nét | ⬜ |
| SET-006 | Chặn tải lên file quá dung lượng (> 5MB) | Chọn file ảnh 15MB | Tải file | Báo lỗi: "Kích thước ảnh vượt quá giới hạn cho phép (tối đa 5MB)", chặn upload | ⬜ |

---

## 2. Xác Thực 2 Yếu Tố TOTP & Mã Dự Phòng (/settings/security > Tab 2FA)

> **Nguồn code:** `src/components/features/auth/settings/two-factor-panel.tsx`, `backup-codes-modal.tsx`
> **E2E tự động:** `scripts/test-step7-2-settings-security-e2e.py`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SET-101 | Render Trạng thái 2FA (Đang tắt) | Tài khoản chưa bật 2FA | Mở `/settings/security` | Khối 2FA hiển thị badge xám "ĐANG TẮT", nút "Kích hoạt 2FA (Bật xác thực 2 lớp)" | ✅ `[E2E]` |
| SET-102 | Mở luồng Kích hoạt 2FA (QR Code) | Bấm "Kích hoạt 2FA" | Click nút kích hoạt | Gọi API khởi tạo 2FA -> Hiển thị mã QR Code Neumorphic sắc nét + Chuỗi Secret Key để nhập thủ công + 6 ô nhập mã OTP | ✅ `[E2E]` |
| SET-103 | Nhập mã OTP sai (400) | Đang ở bước nhập 6 số | Nhập `000000`, submit | Báo lỗi inline: "Mã xác thực không chính xác hoặc đã hết hạn", tự động xóa 6 ô để nhập lại | ✅ `[E2E]` |
| SET-104 | Bật 2FA thành công -> Modal 8 Mã dự phòng khẩn cấp | Nhập đúng mã 6 số từ Google Authenticator | Submit | 2FA được kích hoạt -> Modal `BackupCodesModal` mở lên hiển thị danh sách 8 mã dự phòng khẩn cấp (dạng `XXXX-XXXX`) | ✅ `[E2E]` |
| SET-105 | Gate Tải mã dự phòng trước khi đóng | Đang ở modal mã dự phòng | Cố gắng bấm nút "Hoàn tất" | Nút "Hoàn tất" bị vô hiệu hóa cho tới khi người dùng tick vào checkbox "Tôi đã lưu trữ các mã dự phòng này an toàn" hoặc bấm "Tải file .txt" | ✅ `[E2E]` |
| SET-106 | Tải file `ppe-backup-codes.txt` | Bấm nút "Tải mã dự phòng (.txt)" | Click nút tải | Trình duyệt tải ngay file text chứa 8 mã kèm ngày sinh mã và cảnh báo bảo mật | ✅ `[E2E]` |
| SET-107 | Tạo lại bộ mã dự phòng mới (Regenerate) | Tài khoản đã bật 2FA | Bấm "Tạo lại mã dự phòng" -> Xác nhận | Bộ 8 mã cũ bị hủy vĩnh viễn, sinh bộ 8 mã mới và mở modal tải file | ✅ `[E2E]` |
| SET-108 | Tắt 2FA (Disable 2FA) | Tài khoản đang bật 2FA | Bấm "Vô hiệu hóa 2FA", nhập mã OTP hoặc mật khẩu | Gọi DELETE `/api/v1/2fa` -> 2FA chuyển sang trạng thái "ĐANG TẮT" -> Toast thông báo an toàn | ✅ `[E2E]` |

---

## 3. Quản Lý Phiên Đăng Nhập & Thiết Bị (/settings/security > Tab Sessions)

> **Nguồn code:** `src/components/features/auth/settings/sessions-panel.tsx`
> **E2E tự động:** `scripts/test-step7-2-settings-security-e2e.py`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SET-201 | Render Danh sách các Phiên làm việc đang mở | Đã đăng nhập trên 2 thiết bị | Quan sát khối "Phiên làm việc & Thiết bị" | Hiển thị danh sách các phiên: Tên trình duyệt, Hệ điều hành, Địa chỉ IP, Thời điểm đăng nhập, Thời gian hoạt động cuối | ✅ `[E2E]` |
| SET-202 | Badge "Thiết bị này (Current)" | Phiên hiện tại đang dùng | Quan sát phiên đầu tiên | Hiển thị badge xanh lá `THIẾT BỊ NÀY`, không có nút thu hồi phiên chính mình | ✅ `[E2E]` |
| SET-203 | Thu hồi 1 phiên từ xa (Cần 2 lần bấm xác nhận) | Có phiên thứ 2 từ thiết bị khác | Bấm nút "Đăng xuất thiết bị" lần 1 -> Nút đổi sang "Xác nhận đăng xuất?" màu đỏ -> Bấm lần 2 | Gọi DELETE `/api/v1/sessions/:id` -> Phiên biến mất khỏi danh sách -> Thiết bị kia lập tức bị đá về `/login` | ✅ `[E2E]` |
| SET-204 | Đăng xuất khỏi tất cả các thiết bị khác | Có nhiều phiên làm việc | Bấm nút "Đăng xuất tất cả thiết bị khác" -> Xác nhận | Toàn bộ các phiên khác bị thu hồi sạch sẽ, chỉ giữ lại phiên hiện tại | ✅ `[E2E]` |

---

## 4. Liên Kết Tài Khoản Mạng Xã Hội (/settings/security > Tab Social)

> **Nguồn code:** `src/components/features/auth/settings/social-panel.tsx`
> **E2E tự động:** `scripts/test-step7-2-settings-security-e2e.py`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SET-301 | Render Trạng thái Liên kết Google | Tài khoản chưa liên kết Google | Quan sát khối "Liên kết Tài khoản" | Icon Google, trạng thái "Chưa liên kết", nút "Liên kết Google" | ✅ `[E2E]` |
| SET-302 | Bấm "Liên kết Google" sinh State Link | Bấm "Liên kết Google" | Click nút liên kết | Sinh state có tiền tố `link:UUID` lưu `sessionStorage["ppe.oauth.state"]`, điều hướng sang màn hình đăng nhập Google thật | ✅ `[E2E]` |
| SET-303 | Hoàn tất Liên kết từ Callback | Google xác thực thành công -> quay lại `/auth/callback` | Callback phát hiện tiền tố `link:` | Gọi API liên kết provider GOOGLE -> chuyển về `/settings/security` -> Trạng thái đổi sang badge xanh "ĐÃ LIÊN KẾT: email@gmail.com" | ✅ `[E2E]` |
| SET-304 | Chống Khóa Tự Hại: Chặn Hủy liên kết nếu không có Mật khẩu | Tài khoản tạo thuần bằng Google OAuth (chưa từng đặt mật khẩu nội bộ) | Bấm "Hủy liên kết Google" | Backend trả 400 Bad Request -> Hiển thị cảnh báo inline: "Không thể hủy liên kết Google vì bạn chưa thiết lập mật khẩu. Vui lòng đặt mật khẩu trước khi gỡ tài khoản duy nhất này." | ✅ `[E2E]` |
| SET-305 | Hủy liên kết Google thành công | Tài khoản đã có mật khẩu nội bộ | Bấm "Hủy liên kết" -> Xác nhận | Gỡ liên kết Google thành công, nút chuyển lại về "Liên kết Google" | ⬜ |

---

## 5. Đổi Mật Khẩu Chủ Động (/change-password & Tab Password)

> **Nguồn code:** `app/(auth)/change-password/page.tsx`, `src/components/features/auth/settings/password-panel.tsx`
> **E2E tự động:** `scripts/test-step7-2-change-password-e2e.py` (14/14 đạt)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SET-401 | Render Form Đổi Mật Khẩu | Mở `/change-password` | Quan sát form | Gồm: Mật khẩu hiện tại*, Mật khẩu mới*, Xác nhận mật khẩu mới*, Checklist 5 tiêu chuẩn mật khẩu realtime, Nút "Cập nhật mật khẩu" | ✅ `[E2E]` |
| SET-402 | Checklist độ mạnh mật khẩu realtime | Gõ từng ký tự vào ô mật khẩu mới | Gõ `Admin@123` | Cả 5 tiêu chí (Độ dài >= 8, Chữ hoa, Chữ thường, Chữ số, Ký tự đặc biệt) đổi từ xám sang xanh lá | ✅ `[E2E]` |
| SET-403 | Nhập Mật khẩu hiện tại sai (401) | Mật khẩu cũ không đúng | Nhập pass cũ sai, submit | Banner đỏ hiển thị: "Mật khẩu hiện tại không chính xác", form giữ nguyên các ô để nhập lại | ✅ `[E2E]` |
| SET-404 | Mật khẩu mới trùng với Mật khẩu cũ | Nhập pass mới giống hệt pass cũ | Submit form | Báo lỗi inline: "Mật khẩu mới không được trùng với mật khẩu hiện tại" | ⬜ |
| SET-405 | Xác nhận mật khẩu không khớp | Ô xác nhận gõ khác ô mới | Submit | Báo lỗi inline: "Mật khẩu xác nhận không khớp" | ✅ `[E2E]` |
| SET-406 | Đổi mật khẩu thành công (Happy Path) | Nhập pass cũ đúng + pass mới hợp lệ và khớp | Bấm "Cập nhật mật khẩu" | Gọi POST `/api/v1/auth/change-password` -> Toast thành công -> Toàn bộ phiên cũ bị thu hồi -> Điều hướng về `/login` yêu cầu đăng nhập lại bằng mật khẩu mới | ✅ `[E2E]` |

---

## 6. Vô Hiệu Hóa & Hủy Tài Khoản (/settings/security > Tab Deactivate)

> **Nguồn code:** `src/components/features/auth/settings/deactivate-panel.tsx`
> **E2E tự động:** `scripts/test-step7-2-settings-security-e2e.py`, `test-step7-2-deactivate-confirm-e2e.py`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SET-501 | Render Vùng Nguy Hiểm Vô hiệu hóa tài khoản | Kéo xuống cuối `/settings/security` | Quan sát khối Danger Zone | Khung viền đỏ gạch Neumorphic cảnh báo: "Vô hiệu hóa tài khoản", giải thích quyền lợi bị hủy bỏ, nút "Vô hiệu hóa tài khoản này" | ✅ `[E2E]` |
| SET-502 | Xác nhận Mật khẩu để bắt đầu quy trình hủy | Click nút vô hiệu hóa | Nhập mật khẩu hiện tại | Nếu pass sai -> báo lỗi 400; nếu pass đúng -> hệ thống gửi email xác nhận hủy tài khoản | ✅ `[E2E]` |
| SET-503 | Màn hình Kiểm tra Email xác nhận hủy | Gửi yêu cầu thành công | Quan sát giao diện | Hiển thị màn hình "Kiểm tra email của bạn để xác nhận vô hiệu hóa tài khoản" | ✅ `[E2E]` |
| SET-504 | Mở link xác nhận trong email (/deactivate-confirm) | Nhấp link từ email thật | Mở link có token hợp lệ | Trang `/deactivate-confirm` xác thực token: tài khoản bị khóa vĩnh viễn (`isActive=false`), toàn bộ session bị xóa sạch, điều hướng về `/login` | ✅ `[E2E]` |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-step7-2-settings-security-e2e.py`) | 33/33 đạt | Bao phủ toàn bộ 5 Panels: 2FA TOTP QR + backup codes, Active Sessions, Google Social Link/Anti-lockout, Password, Deactivate |
| 2026-10-21 | E2E (`scripts/test-step7-2-change-password-e2e.py`) | 14/14 đạt | Form đổi mật khẩu, checklist 5 tiêu chuẩn realtime, 401 pass cũ sai, đăng xuất phiên về login |
| 2026-10-28 | Profile & MinIO Avatar Integration | Đạt | Hoàn thiện trang Hồ sơ cá nhân `/settings/profile`, upload avatar lên `media-service` |
