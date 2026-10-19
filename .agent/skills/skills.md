# Danh sách Skills trong `.agent/skills`

Tổng hợp tên, tác dụng và cách sử dụng của các skill trong thư mục này.
Các skill được sắp xếp theo nhóm chức năng.

---

## Nhóm 1: Pentest & Bảo mật với Strix

Nhóm này dùng **Strix** — công cụ pentest tự động bằng AI agent. Có 2 cách chạy:
- **Self-hosted**: CLI mã nguồn mở, chạy trên máy qua Docker + LLM key.
- **Cloud (managed)**: chạy trên app.strix.ai, không cần Docker/LLM key — dùng `strix cloud`.

> Điều kiện: chỉ test tài sản mà bạn sở hữu hoặc được ủy quyền.

### 1. `penetration-testing-with-strix` (Skill nền tảng)
- **Tác dụng**: Pentest web app, API, codebase, repo, URL bằng Strix. Hướng dẫn cài đặt CLI, cấu hình LLM, toàn bộ flag. Là skill nền mà các skill Strix khác tham chiếu khi cần cài đặt.
- **Cách sử dụng**: Đọc skill này đầu tiên nếu `strix --version` không chạy được. Sau đó chạy scan:
  ```bash
  strix -n -t <target> --max-budget <n>
  ```
  Kết quả nằm trong `strix_runs/<run>/`.

### 2. `web-app-penetration-testing`
- **Tác dụng**: Pentest black-box một web app đang chạy (URL, staging, local dev server). Tìm và khai thác lỗi thật (auth bypass, IDOR, injection, XSS, SSRF, business logic), mỗi lỗi kèm PoC chứng minh.
- **Cách sử dụng**: Khi target là web app đang chạy:
  ```bash
  strix -n -t https://staging.example.com --max-budget 20
  ```
  Xác nhận phạm vi trước khi chạy — chỉ pentest app của chính bạn.

### 3. `api-security-testing`
- **Tác dụng**: Security-test API REST/GraphQL/gRPC theo OWASP API Security Top 10 (2023) — BOLA/IDOR, mass assignment, broken function-level authorization...
- **Cách sử dụng**: Cần schema (OpenAPI/Postman/GraphQL) + 2 bộ token khác tenant + token admin:
  ```bash
  strix -n -t ./openapi.yaml -t https://api.staging.example.com --max-budget 20 \
    --instruction "Tenant A token: <A>. Tenant B token: <B>. Focus: BOLA, mass assignment..."
  ```

### 4. `find-security-vulnerabilities-in-code`
- **Tác dụng**: Review bảo mật white-box source code — đọc source, phân tích data flow và authorization model, khai thác thử trong sandbox để mỗi lỗi đều có PoC.
- **Cách sử dụng**:
  ```bash
  # Local working tree
  strix -n -t ./ --scan-mode standard --max-budget 15
  # Chỉ diff của nhánh
  strix -n -t ./ --scope-mode diff --diff-base origin/main --max-budget 10
  ```

### 5. `owasp-top-10-testing`
- **Tác dụng**: Test ứng dụng theo từng hạng mục OWASP Top 10:2025, chỉ báo cáo lỗi thực sự khai thác được, kèm PoC map về từng category.
- **Cách sử dụng**: Khi cần báo cáo bảo mật theo chuẩn OWASP. Dùng phiên bản 2025 (SSRF gộp vào A01, A03 Supply Chain, A10 mới). Chạy qua Strix từng category và báo cáo trung thực phạm vi đã test.

### 6. `managed-pentesting-with-strix`
- **Tác dụng**: Chạy pentest trên nền tảng app.strix.ai — không cần Docker/LLM key, có team dashboard, lịch chạy, webhook, báo cáo PDF/DOCX (Enterprise).
- **Cách sử dụng**:
  ```bash
  curl -sSL https://strix.ai/install | bash   # cài CLI
  strix cloud login
  strix cloud scans start ...
  strix cloud vulns list --scan-id <id> --json
  ```

### 7. `fix-security-vulnerabilities-with-strix`
- **Tác dụng**: Sửa lỗ hổng mà Strix tìm ra — phân loại theo severity, sửa root cause (không sửa payload), chạy lại scan để chứng minh lỗi đã đóng.
- **Cách sử dụng**: Sau khi có báo cáo từ Strix (`strix_runs/<run>/vulnerabilities/*.md` hoặc cloud scan): reproduce bằng PoC → sửa root cause → re-run scan → đánh dấu `strix cloud vulns update <id> --status fixed`.

### 8. `ci-security-scanning-with-strix`
- **Tác dụng**: Tích hợp scan bảo mật vào CI/CD (GitHub Actions, GitLab CI) — mỗi PR được pentest theo diff, chặn merge nếu có lỗi, xuất SARIF + PR comments.
- **Cách sử dụng**: Tạo `.github/workflows/security.yml` chạy Strix trên runner (cần Docker), hoặc dùng managed platform (không cần runner). Build fail (exit code 2) khi có lỗi validated.

### 9. `application-security-testing`
- **Tác dụng**: Điểm vào cho yêu cầu "bảo mật toàn bộ sản phẩm" — xác định asset nào cần test gì (source → code review, web app → pentest, API → API test), chạy từng bước rồi gộp thành kế hoạch khắc phục xếp hạng theo impact đã chứng minh.
- **Cách sử dụng**: Khi chưa rõ cần test loại nào. Trình tự khuyến nghị: (1) review code → (2) pentest staging → (3) thêm CI scanning.

---

## Nhóm 2: Code Review

### 10. `code-review-and-quality`
- **Tác dụng**: Review code đa chiều theo 5 trục: correctness, readability, architecture, security, performance. Tiêu chuẩn approve: thay đổi phải cải thiện sức khỏe codebase (không yêu cầu hoàn hảo).
- **Cách sử dụng**: Trước khi merge bất kỳ thay đổi nào — sau khi xong feature, khi review code của agent/người khác, sau bug fix. Không có ngoại lệ.

### 11. `open-code-review`
- **Tác dụng**: Review code bằng AI qua CLI `ocr` (alibaba/open-code-review) — đọc Git diff, sinh comment review theo từng dòng, có thể tự áp fix.
- **Cách sử dụng**: Cần cài `npm install -g @alibaba-group/open-code-review` + cấu hình LLM provider. Dùng khi review PR, staged/unstaged changes, commit hoặc so sánh branch.

### 12. `open-code-review-delegate`
- **Tác dụng**: Chế độ delegation của `ocr` — OCR chỉ làm phần kỹ thuật (chọn file, resolve rule), còn chính agent (bạn) tự review bằng khả năng LLM của mình. Không cần cấu hình LLM endpoint cho OCR.
- **Cách sử dụng**: Khi muốn agent host tự lái việc review, dùng `ocr` ở delegation mode.

---

## Nhóm 3: Audit

### 13. `security-audit`
- **Tác dụng**: Audit bảo mật codebase theo quy trình 6 pha: Recon → Hunt → Validate → Report → Structured output (`findings.json`) → Independent verification. Chỉ báo cáo lỗi khai thác được với impact thật, không liệt kê lý thuyết.
- **Cách sử dụng**: Khi được yêu cầu "audit bảo mật", "tìm lỗi bảo mật" — output mặc định ghi vào `~/security-audit-skill/<repo>/run-<N>/`. Mỗi lần chạy tìm được ~nửa số lỗi, nên chạy nhiều lần và đọc `findings.json` các run trước để không lặp lại.

### 14. `full-project-audit`
- **Tác dụng**: Audit tự động end-to-end cho **ứng dụng quản lý tài chính** (backend, frontend, database, tính toán tài chính) — phát hiện lỗi, tạo backlog, sửa theo ưu tiên P0/P1, test lại, re-audit, sinh báo cáo. Bảo toàn các invariant tài chính (INCOME/EXPENSE/TRANSFER chính xác tuyệt đối).
- **Cách sử dụng**: Chạy tự động toàn bộ quy trình, không dừng để hỏi ở các bước thường quy không phá hủy. Dùng cho dự án quản lý tài chính.

---

## Nhóm 4: Khác

### 15. `find-skills`
- **Tác dụng**: Tìm và cài skill từ hệ sinh thái skill mã nguồn mở (skills.sh) khi cần thêm năng lực mới. Quy trình: xác định nhu cầu → xem leaderboard → `npx skills find` → xác minh chất lượng (1K+ installs, nguồn uy tín) → đề xuất → cài.
- **Cách sử dụng**:
  ```bash
  npx skills find <từ khóa>                 # tìm skill
  npx skills add <owner/repo@skill> -g -y   # cài global
  npx skills update                         # cập nhật
  ```

### 16. `shop-amazon` (`shop-amazon.md`)
- **Tác dụng**: Skill chuyên biệt `shop-amazon` — hiện là bản định nghĩa khung (placeholder).
- **Cách sử dụng**: Nội dung chi tiết sẽ bổ sung sau.

---

---

## Nhóm 5: Skill Frontend Global (cài qua `npx skills add -g`)

5 skill này được cài ở cấp **global** (`~/.agents/skills/`, symlink vào `~/.claude/skills/`), dùng được ở mọi dự án trên máy, không riêng gì fe-ppe. Không nằm trong `.agent/skills` của dự án.

> Sau khi cài xong phải **khởi động lại session Claude Code** thì skill mới được load.

### Cách kích hoạt

**Cách A — Tự động:** Claude tự nhận diện và áp dụng skill khi yêu cầu khớp (ví dụ: yêu cầu thiết kế UI → `frontend-design` + `web-design-guidelines`; viết component React → `vercel-react-best-practices` + `vercel-composition-patterns`; test tính năng → `webapp-testing`).

**Cách B — Gọi trực tiếp bằng slash command:**

```
/frontend-design
/web-design-guidelines
/vercel-react-best-practices
/vercel-composition-patterns
/webapp-testing
```

### Lưu ý

- `webapp-testing` cần Python + Playwright (skill kèm sẵn script helper `with_server.py`).
- Skill global dùng được ở mọi dự án trên máy, không riêng gì fe-ppe.
- Sau khi khởi động lại, gõ `/frontend-design` thử — nếu hiện ra là đã hoạt động.

---

## Sơ đồ quan hệ nhóm Strix (đọc nhanh)

```
penetration-testing-with-strix  ← skill nền (cài đặt, LLM setup, flags)
 ├── web-app-penetration-testing         (target: web app đang chạy)
 ├── api-security-testing                (target: REST/GraphQL/gRPC API)
 ├── find-security-vulnerabilities-in-code  (target: source code)
 ├── owasp-top-10-testing                (báo cáo theo chuẩn OWASP)
 ├── managed-pentesting-with-strix       (chạy trên cloud, không Docker)
 ├── fix-security-vulnerabilities-with-strix  (sửa lỗi sau khi scan)
 ├── ci-security-scanning-with-strix     (tích hợp CI/CD)
 └── application-security-testing        (điểm vào: chọn đúng test cho từng asset)
```
