# Test Case — Luồng Auth

> **Ngày lập:** 2026-10-20 · **Cập nhật:** 2026-10-21
> **Phạm vi:** Toàn bộ luồng xác thực frontend (login, register, verify, forgot/reset, 2FA, đổi mật khẩu, social, sessions, hủy tài khoản)
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
| LOGIN-206 | Nhánh 2FA | Tài khoản đã bật 2FA (bật tại Cài đặt bảo mật — mục 7) | Login đúng mật khẩu | Chuyển sang màn `/2fa` nhập mã; tempToken lưu `sessionStorage["ppe.tempToken"]` | ✅ `[E2E]` — trang /2fa đã test đủ (mục 6); vòng đời tempToken THẬT (login → /2fa → mã TOTP) cần tài khoản 2FA — ⬜ thủ công |

### 1.4 Tương tác guard / logout

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| LOGIN-301 | Truy cập trang protected khi chưa login | Chưa đăng nhập | Gõ thẳng `/dashboard` | Redirect về `/login?next=%2Fdashboard`; sau khi login trả về đúng `/dashboard` | ✅ `[E2E]` |
| LOGIN-302 | Logout | Đã login | Logout từ giao diện | Về `/login`, truy cập lại `/dashboard` bị chặn (session đã xóa sạch, cache query đã clear) | ✅ `[E2E]` |
| LOGIN-303 | Session hết hạn giữa chừng | Đã login, chờ access + refresh token hết hạn | Thao tác tiếp trong app | Refresh single-flight chạy (chỉ 1 request `/auth/refresh`); nếu refresh fail → tự về `/login`, không vòng lặp bounce | ✅ `[E2E]` |

---

## 2. Trang /register

> **Nguồn code:** `app/(public)/register/page.tsx`, `src/components/features/auth/forms/register-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-register-e2e.py` (16/16 đạt — nhánh A: site key thật đã cấu hình) — các case được script bao phủ có ghi chú `[E2E]`
> **Điều kiện captcha:** BE `TURNSTILE_ENABLED=true` + secret thật (smart-ppe-identity-service/.env). FE đã có `NEXT_PUBLIC_TURNSTILE_SITE_KEY` thật trong `.env.local` (site key `0x4AAAA...` — bạn của user cung cấp 2026-10-20). **Còn cần verify thủ công:** tick captcha trên browser thật (headless bị Cloudflare chặn) + đảm bảo site Turnstile có hostname `localhost`. Chưa có key → widget không render, mọi submit thật bị 400 `CAPTCHA_REQUIRED` (banner vàng). Test key dev (luôn pass): `1x00000000000000000000AA` — chỉ dùng kèm secret test tương ứng phía BE.

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
| REG-201 | Widget captcha render | Đã cấu hình `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (môi trường hiện tại) | Mở trang, kéo xuống cuối form | Thấy ô Turnstile dưới checklist; nút "Tạo tài khoản" **disable** tới khi tick xong | ✅ `[E2E]` |
| REG-202 | Thiếu token captcha | Đã verify ở thời điểm chưa cấu hình site key (nhánh B cũ) | Nhập đủ thông tin hợp lệ, submit | Banner vàng "Vui lòng xác minh bạn không phải robot...", không tạo tài khoản, form giữ dữ liệu đã nhập. Khi có site key: nút submit bị gate (REG-201) nên không submit được | ✅ `[E2E]` |
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
| REG-306 | Link xác minh trong email | Tiếp REG-304 | Mở link xác minh từ email | Trỏ về `http://localhost:3000/verify-email?token=...` → màn xác minh thành công (trang đã hoàn thành — xem mục 3) | ⬜ |

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

## 3. Trang /verify-email

> **Nguồn code:** `app/(public)/verify-email/page.tsx`, `src/components/features/auth/forms/verify-email-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-verify-email-e2e.py` (16/16 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Link email:** notification-service build link `${APP_URL}/verify-email?token=...` (`APP_URL` trong `smart-ppe-notification-service/.env` — phải trỏ về FE, đã set `http://localhost:3000` 2026-10-21). Email cũ gửi trước fix có link `localhost:7777` (chết) — phải dùng link mới từ email gửi lại, hoặc tự ghép: `http://localhost:3000/verify-email?token=<token từ email cũ>`.
> **Cơ chế:** trang đọc `?token=` và tự gọi `GET /auth/verify-email` ngay khi mở (gọi đúng 1 lần — token dùng 1 lần, có guard chống StrictMode double-fire). Token hết hạn → panel nhập email + captcha gửi lại (resend).

### 3.1 Luồng xác minh

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| VFY-001 | Không có token | — | Mở `http://localhost:3000/verify-email` không kèm `?token=` | Màn "Link xác minh không hợp lệ" + nút về login | ✅ `[E2E]` |
| VFY-002 | Token hợp lệ | Có token thật từ email (hoặc mock 200) | Mở link từ email | Gọi verify ĐÚNG 1 lần → màn "Email đã được xác minh" + nút "Về trang đăng nhập" | ✅ `[E2E]` (mock) |
| VFY-003 | Token hết hạn | Token đã quá 24h (hoặc mock 400 TOKEN_EXPIRED) | Mở link | Màn "Link xác minh đã hết hạn" + ô nhập email + nút "Gửi lại email xác minh" | ✅ `[E2E]` (mock) |
| VFY-004 | Token đã dùng | Mở link lần 2 (hoặc mock 400 TOKEN_INVALID) | Mở link đã xác minh rồi | Màn "Link không hợp lệ" (không crash, không vòng lặp) | ✅ `[E2E]` (mock) |
| VFY-005 | Lỗi 5xx / mất mạng | Mock 500 hoặc offline | Mở link | Màn lỗi + nút "Thử lại" (thử lại → gọi verify lại); toast lỗi toàn cục từ interceptor | ✅ `[E2E]` (mock 500) |
| VFY-006 | Xác minh THẬT qua BE | Đăng ký tài khoản mới trước đó | Mở link thật từ email | DB: user `is_active=true`, bản ghi `verification_tokens` bị xóa; login được ngay | ⬜ |
| VFY-007 | Đa ngôn ngữ | Đổi locale vi↔en | Mở trang ở mọi trạng thái | Toàn bộ chuỗi đổi ngôn ngữ tức thì | ⬜ |
| VFY-008 | Đã login mở /verify-email | Đang đăng nhập | Gõ thẳng `/verify-email` | Tự redirect về `/dashboard` (cơ chế chung public layout) | ⬜ |

### 3.2 Gửi lại email xác minh (resend)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| VFY-101 | Resend thành công | Đang ở panel hết hạn (VFY-003) | Nhập email + tick captcha → "Gửi lại email xác minh" | Màn "Kiểm tra email của bạn" — KHÔNG tiết lộ email tồn tại hay chưa (BE luôn 200) | ✅ `[E2E]` (mock 200) |
| VFY-102 | Email sai định dạng | — | Nhập `abc` | Lỗi inline "Email không hợp lệ.", không gọi API | ✅ `[E2E]` |
| VFY-103 | 422 từ BE | — | Submit (mock 422) | Message lỗi gắn đúng dưới field email | ✅ `[E2E]` (mock) |
| VFY-104 | Widget captcha render + gate | Đã có site key (môi trường hiện tại) | Mở panel resend | Ô Turnstile render; nút submit disable tới khi tick xong | ✅ `[E2E]` |
| VFY-105 | Cooldown 60s | Gửi lần 2 trong 60s | Submit 2 lần liên tiếp | Lần 2 nhận 429 → toast toàn cục "thử lại sau", không banner đè | ⬜ |
| VFY-106 | Gửi lại THẬT qua BE | Tài khoản chưa kích hoạt | Resend bằng email thật | Nhận email mới với link `http://localhost:3000/verify-email?token=...` | ⬜ |

## 4. Trang /forgot-password

> **Nguồn code:** `app/(public)/forgot-password/page.tsx`, `src/components/features/auth/forms/forgot-password-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-forgot-password-e2e.py` (12/12 đạt — nhánh A: site key thật đã cấu hình) — các case được script bao phủ có ghi chú `[E2E]`
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
| FGT-101 | Widget captcha render | Đã cấu hình `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (môi trường hiện tại) | Mở trang | Thấy ô Turnstile; nút submit **disable** tới khi tick xong | ✅ `[E2E]` |
| FGT-102 | Thiếu token captcha | Đã verify ở thời điểm chưa cấu hình site key (nhánh B cũ) | Nhập email hợp lệ, submit | Banner vàng "Vui lòng xác minh bạn không phải robot...", form giữ dữ liệu đã nhập. Khi có site key: nút submit bị gate (FGT-101) nên không submit được | ✅ `[E2E]` |
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

## 5. Trang /reset-password

> **Nguồn code:** `app/(public)/reset-password/page.tsx`, `src/components/features/auth/forms/reset-password-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-reset-password-e2e.py` (17/17 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Không có captcha:** `resetPasswordSchema` (BE) không yêu cầu `turnstileToken` — token reset trong link email đã là yếu tố xác thực.
> **Điều kiện token:** Link email chứa `?token=` (UUID, hết hạn 60 phút). Thiếu token → màn "Liên kết không hợp lệ" ngay khi mount.
> **Thu hồi session:** Reset thành công → BE revoke TOÀN BỘ phiên trên mọi thiết bị; hook `useResetPassword` dọn `tokenStore` + `queryClient` + `setUser(null)`.

### 5.1 Render & trạng thái token

| ID | Tiêu đề | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| RST-001 | Mở không có token | Mở `http://localhost:3000/reset-password` | Màn "Liên kết không hợp lệ" + nút "Yêu cầu liên kết mới" + link "Về trang đăng nhập" | ✅ `[E2E]` |
| RST-002 | Mở có token | Mở `/reset-password?token=abc` | AuthShell + form ô Mật khẩu mới* + checklist 5 tiêu chí + nút "Đặt lại mật khẩu" | ✅ `[E2E]` |
| RST-003 | Nút yêu cầu liên kết mới | Đang ở màn liên kết không hợp lệ | Nhấn "Yêu cầu liên kết mới" | Chuyển về `/forgot-password` | ✅ `[E2E]` |
| RST-004 | Đa ngôn ngữ | Đổi locale vi↔en | Toàn bộ chuỗi (title, label, checklist, lỗi, màn thành công) đổi ngôn ngữ tức thì | ⬜ |
| RST-005 | Dark/Light theme | Đổi theme, reload trang | Giao diện ăn đúng theme, không flash trắng, F5 giữ lựa chọn | ⬜ |
| RST-006 | Accessibility | Tab qua các phần tử, đọc bằng screen reader | Thứ tự focus hợp lý; banner lỗi có `role="alert"` | ⬜ |

### 5.2 Validation client (zod)

| ID | Tiêu đề | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| RST-101 | Bỏ trống mật khẩu | Nhấn submit khi để trống | Lỗi inline "Vui lòng nhập mật khẩu mới." dưới ô, không gọi API | ✅ `[E2E]` |
| RST-102 | Mật khẩu yếu | Nhập `weak`, submit | Lỗi inline "Mật khẩu mới chưa đáp ứng đủ các yêu cầu.", không gọi API | ✅ `[E2E]` |
| RST-103 | Checklist realtime | Gõ từng ký tự mật khẩu | Tiêu chí đạt chuyển xanh theo đúng ký tự gõ (5 tiêu chí: 8+ ký tự, hoa, thường, số, đặc biệt) | ✅ `[E2E]` |

### 5.3 Lỗi nghiệp vụ

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| RST-201 | Token rác gửi BE thật | — | Submit với token không tồn tại | BE trả 400 `TOKEN_INVALID` → banner đỏ "liên kết không hợp lệ" + nút "Yêu cầu liên kết mới" | ✅ `[E2E]` |
| RST-202 | Token hết hạn | BE trả 400 `TOKEN_EXPIRED` (mock) | Submit với token hết hạn | Banner đỏ "Liên kết đặt lại mật khẩu đã hết hạn..." + nút yêu cầu liên kết mới | ✅ `[E2E]` |
| RST-203 | Lỗi 422 từ BE | — | Submit với payload lỗi field (mock 422) | Message lỗi gắn đúng dưới field `newPassword`, form giữ nguyên | ✅ `[E2E]` |
| RST-204 | Rate limit 429 | Đang trong cửa sổ rate limit của BE | Submit | Chỉ toast lỗi toàn cục từ interceptor, KHÔNG banner đè trong form | ⬜ |
| RST-205 | Mất mạng | DevTools → Network → Offline | Submit khi offline | Chỉ toast "lỗi kết nối" toàn cục, KHÔNG banner đè trong form | ⬜ |
| RST-206 | Lỗi 5xx | Tắt identity-service tạm | Submit khi BE chết | Toast lỗi toàn cục từ interceptor, form vẫn giữ giá trị đã nhập | ⬜ |
| RST-207 | Trạng thái pending | Mạng chậm (throttle) | Submit | Nút hiện spinner "Đang xử lý...", ô input bị disable trong lúc chờ | ⬜ |

### 5.4 Đặt lại thành công

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| RST-301 | Reset thành công → màn chúc mừng | BE trả 200 | Submit mật khẩu mới hợp lệ | Màn "Đặt lại mật khẩu thành công" + nút "Đăng nhập ngay" | ✅ `[E2E]` (mock 200) |
| RST-302 | Nút đăng nhập ngay | Đang ở màn thành công | Nhấn "Đăng nhập ngay" | Chuyển về `/login` | ✅ `[E2E]` |
| RST-303 | Session cũ bị thu hồi | Đã login ở thiết bị A, mở link reset ở thiết bị B | Reset thành công ở B | Thiết bị A bị đăng xuất (BE revoke toàn bộ session); hook dọn `tokenStore` + cache + `setUser(null)` — màn thành công không bị guard (public) đá đi | ⬜ |
| RST-304 | Reset THẬT qua BE | Lấy token từ DB `password_reset_tokens` | Submit với token thật | Mật khẩu cũ hết hiệu lực, login bằng mật khẩu mới thành công; token trong DB bị xóa | ⬜ |

### 5.5 Tương tác guard

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| RST-401 | Đã login mở /reset-password | Đang đăng nhập | Gõ thẳng `/reset-password` hoặc F5 | Tự redirect về `/dashboard` (proxy layer 1 + public layout — cơ chế chung đã kiểm thử ở Bước 7.1) | ⬜ |

## 6. Trang /2fa

> **Nguồn code:** `app/(public)/2fa/page.tsx`, `src/components/features/auth/forms/two-factor-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-two-factor-e2e.py` (16/16 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Cơ chế tempToken:** login với tài khoản bật 2FA → BE trả tempToken (JWT HS256, TTL 5 phút) → FE lưu `sessionStorage["ppe.tempToken"]` rồi chuyển `/2fa`. Guard của trang: không có tempToken → tự về `/login`. E2E không tự sinh được tempToken BE → nhánh "mã đúng" mock 200; tempToken rác gửi BE thật → 401 TOKEN_EXPIRED (an toàn, không đụng DB).
> **Test thủ công:** cần tài khoản đã bật 2FA (bật ở Cài đặt bảo mật — mục 7) để test vòng đời tempToken thật: login → `/2fa` → nhập mã TOTP thật → vào app.

### 6.1 Render & guard

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| 2FA-001 | Không tempToken | sessionStorage không có `ppe.tempToken` | Mở `/2fa` | Tự redirect về `/login` | ✅ `[E2E]` |
| 2FA-002 | Render form | Có tempToken | Mở `/2fa` | AuthShell + form 6 ô nhập mã, countdown mm:ss hiệu lực tempToken, nút chuyển "Dùng mã dự phòng" | ✅ `[E2E]` |
| 2FA-003 | Đếm ngược hết hạn | Chờ hết 5 phút (hoặc tempToken hết hạn) | Đợi countdown về 00:00 | Tự chuyển màn "phiên xác thực đã hết hạn" + nút "Đăng nhập lại" | ⬜ |
| 2FA-004 | Đã login mở /2fa | Đang đăng nhập | Gõ thẳng `/2fa` hoặc F5 | Proxy đá về `/` (2fa nằm trong public-auth prefixes — đã test ở Bước 7.1) | ✅ `[E2E]` |
| 2FA-005 | Đa ngôn ngữ | Đổi locale vi↔en | Mở trang ở mọi trạng thái | Toàn bộ chuỗi (title, lỗi, countdown, màn hết hạn) đổi ngôn ngữ tức thì | ⬜ |

### 6.2 Validation (zod)

| ID | Tiêu đề | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| 2FA-101 | Thiếu mã | Submit khi để trống 6 ô | Lỗi inline "Vui lòng nhập mã xác thực.", không gọi API | ✅ `[E2E]` |
| 2FA-102 | Mã chưa đủ 6 số | Nhập 2 số rồi submit | Lỗi inline "Mã xác thực phải gồm 6 chữ số", không gọi API | ✅ `[E2E]` |
| 2FA-103 | Tự nhảy ô / paste / backspace | Gõ từng số; paste 6 số vào ô đầu; backspace ở ô trống | Focus tự nhảy ô kế tiếp; paste dàn đều 6 ô; backspace lùi ô trước | ⬜ |
| 2FA-104 | Backup code sai định dạng | Chuyển mode backup, nhập `abc` | Lỗi inline định dạng XXXX-XXXX | ⬜ |

### 6.3 Lỗi nghiệp vụ & hết hạn

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| 2FA-201 | TempToken rác | — | Submit mã hợp lệ với tempToken không phải JWT BE | BE thật 401 TOKEN_EXPIRED → màn hết hạn + nút "Đăng nhập lại" | ✅ `[E2E]` (BE thật) |
| 2FA-202 | Nút Đăng nhập lại | Đang ở màn hết hạn | Nhấn "Đăng nhập lại" | Xóa tempToken khỏi sessionStorage → về `/login` | ✅ `[E2E]` |
| 2FA-203 | Sai mã (400 TWO_FACTOR_INVALID_CODE) | — | Submit mã sai (mock 400) | Message "Mã xác thực không chính xác. Vui lòng thử lại."; 6 ô tự xóa để nhập lại; tempToken ĐƯỢC GIỮ (không đá về login) | ✅ `[E2E]` (mock) |
| 2FA-204 | Mã TOTP hết hạn | Mã TOTP quá 30 giây | Submit mã hết hạn | BE trả TWO_FACTOR_INVALID_CODE — xử lý như 2FA-203 | ⬜ |
| 2FA-205 | Mất mạng | DevTools → Offline | Submit khi offline | Chỉ toast "lỗi kết nối" toàn cục, form giữ nguyên | ⬜ |
| 2FA-206 | Lỗi 5xx | Tắt identity-service tạm | Submit khi BE chết | Toast lỗi toàn cục từ interceptor, form giữ nguyên | ⬜ |

### 6.4 Thành công & backup code

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| 2FA-301 | Xác thực thành công | Mock 200 | Submit mã đúng | Lưu access/refresh token (cookie) + user → xóa tempToken → về `/dashboard` | ✅ `[E2E]` (mock) |
| 2FA-302 | Chuyển mode backup code | — | Nhấn "Dùng mã dự phòng" | Đổi thành ô nhập 1 dòng (autocomplete one-time-code) | ✅ `[E2E]` |
| 2FA-303 | Submit backup code | Nhập `abcd-1234` | Submit | Payload gửi lên uppercase hóa `ABCD-1234` kèm tempToken | ✅ `[E2E]` (bắt payload) |
| 2FA-304 | Backup code sai | Mock 400 TWO_FACTOR_INVALID_CODE | Submit backup sai | Message lỗi như 2FA-203, ô giữ để sửa lại | ⬜ |
| 2FA-305 | Vòng đời tempToken THẬT | Tài khoản đã bật 2FA | Login → `/2fa` → nhập mã TOTP từ app authenticator | Vào app, tempToken bị xóa, token thật lưu cookie | ⬜ (thủ công — cần tài khoản 2FA) |

---

## 7. Trang /settings/security

> **Nguồn code:** `app/(auth)/settings/security/page.tsx`, `src/components/features/auth/settings/*` (5 panel: two-factor, sessions, social, password, deactivate)
> **E2E tự động:** `scripts/test-step7-2-settings-security-e2e.py` (33/33 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Lưu ý test:** dữ liệu phiên/social lấy từ BE thật của admin (có NHIỀU phiên do các lần login test) → assert nhất quán logic, không assert số lượng cụ thể. Query `useSessions`/`useSocialAccounts` có `staleTime: 60s` → mock đăng ký giữa trang phải `page.reload()`. Mọi nhánh thành công (enable/regenerate/disable 2FA, unlink, đổi mật khẩu, gửi yêu cầu hủy) dùng MOCK — không đổi trạng thái admin thật. Nút "Liên kết Google" có thể không hiện nếu admin đã link Google (suite tự bỏ qua nhánh này).

### 7.1 Render & tabs

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SEC-001 | Render trang | Đã login | Mở `/settings/security` | Tiêu đề "Cài đặt bảo mật" + đủ 5 tab: Bảo mật 2 lớp, Phiên đăng nhập, Tài khoản liên kết, Mật khẩu, Vô hiệu hóa tài khoản; mặc định mở tab 2FA | ✅ `[E2E]` |
| SEC-002 | Chưa login | Chưa đăng nhập | Gõ thẳng `/settings/security` | Redirect `/login?next=%2Fsettings%2Fsecurity` (cơ chế proxy chung) | ⬜ |
| SEC-003 | Chuyển tab | — | Click lần lượt 5 tab | Panel tương ứng hiển thị đúng, không reload trang | ⬜ |

### 7.2 Tab 2FA (bảo mật 2 lớp)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SEC-101 | 2FA chưa bật | BE thật twoFactorEnabled=false | Mở tab 2FA | Card trạng thái "chưa bật" + nút bật 2FA | ✅ `[E2E]` (BE thật) |
| SEC-102 | Setup hiện QR + secret | Mock setup 200 | Nhấn bật 2FA | Panel nhập mã hiện ra + QR render từ otpauthUrl + secret để nhập thủ công | ✅ `[E2E]` (mock) |
| SEC-103 | Mã setup sai | Mock 400 TWO_FACTOR_INVALID_CODE | Nhập mã sai | Lỗi inline, panel setup giữ nguyên | ⬜ |
| SEC-104 | Enable → mã dự phòng | Mock enable 200 | Nhập mã đúng | Modal 8 mã dự phòng; nút "Hoàn tất" KHÓA tới khi tick "tôi đã lưu mã"; có nút tải file .txt; tick xong → Hoàn tất mở khóa → đóng modal | ✅ `[E2E]` (mock) |
| SEC-105 | 2FA đã bật | Mock me twoFactorEnabled=true | Mở tab 2FA | Card "đã bật" + nút tạo lại mã dự phòng + nút tắt 2FA | ✅ `[E2E]` (mock) |
| SEC-106 | Tạo lại mã dự phòng | Mock regenerate 200 | Nhấn tạo lại + nhập TOTP (mật khẩu tùy chọn — tài khoản Google-only không cần) | Modal mã dự phòng mới hiển thị | ✅ `[E2E]` (mock) |
| SEC-107 | Tắt 2FA | Mock disable 200 | Nhập mã TOTP 6 số HOẶC backup XXXX-XXXX + mật khẩu | Form đóng, card về trạng thái chưa bật | ✅ `[E2E]` (mock) |
| SEC-108 | Bật 2FA THẬT | Có app authenticator | Setup bằng QR thật | BE cập nhật twoFactorEnabled=true; login lần sau chuyển `/2fa` (mục 6) | ⬜ (thủ công) |

### 7.3 Tab Phiên đăng nhập

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SEC-201 | Danh sách phiên | BE thật | Mở tab | Bảng phiên; phiên hiện tại có badge "Phiên hiện tại" | ✅ `[E2E]` (BE thật) |
| SEC-202 | Nút thu hồi tất cả | BE thật | Nhìn danh sách | Nút "Thu hồi tất cả thiết bị khác" chỉ hiện khi có phiên khác ngoài phiên hiện tại (nhất quán với số dòng) | ✅ `[E2E]` (BE thật) |
| SEC-203 | Thu hồi 1 phiên | Mock 2 phiên | Bấm "Thu hồi" | Lần 1: nút đổi thành xác nhận; lần 2: gọi DELETE `/auth/sessions/:id` | ✅ `[E2E]` (mock) |
| SEC-204 | Thu hồi tất cả | Mock | Bấm "Thu hồi tất cả" (2 lần bấm) | Gọi DELETE `/auth/sessions` (không kèm id) | ✅ `[E2E]` (mock) |
| SEC-205 | Thu hồi THẬT | Đăng nhập từ 2 thiết bị | Thu hồi phiên kia | Thiết bị kia bị đăng xuất ở request kế tiếp | ⬜ (thủ công) |

### 7.4 Tab Tài khoản liên kết

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SEC-301 | Danh sách social | BE thật | Mở tab | Hiện trạng thái Google (đã/chưa liên kết) + cảnh báo anti-lockout | ✅ `[E2E]` (BE thật) |
| SEC-302 | Liên kết Google | Admin chưa link Google | Bấm "Liên kết Google" | Sinh state `link:...` lưu sessionStorage (chống CSRF) → redirect Google → callback link mode (mục 10) | ✅ `[E2E]` (state + link mode mock) |
| SEC-303 | Hủy liên kết + anti-lockout | Mock danh sách có Google | Bấm "Hủy liên kết" lần 1 → xác nhận lần 2 | Gọi DELETE `/auth/social/google`; BE trả 400 anti-lockout (đang là cách đăng nhập duy nhất) → cảnh báo inline, KHÔNG hủy | ✅ `[E2E]` (mock) |
| SEC-304 | Liên kết THẬT | BE đã cấu hình Google OAuth (2026-10-21) + email trong Test users | Liên kết + xác nhận trên Google | Danh sách hiện Google đã liên kết + ngày liên kết | ⬜ (thủ công — cần Test user) |

### 7.5 Tab Mật khẩu

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SEC-401 | Render form | — | Mở tab | Form đổi mật khẩu + checklist 5 tiêu chí (tái dùng change-password-form — mục 8) | ✅ `[E2E]` |
| SEC-402 | Sai mật khẩu cũ | BE thật | Submit với mật khẩu cũ sai | Banner "Mật khẩu hiện tại không chính xác." (i18n), ô cũ tự xóa | ✅ `[E2E]` (BE thật) |
| SEC-403 | Đổi thành công | Mock 200 | Submit đúng | Dọn session → về `/login` (chung form đã test ở mục 8) | ✅ `[E2E]` (mock — mục 8) |

### 7.6 Tab Vô hiệu hóa tài khoản

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SEC-501 | Render panel | — | Mở tab | Cảnh báo + ô mật khẩu + ô lý do (≤500 ký tự) + nút gửi yêu cầu | ✅ `[E2E]` |
| SEC-502 | Sai mật khẩu | BE thật | Gửi với mật khẩu SAI | Banner lỗi 400 INVALID_CREDENTIALS, không gửi email (an toàn khi test) | ✅ `[E2E]` (BE thật, mật khẩu sai) |
| SEC-503 | Gửi thành công | Mock 200 | Gửi với mật khẩu đúng | Màn hướng dẫn kiểm tra email xác nhận hủy | ✅ `[E2E]` (mock — KHÔNG gửi mật khẩu đúng lên BE thật) |
| SEC-504 | Tài khoản Google-only | Mock 400 VALIDATION_ERROR không có errors array | Gửi | Banner message từ BE (tài khoản Google không thể hủy theo cách này) | ⬜ |
| SEC-505 | Gửi THẬT | Tài khoản test riêng | Gửi với mật khẩu đúng | Nhận email link `/verify-email/deactivate` (mục 9) | ⬜ (thủ công — KHÔNG dùng admin) |

---

## 8. Trang /change-password

> **Nguồn code:** `app/(auth)/change-password/page.tsx`, `src/components/features/auth/forms/change-password-form.tsx`
> **E2E tự động:** `scripts/test-step7-2-change-password-e2e.py` (14/14 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Cơ chế:** trang thuộc nhóm (auth) — phải đăng nhập. Khi `mustChangePassword=true`, (auth) layout ép MỌI trang về đây (đã test ở Bước 7.1, script `test-step7-1-e2e.py` bước 11). Form được tái dùng trong tab Mật khẩu của Cài đặt bảo mật (mục 7). **Endpoint thật: PUT `/auth/password`** (mock phải dùng đúng pattern này).

### 8.1 Render & validation

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CHP-001 | Render form | Đã login | Mở `/change-password` | Ô mật khẩu hiện tại (autocomplete current-password) + ô mật khẩu mới + checklist 5 tiêu chí | ✅ `[E2E]` |
| CHP-002 | Thiếu mật khẩu cũ | — | Submit trống | Lỗi inline dưới ô cũ, không gọi API | ✅ `[E2E]` |
| CHP-003 | Thiếu mật khẩu mới | — | Submit trống | Lỗi inline dưới ô mới, không gọi API | ✅ `[E2E]` |
| CHP-004 | Mật khẩu yếu | Nhập `weak` | Submit | Lỗi inline policy ("chưa đáp ứng đủ các yêu cầu"), không gọi API | ✅ `[E2E]` |
| CHP-005 | Checklist realtime | Gõ `Aa1` → `NewPass1!` | — | 3/5 tiêu chí → 5/5 đúng theo ký tự gõ (realtime 2 chiều) | ✅ `[E2E]` |

### 8.2 Lỗi nghiệp vụ

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CHP-101 | Sai mật khẩu cũ | BE thật | Submit với mật khẩu cũ sai | Banner "Mật khẩu hiện tại không chính xác." (FE map từ 401 INVALID_CREDENTIALS — BE trả tiếng Anh); ô cũ tự xóa + focus lại | ✅ `[E2E]` (BE thật) |
| CHP-102 | 422 | Mock 422 | Submit payload lỗi field | Message gắn dưới field `newPassword`, form giữ nguyên | ✅ `[E2E]` (mock) |
| CHP-103 | Tài khoản Google-only | Mock 400 BAD_REQUEST | Submit | Banner hướng dẫn tài khoản Google không đổi mật khẩu ở đây + nút chuyển quên mật khẩu | ✅ `[E2E]` (mock) |
| CHP-104 | Nút chuyển quên mật khẩu | Tiếp CHP-103 | Nhấn nút | Logout sạch → chuyển `/forgot-password` (hard navigation — không bị guard (public) đá về login) | ✅ `[E2E]` |
| CHP-105 | Mất mạng / 5xx | Offline hoặc BE chết | Submit | Chỉ toast lỗi toàn cục từ interceptor, form giữ giá trị | ⬜ |

### 8.3 Thành công

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CHP-201 | Đổi thành công | Mock 200 | Submit mật khẩu hợp lệ | Dọn tokenStore + query cache + user → về `/login`, yêu cầu đăng nhập lại | ✅ `[E2E]` (mock) |
| CHP-202 | Đổi THẬT | Tài khoản test riêng | Submit mật khẩu đúng | BE đổi mật khẩu + revoke session; login bằng mật khẩu mới thành công | ⬜ (KHÔNG đổi mật khẩu admin khi test — mock thay thế) |

---

## 9. Trang /verify-email/deactivate (xác nhận hủy tài khoản)

> **Nguồn code:** `app/(public)/verify-email/deactivate/page.tsx`
> **E2E tự động:** `scripts/test-step7-2-deactivate-confirm-e2e.py` (10/10 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Cơ chế:** link email hủy tài khoản `${APP_URL}/verify-email/deactivate?token=...`. Trang đọc token từ URL trong useEffect và gọi POST `/auth/deactivate/confirm` ĐÚNG 1 LẦN (guard chống StrictMode double-fire — token dùng 1 lần). **AN TOÀN:** không gửi token hợp lệ lên BE thật (sẽ vô hiệu hóa admin thật) — nhánh thành công dùng mock 200; token rác lên BE thật → 400 TOKEN_INVALID (an toàn).
> **Ngoại lệ guard 2 lớp:** trang thuộc nhóm (public) nhưng user ĐANG đăng nhập khi bấm link email — proxy.ts + (public) layout có ngoại lệ `DEACTIVATE_CONFIRM_PREFIX` không đá về "/".

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DEA-001 | Thiếu token | — | Mở `/verify-email/deactivate` | Màn "Liên kết không hợp lệ" + nút "Về trang đăng nhập" | ✅ `[E2E]` |
| DEA-002 | Token rác | — | Mở với token không tồn tại | BE thật 400 TOKEN_INVALID → màn liên kết không hợp lệ | ✅ `[E2E]` (BE thật) |
| DEA-003 | Confirm đúng 1 lần | Tiếp DEA-002 | Đếm request POST `/auth/deactivate/confirm` | Đúng 1 request (không double-fire StrictMode) | ✅ `[E2E]` |
| DEA-004 | Token hết hạn | Mock 400 TOKEN_EXPIRED | Mở link hết hạn | Màn liên kết không hợp lệ | ✅ `[E2E]` (mock) |
| DEA-005 | Lỗi 5xx → Thử lại | Mock 500 | Mở link | Màn lỗi + nút "Thử lại" | ✅ `[E2E]` (mock) |
| DEA-006 | Thử lại thành công | Tiếp DEA-005, mock 200 | Nhấn "Thử lại" | Gọi confirm lại → màn "Tài khoản đã được vô hiệu hóa" | ✅ `[E2E]` (mock) |
| DEA-007 | Nút về đăng nhập | Ở màn tạm biệt | Nhấn "Về trang đăng nhập" | Về `/login` | ✅ `[E2E]` |
| DEA-008 | Đang đăng nhập bấm link | Đã login | Mở link email | KHÔNG bị guard đá về "/" — màn confirm hiển thị bình thường | ✅ `[E2E]` |
| DEA-009 | Hủy THẬT | Tài khoản test riêng | Bấm link thật từ email | BE vô hiệu hóa tài khoản (`is_active=false`), login không được nữa | ⬜ (thủ công — KHÔNG dùng admin) |

---

## 10. Trang /auth/callback (Google OAuth)

> **Nguồn code:** `app/(public)/auth/callback/page.tsx`, hooks `useGoogleLogin`/`useLinkSocial` (Bước 6), `src/lib/oauth.ts`
> **E2E tự động:** `scripts/test-step7-3-google-callback-e2e.py` (21/21 đạt) — các case được script bao phủ có ghi chú `[E2E]`
> **Cơ chế:** 2 mode theo state — state thường (UUID) = đăng nhập bằng Google, `link:` = liên kết Google (đến từ Cài đặt bảo mật — mục 7). State chống CSRF lưu sessionStorage, dùng 1 lần rồi xóa. Google trả kết quả qua `?code=` / `?error=`. **Ngoại lệ guard:** proxy + (public) layout cho phép user đang đăng nhập vào `/auth/callback` (link flow) — bug hệ thống đã fix 2026-10-21.
> **Điều kiện BE (đã cấu hình 2026-10-21):** `smart-ppe-identity-service/.env` có `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_OAUTH_ALLOWED_REDIRECT_URIS="http://localhost:3000/auth/callback"`. Sau khi sửa `.env` phải `docker compose up -d identity-service` — **`docker restart` KHÔNG nạp lại env_file**.
> **Điều kiện thủ công (Google Cloud Console):** OAuth app đang ở chế độ **Testing** → email Google muốn đăng nhập PHẢI nằm trong danh sách **Test users** của consent screen (việc của người quản lý Google Cloud). Chưa thêm → Google chặn với trang "Access blocked: … has not completed the Google verification process".

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CBK-001 | Nút Google trên login | — | Mở `/login` | Hiện nút "Đăng nhập bằng Google" (gate flag `feature.social_login.enabled`, render sau hydrate) | ✅ `[E2E]` |
| CBK-002 | Click nút → URL Google THẬT | BE đã cấu hình Google OAuth | Click nút Google | Sinh state lưu sessionStorage (`ppe.oauth.state`) → điều hướng sang `accounts.google.com` với `client_id` đúng, `response_type=code`, `scope=openid email profile`, `redirect_uri=http://localhost:3000/auth/callback`, `state` trên URL khớp state đã lưu | ✅ `[E2E]` |
| CBK-003 | Callback không tham số | — | Mở `/auth/callback` trực tiếp | Lỗi chung "Đã xảy ra lỗi trong quá trình đăng nhập bằng Google" + nút "Về trang đăng nhập" | ✅ `[E2E]` |
| CBK-004 | Google từ chối | Mock `?error=access_denied` | Về callback với error | Thông báo "đã hủy đăng nhập" | ✅ `[E2E]` |
| CBK-005 | State không khớp (CSRF) | Mock code với state sai | Về callback | Nghi CSRF → lỗi chung, KHÔNG gọi API đổi code | ✅ `[E2E]` |
| CBK-006 | State khớp + code giả | Mock state + code | Về callback | Gọi POST `/auth/google`; BE đổi code với Google thật → `invalid_grant` → lỗi hiển thị inline; state bị xóa sau 1 lần dùng (chống replay) | ✅ `[E2E]` |
| CBK-007 | Nút về login | Đang ở màn lỗi login mode | Nhấn "Về trang đăng nhập" | Về `/login` | ✅ `[E2E]` |
| CBK-008 | Link mode | Đang login, state `link:` + mock link 200 | Về callback | Gọi link API (provider GOOGLE + code) → chuyển `/settings/security`; state bị xóa sau 1 lần dùng | ✅ `[E2E]` (mock) |
| CBK-009 | Link lỗi | Mock link API lỗi | Về callback | Message BE inline + nút "Về cài đặt bảo mật" (KHÔNG phải về login) | ✅ `[E2E]` (mock) |
| CBK-010 | Nút về cài đặt bảo mật | Tiếp CBK-009 | Nhấn nút | Về `/settings/security` | ✅ `[E2E]` |
| CBK-011 | Login Google THẬT lần đầu | Email Google nằm trong Test users; email chưa tồn tại trong hệ thống | Click nút → chọn tài khoản → đồng ý | Về `/dashboard` đã đăng nhập; DB `users` có bản ghi mới (provider google); Settings > Security > Social hiển thị Google đã liên kết | ⬜ (thủ công — cần Test user) |
| CBK-012 | Email không nằm trong Test users | Email Google KHÔNG trong danh sách Test users | Chọn tài khoản trên màn Google | Google chặn: "Access blocked … has not completed the Google verification process" — KHÔNG về được callback | ⬜ (thủ công) |
| CBK-013 | Login Google lần sau | Email Google đã đăng nhập 1 lần | Lặp lại luồng | Về `/dashboard`, KHÔNG tạo user mới (tái dùng bản ghi cũ) | ⬜ (thủ công) |
| CBK-014 | Nhánh 2FA khi login Google | User Google đã bật 2FA | Login Google thành công | Chuyển `/2fa` nhập mã; tempToken lưu `sessionStorage["ppe.tempToken"]` | ⬜ (thủ công) |

---

## Nhật ký test

| Ngày | Người test | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-20 | E2E (Playwright) | 15/15 đạt | `scripts/test-step7-2-login-e2e.py` — render, zod, 401, 423 đếm ngược, 403, next redirect |
| 2026-10-20 | E2E (Playwright) | 17/17 + 18/18 đạt | Regression guards & providers |
| 2026-10-20 | E2E (Playwright) | 15/15 đạt | `scripts/test-step7-2-register-e2e.py` — render, zod, checklist realtime, CAPTCHA_REQUIRED (BE thật), mock 422 map field, mock 201 màn check-email anti-enum |
| 2026-10-20 | E2E (Playwright) | 11/11 đạt | `scripts/test-step7-2-forgot-password-e2e.py` — render, zod, CAPTCHA_REQUIRED (BE thật), mock 422 map field, mock 200 màn check-email anti-enum. Regression login 15/15 vẫn đạt |
| 2026-10-20 | E2E (Playwright) | 16/16 + 12/12 đạt | Kích hoạt site key THẬT (0x4AAAA...): register & forgot-password E2E chuyển nhánh A — widget render trong shadow DOM (nhận diện qua challenge frame), nút submit bị gate khi chưa tick; submit qua `requestSubmit()` cho test mock; filter nhiễu console nội bộ của widget (CSP `data:,` + `font-size:0`). Regression login 15/15, step7-1 17/17, step3 18/18. BE verify: token rác → `CAPTCHA_INVALID` (secret thật hoạt động, siteverify gọi Cloudflare OK). Tick captcha thật trong headless bị Cloudflare chặn → để test thủ công |
| 2026-10-20 | AI (browser test) | ✅ | Bug "nhập đúng admin@ppe.local vẫn báo Invalid email address": root cause full-width `＠` (U+FF20) browser không strip → zod reject. Fix `normalizeEmail` (`src/lib/email.ts`) áp dụng cho login/register/forgot — verify 3 form bằng browser thật |
| 2026-10-21 | E2E (Playwright) | 17/17 đạt | `scripts/test-step7-2-reset-password-e2e.py` — render, màn link không hợp lệ (thiếu token), zod, checklist realtime, TOKEN_INVALID (BE thật), TOKEN_EXPIRED/422/200 (mock). Regression forgot 12/12, register 16/16, step7-1 17/17, step3 18/18 |
| 2026-10-21 | E2E (Playwright) | 16/16 đạt | `scripts/test-step7-2-verify-email-e2e.py` — thiếu token, mock 200/TOKEN_EXPIRED/TOKEN_INVALID/500+retry, resend mock 200 (anti-enum) + 422 map field, widget gate, verify gọi đúng 1 lần (chống StrictMode double-fire), filter hydration mismatch (đọc token trong effect sau hydrate) |
| 2026-10-21 | Fix BE | ✅ | Register 500 "column type does not exist": schema Prisma thêm cột `type` cho `verification_tokens` nhưng chưa migrate → chạy `prisma migrate dev --name add_verification_token_type` (kèm drift cũ: drop 4 bảng tàn dư notification trong identity DB). Link email trỏ `localhost:7777` (default notification-service) → set `APP_URL=http://localhost:3000` + đổi path link thành trang FE `/verify-email`, `/reset-password` (mail.config.ts), rebuild container notification_service |
| 2026-10-21 | E2E (Playwright) | 16/16 đạt | `scripts/test-step7-2-two-factor-e2e.py` — guard tempToken, render 6 ô + countdown mm:ss, zod (thiếu mã/6 số), 401 TOKEN_EXPIRED (BE thật) → màn hết hạn, nút Đăng nhập lại xóa tempToken, 400 sai mã (mock) giữ tempToken + xóa 6 ô, mock 200 → dashboard, backup code uppercase XXXX-XXXX |
| 2026-10-21 | E2E (Playwright) | 14/14 đạt | `scripts/test-step7-2-change-password-e2e.py` — render + checklist realtime, zod, 401 INVALID_CREDENTIALS (BE thật) → banner i18n tiếng Việt, 422 map field, Google-only 400 BAD_REQUEST → logout → /forgot-password (hard nav), mock 200 → dọn session → /login |
| 2026-10-21 | E2E (Playwright) | 33/33 đạt | `scripts/test-step7-2-settings-security-e2e.py` — 5 tab; 2FA setup QR/secret, enable → modal mã dự phòng (gate checkbox + tải .txt), regenerate, disable; sessions (badge isCurrent, thu hồi 1/tất cả — 2 lần bấm); social (link state, 400 anti-lockout inline); password (401 BE thật); deactivate (400 INVALID_CREDENTIALS BE thật + mock 200 màn check email) |
| 2026-10-21 | E2E (Playwright) | 10/10 đạt | `scripts/test-step7-2-deactivate-confirm-e2e.py` — thiếu token, TOKEN_INVALID (BE thật), confirm đúng 1 request (chống StrictMode), TOKEN_EXPIRED/500→Thử lại→200 (mock), user đang đăng nhập bấm link email không bị bounce |
| 2026-10-21 | E2E (Playwright) | 17/17 đạt | `scripts/test-step7-3-google-callback-e2e.py` — nâng cấp lên 17 bước: thêm link mode (state `link:` + mock link 200 → /settings/security; link lỗi → inline + nút về cài đặt bảo mật). Fix bug hệ thống: /auth/callback trong public-auth prefixes làm user đang đăng nhập bị đá về "/" → ngoại lệ proxy + (public) layout |
| 2026-10-21 | Hồi quy toàn bộ | 14/14 suite xanh | Tất cả suite E2E auth (login, register, forgot, reset, verify-email, two-factor, change-password, settings-security, deactivate-confirm, google-callback, guards Bước 7.1, providers Bước 3, prefetch Bước 8, email-normalize) — sau 2 lần `docker restart identity_service` (rate limit in-memory 30 req/15 phút) |
| 2026-10-21 | AI (cấu hình BE) | ✅ | **Cấu hình Google OAuth phía BE:** thêm `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_OAUTH_ALLOWED_REDIRECT_URIS` vào `smart-ppe-identity-service/.env` (credentials từ Google Cloud Console). Lưu ý `docker restart` KHÔNG nạp env_file → phải `docker compose up -d identity-service`. Verify curl: `/auth/google/url` trả URL Google thật; redirectUri ngoài allowlist bị từ chối VALIDATION_ERROR (chống open redirect) |
| 2026-10-21 | E2E (Playwright) | 21/21 đạt | `scripts/test-step7-3-google-callback-e2e.py` nâng cấp (BE đã cấu hình): click nút → điều hướng accounts.google.com THẬT (client_id/redirect_uri/scope đúng, state trên URL khớp sessionStorage); code giả → BE đổi code với Google thật → invalid_grant hiển thị inline. Các case CBK-* cập nhật theo hiện trạng mới |
