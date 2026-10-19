# memory.md — Bộ nhớ dự án

Nơi lưu ngữ cảnh, quyết định và bài học của dự án qua các phiên làm việc để agent ghi nhớ lâu dài.

## 2026-10-19 — Thiết lập Design System (2 port)

- `npm run dev` chạy đồng thời 2 server bằng script `scripts/dev.mjs` (không cần dependency): app chính (3000) + design system (3001).
- Component UI dùng chung nằm ở `src/components/ui/`, import qua alias `@ui/*` (tsconfig `paths` — Turbopack hỗ trợ trực tiếp, KHÔNG dùng `resolveAlias` vì không resolve đuôi file).
- Design tokens (màu, typography) là single source of truth tại `src/styles/tokens.css`, cả 2 app cùng `@import`.
- App design system là Next app riêng trong `design-system/` (import component từ `../src` qua `turbopack.root`).
- Design system đang xây dựng trước, app chính (hệ thống) xây sau. Palette hiện tại là starter, có thể thay đổi.

