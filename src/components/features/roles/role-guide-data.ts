import {
  BarChart3,
  Bell,
  Building2,
  Cctv,
  Cpu,
  LayoutDashboard,
  Lock,
  ScrollText,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
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

export const ROLE_KNOWLEDGE_VI: Record<string, RoleKnowledgeProfile> = {
  ADMIN: {
    title: "Quản trị viên Hệ thống Cấp cao",
    securityLevel: "Cấp độ 1 — Toàn quyền Quản trị & Điều hành Hệ thống",
    mission:
      "Chịu trách nhiệm tối cao về an ninh thông tin, tính sẵn sàng của hạ tầng AI, phân bổ người dùng và kiểm soát ma trận phân quyền RBAC toàn hệ thống Smart PPE.",
    coreResponsibilities: [
      "Quản lý toàn bộ vòng đời tài khoản người dùng, vai trò và phân bổ quyền truy cập API.",
      "Thiết lập cấu hình AI model, camera RTSP, ranh giới công trường và các vùng cấm nguy hiểm.",
      "Tra soát nhật ký kiểm toán (Audit Logs) và điều tra các sự cố an ninh nghiêm trọng.",
      "Quản trị tham số hệ thống, webhook thông báo và các tiến trình đồng bộ tự động.",
    ],
    pageCapabilities: [
      {
        title: "Bảng điều khiển",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Xem toàn bộ chỉ số KPI an toàn tổng hợp, tỷ lệ vi phạm của tất cả công trường, tình trạng phần cứng và cảnh báo thời gian thực.",
      },
      {
        title: "Giám sát Camera AI",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Thêm mới, cấu hình URL RTSP, vẽ vùng an toàn ROI, hiệu chỉnh ngưỡng nhận diện mũ/áo/găng tay và kiểm soát luồng AI streaming.",
      },
      {
        title: "Sự cố An toàn PPE",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Xem, gán người xử lý, cập nhật trạng thái vi phạm, xóa sự cố rác hoặc phê duyệt đóng các hồ sơ vi phạm an toàn.",
      },
      {
        title: "Công trường & Vùng cấm",
        route: "/sites",
        icon: Building2,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Tạo công trường mới, chia nhỏ các Zone thi công, thiết lập vùng cấm nghiêm ngặt (Restricted Areas) bắt buộc đồ bảo hộ.",
      },
      {
        title: "Báo cáo & Thống kê",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Xem biểu đồ tuân thủ quy chuẩn an toàn, xuất báo cáo tổng hợp định dạng PDF, Excel và CSV phục vụ thanh tra.",
      },
      {
        title: "Đo lường & Model AI",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Theo dõi chỉ số mAP, IoU, độ trễ xử lý khung hình (FPS) và điều phối các phiên bản mô hình thị giác máy tính.",
      },
      {
        title: "Quản lý Người dùng",
        route: "/users",
        icon: Users,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Tạo tài khoản công nhân, mở/khóa tài khoản nghỉ việc, đặt lại mật khẩu và cấp phát thiết bị bảo hộ thông minh.",
      },
      {
        title: "Vai trò & Phân quyền",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Cấu hình ma trận phân quyền chi tiết, tạo vai trò tùy chỉnh và duy trì cơ chế bảo vệ chống tự khóa quyền (Anti-lockout).",
      },
      {
        title: "Nhật ký Hệ thống",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Tra soát nhật ký bảo mật chi tiết theo thời gian thực: địa chỉ IP, tác nhân trình duyệt và thao tác thay đổi dữ liệu nhạy cảm.",
      },
      {
        title: "Trung tâm Thông báo",
        route: "/notifications",
        icon: Bell,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Gửi thông báo diện rộng (Broadcast), thiết lập kênh Webhook và quản lý các mẫu email cảnh báo tự động.",
      },
      {
        title: "Cấu hình Hệ thống",
        route: "/system",
        icon: Settings2,
        accessLevel: "full",
        accessLabel: "Toàn quyền",
        description:
          "Thiết lập tham số môi trường, khóa API keys, quản lý Feature Flags và kích hoạt/tạm dừng các tác vụ Cron nền.",
      },
    ],
    securityGuardrails: [
      "Được bảo vệ bởi cơ chế Anti-Lockout: Các quyền cốt lõi của ADMIN không thể bị thu hồi nhằm tránh mất quyền kiểm soát.",
      "Mọi thao tác thay đổi cấu hình bảo mật hoặc phân quyền đều được ghi vết kiểm toán vĩnh viễn.",
      "Bắt buộc kích hoạt xác thực hai lớp (2FA) để đảm bảo an toàn tuyệt đối cho tài khoản quản trị tối cao.",
    ],
  },

  SAFETY_MANAGER: {
    title: "Chỉ huy Trưởng An toàn Công trường",
    securityLevel: "Cấp độ 2 — Quản trị Hiện trường & Giám sát AI",
    mission:
      "Chịu trách nhiệm trực tiếp về quy chuẩn an toàn lao động PPE tại các dự án công trường, xử lý sự cố hiện trường và hiệu chỉnh camera AI.",
    coreResponsibilities: [
      "Quản lý các phân khu thi công (Zones), quy tắc an toàn và các khu vực có nguy cơ tai nạn cao.",
      "Thiết lập ngưỡng phát hiện vi phạm PPE (mũ bảo hộ, áo phản quang, giày, găng tay, khẩu trang).",
      "Gán cán bộ an toàn (Safety Officer) phụ trách các sự cố vi phạm và duyệt đóng hồ sơ xử lý.",
      "Xuất báo cáo định kỳ gửi ban chỉ huy công trình và cơ quan thanh tra an toàn lao động.",
    ],
    pageCapabilities: [
      {
        title: "Bảng điều khiển",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "manage",
        accessLabel: "Giám sát & Quản lý",
        description:
          "Theo dõi chỉ số an toàn hiện trường, biểu đồ vi phạm theo giờ và trạng thái kết nối các camera giám sát.",
      },
      {
        title: "Giám sát Camera AI",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "manage",
        accessLabel: "Quản lý hiện trường",
        description:
          "Xem luồng camera trực tiếp, cấu hình khu vực giám sát ROI và hiệu chỉnh độ nhạy phát hiện bảo hộ.",
      },
      {
        title: "Sự cố An toàn PPE",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "manage",
        accessLabel: "Toàn quyền xử lý",
        description:
          "Tiếp nhận, phân bổ người giải quyết, kiểm duyệt bằng chứng hình ảnh và phê duyệt hoàn tất xử lý vi phạm.",
      },
      {
        title: "Công trường & Vùng cấm",
        route: "/sites",
        icon: Building2,
        accessLevel: "manage",
        accessLabel: "Quản lý phân khu",
        description:
          "Thiết lập các phân khu công trường, quy chuẩn an toàn riêng cho từng vùng thi công và cấu hình cảnh báo vi phạm.",
      },
      {
        title: "Báo cáo & Thống kê",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "manage",
        accessLabel: "Tạo & Xuất báo cáo",
        description:
          "Khởi tạo và xuất báo cáo an toàn tổng hợp theo ca, tuần, tháng phục vụ họp giao ban công trường.",
      },
      {
        title: "Đo lường & Model AI",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "read",
        accessLabel: "Xem hiệu năng",
        description:
          "Đánh giá độ chính xác của mô hình nhận diện mũ/áo tại công trường để yêu cầu tinh chỉnh khi cần.",
      },
      {
        title: "Quản lý Người dùng",
        route: "/users",
        icon: Users,
        accessLevel: "read",
        accessLabel: "Tra cứu nhân sự",
        description:
          "Xem danh sách công nhân, liên hệ khẩn cấp và thông tin phân công lao động tại công trường.",
      },
      {
        title: "Vai trò & Phân quyền",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "Xem tài liệu",
        description:
          "Tra cứu cẩm nang quyền hạn và trách nhiệm của từng vị trí trong hệ thống.",
      },
      {
        title: "Nhật ký Hệ thống",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Chỉ dành riêng cho Quản trị viên cấp cao nhằm bảo vệ bí mật vận hành hệ thống.",
      },
      {
        title: "Trung tâm Thông báo",
        route: "/notifications",
        icon: Bell,
        accessLevel: "manage",
        accessLabel: "Nhận cảnh báo khẩn",
        description:
          "Nhận thông báo sự cố vi phạm nghiêm trọng và gửi thông báo nhắc nhở an toàn cho đội ngũ hiện trường.",
      },
      {
        title: "Cấu hình Hệ thống",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Chỉ dành riêng cho Quản trị viên điều hành hạ tầng kỹ thuật.",
      },
    ],
    securityGuardrails: [
      "Không thể tự ý thay đổi quyền hạn hoặc can thiệp vào các tài khoản quản trị hệ thống.",
      "Không có quyền can thiệp vào mã nguồn AI hoặc cấu hình API keys toàn hệ thống.",
      "Mọi quyết định phê duyệt sự cố đều được ghi nhận danh tính người duyệt phục vụ công tác thanh tra.",
    ],
  },

  SAFETY_OFFICER: {
    title: "Cán bộ Giám sát An toàn Trực ban",
    securityLevel: "Cấp độ 3 — Giám sát Hiện trường & Trực ban Cảnh báo",
    mission:
      "Trực ban theo dõi cảnh báo trực tiếp từ camera AI, xử lý vi phạm tại chỗ và ghi nhận hiện trường tuân thủ bảo hộ lao động.",
    coreResponsibilities: [
      "Theo dõi luồng camera trực tiếp tại các phân khu thi công được phân công ca trực.",
      "Tiếp nhận cảnh báo tức thời khi công nhân không đội mũ, không mặc áo phản quang.",
      "Đến hiện trường nhắc nhở, lập biên bản vi phạm và yêu cầu trang bị bảo hộ trước khi tiếp tục làm việc.",
      "Chụp ảnh bằng chứng khắc phục sự cố và cập nhật tiến độ giải quyết lên hệ thống.",
    ],
    pageCapabilities: [
      {
        title: "Bảng điều khiển",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "read",
        accessLabel: "Theo dõi trực ban",
        description:
          "Quan sát các sự cố vi phạm đang chờ xử lý, số camera hoạt động và các cảnh báo nguy cấp trong ca trực.",
      },
      {
        title: "Giám sát Camera AI",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "read",
        accessLabel: "Xem luồng trực tiếp",
        description:
          "Xem trực tiếp video camera với khung nhận diện AI (Bounding box) về mũ bảo hộ, áo và người vi phạm.",
      },
      {
        title: "Sự cố An toàn PPE",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "review",
        accessLabel: "Xử lý vi phạm",
        description:
          "Xem thông tin chi tiết sự cố, cập nhật trạng thái 'Đang xử lý', đính kèm ảnh hiện trường và hoàn tất khắc phục.",
      },
      {
        title: "Công trường & Vùng cấm",
        route: "/sites",
        icon: Building2,
        accessLevel: "read",
        accessLabel: "Tra cứu vùng",
        description:
          "Xem sơ đồ ranh giới công trường và danh sách các vùng cấm yêu cầu trang bị đồ bảo hộ nghiêm ngặt.",
      },
      {
        title: "Báo cáo & Thống kê",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "read",
        accessLabel: "Xem thống kê ca",
        description: "Xem thống kê các sự cố diễn ra trong ca làm việc phục vụ bàn giao ca.",
      },
      {
        title: "Đo lường & Model AI",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Khu vực kỹ thuật dành riêng cho quản trị viên AI.",
      },
      {
        title: "Quản lý Người dùng",
        route: "/users",
        icon: Users,
        accessLevel: "read",
        accessLabel: "Xác minh công nhân",
        description:
          "Tra cứu danh tính công nhân khi phát hiện vi phạm để ghi nhận biên bản xử lý vi phạm.",
      },
      {
        title: "Vai trò & Phân quyền",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "Xem tài liệu",
        description: "Xem tài liệu phân quyền hệ thống.",
      },
      {
        title: "Nhật ký Hệ thống",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Chỉ dành cho Quản trị viên cấp cao.",
      },
      {
        title: "Trung tâm Thông báo",
        route: "/notifications",
        icon: Bell,
        accessLevel: "read",
        accessLabel: "Nhận tin tức thời",
        description: "Nhận thông báo đẩy (Push notification) ngay khi camera AI phát hiện vi phạm.",
      },
      {
        title: "Cấu hình Hệ thống",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Chỉ dành cho Quản trị viên kỹ thuật.",
      },
    ],
    securityGuardrails: [
      "Không thể xóa sự cố khỏi hệ thống để ngăn chặn việc xóa dấu vết vi phạm.",
      "Không có quyền chỉnh sửa cấu hình camera hoặc tắt thuật toán AI phát hiện bảo hộ.",
      "Chỉ được phép cập nhật trạng thái các sự cố trong phạm vi công trường được phân công.",
    ],
  },

  MANAGER: {
    title: "Quản lý Điều hành & Nhân sự",
    securityLevel: "Cấp độ 3 — Điều hành Nhân sự & Báo cáo",
    mission:
      "Điều phối nhân sự nhà thầu, theo dõi chỉ số tuân thủ tổng thể và đảm bảo chính sách an toàn lao động trong toàn bộ tổ chức.",
    coreResponsibilities: [
      "Quản lý danh sách nhân sự nhà thầu phụ, phòng ban và phân bổ tài khoản làm việc.",
      "Đánh giá tỷ lệ tuân thủ quy chuẩn an toàn lao động của từng đơn vị thi công.",
      "Theo dõi lịch sử vi phạm để đưa ra các biện pháp đào tạo lại hoặc chế tài kỷ luật.",
      "Gửi thông báo định hướng an toàn lao động tới toàn thể cán bộ công nhân viên.",
    ],
    pageCapabilities: [
      {
        title: "Bảng điều khiển",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "read",
        accessLabel: "Tổng quan điều hành",
        description: "Xem biểu đồ tổng hợp mức độ tuân thủ an toàn và xếp hạng vi phạm theo nhà thầu.",
      },
      {
        title: "Giám sát Camera AI",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "read",
        accessLabel: "Tình trạng camera",
        description: "Kiểm tra mức độ phủ sóng camera và thời gian hoạt động của hệ thống.",
      },
      {
        title: "Sự cố An toàn PPE",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "read",
        accessLabel: "Hồ sơ vi phạm",
        description: "Tra cứu lịch sử vi phạm của từng cá nhân hoặc đội nhóm thi công.",
      },
      {
        title: "Công trường & Vùng cấm",
        route: "/sites",
        icon: Building2,
        accessLevel: "read",
        accessLabel: "Danh mục dự án",
        description: "Xem thông tin các dự án đang thi công và chỉ huy trưởng phụ trách.",
      },
      {
        title: "Báo cáo & Thống kê",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "manage",
        accessLabel: "Xuất dữ liệu",
        description: "Xuất báo cáo vi phạm an toàn định kỳ phục vụ đánh giá năng lực nhà thầu.",
      },
      {
        title: "Đo lường & Model AI",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Khu vực kỹ thuật AI.",
      },
      {
        title: "Quản lý Người dùng",
        route: "/users",
        icon: Users,
        accessLevel: "manage",
        accessLabel: "Quản trị nhân sự",
        description: "Tạo tài khoản mới, cập nhật hồ sơ công nhân, gán phòng ban và quản lý trạng thái tài khoản.",
      },
      {
        title: "Vai trò & Phân quyền",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "Xem tài liệu",
        description: "Tra cứu tài liệu phân quyền hệ thống.",
      },
      {
        title: "Nhật ký Hệ thống",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Chỉ dành riêng cho Quản trị viên hệ thống.",
      },
      {
        title: "Trung tâm Thông báo",
        route: "/notifications",
        icon: Bell,
        accessLevel: "manage",
        accessLabel: "Gửi thông báo",
        description: "Soạn thảo và gửi thông báo nhắc nhở tuân thủ bảo hộ cho toàn công trường.",
      },
      {
        title: "Cấu hình Hệ thống",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Chỉ dành riêng cho Quản trị viên kỹ thuật.",
      },
    ],
    securityGuardrails: [
      "Không có quyền cấp quyền quản trị cấp cao (Admin) cho người dùng.",
      "Không thể can thiệp vào các tham số phát hiện của camera AI hoặc xóa bỏ bằng chứng sự cố.",
      "Không có quyền truy cập vào các khóa API bí mật hoặc nhật ký kiểm toán hệ thống.",
    ],
  },

  USER: {
    title: "Thành viên & Công nhân Hiện trường",
    securityLevel: "Cấp độ 4 — Thành viên Tiêu chuẩn",
    mission:
      "Tham gia lao động sản xuất an toàn, tuân thủ nghiêm ngặt các quy định về trang bị bảo hộ cá nhân (mũ, áo, giày, găng tay) và theo dõi thông tin cá nhân.",
    coreResponsibilities: [
      "Luôn luôn trang bị đầy đủ đồ bảo hộ PPE khi làm việc trong các khu vực bắt buộc.",
      "Xem thông báo cá nhân về nhắc nhở an toàn hoặc các sự cố đã từng vi phạm.",
      "Kiểm tra và cập nhật thông tin liên lạc cá nhân, số điện thoại khẩn cấp.",
      "Nâng cao ý thức an toàn lao động và nhắc nhở đồng nghiệp cùng tuân thủ.",
    ],
    pageCapabilities: [
      {
        title: "Bảng điều khiển",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "read",
        accessLabel: "Thông tin chung",
        description: "Xem thông điệp an toàn trong ngày và khẩu hiệu an toàn lao động của dự án.",
      },
      {
        title: "Giám sát Camera AI",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Công nhân không có quyền truy cập xem luồng camera an ninh của công trường.",
      },
      {
        title: "Sự cố An toàn PPE",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "read",
        accessLabel: "Xem thông báo lỗi",
        description: "Xem các vi phạm của bản thân (nếu có) để rút kinh nghiệm và tuân thủ tốt hơn.",
      },
      {
        title: "Công trường & Vùng cấm",
        route: "/sites",
        icon: Building2,
        accessLevel: "read",
        accessLabel: "Nội quy vùng",
        description: "Xem sơ đồ thoát hiểm và biển báo quy định bảo hộ của từng khu vực.",
      },
      {
        title: "Báo cáo & Thống kê",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Dành riêng cho cấp quản lý.",
      },
      {
        title: "Đo lường & Model AI",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Dành riêng cho kỹ sư AI.",
      },
      {
        title: "Quản lý Người dùng",
        route: "/users",
        icon: Users,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Bảo mật danh tính nhân sự.",
      },
      {
        title: "Vai trò & Phân quyền",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "Xem hướng dẫn",
        description: "Đọc cẩm nang trách nhiệm và quyền hạn của mình trong hệ sinh thái an toàn.",
      },
      {
        title: "Nhật ký Hệ thống",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Dành riêng cho Quản trị viên cấp cao.",
      },
      {
        title: "Trung tâm Thông báo",
        route: "/notifications",
        icon: Bell,
        accessLevel: "read",
        accessLabel: "Hòm thư cá nhân",
        description: "Nhận thông báo nhắc nhở tuân thủ an toàn và các tin tức nội bộ công ty.",
      },
      {
        title: "Cấu hình Hệ thống",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "Không có quyền",
        description: "Dành riêng cho Quản trị viên kỹ thuật.",
      },
    ],
    securityGuardrails: [
      "Nguyên tắc đặc quyền tối thiểu: Chỉ có quyền đọc thông tin liên quan trực tiếp đến bản thân.",
      "Tuyệt đối không có quyền can thiệp vào dữ liệu, camera hay các tài khoản người dùng khác.",
      "Mọi hành vi đăng nhập trái phép sẽ bị hệ thống phát hiện và tạm khóa tài khoản.",
    ],
  },
};

export const ROLE_KNOWLEDGE_EN: Record<string, RoleKnowledgeProfile> = {
  ADMIN: {
    title: "Super System Administrator",
    securityLevel: "Level 1 — Full System Administration & Operational Authority",
    mission:
      "Holds supreme accountability for information security, AI infrastructure availability, personnel provisioning, and system-wide RBAC policy enforcement.",
    coreResponsibilities: [
      "Manage end-to-end user account lifecycle, role hierarchy, and API privilege allocation.",
      "Configure AI computer vision models, RTSP camera streams, site zones, and restricted hazardous areas.",
      "Review audit trails (Audit Logs) and investigate security anomalies.",
      "Administer runtime system parameters, notification webhooks, and automated background jobs.",
    ],
    pageCapabilities: [
      {
        title: "Dashboard",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Monitor aggregate safety KPIs, violation rates across all construction sites, hardware health, and real-time alerts.",
      },
      {
        title: "AI Camera Surveillance",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Add and configure RTSP feeds, delineate ROI safety zones, calibrate PPE detection thresholds (helmet/vest/gloves), and govern live streaming.",
      },
      {
        title: "PPE Safety Incidents",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Inspect, assign responders, update violation status, purge false alarms, and approve safety incident closures.",
      },
      {
        title: "Sites & Hazard Zones",
        route: "/sites",
        icon: Building2,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Provision construction sites, partition zones, and declare high-risk restricted zones requiring mandatory protective gear.",
      },
      {
        title: "Reports & Analytics",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Review compliance trends, export comprehensive audit reports in PDF, Excel, and CSV formats for regulatory compliance.",
      },
      {
        title: "AI Metrics & Models",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Inspect mAP, IoU, inference latency (FPS), and orchestrate vision model deployments.",
      },
      {
        title: "User Directory",
        route: "/users",
        icon: Users,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Provision worker accounts, lock/unlock accounts, reset credentials, and assign smart PPE equipment.",
      },
      {
        title: "Roles & Permissions",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Configure granular permission matrices, create custom roles, and uphold anti-lockout safeguards.",
      },
      {
        title: "Audit Trail",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Inspect tamper-proof operational audit trails with IP tracking, user agents, and sensitive action logs.",
      },
      {
        title: "Notification Center",
        route: "/notifications",
        icon: Bell,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Dispatch broadcast alerts, configure webhook notification channels, and manage email notification templates.",
      },
      {
        title: "System Administration",
        route: "/system",
        icon: Settings2,
        accessLevel: "full",
        accessLabel: "Full Access",
        description:
          "Fine-tune system environment parameters, API gateway keys, feature toggles, and scheduled background tasks.",
      },
    ],
    securityGuardrails: [
      "Protected by Anti-Lockout safeguards: Critical Admin permissions cannot be revoked.",
      "High-risk operational modifications are permanently recorded in the immutable audit log.",
      "Two-Factor Authentication (2FA) is strongly enforced for Super Administrator credentials.",
    ],
  },

  SAFETY_MANAGER: {
    title: "Site Safety Operations Manager",
    securityLevel: "Level 2 — Site Operations & AI Surveillance Administration",
    mission:
      "Responsible for field-level PPE compliance, incident remediation workflows, camera calibration, and site zone safety parameters.",
    coreResponsibilities: [
      "Oversee construction site zones, safety equipment rules, and restricted hazardous boundaries.",
      "Calibrate PPE detection thresholds (Hardhat, High-Vis Vest, Boots, Gloves, Masks).",
      "Assign duty safety officers to live incidents and approve formal remediation resolutions.",
      "Generate monthly safety audit reports for contractor leadership and labor inspectors.",
    ],
    pageCapabilities: [
      {
        title: "Dashboard",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "manage",
        accessLabel: "Operational",
        description:
          "View real-time safety KPIs, live violation trends, and camera operational statuses across assigned sites.",
      },
      {
        title: "AI Camera Surveillance",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "manage",
        accessLabel: "Management",
        description:
          "Configure camera zones, adjust detection sensitivity thresholds, and manage stream bindings.",
      },
      {
        title: "PPE Safety Incidents",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "manage",
        accessLabel: "Full Management",
        description:
          "Triage violations, delegate remediation tasks to field officers, and sign off on closed safety records.",
      },
      {
        title: "Sites & Hazard Zones",
        route: "/sites",
        icon: Building2,
        accessLevel: "manage",
        accessLabel: "Site Administration",
        description:
          "Define working zones, set safety compliance rules per zone, and configure warning thresholds.",
      },
      {
        title: "Reports & Analytics",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "manage",
        accessLabel: "Export & Generate",
        description:
          "Produce and export daily/weekly/monthly safety compliance summaries.",
      },
      {
        title: "AI Metrics & Models",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "read",
        accessLabel: "View Performance",
        description:
          "Inspect model accuracy scores and detection false-positive rates to request calibration.",
      },
      {
        title: "User Directory",
        route: "/users",
        icon: Users,
        accessLevel: "read",
        accessLabel: "Directory Lookup",
        description:
          "Look up worker profiles, emergency contacts, and assigned equipment.",
      },
      {
        title: "Roles & Permissions",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "View Only",
        description:
          "Consult the RBAC permission directory and capability guidelines.",
      },
      {
        title: "Audit Trail",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Access restricted to Super System Administrators.",
      },
      {
        title: "Notification Center",
        route: "/notifications",
        icon: Bell,
        accessLevel: "manage",
        accessLabel: "Operational Alerts",
        description:
          "Receive high-priority incident triggers and dispatch team-wide safety bulletins.",
      },
      {
        title: "System Administration",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Access restricted to Super System Administrators.",
      },
    ],
    securityGuardrails: [
      "Cannot delete or modify system-wide technical roles or grant unauthorized API scopes.",
      "Cannot access or alter core system environment configs or API gateway credentials.",
      "All incident approvals and zone rule changes are logged with timestamp and user ID.",
    ],
  },

  SAFETY_OFFICER: {
    title: "Duty Safety Inspector",
    securityLevel: "Level 3 — Field Surveillance & Real-Time Incident Triage",
    mission:
      "Conducts live monitoring, receives instant PPE violation alerts, verifies detector outputs, and executes immediate on-site safety intervention.",
    coreResponsibilities: [
      "Continuously monitor live video feeds from AI safety cameras across active site zones.",
      "Acknowledge instant PPE violation notifications, verify false alarms, and mark valid offenses.",
      "Directly intervene with non-compliant personnel on site to ensure immediate protective gear compliance.",
      "Record evidence photos, document incident details, and submit remediation reports.",
    ],
    pageCapabilities: [
      {
        title: "Dashboard",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "read",
        accessLabel: "Live Monitoring",
        description:
          "Track active incident counts, camera availability, and immediate hazard alerts.",
      },
      {
        title: "AI Camera Surveillance",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "read",
        accessLabel: "Live Stream Only",
        description:
          "View real-time camera video streams with bounding box overlays for helmets, vests, and gear.",
      },
      {
        title: "PPE Safety Incidents",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "review",
        accessLabel: "Incident Triage",
        description:
          "Review incoming alerts, confirm violations, attach corrective photos, and resolve field tickets.",
      },
      {
        title: "Sites & Hazard Zones",
        route: "/sites",
        icon: Building2,
        accessLevel: "read",
        accessLabel: "Zone Lookup",
        description:
          "View site maps and check required PPE specifications for each operational zone.",
      },
      {
        title: "Reports & Analytics",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "read",
        accessLabel: "View Shift Reports",
        description: "View daily shift incident summaries and violation breakdowns.",
      },
      {
        title: "AI Metrics & Models",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Not permitted to inspect AI infrastructure metrics.",
      },
      {
        title: "User Directory",
        route: "/users",
        icon: Users,
        accessLevel: "read",
        accessLabel: "Worker Verification",
        description:
          "Verify worker identities and check authorized site entry permits.",
      },
      {
        title: "Roles & Permissions",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "View Only",
        description: "Inspect assigned role duties and permissions guide.",
      },
      {
        title: "Audit Trail",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Access restricted to Super System Administrators.",
      },
      {
        title: "Notification Center",
        route: "/notifications",
        icon: Bell,
        accessLevel: "read",
        accessLabel: "Alert Stream",
        description: "Receive immediate push notifications when safety violations occur.",
      },
      {
        title: "System Administration",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Access restricted to Super System Administrators.",
      },
    ],
    securityGuardrails: [
      "Cannot delete incident tickets from the system to preserve audit integrity.",
      "Cannot modify camera RTSP connection strings or detection algorithm parameters.",
      "Cannot reconfigure site boundary geometry or zone risk classifications.",
    ],
  },

  MANAGER: {
    title: "Operations & HR Manager",
    securityLevel: "Level 3 — Personnel Operations & Compliance Reporting",
    mission:
      "Oversees workforce deployment, monitors subcontractor safety track records, and ensures health & safety regulatory compliance.",
    coreResponsibilities: [
      "Manage worker and contractor accounts, departmental assignments, and contact records.",
      "Analyze weekly and monthly safety compliance reports across all contractor teams.",
      "Track repeat PPE offenders to implement safety refresher training or disciplinary actions.",
      "Broadcast general workplace announcements and safety compliance guidelines.",
    ],
    pageCapabilities: [
      {
        title: "Dashboard",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "read",
        accessLabel: "Overview",
        description: "Review executive safety compliance scorecards and contractor performance metrics.",
      },
      {
        title: "AI Camera Surveillance",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "read",
        accessLabel: "Camera Health",
        description: "Check camera deployment coverage and uptime across job sites.",
      },
      {
        title: "PPE Safety Incidents",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "read",
        accessLabel: "Incident History",
        description: "Inspect resolved incident histories and individual worker compliance track records.",
      },
      {
        title: "Sites & Hazard Zones",
        route: "/sites",
        icon: Building2,
        accessLevel: "read",
        accessLabel: "Site Overview",
        description: "View construction site directories, project managers, and zone configurations.",
      },
      {
        title: "Reports & Analytics",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "manage",
        accessLabel: "Export Reports",
        description: "Generate and export workforce compliance summaries and violation frequency charts.",
      },
      {
        title: "AI Metrics & Models",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Access restricted to technical personnel.",
      },
      {
        title: "User Directory",
        route: "/users",
        icon: Users,
        accessLevel: "manage",
        accessLabel: "Workforce Management",
        description: "Add workers, edit profile information, assign departments, and maintain emergency contacts.",
      },
      {
        title: "Roles & Permissions",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "View Only",
        description: "Review role catalog and access privileges.",
      },
      {
        title: "Audit Trail",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Access restricted to Super System Administrators.",
      },
      {
        title: "Notification Center",
        route: "/notifications",
        icon: Bell,
        accessLevel: "manage",
        accessLabel: "Announcements",
        description: "Dispatch general announcements and workforce safety reminders.",
      },
      {
        title: "System Administration",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "Restricted",
        description: "Access restricted to Super System Administrators.",
      },
    ],
    securityGuardrails: [
      "Cannot assign administrator or privileged security roles to accounts.",
      "Cannot modify AI models, detection thresholds, or camera streaming streams.",
      "Cannot alter or delete recorded incident violation evidence photos.",
    ],
  },

  USER: {
    title: "Standard Worker / Member",
    securityLevel: "Level 4 — Standard Field Member",
    mission:
      "Frontline field worker or general system user accessing personal safety notifications, assigned gear records, and training material.",
    coreResponsibilities: [
      "Comply with mandatory PPE requirements (helmet, vest, boots, gloves) at all times on site.",
      "Review personal safety records and acknowledge violation warnings received.",
      "Update personal contact details and emergency contact records.",
      "Read workplace safety policies and protocol guidelines.",
    ],
    pageCapabilities: [
      {
        title: "Dashboard",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "read",
        accessLabel: "Personal View",
        description: "View company safety statistics and general safety announcements.",
      },
      {
        title: "AI Camera Surveillance",
        route: "/cameras",
        icon: Cctv,
        accessLevel: "none",
        accessLabel: "No Access",
        description: "Workers do not have direct access to camera video feeds.",
      },
      {
        title: "PPE Safety Incidents",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: "read",
        accessLabel: "Personal Records",
        description: "View self-related safety violation notifications and resolution notes.",
      },
      {
        title: "Sites & Hazard Zones",
        route: "/sites",
        icon: Building2,
        accessLevel: "read",
        accessLabel: "Site Safety Rules",
        description: "Check site maps, emergency exits, and zone gear requirements.",
      },
      {
        title: "Reports & Analytics",
        route: "/reports",
        icon: BarChart3,
        accessLevel: "none",
        accessLabel: "No Access",
        description: "Analytical exports restricted to management.",
      },
      {
        title: "AI Metrics & Models",
        route: "/ai-metrics",
        icon: Cpu,
        accessLevel: "none",
        accessLabel: "No Access",
        description: "Access restricted.",
      },
      {
        title: "User Directory",
        route: "/users",
        icon: Users,
        accessLevel: "none",
        accessLabel: "No Access",
        description: "User directory restricted to administrators and managers.",
      },
      {
        title: "Roles & Permissions",
        route: "/roles",
        icon: ShieldCheck,
        accessLevel: "read",
        accessLabel: "View Guidelines",
        description: "Read role responsibilities and permission documentation.",
      },
      {
        title: "Nhật ký Hệ thống",
        route: "/audit-logs",
        icon: ScrollText,
        accessLevel: "none",
        accessLabel: "No Access",
        description: "Access restricted.",
      },
      {
        title: "Trung tâm Thông báo",
        route: "/notifications",
        icon: Bell,
        accessLevel: "read",
        accessLabel: "Personal Inbox",
        description: "Receive personal alerts, violation notices, and safety reminders.",
      },
      {
        title: "Cấu hình Hệ thống",
        route: "/system",
        icon: Settings2,
        accessLevel: "none",
        accessLabel: "No Access",
        description: "Access restricted.",
      },
    ],
    securityGuardrails: [
      "Strict least-privilege: Read-only access to self-associated documents and notifications.",
      "Zero operational access to camera streams, system settings, or user management.",
      "Cannot modify safety thresholds or close violation records.",
    ],
  },
};

export function getRoleKnowledgeProfile(
  role: RoleDto | null | undefined,
  locale: "vi-VN" | "en-US",
): RoleKnowledgeProfile {
  const isEn = locale === "en-US";
  const dict = isEn ? ROLE_KNOWLEDGE_EN : ROLE_KNOWLEDGE_VI;

  if (!role) {
    return dict.USER;
  }

  const roleKey = role.name.toUpperCase();
  if (dict[roleKey]) {
    return dict[roleKey];
  }

  // Fallback for custom roles:
  const permNames = new Set((role.permissions || []).map((p) => p.name));
  const hasCamera = Array.from(permNames).some((p) => p.includes("CAMERA"));
  const hasIncident = Array.from(permNames).some((p) => p.includes("INCIDENT"));
  const hasUser = Array.from(permNames).some((p) => p.includes("USER"));

  if (isEn) {
    return {
      title: `Custom Role: ${role.name}`,
      securityLevel: "Custom Role — Tailored access defined by Administrator",
      mission:
        role.description ||
        "Custom role configured dynamically according to specific site workflow requirements.",
      coreResponsibilities: [
        "Execute authorized actions granted through the RBAC permission matrix.",
        "Comply with resource domain boundaries and endpoint policy constraints.",
      ],
      pageCapabilities: [
        {
          title: "Dashboard",
          route: "/dashboard",
          icon: LayoutDashboard,
          accessLevel: "read",
          accessLabel: "Permitted",
          description: "View aggregate safety metrics and operational dashboard overview.",
        },
        {
          title: "AI Camera Surveillance",
          route: "/cameras",
          icon: Cctv,
          accessLevel: hasCamera ? "manage" : "none",
          accessLabel: hasCamera ? "Authorized" : "No Access",
          description: hasCamera
            ? "Permitted to monitor and inspect field camera streams."
            : "No access granted to live surveillance streams.",
        },
        {
          title: "PPE Safety Incidents",
          route: "/incidents",
          icon: ShieldAlert,
          accessLevel: hasIncident ? "review" : "none",
          accessLabel: hasIncident ? "Incident Review" : "No Access",
          description: hasIncident
            ? "Permitted to view and update safety incident tickets."
            : "No access granted to incident management.",
        },
        {
          title: "User Directory",
          route: "/users",
          icon: Users,
          accessLevel: hasUser ? "manage" : "none",
          accessLabel: hasUser ? "User Directory" : "No Access",
          description: hasUser
            ? "Permitted to inspect workforce directory."
            : "No access granted to user accounts.",
        },
      ],
      securityGuardrails: [
        "Can only perform API endpoints with explicitly assigned permission scopes.",
        "Strictly restricted from privilege escalation to unauthorized resource domains.",
      ],
    };
  }

  return {
    title: `Vai trò tùy chỉnh: ${role.name}`,
    securityLevel: "Vai trò người dùng thiết lập riêng theo dự án",
    mission:
      role.description ||
      "Vai trò tùy chỉnh được cấu hình linh hoạt theo cơ cấu tổ chức riêng của công trường.",
    coreResponsibilities: [
      "Thực hiện các quyền hạn cụ thể đã được gán qua Ma trận phân quyền.",
      "Tuân thủ các giới hạn truy cập được quy định trên từng phân hệ tài nguyên.",
    ],
    pageCapabilities: [
      {
        title: "Bảng điều khiển",
        route: "/dashboard",
        icon: LayoutDashboard,
        accessLevel: "read",
        accessLabel: "Được phép xem",
        description: "Xem các thông tin chỉ số an toàn chung trên hệ thống.",
      },
      {
        title: "Giám sát Camera AI",
        route: "/cameras",
        icon: Cctv,
        accessLevel: hasCamera ? "manage" : "none",
        accessLabel: hasCamera ? "Được phân quyền" : "Không có quyền",
        description: hasCamera
          ? "Được phép truy cập và giám sát các luồng camera hiện trường."
          : "Chưa được cấp quyền truy cập camera giám sát.",
      },
      {
        title: "Sự cố An toàn PPE",
        route: "/incidents",
        icon: ShieldAlert,
        accessLevel: hasIncident ? "review" : "none",
        accessLabel: hasIncident ? "Xử lý sự cố" : "Không có quyền",
        description: hasIncident
          ? "Được phép xem và cập nhật hồ sơ các sự cố vi phạm an toàn."
          : "Không có quyền thao tác trên danh sách sự cố.",
      },
      {
        title: "Quản lý Người dùng",
        route: "/users",
        icon: Users,
        accessLevel: hasUser ? "manage" : "none",
        accessLabel: hasUser ? "Quản lý nhân sự" : "Không có quyền",
        description: hasUser
          ? "Được phép tra cứu và hỗ trợ quản lý tài khoản người dùng."
          : "Không có quyền xem hoặc thao tác trên danh sách nhân sự.",
      },
    ],
    securityGuardrails: [
      "Chỉ thực hiện được các API endpoints đã được gán mã quyền cụ thể.",
      "Không thể tự ý vượt quyền truy cập sang các nhóm tài nguyên chưa được phê duyệt.",
    ],
  };
}
