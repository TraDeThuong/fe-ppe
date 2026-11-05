# Danh sách Skills trong Dự án `fe-ppe`

Tổng hợp tên, tác dụng và cách sử dụng của các skill được tinh chỉnh chuẩn hóa cho dự án **fe-ppe** (Next.js 16 + React 19 + Tailwind v4 + TypeScript — Hệ Thống Giám Sát An Toàn Lao Động Thông Minh qua Camera AI).

---

## 🎯 Nhóm 1: Kiểm Tra & Tối Ưu Code React / Next.js

### 1. `vercel-react-best-practices`
- **Nguồn:** `vercel-labs/agent-skills`
- **Tác dụng:** Cung cấp toàn bộ quy chuẩn và hướng dẫn tối ưu hiệu năng React & Next.js từ đội ngũ kỹ sư Vercel. Kiểm tra Server Component vs Client Component, bundle size, data fetching cache với React Query/Next.js cache, re-rendering và Core Web Vitals.
- **Khi nào dùng:** Khi viết, review, refactor component React, trang Next.js, hook xử lý luồng dữ liệu thời gian thực (realtime camera/incidents).

### 2. `vercel-composition-patterns`
- **Nguồn:** `vercel-labs/agent-skills`
- **Tác dụng:** Mẫu thiết kế composition linh hoạt, component compound, slot pattern, context provider và khả năng tái sử dụng cao cho UI component library / Design System (`src/components/ui/`). Bao gồm chuẩn React 19 API.
- **Khi nào dùng:** Khi xây dựng hoặc refactor các UI component dùng chung (`@ui/*`), giảm bớt boolean props proliferation, tối ưu kiến trúc component.

---

## 🎨 Nhóm 2: Kiểm Tra Giao Diện, UI/UX & Accessibility (A11y)

### 3. `web-design-guidelines`
- **Nguồn:** `vercel-labs/agent-skills`
- **Tác dụng:** Review mã UI theo tiêu chuẩn **Web Interface Guidelines**: kiểm tra khả năng tiếp cận (Accessibility - a11y, ARIA, điều hướng bàn phím, độ tương phản màu sắc), hành vi responsive, layout, form validation và trải nghiệm người dùng (UX).
- **Khi nào dùng:** Khi cần audit giao diện: *"review my UI"*, *"check accessibility"*, *"audit UX"*, *"kiểm tra giao diện theo chuẩn web"*.

### 4. `frontend-design`
- **Nguồn:** `anthropics/skills`
- **Tác dụng:** Hướng dẫn định hướng thẩm mỹ, phân cấp thị giác, typography, màu sắc và layout trực quan cho ứng dụng, tránh giao diện dạng template mặc định thô cứng.
- **Khi nào dùng:** Khi thiết kế view mới, cải tiến layout dashboard giám sát camera, incident modal, hoặc command center.

---

## 🧪 Nhóm 3: Kiểm Tra Chức Năng & E2E Testing

### 5. `webapp-testing`
- **Nguồn:** `anthropics/skills`
- **Tác dụng:** Bộ công cụ kiểm thử tự động trên trình duyệt thật qua Playwright: chạy web app cục bộ, tương tác với form/nút bấm, chụp screenshot để kiểm tra layout thực tế, bắt log console và debug lỗi runtime frontend.
- **Khi nào dùng:** Khi cần kiểm thử tương tác luồng đăng nhập, luồng xem camera, filter danh sách sự cố, kiểm tra responsiveness và debug UI tự động.

---

## 🔍 Nhóm 4: Code Review & Đánh Giá Chất Lượng

### 6. `code-review-and-quality`
- **Tác dụng:** Đánh giá code đa chiều theo 5 trục:
  1. **Correctness** (tính chính xác, bắt lỗi edge cases)
  2. **Readability** (dễ đọc, đặt tên chuẩn)
  3. **Architecture** (tuân thủ quy ước Next.js 16, module hóa)
  4. **Security** (XSS, token handling, SSR data exposure)
  5. **Performance** (tránh re-render thừa, memoization hợp lý)
- **Khi nào dùng:** Trước khi merge code, sau khi tạo tính năng mới hoặc hoàn thiện một trang.

### 7. `open-code-review-delegate`
- **Nguồn:** `alibaba/open-code-review`
- **Tác dụng:** Dùng CLI `ocr` để lấy git diff, lọc file thay đổi, phân giải rule; sau đó chính Agent chủ trì review chi tiết và đề xuất bản vá trực tiếp.
- **Khi nào dùng:** Khi review Git pull request, staged changes, hoặc so sánh nhánh với `main`.

### 8. `open-code-review`
- **Nguồn:** `alibaba/open-code-review`
- **Tác dụng:** Review tự động qua engine `ocr` sinh inline review comment theo từng dòng trên Git diff.

---

## 🛡️ Nhóm 5: Audit Bảo Mật Codebase

### 9. `security-audit`
- **Tác dụng:** Quy trình audit bảo mật toàn diện 6 pha cho mã nguồn (Recon → Hunt → Validate → Report → Structured output `findings.json` → Independent verification). Tập trung vào các lỗi có thể khai thác thực tế (XSS, Auth bypass, Token leakage, Insecure Direct Object References trong client API calls, CORS misconfiguration).
- **Khi nào dùng:** Khi cần đánh giá mức độ an toàn của ứng dụng fe-ppe trước khi deploy hoặc bàn giao. Hoạt động độc lập bằng agent mà không đòi hỏi cài Docker/Strix bên ngoài.

---

## 🧰 Nhóm 6: Quản Lý & Cài Đặt Skill

### 10. `find-skills`
- **Tác dụng:** Quản lý, tìm kiếm và cài đặt thêm các skill từ hệ sinh thái open agent skills qua CLI `npx skills`.
- **Cách dùng:**
  ```bash
  npx skills find <từ khóa>
  npx skills add <owner/repo@skill> -y
  npx skills update
  ```

---

## 💡 Đánh giá về bộ `claude-seo` đối với dự án `fe-ppe`:
- `AgriciDaniel/claude-seo` gồm 26 sub-skills chuyên về **Search Engine Optimization** (Google Search Console, sitemap XML, robots.txt, backlinks, Local Map Pack, E-E-A-T, Schema e-commerce...).
- **Đánh giá:** Dự án `fe-ppe` là **Hệ Thống Giám Sát An Toàn Lao Động (Smart PPE Monitoring)** — là một Enterprise Dashboard / Web App nội bộ, phần lớn trang nằm sau lớp xác thực tài khoản (`(auth)`: dashboard, camera, incidents, site detail, ai-metrics). Vì vậy, các skill SEO thương mại/public là **không phù hợp** và sẽ làm loãng bộ ngữ cảnh của Agent. Thay vào đó, việc kiểm tra chất lượng của `fe-ppe` cần tập trung vào hiệu năng frontend (`vercel-react-best-practices`), khả năng tiếp cận (`web-design-guidelines`), component architecture (`vercel-composition-patterns`), và kiểm thử trình duyệt thực tế (`webapp-testing`).
