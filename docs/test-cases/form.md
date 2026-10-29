# Test Case — Hệ Thống Form Components & Biểu Mẫu Neumorphic

> **Ngày lập:** 2026-10-19 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ hệ thống Form Components phục vụ Design System (`localhost:3001`), luồng Xác thực (Login, Register, 2FA, Reset Password) và Dashboard vận hành (Tạo công trường, Cấu hình camera, Báo cáo sự cố):
> 1. Nhóm 1 — Bộ khung nền tảng (Foundation Inputs & Feedback): `Input`, `Textarea`, `Label`, `FormMessage`, `FormField`.
> 2. Nhóm 2 — Bộ chọn & Điều khiển (Selection & Controls): `Checkbox`, `RadioGroup`, `Switch`, `Select` (Combobox dropdown), `PasswordInput` (toggle reveal & strength).
> 3. Nhóm 3 — Thành phần nâng cao & Đa phương tiện (Advanced & Media): `FileUpload` (drag-and-drop, progress, MinIO preview), `Slider` / `RangeSlider` (ngưỡng nhạy AI), `SegmentedControl`.
> 4. Nhóm 4 — Tổ chức & Điều phối Biểu mẫu (Layout & Orchestration): `FormSection`, `FormActions` (Submit/Cancel loading states).
> **Quy chuẩn kiểm thử:** Đầy đủ 6 trạng thái vật lý Neumorphic (Default, Hover, Focus, Error, Disabled, ReadOnly), Khả năng tiếp cận Accessibility (a11y), Tương thích Theme Sáng/Tối (`data-theme`), và Độc lập ngôn ngữ (i18n-ready).
> **Nguồn code:** `src/components/ui/form/*`, `src/styles/tokens.css`

---

## Tiền đề kiểm thử môi trường

- Môi trường chạy: Next.js dev server `:3000` (hoặc Design System Showcase `:3001`).
- Tokens Neumorphic: Nền `bg-background`, Bề mặt `bg-card`, Bóng lõm `shadow-nm-inset`, Bóng nổi `shadow-nm-sm`, Bóng nhấn `shadow-nm-pressed`.
- Trình duyệt: Google Chrome / Safari / Firefox (Desktop & Touch screen simulation).

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Thành Phần Nhập Liệu Cơ Bản (Input & Textarea)

> **Nguồn code:** `src/components/ui/form/foundation/input.tsx`, `textarea.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-001 | Hiệu ứng rãnh khắc lõm mặc định (Default Inset) | Input được render tĩnh | Mở form bất kỳ, quan sát ô nhập | Ô mang bóng đổ lõm vật lý vào bề mặt nền (`shadow-nm-inset`), chữ placeholder màu xám mờ tinh tế | ✅ |
| FORM-002 | Phản ứng xúc giác khi Hover & Focus | Rê chuột và click vào Input | Hover vào ô -> Click chuột vào ô | Khi hover: viền sáng nhẹ; Khi focus: rãnh sáng lên với màu nhận diện thương hiệu (xanh rêu `#14b8a6`), quầng sáng nhẹ bao quanh, không vỡ layout | ✅ |
| FORM-003 | Trạng thái Báo lỗi Validation (Error State) | Trường dữ liệu không thỏa Zod validation | Submit khi để trống ô bắt buộc | Viền rãnh chuyển sang màu đỏ gạch/terracotta (`#f87171`), bóng lõm mang ánh đỏ nhẹ, thông báo lỗi xuất hiện ngay dưới ô | ✅ |
| FORM-004 | Trạng thái Vô hiệu hóa (Disabled State) | Input có prop `disabled` | Quan sát ô bị khóa | Độ mờ giảm (opacity 0.6), bóng phẳng lại, con trỏ chuột đổi thành `not-allowed`, không thể gõ phím | ✅ |
| FORM-005 | Trạng thái Chỉ đọc (ReadOnly State) | Input có prop `readOnly` | Cố gắng gõ chữ vào ô mã định danh | Giữ nguyên độ tương phản của chữ, con trỏ dạng text, không thể sửa đổi nội dung | ✅ |
| FORM-006 | Textarea tự động co giãn dòng (Auto-resize) | Nhập mô tả công trường dài | Gõ nhiều dòng văn bản vào Textarea | Chiều cao Textarea tự động mở rộng theo nội dung (hoặc có tay nắm kéo co giãn), không xuất hiện thanh cuộn xấu | ⬜ |

---

## 2. Nhãn & Thông Báo Lỗi Tiếp Cận (Label, FormMessage & FormField)

> **Nguồn code:** `src/components/ui/form/foundation/label.tsx`, `form-message.tsx`, `form-field.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-101 | Tự động liên kết Label và Input qua ID (a11y) | Sử dụng `<FormField name="email">` | Click chuột vào chữ "Địa chỉ Email" (Label) | Con trỏ soạn thảo tự động nhảy vào ô Input tương ứng (`htmlFor` khớp `id`) | ✅ |
| FORM-102 | Dấu hoa thị bắt buộc (Required Indicator) | Field có prop `required` | Quan sát Label | Xuất hiện dấu hoa thị đỏ nhỏ `*` ngay sau tên nhãn | ✅ |
| FORM-103 | Đoạn mô tả gợi ý (Helper Text) | Có prop `description` | Quan sát phía dưới ô nhập | Hiển thị đoạn text hướng dẫn màu `text-muted-foreground` (ví dụ: "Mật khẩu phải chứa ít nhất 8 ký tự") | ✅ |
| FORM-104 | Animation trượt êm của Form Error | Lỗi validation phát sinh | Quan sát thông báo lỗi | Dòng chữ lỗi màu đỏ gạch trượt nhẹ từ trên xuống (slide-down animation) kèm icon cảnh báo nhỏ | ✅ |
| FORM-105 | Khả năng đọc bằng Screen Reader (`aria-describedby`) | Sử dụng công cụ đọc màn hình | Tab vào ô nhập liệu bị lỗi | Screen Reader đọc to tên trường kèm nội dung câu thông báo lỗi (`aria-invalid="true"`) | ⬜ |

---

## 3. Bộ Chọn & Điều Khiển Logic (Checkbox, Switch, RadioGroup, Select)

> **Nguồn code:** `src/components/ui/form/selection-controls/*`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-201 | Khối nổi Neumorphic của Checkbox (Raised Box) | Checkbox ở trạng thái chưa chọn | Quan sát ô Checkbox | Mang hình khối nổi mềm mại trên bề mặt nền (`shadow-nm-sm`) | ✅ |
| FORM-202 | Phản ứng khi Tick chọn Checkbox | Bấm chuột vào Checkbox | Click vào ô | Ô thụt lõm xuống (`shadow-nm-pressed`), nền chuyển màu Primary xanh rêu, xuất hiện icon dấu kiểm `Check` màu trắng sắc nét | ✅ |
| FORM-203 | Điều khiển bằng bàn phím (Keyboard Navigation) | Đang focus ở Checkbox | Nhấn phím `Space` (Cách) | Checkbox đảo trạng thái chọn/bỏ chọn tức thì | ✅ |
| FORM-204 | Nút gạt Công tắc (Switch Toggle) | Cấu hình bật/tắt an toàn | Click vào nút gạt Switch | Đầu trượt (Thumb) trượt êm sang phải với hiệu ứng vật lý đàn hồi mượt (spring animation), nền chuyển xanh rêu | ✅ |
| FORM-205 | Nhóm lựa chọn 1 trong nhiều (RadioGroup) | Chọn mức độ khẩn cấp (Thấp/Vừa/Cao) | Dùng phím mũi tên Lên/Xuống trên bàn phím | Điểm chọn chuyển mượt giữa các radio option, chỉ 1 option được chọn duy nhất tại một thời điểm | ✅ |
| FORM-206 | Hộp chọn Thả xuống (Select / Combobox) | Chọn Công trường từ danh sách | Click vào Select box | Dropdown trượt mở xuống với bề mặt Neumorphic nổi, đổ bóng sâu (`shadow-nm`); hỗ trợ gõ phím để tìm kiếm nhanh trong danh sách lớn | ✅ |
| FORM-207 | Đóng Select khi bấm ra ngoài | Dropdown đang mở | Click chuột vào vùng trống ngoài dropdown | Menu tự động đóng lại mượt mà | ✅ |

---

## 4. Ô Nhập Mật Khẩu Chuyên Biệt (PasswordInput)

> **Nguồn code:** `src/components/ui/form/selection-controls/password-input.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-301 | Mặc định ẩn ký tự dưới dạng dấu chấm (type=password) | Nhập mật khẩu | Gõ "Secret@123" | Các ký tự hiển thị dưới dạng dấu chấm bảo mật | ✅ `[E2E]` |
| FORM-302 | Nút Chuyển đổi Hiện/Ẩn Mật khẩu (Eye Toggle) | Đã nhập mật khẩu | Click vào icon Con mắt ở góc phải ô | Các ký tự lập tức hiển thị dưới dạng văn bản rõ (`type=text`), icon đổi sang con mắt gạch chéo | ✅ `[E2E]` |
| FORM-303 | Ẩn lại mật khẩu | Click lại icon con mắt | Ký tự trở về dạng dấu chấm bảo mật | ✅ `[E2E]` |
| FORM-304 | Điều khiển nút Con mắt bằng bàn phím | Nhập xong pass, nhấn phím `Tab` | Focus vào nút con mắt -> Nhấn `Enter` | Đổi chế độ hiện/ẩn mà không cần dùng chuột | ⬜ |

---

## 5. Tải Lên Đa Phương Tiện & Kéo Thả (FileUpload)

> **Nguồn code:** `src/components/ui/form/advanced-media/file-upload.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-401 | Vùng Kéo thả File (Drag-and-Drop Zone) | Khung FileUpload hiển thị | Quan sát vùng kéo thả | Khung viền nét đứt Neumorphic mềm mại, icon Đám mây tải lên, dòng chữ "Kéo thả file ảnh vào đây hoặc bấm để chọn" | ✅ |
| FORM-402 | Hiệu ứng khi kéo file lướt qua (Drag Over) | Kéo file ảnh từ desktop lướt qua khung | Giữ file lướt trên vùng upload | Đường viền sáng rực màu Primary, nền hơi lõm sâu báo hiệu sẵn sàng nhận file | ⬜ |
| FORM-403 | Thả file hợp lệ (PNG/JPG < 5MB) | Thả file ảnh vào vùng kéo thả | Thả chuột | Tên file xuất hiện kèm kích thước (vd: `snapshot.jpg - 1.4 MB`), thanh tiến trình tải lên chạy từ 0% đến 100% | ⬜ |
| FORM-404 | Xem trước ảnh thu nhỏ (Thumbnail Preview) | File tải lên thành công | Quan sát khung file | Hiển thị ảnh thumbnail cắt tỉ lệ chuẩn, nút icon Thùng rác để gỡ bỏ file và tải file khác | ⬜ |
| FORM-405 | Chặn định dạng file không được phép (.exe, .bat) | Kéo thả file `virus.exe` | Thả file vào khung | Báo lỗi đỏ: "Định dạng file không được hỗ trợ. Chỉ chấp nhận các định dạng: .jpg, .png, .mp4", từ chối tải | ⬜ |

---

## 6. Thanh Trượt & Bộ Điều Khiển Phân Đoạn (Slider & SegmentedControl)

> **Nguồn code:** `src/components/ui/form/advanced-media/slider.tsx`, `segmented-control.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-501 | Thanh trượt Ngưỡng AI (Neumorphic Slider) | Cấu hình độ nhạy phát hiện PPE | Dùng chuột kéo núm trượt (Thumb) từ 50% đến 95% | Rãnh trượt lõm sâu (`shadow-nm-inset`), phần đã chọn sáng màu xanh rêu, núm trượt tròn nổi khối 3D di chuyển mượt mà | ✅ |
| FORM-502 | Điều khiển Slider bằng phím mũi tên | Đang focus vào núm trượt | Nhấn phím Mũi tên Phải / Trái | Giá trị tăng/giảm từng bước 1% chính xác | ⬜ |
| FORM-503 | Bộ Chuyển Đổi Phân Đoạn (SegmentedControl) | Chuyển đổi khung giờ (Ngày / Tuần / Tháng) | Click vào nút "Tuần" | Miếng trượt Neumorphic nổi (Floating Pill) lướt êm sang mục được chọn với hiệu ứng chuyển động mượt mà | ✅ |

---

## 7. Bố Cục Biểu Mẫu & Thanh Thao Tác (Layout & FormActions)

> **Nguồn code:** `src/components/ui/form/layout-orchestration/form-section.tsx`, `form-actions.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-601 | Phân nhóm Biểu mẫu (FormSection) | Biểu mẫu dài nhiều nhóm thông tin | Quan sát form Tạo công trường | Các phần được chia ranh giới rõ ràng: "1. Thông tin chung", "2. Tiêu chuẩn an toàn", "3. Phân khu" có đường kẻ chìm Neumorphic phân tách | ✅ |
| FORM-602 | Thanh Thao Tác Biểu Mẫu (FormActions) | Cuối biểu mẫu | Quan sát nút hành động | Nút "Hủy bỏ" (Ghost/Outline) nằm bên trái, nút "Lưu thay đổi" (Primary Raised) nằm bên phải | ✅ |
| FORM-603 | Trạng thái Đang Xử Lý Đồng Bộ (Submitting State) | Người dùng bấm nút Submit | Quan sát nút hành động | Nút "Lưu" tự động hiển thị spinner xoay, chữ đổi thành "Đang lưu...", toàn bộ các ô input và nút Cancel bị khóa tạm thời chống bấm đúp (anti-double-click) | ✅ |

---

## 8. Tương Thích Chủ Đề Sáng / Tối & Đa Ngôn Ngữ (Themes & i18n)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| FORM-701 | Thích ứng Dark Mode toàn diện | Đang ở theme Sáng | Bấm nút đổi Theme sang Tối | Toàn bộ rãnh lõm `shadow-nm-inset` tự động chuyển sang ánh bóng tối sâu, viền không bị chói lóa, chữ placeholder giữ độ tương phản chuẩn WCAG AA | ✅ |
| FORM-702 | Chuyển đổi Ngôn ngữ biểu mẫu tức thì | Form đang mở | Đổi ngôn ngữ từ `vi-VN` sang `en-US` | Mọi nhãn Label, câu gợi ý Helper text, placeholder và thông báo lỗi validation chuyển sang tiếng Anh ngay lập tức | ⬜ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-19 | Design System Architecture Validation | Đạt | Hoàn thiện đặc tả kiến trúc 4 nhóm Form Components theo phong cách Neumorphism & Soft 3D |
| 2026-10-21 | E2E Auth Forms Regression | Đạt | Đạt 100% các suite E2E kiểm thử Form: Login, Register, Forgot Password, Reset Password, 2FA OTP, Change Password |
| 2026-10-28 | Operational Dashboard Forms Test | Đạt | Kiểm thử thành công các form phức hợp: Tạo/Sửa Site, Cấu hình Camera ROI Canvas, Thẩm duyệt sự cố, và Cài đặt Alert Fatigue |
