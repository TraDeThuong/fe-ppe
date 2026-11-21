"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Gauge,
  Grid,
  HelpCircle,
  Layers,
  Lightbulb,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelVersionDto, AiPerformanceDto } from "@/types";

export type AiCardGuideKey =
  | "active-model"
  | "map50"
  | "latency"
  | "fps"
  | "samples"
  | "per-class"
  | "confusion-matrix"
  | "latency-chart"
  | "governance";

export interface AiCardHelpButtonProps {
  onClick: () => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function AiCardHelpButton({
  onClick,
  label,
  compact = false,
  className = "",
}: AiCardHelpButtonProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const resolvedLabel = label ?? (isVi ? "Giải thích" : "Explain");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={resolvedLabel}
      title={resolvedLabel}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/[0.08] font-bold text-primary transition-all hover:bg-primary/15 hover:border-primary/40 active:translate-y-px shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] ${
        compact
          ? "px-2 py-1 text-[10px]"
          : "px-2.5 py-1.5 text-[11px]"
      } ${className}`}
    >
      <HelpCircle className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{resolvedLabel}</span>
    </button>
  );
}

interface GuideTerm {
  term: string;
  meaning: string;
}

interface GuideContent {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  simpleSummary: string;
  howToRead: GuideTerm[];
  realExample: string;
  watchOut: string;
}

function buildGuideContent(
  key: AiCardGuideKey,
  isVi: boolean,
  performance?: AiPerformanceDto | null,
  activeVersion?: AiModelVersionDto | null,
  activeModelName?: string,
): GuideContent {
  const mapPct = performance ? `${(performance.mAP50 * 100).toFixed(1)}%` : "--";
  const latencyStr = performance ? `${performance.averageLatencyMs.toFixed(1)} ms` : "--";
  const fpsStr = performance ? `${performance.averageFps.toFixed(1)} FPS` : "--";
  const framesStr = performance
    ? performance.totalFramesProcessed.toLocaleString(isVi ? "vi-VN" : "en-US")
    : "0";
  const modelLabel = activeModelName || performance?.modelName || "YOLO PPE";
  const versionLabel = activeVersion?.version || performance?.version || "--";

  switch (key) {
    case "active-model":
      return {
        icon: Cpu,
        title: isVi ? "Mô hình Phục vụ Trực tiếp là gì?" : "What is the Live Serving Model?",
        subtitle: isVi
          ? "Giải thích phiên bản AI đang chạy trên các camera công trường"
          : "Plain-language guide to the active production AI engine",
        simpleSummary: isVi
          ? `Đây là "bộ não AI" (${modelLabel} v${versionLabel}) đang trực tiếp xem toàn bộ camera và phát hiện công nhân thiếu mũ bảo hộ hoặc áo phản quang.`
          : `This is the active AI brain (${modelLabel} v${versionLabel}) currently inspecting live camera feeds for PPE violations.`,
        howToRead: [
          {
            term: isVi ? "Phiên bản (Version)" : "Version",
            meaning: isVi
              ? "Mã bản cập nhật của AI (ví dụ v3.0.0) kèm đường dẫn file trọng số đang nạp vào máy chủ GPU."
              : "The deployed release tag (e.g., v3.0.0) and weight file currently loaded in GPU memory.",
          },
          {
            term: isVi ? "Kiến trúc (Framework)" : "Framework",
            meaning: isVi
              ? "Công nghệ giúp AI chạy (ví dụ PyTorch FP16). Đây là định dạng giúp AI tính toán nhanh mà vẫn nhẹ bộ nhớ."
              : "The inference runtime (e.g., PyTorch FP16) controlling execution speed and memory footprint.",
          },
          {
            term: isVi ? "Kích thước đầu vào (Input Size)" : "Input Resolution",
            meaning: isVi
              ? "Ví dụ 640x640 nghĩa là mỗi khung hình camera sẽ được co giãn về cỡ 640×640 pixel trước khi AI soi lỗi."
              : "Every video frame is resized to this dimension (e.g., 640×640 px) before detection runs.",
          },
          {
            term: isVi ? "Triển khai lúc" : "Deployed At",
            meaning: isVi
              ? "Ngày phiên bản AI này chính thức được bật để giám sát công trường."
              : "The date this version went live in production monitoring.",
          },
        ],
        realExample: isVi
          ? "Giống như một ca trực bảo vệ: chỉ có 1 phiên bản AI giữ trạng thái \"Đang phục vụ\" tại một thời điểm để tránh các camera nhận diện không đồng nhất."
          : "Think of it as the active shift supervisor: one deployed version serves live cameras consistently at any time.",
        watchOut: isVi
          ? "Nếu hiển thị \"--\" ở hầu hết các ô, nghĩa là chưa có phiên bản nào được bấm Triển khai (Deploy) lên hệ thống."
          : "If fields show \"--\", no model version is currently deployed.",
      };

    case "map50":
      return {
        icon: Zap,
        title: isVi ? "mAP@50 — Độ chính xác tổng thể của AI" : "mAP@50 — Overall Detection Accuracy",
        subtitle: isVi
          ? "AI nhận diện đúng trang bị bảo hộ đến mức nào?"
          : "How accurately the AI detects workers and PPE gear",
        simpleSummary: isVi
          ? `Hiện tại mô hình đạt ${mapPct}. Nói đơn giản, đây là "điểm tổng kết" đo xem AI vẽ khung nhận diện người, mũ và áo phản quang có chuẩn xác hay không.`
          : `The model currently scores ${mapPct}. Simply put, this is the overall accuracy grade for detecting workers, helmets, and vests.`,
        howToRead: [
          {
            term: "mAP (Mean Average Precision)",
            meaning: isVi
              ? "Điểm trung bình độ chính xác trên tất cả các loại đối tượng (Người, Mũ bảo hộ, Không mũ, Áo phản quang, Không áo)."
              : "Average accuracy across all object classes (Person, Hard Hat, No Helmet, Safety Vest, No Vest).",
          },
          {
            term: "@50",
            meaning: isVi
              ? "Khung mà AI khoanh quanh công nhân/mũ chỉ cần trùng khớp từ 50% diện tích thật trở lên là được tính nhận diện đúng."
              : "A predicted bounding box counts as correct when it overlaps at least 50% with the true object.",
          },
        ],
        realExample: isVi
          ? "Nếu mAP@50 đạt ~88–92%, AI phân biệt rất tốt giữa người đội mũ bảo hộ thật với bóng râm, xô nhựa hay vật liệu xây dựng gần giống mũ."
          : "At ~88–92%, the AI reliably tells real helmets apart from shadows, buckets, or similarly shaped site objects.",
        watchOut: isVi
          ? "Từ 90% trở lên là Xuất sắc; 80–89% là Đạt chuẩn; dưới 80% dễ gây báo nhầm hoặc sót vi phạm, nên cân nhắc huấn luyện thêm dữ liệu công trường."
          : "≥ 90% is Excellent; 80–89% is Good; below 80% risks false alarms or missed violations and needs retraining.",
      };

    case "latency":
      return {
        icon: Gauge,
        title: isVi ? "Độ trễ Suy luận (Inference Latency)" : "Inference Latency",
        subtitle: isVi
          ? "AI mất bao lâu để kiểm tra xong 1 tấm ảnh từ camera?"
          : "How fast the AI inspects a single camera frame",
        simpleSummary: isVi
          ? `Độ trễ hiện tại là ${latencyStr}. Con số này càng NHỎ càng tốt — nghĩa là AI phản ứng càng nhanh khi phát hiện công nhân vi phạm.`
          : `Current latency is ${latencyStr}. Lower is better — it means faster reaction time when a worker violates safety rules.`,
        howToRead: [
          {
            term: isVi ? "Đơn vị ms (mili-giây)" : "Unit: ms (milliseconds)",
            meaning: isVi
              ? "1 giây = 1.000 ms. Một cái chớp mắt của con người mất khoảng 300 ms, còn 18–25 ms nhanh gấp hơn 10 lần một cái chớp mắt."
              : "1 second = 1,000 ms. A human blink takes ~300 ms, so 18–25 ms is over 10× faster than a blink.",
          },
          {
            term: isVi ? "Vì sao có thể hiện 0.0 ms?" : "Why might it show 0.0 ms?",
            meaning: isVi
              ? "Khi bạn lọc theo một camera hoặc khoảng ngày (như 24h / 7 ngày qua) mà chưa có dữ liệu đo được gửi về, hệ thống hiển thị 0.0 ms thay vì đoán bừa."
              : "When filtering by a camera or date window with zero recorded telemetry, it accurately reports 0.0 ms.",
          },
        ],
        realExample: isVi
          ? "Công nhân vừa bước qua cổng mà quên đội mũ: chỉ sau khoảng 0.02 giây AI đã nhận ra ngay lập tức để kích hoạt cảnh báo."
          : "As soon as an unhelmeted worker enters a zone, AI spots the violation in roughly 0.02 seconds.",
        watchOut: isVi
          ? "≤ 40 ms: Thời gian thực mượt mà. Trên 100 ms (vượt ngưỡng SLA): Camera bắt đầu có độ trễ, cảnh báo đến chậm hơn bình thường."
          : "≤ 40 ms: Real-time smooth. Above 100 ms (SLA limit): Alerting becomes noticeably delayed.",
      };

    case "fps":
      return {
        icon: Activity,
        title: isVi ? "Tốc độ Khung hình (FPS)" : "Processing Frame Rate (FPS)",
        subtitle: isVi
          ? "Mỗi giây AI xem được bao nhiêu khung hình video?"
          : "How many video frames the AI analyzes every second",
        simpleSummary: isVi
          ? `Tốc độ hiện tại là ${fpsStr}. Con số này càng CAO càng tốt — giúp theo dõi công nhân di chuyển liên tục mà không bị "giật" hay bỏ sót khoảnh khắc.`
          : `Current throughput is ${fpsStr}. Higher is better — tracking moving workers smoothly without skipping moments.`,
        howToRead: [
          {
            term: "FPS (Frames Per Second)",
            meaning: isVi
              ? "Số tấm ảnh trích từ video camera mà AI kiểm tra xong trong 1 giây. Camera an ninh tiêu chuẩn thường chạy 25–30 FPS."
              : "Number of video frames inspected per second. Standard security video runs at 25–30 FPS.",
          },
        ],
        realExample: isVi
          ? "Nếu xe nâng chạy ngang qua hoặc công nhân đi nhanh qua vùng cấm ở 28.5 FPS, AI xem gần như trọn vẹn từng bước di chuyển mà không bị nhảy cóc."
          : "At ~28.5 FPS, fast-moving forklifts or workers crossing restricted zones are tracked frame-by-frame without gaps.",
        watchOut: isVi
          ? "≥ 25 FPS: Mượt mà thời gian thực; 15–24 FPS: Chấp nhận được; < 15 FPS: Dễ sót đối tượng chuyển động nhanh."
          : "≥ 25 FPS: Smooth real-time; 15–24 FPS: Acceptable; < 15 FPS: Risk of missing fast motion.",
      };

    case "samples":
      return {
        icon: Layers,
        title: isVi ? "Tổng Lượt Suy luận (Total Inferences)" : "Total Inferences",
        subtitle: isVi
          ? "Tổng số khung hình đã được AI kiểm tra an toàn"
          : "Cumulative camera frames inspected by the AI",
        simpleSummary: isVi
          ? `Hệ thống đã kiểm tra ${framesStr} khung hình trong phạm vi bộ lọc hiện tại. Mỗi khung hình là 1 lần AI quét tìm vi phạm bảo hộ.`
          : `${framesStr} frames have been analyzed in the selected scope. Each frame represents one automated PPE check.`,
        howToRead: [
          {
            term: isVi ? "Đơn vị K / M" : "Units K / M",
            meaning: isVi
              ? "K là Nghìn khung hình (ví dụ 148.5K = 148.500 ảnh), M là Triệu khung hình."
              : "K stands for Thousands (e.g., 148.5K = 148,500 frames) and M stands for Millions.",
          },
          {
            term: isVi ? "Thay đổi theo bộ lọc" : "Sensitive to filters",
            meaning: isVi
              ? "Khi bạn đổi khoảng thời gian (24h, 7 ngày, 30 ngày, Tất cả) hoặc chọn từng Camera, con số này cập nhật theo đúng dữ liệu đo được trong phạm vi đó."
              : "Updates dynamically according to the selected time range, model, or specific camera.",
          },
        ],
        realExample: isVi
          ? "Với tốc độ ~28.5 FPS, 148.520 khung hình tương đương khoảng 87 phút video được AI soi liên tục từng khung hình không nghỉ."
          : "At ~28.5 FPS, 148,520 frames equals roughly 87 minutes of continuous frame-by-frame safety inspection.",
        watchOut: isVi
          ? "Nếu bằng 0 khi chọn 7 ngày qua, nghĩa là tuần vừa rồi chưa có bản ghi benchmark nào được đẩy lên hệ thống Reporting."
          : "A value of 0 for a narrow window means no telemetry benchmarks were recorded during that timeframe.",
      };

    case "per-class":
      return {
        icon: BarChart3,
        title: isVi
          ? "Độ Chính xác theo Phân lớp Đối tượng"
          : "Per-Class Accuracy Breakdown",
        subtitle: isVi
          ? "AI bắt đúng từng loại trang bị (Mũ, Áo, Người...) tốt ra sao?"
          : "How well the AI detects each individual PPE category",
        simpleSummary: isVi
          ? "Thay vì gộp chung 1 điểm số, bảng này tách riêng từng loại (Người, Mũ bảo hộ, Không mũ, Áo phản quang, Không áo) để biết AI đang mạnh hay yếu ở món đồ nào."
          : "Breaks accuracy down by each class (Person, Hard Hat, No Helmet, Safety Vest, No Vest) so you see exact strengths and weak spots.",
        howToRead: [
          {
            term: isVi ? "Độ chuẩn (Precision) — \"Báo có đúng không?\"" : "Precision — \"Are alerts accurate?\"",
            meaning: isVi
              ? "Ví dụ Precision của \"Không mũ\" là 80%: trong 100 lần AI báo \"Không đội mũ\", có 80 lần đúng thật, 20 lần báo nhầm."
              : "If \"No Helmet\" Precision is 80%, 80 out of 100 alerts are genuine violations and 20 are false alarms.",
          },
          {
            term: isVi ? "Độ bao phủ (Recall) — \"Có bỏ sót không?\"" : "Recall — \"Does it catch everyone?\"",
            meaning: isVi
              ? "Ví dụ Recall là 85%: ngoài thực tế có 100 người không đội mũ thì AI phát hiện được 85 người, còn 15 người bị bỏ sót."
              : "If Recall is 85%, out of 100 actual unhelmeted workers, the AI catches 85 and misses 15.",
          },
          {
            term: "F1-Score & Macro F1",
            meaning: isVi
              ? "Điểm trung bình hài hòa giữa Precision và Recall (càng gần 100% càng tốt). Bấm vào một hàng sẽ làm nổi bật lớp đó ở Ma trận Nhầm lẫn bên cạnh!"
              : "Harmonic balance of Precision and Recall (closer to 100% is better). Clicking a row highlights that class in the Confusion Matrix!",
          },
        ],
        realExample: isVi
          ? "Nếu \"Không mặc áo\" có F1 thấp nhất (77%), bạn biết ngay cần bổ sung thêm ảnh chụp công nhân mặc áo tối màu hoặc đứng xa camera để train lại."
          : "If \"No Vest\" has the lowest F1 (77%), you immediately know to collect more training samples for that specific case.",
        watchOut: isVi
          ? "Các lớp Vi phạm (Không mũ, Không áo) cần ưu tiên Recall cao để không bỏ sót tai nạn tiềm ẩn."
          : "Violation classes (No Helmet, No Vest) need high Recall so unsafe workers are never missed.",
      };

    case "confusion-matrix":
      return {
        icon: Grid,
        title: isVi ? "Ma trận Nhầm lẫn (Confusion Matrix)" : "Confusion Matrix Heatmap",
        subtitle: isVi
          ? "Xem AI có hay nhận nhầm món đồ này sang món đồ khác không"
          : "See which classes the AI confuses with one another",
        simpleSummary: isVi
          ? "Bảng đối chiếu giữa \"Sự thật ngoài công trường\" (hàng ngang) và \"AI đoán là gì\" (cột dọc). Đường chéo màu xanh là đoán ĐÚNG; các ô màu cam lệch đường chéo là đoán NHẦM."
          : "Compares Ground Truth (rows) vs. AI Predictions (columns). Blue diagonal cells are correct; off-diagonal orange cells show mix-ups.",
        howToRead: [
          {
            term: isVi ? "Hàng ngang (Thực tế)" : "Rows (Actual)",
            meaning: isVi
              ? "Nhãn đúng do con người kiểm định gán cho đối tượng trong tập ảnh test."
              : "The true human-verified label of the object.",
          },
          {
            term: isVi ? "Cột dọc (Dự đoán)" : "Columns (Predicted)",
            meaning: isVi
              ? "Kết quả mà mô hình AI đã đoán cho đối tượng đó."
              : "What the AI model predicted for that object.",
          },
          {
            term: isVi ? "Đường chéo (True Positive)" : "Diagonal (True Positive)",
            meaning: isVi
              ? "Thực tế là X và AI cũng đoán là X. Phần trăm (%) ở các ô này càng gần 100% càng tốt."
              : "Actual = X and Predicted = X. Percentages here should be as close to 100% as possible.",
          },
        ],
        realExample: isVi
          ? "Ví dụ ở hàng \"Không mũ\" có 32 ca bị rơi sang cột \"Mũ bảo hộ\": nghĩa là có 32 người không đội mũ nhưng AI lại nhìn nhầm thành có mũ (có thể do mũ lưỡi trai hoặc tóc sáng màu)."
          : "If row \"No Helmet\" has 32 cases in column \"Hard Hat\", 32 unhelmeted workers were mistaken for wearing helmets (e.g., caps or bright hair).",
        watchOut: isVi
          ? "Hãy chú ý các ô lệch đường chéo có số lớn giữa cặp đối lập (ví dụ Không mũ ↔ Mũ bảo hộ, Không áo ↔ Áo phản quang) — đó là chỗ AI dễ báo sai nhất."
          : "Watch for large off-diagonal numbers between opposite pairs (No Helmet ↔ Hard Hat, No Vest ↔ Safety Vest).",
      };

    case "latency-chart":
      return {
        icon: Activity,
        title: isVi
          ? "Biến thiên Độ trễ Suy luận & FPS"
          : "Inference Latency & FPS Stability",
        subtitle: isVi
          ? "Theo dõi tốc độ xử lý của AI có ổn định qua từng ngày không"
          : "Track whether AI speed stays stable day over day",
        simpleSummary: isVi
          ? "Biểu đồ gồm 2 đường chạy song song theo thời gian: đường màu chính (trục trái) đo Độ trễ ms — càng thấp càng nhanh; đường nét đứt xanh lá (trục phải) đo FPS — càng cao càng mượt."
          : "Two series over time: the solid primary line (left axis) shows latency in ms (lower is faster); the dashed green line (right axis) shows FPS (higher is smoother).",
        howToRead: [
          {
            term: isVi ? "Độ trễ TB / Thấp nhất / Cao nhất" : "Avg / Min / Peak Latency",
            meaning: isVi
              ? "Cho biết thời gian xử lý trung bình và lúc máy chủ bận nhất (đỉnh độ trễ) trong kỳ đang lọc."
              : "Shows average frame processing time and worst-case spikes within the filtered window.",
          },
          {
            term: isVi ? "Ngưỡng SLA < 100 ms" : "SLA Threshold < 100 ms",
            meaning: isVi
              ? "Cam kết chất lượng hệ thống: mỗi khung hình phải xử lý xong dưới 100 mili-giây để cảnh báo kịp thời."
              : "Service level target: frames should complete within 100 ms for timely alerting.",
          },
          {
            term: isVi ? "Nếu biểu đồ báo \"Chưa có dữ liệu độ trễ\"" : "If it says \"No latency data\"",
            meaning: isVi
              ? "Khoảng thời gian/camera bạn đang lọc chưa có bản ghi telemetry. Hãy chọn \"Tất cả thời gian\" hoặc bấm \"Ghi Telemetry\" để nạp số liệu đo mới."
              : "No telemetry rows match the selected period/camera. Switch to \"All Time\" or click \"Record Benchmark\" to add measurements.",
          },
        ],
        realExample: isVi
          ? "Nếu đường Độ trễ luôn đi ngang đều quanh 18–20 ms và đường FPS giữ ổn định quanh 28 FPS, nghĩa là GPU hoạt động rất khỏe, không bị quá tải vào giờ cao điểm."
          : "Flat latency around 18–20 ms and steady FPS around 28 means the GPU handles peak workloads smoothly.",
        watchOut: isVi
          ? "Nếu thấy đỉnh độ trễ vọt gần hoặc vượt 100 ms kèm FPS tụt xuống dưới 15, cần kiểm tra tải GPU hoặc giảm số camera chạy cùng lúc trên 1 node."
          : "Latency spikes near/above 100 ms with FPS dropping below 15 signal GPU overload.",
      };

    case "governance":
    default:
      return {
        icon: Layers,
        title: isVi
          ? "Quản trị & Danh sách Phiên bản Mô hình AI"
          : "AI Model Governance & Registered Versions",
        subtitle: isVi
          ? "Quản lý lịch sử các bản nâng cấp AI và chuyển đổi nóng (Hot-swap)"
          : "Manage model releases and zero-downtime hot-swaps",
        simpleSummary: isVi
          ? "Bảng này giống như \"kho lưu trữ các phiên bản AI\" (v1.0.0, v3.0.0...). Bạn có thể so sánh độ chính xác (mAP@50), tốc độ (Độ trễ TB) giữa bản cũ và bản mới trước khi bấm Triển khai."
          : "An inventory of all registered AI model versions so you can compare accuracy and latency before deploying an upgrade.",
        howToRead: [
          {
            term: isVi ? "Đang phục vụ (DEPLOYED)" : "Serving Live (DEPLOYED)",
            meaning: isVi
              ? "Phiên bản đang chạy thực tế trên camera công trường."
              : "The version actively inspecting live streams.",
          },
          {
            term: "STAGING / CANDIDATE (DEVELOPMENT)",
            meaning: isVi
              ? "Phiên bản mới đã đăng ký và sẵn sàng kiểm thử/so sánh trước khi đưa ra thực tế."
              : "Candidate versions staged for evaluation prior to promotion.",
          },
          {
            term: isVi ? "Lưu trữ (ARCHIVED)" : "Archived (ARCHIVED)",
            meaning: isVi
              ? "Các phiên bản cũ trước đây, được giữ lại để đối chiếu hoặc quay lui khi cần."
              : "Older versions retained for history or rollback.",
          },
        ],
        realExample: isVi
          ? "Khi huấn luyện xong bản v3.1.0 có mAP@50 cao hơn bản v3.0.0, bạn chỉ cần bấm \"Triển khai\" — hệ thống thực hiện Hot-swap thay não AI mới mà không làm tắt camera."
          : "Once v3.1.0 proves more accurate than v3.0.0, click \"Deploy\" to hot-swap weights without stopping camera streams.",
        watchOut: isVi
          ? "Trước khi bấm Triển khai bản mới, hãy xem hộp thoại so sánh để chắc chắn mAP@50 tăng hoặc độ trễ không bị chậm đi quá mức."
          : "Always check the comparison dialog before deploying to verify mAP@50 and latency improvements.",
      };
  }
}

export interface AiMetricsGuideModalProps {
  openKey: AiCardGuideKey | null;
  onClose: () => void;
  performance?: AiPerformanceDto | null;
  activeVersion?: AiModelVersionDto | null;
  activeModelName?: string;
}

export function AiMetricsGuideModal({
  openKey,
  onClose,
  performance,
  activeVersion,
  activeModelName,
}: AiMetricsGuideModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const guide = openKey
    ? buildGuideContent(openKey, isVi, performance, activeVersion, activeModelName)
    : null;

  const Icon = guide?.icon ?? HelpCircle;

  return (
    <Dialog
      open={Boolean(openKey)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      icon={<Icon className="h-5 w-5 text-primary" />}
      title={guide?.title}
      description={guide?.subtitle}
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" variant="primary" onClick={onClose}>
            {isVi ? "Đã hiểu" : "Got it"}
          </Button>
        </div>
      }
    >
      {guide && (
        <div className="space-y-4 text-xs sm:text-[13px]">
          {/* Simple 1-sentence summary */}
          <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-3.5 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  {isVi ? "Nói đơn giản" : "In plain words"}
                </p>
                <p className="leading-relaxed font-medium text-foreground">
                  {guide.simpleSummary}
                </p>
              </div>
            </div>
          </div>

          {/* How to read terms */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{isVi ? "Cách đọc các thông số trên thẻ" : "How to read these numbers"}</span>
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {guide.howToRead.map((item) => (
                <div
                  key={item.term}
                  className="rounded-xl border border-border/40 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
                >
                  <p className="font-bold text-foreground">{item.term}</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    {item.meaning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-world example + Threshold */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{isVi ? "Ví dụ thực tế" : "Real-world example"}</span>
              </p>
              <p className="mt-1.5 leading-relaxed text-foreground">
                {guide.realExample}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{isVi ? "Ngưỡng đánh giá nhanh" : "When to take action"}</span>
              </p>
              <p className="mt-1.5 leading-relaxed text-foreground">
                {guide.watchOut}
              </p>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
