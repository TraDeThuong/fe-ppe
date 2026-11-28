# /evidences: các điểm UI chờ quyết định

Nguồn: nhận xét rà soát 3 chiều route `/evidences` (D08.pdf, smart-ppe-incident-service, fe-ppe), cập nhật 2026-11-28.

Phần logic, bảo mật và dữ liệu đã sửa ở FE. Các mục dưới đây đụng tới giao diện nên **chưa sửa**, chờ quyết định.

## Đã làm theo lựa chọn của bạn

Bạn chọn **"Gỡ logic, ẩn nút"** cho Kho Lưu trữ:

- Đã bỏ `localStorage` (`ppe_archived_evidence_ids_v1`).
- Đã ẩn nút Lưu trữ/Khôi phục trên thẻ và bảng, nút "Lưu trữ" ở thanh thao tác hàng loạt, và lựa chọn "Cất vào Kho Lưu trữ" trong modal Dọn dẹp.
- Đã ẩn hẳn nút và modal "Dọn dẹp & Lưu trữ" với tài khoản không có quyền `PPE_INCIDENT_DELETE`. Đây là sửa phân quyền theo đúng nhận xét.

## Đã chốt và đã làm (2026-11-28)

| # | Quyết định |
|---|---|
| 1 | Gỡ tab "Kho Lưu trữ". Link cũ `?scope=archived` tự quay về "Tất cả kho". |
| 2 | Đổi nhãn tab "Đang hiệu lực" thành **"Chưa đóng"**, thêm tooltip giải thích là gồm cả sự cố báo nhầm. |
| 3 | Bỏ hết chữ "Lưu trữ": nút header thành "Dọn dẹp"; modal thành "Trợ lý Dọn dẹp Kho Bằng Chứng"; mô tả các kịch bản; hộp thoại xóa hàng loạt nói rõ bằng chứng của sự cố CLOSED được giữ lại; "Bản kê Lưu trữ" thành "Bản kê CSV". |
| 4 | Gỡ cả bước 2 "Chọn phương thức xử lý". |
| 5 | Kịch bản đổi thành "Dọn bằng chứng Sự cố Đã xử lý (RESOLVED)", chỉ quét và xóa RESOLVED. |
| 6 | Dòng mô tả của thẻ "Tổng minh chứng" có dạng "92% có SHA-256 · 1.24 GB" (khi BE trả dung lượng lớn hơn 0). |
| 7 | Khi `/evidences/summary` lỗi, cả 4 thẻ hiện "—", rê chuột thấy tooltip "Không tải được số liệu". |
| 8 | Placeholder thành "Tìm theo tên file, SHA-256, loại/mô tả vi phạm, mã UUID...". |
| 9 | Nhãn các tab vòng đời dùng key `evidences.scope.*`. |

## Bảng gốc (để tra cứu)

| # | Vị trí | Hiện trạng sau khi sửa logic | Phương án |
|---|---|---|---|
| 1 | Tab **"Kho Lưu trữ"** ở thanh lọc vòng đời | Tab đang lọc `lifecycle=ARCHIVED`. Với BE, giá trị này nghĩa là sự cố CLOSED, nên kết quả **trùng với tab "Sự cố đã đóng"**. Badge số đếm (lấy từ localStorage) đã mất theo. | A. Gỡ tab. B. Đổi tên thành "Hồ sơ đã đóng" rồi gộp với tab "Sự cố đã đóng". C. Giữ nguyên, chờ BE có API lưu trữ bằng chứng thật. |
| 2 | Tab **"Đang hiệu lực"** | BE coi ACTIVE là mọi sự cố *chưa CLOSED*, nên **có cả sự cố DISMISSED**. Trước đây FE lọc bỏ cả DISMISSED. | A. Đổi nhãn/tooltip thành "Chưa đóng". B. Đề nghị Thịnh cho `lifecycle=ACTIVE` loại trừ DISMISSED. |
| 3 | Chữ **"Lưu trữ"** còn sót: nút "Dọn dẹp & Lưu trữ" ở header, tiêu đề và mô tả modal "Trợ lý Dọn dẹp & Lưu trữ…", mô tả kịch bản "Lưu trữ hoặc xóa tệp…", câu "hãy chọn nút Lưu trữ" trong hộp thoại xóa hàng loạt | Tính năng lưu trữ đã gỡ nên các chữ này dễ gây hiểu nhầm. Riêng câu trong hộp thoại xóa hàng loạt đang trỏ tới một nút không còn tồn tại. | Đổi chữ thành "Dọn dẹp", hoặc giữ nguyên nếu sẽ làm lại tính năng lưu trữ. |
| 4 | Bước 2 của modal Dọn dẹp ("Chọn phương thức xử lý") | Bước này giờ chỉ còn một thẻ "Xóa vĩnh viễn". | A. Gỡ cả bước 2. B. Giữ nguyên. |
| 5 | Kịch bản **"Dọn bằng chứng Sự cố Đã xử lý / Đã đóng"** | BE không cho xóa bằng chứng của sự cố CLOSED, nên FE đã loại các bằng chứng này khỏi danh sách xóa. Thực tế kịch bản chỉ còn xóa được bằng chứng của sự cố RESOLVED. | Sửa tiêu đề/mô tả thành "Đã xử lý (RESOLVED)". |
| 6 | Thẻ KPI **"Tổng minh chứng"** | `/evidences/summary` đã trả `totalBytes` (dung lượng toàn bộ kết quả lọc), nhưng UI chưa hiển thị. Nhận xét yêu cầu "hiển thị đúng dung lượng toàn kho". | Thêm dung lượng vào dòng mô tả của thẻ, VD "92% có SHA-256 · 1.24 GB". |
| 7 | Thẻ KPI khi `/evidences/summary` lỗi | Thẻ hiện `0`, trông như kho rỗng. | Hiện "—" kèm tooltip "không tải được số liệu". |
| 8 | Ô tìm kiếm (placeholder "Tìm theo tên file, mã camera, sự cố, SHA-256…") | BE tìm theo tên file, storage key, SHA-256, mô tả/loại vi phạm và UUID đầy đủ. BE **không** tìm theo mã camera hoặc mã công trường như cách lọc phía FE trước đây. | A. Sửa placeholder cho khớp. B. Đề nghị BE thêm tìm theo mã camera. |
| 9 | Nhãn các tab vòng đời ("Tất cả kho", "Đang hiệu lực", …) | Vẫn viết cứng theo kiểu `isVi ? … : …`, chưa đi qua i18n (nhận xét chỉ nêu 2 nhãn "Site / Công trường" và "Loại vi phạm", hai nhãn này đã chuyển sang key i18n). | Chuyển nốt sang key i18n. Việc này không đổi giao diện. |

## Thay đổi nhỏ về hiển thị đã có trong bản sửa

- Nút "Sao chép Link" hiện spinner trong lúc xin presigned URL.
- Tải nhiều tệp: sau khi tải xong có một toast tổng kết. Lần đầu Chrome có thể hỏi quyền "tải nhiều tệp".
- Dải bộ lọc đang bật có thêm chip cho tab vòng đời (nhận xét yêu cầu).
- Dòng mô tả của thẻ KPI "Tổng minh chứng" đổi thành "x% tệp có SHA-256 (toàn bộ kết quả lọc)", thay cho "…trang này…".
