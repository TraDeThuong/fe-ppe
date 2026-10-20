"use client";

import { useState } from "react";
import {
  Input,
  Textarea,
  PasswordInput,
  Label,
} from "@ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/card";
import { Button } from "@ui/button";
import {
  Search,
  Mail,
  User,
  Lock,
  Phone,
  ShieldCheck,
  Building,
  KeyRound,
  X,
  Sparkles,
  Layers,
} from "lucide-react";

export default function InputShowcasePage() {
  const [searchValue, setSearchValue] = useState("");
  const [interactiveSize, setInteractiveSize] = useState<"sm" | "md" | "lg">("md");
  const [interactiveVariant, setInteractiveVariant] = useState<"inset" | "flat">("inset");
  const [interactiveIconStyle, setInteractiveIconStyle] = useState<"raised" | "flat" | "none">("raised");
  const [hasError, setHasError] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 pb-16">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Nhóm 1 — Input Components
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            src/components/ui/form/foundation/
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Input & Textarea
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Các trường nhập liệu một dòng và nhiều dòng theo phong cách{" "}
          <strong className="text-foreground">Neumorphic Soft 3D</strong>. Hỗ trợ rãnh
          khắc lõm (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">inset</code>),
          khối nổi nhẹ (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">flat</code>),
          biểu tượng huy hiệu nổi 3D (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">iconStyle="raised"</code>
          ), tính năng <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">autoGrow</code> tự dãn nở cho văn bản dài và bảo mật mật khẩu.
        </p>
      </header>

      {/* KHU VỰC THỬ NGHIỆM TƯƠNG TÁC (INTERACTIVE PLAYGROUND) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Bàn thử nghiệm thuộc tính Input (Live Playground)
        </h2>
        <Card variant="raised" padding="lg">
          <div className="flex flex-col gap-6">
            {/* Thanh điều khiển cấu hình */}
            <div className="grid gap-4 rounded-xl border border-border/70 bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-4 shadow-nm-inset">
              {/* Kích thước */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Kích thước (size):</span>
                <div className="flex gap-1">
                  {(["sm", "md", "lg"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInteractiveSize(s)}
                      className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                        interactiveSize === s
                          ? "bg-primary text-primary-foreground shadow-nm-sm"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kiểu bề mặt */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Bề mặt (variant):</span>
                <div className="flex gap-1">
                  {(["inset", "flat"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setInteractiveVariant(v)}
                      className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                        interactiveVariant === v
                          ? "bg-primary text-primary-foreground shadow-nm-sm"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kiểu Icon */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Kiểu Icon (iconStyle):</span>
                <div className="flex gap-1">
                  {(["raised", "flat", "none"] as const).map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInteractiveIconStyle(i)}
                      className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                        interactiveIconStyle === i
                          ? "bg-primary text-primary-foreground shadow-nm-sm"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Trạng thái */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Trạng thái:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setHasError((p) => !p)}
                    className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                      hasError
                        ? "bg-danger text-danger-foreground shadow-nm-sm"
                        : "bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Error
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDisabled((p) => !p)}
                    className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                      isDisabled
                        ? "bg-foreground/20 text-foreground shadow-nm-sm"
                        : "bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>
            </div>

            {/* Input hiển thị kết quả */}
            <div className="flex flex-col gap-2 pt-2">
              <Label>Kết quả hiển thị tương ứng:</Label>
              <Input
                size={interactiveSize}
                variant={interactiveVariant}
                iconStyle={interactiveIconStyle}
                error={hasError ? "Dữ liệu không thỏa mãn quy chuẩn an toàn!" : undefined}
                disabled={isDisabled}
                prefix={<Search />}
                suffix={
                  searchValue ? (
                    <button
                      type="button"
                      onClick={() => setSearchValue("")}
                      className="cursor-pointer hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : (
                    <ShieldCheck />
                  )
                }
                placeholder="Gõ thử nội dung vào ô tìm kiếm..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* 1. CÁC KÍCH THƯỚC (SIZES) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          1. Kích thước chuẩn (sm / md / lg)
        </h2>
        <Card variant="default" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-mono">size="sm" (h-9 — 36px)</span>
                <span>Phù hợp cho bảng dữ liệu, thanh tìm kiếm hẹp</span>
              </div>
              <Input size="sm" prefix={<Search />} placeholder="Tìm kiếm nhanh thiết bị..." />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-mono">size="md" (h-11 — 44px — Mặc định)</span>
                <span>Chuẩn biểu mẫu hệ thống Smart PPE</span>
              </div>
              <Input size="md" prefix={<User />} placeholder="Họ và tên nhân sự giám sát..." />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-mono">size="lg" (h-[52px] — 52px)</span>
                <span>Màn hình đăng nhập lớn, landing page</span>
              </div>
              <Input size="lg" prefix={<Mail />} placeholder="Địa chỉ email đăng nhập quản trị..." />
            </div>
          </div>
        </Card>
      </section>

      {/* 2. BIỂU TƯỢNG NỔI & HẬU TỐ (PREFIX & SUFFIX) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          2. Biểu tượng Tiền tố & Hậu tố (Prefix / Suffix)
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Raised Icons */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                iconStyle="raised" (Huy hiệu nổi 3D)
              </CardTitle>
              <CardDescription className="text-xs">
                Icon nổi hình tròn Neumorphic tạo điểm nhấn vật lý tactile.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-3">
              <Input
                iconStyle="raised"
                prefix={<Building />}
                placeholder="Tên nhà xưởng / công trường..."
              />
              <Input
                iconStyle="raised"
                prefix={<Phone />}
                suffix={<ShieldCheck />}
                placeholder="Số hotline xác thực an toàn..."
              />
            </CardContent>
          </Card>

          {/* Flat Icons */}
          <Card variant="default" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                <Layers className="size-4" />
                iconStyle="flat" (Biểu tượng phẳng)
              </CardTitle>
              <CardDescription className="text-xs">
                Icon phẳng trong suốt truyền thống, không mang bóng đổ tròn.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-3">
              <Input
                iconStyle="flat"
                prefix={<Building />}
                placeholder="Tên nhà xưởng / công trường..."
              />
              <Input
                iconStyle="flat"
                prefix={<Phone />}
                suffix={<ShieldCheck />}
                placeholder="Số hotline xác thực an toàn..."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. PASSWORD INPUT */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          3. PasswordInput (Ô mật khẩu bảo mật)
        </h2>
        <Card variant="raised" padding="md">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-base">Mật khẩu kèm nút ẩn/hiện con mắt nổi 3D</CardTitle>
            <CardDescription className="text-xs">
              Tự động hoán đổi giữa `password` và `text`, ngăn ngừa mất con trỏ tiêu điểm (focus) khi click.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono text-muted-foreground">Mật khẩu thường:</span>
              <PasswordInput prefix={<Lock />} placeholder="Nhập mật khẩu..." defaultValue="MatKhauBaoMat@2026" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono text-muted-foreground">Mật khẩu có lỗi:</span>
              <PasswordInput
                error
                prefix={<KeyRound />}
                placeholder="Xác nhận mật khẩu..."
                defaultValue="12345"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. TEXTAREA (NHẬP NHIỀU DÒNG & AUTO-GROW) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          4. Textarea & Tự động dãn nở (Auto-grow)
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Auto grow */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base">Tính năng autoGrow=true</CardTitle>
              <CardDescription className="text-xs">
                Tự động nở chiều cao khi gõ nhiều dòng, khóa kéo thủ công (`resize="none"`).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Textarea
                autoGrow
                rows={3}
                minHeight={80}
                maxHeight={200}
                placeholder="Gõ thử văn bản và bấm phím Enter nhiều lần để thấy ô tự nở rộng theo nội dung..."
              />
            </CardContent>
          </Card>

          {/* Cố định & Kéo dãn thủ công */}
          <Card variant="default" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base">Kéo dãn thủ công (resize="vertical")</CardTitle>
              <CardDescription className="text-xs">
                Kéo góc dưới bên phải để chỉnh chiều cao theo ý muốn.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Textarea
                rows={3}
                resize="vertical"
                placeholder="Ghi chú an toàn hiện trường công trình..."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. CÁC TRẠNG THÁI (DEFAULT, ERROR, DISABLED) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          5. Bảng ma trận các trạng thái
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card variant="default" padding="md">
            <span className="text-xs font-mono text-muted-foreground">Mặc định (Default)</span>
            <div className="pt-2">
              <Input placeholder="Văn bản gợi ý..." />
            </div>
          </Card>

          <Card variant="default" padding="md">
            <span className="text-xs font-mono text-danger">Báo lỗi (error=true)</span>
            <div className="pt-2">
              <Input error defaultValue="user@@invalid" />
            </div>
          </Card>

          <Card variant="default" padding="md">
            <span className="text-xs font-mono text-muted-foreground">Bị khóa (disabled=true)</span>
            <div className="pt-2">
              <Input disabled defaultValue="Không thể chỉnh sửa" />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
