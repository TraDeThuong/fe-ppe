"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Compass,
  Copy,
  HardHat,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogIn,
  SearchX,
  Video,
} from "lucide-react";

import { Button } from "@ui/button";
import { Badge } from "@ui/badge";
import { ThemeToggle } from "@ui/theme-toggle";
import { EnglishFlag, VietnamFlag } from "@ui/flag-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";

export interface NotFoundViewProps {
  /**
   * - "fullscreen": Trang đầy đủ độc lập kèm top header branding & footer (mặc định tại app/not-found.tsx)
   * - "shell": Nhúng trong AppShell (sidebar + header của trang quản trị)
   * - "auto": Tự động nhận diện dựa trên phiên đăng nhập
   */
  mode?: "fullscreen" | "shell" | "auto";
}

export function NotFoundView({ mode = "auto" }: NotFoundViewProps) {
  const { user, status } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const rawPathname = usePathname();

  const [displayPath, setDisplayPath] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentYear, setCurrentYear] = useState(2026);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDisplayPath(window.location.pathname || rawPathname || "");
      setCurrentYear(new Date().getFullYear());
    }
  }, [rawPathname]);

  const isAuthenticated = status === "authenticated" && Boolean(user);
  const effectiveMode =
    mode === "auto" ? (isAuthenticated ? "shell" : "fullscreen") : mode;
  const isFullscreen = effectiveMode === "fullscreen";

  const handleCopyPath = async () => {
    if (!displayPath) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${window.location.origin}${displayPath}`,
        );
      }
      setCopied(true);
      toast.success(t("guard.copiedUrl"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(displayPath);
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "vi-VN" ? "en-US" : "vi-VN");
  };

  const quickLinks = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      title: t("guard.quickLinksDashboard"),
      description: t("guard.quickLinksDashboardDesc"),
      color: "text-primary",
      requireAuth: true,
    },
    {
      href: "/cameras",
      icon: Video,
      title: t("guard.quickLinksCameras"),
      description: t("guard.quickLinksCamerasDesc"),
      color: "text-cyan-600 dark:text-cyan-400",
      requireAuth: true,
    },
    {
      href: "/incidents",
      icon: AlertTriangle,
      title: t("guard.quickLinksIncidents"),
      description: t("guard.quickLinksIncidentsDesc"),
      color: "text-amber-500",
      requireAuth: true,
    },
    {
      href: "/sites",
      icon: Compass,
      title: t("guard.quickLinksSites"),
      description: t("guard.quickLinksSitesDesc"),
      color: "text-emerald-500",
      requireAuth: true,
    },
  ];

  return (
    <div
      className={`relative flex flex-col justify-between bg-background transition-colors duration-200 ${
        isFullscreen
          ? "min-h-screen"
          : "h-full min-h-[calc(100vh-140px)] p-4 sm:p-6 lg:p-8"
      }`}
    >
      {/* Ambient background lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[450px] rounded-full bg-primary/[0.07] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/4 h-[350px] w-[350px] rounded-full bg-amber-500/[0.05] blur-3xl"
      />

      {/* Fullscreen Header (chỉ hiện khi chạy độc lập ngoài AppShell) */}
      {isFullscreen && (
        <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8 lg:px-12">
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="group flex items-center gap-3 transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-background shadow-nm dark:border-white/10">
              <HardHat className="h-5 w-5 text-primary transition-transform group-hover:rotate-12" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-foreground">
                Smart PPE
              </span>
              <span className="ml-1.5 hidden text-xs font-semibold text-muted-foreground sm:inline-block">
                Monitoring
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Chuyển ngôn ngữ */}
            <button
              type="button"
              onClick={toggleLocale}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--shadow-light)_30%,transparent)] bg-background px-2.5 text-xs font-semibold text-foreground shadow-nm transition-all hover:text-primary active:shadow-nm-pressed"
              title={locale === "vi-VN" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
            >
              {locale === "vi-VN" ? (
                <>
                  <VietnamFlag className="h-4 w-4" />
                  <span className="font-bold">VI</span>
                </>
              ) : (
                <>
                  <EnglishFlag className="h-4 w-4" />
                  <span className="font-bold">EN</span>
                </>
              )}
            </button>

            {/* Chuyển giao diện Sáng / Tối */}
            <ThemeToggle variant="dropdown" />

            {/* Trạng thái xác thực */}
            {isAuthenticated ? (
              <Link href="/dashboard" className="hidden sm:inline-block">
                <Button variant="outline" size="sm" className="gap-2">
                  <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                  <span className="max-w-[120px] truncate text-xs font-bold">
                    {user?.fullName || t("guard.backToDashboard")}
                  </span>
                </Button>
              </Link>
            ) : (
              <Link href="/login" className="hidden sm:inline-block">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>{t("guard.backToLogin")}</span>
                </Button>
              </Link>
            )}
          </div>
        </header>
      )}

      {/* Main Content Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-2xl text-center">
          {/* Outer Neumorphic Container */}
          <div className="rounded-[28px] border border-white/60 bg-background p-6 shadow-[10px_10px_30px_var(--shadow-dark),-10px_-10px_30px_var(--shadow-light)] dark:border-white/10 sm:p-10">
            {/* Top 3D Animated Icon */}
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/70 bg-background shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light),inset_1px_1px_0_rgba(255,255,255,0.8)] dark:border-white/10">
              <div className="relative animate-neumorphic-breathe">
                <SearchX className="h-11 w-11 text-primary" />
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 flex h-4 w-4"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500 shadow-sm" />
                </span>
              </div>
            </div>

            {/* Error Code & Status Badge */}
            <div className="mb-3 flex items-center justify-center gap-2">
              <Badge variant="warning" size="md" className="font-extrabold uppercase tracking-wider">
                {t("guard.notFoundCode")} • {t("guard.notFoundTitle")}
              </Badge>
            </div>

            {/* Giant Title */}
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {t("guard.notFoundTitle")}
            </h1>

            {/* Subtitle & Description */}
            <p className="mt-2 text-sm font-semibold text-primary">
              {t("guard.notFoundSubtitle")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("guard.notFoundDescription")}
            </p>

            {/* Path Box with Copy Button */}
            {displayPath && (
              <div className="mx-auto mt-5 flex max-w-md items-center justify-between gap-2 rounded-xl border border-white/40 bg-card/60 p-2 text-xs shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/5">
                <div className="flex min-w-0 items-center gap-1.5 pl-2 text-left">
                  <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                    {t("guard.requestedUrl")}
                  </span>
                  <code className="truncate font-mono font-bold text-foreground">
                    {displayPath}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--shadow-light)_40%,transparent)] bg-background px-2.5 py-1 text-[11px] font-bold text-foreground shadow-nm transition-all hover:text-primary active:shadow-nm-pressed"
                  title={t("guard.copyUrl")}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {t("guard.copyUrl")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>{t("guard.copyUrl")}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="primary" size="md" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t("guard.backToDashboard")}</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/">
                  <Button variant="primary" size="md" className="gap-2">
                    <Home className="h-4 w-4" />
                    <span>{t("guard.backToHome")}</span>
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                size="md"
                className="gap-2"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push(isAuthenticated ? "/dashboard" : "/");
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t("guard.goBack")}</span>
              </Button>

              {!isAuthenticated && (
                <Link href="/login">
                  <Button variant="ghost" size="md" className="gap-2 border border-border/60">
                    <LogIn className="h-4 w-4 text-primary" />
                    <span>{t("guard.backToLogin")}</span>
                  </Button>
                </Link>
              )}
            </div>

            {/* Helpful Quick Links (chỉ hiển thị khi đã đăng nhập hoặc ở trang độc lập) */}
            <div className="mt-8 border-t border-[color-mix(in_srgb,var(--shadow-dark)_15%,transparent)] pt-6 text-left">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("guard.quickLinks")}
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl border border-white/40 bg-background/80 p-3 shadow-nm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-nm-sm dark:border-white/5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/50 bg-background shadow-nm dark:border-white/10">
                        <Icon className={`h-4.5 w-4.5 ${item.color} transition-transform group-hover:scale-110`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground transition-colors group-hover:text-primary">
                          {item.title}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Support info note */}
            <div className="mt-6 flex items-start gap-2 rounded-xl bg-card/40 p-3 text-left text-xs text-muted-foreground">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <span className="font-bold text-foreground">
                  {t("guard.needHelp")}{" "}
                </span>
                <span>{t("guard.contactAdmin")}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Footer */}
      {isFullscreen && (
        <footer className="relative z-10 px-4 py-4 text-center text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Smart PPE Monitoring System. All rights
            reserved.
          </p>
        </footer>
      )}
    </div>
  );
}
