import type {
  ServiceHealthItem,
  ServiceProbeFailureKind,
  SystemHealthReport,
} from "@/types";

export interface ServicePlaybook {
  impact: { vi: string; en: string };
  stillWorks: { vi: string; en: string };
  adminChecks: { vi: string[]; en: string[] };
  userActions: { vi: string[]; en: string[] };
  actionHref?: string;
  actionLabel?: { vi: string; en: string };
}

export interface ServiceGuidanceView {
  why: string;
  impact: string;
  stillWorks: string;
  steps: string[];
  actionHref?: string;
  actionLabel?: string;
}

const SERVICE_PLAYBOOKS: Record<string, ServicePlaybook> = {
  "ai-service": {
    impact: {
      vi: "Phân tích video AI trực tiếp và trang Kiểm thử mô hình AI tạm ngừng phản hồi.",
      en: "Live AI stream analysis and the AI Model Test sandbox are temporarily unavailable.",
    },
    stillWorks: {
      vi: "Xem danh sách sự cố PPE, duyệt cảnh báo cũ, quản lý camera và báo cáo vẫn hoạt động bình thường.",
      en: "Viewing PPE incidents, reviewing past alerts, managing cameras, and reports continue to work normally.",
    },
    userActions: {
      vi: [
        "Tiếp tục xem và duyệt các sự cố đã ghi nhận ở mục Sự cố hoặc Dashboard.",
        "Bấm Kiểm tra lại sau 30 giây nếu bộ phận kỹ thuật đang khởi động lại AI Engine.",
        "Nếu cần chạy AI trực tiếp ngay, hãy bấm Sao chép báo cáo gửi IT để được mở lại dịch vụ.",
      ],
      en: [
        "Continue reviewing recorded incidents in Incidents or Dashboard.",
        "Click Recheck after 30 seconds if IT is restarting the AI Engine.",
        "If live AI scanning is urgent, click Copy IT report and send it to support.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra tiến trình AI Engine (`uvicorn` / `smart-ppe-ai-service`) đang lắng nghe trên cổng :8000 hay chưa.",
        "Kiểm tra biến `AI_ENGINE_URL` trong `fe-ppe` nếu AI Engine chạy khác máy chủ.",
        "Mở trang Kiểm thử AI để xác nhận model YOLO đã nạp xong.",
      ],
      en: [
        "Verify the AI Engine process (`uvicorn` / `smart-ppe-ai-service`) is running on port :8000.",
        "Check `AI_ENGINE_URL` in `fe-ppe` if the AI Engine runs on another host.",
        "Open AI Model Test to confirm YOLO weights finished loading.",
      ],
    },
    actionHref: "/ai-metrics/test",
    actionLabel: { vi: "Mở Kiểm thử AI", en: "Open AI Test" },
  },
  "traefik-gateway": {
    impact: {
      vi: "Cổng điều phối API trung tâm bị gián đoạn — mọi thao tác tải dữ liệu, đăng nhập và lưu thay đổi có thể không thực hiện được.",
      en: "Central API gateway is interrupted — data loading, sign-in, and mutations may fail across modules.",
    },
    stillWorks: {
      vi: "Chỉ giao diện đã tải sẵn trên trình duyệt còn hiển thị; cần khôi phục Gateway để đồng bộ dữ liệu.",
      en: "Only already-loaded UI state remains visible until the gateway is restored.",
    },
    userActions: {
      vi: [
        "Không nhập hoặc lưu biểu mẫu quan trọng lúc này để tránh mất dữ liệu chưa gửi.",
        "Chờ 30 giây rồi bấm Kiểm tra lại (hoặc tải lại trang).",
        "Sao chép báo cáo sự cố và gửi ngay cho bộ phận vận hành / IT.",
      ],
      en: [
        "Avoid submitting critical forms until connectivity returns.",
        "Wait 30 seconds and click Recheck (or refresh the page).",
        "Copy the support report and escalate to IT operations immediately.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra container `app_gateway` (Traefik v3) và cổng `:80` / `:8080` trong `smart-ppe-infra`.",
        "Kiểm tra cấu hình router trong `traefik/dynamic.yml` và `NEXT_PUBLIC_API_BASE_URL`.",
      ],
      en: [
        "Check the `app_gateway` (Traefik v3) container and ports `:80` / `:8080` in `smart-ppe-infra`.",
        "Verify `traefik/dynamic.yml` routing rules and `NEXT_PUBLIC_API_BASE_URL`.",
      ],
    },
    actionHref: "/system?tab=health",
    actionLabel: { vi: "Xem Ma trận Hệ thống", en: "Open Health Matrix" },
  },
  "minio-storage": {
    impact: {
      vi: "Ảnh bằng chứng vi phạm PPE và tệp đính kèm có thể không tải lên hoặc không hiển thị được.",
      en: "PPE violation evidence images and stored media files may fail to load or upload.",
    },
    stillWorks: {
      vi: "Danh sách sự cố, số liệu KPI và quản lý người dùng/camera vẫn truy cập bình thường.",
      en: "Incident lists, KPI metrics, and camera/user management remain accessible.",
    },
    userActions: {
      vi: [
        "Vẫn có thể theo dõi danh sách và thống kê sự cố dạng văn bản.",
        "Tạm hoãn thao tác tải ảnh đại diện / xuất tệp mới và bấm Kiểm tra lại sau ít phút.",
        "Gửi báo cáo cho IT nếu ảnh bằng chứng bị lỗi hiển thị kéo dài.",
      ],
      en: [
        "You can still monitor incident records and statistics.",
        "Hold off uploading avatars or new media and click Recheck shortly.",
        "Send the copied IT report if evidence images remain unavailable.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra container MinIO (cổng `:9000` / `:9001`) và dung lượng ổ đĩa lưu trữ.",
        "Kiểm tra biến `MINIO_HEALTH_URL` nếu MinIO đặt ở host riêng.",
      ],
      en: [
        "Inspect the MinIO container (ports `:9000` / `:9001`) and storage disk usage.",
        "Verify `MINIO_HEALTH_URL` if MinIO runs on a separate host.",
      ],
    },
    actionHref: "/incidents",
    actionLabel: { vi: "Kiểm tra Sự cố", en: "Check Incidents" },
  },
  "postgres-db": {
    impact: {
      vi: "Cơ sở dữ liệu chính gián đoạn — hệ thống không thể đọc hoặc lưu thông tin tài khoản, camera và sự cố.",
      en: "Primary database is unreachable — reading or saving accounts, cameras, and incidents will fail.",
    },
    stillWorks: {
      vi: "Dữ liệu đang hiển thị chỉ là bản tạm trên màn hình; không nên thực hiện thay đổi mới.",
      en: "Only cached on-screen views remain; avoid making updates until restored.",
    },
    userActions: {
      vi: [
        "Tạm dừng thao tác cập nhật dữ liệu và chờ hệ thống tự khôi phục.",
        "Sao chép báo cáo gửi IT khẩn cấp để kiểm tra máy chủ dữ liệu.",
      ],
      en: [
        "Pause data edits until database connectivity recovers.",
        "Copy the support report and notify IT immediately.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra trạng thái container PostgreSQL (`:5432`) và kết nối readiness `/health/readiness` của `identity-service`.",
        "Kiểm tra connection pool, disk space và log lỗi Prisma/Postgres.",
      ],
      en: [
        "Check PostgreSQL (`:5432`) container health and `identity-service` `/health/readiness`.",
        "Inspect connection pool limits, disk space, and Postgres logs.",
      ],
    },
    actionHref: "/system?tab=health",
    actionLabel: { vi: "Xem Ma trận Hệ thống", en: "Open Health Matrix" },
  },
  "kafka-broker": {
    impact: {
      vi: "Kênh truyền sự kiện bất đồng bộ chậm hoặc gián đoạn — cảnh báo mới từ AI/Camera có thể trễ đồng bộ.",
      en: "Async event bus is impacted — newly detected AI/camera events may sync with delay.",
    },
    stillWorks: {
      vi: "Các thao tác xem dữ liệu và quản trị hiện có vẫn hoạt động bình thường.",
      en: "Existing dashboards, reviews, and admin screens continue operating.",
    },
    userActions: {
      vi: [
        "Kiểm tra lại sau 30 giây nếu không thấy cảnh báo mới cập nhật.",
        "Gửi báo cáo cho IT nếu tình trạng kéo dài.",
      ],
      en: [
        "Recheck in 30 seconds if new alerts are delayed.",
        "Send the IT report if delays persist.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra Kafka broker (`:9092`) và consumer lag của `incident-service` / `notification-service`.",
      ],
      en: [
        "Inspect Kafka broker (`:9092`) and consumer lag on incident/notification services.",
      ],
    },
  },
  "camera-service": {
    impact: {
      vi: "Danh sách camera, cấu hình luồng RTSP và trạng thái trực tuyến không tải được.",
      en: "Camera inventory, RTSP stream config, and live online statuses are unavailable.",
    },
    stillWorks: {
      vi: "Các sự cố đã lưu, báo cáo tổng hợp và quản trị tài khoản vẫn dùng bình thường.",
      en: "Stored incidents, reports, and user management remain available.",
    },
    userActions: {
      vi: [
        "Thử bấm Kiểm tra lại hoặc làm mới trang.",
        "Sao chép báo cáo gửi IT nếu trang Quản lý Camera không tải được.",
      ],
      en: [
        "Click Recheck or refresh the page.",
        "Copy the IT report if the Cameras page fails to load.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra container `camera-service` (`:8892`) và kết nối tới `camera_db`.",
      ],
      en: [
        "Check `camera-service` (`:8892`) container and `camera_db` connectivity.",
      ],
    },
    actionHref: "/cameras",
    actionLabel: { vi: "Mở trang Camera", en: "Open Cameras" },
  },
  "incident-service": {
    impact: {
      vi: "Không thể tải danh sách vi phạm mới, duyệt cảnh báo hoặc cập nhật xử lý sự cố.",
      en: "Cannot load new violations, review alerts, or update incident resolution.",
    },
    stillWorks: {
      vi: "Quản lý camera, công trường và kiểm tra hạ tầng vẫn hoạt động.",
      en: "Camera management, sites, and system diagnostics continue working.",
    },
    userActions: {
      vi: [
        "Chờ 30 giây và bấm Kiểm tra lại trước khi thực hiện duyệt/xử lý sự cố.",
        "Gửi báo cáo lỗi cho IT để khởi động lại dịch vụ sự cố.",
      ],
      en: [
        "Wait 30 seconds and Recheck before reviewing or resolving incidents.",
        "Send the copied IT report so the incident service can be restarted.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra container `incident-service` (`:8893`) và kết nối database sự cố.",
      ],
      en: [
        "Check `incident-service` (`:8893`) container and incident database health.",
      ],
    },
    actionHref: "/incidents",
    actionLabel: { vi: "Mở Sự cố", en: "Open Incidents" },
  },
  "notification-service": {
    impact: {
      vi: "Chuông thông báo realtime và cảnh báo tức thời qua WebSocket có thể không bật lên tự động.",
      en: "Realtime notification bell and live WebSocket alerts may not push automatically.",
    },
    stillWorks: {
      vi: "Mọi dữ liệu vẫn xem và xử lý bình thường bằng cách bấm Làm mới thủ công.",
      en: "All screens still work normally using manual refresh.",
    },
    userActions: {
      vi: [
        "Bấm nút Làm mới trên Dashboard định kỳ nếu cần theo dõi sự cố mới.",
        "Báo IT kiểm tra dịch vụ thông báo nếu chuông cảnh báo không cập nhật.",
      ],
      en: [
        "Use the Dashboard Refresh button periodically to fetch new incidents.",
        "Notify IT if realtime alerts stop arriving.",
      ],
    },
    adminChecks: {
      vi: [
        "Kiểm tra `notification-service` (`:8889`), Redis pub/sub và cấu hình WebSocket qua Traefik.",
      ],
      en: [
        "Inspect `notification-service` (`:8889`), Redis pub/sub, and Traefik WebSocket routing.",
      ],
    },
  },
};

const DEFAULT_PLAYBOOK: ServicePlaybook = {
  impact: {
    vi: "Tính năng phụ thuộc dịch vụ này tạm thời gián đoạn hoặc phản hồi chậm.",
    en: "Features backed by this service may be temporarily unavailable or slow.",
  },
  stillWorks: {
    vi: "Các phân hệ khác đang ở trạng thái Ổn định vẫn tiếp tục hoạt động bình thường.",
    en: "Other healthy modules continue operating normally.",
  },
  userActions: {
    vi: [
      "Bấm Kiểm tra lại sau 30 giây để xem dịch vụ đã tự khôi phục chưa.",
      "Sao chép báo cáo sự cố gửi IT nếu lỗi vẫn lặp lại.",
    ],
    en: [
      "Click Recheck in 30 seconds to see if the service recovered.",
      "Copy the IT report and share it with technical support if it persists.",
    ],
  },
  adminChecks: {
    vi: [
      "Kiểm tra log container và biến môi trường của dịch vụ tương ứng trên máy chủ.",
    ],
    en: [
      "Inspect container logs and environment settings for this service on the host.",
    ],
  },
};

export function formatServiceLatencyLabel(svc: ServiceHealthItem): string {
  if (svc.status === "DOWN") {
    const kind = svc.details?.failureKind as ServiceProbeFailureKind | undefined;
    if (kind === "TIMEOUT" || svc.latencyMs >= 2000) return "Timeout";
    return "--";
  }
  return `${svc.latencyMs}ms`;
}

export function explainProbeFailure(
  svc: ServiceHealthItem,
  locale: string,
): string {
  const isVi = locale === "vi-VN";
  if (svc.status === "HEALTHY") {
    return typeof svc.details?.note === "string"
      ? svc.details.note
      : isVi
        ? "Kết nối ổn định trong ngưỡng cho phép."
        : "Responding normally within threshold.";
  }
  if (svc.status === "DEGRADED") {
    return isVi
      ? `Phản hồi chậm (${svc.latencyMs}ms ≥ ${String(svc.details?.thresholdMs ?? 250)}ms). Hệ thống vẫn dùng được nhưng có thể tải chậm.`
      : `High latency (${svc.latencyMs}ms >= ${String(svc.details?.thresholdMs ?? 250)}ms). Usable, though responses may feel slow.`;
  }

  const kind = svc.details?.failureKind as ServiceProbeFailureKind | undefined;
  const rawReason =
    typeof svc.details?.reason === "string" ? svc.details.reason : "";

  switch (kind) {
    case "CONNECTION_REFUSED":
      return isVi
        ? `Không thể kết nối tới cổng :${svc.port} (dịch vụ chưa được khởi động hoặc đã dừng).`
        : `Cannot reach port :${svc.port} (service process is stopped or not listening).`;
    case "TIMEOUT":
      return isVi
        ? `Quá thời gian chờ phản hồi (> 2 giây) tại cổng :${svc.port} — dịch vụ có thể đang quá tải hoặc treo.`
        : `Health probe timed out (> 2s) on port :${svc.port} — service may be overloaded or stalled.`;
    case "HTTP_ERROR":
      return isVi
        ? `Dịch vụ có phản hồi nhưng trả mã lỗi (${rawReason || "HTTP error"}).`
        : `Service responded with an HTTP error (${rawReason || "HTTP error"}).`;
    case "PAYLOAD_UNHEALTHY":
      return isVi
        ? `Dịch vụ tự báo trạng thái chưa sẵn sàng (${rawReason || "unhealthy"}).`
        : `Service reported an unhealthy readiness state (${rawReason || "unhealthy"}).`;
    case "CORS_OR_NETWORK":
      return isVi
        ? "Trình duyệt không kết nối được do mạng hoặc chính sách bảo mật (CORS)."
        : "Browser request blocked by network or CORS policy.";
    default:
      return rawReason
        ? isVi
          ? `Không nhận được phản hồi hợp lệ (${rawReason}).`
          : `No valid response received (${rawReason}).`
        : isVi
          ? "Không thể kết nối tới dịch vụ."
          : "Unable to reach the service.";
  }
}

export function getServiceImpactGuidance(
  svc: ServiceHealthItem,
  options: { isAdmin: boolean; locale: string },
): ServiceGuidanceView {
  const isVi = options.locale === "vi-VN";
  const playbook = SERVICE_PLAYBOOKS[svc.serviceCode] ?? DEFAULT_PLAYBOOK;

  return {
    why: explainProbeFailure(svc, options.locale),
    impact: isVi ? playbook.impact.vi : playbook.impact.en,
    stillWorks: isVi ? playbook.stillWorks.vi : playbook.stillWorks.en,
    steps: options.isAdmin
      ? isVi
        ? [...playbook.adminChecks.vi, ...playbook.userActions.vi.slice(0, 1)]
        : [...playbook.adminChecks.en, ...playbook.userActions.en.slice(0, 1)]
      : isVi
        ? playbook.userActions.vi
        : playbook.userActions.en,
    actionHref: playbook.actionHref,
    actionLabel: playbook.actionLabel
      ? isVi
        ? playbook.actionLabel.vi
        : playbook.actionLabel.en
      : undefined,
  };
}

export function buildSystemHealthSupportReport(
  report: SystemHealthReport,
  locale: string,
): string {
  const isVi = locale === "vi-VN";
  const issues = report.services.filter((s) => s.status !== "HEALTHY");
  const lines = [
    isVi
      ? `[Smart PPE] Báo cáo trạng thái hệ thống (${report.checkedAt})`
      : `[Smart PPE] System Health Report (${report.checkedAt})`,
    isVi
      ? `Tổng quan: ${report.healthyCount}/${report.totalServices} dịch vụ ổn định (${report.overallStatus})`
      : `Overview: ${report.healthyCount}/${report.totalServices} services healthy (${report.overallStatus})`,
  ];

  if (issues.length > 0) {
    lines.push(isVi ? "Dịch vụ cần kiểm tra:" : "Affected services:");
    for (const svc of issues) {
      const reason =
        typeof svc.details?.reason === "string"
          ? svc.details.reason
          : svc.status;
      lines.push(
        `- ${svc.name} (${svc.serviceCode}, :${svc.port}): ${svc.status} — ${reason}`,
      );
    }
  }
  return lines.join("\n");
}
