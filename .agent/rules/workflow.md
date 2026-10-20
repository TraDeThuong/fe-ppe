# Quy trình Làm việc & Phân chia Hợp tác — fe-ppe

> **Mục đích:** Quy định quy trình phát triển, phân chia trách nhiệm giữa User và AI Agent, vận hành môi trường 2 server và tiêu chuẩn kiểm thử trước khi bàn giao.

---

## 1. Môi trường Hai Server Song Song (Dual-Server Setup)

Dự án duy trì hai ứng dụng Next.js độc lập để tách bạch giữa ứng dụng thực tế và thư viện giao diện:

- **Lệnh chạy song song:**
  ```bash
  npm run dev
  ```
  Script `scripts/dev.mjs` sẽ khởi động đồng thời cả 2 port:
  - **Port 3000:** App chính (`http://localhost:3000`).
  - **Port 3001:** Design System (`http://localhost:3001`).
- **Lệnh chạy riêng lẻ:**
  - `npm run dev:app`: Chỉ chạy ứng dụng chính (port 3000).
  - `npm run dev:design-system`: Chỉ chạy trang Design System (port 3001).

---

## 2. Phân công Trách nhiệm giữa User & AI Agent

Để đạt hiệu quả cộng tác cao nhất trong Pair Programming:

| Vai trò | Phạm vi trách nhiệm |
|---|---|
| **User (Bạn)** | - Trực tiếp sáng tạo thẩm mỹ, ý tưởng thị giác và bố cục.<br>- Tự do tinh chỉnh lớp bóng Neumorphism (`shadow`), độ bo tròn góc (`rounded`), màu sắc điểm nhấn (`accent`).<br>- Viết và cấu trúc các component UI nhỏ (`.tsx`). |
| **AI Agent** | - Chuẩn hóa TypeScript types, props interface kế thừa chuẩn HTML.<br>- Ghép nối các component nhỏ vào `FormField`, `FormSection`, `FormActions`.<br>- Xây dựng trang showcase tương tác trên Design System (port 3001).<br>- Đấu nối sự kiện bàn phím, chuẩn Accessibility (a11y) và sửa lỗi phát sinh.<br>- Chạy kiểm thử tự động trên trình duyệt thật (browser subagent) trước khi hoàn tất. |

---

## 3. Quy trình Thêm Mới / Nâng cấp Component UI

Khi bắt đầu xây dựng một component UI mới, luôn tuân thủ quy trình 5 bước:

1. **Khởi tạo Component:**
   - Đặt file trong `src/components/ui/{category}/{name}.tsx`.
   - Đảm bảo hỗ trợ đầy đủ 6 trạng thái cơ bản: `default`, `hover`, `focus`, `error`, `disabled`, `readOnly`.
   - Hỗ trợ đổi theme linh hoạt (`data-theme="dark"` / `data-theme="light"`).
2. **Barrel Export:**
   - Cập nhật file `index.ts` trong thư mục nhóm và `src/components/ui/{category}/index.ts`.
3. **Dựng Trang Showcase trên Design System (`localhost:3001`):**
   - Tạo trang tại `design-system/app/components/{name}/page.tsx`.
   - Cung cấp ít nhất 2 khu vực:
     - **Interactive Playground:** Có các nút bấm, input, switch để người dùng click thử nghiệm trực tiếp.
     - **Static Preview Matrix:** Bảng các kích thước và trạng thái cố định để review thẩm mỹ chi tiết.
4. **Cập nhật Điều hướng:**
   - Thêm đường dẫn vào menu bên trái: `design-system/app/side-nav.tsx`.
   - Thêm thẻ giới thiệu vào danh sách: `design-system/app/components/page.tsx`.
5. **Kiểm thử Trình duyệt (Browser Verification):**
   - Dùng curl kiểm tra mã HTTP 200.
   - Dùng browser subagent kiểm tra trực quan, bấm thử các nút tương tác và xác nhận không có lỗi console.

---

## 4. Quy trình Ghi Test Case (bắt buộc)

**Quy tắc: bất kỳ giao diện nào hoàn thành (trang, màn hình, component feature lớn) → bắt buộc ghi test case vào `docs/test-cases/` trong cùng phiên làm việc, không chờ cuối dự án.**

1. **Nơi lưu:** `docs/test-cases/{domain}.md` — 1 file theo domain/luồng (vd `auth.md` cho toàn bộ luồng xác thực). Chưa có file thì tạo mới theo format của `auth.md`.
2. **Nội dung tối thiểu mỗi test case:**
   - `ID` (tiền tố domain + số, vd `LOGIN-101`) — đánh số ổn định, không đổi khi thêm case mới.
   - Tiêu đề + các bước thực hiện + kết quả mong đợi cụ thể (không ghi chung chung "hoạt động đúng").
   - Điều kiện/trạng thái đặc biệt (flip DB, tài khoản seed, env cần cấu hình).
   - Cột Trạng thái: `✅` đã kiểm thử đạt · `⬜` chưa test thủ công · `❌` đang lỗi (kèm mô tả lỗi).
3. **Tài khoản test:** dùng seed user của identity-service (`admin@ppe.local`, `manager@ppe.local`, `officer@ppe.local`, `user@ppe.local` — mật khẩu xem `docs/test-cases/auth.md`). Không tạo user mới nếu seed đã đủ.
4. **Ghi chú rủi ro:** case nào có tác dụng phụ lên dữ liệu thật (khóa tài khoản sau 5 lần sai, revoke session...) phải ghi cảnh báo + lệnh khôi phục (SQL, script).
5. **Nhật ký test:** cuối file có bảng nhật ký (ngày, người test, kết quả) — cập nhật mỗi lần chạy test (thủ công hoặc E2E).
6. **Case đã có E2E tự động:** thêm ghi chú `[E2E]` ở cột Trạng thái kèm tên script để đối chiếu nguồn kiểm chứng.
