# Test Case — Quản Lý Công Trường & Phân Khu (/sites)

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Quản lý Công trường & Phân khu (`/sites`) — Bento KPI & Drawer chỉ số chi tiết (Site Stats Detail Panel qua URL query `?stat=`), Thanh công cụ lọc & tìm kiếm debounced (SiteToolbar), Chuyển đổi chế độ Grid Card và Table View (Neumorphic Data Presentation), Modal Tạo công trường mới đa bước (CreateSiteModal), Modal Chỉnh sửa công trường (EditSiteModal), Hộp thoại Xác nhận Xóa/Ngừng hoạt động (DeleteSiteDialog), Drawer Quản lý Phân khu & Vùng cấm (SiteZonesDrawer, ZoneListPanel, RestrictedAreaPanel), Modal Cấu hình Ngưỡng Quy tắc An toàn PPE (SiteSafetyConfigModal).
> **Nguồn code:**
> - Trang chính: `app/(auth)/sites/page.tsx`, `app/(auth)/sites/sites-content.tsx`
> - Components: `src/components/features/sites/site-kpi-summary.tsx`, `src/components/features/sites/site-stats-detail-panel.tsx`, `src/components/features/sites/site-toolbar.tsx`, `src/components/features/sites/site-card-grid.tsx`, `src/components/features/sites/site-table.tsx`, `src/components/features/sites/create-site-modal.tsx`, `src/components/features/sites/edit-site-modal.tsx`, `src/components/features/sites/delete-site-dialog.tsx`, `src/components/features/sites/site-zones-drawer.tsx`, `src/components/features/sites/site-safety-config-modal.tsx`
> - Hooks & Services: `src/hooks/sites/use-sites.ts`, `src/services/site.service.ts`
> **Backend Contract:** `smart-ppe-site-service` (cổng 8887 / Gateway Traefik cổng 80 tại `/api/v1/sites`).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Sites |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền xem, tạo, sửa, xóa site, cấu hình zone & vùng cấm |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem, tạo site mới, sửa site, cấu hình an toàn PPE cho site |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Xem danh mục công trường, xem phân khu và vùng cấm (Read-only) |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `PPE_SITE_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_postgres` DB `ppe_site_db` (Port 8887) đang chạy.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI & Drawer Chỉ Số Chi Tiết (Site Stats Detail Panel)

> **Nguồn code:** `src/components/features/sites/site-kpi-summary.tsx`, `src/components/features/sites/site-stats-detail-panel.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-001 | Render đủ 4 thẻ Bento KPI công trường | Đăng nhập tài khoản có quyền `PPE_SITE_READ` | Mở `/sites`, quan sát khối KPI trên đầu | Hiển thị 4 thẻ Neumorphic: Tổng công trường (`totalSites`), Tổng phân khu (`totalZones`), Vùng cấm nguy hiểm (`restrictedAreas`), và Tỷ lệ tuân thủ trung bình (`complianceRate`) | ✅ |
| SITE-002 | Click thẻ Tổng công trường mở Panel | Đang ở `/sites` | Click vào thẻ "Tổng công trường" | Drawer trượt từ phải ra, URL cập nhật `?stat=total-sites`, hiển thị danh sách chi tiết công trường đang hoạt động và tạm dừng | ✅ |
| SITE-003 | Click thẻ Phân khu mở Panel Zones | Đang ở `/sites` | Click vào thẻ "Tổng phân khu" | Drawer hiển thị chi tiết các Zone loại A, B, C và số camera gắn ở từng zone; URL cập nhật `?stat=zones` | ✅ |
| SITE-004 | Click thẻ Vùng cấm mở Panel Restricted | Đang ở `/sites` | Click vào thẻ "Vùng cấm nguy hiểm" | Drawer hiển thị danh sách các đa giác vùng cấm đang kích hoạt; URL cập nhật `?stat=restricted` | ✅ |
| SITE-005 | Đóng Drawer bằng nút đóng hoặc URL | Drawer chi tiết đang mở | Click nút X ở góc drawer hoặc bấm phím Escape | Drawer đóng lại mượt mà, URL tự động xóa param `?stat=` | ✅ |
| SITE-006 | Trực tiếp mở URL có param `?stat=` | Chưa mở drawer | Paste URL `http://localhost:3000/sites?stat=compliance` vào tab mới | Trang tải xong tự động kích hoạt Drawer phân tích tuân thủ an toàn theo công trường | ✅ |

---

## 2. Thanh Công Cụ, Tìm Kiếm & Chuyển Chế Độ Xem (SiteToolbar)

> **Nguồn code:** `src/components/features/sites/site-toolbar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-101 | Tìm kiếm theo tên hoặc mã công trường | Có danh sách công trường | Nhập từ khóa "Landmark" vào ô tìm kiếm | Danh sách lọc tức thời sau debounce 300ms, chỉ hiển thị công trường có tên hoặc mã chứa "Landmark" | ⬜ |
| SITE-102 | Tìm kiếm theo địa chỉ công trường | Có công trường ở Quận 1 | Nhập "Quận 1" vào ô tìm kiếm | Kết quả lọc đúng các công trường có địa chỉ tại Quận 1 | ⬜ |
| SITE-103 | Lọc theo trạng thái Hoạt động (ACTIVE) | Đang hiển thị tất cả | Chọn filter trạng thái "Đang hoạt động" | Bảng/Lưới chỉ còn hiển thị các site có badge `ACTIVE` xanh lá cây | ⬜ |
| SITE-104 | Lọc theo trạng thái Tạm dừng (INACTIVE) | Đang hiển thị tất cả | Chọn filter trạng thái "Tạm dừng" | Danh sách chỉ còn các site có badge `INACTIVE` xám | ⬜ |
| SITE-105 | Chuyển sang Chế độ Xem Bảng (Table View) | Mặc định đang ở Grid View | Bấm nút chuyển đổi chế độ xem icon `List` | Danh sách chuyển sang dạng bảng dữ liệu Neumorphic với các cột: Tên, Mã, Địa chỉ, Số Zone, Số Cam, Trạng thái, Thao tác | ✅ |
| SITE-106 | Chuyển lại Chế độ Thẻ (Grid View) | Đang ở Table View | Bấm nút chuyển đổi chế độ xem icon `Grid` | Danh sách quay về giao diện thẻ trực quan Neumorphic nổi (Raised Cards) | ✅ |
| SITE-107 | Nút "+ Tạo công trường" hiển thị theo quyền | ADMIN hoặc MANAGER | Quan sát góc phải thanh công cụ | Thấy nút nổi bật "+ Tạo công trường" | ✅ |
| SITE-108 | Ẩn nút "+ Tạo công trường" với OFFICER | Đăng nhập `officer@ppe.local` | Mở `/sites` | Nút "+ Tạo công trường" bị ẩn hoàn toàn (RBAC Protection) | ⬜ |

---

## 3. Tạo Công Trường Mới (CreateSiteModal)

> **Nguồn code:** `src/components/features/sites/create-site-modal.tsx`, `src/hooks/sites/use-create-site.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-201 | Mở Modal Tạo công trường | Đăng nhập Admin/Manager | Click nút "+ Tạo công trường" | Modal Neumorphic mở lên với tiêu đề "Thêm Công Trường Mới", focus vào ô Tên công trường | ✅ |
| SITE-202 | Bỏ trống các trường bắt buộc | Form đang mở | Bấm ngay nút "Lưu công trường" | Báo lỗi inline đỏ: "Tên công trường là bắt buộc" và "Mã công trường là bắt buộc", không gọi API | ⬜ |
| SITE-203 | Mã công trường sai định dạng | Đang nhập form | Nhập mã "site 123" (có dấu cách) | Báo lỗi định dạng mã: chỉ cho phép chữ hoa, số và dấu gạch nối (vd: `SITE-HCM-01`) | ⬜ |
| SITE-204 | Tạo công trường thành công (Happy Path) | Điền đủ Tên: "Khu Phức Hợp Sài Gòn", Mã: "SITE-SGH-02", Địa chỉ: "Bến Nghé, Q1", Trạng thái: ACTIVE | Bấm nút "Lưu công trường" | Nút hiện spinner "Đang lưu...", gọi POST `/api/v1/sites`, nhận 201 Created -> đóng modal -> Toast thành công -> Danh sách site tự động làm mới | ⬜ |
| SITE-205 | Trùng mã công trường (409 Conflict) | Nhập mã `SITE-LANDMARK-01` đã tồn tại | Bấm "Lưu công trường" | Backend trả lỗi 409 -> Hiển thị banner lỗi "Mã công trường đã tồn tại trong hệ thống" | ⬜ |
| SITE-206 | Hủy tạo công trường | Đang nhập dở thông tin | Bấm nút "Hủy" hoặc phím Esc | Modal đóng lại, form được reset, không lưu thay đổi | ⬜ |

---

## 4. Chỉnh Sửa & Cập Nhật Công Trường (EditSiteModal)

> **Nguồn code:** `src/components/features/sites/edit-site-modal.tsx`, `src/hooks/sites/use-update-site.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-301 | Mở Modal Chỉnh sửa với dữ liệu sẵn có | Có site "Landmark 81" | Bấm nút "Chỉnh sửa" trên thẻ công trường | Modal "Chỉnh sửa công trường" mở lên, các trường Tên, Mã, Địa chỉ, Mô tả, Trạng thái điền sẵn giá trị hiện tại | ✅ |
| SITE-302 | Mã công trường ở chế độ Chỉ đọc (ReadOnly) | Modal edit đang mở | Quan sát ô Mã công trường | Ô mã công trường bị làm mờ, `readOnly` (không cho phép sửa mã định danh để bảo toàn toàn vẹn dữ liệu) | ⬜ |
| SITE-303 | Sửa tên và đổi trạng thái sang INACTIVE | Sửa tên thành "Landmark 81 - Giai đoạn 2", đổi trạng thái sang "Tạm dừng" | Bấm "Cập nhật" | Gọi PUT `/api/v1/sites/:id` -> toast thành công -> Thẻ công trường đổi tên và chuyển sang badge xám INACTIVE | ⬜ |
| SITE-304 | Lỗi mạng khi cập nhật | Rớt mạng trước khi bấm submit | Bấm "Cập nhật" | Toast thông báo "Không thể kết nối máy chủ", form giữ nguyên dữ liệu đã sửa để người dùng thử lại | ⬜ |

---

## 5. Quản Lý Phân Khu & Vùng Cấm (SiteZonesDrawer & Panels)

> **Nguồn code:** `src/components/features/sites/site-zones-drawer.tsx`, `zone-list-panel.tsx`, `restricted-area-panel.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-401 | Mở Drawer Phân khu từ Thẻ công trường | Có site cụ thể | Click vào nút "Quản lý Phân khu" (icon Layers) | Drawer mở ra từ cạnh phải, tiêu đề "Phân khu & Vùng cấm: [Tên site]" với 2 tab: "Danh sách Phân khu" và "Vùng cấm nguy hiểm" | ✅ |
| SITE-402 | Thêm Phân khu mới (Zone) | Đang ở tab Danh sách Phân khu | Nhập Tên phân khu: "Khu Giàn giáo Tây", Mã: "ZONE-W-01", bấm "Thêm" | Phân khu mới xuất hiện trong danh sách kèm số lượng camera hiện tại là 0 | ⬜ |
| SITE-403 | Xem danh sách Vùng cấm (Restricted Areas) | Chuyển sang tab "Vùng cấm nguy hiểm" | Quan sát danh sách | Hiển thị các vùng nguy hiểm có gắn cờ cảnh báo đỏ, mức phạt vi phạm và số đỉnh đa giác (Polygon points) | ⬜ |
| SITE-404 | Xóa Phân khu rỗng | Phân khu không có camera nào gắn | Bấm nút Xóa phân khu -> xác nhận | Phân khu bị xóa khỏi danh sách | ⬜ |
| SITE-405 | Chặn xóa Phân khu đang có Camera | Phân khu đang có 3 camera hoạt động | Bấm nút Xóa phân khu | Cảnh báo: "Không thể xóa phân khu đang có camera gắn kết. Vui lòng di chuyển camera trước." | ⬜ |

---

## 6. Cấu Hình Quy Tắc An Toàn PPE Cấp Site (SiteSafetyConfigModal)

> **Nguồn code:** `src/components/features/sites/site-safety-config-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-501 | Mở Modal Cấu hình An toàn | Có site cụ thể | Click nút icon Khiên bảo hộ "Cấu hình PPE" | Modal mở lên hiển thị danh mục các quy tắc bảo hộ: Bắt buộc Mũ bảo hộ, Bắt buộc Áo phản quang, Bắt buộc Giày bảo hộ, Ngưỡng nhạy AI (%) | ✅ |
| SITE-502 | Bật/Tắt quy tắc an toàn bắt buộc | Đang mở modal | Gạt công tắc Switch "Bắt buộc Áo phản quang" từ Bật sang Tắt | Switch chuyển trạng thái mượt mà | ⬜ |
| SITE-503 | Kéo thanh trượt Ngưỡng độ tin cậy AI (Confidence Slider) | Đang ở modal | Kéo Slider độ tin cậy từ 80% lên 90% | Giá trị hiển thị cập nhật trực tiếp `90%`, mô hình AI sẽ chỉ báo động khi độ tin cậy >= 90% | ⬜ |
| SITE-504 | Lưu cấu hình an toàn thành công | Đã thay đổi quy tắc | Bấm "Lưu cấu hình an toàn" | Gọi PUT `/api/v1/safety-rules/effective?siteId=...` -> Toast "Đã cập nhật quy chuẩn an toàn cho công trường" | ⬜ |

---

## 7. Xóa & Vô Hiệu Hóa Công Trường (DeleteSiteDialog)

> **Nguồn code:** `src/components/features/sites/delete-site-dialog.tsx`, `src/hooks/sites/use-delete-site.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-601 | Mở Hộp thoại Xóa công trường | Đăng nhập ADMIN | Click nút icon Thùng rác "Xóa" trên công trường | Hộp thoại xác nhận nguy hiểm màu đỏ mở lên: "Bạn có chắc chắn muốn xóa công trường [Tên site]?" kèm cảnh báo rủi ro | ✅ |
| SITE-602 | Hủy bỏ thao tác xóa | Hộp thoại đang mở | Bấm "Hủy bỏ" | Hộp thoại đóng lại, công trường được giữ nguyên vẹn | ⬜ |
| SITE-603 | Xác nhận xóa thành công (Soft Delete) | ADMIN bấm nút "Xác nhận xóa" | Chờ xử lý | Gọi DELETE `/api/v1/sites/:id` -> Toast "Đã xóa công trường thành công" -> Thẻ công trường biến mất khỏi danh sách | ⬜ |
| SITE-604 | Chặn xóa công trường đang có sự cố chưa giải quyết | Công trường có sự cố trạng thái `DETECTED` | Bấm xóa và xác nhận | Backend trả lỗi 400 Bad Request -> Hiển thị thông báo "Không thể xóa công trường đang có sự cố an toàn chưa khép kín." | ⬜ |

---

## 8. Điều Hướng Tới Trung Tâm Điều Hành (/sites/[id])

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| SITE-701 | Click vào tiêu đề Thẻ công trường | Đang ở Grid View | Click vào tên công trường "Công trường Landmark 81" | Điều hướng ngay sang Trung tâm Điều hành Cấp Công trường `/sites/[id]` với đúng ID của site | ✅ |
| SITE-702 | Click nút "Vào trung tâm điều hành" | Đang ở Table View | Click nút icon Mũi tên điều hướng | Điều hướng sang `/sites/[id]` | ✅ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/sites` render trong AppShell, phân quyền ADMIN truy cập hợp lệ |
| 2026-10-28 | Frontend Component Testing | Đạt | Tích hợp thành công Bento Console, Drawer chi tiết `?stat=`, chuyển đổi Grid/Table và các Modal CRUD Neumorphic |
