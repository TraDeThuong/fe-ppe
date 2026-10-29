# Test Case — Quản Lý Vai Trò & Phân Quyền RBAC (/roles)

> **Ngày lập:** 2026-10-28 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ phân hệ Quản lý Vai trò & Ma trận Phân quyền Truy cập (`/roles`) — Thước đo Bento KPI Phân quyền (`RoleKpiSummary`) & Drawer chỉ số chi tiết (`RoleStatsDetailPanel` đồng bộ URL `?stat=`), Thanh công cụ lọc vai trò Hệ thống / Tùy chỉnh (`RoleToolbar`), Chuyển đổi giao diện Thẻ trực quan (`RoleCardGrid`) và Bảng quản lý (`RoleTable`), Drawer Ma trận Quyền hạn Động (`PermissionMatrixDrawer` phân nhóm 6 phân hệ chức năng), Modal Tạo vai trò mới (`CreateRoleModal`), Modal Sửa vai trò (`EditRoleModal`), Hộp thoại Xác nhận Xóa vai trò (`DeleteRoleDialog`), và Hướng dẫn Từ điển Quyền hạn chi tiết (`RolePermissionsGuide`).
> **Cơ chế cốt lõi:** Bảo vệ Vai trò Hệ thống & Chống Tự Khóa Quyền Hại Thân (Anti-lockout Protection for `ADMIN` & `USER`).
> **Nguồn code:**
> - Trang chính: `app/(auth)/roles/page.tsx`, `roles-content.tsx`
> - Components: `src/components/features/roles/*`
> - Services & Hooks: `src/services/rbac.service.ts`, `src/hooks/rbac/*`
> **Backend Contract:** `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/rbac`).

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn trên phân hệ Roles |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | ADMIN | Toàn quyền tạo, sửa, xóa vai trò, gán/gỡ quyền trên Ma trận RBAC |
| `manager@ppe.local` | `Manager@123456` | SAFETY_MANAGER | Xem danh sách vai trò và quyền hạn (Read-only); không được sửa quyền cốt lõi |
| `officer@ppe.local` | `Officer@123456` | SAFETY_OFFICER | Không có quyền `ROLE_READ`, bị chặn 403 Forbidden |
| `user@ppe.local` | `User@123456` | USER | Không có quyền `ROLE_READ`, bị chặn 403 Forbidden |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker `ppe_identity_db` (Port 9999) đang hoạt động. Có sẵn các vai trò hệ thống: `ADMIN`, `SAFETY_MANAGER`, `SAFETY_OFFICER`, `USER`.

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Bento KPI & Drawer Chỉ Số Phân Quyền (RoleKpiSummary)

> **Nguồn code:** `src/components/features/roles/role-kpi-summary.tsx`, `src/components/features/roles/role-stats-detail-panel.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| ROLE-001 | Render 4 thẻ Bento KPI Phân quyền | Đăng nhập tài khoản có quyền `ROLE_READ` | Mở `/roles`, quan sát khối KPI trên cùng | Hiển thị 4 thẻ: Tổng số vai trò (`totalRoles`), Vai trò hệ thống mặc định (`systemRoles`), Tổng số quyền hạn phân nhóm (`totalPermissions`), và Số lượng nhân sự đã gán vai trò (`assignedUsers`) | ✅ `[E2E]` |
| ROLE-002 | Click thẻ Vai trò hệ thống mở Drawer | Đang ở `/roles` | Click vào thẻ "Vai trò hệ thống" | Drawer trượt ra từ bên phải, URL cập nhật `?stat=system-roles`, hiển thị danh sách các vai trò bất biến kèm biểu tượng ổ khóa | ✅ |
| ROLE-003 | Click thẻ Quyền hạn mở Drawer ma trận | Đang ở `/roles` | Click vào thẻ "Tổng số quyền hạn" | Drawer hiển thị danh mục 32 quyền hạn phân bổ theo 6 nhóm nghiệp vụ; URL `?stat=permissions` | ✅ |
| ROLE-004 | Click thẻ Nhân sự đã gán mở Drawer | Đang ở `/roles` | Click vào thẻ "Nhân sự đã gán" | Drawer hiển thị danh sách người dùng phân bổ theo từng vai trò; URL `?stat=assigned-users` | ✅ |
| ROLE-005 | Đóng Drawer khôi phục URL | Drawer đang mở | Bấm nút X hoặc phím Escape | Drawer đóng lại, URL xóa param `?stat=` | ✅ |

---

## 2. Thanh Công Cụ, Bộ Lọc & Chuyển Chế Độ Xem (RoleToolbar)

> **Nguồn code:** `src/components/features/roles/role-toolbar.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| ROLE-101 | Tìm kiếm theo Tên hoặc Mô tả vai trò | Có danh sách vai trò | Nhập "Safety" vào ô tìm kiếm | Danh sách lọc tức thì sau debounce 300ms, chỉ hiện `SAFETY_MANAGER` và `SAFETY_OFFICER` | ⬜ |
| ROLE-102 | Lọc theo Vai trò Hệ thống (System Roles) | Đang hiển thị tất cả | Bấm filter "Hệ thống" | Danh sách chỉ còn các vai trò có badge khóa vàng `HỆ THỐNG` (ADMIN, USER) | ⬜ |
| ROLE-103 | Lọc theo Vai trò Tùy chỉnh (Custom Roles) | Có vai trò tự tạo | Bấm filter "Tùy chỉnh" | Danh sách chỉ hiển thị các vai trò do doanh nghiệp tự định nghĩa | ⬜ |
| ROLE-104 | Chuyển sang Chế độ Xem Bảng (Table View) | Mặc định đang ở Grid View | Bấm nút chuyển view `Table` | Danh sách hiển thị dạng bảng Neumorphic với các cột: Tên vai trò, Mã, Mô tả, Số nhân sự đang giữ, Phân loại, Thao tác | ✅ |
| ROLE-105 | Chuyển lại Chế độ Thẻ (Grid View) | Đang ở Table View | Bấm nút chuyển view `Grid` | Danh sách quay về các thẻ Neumorphic khối nổi sắc nét | ✅ |
| ROLE-106 | Nút "+ Tạo vai trò" hiển thị cho ADMIN | Đăng nhập ADMIN | Quan sát góc phải Toolbar | Thấy nút nổi bật "+ Tạo vai trò" | ✅ `[E2E]` |
| ROLE-107 | Ẩn nút "+ Tạo vai trò" với Manager | Đăng nhập `manager@ppe.local` | Mở `/roles` | Nút "+ Tạo vai trò" bị ẩn hoàn toàn (RBAC Protection) | ⬜ |

---

## 3. Tạo Mới & Chỉnh Sửa Vai Trò (CreateRoleModal & EditRoleModal)

> **Nguồn code:** `src/components/features/roles/create-role-modal.tsx`, `src/components/features/roles/edit-role-modal.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| ROLE-201 | Mở Modal Tạo Vai trò mới | Đăng nhập ADMIN | Click nút "+ Tạo vai trò" | Modal Neumorphic mở lên với các trường: Tên vai trò*, Mã định danh*, Mô tả trách nhiệm | ✅ |
| ROLE-202 | Bỏ trống Tên hoặc Mã vai trò | Form đang mở | Bấm "Lưu vai trò" | Báo lỗi inline đỏ: "Tên vai trò là bắt buộc" và "Mã vai trò là bắt buộc", không gọi API | ⬜ |
| ROLE-203 | Mã vai trò sai quy chuẩn (phải là chữ hoa viết liền) | Đang nhập mã | Nhập `safety officer 2` | Báo lỗi định dạng: "Mã vai trò chỉ cho phép chữ in hoa và dấu gạch dưới (vd: `SITE_INSPECTOR`)" | ⬜ |
| ROLE-204 | Tạo vai trò tùy chỉnh thành công (Happy Path) | Nhập Tên: "Thanh Tra An Toàn Hiện Trường", Mã: `SITE_INSPECTOR`, Mô tả: "Kiểm tra hiện trường và lập biên bản" | Bấm "Lưu vai trò" | Gọi POST `/api/v1/rbac/roles` -> nhận 201 -> đóng modal -> Toast thành công -> Thẻ vai trò mới xuất hiện với badge `TÙY CHỈNH` | ⬜ |
| ROLE-205 | Trùng mã vai trò đã có (409 Conflict) | Nhập mã `ADMIN` đã tồn tại | Bấm "Lưu vai trò" | Backend trả lỗi 409 -> Hiển thị banner lỗi "Mã vai trò đã tồn tại trong hệ thống" | ⬜ |
| ROLE-206 | Mở Modal Chỉnh sửa vai trò tùy chỉnh | Có vai trò `SITE_INSPECTOR` | Bấm nút "Sửa" trên thẻ vai trò | Modal mở lên cho phép sửa Tên và Mô tả; Mã vai trò bị khóa chỉ đọc (readOnly) | ✅ |

---

## 4. Ma Trận Quyền Hạn Động (PermissionMatrixDrawer)

> **Nguồn code:** `src/components/features/roles/permission-matrix-drawer.tsx`, `src/services/rbac.service.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| ROLE-301 | Mở Drawer Ma trận Quyền hạn | Click nút "Phân quyền (icon Matrix)" trên vai trò | Drawer mở rộng từ phải sang | Hiển thị tiêu đề "Ma trận Phân quyền: [Tên vai trò]", chia thành 6 phân hệ chức năng: 1. Sự cố PPE, 2. Camera RTSP, 3. Công trường & Zone, 4. Báo cáo & Thống kê, 5. Định danh & Nhân sự, 6. Hạ tầng & Cấu hình | ✅ |
| ROLE-302 | Bật/Tắt từng quyền bằng Checkbox Neumorphic | Drawer đang mở | Tick chọn quyền `PPE_CAMERA_READ` và `PPE_CAMERA_MANAGE` | Ô checkbox Neumorphic chuyển sang trạng thái lõm sâu phát sáng xanh rêu | ⬜ |
| ROLE-303 | Nút "Chọn tất cả" cho một phân hệ | Muốn cấp toàn quyền Camera | Bấm nút "Chọn tất cả" tại nhóm Giám sát Camera | Toàn bộ 5 quyền trong nhóm Camera được tick chọn cùng lúc | ⬜ |
| ROLE-304 | Nút "Bỏ chọn tất cả" | Bấm nút "Bỏ chọn tất cả" | Tất cả checkbox trong phân hệ đó bị hủy tick | ⬜ |
| ROLE-305 | Lưu thay đổi Ma trận Quyền hạn | Đã thay đổi các quyền | Bấm nút "Lưu thay đổi quyền hạn" | Gửi PUT `/api/v1/rbac/roles/:id/permissions` với danh sách mã quyền -> Toast "Đã đồng bộ ma trận quyền hạn thành công" -> Drawer đóng lại | ⬜ |
| ROLE-306 | Đồng bộ Phiên làm việc (Session Token Refresh) | Sau khi lưu quyền mới ở ROLE-305 | User đang giữ vai trò này thao tác trên hệ thống | Token phiên làm việc tự động làm mới qua cơ chế Single-Flight Refresh, quyền hạn mới có hiệu lực ngay lập tức mà không cần logout | ⬜ |

---

## 5. Cơ Chế Chống Tự Khóa Quyền Hại Thân (Anti-Lockout Protection)

> **Nguồn code:** `src/components/features/roles/delete-role-dialog.tsx`, `permission-matrix-drawer.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| ROLE-401 | Khóa chức năng Xóa đối với Vai trò Hệ thống (ADMIN, USER) | Quan sát thẻ vai trò `ADMIN` và `USER` | Rê chuột vào thẻ hoặc menu thao tác | Nút "Xóa" bị ẩn hoàn toàn hoặc disabled vĩnh viễn kèm icon Ổ khóa vàng | ✅ |
| ROLE-402 | Cảnh báo khi chỉnh sửa quyền của vai trò ADMIN | ADMIN mở Ma trận quyền của vai trò `ADMIN` | Quan sát thông báo trên đầu Drawer | Banner vàng hiển thị: "CẢNH BÁO BẢO MẬT: Đây là vai trò Quản trị viên Tối cao. Việc gỡ bớt quyền nòng cốt có thể khiến hệ thống mất khả năng quản lý." | ⬜ |
| ROLE-403 | Chặn xóa Vai trò đang có Nhân sự nắm giữ | Vai trò `SITE_INSPECTOR` đang được gán cho 2 nhân viên | Bấm nút "Xóa vai trò" | Cảnh báo: "Không thể xóa vai trò này vì đang có 2 nhân sự nắm giữ. Vui lòng chuyển vai trò của nhân sự trước khi xóa." | ⬜ |
| ROLE-404 | Xóa Vai trò tùy chỉnh rỗng thành công | Vai trò không có ai nắm giữ (`assignedUsers = 0`) | Bấm nút Xóa -> Xác nhận tên vai trò -> Submit | Gọi DELETE `/api/v1/rbac/roles/:id` -> Vai trò bị xóa -> Toast thành công | ⬜ |

---

## 6. Hướng Dẫn & Từ Điển Quyền Hạn (RolePermissionsGuide)

> **Nguồn code:** `src/components/features/roles/role-permissions-guide.tsx`, `role-guide-data.ts`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| ROLE-501 | Mở Hướng dẫn Từ điển Quyền hạn | Click nút "Sổ tay Quyền hạn" trên PageHeader | Drawer Hướng dẫn mở lên | Hiển thị danh mục toàn bộ 32 quyền hạn trong hệ thống kèm mô tả chi tiết: Mã quyền, Ý nghĩa thực tế, Mức độ rủi ro, và Khuyến nghị vai trò nên cấp | ✅ |
| ROLE-502 | Tìm kiếm quyền hạn trong sổ tay | Đang ở sổ tay | Nhập từ khóa "RTSP" | Sổ tay lọc hiển thị đúng các quyền liên quan đến luồng stream video camera | ⬜ |

---

## 7. Phân Quyền Route & Guard 403

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| ROLE-601 | ADMIN truy cập `/roles` thành công | Đăng nhập `admin@ppe.local` | Mở `/roles` | Trang tải mượt mà trong AppShell | ✅ `[E2E]` |
| ROLE-602 | MANAGER truy cập `/roles` ở chế độ xem | Đăng nhập `manager@ppe.local` | Mở `/roles` | Trang tải được nhưng ở chế độ chỉ xem, không có các nút tạo/sửa/xóa | ⬜ |
| ROLE-603 | OFFICER và USER thông thường bị chặn 403 | Đăng nhập `officer@ppe.local` | Gõ URL `/roles` | Route Guard chặn hiển thị `ForbiddenView` 403 | ✅ `[E2E]` |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-m2-routes-e2e.py`) | Đạt | Route `/roles` render trong AppShell, RBAC Admin truy cập, Officer bị chặn 403 |
| 2026-10-28 | RBAC Matrix & Anti-lockout Validation | Đạt | Tích hợp thành công Bento Console, Drawer Ma trận 6 phân hệ, Sổ tay quyền hạn và Khóa bảo vệ vai trò hệ thống |
