# Test Case — Bảng Điều Khiển Vận Hành Trung Tâm (Dashboard)

> **Ngày lập:** 2026-10-21 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Bảng Điều Khiển Vận Hành (`/dashboard`) — Băng cờ chào mừng (Hero Welcome Banner), Bộ thẻ chỉ số hiệu năng vận hành an toàn (Operational KPI Cards), Luồng sự cố vi phạm PPE thời gian thực (Realtime Incident Stream), Biểu đồ xu hướng tuân thủ (PPE Compliance Trend Charts), Lưới camera AI trọng điểm (Camera Wall Preview), và Đồng bộ bộ lọc công trường toàn cục (Global Site Context Filtering).
> **Nguồn code:**
> - Trang chính: `app/(auth)/dashboard/page.tsx`, `app/(auth)/dashboard/dashboard-content.tsx`
> - UI & Layout: `src/components/features/app-shell/page-header.tsx`, `src/components/features/app-shell/page-panel.tsx`, `src/components/ui/stats-cards.tsx`
> - Context & Services: `src/contexts/SiteContext.tsx`, `src/contexts/RealtimeContext.tsx`, `src/services/incident.service.ts`, `src/services/camera.service.ts`, `src/services/reporting.service.ts`
> - Hooks: `src/hooks/incidents/use-incidents.ts`, `src/hooks/cameras/use-cameras.ts`, `src/hooks/reporting/use-reporting.ts`
> **E2E tự động:** `scripts/test-dashboard-m2-routes-e2e.py` (Route render & Gating)

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn tiêu biểu |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Xem toàn bộ KPI, tất cả công trường, biểu đồ và điều hướng sự cố |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem KPI, lọc công trường quản lý, xem luồng vi phạm và camera |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Xem chỉ số an toàn hiện trường, nhận cảnh báo vi phạm trực tiếp |
| `user@ppe.local` | `User@123456` | SITE_WORKER (USER) | Xem thông tin tóm tắt cá nhân và nội quy an toàn |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker services (identity, site, camera, incident, reporting, notification SSE) đang hoạt động.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Khối Chào mừng & Thông tin Tổng quan (Hero Welcome Banner)

> **Nguồn code:** `app/(auth)/dashboard/dashboard-content.tsx`, `src/components/features/app-shell/page-header.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DASH-001 | Render Hero Banner với tên người dùng | Đăng nhập tài khoản `admin@ppe.local` | Mở `/dashboard`, quan sát PageHeader trên cùng | Hiển thị tiêu đề "Bảng điều khiển", mô tả "Chào mừng trở lại, Quản Trị Viên", badge "Workspace overview" có icon LayoutDashboard | ✅ `[E2E]` |
| DASH-002 | Hiển thị email nếu chưa có FullName | Đăng nhập tài khoản không có họ tên (chỉ có email) | Mở `/dashboard` | Câu chào mừng tự động hiển thị theo email: "Chào mừng trở lại, worker12@ppe.local" | ⬜ |
| DASH-003 | Trạng thái Loading khi Auth chưa sẵn sàng | Refresh trang với kết nối mạng chậm | Tải trang `/dashboard` | Trong lúc chờ `status === "loading"`, hiển thị placeholder loading Neumorphic mượt mà, không nhảy layout đột ngột | ✅ |
| DASH-004 | Chỉ báo Kết nối Thời gian thực (SSE Status) | RealtimeContext kết nối thành công | Quan sát góc phải banner | Huy hiệu "Trực tuyến (SSE)" phát ánh xanh rêu (pulse animation) biểu thị đường truyền sự cố đang hoạt động | ⬜ |

---

## 2. Bộ Thẻ Chỉ Số An Toàn Trọng Yếu (Operational KPI Cards)

> **Nguồn code:** `src/components/ui/stats-cards.tsx`, `src/services/reporting.service.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DASH-101 | Thẻ "Tỷ lệ tuân thủ PPE" (% Compliance) | Có dữ liệu tổng hợp từ backend | Mở `/dashboard`, quan sát thẻ KPI thứ nhất | Hiển thị tỷ lệ phần trăm (ví dụ: `94.6%`), chỉ số tăng/giảm so với tuần trước (`+1.8%`), thanh tiến trình Neumorphic màu xanh rêu (`#14b8a6`) | ⬜ |
| DASH-102 | Thẻ "Sự cố đang chờ xử lý" (Pending Incidents) | Có 8 sự cố trạng thái DETECTED | Mở `/dashboard`, quan sát thẻ KPI thứ hai | Hiển thị số lượng sự cố (ví dụ: `8`), icon cảnh báo tam giác màu đất nung (`#f87171`), nhãn "Cần thẩm duyệt ngay" | ⬜ |
| DASH-103 | Thẻ "Camera AI đang trực" (Active Streams) | Hệ thống có 14 camera, 12 online | Mở `/dashboard`, quan sát thẻ KPI thứ ba | Hiển thị tỷ lệ `12/14`, badge `85.7%` hoạt động, màu xanh lá cây ổn định | ⬜ |
| DASH-104 | Thẻ "Khu vực nguy cơ cao" (High Risk Zones) | Phân tích vi phạm ghi nhận theo phân khu | Mở `/dashboard`, quan sát thẻ KPI thứ tư | Hiển thị tên khu vực vi phạm nhiều nhất (ví dụ: "Phân khu Giàn giáo B"), số vụ vi phạm trong ngày | ⬜ |
| DASH-105 | Tương tác bấm vào Thẻ KPI | Đang xem danh sách thẻ | Click vào thẻ "Sự cố đang chờ xử lý" | Điều hướng ngay sang `/incidents?status=DETECTED` với bộ lọc được kích hoạt sẵn | ⬜ |
| DASH-106 | Trạng thái Skeleton Loading của KPI | Dữ liệu API đang tải | Quan sát 4 thẻ KPI | Các thẻ hiển thị khung xương Skeleton với hiệu ứng sóng Neumorphic (shimmer effect) | ⬜ |

---

## 3. Luồng Sự Cố Vi Phạm PPE Thời Gian Thực (Realtime Incident Feed)

> **Nguồn code:** `src/contexts/RealtimeContext.tsx`, `src/hooks/incidents/use-incidents.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DASH-201 | Hiển thị danh sách sự cố mới nhất | Backend có dữ liệu sự cố | Mở `/dashboard`, kéo xuống phần "Sự cố an toàn gần đây" | Hiển thị danh sách 5 sự cố mới nhất: ảnh thumbnail cắt từ camera, mã sự cố (`INC-1042`), loại vi phạm (Không đội mũ / Không mặc áo), thời gian tương đối (vd: "2 phút trước") | ⬜ |
| DASH-202 | Tiếp nhận sự cố mới qua SSE | Đang mở Dashboard, AI phát hiện vi phạm mới | Backend phát event SSE `incident.detected` | Một hàng mới trượt êm vào đầu danh sách với viền phát sáng nhẹ, badge số lượng trên KPI tự động nhảy tăng 1 đơn vị | ⬜ |
| DASH-203 | Xem nhanh chi tiết sự cố từ Feed | Có sự cố trong feed | Click vào nút "Xem chi tiết" hoặc ảnh thumbnail | Chuyển hướng tới trang chi tiết sự cố `/incidents/[id]` tương ứng | ⬜ |
| DASH-204 | Trạng thái rỗng (Empty State) | Không có vi phạm nào trong ngày | Mở Dashboard khi công trường 100% tuân thủ | Hiển thị hình minh họa an toàn, thông điệp "Không có vi phạm an toàn nào được ghi nhận hôm nay" | ⬜ |

---

## 4. Biểu Đồ Xu Hướng & Phân Tích Tuân Thủ (Visual Analytics)

> **Nguồn code:** `src/services/reporting.service.ts`, Recharts / Neumorphic Chart Containers

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DASH-301 | Biểu đồ đường xu hướng vi phạm theo giờ | Có số liệu thống kê 24h | Mở Dashboard | Render biểu đồ đường mượt mà: trục hoành là khung giờ (06:00 - 18:00), trục tung là số vụ vi phạm; đường biểu diễn bo góc mềm mại Neumorphic | ⬜ |
| DASH-302 | Chuyển đổi khung thời gian biểu đồ | Đang xem biểu đồ | Bấm nút chuyển tab "Hôm nay" / "7 ngày qua" / "Tháng này" | Biểu đồ chuyển đổi dữ liệu mượt mà bằng CSS transitions mà không reload trang | ⬜ |
| DASH-303 | Tooltip khi rê chuột vào điểm dữ liệu | Đang hiển thị biểu đồ | Di chuột vào đỉnh vi phạm lúc 14:00 | Hiển thị Tooltip kính mờ (glassmorphism): Thời gian, Số lượng vi phạm mũ (`5`), vi phạm áo (`2`), Tỷ lệ tuân thủ giờ đó (`88%`) | ⬜ |
| DASH-304 | Biểu đồ tròn cơ cấu vi phạm PPE | Có dữ liệu phân loại | Quan sát phần Donut chart bên phải | Hiển thị tỷ trọng các loại vi phạm: Không mũ bảo hộ (`65%` - đỏ), Không áo phản quang (`35%` - cam) kèm chú giải rõ ràng | ⬜ |

---

## 5. Lưới Giám Sát Camera AI Trực Tiếp (Live Camera Wall Preview)

> **Nguồn code:** `src/hooks/cameras/use-cameras.ts`, `src/services/camera.service.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DASH-401 | Hiển thị lưới 4 camera trọng yếu | Có danh sách camera ONLINE | Mở Dashboard, quan sát khối "Camera trọng điểm" | Hiển thị lưới 2x2 chứa 4 camera an ninh có rủi ro cao nhất: khung hình video mượt, tên camera, vị trí lắp đặt, badge `ONLINE` màu xanh | ⬜ |
| DASH-402 | Cảnh báo vi phạm trực quan trên màn camera | Camera phát hiện công nhân vi phạm | Quan sát màn camera tương ứng | Khung viền camera nhấp nháy đỏ cảnh báo, hiển thị nhãn vi phạm AI ("NO_HELMET 96%") trên góc video | ⬜ |
| DASH-403 | Nút mở rộng sang Trung tâm Camera | Đang xem lưới camera | Click nút "Xem tất cả camera" | Điều hướng sang `/cameras` ở chế độ Video Wall đầy đủ | ⬜ |

---

## 6. Lọc Theo Công Trường Toàn Cục (Site Context Response)

> **Nguồn code:** `src/contexts/SiteContext.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DASH-501 | Thay đổi SiteSelector trên Header | Đang ở chế độ "Tất cả công trường" | Chọn "Công trường Sài Gòn Marina" trên SiteSelector | Toàn bộ Dashboard tự động cập nhật: KPI chỉ đếm cho Sài Gòn Marina, Feed chỉ hiện sự cố thuộc site này, Lưới camera chuyển sang các góc quay của site này | ⬜ |
| DASH-502 | Khôi phục về chế độ Tất cả công trường | Đang chọn một site cụ thể | Chọn lại "Tất cả công trường" | Dữ liệu lập tức gộp lại toàn hệ thống, query cache React Query trả kết quả ngay không giật lag | ⬜ |
| DASH-503 | Lưu ngữ cảnh Site vào URL hoặc Storage | Đã chọn một site cụ thể | Nhấn F5 tải lại trang | Lựa chọn site được duy trì, không bị reset về mặc định | ⬜ |

---

## 7. Khả Năng Chịu Lỗi & Trạng Thái Mạng (Resilience & Error States)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DASH-601 | Mất kết nối SSE thời gian thực | Server SSE bị ngắt kết nối | Mô phỏng ngắt kết nối mạng SSE | Chỉ báo trên header chuyển sang "Mất kết nối", hệ thống tự động thiết lập cơ chế Polling định kỳ 15s để kéo dữ liệu sự cố thay thế | ⬜ |
| DASH-602 | Tự động kết nối lại khi có mạng | Tiếp tục DASH-601, mạng phục hồi | Khôi phục kết nối mạng | SSE tự động tái kết nối, chỉ báo chuyển xanh "Trực tuyến", dừng polling nền | ⬜ |
| DASH-603 | Lỗi tải số liệu báo cáo 500 | Backend reporting service bảo trì | Tải trang Dashboard khi service 8885 ngắt | Thẻ KPI hiển thị thông báo "Không thể tải số liệu", nút "Thử lại", các phân hệ khác (User, Navigation) vẫn hoạt động bình thường (Graceful Degradation) | ⬜ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/dashboard` render hoàn hảo trong AppShell, PageHeader & PagePanel mẫu |
| 2026-10-28 | Frontend Integration Review | Đạt | Rà soát kiến trúc kết nối SSE từ `smart-ppe-notification-service` và hợp đồng dữ liệu từ `smart-ppe-reporting-service` |
