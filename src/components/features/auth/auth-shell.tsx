"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { HardHat, Languages } from "lucide-react";

import { Typography } from "@ui/typography";
import { NeumorphicSurface } from "@ui/neumorphic-surface";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@ui/card";

import { useIsDesktop, useResponsiveVariant } from "@/hooks/use-media-query";
import { useLocale } from "@/providers/locale-provider";
import { ThemeToggle } from "@ui/theme-toggle";

export interface AuthShellProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  cardClassName?: string;
}

/* ========================================
   AUTH IMAGE SLIDESHOW CONFIG
======================================== */

/**
 * Danh sách ảnh tĩnh có thật trong public/images — thay cho việc dò tuần tự
 * auth-illustration-1..N bằng new Image() (luôn sinh 1 request 404 ở ảnh
 * không tồn tại đầu tiên mỗi lần tải trang). Thêm/bớt ảnh: sửa mảng này.
 */
const AUTH_IMAGES = [
  "/images/auth-illustration-1.jpg",
  "/images/auth-illustration-2.jpg",
  "/images/auth-illustration-3.jpg",
  "/images/auth-illustration-4.jpg",
  "/images/auth-illustration-5.jpg",
] as const;

const IMAGE_INTERVAL = 10_000;
const IMAGE_FADE_DURATION = 2_000;

/* ========================================
   NEUMORPHIC BACKGROUND TILES
======================================== */

type Tile = {
  id: number;
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  level: "flat" | "raised" | "raised-strong" | "inset" | "inset-strong";
};

const TILE_LEVELS: Tile["level"][] = [
  "flat",
  "raised",
  "raised-strong",
  "inset",
  "inset-strong",
];

function createTiles(): Tile[] {
  let seed = 92831;

  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const tiles: Tile[] = [];
  let id = 0;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 15; col++) {
      if (random() < 0.1) continue;

      const x = col * 7.4 - 1 + random() * 2.8;
      const y = row * 12.5 - 2 + random() * 4;

      const dx = Math.abs(x - 50) / 50;
      const dy = Math.abs(y - 50) / 50;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const centerFade = Math.max(
        0.035,
        Math.min(0.4, (distance - 0.35) * 0.65),
      );

      tiles.push({
        id: id++,
        x,
        y,
        opacity: centerFade,
        rotation: (random() - 0.5) * 5,
        level: TILE_LEVELS[Math.floor(random() * TILE_LEVELS.length)],
      });
    }
  }

  return tiles;
}

/** Seed cố định → bố cục tile luôn giống nhau: tính 1 lần cho cả module */
const TILES = createTiles();

/**
 * Tối ưu (giữ nguyên hình ảnh):
 * - Mobile: gỡ hẳn ~120 node sau khi hydrate (trước đây chỉ ẩn bằng CSS
 *   `hidden md:block` nên DOM + animation vẫn tồn tại).
 * - Bỏ `will-change: filter` của từng tile: 120 compositor layer riêng tốn
 *   bộ nhớ GPU trong khi animation brightness chỉ đổi 6% trong 40-90s.
 * - Tile là nền trang trí: aria-hidden + tabIndex -1 — trước đây mỗi tile là
 *   1 role="button" có tabIndex 0, bàn phím phải Tab qua ~120 tile mới tới form.
 *   Chuột vẫn bấm đổi kiểu tile như cũ.
 */
function NeumorphicTileWall() {
  const { showDesktop } = useResponsiveVariant();
  if (!showDesktop) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden hidden md:block"
    >
      {TILES.map((tile) => {
        const tileStyle = {
          left: `${tile.x}%`,
          top: `${tile.y}%`,
          opacity: tile.opacity,
          transform: `translate(-50%, -50%) rotate(${tile.rotation}deg)`,
          "--tile-delay": `${(tile.id % 13) * -2.5}s`,
          "--tile-duration": `${40 + (tile.id % 11) * 5}s`,
          willChange: "auto",
        } as CSSProperties;

        return (
          <div
            key={tile.id}
            className="pointer-events-auto absolute animate-neumorphic-breathe"
            style={tileStyle}
          >
            <NeumorphicSurface
              width={100}
              height={50}
              radius={8}
              defaultLevel={tile.level}
              cycleLevels={TILE_LEVELS}
              tabIndex={-1}
              className="border-0"
            />
          </div>
        );
      })}
    </div>
  );
}

/* ========================================
   AUTH IMAGE SLIDESHOW
======================================== */

function AuthImageSlideshow({ label, alt }: { label: string; alt: string }) {
  // Chỉ tải ảnh trên desktop (panel ảnh ẩn trên mobile) — tiết kiệm băng thông
  const isDesktop = useIsDesktop();
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  // Chỉ gắn <img> cho ảnh đang hiện + ảnh kế tiếp (preload trước 1 nhịp),
  // không tải cả 5 ảnh ngay khi mở trang
  const [mountedCount, setMountedCount] = useState(2);

  const images = isDesktop ? AUTH_IMAGES.filter((src) => !failed.has(src)) : [];

  const handleError = useCallback((src: string) => {
    setFailed((current) => new Set(current).add(src));
  }, []);

  // Change image every 10 seconds.
  useEffect(() => {
    if (images.length <= 1) return;

    const total = images.length;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % total);
      // Mỗi nhịp tiến 1 ảnh → gắn thêm đúng 1 ảnh kế tiếp (giữ ảnh cũ để fade-out)
      setMountedCount((count) => Math.min(total, count + 1));
    }, IMAGE_INTERVAL);

    return () => window.clearInterval(interval);
  }, [images.length]);

  const safeActiveIndex = images.length > 0 ? activeIndex % images.length : 0;

  return (
    <>
      <style>{`
        .auth-image-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity ${IMAGE_FADE_DURATION}ms ease-in-out;
          will-change: opacity;
        }

        .auth-image-layer.is-active {
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-image-layer {
            transition: none;
            will-change: auto;
          }
        }
      `}</style>

      <div className="absolute inset-0" aria-label={label}>
        {images.slice(0, mountedCount).map((src, index) => (
          <img
            key={src}
            src={src}
            alt={alt}
            aria-hidden={index !== safeActiveIndex}
            className={`auth-image-layer ${
              index === safeActiveIndex ? "is-active" : ""
            }`}
            decoding="async"
            fetchPriority={index === 0 ? "high" : "low"}
            onError={() => handleError(src)}
            draggable={false}
          />
        ))}
      </div>
    </>
  );
}

/* ========================================
   AUTH SHELL
======================================== */

const controlClassName = [
  "inline-flex min-h-[44px] min-w-[44px] sm:min-h-10 sm:h-10 items-center justify-center gap-2 rounded-xl",
  "border border-border/50 bg-background text-foreground",
  "shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)]",
  "transition-all duration-300",
  "hover:-translate-y-0.5",
  "active:translate-y-0",
  "active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
].join(" ");

export function AuthShell({
  title,
  description,
  children,
  footer,
  cardClassName,
}: AuthShellProps) {
  const { locale, setLocale, t } = useLocale();

  const isVietnamese = locale === "vi-VN";

  function toggleLocale() {
    setLocale(isVietnamese ? "en-US" : "vi-VN");
  }

  return (
    <main className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden bg-background px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-32 top-10 size-80 rounded-full bg-primary/[0.035] blur-3xl opacity-60 md:opacity-100" />
        <div className="absolute -bottom-32 -right-20 size-96 rounded-full bg-primary/[0.045] blur-3xl opacity-60 md:opacity-100" />
      </div>

      {/* Neumorphic background tiles (chỉ render trên desktop md: để tối ưu pin và 60fps trên mobile) */}
      <NeumorphicTileWall />

      {/* Main Container */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 sm:gap-6 md:max-w-7xl">
        {/* Top Header Bar: Logo & Theme/Language controls */}
        <header className="flex w-full items-center justify-between px-1">
          {/* Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)]">
              <HardHat className="size-4 sm:size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-black tracking-wider text-foreground uppercase">
                SMART PPE
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("authShell.brandSubtitle")}
              </span>
            </div>
          </div>

          {/* Language and theme controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              aria-label={t("authShell.switchLanguage")}
              title={t("authShell.switchLanguage")}
              className={`${controlClassName} px-2.5 sm:px-3`}
            >
              <Languages className="size-3.5 sm:size-4" aria-hidden="true" />
              <span className="text-xs font-bold">
                {isVietnamese ? "VI" : "EN"}
              </span>
            </button>

            <ThemeToggle
              id="auth-theme-toggle-btn"
              buttonClassName="min-h-[44px] min-w-[44px] sm:min-h-10 sm:min-w-10"
            />
          </div>
        </header>

        {/* Main Card */}
        <Card
          variant="raised"
          className={[
            "relative w-full overflow-hidden rounded-2xl md:rounded-[1.75rem]",
            "border border-border/40 bg-background",
            "shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]",
            cardClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Recessed Image Slideshow (ẨN TRÊN MOBILE, CHỈ HIỆN TỪ md TRỞ LÊN) */}
            <div className="hidden md:block p-4 sm:p-6 lg:p-7">
              <div
                className={[
                  "group relative h-full min-h-[580px] rounded-[1.4rem] p-[6px]",
                  "bg-background",
                  "shadow-[inset_5px_5px_10px_var(--shadow-dark),inset_-5px_-5px_10px_var(--shadow-light)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "relative size-full overflow-hidden rounded-[1.1rem]",
                    "bg-background",
                    "shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.12)]",
                  ].join(" ")}
                >
                  <AuthImageSlideshow
                    label={t("authShell.imagesLabel")}
                    alt={t("authShell.imageAlt")}
                  />

                  {/* Image overlay */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/5 to-black/80"
                  />

                  {/* Recessed edge */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-[2] rounded-[1.1rem] shadow-[inset_6px_6px_14px_rgba(0,0,0,0.2),inset_-3px_-3px_8px_rgba(255,255,255,0.1)]"
                  />

                  {/* Image content */}
                  <div className="absolute inset-x-0 bottom-0 z-[3] p-6 sm:p-8 lg:p-9">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="h-px w-8 bg-white/70" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
                        {t("authShell.eyebrow")}
                      </span>
                    </div>

                    <h2 className="max-w-md text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {t("authShell.headlineLine1")}
                      <br />
                      {t("authShell.headlineLine2")}
                    </h2>

                    <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
                      {t("authShell.description")}
                    </p>

                    <div className="mt-7 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-300" />
                      <span className="text-xs tracking-wide text-white/65">
                        {t("authShell.tagline")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form (Căn chỉnh cân đối trên Mobile, bỏ khoảng trống pt-20 thừa thãi) */}
            <div className="flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 md:px-10 md:py-12 lg:px-14 xl:px-16">
              <CardHeader className="space-y-2 px-0 pb-6 pt-0">
                <Typography
                  variant="embossed"
                  className="text-2xl font-black sm:text-3xl lg:text-4xl"
                >
                  {title}
                </Typography>

                {description != null && (
                  <CardDescription className="max-w-md text-sm leading-6">
                    {description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="px-0 pb-0">
                {children}
              </CardContent>
            </div>
          </div>
        </Card>

        {/* Footer */}
        {footer != null && (
          <div className="w-full text-center pb-2">{footer}</div>
        )}
      </div>
    </main>
  );
}
