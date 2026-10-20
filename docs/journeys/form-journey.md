# Hành trình xây dựng Form Components — fe-ppe

> **Ngày lập:** 2026-10-19  
> **Phạm vi:** Toàn bộ hệ thống Form Components phục vụ cho Design System (`localhost:3001`), luồng Auth (Login, Register, 2FA, Reset Password) và Dashboard vận hành (Tạo công trường, Cấu hình ngưỡng cảnh báo PPE, Báo cáo sự cố).  
> **Phong cách:** Neumorphism & Soft 3D, đồng bộ hoàn toàn với hệ thống Token (`tokens.css`), Card, Button, Loader và Skeleton.  
> **Quy ước hợp tác:**  
> - **User (Bạn):** Trực tiếp thiết kế UI, thẩm mỹ, chi tiết hình khối (shadow, border, màu sắc, vân nổi/lõm) cho từng component nhỏ.  
> - **Antigravity (Agent):** Định nghĩa cấu trúc types/props, gom và kết nối các tầng, đảm bảo Accessibility (a11y), viết trang showcase/demo trên Design System, xử lý logic tích hợp và sửa lỗi.  
> - **Nguyên tắc tài liệu:** Liệt kê mục tiêu, tiêu chí đánh giá, trạng thái và checklist rõ ràng — **không chứa code triển khai**.

---

## Mục lục

1. [Tổng quan & Phân nhóm Form Components](#1-tổng-quan--phân-nhóm-form-components)
2. [Nguyên tắc thiết kế & Tiêu chuẩn kỹ thuật](#2-nguyên-tắc-thiết-kế--tiêu-chuẩn-kỹ-thuật)
3. [Quy chuẩn các trạng thái (Component States)](#3-quy-chuẩn-các-trạng-thái-component-states)
4. [Cấu trúc thư mục & Phân định trách nhiệm](#4-cấu-trúc-thư-mục--phân-định-trách-nhiệm)
5. [Lộ trình 4 giai đoạn chi tiết](#5-lộ-trình-4-giai-đoạn-chi-tiết)
   - [Giai đoạn 1 — Bộ khung nền tảng (Foundation)](#giai-đoạn-1--bộ-khung-nền-tảng-foundation)
   - [Giai đoạn 2 — Bộ chọn & Điều khiển (Selection & Controls)](#giai-đoạn-2--bộ-chọn--điều-khiển-selection--controls)
   - [Giai đoạn 3 — Thành phần nâng cao & Đa phương tiện (Advanced & Media)](#giai-đoạn-3--thành-phần-nâng-cao--đa-phương-tiện-advanced--media)
   - [Giai đoạn 4 — Tổ chức & Điều phối Biểu mẫu (Layout & Orchestration)](#giai-đoạn-4--tổ-chức--điều-phối-biểu-mẫu-layout--orchestration)
6. [Kế hoạch trang Showcase trên Design System (`localhost:3001`)](#6-kế-hoạch-trang-showcase-trên-design-system-localhost3001)
7. [Checklist tổng nghiệm thu](#7-checklist-tổng-nghiệm-thu)

---

## 1. Tổng quan & Phân nhóm Form Components

Hệ thống biểu mẫu được chia thành 4 nhóm chức năng độc lập nhằm dễ dàng mở rộng, kiểm thử và tái sử dụng:

### Nhóm 1 — Input Components (Nhập & Chọn cơ bản)
- **Input:** Nhập dữ liệu một dòng (text, email, password, search, number, tel, url).
- **Textarea:** Nhập nội dung nhiều dòng (mô tả công trường, báo cáo sự cố, ghi chú an toàn).
- **Select / Combobox:** Lựa chọn đơn giá trị, đa giá trị hoặc tìm kiếm trong danh sách lớn.
- **Checkbox, Radio Group, Switch:** Các nút gạt lựa chọn độc lập, chọn một trong nhiều, bật/tắt quyền hạn hoặc tính năng cảnh báo.
- **File Upload:** Tải lên hình ảnh vi phạm PPE, ảnh đại diện, chứng chỉ an toàn, tài liệu hiện trường.

### Nhóm 2 — Form Feedback & Field Components (Phản hồi & Bọc cấu trúc)
- **Label:** Nhãn nhận diện trường dữ liệu, hiển thị dấu hoa thị bắt buộc (`required`).
- **Helper Text:** Đoạn mô tả gợi ý định dạng bên dưới trường nhập liệu.
- **Form Error:** Thông báo lỗi validation màu đất nung/terracotta, có animation trượt nhẹ.
- **Form Field:** Component gom cụm chuẩn hóa gồm `Label + Input + HelperText + FormError`.
- **Form Actions:** Thanh chứa nút Submit, Cancel, Reset kèm trạng thái loading đồng bộ.

### Nhóm 3 — Specialized Inputs (Nhập liệu chuyên biệt)
- **Password Input:** Input bảo mật tích hợp phím ẩn/hiện mật khẩu và đánh giá độ mạnh.
- **Date Picker / Date Range Picker:** Lọc khoảng thời gian sự cố, lịch kiểm tra thiết bị.
- **Time Picker:** Chọn khung giờ giám sát ca làm việc.
- **Slider / Range Slider:** Thiết lập ngưỡng cảnh báo (ví dụ độ nhạy phát hiện thiếu mũ bảo hộ từ 50% - 95%).
- **Segmented Control:** Chuyển đổi chế độ xem nhanh (Ngày / Tuần / Tháng, Sáng / Chiều).

### Nhóm 4 — Form Layout & Orchestration (Tổ chức & Điều phối)
- **Form:** Vùng bao bọc xử lý sự kiện submit, ngăn reload trang mặc định.
- **Form Section:** Phân nhóm biểu mẫu (Thông tin chung, Cấu hình thông báo, Phân quyền).
- **Form Row / Grid:** Bố cục chia 2 cột, 3 cột trên desktop và tự động co về 1 cột trên di động.
- **Form Footer:** Vùng cố định hoặc trôi nổi chứa nút xác nhận và hủy.
- **Filter Bar:** Thanh lọc dữ liệu bảng điều khiển hiện trường.
- **Multi-step Form / Wizard:** Biểu mẫu phân bước cho quy trình tạo công trường phức tạp.

---

## 2. Nguyên tắc thiết kế & Tiêu chuẩn kỹ thuật

### 2.1 Phong cách Neumorphism & Soft 3D
- **Hiệu ứng khắc lõm (Inset):** Các ô nhập liệu (`Input`, `Textarea`, `Select`) mặc định mang bóng đổ lõm vào bề mặt nền (`shadow-nm-inset`), tạo cảm giác khe rãnh vật lý thật.
- **Hiệu ứng nổi (Raised/Sculpted):** Các nút bấm hành động, thẻ chọn (`Checkbox`, `Radio`, `Switch`) mang khối nổi mềm mại.
- **Phản ứng bề mặt (Tactile Response):** Khi focus, viền rãnh sáng lên với màu nhận diện thương hiệu (xanh rêu/olive); khi gõ sai, rãnh chuyển viền cảnh báo đỏ gạch/terracotta.
- **Tương thích Theme Sáng / Tối:** Toàn bộ component sử dụng biến token CSS (`var(--shadow-dark)`, `var(--shadow-light)`, màu nền `bg-background`, `bg-card`). Tự động thích ứng khi chuyển đổi qua `data-theme`.

### 2.2 Độc lập Ngôn ngữ (i18n-ready)
- Không gắn cứng (hard-code) chuỗi ký tự hiển thị bên trong component.
- Tất cả nhãn, placeholder, câu nhắc lỗi đều nhận qua props hoặc context của LocaleProvider.

### 2.3 Phân tách Logic & Giao diện (Headless / Separation of Concerns)
- Component UI chỉ chịu trách nhiệm hiển thị trạng thái và bắn sự kiện (`onChange`, `onBlur`, `onFocus`).
- Không nhúng chặt vào bất kỳ thư viện form cụ thể nào (như react-hook-form hay Formik). Có thể hoạt động độc lập với React State thông thường hoặc tích hợp nhẹ nhàng qua `ref` và `props` chuẩn HTML.
- Thư viện validate (Zod) sẽ được cắm vào tầng ngoài, truyền kết quả lỗi vào qua prop `error`.

### 2.4 Khả năng tiếp cận (Accessibility - a11y)
- Mọi `Input` tự động kết nối với `Label` qua thuộc tính `id` và `htmlFor`.
- Thông báo lỗi liên kết với input qua `aria-describedby` và `aria-invalid`.
- Hỗ trợ đầy đủ điều hướng bằng bàn phím (`Tab`, `Space`, `Enter`, phím mũi tên cho Radio/Select).
- Hiển thị viền focus rõ ràng (`focus-visible:outline-2`) để đảm bảo người dùng bàn phím nhận biết vị trí con trỏ.

---

## 3. Quy chuẩn các trạng thái (Component States)

Mỗi component nhập liệu bắt buộc phải hỗ trợ đầy đủ 6 trạng thái giao diện sau:

| Trạng thái | Hành vi giao diện | Mục đích sử dụng |
|---|---|---|
| **Default (Mặc định)** | Rãnh khắc lõm nhẹ, viền hài hòa với màu nền, chữ placeholder màu xám mờ | Trạng thái tĩnh khi người dùng chưa tương tác |
| **Hover (Di chuột)** | Đường viền sáng nhẹ, bóng lõm tăng độ sắc nét | Báo hiệu thành phần có thể bấm vào để nhập liệu |
| **Focus (Đang nhập)** | Viền đổi màu Primary (xanh rêu/olive), quầng sáng tập trung bao quanh | Giúp người dùng tập trung vào ô đang xử lý |
| **Error (Báo lỗi)** | Viền chuyển màu Danger (đỏ gạch/terracotta), bóng lõm mang ánh đỏ nhẹ, thông báo lỗi xuất hiện bên dưới | Khi dữ liệu không thỏa mãn validation (Zod / backend) |
| **Disabled (Vô hiệu)** | Độ trong suốt giảm (opacity 0.6), con trỏ đổi thành `not-allowed`, bóng phẳng lại | Khi trường bị khóa hoặc người dùng không có quyền sửa |
| **ReadOnly (Chỉ đọc)** | Giữ nguyên độ tương phản của chữ, không cho phép sửa, nền hơi phẳng hơn | Hiển thị dữ liệu cố định (ví dụ ID người dùng, mã thiết bị) |

---

## 4. Cấu trúc thư mục & Phân định trách nhiệm

### 4.1 Cấu trúc file mục tiêu trong `src/components/ui/`
```
src/components/ui/
├── input.tsx              # Input cơ bản & các type HTML thông dụng
├── textarea.tsx           # Ô văn bản nhiều dòng, hỗ trợ tự dãn chiều cao
├── label.tsx              # Nhãn trường thông tin
├── form-message.tsx       # Helper text và Form error
├── form-field.tsx         # Khối bọc chuẩn hóa (Label + Input + Message)
├── select.tsx             # Hộp chọn đơn / đa giá trị phong cách Neumorphic
├── checkbox.tsx           # Hộp kiểm độc lập
├── radio-group.tsx        # Nhóm nút chọn một trong nhiều
├── switch.tsx             # Cần gạt bật/tắt (Toggle switch)
├── password-input.tsx     # Ô mật khẩu có nút mắt ẩn/hiện
├── file-upload.tsx        # Vùng kéo thả / chọn file đính kèm
├── slider.tsx             # Thanh trượt điều chỉnh ngưỡng
├── segmented-control.tsx  # Thanh nút phân đoạn chuyển tab ngắn
├── form.tsx               # Wrapper form chuẩn hóa
├── form-section.tsx       # Khối phân đoạn logic trong form
├── form-actions.tsx       # Thanh nút bấm hoàn tất biểu mẫu
└── index.ts               # Xuất tập trung (barrel export)
```



---

## 5. Lộ trình 4 giai đoạn chi tiết

```
Giai đoạn 1: Nền tảng (Foundation)
Input ──► Textarea ──► Label ──► FormMessage ──► FormField
   │
   ▼
Giai đoạn 2: Lựa chọn (Selection & Controls)
Select ──► Checkbox ──► RadioGroup ──► Switch ──► PasswordInput
   │
   ▼
Giai đoạn 3: Nâng cao & Media (Advanced Inputs)
FileUpload ──► Slider ──► SegmentedControl ──► DatePicker
   │
   ▼
Giai đoạn 4: Điều phối Biểu mẫu (Orchestration)
Form ──► FormSection ──► FormActions ──► Ghép Form Mẫu (Auth, Site, Incident)
```

---

### Giai đoạn 1 — Bộ khung nền tảng (Foundation)

**Mục tiêu:** Xây dựng xong bộ "nguyên tử" (atoms) cơ bản nhất của biểu mẫu. Hoàn thành giai đoạn này, dự án có thể dựng được các form nhập văn bản cơ bản với đầy đủ nhãn và báo lỗi.

#### 1.1 `label.tsx`
- **Mục tiêu:** Nhãn hiển thị cho mọi input trong hệ thống.
- **Tiêu chí UI (User):** Typography rõ ràng, màu sắc đồng bộ theme, hỗ trợ hiển thị dấu hoa thị `*` màu đỏ đất khi trường là bắt buộc (`required`).
- **Tiêu chuẩn kỹ thuật (Agent):** Kế thừa thẻ `<label>`, hỗ trợ thuộc tính `htmlFor` liên kết với id input.

#### 1.2 `form-message.tsx`
- **Mục tiêu:** Hiển thị dòng mô tả hướng dẫn (`HelperText`) và thông báo lỗi validation (`FormError`).
- **Tiêu chí UI (User):** HelperText màu xám nhạt dịu mắt; FormError màu đỏ gạch đất nung (`#c45e52`), có biểu tượng cảnh báo nhỏ hoặc hiệu ứng trượt nhẹ khi xuất hiện.
- **Tiêu chuẩn kỹ thuật (Agent):** Khai báo `role="alert"` và `aria-live="polite"` cho thông báo lỗi.

#### 1.3 `input.tsx`
- **Mục tiêu:** Ô nhập dữ liệu một dòng, hỗ trợ các type: text, email, number, search, tel, url.
- **Tiêu chí UI (User):** Rãnh khắc chìm Neumorphic đặc trưng, bo góc mềm mại, hiển thị đẹp cả 3 kích thước (`sm`, `md`, `lg`), hỗ trợ icon ở đầu (prefix) hoặc cuối (suffix).
- **Tiêu chuẩn kỹ thuật (Agent):** Forward ref đầy đủ, hỗ trợ prop `error` (boolean hoặc string) để kích hoạt viền lỗi tự động, kết nối sự kiện `onChange`, `onFocus`, `onBlur`.

#### 1.4 `textarea.tsx`
- **Mục tiêu:** Ô nhập văn bản nhiều dòng cho mô tả, ghi chú.
- **Tiêu chí UI (User):** Khắc chìm đồng nhất với Input, thanh cuộn được bo tròn tinh tế, hỗ trợ tùy chọn tự khóa kéo dãn (resize-none) hoặc chỉ kéo dãn dọc.
- **Tiêu chuẩn kỹ thuật (Agent):** Tùy chọn tự động dãn chiều cao theo nội dung gõ (auto-grow).

#### 1.5 `form-field.tsx`
- **Mục tiêu:** Component "xương sống" ghép nối `Label + Input/Textarea + HelperText + FormError`.
- **Tiêu chuẩn kỹ thuật (Agent):** Tự động sinh `id` duy nhất và liên kết `htmlFor`, tự gắn `aria-describedby` trỏ tới helper text hoặc error message.

---

### Giai đoạn 2 — Bộ chọn & Điều khiển (Selection & Controls)

**Mục tiêu:** Cung cấp đầy đủ các phương thức lựa chọn dữ liệu và thao tác nhị phân (bật/tắt).

#### 2.1 `password-input.tsx`
- **Mục tiêu:** Nhập mật khẩu an toàn cho luồng Auth (Login, Register, Change Password).
- **Tiêu chí UI (User):** Kế thừa kiểu dáng Input nhưng tích hợp nút bấm biểu tượng con mắt (hiện/ẩn mật khẩu) dạng Neumorphic nhỏ gọn ở góc phải.
- **Tiêu chuẩn kỹ thuật (Agent):** Chuyển đổi trạng thái giữa type `password` và `text`, ngăn ngừa mất tiêu điểm (prevent focus loss) khi bấm nút con mắt.

#### 2.2 `checkbox.tsx`
- **Mục tiêu:** Chọn nhiều mục độc lập (ví dụ: danh sách thiết bị PPE cần kiểm tra: Mũ, Kính, Găng tay, Giày).
- **Tiêu chí UI (User):** Hộp vuông bo góc nhẹ; trạng thái chưa chọn mang lòng rãnh khắc lõm; trạng thái đã chọn nổi lên với dấu tích `✓` xanh rêu/olive sắc nét.
- **Tiêu chuẩn kỹ thuật (Agent):** Hỗ trợ trạng thái `indeterminate` (chọn một phần) khi dùng cho bảng dữ liệu chọn tất cả.

#### 2.3 `radio-group.tsx`
- **Mục tiêu:** Chọn 1 phương án duy nhất trong danh sách (ví dụ: Mức độ ưu tiên sự cố: Thấp, Trung bình, Khẩn cấp).
- **Tiêu chí UI (User):** Nút tròn Neumorphic; khi kích hoạt sẽ lõm chấm tròn đồng tâm màu thương hiệu; hỗ trợ xếp hàng ngang hoặc cột dọc.
- **Tiêu chuẩn kỹ thuật (Agent):** Quản lý trạng thái focus nhóm bằng phím mũi tên lên/xuống/trái/phải (WAI-ARIA Radio Pattern).

#### 2.4 `switch.tsx`
- **Mục tiêu:** Nút gạt bật/tắt tức thì (ví dụ: Kích hoạt camera AI, Bật cảnh báo âm thanh, Bật xác thực 2FA).
- **Tiêu chí UI (User):** Rãnh trượt dài khắc lõm vào nền; nút gạt tròn nổi khối 3D; khi bật thì rãnh chuyển sang màu xanh rêu dịu và nút trượt mượt mà sang phải.
- **Tiêu chuẩn kỹ thuật (Agent):** Sử dụng `role="switch"` và `aria-checked`, kích hoạt được bằng phím `Space` hoặc `Enter`.

#### 2.5 `select.tsx`
- **Mục tiêu:** Hộp thả xuống chọn giá trị (ví dụ: Chọn công trường, Chọn ca trực, Chọn vai trò tài khoản).
- **Tiêu chí UI (User):** Hộp kích hoạt mang phong cách rãnh lõm; menu danh sách thả xuống nổi khối với viền mờ cao cấp (`backdrop-blur`); mục đang chọn có dấu kiểm.
- **Tiêu chuẩn kỹ thuật (Agent):** Xử lý đóng khi click ra ngoài (`click-outside`), hỗ trợ phím `Escape` để đóng và phím điều hướng danh sách.

---

### Giai đoạn 3 — Thành phần nâng cao & Đa phương tiện (Advanced & Media)

**Mục tiêu:** Xây dựng các thành phần nhập liệu chuyên sâu cho hệ thống giám sát an toàn lao động.

#### 3.1 `file-upload.tsx`
- **Mục tiêu:** Tải hình ảnh hiện trường, bằng chứng vi phạm an toàn, tài liệu báo cáo.
- **Tiêu chí UI (User):** Vùng kéo thả viền nét đứt tinh xảo; biểu tượng đám mây/mũi tên tải lên nổi bật; hiển thị thẻ danh sách file kèm dung lượng, thanh tiến trình và nút xóa file.
- **Tiêu chuẩn kỹ thuật (Agent):** Kiểm tra định dạng tệp (image/png, pdf...) và giới hạn dung lượng tối đa; tích hợp gọi `Loader` hoặc `Progress` khi đang tải.

#### 3.2 `slider.tsx`
- **Mục tiêu:** Kéo chọn giá trị ngưỡng (ví dụ: Ngưỡng tin cậy của mô hình AI nhận diện PPE từ 0% đến 100%).
- **Tiêu chí UI (User):** Rãnh trượt chìm sâu; con trỏ kéo (thumb) nổi 3D lớn dễ bấm kèm bong bóng hiển thị giá trị số phía trên.
- **Tiêu chuẩn kỹ thuật (Agent):** Hỗ trợ phím mũi tên tăng giảm từng bước (`step`), khai báo đầy đủ `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.

#### 3.3 `segmented-control.tsx`
- **Mục tiêu:** Thanh chọn nhanh các chế độ hiển thị hoặc bộ lọc ngắn.
- **Tiêu chí UI (User):** Một thanh dài khắc lõm chứa các tab; tab đang chọn sẽ trồi lên thành một nút nổi Neumorphic sáng bóng với hiệu ứng trượt vị trí mượt mà.

---

### Giai đoạn 4 — Tổ chức & Điều phối Biểu mẫu (Layout & Orchestration)

**Mục tiêu:** Kết nối các thành phần nhỏ thành các biểu mẫu hoàn chỉnh, phục vụ trực tiếp cho Auth Journey và Dashboard công trường.

#### 4.1 `form-section.tsx` & Layout Grids
- **Mục tiêu:** Tổ chức biểu mẫu dài thành từng phân nhóm có tiêu đề rõ ràng, hỗ trợ chia lưới 1 cột, 2 cột, 3 cột đáp ứng tốt trên mobile và desktop.

#### 4.2 `form-actions.tsx`
- **Mục tiêu:** Thanh điều khiển phía cuối form gồm nút bấm hành động chính (Lưu, Đăng nhập, Tạo mới) và nút phụ (Hủy, Quay lại).
- **Tiêu chuẩn kỹ thuật (Agent):** Tự động gắn Spinner/Loader vào nút submit khi form đang ở trạng thái `isSubmitting`, vô hiệu hóa các nút phụ để tránh gửi lặp request.

---

## 6. Kế hoạch trang Showcase trên Design System (`localhost:3001`)

Để bạn có thể quan sát, tương tác và kiểm tra độ hoàn thiện thẩm mỹ của từng component ngay sau khi thiết kế, chúng ta sẽ mở rộng Design System theo lộ trình:

1. **`http://localhost:3001/components/input`**:
   - Trưng bày các biến thể Input (Default, Prefix icon, Suffix icon, Password, Disabled, Error).
   - Ô Textarea với các chế độ kích thước.
2. **`http://localhost:3001/components/selection`**:
   - Bảng demo Checkbox (đơn lẻ, theo nhóm, indeterminate).
   - Nhóm Radio Group theo hàng ngang và hàng dọc.
   - Các biến thể Switch bật/tắt.
   - Hộp Select thả xuống.
3. **`http://localhost:3001/components/form`**:
   - Trang tổng hợp toàn diện: Trình diễn `FormField` hoàn chỉnh với các trạng thái tương tác.
   - Mô phỏng Form Đăng nhập và Form Cấu hình an toàn với khả năng bấm Submit để kiểm tra validation và hiện Toast thông báo.

---

## 7. Checklist tổng nghiệm thu

### Giai đoạn 1 — Nền tảng
- [ ] `label.tsx`: Đã thiết kế xong nhãn, hỗ trợ required hoa thị đỏ.
- [ ] `form-message.tsx`: Đã có HelperText dịu mắt và FormError đất nung.
- [ ] `input.tsx`: Đã hoàn thiện rãnh lõm Neumorphic, nhận diện đủ 6 trạng thái.
- [ ] `textarea.tsx`: Đã hoàn thiện ô nhập nhiều dòng đồng nhất phong cách.
- [ ] `form-field.tsx`: Đã kết nối tự động id, nhãn, lỗi và thông điệp.
- [ ] Trang xem thử Design System cho Giai đoạn 1 sẵn sàng trên port 3001.

### Giai đoạn 2 — Lựa chọn
- [ ] `password-input.tsx`: Nút ẩn/hiện mắt hoạt động mượt, không mất focus.
- [ ] `checkbox.tsx`: Đổi trạng thái mượt mà, dấu tích rõ nét ở cả 2 theme.
- [ ] `radio-group.tsx`: Chấm tròn đồng tâm nổi bật, điều hướng phím chuẩn a11y.
- [ ] `switch.tsx`: Cần gạt trượt êm ái, màu rãnh bật/tắt trực quan.
- [ ] `select.tsx`: Menu thả xuống nổi khối kính mờ, đóng khi click ra ngoài.

### Giai đoạn 3 — Nâng cao
- [ ] `file-upload.tsx`: Kéo thả file trực quan, có danh sách file và nút xóa.
- [ ] `slider.tsx`: Kéo mượt mà, bong bóng hiển thị giá trị số sắc nét.
- [ ] `segmented-control.tsx`: Hiệu ứng trượt tab trực quan.

### Giai đoạn 4 — Điều phối biểu mẫu
- [ ] `form-section.tsx`: Chia nhóm logic sạch đẹp.
- [ ] `form-actions.tsx`: Nút bấm tích hợp loader khi gửi dữ liệu.
- [ ] Ghép nối thành công Form Đăng nhập mẫu cho `auth-journey.md`.
- [ ] Toàn bộ form hoạt động mượt mà khi đổi theme Sáng / Tối trên Design System.
