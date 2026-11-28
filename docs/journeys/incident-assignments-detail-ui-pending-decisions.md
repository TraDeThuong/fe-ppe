# /incidents/assignments và /incidents/[id]: các mục UI chờ quyết định

Nguồn: kết quả soi sâu cho /incidents/assignments và /incidents/[id], bổ sung cho #38 và #60.
Ngày ghi: 28/11/2026.

Phần logic, phân quyền và hiệu năng đã sửa ở FE, không đụng BE (xem mục C). Các mục dưới đây
là thay đổi giao diện mà nhận xét yêu cầu, hoặc thay đổi giao diện phát sinh khi sửa logic.
**Chưa làm**, chờ bạn quyết định.

## Quyết định của user (28/11/2026) và trạng thái

- **U1 (a): Đã làm.** Nút Tải gốc / Xóa / Đính kèm nằm trên thanh công cụ của viewer, áp dụng cho tệp đang xem. Đã bỏ khối "Tệp Minh chứng Đính kèm". Nút "Tải ảnh này về" ở chân viewer giờ cũng tải qua presigned URL. Tệp không xuất hiện trong bộ ảnh của viewer (ví dụ ảnh mẫu) thì không còn nút tải/xóa riêng.
- **U2 (a): Đã làm.** Dùng `ConfirmDialog` ("Bỏ thay đổi" / "Ở lại") thay `window.confirm`. Chỉ chặn link trong vùng làm việc của nhóm; link ở sidebar/header không bị chặn (đóng tab vẫn có cảnh báo của trình duyệt).
- **U3 (a): Đã làm.** Không có nút hàng loạt nào dùng được ở bước đang mở thì ẩn cả thanh hàng loạt lẫn ô chọn. Officer áp dụng theo PPE_INCIDENT_UPDATE.
- **U4 (a): Đã làm.** Nhãn "Chế độ chỉ xem" cạnh nhãn role. Với officer, nhãn hiện khi thiếu PPE_INCIDENT_UPDATE.
- **U5 (a): Đã làm.** Nhãn mới: "Cán bộ thuộc công trường …".
- **U6 (a): Đã làm.** Ẩn "Giao bởi" khi chưa biết người giao; dòng còn "Giao cho: … • thời gian".
- **U7: Đã làm** khi BE tự gửi thông báo (batch-assign). Luồng cũ vẫn ghi "Đã tạo thông báo giao việc cho cán bộ." vì FE tự gửi và biết kết quả.
- **U8: Đã làm** ở header /incidents/assignments và /incidents/[id]. Trang chi tiết giờ tự làm mới mỗi 30s khi mất SSE, để chip "Polling (30s)" đúng thực tế.
- **U9 (a): Đã làm.** Mỗi nhóm có nút "Tải thêm" khi bước còn hồ sơ trên server chưa tải. Nhóm theo camera / loại vi phạm / mức độ / cán bộ tải đúng phần của nhóm đó; nhóm theo giờ / ca / đối tượng tải tiếp cả bước. Chạy được ngay với BE hiện tại; khi BE có `hasActiveAssignment` (mục 3) thì tải gọn hơn. Chưa áp cho màn Admin giám sát và chế độ danh sách phẳng của Officer.
- **U10 (a): Đã làm** cho mọi nút giao/đóng hàng loạt (Admin, thẻ nhóm, thanh hàng loạt của Quản lý): lấy 100 hồ sơ mới nhất, nhãn "(100/151)".

## A. Mục UI đã nêu (giữ để tham chiếu)

| # | Màn hình | Nhận xét / vấn đề | Phương án |
|---|---|---|---|
| U1 | /incidents/[id], khối "Tệp Minh chứng Đính kèm" | Nhận xét: khối này trùng với IncidentEvidenceViewer ngay phía trên. | (a) Chuyển nút Tải gốc / Xóa / Đính kèm vào thanh công cụ của viewer rồi bỏ khối. (b) Thu khối thành danh sách 1 dòng mỗi tệp, chỉ còn tên tệp và nút tải/xóa (bỏ badge loại và ngày). (c) Giữ nguyên. |
| U2 | /incidents/[id] khi mở theo nhóm (`?group=`) | Nhận xét: đang chặn click trên toàn trang và dùng `window.confirm` khi báo cáo chưa lưu. | (a) Thay `window.confirm` bằng `ConfirmDialog` của design system. Chỉ chặn link trong vùng nhóm, không bắt click toàn document. (b) Giữ nguyên. |
| U3 | /incidents/assignments, với role chỉ có quyền xem (PPE_INCIDENT_READ) | Các nút Duyệt / Giao / Bác bỏ / Đóng đã ẩn theo quyền. Thanh thao tác hàng loạt vẫn còn nút "Chọn tất cả" và ô chọn từng dòng, nhưng không còn nút nào để dùng. | (a) Ẩn luôn thanh thao tác hàng loạt và ô chọn khi không có quyền thao tác nào. (b) Giữ nguyên. |
| U4 | /incidents/assignments, role lạ | Role không phải ADMIN hoặc SAFETY_OFFICER vẫn thấy bố cục và nhãn của "Quản lý An toàn". Quyền đã đúng, chỉ còn nhãn chưa đúng. | (a) Thêm nhãn "Chế độ chỉ xem" ở header khi không có quyền REVIEW/MANAGE. (b) Đổi nhãn role thành tên role thật. (c) Giữ nguyên. |
| U5 | Modal "Giao cán bộ" (cả 2 trang) | Danh sách giờ chỉ gồm nhân sự đang hoạt động của đúng công trường. Hai nhóm "Cán bộ Giám sát An toàn (Toàn hệ thống)" và "Nhân sự khác" vì vậy không còn hiện, chỉ còn nhóm "Cán bộ phụ trách tại … (Ưu tiên)". | (a) Đổi nhãn thành "Cán bộ thuộc công trường …" (chữ "Ưu tiên" không còn ý nghĩa). (b) Khi công trường chưa có cán bộ, thêm gợi ý "Gán cán bộ vào công trường ở trang Người dùng". |
| U6 | Thẻ "Đợt giao việc" | Đợt giờ dựng từ dữ liệu phân công, không đọc thông báo. BE không lưu người giao và chỉ đạo, nên dòng "Giao bởi" luôn là "Quản lý An toàn" và thẻ không có nội dung chỉ đạo. Giao lẻ 1 sự cố không tạo thành đợt. | (a) Ẩn dòng "Giao bởi" cho đến khi BE lưu người giao. (b) Giữ nhãn chung như hiện tại. |
| U7 | Panel kết quả sau khi giao việc | Khi BE có batch-assign, thông báo do BE gửi nền và không chắc thành công. Panel vẫn ghi "Đã tạo thông báo giao việc cho cán bộ." | Đổi chữ thành "Hệ thống đang gửi thông báo giao việc cho cán bộ." |
| U8 | Header /incidents/assignments và /incidents/[id] | Chip "Polling (15s)" không khớp thực tế. Khi SSE online thì không còn polling, khi mất SSE thì poll mỗi 30s. | Đổi chip thành "Realtime" khi online và "Polling (30s)" khi offline. |
| U9 | /incidents/assignments, phân trang | Nhận xét muốn phân trang ở server theo tab. Giao diện hiện phân trang theo **nhóm** (Camera, Cán bộ…) ở client, tối đa 100–300 hồ sơ mỗi trạng thái. Phân trang ở server sẽ phải đổi cách hiển thị: phân trang theo hồ sơ, hoặc nút "Tải thêm". | Chờ BE có bộ lọc "đã xác nhận, chưa giao" (mục B2). Sau đó chọn: (a) mỗi nhóm có nút "Tải thêm", (b) bỏ gom nhóm khi danh sách quá dài, (c) giữ nhóm và chỉ tải trang đầu. |
| U10 | Admin, nút "Duyệt & Giao thay (151)" | Phát hiện thêm: khi chọn quá 100 hồ sơ, BE từ chối (mỗi lệnh tối đa 100) và nhóm cũng giới hạn 100, nên thao tác báo lỗi. Lỗi này có từ trước. | (a) Giới hạn nút ở 100 hồ sơ mới nhất và hiện "(100/151)". (b) Tự chia thành nhiều đợt, mỗi đợt 100 hồ sơ. |

## B. Phụ thuộc BE (không sửa, ghi lại để báo Thịnh)

- **B1. Container `incident_service` đang chạy là bản build ngày 27/11**, chưa có `POST /incidents/batch-assign`, `/batch-resolve`, `/batch-close`, dù code trên `develop` đã có. FE gọi batch trước và chỉ chuyển sang gọi từng sự cố khi nhận 404. Cần rebuild container để bỏ N+1 thật sự.
- **B2.** Muốn phân trang ở server theo tab cần bộ lọc "CONFIRMED chưa có phân công ACTIVE" (ví dụ `hasActiveAssignment=false`) và bộ đếm theo từng bước.
- **B3.** Muốn "Đợt giao việc" chính xác và link nhóm mở được trên thiết bị khác cần một thực thể đợt (batchId, assignedBy, note). Hiện link trong app chỉ mang `?group=<id>`, danh sách thành viên lưu ở localStorage của trình duyệt. Thông báo gửi sang thiết bị khác (luồng cũ, biên nhận hoàn tất nhóm) vẫn kèm `context=`.
- **B4.** Presigned URL đang được ký theo host nội bộ `http://ppe-minio:9000` nên trình duyệt không mở được. Cần đặt `PPE_MINIO_PUBLIC_ENDPOINT` cho incident-service. Khi đó viewer và nút "Tải bản gốc" tự dùng presigned. Hiện FE tạm dùng `NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL` chỉ khi presigned không mở được.
- **B5.** Modal giao cán bộ cần quyền USER_READ để lấy `GET /users?siteId=`. Manager thiếu quyền này chỉ thấy cán bộ liên hệ khai báo ở công trường. Cần endpoint "nhân sự của công trường" cho quyền PPE_INCIDENT_MANAGE.
- **B6.** Lỗ hổng BOLA trên các endpoint `:id`: issue BE smart-ppe-incident-service#4.

## B'. Hợp đồng API mà FE đã chờ sẵn (BE làm đúng thì FE chạy ngay, không sửa thêm)

FE đã gửi sẵn các tham số mới. BE hiện tại bỏ qua tham số lạ (zod không `.strict()`), nên FE vẫn chạy như cũ cho tới khi BE hỗ trợ.

| Mục | Hợp đồng | FE xử lý khi BE chưa có |
|---|---|---|
| 1 | `POST /incidents/batch-assign`, `/batch-resolve`, `/batch-close` như code trên `develop` (rebuild container) | 404 → gọi từng sự cố |
| 2 | `PPE_MINIO_PUBLIC_ENDPOINT` để `GET /evidences/:id/download-url` ký theo host trình duyệt mở được | URL ký theo `ppe-minio` → dùng bucket công khai trong env |
| 3 | `GET /incidents?hasActiveAssignment=false\|true`: lọc CONFIRMED chưa có / đang có phân công `ACTIVE`, `meta.total` theo bộ lọc. `GET /incidents/status-counts` trả thêm `confirmedUnassigned`, `confirmedAssigned` (cùng bộ lọc site/camera/ngày) | FE nhận biết qua 2 trường trong status-counts. Chưa có thì tải CONFIRMED rồi tự tách; nút "Tải thêm" vẫn chạy |
| 4 | Bảng `incident_assignments` thêm `assigned_by`, `note`, `batch_id`. Mọi API trả `assignments[]` có `assignedBy`, `note`, `batchId`. Mọi phân công tạo trong 1 lệnh `batch-assign` có chung `batchId` (UUID), và response `batch-assign` trả `batchId`. `GET /incidents?batchId=<uuid>` lọc sự cố của đợt (dùng kèm `includeAssignments=true&includeAllAssignments=true`) | Chưa có `batchId` → gom theo cán bộ + thời điểm giao (≤10s), ẩn "Giao bởi", không có chỉ đạo; link nhóm chỉ mở được trên trình duyệt đã tạo |
| 5 | `GET /users/site-staff?siteId=<uuid>`, quyền `PPE_INCIDENT_READ` (không cần `USER_READ`), chỉ trả nhân sự **đang hoạt động** của công trường mà người gọi được phép xem. Response `{ success, data: [{ id, fullName, email, phoneNumber, role: { name }, siteIds, isActive }] }` | 404/405/501/403, hoặc 422 do khớp nhầm `/users/:id` → dùng `GET /users?siteId=` (cần `USER_READ`), cuối cùng là cán bộ liên hệ của công trường |
| 6 | Vá BOLA trên `/:id` (issue #4), trả 403/404 | Trang chi tiết đã có màn hình lỗi |

## C. Đã sửa ở FE

- Phân quyền: mọi nút trên /incidents/assignments kiểm tra `useCan()`. Review cần REVIEW. Giao và đóng cần MANAGE (giao hồ sơ đang chờ duyệt cần thêm REVIEW). Khắc phục cần UPDATE. Handler cũng chặn lại lần nữa.
- Tải dữ liệu: KPI lấy từ `/incidents/status-counts`. Quản lý chỉ tải Chờ duyệt + Đã xác nhận, và thêm Đã khắc phục khi mở bước 2/3. Officer lọc `assignedToMe` ở server. Không poll khi SSE online. Bỏ `notifications?limit=100` và N+1 `GET /:id/assignments`.
- Batch: giao, khắc phục và đóng dùng batch endpoint, 404 thì gọi từng sự cố. Ảnh sau khắc phục chỉ upload 1 lần mỗi công trường. Lỗi đóng được báo, không bị nuốt. Bỏ `GET /:id` thừa trước mỗi lần giao.
- /incidents/[id]: giao thất bại thì hiện lỗi và giữ modal. Ẩn nút xóa bằng chứng khi hồ sơ CLOSED. Bình luận lấy từ `incident.comments`, chỉ gọi `/comments` khi có SSE bình luận. Bỏ `useUsers({ limit: 100 })`.
- Bảng tra tên nhân sự ở /incidents/assignments tải đủ các trang (không cắt ở 100), lọc theo công trường đang chọn và cache 5 phút. Modal giao hàng loạt chỉ tải khi mở và chỉ liệt kê nhân sự đang hoạt động thuộc công trường của các sự cố được chọn (bỏ USER/ADMIN), giống modal giao đơn lẻ.
- Test giao diện theo permission (`assignment-permissions.test.tsx`): role lạ chỉ có READ, chỉ có REVIEW, đủ REVIEW+MANAGE, officer thiếu UPDATE, nhãn "Chế độ chỉ xem".
- "Báo động lại" gửi `evidenceUrl` dạng `/api/v1/incidents/evidences/:id/download`. Nhận xét gọi đây là "link ảo", nhưng thực ra notification-service chỉ chấp nhận dạng này hoặc URL MinIO tin cậy, rồi tự tải ảnh qua M2M. Presigned URL sẽ hết hạn trong email.
