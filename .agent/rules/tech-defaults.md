# Mặc định Công nghệ & Quy chuẩn Code — fe-ppe

> **Mục đích:** Quy định khung công nghệ, cấu trúc thư mục, quy ước import và các tiêu chuẩn code TypeScript/React trong dự án `fe-ppe`.

---

## 1. Tech Stack Cốt lõi

- **Framework:** Next.js 16 (App Router) với trình biên dịch Turbopack.
- **Thư viện UI:** React 19.
- **Ngôn ngữ:** TypeScript 5 (Strict Mode, không dùng `any` bừa bãi).
- **Styling:** Tailwind CSS v4 + Vanilla CSS custom properties (`tokens.css`).
- **Biểu tượng (Icons):** `lucide-react`.
- **Server State & Data Fetching:** `@tanstack/react-query` v5 + `axios`.
- **Thông báo Toast:** `react-hot-toast` (với wrapper `WoodenToast` tại `@ui/toaster`).

---

## 2. Quy ước Thư mục & Alias Import

### 2.1 Cấu trúc thư mục nguồn `src/`
```
src/
├── components/
│   ├── ui/               # Component UI thuần thẩm mỹ, dùng chung (Button, Card, Form...)
│   └── features/         # Component gắn liền với logic nghiệp vụ cụ thể
├── config/               # Cấu hình môi trường, endpoints
├── contexts/             # React Contexts (AuthContext, LocaleContext...)
├── hooks/                # Custom React Query hooks (theo domain: auth, sites, incidents...)
├── i18n/                 # Từ điển dịch đa ngôn ngữ phẳng (vi-VN.json, en-US.json)
├── lib/                  # Tiện ích cốt lõi (axios instance, query-client, tokenStore)
├── providers/            # Các Provider bọc cây React (AppProviders)
├── services/             # Hàm gọi API thuần (theo domain)
├── styles/               # CSS dùng chung (tokens.css)
└── types/                # TypeScript Interfaces / DTOs (theo domain)
```

### 2.2 Quy ước Alias
- **`@/*`** ➔ Trỏ vào `./src/*`
- **`@ui/*`** ➔ Trỏ trực tiếp vào `./src/components/ui/*` (cả App chính và Design System cùng dùng alias này).

---

## 3. Server Component vs Client Component

- **Nguyên tắc mặc định:** Giữ component là **Server Component** (không thêm `"use client"`) để giảm lượng JavaScript gửi xuống trình duyệt và hỗ trợ SEO/tốc độ tải tối đa.
- **Khi nào thêm `"use client"`:**
  1. Component sử dụng React State (`useState`, `useReducer`).
  2. Component sử dụng Lifecycle / Effects (`useEffect`, `useLayoutEffect`, `useRef`).
  3. Component lắng nghe sự kiện người dùng (`onClick`, `onChange`, `onKeyDown`).
  4. Component sử dụng Web APIs của trình duyệt (`localStorage`, `MutationObserver`, `window`).
  5. Component là React Context Provider hoặc Consumer (`useContext`).

---

## 4. Chuẩn hóa Đa ngôn ngữ (i18n-ready)

1. **Không hard-code chuỗi văn bản:** Không viết chuỗi giao diện trực tiếp trong JSX nếu không có lý do đặc biệt.
2. **Sử dụng hook `useLocale()`:**
   - Dịch chuỗi UI qua `t("login.title")` từ `src/i18n/vi-VN.json` hoặc `en-US.json`.
   - Key đặt theo dot-notation phẳng (ví dụ: `"dashboard.totalSites"`).
3. **Định dạng số và ngày giờ:**
   - Số lượng: Dùng `number.format(user.permissions.length)`.
   - Ngày giờ: Dùng `dateTime.format(new Date(user.createdAt))`.
   - Tuyệt đối không tự viết hàm format ngày tháng/số liệu thủ công.

---

## 5. Quy chuẩn Barrel Export

Mỗi thư mục component con trong `src/components/ui/` (ví dụ `form/foundation`, `form/selection-controls`, `form/layout-orchestration`) bắt buộc phải có file `index.ts` để re-export sạch sẽ:
```ts
// src/components/ui/form/index.ts
export * from "./foundation";
export * from "./selection-controls";
export * from "./layout-orchestration";
```
Giúp việc import bên ngoài ngắn gọn, nhất quán và không phụ thuộc vào đường dẫn lồng sâu.
