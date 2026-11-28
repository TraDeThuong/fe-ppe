# Hành trình tinh chỉnh giao diện mobile (fe-ppe)

> Lập ngày 2026-11-27. Áp dụng cho màn hình **dưới 768px** (dưới breakpoint `md` của Tailwind).
> Bản desktop (từ 768px trở lên) **giữ nguyên**, mọi thay đổi phải nằm sau `max-md:` / `md:hidden`.

## 1. Quyết định đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Ai dùng bản mobile | Cán bộ an toàn ngoài hiện trường (role `SAFETY_OFFICER`) |
| Điều hướng | Bỏ menu ☰. Thanh tab ở đáy: **Tổng quan · Sự cố · Camera · Thông báo · Thêm** |
| Phong cách | Neumorphism **nhẹ**: một lớp thẻ, bóng mờ, không khung lồng nhiều lớp |
| Nội dung | Bỏ dòng không cần thiết, kể cả khi bản web đang có. Nút dễ hiểu chỉ cần icon |

Luồng cần tối ưu nhất: **nhận cảnh báo → xem ảnh → xử lý → xem camera**.

Quyền của cán bộ an toàn (seed `SAFETY_OFFICER_PERMISSIONS`): đọc/duyệt/cập nhật sự cố, xem camera, công trường, vùng, cấu hình an toàn, thông báo, tệp. Không vào Báo cáo và các trang quản trị.

## 2. Quy tắc thiết kế

1. **Lọc từng dòng theo 3 mức:** Giữ (cần để quyết định ngay) · Giấu sau 1 chạm (thỉnh thoảng cần) · Bỏ.
2. **Bỏ trên mobile:** icon lớn cạnh tiêu đề, mô tả dưới tiêu đề, breadcrumb, nhãn tiếng Anh lặp ý tiêu đề, số thứ tự 01/02, đồng hồ, "Cập nhật lúc…", chữ kỹ thuật (SSE, Track #, SHA-256, FPS, HTTP, mã quyền), nút Cột / Bảng-Thẻ / Chia 2 cột / Làm mới, mô hình 3D.
3. **Tiêu đề trang** do thanh đầu trang (`MobileTopBar`) hiển thị theo route. Khối tiêu đề riêng của từng trang ẩn trên mobile; giữ `h1` với `max-md:sr-only` cho trình đọc màn hình.
4. **Chữ:** nội dung 14–16px, nhỏ nhất 12px; ô nhập 16px (tránh iPhone tự phóng to khi chạm); không IN HOA giãn chữ.
5. **Vùng bấm** tối thiểu 44×44px. Nút chỉ có icon phải có `aria-label`, hoặc giữ chữ trong `<span className="max-md:sr-only">`.
6. **Nút:**
   - Chỉ icon: quay lại, đóng, tìm, lọc, thêm (+), sửa, tải về, phóng to, gọi, ⋮.
   - Giữ chữ (quan trọng hoặc khó hoàn tác): Xác nhận, Bác bỏ, Phân công, Đã khắc phục, Lưu.
   - Thao tác ít dùng: đưa vào menu ⋮ hoặc bỏ trên mobile.
   - Mỗi màn tối đa **1 nút tô màu chính**.
7. **Không cuộn ngang.** Bảng → danh sách thẻ, cả hàng bấm được. Ngoại lệ duy nhất: một hàng chip lọc (`FilterChipRow scrollable`, mép phải mờ để gợi ý) và ảnh bằng chứng vuốt ngang.
8. **Bộ lọc:** bên ngoài chỉ có ô tìm kiếm, một hàng chip trạng thái và nút Lọc (mở `BottomSheet`).
9. **Số liệu:** tối đa một hàng chip; không lặp một con số ở nhiều chỗ.
10. **Bóng nhẹ:** token `--shadow-dark` / `--shadow-light` tự nhạt đi dưới 768px (`src/styles/tokens.css`). Thẻ mới dùng `shadow-nm-sm` hoặc nhẹ hơn, không lồng thẻ trong thẻ.

## 3. Kỹ thuật

- Ẩn/hiện theo breakpoint bằng class: `max-md:hidden` (ẩn trên mobile), `hidden md:block` (chỉ desktop), `md:hidden` (chỉ mobile), `max-md:sr-only`.
- Màn có bố cục mobile khác hẳn: tạo component riêng trong thư mục `mobile/` của feature (ví dụ `incidents/mobile/`), **dùng chung state, dữ liệu, mutation và modal** với bản desktop trong file `*-content.tsx`. Không gọi API riêng cho mobile.
- Chọn bản theo khổ màn hình (`src/hooks/use-media-query.ts`):
  - Trang chỉ hiện nội dung **sau khi đăng nhập xong** (tự trả skeleton/`null` khi chưa có user — ví dụ `/incidents`, `/incidents/[id]`, `/dashboard`): dùng `useIsDesktop()` hoặc `useResponsiveVariant()`.
  - Trang render nội dung **ngay từ server** (layout `(auth)` cố ý không chặn render khi chưa đăng nhập — ví dụ `/notifications`): bắt buộc dùng `useResponsiveVariant()` và vẫn bọc `md:hidden` / `hidden md:block`, nếu không desktop sẽ nháy bản mobile lúc hydrate.
  - Kết quả: điện thoại không render bản desktop (3D, biểu đồ, trình xem ảnh nặng, nhật ký kiểm toán…), không trùng `id` giữa hai bản.
- Trang có thanh nút riêng ở đáy (ví dụ chi tiết sự cố): gọi `useHideMobileTabBar(true)` để tạm ẩn tab đáy; thanh nút dùng `fixed inset-x-0 bottom-0 … md:hidden` và nội dung chừa `pb-16`.
- Phần dùng chung (header, tab, `PageHeader`) đổi một lần là áp dụng cho mọi trang; header riêng của từng trang phải sửa từng cái.
- Kiểm tra bằng Playwright (`/usr/bin/python3`, không chờ `networkidle`): chụp 390×844 (mobile), 360×740 (máy nhỏ), 1440×900 (desktop, để chắc bản máy tính không đổi), cả giao diện sáng và tối. Đăng nhập bằng `officer@ppe.local` để thấy đúng quyền cán bộ; dùng `admin@ppe.local` khi cần dữ liệu (mật khẩu trong `smart-ppe-identity-service/prisma/seed.ts`).

## 4. Thành phần dùng chung

| Thành phần | File | Dùng để |
|---|---|---|
| `MobileTopBar` | `src/components/features/app-shell/mobile-top-bar.tsx` | Thanh đầu trang: nút quay lại (trang chi tiết), tiêu đề, chọn công trường |
| `MobileTabBar` | `src/components/features/app-shell/mobile-tab-bar.tsx` | Tab đáy theo quyền; chạm tab đang mở thì cuộn lên đầu |
| `MobileMoreSheet` | `src/components/features/app-shell/mobile-more-sheet.tsx` | Tab "Thêm": tài khoản, các trang còn lại, giao diện, ngôn ngữ, đăng xuất |
| `MobileChromeProvider`, `useHideMobileTabBar` | `src/components/features/app-shell/mobile-chrome-context.tsx` | Trang có thanh nút riêng ở đáy tạm ẩn tab đáy |
| `getMobileRouteMeta`, `getMobileNavLabel`, `MOBILE_NAV_LABELS` | `src/config/navigation.ts` | Tiêu đề ngắn + đích quay lại theo route; nhãn ngắn cho tab/menu mobile. Thêm trang chi tiết mới → thêm vào `MOBILE_SUB_ROUTES` |
| `SiteSelector variant="mobile"` | `src/components/features/app-shell/site-selector.tsx` | Nút chọn công trường trên thanh đầu trang (mở bảng trượt) |
| `BottomSheet` | `src/components/ui/bottom-sheet.tsx` | Bảng trượt từ dưới lên (dùng `<dialog>` gốc: tự khóa focus, ESC để đóng, chạm vùng tối để đóng; có `footer` cho nút Áp dụng) |
| `FilterChip`, `FilterChipRow` | `src/components/ui/filter-chip.tsx` | Chip lọc cao 44px; hàng chip xuống dòng hoặc `scrollable` |
| `useIsDesktop`, `useResponsiveVariant`, `useHydrated` | `src/hooks/use-media-query.ts` | Chọn bản mobile/desktop (xem mục 3) |
| `IncidentMobileView`, `IncidentMobileList`, `IncidentMobileFilterSheet` | `src/components/features/incidents/mobile/` | Danh sách sự cố mobile; `IncidentMobileList` dùng lại được ở trang khác (Tổng quan đã dùng) |
| `IncidentMobileDetail` | `src/components/features/incidents/mobile/incident-mobile-detail.tsx` | Chi tiết sự cố mobile: ảnh vuốt ngang, thông tin chính, "Trao đổi", "Xem thêm", thanh nút quyết định |
| `useIncidentGalleryPhotos` | `src/components/features/incidents/viewer/use-incident-gallery-photos.ts` | Bộ ảnh bằng chứng dùng chung cho trình xem desktop và mobile |
| `NotificationMobileInbox` | `src/components/features/notifications/mobile/` | Hộp thư thông báo mobile; chạm thông báo có sự cố → mở thẳng sự cố |
| `DashboardMobileOverview` | `src/components/features/dashboard/mobile/` | Tổng quan mobile: ô số liệu bấm được + sự cố chưa xử lý |

## 5. Danh sách trang và tiến độ

Trạng thái: ✅ xong · 🟡 đang làm · ⬜ chưa làm · ➖ chỉ cần kiểm tra không vỡ.

| # | Trang | Route | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 0 | Khung app (header, tab đáy, sheet Thêm, bóng nhẹ) | mọi trang | ✅ | Menu ☰ cũ (`mobile-sidebar.tsx`, `mobile-header-settings.tsx`) đã xóa; `PageHeader` dùng chung tự gọn trên mobile |
| 1 | Tổng quan | `/dashboard` | ✅ | 3 ô số liệu + 5 sự cố chưa xử lý; không mount 3D/biểu đồ trên mobile |
| 2 | Danh sách sự cố | `/incidents` | ✅ | 1,6 màn (trước 4); 0 nút < 44px; 0 chữ < 12px |
| 3 | Chi tiết sự cố | `/incidents/[id]` | ✅ | 1 màn (trước 4,7); nút Bác bỏ/Xác nhận, Phân công, Báo cáo khắc phục, Đóng theo đúng quyền như desktop |
| 4 | Việc của tôi | `/incidents/assignments` | ⬜ | Tiêu đề + nút quay lại đã có từ khung; nội dung chưa làm |
| 5 | Thông báo | `/notifications` | ✅ | 1,1 màn (trước 3,2); tab Lưu trữ/Cài đặt mở từ ⋯ (nội dung tab vẫn là bản desktop) |
| 6 | Camera | `/cameras` | ⬜ | |
| 7 | Chi tiết camera | `/cameras/[id]` | ⬜ | |
| 8 | Công trường | `/sites` | ⬜ | `PageHeader` đã gọn; lưới thẻ và bộ lọc chưa làm |
| 9 | Chi tiết công trường | `/sites/[id]` | ⬜ | |
| 10 | Kho minh chứng | `/evidences` | ⬜ | `PageHeader` đã gọn |
| 11 | Hồ sơ, Bảo mật, Đổi mật khẩu | `/settings/*`, `/change-password` | ⬜ | `PageHeader` đã gọn |
| 12 | Đăng nhập, 2FA, quên/đặt lại mật khẩu | `/login` … | ⬜ | Hiện đã khá ổn trên mobile |
| 13 | Hộp thoại dùng chung (Thẩm duyệt, Giải quyết, Phân công, Đóng) | modal | ⬜ | Dùng được trên mobile nhưng còn chữ nhỏ, mã kỹ thuật (#id • NO_VEST); cân nhắc chuyển sang `BottomSheet` |
| — | Báo cáo, trang quản trị | `/reports`, `/users` … | ➖ | Cán bộ an toàn không có quyền |

## 6. Tiêu chí đạt (mỗi trang)

- Mục cần xử lý đầu tiên hiện ngay ở màn đầu, không phải cuộn.
- Không cuộn ngang; chữ từ 12px; vùng bấm từ 44px.
- Không còn thông tin trang trí hoặc lặp theo mục 2.
- Desktop không đổi (so ảnh trước/sau ở 1440×900).
- `npx tsc --noEmit` và test liên quan chạy qua.

## 7. Nhật ký

- **2026-11-27 (phiên 1, Opus):** làm mục 0, 1, 2, 3, 5. `npx tsc --noEmit` sạch với các file mobile; `npm test` 622/622 qua. Đã so ảnh desktop trước/sau của Tổng quan, Sự cố, Chi tiết sự cố, Thông báo: bố cục không đổi. Chụp kiểm tra cả 360×740 và giao diện tối.
  - Có phiên khác sửa song song trang Công trường, Báo cáo, Cài đặt và phần ảnh bằng chứng — khi làm mục 8, 9, 11 cần kiểm tra `git status` trước để không ghi đè.
  - Việc tiếp theo nên làm theo thứ tự: mục 4 → 6 → 7 → 13 → 8 → 9 → 10 → 11 → 12.
