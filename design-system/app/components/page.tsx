import Link from "next/link";

const components = [
  {
    href: "/components/button",
    name: "Button",
    description:
      "Nút bấm với 9 biến thể (primary, secondary, outline, ghost, danger, hybrid, sculpted, aurora, metal) và 3 kích thước (sm, md, lg).",
  },
  {
    href: "/components/card",
    name: "Card",
    description:
      "Khối chứa nội dung với 6 biến thể (default, raised, inset, interactive, glass, accent) và 4 mức padding.",
  },
];

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
        <p className="text-muted-foreground">
          Thư viện component UI dùng chung của hệ thống. Mỗi component có trang
          riêng với ví dụ và bảng thuộc tính.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {components.map((component) => (
          <Link
            key={component.href}
            href={component.href}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent"
          >
            <span className="font-medium">{component.name}</span>
            <span className="text-sm leading-6 text-muted-foreground">
              {component.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
