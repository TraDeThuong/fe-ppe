# Hành trình xây dựng Trang Thống kê Hiệu năng AI & Giám sát Mô hình (/ai-metrics) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trang Thống kê Hiệu năng AI & Giám sát Mô hình Nhận diện (`/ai-metrics`) thuộc nhóm Báo cáo & Phân tích (`reports-and-analytics`) sau đăng nhập — theo dõi độ chính xác của mạng nơ-ron nhận diện PPE (mAP, Precision, Recall, F1-Score), tốc độ suy luận thời gian thực (Inference Latency ms, FPS), phân tích ma trận nhầm lẫn (Confusion Matrix Heatmap), giám sát tỷ lệ cảnh báo sai (False Positive Analysis), và quản lý phiên bản triển khai mô hình (AI Model Governance & Hot-swap Deployment).  
> **Nguồn contract:** Backend `smart-ppe-reporting-service` (cổng 8885 / Gateway Traefik cổng 80 tại `/api/v1/statistics/ai-performance` & `/api/v1/ai-models`) và `smart-ppe-ai-service` (cổng 8000).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [cameras-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/cameras-journey.md) | [reports-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/reports-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - `admin@ppe.local / Admin@123456` (ADMIN — toàn quyền xem chỉ số AI, phân tích lỗi, quản lý và triển khai phiên bản mô hình)  
> - `manager@ppe.local / Manager@123456` (SAFETY_MANAGER — xem chỉ số độ tin cậy AI để đánh giá chất lượng giám sát an toàn)  
> - `officer@ppe.local / Officer@123456` (SAFETY_OFFICER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  
> - `user@ppe.local / User@123456` (USER — không có quyền truy cập, hiển thị màn hình 403 Forbidden)  

---

## Mục lục

0. [Mục tiêu & Định vị trang /ai-metrics](#0-mục-tiêu--định-vị-trang-ai-metrics)
1. [Khảo sát Backend Contract (reporting-service & ai-service)](#1-khảo-sát-backend-contract-reporting-service--ai-service)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: Confusion Matrix, Inference Profiling & Model Governance](#4-cơ-chế-kỹ-thuật-cốt-lõi-confusion-matrix-inference-profiling--model-governance)
5. [Ma trận phân quyền & RBAC Access Control](#5-ma-trận-phân-quyền--rbac-access-control)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/ai-metrics.types.ts)](#bước-1--tầng-dtos--types-srctypesai-metricstypests)
   - [Bước 2 — Tầng Service API (src/services/ai-metrics.service.ts)](#bước-2--tầng-service-api-srcservicesai-metricsservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/ai-metrics/)](#bước-3--tầng-react-query-hooks-srchooksai-metrics)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Xây dựng các UI Components hiển thị Neumorphism](#bước-5--xây-dựng-các-ui-components-hiển-thị-neumorphism)
   - [Bước 6 — Xây dựng Modal Triển khai & So sánh Phiên bản Mô hình](#bước-6--xây-dựng-modal-triển-khai--so-sánh-phiên-bản-mô-hình)
   - [Bước 7 — Lắp ráp trang chính (app/(auth)/ai-metrics/ai-metrics-content.tsx)](#bước-7--lắp-ráp-trang-chính-appauthai-metricsai-metrics-contenttsx)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị trang /ai-metrics

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Trang `/ai-metrics` (**Trung tâm Giám định Hiệu năng Trí tuệ Nhân tạo**) là bảng điều khiển kỹ thuật cao dành cho Quản lý Dự án và Kỹ sư AI. Hệ thống Smart PPE sử dụng mô hình nhận diện thị giác máy tính YOLOv8/YOLOv11 kết hợp thuật toán theo dõi ByteTrack để phát hiện mũ bảo hộ, áo phản quang và người trong thời gian thực. Trang này giải quyết 4 bài toán chiến lược:

1. **Định lượng Độ Chính xác Mô hình (Model Precision & Recall Benchmark):** Cung cấp các thước đo chuẩn công nghiệp: `mAP@0.5` (Mean Average Precision), `mAP@0.5:0.95`, `Precision`, `Recall`, và `F1-Score` cho từng phân lớp đối tượng: Người (`PERSON`), Mũ bảo hộ (`HARD_HAT`), Áo phản quang (`SAFETY_VEST`), Không đội mũ (`NO_HELMET`), Không mặc áo (`NO_VEST`).
2. **Theo dõi Tốc độ Xử lý & Độ trễ Suy luận (Realtime Inference Profiling):** Giám sát độ trễ tính toán của đường ống AI (từ lúc nhận khung hình RTSP, chạy suy luận TensorRT, gán nhãn, đến khi bắn sự kiện ra Kafka). Cảnh báo khi độ trễ vượt quá ngưỡng an toàn (> 100ms) hoặc khi FPS sụt giảm.
3. **Phát hiện & Giảm thiểu Báo động Sai (False Positives & Edge Case Diagnostics):** Tích hợp Ma trận Nhầm lẫn (Confusion Matrix) giúp nhận diện chính xác các trường hợp mô hình hay bắt nhầm (ví dụ: công nhân mặc áo sơ mi màu sáng bị nhận nhầm thành áo phản quang, hoặc công nhân đội mũ bảo hiểm xe máy). Dữ liệu này là cơ sở để xuất mẫu dữ liệu khó (Hard negative mining) phục vụ huấn luyện lại mô hình.
4. **Quản trị Phiên bản & Chuyển giao Nóng (Model Governance & Zero-Downtime Deployment):** Quản lý vòng đời các phiên bản mô hình AI (`v1.0.0-base`, `v1.2.0-finetuned`, `v2.0-yolov11`). Cho phép Quản trị viên so sánh hiệu năng song song và kích hoạt chuyển đổi mô hình (Hot-swap Deployment) trên toàn bộ hệ thống camera mà không cần khởi động lại dịch vụ.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Thống kê KPI Hiệu năng AI (Bento Console):** 4 thẻ chỉ số: Độ chính xác trung bình (mAP@50: 94.8%), Độ trễ suy luận trung bình (Inference Latency: 32ms), Tỷ lệ khung hình xử lý (Processing FPS: 30.2 FPS), Tổng số lượt suy luận (Total Inferences trong 24h).
  2. **Bộ lọc & Phân tích Đa chiều:** Lọc theo Phiên bản mô hình (`versionId`), Công trường (`siteId`), Mã camera (`cameraCode`), Khoảng thời gian (24 giờ qua, 7 ngày qua, 30 ngày qua).
  3. **Biểu đồ Radar & Cột Hiệu năng theo Lớp (Per-Class Performance Breakdown):** So sánh Precision vs Recall cho từng loại trang bị bảo hộ.
  4. **Bảng Ma trận Nhầm lẫn (Confusion Matrix Heatmap):** Bảng nhiệt thể hiện tỷ lệ True Positive, False Positive, False Negative giữa nhãn thực tế (Ground Truth từ Cán bộ An toàn xác nhận) và nhãn dự đoán của AI.
  5. **Biểu đồ Xu hướng Độ trễ (Latency Trend Line Chart):** Đồ thị biểu diễn biến thiên độ trễ theo thời gian trong ngày.
  6. **Bảng Quản lý Phiên bản Mô hình AI (Model Versions & Governance Table):**
     - Danh sách các phiên bản mô hình AI kèm thông số benchmark (mAP, Model Size MB, Framework: PyTorch/TensorRT/ONNX).
     - Huy hiệu đánh dấu phiên bản đang chạy chính thức (`ACTIVE IN PRODUCTION`).
     - Nút "Triển khai phiên bản này" (Deploy Model Version) kèm hộp thoại xác nhận.
  7. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không trực tiếp chạy quá trình huấn luyện lại mô hình (Training pipeline) trên giao diện web (huấn luyện diễn ra trên máy chủ GPU chuyên dụng).
  - Không chỉnh sửa file nhị phân trọng số mô hình `.pt` hoặc `.engine`.

---

## 1. Khảo sát Backend Contract (reporting-service & ai-service)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-reporting-service` (cổng 8885 / Gateway Traefik `/api/v1/statistics` & `/api/v1/ai-models`):
- Controller: [reporting.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-reporting-service/src/modules/reporting/reporting.controller.ts)
- Routes: [reporting.route.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-reporting-service/src/modules/reporting/reporting.route.ts)
- DTOs: [reporting.dto.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-reporting-service/src/modules/reporting/reporting.dto.ts)

### 1.1 Bảng đối chiếu REST Endpoints & Quyền hạn

| Phân hệ | Method | Endpoint | Yêu cầu Quyền | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Hiệu năng AI** | `GET` | `/api/v1/statistics/ai-performance` | `PPE_AI_METRICS_READ` | Query: `modelId, versionId, siteId, cameraCode, fromDate, toDate` | `{ success: true, data: AiPerformanceDto }` |
| **Ghi nhận Chỉ số** | `POST` | `/api/v1/statistics/record-ai-performance` | `PPE_MODEL_MANAGE` | Body: `RecordAiPerformanceDto` | `{ success: true, message: string }` |
| **Phiên bản Đang chạy**|`GET` | `/api/v1/ai-models/active-version` | `PPE_MODEL_READ` | Không | `{ success: true, data: AiModelVersionDto }` |
| **Danh sách Mô hình** | `GET` | `/api/v1/ai-models` | `PPE_MODEL_READ` | Không | `{ success: true, data: AiModelItemDto[] }` |
| **Chi tiết Mô hình** | `GET` | `/api/v1/ai-models/:id` | `PPE_MODEL_READ` | Params: `id (UUID)` | `{ success: true, data: AiModelDetailDto }` |
| **Chi tiết Phiên bản** | `GET` | `/api/v1/ai-models/versions/:versionId` | `PPE_MODEL_READ` | Params: `versionId` | `{ success: true, data: AiModelVersionDto }` |
| **Tạo Phiên bản Mới** | `POST` | `/api/v1/ai-models/:id/versions` | `PPE_MODEL_MANAGE` | Params: `id`, Body: `CreateAiModelVersionDto` | `{ success: true, data: AiModelVersionDto }` (201) |
| **Triển khai Mô hình** | `PATCH`| `/api/v1/ai-models/:id/versions/:versionId/deploy` | `PPE_MODEL_MANAGE` | Params: `id, versionId` | `{ success: true, message: string, data: AiModelVersionDto }` |

### 1.2 Cấu trúc Phản hồi Dữ liệu Hiệu năng (AiPerformanceDto)
```typescript
export interface AiPerformanceDto {
  modelName: string;
  version: string;
  mAP50: number;                     // Ví dụ: 0.948 (94.8%)
  mAP50_95: number;                  // Ví dụ: 0.782 (78.2%)
  precision: number;                 // Ví dụ: 0.935
  recall: number;                    // Ví dụ: 0.921
  f1Score: number;                   // Ví dụ: 0.928
  averageLatencyMs: number;          // Độ trễ tính toán ms
  averageFps: number;                // Khung hình xử lý mỗi giây
  totalFramesProcessed: number;
  perClassMetrics: {
    className: "PERSON" | "HARD_HAT" | "SAFETY_VEST" | "NO_HELMET" | "NO_VEST";
    precision: number;
    recall: number;
    f1Score: number;
    sampleCount: number;
  }[];
  confusionMatrix: {
    classes: string[];
    matrix: number[][];              // Ma trận vuông số lượng mẫu
  };
  latencyHistory: {
    timestamp: string;
    latencyMs: number;
    fps: number;
  }[];
}
```

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/ai-metrics/
│   ├── page.tsx                                      ← Server Component bọc Suspense (đã có)
│   └── ai-metrics-content.tsx                        ← NÂNG CẤP: Lắp ráp giao diện Giám định Hiệu năng AI
│
├── src/
│   ├── types/
│   │   ├── ai-metrics.types.ts                       ← MỚI: DTOs, PerformanceTypes, ConfusionMatrixTypes, ModelGovernanceTypes
│   │   └── index.ts                                  ← SỬA: Re-export ai-metrics.types.ts
│   │
│   ├── services/
│   │   ├── ai-metrics.service.ts                     ← MỚI: Client gọi 8 endpoint của reporting-service ai modules
│   │   └── index.ts                                  ← SỬA: Re-export ai-metrics.service.ts
│   │
│   ├── hooks/ai-metrics/                             ← MỚI: Thư mục hooks quản lý chỉ số AI
│   │   ├── index.ts                                  ← Export toàn bộ hooks
│   │   ├── ai-metrics.query-keys.ts                  ← Quản lý Query Keys chuẩn
│   │   ├── use-ai-performance.ts                     ← Lấy dữ liệu hiệu năng theo bộ lọc thời gian/mô hình
│   │   ├── use-ai-models.ts                          ← Lấy danh sách mô hình và phiên bản
│   │   ├── use-active-model-version.ts               ← Lấy phiên bản đang chạy trong production
│   │   └── use-deploy-model-version.ts               ← Mutation triển khai phiên bản mô hình mới
│   │
│   ├── components/features/ai-metrics/               ← MỚI: UI Components Neumorphism
│   │   ├── ai-metrics-kpi-summary.tsx                ← 4 thẻ Bento Console thống kê nhanh (mAP, Latency, FPS, Samples)
│   │   ├── ai-metrics-toolbar.tsx                    ← Thanh lọc phiên bản, lọc camera, khoảng thời gian
│   │   ├── active-model-banner.tsx                   ← Banner Neumorphic làm nổi bật phiên bản AI đang active
│   │   ├── per-class-metrics-card.tsx                ← Bảng so sánh Precision/Recall theo từng loại trang bị
│   │   ├── confusion-matrix-heatmap.tsx              ← Bảng nhiệt ma trận nhầm lẫn Neumorphic trực quan
│   │   ├── latency-chart-card.tsx                    ← Biểu đồ biến thiên độ trễ và FPS theo thời gian
│   │   ├── model-governance-table.tsx                ← Bảng danh sách các phiên bản mô hình AI đã đăng ký
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── deploy-model-dialog.tsx               ← Hộp thoại xác nhận triển khai mô hình mới lên hệ thống
│   │       └── model-version-detail-modal.tsx        ← Modal xem chi tiết siêu dữ liệu huấn luyện của phiên bản
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "aiMetrics.*"
│       └── en-US.json                                ← Bổ sung namespace "aiMetrics.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục trang tổng thể (12 cột, Responsive)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon Cpu + "Thống kê Hiệu năng AI & Giám sát Mô hình" + Badge "YOLOv8 ENGINE"│
│            + [ Nút: "🚀 Triển khai Phiên bản Mới" ]  [ Nút: "🔄 Làm mới Chỉ số" ]       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ACTIVE MODEL BANNER NEUMORPHIC]                                                       │
│ 🧠 Đang chạy: YOLOv8n-PPE v2.1.0-STABLE • TensorRT FP16 • 32ms/frame • 94.8% mAP@50     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BENTO CONSOLE KPI CARDS] (4 cột desktop, 2 cột tablet, 1 cột mobile)                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│ │ 🎯 mAP@50       │ │ ⚡ Độ trễ TB   │ │ 🎞️ Tốc độ Khung │ │ 📊 Mẫu suy luận│           │
│ │    94.8%       │ │     32 ms      │ │    30.2 FPS    │ │    1.2M lượt   │           │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [FILTER TOOLBAR]: [ Mô hình: YOLOv8n-PPE ▼ ] [ Khoảng ngày: 7 ngày qua ▼ ] [ Cam: Tất cả]│
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│ CỘT TRÁI (6 CỘT): PHÂN LỚP & ĐỘ CHÍNH XÁC         │ CỘT PHẢI (6 CỘT): MA TRẬN NHẦM LẪN │
│ ┌───────────────────────────────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ 📊 ĐỘ CHÍNH XÁC THEO LỚP (PER-CLASS METRICS)  │ │ │ 🔥 MA TRẬN NHẦM LẪN (HEATMAP)   │ │
│ │ Lớp           │ Precision │ Recall │ F1-Score │ │ │ Thực tế \ Dự đoán │ Mũ   │ Ko Mũ │ │
│ │ 👷 Đội Mũ     │ 96.2%     │ 95.1%  │ 95.6%    │ │ │ ──────────────┼──────┼───────│ │
│ │ ⚠️ Không Mũ   │ 93.8%     │ 92.4%  │ 93.1%    │ │ │ Có Mũ         │ 952  │ 12    │ │
│ │ 🦺 Mặc Áo     │ 95.0%     │ 94.2%  │ 94.6%    │ │ │ Không Mũ      │ 18   │ 410   │ │
│ │ ⚠️ Không Áo   │ 91.5%     │ 90.8%  │ 91.1%    │ │ └────────────────────────────────┘ │
│ └───────────────────────────────────────────────┘ │                                    │
├───────────────────────────────────────────────────┴────────────────────────────────────┤
│ [ĐỒ THỊ BIẾN THIÊN ĐỘ TRỄ SUY LUẬN (LATENCY TREND)]                                   │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Biểu đồ đường đo Latency (ms) và FPS dao động trong ngày (Trung bình: 32ms)        │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [BẢNG QUẢN LÝ PHIÊN BẢN MÔ HÌNH (MODEL GOVERNANCE)]                                    │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Phiên bản     │ Framework │ mAP@50 │ Độ trễ │ Ngày tạo    │ Trạng thái   │ Thao tác│ │
│ ├───────────────┼───────────┼────────┼────────┼─────────────┼──────────────┼─────────┤ │
│ │ v2.1.0-STABLE │ TensorRT  │ 94.8%  │ 32 ms  │ 20/10/2026  │ 🟢 ACTIVE    │ [Chi tiết]│
│ │ v2.0.0-RC     │ ONNX      │ 92.1%  │ 45 ms  │ 10/10/2026  │ ⚪ ARCHIVED  │ [Chi tiết]│
│ │ v2.2.0-CANDID │ TensorRT  │ 96.2%  │ 28 ms  │ 27/10/2026  │ 🟡 CANDIDATE │ [Triển khai]
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: Confusion Matrix, Inference Profiling & Model Governance

### 4.1 Trực quan hóa Ma trận Nhầm lẫn (Heatmap Visualization)
Component `confusion-matrix-heatmap.tsx`:
- Tính toán tỷ lệ phần trăm chuẩn hóa theo hàng ngang (Row-normalized recall percentages).
- Tô màu các ô theo gradient độ sâu màu xanh/hổ phách:
  - Các ô trên đường chéo chính (True Positives, True Negatives): Màu xanh lục bảo cường độ từ `bg-success/10` đến `bg-success/40` đại diện cho các trường hợp nhận diện chuẩn xác.
  - Các ô ngoài đường chéo (False Positives, False Negatives): Màu cam/đỏ mờ `bg-danger/20` giúp Kỹ sư AI phát hiện ngay lập tức điểm yếu của mô hình.

### 4.2 Triển khai Mô hình Không Gián đoạn (Zero-Downtime Hot-swap)
Khi Admin bấm nút "Triển khai phiên bản này":
1. Hiển thị hộp thoại `deploy-model-dialog.tsx` so sánh chỉ số giữa phiên bản hiện tại và phiên bản mới (ví dụ: mAP tăng +1.4%, độ trễ giảm -4ms).
2. Khi xác nhận, gửi `PATCH /api/v1/ai-models/:id/versions/:versionId/deploy`.
3. Backend phát tín hiệu qua Kafka topic `ppe.models.deploy`. Worker AI trong container `smart-ppe-ai-service` nạp nóng file weights mới vào bộ nhớ GPU mà không làm gián đoạn việc nhận luồng RTSP từ camera.
4. Giao diện nhận phản hồi thành công, hiển thị Toast xanh và đổi ngay huy hiệu `ACTIVE IN PRODUCTION`.

---

## 5. Ma trận phân quyền & RBAC Access Control

| Vai trò | Xem Chỉ số Hiệu năng AI | Xem Ma trận Nhầm lẫn | Xem Danh sách Phiên bản | Triển khai Mô hình Mới |
|---|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Toàn quyền | ✅ Có | ✅ Có | ✅ Có (`PPE_MODEL_MANAGE`) |
| **SAFETY_MANAGER** | ✅ Có quyền | ✅ Có | ✅ Có | ❌ Bị vô hiệu hóa |
| **SAFETY_OFFICER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn |
| **USER** | ❌ Chặn (403) | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/ai-metrics.types.ts`)
- Định nghĩa `AiPerformanceDto`, `AiModelItemDto`, `AiModelVersionDto`, `PerClassMetric`, `ConfusionMatrixDto`.
- Enum `AiModelFramework`: `TENSORRT`, `ONNX`, `PYTORCH`, `OPENVINO`.
- Enum `ModelDeploymentStatus`: `ACTIVE`, `CANDIDATE`, `ARCHIVED`, `FAILED`.

### Bước 2 — Tầng Service API (`src/services/ai-metrics.service.ts`)
Tạo `aiMetricsService` bao bọc 8 hàm API:
- `getAiPerformance(params?: AiPerformanceFilter)`
- `getActiveModelVersion()`
- `getAiModels()` & `getAiModelById(id: string)`
- `getModelVersionById(versionId: string)`
- `deployModelVersion(modelId: string, versionId: string)`

### Bước 3 — Tầng React Query Hooks (`src/hooks/ai-metrics/`)
- `ai-metrics.query-keys.ts`: Factory quản lý query keys: `aiMetricsKeys.all`, `aiMetricsKeys.performance(filters)`, `aiMetricsKeys.models`, `aiMetricsKeys.activeVersion`.
- `use-ai-performance.ts`: Lấy dữ liệu hiệu năng AI có debounce search và filters.
- `use-ai-models.ts`: Lấy danh sách mô hình và phiên bản.
- `use-deploy-model-version.ts`: Mutation triển khai mô hình mới có invalidation cache.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật `vi-VN.json` và `en-US.json`:
- `aiMetrics.title`, `aiMetrics.description`, `aiMetrics.kpi.*`
- `aiMetrics.classes.*` (person, hardHat, safetyVest, noHelmet, noVest)
- `aiMetrics.matrix.*` (predicted, actual, accuracyScore)
- `aiMetrics.deploy.*` (title, confirmPrompt, performanceGain, deploying, success)

### Bước 5 — Xây dựng các UI Components hiển thị Neumorphism
- `ai-metrics-kpi-summary.tsx`: 4 thẻ Bento Console thống kê nhanh.
- `active-model-banner.tsx`: Thẻ nổi Neumorphic hiển thị phiên bản hiện hành.
- `per-class-metrics-card.tsx`: Bảng thanh đo độ chính xác từng lớp.
- `confusion-matrix-heatmap.tsx`: Bảng nhiệt ma trận nhầm lẫn có màu tương phản êm mắt.
- `latency-chart-card.tsx`: Biểu đồ biểu diễn độ trễ và FPS.

### Bước 6 — Xây dựng Modal Triển khai & So sánh Phiên bản Mô hình
- `deploy-model-dialog.tsx`: Hộp thoại so sánh thông số trước khi deploy mô hình mới.
- `model-version-detail-modal.tsx`: Modal xem siêu dữ liệu mô hình (weights size, training dataset, hyper-parameters).

### Bước 7 — Lắp ráp trang chính (`app/(auth)/ai-metrics/ai-metrics-content.tsx`)
Thay thế placeholder hiện tại bằng component hoàn chỉnh kết nối toàn bộ Hooks, Banner, Summary Cards, Heatmap và Bảng Model Governance.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm tra hiển thị biểu đồ và bảng Ma trận Nhầm lẫn trên thiết bị di động (hỗ trợ cuộn ngang mượt mà).
- Kiểm tra tính năng Deploy mô hình với tài khoản `admin@ppe.local`.
- Kiểm tra chặn quyền truy cập đối với tài khoản `officer@ppe.local`.

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Bộ lọc thời gian không hợp lệ | Thông báo inline, tự động đưa về mốc mặc định 7 ngày |
| **401 Unauthorized**| Hết hạn phiên khi đang xem chỉ số | Chuyển hướng về `/login` |
| **403 Forbidden**   | Cán bộ an toàn cố gắng deploy phiên bản mô hình | Nút bị ẩn, hiển thị Toast cảnh báo quyền hạn nếu cố ý gọi API |
| **404 Not Found**   | Phiên bản mô hình không tồn tại trong DB | Toast báo lỗi "Không tìm thấy phiên bản mô hình này" |
| **500 Server Error**| Worker AI gặp sự cố khi nạp weights mới | Toast báo lỗi đỏ "Triển khai thất bại, worker AI đã tự động rollback về phiên bản an toàn trước đó" |

---

## 8. Checklist hoàn thiện nghiệm thu

- [ ] Route `/ai-metrics` được bảo vệ bằng Route Guard với quyền `PPE_AI_METRICS_READ`.
- [ ] 4 thẻ Bento Console phản ánh trung thực số liệu mAP, Latency, FPS từ backend.
- [ ] Banner Phiên bản Active hiển thị đúng mô hình đang phục vụ trên production.
- [ ] Bảng Ma trận Nhầm lẫn (Confusion Matrix) tính toán tỷ lệ % chuẩn xác và hiển thị màu sắc trực quan.
- [ ] Biểu đồ biến thiên độ trễ suy luận hiển thị mượt mà.
- [ ] Bảng Quản trị Phiên bản (Model Governance) liệt kê đầy đủ các bản weights.
- [ ] Thao tác Triển khai Mô hình mới (Deploy Hot-swap) hoạt động chuẩn mực với quyền `PPE_MODEL_MANAGE`.
- [ ] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) chuyển đổi mượt mà.
- [ ] Giao diện Neumorphic thẩm mỹ cao, tương thích hoàn hảo Dark Mode và Light Mode.
