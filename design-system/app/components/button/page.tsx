import { Button } from "@ui/button";

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Button</h1>
        <p className="text-muted-foreground">
          Nút bấm cho các hành động trong hệ thống. Hỗ trợ đầy đủ thuộc tính của{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            &lt;button&gt;
          </code>{" "}
          (onClick, disabled, type, form...).
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Biến thể</h2>
        <div className="flex flex-wrap items-start gap-8 rounded-lg border border-border bg-background p-8">
          {(
            [
              "primary",
              "secondary",
              "outline",
              "ghost",
              "danger",
              "hybrid",
              "sculpted",
              "aurora",
              "metal",
            ] as const
          ).map((variant) => (
            <div key={variant} className="flex flex-col items-center gap-2">
              <Button variant={variant}>Button</Button>
              <span className="font-mono text-xs text-muted-foreground">
                {variant}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Ba biến thể nghệ thuật —{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            sculpted
          </code>{" "}
          (3D khắc sâu),{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            aurora
          </code>{" "}
          (viền gradient chuyển động),{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            metal
          </code>{" "}
          (kính kim loại lỏng) — di chuột qua để thấy animation. Tự tắt khi hệ
          thống bật{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            prefers-reduced-motion
          </code>
          .
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Kích thước</h2>
        <div className="flex flex-wrap items-start gap-6 rounded-lg border border-border bg-card p-6">
          {(["sm", "md", "lg"] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Button size={size}>Button</Button>
              <span className="font-mono text-xs text-muted-foreground">
                {size}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Trạng thái</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Di chuột để thấy bóng ngoài đậm hơn (hover), nhấn giữ để thấy bóng lõm
          (pressed), thả ra sẽ trả về trạng thái nổi mượt mà.
        </p>
        <div className="flex flex-wrap items-start gap-6 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col items-center gap-2">
            <Button disabled>Disabled</Button>
            <span className="font-mono text-xs text-muted-foreground">
              disabled
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Cách dùng</h2>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-sm leading-6">
          {`import { Button } from "@ui/button";

<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="sculpted">Sculpted</Button>
<Button variant="aurora">Aurora</Button>
<Button variant="metal">Metal</Button>
<Button variant="danger" disabled>Danger</Button>`}
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
                  primary | secondary | outline | ghost | danger | hybrid |
                  sculpted | aurora | metal
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">primary</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">size</td>
                <td className="px-4 py-2.5 font-mono text-xs">sm | md | lg</td>
                <td className="px-4 py-2.5 font-mono text-xs">md</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">disabled</td>
                <td className="px-4 py-2.5 font-mono text-xs">boolean</td>
                <td className="px-4 py-2.5 font-mono text-xs">false</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">type</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  button | submit | reset
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">button</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">...props</td>
                <td className="px-4 py-2.5" colSpan={2}>
                  Kế thừa ButtonHTMLAttributes
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
