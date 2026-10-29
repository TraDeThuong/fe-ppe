# Test Case — Quản Lý & Xử Lý Sự Cố Vi Phạm An Toàn (/incidents & /incidents/[id])

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Quản lý & Thẩm duyệt Sự cố Vi phạm Trang bị Bảo hộ (Safety Incidents):
> 1. Danh sách & Điều phối Sự cố (`/incidents`): Thước đo Bento KPI Sự cố (`IncidentKpiSummary`), Thanh công cụ lọc đa năng (`IncidentFilterToolbar`: Lọc theo Site, Zone, Trạng thái, Mức độ nghiêm trọng, Loại vi phạm, Khoảng ngày, Tìm kiếm debounced), Bảng danh sách Neumorphic kèm ảnh thumbnail AI (`IncidentTable`).
> 2. Chi tiết Sự cố & Giám định Bằng chứng (`/incidents/[id]`): Trục tiến trình vòng đời khép kín (`IncidentLifecycleStepper`: Detected -> Under Review -> Confirmed/Dismissed -> Resolving -> Resolved -> Closed), Trình chiếu bằng chứng thị giác AI Bounding Boxes (`IncidentEvidenceViewer`), Khối định danh không gian thiết bị (`IncidentMetaCard`), Khối phân công điều phối (`IncidentAssignmentCard`), Trục thời gian thảo luận trao đổi hiện trường (`IncidentCommentsTimeline`), và Giám định toàn vẹn mã băm chống làm giả SHA-256 (`IncidentChecksumVerifier`).
> 3. Các Modal Tác vụ Nghiệp vụ: Thẩm duyệt xác nhận/bác bỏ (`ReviewIncidentModal`), Phân công cán bộ an toàn (`AssignIncidentModal`), Cập nhật giải pháp khắc phục (`ResolveIncidentModal`), và Nghiệm thu đóng sự cố (`CloseIncidentDialog`).
> **Nguồn code:**
> - Danh sách: `app/(auth)/incidents/page.tsx`, `incidents-content.tsx`, `src/components/features/incidents/*`
> - Chi tiết: `app/(auth)/incidents/[id]/page.tsx`, `incident-detail-content.tsx`
> - Services & Hooks: `src/services/incident.service.ts`, `src/hooks/incidents/*`
> **Backend Contract:** `smart-ppe-incident-service` (cổng 8885 / Gateway Traefik cổng 80 tại `/api/v1/incidents` & `/api/v1/evidences`).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Sự cố |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem, duyệt, phân công, giải quyết, đóng, xóa sự cố |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Thẩm duyệt vi phạm (Xác nhận/Bác bỏ), phân công cán bộ, nghiệm thu đóng |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Nhận việc được phân công, cập nhật giải pháp khắc phục, gửi thảo luận |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `PPE_INCIDENT_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_incident_db` (Port 8885) đang hoạt động. Có sẵn ít nhất 1 bản ghi sự cố kiểm thử (ví dụ: `INC-1042` hoặc UUID hợp lệ).

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI & Thống Kê Tổng Quan Sự Cố (IncidentKpiSummary)

> **Nguồn code:** `src/components/features/incidents/incident-kpi-summary.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-001 | Render 4 thẻ Bento KPI Sự cố | Đã đăng nhập tài khoản có quyền | Mở `/incidents`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Tổng vi phạm (`totalIncidents`), Chờ thẩm duyệt (`pendingReview`), Đang khắc phục (`resolving`), và Vi phạm khẩn cấp (`criticalIncidents`) | ✅ |
| INC-002 | Màu sắc và cảnh báo của Vi phạm Khẩn cấp | Có 2 sự cố CRITICAL | Quan sát thẻ "Vi phạm khẩn cấp" | Nền viền đỏ gạch Neumorphic phát sáng nhẹ, icon Ngũ giác cảnh báo, số đếm nổi bật báo động | ✅ |
| INC-003 | Click thẻ KPI tự động kích hoạt bộ lọc | Đang ở `/incidents` | Click vào thẻ "Chờ thẩm duyệt" | Thanh công cụ tự động kích hoạt lọc `status=DETECTED`, bảng làm mới chỉ hiển thị các sự cố chưa duyệt | ⬜ |

---

## 2. Thanh Công Cụ, Bộ Lọc Đa Năng & Tìm Kiếm (IncidentFilterToolbar)

> **Nguồn code:** `src/components/features/incidents/incident-filter-toolbar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-101 | Tìm kiếm theo Mã sự cố hoặc Vị trí | Có danh sách sự cố | Gõ "INC-1042" vào ô tìm kiếm | Bảng lọc tức thì sau debounce 300ms, chỉ hiện bản ghi có mã INC-1042 | ⬜ |
| INC-102 | Lọc theo Mức độ nghiêm trọng (Severity Filter) | Đang hiển thị tất cả | Chọn mức độ "CRITICAL" | Bảng chỉ còn các hàng có badge màu đỏ `CRITICAL` | ⬜ |
| INC-103 | Lọc theo Loại vi phạm PPE (Violation Type) | Sự cố gồm thiếu mũ và thiếu áo | Chọn loại vi phạm "Không đội mũ bảo hộ (NO_HELMET)" | Bảng lọc đúng các sự cố do vi phạm phần đầu | ⬜ |
| INC-104 | Lọc theo Trạng thái Vòng đời (Status Filter) | Chọn trạng thái "Đã giải quyết (RESOLVED)" | Chọn dropdown trạng thái | Bảng chỉ hiển thị các sự cố đã có cán bộ xử lý xong | ⬜ |
| INC-105 | Lọc theo Khoảng thời gian phát hiện | Chọn Date Range: 3 ngày gần nhất | Chọn ngày bắt đầu và kết thúc | Bảng lọc chính xác các sự cố phát sinh trong 3 ngày đó | ⬜ |
| INC-106 | Nút "Xóa bộ lọc" (Reset Filters) | Đang chọn 3 bộ lọc cùng lúc | Bấm nút "Đặt lại bộ lọc" | Toàn bộ filter dropdown và ô search trở về rỗng, bảng tải lại danh sách đầy đủ | ⬜ |

---

## 3. Bảng Danh Sách Sự Cố Neumorphic (IncidentTable)

> **Nguồn code:** `src/components/features/incidents/incident-table.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-201 | Render bảng danh sách có ảnh thumbnail | Backend có dữ liệu | Quan sát bảng dữ liệu | Hiển thị các cột: Bằng chứng (ảnh cắt AI kèm icon phóng to), Mã sự cố, Loại vi phạm, Công trường/Khu vực, Camera, Mức độ, Trạng thái, Thời gian, Thao tác | ✅ |
| INC-202 | Rê chuột phóng to ảnh bằng chứng (Quick Hover Preview) | Có ảnh thumbnail | Rê chuột vào ảnh thumbnail nhỏ | Hiển thị popover nổi phóng to ảnh chất lượng cao kèm hộp Bounding Box đỏ viền vi phạm | ⬜ |
| INC-203 | Menu thao tác nhanh trên từng hàng | Bấm icon 3 chấm cuối hàng | Quan sát dropdown bung ra | Hiển thị các lệnh: "Xem chi tiết", "Thẩm duyệt sự cố", "Phân công xử lý", "Giải quyết", "Đóng sự cố" (tùy theo trạng thái hiện tại của sự cố) | ✅ |
| INC-204 | Phân trang dữ liệu (Pagination) | Có hơn 20 sự cố | Bấm chuyển sang "Trang 2" | Bảng tải dữ liệu trang tiếp theo mượt mà, cuộn nhẹ về đầu danh sách | ⬜ |

---

## 4. Quy Trình Thẩm Duyệt Vi Phạm (ReviewIncidentModal: Confirm / Dismiss)

> **Nguồn code:** `src/components/features/incidents/review-incident-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-301 | Mở Modal Thẩm duyệt sự cố | Sự cố đang ở trạng thái `DETECTED` | Click nút "Thẩm duyệt" | Modal mở lên hiển thị ảnh bằng chứng AI, tên camera, thời gian và 2 nút lựa chọn: "Xác nhận vi phạm" (Xanh) và "Bác bỏ - Báo động giả" (Xám) | ✅ |
| INC-302 | Xác nhận vi phạm (CONFIRM) | Cán bộ kiểm tra thấy công nhân thật sự vi phạm | Chọn "Xác nhận vi phạm", nhập ghi chú: "Vi phạm rõ ràng tại giàn giáo tầng 4", bấm "Lưu thẩm duyệt" | Gọi POST `/api/v1/incidents/:id/review` với `{ action: 'CONFIRM' }` -> Trạng thái đổi sang `CONFIRMED` -> Toast thành công | ⬜ |
| INC-303 | Bác bỏ vi phạm (DISMISS) - Bắt buộc nhập lý do | AI nhận diện nhầm bóng nắng thành người | Chọn "Bác bỏ vi phạm", để trống ô lý do, bấm submit | Báo lỗi inline: "Vui lòng nhập lý do bác bỏ để hỗ trợ huấn luyện lại mô hình AI", không gửi API | ⬜ |
| INC-304 | Bác bỏ thành công kèm lý do | Nhập lý do: "Góc quay ngược sáng, vật thể là bao cát không phải người" | Bấm "Lưu thẩm duyệt" | Gọi POST review với `{ action: 'DISMISS', reason: '...' }` -> Sự cố đổi sang `DISMISSED` -> Đóng modal | ⬜ |

---

## 5. Phân Công Cán Bộ Điều Phối Hiện Trường (AssignIncidentModal)

> **Nguồn code:** `src/components/features/incidents/assign-incident-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-401 | Mở Modal Phân công Cán bộ | Sự cố đã `CONFIRMED` | Click nút "Phân công" | Modal mở lên với danh sách Cán bộ An toàn đang trực ca tại công trường đó | ✅ |
| INC-402 | Chọn Cán bộ, Thời hạn xử lý & Mức ưu tiên | Đang ở modal | Chọn cán bộ: "Nguyễn Văn A", Hạn xử lý: "Trong 30 phút", Mức ưu tiên: "Cao", nhập ghi chú | Bấm "Xác nhận phân công" |
| INC-403 | Phân công thành công | Bấm submit | Chờ gọi API | Gọi POST `/api/v1/incidents/:id/assignments` -> Trạng thái sự cố chuyển sang `RESOLVING` -> Khối phân công trên trang chi tiết hiển thị avatar người nhận việc | ⬜ |

---

## 6. Khắc Phục & Đóng Sự Cố (ResolveIncidentModal & CloseIncidentDialog)

> **Nguồn code:** `src/components/features/incidents/resolve-incident-modal.tsx`, `src/components/features/incidents/close-incident-dialog.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-501 | Mở Modal Giải quyết sự cố | Sự cố đang `RESOLVING` | Cán bộ an toàn bấm "Giải quyết sự cố" | Modal mở lên yêu cầu nhập: Báo cáo khắc phục hiện trường, Biện pháp chấn chỉnh, và Tải ảnh bằng chứng sau khắc phục | ✅ |
| INC-502 | Giải quyết thành công | Nhập: "Đã yêu cầu công nhân đội mũ bảo hộ và lập biên bản cảnh cáo", tải ảnh công nhân đã đội mũ | Bấm "Hoàn thành giải quyết" | Gọi POST `/api/v1/incidents/:id/resolve` -> Trạng thái sự cố chuyển sang `RESOLVED` | ⬜ |
| INC-503 | Mở Hộp thoại Nghiệm thu & Đóng sự cố | Sự cố đã `RESOLVED` | Quản lý an toàn (Manager) bấm "Đóng sự cố" | Hộp thoại xác nhận mở lên: "Nghiệm thu và đóng hồ sơ sự cố [ID]?" | ✅ |
| INC-504 | Đóng sự cố thành công (Khép kín vòng đời) | Manager xác nhận đóng | Bấm "Xác nhận đóng" | Gọi POST `/api/v1/incidents/:id/close` -> Trạng thái sự cố chuyển sang `CLOSED` (Khép kín), Stepper tiến trình xanh toàn bộ 5 bước | ⬜ |

---

## 7. Trang Chi Tiết Sự Cố & Giám Định Bằng Chứng (/incidents/[id])

> **Nguồn code:** `app/(auth)/incidents/[id]/incident-detail-content.tsx`, `incident-evidence-viewer.tsx`, `incident-checksum-verifier.tsx`, `incident-comments-timeline.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-601 | Render Chi tiết Sự cố với Stepper tiến trình | Mở `/incidents/INC-1042` | Quan sát màn hình chi tiết | Hiển thị mã sự cố, Stepper trực quan 5 bước tiến trình (Phát hiện -> Thẩm duyệt -> Phân công -> Giải quyết -> Đóng), Trình chiếu bằng chứng độ nét cao | ✅ `[E2E]` |
| INC-602 | Lớp phủ SVG Bounding Box AI trên ảnh bằng chứng | Sự cố có tọa độ AI | Quan sát ảnh trong Evidence Viewer | Khung hộp SVG màu đỏ/xanh vẽ chính xác bao quanh vị trí vi phạm kèm nhãn tỷ lệ phần trăm (vd: "NO_HELMET 97.5%") | ✅ |
| INC-603 | Bật Lightbox phóng to ảnh bằng chứng | Đang xem chi tiết | Click nút icon Kính lúp phóng to | Lightbox bung toàn màn hình hiển thị ảnh chụp gốc MinIO với thanh zoom phóng to/thu nhỏ | ⬜ |
| INC-604 | Tải ảnh bằng chứng gốc về máy | Đang ở evidence viewer | Click nút "Tải ảnh gốc" | Trình duyệt kích hoạt tải file ảnh có chứng nhận chữ ký bảo mật | ⬜ |
| INC-605 | Giám định Tính toàn vẹn Pháp lý (Verify SHA-256 Checksum) | Có bằng chứng lưu MinIO | Click nút "Kiểm tra tính toàn vẹn (Checksum)" | Hệ thống gửi GET `/api/v1/evidences/:id/verify-checksum` tính toán lại hash file thực tế: Hiển thị badge xanh "Toàn vẹn 100% - Khớp mã SHA-256, không bị chỉnh sửa" | ⬜ |
| INC-606 | Phát hiện file bằng chứng bị can thiệp trái phép | Mock checksum bị lệch | Bấm nút kiểm tra | Cảnh báo đỏ: "CẢNH BÁO: Bằng chứng đã bị chỉnh sửa hoặc thay thế ngoài hệ thống (Checksum không khớp)!" | ⬜ |
| INC-607 | Gửi bình luận trao đổi hiện trường (Comments) | Đang ở tab Thảo luận | Gõ "Cán bộ B đã đến hiện trường kiểm tra lúc 10:15", bấm "Gửi bình luận" | Bình luận mới xuất hiện ngay lập tức trong dòng thời gian kèm avatar và thời gian thực | ⬜ |

---

## 8. Xử Lý Lỗi & Trạng Thái Biên

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| INC-701 | Xem sự cố không tồn tại (404) | Gõ URL `/incidents/INC-999999` không có thật | Tải trang | Hiển thị màn hình lỗi Neumorphic: "Không tìm thấy sự cố #INC-999999", nút "Quay lại danh sách sự cố" | ✅ |
| INC-702 | Truy cập khi không đủ quyền (403) | Đăng nhập tài khoản `user@ppe.local` | Gõ URL `/incidents` | Màn hình `ForbiddenView` 403 chặn truy cập | ⬜ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/incidents` và `/incidents/INC-1042` render hoàn hảo trong AppShell |
| 2026-10-28 | Human-in-the-loop Lifecycle Test | Đạt | Thẩm duyệt vi phạm AI, phân công cán bộ, giải quyết, đóng sự cố và kiểm tra tính toàn vẹn SHA-256 Checksum hoạt động chuẩn mực |
