"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { HardHat, Languages, Sun, Moon } from "lucide-react";

import { Typography } from "@ui/typography";
import { NeumorphicSurface } from "@ui/neumorphic-surface";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@ui/card";

import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";

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

const IMAGE_PREFIX = "/images/auth-illustration-";
const IMAGE_EXTENSION = ".jpg";
const MAX_IMAGES = 100;

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

function NeumorphicTileWall() {
  const tiles = useMemo(() => createTiles(), []);

  return (
    <div
      aria-label="Interactive Neumorphism tiles"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden hidden md:block"
    >
      {tiles.map((tile) => {
        const tileStyle = {
          left: `${tile.x}%`,
          top: `${tile.y}%`,
          opacity: tile.opacity,
          transform: `translate(-50%, -50%) rotate(${tile.rotation}deg)`,
          "--tile-delay": `${(tile.id % 13) * -2.5}s`,
          "--tile-duration": `${40 + (tile.id % 11) * 5}s`,
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
              aria-label={`Neumorphic tile ${tile.id + 1}`}
              className="border-0"
            />
          </div>
        );
      })}
    </div>
  );
}

/* ========================================
   AUTOMATIC IMAGE DISCOVERY
======================================== */

function AuthImageSlideshow() {
  const [images, setImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Automatically discover images numbered from 1 to MAX_IMAGES on desktop screen.
  useEffect(() => {
    // Tiết kiệm băng thông và RAM trên mobile: không tải ảnh khi ở màn hình nhỏ
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }

    let cancelled = false;

    async function discoverImages() {
      const foundImages: string[] = [];
      const batchSize = 10;

      for (
        let start = 1;
        start <= MAX_IMAGES;
        start += batchSize
      ) {
        if (cancelled) return;

        const end = Math.min(start + batchSize - 1, MAX_IMAGES);

        const results = await Promise.all(
          Array.from({ length: end - start + 1 }, async (_, index) => {
            const number = start + index;
            const src = `${IMAGE_PREFIX}${number}${IMAGE_EXTENSION}`;

            const exists = await new Promise<boolean>((resolve) => {
              const image = new window.Image();

              image.onload = () => resolve(true);
              image.onerror = () => resolve(false);
              image.src = src;
            });

            return exists ? src : null;
          }),
        );

        foundImages.push(
          ...results.filter((src): src is string => src !== null),
        );
      }

      if (!cancelled) {
        setImages(foundImages);
        setActiveIndex(0);
      }
    }

    void discoverImages();

    return () => {
      cancelled = true;
    };
  }, []);

  // Change image every 10 seconds.
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, IMAGE_INTERVAL);

    return () => window.clearInterval(interval);
  }, [images]);

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

      <div
        className="absolute inset-0"
        aria-label="Construction safety illustrations"
      >
        {images.map((src, index) => (
          <img
            key={src}
            src={src}
            alt="Construction site safety"
            aria-hidden={index !== activeIndex}
            className={`auth-image-layer ${
              index === activeIndex ? "is-active" : ""
            }`}
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
  "inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl",
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
  const { locale, setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();

  const isVietnamese = locale === "vi-VN";
  const isDark = resolvedTheme === "dark";

  function toggleLocale() {
    setLocale(isVietnamese ? "en-US" : "vi-VN");
  }

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
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
                Monitoring System
              </span>
            </div>
          </div>

          {/* Language and theme controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              aria-label={
                isVietnamese ? "Switch to English" : "Chuyển sang tiếng Việt"
              }
              title={
                isVietnamese ? "Switch to English" : "Chuyển sang tiếng Việt"
              }
              className={`${controlClassName} px-2.5 sm:px-3`}
            >
              <Languages className="size-3.5 sm:size-4" aria-hidden="true" />
              <span className="text-xs font-bold">
                {isVietnamese ? "VI" : "EN"}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
              className={`${controlClassName} size-9 sm:size-10`}
            >
              {isDark ? (
                <Sun className="size-3.5 sm:size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-3.5 sm:size-4" aria-hidden="true" />
              )}
            </button>
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
                  <AuthImageSlideshow />

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
                        Intelligent Safety System
                      </span>
                    </div>

                    <h2 className="max-w-md text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                      Safety starts
                      <br />
                      with awareness.
                    </h2>

                    <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
                      Monitor protective equipment and help create a safer,
                      smarter construction environment.
                    </p>

                    <div className="mt-7 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-300" />
                      <span className="text-xs tracking-wide text-white/65">
                        Protect people. Prevent incidents.
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
                  className="!text-card text-2xl font-black sm:text-3xl lg:text-4xl"
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
