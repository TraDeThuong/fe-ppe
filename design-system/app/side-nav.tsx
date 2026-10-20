"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@ui/theme-toggle";

const sections = [
  {
    title: "Tổng quan",
    items: [{ href: "/", label: "Giới thiệu" }],
  },
  {
    title: "Foundations",
    items: [{ href: "/foundations", label: "Màu sắc & Typography" }],
  },
  {
    title: "Components",
    items: [
      { href: "/components", label: "Danh sách" },
      { href: "/components/typography", label: "Typography" },
      { href: "/components/button", label: "Button" },
      { href: "/components/card", label: "Card" },
      { href: "/components/toast", label: "Toast" },
      { href: "/components/loader", label: "Loader & Skeleton" },
      { href: "/components/input", label: "Input & Textarea" },
      { href: "/components/selection", label: "Selection Controls" },
      { href: "/components/form", label: "Form (Biểu mẫu)" },
    ],
  },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Smart PPE</p>
          <p className="text-xs text-muted-foreground">Design System</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex flex-col gap-6 p-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        active
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        App chính:{" "}
        <a className="text-primary hover:underline" href="http://localhost:3000">
          localhost:3000
        </a>
      </div>
    </aside>
  );
}
