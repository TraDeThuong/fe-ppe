# Hướng dẫn Chính cho AI Agent — fe-ppe

> Dự án: **fe-ppe** (Giao diện Frontend của Hệ thống Giám sát & Quản lý An toàn Lao động Smart PPE Monitoring)  
> Kiến trúc: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Turbopack**

---

## 1. Cấu trúc Dự án & Chạy Môi trường

Dự án duy trì hai ứng dụng Next.js chạy đồng thời qua script `scripts/dev.mjs`:
- `npm run dev`: Chạy song song cả hai cổng:
  - **Port 3000:** Ứng dụng chính (`http://localhost:3000`).
  - **Port 3001:** Thư viện giao diện Design System (`http://localhost:3001`).

Component dùng chung đặt tại `src/components/ui/`, luôn import thông qua alias `@ui/*`.

---

## 2. Hệ thống Quy tắc Bắt buộc (.agent/rules/)

Mọi AI Agent khi thực thi tác vụ trong repository này **bắt buộc phải đọc và tuân thủ 4 bộ quy tắc** sau:

1. [rules/design.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/.agent/rules/design.md):  
   Quy chuẩn thiết kế Neumorphic Soft 3D, rãnh khắc chìm `shadow-nm-inset`, khối nổi `shadow-nm-raised`, huy hiệu icon nổi 3D, hệ thống biến `tokens.css`, đổi màu Dark/Light qua `data-theme` và chuẩn Accessibility (a11y).

2. [rules/tech-defaults.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/.agent/rules/tech-defaults.md):  
   Quy chuẩn mã nguồn TypeScript/React, phân định Server vs Client Component (`"use client"`), chuẩn hóa đa ngôn ngữ qua `t()` từ `LocaleProvider`, định dạng số/ngày bằng `Intl` API, và barrel export `index.ts`.

3. [rules/architecture.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/.agent/rules/architecture.md):  
   Kiến trúc phân tầng Domain-First (`types/`, `services/`, `hooks/`), unwrap response backend, quản lý token trong memory + cookie httpOnly, cơ chế Refresh Single-Flight chống race condition, thứ tự bọc Provider và ma trận Toast lỗi.

4. [rules/workflow.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/.agent/rules/workflow.md):  
   Phân công trách nhiệm giữa User (sáng tạo thẩm mỹ, hình khối UI) và Agent (chuẩn hóa type, ghép nối logic, dựng showcase, kiểm thử trình duyệt), quy trình 5 bước khi phát triển hoặc nâng cấp component mới, và **quy tắc bắt buộc ghi test case vào `docs/test-cases/` mỗi khi một giao diện hoàn thành** (mục 4).

---

## 3. Tài liệu Hành trình Phát triển (docs/journeys/)

- [docs/journeys/auth-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/auth-journey.md): Hành trình xây dựng toàn bộ luồng xác thực (Login, Register, 2FA, Session restore, Guard Layout).
- [docs/journeys/form-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/form-journey.md): Hành trình 4 giai đoạn phát triển Form Components (Foundation, Selection Controls, Advanced Media, Form Layout).

## 4. Test Case (docs/test-cases/)

- [docs/test-cases/auth.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/test-cases/auth.md): Test case toàn bộ luồng auth (tài khoản seed, kịch bản test thủ công từng trang, nhật ký test). Mỗi giao diện hoàn thành phải ghi test case vào đây — xem rules/workflow.md mục 4.
