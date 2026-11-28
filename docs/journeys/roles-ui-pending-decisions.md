# Cách hiển thị quản lý vai trò khi thiếu quyền

Đã triển khai trong FE theo nhận xét tiếp theo của [issue #47](https://github.com/TraDeThuong/fe-ppe/issues/47).

## Panel KPI trên `/roles`

- **Cột phải của “Người dùng đã gán”.** Khi thiếu `USER_READ`, panel hiển thị số nhân sự tổng hợp theo vai trò cùng thông báo thiếu quyền và hướng dẫn liên hệ quản trị viên.
- **Các nút ở đầu panel.** “Tạo vai trò” cần `ROLE_CREATE`, “Ma trận quyền” cần `ROLE_PERMISSION_ASSIGN`, “Quản lý Người dùng” cần `USER_READ`. Panel ẩn các nút khi thiếu quyền tương ứng.
- **Các liên kết trong cột phải.** “Xem tất cả”, “Gán ngay” và “Chi tiết” cần `USER_READ`. “Gán ngay” cần thêm `USER_ROLE_ASSIGN`. “Xem tất cả” lọc danh sách theo tên vai trò đang chọn.

## Thanh KPI trên `/roles/[id]`

- **Nhân sự đã gán.** Khi thiếu `USER_READ`, thẻ giữ số tổng và hiển thị “Thiếu quyền xem chi tiết” ở dòng phụ.
- **Nhật ký kiểm toán.** Khi thiếu `AUDIT_LOG_READ`, thẻ hiển thị dấu `—` cùng dòng “Thiếu quyền xem chi tiết”.

## Ghi chú dài hạn

Việc chuyển danh sách nhân sự của vai trò sang phân trang phía máy chủ có thể xem xét khi `GET /api/v1/users/summary` hỗ trợ `roleName`. Đây là hạng mục theo dõi riêng, không chặn nghiệm thu issue #47.
