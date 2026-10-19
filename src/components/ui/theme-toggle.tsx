"use client";

import { useLayoutEffect } from "react";

const STORAGE_KEY = "theme";

function resolveTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  // Strict Mode (dev) xoá attribute do inline script đặt khi remount — áp lại.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", resolveTheme());
  }, []);

  function toggle() {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Chuyển đổi giao diện sáng / tối"
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-background text-foreground shadow-nm transition-[box-shadow,transform] duration-150 hover:shadow-nm-sm active:shadow-nm-pressed active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {/* Mặt trời: hiện ở dark mode, bấm để về light */}
      <svg
        className="hidden h-4.5 w-4.5 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {/* Mặt trăng: hiện ở light mode, bấm để sang dark */}
      <svg
        className="h-4.5 w-4.5 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
