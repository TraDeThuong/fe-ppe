import { Typography } from "@ui/typography";

const variants = [
  {
    variant: "default",
    name: "Default (Mặc định)",
    desc: "Văn bản tiêu chuẩn với màu chữ foreground thông thường.",
    sample: "Hệ thống giám sát trang thiết bị bảo hộ thông minh Smart PPE.",
  },
  {
    variant: "embossed",
    name: "Embossed (Chữ nổi 3D)",
    desc: "Màu chữ trùng màu nền — đổ bóng 2 hướng (trên-trái sáng, dưới-phải tối) tạo cảm giác chữ nổi lên khỏi bề mặt.",
    sample: "ABCDEF",
  },
  {
    variant: "debossed",
    name: "Debossed (Chữ khắc chìm)",
    desc: "Màu chữ trùng màu nền — đổ bóng ngược (trên-trái tối, dưới-phải sáng) tạo cảm giác chữ dập khắc chìm vào bề mặt.",
    sample: "ABCDEF",
  },
  {
    variant: "soft",
    name: "Soft (Nhẹ nhàng)",
    desc: "Màu chữ muted dịu mắt cùng khoảng cách chữ mở rộng.",
    sample: "Cập nhật lần cuối: 10 phút trước bởi giám sát viên công trình.",
  },
  {
    variant: "display",
    name: "Display (Tiêu đề lớn / Số liệu)",
    desc: "Chữ lớn, đậm nét, tối ưu cho con số KPI và tiêu đề chính ấn tượng.",
    sample: "99.8%",
  },
] as const;

const elements = [
  { as: "h1", label: "Heading 1 (h1)", sample: "Báo cáo tuân thủ PPE tuần này" },
  { as: "h2", label: "Heading 2 (h2)", sample: "Khu vực thi công Block A" },
  { as: "h3", label: "Heading 3 (h3)", sample: "Camera AI nhận diện mũ bảo hộ" },
  { as: "p", label: "Paragraph (p)", sample: "Toàn bộ công nhân ra vào công trường bắt buộc phải trang bị đầy đủ bảo hộ." },
  { as: "span", label: "Inline text (span)", sample: "Trạng thái: Hoạt động bình thường" },
  { as: "label", label: "Form Label (label)", sample: "Mã số nhân viên kỹ thuật" },
] as const;

export default function TypographyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      {/* 1. Header */}
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Typography</h1>
        <p className="text-muted-foreground">
          Component hiển thị văn bản theo phong cách Neumorphism với hiệu ứng đổ bóng
          chữ nổi (embossed), khắc chìm (debossed) và số liệu hiển thị lớn (display).
        </p>
      </header>

      {/* 2. Soi kết cấu 3D phóng to (Màu chữ trùng màu nền) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Soi kết cấu 3D: Embossed & Debossed
          </h2>
          <p className="text-sm text-muted-foreground">
            Màu chữ được đặt <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">!text-background</code> hoàn
            toàn trùng với màu nền <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">bg-background</code>.
            Hình khối chữ 3D được định hình 100% bằng ánh sáng đổ bóng hai hướng.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Box 1: Embossed (Chữ nổi) */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-primary">
                variant=&quot;embossed&quot;
              </span>
              <span className="rounded bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                Chữ nổi 3D
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ánh sáng chiếu từ góc trên-trái (vệt sáng trắng), góc dưới-phải đổ bóng tối.
            </p>

            <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-border/60 bg-background p-6 shadow-sm">
              <Typography
                variant="embossed"
                className="!text-background text-6xl sm:text-7xl font-black tracking-widest text-center select-none"
              >
                ABCDE
              </Typography>
            </div>
            <span className="text-center font-mono text-[11px] text-muted-foreground">
              Bóng nổi: -1px -1px sáng / +1px +1px tối
            </span>
          </div>

          {/* Box 2: Debossed (Chữ khắc chìm) */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-primary">
                variant=&quot;debossed&quot;
              </span>
              <span className="rounded bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                Chữ khắc chìm 3D
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bóng đảo ngược (góc trên-trái tối, góc dưới-phải sáng) tạo cảm giác dập lõm.
            </p>

            <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-border/60 bg-background p-6 shadow-sm">
              <Typography
                variant="debossed"
                className="!text-background text-6xl sm:text-7xl font-black tracking-widest text-center select-none"
              >
                ABCDE
              </Typography>
            </div>
            <span className="text-center font-mono text-[11px] text-muted-foreground">
              Bóng chìm: -1px -1px tối / +1px +1px sáng
            </span>
          </div>
        </div>
      </section>

      {/* 3. Danh sách các biến thể đầy đủ */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Tất cả biến thể (Variants)</h2>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
          {variants.map((item) => (
            <div
              key={item.variant}
              className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/50 p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-primary">
                  variant=&quot;{item.variant}&quot;
                </span>
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>

              <div className="mt-1 flex items-center rounded-lg bg-card/80 p-4">
                <Typography
                  variant={item.variant}
                  className={
                    item.variant === "embossed" || item.variant === "debossed"
                      ? "!text-card text-2xl sm:text-3xl font-extrabold tracking-wider"
                      : undefined
                  }
                >
                  {item.sample}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Thẻ ngữ nghĩa HTML (as prop) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Thẻ ngữ nghĩa (Prop as)</h2>
        <p className="text-sm text-muted-foreground">
          Hỗ trợ render chuẩn các thẻ HTML ngữ nghĩa thông qua prop{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">as</code>.
        </p>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          {elements.map((item) => (
            <div
              key={item.as}
              className="flex flex-col gap-1 border-b border-border/40 pb-3 last:border-0 last:pb-0"
            >
              <span className="font-mono text-xs text-muted-foreground">
                as=&quot;{item.as}&quot; ({item.label})
              </span>
              <Typography as={item.as} variant="embossed">
                {item.sample}
              </Typography>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Cách sử dụng */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Cách sử dụng</h2>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-sm leading-6">
          {`import { Typography } from "@ui/typography";

// 1. Chữ nổi 3D trùng màu nền
<div className="bg-background p-6">
  <Typography variant="embossed" className="!text-background text-5xl font-black">
    ABCDE
  </Typography>
</div>

// 2. Chữ khắc chìm 3D trùng màu nền
<div className="bg-background p-6">
  <Typography variant="debossed" className="!text-background text-5xl font-black">
    ABCDE
  </Typography>
</div>

// 3. Số liệu nổi bật
<Typography variant="display" as="span">
  99.8%
</Typography>`}
        </pre>
      </section>

      {/* 6. Bảng thuộc tính (Props) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Thuộc tính (Props)</h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Thuộc tính</th>
                <th className="px-4 py-2.5 font-medium">Kiểu dữ liệu</th>
                <th className="px-4 py-2.5 font-medium">Mặc định</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              <tr>
                <td className="px-4 py-2.5 text-foreground">variant</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  &quot;default&quot; | &quot;embossed&quot; | &quot;debossed&quot; | &quot;soft&quot; | &quot;display&quot;
                </td>
                <td className="px-4 py-2.5 text-primary">&quot;default&quot;</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-foreground">as</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  &quot;p&quot; | &quot;span&quot; | &quot;div&quot; | &quot;h1&quot; | &quot;h2&quot; | &quot;h3&quot; | &quot;h4&quot; | &quot;label&quot;
                </td>
                <td className="px-4 py-2.5 text-primary">&quot;p&quot;</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-foreground">children</td>
                <td className="px-4 py-2.5 text-muted-foreground font-sans">React.ReactNode</td>
                <td className="px-4 py-2.5 text-muted-foreground font-sans">Bắt buộc</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-foreground">className</td>
                <td className="px-4 py-2.5 text-muted-foreground">string</td>
                <td className="px-4 py-2.5 text-muted-foreground">&quot;&quot;</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
