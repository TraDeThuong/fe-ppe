"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  HardHat,
  Info,
  Layers,
  Loader2,
  MapPin,
  Send,
  ShieldAlert,
  ShieldBan,
  Shirt,
  X,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { stripEmojis } from "@/lib/strip-emojis";
import {
  resolveIncidentToastVisual,
  type IncidentToastKind,
  type IncidentToastSeverity,
  type ViolationToastIconKey,
} from "./toast-violation-theme";

export type ToastType = "success" | "error" | "loading" | "blank";

export interface IncidentToastInput {
  kind?: IncidentToastKind;
  violationType?: string;
  violationLabel?: string;
  severity?: IncidentToastSeverity | string;
  title: string;
  description?: string;
  cameraLabel?: string;
  siteLabel?: string;
  burstCount?: number;
  isGroupTarget?: boolean;
  groupCount?: number;
  incidentHref?: string;
  compareHref?: string;
  durationMs?: number;
  onOpen?: () => void;
  onCompare?: () => void;
}

const toastTheme: Record<
  ToastType,
  {
    icon: ReactNode;
    accent: string;
    titleVi: string;
    titleEn: string;
    shadow: string;
  }
> = {
  success: {
    icon: <Check className="size-5 stroke-[2.5]" />,
    accent: "#648747",
    titleVi: "Thành công",
    titleEn: "Success",
    shadow: "rgba(100, 135, 71, 0.24)",
  },
  error: {
    icon: <X className="size-5 stroke-[2.5]" />,
    accent: "#c45e52",
    titleVi: "Đã xảy ra lỗi",
    titleEn: "Error Occurred",
    shadow: "rgba(196, 94, 82, 0.24)",
  },
  loading: {
    icon: <Loader2 className="size-5 animate-spin stroke-[2.3]" />,
    accent: "#9b9664",
    titleVi: "Đang xử lý",
    titleEn: "Processing",
    shadow: "rgba(155, 150, 100, 0.2)",
  },
  blank: {
    icon: <Info className="size-5 stroke-[2.3]" />,
    accent: "#718b54",
    titleVi: "Thông báo",
    titleEn: "Notification",
    shadow: "rgba(113, 139, 84, 0.2)",
  },
};

function renderViolationIcon(iconKey: ViolationToastIconKey): ReactNode {
  const cls = "size-[18px] stroke-[2.25]";
  switch (iconKey) {
    case "shield-ban":
      return <ShieldBan className={cls} />;
    case "hard-hat":
      return <HardHat className={cls} />;
    case "shirt":
      return <Shirt className={cls} />;
    case "layers":
      return <Layers className={cls} />;
    case "alert-triangle":
      return <AlertTriangle className={cls} />;
    case "send":
      return <Send className={cls} />;
    case "check-circle":
      return <CheckCircle2 className={cls} />;
    case "shield-alert":
    default:
      return <ShieldAlert className={cls} />;
  }
}

function useToastEnvironment() {
  const [dark, setDark] = useState(false);
  const [isEn, setIsEn] = useState(false);

  useEffect(() => {
    const updateEnv = () => {
      setDark(
        document.documentElement.getAttribute("data-theme") === "dark" ||
          document.documentElement.classList.contains("dark"),
      );
      setIsEn(document.documentElement.lang?.startsWith("en") ?? false);
    };

    updateEnv();

    const observer = new MutationObserver(updateEnv);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "lang"],
    });

    return () => observer.disconnect();
  }, []);

  return { dark, isEn };
}

interface WoodenToastShellProps {
  dark: boolean;
  accent: string;
  shadow: string;
  role: "alert" | "status";
  ariaLive: "assertive" | "polite";
  visible?: boolean;
  compact?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  dataAttributes?: Record<string, string | undefined>;
  children: ReactNode;
}

/**
 * Khung vật liệu chuẩn của toàn hệ thống toast (.ppe-toast — Wooden Soft Neumorphic).
 * Dùng chung cho cả toast thường (success/error/info/loading) và toast sự cố PPE.
 */
function WoodenToastShell({
  dark,
  accent,
  shadow,
  role,
  ariaLive,
  visible = true,
  compact = false,
  clickable = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  dataAttributes,
  children,
}: WoodenToastShellProps) {
  return (
    <div
      role={role}
      aria-live={ariaLive}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...dataAttributes}
      className={[
        "ppe-toast group relative flex w-[min(370px,calc(100vw-32px))]",
        "overflow-hidden rounded-[15px] border backdrop-blur-xl",
        "transition-[background,color,border-color,opacity,transform] duration-300",
        compact ? "items-start gap-3 px-3.5 py-3" : "items-center gap-3.5 px-4 py-4",
        clickable ? "pointer-events-auto cursor-pointer" : "",
        visible ? "opacity-100" : "pointer-events-none translate-x-3 scale-[0.97] opacity-0",
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
              `0 0 22px ${shadow}`,
            ].join(", ")
          : [
              "0 18px 35px rgba(45,55,34,0.15)",
              "0 5px 12px rgba(45,55,34,0.08)",
              "inset 0 1px 0 rgba(255,255,255,1)",
              "inset 0 -2px 0 rgba(116,131,91,0.13)",
              `0 0 22px ${shadow}`,
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

      {/* Cạnh bên tạo cảm giác khối vật liệu & phân màu trực quan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-2.5 left-0 w-[3.5px] rounded-r-full"
        style={{
          background: `linear-gradient(180deg, ${accent} 0%, ${accent}aa 65%, transparent 100%)`,
          boxShadow: `2px 0 10px ${shadow}`,
        }}
      />

      {children}

      {/* Điểm sáng trang trí góc phải dưới */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-16 w-24"
        style={{
          background: `radial-gradient(ellipse at bottom right, ${shadow}, transparent 72%)`,
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

function getMedallionStyle(dark: boolean, accent: string) {
  return {
    color: accent,
    borderColor: dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.95)",
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
  };
}

function WoodenToast({
  message,
  type,
}: {
  message: string;
  type: ToastType;
}) {
  const { dark, isEn } = useToastEnvironment();
  const theme = toastTheme[type];

  return (
    <WoodenToastShell
      dark={dark}
      accent={theme.accent}
      shadow={theme.shadow}
      role={type === "error" ? "alert" : "status"}
      ariaLive={type === "error" ? "assertive" : "polite"}
    >
      {/* Icon dạng huy hiệu nổi */}
      <div
        className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-[12px] border text-[21px] font-semibold"
        style={getMedallionStyle(dark, theme.accent)}
      >
        {type === "loading" ? (
          <span className="inline-flex items-center justify-center">
            {theme.icon}
          </span>
        ) : (
          <span
            className="inline-flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
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
          {stripEmojis(message)}
        </p>
      </div>
    </WoodenToastShell>
  );
}

export interface WoodenIncidentToastProps extends IncidentToastInput {
  visible?: boolean;
  onDismiss?: () => void;
}

/**
 * Biến thể sự cố PPE của WoodenToast — nhỏ gọn, hiện đại, phân màu vi phạm rõ ràng,
 * không dùng thumbnail cồng kềnh nhưng giữ đầy đủ đường dẫn mở sự cố & đối chiếu.
 */
export function WoodenIncidentToast({
  kind = "RAW_AI_ALERT",
  violationType,
  violationLabel,
  severity,
  title,
  description,
  cameraLabel,
  siteLabel,
  burstCount = 1,
  isGroupTarget = false,
  groupCount,
  incidentHref,
  compareHref,
  durationMs,
  visible = true,
  onOpen,
  onCompare,
  onDismiss,
}: WoodenIncidentToastProps) {
  const { dark, isEn } = useToastEnvironment();
  const [isPaused, setIsPaused] = useState(false);

  const visual = resolveIncidentToastVisual({
    kind,
    violationType,
    severity,
  });

  const accent = dark ? visual.primary.accentDark : visual.primary.accentLight;
  const shadow = dark ? visual.primary.shadowDark : visual.primary.shadowLight;
  const pillBg = dark ? visual.primary.pillBgDark : visual.primary.pillBgLight;
  const effectiveDurationMs = durationMs ?? visual.durationMs;

  const badgeAccent = visual.violationBadge
    ? dark
      ? visual.violationBadge.accentDark
      : visual.violationBadge.accentLight
    : null;
  const badgeBg = visual.violationBadge
    ? dark
      ? visual.violationBadge.pillBgDark
      : visual.violationBadge.pillBgLight
    : null;

  const categoryLabel =
    kind === "RAW_AI_ALERT" && violationLabel
      ? violationLabel
      : isEn
        ? visual.primary.labelEn
        : visual.primary.labelVi;

  const canOpen = Boolean(onOpen || incidentHref);
  const canCompare = Boolean(onCompare || compareHref);

  const handleCardClick = () => {
    if (onOpen) {
      onDismiss?.();
      onOpen();
    } else if (incidentHref && typeof window !== "undefined") {
      onDismiss?.();
      window.location.assign(incidentHref);
    }
  };

  const handleOpenAction = (e: MouseEvent) => {
    e.stopPropagation();
    handleCardClick();
  };

  const handleCompareAction = (e: MouseEvent) => {
    e.stopPropagation();
    if (onCompare) {
      onDismiss?.();
      onCompare();
    } else if (compareHref && typeof window !== "undefined") {
      onDismiss?.();
      window.location.assign(compareHref);
    }
  };

  const handleDismissClick = (e: MouseEvent) => {
    e.stopPropagation();
    onDismiss?.();
  };

  const openActionText = isGroupTarget
    ? isEn
      ? groupCount && groupCount > 1
        ? `Group (${groupCount})`
        : "Open group"
      : groupCount && groupCount > 1
        ? `Nhóm (${groupCount})`
        : "Mở nhóm"
    : isEn
      ? "View incident"
      : "Xem sự cố";

  return (
    <WoodenToastShell
      dark={dark}
      accent={accent}
      shadow={shadow}
      role={visual.isCritical ? "alert" : "status"}
      ariaLive={visual.isCritical ? "assertive" : "polite"}
      visible={visible}
      compact
      clickable={canOpen}
      onClick={canOpen ? handleCardClick : undefined}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      dataAttributes={{
        "data-toast-variant": "incident",
        "data-violation-code": visual.primary.code,
        "data-incident-kind": kind,
        "data-incident-severity": visual.severity,
      }}
    >
      {/* Icon vi phạm nổi đồng bộ WoodenToast */}
      <div
        className="relative z-10 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[11px] border"
        style={getMedallionStyle(dark, accent)}
      >
        <span
          className="inline-flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        >
          {renderViolationIcon(visual.primary.iconKey)}
        </span>

        {visual.isCritical && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex size-2.5"
          >
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: accent }}
            />
            <span
              className="relative inline-flex size-2.5 rounded-full ring-2"
              style={{
                backgroundColor: accent,
                boxShadow: `0 0 6px ${accent}`,
                borderColor: dark ? "#292d24" : "#edf0e5",
              }}
            />
          </span>
        )}
      </div>

      {/* Cột nội dung siêu gọn 3 dòng */}
      <div className="relative z-10 min-w-0 flex-1">
        {/* Hàng 1: Loại vi phạm + Mức độ + Burst ×N + Nút đóng */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="truncate text-[10px] font-bold uppercase tracking-[0.13em]"
              style={{ color: accent }}
            >
              {categoryLabel}
            </span>

            {kind !== "OFFICER_RESOLVED_REPORT" && (
              <span
                className="shrink-0 rounded-[5px] px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-wider"
                style={{
                  color: accent,
                  backgroundColor: pillBg,
                }}
              >
                {visual.severity}
              </span>
            )}

            {visual.violationBadge && badgeAccent && badgeBg && (
              <span
                className="hidden max-w-[100px] shrink-0 truncate rounded-[5px] px-1.5 py-[1px] text-[9px] font-bold sm:inline-block"
                style={{
                  color: badgeAccent,
                  backgroundColor: badgeBg,
                }}
              >
                {isEn
                  ? visual.violationBadge.labelEn
                  : visual.violationBadge.labelVi}
              </span>
            )}

            {burstCount > 1 && (
              <span
                data-testid="incident-toast-burst"
                className="shrink-0 rounded-full px-1.5 py-[1px] font-mono text-[9.5px] font-extrabold text-white"
                style={{ backgroundColor: accent }}
              >
                ×{burstCount}
              </span>
            )}
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={handleDismissClick}
              aria-label={isEn ? "Dismiss notification" : "Đóng thông báo"}
              className={[
                "-mr-1 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors",
                dark
                  ? "text-[#e8eadf]/55 hover:bg-white/10 hover:text-[#e8eadf]"
                  : "text-[#303a29]/50 hover:bg-black/5 hover:text-[#303a29]",
              ].join(" ")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Hàng 2: Tiêu đề + mô tả ngắn */}
        <p className="mt-0.5 line-clamp-1 text-[13px] font-semibold leading-[1.35] tracking-[0.003em]">
          {stripEmojis(title)}
        </p>

        {description && (
          <p
            className={[
              "mt-0.5 line-clamp-1 text-[11.5px] leading-[1.4]",
              dark ? "text-[#e8eadf]/70" : "text-[#303a29]/70",
            ].join(" ")}
          >
            {stripEmojis(description)}
          </p>
        )}

        {/* Hàng 3: Metadata Camera/Site + Link mở sự cố & Đối chiếu */}
        {(cameraLabel || siteLabel || canOpen || canCompare) && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {cameraLabel && (
                <span
                  className={[
                    "inline-flex shrink-0 items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                    dark
                      ? "bg-white/[0.06] text-[#e8eadf]/90"
                      : "bg-black/[0.05] text-[#303a29]/85",
                  ].join(" ")}
                >
                  <Camera className="size-2.5 shrink-0" style={{ color: accent }} />
                  <span className="max-w-[82px] truncate">{cameraLabel}</span>
                </span>
              )}

              {siteLabel && (
                <span
                  className={[
                    "inline-flex min-w-0 items-center gap-1 text-[10.5px]",
                    dark ? "text-[#e8eadf]/65" : "text-[#303a29]/65",
                  ].join(" ")}
                >
                  <MapPin className="size-2.5 shrink-0 opacity-75" />
                  <span className="truncate">{siteLabel}</span>
                </span>
              )}
            </div>

            {(canOpen || canCompare) && (
              <div className="flex shrink-0 items-center gap-1">
                {canCompare && (
                  <button
                    type="button"
                    onClick={handleCompareAction}
                    title={
                      isEn
                        ? "Compare evidence frames"
                        : "Mở màn hình đối chiếu bằng chứng"
                    }
                    className={[
                      "inline-flex items-center gap-1 rounded-[7px] px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors",
                      dark
                        ? "bg-white/[0.06] text-[#e8eadf]/80 hover:bg-white/[0.12] hover:text-[#e8eadf]"
                        : "bg-black/[0.05] text-[#303a29]/75 hover:bg-black/[0.09] hover:text-[#303a29]",
                    ].join(" ")}
                  >
                    <Layers className="size-3" />
                    <span className="hidden sm:inline">
                      {isEn ? "Compare" : "Đối chiếu"}
                    </span>
                  </button>
                )}

                {canOpen && (
                  <button
                    type="button"
                    onClick={handleOpenAction}
                    className="inline-flex items-center gap-1 rounded-[7px] px-2 py-0.5 text-[10.5px] font-bold transition-all hover:brightness-110 active:scale-95"
                    style={{
                      color: accent,
                      backgroundColor: pillBg,
                    }}
                  >
                    <span>{openActionText}</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thanh tiến trình đếm ngược siêu mảnh (2px) tự dừng khi rê chuột */}
      {effectiveDurationMs > 0 && Number.isFinite(effectiveDurationMs) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
          style={{
            backgroundColor: dark
              ? "rgba(255,255,255,0.06)"
              : "rgba(48,58,41,0.07)",
          }}
        >
          <div
            key={`${burstCount}-${effectiveDurationMs}`}
            className="ppe-toast-progress h-full"
            style={{
              backgroundColor: accent,
              animationDuration: `${effectiveDurationMs}ms`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>
      )}
    </WoodenToastShell>
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

export function showIncidentToast(
  input: IncidentToastInput,
  options?: {
    id?: string;
    duration?: number;
    onDismissComplete?: (toastId: string) => void;
  },
) {
  const visual = resolveIncidentToastVisual({
    kind: input.kind,
    violationType: input.violationType,
    severity: input.severity,
  });
  const duration = options?.duration ?? input.durationMs ?? visual.durationMs;

  return toast.custom(
    (t) => (
      <WoodenIncidentToast
        {...input}
        durationMs={duration}
        visible={t.visible}
        onDismiss={() => {
          options?.onDismissComplete?.(t.id);
          toast.dismiss(t.id);
        }}
      />
    ),
    {
      ...(options?.id ? { id: options.id } : {}),
      duration,
      position: "top-right",
    },
  );
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

        .ppe-toast-progress {
          animation-name: ppe-toast-countdown;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
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

        @keyframes ppe-toast-countdown {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ppe-toast,
          .ppe-toast-spinner,
          .ppe-toast-progress {
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
export {
  resolveIncidentToastVisual,
  getIncidentToastDuration,
  VIOLATION_TOAST_THEMES,
  INCIDENT_KIND_THEMES,
  type IncidentToastKind,
  type IncidentToastSeverity,
  type ViolationVisualToken,
  type ResolvedIncidentToastVisual,
} from "./toast-violation-theme";
