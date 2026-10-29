# Test Case — Khung Dashboard Chung (AppShell & Điều hướng)

> **Ngày lập:** 2026-10-21 · **Cập nhật:** 2026-10-28
> **Phạm vi:** Toàn bộ khung giao diện chung sau đăng nhập (AppShell: AppSidebar, AppHeader, UserMenu, NotificationBell, SiteSelector, ForbiddenView 403, Mobile navigation, Collapsed sidebar, Navigation Registry & Permission Gating)
> **Nguồn code:** 
> - Layout & Core: `app/(auth)/layout.tsx`, `src/components/features/app-shell/app-shell.tsx`
> - Sidebar & Header: `src/components/features/app-shell/app-sidebar.tsx`, `src/components/features/app-shell/app-header.tsx`, `src/components/features/app-shell/mobile-sidebar.tsx`, `src/components/features/app-shell/mobile-header-settings.tsx`
> - Widgets: `src/components/features/app-shell/user-menu.tsx`, `src/components/features/app-shell/notification-bell.tsx`, `src/components/features/app-shell/site-selector.tsx`, `src/components/features/app-shell/forbidden-view.tsx`
> - Config & Context: `src/config/navigation.ts`, `src/contexts/SiteContext.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/RealtimeContext.tsx`
> **E2E tự động:** `scripts/test-dashboard-shell-e2e.py` (13/13 ca kiểm thử Playwright đạt) — các case bao phủ bởi script có ghi chú `[E2E]`

---

## Tài khoản test (seed — `smart-ppe-identity-service/prisma/seed.ts`)

| Email | Password | Vai trò | Quyền hạn tiêu biểu |
|---|---|---|---|
| `admin@ppe.local` | `Admin@123456` | Quản Trị Viên (ADMIN) | Toàn quyền 12/12 menu, 4 nhóm, truy cập mọi route |
| `manager@ppe.local` | `Manager@123456` | Safety Manager | Quản lý công trường, camera, sự cố, báo cáo, chỉ số AI (10 menu) |
| `officer@ppe.local` | `Officer@123456` | Safety Officer | Giám sát sự cố, xem camera, xem site, báo cáo (6 menu) |
| `user@ppe.local` | `User@123456` | Site Worker (USER) | Chỉ xem Dashboard, Thông báo cá nhân, Cài đặt (3 menu) |

**Tiền đề chạy test:** dev server `:3000` + Gateway `:80` + Docker cụm Identity Service (`ppe_identity_db`, port 9999).

**Chú giải cột Trạng thái:** ✅ đã kiểm thử đạt · ⬜ chưa test thủ công · ❌ đang lỗi

---

## 1. Sidebar Điều hướng (AppSidebar & Navigation Registry)

> **Nguồn code:** `src/components/features/app-shell/app-sidebar.tsx`, `src/config/navigation.ts`

### 1.1 Render danh mục & Nhóm chức năng theo Phân quyền

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-001 | Hiển thị đủ 4 nhóm & 12 menu cho ADMIN | Đăng nhập tài khoản `admin@ppe.local` | Mở `/dashboard`, quan sát Sidebar trái | Thấy đủ 4 nhóm tiêu đề: "GIÁM SÁT", "PHÂN TÍCH", "QUẢN TRỊ", "CÁ NHÂN" và đủ 12 menu items (Dashboard, Incidents, Cameras, Sites, Reports, AI Metrics, Users, Roles, Audit Logs, System, Notifications, Settings) | ✅ `[E2E]` |
| DSH-002 | Lọc menu cho SAFETY_OFFICER | Đăng nhập `officer@ppe.local` | Mở `/dashboard`, đếm số lượng menu items | Chỉ hiển thị 6 menu items được cấp quyền: Dashboard, Incidents, Cameras, Sites, Reports, Notifications, Settings; KHÔNG thấy nhóm QUẢN TRỊ | ✅ `[E2E]` |
| DSH-003 | Lọc menu cho SITE_WORKER (USER) | Đăng nhập `user@ppe.local` | Mở `/dashboard`, quan sát Sidebar | Chỉ hiển thị 3 menu: Dashboard, Notifications, Settings; các menu còn lại bị ẩn hoàn toàn | ✅ `[E2E]` |
| DSH-004 | Nhận diện Menu Active theo Route | Đang ở route `/cameras` | Quan sát item Camera trên sidebar | Item Camera mang class active: nền thụt nhẹ Neumorphic (`shadow-[var(--nm-inset)]`), chữ màu `text-primary`, icon phát sáng | ✅ `[E2E]` |
| DSH-005 | Active phân cấp Route con | Mở route chi tiết `/incidents/INC-1042` | Quan sát menu Sidebar | Menu cha "Sự cố vi phạm PPE" (`/incidents`) vẫn duy trì trạng thái Active | ✅ `[E2E]` |
| DSH-006 | Click chuyển trang tức thời | Đang ở `/dashboard` | Click vào menu "Giám sát Cameras" | Chuyển hướng ngay sang `/cameras`, không reload trang trắng, sidebar giữ nguyên | ✅ `[E2E]` |

### 1.2 Thu gọn Sidebar (Collapse & Persistence)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-101 | Thu gọn Sidebar bằng nút toggle | Đang ở chế độ mở rộng (width 260px) | Click nút toggle thu gọn ở góc dưới Sidebar | Sidebar co lại thành dạng mini (width 72px), chỉ còn hiển thị icon, text tiêu đề nhóm và label menu bị ẩn | ✅ `[E2E]` |
| DSH-102 | Tooltip khi hover menu thu gọn | Sidebar đang thu gọn | Rê chuột (hover) vào icon Camera | Hiển thị floating tooltip hiển thị nhãn "Giám sát Cameras" sắc nét | ⬜ |
| DSH-103 | Lưu trạng thái thu gọn vào LocalStorage | Thu gọn sidebar ở DSH-101 | Nhấn F5 reload lại trang | Sidebar vẫn duy trì trạng thái thu gọn mini (đọc từ `localStorage["sidebar-collapsed"]`), không bị giật layout | ✅ `[E2E]` |
| DSH-104 | Mở rộng lại Sidebar | Sidebar đang thu gọn | Click nút toggle mở rộng | Sidebar bung rộng về kích thước 260px đầy đủ text và logo | ✅ `[E2E]` |

---

## 2. Thanh Tiêu đề Trên (AppHeader & Widgets)

> **Nguồn code:** `src/components/features/app-shell/app-header.tsx`, `src/components/features/app-shell/user-menu.tsx`, `src/components/features/app-shell/site-selector.tsx`, `src/components/features/app-shell/notification-bell.tsx`

### 2.1 Bộ chọn Công trường Toàn cục (SiteSelector)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-201 | Hiển thị SiteSelector cho ADMIN / MANAGER | Đăng nhập tài khoản `admin@ppe.local` | Quan sát góc trái AppHeader | Thấy widget SiteSelector với nhãn "Tất cả công trường" | ✅ `[E2E]` |
| DSH-202 | Ẩn SiteSelector cho USER thông thường | Đăng nhập tài khoản `user@ppe.local` | Quan sát AppHeader | Widget SiteSelector không xuất hiện trên thanh header | ✅ `[E2E]` |
| DSH-203 | Dropdown chọn công trường cụ thể | Admin click vào SiteSelector | Chọn "Công trường Landmark 81" | Dropdown đóng lại, nhãn header cập nhật thành "Landmark 81", URL/Context cập nhật `siteId` đồng bộ cho toàn bộ dashboard | ⬜ |
| DSH-204 | Đóng dropdown khi click ra ngoài | Đang mở dropdown SiteSelector | Click vào vùng trống bất kỳ trên trang | Dropdown tự động đóng lại | ✅ `[E2E]` |

### 2.2 Chuông Thông Báo Nhanh (NotificationBell)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-301 | Render nút chuông & Badge số lượng chưa đọc | Đã đăng nhập | Quan sát nút chuông trên Header | Thấy icon chuông Neumorphic nổi; nếu có tin chưa đọc thì hiện badge đỏ hiển thị số lượng (vd: `5`) | ✅ `[E2E]` |
| DSH-302 | Mở Popover danh sách tin mới | Click vào nút chuông | Bấm nút chuông | Popover bung xuống hiển thị tối đa 5 thông báo mới nhất kèm thời gian và loại sự cố | ⬜ |
| DSH-303 | Nút "Xem tất cả thông báo" | Đang mở popover chuông | Click link "Xem tất cả" ở chân popover | Điều hướng trực tiếp sang trang `/notifications`, popover tự đóng | ⬜ |

### 2.3 Menu Người dùng & Đăng xuất (UserMenu)

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-401 | Hiển thị Avatar & Role Badge | Đăng nhập `admin@ppe.local` | Quan sát UserMenu góc phải Header | Hiển thị avatar tròn, họ tên "Quản Trị Viên", badge vai trò màu đỏ/primary `ADMIN` | ✅ `[E2E]` |
| DSH-402 | Dropdown menu hồ sơ cá nhân | Click vào khối UserMenu | Quan sát dropdown bung ra | Thấy các mục: "Hồ sơ cá nhân" (`/settings/profile`), "Bảo mật tài khoản" (`/settings/security`), "Đổi mật khẩu" (`/change-password`), đường kẻ phân cách, và nút "Đăng xuất" đỏ | ✅ `[E2E]` |
| DSH-403 | Thao tác Đăng xuất thành công | Đang mở dropdown UserMenu | Click vào nút "Đăng xuất" | Gọi API POST `/auth/logout`, xóa sạch token/cookies, điều hướng ngay về `/login`, không thể Back lại dashboard | ✅ `[E2E]` |

---

## 3. Tầng Phòng thủ Phân quyền Route (Route Guard & 403 ForbiddenView)

> **Nguồn code:** `src/config/navigation.ts`, `src/components/features/app-shell/forbidden-view.tsx`, `app/(auth)/layout.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-501 | ADMIN truy cập route quản trị không bị chặn | Đăng nhập `admin@ppe.local` | Lần lượt gõ trực tiếp URL: `/users`, `/roles`, `/audit-logs`, `/system` | Mọi trang render mượt mà trong AppShell, không bị màn hình 403 | ✅ `[E2E]` |
| DSH-502 | USER gõ trực tiếp URL quản trị bị chặn 403 | Đăng nhập `user@ppe.local` | Gõ URL `/users` trên thanh địa chỉ trình duyệt | AppShell vẫn giữ nguyên khung, vùng nội dung chính render màn hình `ForbiddenView`: Icon khiên cấm, tiêu đề "Không có quyền truy cập", mã lỗi 403, và nút "Về Trang Chủ" | ✅ `[E2E]` |
| DSH-503 | SAFETY_OFFICER gõ URL `/roles` bị chặn 403 | Đăng nhập `officer@ppe.local` | Gõ trực tiếp URL `/roles` | Hiển thị `ForbiddenView` do thiếu quyền `ROLE_READ` | ✅ `[E2E]` |
| DSH-504 | Nút "Về Trang Chủ" trên ForbiddenView | Đang ở màn hình 403 tại `/system` | Click nút "Về Trang Chủ" | Điều hướng an toàn về `/dashboard` | ✅ `[E2E]` |
| DSH-505 | Match quyền chính xác cho route con có param | Đăng nhập `user@ppe.local` | Gõ URL `/incidents/INC-1042` | Route Guard trích xuất tiền tố `/incidents` -> yêu cầu `PPE_INCIDENT_READ` -> user không có quyền -> hiển thị 403 chuẩn xác | ✅ `[E2E]` |

---

## 4. Giao diện Đa nền tảng & Mobile Responsive

> **Nguồn code:** `src/components/features/app-shell/mobile-sidebar.tsx`, `src/components/features/app-shell/mobile-header-settings.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-601 | Ẩn sidebar desktop trên màn hình Mobile | Viewport 375x667 (iPhone SE) | Mở `/dashboard` | Sidebar desktop tự động ẩn (`hidden lg:flex`), Header hiện nút hamburger menu góc trái | ✅ `[E2E]` |
| DSH-602 | Mở Mobile Drawer qua nút Hamburger | Đang ở viewport Mobile | Bấm nút Hamburger menu trên Header | Drawer trượt từ cạnh trái ra màn hình phủ backdrop mờ, hiển thị đầy đủ logo và danh mục menu | ✅ `[E2E]` |
| DSH-603 | Tự đóng Drawer khi chọn menu | Mobile Drawer đang mở | Bấm vào menu "Sự cố vi phạm PPE" | Trang điều hướng tới `/incidents`, Drawer tự động trượt đóng lại trả lại không gian xem | ✅ `[E2E]` |
| DSH-604 | Tự đóng Drawer khi bấm vào Backdrop | Mobile Drawer đang mở | Chạm vào vùng nền đen mờ phía ngoài | Drawer đóng lại ngay lập tức | ⬜ |
| DSH-605 | Thanh Bottom Bar / Quick Action trên Mobile | Viewport Mobile 390x844 | Quan sát cạnh dưới màn hình | Thấy thanh điều hướng rút gọn chứa các icon thao tác nhanh tiện dụng cho ngón tay cái | ⬜ |

---

## 5. Chủ đề Giao diện & Đa ngôn ngữ (Theme & i18n)

> **Nguồn code:** `src/components/ui/theme-toggle.tsx`, `src/providers/locale-provider.tsx`

| ID | Tiêu đề | Điều kiện | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| DSH-701 | Chuyển đổi Dark / Light Theme | Đang ở giao diện Light | Bấm nút ThemeToggle trên Header | Toàn bộ khung AppShell đổi sang Dark Theme mượt mà: nền tối sâu, bóng neumorphic đảo chiều sáng/tối sắc sảo | ✅ `[E2E]` |
| DSH-702 | Lưu trạng thái Theme sau F5 | Đã chuyển sang Dark Theme | Nhấn F5 reload trình duyệt | Giao diện giữ nguyên Dark Theme, không bị giật flash trắng (nhờ inline script chống FOUC) | ✅ `[E2E]` |
| DSH-703 | Chuyển đổi Ngôn ngữ Tiếng Việt sang Tiếng Anh | Đang ở Tiếng Việt | Click nút đổi ngôn ngữ sang EN | Toàn bộ tiêu đề nhóm, nhãn menu sidebar, placeholder tìm kiếm và tooltip đổi sang tiếng Anh tức thì | ⬜ |

---

## Nhật ký kiểm thử

| Ngày | Người test / Kịch bản | Kết quả | Ghi chú |
|---|---|---|---|
| 2026-10-21 | E2E (`scripts/test-dashboard-shell-e2e.py`) | 13/13 đạt | Bao phủ RBAC 4 vai trò, 12 menu items, 403 guard, sidebar collapse + localstorage, responsive mobile |
| 2026-10-22 | AI Automated Verification | 5/5 đạt | Kiểm tra tính bất biến của Token trong cookie, single-flight refresh khi thao tác trên shell |
| 2026-10-28 | Manual Browser Test | ✅ | Hoàn thiện tích hợp SiteSelector và NotificationBell real-time SSE |
