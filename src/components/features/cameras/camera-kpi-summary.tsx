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
import {
  CameraStatsDetailPanel,
  type CameraKpiFilterKey,
} from "./camera-stats-detail-panel";
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
  const [selectedStat, setSelectedStat] = useState<CameraKpiFilterKey | null>(
    null,
  );

  const stats = useMemo(() => {
    const total = statusCounts?.total ?? cameras.length;
    const online =
      statusCounts?.online ??
      cameras.filter((c) => c.status === "ONLINE").length;
    const offline = statusCounts?.offline ?? Math.max(0, total - online);

    const runningSessions = sessions.filter((s) => s.status === "running");
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
  }, [cameras, sessions]);

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
      title: "Tổng Thiết Bị Camera",
      value: loading ? "..." : stats.total,
      icon: Camera,
      tone: "primary" as const,
      activeTextClass: "text-primary",
      hoverBorderClass: "hover:border-primary/30",
      description: `${stats.online} Online · ${stats.offline} Offline`,
    },
    {
      key: "online" as const,
      title: "Sẵn Sàng Kết Nối DB",
      value: loading ? "..." : stats.online,
      icon: Activity,
      tone: "success" as const,
      activeTextClass: "text-success",
      hoverBorderClass: "hover:border-success/30",
      description:
        stats.total > 0
          ? `${Math.round((stats.online / stats.total) * 100)}% khả dụng`
          : "Chưa có thiết bị",
    },
    {
      key: "ai_live" as const,
      title: "Đang AI Live Tracking",
      value: loading ? "..." : stats.runningCount,
      icon: Radio,
      tone: "warning" as const,
      activeTextClass: "text-warning",
      hoverBorderClass: "hover:border-warning/30",
      description: `${stats.activePersons} người đang bám vết`,
    },
    {
      key: "violations" as const,
      title: "Vi Phạm Đang Kích Hoạt",
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
          ? "Phát hiện vi phạm thời gian thực"
          : "An toàn • Chưa có vi phạm",
    },
  ];

  return (
    <section aria-label="Tóm tắt chỉ số đội camera" className="space-y-4">
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
                      Thu gọn <ChevronUp className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
                      Chi tiết <ChevronDown className="h-3 w-3" />
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
          sessions={sessions}
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
