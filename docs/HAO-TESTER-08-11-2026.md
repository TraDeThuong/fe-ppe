# CẨM NANG HƯỚNG DẪN KIỂM THỬ DÀNH CHO TESTER (HÀO)
**Dự án:** Hệ thống giám sát trang bị bảo hộ thông minh (Smart PPE Monitoring)  
**Ngày cập nhật:** 08/11/2026  
**Tài liệu dành cho:** Tester (Hào)  
**Mục tiêu:** Định hướng phạm vi kiểm thử, cung cấp kịch bản thao tác thực tế từ Frontend đến Backend và danh mục tài nguyên cần tra cứu.

---

## I. TỔNG QUAN PHẠM VI KIỂM THỬ HIỆN TẠI

Hệ thống đã được phân loại thành **2 nhóm trang** cụ thể để Tester nắm rõ phạm vi và tránh báo lỗi (log bug) nhầm:

### 1. Nhóm 1: Các trang ĐÃ HOÀN THIỆN 100% (Test đầy đủ logic từ FE đến BE & Database)
*Đây là nhóm trang ưu tiên số 1, Tester có thể thực hiện kiểm thử chức năng, nghiệp vụ, bắt lỗi đầu vào và phân quyền:*

1. **Xác thực & Bảo mật tài khoản** (`/login`, `/2fa`, `/change-password`, `/settings/security`):
   - Đăng nhập với 4 tài khoản tiêu chuẩn tương ứng 4 vai trò (`ADMIN`, `SAFETY_MANAGER`, `SAFETY_OFFICER`, `USER`).
   - Chính sách khóa tạm 15 phút khi gõ sai mật khẩu 5 lần liên tiếp.
   - Đổi mật khẩu cá nhân, cấu hình xác thực 2 bước (Google Authenticator TOTP), mã dự phòng backup.
   - Thu hồi phiên đăng xuất thiết bị từ xa.
2. **Quản lý Người dùng** (`/users` và `/users/[id]`):
   - 4 thẻ KPI (Tổng nhân sự: 20, Đang hoạt động: 11, Bật 2FA: 2, Bị khóa: 9) kết nối trực tiếp API `GET /users/statistics/summary`.
   - **Tương tác trực tiếp**: Click vào từng thẻ KPI để lọc danh sách bảng (`all`, `active`, `locked/inactive`).
   - Thêm mới nhân sự, cập nhật thông tin, gán vai trò, gán công trường, khóa/mở khóa tài khoản.
3. **Quản lý Vai trò & Phân quyền RBAC** (`/roles` và `/roles/[id]`):
   - Danh sách vai trò, tạo vai trò mới tùy biến.
   - Drawer ma trận phân quyền 21 tài nguyên hệ thống, đồng bộ quyền tức thì.
   - Chặn chỉnh sửa/xóa vai trò hệ thống (`ADMIN`, `USER`).
   - Kiểm thử chặn quyền: Dùng tài khoản `SAFETY_MANAGER` hoặc `USER` gõ URL `/roles` hoặc `/users` để kiểm tra màn hình `403 Forbidden`.
4. **Quản lý Công trường & Phân khu** (`/sites` và `/sites/[id]`):
   - Danh sách công trường, tìm kiếm, lọc theo trạng thái (`ACTIVE`, `INACTIVE`, `COMPLETED`).
   - Tạo mới/chỉnh sửa công trường (Tên, mã công trường, ngày bắt đầu/kết thúc, địa chỉ, người quản trị).
   - Vào chi tiết công trường: Thêm phân khu (`Zone`) và thiết lập vùng cấm nguy hiểm (`Restricted Area`).
5. **Nhật ký Kiểm toán Hệ thống** (`/audit-logs`):
   - Toàn bộ thao tác nghiệp vụ tự động ghi vết vào PostgreSQL.
   - Bảng log hiển thị rõ: Người thực hiện (`userEmail`, `userName`, `userRole`), Hành động (`action`), Trạng thái (`SUCCESS`/`FAILED`), IP và thời gian.
   - Lọc theo ngày, người thực hiện, xuất dữ liệu audit log.
6. **Hộp thư Thông báo** (`/notifications`):
   - Danh sách thông báo theo từng tài khoản, đánh dấu đã đọc/chưa đọc, lọc theo kênh (`IN_APP`, `EMAIL`).

---

### 2. Nhóm 2: Các trang hiện tại CHỦ YẾU TEST GIAO DIỆN (UI/UX)
*Các trang này đã kết nối API cơ bản nhưng logic chuyên sâu về Database đang chờ bạn Thịnh (BE) migrate schema thêm:*

1. **Quản lý Camera** (`/cameras` và `/cameras/[id]`):
   - *Test được logic*: Thêm/sửa camera, chọn giao thức (`RTSP`, `HLS`, `HTTP`, `FILE`), ping kiểm tra kết nối mạng (`latency`, `packetLoss`), gán camera vào Site/Zone.
   - *Chỉ test UI*: Vẽ đa giác ROI đa điểm và lưu ngưỡng tin cậy `confidenceThreshold` vào Database (đang chờ Thịnh migrate bảng `camera_configs`).
2. **Quản lý Sự cố Vi phạm** (`/incidents` và `/incidents/[id]`):
   - *Test được logic*: Xem danh sách sự cố, xem chi tiết, hiển thị ảnh vi phạm và ảnh đối chứng (lấy từ MinIO), kiểm tra mã băm toàn vẹn SHA-256, chuyển trạng thái `CONFIRMED` / `RESOLVED` / `CLOSED`.
   - *Chỉ test UI*: Lọc theo `assignedTo` ở server-side (hiện tại FE đang tự lọc an toàn ở client).
3. **Bảng điều khiển Chỉ huy** (`/dashboard`):
   - *Test được*: Hiển thị biểu đồ, xoay nón bảo hộ 3D, tiếp nhận cảnh báo vi phạm thời gian thực qua chuông và popup khi Backend phát sự cố.

---

## II. DANH MỤC TÀI KHOẢN KIỂM THỬ TIÊU CHUẨN

Toàn bộ tài khoản dưới đây đã được khởi tạo sẵn trong cơ sở dữ liệu (`ppe_identity_db`):

| Email đăng nhập | Mật khẩu kiểm thử | Họ và tên hiển thị | Vai trò hệ thống (`Role`) | Mục đích kiểm thử chính |
| :--- | :--- | :--- | :---: | :--- |
| `admin@ppe.local` | `Admin@123456` | Quản Trị Viên Hệ Thống | **`ADMIN`** | Kiểm thử toàn quyền hệ thống, quản lý người dùng, vai trò, cấu hình hạ tầng, xem kiểm toán. |
| `manager@ppe.local` | `Manager@123456` | Nguyễn Văn Quản Lý | **`SAFETY_MANAGER`** | Kiểm thử quyền quản lý an toàn công trường, camera, quy tắc an toàn, thẩm duyệt sự cố, xuất báo cáo. |
| `officer@ppe.local` | `Officer@123456` | Trần Thị An Toàn | **`SAFETY_OFFICER`** | Kiểm thử quyền cán bộ hiện trường, tiếp nhận việc được phân công, cập nhật giải pháp, gửi trao đổi. |
| `user@ppe.local` | `User@123456` | Nguyễn Văn Công Nhân | **`USER`** | Kiểm thử quyền tối thiểu của công nhân, xem thông báo cá nhân, kiểm thử màn hình 403 Forbidden. |

> [!CAUTION]
> **CHÍNH SÁCH KHÓA TÀI KHOẢN**:
> Nhập sai mật khẩu **5 lần liên tiếp** sẽ bị khóa tài khoản trong vòng 15 phút. Khi test tính năng nhập sai mật khẩu, **chỉ dùng tài khoản `user@ppe.local`**, tránh làm khóa tài khoản quản trị `admin@ppe.local`.

---

## III. TÀI LIỆU & NƠI ĐỌC LOGIC NGHIỆP VỤ

Khi cần tra cứu sâu về yêu cầu kỹ thuật và API, Tester tra cứu trực tiếp tại thư mục `docs/tester/`:

1. **Kịch bản Test chi tiết (Test Cases)**: [`docs/tester/03-test-scope.md`](./tester/03-test-scope.md)  
   *Chứa hơn 40 kịch bản chuẩn hóa (Mã test `AUTH-001`, `RBAC-001`, `INC-001`,... Tiền điều kiện, các bước thực hiện, kết quả mong đợi).*
2. **Ánh xạ Màn hình UI với API Backend**: [`docs/tester/06-ui-service-api-mapping.md`](./tester/06-ui-service-api-mapping.md)  
   *Tra cứu nhanh: Khi bấm nút này trên màn hình thì FE sẽ gọi đến API nào của service nào.*
3. **Danh mục Tài khoản & Phân quyền**: [`docs/tester/05-test-accounts-and-roles.md`](./tester/05-test-accounts-and-roles.md)  
   *Chi tiết về 21 tài nguyên phân quyền và ma trận quyền hạn.*
4. **Kiến trúc & Cổng kết nối**: [`docs/tester/01-system-overview.md`](./tester/01-system-overview.md)  
   *Sơ đồ Traefik Gateway (:80), Database (:5433), MinIO (:9000).*
5. **Các điểm BE đang chờ hoàn thiện**: [`Tra_can_Thinh_tro_giup_BE.md`](../Tra_can_Thinh_tro_giup_BE.md)  
   *Nắm trước danh sách các việc BE đang chờ Thịnh hoàn tất để không log bug nhầm.*

---

## IV. HƯỚNG DẪN THAO TÁC TỪNG BƯỚC TỪ FE ĐẾN BE

### Bước 1: Khởi động môi trường kiểm thử
1. **Kiểm tra Backend Docker**:
   ```bash
   cd /Users/thanhtra/D08/D08-DATN/smart-ppe-infra
   docker compose ps
   ```
   *(Toàn bộ 13 container bao gồm Traefik Gateway :80, Postgres :5433, MinIO :9000 đã sẵn sàng và đang chạy).*
2. **Khởi động Frontend**:
   ```bash
   cd /Users/thanhtra/D08/D08-DATN/fe-ppe
   pnpm dev
   ```
   *Mở trình duyệt truy cập: `http://localhost:3000`*

---

### Bước 2: Kịch bản 1 — Xác thực & Phân quyền RBAC
1. **Đăng nhập Admin**:
   - Truy cập `http://localhost:3000/login`.
   - Nhập: `admin@ppe.local` / Mật khẩu: `Admin@123456`.
   - **Luồng BE**: FE gọi `POST http://localhost/api/v1/auth/login` -> Traefik Gateway (:80) chuyển tiếp vào `identity-service:9999` -> Cấp JWT Token.
   - **Kết quả mong đợi**: Chuyển hướng vào `/dashboard`. Thanh Sidebar hiển thị đầy đủ 13 menu quản trị.
2. **Kiểm thử Chặn quyền (RBAC)**:
   - Đăng xuất Admin.
   - Đăng nhập bằng tài khoản Quản lý an toàn: `manager@ppe.local` / `Manager@123456`.
   - **Kết quả mong đợi**: Thanh Sidebar ẩn hoàn toàn mục **"Người dùng"** và **"Vai trò"**.
   - Thử gõ trực tiếp trên thanh địa chỉ: `http://localhost:3000/users` hoặc `http://localhost:3000/roles`.
   - **Kết quả mong đợi**: Giao diện hiển thị trang **403 Forbidden** (Truy cập bị từ chối), không cho phép thao tác.

---

### Bước 3: Kịch bản 2 — Quản lý Người dùng & Tương tác Thẻ KPI
1. Đăng nhập lại bằng `admin@ppe.local`.
2. Vào trang **Người dùng** (`/users`).
3. **Kiểm tra Thẻ KPI**:
   - 4 thẻ hiển thị chuẩn số liệu DB: *Tổng nhân sự: 20*, *Đang hoạt động: 11*, *Bật 2FA: 2*, *Bị khóa: 9*.
   - **Thao tác mượt mà**: Click vào thẻ **"Tài khoản bị khóa"** -> Bảng người dùng bên dưới tự động lọc ra 9 tài khoản đang bị khóa/ngưng hoạt động. Click thẻ **"Tổng số"** để quay về tất cả.
4. **Tạo tài khoản mới**:
   - Bấm nút **"Tạo người dùng"** góc trên bên phải.
   - Nhập: Email `tester01@ppe.local`, Họ tên `Nguyễn Văn Test`, Mật khẩu `Test@123456`, Vai trò `SAFETY_OFFICER`.
   - Bấm **"Lưu"**.
   - **Luồng BE**: FE gọi `POST /api/v1/users` -> `identity-service` băm mật khẩu Bcrypt và lưu vào bảng `users`.
   - **Kết quả mong đợi**: Bảng danh sách cập nhật bản ghi mới ngay lập tức; số thẻ KPI tổng tăng lên 21.

---

### Bước 4: Kịch bản 3 — Kiểm tra Nhật ký Kiểm toán (Audit Log)
1. Mở menu **Nhật ký kiểm toán** (`/audit-logs`).
2. **Luồng BE**: FE gọi `GET /api/v1/audit-logs?page=1&limit=20`.
3. **Kết quả mong đợi**:
   - Dòng đầu tiên của bảng ghi nhận ngay hành động vừa tạo user ở Bước 3.
   - Cột *Người thực hiện*: Hiển thị `admin@ppe.local` - `Quản Trị Viên Hệ Thống`.
   - Cột *Hành động*: `CREATE_USER`.
   - Cột *Trạng thái*: Badge xanh `SUCCESS`.
   - Bấm vào icon "Con mắt" để mở Drawer xem chi tiết payload JSON.

---

### Bước 5: Kịch bản 4 — Quản lý Công trường & Phân khu (Sites)
1. Mở menu **Công trường** (`/sites`).
2. Bấm **"Tạo công trường"**:
   - Nhập Tên: `Khu Đô Thị Mới Thủ Thiêm`, Mã: `SITE-THUTHIEM-01`, Địa chỉ: `TP. Thủ Đức, TP.HCM`.
   - Bấm **"Lưu công trường"**.
   - **Luồng BE**: FE gọi `POST /api/v1/sites` -> Traefik chuyển sang `site-service:8891`.
3. Bấm vào công trường vừa tạo để vào trang Chi tiết (`/sites/[id]`):
   - Chuyển sang Tab **"Phân khu"** -> Bấm **"Thêm phân khu"** -> Đặt tên `Khu Vực Hầm B1`.
   - Chuyển sang Tab **"Vùng cấm"** -> Thêm vùng nguy cơ cao yêu cầu bắt buộc nón bảo hộ.

---

## V. CÔNG CỤ HỖ TRỢ TESTER ĐIỀU TRA LỖI

### 1. Xem Log Backend trực tiếp (Realtime Logs)
Khi gặp lỗi hoặc muốn xem Backend trả về gì:
```bash
# Xem log service xác thực & tài khoản
docker logs -f identity_service

# Xem log service công trường & vùng cấm
docker logs -f site_service

# Xem log service sự cố & bằng chứng
docker logs -f incident_service

# Xem log service camera
docker logs -f camera_service

# Xem log service thông báo
docker logs -f notification_service
```

### 2. Mở khóa tài khoản khẩn cấp (Nếu lỡ nhập sai quá 5 lần)
Chạy lệnh sau trên terminal để mở khóa tức thì:
```bash
docker exec ppe_postgres psql -U postgres -d ppe_identity_db -c \
"UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE email='user@ppe.local';"
```
