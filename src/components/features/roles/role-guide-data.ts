import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  Cctv,
  Cpu,
  LayoutDashboard,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Users,
  Webhook,
  Wrench,
} from "lucide-react";
import { hasRouteAccess, isAdminRole } from "@/config/navigation";
import type { RoleDto } from "@/types";

export interface PageAccessRule {
  title: string;
  route: string;
  icon: typeof LayoutDashboard;
  accessLevel: "full" | "manage" | "review" | "read" | "none";
  accessLabel: string;
  description: string;
}

export interface RoleKnowledgeProfile {
  title: string;
  securityLevel: string;
  mission: string;
  coreResponsibilities: string[];
  pageCapabilities: PageAccessRule[];
  securityGuardrails: string[];
}

interface RouteCapabilitySpec {
  route: string;
  icon: typeof LayoutDashboard;
  titleVi: string;
  titleEn: string;
  reviewPerms?: readonly string[];
  managePerms: readonly string[];
  fullDescVi: string;
  fullDescEn: string;
  readDescVi: string;
  readDescEn: string;
  noneDescVi: string;
  noneDescEn: string;
}

/**
 * Mô tả quyền thao tác trên từng trang. Điều kiện truy cập trang do hasRouteAccess quyết định.
 */
const SYSTEM_ROUTE_SPECS: readonly RouteCapabilitySpec[] = [
  {
    route: "/dashboard",
    icon: LayoutDashboard,
    titleVi: "Bảng điều khiển",
    titleEn: "Dashboard",
    managePerms: ["PPE_INCIDENT_MANAGE", "PPE_SITE_MANAGE", "SYSTEM_CONFIG_MANAGE"],
    fullDescVi:
      "Giám sát toàn bộ chỉ số KPI an toàn tổng hợp, tỷ lệ tuân thủ PPE đa công trường và cảnh báo thời gian thực.",
    fullDescEn:
      "Monitor aggregate safety KPIs, multi-site PPE compliance rates, and real-time operational alerts.",
    readDescVi:
      "Xem bảng tổng quan an toàn cá nhân, thông báo nhắc nhở và trạng thái hoạt động chung.",
    readDescEn:
      "View personal safety overview, reminders, and general operational status.",
    noneDescVi: "Không có quyền truy cập.",
    noneDescEn: "Access restricted.",
  },
  {
    route: "/cameras",
    icon: Cctv,
    titleVi: "Giám sát Camera AI",
    titleEn: "AI Camera Surveillance",
    managePerms: ["PPE_CAMERA_MANAGE"],
    fullDescVi:
      "Xem luồng trực tiếp, thêm/sửa camera RTSP, vẽ vùng ROI và điều khiển luồng nhận diện AI.",
    fullDescEn:
      "View live streams, configure RTSP cameras, draw ROI polygons, and control AI inference streams.",
    readDescVi:
      "Xem danh sách và luồng video giám sát camera AI tại các phân khu được phân công (chế độ chỉ đọc).",
    readDescEn:
      "Monitor AI camera feeds and status across assigned zones (read-only mode).",
    noneDescVi: "Chưa được cấp quyền PPE_CAMERA_READ để truy cập hệ thống camera.",
    noneDescEn: "Missing PPE_CAMERA_READ permission to access camera feeds.",
  },
  {
    route: "/incidents",
    icon: ShieldAlert,
    titleVi: "Sự cố An toàn PPE",
    titleEn: "PPE Safety Incidents",
    reviewPerms: ["PPE_INCIDENT_REVIEW", "PPE_INCIDENT_UPDATE"],
    managePerms: ["PPE_INCIDENT_MANAGE", "PPE_INCIDENT_DELETE"],
    fullDescVi:
      "Toàn quyền điều phối, phân công xử lý, phê duyệt đóng hồ sơ hoặc xóa các bản ghi sự cố vi phạm PPE.",
    fullDescEn:
      "Full authority to coordinate, assign, resolve, or delete PPE safety incident records.",
    readDescVi:
      "Tra cứu danh sách sự cố vi phạm PPE và bằng chứng hình ảnh AI ghi nhận.",
    readDescEn:
      "Inspect PPE violation incidents and AI-captured visual evidence.",
    noneDescVi: "Chưa được cấp quyền PPE_INCIDENT_READ để xem danh sách sự cố.",
    noneDescEn: "Missing PPE_INCIDENT_READ permission to view safety incidents.",
  },
  {
    route: "/sites",
    icon: Building2,
    titleVi: "Công trường & Vùng cấm",
    titleEn: "Sites & Restricted Areas",
    managePerms: [
      "PPE_SITE_MANAGE",
      "PPE_ZONE_MANAGE",
      "PPE_RESTRICTED_AREA_MANAGE",
      "PPE_SAFETY_CONFIG_MANAGE",
    ],
    fullDescVi:
      "Tạo và cấu hình công trường, phân khu thi công (Zones), vùng cấm và quy chuẩn đồ bảo hộ PPE.",
    fullDescEn:
      "Create and configure sites, construction zones, restricted areas, and PPE safety rules.",
    readDescVi:
      "Xem sơ đồ công trường, danh sách phân khu và quy định bảo hộ lao động hiện hành.",
    readDescEn:
      "View site layouts, construction zones, and active PPE safety requirements.",
    noneDescVi: "Chưa được cấp quyền PPE_SITE_READ để tra cứu công trường.",
    noneDescEn: "Missing PPE_SITE_READ permission to browse construction sites.",
  },
  {
    route: "/reports",
    icon: BarChart3,
    titleVi: "Báo cáo & Thống kê",
    titleEn: "Compliance Reports",
    managePerms: ["PPE_REPORTING_EXPORT"],
    fullDescVi:
      "Phân tích biểu đồ tuân thủ an toàn chuyên sâu và trích xuất báo cáo định kỳ (PDF/Excel/CSV).",
    fullDescEn:
      "Analyze safety compliance charts and export periodic audit reports (PDF/Excel/CSV).",
    readDescVi:
      "Xem thống kê và biểu đồ xu hướng vi phạm an toàn lao động trên giao diện web.",
    readDescEn:
      "View safety violation trends and compliance analytics dashboards.",
    noneDescVi: "Chưa được cấp quyền PPE_REPORTING_READ để xem báo cáo thống kê.",
    noneDescEn: "Missing PPE_REPORTING_READ permission to view compliance reports.",
  },
  {
    route: "/ai-metrics",
    icon: Cpu,
    titleVi: "Đo lường & Model AI",
    titleEn: "AI Metrics & Models",
    managePerms: ["PPE_MODEL_MANAGE"],
    fullDescVi:
      "Theo dõi hiệu năng nhận diện (mAP, FPS, độ trễ), quản lý phiên bản model và chạy AI Sandbox Test.",
    fullDescEn:
      "Monitor inference telemetry (mAP, FPS, latency), manage AI models, and run AI Sandbox tests.",
    readDescVi:
      "Xem các chỉ số đo lường độ chính xác và trạng thái vận hành của các mô hình thị giác máy tính.",
    readDescEn:
      "View accuracy telemetry and operational metrics of computer vision models.",
    noneDescVi: "Chưa được cấp quyền PPE_AI_METRICS_READ để truy cập đo lường AI.",
    noneDescEn: "Missing PPE_AI_METRICS_READ permission to view AI metrics.",
  },
  {
    route: "/users",
    icon: Users,
    titleVi: "Quản lý Người dùng",
    titleEn: "User Directory",
    managePerms: [
      "USER_CREATE",
      "USER_UPDATE",
      "USER_DELETE",
      "USER_RESTORE",
      "USER_ROLE_ASSIGN",
    ],
    fullDescVi:
      "Quản lý vòng đời tài khoản nhân sự: tạo mới, cập nhật, khóa/khôi phục, phân công công trường và gán vai trò.",
    fullDescEn:
      "Manage user account lifecycle: create, update, lock/restore, assign sites, and assign roles.",
    readDescVi:
      "Tra cứu danh bạ nhân sự, trạng thái hoạt động và thông tin liên hệ trong hệ thống.",
    readDescEn:
      "Browse workforce directory, account status, and contact information.",
    noneDescVi: "Chưa được cấp quyền USER_READ để truy cập danh bạ người dùng.",
    noneDescEn: "Missing USER_READ permission to access user directory.",
  },
  {
    route: "/roles",
    icon: ShieldCheck,
    titleVi: "Vai trò & Phân quyền",
    titleEn: "Roles & Permissions",
    managePerms: [
      "ROLE_CREATE",
      "ROLE_UPDATE",
      "ROLE_DELETE",
      "ROLE_PERMISSION_ASSIGN",
    ],
    fullDescVi:
      "Thiết lập vai trò tùy chỉnh, đồng bộ ma trận phân quyền RBAC và kiểm soát cơ chế chống tự khóa quyền.",
    fullDescEn:
      "Create custom roles, synchronize the RBAC permission matrix, and enforce anti-lockout controls.",
    readDescVi:
      "Xem danh mục vai trò và tra cứu cơ cấu phân quyền hiện hành trong hệ thống.",
    readDescEn:
      "View role catalog and inspect current RBAC permission assignments.",
    noneDescVi: "Chưa được cấp quyền ROLE_READ để xem cấu hình vai trò.",
    noneDescEn: "Missing ROLE_READ permission to view roles and permissions.",
  },
  {
    route: "/audit-logs",
    icon: ScrollText,
    titleVi: "Nhật ký Hệ thống",
    titleEn: "System Audit Logs",
    managePerms: ["AUDIT_LOG_EXPORT"],
    fullDescVi:
      "Tra soát toàn bộ lịch sử thao tác bảo mật kèm IP/User-Agent và xuất dữ liệu kiểm toán.",
    fullDescEn:
      "Inspect full security audit trail with IP/User-Agent metadata and export audit logs.",
    readDescVi:
      "Xem nhật ký kiểm toán hệ thống và lịch sử thay đổi dữ liệu quan trọng.",
    readDescEn:
      "View system audit trail and historical changes on sensitive resources.",
    noneDescVi: "Chưa được cấp quyền AUDIT_LOG_READ để tra cứu nhật ký kiểm toán.",
    noneDescEn: "Missing AUDIT_LOG_READ permission to inspect audit logs.",
  },
  {
    route: "/notifications",
    icon: Bell,
    titleVi: "Trung tâm Thông báo",
    titleEn: "Notification Center",
    managePerms: [
      "NOTIFICATION_CREATE",
      "NOTIFICATION_UPDATE",
      "NOTIFICATION_DELETE",
      "NOTIFICATION_TEMPLATE_MANAGE",
    ],
    fullDescVi:
      "Nhận cảnh báo cá nhân, phát thông báo diện rộng và quản lý mẫu thông báo tự động.",
    fullDescEn:
      "Receive personal alerts, broadcast announcements, and manage notification templates.",
    readDescVi:
      "Nhận và quản lý hộp thư thông báo, cảnh báo vi phạm PPE cá nhân theo thời gian thực.",
    readDescEn:
      "Receive and manage personal notifications and real-time PPE violation alerts.",
    noneDescVi: "Chưa được cấp quyền NOTIFICATION_READ để truy cập hộp thư thông báo.",
    noneDescEn: "Missing NOTIFICATION_READ permission to access notifications.",
  },
  {
    route: "/system",
    icon: Settings2,
    titleVi: "Cấu hình Hệ thống",
    titleEn: "System Settings",
    managePerms: ["SYSTEM_CONFIG_MANAGE"],
    fullDescVi: "Quản trị tham số hệ thống và các cờ tính năng.",
    fullDescEn: "Manage system parameters and feature flags.",
    readDescVi: "Xem cấu hình tham số vận hành hệ thống.",
    readDescEn: "View system configuration parameters.",
    noneDescVi: "Chưa được cấp quyền SYSTEM_CONFIG_READ để truy cập cấu hình hệ thống.",
    noneDescEn: "Missing SYSTEM_CONFIG_READ permission to access system settings.",
  },
  {
    route: "/scheduled-tasks",
    icon: CalendarClock,
    titleVi: "Tác vụ định kỳ",
    titleEn: "Scheduled Tasks",
    managePerms: ["CRON_JOB_MANAGE"],
    fullDescVi: "Cấu hình và quản lý các tác vụ định kỳ.",
    fullDescEn: "Configure and manage scheduled tasks.",
    readDescVi: "Xem danh sách và trạng thái các tác vụ định kỳ.",
    readDescEn: "View scheduled tasks and their status.",
    noneDescVi: "Chưa được cấp quyền CRON_JOB_READ để xem tác vụ định kỳ.",
    noneDescEn: "Missing CRON_JOB_READ permission to view scheduled tasks.",
  },
  {
    route: "/integrations",
    icon: Webhook,
    titleVi: "Tích hợp API Keys & Webhooks",
    titleEn: "API Keys & Webhooks Integration",
    managePerms: ["API_KEY_MANAGE", "WEBHOOK_MANAGE"],
    fullDescVi: "Quản lý khóa API hoặc cấu hình webhook theo quyền được cấp.",
    fullDescEn: "Manage API keys or configure webhooks according to granted permissions.",
    readDescVi: "Xem khóa API hoặc webhook theo quyền được cấp.",
    readDescEn: "View API keys or webhooks according to granted permissions.",
    noneDescVi: "Cần quyền API_KEY_READ hoặc WEBHOOK_READ để truy cập trang tích hợp.",
    noneDescEn: "Missing API_KEY_READ or WEBHOOK_READ permission to access integrations.",
  },
  {
    route: "/maintenance",
    icon: Wrench,
    titleVi: "Bảo trì Hệ thống",
    titleEn: "System Maintenance",
    managePerms: ["MAINTENANCE_MANAGE"],
    fullDescVi:
      "Kích hoạt/tắt chế độ bảo trì toàn hệ thống và cấu hình thông điệp bảo trì.",
    fullDescEn:
      "Toggle system-wide maintenance mode and configure notice banners.",
    readDescVi:
      "Xem trạng thái và lịch trình bảo trì định kỳ của hệ thống.",
    readDescEn:
      "View current maintenance status and scheduled maintenance windows.",
    noneDescVi: "Chưa được cấp quyền MAINTENANCE_READ hoặc MAINTENANCE_MANAGE.",
    noneDescEn: "Missing MAINTENANCE_READ or MAINTENANCE_MANAGE permission.",
  },
];

const SYSTEM_ROLE_META: Record<
  string,
  {
    titleVi: string;
    titleEn: string;
    levelVi: string;
    levelEn: string;
    missionVi: string;
    missionEn: string;
  }
> = {
  ADMIN: {
    titleVi: "Quản trị viên Hệ thống Cấp cao",
    titleEn: "Chief System Administrator",
    levelVi: "Cấp độ 1 — Toàn quyền Quản trị & Điều hành Hệ thống",
    levelEn: "Tier 1 — Full System Administration & Security Control",
    missionVi:
      "Chịu trách nhiệm tối cao về an ninh thông tin, tính sẵn sàng của hạ tầng AI, phân bổ người dùng và kiểm soát ma trận phân quyền RBAC toàn hệ thống Smart PPE.",
    missionEn:
      "Holds ultimate responsibility for information security, AI infrastructure availability, workforce provisioning, and RBAC governance across Smart PPE.",
  },
  SAFETY_MANAGER: {
    titleVi: "Chỉ huy Trưởng An toàn Công trường",
    titleEn: "Site Safety Manager",
    levelVi: "Cấp độ 2 — Quản trị Hiện trường & Giám sát AI",
    levelEn: "Tier 2 — Field Safety Management & AI Operations",
    missionVi:
      "Chịu trách nhiệm trực tiếp về quy chuẩn an toàn lao động PPE tại các dự án công trường, điều phối xử lý sự cố hiện trường và hiệu chỉnh camera AI.",
    missionEn:
      "Directly oversees PPE safety compliance across construction sites, coordinates incident response, and manages field AI cameras.",
  },
  SAFETY_OFFICER: {
    titleVi: "Cán bộ Giám sát An toàn Hiện trường",
    titleEn: "Field Safety Officer",
    levelVi: "Cấp độ 3 — Tác nghiệp Hiện trường & Xử lý Sự cố",
    levelEn: "Tier 3 — Field Inspection & Incident Resolution",
    missionVi:
      "Trực tiếp theo dõi cảnh báo vi phạm PPE theo thời gian thực, xác minh bằng chứng hình ảnh AI và cập nhật kết quả khắc phục tại hiện trường.",
    missionEn:
      "Monitors real-time PPE violation alerts, verifies AI visual evidence, and updates on-site corrective actions.",
  },
  MANAGER: {
    titleVi: "Quản lý Dự án & Điều hành",
    titleEn: "Project & Operations Manager",
    levelVi: "Cấp độ 3 — Giám sát Báo cáo & Điều hành",
    levelEn: "Tier 3 — Executive Reporting & Operational Oversight",
    missionVi:
      "Theo dõi bức tranh tổng thể về mức độ tuân thủ an toàn lao động giữa các công trường, trích xuất báo cáo phục vụ thanh tra và ra quyết định điều hành.",
    missionEn:
      "Oversees cross-site safety compliance trends, exports audit reports, and drives operational decision-making.",
  },
  USER: {
    titleVi: "Nhân sự / Công nhân Công trường",
    titleEn: "Standard Personnel / Site Worker",
    levelVi: "Cấp độ 4 — Quyền Truy cập Cơ bản (Least Privilege)",
    levelEn: "Tier 4 — Standard Least-Privilege Access",
    missionVi:
      "Tài khoản tiêu chuẩn dành cho nhân sự tham gia dự án, cho phép theo dõi thông báo an toàn cá nhân và tra cứu thông tin trong phạm vi được phân quyền.",
    missionEn:
      "Standard account for project personnel to receive personal safety notifications and view authorized information.",
  },
};

export function getRoleKnowledgeProfile(
  role: RoleDto | null | undefined,
  locale: "vi-VN" | "en-US",
): RoleKnowledgeProfile {
  const isEn = locale === "en-US";
  const roleName = role?.name || "USER";
  const isAdmin = isAdminRole(roleName);
  const permNames = new Set((role?.permissions || []).map((p) => p.name));
  const permissions = Array.from(permNames);
  const hasAny = (list?: readonly string[]) =>
    Boolean(list && list.some((p) => permNames.has(p)));

  // 1. Kiểm tra điều kiện truy cập trước khi phân loại quyền thao tác.
  const pageCapabilities: PageAccessRule[] = SYSTEM_ROUTE_SPECS.map((spec) => {
    const canAccess = hasRouteAccess(spec.route, permissions, roleName);

    let accessLevel: PageAccessRule["accessLevel"] = "none";
    let accessLabel = isEn ? "No Access" : "Không truy cập";
    let description = isEn ? spec.noneDescEn : spec.noneDescVi;

    if (canAccess && (isAdmin || hasAny(spec.managePerms))) {
      accessLevel = isAdmin ? "full" : "manage";
      accessLabel = isAdmin
        ? isEn
          ? "Full Access"
          : "Toàn quyền"
        : isEn
        ? "Manage"
        : "Quản lý & Cấu hình";
      description = isEn ? spec.fullDescEn : spec.fullDescVi;
    } else if (canAccess && hasAny(spec.reviewPerms)) {
      accessLevel = "review";
      accessLabel = isEn ? "Review & Update" : "Xử lý & Cập nhật";
      description = isEn ? spec.fullDescEn : spec.fullDescVi;
    } else if (canAccess) {
      accessLevel = "read";
      accessLabel = isEn ? "View Only" : "Chỉ xem";
      description = isEn ? spec.readDescEn : spec.readDescVi;
    }

    return {
      title: isEn ? spec.titleEn : spec.titleVi,
      route: spec.route,
      icon: spec.icon,
      accessLevel,
      accessLabel,
      description,
    };
  });

  const accessibleCount = pageCapabilities.filter(
    (p) => p.accessLevel !== "none",
  ).length;
  const manageCount = pageCapabilities.filter(
    (p) => p.accessLevel === "full" || p.accessLevel === "manage",
  ).length;

  // 2. Metadata tiêu đề, cấp độ an ninh & sứ mệnh
  const preset = SYSTEM_ROLE_META[roleName.toUpperCase()];
  const title = preset
    ? isEn
      ? preset.titleEn
      : preset.titleVi
    : isEn
    ? `Custom Role: ${role?.name || ""}`
    : `Vai trò tùy chỉnh: ${role?.name || ""}`;

  const securityLevel = preset
    ? isEn
      ? preset.levelEn
      : preset.levelVi
    : isEn
    ? `Custom RBAC Profile — ${permNames.size} active permissions (${accessibleCount}/${pageCapabilities.length} routes)`
    : `Hồ sơ RBAC tùy chỉnh — ${permNames.size} quyền thực thi (${accessibleCount}/${pageCapabilities.length} trang truy cập)`;

  const mission =
    role?.description?.trim() ||
    (preset
      ? isEn
        ? preset.missionEn
        : preset.missionVi
      : isEn
      ? "Dynamically configured role tailored to specific operational and security workflows."
      : "Vai trò tùy chỉnh được cấu hình động theo cơ cấu tổ chức và quy trình vận hành thực tế.");

  // 3. Trách nhiệm cốt lõi suy diễn từ quyền thực tế đang sở hữu
  const coreResponsibilities: string[] = [];
  if (isAdmin || hasAny(["ROLE_PERMISSION_ASSIGN", "USER_ROLE_ASSIGN", "USER_CREATE"])) {
    coreResponsibilities.push(
      isEn
        ? "Administer user accounts, role assignments, and RBAC permission boundaries."
        : "Quản trị tài khoản nhân sự, phân bổ vai trò và kiểm soát ma trận phân quyền RBAC.",
    );
  }
  if (isAdmin || hasAny(["PPE_INCIDENT_READ", "PPE_INCIDENT_REVIEW", "PPE_INCIDENT_MANAGE"])) {
    coreResponsibilities.push(
      isEn
        ? "Monitor, verify, and resolve AI-detected PPE safety violation incidents."
        : "Giám sát, xác minh bằng chứng AI và xử lý các sự cố vi phạm an toàn lao động PPE.",
    );
  }
  if (isAdmin || hasAny(["PPE_CAMERA_READ", "PPE_CAMERA_MANAGE", "PPE_SITE_READ", "PPE_SITE_MANAGE"])) {
    coreResponsibilities.push(
      isEn
        ? "Oversee construction sites, safety zones, restricted areas, and RTSP AI camera streams."
        : "Theo dõi công trường, phân khu thi công, vùng cấm và luồng camera AI giám sát hiện trường.",
    );
  }
  if (isAdmin || hasAny(["PPE_REPORTING_READ", "PPE_REPORTING_EXPORT", "PPE_AI_METRICS_READ"])) {
    coreResponsibilities.push(
      isEn
        ? "Analyze safety compliance statistics, AI model performance, and periodic audit reports."
        : "Phân tích thống kê tuân thủ an toàn, hiệu năng mô hình AI và trích xuất báo cáo định kỳ.",
    );
  }
  if (coreResponsibilities.length === 0) {
    coreResponsibilities.push(
      isEn
        ? "Access personal dashboard and notifications within least-privilege boundaries."
        : "Truy cập bảng điều khiển cá nhân và nhận thông báo an toàn theo nguyên tắc tối thiểu đặc quyền.",
    );
  }

  // 4. Rào chắn an ninh (Security Guardrails) theo trạng thái thực tế của Role
  const securityGuardrails: string[] = [];
  if (isAdmin) {
    securityGuardrails.push(
      isEn
        ? "Protected by Anti-Lockout: Core administrative permissions (ROLE_PERMISSION_ASSIGN) cannot be revoked."
        : "Được bảo vệ bởi cơ chế Anti-Lockout: Không thể thu hồi các quyền quản trị cốt lõi (ROLE_PERMISSION_ASSIGN) của ADMIN.",
    );
  } else if (role?.isSystem) {
    securityGuardrails.push(
      isEn
        ? "System role identifier is immutable and cannot be renamed or deleted."
        : "Định danh vai trò hệ thống là bất biến (Immutable), không thể đổi tên hoặc xóa khỏi cơ sở dữ liệu.",
    );
  } else {
    securityGuardrails.push(
      isEn
        ? "Custom role: Can only be deleted when no active user accounts are assigned to it."
        : "Vai trò tùy chỉnh: Chỉ cho phép xóa khi không còn tài khoản nhân sự nào đang được gán vai trò này.",
    );
  }

  securityGuardrails.push(
    isEn
      ? `Currently granted ${permNames.size} API permissions across ${accessibleCount}/${pageCapabilities.length} application routes (${manageCount} management routes).`
      : `Hiện đang được cấp ${permNames.size} mã quyền API trên ${accessibleCount}/${pageCapabilities.length} trang chức năng (${manageCount} trang có quyền quản lý).`,
  );

  securityGuardrails.push(
    isEn
      ? "Every permission sync or role assignment is permanently recorded in the Audit Trail with actor IP and timestamp."
      : "Mọi thao tác đồng bộ quyền hạn hoặc gán nhân sự đều được lưu vết kiểm toán (Audit Logs) kèm IP và thời gian thực.",
  );

  return {
    title,
    securityLevel,
    mission,
    coreResponsibilities,
    pageCapabilities,
    securityGuardrails,
  };
}
