# Test Case — Nhật Ký Kiểm Toán & Truy Vết An Ninh (/audit-logs)

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Nhật ký Kiểm toán & Truy vết An ninh Hệ thống (`/audit-logs`) — Thước đo Bento KPI Hoạt động (`AuditKpiSummary`), Các tab phân loại nhanh (`AuditTabs`: Tất cả sự kiện, Thay đổi cấu hình, Thẩm duyệt sự cố PPE), Thanh công cụ lọc đa năng (`AuditFilterToolbar`: Tìm kiếm debounced theo Actor/Tài nguyên/IP, Lọc Action, Lọc Status `SUCCESS`/`FAILED`), Bảng dữ liệu nhật ký bất biến (`AuditLogTable`), Drawer chi tiết bản ghi kiểm toán (`AuditDetailDrawer`), Trình so sánh biến động dữ liệu JSON Diff Before/After (`AuditDiffViewer`), và Hộp thoại trích xuất báo cáo tuân thủ chuẩn pháp lý CSV/JSON (`ExportAuditDialog`).
> **Nguyên tắc kỹ thuật:** Tính Bất Biến & Chống Chối Bỏ (WORM — Write Once, Read Many; hoàn toàn không có API chỉnh sửa hoặc xóa nhật ký).
> **Nguồn code:**
> - Trang chính: `app/(auth)/audit-logs/page.tsx`, `audit-logs-content.tsx`
> - Components: `src/components/features/audit-logs/*`, `src/components/features/audit-logs/modals/*`
> - Services & Hooks: `src/services/audit.service.ts`, `src/hooks/audit/*`
> **Backend Contract:** `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/audit-logs`).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Audit Logs |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem toàn bộ nhật ký, xem chi tiết diff, trích xuất báo cáo CSV/JSON |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem nhật ký kiểm toán và xuất báo cáo phục vụ thanh tra an toàn |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Không có quyền `AUDIT_LOG_READ`, bị chặn 403 Forbidden |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `AUDIT_LOG_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_identity_db` (Port 9999) đang chạy. Có sẵn dữ liệu nhật ký phát sinh từ các thao tác trước.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI & Thống Kê Hoạt Động Kiểm Toán (AuditKpiSummary)

> **Nguồn code:** `src/components/features/audit-logs/audit-kpi-summary.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-001 | Render 4 thẻ Bento KPI Kiểm toán | Đã đăng nhập tài khoản có quyền `AUDIT_LOG_READ` | Mở `/audit-logs`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Tổng sự kiện kiểm toán (`totalLogs`), Thay đổi cấu hình (`configChanges`), Lượt thẩm duyệt vi phạm PPE (`incidentReviews`), và Tỷ lệ thao tác thành công (`successRate` %) | ✅ `[E2E]` |
| AUD-002 | Chỉ báo Tỷ lệ thành công (Success Rate) | Hệ thống có vài thao tác thất bại (401, 403) | Quan sát thẻ Tỷ lệ thành công | Hiển thị tỷ lệ (ví dụ: `98.5%`), thanh tiến trình Neumorphic màu xanh rêu; nếu có nhiều lỗi thì đổi sang cảnh báo vàng | ✅ |
| AUD-003 | Trạng thái Skeleton Loading của KPI | Dữ liệu summary đang tải | Refresh trang | 4 thẻ hiển thị khung xương Skeleton với hiệu ứng sóng Neumorphic | ✅ |
| AUD-004 | Click Thẻ KPI 1 — Tổng sự kiện kiểm toán (totalLogs) | Đang ở `/audit-logs` | Click thẻ "Tổng bản ghi kiểm toán" | Thẻ lún sâu Neumorphic (sunken inset shadow), footer chuyển thành "Thu gọn ^", URL đồng bộ `?stat=total-logs`. Khung chi tiết mở ra bên dưới hiển thị: Phân bổ hành động, Phân bổ theo tài nguyên, Banner cam kết WORM, Top sự kiện gần nhất, Nút xuất báo cáo pháp lý | ✅ `[E2E]` |
| AUD-005 | Click Thẻ KPI 2 — Thay đổi cấu hình (configChanges) | Đang ở `/audit-logs` | Click thẻ "Thay đổi cấu hình" | Thẻ lún sâu, URL đồng bộ `?stat=config-changes`. Khung chi tiết mở ra hiển thị: Thống kê số lượng theo Rules, Camera/ROI, Tham số AI, Phân quyền; Danh sách các lần đổi cấu hình gần đây có nút xem JSON Diff Before/After; Nút chuyển sang Tab Cấu hình | ✅ `[E2E]` |
| AUD-006 | Click Thẻ KPI 3 — Thẩm duyệt sự cố PPE (incidentReviews) | Đang ở `/audit-logs` | Click thẻ "Duyệt sự cố PPE" | Thẻ lún sâu, URL đồng bộ `?stat=incident-reviews`. Khung chi tiết mở ra hiển thị: Lượt thẩm duyệt sự cố an toàn, phân loại đồ bảo hộ (Mũ, Áo, Găng, Kính), Danh sách quyết định của Safety Officer, Nút điều hướng sang `/incidents` | ✅ `[E2E]` |
| AUD-007 | Click Thẻ KPI 4 — Tỷ lệ thành công & An ninh (successRate) | Đang ở `/audit-logs` | Click thẻ "Tỷ lệ thành công" | Thẻ lún sâu, URL đồng bộ `?stat=success-rate`. Khung chi tiết mở ra hiển thị: Chẩn đoán an ninh, danh sách thao tác FAILED gần nhất kèm IP, User-Agent, Thông điệp lỗi phục vụ điều tra pháp y an ninh (Forensic Traceability), Nút lọc nhanh bản ghi FAILED | ✅ `[E2E]` |
| AUD-008 | Thu gọn Khung chi tiết Thống kê (Collapse Panel) | Khung chi tiết đang mở | Click lại vào thẻ stat đang chọn, hoặc click nút "Thu gọn ^" ở footer, hoặc bấm nút X góc phải panel | Khung chi tiết đóng lại mượt mà, thẻ trở về trạng thái phẳng ban đầu, URL tự động xóa tham số `?stat=...` | ✅ `[E2E]` |

---

## 2. Thanh Tab Phân Loại Nhanh & Lọc Theo Chuyên Đề (AuditTabs)

> **Nguồn code:** `src/components/features/audit-logs/audit-tabs.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-101 | Render 3 Tab chuyên đề kiểm toán | Đang ở `/audit-logs` | Quan sát thanh tab dưới KPI | Thấy 3 tab: "Tất cả sự kiện", "Thay đổi cấu hình hệ thống", và "Thẩm duyệt sự cố an toàn" kèm badge số lượng bản ghi tương ứng | ✅ |
| AUD-102 | Chuyển sang Tab "Thay đổi cấu hình" | Đang ở tab Tất cả | Click tab "Thay đổi cấu hình" | Bảng tự động lọc các hành động `action=UPDATE_CONFIG` | ⬜ |
| AUD-103 | Chuyển sang Tab "Thẩm duyệt sự cố an toàn" | Click tab "Thẩm duyệt sự cố" | Bảng tự động lọc các hành động `action=REVIEW_INCIDENT`, hiển thị các quyết định xác nhận/bác bỏ của Cán bộ an toàn | ⬜ |

---

## 3. Thanh Công Cụ, Bộ Lọc & Tìm Kiếm Nâng Cao (AuditFilterToolbar)

> **Nguồn code:** `src/components/features/audit-logs/audit-filter-toolbar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-201 | Tìm kiếm theo Email Người thực hiện (Actor) | Có nhiều người dùng thao tác | Nhập `admin@ppe.local` vào ô tìm kiếm | Bảng lọc tức thì sau debounce 300ms, chỉ hiện các bản ghi do Admin thực hiện | ⬜ |
| AUD-202 | Tìm kiếm theo Địa chỉ IP nguồn | Có sự cố đăng nhập từ IP lạ | Nhập `192.168.1.105` vào ô tìm kiếm | Bảng lọc đúng các sự kiện bắt nguồn từ IP này | ✅ |
| AUD-203 | Lọc theo Loại hành động (Action Filter) | Chọn dropdown Action | Chọn loại hành động: "DELETE" | Bảng lọc chỉ hiển thị các thao tác xóa (xóa camera, xóa site, xóa phân khu) mang badge đỏ | ✅ |
| AUD-204 | Lọc theo Trạng thái Thực thi (SUCCESS / FAILED) | Có bản ghi thất bại | Chọn trạng thái: "FAILED" | Bảng chỉ hiển thị các thao tác bị lỗi hoặc bị hệ thống từ chối | ✅ |
| AUD-205 | Nút "Trích xuất kiểm toán" (Export) hiển thị | ADMIN hoặc MANAGER | Quan sát góc phải toolbar | Thấy nút nổi bật "Xuất báo cáo (CSV/JSON)" | ✅ |
| AUD-206 | Lọc theo Loại tài nguyên tác động (Target Type) | Có nhiều loại tài nguyên | Chọn dropdown: "CAMERA" hoặc "PPE_INCIDENT" | Bảng chỉ hiển thị các sự kiện tác động tới loại tài nguyên đã chọn | ✅ |
| AUD-207 | Nút "Đặt lại bộ lọc" (Reset Filter) | Đang có ít nhất 1 filter kích hoạt | Quan sát toolbar | Nút "Đặt lại bộ lọc" xuất hiện, click vào đưa tất cả bộ lọc về mặc định và quay về trang 1 | ✅ |

---

## 4. Bảng Dữ Liệu Nhật Ký Kiểm Toán (AuditLogTable)

> **Nguồn code:** `src/components/features/audit-logs/audit-log-table.tsx`, `audit-action-badge.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-301 | Render Bảng nhật ký với đầy đủ metadata an ninh | Có dữ liệu kiểm toán | Quan sát bảng dữ liệu | Hiển thị các cột: Thời điểm (ISO & tương đối), Người thực hiện (Avatar + Email + Role), Hành động (Badge phân loại màu), Tài nguyên tác động (Loại & ID), Địa chỉ IP, Trạng thái, Thao tác chi tiết | ✅ |
| AUD-302 | Badge phân loại hành động trực quan | Quan sát các badge hành động | Đọc mã màu | `CREATE`: Xanh lá cây; `UPDATE`: Vàng hổ phách; `DELETE`: Đỏ gạch; `LOGIN`/`LOGOUT`: Tím Neumorphic; `REVIEW`: Xanh rêu | ✅ |
| AUD-303 | Rê chuột xem User-Agent đầy đủ | Hover vào cột IP / Thiết bị | Rê chuột vào icon máy tính | Tooltip hiển thị đầy đủ chuỗi User-Agent: Trình duyệt, Hệ điều hành (vd: `Mozilla/5.0 Mac OS X 14.5...`) | ✅ |
| AUD-304 | Click nút "Xem chi tiết" mở Drawer | Bấm nút icon Con mắt trên một hàng | Click "Xem chi tiết" | Drawer chi tiết `AuditDetailDrawer` mở ra từ cạnh phải màn hình | ✅ |
| AUD-305 | Phân trang nhật ký kiểm toán (Pagination Controls) | Có từ 1 bản ghi trở lên | Quan sát chân bảng | Hiển thị: "Hiển thị X - Y trên tổng Z bản ghi", Nút Trước/Sau bị vô hiệu hóa khi ở đầu/cuối trang, Bộ chọn số lượng bản ghi mỗi trang (10, 20, 50, 100/trang) | ✅ `[E2E]` |

---

## 5. Drawer Chi Tiết Bản Ghi & So Sánh Biến Động JSON Diff (AuditDetailDrawer & AuditDiffViewer)

> **Nguồn code:** `src/components/features/audit-logs/modals/audit-detail-drawer.tsx`, `audit-diff-viewer.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-401 | Render Drawer Chi tiết bản ghi kiểm toán | Drawer đang mở | Quan sát nội dung | Hiển thị thẻ thông tin định danh: Mã bản ghi UUID, Thời gian chính xác đến mili-giây, Người thực hiện, Vai trò lúc thực hiện, Request ID / Trace ID phân tán, Địa chỉ IP | ✅ |
| AUD-402 | Hiển thị Khối So sánh Biến động Dữ liệu (JSON Diff) | Hành động là `UPDATE` (ví dụ sửa ngưỡng phát hiện AI từ 80% lên 90%) | Kéo xuống phần "Biến động Dữ liệu (Changes Diff)" | Trình so sánh `AuditDiffViewer` hiển thị rõ 2 trạng thái: Dòng cũ màu đỏ gạch gạch ngang (`- "confidenceThreshold": 0.8`), Dòng mới màu xanh rêu nổi bật (`+ "confidenceThreshold": 0.9`) | ✅ |
| AUD-403 | So sánh thao tác Tạo mới (CREATE) | Hành động là tạo camera mới | Quan sát khối Diff | Trạng thái cũ là `null`; Trạng thái mới là toàn bộ JSON payload đối tượng vừa được tạo | ⬜ |
| AUD-404 | So sánh thao tác Xóa (DELETE) | Hành động là xóa phân khu | Quan sát khối Diff | Trạng thái cũ là JSON snapshot của đối tượng trước khi xóa; Trạng thái mới là `null` | ⬜ |
| AUD-405 | Nút "Sao chép JSON Snapshot" | Đang xem diff | Click nút "Sao chép JSON" | Toàn bộ payload trước/sau được sao chép vào Clipboard kèm toast xác nhận | ⬜ |
| AUD-406 | Đóng Drawer | Click nút X hoặc bấm phím Escape | Drawer đóng lại mượt mà, trả lại không gian bảng | ⬜ |

---

## 6. Trích Xuất Báo Cáo Kiểm Toán Chuẩn Pháp Lý (ExportAuditDialog)

> **Nguồn code:** `src/components/features/audit-logs/modals/export-audit-dialog.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-501 | Mở Hộp thoại Xuất Báo Cáo Kiểm Toán | Bấm nút "Xuất báo cáo" trên Toolbar | Hộp thoại mở lên | Modal Neumorphic mở lên với các lựa chọn: Định dạng xuất (`CSV` hoặc `JSON`), Khoảng thời gian (7 ngày, 30 ngày, Tất cả), Phân hệ tài nguyên tác động | ✅ |
| AUD-502 | Chọn định dạng CSV phục vụ bảng tính Excel | Chọn định dạng CSV | Chọn radio CSV | File xuất ra chứa các cột chuẩn hóa có thể mở trực tiếp trong Excel | ⬜ |
| AUD-503 | Chọn định dạng JSON phục vụ kiểm toán bảo mật | Chọn định dạng JSON | Chọn radio JSON | File xuất ra chứa đầy đủ payload cấu trúc cây bao gồm cả trường `oldValue` và `newValue` | ⬜ |
| AUD-504 | Xuất file thành công | Bấm nút "Bắt đầu trích xuất" | Chờ xử lý | Gọi API export -> Toast "Trích xuất hồ sơ kiểm toán thành công" -> Trình duyệt tải ngay file `audit-trail-[date].csv` về máy | ⬜ |

---

## 7. Tính Bất Biến Của Nhật Ký (Immutability & Non-Repudiation)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-601 | Không có bất kỳ nút hoặc API Xóa nhật ký | Tìm kiếm trên toàn bộ giao diện | Quan sát bảng dữ liệu và menu | Hoàn toàn KHÔNG có nút "Xóa bản ghi", không có nút "Chỉnh sửa nhật ký" (WORM compliance) | ✅ |
| AUD-602 | Chặn gọi DELETE /api/v1/audit-logs từ mạng ngoài | Dùng Postman hoặc curl gọi DELETE tới `/api/v1/audit-logs/123` | Thực thi request | Gateway hoặc Identity service trả về `405 Method Not Allowed` hoặc `404 Not Found` | ⬜ |

---

## 8. Phân Quyền Route & Guard 403

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AUD-701 | ADMIN và MANAGER truy cập thành công | Đăng nhập tài khoản có quyền `AUDIT_LOG_READ` | Mở `/audit-logs` | Trang tải mượt mà trong AppShell | ✅ `[E2E]` |
| AUD-702 | OFFICER và USER thông thường bị chặn 403 | Đăng nhập `officer@ppe.local` | Gõ URL `/audit-logs` | Route Guard chặn hiển thị `ForbiddenView` 403 | ✅ `[E2E]` |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/audit-logs` render trong AppShell, RBAC Admin truy cập, Officer bị chặn 403 |
| 2026-10-28 | WORM & Fine-Grained JSON Diff Testing | Đạt | Tích hợp thành công Bento Console, AuditTabs, Trình so sánh JSON Diff Before/After và Hộp thoại Export CSV/JSON |
