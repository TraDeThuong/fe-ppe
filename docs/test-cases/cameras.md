# Test Case — Quản Lý Camera & Thị Giác AI (/cameras & /cameras/[id])

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Quản lý Camera, Tường Video Giám sát và Trạm Thị giác AI Thông minh:
> 1. Trang Quản lý & Giám sát Tổng thể (`/cameras`): Bento KPI & Drawer chỉ số chi tiết (`CameraKpiSummary`, `CameraStatsDetailPanel`), Thanh công cụ lọc & tìm kiếm debounced (`CameraToolbar`), Chuyển đổi 3 chế độ xem: Thẻ lưới (`grid`), Bảng quản lý (`table`), và Tường video tác chiến đa luồng (`wall` với các layout `1x1`, `2x2`, `3x3`), Trình phát video Neumorphic (`CameraVideoPlayer`), Modal Thêm/Sửa/Xóa camera (`CreateCameraModal`, `EditCameraModal`, `DeleteCameraDialog`), Drawer Cấu hình Vùng nhận diện AI (`CameraRoiDrawer`, `CameraRoiCanvas`), Hộp thoại Kiểm tra Nhịp tim & Độ trễ Ping (`CameraHealthDialog`).
> 2. Trạm Phân tích Thị giác AI Thời gian thực (`/cameras/[id]`): Trình phát video phân tích tích hợp lớp phủ Canvas Bounding Boxes (`CameraIntelligencePlayer`), Engine bám vết thực thể thời gian thực (`live-tracking-engine.ts`), Bảng telemetry suy luận AI & Nhật ký phát hiện vi phạm PPE (`CameraTelemetryTables`), Sidebar điều phối camera (`CameraIntelligenceSidebar`).
> **Nguồn code:**
> - Danh sách: `app/(auth)/cameras/page.tsx`, `cameras-content.tsx`, `src/components/features/cameras/*`
> - Chi tiết AI: `app/(auth)/cameras/[id]/page.tsx`, `src/components/features/cameras/detail/*`
> - Services & Hooks: `src/services/camera.service.ts`, `src/hooks/cameras/use-cameras.ts`
> **Backend Contract:** `smart-ppe-camera-service` (cổng 8886 / Gateway Traefik cổng 80 tại `/api/v1/cameras` & `/api/v1/camera-streams`).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Camera |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền thêm, sửa, xóa camera, cấu hình ROI, ping test và stream AI |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Quản lý camera tại công trường phụ trách, cấu hình vùng quan tâm AI |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Xem luồng video trực tiếp, thực hiện ping test, xem telemetry AI |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `PPE_CAMERA_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_camera_db` (Port 8886) đang hoạt động. Luồng test video giả lập hoặc file video mẫu `public/videos/ai-cctv-sample.mp4`.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI & Drawer Chỉ Số Hạ Tầng Camera (CameraKpiSummary)

> **Nguồn code:** `src/components/features/cameras/camera-kpi-summary.tsx`, `src/components/features/cameras/camera-stats-detail-panel.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CAM-001 | Render 4 thẻ Bento KPI Camera | Đã đăng nhập tài khoản có quyền | Mở `/cameras`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Tổng số camera (`totalCameras`), Camera đang trực tuyến (`onlineCameras`), Camera mất tín hiệu (`offlineCameras`), và Độ ổn định luồng AI trung bình (`aiStreamHealth` %) | ✅ |
| CAM-002 | Click thẻ Mất tín hiệu mở Drawer sự cố hạ tầng | Có camera OFFLINE | Click vào thẻ "Camera mất tín hiệu" | Drawer trượt ra từ bên phải, URL cập nhật `?stat=offline`, hiển thị danh sách các camera mất nguồn/mất mạng kèm mã lỗi | ✅ |
| CAM-003 | Click thẻ Độ ổn định mở Drawer Telemetry | Đang ở `/cameras` | Click thẻ "Độ ổn định luồng AI" | Drawer hiển thị biểu đồ phân bổ FPS và độ trễ Ping của toàn bộ thiết bị | ✅ |
| CAM-004 | Đóng Drawer khôi phục URL | Drawer đang mở | Bấm phím Escape hoặc nút X | Drawer đóng lại, URL xóa param `?stat=` sạch sẽ | ✅ |

---

## 2. Thanh Công Cụ, Tìm Kiếm & Chuyển Chế Độ Xem (CameraToolbar)

> **Nguồn code:** `src/components/features/cameras/camera-toolbar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CAM-101 | Tìm kiếm theo Tên hoặc Mã Camera | Có danh sách camera | Nhập "CAM-NORTH-01" vào ô tìm kiếm | Danh sách lọc tức thì sau debounce 300ms, chỉ hiện camera khớp mã | ⬜ |
| CAM-102 | Lọc camera theo Công trường (Site Filter) | Chọn site "Landmark 81" trên toolbar | Chọn dropdown công trường | Danh sách camera chỉ hiển thị các thiết bị thuộc Landmark 81, URL sync `?siteId=...` | ⬜ |
| CAM-103 | Lọc theo trạng thái Hoạt động (ONLINE / OFFLINE) | Đang hiển thị tất cả | Chọn trạng thái "ONLINE" | Chỉ hiển thị các camera có badge xanh `ONLINE` | ⬜ |
| CAM-104 | Chuyển sang Chế độ Xem Bảng (Table View) | Mặc định đang ở Grid View | Bấm nút chuyển view `Table` | Danh sách hiển thị dạng bảng Neumorphic với các cột: Tên/Mã, Site/Zone, IP/RTSP, Độ phân giải, FPS, Trạng thái, Thao tác | ✅ |
| CAM-105 | Chuyển sang Chế độ Tường Video (Video Wall) | Đang ở chế độ bất kỳ | Bấm nút chuyển view `Video Wall` | Giao diện chuyển sang màn hình trung tâm tác chiến Video Wall với nền tối sâu chuyên dụng | ✅ |
| CAM-106 | Thay đổi bố cục Video Wall (1x1, 2x2, 3x3) | Đang ở chế độ Video Wall | Lần lượt chọn nút bố cục "1x1", "2x2", "3x3" | Lưới camera tự động tái bố cục: 1x1 (1 camera phóng đại), 2x2 (4 camera song song), 3x3 (9 camera toàn cảnh) | ✅ |

---

## 3. Tạo Mới & Chỉnh Sửa Camera (CreateCameraModal & EditCameraModal)

> **Nguồn code:** `src/components/features/cameras/create-camera-modal.tsx`, `src/components/features/cameras/edit-camera-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CAM-201 | Mở Modal Thêm Camera Mới | Đăng nhập ADMIN | Bấm nút "+ Thêm Camera" trên Toolbar | Modal Neumorphic mở lên với các trường: Tên camera, Mã định danh, Công trường, Phân khu, RTSP URL chính, RTSP URL phụ, Độ phân giải, FPS | ✅ |
| CAM-202 | Validation RTSP URL bắt buộc tiền tố rtsp:// | Đang nhập form | Nhập URL `http://192.168.1.100/video` | Báo lỗi inline: "URL luồng phải bắt đầu bằng giao thức rtsp:// hoặc rtsps://", nút submit bị khóa | ⬜ |
| CAM-203 | Tạo camera thành công (Happy Path) | Điền đủ Tên: "Cam Cổng Chính", Mã: "CAM-GATE-01", Site: Landmark 81, RTSP: `rtsp://192.168.1.50:554/live` | Bấm "Lưu thiết bị" | Nút xoay spinner, gọi POST `/api/v1/cameras` -> nhận 201 -> đóng modal -> Toast thành công -> Danh sách làm mới có camera mới | ⬜ |
| CAM-204 | Mở Modal Sửa Camera | Bấm nút "Sửa" trên thẻ camera | Modal Sửa camera mở lên | Các trường dữ liệu điền sẵn thông tin hiện tại, cho phép đổi Tên, Vị trí, RTSP URL | ✅ |
| CAM-205 | Cập nhật thông số FPS và độ phân giải | Đổi FPS từ 15 lên 30, đổi phân giải 1080p sang 2K | Bấm "Cập nhật" | Gọi PUT `/api/v1/cameras/:id` -> Toast thành công -> Thẻ camera hiển thị thông số mới | ⬜ |

---

## 4. Kiểm Tra Nhịp Tim & Đo Độ Trễ (CameraHealthDialog & Ping Test)

> **Nguồn code:** `src/components/features/cameras/camera-health-dialog.tsx`, `src/services/camera.service.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CAM-301 | Mở Hộp thoại Chẩn đoán sức khỏe | Có camera cụ thể | Click nút icon Nhịp tim "Ping / Sức khỏe" trên camera | Hộp thoại mở lên hiển thị: Tên camera, Địa chỉ IP, Trạng thái luồng, Biểu đồ lịch sử độ trễ 24 giờ qua | ✅ |
| CAM-302 | Kích hoạt Live Ping Test | Hộp thoại health đang mở | Bấm nút "Kiểm tra kết nối ngay (Ping)" | Hệ thống gửi POST `/api/v1/cameras/:id/ping`, hiển thị hiệu ứng đo sóng xung: kết quả trả về thời gian phản hồi (vd: `24ms`), tỷ lệ rớt gói tin (`0%`), trạng thái: "Kết nối xuất sắc" | ⬜ |
| CAM-303 | Ping camera mất nguồn/mạng | Camera đang offline | Bấm "Kiểm tra kết nối ngay" | Báo động đỏ: "Không thể nhận phản hồi từ camera (Timeout 5000ms). Vui lòng kiểm tra nguồn điện và cáp mạng." | ⬜ |

---

## 5. Cấu Hình Vùng Nhận Diện AI (CameraRoiDrawer & Canvas)

> **Nguồn code:** `src/components/features/cameras/camera-roi-drawer.tsx`, `src/components/features/cameras/camera-roi-canvas.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CAM-401 | Mở Drawer Cấu hình ROI | Quyền Admin/Manager | Click nút "Cấu hình AI ROI" trên camera | Drawer mở rộng từ phải sang, tải ảnh snapshot hiện tại của camera lên khung vẽ Canvas tương tác | ✅ |
| CAM-402 | Vẽ Đa giác Vùng quan tâm (Polygon ROI) | Snapshot đã tải lên Canvas | Dùng chuột click 4 điểm trên khung hình để tạo đa giác khu vực giàn giáo | Các đoạn thẳng nối nhau khép kín tạo thành vùng đa giác mờ màu xanh lá cây; hiển thị tọa độ các đỉnh | ⬜ |
| CAM-403 | Vẽ Vùng cấm xâm nhập nguy hiểm (Restricted Area) | Đang ở chế độ vẽ | Chọn công cụ "Vùng cấm (Đỏ)", vẽ đa giác quanh hố sâu | Đa giác màu đỏ gạch cảnh báo xuất hiện trên màn hình snapshot | ⬜ |
| CAM-404 | Xóa điểm và vẽ lại | Đang vẽ dở | Bấm nút "Đặt lại vùng vẽ" | Canvas xóa toàn bộ các điểm vẽ, trở về trạng thái ảnh thô ban đầu | ⬜ |
| CAM-405 | Lưu cấu hình ROI thành công | Đã hoàn thành vẽ vùng | Bấm "Lưu cấu hình vùng AI" | Gọi PUT `/api/v1/cameras/:id/config` lưu ma trận tọa độ chuẩn hóa (Normalized coordinates 0.0 - 1.0) -> Toast thành công | ⬜ |

---

## 6. Trạm Phân Tích Thị Giác AI Thời Gian Thực (/cameras/[id])

> **Nguồn code:** `src/components/features/cameras/detail/camera-intelligence-content.tsx`, `camera-intelligence-player.tsx`, `live-tracking-engine.ts`, `camera-telemetry-tables.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CAM-501 | Render Trạm Phân tích Thị giác AI | Truy cập `/cameras/[id]` | Quan sát bố cục giao diện | Màn hình chia 2 phần chuyên nghiệp: Bên trái là Trình phát Video AI kèm lớp phủ Canvas Bounding Boxes; Bên phải là Sidebar điều phối và Bảng Telemetry theo dõi thời gian thực | ✅ |
| CAM-502 | Trình chiếu Video AI kèm Bounding Boxes thời gian thực | Video đang phát | Quan sát khung hình chuyển động | Thuật toán `live-tracking-engine.ts` tự động vẽ các hộp giới hạn (Bounding Boxes): Hộp xanh bao quanh người (`PERSON`), Hộp xanh lá bao quanh Mũ bảo hộ (`HARD_HAT 98%`), Hộp đỏ viền cảnh báo khi thiếu mũ (`NO_HELMET`) | ✅ |
| CAM-503 | Bảng Telemetry: Cập nhật FPS và Độ trễ suy luận | Engine đang chạy | Quan sát thanh chỉ số Telemetry | Hiển thị tốc độ khung hình xử lý thực tế (`28.4 FPS`), Độ trễ suy luận TensorRT (`32ms`), Số lượng người đang có trong khung hình (`4`) | ✅ |
| CAM-504 | Chụp ảnh bằng chứng tức thì (Instant Snapshot) | Người dùng bấm icon Máy ảnh | Click nút "Chụp bằng chứng" trên thanh player | Khung hình hiện tại được trích xuất độ nét cao, tự động đính kèm Bounding Boxes vi phạm và mở modal lưu sự cố | ⬜ |
| CAM-505 | Nhật ký phát hiện vi phạm trực tiếp (Live Detection Log) | AI phát hiện công nhân cởi mũ | Quan sát bảng Detection Log bên dưới | Một bản ghi mới xuất hiện tức thì: Mã đối tượng `ID #104`, Nhãn `NO_HELMET`, Độ tin cậy `96.4%`, Thời gian chính xác đến mili-giây | ✅ |
| CAM-506 | Chế độ Bật/Tắt hiển thị nhãn Bounding Box | Đang xem video | Click nút toggle "Ẩn Bounding Box" | Lớp phủ Canvas ẩn đi, hiển thị luồng video sạch; bấm bật lại thì Bounding Boxes xuất hiện trở lại | ⬜ |

---

## 7. Xóa Camera & Bảo Vệ An Toàn

> **Nguồn code:** `src/components/features/cameras/delete-camera-dialog.tsx`, `src/hooks/cameras/use-delete-camera.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| CAM-601 | Mở Hộp thoại Xóa Camera | Đăng nhập ADMIN | Bấm nút Thùng rác "Xóa" trên camera | Hộp thoại cảnh báo mở lên: "Bạn có chắc chắn muốn ngắt kết nối và xóa camera [Tên Camera]?" | ✅ |
| CAM-602 | Xác nhận xóa camera thành công | ADMIN bấm "Xác nhận xóa" | Chờ xử lý | Gọi DELETE `/api/v1/cameras/:id` -> Camera bị gỡ bỏ, giải phóng luồng stream trên AI worker -> Toast thành công | ⬜ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/cameras` render chuẩn AppShell, gating ADMIN/OFFICER truy cập thành công |
| 2026-10-28 | Live AI Vision Tracking Studio Test | Đạt | Tích hợp thành công `live-tracking-engine.ts`, Canvas Bounding Boxes, Video Wall 3 layout và trang phân tích `/cameras/[id]` |
