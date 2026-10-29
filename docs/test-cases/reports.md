# Test Case — Trung Tâm Báo Cáo & Phân Tích An Toàn (/reports)

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Trung tâm Báo cáo & Phân tích Dữ liệu An toàn Lao động (`/reports`) — Thước đo Bento KPI Báo cáo (`ReportKpiSummary`) & Drawer phân tích sâu (`ReportStatsDetailPanel` đồng bộ URL `?stat=`), Thanh điều hướng & bộ lọc thời gian (`ReportFilterToolbar`), Hệ thống biểu đồ trực quan đa chiều:
> 1. Biểu đồ đường xu hướng vi phạm theo thời gian (`ReportTrendChart`)
> 2. Biểu đồ bánh phân loại tỷ trọng vi phạm PPE (`ReportViolationDonut`)
> 3. Bảng xếp hạng điểm nóng rủi ro Camera (`ReportCameraRanking`)
> Danh mục mẫu báo cáo tuân thủ chuẩn hóa (`ReportTemplateCards`), Modal kích hoạt tiến trình tạo báo cáo tự động (`GenerateReportModal`), và Bảng hàng đợi & lịch sử xuất báo cáo PDF/Excel/CSV (`ReportHistoryTable`).
> **Nguồn code:**
> - Trang chính: `app/(auth)/reports/page.tsx`, `reports-content.tsx`
> - Components: `src/components/features/reports/*`
> - Hooks & Services: `src/services/reporting.service.ts`, `src/hooks/reporting/*`
> **Backend Contract:** `smart-ppe-reporting-service` (cổng 8888 / Gateway Traefik cổng 80 tại `/api/v1/statistics` & `/api/v1/reports`).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Báo cáo |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem thống kê, cấu hình mẫu báo cáo, xuất file PDF/Excel/CSV |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem phân tích an toàn, trích xuất báo cáo tuân thủ của công trường quản lý |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Xem biểu đồ thống kê cơ bản; không có quyền tạo báo cáo tổng hợp |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `PPE_REPORTING_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_reporting_db` (Port 8888) đang hoạt động. Có sẵn dữ liệu tổng hợp sự cố (aggregation data).

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI & Drawer Phân Tích Chỉ Số Chi Tiết (ReportKpiSummary)

> **Nguồn code:** `src/components/features/reports/report-kpi-summary.tsx`, `src/components/features/reports/report-stats-detail-panel.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REP-001 | Render 4 thẻ Bento KPI Báo cáo | Đã đăng nhập tài khoản có quyền | Mở `/reports`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Tổng số vi phạm (`totalViolations`), Tỷ lệ tuân thủ (`complianceRate` %), Thời gian xử lý trung bình MTTR (`mttr`), và Báo cáo đã xuất (`reportsCount`) | ✅ |
| REP-002 | Click thẻ Tổng vi phạm mở Drawer phân tích | Đang ở `/reports` | Click vào thẻ "Tổng số vi phạm" | Drawer trượt ra từ bên phải, URL cập nhật `?stat=violations`, hiển thị bảng phân tích vi phạm chi tiết theo ca làm việc | ✅ |
| REP-003 | Click thẻ Tỷ lệ tuân thủ mở Drawer | Đang ở `/reports` | Click vào thẻ "Tỷ lệ tuân thủ" | Drawer hiển thị biểu đồ tuân thủ theo từng công trường; URL cập nhật `?stat=compliance` | ✅ |
| REP-004 | Click thẻ MTTR mở Drawer phân tích tốc độ xử lý | Đang ở `/reports` | Click vào thẻ "Thời gian xử lý trung bình (MTTR)" | Drawer hiển thị biểu đồ phân bổ thời gian phản hồi của các Cán bộ An toàn (vd: `18.5 phút`), URL `?stat=mttr` | ✅ |
| REP-005 | Đóng Drawer khôi phục URL | Drawer đang mở | Click nút X hoặc bấm phím Escape | Drawer đóng lại, URL xóa sạch param `?stat=` | ✅ |

---

## 2. Thanh Công Cụ Lọc Thời Gian & Công Trường (ReportFilterToolbar)

> **Nguồn code:** `src/components/features/reports/report-filter-toolbar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REP-101 | Lọc báo cáo theo Công trường | Đang xem toàn hệ thống | Chọn công trường "Landmark 81" | Toàn bộ số liệu KPI, biểu đồ xu hướng và danh sách xếp hạng camera lọc chỉ theo Landmark 81 | ⬜ |
| REP-102 | Chuyển đổi khoảng thời gian nhanh (7 ngày, 30 ngày, 90 ngày) | Mặc định đang ở 30 ngày | Bấm chọn preset "7 ngày qua" | Biểu đồ làm mới hiển thị số liệu 7 ngày gần nhất với bước nhảy theo ngày | ⬜ |
| REP-103 | Tùy chọn khoảng ngày bắt đầu - kết thúc | Cần báo cáo cho đợt kiểm tra tuần trước | Chọn Custom Date Range từ `2026-10-15` đến `2026-10-22` | API gửi query `fromDate=2026-10-15&toDate=2026-10-22` -> Biểu đồ cập nhật đúng khoảng thời gian | ⬜ |
| REP-104 | Nút "Làm mới dữ liệu" (Refresh) | Đang ở trang báo cáo | Bấm nút icon Refresh trên Header | Kích hoạt gọi lại đồng thời các queries `useReportSummary`, `useViolationTrends`, `useViolationDistribution` | ✅ |

---

## 3. Hệ Thống Biểu Đồ Trực Quan Đa Chiều (Visual Charts)

> **Nguồn code:** `src/components/features/reports/report-trend-chart.tsx`, `report-violation-donut.tsx`, `report-camera-ranking.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REP-201 | Render Biểu đồ đường Xu hướng vi phạm theo ngày | Có dữ liệu trends | Quan sát khối "Xu hướng vi phạm theo thời gian" | Biểu đồ đường Neumorphic hiển thị biến thiên vi phạm: đường cong mượt mà, các điểm nút tròn phát sáng nhẹ, trục ngày/tháng rõ ràng | ✅ |
| REP-202 | Tooltip chi tiết khi di chuột trên Biểu đồ đường | Đang hiển thị chart | Hover vào điểm ngày `2026-10-20` | Tooltip kính mờ hiện lên: Ngày, Tổng vi phạm (`14`), Thiếu mũ (`9`), Thiếu áo (`5`) | ⬜ |
| REP-203 | Render Biểu đồ bánh Cơ cấu vi phạm PPE (Donut) | Có dữ liệu phân loại | Quan sát khối "Phân loại vi phạm bảo hộ" | Biểu đồ Donut Neumorphic hiển thị tỷ trọng: Cung tròn đỏ `Không mũ (62%)`, Cung tròn cam `Không áo (38%)` kèm tổng số vụ ở tâm | ✅ |
| REP-204 | Render Bảng xếp hạng Điểm nóng Camera (Top Cameras) | Có camera ghi nhận vi phạm | Quan sát khối "Top Camera vi phạm nhiều nhất" | Biểu đồ thanh ngang xếp hạng 5 camera có số vụ vi phạm cao nhất kèm tên vị trí (vd: `CAM-CRANE-01: 34 vụ`) | ✅ |
| REP-205 | Click thanh Camera chuyển sang xem luồng Camera | Đang xem bảng xếp hạng | Click vào thanh camera `CAM-CRANE-01` | Điều hướng ngay sang trang `/cameras/[id]` của camera đó | ⬜ |

---

## 4. Mẫu Báo Cáo Chuẩn Hóa & Kích Hoạt Tạo File (Report Templates & Generation)

> **Nguồn code:** `src/components/features/reports/report-template-cards.tsx`, `generate-report-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REP-301 | Render danh sách các Mẫu Báo cáo Tiêu chuẩn | Tab Báo cáo mở | Quan sát khối "Mẫu báo cáo tiêu chuẩn" | Hiển thị các thẻ mẫu: "Báo cáo Tuân thủ Hàng ngày (Daily)", "Báo cáo Tổng kết Tháng (Monthly)", "Hồ sơ Thanh tra Kiểm toán (Audit Compliance)" | ✅ |
| REP-302 | Nút "Xuất báo cáo ngay" trên thẻ Mẫu | ADMIN hoặc MANAGER | Click nút "Xuất báo cáo" trên thẻ Daily Report | Modal `GenerateReportModal` mở lên với template Daily được chọn sẵn | ✅ |
| REP-303 | Nút "+ Tạo báo cáo mới" trên Header | Có quyền export | Click nút "+ Tạo báo cáo" trên PageHeader | Modal `GenerateReportModal` mở lên | ✅ |
| REP-304 | Ẩn nút tạo báo cáo với Officer/User | Đăng nhập `officer@ppe.local` | Mở `/reports` | Nút "+ Tạo báo cáo" bị ẩn hoàn toàn (RBAC Protection) | ⬜ |
| REP-305 | Chọn định dạng xuất file: PDF, EXCEL, CSV | Đang ở modal xuất báo cáo | Chọn định dạng `PDF` (hoặc `EXCEL`) | Nút radio Neumorphic kích hoạt nổi bật | ⬜ |
| REP-306 | Tùy chọn đính kèm ảnh bằng chứng snapshot | Modal xuất báo cáo | Bật checkbox "Đính kèm ảnh snapshot vi phạm" | Báo cáo PDF sẽ chèn các hình ảnh bằng chứng cắt từ camera | ⬜ |
| REP-307 | Kích hoạt tạo báo cáo thành công (Asynchronous Queue) | Điền đủ thông tin | Bấm nút "Bắt đầu xuất báo cáo" | Gọi POST `/api/v1/reports/generate` -> Toast "Tiến trình tạo báo cáo đã được đưa vào hàng đợi" -> Modal đóng -> Bản ghi mới xuất hiện trong Bảng Lịch sử với trạng thái `PENDING` | ⬜ |

---

## 5. Hàng Đợi & Lịch Sử Xuất Báo Cáo (ReportHistoryTable)

> **Nguồn code:** `src/components/features/reports/report-history-table.tsx`, `src/services/reporting.service.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REP-401 | Render Bảng Lịch sử Xuất file | Kéo xuống cuối trang `/reports` | Quan sát bảng lịch sử | Hiển thị các cột: Tên báo cáo, Định dạng (Badge PDF đỏ / Excel xanh lá), Phạm vi công trường, Thời gian tạo, Trạng thái, Thao tác | ✅ |
| REP-402 | Cập nhật trạng thái sinh file tự động (Polling) | Báo cáo đang ở trạng thái `PROCESSING` | Chờ tiến trình nền hoàn tất | Trạng thái tự động chuyển từ spinner xoay sang badge xanh `COMPLETED` mà không cần F5 | ⬜ |
| REP-403 | Nút "Tải về" (Download) khi file đã sẵn sàng | Báo cáo có trạng thái `COMPLETED` | Bấm nút "Tải về" (icon Download) | Trình duyệt kích hoạt tải file `.pdf` hoặc `.xlsx` về máy người dùng | ⬜ |
| REP-404 | Trạng thái file bị lỗi (FAILED) | Dịch vụ sinh file gặp lỗi bộ nhớ | Trạng thái báo `FAILED` | Badge chuyển đỏ, rê chuột vào hiện lý do lỗi kèm nút "Thử lại" | ⬜ |
| REP-405 | Cảnh báo liên kết tải hết hạn (Expired Link) | Báo cáo tạo từ hơn 7 ngày trước | Quan sát nút tải | Nút tải chuyển sang màu xám vô hiệu hóa kèm nhãn "Đã hết hạn lưu trữ" | ⬜ |

---

## 6. Xử Lý Lỗi & Phân Quyền Route

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| REP-501 | Dịch vụ Reporting Service ngừng hoạt động (500) | Tắt container `ppe_reporting_service` | Tải trang `/reports` | Khối biểu đồ hiển thị Empty State lỗi: "Không thể kết nối dịch vụ báo cáo", nút "Thử lại", không làm đơ giao diện tổng thể | ⬜ |
| REP-502 | USER thông thường truy cập `/reports` | Đăng nhập tài khoản `user@ppe.local` | Gõ URL `/reports` | Route Guard chặn và render `ForbiddenView` 403 | ⬜ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/reports` render trong AppShell, phân quyền ADMIN truy cập hợp lệ |
| 2026-10-28 | Analytics & Export Engine Validation | Đạt | Tích hợp thành công Bento Console, Drawer chi tiết `?stat=`, Biểu đồ đường, Donut, Xếp hạng camera và Hàng đợi xuất báo cáo |
