"use client";

import { useState } from "react";
import {
  FormField,
  Input,
  Textarea,
  Label,
  FormMessage,
  PasswordInput,
  Checkbox,
  RadioGroup,
  Switch,
  Select,
  FormSection,
  FormActions,
} from "@ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/card";
import { Button } from "@ui/button";
import { showToast } from "@ui/toaster";
import {
  Mail,
  Lock,
  Building,
  Phone,
  Camera,
  ShieldCheck,
  User,
  KeyRound,
  Sparkles,
  Layers,
  CheckCircle,
} from "lucide-react";

export default function ComprehensiveFormPage() {
  // 1. State cho Auth Login Form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof loginErrors = {};

    if (!loginEmail.trim()) {
      errors.email = "Vui lòng nhập địa chỉ email!";
    } else if (!loginEmail.includes("@")) {
      errors.email = "Định dạng email không hợp lệ!";
    }

    if (!loginPassword.trim()) {
      errors.password = "Vui lòng nhập mật khẩu!";
    } else if (loginPassword.length < 6) {
      errors.password = "Mật khẩu tối thiểu 6 ký tự!";
    }

    setLoginErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsLoginSubmitting(true);
      setTimeout(() => {
        setIsLoginSubmitting(false);
        showToast("Đăng nhập thành công! Đang chuyển hướng...", "success");
      }, 1200);
    } else {
      showToast("Vui lòng kiểm tra lại thông tin đăng nhập!", "error");
    }
  };

  // 2. State cho Site Creation & Safety Form
  const [siteName, setSiteName] = useState("");
  const [phone, setPhone] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerRole, setManagerRole] = useState("supervisor");
  const [shift, setShift] = useState("all-day");
  const [enableCameraAI, setEnableCameraAI] = useState(true);
  const [description, setDescription] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSiteSubmitting, setIsSiteSubmitting] = useState(false);

  const [siteErrors, setSiteErrors] = useState<{
    siteName?: string;
    managerName?: string;
    description?: string;
    agreedTerms?: string;
  }>({});

  const handleSiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof siteErrors = {};

    if (!siteName.trim()) {
      errors.siteName = "Tên công trường là bắt buộc!";
    }
    if (!managerName.trim()) {
      errors.managerName = "Vui lòng nhập tên người phụ trách!";
    }
    if (!description.trim()) {
      errors.description = "Vui lòng nhập quy chuẩn bảo hộ an toàn bắt buộc!";
    }
    if (!agreedTerms) {
      errors.agreedTerms = "Bắt buộc đồng ý cam kết an toàn trước khi lưu!";
    }

    setSiteErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsSiteSubmitting(true);
      setTimeout(() => {
        setIsSiteSubmitting(false);
        showToast(`Đã lưu công trường "${siteName}" thành công!`, "success");
      }, 1500);
    } else {
      showToast("Vui lòng bổ sung các thông tin bị thiếu!", "error");
    }
  };

  const handleSimulateSiteErrors = () => {
    setSiteErrors({
      siteName: "Tên công trường đã trùng với dự án hiện hữu!",
      managerName: "Người phụ trách này đang điều hành công trường khác!",
      description: "Quy chuẩn an toàn phải có độ dài tối thiểu 20 ký tự!",
      agreedTerms: "Cần tích chọn cam kết an toàn lao động!",
    });
    showToast("Đã kích hoạt mô phỏng lỗi validation!", "error");
  };

  const handleClearSiteErrors = () => {
    setSiteErrors({});
    showToast("Đã xóa các cảnh báo lỗi", "blank");
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 pb-16">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Tổng hợp toàn diện
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            src/components/ui/form/
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Biểu mẫu Hoàn chỉnh (Form Orchestration)
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Ghép nối đồng bộ tất cả các tầng thành phần biểu mẫu: <strong className="text-foreground">FormField</strong> (bao bọc nhãn & lỗi),{" "}
          <strong className="text-foreground">FormSection</strong> (phân nhóm & chia lưới grid đáp ứng), và{" "}
          <strong className="text-foreground">FormActions</strong> (thanh nút bấm tích hợp xoay vòng `LoaderCircle` khi đang gửi dữ liệu).
        </p>
      </header>

      {/* 1. MÔ PHỎNG FORM ĐĂNG NHẬP (AUTH LOGIN FORM) */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            1. Mô phỏng Form Đăng nhập (Auth Login Form)
          </h2>
          <p className="text-sm text-muted-foreground">
            Sử dụng Input email, PasswordInput với nút mắt nổi Neumorphic, Checkbox ghi nhớ phiên và FormActions.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Card variant="raised" padding="lg">
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1 border-b border-border/60 pb-3 text-center">
                <h3 className="text-lg font-semibold tracking-tight">Đăng nhập tài khoản</h3>
                <p className="text-xs text-muted-foreground">
                  Hệ thống Giám sát & Quản lý An toàn Lao động Smart PPE
                </p>
              </div>

              {/* Email */}
              <FormField
                label="Địa chỉ Email"
                required
                helperText="Email công vụ đã được cấp quyền quản trị."
                error={loginErrors.email}
              >
                <Input
                  type="email"
                  prefix={<Mail />}
                  placeholder="admin@ppe.local"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </FormField>

              {/* Password */}
              <FormField
                label="Mật khẩu"
                required
                helperText="Tối thiểu 6 ký tự bảo mật."
                error={loginErrors.password}
              >
                <PasswordInput
                  prefix={<Lock />}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </FormField>

              {/* Ghi nhớ đăng nhập */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="remember-login"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                  />
                  <label
                    htmlFor="remember-login"
                    className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground"
                  >
                    Ghi nhớ đăng nhập
                  </label>
                </div>

                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast("Chức năng khôi phục mật khẩu qua email.", "blank");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Quên mật khẩu?
                </a>
              </div>

              {/* Nút hành động */}
              <FormActions
                isSubmitting={isLoginSubmitting}
                submitLabel="Đăng nhập ngay"
                submittingLabel="Đang xác thực..."
                className="pt-2 border-t-0"
              />
            </form>
          </Card>
        </div>
      </section>

      {/* 2. MÔ PHỎNG FORM TẠO CÔNG TRƯỜNG & CẤU HÌNH PPE (FULL DEMO) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Building className="size-5 text-primary" />
              2. Mô phỏng Form Tạo công trường & Cấu hình An toàn
            </h2>
            <p className="text-sm text-muted-foreground">
              Tổ chức quy mô lớn bằng `FormSection` đa cột và `FormActions` có nút Hủy.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulateSiteErrors}
            >
              Mô phỏng lỗi
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSiteErrors}
            >
              Xóa lỗi
            </Button>
          </div>
        </div>

        <Card variant="raised" padding="lg">
          <form onSubmit={handleSiteSubmit} className="flex flex-col gap-8">
            {/* Phân nhóm 1: Thông tin công trường */}
            <FormSection
              title="1. Thông tin định danh & Quản trị"
              description="Các thông số cơ bản phục vụ liên lạc và phân quyền giám sát."
              columns={2}
            >
              <FormField
                label="Tên công trường xây dựng"
                required
                helperText="Tên định danh hiển thị trên bản đồ số."
                error={siteErrors.siteName}
              >
                <Input
                  prefix={<Building />}
                  placeholder="VD: Cầu Mỹ Thuận 2 - Gói thầu XL-03"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </FormField>

              <FormField
                label="Hotline liên lạc khẩn cấp"
                helperText="Đường dây nóng kết nối với ban điều hành công trường."
              >
                <Input
                  type="tel"
                  prefix={<Phone />}
                  placeholder="0987 654 321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </FormField>

              <FormField
                label="Họ tên người phụ trách an toàn"
                required
                error={siteErrors.managerName}
              >
                <Input
                  prefix={<User />}
                  placeholder="Nguyễn Văn An"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                />
              </FormField>

              <FormField
                label="Cấp bậc phân quyền điều hành"
                helperText="Xác định quyền truy cập luồng camera AI."
              >
                <Select
                  value={managerRole}
                  onValueChange={setManagerRole}
                  options={[
                    { value: "supervisor", label: "Chỉ huy trưởng công trường" },
                    { value: "hse_manager", label: "Trưởng ban An toàn lao động (HSE)" },
                    { value: "site_inspector", label: "Cán bộ thanh tra hiện trường" },
                  ]}
                />
              </FormField>
            </FormSection>

            {/* Phân nhóm 2: Cấu hình giám sát */}
            <FormSection
              title="2. Cấu hình Camera AI & Khung giờ giám sát"
              description="Thiết lập tự động nhận diện vi phạm trang bị bảo hộ cá nhân."
              columns={1}
            >
              {/* Radio ca làm việc */}
              <div className="flex flex-col gap-2">
                <Label>Khung giờ áp dụng giám sát tự động:</Label>
                <RadioGroup
                  value={shift}
                  onValueChange={setShift}
                  orientation="horizontal"
                  options={[
                    { value: "all-day", label: "Toàn thời gian (24/7)" },
                    { value: "day-shift", label: "Ca ban ngày (07:00 - 18:00)" },
                    { value: "night-shift", label: "Ca ban đêm (18:00 - 06:00)" },
                  ]}
                />
              </div>

              {/* Switch kích hoạt AI */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-4 shadow-nm-inset">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background text-primary shadow-nm-sm">
                    <Camera className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Kích hoạt phân tích hình ảnh AI theo thời gian thực
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Phát hiện và chụp ảnh lưu trữ các trường hợp thiếu mũ bảo hộ hoặc áo phản quang.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableCameraAI}
                  onCheckedChange={setEnableCameraAI}
                  checkedLabel="BẬT"
                  uncheckedLabel="TẮT"
                />
              </div>
            </FormSection>

            {/* Phân nhóm 3: Quy định an toàn */}
            <FormSection
              title="3. Nội quy an toàn & Cam kết"
              description="Quy chế bắt buộc áp dụng cho toàn bộ công nhân ra vào công trường."
              columns={1}
            >
              <FormField
                label="Nội dung quy chuẩn bảo hộ bắt buộc"
                required
                helperText="Hỗ trợ tự động dãn nở chiều cao (auto-grow) khi gõ nhiều dòng."
                error={siteErrors.description}
              >
                <Textarea
                  autoGrow
                  rows={3}
                  minHeight={84}
                  maxHeight={220}
                  placeholder="Yêu cầu bắt buộc 100% công nhân: Đội mũ bảo hộ có quai, đeo kính chắn giọt bắn, mang giày mũi thép..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>

              {/* Checkbox cam kết */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="site-agreed-terms"
                    checked={agreedTerms}
                    onCheckedChange={setAgreedTerms}
                  />
                  <label
                    htmlFor="site-agreed-terms"
                    className="cursor-pointer text-sm font-medium text-foreground select-none"
                  >
                    Tôi xin cam đoan các thông tin trên là chính xác và chịu trách nhiệm đảm bảo an toàn thi công.
                  </label>
                </div>
                {siteErrors.agreedTerms && (
                  <FormMessage variant="error">{siteErrors.agreedTerms}</FormMessage>
                )}
              </div>
            </FormSection>

            {/* Thanh điều khiển FormActions */}
            <FormActions
              isSubmitting={isSiteSubmitting}
              submitLabel="Lưu cấu hình công trường"
              submittingLabel="Đang lưu dữ liệu..."
              cancelLabel="Hủy bỏ thay đổi"
              onCancel={() => {
                setSiteName("");
                setPhone("");
                setManagerName("");
                setDescription("");
                setAgreedTerms(false);
                setSiteErrors({});
                showToast("Đã hủy bỏ các thay đổi", "blank");
              }}
            />
          </form>
        </Card>
      </section>

      {/* 3. MỔ XẺ GIẢI PHẪU FORMFIELD (ANATOMY) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          3. Giải phẫu thành phần FormField (Anatomy)
        </h2>
        <Card variant="default" padding="md">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              `FormField` đóng vai trò là "chất keo" tự động sinh mã định danh duy nhất (`useId`), liên kết `Label` qua thuộc tính `htmlFor`,
              kết nối các dòng trợ giúp và báo lỗi qua `aria-describedby` và `aria-invalid` mà không cần viết mã thủ công:
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-nm-inset">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-2">
                  Trường hợp bình thường (Valid / Idle)
                </span>
                <FormField
                  label="Họ và tên kỹ sư"
                  required
                  helperText="Tên đầy đủ theo căn cước công dân."
                >
                  <Input placeholder="Nguyễn Văn A" />
                </FormField>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-nm-inset">
                <span className="text-xs font-semibold text-danger uppercase tracking-wider block mb-2">
                  Trường hợp có lỗi (Validation Error)
                </span>
                <FormField
                  label="Mã số chứng chỉ an toàn"
                  required
                  error="Mã chứng chỉ đã hết hiệu lực ngày 15/10/2026!"
                >
                  <Input defaultValue="PPE-CERT-9981" />
                </FormField>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
