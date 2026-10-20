# Test Case — Luồng Auth

> **Ngày lập:** 2026-10-20
> **Phạm vi:** Toàn bộ luồng xác thực frontend (login, register, verify, forgot/reset, 2FA, social, sessions, profile)
> **Quy tắc:** Mỗi giao diện hoàn thành → phải ghi test case vào file này (xem `.agent/rules/workflow.md` mục 4)

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò |
|---|---|---|
| `admin@ppe.local` | `Admin@123456` | Quản Trị Viên Hệ Thống (ADMIN) |
| `manager@ppe.local` | `Manager@123456` | Safety Manager |
| `officer@ppe.local` | `Officer@123456` | Safety Officer |
| `user@ppe.local` | `User@123456` | Site Worker (USER) |

**Tiền đề chạy test:** dev server :3000 + gateway :80 + Docker (postgres `ppe_postgres`, DB `ppe_identity_db`) đang chạy.

**Cảnh báo:** sai mật khẩu 5 lần liên tiếp → BE khóa tài khoản 15 phút. Khi test luồng sai mật khẩu, ưu tiên dùng `user@ppe.local`. Mở khóa nhanh:

```bash
docker exec ppe_postgres psql -U postgres -d ppe_identity_db -c \
"UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE email='user@ppe.local';"
```

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Trang /login

> **Nguồn code:** `app/(public)/login/page.tsx`, `src/components/features/auth/forms/login-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-login-e2e.py` (15/15 đạt) — các case được script bao phủ có ghi chú `[E2E]`

### 1.1 Render & Validation

| ID | Tiêu đề | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| LOGIN-001 | Render trang | Mở `http://localhost:3000/login` | Thấy AuthShell (nền gạch neumorphic), form có ô Email + Mật khẩu, link "Quên mật khẩu?" và "Đăng ký ngay" | ✅ `[E2E]` |
| LOGIN-002 | Bỏ trống 2 ô | Nhấn "Đăng nhập" khi để trống cả 2 ô | Lỗi inline dưới mỗi ô: "Vui lòng nhập email" + "Vui lòng nhập mật khẩu", không gọi API | ✅ `[E2E]` |
| LOGIN-003 | Email sai định dạng | Nhập `abc` vào ô email, password bất kỳ, submit | Lỗi inline "Email không hợp lệ." dưới ô email, không gọi API | ✅ `[E2E]` |
| LOGIN-004 | Đa ngôn ngữ | Đổi locale vi↔en | Toàn bộ chuỗi (title, label, placeholder, lỗi) đổi ngôn ngữ tức thì | ⬜ |
| LOGIN-005 | Dark/Light theme | Đổi theme, reload trang | Giao diện login ăn đúng theme, không flash trắng, F5 giữ lựa chọn | ⬜ |
| LOGIN-006 | Accessibility | Tab qua các phần tử, đọc bằng screen reader | Thứ tự focus hợp lý; banner lỗi có `role="alert"`; password có nút toggle hiện/ẩn | ⬜ |
| LOGIN-007 | Email chứa ký tự đặc biệt | Copy-paste email chứa full-width `＠` (U+FF20), chấm full-width `．`, ZWSP, ideographic space | Đăng nhập email + mật khẩu đúng | Email được chuẩn hóa về ASCII → login thành công, KHÔNG báo "Email không hợp lệ" *(bug đã fix 2026-10-20: browser không strip `＠` khỏi input type=email → zod reject)* | ✅ |

### 1.2 Luồng lỗi đăng nhập

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| LOGIN-101 | Sai mật khẩu (401) | Tài khoản `user@ppe.local` còn lượt thử | Nhập email đúng + password sai, submit | Banner đỏ trong form: "Email hoặc mật khẩu không chính xác" kèm số lần thử còn lại; ô password tự xóa để nhập lại; focus về ô password | ✅ `[E2E]` |
| LOGIN-102 | Tài khoản không tồn tại | Email chưa đăng ký (vd `ghost@ppe.local`) | Nhập email + password bất kỳ, submit | Banner 401 giống LOGIN-101 (không lộ email có tồn tại hay không) | ⬜ |
| LOGIN-103 | Khóa tài khoản (423) | Sai mật khẩu 5 lần liên tiếp (hoặc flip DB `locked_until`) | Đăng nhập khi tài khoản đang khóa | Banner vàng "tài khoản tạm khóa" + đếm ngược mm:ss giảm từng giây; nút "Đăng nhập" disable trong lúc đếm ngược | ✅ `[E2E]` |
| LOGIN-104 | Hết thời gian khóa | Đợi hết đếm ngược của LOGIN-103 | Đăng nhập lại với mật khẩu đúng | Vào được `/dashboard` | ⬜ |
| LOGIN-105 | Lệch phút đếm ngược | Flip `locked_until = now() + 5 phút` rồi đăng nhập | Đọc số phút trên banner | Khớp với thời gian thật còn lại trong DB. *(Lưu ý: từng nghi ngờ lệch múi giờ container UTC vs psql +07 làm message báo sai — nếu sai, ghi ❌ + mô tả vào cột này)* | ⬜ |
| LOGIN-106 | Tài khoản inactive (403) | Flip `is_active=false` (hoặc tài khoản chưa verify email) | Đăng nhập với mật khẩu đúng | Banner vàng "tài khoản chưa được kích hoạt" + nút "Gửi lại email xác minh"; không đăng nhập được | ✅ `[E2E]` |
| LOGIN-107 | Resend verify từ màn login | Tiếp LOGIN-106, Turnstile đã cấu hình site key | Nhấn "Gửi lại email xác minh", hoàn thành captcha | Toast thành công; nếu bấm lần 2 trong 60s → báo chờ (429) | ⬜ |
| LOGIN-108 | Resend bị từ chối captcha | Tiếp LOGIN-106, BE trả `CAPTCHA_INVALID`/`CAPTCHA_REQUIRED` | Nhấn gửi lại với captcha lỗi/thiếu | Widget Turnstile reset, yêu cầu tick lại | ⬜ |
| LOGIN-109 | Mất mạng | DevTools → Network → Offline, rồi submit | Đăng nhập khi offline | Chỉ toast "lỗi kết nối" toàn cục, KHÔNG banner đè trong form | ⬜ |
| LOGIN-110 | Lỗi 5xx | (Tắt identity-service tạm) rồi submit | Đăng nhập khi BE chết | Toast lỗi toàn cục từ interceptor, form vẫn giữ giá trị đã nhập | ⬜ |

### 1.3 Đăng nhập thành công

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| LOGIN-201 | Login thành công | — | Email + password đúng của `user@ppe.local`, submit | Redirect về `/dashboard`, nút hiện spinner "Đang đăng nhập..." khi pending | ✅ `[E2E]` |
| LOGIN-202 | Redirect theo `next` | — | Mở `/login?next=%2Fdashboard` rồi login | Về đúng `/dashboard` | ✅ `[E2E]` |
| LOGIN-203 | Chặn open-redirect | — | Mở `/login?next=//evil.com` rồi login | Về `/` (không đi ra domain ngoài) | ⬜ |
| LOGIN-204 | Đã login vào /login | Đã đăng nhập từ trước | F5 hoặc gõ lại `/login` | Tự redirect về `/dashboard` (proxy layer 1 + public layout) | ✅ `[E2E]` |
| LOGIN-205 | Giữ session khi reload | Đã login ở LOGIN-201 | Reload trang `/dashboard` | Vẫn ở `/dashboard` với user, không bị đá về login | ✅ `[E2E]` |
| LOGIN-206 | Nhánh 2FA | Tài khoản đã bật 2FA (cần settings — chưa làm) | Login đúng mật khẩu | Chuyển sang màn `/2fa` nhập mã; tempToken lưu `sessionStorage["ppe.tempToken"]` | ⬜ (chờ trang /2fa thật) |

### 1.4 Tương tác guard / logout

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| LOGIN-301 | Truy cập trang protected khi chưa login | Chưa đăng nhập | Gõ thẳng `/dashboard` | Redirect về `/login?next=%2Fdashboard`; sau khi login trả về đúng `/dashboard` | ✅ `[E2E]` |
| LOGIN-302 | Logout | Đã login | Logout từ giao diện | Về `/login`, truy cập lại `/dashboard` bị chặn (session đã xóa sạch, cache query đã clear) | ✅ `[E2E]` |
| LOGIN-303 | Session hết hạn giữa chừng | Đã login, chờ access + refresh token hết hạn | Thao tác tiếp trong app | Refresh single-flight chạy (chỉ 1 request `/auth/refresh`); nếu refresh fail → tự về `/login`, không vòng lặp bounce | ✅ `[E2E]` |

---

## 2. Trang /register

> **Nguồn code:** `app/(public)/register/page.tsx`, `src/components/features/auth/forms/register-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-register-e2e.py` (15/15 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Điều kiện captcha:** BE `TURNSTILE_ENABLED=true` + secret thật (smart-ppe-infra/.env). FE cần `NEXT_PUBLIC_TURNSTILE_SITE_KEY` trong `.env.local` — lấy tại Cloudflare Dashboard → Turnstile → site đã tạo → "Site Key" (dạng `0x4AAAAA...`), phải thêm hostname `localhost` vào Hostnames của site đó, sau đó **restart dev server**. Chưa có key → widget không render, mọi submit thật bị 400 `CAPTCHA_REQUIRED` (banner vàng). Test key dev (luôn pass): `1x00000000000000000000AA` — chỉ dùng kèm secret test tương ứng phía BE.

### 2.1 Render & Validation

| ID | Tiêu đề | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| REG-001 | Render trang | Mở `http://localhost:3000/register` | AuthShell + form gồm ô Họ và tên (không bắt buộc), Email*, Mật khẩu*, checklist 5 tiêu chí, nút "Tạo tài khoản", link "Đăng nhập" cho user đã có tài khoản | ✅ `[E2E]` |
| REG-002 | Bỏ trống 2 ô bắt buộc | Nhấn "Tạo tài khoản" khi để trống email + mật khẩu | Lỗi inline dưới mỗi ô: "Vui lòng nhập email" + "Vui lòng nhập mật khẩu", không gọi API | ✅ `[E2E]` |
| REG-003 | Email sai định dạng | Nhập `abc` vào ô email | Lỗi inline "Email không hợp lệ." dưới ô email, không gọi API | ✅ `[E2E]` |
| REG-004 | Mật khẩu không đủ policy | Nhập `abc` vào ô mật khẩu (email hợp lệ) | Lỗi inline "Mật khẩu chưa đáp ứng đủ các yêu cầu." | ✅ `[E2E]` |
| REG-005 | Họ tên là trường tùy chọn | Bỏ trống Họ tên, nhập đủ email + mật khẩu hợp lệ, submit | Không có lỗi field Họ tên; form submit bình thường | ✅ `[E2E]` |
| REG-006 | Đa ngôn ngữ | Đổi locale vi↔en | Toàn bộ chuỗi (title, label, checklist, lỗi, màn thành công) đổi ngôn ngữ tức thì | ⬜ |
| REG-007 | Dark/Light theme | Đổi theme, reload trang | Giao diện register ăn đúng theme, không flash trắng, F5 giữ lựa chọn | ⬜ |
| REG-008 | Accessibility | Tab qua các phần tử, đọc bằng screen reader | Thứ tự focus hợp lý; banner lỗi có `role="alert"`; checklist đọc được từng tiêu chí | ⬜ |
| REG-009 | Email chứa ký tự đặc biệt | Copy-paste email chứa full-width `＠`, chấm full-width, ZWSP | Submit form đăng ký | Email được chuẩn hóa về ASCII, không báo "Email không hợp lệ" (dùng chung `normalizeEmail` — `src/lib/email.ts`) | ✅ |

### 2.2 Checklist password realtime

| ID | Tiêu đề | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| REG-101 | Gõ từng phần | Gõ `A` vào ô mật khẩu | Chỉ tiêu chí "Có chữ hoa (A-Z)" chuyển xanh, 4 tiêu chí còn lại xám | ✅ `[E2E]` |
| REG-102 | Đủ 5 tiêu chí | Gõ `Abcdef1!` | Cả 5 tiêu chí chuyển xanh (độ dài, hoa, thường, số, đặc biệt) | ✅ `[E2E]` |
| REG-103 | Xóa ký tự | Gõ đủ `Abcdef1!` rồi xóa `!` và 1 ký tự nữa | Tiêu chí "đặc biệt" và "độ dài" trở về xám ngay lập tức (realtime 2 chiều) | ⬜ |
| REG-104 | Ký tự đặc biệt đa dạng | Thử lần lượt `!`, `@`, `#`, `$`, khoảng trắng | Mọi ký tự không phải chữ/số đều tính là "đặc biệt" (đúng regex BE `[^a-zA-Z0-9]`) | ⬜ |

### 2.3 Captcha & lỗi nghiệp vụ

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REG-201 | Widget captcha render | Đã cấu hình `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Mở trang, kéo xuống cuối form | Thấy ô Turnstile dưới checklist; nút "Tạo tài khoản" **disable** tới khi tick xong | ⬜ (E2E tự chuyển nhánh A khi có key) |
| REG-202 | Thiếu token captcha | Chưa cấu hình site key (môi trường hiện tại) | Nhập đủ thông tin hợp lệ, submit | Banner vàng "Vui lòng xác minh bạn không phải robot...", không tạo tài khoản, form giữ dữ liệu đã nhập | ✅ `[E2E]` |
| REG-203 | Token captcha hết hạn/sai | Đã có site key; chờ token hết hạn hoặc BE trả `CAPTCHA_INVALID` | Submit với token hết hạn | Banner vàng + widget Turnstile tự reset, yêu cầu tick lại | ⬜ |
| REG-204 | Lỗi 422 từ BE | — | Submit với payload lỗi field (vd mock 422) | Message lỗi gắn đúng dưới field tương ứng (email/password/fullName) | ✅ `[E2E]` |
| REG-205 | Mất mạng | DevTools → Network → Offline | Submit khi offline | Chỉ toast "lỗi kết nối" toàn cục, KHÔNG banner đè trong form | ⬜ |
| REG-206 | Lỗi 5xx | Tắt identity-service tạm | Submit khi BE chết | Toast lỗi toàn cục từ interceptor, form vẫn giữ giá trị đã nhập | ⬜ |
| REG-207 | Trạng thái pending | Mạng chậm (throttle) | Submit | Nút hiện spinner "Đang tạo tài khoản...", các ô input bị disable trong lúc chờ | ⬜ |

### 2.4 Đăng ký thành công & anti-enum

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REG-301 | Đăng ký thành công → màn check email | BE trả 201 | Submit với email + mật khẩu hợp lệ | Màn "Kiểm tra email của bạn" + nút "Về trang đăng nhập"; KHÔNG tự đăng nhập | ✅ `[E2E]` (mock 201) |
| REG-302 | Anti-enum — email ĐÃ tồn tại | — | Đăng ký với `admin@ppe.local` (đã tồn tại) | Phản hồi **giống hệt REG-301**, không có thông báo "email đã tồn tại" (BE register luôn 201 — graceful return) | ✅ `[E2E]` (mock 201 với email tồn tại) |
| REG-303 | Nút về trang đăng nhập | Đang ở màn check email | Nhấn "Về trang đăng nhập" | Chuyển về `/login` | ✅ `[E2E]` |
| REG-304 | Đăng ký THẬT qua BE | Đã có site key + tick captcha (hoặc tắt captcha) | Đăng ký email mới chưa tồn tại | Nhận email xác minh; DB `verification_tokens` có bản ghi mới; user mới có `is_active=false` | ⬜ |
| REG-305 | Tài khoản mới chưa kích hoạt | Tiếp REG-304 | Login bằng tài khoản vừa đăng ký | Banner "tài khoản chưa được kích hoạt" + nút "Gửi lại email xác minh"; chưa vào được app | ⬜ |
| REG-306 | Link xác minh trong email | Tiếp REG-304 | Mở link xác minh từ email | Trỏ về `/verify-email?token=...` — trang này chưa làm (hiện 404), sẽ test khi hoàn thành Bước 7.2 | ⬜ (chờ trang /verify-email) |

> **Dọn dẹp sau khi test đăng ký thật:** xóa user test đã tạo (nếu muốn):
> ```bash
> docker exec ppe_postgres psql -U postgres -d ppe_identity_db -c \
> "DELETE FROM verification_tokens WHERE user_id=(SELECT id FROM users WHERE email='<email-test>'); DELETE FROM users WHERE email='<email-test>';"
> ```

### 2.5 Tương tác guard

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REG-401 | Đã login mở /register | Đang đăng nhập | Gõ thẳng `/register` hoặc F5 | Tự redirect về `/dashboard` (proxy layer 1 + public layout — cơ chế chung đã kiểm thử ở Bước 7.1) | ⬜ |

---

## 3. Trang /verify-email — (chưa làm)

## 4. Trang /forgot-password

> **Nguồn code:** `app/(public)/forgot-password/page.tsx`, `src/components/features/auth/forms/forgot-password-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-forgot-password-e2e.py` (11/11 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Điều kiện captcha:** như trang /register (chung `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, action `forgot_password`). Chưa có key → widget không render, mọi submit thật bị 400 `CAPTCHA_REQUIRED` (banner vàng).
> **Anti-enum đặc biệt:** BE POST `/auth/forgot-password` **luôn 200** — email không tồn tại, email tồn tại, hay đang trong cooldown 60s đều trả cùng một message. Cooldown 60s phía BE là *graceful* (không 429, chỉ âm thầm không tạo token mới) — khác với resend-verification trả 429 `TOO_MANY_REQUESTS`.

### 4.1 Render & Validation

| ID | Tiêu đề | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| FGT-001 | Render trang | Mở `http://localhost:3000/forgot-password` | AuthShell + form gồm ô Email*, nút "Gửi link đặt lại mật khẩu", link "Đăng nhập" cho user nhớ mật khẩu | ✅ `[E2E]` |
| FGT-002 | Bỏ trống email | Nhấn submit khi để trống email | Lỗi inline "Vui lòng nhập email." dưới ô email, không gọi API | ✅ `[E2E]` |
| FGT-003 | Email sai định dạng | Nhập `abc` vào ô email | Lỗi inline "Email không hợp lệ." dưới ô email, không gọi API | ✅ `[E2E]` |
| FGT-004 | Đa ngôn ngữ | Đổi locale vi↔en | Toàn bộ chuỗi (title, label, lỗi, màn thành công) đổi ngôn ngữ tức thì | ⬜ |
| FGT-005 | Dark/Light theme | Đổi theme, reload trang | Giao diện ăn đúng theme, không flash trắng, F5 giữ lựa chọn | ⬜ |
| FGT-006 | Accessibility | Tab qua các phần tử, đọc bằng screen reader | Thứ tự focus hợp lý; banner lỗi có `role="alert"` | ⬜ |
| FGT-007 | Email chứa ký tự đặc biệt | Copy-paste email chứa full-width `＠`, chấm full-width, ZWSP | Submit form quên mật khẩu | Email được chuẩn hóa về ASCII, không báo "Email không hợp lệ" (dùng chung `normalizeEmail`) | ✅ |

### 4.2 Captcha & lỗi nghiệp vụ

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FGT-101 | Widget captcha render | Đã cấu hình `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Mở trang | Thấy ô Turnstile; nút submit **disable** tới khi tick xong | ⬜ (E2E tự chuyển nhánh A khi có key) |
| FGT-102 | Thiếu token captcha | Chưa cấu hình site key (môi trường hiện tại) | Nhập email hợp lệ, submit | Banner vàng "Vui lòng xác minh bạn không phải robot...", form giữ dữ liệu đã nhập | ✅ `[E2E]` |
| FGT-103 | Token captcha hết hạn/sai | Đã có site key; BE trả `CAPTCHA_INVALID` | Submit với token hết hạn | Banner vàng + widget Turnstile tự reset, yêu cầu tick lại | ⬜ |
| FGT-104 | Lỗi 422 từ BE | — | Submit với payload lỗi field (mock 422) | Message lỗi gắn đúng dưới field email | ✅ `[E2E]` |
| FGT-105 | Mất mạng | DevTools → Network → Offline | Submit khi offline | Chỉ toast "lỗi kết nối" toàn cục, KHÔNG banner đè trong form | ⬜ |
| FGT-106 | Lỗi 5xx | Tắt identity-service tạm | Submit khi BE chết | Toast lỗi toàn cục từ interceptor, form vẫn giữ giá trị đã nhập | ⬜ |
| FGT-107 | Trạng thái pending | Mạng chậm (throttle) | Submit | Nút hiện spinner "Đang gửi...", ô input bị disable trong lúc chờ | ⬜ |

### 4.3 Gửi thành công & anti-enum

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FGT-201 | Gửi thành công → màn check email | BE trả 200 | Submit với email hợp lệ | Màn "Kiểm tra email của bạn" + nút "Về trang đăng nhập" | ✅ `[E2E]` (mock 200) |
| FGT-202 | Anti-enum — email ĐÃ tồn tại | — | Gửi với `admin@ppe.local` (đã tồn tại) | Phản hồi **giống hệt FGT-201**, không có thông báo "đã tồn tại" (BE luôn 200) | ✅ `[E2E]` (mock 200 với email tồn tại) |
| FGT-203 | Nút về trang đăng nhập | Đang ở màn check email | Nhấn "Về trang đăng nhập" | Chuyển về `/login` | ✅ `[E2E]` |
| FGT-204 | Gửi THẬT qua BE | Đã có site key + tick captcha | Gửi với email đã tồn tại | Nhận email reset; DB `password_reset_tokens` có bản ghi mới (token, expiresAt ~60 phút) | ⬜ |
| FGT-205 | Cooldown 60s (BE graceful) | Tiếp FGT-204 | Gửi lại lần 2 trong 60s | FE vẫn nhận 200 giống hệt; DB **KHÔNG** có token mới (BE âm thầm bỏ qua — chống spam mailbox) | ⬜ |
| FGT-206 | Email không tồn tại | Tiếp FGT-204 | Gửi với email chưa từng đăng ký | FE vẫn nhận 200 giống hệt; DB không có gì thay đổi | ⬜ |

### 4.4 Tương tác guard

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FGT-301 | Đã login mở /forgot-password | Đang đăng nhập | Gõ thẳng `/forgot-password` hoặc F5 | Tự redirect về `/dashboard` (proxy layer 1 + public layout — cơ chế chung đã kiểm thử ở Bước 7.1) | ⬜ |

## 5. Trang /reset-password — (chưa làm)

## 6. Trang /2fa — (chưa làm)

## 7. Trang /settings/security — (chưa làm)

---

## Nhật ký test

| Ngày | Người test | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-20 | E2E (Playwright) | 15/15 đạt | `scripts/test-step7-2-login-e2e.py` — render, zod, 401, 423 đếm ngược, 403, next redirect |
| 2026-10-20 | E2E (Playwright) | 17/17 + 18/18 đạt | Regression guards & providers |
| 2026-10-20 | E2E (Playwright) | 15/15 đạt | `scripts/test-step7-2-register-e2e.py` — render, zod, checklist realtime, CAPTCHA_REQUIRED (BE thật), mock 422 map field, mock 201 màn check-email anti-enum |
| 2026-10-20 | E2E (Playwright) | 11/11 đạt | `scripts/test-step7-2-forgot-password-e2e.py` — render, zod, CAPTCHA_REQUIRED (BE thật), mock 422 map field, mock 200 màn check-email anti-enum. Regression login 15/15 vẫn đạt |
| 2026-10-20 | AI (browser test) | ✅ | Bug "nhập đúng admin@ppe.local vẫn báo Invalid email address": root cause full-width `＠` (U+FF20) browser không strip → zod reject. Fix `normalizeEmail` (`src/lib/email.ts`) áp dụng cho login/register/forgot — verify 3 form bằng browser thật |
