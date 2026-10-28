# KIẾN TRÚC TÍCH HỢP TOÀN DIỆN: SITE - CAMERA - AI ENGINE - INCIDENTS
**Hệ Thống Giám Sát An Toàn Lao Động Thông Minh (Smart PPE Monitoring System)**

---

## 1. TỔNG QUAN & NGUYÊN LÝ HOẠT ĐỘNG KHÉP KÍN (CLOSED-LOOP ARCHITECTURE)

Hệ thống **Smart PPE Monitoring** là một thể thống nhất khép kín, trong đó **SITE, CAMERA, AI MODEL và INCIDENTS** không thể hoạt động rời rạc mà phải liên kết chặt chẽ theo mô hình chuỗi cung ứng sự kiện thời gian thực (Event-Driven Pipeline):

```mermaid
flowchart TD
    Site["🏢 SITE (Công trường / Nhà máy)"] -->|Chứa các khu vực| Zone["📍 ZONES / RESTRICTED AREAS"]
    Zone -->|Lắp đặt| Camera["📹 CAMERAS (RTSP / WebRTC Stream)"]
    Camera -->|Truyền Frame 15-30 FPS| AIEngine["⚡ AI INFERENCE ENGINE (YOLOv8 / TensorRT)"]
    
    subgraph AI_PIPELINE ["Luồng Xử Lý Trí Tuệ Nhân Tạo & Giám Sát"]
        AIEngine -->|Phát hiện vi phạm: Không mũ, không áo, vượt ranh| RuleCheck{"Kiểm Tra Luật An Toàn\n(Confidence > Threshold &\nKéo dài > Cooldown)"}
        AIEngine -->|Bắn Telemetry FPS, Latency, Loss| AIMetrics["📊 AI MODEL PERFORMANCE\n(mAP, Precision, Recall, Confusion Matrix)"]
    end

    RuleCheck -->|Vi phạm hợp lệ| EventBroker["📡 REAL-TIME EVENT BROKER (WebSocket / Redis PubSub)"]
    RuleCheck -->|Không vi phạm / Tạp âm| DropFrame["Bỏ qua frame"]

    subgraph ACTIONS ["Phân Phối & Xử Lý Sự Kiện Tức Thì"]
        EventBroker -->|Tạo sự cố mới + Bằng chứng Snapshot/Clip| IncidentsPage["🚨 TRANG INCIDENTS (Quản Lý Sự Cố)"]
        EventBroker -->|Phát chuông báo + Toast Banner| Notifications["🔔 HỆ THỐNG CẢNH BÁO (HSE / Ban An Toàn)"]
        EventBroker -->|Bật viền đỏ camera + Radar cảnh báo| SiteDetail["🎯 SITE COMMAND CENTER (Mặt Bằng & Live Cam)"]
    end

    IncidentsPage -->|HSE xác nhận: Báo Đúng (Confirmed)| RetrainCorrect["Thu thập True Positive"]
    IncidentsPage -->|HSE bác bỏ: Báo Sai (False Positive)| FeedbackLoop["🔄 ACTIVE LEARNING FEEDBACK LOOP\n(Gửi dữ liệu báo sai về AI Metrics)"]
    FeedbackLoop -->|Cập nhật ma trận nhầm lẫn & Retrain Model| AIEngine
```

---

## 2. QUAN HỆ THỰC THỂ DỮ LIỆU (ENTITY RELATIONSHIP & DATA BINDING)

Mỗi thực thể trong cơ sở dữ liệu và contract API phải có khóa ngoại (Foreign Keys) liên kết chặt chẽ:

```
[SITE] 1 ─────── N [ZONE / RESTRICTED_AREA]
  │
  └───────────── N [CAMERA]
                     │
                     ├─────── 1 [CAMERA_CONFIG] (ROI, Danger Polygon, Motion Sens)
                     ├─────── N [AI_PERFORMANCE_STAT] (FPS, Latency, Frames per Camera)
                     └─────── N [INCIDENT]
                                   │
                                   ├─────── N [EVIDENCE] (Snapshot Bounding Box, Video Clip)
                                   ├─────── N [ASSIGNMENT] (Phân công cán bộ an toàn)
                                   └─────── N [STATUS_HISTORY & COMMENTS]
```

### Chi tiết các trường dữ liệu kết nối:
1. **Site (`SiteItem`)**:
   - `id`, `code`, `name`, `safetyConfigs` (ngưỡng phát hiện mũ, áo, vùng cấm, thời gian xác nhận trước khi kích hoạt incident).
2. **Camera (`CameraItem`)**:
   - `id`, `siteId` *(Bắt buộc)*, `siteName`.
   - `zoneId` *(Thuộc khu vực nào trong công trường)*, `zoneName`.
   - `streamUrl` (RTSP, HLS, WebRTC).
   - `config`: `roiPolygon` (Vùng làm việc cần soi), `dangerZoneCoordinates` (Vùng cấm nguy hiểm).
3. **Incident (`IncidentItem`)**:
   - `id`: Mã sự cố duy nhất.
   - `siteId`, `siteName`: Sự cố xảy ra tại công trường nào.
   - `zoneId`, `zoneName`: Khu vực cụ thể xảy ra sự cố.
   - `cameraId`, `cameraName`, `cameraCode`: Camera phát hiện sự cố.
   - `violationType`: `NO_HELMET`, `NO_VEST`, `RESTRICTED_AREA`, `MULTI_VIOLATION`.
   - `severity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
   - `status`: `PENDING_REVIEW` (Chờ duyệt) $\rightarrow$ `CONFIRMED` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED` (hoặc `DISMISSED` nếu báo sai).
   - `evidences`: Chứa hình ảnh snapshot có Bounding Box (`[x, y, w, h]`, nhãn vi phạm, điểm tin cậy) và đoạn video ngắn (5-10s) ghi lại hành vi vi phạm.

---

## 3. VAI TRÒ CHÍNH XÁC CỦA "AI MODEL PERFORMANCE" TRONG HỆ THỐNG

### Người dùng thường thắc mắc:
> *"AI Model Performance nên tích hợp vô hệ thống camera realtime rồi tự động báo qua incident luôn nhỉ?"*

### Làm rõ kiến trúc chuẩn công nghiệp:
Cần phân biệt rõ giữa **AI Inference Engine (Bộ não chạy ngầm)** và **AI Model Performance (Giao diện đo đạc & điều phối)**:

1. **AI Inference Engine (Engine xử lý thời gian thực)**:
   - Chạy 24/7 trên Edge Box hoặc Cloud GPU server.
   - Đọc trực tiếp luồng RTSP từ Camera.
   - Áp dụng cấu hình từ Site (ví dụ: `confidenceThreshold: 0.8`, `confirmationDuration: 3s`).
   - **Tự động sinh ra Incident**: Khi phát hiện công nhân không đội mũ liên tục trong 3 giây với độ tin cậy > 80%, hệ thống tự động lưu snapshot, lưu clip và gọi API Incident Service để tạo ra một Incident mới ngay lập tức.
   - Đồng thời, mỗi giây engine đều tính toán: FPS hiện tại của camera, thời gian suy luận (latency ms), tỉ lệ rớt frame $\rightarrow$ đẩy về Database lưu trữ.

2. **AI Model Performance Page (`/ai-metrics`)**:
   - **Giám sát sức khỏe mô hình (Model Health & Telemetry)**: Hiển thị biểu đồ độ trễ và FPS trung bình của toàn bộ các camera trong hệ thống. Nếu camera bị tụt FPS từ 25fps xuống 5fps, kỹ sư sẽ nhìn thấy ngay tại đây để giảm tải hoặc chỉnh độ phân giải.
   - **Đánh giá độ chính xác (Precision, Recall, mAP)**: Hiển thị mô hình nhận diện mũ bảo hộ đạt 96.2%, áo phản quang đạt 94.8%, vùng cấm đạt 98.1%.
   - **Ma trận nhầm lẫn (Confusion Matrix Heatmap)**: Giúp chuyên gia biết mô hình có hay bị nhầm lẫn giữa "mũ cối/mũ lưỡi trai" với "mũ bảo hộ chuẩn" hay không.
   - **Vòng lặp phản hồi người dùng (Human-in-the-Loop Feedback)**:
     - Khi cán bộ an toàn (HSE) ở trang Incident bấm: **"Bác bỏ vi phạm (Dismissed) - Báo sai (False Positive)"**, dữ liệu này được gửi trực tiếp về module AI Metrics!
     - AI Metrics sẽ gom các trường hợp bị nhận diện sai này vào tập dữ liệu kiểm thử (Evaluation Dataset) để đội ngũ AI tiếp tục gắn nhãn và huấn luyện lại (Retrain) phiên bản mô hình mới tốt hơn.
   - **Phát hành & Triển khai mô hình (Model Governance & Deployment)**: Khi có bản model v2.1 (YOLOv11), kỹ sư bấm nút Deploy trên trang AI Metrics $\rightarrow$ Hệ thống tự động cập nhật xuống các luồng camera đang chạy mà không cần khởi động lại server.

---

## 4. BẢNG SO SÁNH & ĐÁNH GIÁ HIỆN TRẠNG GIAO DIỆN (GAP ANALYSIS)

Đúng như nhận định của bạn: **Các giao diện hiện tại của hệ thống đã có khung xương (Skeleton) rất tốt nhưng vẫn CHƯA ĐẦY ĐỦ VÀ HOÀN THIỆN về mặt liên kết dữ liệu nghiệp vụ thực tế.**

Dưới đây là bảng phân tích chi tiết:

| Trang / Module | Hiện trạng đã có (Done) | Điểm thiếu sót & Chưa hoàn thiện (Gaps) | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- |
| **🏢 Trang Site (`/sites` & `/sites/[id]`)** | - Danh sách Site, tạo/sửa Site.<br>- Command Center chi tiết có các tab: Live Cameras, Incidents, Zones, Personnel, Safety Rules. | - **Chưa có Real-time Alert Banner**: Khi có sự cố mới phát sinh tại Site, giao diện chưa nhấp nháy đèn đỏ hoặc popup báo động tức thì.<br>- **Chưa click nhanh từ Incident sang Camera**: Trong tab Incidents của Site, bấm vào sự cố chưa mở ngay vị trí camera đó.<br>- **Chưa bind Safety Config vào AI**: Cấu hình ngưỡng tin cậy (Confidence threshold) ở tab Safety Rules chưa áp dụng trực tiếp xuống camera của Site đó. | 🔴 Cao (P1) |
| **📹 Trang Camera (`/cameras`)** | - Grid / Table / Video Wall (1x1, 2x2, 3x3).<br>- Modal thêm, sửa, ping kết nối, ROI Drawer.<br>- Panel thống kê KPI chi tiết rất đẹp. | - **Player chưa có Bounding Box AI động**: Video player hiện tại chủ yếu chiếu demo hoặc stream, chưa vẽ hộp xanh/đỏ (Người [98%], Không mũ [Alert]) đè lên video thời gian thực.<br>- **Thiếu nút xem sự cố gần nhất**: Trên mỗi Camera Card chưa có nút *"Xem N sự cố gần đây của camera này"*.<br>- **Chưa đồng bộ Telemetry**: FPS/Latency trên camera chưa link trực tiếp với trang AI Metrics. | 🔴 Cao (P1) |
| **🚨 Trang Incidents (`/incidents` & `[id]`)** | - Danh sách sự cố đầy đủ bộ lọc (Severity, Status, Violation).<br>- Phân công cán bộ (Assign), Duyệt (Review), Giải quyết (Resolve), Đóng (Close).<br>- Chi tiết sự cố có Evidence Viewer, Checksum, Timeline. | - **Thiếu liên kết điều hướng chéo**: Khi xem một Incident, không có nút bấm: *"Xem trực tiếp camera này tại Site"* hoặc *"Mở bản đồ Site tại vị trí vi phạm"*.<br>- **Bác bỏ vi phạm chưa thu thập lý do AI**: Khi bấm "Dismiss", chỉ ghi chú chung chung, chưa phân loại lỗi AI (nhận nhầm mũ, bóng râm, khuất tầm nhìn) để nạp vào AI Metrics.<br>- **Chưa có âm thanh cảnh báo (Audio Alarm)** khi xuất hiện sự cố độ nghiêm trọng `CRITICAL`. | 🟡 Trung bình (P2) |
| **📊 Trang AI Metrics (`/ai-metrics`)** | - Thống kê Precision, Recall, mAP, FPS, Latency.<br>- Biểu đồ Latency theo thời gian, Ma trận nhầm lẫn.<br>- Bảng phiên bản mô hình (Model Governance) & Deploy modal. | - **Chưa lọc theo Site hoặc theo Camera**: Hiện chỉ xem gộp toàn hệ thống, chưa cho phép người dùng chọn xem hiệu năng AI riêng của từng camera.<br>- **Chưa có tab "Mẫu báo sai (False Positives Review)"**: Chưa liệt kê các hình ảnh bị HSE bác bỏ từ trang Incident để kỹ sư AI tải về retrain. | 🟡 Trung bình (P2) |
| **🔔 Trang Notifications (`/notifications`)** | - Đã thiết kế giao diện danh sách thông báo, tab lọc, trạng thái đọc/chưa đọc. | - **Chưa kích hoạt Web Notification & Sound Alert**: Chưa tự động nhảy thông báo góc màn hình khi phát hiện vi phạm mới mà không cần F5 trình duyệt. | 🔴 Cao (P1) |

---

## 5. LỘ TRÌNH TRIỂN KHAI HOÀN THIỆN HỆ THỐNG (IMPLEMENTATION ROADMAP)

Để đưa hệ thống lên mức độ hoàn thiện cao nhất, chuẩn đồ án tốt nghiệp xuất sắc (hoặc sản phẩm thực tế), cần triển khai theo 4 giai đoạn logic:

### Giai đoạn 1: Liên kết điều hướng chéo (Cross-Module Seamless Navigation)
1. **Từ Camera $\rightarrow$ Incidents & Site**:
   - Trên mỗi thẻ Camera hoặc Video Player: Bổ sung nút **"Sự cố liên quan"** $\rightarrow$ Click sẽ chuyển sang trang `/incidents?cameraId=CAM_01` (đã lọc sẵn sự cố của camera đó).
   - Bổ sung huy hiệu Site: Click vào tên Site trên Camera sẽ chuyển ngay đến trang chi tiết Site `/sites/[siteId]`.
2. **Từ Incident $\rightarrow$ Camera & Site**:
   - Tại trang chi tiết Incident `/incidents/[id]`: Bổ sung nút hành động **"Xem Camera Trực Tiếp"** $\rightarrow$ Mở trang Camera ở chế độ Video Wall tập trung đúng camera đó.
   - Bổ sung nút **"Mở Trung Tâm Điều Hành Site"** $\rightarrow$ Nhảy sang tab Live Camera của Site tương ứng.

### Giai đoạn 2: Trực quan hóa AI Bounding Box thời gian thực trên Video Stream
1. Nâng cấp component `CameraVideoPlayer`:
   - Tạo một lớp SVG / Canvas Overlay phủ lên video stream.
   - Nhận tọa độ Bounding Box từ luồng AI (tọa độ chuẩn hóa `x, y, width, height` từ 0.0 đến 1.0).
   - Vẽ khung viền xanh cho đối tượng hợp lệ (Có mũ, có áo) và khung viền đỏ nhấp nháy kèm cảnh báo nguy cơ vi phạm (Không mũ, vi phạm vùng cấm).

### Giai đoạn 3: Tích hợp WebSocket / SSE & Chuông Báo Động Tức Thì
1. Thiết lập kênh `useRealtimeSafetyEvents`:
   - Kết nối tới WebSocket server hoặc Mock Event Emitter.
   - Khi có event `INCIDENT_DETECTED`:
     - Tự động hiển thị Toast Alert góc trên bên phải màn hình kèm âm thanh bip ngắn.
     - Tự động tăng số đếm trên thanh Notification chuông báo.
     - Cập nhật tức thì dữ liệu bảng Incident mà không cần người dùng bấm F5.
     - Nhấp nháy viền đỏ camera tương ứng trên màn hình giám sát.

### Giai đoạn 4: Hoàn thiện vòng lặp phản hồi AI (Human-in-the-Loop Feedback Loop)
1. Cải tiến modal `ReviewIncidentModal`:
   - Khi chọn "Bác bỏ sự cố (Dismissed)": Thêm trường lý do *"Nguyên nhân AI"* (ví dụ: *Vật thể che khuất*, *Nhầm lẫn trang phục*, *Ánh sáng yếu*, *Góc máy quá xa*).
   - Tự động đánh dấu ảnh bằng chứng là `FALSE_POSITIVE`.
2. Bổ sung mục trên trang `AI Metrics`:
   - Tab *"Đánh giá chất lượng thực địa (Field Feedback)"*: Hiển thị tỷ lệ báo sai theo thời gian thực và cho phép xuất tập dữ liệu ảnh bị gắn nhầm để phục vụ huấn luyện lại mô hình YOLO.

---

## 6. KẾT LUẬN & ĐỊNH HƯỚNG BẮT ĐẦU NGAY

- Khẳng định lại: **Mô hình kết nối Site $\rightarrow$ Camera $\rightarrow$ AI $\rightarrow$ Incident là hoàn toàn ĐÚNG và là CHUẨN MỰC BẮT BUỘC** của bài toán giám sát an toàn lao động thông minh.
- Các giao diện hiện tại của bạn đã có nền tảng UI/UX rất đẹp mắt, chuẩn design system. Việc cần làm tiếp theo là **xâu chuỗi các trang lại với nhau** bằng các liên kết logic, mock sự kiện realtime và hoàn thiện các tính năng tương tác hai chiều.
- Hãy tiến hành triển khai theo lộ trình trên để hệ thống trở nên sống động, hoàn chỉnh và thực tế nhất.
