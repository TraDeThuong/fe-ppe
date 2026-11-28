# Cụm Public Auth — các mục UI chờ quyết định

Nguồn: nhận xét rà soát 3 chiều cụm Public Auth (/login, /register, /2fa, /auth/callback,
/forgot-password, /reset-password, /verify-email, /verify-email/deactivate, /change-password).
Ngày ghi: 28/11/2026.

Phần logic, bảo mật và hiệu năng đã sửa ở FE, không đụng BE (xem mục "Đã sửa" cuối file).
Các mục dưới đây là thay đổi giao diện mà nhận xét yêu cầu. **Chưa làm** (hoặc mới làm ở mức
tối thiểu để vá logic), chờ bạn quyết định.

## Quyết định của user (28/11/2026)

- **A1: Làm.** Đã thêm ô "Xác nhận mật khẩu" (hoặc "Xác nhận mật khẩu mới") ngay dưới ô mật khẩu ở /register, /reset-password, /change-password. Dùng zod `.refine` để báo "Mật khẩu xác nhận không khớp." dưới ô xác nhận. Field này chỉ kiểm tra ở FE, không gửi lên BE.
- **A2: Làm.** Slogan bản vi-VN đã dịch theo câu gợi ý bên dưới. Bản en-US giữ nguyên.
- **A3: Giữ nguyên giao diện.** Không giảm tile, không bỏ animation. Chỉ giữ các tối ưu không đổi hình ảnh ở mục C.
- **A4: Làm ở mức FE làm được.** BE trả cùng mã và message cho hai trường hợp nên FE không tự phân biệt được. Vì vậy form gửi lại email không còn hiện sẵn: khung lỗi chỉ hiện message BE và một link "Chưa xác minh email? Gửi lại email xác minh". Bấm link thì mới hiện Turnstile và nút gửi lại. Người bị Admin khóa không còn thấy form bày sẵn. Muốn ẩn hẳn link với tài khoản bị khóa thì cần BE tách mã lỗi.

## A. Các mục đã nêu (giữ để tham chiếu)

| # | Màn hình | Nhận xét yêu cầu | Ghi chú / phương án |
|---|---|---|---|
| A1 | /register, /reset-password, /change-password | Thêm ô **Xác nhận mật khẩu** (confirmPassword) | Thêm 1 FormField `PasswordInput` dưới ô mật khẩu mới, kiểm tra trùng bằng zod `.refine`. Form dài thêm khoảng 70px. Cần chọn nhãn, chẳng hạn "Nhập lại mật khẩu" / "Confirm password". |
| A2 | AuthShell (panel ảnh bên trái, desktop) | Slogan đang là tiếng Anh cố định, cần qua i18n | **Đã chuyển sang key i18n** `authShell.eyebrow`, `headlineLine1`, `headlineLine2`, `description`, `tagline`. Bản vi-VN **tạm giữ nguyên chữ tiếng Anh** nên giao diện chưa đổi. Cần chốt câu tiếng Việt. Gợi ý: "Hệ thống an toàn thông minh" / "An toàn bắt đầu" / "từ sự chú ý." / "Giám sát trang bị bảo hộ, góp phần tạo môi trường thi công an toàn và thông minh hơn." / "Bảo vệ con người. Ngăn ngừa sự cố." |
| A3 | AuthShell (nền tile neumorphism) | Giảm tải NeumorphicTileWall (khoảng 120 tile, animation chạy liên tục) | Đã tối ưu mà không đổi hình ảnh (xem mục C). Nếu muốn giảm thêm thì phải đổi giao diện. Có 3 hướng: (a) giảm số tile từ 9×15 xuống khoảng 6×10, (b) bỏ animation `neumorphic-breathe` (độ sáng chỉ đổi 6% trong 40–90 giây, gần như không thấy), (c) thay cả lớp tile bằng 1 ảnh nền SVG/PNG tĩnh. |
| A4 | /login, khi gặp lỗi USER_INACTIVE | Đang luôn hiện form "Gửi lại email xác thực", kể cả khi tài khoản bị Admin khóa | **Chưa sửa được ở FE.** BE trả **cùng mã và cùng message** cho 2 trường hợp ("chưa kích hoạt hoặc đã bị vô hiệu hóa…"). Nếu FE tự ẩn form thì người chưa xác thực email cũng mất nút gửi lại. Cần BE tách mã (ví dụ `EMAIL_NOT_VERIFIED` và `USER_INACTIVE`) rồi FE mới ẩn hoặc hiện theo mã. Nếu muốn, có thể đổi câu chữ trong khung cho trung tính hơn, ví dụ "Nếu bạn chưa xác thực email, hãy gửi lại…". |

## B. Mục đã thêm ở mức tối thiểu để vá logic, cần duyệt nội dung và hình thức

| # | Màn hình | Đã làm | Cần duyệt |
|---|---|---|---|
| B1 | /verify-email/deactivate | Thêm **màn xác nhận** trước khi gọi `POST /auth/deactivate/confirm`, nhằm chống trình quét link email tự kích hoạt (lỗi HIGH). Dùng lại đúng khung card của các trạng thái sẵn có: icon cảnh báo, tiêu đề, mô tả, nút đỏ "Xác nhận vô hiệu hóa", nút viền "Hủy, giữ tài khoản" (về "/"). | Câu chữ (`deactivateConfirm.confirmTitle`, `confirmMessage`, `confirmAction`, `cancel`) và đích của nút Hủy. |
| B2 | /register khi Admin tắt đăng ký | Thay form bằng khung cảnh báo màu vàng (cùng kiểu với banner trong form). Footer "Đã có tài khoản? Đăng nhập" giữ nguyên. | Câu chữ (`register.disabledTitle`, `register.disabledMessage`). Có thể thêm nút "Về đăng nhập" nếu muốn. |
| B3 | /change-password | Lỗi `PASSWORD_UNCHANGED` (mật khẩu mới trùng mật khẩu cũ) hiện ngay dưới ô mật khẩu mới. | Câu chữ `changePassword.passwordUnchanged`. |
| B4 | Các form mật khẩu | Lỗi khi nhập quá 128 ký tự hiện dưới ô nhập. | Câu chữ `*.passwordTooLong`. |

## C. Đã sửa (không đổi giao diện)

- Xóa `?token=` (reset-password, verify-email, deactivate) và `?code=&state=…` (auth/callback) khỏi thanh địa chỉ bằng `history.replaceState` ngay sau khi đọc.
- `/verify-email` gọi `POST /auth/verify-email` (token trong body). BE đang chạy chưa có route này (404) nên FE tự gọi lại bằng GET. Khi BE được build lại theo develop thì chỉ còn POST.
- `getSafeNext()` → `sanitizeNextPath()` (src/lib/safe-redirect.ts): chặn `//`, `/\`, ký tự điều khiển, và kiểm tra cùng origin bằng `new URL`. `next` được giữ qua /2fa và Google OAuth bằng sessionStorage.
- Countdown /2fa tính theo `exp` thật của tempToken. F5 không còn reset về 05:00, và tự hết hạn ngay nếu token đã quá hạn.
- ChangePasswordForm chỉ coi là "Google-only" khi `400 BAD_REQUEST` có message nhắc tới Google. Các BAD_REQUEST khác hiện banner lỗi chung.
- `.max(128)` cho register, reset-password, change-password, khớp BE.
- AuthProvider: `GET /auth/me` trả 403 khi đang bị ép đổi mật khẩu thì giữ phiên. User tối thiểu được dựng từ claim access token để vào /change-password, không còn xóa cookie rồi đá về /login.
- AuthShell: ảnh lấy từ danh sách tĩnh (hết request 404), chỉ tải ảnh đang hiện và ảnh kế tiếp. Tile wall bị gỡ khỏi DOM trên mobile, bỏ `will-change` cho 120 tile, tile không còn nằm trong thứ tự Tab (trước đây có 120 tab stop trước form). Text header và aria-label chuyển sang i18n, chữ hiển thị giữ nguyên.
