"use client";

import { useState } from "react";
import { Button } from "@ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/card";
import { showToast, toast } from "@ui/toaster";

const toastSamples = [
  {
    type: "success" as const,
    label: "Thành công (Success)",
    desc: "Dùng khi tác vụ hoàn thành tốt đẹp (đăng nhập, lưu dữ liệu, đổi mật khẩu...). Tự đóng sau 3s.",
    message: "Đăng nhập thành công! Đang chuyển hướng...",
    accentColor: "border-l-[#6b8e45] text-[#6b8e45]",
    btnVariant: "primary" as const,
    icon: "✓",
  },
  {
    type: "error" as const,
    label: "Báo lỗi (Error)",
    desc: "Dùng khi có lỗi nghiệp vụ hoặc mạng (mật khẩu sai, tài khoản bị khoá, 500...). Tự đóng sau 5s.",
    message: "Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
    accentColor: "border-l-[#c65c50] text-[#c65c50]",
    btnVariant: "danger" as const,
    icon: "×",
  },
  {
    type: "loading" as const,
    label: "Đang tải (Loading)",
    desc: "Dùng cho các tác vụ bất đồng bộ lâu. Không tự đóng (duration = Infinity), cần gọi dismiss.",
    message: "Đang đồng bộ dữ liệu cảm biến và thiết bị PPE...",
    accentColor: "border-l-[#8a9569] text-[#8a9569]",
    btnVariant: "secondary" as const,
    icon: "◌",
  },
  {
    type: "blank" as const,
    label: "Thông tin chung (Blank / Info)",
    desc: "Dùng cho cảnh báo thông tin thông thường hoặc hướng dẫn. Tự đóng sau 4s.",
    message: "Hệ thống sẽ tiến hành bảo trì định kỳ sau 15 phút.",
    accentColor: "border-l-[#8a9569] text-[#8a9569]",
    btnVariant: "outline" as const,
    icon: "i",
  },
];

export default function ToastPage() {
  const [customText, setCustomText] = useState(
    "Thông báo thử nghiệm với nội dung tuỳ chỉnh từ người dùng!"
  );
  const [customType, setCustomType] = useState<
    "success" | "error" | "loading" | "blank"
  >("success");
  const [activeLoadingId, setActiveLoadingId] = useState<string | null>(null);

  const handleTriggerToast = (
    message: string,
    type: "success" | "error" | "loading" | "blank"
  ) => {
    const id = showToast(message, type);
    if (type === "loading" && typeof id === "string") {
      setActiveLoadingId(id);
    }
  };

  const handleDismissLoading = () => {
    if (activeLoadingId) {
      toast.dismiss(activeLoadingId);
      setActiveLoadingId(null);
    } else {
      toast.dismiss();
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      {/* Tiêu đề & Giới thiệu */}
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Toast Notification</h1>
        <p className="text-muted-foreground leading-relaxed">
          Thành phần thông báo dạng Toast theo ngôn ngữ thiết kế{" "}
          <strong className="text-foreground font-semibold">Neumorphic & Wooden</strong>.
          Hỗ trợ hiệu ứng 3D khối viền, góc thả động (drop animation), tự động thích ứng với cả 2 chế độ{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            Light
          </code>{" "}
          và{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            Dark
          </code>
          .
        </p>
      </header>

      {/* Khu vực bấm thử tương tác trực tiếp */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Thử nghiệm tương tác
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.dismiss()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Đóng tất cả toast
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {toastSamples.map((sample) => (
            <Card key={sample.type} variant="raised" padding="md">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-md border text-xs font-bold ${
                        sample.type === "success"
                          ? "border-[#6b8e45]/30 bg-[#6b8e45]/10 text-[#6b8e45]"
                          : sample.type === "error"
                          ? "border-[#c65c50]/30 bg-[#c65c50]/10 text-[#c65c50]"
                          : "border-[#8a9569]/30 bg-[#8a9569]/10 text-[#8a9569]"
                      }`}
                    >
                      {sample.icon}
                    </span>
                    {sample.label}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs pt-1">
                  {sample.desc}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex flex-col gap-3">
                <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground italic border border-border/60">
                  &ldquo;{sample.message}&rdquo;
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant={sample.btnVariant}
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      handleTriggerToast(sample.message, sample.type)
                    }
                  >
                    Bấm hiện {sample.type} toast
                  </Button>
                  {sample.type === "loading" && activeLoadingId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDismissLoading}
                      title="Dừng loading toast đang mở"
                    >
                      Dừng
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Khu vực tạo toast với nội dung tuỳ ý */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Tuỳ chỉnh nội dung thông báo
        </h2>
        <Card variant="default" padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="toast-custom-input"
                className="text-sm font-medium"
              >
                Nhập nội dung thông báo:
              </label>
              <input
                id="toast-custom-input"
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Nhập thông điệp hiển thị..."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-nm-inset"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Trạng thái:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(["success", "error", "loading", "blank"] as const).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCustomType(type)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          customType === type
                            ? "bg-primary text-primary-foreground shadow-nm-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleTriggerToast(customText, customType)}
                >
                  Bắn Toast ngay
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Bảng xem trước trực quan (Static Showcase) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Xem trước các biến thể (Preview cố định)
        </h2>
        <p className="text-sm text-muted-foreground">
          Bản dựng trực tiếp của các thẻ thông báo để bạn có thể quan sát kỹ
          chi tiết viền vân khối gỗ, bóng đổ Neumorphic và biểu tượng ở cả hai
          chế độ Sáng và Tối (hãy thử bấm icon Mặt trăng/Mặt trời trên thanh menu
          để xem đổi màu).
        </p>

        <div className="grid gap-6 rounded-2xl border border-border bg-muted/30 p-8 sm:grid-cols-2">
          {toastSamples.map((sample) => (
            <div
              key={sample.type}
              className="flex flex-col gap-2 items-start"
            >
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Biến thể: {sample.type}
              </span>

              {/* Mô phỏng khung toast cố định */}
              <div
                className="relative flex w-full max-w-[360px] items-center gap-3 overflow-hidden rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-nm transition-colors"
                style={{
                  borderLeft: `3px solid ${
                    sample.type === "success"
                      ? "#6b8e45"
                      : sample.type === "error"
                      ? "#c65c50"
                      : "#8a9569"
                  }`,
                }}
              >
                <div
                  className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-lg font-semibold shadow-nm-sm"
                  style={{
                    color:
                      sample.type === "success"
                        ? "#6b8e45"
                        : sample.type === "error"
                        ? "#c65c50"
                        : "#8a9569",
                  }}
                >
                  {sample.type === "loading" ? (
                    <span className="animate-spin">{sample.icon}</span>
                  ) : (
                    sample.icon
                  )}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="break-words text-[13px] font-medium leading-relaxed">
                    {sample.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hướng dẫn tích hợp nhanh */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Cách sử dụng trong Code
        </h2>
        <Card variant="inset" padding="md">
          <div className="space-y-4 text-xs font-mono">
            <div>
              <p className="text-muted-foreground font-sans text-sm mb-1.5">
                1. Gọi thông báo tại bất kỳ component, hook hoặc service nào:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-card p-3 border border-border text-foreground">
{`import { showToast, toast } from "@ui/toaster";

// Thành công
showToast("Cập nhật thành công!", "success");

// Báo lỗi
showToast("Đã có lỗi xảy ra!", "error");

// Đang xử lý
const id = showToast("Đang tải dữ liệu...", "loading");
// Khi xong:
toast.dismiss(id);`}
              </pre>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
