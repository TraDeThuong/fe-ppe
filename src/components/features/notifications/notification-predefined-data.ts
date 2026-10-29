import type { NotificationChannel, NotificationSeverity } from "@/types";
import type { SoundPreset } from "@/services/sound.service";

export type TemplateCategory = "PPE" | "INFRASTRUCTURE" | "SECURITY" | "OPERATIONS";

export interface PredefinedTemplateItem {
  code: string;
  name: string;
  nameEn: string;
  category: TemplateCategory;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  soundPreset: SoundPreset;
  subjectTemplate: string;
  contentTemplate: string;
  placeholders: Array<{
    key: string;
    label: string;
    labelEn: string;
    sample: string;
  }>;
  isSystem: boolean;
  description: string;
  descriptionEn: string;
}

export const TEMPLATE_CATEGORY_LABELS: Record<
  TemplateCategory,
  { vi: string; en: string; icon: string; color: string }
> = {
  PPE: {
    vi: "Giám sát & An toàn PPE",
    en: "PPE & Safety Monitoring",
    icon: "ShieldAlert",
    color: "rose",
  },
  INFRASTRUCTURE: {
    vi: "Hạ tầng Camera & AI",
    en: "Camera & AI Infrastructure",
    icon: "Camera",
    color: "amber",
  },
  SECURITY: {
    vi: "Bảo mật & Quản trị Danh tính",
    en: "Identity & Account Security",
    icon: "Lock",
    color: "sky",
  },
  OPERATIONS: {
    vi: "Báo cáo & Vận hành Hệ thống",
    en: "Reports & Site Operations",
    icon: "FileSpreadsheet",
    color: "emerald",
  },
};

export const PREDEFINED_SYSTEM_TEMPLATES: PredefinedTemplateItem[] = [
  // ── 1. GIÁM SÁT & AN TOÀN PPE ──────────────────────────────────────────────
  {
    code: "PPE_VIOLATION_ALERT",
    name: "Cảnh báo vi phạm trang bị bảo hộ PPE",
    nameEn: "PPE Safety Violation Alert",
    category: "PPE",
    channel: "IN_APP",
    severity: "CRITICAL",
    soundPreset: "critical",
    subjectTemplate: "🚨 CẢNH BÁO: Vi phạm trang bị bảo hộ PPE tại {{siteName}}",
    contentTemplate:
      "Phát hiện trường hợp vi phạm trang bị an toàn [{{violationType}}] tại khu vực {{zoneName}}, camera {{cameraCode}}. Đề nghị Cán bộ An toàn khẩn trương kiểm tra hiện trường và nhắc nhở công nhân.",
    placeholders: [
      { key: "siteName", label: "Tên công trường", labelEn: "Site Name", sample: "Công trường Landmark Tower B" },
      { key: "zoneName", label: "Khu vực / Tầng", labelEn: "Zone / Floor", sample: "Tầng 14 - Khu vực giàn giáo ngoài" },
      { key: "cameraCode", label: "Mã Camera", labelEn: "Camera Code", sample: "CAM-NORTH-04" },
      { key: "violationType", label: "Loại vi phạm", labelEn: "Violation Type", sample: "Thiếu nón bảo hộ (NO_HARDHAT)" },
      { key: "timestamp", label: "Thời điểm ghi nhận", labelEn: "Detection Timestamp", sample: "14:32:05 28/10/2026" },
    ],
    isSystem: true,
    description: "Kích hoạt tức thì khi AI phát hiện công nhân thiếu mũ bảo hộ, áo phản quang, găng tay hoặc kính an toàn.",
    descriptionEn: "Triggered instantly when AI camera detects safety equipment non-compliance.",
  },
  {
    code: "PPE_INCIDENT_ASSIGNED",
    name: "Phân công xử lý sự cố an toàn",
    nameEn: "Safety Incident Assigned",
    category: "PPE",
    channel: "EMAIL",
    severity: "HIGH",
    soundPreset: "warning",
    subjectTemplate: "📋 [Phân công] Bạn được chỉ định xử lý sự cố an toàn #{{incidentId}}",
    contentTemplate:
      "Xin chào {{assigneeName}}, bạn vừa được điều phối xử lý sự cố an toàn [{{incidentTitle}}] ghi nhận tại {{siteName}}. Vui lòng truy cập hệ thống để cập nhật tiến độ giải quyết.",
    placeholders: [
      { key: "assigneeName", label: "Họ tên người xử lý", labelEn: "Assignee Name", sample: "Nguyễn Văn Thắng" },
      { key: "incidentId", label: "Mã hồ sơ sự cố", labelEn: "Incident ID", sample: "INC-20261028-009" },
      { key: "incidentTitle", label: "Tiêu đề sự cố", labelEn: "Incident Title", sample: "Công nhân làm việc trên cao không móc dây đai" },
      { key: "siteName", label: "Tên công trường", labelEn: "Site Name", sample: "Khu công nghiệp VSIP II" },
      { key: "deadline", label: "Hạn xử lý", labelEn: "Resolution Deadline", sample: "17:00 28/10/2026" },
    ],
    isSystem: true,
    description: "Gửi email và in-app cho Cán bộ / Đội trưởng an toàn khi có hồ sơ sự cố mới được gán.",
    descriptionEn: "Dispatched to safety officers when a new incident ticket is assigned.",
  },
  {
    code: "PPE_INCIDENT_RESOLVED",
    name: "Sự cố an toàn đã được giải quyết",
    nameEn: "Safety Incident Resolved",
    category: "PPE",
    channel: "IN_APP",
    severity: "NORMAL",
    soundPreset: "success",
    subjectTemplate: "✅ Hồ sơ sự cố an toàn #{{incidentId}} đã hoàn tất xử lý",
    contentTemplate:
      "Sự cố an toàn [{{incidentTitle}}] tại {{siteName}} đã được cán bộ {{resolverName}} xác minh và khắc phục xong. Biên bản đã lưu vào hồ sơ kiểm toán.",
    placeholders: [
      { key: "incidentId", label: "Mã sự cố", labelEn: "Incident ID", sample: "INC-20261028-009" },
      { key: "incidentTitle", label: "Tiêu đề sự cố", labelEn: "Incident Title", sample: "Công nhân làm việc trên cao" },
      { key: "resolverName", label: "Người khắc phục", labelEn: "Resolved By", sample: "Trần Minh Quân" },
      { key: "siteName", label: "Tên công trường", labelEn: "Site Name", sample: "Nhà ga Metro số 1" },
    ],
    isSystem: true,
    description: "Thông báo hoàn thành quy trình xử lý sự cố an toàn cho các bên liên quan.",
    descriptionEn: "Notifies stakeholders when a reported safety violation has been inspected and resolved.",
  },
  {
    code: "PPE_SITE_ALERT_TRIGGERED",
    name: "Báo động mức an toàn toàn công trường",
    nameEn: "Site-wide Safety Risk Alert",
    category: "PPE",
    channel: "IN_APP",
    severity: "CRITICAL",
    soundPreset: "critical",
    subjectTemplate: "⚠️ BÁO ĐỘNG: Chỉ số rủi ro an toàn tại {{siteName}} vượt ngưỡng {{riskLevel}}",
    contentTemplate:
      "Hệ thống ghi nhận tỷ lệ vi phạm an toàn tăng đột biến ({{violationCount}} sự cố trong 60 phút qua) tại {{siteName}}. Đề nghị Trưởng ban chỉ huy an toàn kích hoạt quy trình thanh tra đột xuất.",
    placeholders: [
      { key: "siteName", label: "Tên công trường", labelEn: "Site Name", sample: "Khu liên hợp gang thép Dung Quất" },
      { key: "riskLevel", label: "Mức rủi ro", labelEn: "Risk Level", sample: "MỨC ĐỎ (BÁO ĐỘNG CẤP 3)" },
      { key: "violationCount", label: "Số vi phạm tích lũy", labelEn: "Violation Count", sample: "18" },
      { key: "timeWindow", label: "Khung thời gian", labelEn: "Time Window", sample: "60 phút qua" },
    ],
    isSystem: true,
    description: "Tự động kích hoạt khi mật độ vi phạm tại một công trường vượt ngưỡng an toàn trong ca làm việc.",
    descriptionEn: "Triggered when cumulative violation density exceeds threshold in a monitoring zone.",
  },

  // ── 2. HẠ TẦNG CAMERA & AI ────────────────────────────────────────────────
  {
    code: "CAMERA_OFFLINE_ALERT",
    name: "Camera giám sát mất kết nối luồng",
    nameEn: "Camera RTSP Stream Offline",
    category: "INFRASTRUCTURE",
    channel: "IN_APP",
    severity: "HIGH",
    soundPreset: "warning",
    subjectTemplate: "📹 Mất tín hiệu luồng RTSP: Camera {{cameraCode}} ngoại tuyến",
    contentTemplate:
      "Camera giám sát [{{cameraCode}} - {{cameraName}}] tại vị trí {{zoneName}} đã mất kết nối lúc {{timestamp}}. Quá trình phân tích AI tại khu vực này tạm thời bị gián đoạn.",
    placeholders: [
      { key: "cameraCode", label: "Mã Camera", labelEn: "Camera Code", sample: "CAM-ZONE-A-01" },
      { key: "cameraName", label: "Tên Camera", labelEn: "Camera Name", sample: "Camera Cổng số 2 - Cổng chính" },
      { key: "zoneName", label: "Vị trí lắp đặt", labelEn: "Installation Zone", sample: "Khu vực cổng kiểm soát ra vào" },
      { key: "timestamp", label: "Thời điểm mất tín hiệu", labelEn: "Offline Time", sample: "10:15:22 28/10/2026" },
    ],
    isSystem: true,
    description: "Cảnh báo khi dịch vụ camera-service không nhận được luồng video RTSP trong 30 giây liên tiếp.",
    descriptionEn: "Alerts when RTSP video feed fails for over 30 consecutive seconds.",
  },
  {
    code: "CAMERA_TAMPER_ALERT",
    name: "Phát hiện camera bị che khuất hoặc dịch chuyển",
    nameEn: "Camera Tampering / Occlusion Detected",
    category: "INFRASTRUCTURE",
    channel: "IN_APP",
    severity: "HIGH",
    soundPreset: "warning",
    subjectTemplate: "⚠️ Phát hiện camera {{cameraCode}} bị che khuất tầm nhìn",
    contentTemplate:
      "Ống kính camera [{{cameraCode}}] tại {{siteName}} bị phát hiện che tối hoặc dịch chuyển góc quan sát ngoài thông số cho phép lúc {{timestamp}}. Vui lòng kiểm tra hiện trường.",
    placeholders: [
      { key: "cameraCode", label: "Mã Camera", labelEn: "Camera Code", sample: "CAM-TOWER-02" },
      { key: "siteName", label: "Công trường", labelEn: "Site Name", sample: "Tháp B - Landmark" },
      { key: "timestamp", label: "Thời gian phát hiện", labelEn: "Timestamp", sample: "11:20:00 28/10/2026" },
    ],
    isSystem: true,
    description: "Cảnh báo bảo mật khi phát hiện vật cản che ống kính hoặc thay đổi góc quay vật lý.",
    descriptionEn: "Alerts when camera lens is obstructed or physical orientation shifts.",
  },
  {
    code: "AI_INFERENCE_DEGRADED",
    name: "Độ trễ xử lý AI vượt ngưỡng cảnh báo",
    nameEn: "AI Inference Latency Degraded",
    category: "INFRASTRUCTURE",
    channel: "IN_APP",
    severity: "NORMAL",
    soundPreset: "info",
    subjectTemplate: "🧠 Hiệu năng AI Service: Độ trễ khung hình {{latencyMs}}ms",
    contentTemplate:
      "Pipeline phân tích YOLO phát hiện độ trễ xử lý đạt {{latencyMs}}ms (vượt ngưỡng 150ms). Hệ thống tự động chuyển sang chế độ giảm tải (Frame Drop Guard) để đảm bảo độ ổn định.",
    placeholders: [
      { key: "latencyMs", label: "Độ trễ (ms)", labelEn: "Latency (ms)", sample: "215" },
      { key: "gpuUtilization", label: "Tải GPU", labelEn: "GPU Utilization", sample: "94%" },
      { key: "fps", label: "Tốc độ khung hình", labelEn: "Frame Rate", sample: "18 FPS" },
    ],
    isSystem: true,
    description: "Báo cáo nội bộ khi cụm AI Inference đạt tải cao hoặc trễ luồng xử lý nhận diện vật thể.",
    descriptionEn: "Internal operational report when YOLO model inference latency exceeds performance thresholds.",
  },

  // ── 3. BẢO MẬT & QUẢN TRỊ DANH TÍNH ───────────────────────────────────────
  {
    code: "VERIFY_EMAIL",
    name: "Xác thực địa chỉ email tài khoản",
    nameEn: "Account Email Verification",
    category: "SECURITY",
    channel: "EMAIL",
    severity: "NORMAL",
    soundPreset: "info",
    subjectTemplate: "Xác thực tài khoản Smart PPE Monitoring của bạn",
    contentTemplate:
      "Kính chào {{fullName}},\n\nCảm ơn bạn đã tham gia hệ thống Quản lý Giám sát An toàn Lao động Smart PPE. Vui lòng bấm vào liên kết dưới đây để kích hoạt tài khoản của bạn:\n\n{{verificationUrl}}\n\nLiên kết có hiệu lực trong vòng 24 giờ. Nếu bạn không tạo tài khoản này, vui lòng bỏ qua thư.",
    placeholders: [
      { key: "fullName", label: "Họ và tên", labelEn: "Full Name", sample: "Lê Hoàng Nam" },
      { key: "verificationUrl", label: "Đường dẫn xác thực", labelEn: "Verification URL", sample: "https://ppe.site/verify?token=xyz123" },
      { key: "expiresIn", label: "Thời hạn hiệu lực", labelEn: "Expires In", sample: "24 giờ" },
    ],
    isSystem: true,
    description: "Thư gửi kích hoạt tài khoản khi người dùng mới đăng ký hoặc cập nhật email.",
    descriptionEn: "Email dispatched when a user registers or updates their registered address.",
  },
  {
    code: "RESET_PASSWORD",
    name: "Yêu cầu đặt lại mật khẩu",
    nameEn: "Password Reset Request",
    category: "SECURITY",
    channel: "EMAIL",
    severity: "HIGH",
    soundPreset: "warning",
    subjectTemplate: "Yêu cầu đặt lại mật khẩu tài khoản Smart PPE",
    contentTemplate:
      "Chào {{fullName}},\n\nChúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này. Nhấn vào liên kết sau để thiết lập mật khẩu mới:\n\n{{resetUrl}}\n\nNếu bạn không thực hiện yêu cầu này, vui lòng liên hệ ngay Quản trị viên để bảo vệ tài khoản.",
    placeholders: [
      { key: "fullName", label: "Họ và tên", labelEn: "Full Name", sample: "Lê Hoàng Nam" },
      { key: "resetUrl", label: "Đường dẫn đặt lại", labelEn: "Reset Link", sample: "https://ppe.site/reset-password?token=abc456" },
      { key: "expiresIn", label: "Thời hạn hiệu lực", labelEn: "Expires In", sample: "15 phút" },
    ],
    isSystem: true,
    description: "Thư điện tử chứa mã token bảo mật để khôi phục mật khẩu tài khoản.",
    descriptionEn: "Security email containing one-time token to reset account password.",
  },
  {
    code: "NEW_DEVICE_ALERT",
    name: "Phát hiện đăng nhập từ thiết bị lạ",
    nameEn: "New Device Login Security Alert",
    category: "SECURITY",
    channel: "EMAIL",
    severity: "HIGH",
    soundPreset: "warning",
    subjectTemplate: "🛡️ Cảnh báo bảo mật: Phát hiện đăng nhập từ thiết bị mới",
    contentTemplate:
      "Tài khoản Smart PPE của bạn vừa đăng nhập từ thiết bị [{{deviceName}}], IP [{{ipAddress}}] tại [{{location}}] vào lúc {{timestamp}}. Nếu đây không phải là bạn, hãy đổi mật khẩu ngay lập tức.",
    placeholders: [
      { key: "deviceName", label: "Thiết bị & Trình duyệt", labelEn: "Device & Browser", sample: "Chrome trên Windows 11" },
      { key: "ipAddress", label: "Địa chỉ IP", labelEn: "IP Address", sample: "14.161.42.188" },
      { key: "location", label: "Vị trí ước tính", labelEn: "Estimated Location", sample: "TP. Hồ Chí Minh, Việt Nam" },
      { key: "timestamp", label: "Thời điểm đăng nhập", labelEn: "Login Time", sample: "08:14 28/10/2026" },
    ],
    isSystem: true,
    description: "Cảnh báo bảo mật chống chiếm quyền tài khoản khi phát hiện dấu hiệu đăng nhập bất thường.",
    descriptionEn: "Dispatched upon detection of unfamiliar browser fingerprint or IP address.",
  },
  {
    code: "ROLE_ASSIGNED",
    name: "Phân quyền vai trò người dùng thay đổi",
    nameEn: "User Role Assignment Updated",
    category: "SECURITY",
    channel: "IN_APP",
    severity: "NORMAL",
    soundPreset: "info",
    subjectTemplate: "🎖️ Vai trò của bạn đã được cập nhật thành: {{roleName}}",
    contentTemplate:
      "Tài khoản của bạn đã được Quản trị viên phân quyền vào vai trò [{{roleName}}] với {{permissionsCount}} quyền hạn. Vui lòng đăng nhập lại nếu quyền mới chưa có hiệu lực tức thời.",
    placeholders: [
      { key: "roleName", label: "Tên vai trò mới", labelEn: "New Role Name", sample: "SAFETY_MANAGER" },
      { key: "permissionsCount", label: "Số quyền hạn", labelEn: "Permissions Count", sample: "32" },
      { key: "assignedBy", label: "Người phê duyệt", labelEn: "Assigned By", sample: "Admin Hệ thống" },
    ],
    isSystem: true,
    description: "Thông báo cho nhân sự khi quyền truy cập hệ thống hoặc vai trò RBAC được thay đổi.",
    descriptionEn: "Notifies users when their system RBAC role or permissions are modified.",
  },

  // ── 4. BÁO CÁO & VẬN HÀNH HỆ THỐNG ─────────────────────────────────────────
  {
    code: "REPORT_EXPORT_READY",
    name: "Báo cáo an toàn định kỳ đã sẵn sàng tải xuống",
    nameEn: "Safety Analytics Report Export Ready",
    category: "OPERATIONS",
    channel: "IN_APP",
    severity: "NORMAL",
    soundPreset: "success",
    subjectTemplate: "📊 Báo cáo an toàn [{{reportType}}] đã được kết xuất thành công",
    contentTemplate:
      "File báo cáo định kỳ [{{reportFileName}}] cho giai đoạn {{dateRange}} tại {{siteName}} đã tạo xong. Bấm vào liên kết đính kèm để tải về máy tính.",
    placeholders: [
      { key: "reportType", label: "Loại báo cáo", labelEn: "Report Type", sample: "Báo cáo Tuân thủ PPE Tháng 10/2026" },
      { key: "reportFileName", label: "Tên tệp tin", labelEn: "File Name", sample: "PPE_Compliance_Oct_2026.xlsx" },
      { key: "siteName", label: "Công trường", labelEn: "Site Name", sample: "Tất cả công trường" },
      { key: "dateRange", label: "Khoảng thời gian", labelEn: "Date Range", sample: "01/10/2026 - 28/10/2026" },
      { key: "downloadUrl", label: "Đường dẫn tải", labelEn: "Download URL", sample: "/reports/downloads/rep-001" },
    ],
    isSystem: true,
    description: "Thông báo hoàn thành tác vụ trích xuất dữ liệu Excel/PDF nền từ reporting-service.",
    descriptionEn: "Alerts when asynchronous reporting worker completes XLSX or PDF generation.",
  },
  {
    code: "CUSTOM_BROADCAST",
    name: "Thông báo điều hành khẩn cấp toàn công trường",
    nameEn: "Site Management Urgent Broadcast",
    category: "OPERATIONS",
    channel: "IN_APP",
    severity: "CRITICAL",
    soundPreset: "radio",
    subjectTemplate: "📢 THÔNG BÁO KHẨN: {{broadcastTitle}}",
    contentTemplate:
      "Ban Chỉ huy An toàn Lao động phát thông báo khẩn cấp tới toàn thể cán bộ công nhân viên tại {{siteName}}:\n\n{{broadcastContent}}\n\nYêu cầu toàn bộ các đội thi công thực hiện nghiêm túc.",
    placeholders: [
      { key: "broadcastTitle", label: "Tiêu đề thông báo", labelEn: "Broadcast Title", sample: "Tạm dừng thi công trên cao do mưa dông giông lốc" },
      { key: "broadcastContent", label: "Nội dung chi tiết", labelEn: "Broadcast Content", sample: "Dự báo bão số 6, tất cả công nhân rút về nơi trú ẩn an toàn trước 15:30" },
      { key: "siteName", label: "Phạm vi công trường", labelEn: "Site Scope", sample: "Toàn bộ Phân khu A & B" },
      { key: "senderName", label: "Người phát lệnh", labelEn: "Issued By", sample: "Trưởng ban An toàn Bùi Tuấn Anh" },
    ],
    isSystem: true,
    description: "Mẫu điều hành phát sóng trực tiếp tới tất cả tài khoản đang trực tuyến trên toàn công trường.",
    descriptionEn: "Emergency broadcast message template for site managers to notify all active personnel.",
  },
];
