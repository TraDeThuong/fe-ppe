# Quy chuẩn Thiết kế UI/UX & Neumorphism — fe-ppe

> **Mục đích:** Hướng dẫn toàn diện về triết lý thẩm mỹ, hệ thống Token, hiệu ứng 3D xúc giác (tactile), Dark/Light theme và khả năng tiếp cận (Accessibility) trong dự án `fe-ppe`.

---

## 1. Triết lý Thiết kế Neumorphic & Soft 3D

Giao diện của hệ thống Smart PPE kết hợp giữa phong cách **Neumorphism (Soft UI)** và **Khối vật lý 3D**:

- **Bề mặt khắc chìm (Inset Shadows):**
  - Áp dụng cho các thành phần nhận dữ liệu: `Input`, `Textarea`, `Select`, rãnh trượt `Switch`.
  - Sử dụng class hoặc biến token: `shadow-[var(--nm-inset)]` (`inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)`).
  - Trạng thái ấn giữ hoặc chọn: `shadow-[var(--nm-pressed)]`.
- **Bề mặt nổi (Raised Shadows):**
  - Áp dụng cho các phần tử tương tác độc lập: `Button`, `Card`, thẻ chọn `Checkbox`, nút gạt `Switch thumb`, menu thả xuống `Select`.
  - Sử dụng token: `shadow-[var(--nm-raised)]` và `shadow-[var(--nm-raised-sm)]`.
- **Huy hiệu Biểu tượng Nổi 3D (Raised Icon Badge):**
  - Icon tiền tố (prefix) và hậu tố (suffix) trong `Input` mặc định mang kiểu dáng huy hiệu tròn nổi 3D (`iconStyle="raised"`).
  - Tự động co dãn theo kích thước input (`sm`: 24px, `md`: 28px, `lg`: 32px) và có quầng bóng nổi nhẹ bồng bềnh bên trong rãnh chìm.

---

## 2. Hệ thống Design Tokens (Single Source of Truth)

Tất cả các định nghĩa về màu sắc, shadow và typography được quản lý tập trung duy nhất tại:  
👉 `src/styles/tokens.css`

Cả **App chính (port 3000)** và **Design System (port 3001)** đều `@import` file này để đảm bảo nhất quán 100%.

### 2.1 Bảng màu cốt lõi
- **Background / Surface:** `--background` (`#f5f2eb` light / `#171a14` dark)
- **Card / Surface Secondary:** `--card`, `--secondary` (`#c9c1b1` light / `#23271f` dark)
- **Text:** `--foreground` (chữ chính `#1b2632`), `--muted-foreground` (chữ phụ `#2c3b4d`)
- **Primary / Brand:** `--primary` (đỏ gạch nung ấm `#a35139` hoặc xanh rêu olive `#648747`)
- **Semantic:**
  - Success: `--success` (`#16a34a`)
  - Danger / Error: `--danger` (`#dc2626` hoặc đất nung `#c45e52`)
  - Warning: `--warning` (`#d97706`)
  - Info: `--info` (`#0891b2`)

### 2.2 Biến bóng đổ Neumorphic
```css
--nm-raised-sm: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
--nm-raised: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
--nm-raised-lg: 14px 14px 28px var(--shadow-dark), -14px -14px 28px var(--shadow-light);
--nm-inset: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light);
--nm-pressed: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
```

---

## 3. Cơ chế Chuyển đổi Theme Sáng / Tối (Light & Dark Mode)

1. **Thuộc tính điều khiển:** Gắn trên thẻ `<html>` thông qua `data-theme="light"` hoặc `data-theme="dark"`.
2. **Chống chớp màu (FOUC):** Luôn nhúng `<InlineScript html={themeScript} />` vào `<head>` của cả `app/layout.tsx` và `design-system/app/layout.tsx` để đọc `localStorage` và đặt `data-theme` trước khi trình duyệt vẽ frame đầu tiên.
3. **Đồng bộ component động:**
   - Các component có logic màu phức tạp (như `WoodenToast`, `Loader`, `Skeleton`) phải sử dụng `MutationObserver` theo dõi cả `data-theme` và `class`:
   ```ts
   observer.observe(document.documentElement, {
     attributes: true,
     attributeFilter: ["class", "data-theme"],
   });
   ```

---

## 4. Tiêu chuẩn Khả năng Tiếp cận (Accessibility - a11y)

- **Độ tương phản và đường viền Focus:** Mọi nút bấm, input, switch bắt buộc phải có viền nét focus rõ ràng cho bàn phím:
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2`.
- **Liên kết nhãn & Báo lỗi:**
  - `FormField` tự động gắn `id` cho input và liên kết `htmlFor` với `Label`.
  - Báo lỗi tự động liên kết qua `aria-describedby` và đánh dấu `aria-invalid="true"`.
  - Thông báo lỗi sử dụng `role="alert"` và `aria-live="polite"`.
- **Hỗ trợ Giảm chuyển động (Reduced Motion):**
  - Mọi animation (`ppe-toast-drop`, `ui-loader-spin`, `ui-skeleton-shimmer`) bắt buộc bọc trong:
  `@media (prefers-reduced-motion: reduce) { animation: none !important; }`.
