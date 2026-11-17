"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Camera,
  ChevronDown,
  ChevronUp,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import {
  CameraStatsDetailPanel,
  type CameraKpiFilterKey,
} from "./camera-stats-detail-panel";
import { filterSessionsForCameras } from "./camera-live-helpers";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export type { CameraKpiFilterKey };

export interface CameraKpiSummaryProps {
  cameras: CameraItem[];
  statusCounts?: { total: number; online: number; offline: number } | null;
  sessions: LiveSessionInfo[];
  activeFilter: CameraKpiFilterKey;
  onSelectFilter: (key: CameraKpiFilterKey) => void;
  onDetailOpenChange?: (open: boolean) => void;
  loading?: boolean;
}

export function CameraKpiSummary({
  cameras,
  statusCounts,
  sessions,
  activeFilter,
  onSelectFilter,
  onDetailOpenChange,
  loading = false,
}: CameraKpiSummaryProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [selectedStat, setSelectedStat] = useState<CameraKpiFilterKey | null>(
    null,
  );

  const effectiveSessions = useMemo(() => {
    const total = statusCounts?.total ?? cameras.length;
    if (total === 0) {
      return [];
    }
    if (cameras.length > 0 && cameras.length >= total) {
      return filterSessionsForCameras(sessions, cameras).matchedSessions;
    }
    return sessions;
  }, [cameras, sessions, statusCounts]);

  const stats = useMemo(() => {
    const total = statusCounts?.total ?? cameras.length;
    const online =
      statusCounts?.online ??
      cameras.filter((c) => c.status === "ONLINE").length;
    const offline = statusCounts?.offline ?? Math.max(0, total - online);

    const runningSessions = effectiveSessions.filter(
      (s) => s.status === "running",
    );
    let activePersons = 0;
    let activeViolations = 0;

    for (const s of runningSessions) {
      activePersons +=
        s.metrics?.counts?.person ?? s.metrics?.active_persons ?? 0;
      activeViolations += s.metrics?.active_violations ?? 0;
    }

    return {
      total,
      online,
      offline,
      runningCount: runningSessions.length,
      activePersons,
      activeViolations,
    };
  }, [cameras, effectiveSessions, statusCounts]);

  const handleToggle = (key: CameraKpiFilterKey) => {
    setSelectedStat((prev) => {
      const next = prev === key ? null : key;
      onDetailOpenChange?.(next !== null);
      return next;
    });
  };

  // Hiệu ứng chìm sâu (neumorphic sunken) chuẩn mực kiểu cũ:
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  const cards = [
    {
      key: "all" as const,
      title: isVietnamese ? "Tổng Thiết Bị Camera" : "Total Cameras",
      value: loading ? "..." : stats.total,
      icon: Camera,
      tone: "primary" as const,
      activeTextClass: "text-primary",
      hoverBorderClass: "hover:border-primary/30",
      description: `${stats.online} Online · ${stats.offline} Offline`,
    },
    {
      key: "online" as const,
      title: isVietnamese ? "Sẵn Sàng Kết Nối DB" : "DB Connected & Ready",
      value: loading ? "..." : stats.online,
      icon: Activity,
      tone: "success" as const,
      activeTextClass: "text-success",
      hoverBorderClass: "hover:border-success/30",
      description:
        stats.total > 0
          ? isVietnamese
            ? `${Math.round((stats.online / stats.total) * 100)}% khả dụng`
            : `${Math.round((stats.online / stats.total) * 100)}% available`
          : isVietnamese
            ? "Chưa có thiết bị"
            : "No devices yet",
    },
    {
      key: "ai_live" as const,
      title: isVietnamese ? "Đang AI Live Tracking" : "AI Live Tracking",
      value: loading ? "..." : stats.runningCount,
      icon: Radio,
      tone: "warning" as const,
      activeTextClass: "text-warning",
      hoverBorderClass: "hover:border-warning/30",
      description: isVietnamese
        ? `${stats.activePersons} người đang bám vết`
        : `${stats.activePersons} persons tracked`,
    },
    {
      key: "violations" as const,
      title: isVietnamese ? "Vi Phạm Đang Kích Hoạt" : "Active Violations",
      value: loading ? "..." : stats.activeViolations,
      icon: ShieldAlert,
      tone: (stats.activeViolations > 0 ? "danger" : "default") as
        | "danger"
        | "default",
      activeTextClass:
        stats.activeViolations > 0 ? "text-danger" : "text-primary",
      hoverBorderClass: "hover:border-danger/30",
      description:
        stats.activeViolations > 0
          ? isVietnamese
            ? "Phát hiện vi phạm thời gian thực"
            : "Real-time violations detected"
          : isVietnamese
            ? "An toàn • Chưa có vi phạm"
            : "Safe • No active violations",
    },
  ];

  return (
    <section
      aria-label={isVietnamese ? "Tóm tắt chỉ số đội camera" : "Camera fleet KPI summary"}
      className="space-y-4"
    >
      {/* Bento Grid 4 Stats Cards kiểu cũ - 2x2 Mobile, 4 cột Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const isSelected = selectedStat === card.key;
          return (
            <StatsCard
              key={card.key}
              title={card.title}
              value={card.value}
              icon={card.icon}
              variant="soft-extruded"
              tone={card.tone}
              showGlow={false}
              description={card.description}
              onClick={() => handleToggle(card.key)}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? sunkenClass : card.hoverBorderClass
              }`}
              footer={
                <span className="flex items-center gap-0.5 text-[10px] font-semibold transition-colors">
                  {isSelected ? (
                    <span
                      className={`flex items-center gap-0.5 font-bold ${card.activeTextClass}`}
                    >
                      {isVietnamese ? "Thu gọn" : "Collapse"} <ChevronUp className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
                      {isVietnamese ? "Chi tiết" : "Details"} <ChevronDown className="h-3 w-3" />
                    </span>
                  )}
                </span>
              }
            />
          );
        })}
      </div>

      {/* Bảng chi tiết mở rộng khi click vào 1 trong 4 Stats Card */}
      {selectedStat && (
        <CameraStatsDetailPanel
          activeStat={selectedStat}
          cameras={cameras}
          sessions={effectiveSessions}
          isFleetFilteredByThisStat={activeFilter === selectedStat}
          onToggleFleetFilter={(key) =>
            onSelectFilter(activeFilter === key ? "all" : key)
          }
          onClose={() => {
            setSelectedStat(null);
            onDetailOpenChange?.(false);
          }}
        />
      )}
    </section>
  );
}
