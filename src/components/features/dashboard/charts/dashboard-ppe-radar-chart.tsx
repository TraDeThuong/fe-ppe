
"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HardHat,
  MapPinOff,
  Radar,
  ShieldCheck,
  Shirt,
  Activity,
  ArrowUpRight,
} from "lucide-react";

import { useLocale } from "@/providers/locale-provider";
import type {
  StatisticsSummaryDto,
  ViolationTypeStatDto,
} from "@/types";

export interface DashboardPpeRadarChartProps {
  distribution?: ViolationTypeStatDto[];
  summary?: StatisticsSummaryDto | null;
  className?: string;
  loading?: boolean;
}

interface RealSafetyRuleCompliance {
  id: "NO_HELMET" | "NO_VEST" | "RESTRICTED_AREA" | "MULTI_VIOLATION";
  nameVi: string;
  nameEn: string;
  icon: React.ComponentType<{ className?: string }>;
  violationCount: number;
  percentage: number;
  complianceRate: number;
  tone: "success" | "warning" | "danger";
}

const CX = 160;
const CY = 145;
const MAX_R = 88;
const RINGS = [0.25, 0.5, 0.75, 1];

const getTone = (tone: RealSafetyRuleCompliance["tone"]) => {
  if (tone === "success") {
    return {
      text: "text-primary",
      bg: "bg-primary/10",
      shadow: "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
    };
  }

  if (tone === "danger") {
    return {
      text: "text-destructive",
      bg: "bg-destructive/10",
      shadow: "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
    };
  }

  return {
    text: "text-accent-foreground",
    bg: "bg-accent/15",
    shadow: "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
  };
};

export function DashboardPpeRadarChart({
  distribution = [],
  summary,
  className = "",
  loading = false,
}: DashboardPpeRadarChartProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [activeItem, setActiveItem] =
    useState<RealSafetyRuleCompliance | null>(null);

  const totalViolations = useMemo(
    () => distribution.reduce((sum, item) => sum + item.count, 0),
    [distribution],
  );

  const globalCompliance = summary?.complianceRate ?? 95;

  const rulesData = useMemo<RealSafetyRuleCompliance[]>(() => {
    const map = new Map<string, ViolationTypeStatDto>();

    distribution.forEach((item) => {
      map.set(item.violationType, item);
    });

    const getCompliance = (count: number) => {
      if (totalViolations === 0) return 100;

      const penalty = Math.min(40, (count / totalViolations) * 35);

      return Math.round(
        Math.max(
          60,
          globalCompliance -
            penalty +
            (100 - globalCompliance) * 0.3,
        ) * 10,
      ) / 10;
    };

    const helmet = map.get("NO_HELMET");
    const vest = map.get("NO_VEST");
    const area = map.get("RESTRICTED_AREA");
    const multi = map.get("MULTI_VIOLATION");

    const createRule = (
      id: RealSafetyRuleCompliance["id"],
      nameVi: string,
      nameEn: string,
      icon: RealSafetyRuleCompliance["icon"],
      item?: ViolationTypeStatDto,
      dangerThreshold = 5,
    ): RealSafetyRuleCompliance => {
      const count = item?.count ?? 0;

      return {
        id,
        nameVi,
        nameEn,
        icon,
        violationCount: count,
        percentage: item?.percentage ?? 0,
        complianceRate: getCompliance(count),
        tone:
          count === 0
            ? "success"
            : count > dangerThreshold
              ? "danger"
              : "warning",
      };
    };

    return [
      createRule("NO_HELMET", "Mũ bảo hộ", "Safety Helmet", HardHat, helmet),
      createRule("NO_VEST", "Áo phản quang", "High-Vis Vest", Shirt, vest),
      createRule(
        "RESTRICTED_AREA",
        "Vùng nguy hiểm",
        "Hazard Zone",
        MapPinOff,
        area,
        3,
      ),
      createRule(
        "MULTI_VIOLATION",
        "Đa vi phạm",
        "Multi-Violations",
        ShieldCheck,
        multi,
        0,
      ),
    ];
  }, [distribution, totalViolations, globalCompliance]);

  const points = useMemo(() => {
    return rulesData.map((item, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 2;
      const radius = (item.complianceRate / 100) * MAX_R;

      return {
        item,
        x: CX + radius * Math.cos(angle),
        y: CY + radius * Math.sin(angle),
        lx: CX + (MAX_R + 25) * Math.cos(angle),
        ly: CY + (MAX_R + 25) * Math.sin(angle),
      };
    });
  }, [rulesData]);

  const polygonPath = useMemo(
    () => points.map((point) => `${point.x},${point.y}`).join(" "),
    [points],
  );

  const strongest = useMemo(
    () =>
      [...rulesData].sort(
        (a, b) => b.complianceRate - a.complianceRate,
      )[0],
    [rulesData],
  );

  const weakest = useMemo(
    () =>
      [...rulesData].sort(
        (a, b) => a.complianceRate - b.complianceRate,
      )[0],
    [rulesData],
  );

  const active = activeItem;

  return (
    <section
      className={[
        "relative isolate flex w-full flex-col overflow-hidden",
        "rounded-[30px] border border-border/30 bg-surface",
        "p-4 sm:p-5",
        "shadow-[12px_12px_28px_var(--shadow-dark),-12px_-12px_28px_var(--shadow-light)]",
        className,
      ].join(" ")}
    >
      {/* Ambient sculpted background */}
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.055] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-accent/[0.07] blur-3xl" />

      <div className="pointer-events-none absolute inset-[1px] rounded-[29px] border border-white/40 dark:border-white/[0.04]" />

      {/* HEADER */}
      <header className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "relative flex h-11 w-11 shrink-0 items-center justify-center",
              "rounded-[15px] bg-surface",
              "shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light)]",
            ].join(" ")}
          >
            <Radar className="h-5 w-5 text-primary" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_7px_var(--primary)]" />
          </div>

          <div className="min-w-0 pt-0.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                {isVietnamese ? "AI SAFETY INTELLIGENCE" : "AI SAFETY INTELLIGENCE"}
              </span>
            </div>

            <h3 className="text-[15px] font-extrabold tracking-tight text-foreground sm:text-lg">
              {isVietnamese
                ? "Radar tuân thủ an toàn"
                : "Safety Compliance Radar"}
            </h3>

            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
              {isVietnamese
                ? "Phân tích mức độ tuân thủ theo 4 quy chuẩn"
                : "Compliance analysis across 4 safety regulations"}
            </p>
          </div>
        </div>

        {/* Compliance KPI */}
        <div
          className={[
            "relative shrink-0 overflow-hidden rounded-[18px]",
            "bg-surface px-3 py-2.5 sm:px-4",
            "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Compliance" : "Compliance"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline gap-0.5">
            <span className="text-xl font-black leading-none tracking-tight text-primary tabular-nums sm:text-2xl">
              {loading ? "—" : globalCompliance.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              %
            </span>
          </div>
        </div>
      </header>

      {/* MAIN RADAR */}
      <div className="relative z-10 my-4">
        <div
          className={[
            "relative overflow-hidden rounded-[26px]",
            "border border-border/20 bg-background/40",
            "px-1 py-3 sm:px-3",
            "shadow-[inset_8px_8px_18px_var(--shadow-dark),inset_-8px_-8px_18px_var(--shadow-light)]",
          ].join(" ")}
        >
          {/* Inner top indicator */}
          <div className="absolute left-4 top-3 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
              LIVE ANALYTICS
            </span>
          </div>

          <svg
            viewBox="0 0 320 290"
            className="mx-auto mt-3 block h-[235px] w-full max-w-[350px] select-none overflow-visible sm:h-[260px]"
          >
            <defs>
              <radialGradient id="ppeRadarGradient" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                <stop offset="65%" stopColor="var(--primary)" stopOpacity="0.13" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.24" />
              </radialGradient>

              <linearGradient id="ppeRadarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>

              <filter id="ppeNodeShadow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* Radar rings */}
            {RINGS.map((factor, index) => {
              const radius = factor * MAX_R;

              const ringPoints = [
                `${CX},${CY - radius}`,
                `${CX + radius},${CY}`,
                `${CX},${CY + radius}`,
                `${CX - radius},${CY}`,
              ].join(" ");

              return (
                <g key={factor}>
                  <polygon
                    points={ringPoints}
                    fill={index === 3 ? "var(--primary)" : "none"}
                    fillOpacity={index === 3 ? 0.025 : 0}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.13 + index * 0.07}
                    strokeWidth={index === 3 ? 1.2 : 0.8}
                    strokeDasharray={index === 3 ? "none" : "3 4"}
                  />
                </g>
              );
            })}

            {/* Axis lines */}
            <g
              stroke="var(--muted-foreground)"
              strokeOpacity="0.22"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            >
              <line x1={CX} y1={CY - MAX_R} x2={CX} y2={CY + MAX_R} />
              <line x1={CX - MAX_R} y1={CY} x2={CX + MAX_R} y2={CY} />
            </g>

            {/* Center engraved circle */}
            <circle
              cx={CX}
              cy={CY}
              r="20"
              fill="var(--background)"
              stroke="var(--border)"
              strokeOpacity="0.3"
              strokeWidth="1"
            />
            <circle
              cx={CX}
              cy={CY}
              r="15"
              fill="none"
              stroke="var(--primary)"
              strokeOpacity="0.2"
              strokeDasharray="2 3"
            />
            <ShieldCheck
              x={CX - 9}
              y={CY - 9}
              width="18"
              height="18"
              color="var(--primary)"
              strokeWidth="1.6"
            />

            {/* Data polygon */}
            <polygon
              points={polygonPath}
              fill="url(#ppeRadarGradient)"
              stroke="url(#ppeRadarStroke)"
              strokeWidth="2.6"
              strokeLinejoin="round"
              className="transition-all duration-500"
            />

            {/* Subtle inner polygon highlight */}
            <polygon
              points={polygonPath}
              fill="none"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Data nodes */}
            {points.map(({ item, x, y }) => {
              const isActive = active?.id === item.id;

              return (
                <g
                  key={item.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveItem(item)}
                  onMouseLeave={() => setActiveItem(null)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 13 : 10}
                    fill="var(--primary)"
                    fillOpacity="0.12"
                    className="transition-all duration-200"
                  />

                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 6.5 : 5}
                    fill="var(--surface)"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                  />

                  <circle
                    cx={x}
                    cy={y}
                    r="2"
                    fill="var(--accent)"
                  />
                </g>
              );
            })}

            {/* Labels */}
            {points.map(({ item, lx, ly }) => {
              const isActive = active?.id === item.id;
              const label = isVietnamese ? item.nameVi : item.nameEn;

              const anchor =
                Math.abs(lx - CX) < 15
                  ? "middle"
                  : lx > CX
                    ? "start"
                    : "end";

              return (
                <text
                  key={`label-${item.id}`}
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  dominantBaseline="central"
                  fill={isActive ? "var(--primary)" : "var(--foreground)"}
                  fontSize="9"
                  fontWeight={isActive ? 900 : 700}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setActiveItem(item)}
                  onMouseLeave={() => setActiveItem(null)}
                >
                  {label}
                </text>
              );
            })}
          </svg>

          {/* Hover information */}
          <div className="mx-auto mt-0 flex min-h-[38px] max-w-[290px] items-center justify-center">
            {active ? (
              <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-2 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]">
                <span className="text-xs font-bold text-foreground">
                  {isVietnamese ? active.nameVi : active.nameEn}
                </span>
                <span className="text-sm font-black tabular-nums text-primary">
                  {active.complianceRate}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {active.violationCount} {isVietnamese ? "vi phạm" : "violations"}
                </span>
              </div>
            ) : (
              <span className="text-[9px] font-medium tracking-wide text-muted-foreground/70">
                {isVietnamese
                  ? "Di chuột vào điểm dữ liệu để xem chi tiết"
                  : "Hover over a data point to inspect"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RULE LEGEND */}
      <div className="relative z-10 grid grid-cols-2 gap-2">
        {rulesData.map((item) => {
          const Icon = item.icon;
          const tone = getTone(item.tone);
          const isActive = active?.id === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setActiveItem(item)}
              onMouseLeave={() => setActiveItem(null)}
              onClick={() =>
                setActiveItem((current) =>
                  current?.id === item.id ? null : item,
                )
              }
              className={[
                "group relative flex min-w-0 items-center gap-2.5",
                "rounded-[17px] border border-border/20 bg-surface p-2.5",
                "text-left transition-all duration-200",
                isActive
                  ? "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
                  : "shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] hover:-translate-y-0.5",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  "bg-surface",
                  "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                  tone.text,
                ].join(" ")}
              >
                <Icon className="h-[17px] w-[17px]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold text-muted-foreground">
                  {isVietnamese ? item.nameVi : item.nameEn}
                </p>

                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black leading-none tabular-nums text-foreground">
                    {item.complianceRate}%
                  </span>
                  <span className="truncate text-[9px] text-muted-foreground">
                    {item.violationCount} {isVietnamese ? "lỗi" : "issues"}
                  </span>
                </div>
              </div>

              <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          );
        })}
      </div>

      {/* BOTTOM INSIGHTS */}
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 border-t border-border/30 pt-3">
        {/* Best */}
        <div className="relative overflow-hidden rounded-[18px] bg-surface p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Tuân thủ tốt nhất" : "Best Compliance"}
            </span>
          </div>

          <p className="mt-2 truncate text-xs font-extrabold text-foreground">
            {strongest
              ? isVietnamese
                ? strongest.nameVi
                : strongest.nameEn
              : "—"}
          </p>

          <div className="mt-1 flex items-center gap-1">
            <span className="text-lg font-black leading-none tabular-nums text-primary">
              {strongest?.complianceRate ?? 0}%
            </span>
            <span className="text-[9px] text-muted-foreground">
              {isVietnamese ? "tuân thủ" : "compliance"}
            </span>
          </div>
        </div>

        {/* Weakest */}
        <div className="relative overflow-hidden rounded-[18px] bg-surface p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Cần chú ý nhất" : "Needs Attention"}
            </span>
          </div>

          <p className="mt-2 truncate text-xs font-extrabold text-foreground">
            {weakest && weakest.violationCount > 0
              ? isVietnamese
                ? weakest.nameVi
                : weakest.nameEn
              : isVietnamese
                ? "Không có vi phạm"
                : "Zero Violations"}
          </p>

          <div className="mt-1 flex items-center gap-1">
            <span className="text-lg font-black leading-none tabular-nums text-foreground">
              {weakest?.violationCount ?? 0}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {isVietnamese ? "vi phạm" : "violations"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-3 flex items-center justify-between">
        <span className="text-[9px] font-medium text-muted-foreground">
          {isVietnamese ? "Tổng số vi phạm ghi nhận" : "Total recorded violations"}
        </span>
        <span className="rounded-lg bg-surface px-2.5 py-1 text-xs font-black tabular-nums text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
          {loading ? "—" : totalViolations.toLocaleString()}
        </span>
      </div>
    </section>
  );
}
