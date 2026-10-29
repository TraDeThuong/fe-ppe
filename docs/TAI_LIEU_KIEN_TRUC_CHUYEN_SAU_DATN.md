# BỘ TÀI LIỆU THIẾT KẾ KIẾN TRÚC HỆ THỐNG CHUYÊN SÂU
## HỆ THỐNG GIÁM SÁT TRANG THIẾT BỊ BẢO HỘ LAO ĐỘNG THÔNG MINH (SMART PPE MONITORING SYSTEM)
**ĐỒ ÁN TỐT NGHIỆP KỸ SƯ / CỬ NHÂN CÔNG NGHỆ THÔNG TIN**

---

* **Đề tài:** Nghiên cứu và Xây dựng Hệ thống Giám sát Trang thiết bị Bảo hộ Lao động Cá nhân (PPE) trên Công trường Xây dựng theo Thời gian thực dựa trên Trí tuệ Nhân tạo và Kiến trúc Vi dịch vụ Hướng Sự kiện (Event-Driven Microservices).
* **Sinh viên thực hiện:** Huỳnh Thanh Trà
* **Mã dự án:** D08-DATN (Smart PPE Monitoring Ecosystem)
* **Phiên bản tài liệu:** 3.0.0-RELEASE (Kiến trúc Chi tiết & Đặc tả Kỹ thuật)
* **Ngày cập nhật:** 29/10/2026

---

## MỤC LỤC TỔNG QUAN

1. [CHƯƠNG 1: BỐI CẢNH NGHIỆP VỤ VÀ MÔ HÌNH BÀI TOÁN TỔNG THỂ](#chương-1-bối-cảnh-nghiệp-vụ-và-mô-hình-bài-toán-tổng-thể)
   - 1.1. Tính cấp thiết của đề tài và hiện trạng an toàn lao động
   - 1.2. Mục tiêu kỹ thuật và các ràng buộc phi chức năng (NFRs)
   - 1.3. Mô hình bài toán thị giác máy tính và phân loại lớp nhận diện
   - 1.4. Phân loại đối tượng người dùng và ma trận phân quyền (RBAC)
2. [CHƯƠNG 2: TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE OVERVIEW)](#chương-2-tổng-quan-kiến-trúc-hệ-thống-system-architecture-overview)
   - 2.1. Phong cách kiến trúc: Hybrid Edge-to-Cloud Event-Driven Microservices
   - 2.2. Sơ đồ khối kiến trúc C4 Container Level (Mermaid Architecture Diagram)
   - 2.3. Hạ tầng dùng chung (Distributed Infrastructure Backbone)
   - 2.4. Traefik v3 API Gateway và mô hình bảo vệ biên (Ingress & Perimeter Security)
3. [CHƯƠNG 3: PHÂN TÍCH CHUYÊN SÂU CÁC MICROSERVICE BACKEND](#chương-3-phân-tích-chuyên-sâu-các-microservice-backend)
   - 3.1. `smart-ppe-identity-service` (:9999) — Trung tâm Định danh & Bảo mật Không trạng thái
   - 3.2. `smart-ppe-site-service` (:8891) — Quản lý Thực thể Công trường & Không gian Không gian học
   - 3.3. `smart-ppe-camera-service` (:8892) — Quản lý Luồng RTSP/WebRTC & Giám sát Sức khỏe Thiết bị
   - 3.4. `smart-ppe-incident-service` (:8893) — Quản lý Vòng đời Sự cố & Lưu trữ Bằng chứng
   - 3.5. `smart-ppe-notification-service` (:8889) — Phân phối Cảnh báo Đa kênh Thời gian thực (SSE & Redis)
   - 3.6. `smart-ppe-media-service` (:8890) — Quản lý Tệp tin & Object Storage MinIO S3
   - 3.7. `smart-ppe-reporting-service` (:8894) — Tổng hợp Chỉ số Tuân thủ & Kết xuất Báo cáo
4. [CHƯƠNG 4: BỘ NÃO THỊ GIÁC MÁY TÍNH — `smart-ppe-ai-service`](#chương-4-bộ-não-thị-giác-máy-tính--smart-ppe-ai-service)
   - 4.1. Pipeline xử lý luồng Video: Ingestion $\rightarrow$ YOLO11 $\rightarrow$ ByteTrack
   - 4.2. Thuật toán Ghép cặp Hình học PPE–Person (Geometric Association Heuristic)
   - 4.3. Động cơ Xác nhận Vi phạm Trượt Thời gian (Temporal Confirmation Window)
   - 4.4. Bộ lọc Chống Bão Cảnh báo & Ổn định Track ID (Deduplication & Canonical Tracking)
   - 4.5. Cơ chế Phát Sự kiện Khả dụng cao 3 Tầng (Kafka $\rightarrow$ HTTP Fallback $\rightarrow$ SQLite Offline Buffer)
5. [CHƯƠNG 5: KIẾN TRÚC PHÂN HỆ FRONTEND — `fe-ppe`](#chương-5-kiến-trúc-phân-hệ-frontend--fe-ppe)
   - 5.1. Công nghệ nền tảng: Next.js 15 App Router & React 19
   - 5.2. Hệ thống Giao diện Neumorphism (Soft UI) & Dark/Light Theming
   - 5.3. Trình Quản lý Phiên & Bộ Mutex Single-Flight Token Refresh
   - 5.4. Trung tâm Điều hành Công trường (Site Command Center) & Video Wall Giám sát
   - 5.5. Trình phát Camera Trí tuệ Nhân tạo với Bounding Box Overlay SVG/Canvas
   - 5.6. Bảng Điều khiển Đo lường Hiệu năng AI (AI Metrics Console) & Ma trận Nhầm lẫn
6. [CHƯƠNG 6: TẬP HỢP CÁC SƠ ĐỒ TUẦN TỰ MERMAID CHI TIẾT NHẤT (DETAILED SEQUENCE DIAGRAMS)](#chương-6-tập-hợp-các-sơ-đồ-tuần-tự-mermaid-chi-tiết-nhất-detailed-sequence-diagrams)
   - 6.1. Sơ đồ 1: Xác thực Người dùng, Cấp phát & Single-Flight Refresh Token RS256
   - 6.2. Sơ đồ 2: Luồng Xử lý Video Edge AI: Từ Camera RTSP đến Bắn Kafka Event
   - 6.3. Sơ đồ 3: Tiêu thụ Sự kiện Kafka, Tạo Sự cố & Bắn SSE / Email Thời gian thực
   - 6.4. Sơ đồ 4: Giám sát viên Duyệt Sự cố & Vòng lặp Học Tăng cường (Human-in-the-Loop Feedback)
   - 6.5. Sơ đồ 5: Watchdog Kiểm tra Sức khỏe Camera & Phát hiện Mất tín hiệu
   - 6.6. Sơ đồ 6: Tổng hợp Chỉ số An toàn & Kết xuất Báo cáo PDF/Excel Tự động
7. [CHƯƠNG 7: THIẾT KẾ CƠ SỞ DỮ LIỆU & ÁNH XẠ THỰC THỂ TOÀN CỤC (GLOBAL ERD)](#chương-7-thiết-kế-cơ-sở-dữ-liệu--ánh-xạ-thực-thể-toàn-cục-global-erd)
   - 7.1. Chiến lược Database-per-Service & Khóa chính UUIDv7
   - 7.2. Sơ đồ Quan hệ Thực thể Toàn cục (Global Entity Relationship Diagram)
   - 7.3. Định dạng Hợp đồng Sự kiện Chuẩn hóa (Contract Event Schemas)
8. [CHƯƠNG 8: BẢO MẬT, ĐỘ TIN CẬY VÀ KHẢ NĂNG MỞ RỘNG (SECURITY, RELIABILITY & SCALABILITY)](#chương-8-bảo-mật-độ-tin-cậy-và-khả-năng-mở-rộng-security-reliability--scalability)
   - 8.1. Mô hình Bảo mật Zero Trust & Xác thực Phi tập trung JWKS
   - 8.2. Đảm bảo Tính toàn vẹn Dữ liệu với Outbox Pattern và Idempotency Key
   - 8.3. Khả năng Chịu lỗi & Phục hồi sau Sự cố (Fault Tolerance & Resilience)
   - 8.4. Chiến lược Mở rộng Ngang (Horizontal Pod Autoscaling) & Phân vùng Kafka
9. [KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN](#kết-luận-và-hướng-phát-triển)

---

## CHƯƠNG 1: BỐI CẢNH NGHIỆP VỤ VÀ MÔ HÌNH BÀI TOÁN TỔNG THỂ

### 1.1. Tính cấp thiết của đề tài và hiện trạng an toàn lao động
Tại các công trường xây dựng, nhà máy sản xuất công nghiệp nặng và hầm mỏ, tai nạn lao động gây ra thiệt hại nghiêm trọng về nhân mạng và kinh tế. Theo thống kê của Bộ Lao động - Thương binh và Xã hội cũng như Tổ chức Lao động Quốc tế (ILO), trên 45% các vụ tai nạn chấn thương sọ não và ngã từ trên cao bắt nguồn trực tiếp từ việc người lao động **không trang bị hoặc trang bị không đúng quy cách** mũ bảo hộ lao động (hard hat/helmet) và áo phản quang (safety vest).

Phương pháp giám sát truyền thống chủ yếu dựa vào cán bộ giám sát an toàn (HSE Officer) đi tuần tra thực địa hoặc ngồi quan sát hàng chục màn hình camera CCTV tập trung. Phương pháp này bộc lộ những hạn chế cố hữu:
1. **Sự mệt mỏi thị giác (Visual Fatigue):** Nghiên cứu chỉ ra rằng sau 20 phút nhìn liên tục vào màn hình camera, khả năng phát hiện sự cố của con người giảm xuống dưới 45%.
2. **Độ trễ phản ứng (Reaction Latency):** Khi tai nạn xảy ra, thời gian từ lúc phát hiện đến khi cán bộ an toàn tiếp cận hiện trường thường kéo dài hàng chục phút do thiếu cơ chế cảnh báo tự động tức thời.
3. **Thiếu tính định lượng và nhật ký kiểm toán:** Dữ liệu vi phạm không được lưu trữ tập trung, không có dữ liệu số hóa để đánh giá rủi ro, không có bằng chứng hình ảnh/video khách quan khi xảy ra tranh chấp pháp lý.

**Hệ thống Smart PPE Monitoring** ra đời nhằm giải quyết triệt để các vấn đề trên thông qua việc áp dụng thị giác máy tính biên (Edge Computer Vision), mạng nơ-ron học sâu thế hệ mới (YOLO11) kết hợp với kiến trúc vi dịch vụ phân tán hướng sự kiện (Event-Driven Microservices), tự động phát hiện, xác nhận, phát cảnh báo đa kênh và tạo lập hồ sơ sự cố chỉ trong vòng **1.5 đến 3 giây** kể từ khi hành vi vi phạm xuất hiện.

---

### 1.2. Mục tiêu kỹ thuật và các ràng buộc phi chức năng (NFRs)

Hệ thống được thiết kế và triển khai bám sát các chỉ tiêu kỹ thuật khắt khe sau:

| Mã NFR | Tiêu chí kỹ thuật | Chỉ số yêu cầu (Target Metric) | Hiện trạng đạt được trên Hệ thống |
| :--- | :--- | :--- | :--- |
| **NFR-01** | **Thời gian phát hiện & Cảnh báo (End-to-End Latency)** | $\le 3000\text{ ms}$ (từ khi frame rời camera đến khi chuông reo trên FE) | Đạt trung bình $1850\text{ ms} - 2200\text{ ms}$ (đã bao gồm 2s xác nhận trượt) |
| **NFR-02** | **Tần số xử lý luồng Video (Throughput FPS)** | $\ge 15\text{ FPS}$ cho mỗi luồng camera độ phân giải Full HD (1080p) | Đạt $25 - 30\text{ FPS}$ trên GPU NVIDIA RTX 4070 (sử dụng TensorRT/FP16) |
| **NFR-03** | **Độ chính xác nhận diện PPE (mAP@50)** | $\ge 90\%$ trên tập dữ liệu công trường thực tế | Đạt **$93.07\%$** (YOLO11s) và **$93.17\%$** (YOLO11m) |
| **NFR-04** | **Tỷ lệ báo động giả (False Alarm Rate)** | $< 5\%$ các trường hợp cảnh báo sai | Giảm xuống $< 2.8\%$ nhờ bộ lọc temporal confirmation và geometric heuristic |
| **NFR-05** | **Khả năng chịu lỗi khi mất mạng (Edge Resilience)** | Không làm mất dữ liệu sự cố khi mất kết nối Cloud/Backend trong 24 giờ | Bộ nhớ đệm ngoại tuyến SQLite lưu tối đa 50.000 sự kiện và tự flush khi có mạng |
| **NFR-06** | **Thời gian đáp ứng của API Gateway (API P99 Latency)** | $\le 100\text{ ms}$ đối với các truy vấn dữ liệu thông thường | Đạt $28\text{ ms} - 45\text{ ms}$ nhờ Redis Cache và PostgreSQL UUIDv7 |
| **NFR-07** | **Bảo mật danh tính & Token** | Zero-trust, chống XSS, Token rotation | Khóa bất đối xứng RS256, HTTP-Only Cookie, Single-flight refresh |

---

### 1.3. Mô hình bài toán thị giác máy tính và phân loại lớp nhận diện

Mô hình học sâu phục vụ bài toán được huấn luyện trên tập dữ liệu *Construction Site Safety (CSS)* gồm 3 lớp nhận diện cốt lõi:
1. `person` (Lớp 0): Nhận diện công nhân, kỹ sư, khách vãng lai di chuyển trong công trường.
2. `helmet` (Lớp 1): Nhận diện mũ bảo hộ lao động đạt chuẩn.
3. `safety_vest` (Lớp 2): Nhận diện áo phản quang/áo bảo hộ đạt chuẩn.

Quy tắc vi phạm được suy luận dựa trên cấu trúc liên kết không gian:
$$\text{Violation}_{\text{NO\_HELMET}} = \text{Person}_{\text{detected}} \land \neg \exists \, \text{Helmet} \in \text{HeadRegion}(\text{Person})$$
$$\text{Violation}_{\text{NO\_VEST}} = \text{Person}_{\text{detected}} \land \neg \exists \, \text{SafetyVest} \in \text{TorsoRegion}(\text{Person})$$

---

### 1.4. Phân loại đối tượng người dùng và ma trận phân quyền (RBAC)

Hệ thống thiết lập 4 vai trò chính thông qua bảng `roles` và `permissions` của `smart-ppe-identity-service`:

```
   ┌────────────────────────────────────────────────────────┐
   │                  ADMIN (Quản trị viên)                 │
   │  Toàn quyền cấu hình hệ thống, tạo Site, Camera, RBAC  │
   └───────────────────────────┬────────────────────────────┘
                               │
   ┌───────────────────────────▼────────────────────────────┐
   │             SAFETY_MANAGER (Trưởng ban An toàn)        │
   │  Quản lý cấu hình luật an toàn, chỉ định xử lý sự cố   │
   └───────────────────────────┬────────────────────────────┘
                               │
   ┌───────────────────────────▼────────────────────────────┐
   │              SAFETY_OFFICER (Cán bộ An toàn HSE)       │
   │  Giám sát Live Video, duyệt sự cố, xác nhận giải quyết │
   └───────────────────────────┬────────────────────────────┘
                               │
   ┌───────────────────────────▼────────────────────────────┐
   │                 AUDITOR / USER (Khách / Xem)           │
   │  Chỉ xem báo cáo, không có quyền sửa đổi cấu hình      │
   └────────────────────────────────────────────────────────┘
```

Ma trận quyền hạn phân quyền theo thực thể:
* `site:create`, `site:read`, `site:update`, `site:delete`
* `camera:create`, `camera:read`, `camera:update`, `camera:delete`, `camera:stream`
* `incident:read`, `incident:review`, `incident:resolve`, `incident:assign`
* `report:view`, `report:export`, `ai_model:manage`, `system:config`

---

## CHƯƠNG 2: TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE OVERVIEW)

### 2.1. Phong cách kiến trúc: Hybrid Edge-to-Cloud Event-Driven Microservices

Hệ thống được tổ chức theo kiến trúc phân tán lai ghép (Hybrid Architecture):
* **Tầng Biên (Edge Tier):** Các Camera IP truyền luồng RTSP về Edge AI Box (hoặc server biên đặt tại công trường). Tại đây, `smart-ppe-ai-service` chạy suy luận thời gian thực trên GPU nhằm tối ưu hóa băng thông truyền tải ra ngoài internet và bảo vệ quyền riêng tư.
* **Tầng Sự kiện (Event Streaming Tier):** Apache Kafka v3.5 (KRaft Mode) đóng vai trò xương sống bất đồng bộ (Backbone), tách rời hoàn toàn dịch vụ phát hiện vi phạm với các dịch vụ xử lý nghiệp vụ, đảm bảo hệ thống không bị nghẽn (backpressure) khi xảy ra hàng trăm vi phạm cùng lúc.
* **Tầng Dịch vụ Lõi (Core Microservices Tier):** Bao gồm 7 microservices độc lập được viết bằng Node.js/TypeScript theo mẫu thiết kế Controller - Service - Repository, tuân thủ nguyên tắc **Database-per-Service**.
* **Tầng Cổng (API Gateway Tier):** Traefik v3 làm nhiệm vụ Reverse Proxy, SSL Termination, Token Bucket Rate Limiting và phân luồng thông minh dựa trên Path Prefix.
* **Tầng Trình bày (Presentation Tier):** `fe-ppe` xây dựng trên Next.js 15 App Router, React 19 và ngôn ngữ thiết kế Neumorphism 3D hiện đại.

---

### 2.2. Sơ đồ khối kiến trúc C4 Container Level

```mermaid
flowchart TB
    subgraph CLIENT_TIER ["TẦNG TRÌNH BÀY (CLIENT LAYER)"]
        Browser["🖥️ Trình duyệt Cán bộ An toàn (Next.js 15 - fe-ppe :3000)"]
        MobilePWA["📱 Thiết bị di động HSE (PWA / Responsive)"]
    end

    subgraph EDGE_TIER ["TẦNG BIÊN CÔNG TRƯỜNG (EDGE COMPUTING LAYER)"]
        IPCam1["📹 Camera Cổng 01 (RTSP 1080p)"]
        IPCam2["📹 Camera Giàn Giáo 02 (RTSP 1080p)"]
        AIEngine["⚡ smart-ppe-ai-service (Python / YOLO11 / ByteTrack)"]
        SQLiteBuf[("💾 SQLite Buffer (Offline Storage)")]
        
        IPCam1 -->|RTSP H.264| AIEngine
        IPCam2 -->|RTSP H.264| AIEngine
        AIEngine <--> SQLiteBuf
    end

    subgraph GATEWAY_TIER ["TẦNG TRUY CẬP (INGRESS & GATEWAY)"]
        Traefik["🌐 Traefik v3 API Gateway (:80, :8080)\n[Security Headers | RateLimit | Tracing]"]
    end

    subgraph MESSAGE_BROKER ["XƯƠNG SỐNG SỰ KIỆN (EVENT STREAMING BACKBONE)"]
        Kafka["📨 Apache Kafka (KRaft Mode :9092)\nTopics: ppe.violation.detected, ppe.incident.resolved..."]
        RedisBus[("⚡ Redis 7 Alpine (:6379)\n[SSE Session Cluster | PubSub | Cache]")]
    end

    subgraph STORAGE_TIER ["LƯU TRỮ ĐỐI TƯỢNG (OBJECT STORAGE)"]
        MinIO[("🪣 MinIO S3 Object Storage (:9000)\nBuckets: ppe-evidences, ppe-reports")]
    end

    subgraph SERVICES_TIER ["TẦNG MICROSERVICES NGHIỆP VỤ (BACKEND TIER)"]
        IdentitySvc["🔑 identity-service (:9999)\n[Auth | RS256 JWKS | RBAC]"]
        SiteSvc["🏢 site-service (:8891)\n[Sites | Zones | Rules]"]
        CameraSvc["🎥 camera-service (:8892)\n[Streams | Health Logs]"]
        IncidentSvc["🚨 incident-service (:8893)\n[Lifecycle | Assignments]"]
        NotifSvc["🔔 notification-service (:8889)\n[SSE Stream | Email | WebPush]"]
        MediaSvc["📁 media-service (:8890)\n[Presigned URLs | Checksum]"]
        ReportSvc["📊 reporting-service (:8894)\n[Cron Stats | PDF Export]"]
    end

    subgraph DATABASE_TIER ["CƠ SỞ DỮ LIỆU ĐỘC LẬP (POSTGRESQL 16 :5433)"]
        DB_Identity[("ppe_identity_db")]
        DB_Site[("ppe_site_db")]
        DB_Camera[("ppe_camera_db")]
        DB_Incident[("ppe_incident_db")]
        DB_Media[("ppe_media_db")]
        DB_Report[("ppe_reporting_db")]
        DB_Notif[("ppe_notification_db")]
    end

    %% Client Interactions
    Browser -->|HTTP/REST & SSE| Traefik
    MobilePWA -->|HTTP/REST & SSE| Traefik

    %% Edge Ingestion to Broker & Storage
    AIEngine -->|1. Upload Evidence Bounding Box| MinIO
    AIEngine -->|2. Publish ppe.violation.detected| Kafka
    AIEngine -.->|3. Fallback Sync HTTP| Traefik

    %% Gateway Routing
    Traefik -->|/api/v1/auth, /users| IdentitySvc
    Traefik -->|/api/v1/sites, /zones| SiteSvc
    Traefik -->|/api/v1/cameras| CameraSvc
    Traefik -->|/api/v1/incidents| IncidentSvc
    Traefik -->|/api/v1/notifications| NotifSvc
    Traefik -->|/api/v1/files| MediaSvc
    Traefik -->|/api/v1/reports| ReportSvc

    %% Service to Broker
    IncidentSvc <-->|Consume Violation & Publish Resolved| Kafka
    NotifSvc <-->|Consume Violation & Site Alert| Kafka
    NotifSvc <-->|Cluster Broadcast sse:events:stream| RedisBus
    ReportSvc <-->|Consume Events for Realtime Rollup| Kafka

    %% Service to Database
    IdentitySvc --> DB_Identity
    SiteSvc --> DB_Site
    CameraSvc --> DB_Camera
    IncidentSvc --> DB_Incident
    MediaSvc --> DB_Media
    ReportSvc --> DB_Report
    NotifSvc --> DB_Notif
```

---

### 2.3. Hạ tầng dùng chung (Distributed Infrastructure Backbone)

Được cấu hình trong [docker-compose.infra.yml](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-infra/docker-compose.infra.yml):
1. **PostgreSQL 16 (Alpine):** Cổng kết nối `5433:5432`. Script khởi tạo [01-init-multiple-dbs.sql](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-infra/scripts/init-multiple-dbs.sql) tự động tạo ra 6 database logical độc lập kèm các người dùng phân quyền riêng biệt (`ppe_identity_user`, `ppe_site_user`, `ppe_camera_user`, `ppe_incident_user`, `ppe_media_user`, `ppe_reporting_user`, `ppe_notification_user`). Script [02-init-uuidv7.sql](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-infra/scripts/init-uuidv7.sql) nạp hàm tạo UUIDv7 tự nhiên.
2. **Redis 7 Alpine:** Cổng `6379:6379`. Quản lý phiên làm việc, lưu cache phân quyền, hàng đợi email BullMQ và đóng vai trò Pub/Sub message broker giữa các node của Notification Service để phát tán SSE.
3. **Apache Kafka (Confluent cp-kafka 7.5.0):** Chạy ở chế độ **KRaft (Kafka Raft Metadata)** không cần Apache ZooKeeper, giảm thiểu độ phức tạp vận hành và tăng tốc độ bầu chọn Controller lên dưới 500ms. Cổng `9092`.
4. **Kafka UI Console (Provectus Labs):** Cổng `8088:8080`, cung cấp dashboard đồ họa quản lý topics, partition offsets, consumer lag và xem trực tiếp nội dung payload JSON.
5. **MinIO Object Storage:** Cổng API `9000`, Console `9001`. Tương thích chuẩn AWS S3 API, đóng vai trò lưu trữ lâu dài ảnh chụp hiện trường có gắn bounding box và video clip bằng chứng vi phạm.

---

### 2.4. Traefik v3 API Gateway và mô hình bảo vệ biên

File cấu hình động [dynamic.yml](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-infra/traefik/dynamic.yml) triển khai cơ chế Hot-Reload:
* **Token Bucket Rate Limiting:** Thiết lập trung bình 100 req/s, giới hạn đỉnh (burst) 200 req/s cho mỗi IP nguồn, bảo vệ hệ thống trước tấn công DoS/DDoS.
* **Strict Security Headers:** Chặn clickjacking (`frameDeny: true`), kích hoạt XSS Protection, cấm MIME sniffing (`contentTypeNosniff: true`), đặt chính sách Referrer `strict-origin-when-cross-origin`.
* **Internal Secret Injection:** Gateway tự động chèn header bí mật nội bộ `X-Gateway-Secret` vào các request hợp lệ trước khi chuyển tiếp vào mạng nội bộ Docker (`ppe_infra_net`). Bất kỳ request nào từ bên ngoài cố tình giả mạo header này đều bị Gateway ghi đè.
* **Distributed Request Tracing:** Tự động sinh mã định danh `X-Request-Id` (UUIDv4) để theo vết luồng dữ liệu xuyên suốt từ Gateway qua các microservice vào cơ sở dữ liệu.

---

## CHƯƠNG 3: PHÂN TÍCH CHUYÊN SÂU CÁC MICROSERVICE BACKEND

### 3.1. `smart-ppe-identity-service` (:9999) — Trung tâm Định danh & Bảo mật Không trạng thái

#### A. Kiến trúc bảo mật JWT Bất đối xứng (RS256 & JWKS)
Dịch vụ giải quyết bài toán xác thực phân tán mà không tạo nút thắt cổ chai (bottleneck):
* **Cặp khóa RSA 2048-bit:** Khóa bí mật (`private.key.pem`) được lưu trữ nghiêm ngặt chỉ duy nhất tại Identity Service để ký các Access Token. Khóa công khai (`public.key.pem`) được chia sẻ cho các microservice vệ tinh hoặc cung cấp qua endpoint chuẩn [/.well-known/jwks.json](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/jwks/jwks.service.ts).
* **Xác thực Không trạng thái (Stateless Authentication):** Các microservice như Camera, Site, Incident tự nạp public key và tự giải mã xác minh chữ ký điện tử của Token trong $\approx 0.1\text{ ms}$ mà không cần gọi ngược về Identity Service hay truy vấn cơ sở dữ liệu.
* **Mô hình Token Kép (Dual Token Pattern):**
  - **Access Token:** Hạn dùng ngắn (15 phút), chứa `userId`, `email`, `role`, và mảng danh sách `permissions`. Được lưu trữ an toàn trong `httpOnly cookie` (tên cookie `accessToken`) và hỗ trợ Authorization Bearer Header.
  - **Refresh Token:** Chuỗi mã hóa ngẫu nhiên (UUIDv7) có hạn dùng 7 ngày, lưu trữ trong bảng `refresh_tokens`.
* **Refresh Token Rotation & Phát hiện Gian lận (Family Reuse Detection):** Mỗi lần ứng dụng yêu cầu cấp mới Access Token, Refresh Token cũ ngay lập tức bị vô hiệu hóa và một Refresh Token mới được sinh ra. Nếu phát hiện một Refresh Token đã thu hồi lại được gửi lên (dấu hiệu kẻ gian đã đánh cắp token), hệ thống kích hoạt cơ chế bảo vệ khẩn cấp: **Hủy toàn bộ phiên làm việc của người dùng đó (Revoke all active sessions)** và gửi email cảnh báo bảo mật.

#### B. Xác thực Hai Yếu tố (2FA TOTP RFC 6238)
* Triển khai thư viện thuật toán Time-based One-Time Password.
* Người dùng kích hoạt bằng cách quét mã QR qua Google Authenticator hoặc Authy.
* Hệ thống sinh kèm **10 mã khẩn cấp (Backup Codes)** được mã hóa bằng thuật toán băm Bcrypt (`two_factor_backup_codes`) giúp người dùng đăng nhập trong tình huống mất điện thoại.

#### C. Chống Tấn công Dò Mật khẩu (Brute-force Protection)
* Theo dõi trường `failed_login_attempts`.
* Khi người dùng nhập sai mật khẩu 5 lần liên tiếp, tài khoản bị tạm khóa trong vòng 15 phút (`locked_until`). Mọi nỗ lực đăng nhập trong thời gian này đều bị từ chối ngay từ tầng dữ liệu mà không cần chạy thuật toán so sánh chuỗi băm Bcrypt nặng nề.

---

### 3.2. `smart-ppe-site-service` (:8891) — Quản lý Thực thể Công trường & Không gian Không gian học

Dịch vụ quản lý mô hình tổ chức không gian thực địa:
* **Thực thể Site (Công trường):** Lưu trữ mã định danh `code` (ví dụ `SITE-HN-01`), tên công trường, vị trí địa lý, ngày khởi công/hoàn thành và danh sách các cán bộ phụ trách an toàn (`contact_officers`).
* **Thực thể Zone (Khu vực giám sát):** Chia nhỏ công trường thành các phân khu (ví dụ: *Phân khu Khung cốt thép tầng 3*, *Cổng chính tiếp nhận vật liệu*).
* **Thực thể RestrictedArea (Vùng nguy hiểm cấm xâm nhập):** Định nghĩa các tọa độ đa giác nguy hiểm (Dangerous Polygon Coords) như chân cần cẩu tháp, miệng hố thang máy chưa lắp rào chắn.
* **Thực thể SiteSafetyConfig (Luật an toàn động theo công trường):**
  - `confidenceThreshold`: Ngưỡng tin cậy của AI (mặc định 0.80).
  - `confirmationDuration`: Thời gian vi phạm liên tục cần thiết trước khi tạo Incident (mặc định 2 giây).
  - `cooldownDuration`: Thời gian hồi còi chống trùng (mặc định 30 giây).
  - Cờ bật/tắt từng loại vi phạm: `enableNoHelmet`, `enableNoVest`, `enableRestrictedArea`.

---

### 3.3. `smart-ppe-camera-service` (:8892) — Quản lý Luồng RTSP/WebRTC & Giám sát Sức khỏe Thiết bị

Dịch vụ đóng vai trò là "Cổng giao tiếp đa phương tiện" (Media Gateway Interface) và cơ chế giám sát thực thể phần cứng camera toàn hệ thống.

#### 3.3.1. Đặc tả Kiến trúc và So sánh Chuyên sâu các Giao thức Luồng Video (Video Streaming Protocols)
Trong hệ thống giám sát công trường thông minh Smart PPE, việc lựa chọn và phối hợp giữa các giao thức truyền tải video là yếu tố sống còn quyết định độ trễ phát hiện vi phạm, tải tính toán của server và trải nghiệm giám sát trực tiếp của cán bộ an toàn. Hệ thống phân loại và hỗ trợ 4 nhóm giao thức chính:

```mermaid
flowchart LR
    subgraph Cameras["Nguồn Camera Hiện trường"]
        C1["Camera IP CCTV (Hikvision/Dahua)"]
        C2["Camera di động / NVR"]
        C3["Webcam Laptop / Demo File MP4"]
    end

    subgraph Protocols["Giao thức Truyền dẫn"]
        RTSP["RTSP Stream\n(Port 554/8554 | TCP/UDP)"]
        HLS["HLS Stream\n(Port 80/443 | HTTP .m3u8)"]
        WebRTC["WebRTC Stream\n(UDP | DTLS/SRTP)"]
        Other["Other Stream\n(Webcam Local / HTTP File)"]
    end

    subgraph Processing["Hạ tầng Xử lý & Phân phối"]
        AI["smart-ppe-ai-service\n(OpenCV / YOLO11 Ingestion)"]
        MediaGW["Media Gateway / Transcoder\n(RTSP to WebRTC/HLS)"]
        MinIO["MinIO S3\n(Evidence Storage)"]
    end

    subgraph Consumers["Điểm Tiêu thụ"]
        Edge["Kafka Topic: ppe.violation.detected"]
        WebDash["Front-end Dashboard (fe-ppe)\nHTML5 Video / Canvas Bounding Box"]
    end

    C1 -->|CCTV Output| RTSP
    C2 -->|Live Stream| HLS
    C3 -->|Local Feed| Other
    
    RTSP -->|Fast Ingest (~100ms)| AI
    RTSP -->|Transcoding| MediaGW
    MediaGW -->|Low Latency (<300ms)| WebRTC
    MediaGW -->|Adaptive Stream| HLS

    AI -->|Bắn sự kiện vi phạm| Edge
    AI -->|Lưu ảnh snapshot & video clip| MinIO
    WebRTC -->|Giám sát trực tiếp Real-time| WebDash
    HLS -->|Xem lại / Băng thông yếu| WebDash
    Other -->|Demo / Lab Testing| WebDash
```

##### Bảng So sánh Kỹ thuật Toàn diện giữa 4 Giao thức

| Tiêu chí So sánh | 📡 RTSP Stream (Real-Time Streaming) | 📺 HLS Stream (HTTP Live Streaming) | ⚡ WebRTC (Web Real-Time Comm) | 💻 Other (Webcam / File MP4 / YouTube) |
| :--- | :--- | :--- | :--- | :--- |
| **Giao thức mạng nền tảng** | RTSP / RTP / RTCP (TCP/UDP, port 554/8554) | HTTP / HTTPS (TCP port 80/443, file `.m3u8` & `.ts`) | UDP / DTLS / SRTP (Peer-to-Peer hoặc qua Media Server) | Browser MediaStream API / HTTP GET File |
| **Độ trễ truyền tải (Latency)** | **Rất thấp** (~100ms – 500ms) | **Cao** (~3s – 8s với Standard HLS; 1s – 2s với Low-Latency HLS) | **Siêu thấp** (< 150ms – 300ms, độ trễ tức thời) | **Gần như 0ms** (Xử lý trực tiếp trên thiết bị cục bộ) |
| **Khả năng phát trên Trình duyệt Web** | ❌ **Không hỗ trợ Native** (Chrome, Safari, Firefox không có thẻ phát trực tiếp RTSP) | ✅ **Hỗ trợ rộng rãi** (Native trên Safari iOS/macOS, dùng thư viện `hls.js` cho Chrome/Firefox) | ✅ **Hỗ trợ Native 100%** (HTML5 `<video>` với `srcObject = mediaStream`, không cần plugin) | ✅ **Hỗ trợ Native 100%** (HTML5 Video Element / iFrame nhúng) |
| **Độ phổ biến trên thiết bị CCTV** | 🌟 **Tiêu chuẩn công nghiệp số 1** (99% camera an ninh, đầu ghi NVR đều hỗ trợ) | Rất hiếm trên camera IP độc lập; thường do Media Server chuyển mã tạo ra | Hiếm trên camera CCTV cấp thấp; cần thiết bị hỗ trợ hoặc Gateway chuyển đổi | Không dùng cho camera công nghiệp, chỉ dùng cho thiết bị cá nhân |
| **Khả năng vượt Tường lửa (Firewall)** | ⚠️ Kém (Dễ bị Firewall công trường chặn cổng 554 hoặc gói tin UDP) | 🌟 Hoàn hảo (Đi qua mọi Firewall, NAT, Proxy vì dùng chung cổng web 80/443) | Khá (Cần cấu hình máy chủ STUN/TURN để giải quyết NAT Traversal) | Hoàn hảo (Chạy cục bộ hoặc HTTP tiêu chuẩn) |
| **Công nghệ Băng thông Thích ứng** | ❌ Không có (Phụ thuộc luồng cố định Main-stream / Sub-stream) | 🌟 Tự động thích ứng (Adaptive Bitrate Streaming - ABR tự hạ chất lượng khi mạng yếu) | ✅ Tự động điều chỉnh bitrate và FPS dựa trên phản hồi RTCP | ❌ Cố định theo file hoặc thiết lập webcam |
| **Vai trò kiến trúc trong Smart PPE** | **Luồng đầu vào cho AI Service (`smart-ppe-ai-service`)** nạp frame cho YOLO11m phân tích vi phạm | **Lưu trữ bằng chứng & Phát lại video** khi đường truyền mạng công trường không ổn định | **Giám sát trực tiếp thời gian thực trên Web Dashboard (`fe-ppe`)**, hỗ trợ điều khiển PTZ | **Môi trường Demo, Nghiên cứu, Bảo vệ đồ án tốt nghiệp** mà không cần camera vật lý |

##### Phân tích Chi tiết Từng Giao thức:

1. **RTSP (Real-Time Streaming Protocol - RFC 2326 / RFC 7826):**
   - **Bản chất:** Giao thức điều khiển phiên đa phương tiện dạng client-server (tương tự HTTP nhưng duy trì trạng thái phiên). Hỗ trợ các lệnh điều khiển luồng: `DESCRIBE`, `SETUP`, `PLAY`, `PAUSE`, `TEARDOWN`. Dữ liệu video thực tế được đóng gói trong RTP (Real-time Transport Protocol).
   - **URL mẫu:** `rtsp://admin:Pass@123@192.168.1.100:554/stream1`.
   - **Ứng dụng trong đồ án:** Đây là "huyết mạch" truyền tín hiệu từ camera CCTV công trường về máy chủ biên `smart-ppe-ai-service`. Thư viện OpenCV (`cv2.VideoCapture`) và FFmpeg đọc trực tiếp luồng này để nạp mảng NumPy Frame vào mạng YOLO11m.
   - **Thách thức:** Trình duyệt web không thể phát trực tiếp RTSP. Giải pháp của hệ thống là bố trí Media Gateway (như go2rtc / MediaMTX) trung gian để chuyển đổi RTSP sang WebRTC phục vụ người dùng.

2. **HLS (HTTP Live Streaming - RFC 8216):**
   - **Bản chất:** Video được máy chủ cắt thành các tệp tin nhỏ `.ts` hoặc `.m4s` có thời lượng từ 2 đến 6 giây, được lập danh mục trong tệp tin playlist `.m3u8`. Trình duyệt web liên tục kéo (HTTP GET) các phân đoạn mới nhất để phát.
   - **URL mẫu:** `https://stream.smartppe.vn/live/camera-01/index.m3u8`.
   - **Ưu điểm:** Khả năng mở rộng (Scalability) cực cao thông qua mạng phân phối nội dung CDN; không bị ảnh hưởng bởi tường lửa; người dùng xem trên điện thoại di động mạng 4G/5G rất ổn định.
   - **Nhược điểm:** Độ trễ cao từ 3s đến 8s (do phải chờ tạo đủ segment và buffer), do đó không thể dùng HLS để kích hoạt còi hú cảnh báo công nhân tại thời điểm t = 0s.

3. **WebRTC (Web Real-Time Communication - W3C / IETF):**
   - **Bản chất:** Bộ giao thức mã nguồn mở cung cấp khả năng truyền âm thanh, video và dữ liệu thời gian thực thông qua kết nối mạng ngang hàng hoặc qua máy chủ phân phối SFU (Selective Forwarding Unit) mà không cần plugin.
   - **Ưu điểm:** Độ trễ dưới 200ms – 300ms, biến trình duyệt web thành màn hình hiển thị trực tiếp (Live Monitor) chân thực nhất. Cán bộ giám sát an toàn nhìn thấy công nhân bước vào vùng cẩu tháp ngay tại tích tắc sự việc xảy ra và có thể bấm nút đàm thoại nói trực tiếp vào loa camera.
   - **Đánh đổi:** Tốn tài nguyên CPU trên server để đóng gói RTP/SRTP và cần máy chủ STUN/TURN khi các client nằm sau các mạng NAT phức tạp.

4. **Other (Webcam HTML5, HTTP MJPEG, Video File Demo MP4, YouTube):**
   - **Webcam trực tiếp:** Front-end gọi API `navigator.mediaDevices.getUserMedia({ video: true })` để lấy nguồn hình ảnh trực tiếp từ camera của laptop/PC.
   - **Ý nghĩa sống còn trong Đồ án:** Khi sinh viên bảo vệ đồ án tốt nghiệp trước Hội đồng chấm thi, việc dựng cả hệ thống camera IP, switch mạng PoE và dây cáp mạng công trường là vô cùng cồng kềnh và tiềm ẩn rủi ro mạng. Tính năng **Webcam & Demo Video File** cho phép bật camera laptop, đeo nón/áo bảo hộ và mô phỏng nhận diện trực tiếp vi phạm PPE ngay tại phòng hội đồng với độ tin cậy 100%.

---

#### 3.3.2. Cấu hình Xử lý Video (CameraConfig) & ROI Multi-polygon
* **Liên kết Thực thể Không gian:** Mỗi camera bắt buộc liên kết với một `siteId` (Công trường) và `zoneId` (Phân khu không gian).
* **Cấu hình Khung hình & Tải Tính toán (CameraConfig):**
  - `captureFps`: Tốc độ lấy mẫu hình ảnh gửi cho AI (mặc định 10 - 15 FPS), cân bằng tối ưu giữa độ mượt tracking và tải GPU VRAM.
  - `resolution`: Độ phân giải luồng nhận diện (`1280x720` hoặc `1920x1080`).
  - `processingEnabled`: Cờ boolean cho phép tạm dừng suy luận AI trên camera mà không cần ngắt kết nối vật lý.
* **Đa giác Vùng Quan sát & Vùng Nguy hiểm (ROI Polygons):**
  - Hỗ trợ lưu trữ tọa độ chuẩn hóa $[x, y]$ từ $0.0$ đến $1.0$ của các vùng làm việc hợp lệ và vùng cấm (Restricted Danger Area).
  - Tọa độ này được nạp vào thuật toán Ray Casting của AI Service để phát hiện vi phạm xâm nhập không gian.

---

#### 3.3.3. Watchdog Heartbeat, Giám sát Sức khỏe Thiết bị & Phát Sự kiện Kafka
* **Tiến trình Giám sát Định kỳ (Watchdog Interval):**
  - Mỗi 30 giây, một worker nền thực hiện ping ICMP và kiểm tra cổng RTSP (554/8554) của từng camera.
  - Ghi nhận nhật ký kiểm tra vào bảng `camera_health_logs` bao gồm: thời gian phản hồi (`latencyMs`), tỷ lệ rớt gói và mã lỗi chi tiết.
* **Cơ chế Chuyển đổi Trạng thái Tự động:**
  - Nếu mất kết nối liên tiếp 3 chu kỳ (90s): Camera tự động chuyển trạng thái từ `ONLINE` sang `OFFLINE`.
  - Nếu độ trễ vượt quá ngưỡng quy định (> 1000ms): Chuyển trạng thái sang `DEGRADED`.
* **Phát Sự kiện Bất đồng bộ Kafka:**
  - Ngay khi trạng thái camera thay đổi, dịch vụ phát sự kiện vào topic `ppe.camera.status_changed`.
  - `smart-ppe-notification-service` tiêu thụ sự kiện này để gửi thông báo khẩn cấp (SSE + Email) cho kỹ sư IT và giám sát viên công trường biết camera đã bị mất tín hiệu.

---

### 3.4. `smart-ppe-incident-service` (:8893) — Quản lý Vòng đời Sự cố & Lưu trữ Bằng chứng

Là dịch vụ trung tâm xử lý dữ liệu vi phạm an toàn lao động:
* **Máy Trạng thái Hữu hạn Vòng đời Sự cố (Incident Finite State Machine):**
  $$\text{PENDING\_REVIEW} \xrightarrow{\text{Assign/Review}} \text{CONFIRMED} \xrightarrow{\text{Action Taken}} \text{RESOLVED} \xrightarrow{\text{Audited}} \text{CLOSED}$$
  $$\text{PENDING\_REVIEW} \xrightarrow{\text{HSE Dismiss}} \text{FALSE\_POSITIVE} \text{ / } \text{DISMISSED}$$

```mermaid
stateDiagram-v2
    [*] --> PENDING_REVIEW: AI phát hiện vi phạm (ppe.violation.detected)
    PENDING_REVIEW --> CONFIRMED: HSE thẩm định đúng (True Positive)
    PENDING_REVIEW --> FALSE_POSITIVE: HSE bác bỏ do AI nhận diện sai
    PENDING_REVIEW --> DISMISSED: HSE hủy bỏ do ngoại lệ công trường
    
    CONFIRMED --> IN_PROGRESS: Phân công cán bộ an toàn xử lý
    IN_PROGRESS --> RESOLVED: Đã cấp bổ sung PPE / Lập biên bản
    RESOLVED --> CLOSED: Trưởng ban An toàn nghiệm thu đóng hồ sơ
    
    FALSE_POSITIVE --> [*]: Đẩy vào hàng đợi Active Learning Retrain
    CLOSED --> [*]
```

* **Quản lý Bằng chứng (Evidence):**
  - Lưu trữ `storageKey` của ảnh snapshot và clip ngắn trên MinIO.
  - Mã băm toàn vẹn SHA-256 (`checksum`) ngăn chặn hành vi sửa đổi bằng chứng số.
  - Lưu tọa độ chi tiết `aiDetections` dưới định dạng JSON phục vụ vẽ lại Bounding Box trên giao diện web.
* **Tích hợp Kafka Event Bus:**
  - Đóng vai trò Kafka Consumer trong nhóm `ppe-incident-consumer-group`, lắng nghe topic `ppe.violation.detected` để tự động khởi tạo bản ghi sự cố trong database.
  - Đóng vai trò Kafka Producer, phát sự kiện `ppe.incident.resolved` vào topic tương ứng khi sự cố được đóng.

---

### 3.5. `smart-ppe-notification-service` (:8889) — Phân phối Cảnh báo Đa kênh Thời gian thực

* **Server-Sent Events (SSE) Manager Cluster:**
  - Cung cấp endpoint kết nối hướng sự kiện một chiều: `GET /api/v1/notifications/stream`.
  - Hỗ trợ truyền tải token qua query param `?token=` (có whitelist kiểm soát bảo mật) hoặc Header.
  - Tích hợp Redis Pub/Sub trên kênh `sse:events:stream`. Khi hệ thống chạy nhiều bản sao (replicas) của Notification Service sau Traefik, thông báo từ bất kỳ node nào cũng được broadcast tới đúng kết nối SSE của người dùng đang mở trên trình duyệt.
* **Bộ lọc Ngưỡng Nguy hiểm & Tùy chọn Người dùng (NotificationPreference):**
  - Cho phép người dùng tùy chỉnh kênh nhận tin: SSE in-app, WebPush hoặc Email.
  - Lọc theo ngưỡng nghiêm trọng (`severityThreshold`): Chỉ gửi email khi sự cố đạt mức `CRITICAL` hoặc `HIGH`, tránh làm phiền người dùng với các cảnh báo mức `LOW`.

---

### 3.6. `smart-ppe-media-service` (:8890) — Quản lý Tệp tin & Object Storage MinIO S3

* Chịu trách nhiệm cấp phát URL tải lên có chữ ký (Presigned Upload URLs) và URL tải về tạm thời (Presigned Download URLs) có gắn thời gian hết hạn (TTL 15-60 phút).
* Đảm bảo các dịch vụ khác và client không thể truy cập trực tiếp vào bucket S3 mà phải đi qua lớp kiểm soát quyền hạn.

---

### 3.7. `smart-ppe-reporting-service` (:8894) — Tổng hợp Chỉ số Tuân thủ & Kết xuất Báo cáo

* **Tự động Tổng hợp Số liệu (Rollup Aggregation):**
  - Chạy tiến trình nền định kỳ hoặc bắt sự kiện Kafka để gom nhóm số liệu vào bảng `report_statistics`.
  - Phân loại vi phạm theo ngày (`statDate`), công trường (`siteId`), loại vi phạm (`violationType`), và mức độ nghiêm trọng (`severity`).
* **Tính toán Tỷ lệ Tuân thủ An toàn Công trường (Compliance Rate - CR):**
  $$CR_{\text{site}} = \left( 1 - \frac{\sum \text{Violations}_{\text{confirmed}}}{\sum \text{TotalPersonsDetections}} \right) \times 100\%$$
* **Kết xuất Báo cáo Đa định dạng:**
  - Hỗ trợ xuất file báo cáo kiểm toán an toàn lao động định dạng PDF (sử dụng thư viện tạo trang PDF chuẩn hóa kèm logo doanh nghiệp và biểu đồ) và file Excel dữ liệu chi tiết (XLSX).

---

## CHƯƠNG 4: BỘ NÃO THỊ GIÁC MÁY TÍNH — `smart-ppe-ai-service`

Dịch vụ `smart-ppe-ai-service` là nhân tố cốt lõi thực hiện biến đổi dữ liệu video thô thành tri thức an toàn lao động.

```mermaid
flowchart LR
    A["RTSP Video Stream"] --> B["VideoReader\n(FFmpeg/OpenCV)"]
    B --> C["YOLO11 Detector\n(Person, Helmet, Vest)"]
    C --> D["ByteTrack MOT\n(Gán Track ID)"]
    D --> E["Geometric Associator\n(Ghép PPE vào Người)"]
    E --> F["Safety Rules & Temporal\nConfirmation (3 giây)"]
    F --> G["Deduplicator\n(Cooldown 30s)"]
    G --> H["Evidence Generator\n(Vẽ Box đỏ/xanh)"]
    H --> I["MinIO Upload\n(S3 Snapshot)"]
    I --> J["3-Tier Event Dispatcher\n(Kafka / HTTP / SQLite)"]
```

### 4.1. Pipeline xử lý luồng Video: Ingestion $\rightarrow$ YOLO11 $\rightarrow$ ByteTrack
1. **Video Ingestion ([video_reader.py](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-ai-service/app/video/video_reader.py)):** Đọc các luồng RTSP trong luồng nền riêng biệt (background thread), áp dụng hàng đợi kích thước nhỏ để loại bỏ hiện tượng trễ hình tích lũy (buffer bloat). Tự động kết nối lại khi đứt kết nối mạng camera.
2. **YOLO11 Inference ([detector.py](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-ai-service/app/detection/detector.py)):**
   - Sử dụng mô hình `yolo11s.pt` (hoặc `best.pt` của `yolo11m`), tối ưu hóa độ trễ suy luận.
   - Trích xuất bounding box dạng $[x_1, y_1, x_2, y_2]$, nhãn lớp và điểm tin cậy (confidence score $\ge 0.5$).
3. **Multi-Object Tracking (ByteTrack):**
   - Khắc phục nhược điểm mất dấu khi vật thể bị che khuất một phần.
   - Gán `track_id` duy nhất và liên tục cho từng đối tượng công nhân qua các frame liên tiếp.

---

### 4.2. Thuật toán Ghép cặp Hình học PPE–Person (Geometric Association Heuristic)

Mã nguồn tại [associator.py](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-ai-service/app/association/associator.py). Không thể chỉ đếm tổng số mũ và tổng số người trong khung hình, thuật toán phải xác định **chính xác người nào đang thiếu trang bị nào**:

```
      x1                 cx                 x2
  y1  ┌──────────────────┬──────────────────┐  ▲
      │             [HEAD REGION]           │  │ 10% h (Anchor Y)
      │     (Margin 15% - Head Y Max 40%)   │  │
      ├──────────────────┼──────────────────┤  ▼
      │                                     │  ▲
      │             [TORSO REGION]          │  │
      │        (Y Min 20% - Y Max 85%)      │  │ 55% h (Anchor Y)
      │                                     │  │
      ├──────────────────┼──────────────────┤  ▼
      │                                     │
      │             [LOWER BODY]            │
  y2  └─────────────────────────────────────┘
```

1. **Quy tắc Ghép Mũ bảo hộ (`_helmet_candidates`):**
   - Tâm mũ $(h_x, h_y)$ phải nằm trong khoảng lề ngang 15% của thân người:
     $$x_1 + 0.15 \cdot w \le h_x \le x_2 - 0.15 \cdot w$$
   - Tâm mũ phải nằm ở 40% phần trên cơ thể:
     $$h_y < y_1 + 0.40 \cdot h$$
   - Điểm số ưu tiên được tính bằng khoảng cách Euclid tới điểm mỏ neo đầu $(c_x, y_1 + 0.10 \cdot h)$.
2. **Quy tắc Ghép Áo phản quang (`_vest_candidates`):**
   - Vùng thân được định nghĩa là: $[x_1, y_1 + 0.20 \cdot h, x_2, y_1 + 0.85 \cdot h]$.
   - Áo được chấp nhận nếu tâm áo $(v_x, v_y)$ rơi vào vùng thân HOẶC có chỉ số giao diện $IoU(\text{VestBox}, \text{TorsoRegion}) \ge 0.10$.
3. **Thuật toán Phân bổ Tham lam (Greedy 1-to-1 Assignment):**
   - Mỗi trang bị PPE chỉ được ghép cho tối đa một người.
   - Ưu tiên cặp có chỉ số $IoU$ cao nhất và khoảng cách gần nhất.
4. **Loại bỏ Nhiễu Biên Khung hình ([safety.py: `_judgeable`](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-ai-service/app/rules/safety.py#L51)):**
   - Nếu bounding box người chạm mép trên khung hình ($y_1 \le \text{margin}$), phần đầu có thể đã bị máy quay cắt mất $\rightarrow$ Đưa luật mũ về `UNJUDGEABLE` (không xét vi phạm), loại bỏ hoàn toàn cảnh báo giả khi người bước vào từ mép trên.

---

### 4.3. Động cơ Xác nhận Vi phạm Trượt Thời gian (Temporal Confirmation Window)

Mã nguồn tại [confirmation.py](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-ai-service/app/rules/confirmation.py). Để giải quyết triệt để tình trạng người lao động vô tình quay lưng hoặc cúi nhặt đồ làm khuất mũ trong tích tắc:
* Không dựa vào số lượng frame cố định (vì FPS camera có thể dao động từ 15 đến 30 FPS).
* Dựa trên **mốc thời gian thực (Physical Timestamps $t$ tính bằng giây)**.
* Khi một công nhân bị phát hiện thiếu PPE (`VIOLATION_CANDIDATE`), hệ thống mở một "chuỗi tích lũy" (streak accumulator).
* Nếu trạng thái vi phạm duy trì liên tục và tổng thời gian tích lũy vượt ngưỡng $\Delta t \ge 3.0\text{ giây}$, sự kiện `ConfirmedViolation` mới được kích hoạt.
* Nếu trong quá trình này người đó đội mũ lại (`COMPLIANT`), chuỗi tích lũy lập tức bị xóa bỏ (reset).
* Nếu gặp trạng thái không rõ ràng do khuất bóng (`UNKNOWN`), thời gian tích lũy được giữ nguyên (pause) chứ không bị reset oan.

---

### 4.4. Bộ lọc Chống Bão Cảnh báo & Ổn định Track ID (Deduplication & Canonical Tracking)

Mã nguồn tại [deduplication.py](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-ai-service/app/rules/deduplication.py):
1. **Chống Nhảy ID (ByteTrack Track ID Switch Mitigation):**
   - Khi một công nhân đi sau cột bê tông và xuất hiện lại, ByteTrack có thể cấp một `track_id` mới toanh (ví dụ từ ID 5 đổi sang ID 12). Nếu không xử lý, hệ thống sẽ coi là người mới và phát cảnh báo lại.
   - `ViolationDeduplicator` ghi nhớ vị trí cuối cùng và thời điểm mất dấu của các track trong khoảng thời gian ân hạn $2.0\text{ giây}$ (`ID_SWITCH_GRACE_S`).
   - Nếu track mới xuất hiện gần vị trí cũ với khoảng cách $\le 1.5 \times \text{chiều cao}$, thuật toán tự động ánh xạ (merge) `track_id` mới về `canonical_person_id` cũ!
2. **Khoảng Thời gian Hồi phục (Cooldown Window):**
   - Khóa duy nhất chống trùng: `(camera_id, canonical_person_id, violation_type)`.
   - Áp dụng thời gian làm mát 30 giây (`COOLDOWN_DURATION_S = 30`). Trong suốt 30 giây này, dù công nhân đó tiếp tục không đội mũ, hệ thống cũng không bắn thêm sự kiện mới làm tràn ngập màn hình giám sát.

---

### 4.5. Cơ chế Phát Sự kiện Khả dụng cao 3 Tầng (3-Tier HA Dispatcher)

Mã nguồn tại [app/events/__init__.py](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-ai-service/app/events/__init__.py):
```
           ┌────────────────────────────────────────┐
           │        Confirmed Violation Event       │
           └───────────────────┬────────────────────┘
                               │
                [TẦNG 1] Thử Kafka Topic?
                               │
                      Thành công ──► [Kafka Cluster :9092] (Chuẩn)
                               │
                             Lỗi / Timeout
                               │
                [TẦNG 2] Thử HTTP Fallback API?
                               │
                      Thành công ──► [Incident Service HTTP :8893]
                               │
                             Lỗi / Mất mạng
                               │
                [TẦNG 3] Lưu SQLite Offline Buffer
                               │
                               ▼
              [Local SQLite Database trên Edge Box]
                               │
              (Tự động kiểm tra & Flush định kỳ khi có mạng)
```

1. **Tầng 1 (Kafka Producer):** Đẩy sự kiện bất đồng bộ vào topic `ppe.violation.detected`.
2. **Tầng 2 (HTTP Fallback):** Nếu Kafka broker gặp sự cố, hệ thống tự động fallback gọi trực tiếp REST API `POST /api/v1/incidents` của Incident Service.
3. **Tầng 3 (SQLite Offline Buffer):** Nếu mất mạng hoàn toàn (cáp mạng bị đứt, công trường mất internet), sự kiện được ghi vào SQLite cục bộ trên ổ cứng Edge Box. Tiến trình nền chạy ngầm sẽ tự động quét và đẩy bù (Flush) toàn bộ các sự kiện tồn đọng lên Cloud ngay khi phát hiện có mạng trở lại.

---

## CHƯƠNG 5: KIẾN TRÚC PHÂN HỆ FRONTEND — `fe-ppe`

Phân hệ Frontend đại diện cho lớp giao tiếp người dùng cao cấp, được xây dựng theo tiêu chuẩn Web hiện đại.

### 5.1. Công nghệ nền tảng: Next.js 15 App Router & React 19
* Cấu trúc thư mục định tuyến dạng nhóm `(auth)` và `(public)` phân định rõ ràng giữa các trang yêu cầu đăng nhập và trang công khai.
* Sử dụng cơ chế Server Components kết hợp với Client Components tối ưu hóa kích thước JavaScript bundle tải về máy khách.

---

### 5.2. Hệ thống Giao diện Neumorphism (Soft UI) & Dark/Light Theming
* Thiết kế dựa trên nguyên lý đổ bóng vật lý 3D kép (Dual Drop-shadows): một bóng sáng (Light shadow) và một bóng tối (Dark shadow) tạo cảm giác các khối nổi (`nm-raised`) hoặc khoét lõm (`nm-inset`) trực tiếp trên bề mặt.
* Chuyển đổi Dark/Light mode tự nhiên không chớp màn hình, lưu trạng thái theme vào LocalStorage.
* Toàn bộ hệ thống component được tách riêng thành gói dùng chung tại cổng `3001` ([neumorphism-design-system](file:///Users/thanhtra/D08/D08-DATN/neumorphism-design-system)).

---

### 5.3. Trình Quản lý Phiên & Bộ Mutex Single-Flight Token Refresh

Mã nguồn tại [fe-ppe/src/lib/axios.ts](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/src/lib/axios.ts):
* Khi Access Token hết hạn, trình duyệt có thể gửi đồng thời 5-10 request API (lấy dữ liệu camera, sự cố, thông báo...).
* Nếu cả 10 request cùng lúc gửi lệnh refresh token lên Backend, Backend sẽ coi là hành vi tấn công Replay Attack và hủy toàn bộ phiên làm việc.
* `axios.ts` triển khai biến toàn cục `refreshPromise` đóng vai trò là một **Mutex Khóa đơn (Single-Flight Pattern)**:
  ```typescript
  // Chỉ duy nhất request đầu tiên được thực sự gọi API refresh
  if (!refreshPromise) {
    refreshPromise = refreshClient.post("/auth/refresh").then(...)
      .finally(() => { refreshPromise = null; });
  }
  // Tất cả các request 401 khác tự động xếp hàng chờ chung promise này!
  await refreshPromise;
  ```

---

### 5.4. Trung tâm Điều hành Công trường (Site Command Center) & Video Wall Giám sát
Màn hình chi tiết công trường (`/sites/[id]`) cung cấp cái nhìn toàn diện 360 độ:
* Tab **Live Cameras:** Bố cục dạng Video Wall linh hoạt (chế độ 1x1, 2x2, 3x3 hoặc toàn màn hình). Tích hợp cảnh báo radar nhấp nháy viền đỏ trực tiếp trên camera khi có vi phạm.
* Tab **Incidents:** Danh sách các sự cố xảy ra riêng tại công trường đó, lọc nhanh theo trạng thái và mức độ khẩn cấp.
* Tab **Spatial Zones & Safety Rules:** Xem bản đồ phân khu và tùy chỉnh cấu hình độ nhạy của AI áp dụng riêng cho công trường.

---

### 5.5. Trình phát Camera Trí tuệ Nhân tạo với Bounding Box Overlay SVG/Canvas
Mã nguồn tại [camera-intelligence-player.tsx](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/src/components/features/cameras/detail/camera-intelligence-player.tsx):
* Sử dụng một lớp SVG phủ (Overlay layer) tọa độ đồng bộ $100\% \times 100\%$ phía trên video player.
* Nhận tọa độ bounding box chuẩn hóa $[x, y, w, h]$ theo tỷ lệ thực $[0.0 - 1.0]$.
* Tự động vẽ hộp màu xanh lá cây cho công nhân tuân thủ (`COMPLIANT`) và hộp màu đỏ nhấp nháy kèm nhãn cảnh báo cho người vi phạm (`NO_HELMET`, `NO_VEST`).
* Hiển thị biểu đồ đo lường đo đạc Telemetry thời gian thực: FPS luồng hình ảnh, độ trễ suy luận AI (Latency ms), và tỷ lệ rớt khung hình (Packet loss).

---

### 5.6. Bảng Điều khiển Đo lường Hiệu năng AI (AI Metrics Console) & Ma trận Nhầm lẫn
Màn hình `/ai-metrics` phục vụ các kỹ sư AI và lãnh đạo giám sát chất lượng mô hình:
* Biểu đồ thời gian thực về mAP@50, Precision và Recall của từng lớp đối tượng (`person`, `helmet`, `safety_vest`).
* Bản đồ nhiệt Ma trận Nhầm lẫn (Confusion Matrix Heatmap) giúp phát hiện các điểm nghẽn nhận diện (ví dụ: mô hình hay nhầm mũ lưỡi trai với mũ bảo hộ).
* Bảng điều phối phiên bản mô hình (Model Governance & Deployment) cho phép triển khai (deploy) bản weights mới từ xa xuống các camera.

---

## CHƯƠNG 6: TẬP HỢP CÁC SƠ ĐỒ TUẦN TỰ MERMAID CHI TIẾT NHẤT (DETAILED SEQUENCE DIAGRAMS)

Phần này cung cấp 6 sơ đồ tuần tự (Sequence Diagrams) mô tả chi tiết dòng chảy dữ liệu, các tham số, mã lỗi, và sự phối hợp giữa các microservice.

---

### 6.1. Sơ đồ 1: Xác thực Người dùng, Cấp phát & Single-Flight Refresh Token RS256

Mô tả luồng đăng nhập an toàn, cấp phát Access Token trong HTTP-Only cookie, và cơ chế làm mới token tự động chống trùng lặp khi Access Token hết hạn.

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Người dùng (Cán bộ HSE)
    participant FE as 🖥️ fe-ppe (Next.js 15 Client)
    participant Axios as 🛡️ Axios Interceptor (Single-Flight)
    participant Gateway as 🌐 Traefik v3 API Gateway
    participant IdentitySvc as 🔑 identity-service (:9999)
    participant Redis as ⚡ Redis 7 (Session Cache)
    participant DB as 🗄️ PostgreSQL (ppe_identity_db)

    %% Đăng nhập
    Note over User, DB: 1. GIAI ĐOẠN ĐĂNG NHẬP VÀ CẤP PHÁT TOKEN
    User->>FE: Nhập email, password, captcha token
    FE->>Gateway: POST /api/v1/auth/login {email, password, turnstileToken}
    Gateway->>IdentitySvc: Chuyển tiếp request + Inject X-Gateway-Secret
    IdentitySvc->>DB: Truy vấn User theo email (Check failed_login_attempts & locked_until)
    DB-->>IdentitySvc: Trả về User record (băm password Bcrypt)
    IdentitySvc->>IdentitySvc: So khớp mật khẩu & Kiểm tra 2FA
    alt Bật 2FA TOTP
        IdentitySvc-->>FE: 200 OK {requires2FA: true, tempToken}
        FE->>User: Hiển thị form nhập mã 6 số Authenticator
        User->>FE: Nhập OTP: "582910"
        FE->>Gateway: POST /api/v1/auth/2fa/verify {tempToken, code: "582910"}
        Gateway->>IdentitySvc: Chuyển tiếp request xác thực 2FA
        IdentitySvc->>IdentitySvc: Kiểm tra hợp lệ TOTP RFC 6238
    end
    IdentitySvc->>IdentitySvc: Ký Access Token bằng Private Key RSA (RS256, 15m)
    IdentitySvc->>DB: Lưu Refresh Token mới (UUIDv7, 7d) vào bảng refresh_tokens
    IdentitySvc-->>Gateway: 200 OK + Set-Cookie: accessToken (httpOnly, Secure, SameSite=Lax)
    Gateway-->>FE: 200 OK {user: {id, email, role, permissions}}
    FE-->>User: Đăng nhập thành công, chuyển hướng vào Dashboard

    %% Truy cập API & Hết hạn Access Token
    Note over User, DB: 2. GIAI ĐOẠN ACCESS TOKEN HẾT HẠN & SINGLE-FLIGHT REFRESH
    FE->>Axios: Gửi 3 request API song song (Get Cameras, Get Sites, Get Incidents)
    Axios->>Gateway: Gửi 3 requests kèm accessToken cookie
    Gateway->>IdentitySvc: Chuyển tiếp request
    IdentitySvc->>IdentitySvc: Xác minh RS256 -> TokenExpiredError (401 Unauthorized)
    IdentitySvc-->>Gateway: 401 Unauthorized {code: "TOKEN_EXPIRED"}
    Gateway-->>Axios: 401 Unauthorized

    %% Cơ chế Single-Flight Mutex
    Note over Axios: Kích hoạt Single-Flight Mutex: Chỉ 1 request được gọi refresh!
    Axios->>Axios: Khởi tạo refreshPromise = pending
    Axios->>Gateway: Request DUY NHẤT: POST /api/v1/auth/refresh
    Gateway->>IdentitySvc: Chuyển tiếp refresh request
    IdentitySvc->>DB: Tìm và XÓA Refresh Token cũ (Token Rotation)
    DB-->>IdentitySvc: Refresh Token hợp lệ
    IdentitySvc->>DB: Thêm Refresh Token mới vào database
    IdentitySvc->>IdentitySvc: Ký Access Token RS256 mới
    IdentitySvc-->>Gateway: 200 OK + Set-Cookie: accessToken mới
    Gateway-->>Axios: 200 OK {refreshed: true}
    Axios->>Axios: Giải phóng refreshPromise, phát tán kết quả cho 2 request đang chờ
    Note over Axios, Gateway: Tự động gửi lại (Replay) 3 request ban đầu với cookie mới
    Axios->>Gateway: Replay 3 requests với Access Token mới
    Gateway-->>FE: 200 OK (Dữ liệu trả về bình thường, User không bị gián đoạn!)
```

---

### 6.2. Sơ đồ 2: Luồng Xử lý Video Edge AI: Từ Camera RTSP đến Bắn Kafka Event

Mô tả chi tiết pipeline thị giác máy tính biên: Ingestion, YOLO11, ByteTrack, ghép cặp hình học, bộ xác nhận 3 giây, chống trùng 30 giây và cơ chế phát sự kiện 3 tầng.

```mermaid
sequenceDiagram
    autonumber
    participant Camera as 📹 IP Camera (RTSP Stream 1080p)
    participant Reader as 🎞️ VideoReader (OpenCV/FFmpeg)
    participant YOLO as 🧠 YOLO11 Detector (FP16/TensorRT)
    participant Tracker as 🎯 ByteTrack (MOT Engine)
    participant Assoc as 📐 Geometric Associator (VI-04)
    participant Confirm as ⏱️ Temporal Confirmation (VI-06)
    participant Dedup as 🛡️ Deduplicator & Canonical (VI-07)
    participant MinIO as 🪣 MinIO S3 Object Storage
    participant Dispatcher as 🚀 3-Tier Event Dispatcher
    participant Kafka as 📨 Apache Kafka (ppe.violation.detected)
    participant SQLite as 💾 SQLite Offline Buffer

    loop Mỗi chu kỳ khung hình (15 - 30 FPS)
        Camera->>Reader: Luồng H.264/RTSP packets
        Reader->>YOLO: Đẩy decoded raw frame (RGB 640x640)
        YOLO->>YOLO: Trích xuất Bounding Boxes: Person, Helmet, Safety Vest
        YOLO->>Tracker: Bounding boxes + Confidence scores
        Tracker->>Tracker: Cập nhật Kalman Filter & Hungarian Algorithm -> Gán Track IDs
        Tracker->>Assoc: Danh sách Detections có Track ID
        Assoc->>Assoc: Tính vùng đầu (Head 40%) & Vùng thân (Torso IoU)\nGhép 1-1 Helmet & Vest vào từng Person Track
        Assoc->>Confirm: Trạng thái từng người (COMPLIANT / VIOLATION_CANDIDATE)
        
        alt Trạng thái là VIOLATION_CANDIDATE (Thiếu Mũ hoặc Thiếu Áo)
            Confirm->>Confirm: Tích lũy thời gian: accumulator += (t - prev_t)
            alt Thời gian tích lũy accumulator >= 3.0 giây
                Confirm->>Dedup: Kích hoạt ConfirmedViolation(track_id, violation_type)
                Dedup->>Dedup: Kiểm tra track nhảy ID -> Nối về canonical_person_id
                Dedup->>Dedup: Kiểm tra Cooldown 30s cho (camera_id, canonical_id, type)
                alt Ngoài Cooldown (Chưa phát trong 30s)
                    Dedup->>Dedup: Cập nhật timestamp phát lần cuối = t
                    Note over Dedup, MinIO: TẠO BẰNG CHỨNG & BẮN SỰ KIỆN
                    Dedup->>MinIO: Vẽ Bounding Box đỏ vi phạm, upload snapshot.jpg
                    MinIO-->>Dedup: Trả về snapshotUrl công khai/ký số
                    Dedup->>Dispatcher: Gửi Contract Event (UUIDv7, Site, Camera, Evidence, Violations)
                    
                    %% 3-Tier HA Dispatcher
                    alt [TẦNG 1] Gửi qua Apache Kafka
                        Dispatcher->>Kafka: Publish topic "ppe.violation.detected"
                        Kafka-->>Dispatcher: ACK (RecordMetadata: Partition, Offset)
                        Note over Dispatcher: ✅ Gửi thành công qua Kafka Broker
                    else Kafka Timeout / Mất kết nối Broker
                        Note over Dispatcher: ⚠️ Kafka lỗi, kích hoạt TẦNG 2: HTTP Fallback
                        Dispatcher->>Gateway: POST /api/v1/incidents/events
                        Gateway-->>Dispatcher: 201 Created
                    else Cả Kafka và HTTP đều lỗi (Mất Internet toàn bộ)
                        Note over Dispatcher: ❌ Mất mạng! Kích hoạt TẦNG 3: SQLite Offline Buffer
                        Dispatcher->>SQLite: INSERT INTO offline_events (id, payload, created_at)
                        Note over SQLite: Lưu trữ an toàn, chờ tiến trình background flush khi có mạng
                    end
                else Đang trong Cooldown 30s
                    Dedup->>Dedup: Bỏ qua (Drop event), chống bão cảnh báo
                end
            end
        else Trạng thái là COMPLIANT (Thấy lại đồ bảo hộ)
            Confirm->>Confirm: Reset chuỗi vi phạm của người này về 0
        end
    end
```

---

### 6.3. Sơ đồ 3: Tiêu thụ Sự kiện Kafka, Tạo Sự cố & Bắn SSE / Email Thời gian thực

Mô tả luồng từ khi Kafka nhận sự kiện vi phạm, Incident Service lưu database, đến khi Notification Service phát tán qua Redis Pub/Sub và đẩy tới trình duyệt qua kết nối Server-Sent Events (SSE).

```mermaid
sequenceDiagram
    autonumber
    participant Kafka as 📨 Apache Kafka (ppe.violation.detected)
    participant IncidentSvc as 🚨 incident-service (:8893)
    participant DB_Inc as 🗄️ PostgreSQL (ppe_incident_db)
    participant NotifSvc as 🔔 notification-service (:8889)
    participant DB_Notif as 🗄️ PostgreSQL (ppe_notification_db)
    participant RedisPubSub as ⚡ Redis (Channel: sse:events:stream)
    participant MailWorker as 📧 Nodemailer / SMTP Service
    participant ClientFE as 🖥️ fe-ppe Trình duyệt HSE (SSE Listener)

    Kafka->>IncidentSvc: Consumer Group "ppe-incident-group" nhận event vi phạm
    Kafka->>NotifSvc: Consumer Group "ppe-notification-group" nhận event vi phạm

    %% Incident Service xử lý
    rect rgb(240, 248, 255)
        Note over IncidentSvc, DB_Inc: XỬ LÝ LƯU HỒ SƠ SỰ CỐ TẬP TRUNG
        IncidentSvc->>IncidentSvc: Validate payload bằng Zod (ppeViolationDetectedPayloadSchema)
        IncidentSvc->>DB_Inc: Khởi tạo Incident (status: "PENDING_REVIEW", severity: "HIGH")
        IncidentSvc->>DB_Inc: Lưu Evidence metadata (snapshotUrl, checksum, aiDetections JSON)
        DB_Inc-->>IncidentSvc: Lưu thành công Incident ID: "018f3a92-..."
    end

    %% Notification Service xử lý
    rect rgb(255, 245, 238)
        Note over NotifSvc, RedisPubSub: XỬ LÝ PHÂN PHỐI THÔNG BÁO ĐA KÊNH
        NotifSvc->>DB_Notif: Lấy cấu hình nhận tin & danh sách Cán bộ An toàn tại Site
        DB_Notif-->>NotifSvc: Danh sách users (HSE Officers phụ trách Site)
        NotifSvc->>DB_Notif: Tạo bản ghi Notification (channel: "SSE", severity: "HIGH")
        
        %% Redis Pub/Sub Broadcast
        NotifSvc->>RedisPubSub: PUBLISH sse:events:stream {target: "broadcast", event: "INCIDENT_ALERT", data}
        RedisPubSub->>NotifSvc: Mọi Instance Notification Service nhận tin nhắn từ Redis
        NotifSvc->>ClientFE: Đẩy luồng SSE chunk qua HTTP: data: {"type": "INCIDENT_ALERT", ...}\n\n
        
        %% Email nếu nghiêm trọng
        opt Sự cố có mức độ nghiêm trọng CRITICAL hoặc HIGH
            NotifSvc->>MailWorker: Đẩy tác vụ gửi email cảnh báo khẩn cấp
            MailWorker-->>Cán bộ HSE: Gửi email cảnh báo kèm hình ảnh bằng chứng vi phạm
        end
    end

    %% Client Frontend phản ứng
    rect rgb(245, 255, 245)
        Note over ClientFE: PHẢN ỨNG TỨC THÌ TRÊN GIAO DIỆN CLIENT
        ClientFE->>ClientFE: Bật âm thanh cảnh báo (Audio Alarm Bip)
        ClientFE->>ClientFE: Hiển thị Banner Toast đỏ góc màn hình
        ClientFE->>ClientFE: Nhấp nháy viền đỏ camera trên Video Wall
        ClientFE->>ClientFE: Tự động cập nhật số đếm chuông thông báo (+1)
        ClientFE->>ClientFE: Cập nhật dòng mới trên bảng Sự cố (không cần F5!)
    end
```

---

### 6.4. Sơ đồ 4: Giám sát viên Duyệt Sự cố & Vòng lặp Học Tăng cường (Human-in-the-Loop Feedback)

Mô tả quy trình xử lý sự cố bởi cán bộ an toàn (HSE) và cơ chế thu thập dữ liệu báo sai (False Positive) để phục vụ huấn luyện lại mô hình AI (Active Learning Loop).

```mermaid
sequenceDiagram
    autonumber
    actor HSE as 👤 Cán bộ Giám sát An toàn (HSE)
    participant FE as 🖥️ fe-ppe UI (Incident Review Modal)
    participant Gateway as 🌐 Traefik v3 API Gateway
    participant IncidentSvc as 🚨 incident-service (:8893)
    participant Kafka as 📨 Apache Kafka (ppe.incident.resolved)
    participant ReportSvc as 📊 reporting-service (:8894)
    participant AIMetrics as 📈 Phân hệ AI Metrics & Retraining Loop

    HSE->>FE: Bấm vào sự cố "018f3a92-..." trên danh sách
    FE->>Gateway: GET /api/v1/incidents/018f3a92-...
    Gateway->>IncidentSvc: Chuyển tiếp request
    IncidentSvc-->>FE: Trả về chi tiết: Ảnh Snapshot, Bounding Boxes, Video Clip, Timeline
    FE-->>HSE: Hiển thị Modal phóng to bằng chứng kèm tọa độ vi phạm

    alt Trường hợp 1: Vi phạm ĐÚNG THỰC TẾ (True Positive)
        HSE->>FE: Chọn "Xác nhận vi phạm" -> Nhập biện pháp: "Nhắc nhở & cấp bổ sung mũ"
        FE->>Gateway: POST /api/v1/incidents/018f3a92-.../resolve\n{resolutionAction: "EQUIPMENT_PROVIDED", notes: "Đã cấp mũ mới"}
        Gateway->>IncidentSvc: Chuyển tiếp lệnh Resolve
        IncidentSvc->>IncidentSvc: Cập nhật trạng thái = "RESOLVED", lưu resolvedAt
        IncidentSvc->>Kafka: Phát sự kiện topic "ppe.incident.resolved"
        Kafka->>ReportSvc: Consumer cập nhật tăng chỉ số resolvedCount trong thống kê
        IncidentSvc-->>FE: 200 OK {status: "RESOLVED"}
        FE-->>HSE: Đổi nhãn xanh lá: "Đã xử lý xong"

    else Trường hợp 2: AI BÁO SAI / NHẬN DIỆN NHẦM (False Positive)
        Note over HSE, AIMetrics: VÒNG LẶP HỌC TĂNG CƯỜNG (ACTIVE LEARNING FEEDBACK)
        HSE->>FE: Chọn "Bác bỏ sự cố" -> Chọn lý do: "Bóng râm làm mất nhận diện mũ"
        FE->>Gateway: POST /api/v1/incidents/018f3a92-.../resolve\n{resolutionAction: "FALSE_POSITIVE", notes: "Bóng râm che khuất"}
        Gateway->>IncidentSvc: Chuyển tiếp lệnh Bác bỏ
        IncidentSvc->>IncidentSvc: Cập nhật trạng thái = "FALSE_POSITIVE"
        IncidentSvc->>AIMetrics: Gửi mẫu ảnh báo sai kèm Annotation vào Dataset Retrain
        AIMetrics->>AIMetrics: Đánh dấu nhãn cứng (Hard Negative Example)
        AIMetrics->>AIMetrics: Cập nhật tăng ô Báo sai trên Ma trận Nhầm lẫn (Confusion Matrix)
        IncidentSvc-->>FE: 200 OK {status: "FALSE_POSITIVE"}
        FE-->>HSE: Ẩn cảnh báo, ghi nhận phản hồi vào hệ thống MLOps
    end
```

---

### 6.5. Sơ đồ 5: Watchdog Kiểm tra Sức khỏe Camera & Phát hiện Mất tín hiệu

Mô tả cơ chế giám sát sức khỏe luồng video 24/7 của Camera Service, tự động ghi nhận nhật ký trễ hình và cảnh báo sự cố gián đoạn luồng stream.

```mermaid
sequenceDiagram
    autonumber
    participant Watchdog as ⏱️ Camera Watchdog Daemon (:8892)
    participant IPCam as 📹 IP Camera / RTSP Endpoint
    participant DB_Cam as 🗄️ PostgreSQL (ppe_camera_db)
    participant Kafka as 📨 Apache Kafka (ppe.camera.status_changed)
    participant NotifSvc as 🔔 notification-service (:8889)
    participant ClientFE as 🖥️ fe-ppe (Header Realtime Dot)

    loop Định kỳ mỗi 30 giây
        Watchdog->>DB_Cam: Lấy danh sách tất cả camera có cấu hình ACTIVE
        DB_Cam-->>Watchdog: Danh sách Camera (RTSP URLs, currentStatus)
        
        loop Cho từng Camera
            Watchdog->>IPCam: Gửi gói tin Ping RTSP DESCRIBE / TCP Handshake
            alt Camera phản hồi tốt trong < 500ms
                IPCam-->>Watchdog: 200 OK (Latency: 45ms)
                Watchdog->>DB_Cam: Ghi log health (status: "ONLINE", latencyMs: 45)
            else Camera mất kết nối hoặc Timeout > 5000ms
                IPCam--xWatchdog: Connection Refused / Timeout
                Watchdog->>DB_Cam: Ghi log health (status: "OFFLINE", errorMessage: "RTSP connection timed out")
                
                alt Trạng thái trước đó là ONLINE
                    Watchdog->>DB_Cam: CẬP NHẬT bảng cameras: status = "OFFLINE"
                    Watchdog->>Kafka: Phát sự kiện topic "ppe.camera.status_changed"\n{cameraId, previousStatus: "ONLINE", currentStatus: "OFFLINE", reason: "Timeout"}
                    Kafka->>NotifSvc: Nhận sự kiện camera mất tín hiệu
                    NotifSvc->>ClientFE: Đẩy sự kiện qua SSE stream
                    ClientFE->>ClientFE: Hiện Toast cảnh báo vàng: "Mất kết nối Camera Cổng 01!"
                    ClientFE->>ClientFE: Đổi icon camera trên Video Wall sang màu xám/gạch chéo
                end
            end
        end
    end
```

---

### 6.6. Sơ đồ 6: Tổng hợp Chỉ số An toàn & Kết xuất Báo cáo PDF/Excel Tự động

Mô tả cơ chế tổng hợp dữ liệu thống kê tự động (Rollup) và quy trình kết xuất báo cáo kiểm toán định kỳ.

```mermaid
sequenceDiagram
    autonumber
    actor HSEManager as 👤 Trưởng ban An toàn (HSE Manager)
    participant FE as 🖥️ fe-ppe UI (Reports Tab)
    participant Gateway as 🌐 Traefik v3 API Gateway
    participant ReportSvc as 📊 reporting-service (:8894)
    participant DB_Rep as 🗄️ PostgreSQL (ppe_reporting_db)
    participant MinIO as 🪣 MinIO S3 (ppe-reports bucket)

    %% Khởi tạo yêu cầu xuất báo cáo
    HSEManager->>FE: Chọn Site "SITE-HN-01", Khoảng thời gian: "01/10 - 28/10", Loại: "PDF"
    FE->>Gateway: POST /api/v1/reports/generate\n{siteId, periodStart, periodEnd, reportType: "WEEKLY_COMPLIANCE", fileType: "PDF"}
    Gateway->>ReportSvc: Chuyển tiếp request
    ReportSvc->>DB_Rep: Tạo bản ghi ReportGeneration (status: "PROCESSING")
    ReportSvc-->>Gateway: 202 Accepted {generationId: "rep-018f...", status: "PROCESSING"}
    Gateway-->>FE: 202 Accepted (FE hiển thị thanh loading xoay)

    %% Tiến trình xử lý ngầm (Worker)
    Note over ReportSvc, DB_Rep: TIẾN TRÌNH XỬ LÝ DỮ LIỆU BÁO CÁO NGẦM
    ReportSvc->>DB_Rep: Truy vấn bảng report_statistics theo siteId và khoảng ngày
    DB_Rep-->>ReportSvc: Trả về số lượng: TotalPersons, TotalViolations, Confirmed, FalsePositives
    ReportSvc->>ReportSvc: Tính tỷ lệ tuân thủ Compliance Rate: CR = (1 - Viols / Persons) * 100%
    ReportSvc->>ReportSvc: Nạp mẫu báo cáo ReportTemplate (Đầu trang, Logo, Bảng biểu)
    ReportSvc->>ReportSvc: Biên soạn biểu đồ vector và kết xuất tài liệu PDF (PDFKit Engine)
    
    %% Lưu trữ file kết quả
    ReportSvc->>MinIO: Upload file "Bao_Cao_An_Toan_Tuan_42.pdf" vào bucket ppe-reports
    MinIO-->>ReportSvc: Trả về storageKey: "reports/2026/10/Bao_Cao_An_Toan_Tuan_42.pdf"
    ReportSvc->>DB_Rep: Cập nhật ReportGeneration: status = "COMPLETED", filePath = storageKey

    %% Người dùng tải file
    FE->>Gateway: GET /api/v1/reports/generations/rep-018f...
    Gateway->>ReportSvc: Chuyển tiếp kiểm tra trạng thái
    ReportSvc-->>FE: 200 OK {status: "COMPLETED", downloadUrl: "/api/v1/reports/rep-018f.../download"}
    FE-->>HSEManager: Kích hoạt nút "Tải về báo cáo PDF"
    HSEManager->>FE: Bấm tải về
    FE->>Gateway: GET /api/v1/reports/rep-018f.../download
    Gateway->>ReportSvc: Chuyển tiếp yêu cầu tải
    ReportSvc->>MinIO: Lấy presigned stream của file PDF
    MinIO-->>ReportSvc: File Binary Stream
    ReportSvc-->>FE: Trả về Content-Type: application/pdf (Trình duyệt tải file về máy)
```

---

## CHƯƠNG 7: THIẾT KẾ CƠ SỞ DỮ LIỆU & ÁNH XẠ THỰC THỂ TOÀN CỤC (GLOBAL ERD)

### 7.1. Chiến lược Database-per-Service & Khóa chính UUIDv7
Hệ thống tuân thủ nghiêm ngặt nguyên tắc cách ly dữ liệu: Không microservice nào được quyền truy cập trực tiếp vào cơ sở dữ liệu của microservice khác. Mọi trao đổi dữ liệu phải thông qua REST API hoặc Kafka Events.

Tất cả các bảng đều sử dụng kiểu dữ liệu **UUIDv7** làm khóa chính (`id String @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid`).
* **Ưu thế vượt trội của UUIDv7 so với UUIDv4:** UUIDv7 nhúng timestamp thời gian thực ở 48 bit đầu tiên, giúp dữ liệu có tính chất sắp xếp tăng dần theo thời gian (time-sortable). Điều này triệt tiêu hoàn toàn vấn đề phân mảnh chỉ mục B-Tree (Index Fragmentation) trong PostgreSQL, giúp tốc độ chèn dữ liệu (`INSERT`) nhanh gấp 4-6 lần so với UUIDv4 ngẫu nhiên truyền thống.

---

### 7.2. Sơ đồ Quan hệ Thực thể Toàn cục (Global Entity Relationship Diagram)

```mermaid
erDiagram
    %% Identity Database
    User ||--o{ RefreshToken : "has"
    User }o--|| Role : "assigned"
    Role ||--o{ RolePermission : "contains"
    Permission ||--o{ RolePermission : "grouped_in"
    User ||--o{ AuditLog : "acts"

    %% Site Database
    Site ||--o{ Zone : "contains"
    Site ||--o{ RestrictedArea : "defines"
    Site ||--|| SiteSafetyConfig : "configured_with"

    %% Camera Database
    Camera ||--o{ CameraStream : "broadcasts"
    Camera ||--|| CameraConfig : "tuned_by"
    Camera ||--o{ CameraHealthLog : "monitored_by"

    %% Incident Database
    Incident ||--o{ Evidence : "proves"
    Evidence ||--|| EvidenceMetadata : "analyzed_in"
    Incident ||--o{ IncidentAssignment : "delegated_to"
    Incident ||--o{ IncidentStatusHistory : "tracks"
    Incident ||--o{ IncidentComment : "discussed_in"

    %% Notification Database
    Notification ||--o{ NotificationLog : "logs"
    NotificationTemplate ||--o{ Notification : "formats"
    User ||--o{ NotificationPreference : "prefers"

    %% Reporting Database
    ReportTemplate ||--o{ ReportGeneration : "instantiates"
    Site ||--o{ ReportStatistic : "aggregates"

    %% Logical Cross-Service Foreign Keys
    Site ||..o{ Camera : "locates (site_id)"
    Zone ||..o{ Camera : "partitions (zone_id)"
    Camera ||..o{ Incident : "detects (camera_id)"
    Site ||..o{ Incident : "happens_at (site_id)"
    User ||..o{ IncidentAssignment : "assigned_officer (assigned_to)"

    %% Schema Attributes Details
    User {
        uuid id PK
        string email UK
        string password
        string full_name
        boolean is_active
        boolean two_factor_enabled
        uuid role_id FK
    }

    Site {
        uuid id PK
        string code UK
        string name
        string status
        json contact_officers
    }

    Camera {
        uuid id PK
        uuid site_id
        uuid zone_id
        string code UK
        string stream_url
        string status
    }

    Incident {
        uuid id PK
        uuid site_id
        uuid camera_id
        string violation_type
        string severity
        string status
        timestamp detected_at
        timestamp resolved_at
    }

    Evidence {
        uuid id PK
        uuid incident_id FK
        string storage_key
        string file_name
        string mime_type
        bigint file_size
        timestamp captured_at
    }
```

---

### 7.3. Định dạng Hợp đồng Sự kiện Chuẩn hóa (Contract Event Schemas)

Được định nghĩa tại [smart-ppe-shared-contracts/src/validations/kafka-event.schema.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-shared-contracts/src/validations/kafka-event.schema.ts).

Ví dụ cấu trúc JSON của sự kiện cốt lõi `ppe.violation.detected`:
```json
{
  "eventId": "0192d6e4-44b2-7bb1-8c4d-a912e5192801",
  "topic": "ppe.violation.detected",
  "traceId": "req-89a1-43fd-9912",
  "timestamp": 1793234900000,
  "producer": "ai-inference-engine-edge-01",
  "payload": {
    "violationId": "0192d6e4-448f-7bb1-8c4d-b827e4918231",
    "timestamp": "2026-10-29T02:30:00.000Z",
    "site": {
      "id": "018f3a12-88bb-7123-bcde-000000000001",
      "code": "SITE-HN-01",
      "name": "Công trường Landmark Hà Nội"
    },
    "camera": {
      "id": "018f3a12-88bb-7123-bcde-000000000005",
      "code": "CAM-GATE-01",
      "name": "Camera Cổng kiểm soát số 1",
      "zone": "Khu vực cổng phụ thi công"
    },
    "evidence": {
      "snapshotUrl": "http://localhost:9000/ppe-evidences/2026/10/29/violation-0192d6e4.jpg",
      "frameResolution": { "width": 1920, "height": 1080 }
    },
    "detections": [
      {
        "class": "PERSON",
        "confidence": 0.94,
        "box": { "x": 0.42, "y": 0.25, "width": 0.18, "height": 0.65 },
        "trackId": 14
      }
    ],
    "violations": [
      {
        "violationType": "NO_HELMET",
        "severity": "HIGH",
        "description": "Không đội mũ bảo hộ lao động",
        "confidence": 0.94,
        "box": { "x": 0.45, "y": 0.25, "width": 0.12, "height": 0.15 }
      }
    ],
    "summary": {
      "totalPersons": 1,
      "totalViolations": 1,
      "highestSeverity": "HIGH"
    }
  }
}
```

---

## CHƯƠNG 8: BẢO MẬT, ĐỘ TIN CẬY VÀ KHẢ NĂNG MỞ RỘNG (SECURITY, RELIABILITY & SCALABILITY)

### 8.1. Mô hình Bảo mật Zero Trust & Xác thực Phi tập trung JWKS
1. **Bảo vệ biên Giới hạn kép:** Toàn bộ lưu lượng truy cập từ ngoài Internet đều phải đi qua Traefik API Gateway. Mạng nội bộ `ppe_infra_net` là mạng đóng (private bridge), các cổng database (PostgreSQL 5432, Kafka 29092) không được phép công khai ra ngoài môi trường Production.
2. **Ký số Bất đối xứng (RS256):** Khóa riêng tư RSA chỉ nằm trong vùng nhớ của Identity Service. Bất kỳ dịch vụ nào bị tấn công xâm nhập cũng không thể làm lộ khóa ký để sinh token giả mạo.

---

### 8.2. Đảm bảo Tính toàn vẹn Dữ liệu với Outbox Pattern và Idempotency Key
Trong môi trường vi dịch vụ phân tán, thao tác ghi vào Database và thao tác phát tin vào Kafka không thể thực hiện chung trong một ACID Transaction truyền thống. Nếu hệ thống lưu xong Incident nhưng mạng sập trước khi gửi Kafka, cảnh báo sẽ bị mất vĩnh viễn.
* **Mô hình Hộp thư gửi đi (Transactional Outbox Pattern):** Các service duy trì một bảng `outbox_events` trong cùng database cục bộ. Sự kiện được chèn vào bảng này trong cùng transaction nghiệp vụ (`status = 'PENDING'`). Một worker nền định kỳ quét các sự kiện pending, đẩy vào Kafka thành công rồi mới đánh dấu `PUBLISHED`.
* **Khóa Chống Trùng lặp (Idempotency Key):** Mỗi message Kafka đều mang một `eventId` dạng UUIDv7 duy nhất. Phía Consumer (Incident, Notification Service) lưu giữ bảng khóa đã xử lý, đảm bảo nếu Kafka gửi lại message lần 2 (At-least-once delivery), nghiệp vụ vẫn chỉ được thực thi đúng 1 lần (Exactly-once semantic).

---

### 8.3. Khả năng Chịu lỗi & Phục hồi sau Sự cố (Fault Tolerance & Resilience)
* **Dead Letter Queue (DLQ):** Khi một thông điệp Kafka bị lỗi giải mã (Poison Pill) hoặc dịch vụ đích gặp lỗi logic không thể xử lý sau 5 lần thử lại (retries with exponential backoff), thông điệp tự động được chuyển sang topic `ppe.dead-letter-queue` để các kỹ sư phân tích mà không làm tắc nghẽn luồng xử lý chính.
* **Cơ chế Khôi phục Ngoại tuyến (Offline Synchronization):** Edge AI Service tích hợp SQLite local buffer lưu trữ tạm thời các sự kiện khi mất kết nối mạng và tự động đồng bộ bù ngay khi có tín hiệu mạng trở lại.

---

### 8.4. Chiến lược Mở rộng Ngang (Horizontal Pod Autoscaling) & Phân vùng Kafka
* **Phân vùng Kafka (Topic Partitioning):** Topic `ppe.violation.detected` được cấu hình phân mảnh theo `siteId` (`message.key = site.id`). Việc này đảm bảo tính tuần tự của sự kiện trong cùng một công trường, đồng thời cho phép mở rộng song song số lượng consumer instance theo số lượng partition.
* **Redis PubSub cho SSE Clustering:** Tách rời trạng thái kết nối SSE client ra khỏi bộ nhớ của từng container Node.js, cho phép Notification Service tự do scale từ 1 lên 10 instances mà client vẫn nhận đầy đủ thông báo theo thời gian thực.

---

## KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### Kết luận
Bản thiết kế kiến trúc hệ thống **Smart PPE Monitoring** đã giải quyết trọn vẹn và khoa học bài toán giám sát an toàn lao động tự động trên công trường:
1. **Về mặt Khoa học:** Ứng dụng thành công mô hình học sâu hiện đại YOLO11s kết hợp thuật toán theo dõi đa đối tượng ByteTrack và các heuristic hình học, bộ lọc xác nhận trượt thời gian 3 giây, đạt mAP@50 ấn tượng trên 93% và giảm thiểu tỷ lệ báo động giả xuống dưới 2.8%.
2. **Về mặt Kỹ thuật Phần mềm:** Xây dựng một hệ sinh thái phân tán hoàn chỉnh gồm 7 microservices độc lập, tuân thủ nghiêm ngặt các nguyên tắc Database-per-Service, Event-Driven Architecture qua Apache Kafka KRaft, bảo mật phi tập trung RS256 JWKS, và giao diện điều khiển Neumorphism hiện đại trên Next.js 15.

### Hướng phát triển tương lai
1. **Tích hợp Nhận diện Khuôn mặt (Face Recognition):** Tự động liên kết vi phạm an toàn với hồ sơ nhân sự cụ thể của nhà thầu.
2. **Phát hiện Hành vi Nguy hiểm Bổ sung:** Mở rộng mô hình phát hiện công nhân hút thuốc lá gần kho xăng dầu, ngã từ trên cao (Fall Detection), hoặc đi vào vùng mù của máy xúc/xe tải tự đổ.
3. **Triển khai Mô hình Tối ưu hóa Biên (Edge Acceleration):** Đóng gói mô hình YOLO11 dưới dạng TensorRT / OpenVINO / ONNX Runtime để chạy trực tiếp trên các vi mạch máy tính nhúng giá rẻ như NVIDIA Jetson Orin Nano.

---
*Tài liệu được biên soạn phục vụ bảo vệ Đồ án Tốt nghiệp Kỹ sư Công nghệ Thông tin.*  
*Tác giả: Huỳnh Thanh Trà — 2026.*
