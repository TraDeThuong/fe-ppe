"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Grid,
  HelpCircle,
  Layers,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelVersionDto } from "@/types";

export type AiCardGuideKey =
  | "active-model"
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
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.08] font-bold text-primary transition-all hover:bg-primary/15 hover:border-primary/40 active:translate-y-px shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] ${
        compact
          ? "h-7 w-7"
          : "h-8 w-8"
      } ${className}`}
    >
      <HelpCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span className="sr-only">{resolvedLabel}</span>
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
  activeVersion?: AiModelVersionDto | null,
  activeModelName?: string,
): GuideContent {
  switch (key) {
    case "active-model":
      return {
        icon: Cpu,
        title: isVi ? "Phiên bản được chọn trong Registry" : "Selected Registry Version",
        subtitle: isVi ? "Thông tin phiên bản đã đăng ký" : "Registered version details",
        simpleSummary: activeVersion
          ? (isVi
            ? `Registry đã chọn ${activeModelName ?? "mô hình"} phiên bản ${activeVersion.version}.`
            : `The Registry selected version ${activeVersion.version} of ${activeModelName ?? "the model"}.`)
          : (isVi ? "Banner hiển thị phiên bản được chọn khi có dữ liệu Registry." : "The banner shows the selected version when Registry data is available."),
        howToRead: [
          {
            term: isVi ? "Phiên bản và trọng số" : "Version and weights",
            meaning: isVi ? "Nhãn phiên bản và đường dẫn trọng số đã đăng ký." : "The registered version label and weights path.",
          },
          {
            term: isVi ? "Kiến trúc và kích thước đầu vào" : "Framework and input resolution",
            meaning: isVi ? "Định dạng mô hình và độ phân giải được lưu trong Registry." : "The model format and resolution recorded in the Registry.",
          },
          {
            term: isVi ? "Ngày chọn" : "Selected at",
            meaning: isVi ? "Thời điểm Registry ghi nhận lựa chọn." : "When the Registry recorded the selection.",
          },
        ],
        realExample: isVi ? "Bảng quản trị lưu các phiên bản cũ để đối chiếu." : "The governance table keeps prior versions for comparison.",
        watchOut: isVi ? "Trạng thái chạy trên camera cần xác nhận riêng từ AI Engine." : "Camera runtime status requires a separate confirmation from the AI Engine.",
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
          ? "Quản lý phiên bản và lựa chọn trong Registry"
          : "Manage model releases and selection in the Registry",
        simpleSummary: isVi
          ? "Bảng này giống như \"kho lưu trữ các phiên bản AI\" (v1.0.0, v3.0.0...). Bạn có thể so sánh độ chính xác (mAP@50), tốc độ (Độ trễ TB) giữa bản cũ và bản mới trước khi bấm Triển khai."
          : "An inventory of all registered AI model versions so you can compare accuracy and latency before deploying an upgrade.",
        howToRead: [
          {
            term: isVi ? "Đã chọn trong Registry (DEPLOYED)" : "Selected in Registry (DEPLOYED)",
            meaning: isVi
              ? "Phiên bản được chọn trong Registry cho mô hình tương ứng."
              : "The version selected in the Registry for that model.",
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
          ? "Sau khi so sánh hai phiên bản, bạn có thể chọn v3.1.0 trong Registry."
          : "After comparing the two versions, you can select v3.1.0 in the Registry.",
        watchOut: isVi
          ? "Hãy đối chiếu kết quả kiểm thử trong hộp so sánh trước khi cập nhật Registry."
          : "Review the benchmark comparison before updating the Registry.",
      };
  }
}

export interface AiMetricsGuideModalProps {
  openKey: AiCardGuideKey | null;
  onClose: () => void;
  activeVersion?: AiModelVersionDto | null;
  activeModelName?: string;
}

export function AiMetricsGuideModal({
  openKey,
  onClose,
  activeVersion,
  activeModelName,
}: AiMetricsGuideModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const guide = openKey
    ? buildGuideContent(openKey, isVi, activeVersion, activeModelName)
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
