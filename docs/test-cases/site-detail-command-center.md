# Test Case — Trung Tâm Điều Hành An Toàn Cấp Công Trường (/sites/[id])

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ Trung tâm Điều hành Cấp Công trường (`/sites/[id]`) — Bảng điều khiển tập trung Single-Pane-of-Glass: Hero Banner Định danh & Ban chỉ huy (SiteDetailHero), Thước đo Bento KPI Vận hành (SiteDetailKpiBar), 6 Tab Tác chiến Đa phân hệ:
> 1. Tab Camera AI Trực tiếp (`tab=cameras` — SiteLiveCamerasTab)
> 2. Tab Sự cố Vi phạm PPE Thời gian thực (`tab=incidents` — SiteIncidentsTab)
> 3. Tab Bản đồ Phân khu & Vùng cấm Nguy hiểm (`tab=zones` — SiteSpatialZonesTab)
> 4. Tab Tiêu chuẩn Bảo hộ & Ngưỡng AI (`tab=safety-rules` — SiteSafetyRulesTab)
> 5. Tab Ban Chỉ Huy & Nhân sự Hiện trường (`tab=personnel` — SitePersonnelTab)
> 6. Tab Báo cáo Phân tích An toàn Cấp Site (`tab=analytics` — SiteAnalyticsTab)
> Kèm cơ chế đồng bộ Ngữ cảnh Công trường Toàn cục (Global Site Context Sync) và Xử lý Lỗi/404.
> **Nguồn code:**
> - Route: `app/(auth)/sites/[id]/page.tsx`
> - Core Layout: `src/components/features/sites/detail/site-detail-content.tsx`, `site-detail-hero.tsx`, `site-detail-kpi-bar.tsx`
> - Tabs: `src/components/features/sites/detail/tabs/site-live-cameras-tab.tsx`, `site-incidents-tab.tsx`, `site-spatial-zones-tab.tsx`, `site-safety-rules-tab.tsx`, `site-personnel-tab.tsx`, `site-analytics-tab.tsx`
> - Contexts & Hooks: `src/contexts/SiteContext.tsx`, `src/hooks/sites/use-site-detail.ts`, `src/hooks/cameras/use-cameras.ts`, `src/hooks/incidents/use-incidents.ts`

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên Command Center |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem, điều phối, sửa đổi zone, quy tắc PPE và ban chỉ huy |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Điều hành công trường, duyệt sự cố, cấu hình an toàn, gọi hotline |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Xem camera trực tiếp, xử lý vi phạm hiện trường, theo dõi nhân sự |
| `user@ppe.local` | `User@123456` | USER | Không có quyền, bị Route Guard chặn sang màn hình 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker services site (`ppe_site_db`), camera, incident, reporting đang hoạt động. Có sẵn ít nhất 1 site test (ví dụ ID: `01a18193-77a8-74e8-bf1d-5fbfbf6627b9`).

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Hero Banner, Thông Tin Nhận Diện & Ban Chỉ Huy (SiteDetailHero)

> **Nguồn code:** `src/components/features/sites/detail/site-detail-hero.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-001 | Render Hero Banner với ID công trường hợp lệ | Mở `/sites/[id]` với ID có thật | Quan sát khối Hero trên cùng | Hiển thị nút "← Quay lại danh sách", Tên công trường (H1), Mã định danh, Badge trạng thái `ACTIVE` màu xanh rêu, Địa chỉ GPS thực tế | ✅ |
| SDC-002 | Thẻ danh bạ Trưởng ban An toàn (Safety Lead) | Site đã gán Cán bộ chỉ huy | Quan sát khối Ban Chỉ Huy góc phải Hero | Hiển thị Avatar, Họ tên Cán bộ an toàn trưởng, Chức danh, Số điện thoại và nút icon gọi nhanh (`tel:...`) | ✅ |
| SDC-003 | Nút thao tác nhanh "Chỉnh sửa công trường" | Quyền ADMIN hoặc MANAGER | Click nút "Chỉnh sửa" trên Hero | Modal `EditSiteModal` mở lên cho phép sửa Tên, Địa chỉ, Mô tả của công trường này | ✅ |
| SDC-004 | Nút "Cấu hình Quy tắc An toàn" | Có quyền cấu hình | Click nút "Quy tắc an toàn" | Modal `SiteSafetyConfigModal` mở lên với ngữ cảnh của site hiện tại | ✅ |
| SDC-005 | Nút "← Quay lại" danh sách | Đang ở `/sites/[id]` | Click nút "← Quay lại danh sách" | Điều hướng mượt mà về trang tổng quan `/sites` | ✅ |
| SDC-006 | Đồng bộ Ngữ cảnh SiteContext Toàn cục | Đang ở chế độ "Tất cả công trường" | Truy cập `/sites/01a18193...` | Header toàn cục `SiteSelector` tự động cập nhật tên công trường đang mở, không cần chọn thủ công | ✅ |

---

## 2. Thước Đo Bento KPI Vận Hành Cấp Site (SiteDetailKpiBar)

> **Nguồn code:** `src/components/features/sites/detail/site-detail-kpi-bar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-101 | Thẻ "Camera AI đang trực" (Active Cameras) | Site có 8 camera, 7 online | Quan sát thẻ KPI thứ nhất | Hiển thị `7/8 Đang trực`, tỷ lệ `87.5%`, icon Camera xanh rêu Neumorphic | ✅ |
| SDC-102 | Thẻ "Sự cố chờ xử lý" (Pending Incidents) | Site có 3 sự cố chưa duyệt | Quan sát thẻ KPI thứ hai | Hiển thị con số `3`, nhãn "Cần giải quyết", icon Cảnh báo tam giác đỏ gạch | ✅ |
| SDC-103 | Thẻ "Tỷ lệ tuân thủ an toàn" (% Compliance) | Có dữ liệu tính toán từ reporting-service | Quan sát thẻ KPI thứ ba | Hiển thị tỷ lệ (ví dụ: `96.2%`), đánh giá mức "Xuất sắc", thanh tiến trình Neumorphic | ✅ |
| SDC-104 | Thẻ "Tổng phân khu & Vùng cấm" | Site có 4 zones, 2 vùng cấm | Quan sát thẻ KPI thứ tư | Hiển thị `4 Phân khu · 2 Vùng cấm nguy hiểm`, icon Layers nổi | ✅ |
| SDC-105 | Bấm thẻ KPI tự động chuyển Tab tương ứng | Đang ở tab bất kỳ | Click vào thẻ "Sự cố chờ xử lý" | Tự động kích hoạt chuyển sang Tab 2: Sự cố vi phạm PPE (`tab=incidents`), URL cập nhật đồng bộ | ⬜ |

---

## 3. Tab 1: Camera AI Trực Tiếp & Luồng Giám Sát (SiteLiveCamerasTab)

> **Nguồn code:** `src/components/features/sites/detail/tabs/site-live-cameras-tab.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-201 | Render danh sách camera lắp đặt tại site | Chọn Tab "Camera trực tiếp" | Quan sát lưới camera | Hiển thị toàn bộ camera thuộc site này: Ảnh live preview, Tên camera, Phân khu lắp đặt, Badge trạng thái `ONLINE`/`OFFLINE` | ✅ |
| SDC-202 | Bộ lọc camera theo phân khu trong site | Site có nhiều phân khu | Chọn filter phân khu "Zone A - Hầm móng" | Lưới camera chỉ còn hiển thị các camera gắn tại Zone A | ⬜ |
| SDC-203 | Xem video trực tiếp toàn màn hình | Camera có luồng video | Click vào màn hình camera bất kỳ | Khung video mở rộng, trình phát HLS/WebRTC streaming thời gian thực với độ trễ thấp | ⬜ |
| SDC-204 | Chuyển tiếp tới trang Chi tiết Camera AI | Click nút "Chi tiết AI" trên camera | Click vào nút "Xem phân tích chi tiết" | Điều hướng sang `/cameras/[cameraId]` mở đầy đủ bảng thông số AI và Bounding Boxes | ⬜ |
| SDC-205 | Trạng thái site chưa gắn camera nào | Site mới tạo chưa có camera | Mở tab Camera | Hiển thị Empty State Neumorphic: "Chưa có camera nào được lắp đặt tại công trường này" kèm nút "+ Thêm Camera" | ⬜ |

---

## 4. Tab 2: Sự Cố Vi Phạm PPE Thời Gian Thực (SiteIncidentsTab)

> **Nguồn code:** `src/components/features/sites/detail/tabs/site-incidents-tab.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-301 | Render danh sách vi phạm riêng của site | Chọn Tab "Sự cố PPE" | Quan sát bảng vi phạm | Hiển thị các sự cố phát hiện tại site này: Thumbnail cắt từ AI, Mã sự cố, Loại vi phạm (Không mũ/Không áo), Mức độ rủi ro, Trạng thái | ✅ |
| SDC-302 | Lọc sự cố theo Mức độ nghiêm trọng | Có sự cố CRITICAL và MEDIUM | Chọn bộ lọc mức độ "Khẩn cấp (CRITICAL)" | Bảng lọc đúng các vi phạm nguy hiểm cần can thiệp ngay lập tức | ⬜ |
| SDC-303 | Nút Thẩm duyệt Nhanh (Quick Confirm/Dismiss) | Quyền Cán bộ an toàn | Bấm nút "Xác nhận vi phạm" trực tiếp trên hàng | Gọi API duyệt sự cố mà không cần chuyển trang, hàng cập nhật sang trạng thái `CONFIRMED` | ⬜ |
| SDC-304 | Xem chi tiết sự cố đầy đủ | Có sự cố trong bảng | Click vào mã sự cố | Điều hướng sang `/incidents/[incidentId]` để xem ảnh bằng chứng lớn và checksum | ⬜ |

---

## 5. Tab 3: Bản Đồ Phân Khu & Vùng Cấm Nguy Hiểm (SiteSpatialZonesTab)

> **Nguồn code:** `src/components/features/sites/detail/tabs/site-spatial-zones-tab.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-401 | Hiển thị bảng Phân khu & Vùng cấm song song | Chọn Tab "Phân khu & Vùng cấm" | Quan sát 2 cột giao diện | Cột trái: Danh sách các Zone kèm số lượng camera; Cột phải: Danh sách Vùng cấm nguy hiểm có cờ cảnh báo đỏ | ✅ |
| SDC-402 | Thêm Phân khu mới ngay tại chỗ (Inline Add) | ADMIN hoặc MANAGER | Nhập tên "Khu Vực Bốc Dỡ Hàng", mô tả, bấm "Tạo phân khu" | Gọi POST `/api/v1/sites/:id/zones`, phân khu mới xuất hiện ngay lập tức trong bảng | ⬜ |
| SDC-403 | Thêm Vùng cấm nguy hiểm với Đa giác | Cần khoanh vùng hố thang máy | Nhập tên vùng cấm "Khu Vực Cẩu Tháp 01", mức phạt: "Nghiêm trọng", tọa độ đa giác, bấm "Lưu vùng cấm" | Vùng cấm mới được kích hoạt, AI sẽ phát hiện và báo động ngay khi có người xâm nhập | ⬜ |
| SDC-404 | Xóa Vùng cấm | Vùng cấm không còn sử dụng | Bấm nút Thùng rác trên vùng cấm -> xác nhận | Vùng cấm bị gỡ bỏ, giải phóng phạm vi cảnh báo AI | ⬜ |

---

## 6. Tab 4: Tiêu Chuẩn Bảo Hộ Bắt Buộc & Ngưỡng AI (SiteSafetyRulesTab)

> **Nguồn code:** `src/components/features/sites/detail/tabs/site-safety-rules-tab.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-501 | Xem ma trận quy tắc bảo hộ của công trường | Chọn Tab "Tiêu chuẩn bảo hộ" | Quan sát các thẻ quy tắc | Hiển thị công tắc của 4 loại trang bị: Mũ bảo hộ (Hard Hat), Áo phản quang (Safety Vest), Giày bảo hộ (Boots), Dây an toàn giàn giáo (Harness) | ✅ |
| SDC-502 | Điều chỉnh Ngưỡng phát hiện AI (AI Sensitivity) | Có quyền cấu hình an toàn | Kéo Slider "Ngưỡng phát hiện mũ" từ 85% sang 92% | Giá trị nhạy hiển thị cập nhật trực quan; bấm "Lưu quy chuẩn" để gửi PUT lên backend | ⬜ |
| SDC-503 | Cấu hình Giờ giới nghiêm ca đêm | Công trường thi công 24/7 | Bật công tắc "Tăng cường độ nhạy ban đêm (18:00 - 06:00)" | Hệ thống tự động kích hoạt chế độ hồng ngoại và hạ ngưỡng nhận diện ánh sáng yếu | ⬜ |

---

## 7. Tab 5: Ban Chỉ Huy, Ca Trực & Danh Bạ Khẩn Cấp (SitePersonnelTab)

> **Nguồn code:** `src/components/features/sites/detail/tabs/site-personnel-tab.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-601 | Hiển thị Danh bạ Ban Chỉ Huy an toàn | Chọn Tab "Ban chỉ huy" | Quan sát thẻ nhân sự | Hiển thị thẻ thông tin của Chỉ huy trưởng, Trưởng ban an toàn, Cán bộ y tế hiện trường kèm ảnh đại diện và số điện thoại | ✅ |
| SDC-602 | Nút Bấm Gọi Khẩn Cấp (Emergency Hotline) | Người dùng mở trên điện thoại / tablet | Bấm nút "Gọi khẩn cấp" trên thẻ Trưởng ban | Trình duyệt kích hoạt giao diện quay số điện thoại tức thì (`tel:0901234567`) | ⬜ |
| SDC-603 | Danh sách Nhà thầu phụ & Số lượng công nhân | Có dữ liệu nhà thầu | Quan sát bảng nhà thầu | Hiển thị danh sách các đơn vị thi công (Cốp pha, Thép, Điện lạnh), số lượng công nhân hiện diện trong ca và số lần vi phạm PPE | ⬜ |

---

## 8. Tab 6: Báo Cáo Phân Tích & Biểu Đồ Rủi Ro (SiteAnalyticsTab)

> **Nguồn code:** `src/components/features/sites/detail/tabs/site-analytics-tab.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-701 | Biểu đồ xu hướng tuân thủ theo tuần của site | Chọn Tab "Phân tích an toàn" | Quan sát biểu đồ đường | Render biểu đồ tuân thủ 7 ngày qua của riêng site này, so sánh với mức trung bình toàn dự án | ✅ |
| SDC-702 | Biểu đồ nhiệt vi phạm theo khung giờ (Peak Hours) | Có số liệu thống kê | Quan sát biểu đồ cột giờ cao điểm | Nhận diện rõ khung giờ vi phạm nhiều nhất (ví dụ: 13:30 sau giờ nghỉ trưa) | ⬜ |
| SDC-703 | Nút "Xuất Báo Cáo Tuân Thủ Nhanh (PDF)" | Quản lý an toàn cần báo cáo | Click nút "Tải báo cáo tuần (PDF)" | Hệ thống kích hoạt API sinh báo cáo PDF cho site này và tải về máy | ⬜ |

---

## 9. Xử Lý Lỗi, 404 & Khả Năng Phục Hồi

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SDC-801 | Truy cập ID công trường không tồn tại (404) | Gõ URL `/sites/00000000-0000-0000-0000-000000000000` | Tải trang | Hiển thị màn hình lỗi Neumorphic: "Không tìm thấy công trường", mô tả chi tiết kèm nút "Quay lại danh sách công trường" | ⬜ |
| SDC-802 | Truy cập khi không đủ quyền (403) | Đăng nhập tài khoản `user@ppe.local` | Gõ trực tiếp URL `/sites/[id]` | Route Guard chặn hiển thị `ForbiddenView` 403 chuẩn mực | ⬜ |
| SDC-803 | Điều hướng Tab qua Query Param trên URL | Người dùng gõ trực tiếp URL | Paste `/sites/[id]?tab=zones` | Trang mở lên tự động kích hoạt ngay Tab 3: Bản đồ Phân khu & Vùng cấm | ✅ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-28 | Frontend Architecture Validation | Đạt | Toàn bộ 6 Tabs tác chiến, Hero Banner và Bento Bar được thiết kế đồng bộ Neumorphism |
| 2026-10-28 | Integration Review | Đạt | Kết nối thành công các hooks `useSiteDetail`, `useCameras`, `useIncidents` và cơ chế đồng bộ `SiteContext` |
