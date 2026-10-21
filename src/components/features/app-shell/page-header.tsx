"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { Typography } from "@ui/typography";
import { useLocale } from "@/providers/locale-provider";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  badgeIcon?: LucideIcon;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  badgeIcon: BadgeIcon,
  breadcrumbs,
  actions,
  className = "",
}: PageHeaderProps) {
  const { t } = useLocale();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Optional Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{t("common.breadcrumb.home")}</span>
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Main Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex size-15 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <Icon className="size-8" strokeWidth={1.8} aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0 mb-3">
            <Typography
              as="h1"
              variant="embossed"
              className="text-2xl font-bold tracking-tight !text-background sm:text-3xl lg:text-4xl"
            >
              {title}
            </Typography>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        {(badge || actions) && (
          <div className="flex flex-wrap items-center gap-2">
            {badge && (
              <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border/30 bg-background px-3 py-2 text-xs font-medium text-muted-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                {BadgeIcon && (
                  <BadgeIcon className="size-3.5 text-primary" aria-hidden="true" />
                )}
                <span>{badge}</span>
              </div>
            )}
            {actions}
          </div>
        )}
      </header>
    </div>
  );
}
