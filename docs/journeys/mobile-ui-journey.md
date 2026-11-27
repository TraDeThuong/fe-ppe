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
7. **Không cuộn ngang.** Bảng → danh sách thẻ, cả hàng bấm được.
8. **Bộ lọc:** bên ngoài chỉ có ô tìm kiếm, một hàng chip trạng thái và nút Lọc (mở `BottomSheet`).
9. **Số liệu:** tối đa một hàng chip; không lặp một con số ở nhiều chỗ.
10. **Bóng nhẹ:** token `--shadow-dark` / `--shadow-light` tự nhạt đi dưới 768px (`src/styles/tokens.css`). Thẻ mới dùng `shadow-nm-sm` hoặc nhẹ hơn, không lồng thẻ trong thẻ.

## 3. Kỹ thuật

- Ẩn/hiện theo breakpoint bằng class: `max-md:hidden` (ẩn trên mobile), `hidden md:block` (chỉ desktop), `md:hidden` (chỉ mobile), `max-md:sr-only`.
- Component nặng (3D, biểu đồ lớn) **không mount** trên mobile: dùng `useIsDesktop()` (`src/hooks/use-media-query.ts`). Chỉ ẩn bằng CSS thì điện thoại vẫn tải thư viện và file mô hình.
- Màn có bố cục mobile khác hẳn: tạo component riêng (ví dụ `IncidentMobileList`) dùng chung dữ liệu với bản desktop. Bản mobile bọc `md:hidden`, bản desktop bọc `hidden md:block`.
- Phần dùng chung (header, tab, `PageHeader`) đổi một lần là áp dụng cho mọi trang; header riêng của từng trang phải sửa từng cái.
- Kiểm tra bằng Playwright: chụp 390×844 (mobile), 360×740 (máy nhỏ), 1440×900 (desktop, để chắc bản máy tính không đổi). Đăng nhập bằng `officer@ppe.local` để thấy đúng quyền cán bộ; dùng `admin@ppe.local` khi cần dữ liệu.

## 4. Thành phần dùng chung

| Thành phần | File | Dùng để |
|---|---|---|
| `MobileTopBar` | `src/components/features/app-shell/mobile-top-bar.tsx` | Thanh đầu trang: nút quay lại (trang chi tiết), tiêu đề, chọn công trường |
| `MobileTabBar` | `src/components/features/app-shell/mobile-tab-bar.tsx` | Tab đáy theo quyền; chạm tab đang mở thì cuộn lên đầu |
| `MobileMoreSheet` | `src/components/features/app-shell/mobile-more-sheet.tsx` | Tab "Thêm": tài khoản, các trang còn lại, giao diện, ngôn ngữ, đăng xuất |
| `getMobileRouteMeta` | `src/config/navigation.ts` | Tiêu đề ngắn + đích quay lại theo route |
| `BottomSheet` | `src/components/ui/bottom-sheet.tsx` | Bảng trượt từ dưới lên (dùng `<dialog>` gốc: tự khóa focus, ESC để đóng) |
| `useIsDesktop` | `src/hooks/use-media-query.ts` | Không mount component nặng trên mobile |

## 5. Danh sách trang và tiến độ

Trạng thái: ✅ xong · 🟡 đang làm · ⬜ chưa làm · ➖ chỉ cần kiểm tra không vỡ.

| # | Trang | Route | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 0 | Khung app (header, tab đáy, sheet Thêm, bóng nhẹ) | mọi trang | 🟡 | |
| 1 | Tổng quan | `/dashboard` | ⬜ | Bỏ 3D, đồng hồ, tab 01/02/03; giữ chip số liệu + sự cố cần xử lý |
| 2 | Danh sách sự cố | `/incidents` | ⬜ | Chip trạng thái + tìm + nút Lọc; bảng → thẻ |
| 3 | Chi tiết sự cố | `/incidents/[id]` | ⬜ | Ảnh trước, thông tin chính, "Xem thêm", nút quyết định ở đáy |
| 4 | Việc của tôi | `/incidents/assignments` | ⬜ | |
| 5 | Thông báo | `/notifications` | ⬜ | Bỏ thẻ số liệu, bỏ tiền tố "Cảnh báo vi phạm PPE:" |
| 6 | Camera | `/cameras` | ⬜ | |
| 7 | Chi tiết camera | `/cameras/[id]` | ⬜ | |
| 8 | Công trường | `/sites` | ⬜ | |
| 9 | Chi tiết công trường | `/sites/[id]` | ⬜ | |
| 10 | Kho minh chứng | `/evidences` | ⬜ | |
| 11 | Hồ sơ, Bảo mật, Đổi mật khẩu | `/settings/*`, `/change-password` | ⬜ | |
| 12 | Đăng nhập, 2FA, quên/đặt lại mật khẩu | `/login` … | ⬜ | Hiện đã khá ổn trên mobile |
| — | Báo cáo, trang quản trị | `/reports`, `/users` … | ➖ | Cán bộ an toàn không có quyền |

## 6. Tiêu chí đạt (mỗi trang)

- Mục cần xử lý đầu tiên hiện ngay ở màn đầu, không phải cuộn.
- Không cuộn ngang; chữ từ 12px; vùng bấm từ 44px.
- Không còn thông tin trang trí hoặc lặp theo mục 2.
- Desktop không đổi (so ảnh trước/sau ở 1440×900).
- `npx tsc --noEmit` và test liên quan chạy qua.
