import Link from "next/link";

const sections = [
  {
    href: "/foundations",
    title: "Foundations",
    description:
      "Design tokens: màu sắc, typography, spacing dùng chung toàn hệ thống.",
  },
  {
    href: "/components",
    title: "Components",
    description:
      "Thư viện component UI dùng chung, kèm ví dụ và hướng dẫn sử dụng.",
  },
];

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Design System — Smart PPE
        </h1>
        <p className="leading-7 text-muted-foreground">
          Trang tập trung toàn bộ giao diện component của hệ thống, phục vụ lập
          trình viên và người phát triển UI. Component được định nghĩa một lần
          tại{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            src/components/ui
          </code>{" "}
          và dùng chung cho cả app chính (port 3000) lẫn trang này (port 3001).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent"
          >
            <span className="font-medium">{section.title}</span>
            <span className="text-sm leading-6 text-muted-foreground">
              {section.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
