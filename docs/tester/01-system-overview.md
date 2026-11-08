# TỔNG QUAN HỆ THỐNG GIÁM SÁT TRANG BỊ BẢO HỘ LAO ĐỘNG THÔNG MINH (SMART PPE MONITORING)
*Tài liệu kiểm thử & chuyển giao kỹ thuật* · *Phiên bản:* 1.1.0 · *Cập nhật:* 08/11/2026

---

## 1. MỤC TIÊU VÀ CÁC TÍNH NĂNG CỐT LÕI

Hệ thống **Smart PPE Monitoring System** là giải pháp phần mềm chuyên dụng hỗ trợ các nhà thầu xây dựng, ban chỉ huy an toàn công trường và doanh nghiệp công nghiệp giám sát tự động, liên tục và thời gian thực việc tuân thủ các quy định về Trang thiết bị Bảo hộ Cá nhân (Personal Protective Equipment - PPE) của người lao động tại các khu vực thi công rủi ro cao.

```mermaid
flowchart LR
    A["Camera CCTV / IP / YouTube<br>(RTSP / HLS / Ingestion Worker)"] --> B["AI Inference Engine<br>(YOLOv11 + ByteTrack :8000)"]
    B -->|Bằng chứng Snapshot Kép<br>& Normalized Box [0..1]| C["Traefik Gateway<br>& Microservices (:80)"]
    C -->|SSE Realtime Alert (<500ms)| D["Frontend Next.js 16<br>(fe-ppe)"]
    D --> E["Cán bộ An toàn<br>(Safety Officer / Manager)"]
    E -->|Thẩm duyệt & Phân công| C
```

### 1.1. Các nhóm tính năng chính của hệ thống
1. **Giám sát Thị giác AI Thời gian thực (Real-time AI Vision Monitoring)**:
   - Tiếp nhận luồng video trực tiếp từ các camera an ninh tại công trường qua các giao thức HLS/RTSP/WebRTC hoặc luồng nạp video kiểm thử YouTube/MP4.
   - Ứng dụng mô hình AI Deep Learning (YOLOv11s-PPE kết hợp thuật toán theo dõi ByteTrack) để nhận diện người lao động và kiểm tra tức thời các trang thiết bị bảo hộ bắt buộc: Mũ bảo hộ (`HARD_HAT`), Áo phản quang (`SAFETY_VEST`), Găng tay bảo hộ (`GLOVES`), Giày/Ủng bảo hộ (`BOOTS`), Kính bảo vệ mắt (`GOGGLES`), và Dây an toàn trên cao (`SAFETY_HARNESS`).
   - Cung cấp tính năng lọc nhiễu với cơ chế **Temporal Confirmation**: chỉ khi hành vi vi phạm kéo dài liên tục $\ge 3$ giây mới kích hoạt sự cố chính thức, triệt tiêu báo động giả do giật frame.
   - Khoanh vùng nhận diện theo đa giác tùy chỉnh (AI ROI - Region of Interest Canvas) cho từng camera để loại trừ các khu vực công cộng ngoài ý muốn.

2. **Quản lý Vòng đời Sự cố Vi phạm & Bộ Bằng chứng Kép (Incident Evidence Governance)**:
   - Tự động bắt giữ bộ bằng chứng thị giác kép (Dual-Snapshot Visual Evidence):
     - `SNAPSHOT`: Ảnh chụp độ phân giải cao tại chính xác khung hình giây T phát hiện vi phạm.
     - `REFERENCE_SNAPSHOT`: Ảnh chụp tại thời điểm T=0 (khởi tạo luồng) hoặc lúc người lao động tuân thủ hợp lệ nhằm đối chiếu minh bạch.
   - Tọa độ khung nhận diện được chuẩn hóa thành hệ tọa độ Normalized Coordinates `[0..1]` (`ymin, xmin, ymax, xmax`), co giãn hoàn hảo trên mọi độ phân giải màn hình mà không bao giờ bị lệch box.
   - Dữ liệu bằng chứng được lưu trữ vĩnh viễn trên MinIO Object Storage, gắn mã băm SHA-256 chống chỉnh sửa và metadata AI (`model`, `confidence`, `box`) trong cơ sở dữ liệu `ppe_incident_db`.
   - Quy trình thẩm duyệt khép kín 6 trạng thái: `DETECTED` (Mới phát hiện) $\rightarrow$ `UNDER_REVIEW` (Đang xem xét) $\rightarrow$ `CONFIRMED` (Xác nhận vi phạm) / `DISMISSED` (Bác bỏ / Báo động giả) $\rightarrow$ `RESOLVING` (Đang khắc phục) $\rightarrow$ `RESOLVED` (Đã xử lý) $\rightarrow$ `CLOSED` (Nghiệm thu đóng).
   - Phân công cán bộ an toàn phụ trách hiện trường, theo dõi thời gian xử lý trung bình (MTTR) và dòng sự kiện thảo luận (Incident Comments Timeline).

3. **Số hóa Không gian Công trường & Khoanh Vùng Cấm Đa Giác (Site Spatial & Danger Zones)**:
   - Quản trị đa công trường (`Sites`), phân khu thi công (`Zones`) và các khu vực giới hạn nguy hiểm cao (`Restricted Areas`).
   - **Công cụ vẽ chuột đa giác tương tác (Interactive Mouse Polygon Canvas)**: Cho phép cán bộ an toàn chọn camera bất kỳ trong công trường và dùng chuột click các điểm trực tiếp trên khung hình video để khoanh vùng cấm nguy hiểm.
   - Tự động phát hiện vi phạm xâm nhập vùng cấm nguy hiểm (`RESTRICTED_AREA`) với mức độ cảnh báo tối khẩn (`CRITICAL`).
   - Cấu hình quy chuẩn an toàn động (Safety Rules): Thiết lập các trang bị bảo hộ bắt buộc riêng biệt cho từng công trường hoặc kế thừa theo mặc định toàn hệ thống.

4. **Trung tâm Chỉ huy Điều hành & Cảnh báo Tức thời (Command Center & Realtime Hub)**:
   - Cơ chế Server-Sent Events (SSE) đẩy thông tin sự cố vi phạm tới trình duyệt trong vòng $<500\text{ms}$.
   - Phát âm thanh còi báo động khẩn cấp (`soundService`), hiển thị thẻ cảnh báo động đỏ viền neumorphic (`IncidentAlertToast`) và số đếm chưa đọc trên chuông thông báo.
   - Bảng điều khiển tích hợp mô hình 3D tương tác nón bảo hộ lao động (`HelmetShowcase` sử dụng Three.js/Fiber) và 4 bảng biểu đồ giám sát tác chiến theo giờ trong ngày.
   - Tối ưu hóa điều hướng mượt mà: Chuyển trang tức thời kết hợp hiệu ứng Skeleton Loading giữ nguyên bố cục cho từng thành phần con, triệt tiêu hiện tượng đơ giật UI.

5. **Phân tích Báo cáo An toàn & Đo lường Hiệu năng AI (Safety Analytics & AI Governance)**:
   - Xuất báo cáo chuyên nghiệp định dạng PDF và Excel phục vụ thanh tra an toàn và nghiệm thu định kỳ.
   - Thống kê tỷ lệ tuân thủ PPE toàn dự án, ma trận phân bổ vi phạm, xếp hạng các camera điểm nóng có tần suất vi phạm cao.
   - Bảng điều khiển quản trị mô hình AI (Model Governance): Giám sát chỉ số mAP50, độ trễ suy luận (Latency ms), tốc độ xử lý khung hình (FPS), ma trận nhầm lẫn (Confusion Matrix Heatmap) và tính năng triển khai phiên bản mô hình trực tiếp từ giao diện.
   - **Phòng thí nghiệm AI Sandbox (`/ai-metrics/test`) nâng cấp toàn diện**: Cung cấp công cụ hiệu chuẩn AI ROI, khoanh vùng cấm nguy hiểm trực tiếp trên frame video tải lên (khắc phục hoàn toàn lỗi màn hình đen) và modal tinh chỉnh tham số ngưỡng AI (`Confidence`, `IOU`, `ByteTrack Buffer`, `Confirmation Time`).

6. **Bảo mật, Định danh & Quản trị Nền tảng (Identity, RBAC & Platform Ops)**:
   - Xác thực đa yếu tố (TOTP 2FA) qua ứng dụng Authenticator (Google Authenticator / Authy) kèm mã sao lưu khẩn cấp (Backup Codes).
   - Đăng nhập một chạm qua Google OAuth 2.0 và liên kết tài khoản mạng xã hội.
   - Phân quyền động đa tầng (Dynamic RBAC) trên 21 miền tài nguyên hệ thống.
   - Màn hình 404 Not Found Neumorphic thân thiện hỗ trợ phục hồi điều hướng khi gõ sai URL hoặc tài nguyên bị thu hồi.
   - Nhật ký kiểm toán an ninh (Audit Logs) truy vết mọi thao tác nhạy cảm, thay đổi cấu hình và lịch sử thẩm duyệt sự cố.
   - Quản lý chế độ bảo trì hệ thống (Maintenance Mode) với màn hình khóa toàn trang và cơ chế cho phép quản trị viên vượt rào (Maintenance Bypass).

### 1.2. Phân định 3 khái niệm khoanh vùng trong hệ thống (Dành cho Tester)

| Loại Khoanh Vùng | Tên Kỹ Thuật | Vị Trí Thao Tác | Thực Hiện Bởi | Mục Đích Nghiệp Vụ | Dữ Liệu Lưu Trữ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Vùng nhận diện quét AI của Camera** | `Camera AI ROI` (Region of Interest) | `/cameras` (Drawer `CameraRoiDrawer`) hoặc `/ai-metrics/test` | Người dùng dùng chuột vẽ đa giác trên khung hình | Giới hạn phạm vi AI quét người/PPE, bỏ qua các vùng ngoài lề (đường xe chạy, nhà dân kế bên). | `roiPolygon: Point[]` trong Camera Config |
| **2. Vùng cấm nguy hiểm của Công trường** | `Site Restricted Area` (Danger Zone) | `/sites/[id]` (Tab Phân khu & Vùng cấm) hoặc `/ai-metrics/test` | Người dùng chọn Camera và vẽ đa giác vùng cấm bằng chuột | Xác định hố sâu, khu vực cẩu tải rủi ro cao. Bất kỳ ai bước vào sẽ kích hoạt sự cố `RESTRICTED_AREA`. | `polygonCoordinates: Point[]` trong Site Restricted Area |
| **3. Khung nhận diện Bounding Box** | `AI Detection Bounding Box` | `/incidents/[id]` hoặc `/cameras/[id]` | **AI Worker tự động sinh ra** sau mỗi frame suy luận | Đánh dấu chính xác vị trí cơ thể người lao động và đồ bảo hộ thiếu/đủ (Màu xanh = Đạt, Màu đỏ = Vi phạm). | `aiDetections.box: [ymin, xmin, ymax, xmax]` |

### 1.3. Danh mục phân loại sự cố và cơ chế tính mức độ nghiêm trọng

#### A. Danh mục các loại sự cố (`ViolationType`)
Hệ thống chuẩn hóa 6 nhóm sự cố vi phạm an toàn:
1. `NO_HARD_HAT`: Không đội mũ bảo hộ lao động hoặc đội mũ sai quy cách tại khu vực yêu cầu.
2. `NO_SAFETY_VEST`: Không mặc áo phản quang tại công trường thi công.
3. `NO_BOOTS`: Không mang giày/ủng bảo hộ mũi thép chống đinh dập ngón.
4. `NO_GLOVES`: Không đeo găng tay bảo hộ khi thao tác vật liệu nguy hiểm.
5. `NO_GOGGLES`: Không đeo kính bảo hộ khi thực hiện công việc hàn cắt, bụi mịn.
6. `RESTRICTED_AREA`: Xâm nhập trái phép vào vùng cấm nguy hiểm đã khoanh vùng trên mặt bằng công trường.

#### B. Quy tắc tính mức độ nghiêm trọng (`Severity Level`)
- **`LOW` (Thấp)**: Vi phạm trang bị phụ đơn lẻ (thiếu găng tay hoặc thiếu kính bảo vệ) trong khu vực rủi ro thấp.
- **`MEDIUM` (Trung bình)**: Thiếu 1 trang bị chính đơn lẻ (`NO_HARD_HAT` hoặc `NO_SAFETY_VEST`).
- **`HIGH` (Cao)**: Thiếu đồng thời nhiều trang bị bảo hộ chính (vừa không đội mũ, vừa không mặc áo phản quang) hoặc vi phạm kéo dài liên tục trên 10 giây.
- **`CRITICAL` (Cực kỳ khẩn cấp)**: Xâm nhập vùng cấm nguy hiểm (`RESTRICTED_AREA`), làm việc trên cao thiếu dây an toàn hoặc vi phạm nghiêm trọng tại các điểm nóng thi công. Kích hoạt còi báo động tức thì trên Dashboard.

---

## 2. VAI TRÒ NGƯỜI DÙNG VÀ CÁC PHÂN HỆ CHỨC NĂNG

### 2.1. Phân cấp 5 Vai trò Người dùng (User Roles)
Hệ thống thiết lập sẵn 5 vai trò theo quy chuẩn quản trị an toàn lao động:

```mermaid
graph TD
    ADMIN["Quản Trị Viên Hệ Thống (ADMIN)"]
    SAFETY_MANAGER["Trưởng Ban An Toàn (SAFETY_MANAGER)"]
    SAFETY_OFFICER["Cán Bộ An Toàn Hiện Trường (SAFETY_OFFICER)"]
    MANAGER["Giám Đốc Dự Án / Nhà Thầu (MANAGER)"]
    USER["Công Nhân / Nhân Viên Cơ Sở (USER)"]

    ADMIN -->|Bao hàm toàn bộ quyền| SAFETY_MANAGER
    SAFETY_MANAGER -->|Quản lý công trường, duyệt vi phạm| SAFETY_OFFICER
    ADMIN -->|Phân quyền quản trị hệ thống| MANAGER
    SAFETY_OFFICER -->|Tác nghiệp hiện trường| USER
```

| Tên vai trò (Role Name) | Ký hiệu mã | Trách nhiệm chính trong hệ thống | Phạm vi truy cập Frontend |
| :--- | :--- | :--- | :--- |
| **Quản Trị Viên Hệ Thống** | `ADMIN` | Toàn quyền kiểm soát hệ thống, tài khoản, vai trò, cấu hình hạ tầng, camera, mô hình AI, nhật ký kiểm toán và chế độ bảo trì. | Toàn bộ 31 màn hình giao diện. Không bị giới hạn bất kỳ tính năng nào. |
| **Trưởng Ban An Toàn** | `SAFETY_MANAGER` | Quản trị an toàn lao động: tạo công trường, camera, cấu hình quy tắc an toàn, thẩm duyệt vi phạm (Xác nhận/Bác bỏ), phân công cán bộ, xuất báo cáo tổng hợp. | Giám sát (`/dashboard`, `/incidents`, `/cameras`, `/sites`), Báo cáo (`/reports`, `/ai-metrics`), Thông báo và Cài đặt cá nhân. Bị ẩn menu Quản trị (`/users`, `/roles`, `/system`). |
| **Cán Bộ An Toàn** | `SAFETY_OFFICER` | Giám sát hiện trường thời gian thực, tiếp nhận sự cố được phân công, thực hiện khắc phục vi phạm, ghi nhận trao đổi, kiểm tra nhịp tim camera. | Xem Dashboard, danh sách sự cố, chi tiết sự cố được phân công, xem luồng camera trực tiếp, xem không gian công trường. Bị chặn quyền xóa dữ liệu và xuất báo cáo. |
| **Giám Đốc / Quản Lý** | `MANAGER` | Giám sát tổng thể hoạt động, quản lý nhân sự, xem thống kê báo cáo kiểm toán, cấu hình vận hành và kênh thông báo. | Quản lý người dùng (`/users`), xem vai trò (`/roles`), nhật ký kiểm toán (`/audit-logs`), cấu hình hệ thống (`/system`). |
| **Công Nhân / Nhân Viên** | `USER` | Người dùng cơ sở, xem thông tin tài khoản cá nhân, lịch sử thông báo gửi tới mình, cập nhật mật khẩu và bảo mật 2FA. | Chỉ truy cập Dashboard tổng quan (chế độ xem rút gọn), Thông báo (`/notifications`), Hồ sơ cá nhân (`/settings/profile`) và Bảo mật (`/settings/security`). |

---

### 2.2. Phân rã 4 Nhóm Phân Hệ Chức Năng (Navigation Groups)
Cấu trúc điều hướng thanh bên (`AppSidebar`) phân bổ các tính năng vào 4 nhóm nghiệp vụ chính:

```mermaid
flowchart TD
    Root["Hệ Thống Smart PPE"]
    
    Root --> G1["1. Nhóm Giám Sát (Monitoring)"]
    G1 --> G1_1["Bảng Điều Khiển Tổng Quan (/dashboard)"]
    G1 --> G1_2["Quản Lý Sự Cố Vi Phạm (/incidents)"]
    G1 --> G1_3["Hạ Tầng Camera & Tường Video (/cameras)"]
    G1 --> G1_4["Không Gian Công Trường (/sites)"]

    Root --> G2["2. Nhóm Phân Tích (Analytics)"]
    G2 --> G2_1["Báo Cáo An Toàn Lao Động (/reports)"]
    G2 --> G2_2["Đo Lường Hiệu Năng AI (/ai-metrics)"]
    G2 --> G2_3["Phòng Thí Nghiệm AI Sandbox (/ai-metrics/test)"]

    Root --> G3["3. Nhóm Quản Trị (Admin)"]
    G3 --> G3_1["Quản Lý Người Dùng (/users)"]
    G3 --> G3_2["Vai Trò & Phân Quyền (/roles)"]
    G3 --> G3_3["Nhật Ký Kiểm Toán (/audit-logs)"]
    G3 --> G3_4["Cấu Hình Tham Số Hệ Thống (/system)"]
    G3 --> G3_5["Chế Độ Bảo Trì Nền Tảng (/maintenance)"]

    Root --> G4["4. Nhóm Cá Nhân (Personal)"]
    G4 --> G4_1["Trung Tâm Thông Báo (/notifications)"]
    G4 --> G4_2["Hồ Sơ Cá Nhân (/settings/profile)"]
    G4 --> G4_3["Bảo Mật 2FA & Phiên (/settings/security)"]
```

---

## 3. CÁC LUỒNG NGHIỆP VỤ CỐT LÕI (CORE BUSINESS WORKFLOWS)

### 3.1. Luồng 1: Xác Thực, Phân Quyền & Duy Trì Phiên Làm Việc (Auth Flow)
Quy trình xác thực an toàn đảm bảo tính bảo mật cao, kết hợp giữa Access Token lưu trong bộ nhớ (In-memory) và Refresh Token tự động luân phiên (Rotation) qua Cookie HTTP-only:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant FE as Frontend (fe-ppe)
    participant Proxy as Server Proxy (proxy.ts)
    participant Gateway as Traefik API Gateway (:80)
    participant IdSvc as Identity Service (:9999)

    User->>FE: Nhập Email + Password tại /login
    FE->>Gateway: POST /api/v1/auth/login
    Gateway->>IdSvc: Chuyển tiếp request
    alt Cần xác thực 2FA (requires2FA = true)
        IdSvc-->>FE: 200 OK + tempToken (Hạn 5 phút)
        FE->>FE: Lưu tempToken vào sessionStorage, chuyển sang /2fa
        User->>FE: Nhập mã TOTP 6 số
        FE->>Gateway: POST /api/v1/auth/2fa/verify (tempToken + code)
    end
    IdSvc-->>FE: 200 OK + Set-Cookie (accessToken, refreshToken, ppe_session_active)
    FE->>FE: tokenStore.setTokens(), AuthContext kích hoạt trạng thái "authenticated"
    FE->>Gateway: GET /api/v1/auth/me (Lấy thông tin User & danh sách Permissions)
    FE-->>User: Điều hướng vào /dashboard
    
    note over FE, IdSvc: Khi Access Token hết hạn (15 phút) -> 401 Unauthorized
    FE->>FE: Kích hoạt cơ chế Single-flight Refresh Mutex
    FE->>Gateway: POST /api/v1/auth/refresh (Kèm refreshToken mới nhất)
    IdSvc-->>FE: 200 OK + Cặp Token mới (Revoke token cũ khỏi DB)
    FE->>FE: Retry lại request gốc trong suốt đối với người dùng
```

---

### 3.2. Luồng 2: Phát Hiện Vi Phạm PPE & Đẩy Cảnh Báo Thời Gian Thực
Luồng dữ liệu thời gian thực từ camera công trường đến cán bộ an toàn qua kênh Server-Sent Events (SSE):

```mermaid
sequenceDiagram
    autonumber
    participant Cam as Camera CCTV
    participant AI as AI Worker (YOLOv11 :8000)
    participant SiteSvc as Site Service (:8891)
    participant IncSvc as Incident Service (:8893)
    participant NotifSvc as Notification Service (:8889)
    participant FE as Frontend AppShell (:3000)

    AI->>SiteSvc: GET /safety-rules/effective (Lấy quy tắc an toàn công trường)
    Cam->>AI: Luồng hình ảnh liên tục (RTSP / Ingestion Frame)
    AI->>AI: ByteTrack duy trì track_id qua các frames
    AI->>AI: Đối chiếu ROI Camera & Vùng cấm Site (Restricted Area)
    AI->>AI: Kiểm tra điều kiện Temporal Confirmation (Vi phạm liên tục ≥ 3 giây)
    note over AI: Xác nhận vi phạm! Trích xuất Frame SNAPSHOT (giây T) & REFERENCE_SNAPSHOT (T=0)
    AI->>IncSvc: Gửi sự kiện Kafka: ppe-violation-detected (Metadata AI + Bounding Box [0..1] + 2 Snapshots)
    IncSvc->>IncSvc: Lưu DB với trạng thái DETECTED + Tính mã băm SHA-256
    IncSvc->>NotifSvc: Phát tín hiệu Broadcast Alert
    
    FE->>NotifSvc: GET /api/v1/notifications/stream?ticket=... (Kênh SSE đang duy trì)
    NotifSvc-->>FE: Event: "notification:ppe_violation"
    FE->>FE: Kích hoạt âm thanh báo động (soundService)
    FE->>FE: Hiển thị IncidentAlertToast màu đỏ nổi bật trên màn hình
    FE->>FE: Cập nhật thẻ KPI "Chờ thẩm duyệt" và viền đỏ camera liên quan
```

---

### 3.3. Luồng 3: Vòng Đời Thẩm Duyệt & Xử Lý Sự Cố Vi Phạm
Quy trình nghiệp vụ xử lý từ lúc sự cố được phát hiện cho tới khi được đóng và lưu trữ:

```mermaid
stateDiagram-v2
    [*] --> DETECTED: AI phát hiện vi phạm PPE
    
    DETECTED --> UNDER_REVIEW: Cán bộ mở màn hình xem xét
    
    UNDER_REVIEW --> DISMISSED: Bác bỏ vi phạm (Báo động giả / Lý do hợp lệ)
    DISMISSED --> [*]: Lưu trữ dữ liệu huấn luyện AI
    
    UNDER_REVIEW --> CONFIRMED: Xác nhận vi phạm thực tế
    
    CONFIRMED --> ASSIGNED: Phân công Cán bộ An toàn phụ trách hiện trường
    
    ASSIGNED --> RESOLVING: Cán bộ tiếp nhận & kiểm tra hiện trường
    
    RESOLVING --> RESOLVED: Đã nhắc nhở / Bổ sung trang bị bảo hộ
    
    RESOLVED --> CLOSED: Trưởng ban an toàn nghiệm thu đóng sự cố
    CLOSED --> [*]: Hoàn tất vòng đời sự cố
```

---

### 3.4. Luồng 4: Cấu Hình Không Gian, Vùng ROI Camera & Vùng Cấm Site Bằng Chuột
Quy trình thiết lập vùng giám sát trọng yếu giúp camera AI tập trung vào khu vực thi công nguy hiểm:

```mermaid
flowchart TD
    S1["1. Tạo Công Trường mới tại /sites"] --> S2["2. Tạo Phân Khu Zone"]
    S2 --> S3["3. Gán Camera vào Phân Khu"]
    
    S3 --> C1["Nhánh A: Cấu hình Camera AI ROI (/cameras)"]
    C1 --> C2["Mở Drawer CameraRoiDrawer"]
    C2 --> C3["Dùng chuột vẽ các điểm đa giác Polygon trên khung hình camera"]
    C3 --> C4["Lưu cấu hình: PUT /api/v1/cameras/:id/config"]
    
    S3 --> D1["Nhánh B: Khoanh Vùng Cấm Site (/sites/[id])"]
    D1 --> D2["Mở Tab Phân khu & Vùng cấm -> Thêm Vùng Cấm"]
    D2 --> D3["Chọn Camera làm nền quan sát"]
    D3 --> D4["Dùng chuột click vẽ đa giác vùng nguy hiểm (Hố sâu, khu vực cẩu)"]
    D4 --> D5["Lưu tọa độ đa giác: POST /api/v1/sites/:id/restricted-areas"]
    
    C4 & D5 --> AI_SYNC["AI Worker tự động cập nhật mặt phẳng cắt suy luận & phát hiện xâm nhập"]
```

---

## 4. KIẾN TRÚC HỆ THỐNG VÀ TƯƠNG TÁC FRONTEND – BACKEND

### 4.1. Bản Đồ Định Tuyến Traefik Gateway & 10 Backend Microservices
Hệ thống Frontend `fe-ppe` không gọi trực tiếp tới từng cổng nội bộ của các microservice mà giao tiếp tập trung thông qua **Traefik v3 API Gateway** tại cổng tiêu chuẩn (80/443). Gateway chịu trách nhiệm định tuyến theo tiền tố URL (Path Prefix):

```mermaid
graph TD
    Client["Trình duyệt Client<br>(fe-ppe Next.js 16)"] -->|HTTP / REST / SSE<br>Base URL: /api/v1| Traefik["Traefik v3 API Gateway<br>(Port :80 / :443)"]

    subgraph "Hệ Sinh Thái Backend Microservices"
        Traefik -->|/api/v1/auth<br>/api/v1/users<br>/api/v1/rbac<br>/api/v1/system<br>/api/v1/maintenance<br>/api/v1/audit-logs| SvcId["smart-ppe-identity-service<br>(Cổng nội bộ :9999)"]
        
        Traefik -->|/api/v1/sites<br>/api/v1/zones<br>/api/v1/restricted-areas<br>/api/v1/safety-rules| SvcSite["smart-ppe-site-service<br>(Cổng nội bộ :8891)"]
        
        Traefik -->|/api/v1/cameras<br>/api/v1/camera-streams| SvcCam["smart-ppe-camera-service<br>(Cổng nội bộ :8892)"]
        
        Traefik -->|/api/v1/incidents<br>/api/v1/evidences| SvcInc["smart-ppe-incident-service<br>(Cổng nội bộ :8893)"]
        
        Traefik -->|/api/v1/reports<br>/api/v1/statistics<br>/api/v1/ai-models| SvcRep["smart-ppe-reporting-service<br>(Cổng nội bộ :8894)"]
        
        Traefik -->|/api/v1/notifications<br>/api/v1/notifications/stream| SvcNotif["smart-ppe-notification-service<br>(Cổng nội bộ :8889)"]
        
        Traefik -->|/api/v1/files| SvcMedia["smart-ppe-media-service<br>(Cổng nội bộ :8890)"]
    end

    subgraph "Hạ Tầng Suy Luận AI & Bất Đồng Bộ"
        SvcAI["smart-ppe-ai-service<br>(FastAPI / YOLO Worker :8000)"]
        Kafka[("Apache Kafka Message Broker")]
        MinIO[("MinIO / S3 Object Storage")]
    end

    SvcAI -->|Đọc cấu hình| SvcSite
    SvcAI -->|Bắn sự kiện vi phạm| Kafka
    Kafka -->|Tiêu thụ sự kiện| SvcInc
    SvcInc -->|Lưu ảnh bằng chứng| SvcMedia
    SvcMedia --> MinIO
```

### 4.2. Cấu Trúc Phân Tầng Ứng Dụng Frontend (`fe-ppe`)
Frontend được thiết kế theo mô hình phân tầng chặt chẽ (Clean Layered Architecture):

1. **Tầng Giao Diện Người Dùng (Presentation Layer)**:
   - Thư mục `app/`: Next.js 16 App Router segments, định nghĩa routes và layouts (`(public)` layout, `(auth)` layout).
   - Thư mục `src/components/ui/`: Thư viện Neumorphism Design System (Button, Card, Badge, Modal, Drawer, Table, StatsCard, Toaster, SegmentedControl, Skeleton).
   - Thư mục `src/components/features/`: Các component nghiệp vụ chuyên biệt gắn liền với từng domain (dashboard, incidents, cameras, sites, reports, ai-metrics, users, roles, system...).

2. **Tầng Trạng Thái & Quản Lý Dữ Liệu (State & Data Management Layer)**:
   - Thư mục `src/contexts/`: `AuthContext` (phiên đăng nhập), `SiteContext` (lưu trữ siteId đang chọn vào LocalStorage), `RealtimeContext` (lắng nghe SSE).
   - Thư mục `src/providers/`: Bọc ứng dụng với QueryClientProvider, ThemeProvider (Dark/Light Neumorphism), LocaleProvider (vi-VN / en-US), PrefetchProvider.
   - Thư mục `src/hooks/`: Đóng gói các hàm gọi `@tanstack/react-query` v5 (`useQuery`, `useMutation`), phân chia Query Keys rõ ràng theo chuẩn phân cấp (`domainKeys.all()`, `domainKeys.detail(id)`).

3. **Tầng Tích Hợp Dịch Vụ & Mạng (Service & Network Layer)**:
   - Thư mục `src/services/`: 13 file service đại diện cho các miền nghiệp vụ, chịu trách nhiệm gọi Axios và định nghĩa kiểu dữ liệu.
   - Thư mục `src/lib/axios.ts`: Axios instance trung tâm gắn Bearer token, xử lý refresh token single-flight chống nghẽn phiên, chuẩn hóa lỗi `ApiError` và tự động hiển thị thông báo lỗi hệ thống.
   - Thư mục `src/lib/token.ts`: Bộ lưu trữ Access Token trong bộ nhớ RAM, bảo vệ chống tấn công XSS.

4. **Tầng Định Nghĩa Kiểu & Hợp Đồng Dữ Liệu (Contract & Types Layer)**:
   - Thư mục `src/types/`: 13 file TypeScript interfaces & DTOs đồng bộ 100% với backend controllers, Prisma schemas và thư viện `smart-ppe-shared-contracts`.
