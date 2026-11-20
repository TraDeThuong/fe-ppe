# Xử lý liên tục nhóm sự cố được giao

Phạm vi: frontend. Không đổi HTTP API, database hoặc quyền backend. Chỉ những lần giao hàng loạt mới có context nhóm; thông báo cũ mở hồ sơ đại diện và hướng dẫn về danh sách.

## Luồng đã triển khai

- Manager duyệt, đối chiếu `updatedIds`, đọc lại trạng thái và phân công. Nhóm chỉ gồm các ID thành công, tối đa 100 hồ sơ, xếp theo `detectedAt` tăng dần rồi ID. Kết quả lỗi được giữ theo ID; thử lại thông báo không phân công lại.
- Context v1 nằm trong link của `description` thông báo: `groupId`, `incidentIds`, `assignedBy`, `assignedTo`, `createdAt`. Chuông, popup, đối chiếu và Notifications dùng chung parser, kiểm tra giới hạn/UUID/thành viên rồi dựng lại đường dẫn nội bộ. Context không cấp quyền thao tác.
- Trang chi tiết có tiến độ, Trước/Tiếp, danh sách nhóm và chọn báo cáo chung. Đọc tối đa 4 hồ sơ đồng thời, cache theo người dùng/nhóm, làm mới mỗi 30 giây khi hiển thị, khi focus và SSE của thành viên. Hồ sơ 404/403 không làm mất thanh điều hướng nhóm.
- Officer chỉ resolve hồ sơ `CONFIRMED` có phân công `ACTIVE` cho mình. Mỗi lần gửi đọc lại hồ sơ. “Lưu báo cáo” ở lại; “Báo cáo & tiếp theo” xác minh `RESOLVED` rồi tìm hồ sơ còn xử lý, có quay vòng. Chuyển nội bộ dùng `router.replace`.
- Biểu mẫu có xác nhận bỏ bản nháp khi đóng/rời trang, giữ ghi chú và ảnh khi lỗi, reset khi đổi hồ sơ. Không chuyển khi đang gửi. Đổi tài khoản/mất quyền hủy các bước tiếp theo của thao tác nhóm.
- Báo cáo chung trả kết quả từng ID (quyền/trạng thái, upload, cập nhật, xác minh). Upload ảnh thất bại chặn resolve hồ sơ đó; thử lại chỉ gửi phần thất bại, dùng lại biên nhận ảnh nếu đã upload thành công nhưng cập nhật lỗi.
- Hoàn tất phải đọc lại toàn nhóm: chỉ `RESOLVED`, hoặc `CLOSED` có bằng chứng đã khắc phục. Không coi đóng từ `DISMISSED` là hoàn tất. Không tự nghiệm thu/đóng hồ sơ.
- Trong nhóm không gửi tín hiệu khắc phục từng hồ sơ. Tổng kết gửi riêng người giao và Officer, kiểm tra kết quả `dispatchedCount`, `channels`, `notifications`. Lỗi gửi, tùy chọn chặn và gửi thiếu được tách khỏi trạng thái khắc phục đã lưu. Gửi lại tổng kết không gọi resolve.
- Biên nhận gửi được lưu theo tài khoản/context trong phiên và đối chiếu thông báo đã lưu theo `groupId` khi mở ở thiết bị khác. API không có idempotency key nên không bảo đảm tuyệt đối khi hai thiết bị gửi đồng thời. Inbox của Officer không chứng minh được quản lý đã nhận; trường hợp tìm thấy tổng kết cũ chỉ hiển thị “đã tìm thấy”, không khẳng định đã gửi cho quản lý.

## Kiểm thử tự động

```sh
npm test
npx tsc --noEmit --incremental false
npm run test:incident-group:e2e
```

Các unit/integration test trong `src/lib/__tests__/incident-group*.test.ts` kiểm tra context 100 thành viên và dữ liệu hỏng; fallback thông báo cũ; đóng nhánh báo động giả; tiến độ thiếu hồ sơ; điều hướng quay vòng; duyệt/giao một phần; giới hạn đồng thời; abort; upload/cập nhật/xác minh lỗi; thử lại không upload/resolve trùng; tổng kết và tùy chọn nhận; tìm biên nhận nhiều trang và chống lặp trong phiên.

Playwright trong `scripts/test-incident-group-e2e.py` dùng các trang, hook, modal và notification component thực tế với API giả. Không gọi backend thật hoặc gửi thông báo thật. Kiểm tra:

1. Manager giao 8 hồ sơ; Officer mở từ Notifications, chuông và popup/đối chiếu đúng 8 thành viên.
2. Reload giữ context; bản nháp không mất sau lỗi; xác nhận bỏ bản nháp được tôn trọng.
3. Lưu & tiếp theo chỉ chuyển sau resolve thành công; lưu thường ở lại. Back/Forward không duyệt lại từng hồ sơ đã chuyển bằng replace.
4. Báo cáo chung 6 hồ sơ: một upload lỗi, năm thành công; tiến độ 7/8, thử lại chỉ hồ sơ còn lại.
5. Đủ 8/8 chờ nghiệm thu; gửi tổng kết lỗi rồi gửi lại không resolve lại; reload và phiên thiết bị mới không tạo tổng kết trùng.
6. Đổi tài khoản, mất quyền đọc, thông báo cũ/context hỏng, hồ sơ hiện tại 404 và điều hướng tiếp; mobile không tràn trang.

Ảnh và kết quả lưu mặc định tại `/tmp/ppe-incident-group-e2e`. Fixture tắt animation để thao tác trình duyệt ổn định và biên dịch CSS thực tế của ứng dụng.

## Đối chiếu với môi trường thật

Thực hiện lại luồng với tài khoản Manager/Officer cùng công trường, gồm tùy chọn nhận thông báo bật/tắt. Kiểm tra nhật ký từng hồ sơ và inbox hai người. Không thể khôi phục nhóm từ thông báo cũ. Việc chống lặp tuyệt đối và xác nhận giao hàng tới người nhận khác cần hỗ trợ backend, nằm ngoài phạm vi này.
