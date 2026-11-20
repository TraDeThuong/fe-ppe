# Gộp bản thông báo broadcast ở frontend

Không thay đổi backend, HTTP API hoặc database.

## Nguyên nhân và cách xử lý

Backend broadcast lưu cả bản riêng theo `userId` và bản chung có `userId = 00000000-0000-0000-0000-000000000000`. API inbox trả cả hai. Frontend dùng một snapshot chung theo tài khoản cho Notifications, chuông và bộ đếm chưa đọc.

- Đọc tuần tự theo cửa sổ thời gian, mỗi lần tối đa 100 dòng, giới hạn 10.000 bản ghi. Lần kế tiếp lấy lại mốc thời gian cuối và gộp ID chồng lấn, không phụ thuộc OFFSET thiếu ổn định khi nhiều bản tin có cùng createdAt. Kiểm tra metadata, thứ tự thời gian, tổng ID duy nhất và hủy khi đổi tài khoản. Một mốc có đúng 100 dòng được kiểm chứng riêng trước khi đi xuống mốc cũ hơn; nếu quá 100 dòng cùng mốc và không thể kiểm chứng đầy đủ thì báo thiếu dữ liệu. Không công bố snapshot một phần như hộp thư đầy đủ.
- Chỉ ghép một bản chung với một bản riêng tương ứng: cùng `createdAt` chính xác, nội dung, tiêu đề, severity, kênh IN_APP, link/metadata; không có incident/template. Giữ hai bản riêng hoặc các lần phát khác thời điểm dù nội dung giống nhau. Bản riêng là bản chuẩn để thao tác API.
- Gộp trước khi lọc và phân trang. Tổng, số chưa đọc, số trang và chuông lấy cùng snapshot. SSE chỉ làm mới nguồn này, không append thêm bản tin.
- Sau xóa bản riêng, ánh xạ ID đã ghép giữ bản chung khỏi xuất hiện trở lại. Các ánh xạ chỉ gồm ID, lưu theo tài khoản trong localStorage với fallback bộ nhớ.
- Bản chung không có bản riêng vẫn được hiển thị. Đọc/ẩn bản này được lưu cục bộ theo tài khoản, không PATCH/DELETE bản dùng chung của người khác. Đọc/xóa bản riêng vẫn gọi API như trước.
- Lỗi tải giữa chừng hiển thị nút thử lại, giữ danh sách và số liệu đã tải thành công. Nếu chưa có snapshot thành công, KPI hiển thị — thay vì 0 hoặc tỷ lệ 100%. Snapshot trước khi lỗi không được thay bằng dữ liệu một phần.

## Giới hạn của phạm vi frontend

Các bản ghi trùng vẫn còn trong BE. Ánh xạ ẩn bản trùng và trạng thái đọc/ẩn của bản chung chỉ lưu trong trình duyệt hiện tại. Đổi thiết bị hoặc xóa dữ liệu trình duyệt có thể thấy lại bản chung nếu bản riêng đã bị xóa trên server. Đọc/xóa bản riêng còn tồn tại vẫn đồng bộ theo API. Không thể bảo đảm đồng bộ đầy đủ cho bản chung giữa các thiết bị khi giữ nguyên BE.

Việc tính tổng sau khi gộp cần đọc đủ hộp thư trước khi phân trang. Snapshot cache theo tài khoản, dùng chung giữa các component; giới hạn tránh tải không kiểm soát. Hộp thư vượt 10.000 bản ghi sẽ báo lỗi rõ ràng thay vì hiển thị tổng thiếu. Không xóa dữ liệu hay gửi thông báo thật trong kiểm thử.

## Kiểm thử

```sh
npm test
npx tsc --noEmit --incremental false
python3 scripts/test-notification-inbox-e2e.py
python3 scripts/test-broadcast-notification-e2e.py
python3 scripts/test-incident-group-e2e.py
```

Unit test: cặp ở hai trang; gộp trước lọc đọc/chưa đọc; phát lặp hợp lệ; hai bản riêng; email/sự cố không bị gộp; xóa/đọc bản chung cục bộ; lỗi thao tác; đổi tài khoản; cửa sổ thời gian lỗi/thiếu, ID lặp hợp lệ ở biên thời gian, ID trùng không hợp lệ trong một phản hồi, mốc có đúng/vượt 100 dòng và abort.

Playwright dùng component/hook thực tế và API giả: danh sách/chuông/tổng/chưa đọc nhất quán, read/delete thất bại và thử lại, reload không lộ lại bản chung đã ghép, bản tin mới cùng nội dung vẫn hiện, tài khoản khác không bị ảnh hưởng, lỗi giữa trang và mobile. Hai suite broadcast và incident-group kiểm tra hồi quy các luồng trước đó.

Ảnh và kết quả: `/tmp/ppe-notification-inbox-e2e`.
