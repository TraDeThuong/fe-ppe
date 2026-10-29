"use client";

import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";

type ToastType = "success" | "error" | "loading" | "blank";

const toastTheme: Record<
  ToastType,
  {
    icon: string;
    accent: string;
    titleVi: string;
    titleEn: string;
    shadow: string;
  }
> = {
  success: {
    icon: "✓",
    accent: "#648747",
    titleVi: "Thành công",
    titleEn: "Success",
    shadow: "rgba(100, 135, 71, 0.24)",
  },
  error: {
    icon: "×",
    accent: "#c45e52",
    titleVi: "Đã xảy ra lỗi",
    titleEn: "Error Occurred",
    shadow: "rgba(196, 94, 82, 0.24)",
  },
  loading: {
    icon: "◌",
    accent: "#9b9664",
    titleVi: "Đang xử lý",
    titleEn: "Processing",
    shadow: "rgba(155, 150, 100, 0.2)",
  },
  blank: {
    icon: "i",
    accent: "#718b54",
    titleVi: "Thông báo",
    titleEn: "Notification",
    shadow: "rgba(113, 139, 84, 0.2)",
  },
};

function WoodenToast({
  message,
  type,
}: {
  message: string;
  type: ToastType;
}) {
  const [dark, setDark] = useState(false);
  const [isEn, setIsEn] = useState(false);
  const theme = toastTheme[type];

  useEffect(() => {
    const updateTheme = () => {
      setDark(
        document.documentElement.getAttribute("data-theme") === "dark" ||
          document.documentElement.classList.contains("dark")
      );
      setIsEn(document.documentElement.lang?.startsWith("en") ?? false);
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
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={[
        "ppe-toast group relative flex w-[min(370px,calc(100vw-32px))]",
        "items-center gap-3.5 overflow-hidden rounded-[15px]",
        "border px-4 py-4",
        "backdrop-blur-xl",
        "transition-[background,color,border-color] duration-300",
        dark
          ? "border-white/[0.09] bg-[#292d24] text-[#e8eadf]"
          : "border-white/90 bg-[#edf0e5] text-[#303a29]",
      ].join(" ")}
      style={{
        boxShadow: dark
          ? [
              "0 16px 35px rgba(0,0,0,0.32)",
              "0 5px 12px rgba(0,0,0,0.2)",
              "inset 0 1px 0 rgba(255,255,255,0.09)",
              "inset 0 -2px 0 rgba(0,0,0,0.13)",
              `0 0 22px ${theme.shadow}`,
            ].join(", ")
          : [
              "0 18px 35px rgba(45,55,34,0.15)",
              "0 5px 12px rgba(45,55,34,0.08)",
              "inset 0 1px 0 rgba(255,255,255,1)",
              "inset 0 -2px 0 rgba(116,131,91,0.13)",
              `0 0 22px ${theme.shadow}`,
            ].join(", "),
      }}
    >
      {/* Ánh sáng phản chiếu trên cạnh trên */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 h-px"
        style={{
          background: dark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)",
        }}
      />

      {/* Vân bề mặt tinh tế */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: dark
            ? "radial-gradient(ellipse at 8% 0%, rgba(255,255,255,.055), transparent 55%)"
            : "radial-gradient(ellipse at 8% 0%, rgba(255,255,255,.9), transparent 58%)",
        }}
      />

      {/* Cạnh bên tạo cảm giác khối vật liệu */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-r-full"
        style={{
          background: `linear-gradient(180deg, ${theme.accent} 0%, ${theme.accent}88 55%, transparent 100%)`,
          boxShadow: `2px 0 8px ${theme.shadow}`,
        }}
      />

      {/* Icon dạng huy hiệu nổi */}
      <div
        className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-[12px] border text-[21px] font-semibold"
        style={{
          color: theme.accent,
          borderColor: dark
            ? "rgba(255,255,255,0.045)"
            : "rgba(255,255,255,0.95)",
          background: dark
            ? "linear-gradient(145deg, #2d3228, #24271f)"
            : "linear-gradient(145deg, #f3f5eb, #e3e8d8)",
          boxShadow: dark
            ? [
                "4px 4px 9px rgba(0,0,0,.24)",
                "-3px -3px 8px rgba(255,255,255,.035)",
                "inset 0 1px 0 rgba(255,255,255,.04)",
              ].join(", ")
            : [
                "4px 4px 9px rgba(54,65,41,.12)",
                "-4px -4px 9px rgba(255,255,255,.95)",
                "inset 0 1px 0 rgba(255,255,255,1)",
              ].join(", "),
        }}
      >
        {type === "loading" ? (
          <span className="ppe-toast-spinner">{theme.icon}</span>
        ) : (
          <span
            className="transition-transform duration-300 group-hover:scale-110"
            aria-hidden="true"
          >
            {theme.icon}
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className="relative z-10 min-w-0 flex-1 py-0.5">
        <p
          className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: theme.accent }}
        >
          {isEn ? theme.titleEn : theme.titleVi}
        </p>

        <p className="break-words text-[13px] font-medium leading-[1.65] tracking-[0.005em]">
          {message}
        </p>
      </div>

      {/* Điểm sáng trang trí */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-16 w-24"
        style={{
          background: `radial-gradient(ellipse at bottom right, ${theme.shadow}, transparent 72%)`,
        }}
      />

      {/* Đường vát đáy */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-4 h-px w-1/2"
        style={{
          background: dark
            ? "linear-gradient(90deg, transparent, rgba(0,0,0,.3), transparent)"
            : "linear-gradient(90deg, transparent, rgba(91,107,68,.16), transparent)",
        }}
      />
    </div>
  );
}

export function showToast(
  message: string,
  type: ToastType = "blank",
  options?: { id?: string },
) {
  const content = () => <WoodenToast message={message} type={type} />;
  const base = options?.id ? { id: options.id } : {};

  if (type === "success") {
    return toast.custom(content, { duration: 3000, ...base });
  }

  if (type === "error") {
    return toast.custom(content, { duration: 5000, ...base });
  }

  if (type === "loading") {
    return toast.custom(content, { duration: Infinity, ...base });
  }

  return toast.custom(content, { duration: 4000, ...base });
}

export function ToasterProvider() {
  return (
    <>
      <style jsx global>{`
        .ppe-toast {
          transform-origin: top right;
          animation: ppe-toast-drop 620ms
            cubic-bezier(0.19, 1, 0.22, 1) both;
          will-change: transform, opacity, filter;
        }

        .ppe-toast-spinner {
          display: inline-flex;
          animation: ppe-toast-spin 1.2s linear infinite;
        }

        @keyframes ppe-toast-drop {
          0% {
            opacity: 0;
            filter: blur(3px);
            transform: translate3d(30px, -42px, 0) rotate(4deg)
              scale(0.88);
          }

          55% {
            opacity: 1;
            filter: blur(0);
            transform: translate3d(-2px, 5px, 0) rotate(-0.65deg)
              scale(1.015);
          }

          74% {
            transform: translate3d(1px, -2px, 0) rotate(0.25deg)
              scale(0.995);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translate3d(0, 0, 0) rotate(0) scale(1);
          }
        }

        @keyframes ppe-toast-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ppe-toast,
          .ppe-toast-spinner {
            animation: none !important;
          }
        }
      `}</style>

      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 9999,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: "transparent",
            boxShadow: "none",
            padding: 0,
            maxWidth: "calc(100vw - 32px)",
          },
        }}
      />
    </>
  );
}

export { toast };
