"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/providers/locale-provider";

type LoaderVariant = "spinner" | "dots";
type LoaderSize = "sm" | "md" | "lg";

interface LoaderProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

const sizeConfig: Record<
  LoaderSize,
  { container: number; spinner: number; dot: number; gap: number }
> = {
  sm: { container: 28, spinner: 20, dot: 5, gap: 4 },
  md: { container: 40, spinner: 28, dot: 7, gap: 5 },
  lg: { container: 52, spinner: 36, dot: 9, gap: 6 },
};

export function Loader({
  variant = "spinner",
  size = "md",
  label,
  className = "",
  showLabel = false,
}: LoaderProps) {
  let isVietnamese = true;
  try {
    const localeCtx = useLocale();
    isVietnamese = localeCtx.locale === "vi-VN";
  } catch {
    // fallback if outside LocaleProvider
  }

  const effectiveLabel = label ?? (isVietnamese ? "Đang tải..." : "Loading...");
  const [dark, setDark] = useState(false);
  const config = sizeConfig[size];

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

  const surface = dark ? "#292d24" : "#edf0e5";
  const accent = dark ? "#a4bd83" : "#668747";

  const neumorphicShadow = dark
    ? "5px 5px 10px rgba(0,0,0,0.28), -4px -4px 9px rgba(255,255,255,0.035)"
    : "5px 5px 10px rgba(54,65,41,0.12), -5px -5px 10px rgba(255,255,255,0.9)";

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: config.container,
          height: config.container,
          background: surface,
          boxShadow: neumorphicShadow,
        }}
        aria-hidden="true"
      >
        {variant === "spinner" ? (
          <span
            className="ui-loader-spinner"
            style={{
              width: config.spinner,
              height: config.spinner,
              borderRadius: "50%",
              border: `${Math.max(2, config.spinner * 0.1)}px solid ${
                dark ? "rgba(255,255,255,0.07)" : "rgba(104,135,71,0.13)"
              }`,
              borderTopColor: accent,
              borderRightColor: accent,
              boxShadow: `0 0 8px ${
                dark ? "rgba(164,189,131,0.08)" : "rgba(102,135,71,0.08)"
              }`,
            }}
          />
        ) : (
          <span
            className="flex items-center justify-center"
            style={{ gap: config.gap }}
          >
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="ui-loader-dot rounded-full"
                style={{
                  width: config.dot,
                  height: config.dot,
                  background: accent,
                  boxShadow: dark
                    ? "inset 1px 1px 2px rgba(255,255,255,0.12), 1px 2px 3px rgba(0,0,0,0.3)"
                    : "inset 1px 1px 2px rgba(255,255,255,0.55), 1px 2px 3px rgba(54,65,41,0.12)",
                  animationDelay: `${index * 160}ms`,
                }}
              />
            ))}
          </span>
        )}
      </span>

      {showLabel && (
        <span
          className="text-xs font-medium tracking-wide"
          style={{ color: dark ? "#c4cbbb" : "#68735d" }}
        >
          {effectiveLabel}
        </span>
      )}

      <style jsx global>{`
        .ui-loader-spinner {
          display: inline-block;
          animation: ui-loader-spin 0.8s linear infinite;
        }

        .ui-loader-dot {
          animation: ui-loader-bounce 0.9s ease-in-out infinite;
        }

        @keyframes ui-loader-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ui-loader-bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.55;
          }

          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ui-loader-spinner,
          .ui-loader-dot {
            animation: none !important;
          }
        }
      `}</style>
    </span>
  );
}

export function Spinner(props: Omit<LoaderProps, "variant">) {
  return <Loader {...props} variant="spinner" />;
}

export function DotsLoader(props: Omit<LoaderProps, "variant">) {
  return <Loader {...props} variant="dots" />;
}
