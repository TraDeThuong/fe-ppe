import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ui/card";
import { Button } from "@ui/button";

const demos = [
  { variant: "default", desc: "Bóng nổi nhẹ — dùng cho nội dung thông thường." },
  { variant: "raised", desc: "Bóng nâng sâu hơn — nhấn mạnh nội dung quan trọng." },
  { variant: "inset", desc: "Bóng lõm — bề mặt như bị khắc vào nền." },
  {
    variant: "interactive",
    desc: "Hover nâng lên, nhấn giữ lõm xuống — dùng cho thẻ bấm được.",
  },
  { variant: "glass", desc: "Nền mờ với backdrop-blur — dùng cho lớp phủ." },
  { variant: "accent", desc: "Nền màu primary — dùng làm điểm nhấn." },
] as const;

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Card</h1>
        <p className="text-muted-foreground">
          Khối chứa nội dung theo phong cách Neumorphism, dùng kèm các thành
          phần con{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardHeader
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardTitle
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardDescription
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardContent
          </code>{" "}
          và{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardFooter
          </code>
          .
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Biến thể</h2>
        <div className="grid gap-6 rounded-lg border border-border bg-background p-8 sm:grid-cols-2">
          {demos.map((demo) => (
            <Card key={demo.variant} variant={demo.variant}>
              <CardHeader>
                <CardTitle>{demo.variant}</CardTitle>
                <CardDescription
                  className={
                    demo.variant === "accent"
                      ? "text-primary-foreground/75"
                      : undefined
                  }
                >
                  {demo.desc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6">
                  Nội dung chính của thẻ — dữ liệu, chỉ số hoặc mô tả chi tiết.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  variant={demo.variant === "accent" ? "secondary" : "primary"}
                >
                  Xem chi tiết
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Padding</h2>
        <div className="flex flex-wrap items-start gap-8 rounded-lg border border-border bg-background p-8">
          {(["none", "sm", "md", "lg"] as const).map((padding) => (
            <div key={padding} className="flex flex-col items-center gap-2">
              <Card variant="raised" padding={padding} className="w-56">
                <CardContent>
                  <p className="text-sm font-medium">padding={padding}</p>
                </CardContent>
              </Card>
              <span className="font-mono text-xs text-muted-foreground">
                {padding}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Interactive</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Prop{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            interactive
          </code>{" "}
          ghi đè{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            variant
          </code>
          : khi{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            interactive
          </code>{" "}
          bật, Card luôn dùng biến thể interactive dù variant là gì. Di chuột để
          thấy thẻ nâng lên, nhấn giữ để thấy bóng lõm, thả ra trả về mượt mà.
        </p>
        <div className="flex flex-wrap items-start gap-8 rounded-lg border border-border bg-background p-8">
          <div className="flex flex-col items-center gap-2">
            <Card interactive className="w-64">
              <CardHeader>
                <CardTitle>interactive</CardTitle>
                <CardDescription>
                  Chỉ cần bật prop, không cần đổi variant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6">
                  Thẻ này bấm được — hover nâng lên, active lõm xuống.
                </p>
              </CardContent>
            </Card>
            <span className="font-mono text-xs text-muted-foreground">
              interactive
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Card variant="raised" interactive className="w-64">
              <CardHeader>
                <CardTitle>raised + interactive</CardTitle>
                <CardDescription>
                  variant bị ghi đè thành interactive.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6">
                  Dù truyền variant=&quot;raised&quot;, thẻ vẫn dùng hiệu ứng
                  interactive.
                </p>
              </CardContent>
            </Card>
            <span className="font-mono text-xs text-muted-foreground">
              variant=&quot;raised&quot; + interactive
            </span>
          </div>
        </div>
      </section>


      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Cách dùng</h2>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-sm leading-6">
          {`import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@ui/card";

<Card>
  <CardHeader>
    <CardTitle>Tiêu đề</CardTitle>
    <CardDescription>Mô tả ngắn gọn</CardDescription>
  </CardHeader>
  <CardContent>Nội dung chính</CardContent>
  <CardFooter>Hành động</CardFooter>
</Card>

<Card variant="glass" padding="lg" interactive>
  Thẻ kính, padding lớn, bấm được
</Card>`}
        </pre>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Thuộc tính</h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Prop</th>
                <th className="px-4 py-2.5 font-medium">Giá trị</th>
                <th className="px-4 py-2.5 font-medium">Mặc định</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">variant</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  default | raised | inset | interactive | glass | accent
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">default</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">padding</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  none | sm | md | lg
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">md</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">interactive</td>
                <td className="px-4 py-2.5 font-mono text-xs">boolean</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  false — khi true, ghi đè variant thành interactive
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">...props</td>
                <td className="px-4 py-2.5" colSpan={2}>
                  Kế thừa HTMLAttributes
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Thành phần con:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardHeader
          </code>{" "}
          (khối trên cùng),{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardTitle
          </code>{" "}
          (tiêu đề),{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardDescription
          </code>{" "}
          (mô tả),{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardContent
          </code>{" "}
          (nội dung chính) và{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            CardFooter
          </code>{" "}
          (khối hành động dưới cùng). Tất cả đều nhận{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            className
          </code>{" "}
          và props của thẻ HTML tương ứng.
        </p>
      </section>
    </div>
  );
}
