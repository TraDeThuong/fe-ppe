# Test Case — Thống Kê Hiệu Năng AI & Giám Sát Mô Hình (/ai-metrics)

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Giám định Hiệu năng AI & Quản trị Mô hình Thị giác Máy tính (`/ai-metrics`) — Băng cờ mô hình đang phục vụ (`ActiveModelBanner`), Thước đo Bento KPI Hiệu năng (`AiMetricsKpiSummary`) & Drawer phân tích sâu (`AiMetricsStatsDetailPanel` đồng bộ URL `?stat=`), Thanh công cụ lọc phiên bản & thời gian (`AiMetricsToolbar`), Hệ thống trực quan hóa chuẩn học máy (Machine Learning Analytics):
> 1. Thẻ đánh giá độ chính xác theo phân lớp đối tượng (`PerClassMetricsCard`: Precision, Recall, F1-Score cho `PERSON`, `HARD_HAT`, `SAFETY_VEST`, `NO_HELMET`, `NO_VEST`)
> 2. Bản đồ nhiệt Ma trận Nhầm lẫn (`ConfusionMatrixHeatmap`: Phân tích True Positive, False Positive, False Negative)
> 3. Biểu đồ biến thiên độ trễ suy luận & FPS thời gian thực (`LatencyChartCard`)
> 4. Bảng quản trị phiên bản & vòng đời mô hình (`ModelGovernanceTable`: Benchmark mAP, Model size, Framework TensorRT/PyTorch)
> 5. Hộp thoại Chuyển đổi mô hình nóng không gián đoạn dịch vụ (`DeployModelDialog` — Zero-Downtime Hot-swap Deployment).
> **Nguồn code:**
> - Trang chính: `app/(auth)/ai-metrics/page.tsx`, `ai-metrics-content.tsx`
> - Components: `src/components/features/ai-metrics/*`
> - Services & Hooks: `src/services/ai-metrics.service.ts`, `src/hooks/ai-metrics/*`
> **Backend Contract:** `smart-ppe-reporting-service` (cổng 8888 tại `/api/v1/statistics/ai-performance` & `/api/v1/ai-models`) và `smart-ppe-ai-service` (cổng 8000).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ AI Metrics |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem chỉ số AI, phân tích nhầm lẫn, quản lý và triển khai mô hình mới |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem độ tin cậy AI để đánh giá chất lượng giám sát an toàn; không có quyền deploy model |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Không có quyền `PPE_AI_METRICS_READ`, bị chặn 403 Forbidden |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `PPE_AI_METRICS_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_reporting_db` (Port 8888) và container `ppe_ai_service` đang hoạt động. Có dữ liệu telemetry AI.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Băng Cờ Mô Hình Đang Triển Khai (ActiveModelBanner)

> **Nguồn code:** `src/components/features/ai-metrics/active-model-banner.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AIM-001 | Render Banner Mô hình Active trong Production | Đăng nhập tài khoản có quyền | Mở `/ai-metrics`, quan sát khối banner trên đầu | Hiển thị thông tin mô hình đang chạy: Tên kiến trúc ("YOLOv8x-PPE-Custom"), Phiên bản (`v2.1.0-prod`), Framework (`TensorRT 8.6 FP16`), Badge xanh lá "ĐANG PHỤC VỤ (ACTIVE)", Ngày triển khai | ✅ |
| AIM-002 | Thống kê nhanh thông số phần cứng GPU | AI service đang hoạt động | Quan sát góc phải banner | Hiển thị: Mức tải GPU (`64%`), VRAM tiêu thụ (`4.2 GB / 8.0 GB`), Trạng thái luồng xử lý TensorRT ổn định | ⬜ |
| AIM-003 | Trạng thái Chưa kích hoạt mô hình nào | Dữ liệu khởi tạo rỗng | Mở trang khi chưa có version active | Hiển thị banner cảnh báo vàng: "Chưa có mô hình AI nào được kích hoạt chính thức. Vui lòng chọn một phiên bản để triển khai." | ⬜ |

---

## 2. Bento KPI & Drawer Chỉ Số Hiệu Năng AI (AiMetricsKpiSummary)

> **Nguồn code:** `src/components/features/ai-metrics/ai-metrics-kpi-summary.tsx`, `src/components/features/ai-metrics/ai-metrics-stats-detail-panel.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AIM-101 | Render 4 thẻ Bento KPI Hiệu năng AI | Đã đăng nhập | Quan sát khối KPI | Hiển thị 4 thẻ: Độ chính xác mAP@50 (`map50` %), Độ trễ suy luận (`latency` ms), Tốc độ xử lý khung hình (`fps`), và Tổng số mẫu suy luận trong 24h (`samples`) | ✅ |
| AIM-102 | Click thẻ mAP@50 mở Drawer phân tích độ chính xác | Đang ở `/ai-metrics` | Click vào thẻ "mAP@50" | Drawer trượt ra từ bên phải, URL cập nhật `?stat=map50`, hiển thị biểu đồ phân rã đường cong Precision-Recall | ✅ |
| AIM-103 | Click thẻ Độ trễ mở Drawer Latency Profiling | Đang ở `/ai-metrics` | Click vào thẻ "Độ trễ suy luận" | Drawer hiển thị chi tiết thời gian tiêu tốn cho từng khâu: Preprocess, TensorRT Inference, NMS (Non-Maximum Suppression), Postprocess; URL `?stat=latency` | ✅ |
| AIM-104 | Click thẻ FPS mở Drawer thông lượng | Đang ở `/ai-metrics` | Click vào thẻ "Tốc độ FPS" | Drawer hiển thị biểu đồ FPS theo từng luồng camera; URL `?stat=fps` | ✅ |
| AIM-105 | Đóng Drawer khôi phục URL | Drawer đang mở | Bấm nút X hoặc phím Escape | Drawer đóng lại, URL xóa param `?stat=` | ✅ |

---

## 3. Đánh Giá Độ Chính Xác Theo Phân Lớp (PerClassMetricsCard)

> **Nguồn code:** `src/components/features/ai-metrics/per-class-metrics-card.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AIM-201 | Render Bảng Đánh giá 5 Phân lớp Đối tượng | Có dữ liệu benchmark | Quan sát khối "Độ chính xác theo phân lớp bảo hộ" | Hiển thị đủ 5 lớp: Người (`PERSON`), Mũ bảo hộ (`HARD_HAT`), Áo phản quang (`SAFETY_VEST`), Không đội mũ (`NO_HELMET`), Không mặc áo (`NO_VEST`) kèm các chỉ số: `Precision`, `Recall`, `F1-Score`, `Support` | ✅ |
| AIM-202 | Đánh giá trực quan bằng thanh tiến trình Neumorphic | Các giá trị từ 0% đến 100% | Quan sát thanh progress bar | Thanh Precision và Recall hiển thị thanh đo Neumorphic lõm sâu, có màu sắc phân bậc: Xanh rêu (> 90%), Vàng cam (75 - 90%), Đỏ gạch (< 75%) | ⬜ |
| AIM-203 | Lọc theo Khoảng thời gian đánh giá (7 ngày / 30 ngày) | Đang hiển thị bảng | Chọn khoảng thời gian "30 ngày qua" trên Toolbar | Các chỉ số tự động tính toán lại theo tập dữ liệu 30 ngày | ⬜ |

---

## 4. Bản Đồ Nhiệt Ma Trận Nhầm Lẫn (ConfusionMatrixHeatmap)

> **Nguồn code:** `src/components/features/ai-metrics/confusion-matrix-heatmap.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AIM-301 | Render Ma trận Nhầm lẫn (Confusion Matrix) | Có ma trận nhãn thực tế vs dự đoán | Quan sát khối "Ma trận Nhầm lẫn (Confusion Matrix)" | Bảng lưới 5x5: Trục tung là Nhãn thực tế (Ground Truth từ Cán bộ an toàn xác nhận), Trục hoành là Nhãn dự đoán của AI | ✅ |
| AIM-302 | Phân bổ màu nhiệt độ (Heatmap Gradient) | Các ô mang giá trị khác nhau | Quan sát các ô lưới | Ô có tỷ lệ cao nhất (đường chéo chính True Positive) mang màu xanh đậm nổi bật; các ô nhầm lẫn (False Positive/Negative) mang màu cam/đỏ nhạt cảnh báo | ⬜ |
| AIM-303 | Tooltip giải thích khi hover vào ô nhầm lẫn | Hover vào ô (Thực tế: `NO_HELMET`, Dự đoán: `HARD_HAT`) | Rê chuột vào ô nhầm lẫn | Hiển thị Tooltip: "Số lượng mẫu bắt nhầm: 18 mẫu (4.2%). Nguyên nhân phổ biến: công nhân đội mũ bảo hiểm xe máy hoặc tóc búi cao." | ⬜ |
| AIM-304 | Chuyển đổi giữa Số lượng mẫu (Count) và Phần trăm (%) | Đang ở ma trận | Bấm nút toggle "Hiển thị Phần trăm (%)" | Các con số trong ô tự động chuyển đổi giữa số lượng đếm tuyệt đối và tỷ lệ % chuẩn hóa | ⬜ |

---

## 5. Biểu Đồ Độ Trễ Suy Luận & FPS Thời Gian Thực (LatencyChartCard)

> **Nguồn code:** `src/components/features/ai-metrics/latency-chart-card.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AIM-401 | Render Biểu đồ Đường biến thiên Độ trễ trong ngày | Có telemetry 24h | Quan sát khối "Độ trễ suy luận & FPS" | Đồ thị 2 trục: Trục trái là Độ trễ ms (đường tím Neumorphic), Trục phải là Tốc độ FPS (đường xanh rêu); biến thiên theo 24 giờ | ✅ |
| AIM-402 | Cảnh báo khi Độ trễ vượt ngưỡng an toàn (> 100ms) | Giờ cao điểm hệ thống tăng tải | Quan sát đồ thị khi có đỉnh đột biến | Vùng đồ thị vượt quá 100ms đổi sang viền đỏ gạch cảnh báo, đánh dấu điểm bottleneck | ⬜ |
| AIM-403 | Thống kê Tỷ lệ Rớt khung hình (Dropped Frames Rate) | Có ghi nhận khung hình rớt | Quan sát nhãn tóm tắt bên dưới chart | Hiển thị tỷ lệ rớt khung hình: ví dụ `0.04%` (Đạt chuẩn thời gian thực) | ⬜ |

---

## 6. Quản Trị Phiên Bản & Chuyển Đổi Mô Hình Nóng (Model Governance & Hot-swap)

> **Nguồn code:** `src/components/features/ai-metrics/model-governance-table.tsx`, `deploy-model-dialog.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AIM-501 | Render Bảng Quản trị Phiên bản Mô hình AI | Kéo xuống khối "Danh sách Phiên bản Mô hình" | Quan sát bảng dữ liệu | Hiển thị các phiên bản: Tên phiên bản (`v1.0.0-base`, `v2.0.0-yolov11`), Kích thước file trọng số (`48.2 MB`), Benchmark mAP@50 (`94.8%`), Framework, Trạng thái, Thao tác | ✅ |
| AIM-502 | Huy hiệu Phiên bản đang chạy (ACTIVE) | Phiên bản đang chạy trong production | Quan sát hàng phiên bản đó | Badge xanh lá "ACTIVE IN PRODUCTION" phát sáng, nút Deploy chuyển sang trạng thái đã kích hoạt | ✅ |
| AIM-503 | Nút "Triển khai phiên bản này" hiển thị cho ADMIN | Đăng nhập ADMIN | Quan sát các hàng phiên bản khác | Thấy nút "Triển khai ngay" (icon Zap) | ✅ |
| AIM-504 | Ẩn nút Triển khai với Manager | Đăng nhập `manager@ppe.local` | Mở `/ai-metrics` | Bảng hiển thị chỉ đọc (Read-only), nút "Triển khai" bị ẩn (RBAC Protection) | ⬜ |
| AIM-505 | Mở Hộp thoại Triển khai Mô hình Nóng (DeployModelDialog) | ADMIN bấm nút "Triển khai ngay" trên bản `v2.0.0` | Hộp thoại mở lên | Hộp thoại xác nhận Neumorphic mở lên: Hiển thị so sánh thông số giữa phiên bản hiện tại vs phiên bản mới (mAP tăng +2.1%, Độ trễ giảm -4ms) | ✅ |
| AIM-506 | Xác nhận Chuyển đổi Mô hình không gián đoạn (Hot-swap) | ADMIN bấm "Xác nhận triển khai" | Chờ xử lý | Gửi PATCH `/api/v1/ai-models/:id/versions/:vId/deploy` -> Backend tải trọng số mới vào bộ nhớ GPU mà không restart container -> Toast "Triển khai mô hình AI thành công" -> Banner trên cùng đổi sang phiên bản mới | ⬜ |

---

## 7. Phân Quyền & Kiểm Soát Truy Cập Route

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| AIM-601 | ADMIN và MANAGER truy cập thành công | Đăng nhập tài khoản có quyền `PPE_AI_METRICS_READ` | Mở `/ai-metrics` | Trang tải mượt mà trong AppShell | ✅ `[E2E]` |
| AIM-602 | SAFETY_OFFICER truy cập bị chặn 403 | Đăng nhập `officer@ppe.local` | Gõ URL `/ai-metrics` | Route Guard chặn hiển thị `ForbiddenView` 403 | ⬜ |
| AIM-603 | USER thông thường bị chặn 403 | Đăng nhập `user@ppe.local` | Gõ URL `/ai-metrics` | Route Guard chặn hiển thị `ForbiddenView` 403 | ⬜ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/ai-metrics` render trong AppShell, phân quyền ADMIN truy cập hợp lệ |
| 2026-10-28 | AI Telemetry & Hot-swap Governance Validation | Đạt | Tích hợp thành công Active Banner, Bento KPI, Per-class breakdown, Confusion matrix heatmap, Latency chart và Hộp thoại Zero-downtime Deploy |
