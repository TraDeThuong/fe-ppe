"use client";

import { useEffect, useState, type HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  animate?: boolean;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

const roundedClasses = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export function Skeleton({
  animate = true,
  rounded = "md",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      setDark(
        document.documentElement.getAttribute("data-theme") === "dark" ||
          document.documentElement.classList.contains("dark")
      );
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden="true"
      className={[
        "ui-skeleton relative overflow-hidden",
        roundedClasses[rounded],
        animate ? "ui-skeleton-animated" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: dark ? "#292d24" : "#edf0e5",
        boxShadow: dark
          ? [
              "inset 3px 3px 6px rgba(0,0,0,0.22)",
              "inset -2px -2px 5px rgba(255,255,255,0.025)",
            ].join(", ")
          : [
              "inset 3px 3px 6px rgba(54,65,41,0.09)",
              "inset -2px -2px 5px rgba(255,255,255,0.85)",
            ].join(", "),
        ...style,
      }}
      {...props}
    >
      {animate && (
        <span
          className="ui-skeleton-shimmer pointer-events-none absolute inset-0"
          style={{
            background: dark
              ? "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.045) 45%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.045) 55%, transparent 80%)"
              : "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.2) 55%, transparent 80%)",
          }}
        />
      )}

      <style jsx global>{`
        .ui-skeleton-animated .ui-skeleton-shimmer {
          transform: translateX(-100%);
          animation: ui-skeleton-shimmer 1.8s ease-in-out infinite;
        }

        @keyframes ui-skeleton-shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ui-skeleton-animated .ui-skeleton-shimmer {
            animation: none !important;
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
