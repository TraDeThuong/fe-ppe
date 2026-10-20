"use client";

import { Loader, Spinner, DotsLoader } from "@ui/loader";
import { Skeleton } from "@ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ui/card";

export default function LoaderPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Loader & Skeleton</h1>
        <p className="text-muted-foreground leading-relaxed">
          Các thành phần hiển thị trạng thái đang tải theo phong cách Neumorphic:
          Spinner xoay tròn, Dots chấm nhảy và Skeleton với hiệu ứng sóng ánh sáng (shimmer).
        </p>
      </header>

      {/* 1. Biến thể Spinner & Dots theo kích thước */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Biến thể & Kích thước</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Spinner */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base">Spinner (Xoay tròn)</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex items-center justify-around gap-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="font-mono text-xs text-muted-foreground">sm (28px)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="md" />
                <span className="font-mono text-xs text-muted-foreground">md (40px)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="font-mono text-xs text-muted-foreground">lg (52px)</span>
              </div>
            </CardContent>
          </Card>

          {/* Dots */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base">Dots (Chấm nhảy)</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex items-center justify-around gap-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <DotsLoader size="sm" />
                <span className="font-mono text-xs text-muted-foreground">sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <DotsLoader size="md" />
                <span className="font-mono text-xs text-muted-foreground">md</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <DotsLoader size="lg" />
                <span className="font-mono text-xs text-muted-foreground">lg</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. Kèm nhãn (Label) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Kèm chữ mô tả (Label)</h2>
        <Card variant="default" padding="lg">
          <div className="flex flex-wrap items-center justify-around gap-8">
            <Loader
              variant="spinner"
              size="md"
              showLabel
              label="Đang kết nối thiết bị..."
            />
            <Loader
              variant="dots"
              size="md"
              showLabel
              label="Đang đồng bộ dữ liệu..."
            />
          </div>
        </Card>
      </section>

      {/* 3. Skeleton Loading */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Skeleton (Khung tải tạm thời)</h2>
        <p className="text-sm text-muted-foreground">
          Được khắc chìm (inset) dạng Neumorphic kết hợp vệt sáng lướt ngang (shimmer wave).
        </p>

        {/* Khối cơ bản & Mô phỏng Card */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Các hình dạng cơ bản */}
          <Card variant="default" padding="md">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base">Hình khối cơ bản</CardTitle>
              <CardDescription className="text-xs">
                Avatar (full), thanh chữ (md) và khối hộp (xl).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-4">
              {/* Avatar + dòng tiêu đề */}
              <div className="flex items-center gap-3">
                <Skeleton rounded="full" className="size-12 shrink-0" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton rounded="md" className="h-4 w-3/4" />
                  <Skeleton rounded="md" className="h-3 w-1/2" />
                </div>
              </div>

              {/* Các dòng đoạn văn */}
              <div className="flex flex-col gap-2 pt-2">
                <Skeleton rounded="md" className="h-3 w-full" />
                <Skeleton rounded="md" className="h-3 w-5/6" />
                <Skeleton rounded="md" className="h-3 w-2/3" />
              </div>

              {/* Khối nút bấm / banner */}
              <div className="pt-1">
                <Skeleton rounded="xl" className="h-9 w-28" />
              </div>
            </CardContent>
          </Card>

          {/* Mô phỏng Profile Card đang tải */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base">Mô phỏng Thẻ đang tải</CardTitle>
              <CardDescription className="text-xs">
                Ví dụ giao diện profile hoặc thông tin thiết bị đang chờ dữ liệu.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-4">
              {/* Ảnh bìa */}
              <Skeleton rounded="xl" className="h-24 w-full" />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <Skeleton rounded="full" className="size-9 shrink-0" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton rounded="md" className="h-3.5 w-24" />
                    <Skeleton rounded="md" className="h-2.5 w-16" />
                  </div>
                </div>
                <Skeleton rounded="lg" className="h-7 w-16" />
              </div>

              <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
                <Skeleton rounded="md" className="h-3 w-full" />
                <Skeleton rounded="md" className="h-3 w-4/5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Ngữ cảnh áp dụng trong Inset Card */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Áp dụng trong khối nội dung</h2>
        <Card variant="inset" padding="lg" className="flex min-h-[160px] items-center justify-center">
          <Loader
            variant="spinner"
            size="lg"
            showLabel
            label="Đang tải danh sách thiết bị PPE..."
          />
        </Card>
      </section>
    </div>
  );
}
