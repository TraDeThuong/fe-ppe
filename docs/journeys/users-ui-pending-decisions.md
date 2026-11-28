# /users — mục UI chờ quyết định (follow-up c1fdd95 / #46)

Ngày: 2026-11-28. Phần logic đã sửa ở FE, không đụng BE. Các mục dưới đây là thay đổi chữ/hiển thị
đã làm ở mức tối thiểu (không đổi bố cục) hoặc chưa làm, cần anh quyết định.

## Đã đổi chữ (giữ nguyên bố cục)

1. **Helper text mật khẩu — modal "Thêm người dùng mới"**
   - Cũ: "Tối thiểu 8 ký tự" / "Minimum 8 characters".
   - Mới: "8–128 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt" /
     "8–128 characters, including uppercase, lowercase, number and special character".
   - Cần xem: chuỗi dài hơn, có thể xuống 2 dòng trong modal size `md`. Nếu muốn gọn có thể
     đổi thành danh sách tiêu chí tick xanh theo thời gian thực — là thay đổi UI, chưa làm.

2. **Ô vai trò khi thiếu quyền ROLE_READ — modal "Thêm người dùng mới"**
   - Select bị khóa, placeholder: "Bạn không có quyền xem danh sách vai trò" /
     "You don't have permission to view roles". Không gọi GET /roles.
   - Cần quyết định: người có USER_CREATE mà thiếu ROLE_READ thì không thể tạo user (roleId bắt buộc).
     Lựa chọn: (a) giữ như hiện tại; (b) ẩn hẳn nút "Thêm người dùng" khi thiếu ROLE_READ;
     (c) thêm banner cảnh báo trong modal.

3. **Danh sách vai trò khi thiếu quyền ROLE_READ — modal "Phân vai trò người dùng"**
   - Thay danh sách bằng một dòng chữ nghiêng: "Bạn không có quyền xem danh sách vai trò (ROLE_READ)
     nên chưa thể phân vai trò." Nút "Lưu vai trò" tự khóa (không có vai trò để chọn).
   - Thêm dòng "Đang tải vai trò..." khi đang tải (trước đây danh sách trống không báo gì).
   - Cần quyết định: có nên ẩn luôn action "Phân vai trò RBAC" trong menu hàng khi thiếu ROLE_READ không.

4. **Placeholder ô mật khẩu — ĐÃ ĐỔI (user duyệt 2026-11-28)**
   - Cũ: "Tối thiểu 8 ký tự..." / "At least 8 characters..." (mâu thuẫn rule mới).
   - Mới: "Nhập mật khẩu mạnh..." / "Enter a strong password..."; rule chi tiết nằm ở helper text.

## Đã chốt: người có USER_CREATE / USER_ROLE_ASSIGN nhưng thiếu ROLE_READ (user duyệt 2026-11-28)

Chọn **khóa nút + tooltip lý do**, không ẩn (ẩn làm người dùng không hiểu sao thiếu nút; mở modal
thì ngõ cụt vì không chọn được vai trò). Tooltip: "Cần thêm quyền xem danh sách vai trò (ROLE_READ)
để dùng chức năng này" / "Requires permission to view roles (ROLE_READ)". Áp dụng ở:
- Nút "Thêm người dùng" (/users).
- Action "Phân vai trò RBAC" trong menu hàng (thêm prop tùy chọn `title` cho `TableRowAction`).
- Nút phân vai trò ở chế độ thẻ (`user-card-grid.tsx`).
- Nút "Đổi vai trò" ở trang chi tiết user (`user-detail-hero.tsx`).
Thông báo thiếu quyền bên trong 2 modal vẫn giữ làm lớp bảo vệ thứ hai.
