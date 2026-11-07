# BỘ KỊCH BẢN VÀ MA TRẬN PHẠM VI KIỂM THỬ (TEST SCOPE)
## DỰ ÁN HỆ THỐNG GIÁM SÁT TRANG BỊ BẢO HỘ THÔNG MINH (SMART PPE MONITORING)
*Tài liệu kiểm thử QA & Nghiệm thu chức năng* · *Phiên bản:* 1.0.0

---

## 1. NGUYÊN TẮC THIẾT KẾ VÀ QUY ƯỚC MA TRẬN TEST SCOPE

### 1.1. Căn cứ xây dựng Test Scope
Bộ kịch bản kiểm thử được thiết kế dựa trên:
1. Mã nguồn thực tế tại hệ thống Frontend `fe-ppe` (`app/*`, `src/components/*`, `src/hooks/*`, `src/services/*`, `src/lib/*`).
2. Đặc tả hợp đồng API backend đối chiếu trong `API_CONTRACT_AUDIT_REPORT.md` (87 Endpoints trong 10 Microservices).
3. Thư viện kiểm thử tự động nội bộ (`src/**/__tests__/*`) với 110 ca test đã vượt qua.
4. Tài liệu hành trình nghiệp vụ (`docs/journeys/*`) và các ca test hiện có (`docs/test-cases/*`).

### 1.2. Phân loại Mức độ Ưu tiên (Priority)
- **Critical**: Các tính năng an ninh sống còn, luồng đăng nhập, phiên xác thực, phát hiện vi phạm PPE thời gian thực, thẩm duyệt sự cố pháp lý. Nếu lỗi phải chặn phát hành (Block release).
- **High**: Các nghiệp vụ tác chiến quan trọng: điều phối cán bộ an toàn, cấu hình vùng nhận diện AI ROI, quản lý camera, xuất báo cáo PDF/Excel.
- **Medium**: Các tính năng quản trị danh mục, phân trang, lọc nâng cao, cập nhật hồ sơ, mẫu email thông báo.
- **Low**: Tối ưu giao diện, hiệu ứng chuyển động Neumorphism, nhãn văn bản đa ngôn ngữ, các trường thông tin phụ.

### 1.3. Phân loại Loại hình Kiểm thử (Test Type)
- **Functional**: Kiểm thử chức năng nghiệp vụ end-to-end.
- **UI / Usability**: Kiểm thử giao diện, trạng thái hiển thị Neumorphic, tính thân thiện người dùng.
- **Validation**: Kiểm thử luật kiểm tra dữ liệu đầu vào (Zod schemas, regex, độ dài, định dạng).
- **Integration**: Kiểm thử tích hợp giữa Frontend và Backend API / Kênh SSE.
- **Permission**: Kiểm thử ma trận phân quyền RBAC (200 OK vs 403 Forbidden).
- **Error Handling**: Kiểm thử phục hồi khi mạng mất kết nối, token hết hạn (401), quá tải request (429), bảo trì (503).
- **Boundary**: Kiểm thử giá trị biên, tải dữ liệu lớn, ký tự đặc biệt, chống XSS/SQLi injection.

### 1.4. Quy ước Trạng thái Hiện thực
- `[VERIFIED]`: Đã triển khai đầy đủ cả UI, Hook, API backend và đã kiểm thử đạt.
- `[PARTIAL]`: Đã có UI và gọi API, nhưng một số trường xử lý chuyển đổi cục bộ trên Client.
- `[CLIENT_FALLBACK]`: Đã có giao diện, có kết nối API nhưng hỗ trợ dữ liệu giả lập dự phòng khi backend trả rỗng (VD: AI Sandbox, live tracking video).
- `[TODO / UNIMPLEMENTED]`: Tính năng mới có placeholder trên giao diện hoặc backend chưa cung cấp API.

---

## 2. MA TRẬN KỊCH BẢN KIỂM THỬ CHI TIẾT THEO PHÂN HỆ

### 2.1. Phân hệ 1: Xác thực & Quản lý Phiên An toàn (`AUTH-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **AUTH-001** | Đăng nhập tài khoản hợp lệ | Đã ở `/login`, có tài khoản `admin@ppe.local` | 1. Nhập email: `admin@ppe.local`<br>2. Nhập mật khẩu: `Admin@123456`<br>3. Bấm "Đăng nhập" | Toast xanh "Đăng nhập thành công". Lưu token vào bộ nhớ, cookie session được gán. Tự động chuyển hướng về `/dashboard`. | `POST /auth/login`<br>`GET /auth/me` | Critical | Functional | `[VERIFIED]` |
| **AUTH-002** | Đăng nhập sai mật khẩu (Đếm số lần thất bại) | Đang ở `/login` | 1. Nhập email: `user@ppe.local`<br>2. Nhập sai mật khẩu: `Wrong@123`<br>3. Bấm "Đăng nhập" | Hiển thị thông báo đỏ "Thông tin đăng nhập không chính xác". Trường mật khẩu được làm sạch. Không điều hướng trang. | `POST /auth/login` | High | Error Handling | `[VERIFIED]` |
| **AUTH-003** | Khóa tài khoản sau 5 lần sai liên tiếp | Đang ở `/login` | 1. Nhập sai mật khẩu 5 lần liên tiếp với `user@ppe.local` | Lần thứ 5 hệ thống trả về mã lỗi `ACCOUNT_LOCKED`. Toast cảnh báo: "Tài khoản bị tạm khóa 15 phút do nhập sai nhiều lần". Nút đăng nhập bị khóa. | `POST /auth/login` | Critical | Error Handling | `[VERIFIED]` |
| **AUTH-004** | Đăng nhập với tài khoản kích hoạt 2FA | Tài khoản đã bật TOTP 2FA | 1. Nhập email + password đúng<br>2. Bấm "Đăng nhập" | Backend trả về `requires2FA: true` và `tempToken`. FE lưu `tempToken` vào sessionStorage và chuyển tiếp sang `/2fa`. | `POST /auth/login` | Critical | Integration | `[VERIFIED]` |
| **AUTH-005** | Xác thực OTP 2FA thành công | Đang ở `/2fa` với `tempToken` hợp lệ | 1. Nhập mã 6 số từ Google Authenticator<br>2. Bấm "Xác thực" | Backend xác minh mã chuẩn xác, cấp cặp Token chính thức. Xóa `tempToken`, chuyển tiếp vào `/dashboard`. | `POST /auth/2fa/verify` | Critical | Functional | `[VERIFIED]` |
| **AUTH-006** | Xác thực OTP 2FA bằng Mã sao lưu (Backup Code) | Không có điện thoại, có mã sao lưu 10 ký tự | 1. Bấm "Sử dụng mã sao lưu khẩn cấp"<br>2. Nhập mã sao lưu hợp lệ | Xác thực thành công, mã sao lưu đã dùng bị vô hiệu hóa trong DB. Điều hướng vào `/dashboard`. | `POST /auth/2fa/verify` | High | Functional | `[VERIFIED]` |
| **AUTH-007** | Đăng nhập bằng Google OAuth 2.0 | Chưa đăng nhập, có tài khoản Google | 1. Bấm nút "Đăng nhập bằng Google"<br>2. Chọn tài khoản Google và cấp quyền | Google redirect về `/auth/callback?code=...&state=...`. FE đổi code lấy token thành công, điều hướng vào `/dashboard`. | `GET /auth/google/url`<br>`POST /auth/google` | High | Integration | `[VERIFIED]` |
| **AUTH-008** | Cơ chế Refresh Token Single-flight Mutex | Phiên đăng nhập đang chạy, Access Token hết hạn | 1. Mở song song 3 tab gọi 3 API khác nhau khi token vừa hết hạn 15 phút | Axios Interceptor chặn 3 request, gom lại chờ CHUNG 1 Promise gọi `POST /auth/refresh`. Sau khi nhận token mới, cả 3 request gốc tự động retry thành công mà không bị văng đăng nhập. | `POST /auth/refresh` | Critical | Integration | `[VERIFIED]` |
| **AUTH-009** | Thu hồi phiên khi Refresh Token bị từ chối | Token hết hạn 7 ngày hoặc bị revoke | 1. Giả lập Backend trả về lỗi 401 khi refresh token | FE xóa sạch `tokenStore`, kích hoạt sự kiện `auth:session-expired`, xóa cookie và điều hướng tức thì về `/login?next=...`. | `POST /auth/logout` | Critical | Error Handling | `[VERIFIED]` |
| **AUTH-010** | Đăng xuất chủ động (Logout) | Đang đăng nhập | 1. Mở UserMenu góc trên bên phải<br>2. Bấm "Đăng xuất" | Gọi `POST /auth/logout` dọn dẹp cookie backend, xóa token in-memory, xóa cache React Query, chuyển hướng về `/login`. | `POST /auth/logout` | High | Functional | `[VERIFIED]` |
| **AUTH-011** | Cưỡng chế đổi mật khẩu (`mustChangePassword`) | Tài khoản được đánh dấu `mustChangePassword: true` | 1. Đăng nhập thành công | Route Guard tầng 2 (`AuthLayout`) phát hiện cờ, tự động khóa mọi đường dẫn và chuyển hướng cưỡng bức về `/change-password`. | `GET /auth/me`<br>`PUT /auth/password` | High | Permission | `[VERIFIED]` |
| **AUTH-012** | Đổi mật khẩu thành công hủy toàn bộ phiên cũ | Đang ở `/change-password` | 1. Nhập mật khẩu cũ<br>2. Nhập mật khẩu mới thỏa mãn độ mạnh<br>3. Bấm xác nhận | Đổi mật khẩu thành công, toàn bộ Refresh Token của các thiết bị khác bị thu hồi. Người dùng tự động bị đăng xuất để đăng nhập lại bằng mật khẩu mới. | `PUT /auth/password` | High | Functional | `[VERIFIED]` |
| **AUTH-013** | Khôi phục mật khẩu qua Email | Đang ở `/forgot-password` | 1. Nhập email hợp lệ<br>2. Bấm "Gửi liên kết" | Hệ thống thông báo đã gửi email. Nhận link `reset-password?token=...`, mở link đổi mật khẩu mới thành công. | `POST /auth/forgot-password`<br>`POST /auth/reset-password` | High | Functional | `[VERIFIED]` |
| **AUTH-014** | Kích hoạt xác thực 2 bước (TOTP Setup) | Đang ở `/settings/security` | 1. Bấm "Bật 2FA"<br>2. Quét mã QR vào app Authenticator<br>3. Nhập mã 6 số xác nhận | Kích hoạt 2FA thành công, hiển thị Modal 10 mã sao lưu khẩn cấp kèm nút tải file text về máy tính. | `POST /auth/2fa/setup`<br>`POST /auth/2fa/enable` | High | Functional | `[VERIFIED]` |
| **AUTH-015** | Đăng xuất thiết bị từ xa (Remote Session Revoke) | Đang ở `/settings/security` tab Phiên | 1. Quan sát danh sách thiết bị đang online<br>2. Bấm icon thùng rác tại 1 phiên thiết bị lạ | Gọi API xóa session mục tiêu. Thiết bị lạ đó khi thực hiện thao tác kế tiếp sẽ bị đá về màn hình đăng nhập. | `GET /auth/sessions`<br>`DELETE /auth/sessions/:id` | High | Functional | `[VERIFIED]` |

---

### 2.2. Phân hệ 2: Phân Quyền Vai Trò & Chặn Truy Cập (`RBAC-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **RBAC-001** | Kiểm tra quyền truy cập của Quản trị viên (`ADMIN`) | Đăng nhập tài khoản `admin@ppe.local` | 1. Mở lần lượt các menu trên thanh Sidebar | Toàn bộ 13 menu đều sáng và truy cập thành công: Dashboard, Sự cố, Camera, Công trường, Báo cáo, AI Metrics, Người dùng, Vai trò, Kiểm toán, Cấu hình, Bảo trì, Thông báo. | `GET /auth/me` | Critical | Permission | `[VERIFIED]` |
| **RBAC-002** | Chặn màn hình Quản trị với Trưởng ban an toàn (`SAFETY_MANAGER`)| Đăng nhập `manager@ppe.local` | 1. Quan sát thanh Sidebar<br>2. Thử gõ trực tiếp URL `/roles` hoặc `/users` | Thanh Sidebar ẩn hoàn toàn mục "Người dùng" và "Vai trò". Khi cố tình gõ URL, màn hình hiển thị `ForbiddenView` (403 Truy cập bị từ chối). | `src/config/navigation.ts` | Critical | Permission | `[VERIFIED]` |
| **RBAC-003** | Chặn quyền xóa và xuất báo cáo với Cán bộ hiện trường (`SAFETY_OFFICER`)| Đăng nhập `officer@ppe.local` | 1. Vào danh sách sự cố `/incidents`<br>2. Vào báo cáo `/reports` | Tại `/incidents`, nút "Xóa sự cố" bị ẩn hoặc disabled. Nút "Xuất báo cáo" trên Header không xuất hiện do thiếu `PPE_REPORTING_EXPORT`. | `src/config/navigation.ts` | High | Permission | `[VERIFIED]` |
| **RBAC-004** | Giới hạn quyền tối đa của Công nhân (`USER`) | Đăng nhập `user@ppe.local` | 1. Mở ứng dụng | Chỉ thấy mục Bảng điều khiển (bản rút gọn), Thông báo và Cài đặt cá nhân. Mọi đường dẫn quản trị camera, công trường, sự cố đều bị chặn 403. | `ROUTE_PERMISSIONS` | Critical | Permission | `[VERIFIED]` |
| **RBAC-005** | Tạo Vai trò mới kèm cấp quyền động | Đăng nhập `ADMIN`, vào `/roles` | 1. Bấm "Tạo vai trò"<br>2. Nhập tên `SAFETY_INSPECTOR`<br>3. Chọn các quyền mong muốn<br>4. Lưu | Vai trò mới xuất hiện trên bảng dữ liệu, có thể gán cho người dùng mới ngay lập tức. | `POST /rbac/roles` | High | Functional | `[VERIFIED]` |
| **RBAC-006** | Đồng bộ Ma trận Quyền (Sync Permissions Matrix) | Đang ở `/roles` | 1. Mở Drawer ma trận quyền của 1 vai trò tùy biến<br>2. Tích chọn thêm quyền `PPE_REPORTING_EXPORT`<br>3. Bấm "Lưu thay đổi" | Gọi `POST /rbac/roles/:id/permissions`. Toàn bộ người dùng thuộc vai trò đó được cập nhật quyền mới sau khi tải lại trang. | `POST /rbac/roles/:id/permissions` | High | Functional | `[VERIFIED]` |
| **RBAC-007** | Bảo vệ Vai trò Hệ thống mặc định (System Protected) | Đang ở `/roles` | 1. Thử bấm xóa hoặc đổi tên vai trò `ADMIN` hoặc `USER` | Nút xóa bị disabled hoặc backend trả về lỗi từ chối xóa vai trò hệ thống (`isSystem: true`). | `DELETE /rbac/roles/:id` | High | Boundary | `[VERIFIED]` |
| **RBAC-008** | Gán vai trò cho người dùng từ màn hình Quản lý người dùng | Đăng nhập `ADMIN`, vào `/users` | 1. Bấm sửa quyền của người dùng<br>2. Đổi từ `USER` sang `SAFETY_OFFICER`<br>3. Lưu | Vai trò được cập nhật thành công trong Database. Người dùng đó nhận quyền mới ở phiên đăng nhập kế tiếp. | `PUT /rbac/users/:id/role` | High | Functional | `[VERIFIED]` |

---

### 2.3. Phân hệ 3: Bảng Điều Khiển Chỉ Huy Tác Chiến (`DASH-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **DASH-001**| Render đầy đủ Khối KPI & Mô hình 3D Nón Bảo Hộ | Đã đăng nhập vào `/dashboard` | 1. Mở trang `/dashboard`<br>2. Dùng chuột xoay nón bảo hộ 3D | Mô hình nón 3D (`HelmetShowcase`) xoay mượt mà theo thao tác chuột. 4 thẻ KPI điền đầy đủ số liệu: Tổng vi phạm, Tuân thủ %, Camera trực tuyến, Công trường. | `GET /statistics/summary`<br>`GET /cameras`<br>`GET /sites` | Medium | UI / Functional | `[VERIFIED]` |
| **DASH-002**| Tiếp nhận Cảnh báo Vi phạm qua kênh SSE thời gian thực | Đang mở `/dashboard`, kết nối SSE ổn định (Badge xanh) | 1. Backend bắn sự kiện SSE vi phạm PPE mới | Đèn chuông nhấp nháy, phát âm thanh cảnh báo, thẻ vi phạm mới tự chèn lên đầu danh sách `DashboardLiveIncidents` kèm hiệu ứng viền đỏ Neumorphic phát sáng. | `GET /notifications/stream`<br>`soundService` | Critical | Integration | `[VERIFIED]` |
| **DASH-003**| Thẩm duyệt nhanh vi phạm ngay tại Dashboard | Thấy vi phạm ở danh sách Live Incidents | 1. Bấm nút "Thẩm duyệt"<br>2. Modal `ReviewIncidentModal` mở ra<br>3. Chọn "Xác nhận vi phạm" + Ghi chú<br>4. Submit | Sự cố đổi trạng thái thành `CONFIRMED`, số đếm vi phạm chờ thẩm duyệt giảm đi 1 đơn vị, toast xanh báo thành công. | `POST /incidents/:id/review` | High | Functional | `[VERIFIED]` |
| **DASH-004**| Chuyển đổi Biểu đồ Vành Khăn Vi Phạm & Điểm Nóng Camera | Đang ở `/dashboard` | 1. Bấm pill "Phân bổ PPE"<br>2. Bấm pill "Điểm nóng Camera" | Chuyển đổi mượt mà giữa biểu đồ Donut phân loại vi phạm và bảng xếp hạng Top 5 camera ghi nhận nhiều lỗi nhất. | `GET /statistics/by-violation`<br>`GET /statistics/by-camera` | Medium | UI / Functional | `[VERIFIED]` |
| **DASH-005**| Lọc Bảng điều khiển theo từng Công trường (Site Selector) | Có ít nhất 2 công trường | 1. Trên thanh Header, chọn công trường B | Toàn bộ số liệu KPI, danh sách vi phạm và biểu đồ tự động refetch theo `siteId` của công trường B. Lưu lựa chọn vào LocalStorage. | `SiteContext`<br>`GET /statistics/summary?siteId=...` | High | Functional | `[VERIFIED]` |
| **DASH-006**| Khởi chạy Modal Xuất Báo Cáo nhanh | Có quyền `PPE_REPORTING_EXPORT` | 1. Bấm nút "Xuất báo cáo" trên Header<br>2. Chọn định dạng PDF<br>3. Bấm "Tải xuống" | Khởi tạo tác vụ xuất báo cáo, trình duyệt tự động tải xuống file PDF báo cáo an toàn. | `POST /reports/export` | High | Functional | `[VERIFIED]` |
| **DASH-007**| Hiển thị Thẻ Telemetry Trí tuệ Nhân tạo | Đang ở `/dashboard` | 1. Quan sát thẻ `DashboardAiStatusCard` | Hiển thị phiên bản mô hình YOLO đang chạy (VD: YOLOv11x), chỉ số mAP50, thời gian trễ mili-giây và tốc độ FPS thực tế. | `GET /ai-models/active` | Medium | UI / Functional | `[VERIFIED]` |
| **DASH-008**| Khôi phục trạng thái khi SSE mất kết nối | Đang ở `/dashboard` | 1. Ngắt kết nối mạng hoặc server notification tắt | Badge kết nối chuyển sang màu xám "Mất kết nối". Giao diện không bị crash, các tính năng tra cứu tĩnh vẫn hoạt động bình thường. Khi mạng phục hồi, SSE tự động kết nối lại. | `RealtimeProvider` | High | Error Handling | `[VERIFIED]` |

---

### 2.4. Phân hệ 4: Quản lý Vòng Đời Sự Cố & Bằng Chứng AI (`INC-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **INC-001** | Tìm kiếm & Lọc sự cố vi phạm đa tiêu chí | Vào `/incidents` | 1. Nhập từ khóa tìm kiếm<br>2. Lọc Mức độ: `CRITICAL`<br>3. Lọc Trạng thái: `PENDING_REVIEW` | Bảng dữ liệu tự động lọc debounced sau 300ms, chỉ hiển thị đúng các bản ghi khớp với điều kiện lọc. Phân trang cập nhật chính xác. | `GET /incidents` | High | Functional | `[VERIFIED]` |
| **INC-002** | Xem Chi tiết Sự cố & Bằng chứng Bounding Boxes | Bấm vào 1 sự cố tại bảng | 1. Mở trang `/incidents/[id]` | Hiển thị đầy đủ tiến trình 6 bước, thông tin thiết bị, vị trí và ảnh chụp bằng chứng có vẽ hộp nhận diện AI xung quanh vùng vi phạm. | `GET /incidents/:id`<br>`GET /evidences/:id/download-url` | Critical | Functional | `[VERIFIED]` |
| **INC-003** | Giám định Tính toàn vẹn Bằng chứng SHA-256 Checksum | Đang ở `/incidents/[id]` | 1. Bấm nút "Kiểm tra mã băm toàn vẹn" tại `IncidentChecksumVerifier` | FE gọi API tính mã băm file trên MinIO và so sánh với mã trong DB. Nếu khớp, hiển thị badge xanh "Toàn vẹn 100% - Không bị chỉnh sửa". | `GET /evidences/:id/verify-checksum` | Critical | Functional | `[VERIFIED]` |
| **INC-004** | Phân công Cán bộ An toàn phụ trách hiện trường | Sự cố ở trạng thái `CONFIRMED` | 1. Bấm nút "Phân công cán bộ"<br>2. Chọn nhân sự từ danh sách<br>3. Nhập hạn xử lý và ghi chú<br>4. Lưu | Modal đóng lại, sự cố chuyển sang `ASSIGNED`. Tên cán bộ hiển thị trên thẻ `IncidentAssignmentCard`. | `POST /incidents/:id/assignments` | High | Functional | `[VERIFIED]` |
| **INC-005** | Cập nhật Giải pháp Khắc phục Hiện trường | Sự cố đang ở `RESOLVING` | 1. Bấm "Cập nhật giải pháp"<br>2. Nhập nội dung khắc phục: "Đã cấp phát nón mới cho công nhân"<br>3. Submit | Sự cố chuyển trạng thái sang `RESOLVED`. Bước tiến trình trên Stepper nhảy sang bước Đã khắc phục. | `POST /incidents/:id/resolve` | High | Functional | `[VERIFIED]` |
| **INC-006** | Nghiệm thu Đóng Sự cố An toàn | Sự cố ở trạng thái `RESOLVED` | 1. Trưởng ban an toàn bấm "Nghiệm thu đóng"<br>2. Xác nhận tại Dialog | Sự cố chuyển sang trạng thái cuối cùng `CLOSED`. Hoàn tất vòng đời xử lý vi phạm. | `POST /incidents/:id/close` | High | Functional | `[VERIFIED]` |
| **INC-007** | Bác bỏ Báo động Giả (Dismiss False Alert) | Sự cố ở `DETECTED` hoặc `PENDING_REVIEW` | 1. Bấm "Bác bỏ vi phạm"<br>2. Chọn lý do: "Báo động giả / Công nhân đang trong khu vực nghỉ ngơi"<br>3. Xác nhận | Sự cố chuyển sang `DISMISSED`. Bản ghi được gắn nhãn để phục vụ tinh chỉnh lại mô hình AI. | `POST /incidents/:id/review` | High | Functional | `[VERIFIED]` |
| **INC-008** | Gửi Thảo luận Hiện trường (Timeline Comments) | Đang ở `/incidents/[id]` | 1. Nhập nội dung tại khung thảo luận: "Đội kiểm tra đã có mặt tại phân khu 2"<br>2. Bấm "Gửi" | Bình luận mới xuất hiện ngay lập tức trên dòng thời gian kèm tên người gửi và mốc giờ chính xác. | `POST /incidents/:id/comments` | Medium | Functional | `[VERIFIED]` |
| **INC-009** | Xóa sự cố vi phạm | Có quyền `PPE_INCIDENT_MANAGE` | 1. Bấm nút "Xóa" tại bảng danh sách<br>2. Xác nhận cảnh báo | Gọi `DELETE /incidents/:id`. Bản ghi biến mất khỏi bảng và dữ liệu thống kê được cập nhật lại. | `DELETE /incidents/:id` | Medium | Functional | `[VERIFIED]` |
| **INC-010** | Tải ảnh bằng chứng vi phạm độ nét cao | Đang ở `/incidents/[id]` | 1. Rê chuột vào ảnh bằng chứng<br>2. Bấm nút "Tải ảnh gốc" | Tải file ảnh chụp định dạng JPEG/PNG trực tiếp từ MinIO qua liên kết an toàn. | `GET /evidences/:id/download-url` | Medium | Functional | `[VERIFIED]` |

---

### 2.5. Phân hệ 5: Hạ Tầng Camera, Streaming & Vùng Nhận Diện AI ROI (`CAM-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **CAM-001** | Tạo Camera Giám Sát mới | Có quyền `PPE_CAMERA_MANAGE` | 1. Tại `/cameras`, bấm "Thêm camera"<br>2. Nhập Tên, URL luồng RTSP/HLS, chọn Công trường, Phân khu<br>3. Lưu | Camera mới xuất hiện trên danh sách với trạng thái khởi tạo `OFFLINE` hoặc đang kiểm tra luồng. | `POST /cameras` | High | Functional | `[VERIFIED]` |
| **CAM-002** | Chuyển đổi 3 Chế độ Xem (Grid, Table, Video Wall) | Đang ở `/cameras` | 1. Lần lượt bấm nút chuyển đổi: Thẻ lưới, Bảng, Tường video | Giao diện chuyển đổi tức thì không làm mất trạng thái. Chế độ Tường Video hiển thị đồng thời các luồng camera đang trực tuyến. | Cục bộ | Medium | UI | `[VERIFIED]` |
| **CAM-003** | Thay đổi Layout Tường Video (1x1, 2x2, 3x3) | Đang ở chế độ Video Wall | 1. Chọn layout `2x2`<br>2. Chọn layout `3x3` | Lưới video tự động co giãn hiển thị 4 khung hình hoặc 9 khung hình tương ứng. Luồng video duy trì ổn định. | Cục bộ | Medium | UI | `[VERIFIED]` |
| **CAM-004** | Kiểm tra Nhịp tim & Đo Độ trễ Ping Camera | Đang ở `/cameras` | 1. Bấm icon nhịp tim tại thẻ camera<br>2. Hộp thoại `CameraHealthDialog` mở ra<br>3. Bấm "Ping thiết bị" | Backend thực hiện ping thực tế đến camera, trả về trạng thái `ONLINE` và độ trễ Ping thời gian thực (ví dụ: `38ms`). | `POST /cameras/:id/ping`<br>`GET /cameras/:id/health-logs` | High | Functional | `[VERIFIED]` |
| **CAM-005** | Mở Trạm Thị Giác AI Thời Gian Thực (`/cameras/[id]`) | Bấm vào 1 camera đang hoạt động | 1. Mở `/cameras/[id]` | Trình phát `CameraIntelligencePlayer` phát luồng mượt mà. Canvas 2D vẽ các khung hộp bám vết người lao động và trạng thái bảo hộ. | `GET /cameras/:id`<br>`LiveTrackingEngine` | Critical | Functional | `[CLIENT_FALLBACK]`|
| **CAM-006** | Cấu hình Vùng Nhận Diện Đa Giác (AI ROI Canvas) | Có quyền `PPE_CAMERA_MANAGE` | 1. Mở Drawer `CameraRoiDrawer`<br>2. Dùng chuột click các điểm trên khung hình để tạo đa giác khép kín<br>3. Bấm "Lưu cấu hình" | Tọa độ đa giác `roiPolygon: Point[]` được gửi lên backend và lưu vào DB. AI worker sẽ chỉ quét PPE trong phạm vi đa giác này. | `PUT /cameras/:id/config` | High | Functional | `[VERIFIED]` |
| **CAM-007** | Đặt lại Cấu hình AI ROI về mặc định toàn màn hình | Drawer ROI đang mở | 1. Bấm nút "Đặt lại vùng nhận diện" | Tọa độ đa giác bị xóa, camera chuyển sang chế độ quét toàn bộ khung hình camera (Full frame). | `POST /cameras/:id/config/reset` | Medium | Functional | `[VERIFIED]` |
| **CAM-008** | Lọc Camera theo Trạng thái (Online / Offline) | Đang ở `/cameras` | 1. Bấm vào thẻ KPI "Camera mất tín hiệu" | URL cập nhật `?stat=diagnostics`, Drawer sự cố hạ tầng trượt ra hiển thị riêng các camera đang mất nguồn hoặc lỗi tín hiệu. | `CameraStatsDetailPanel` | Medium | UI / Functional | `[VERIFIED]` |

---

### 2.6. Phân hệ 6: Không Gian Công Trường & Quy Chuẩn An Toàn (`SITE-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **SITE-001**| Tạo mới Công trường thi công | Quyền `PPE_SITE_MANAGE` | 1. Vào `/sites`, bấm "Thêm công trường"<br>2. Nhập Tên dự án, Địa chỉ, Chủ đầu tư<br>3. Bấm Tạo | Công trường mới xuất hiện trên danh sách với trạng thái `ACTIVE`. | `POST /sites` | High | Functional | `[VERIFIED]` |
| **SITE-002**| Cấu hình Quy tắc Trang bị An toàn Bắt buộc (Safety Rules)| Đang ở `/sites` | 1. Bấm icon khiên an toàn tại thẻ công trường<br>2. Modal `SiteSafetyConfigModal` mở ra<br>3. Tích chọn: Mũ, Áo phản quang, Ủng bảo hộ<br>4. Lưu | Cấu hình an toàn được lưu. Mọi camera thuộc công trường này sẽ áp dụng các quy chuẩn an toàn vừa thiết lập. | `PUT /sites/:id/safety-config` | Critical | Functional | `[VERIFIED]` |
| **SITE-003**| Quản lý Phân khu Thi công (Zones Drawer) | Đang ở `/sites` | 1. Bấm "Quản lý phân khu"<br>2. Thêm Zone mới: "Khu vực tầng hầm B2"<br>3. Lưu | Phân khu mới xuất hiện trong Drawer, sẵn sàng để gán camera vào. | `POST /sites/:id/zones`<br>`GET /sites/:id/zones` | High | Functional | `[VERIFIED]` |
| **SITE-004**| Quản lý Vùng Cấm Nguy Hiểm Cao (Restricted Areas) | Đang ở `/sites` | 1. Thêm Restricted Area mới: "Hố đào sâu - Cấm vào"<br>2. Chọn mức độ nghiêm trọng: `CRITICAL`<br>3. Lưu | Vùng cấm được lưu trữ. Bất kỳ người lao động nào đi vào khu vực này sẽ bị AI bắn sự kiện xâm nhập khẩn cấp. | `POST /sites/:id/restricted-areas` | High | Functional | `[VERIFIED]` |
| **SITE-005**| Mở Trung tâm Chỉ huy Chi tiết Công trường (`/sites/[id]`)| Bấm vào 1 công trường | 1. Mở `/sites/[id]`<br>2. Duyệt qua 6 tabs chức năng | Hiển thị đầy đủ 6 tabs: Phân khu, Camera trực tiếp, Quy tắc an toàn, Sự cố vi phạm, Cán bộ phụ trách, và Biểu đồ phân tích của riêng công trường. | `GET /sites/:id` | High | Functional | `[VERIFIED]` |
| **SITE-006**| Lưu trữ Công trường hoàn thành (Archive Site) | Công trường đã thi công xong | 1. Chọn thao tác "Lưu trữ công trường"<br>2. Xác nhận | Công trường chuyển trạng thái sang `ARCHIVED`. Tắt toàn bộ luồng camera của dự án để tiết kiệm tài nguyên. | `POST /sites/:id/archive` | Medium | Functional | `[VERIFIED]` |

---

### 2.7. Phân hệ 7: Báo Cáo An Toàn & Xuất Dữ Liệu (`REP-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **REP-001** | Xem Biểu đồ Xu hướng Vi phạm theo Ngày/Tuần/Tháng | Vào `/reports` | 1. Tại bộ lọc, chọn nhóm theo `WEEK`<br>2. Chọn khoảng ngày 30 ngày qua | Biểu đồ xu hướng tự động cập nhật lại các mốc tuần, hiển thị số ca vi phạm tăng/giảm trực quan. | `GET /statistics/trends` | High | Functional | `[VERIFIED]` |
| **REP-002** | Xuất Báo cáo An toàn định dạng PDF | Có quyền `PPE_REPORTING_EXPORT` | 1. Bấm "Tạo báo cáo mới"<br>2. Chọn mẫu "Báo cáo Tuân thủ Tổng hợp"<br>3. Chọn định dạng `PDF`<br>4. Bấm "Xuất file" | Tác vụ xuất file được tạo. Bảng lịch sử hiển thị trạng thái `COMPLETED` và file PDF tự động tải xuống máy tính. | `POST /reports/export`<br>`GET /reports/:id/content` | Critical | Functional | `[VERIFIED]` |
| **REP-003** | Xuất Báo cáo định dạng Excel | Đang ở `/reports` | 1. Chọn định dạng `EXCEL`<br>2. Submit xuất file | Tải về file bảng tính `.xlsx` chứa danh sách chi tiết từng sự cố vi phạm kèm thời gian, địa điểm, người xử lý. | `POST /reports/export` | High | Functional | `[VERIFIED]` |
| **REP-004** | Tải lại Báo cáo cũ từ Bảng Lịch Sử | Có các báo cáo đã xuất trước đó | 1. Bấm nút "Tải xuống" tại 1 bản ghi cũ trong bảng lịch sử | Trình duyệt kích hoạt tải trực tiếp nội dung file Blob từ backend về máy tính. | `GET /reports/:id/content` | Medium | Functional | `[VERIFIED]` |

---

### 2.8. Phân hệ 8: Đo Lường & Quản Trị Mô Hình AI (`AIM-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **AIM-001** | Kiểm tra Chỉ số Đánh giá Hiệu năng Mô hình AI | Vào `/ai-metrics` | 1. Quan sát thẻ KPI và Ma trận nhầm lẫn | Hiển thị đầy đủ mAP50, Latency, FPS, và Bản đồ nhiệt Heatmap phân loại đúng/sai giữa các nhãn trang bị bảo hộ. | `GET /statistics/ai-performance` | High | Functional | `[VERIFIED]` |
| **AIM-002** | Triển khai Phiên bản Mô hình AI Mới (Model Deployment)| Quyền `PPE_MODEL_MANAGE` | 1. Tại bảng danh sách phiên bản, chọn phiên bản v2.5<br>2. Bấm "Triển khai"<br>3. Xác nhận tại Dialog | Phiên bản v2.5 trở thành phiên bản kích hoạt (`ACTIVE`). Dải Banner trên cùng đổi sang phiên bản mới. | `POST /ai-models/:id/deploy` | Critical | Functional | `[VERIFIED]` |
| **AIM-003** | Chạy Thử nghiệm AI Sandbox với Video/Ảnh tải lên | Vào `/ai-metrics/test` | 1. Tải lên video mẫu `ai-cctv-sample.mp4`<br>2. Bấm "Bắt đầu phân tích" | Trình phát video Sandbox chạy mô phỏng suy luận YOLO, vẽ các hộp Bounding Boxes và danh sách các sự cố vi phạm phát hiện trong video. | `/api/ai-sandbox/analyze` | Medium | Functional | `[CLIENT_FALLBACK]`|

---

### 2.9. Phân hệ 9: Quản Trị Hệ Thống, Cờ Tính Năng & Bảo Trì (`SYS-xxx` & `MAINT-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **SYS-001** | Bật / Tắt Cờ Tính Năng (Feature Flags) | Vào `/system` tab Flags | 1. Gạt switch cờ tính năng "Bật AI Sandbox công khai"<br>2. Xác nhận tại Dialog | Cờ tính năng chuyển trạng thái tức thì. Ứng dụng áp dụng thay đổi ngay mà không cần reload trang. | `PATCH /system/configs/:key` | High | Functional | `[VERIFIED]` |
| **SYS-002** | Kiểm tra Ma Trận Sức Khỏe 10 Microservices | Vào `/system` tab Health | 1. Bấm "Kiểm tra lại toàn bộ" | Bảng ma trận hiển thị nhịp tim (200 OK / Healthy) và thời gian phản hồi (ms) của cả 10 Microservices. | `GET /system/health` | High | Functional | `[VERIFIED]` |
| **MAINT-001**| Kích hoạt Chế độ Bảo trì Hệ thống | Quyền `MAINTENANCE_MANAGE` | 1. Vào `/maintenance`<br>2. Gạt bật bảo trì, nhập lý do: "Nâng cấp máy chủ AI"<br>3. Lưu | Cờ bảo trì được kích hoạt. Quản trị viên thấy dải banner vàng cảnh báo trên Header. | `POST /maintenance/enable` | Critical | Functional | `[VERIFIED]` |
| **MAINT-002**| Kiểm tra Màn hình Khóa Bảo trì với Người dùng thường | Bảo trì đang bật | 1. Mở tab ẩn danh đăng nhập tài khoản công nhân `user@ppe.local` | Bị chặn toàn bộ trang web, hiển thị màn hình `MaintenanceScreen` có biểu tượng cờ lê và thông điệp bảo trì. Không thể vào `/dashboard`. | `GET /maintenance/status` | Critical | Permission | `[VERIFIED]` |
| **MAINT-003**| Tắt Chế độ Bảo trì | Quyền `MAINTENANCE_MANAGE` | 1. Bấm "Tắt chế độ bảo trì"<br>2. Xác nhận | Hệ thống mở lại bình thường, người dùng thường có thể đăng nhập và sử dụng ứng dụng ngay. | `POST /maintenance/disable` | Critical | Functional | `[VERIFIED]` |

---

### 2.10. Phân hệ 10: Xử Lý Lỗi Mạng, Phục Hồi & Kiểm Thử Biên (`EDGE-xxx` & `RESP-xxx`)

| Test ID | Phân hệ & Tính năng | Tiền điều kiện | Các bước thực hiện | Kết quả mong đợi | API liên quan | Ưu tiên | Loại test | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **EDGE-001**| Xử lý khi Mất Kết Nối Mạng Hoàn Toàn (Offline)| Đang thao tác trên ứng dụng | 1. Ngắt kết nối Wi-Fi/Internet trên máy tính<br>2. Thực hiện bấm lưu biểu mẫu | Axios Interceptor bắt mã lỗi `status: 0`, toast thông báo đỏ: "Không thể kết nối máy chủ. Vui lòng kiểm tra đường truyền mạng". Dữ liệu form không bị mất. | `src/lib/axios.ts` | High | Error Handling | `[VERIFIED]` |
| **EDGE-002**| Xử lý Giới Hạn Tần Suất Gửi Yêu Cầu (Rate Limit 429)| Đang đăng nhập | 1. Gửi liên tục hàng chục request trong 1 giây để trigger rate limit | Backend trả về mã lỗi 429 và header `Retry-After`. Toast thông báo: "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau X giây". | `ErrorCode.RATE_LIMIT_EXCEEDED` | Medium | Error Handling | `[VERIFIED]` |
| **EDGE-003**| Nhập Ký tự Đặc biệt & Kiểm tra Chống Tấn công XSS | Bất kỳ biểu mẫu nhập liệu nào | 1. Nhập vào ô Họ tên hoặc Tên camera: `<script>alert(1)</script>` | Ứng dụng mã hóa an toàn các thẻ HTML, hiển thị chuỗi ký tự nguyên bản dưới dạng text thuần, không thực thi mã độc. | React JSX / Zod | High | Boundary | `[VERIFIED]` |
| **RESP-001**| Kiểm tra Giao diện trên Màn hình Thiết bị Di động (Mobile / Tablet)| Mở trình duyệt giả lập màn hình iPhone/iPad (Width 375px - 768px) | 1. Mở các màn hình chính | Thanh Sidebar tự động ẩn và chuyển thành Mobile Drawer trượt ra khi bấm menu burger. Bảng dữ liệu hỗ trợ cuộn ngang mượt mà. | Tailwind CSS Responsive | High | UI / Responsive | `[VERIFIED]` |
| **RESP-002**| Chuyển đổi Giao diện Tối / Sáng (Dark / Light Neumorphism)| Đang ở bất kỳ màn hình nào | 1. Bấm nút chuyển Theme trên Header | Toàn bộ các bóng đổ Neumorphic (`--shadow-dark`, `--shadow-light`) và màu nền chuyển đổi tức thời không bị nhấp nháy giao diện. | `ThemeProvider` | Medium | UI | `[VERIFIED]` |

---

## 3. DANH MỤC CÁC TÍNH NĂNG CÒN SÓT & GHI CHÚ TODO CẦN LƯU Ý

Để kiểm thử viên không bị nhầm lẫn giữa lỗi phần mềm và tính năng chưa hoàn thiện, dưới đây là danh sách các hạng mục đã được rà soát:

1. **Luồng Live Video Stream từ Camera thật**:
   - Hiện tại, luồng trực tiếp đang sử dụng file video mẫu tĩnh (`public/videos/ai-cctv-sample.mp4`) để kiểm thử thuật toán và bám vết Bounding Boxes. Cơ chế kết nối tới luồng RTSP/WebRTC thực địa yêu cầu Media Gateway / Nginx-RTMP đang được hoàn thiện ở tầng Backend Camera Service.
2. **AI Sandbox Mode (`/ai-metrics/test`)**:
   - Chức năng phân tích video tải lên đang sử dụng API cục bộ của Next.js route handler (`app/api/ai-sandbox/analyze/route.ts`) đóng vai trò proxy chuyển tiếp tới AI Worker.
3. **Mã băm SHA-256 đối với ảnh bằng chứng mới**:
   - Tính năng kiểm tra mã băm toàn vẹn SHA-256 yêu cầu file ảnh phải tồn tại trên Object Storage MinIO. Với các bản ghi mẫu thử nghiệm ban đầu (Mock Data), tính năng kiểm tra mã băm có thể trả về cảnh báo không tìm thấy file gốc trên storage.
