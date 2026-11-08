# Dashboard: bàn giao FE và đề xuất BE

Ngày kiểm tra: 07/11/2026, múi giờ Asia/Ho_Chi_Minh.
Phạm vi đã thực hiện: FE. Không sửa schema, pipeline, dữ liệu hoặc endpoint BE.

## Hành vi đã thay đổi

| Nội dung | Trước | Sau |
| --- | --- | --- |
| Phạm vi thời gian | Reporting không truyền ngày, trộn với trạng thái hiện tại | Mặc định hôm nay theo Việt Nam; 7 ngày, tháng này, tùy chỉnh tối đa 90 ngày lịch |
| Nguồn phân tích | Hai bảng Reporting, danh sách 100 chờ duyệt hoặc 5 sự cố mới nhất | API Incident hiện có, tối đa 5.000 sự cố, đọc đủ trang và kiểm tra tổng/ID trước khi tổng hợp |
| Card đầu tiên | Tỷ lệ tuân thủ thiếu mẫu số quan sát | Tổng sự cố trong kỳ, gồm mọi trạng thái, lấy metadata |
| Chờ duyệt | Đếm độ dài trang đầu, tối đa 100 | Metadata tổng PENDING_REVIEW mọi ngày |
| Camera | Đếm trang đầu | Tổng/online từ metadata; danh mục đọc đủ trang, tối đa 5.000 camera để giới hạn tải |
| Bác bỏ | Giá trị từ Reporting, có thể bị lỗi thành 0 | DISMISSED / (DISMISSED + CONFIRMED + RESOLVED + CLOSED); hiển thị tử/mẫu; chưa có review thì không có tỷ lệ |
| Radar | Phần trăm tuân thủ từ công thức dự phòng | Số sự cố từng loại; MULTI_VIOLATION đếm một lần; giữ nhóm Khác |
| Theo giờ | 06–18 giờ theo múi giờ máy | 00–23 giờ Việt Nam, bao gồm ca đêm |
| MTTR/SLA | Có thời lượng và tỷ lệ SLA giả khi thiếu mẫu | Chỉ MTTR từ resolvedAt − detectedAt hợp lệ của RESOLVED/CLOSED, kèm số mẫu; không có SLA giả |
| Thiếu dữ liệu | Dễ trông giống 0 sự cố/đạt chuẩn | Phân biệt rỗng, lỗi, thiếu trang, vượt giới hạn, thiếu quyền; không tổng hợp dữ liệu dở dang |
| Điều hướng | Status trên URL chưa được áp dụng; không truyền ngày | Card mở đúng site/status/fromDate/toDate; có nhãn ngày và nút bỏ lọc tại trang sự cố |
| AI | Trình bày model metrics như realtime, tên/framework dự phòng | Metrics đã khai báo của phiên bản, không phải telemetry trực tiếp; bỏ thông tin dự phòng |

Tập phân tích chọn theo thời điểm **phát hiện**; trạng thái là trạng thái hiện tại tại lần đọc. Đây không phải ảnh chụp trạng thái lịch sử cuối mỗi ngày. Sự cố bị bác bỏ vẫn nằm trong tổng sự cố và phân bố; không coi tất cả sự cố là vi phạm đã xác nhận.

Tại lần kiểm tra trình duyệt khoảng 14:21 ngày 07/11/2026, công trường đang chọn có 5 sự cố hôm nay, 20 sự cố trong 7 ngày, 19 chờ duyệt mọi ngày và 4/4 camera trực tuyến. Card tổng mở đúng bảng 5 sự cố có ranh giới ngày Việt Nam. Các giá trị sẽ thay đổi khi có sự cố mới.

## Tổ chức và giới hạn triển khai

- Logic ngày, kiểm tra phân trang và phép tổng hợp: `src/lib/dashboard-data.ts`.
- Query riêng theo user/site/period: `src/hooks/dashboard/use-dashboard-data.ts`, nằm dưới query prefix Incident/Camera để mutation hiện có invalidation được.
- Trang Incident nhận `fromDate`, `toDate`, `status`; lựa chọn tất cả site được truyền rõ bằng `siteId=`.
- Tối đa ba request trang đồng thời. Sự cố/camera dùng page size 100. Không công bố tập thiếu là tập đủ; tổng metadata hợp lệ vẫn hiển thị được.
- Poll số liệu kỳ/camera/model mỗi 60 giây; feed và chờ duyệt mỗi 15 giây; tạm dừng polling khi tab ẩn. Cập nhật khi focus, SSE liên quan, reconnect, review và Refresh. Sự kiện liên tiếp được gộp 750 ms.
- Request nhận AbortSignal. Đổi user/site/period không dùng placeholder từ bộ lọc cũ; dữ liệu của query bị tắt hoặc bị 401/403 không được hiển thị lại từ cache.
- Lỗi tải lại có thể giữ dữ liệu lần thành công gần nhất cho cùng bộ lọc, có nhãn cũ và timestamp. Một lần thu thập mới không đủ trang không được dùng làm đầu vào biểu đồ.
- Trang Reports và các file xuất vẫn dùng Reporting; không cam kết khớp dashboard. Không thay thuật toán Reports trong đợt này.
- API phân trang chưa có snapshot: kiểm tra tổng và ID phát hiện được nhiều trường hợp biến động, nhưng không chứng minh được trạng thái mọi dòng được đọc tại cùng một thời điểm.
- Tất cả site nghĩa là tập bản ghi mà API cho phép truy cập. FE không thể thay thế kiểm soát quyền theo site ở BE.

## Kiểm thử

- Unit và component: kiểm tra công thức 10 sự cố/6 đã duyệt/2 bác bỏ, metadata, 0/101/250/5.000 bản ghi, giới hạn 5.001, lỗi trang giữa, ID trùng/thiếu, totals biến động, abort, sai site/kỳ, ngày Việt Nam, ranh giới ca, loại/mức độ chưa biết và timestamp MTTR không hợp lệ.
- Bộ test FE: `npm test`.
- TypeScript: `npx tsc --noEmit --incremental false`.
- Production build: `npm run build`.
- Kết quả xác minh cuối: 187/187 test đạt, kiểm tra TypeScript và production build thành công.
- Fixture trình duyệt không gọi backend thật: `python3 scripts/serve-dashboard-fixture.py --port 3017`, mở `http://localhost:3017`.
- Fixture đã đối chiếu 250 sự cố/125 camera/63 online, bác bỏ 50/200 = 25%, lỗi trang giữa vẫn giữ tổng 250 nhưng ẩn analytics, metadata thiếu, tổng 5.001, kỳ vượt 90 ngày, thu hồi quyền trên cache và đổi site khi request cũ chưa xong.
- Thao tác duyệt thật không được thực hiện trên dữ liệu người dùng trong quá trình kiểm tra; fixture có nút invalidation mô phỏng sau review.

## Các thay đổi BE đề xuất để trao đổi tiếp

### Ưu tiên 1: nguồn tổng hợp đáng tin và đồng bộ Reporting

1. Có endpoint tổng hợp dashboard từ nguồn Incident hoặc read model có đối soát, để FE không phải tải toàn bộ các trang. Trả tổng, phân loại/mức độ, 24 giờ, số liệu camera, mẫu review và mẫu MTTR cùng một phạm vi. Endpoint vận hành hiện tại (pending/camera) có thể tách khỏi kỳ lịch sử nhưng phải ghi rõ phạm vi.
2. Chuẩn hóa hợp đồng thời gian: timezone mặc định Việt Nam, khoảng `[from, toExclusive)`, cohort theo detectedAt và ý nghĩa trạng thái hiện tại/historical. Trả phạm vi đã áp dụng, thời điểm tạo kết quả, nguồn dữ liệu, tính đầy đủ và số mẫu.
3. Đối soát `incident_statistics` và `report_statistics` với Incident. Kiểm tra đủ sự kiện tạo, xác nhận, bác bỏ, giải quyết, đóng, xóa và thay đổi liên quan; không suy luận pipeline đang chạy chỉ từ sự tồn tại của handler trong mã nguồn.
4. Xử lý sự kiện idempotent bằng ID/số phiên bản, có retry/quan sát lỗi và cơ chế replay/backfill. Tính lại các ngày cũ khi một sự cố cũ đổi trạng thái. Chỉ công bố dữ liệu sau đối soát, không khởi tạo bản rollup 0 rồi coi đó là ngày đã đầy đủ.
5. Bỏ giới hạn cắt ngầm 5.000 dòng thống kê; dùng aggregate SQL hoặc phân trang nội bộ. Kiểm tra permission/site-scope thống nhất cho toàn bộ API.

Tiêu chí thảo luận: tổng theo loại/mức độ/giờ/camera phải bằng tổng Incident của cùng cohort; lỗi/lag của Reporting không được trả thành 0 thành công. Chốt đơn vị đếm incident so với từng violation trước khi so sánh hai bảng.

### Ưu tiên 2: phân trang nhất quán và khả năng vận hành

- Bổ sung snapshot/cursor và sắp xếp ổn định (detectedAt + id), hoặc cung cấp một kết quả aggregate transaction nhất quán. Metadata count và list hiện có thể được đọc trong lúc dữ liệu thay đổi.
- Cache aggregate theo quyền/site/kỳ/timezone; công bố thời điểm cập nhật, độ trễ xử lý và trạng thái đang backfill. Thống nhất sự kiện realtime cho Incident/Camera để invalidation chính xác hơn notification chung.
- Cung cấp catalog/site lookup có scope và pagination rõ ràng. Phân biệt camera online, stream khỏe và AI thực sự đang phân tích; thêm heartbeat/lastSeen nếu muốn đánh giá “đang giám sát”.

### Ưu tiên 3: tuân thủ, SLA và hiệu năng AI thực

- Chỉ khôi phục tỷ lệ tuân thủ sau khi có tổng quan sát đạt/không đạt; chốt đơn vị người/lượt theo dõi, cửa sổ thời gian, chống đếm lại và phạm vi camera/rule. Dữ liệu sự cố đơn thuần không cung cấp mẫu số này.
- Chốt mục tiêu SLA, mốc bắt đầu/kết thúc, cách xử lý bác bỏ và tồn đọng quá hạn. Trả duration và số mẫu thật; không dùng ngưỡng hoặc giá trị dự phòng làm kết quả đo.
- Trả metrics phiên bản và telemetry runtime thành hai nguồn phân biệt. Telemetry cần camera/model/version/time window, thời điểm đo và độ mới; kiểm tra khả năng map model đang khai báo với model thực chạy trên từng camera.
- Sau khi hợp đồng thống kê thống nhất, dùng cùng nguồn cho Reports/PDF/Excel để đối chiếu chính xác với dashboard; backfill và chuyển FE sang aggregate API trong một đợt riêng.
