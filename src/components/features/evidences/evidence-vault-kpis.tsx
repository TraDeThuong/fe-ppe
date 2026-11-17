"use client";

import { CheckCircle2, Film, ImageIcon, Images } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import { EVIDENCE_TYPE, type EvidenceVaultCounts } from "@/types";

export interface EvidenceVaultKpisProps {
  counts?: EvidenceVaultCounts;
  activeType: string;
  onSelectType: (type: string) => void;
  loading?: boolean;
  pageHashCoverage?: { withHash: number; total: number };
}

const SUNKEN_CLASS =
  "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5";

export function EvidenceVaultKpis({
  counts,
  activeType,
  onSelectType,
  loading = false,
  pageHashCoverage,
}: EvidenceVaultKpisProps) {
  const { t } = useLocale();

  const handleToggle = (type: string) => {
    onSelectType(activeType === type ? "" : type);
  };

  const hashPct =
    pageHashCoverage && pageHashCoverage.total > 0
      ? Math.round((pageHashCoverage.withHash / pageHashCoverage.total) * 100)
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatsCard
        title={t("evidences.kpi.total")}
        value={loading ? "..." : (counts?.total ?? 0)}
        description={
          hashPct !== null
            ? t("evidences.kpi.hashCoverage", { pct: hashPct })
            : t("evidences.kpi.totalDesc")
        }
        icon={Images}
        variant="soft-extruded"
        tone="primary"
        showGlow={false}
        loading={loading}
        onClick={() => onSelectType("")}
        className={`cursor-pointer transition-all duration-200 ${
          activeType === "" ? SUNKEN_CLASS : "hover:border-primary/30"
        }`}
      />

      <StatsCard
        title={t("evidences.kpi.snapshots")}
        value={loading ? "..." : (counts?.snapshot ?? 0)}
        description={t("evidences.kpi.snapshotsDesc")}
        icon={ImageIcon}
        variant="soft-extruded"
        tone="danger"
        showGlow={false}
        loading={loading}
        onClick={() => handleToggle(EVIDENCE_TYPE.SNAPSHOT)}
        className={`cursor-pointer transition-all duration-200 ${
          activeType === EVIDENCE_TYPE.SNAPSHOT ? SUNKEN_CLASS : "hover:border-danger/30"
        }`}
      />

      <StatsCard
        title={t("evidences.kpi.references")}
        value={loading ? "..." : (counts?.referenceSnapshot ?? 0)}
        description={t("evidences.kpi.referencesDesc")}
        icon={CheckCircle2}
        variant="soft-extruded"
        tone="info"
        showGlow={false}
        loading={loading}
        onClick={() => handleToggle(EVIDENCE_TYPE.REFERENCE_SNAPSHOT)}
        className={`cursor-pointer transition-all duration-200 ${
          activeType === EVIDENCE_TYPE.REFERENCE_SNAPSHOT
            ? SUNKEN_CLASS
            : "hover:border-info/30"
        }`}
      />

      <StatsCard
        title={t("evidences.kpi.clips")}
        value={loading ? "..." : (counts?.videoClip ?? 0)}
        description={t("evidences.kpi.clipsDesc")}
        icon={Film}
        variant="soft-extruded"
        tone="warning"
        showGlow={false}
        loading={loading}
        onClick={() => handleToggle(EVIDENCE_TYPE.VIDEO_CLIP)}
        className={`cursor-pointer transition-all duration-200 ${
          activeType === EVIDENCE_TYPE.VIDEO_CLIP ? SUNKEN_CLASS : "hover:border-warning/30"
        }`}
      />
    </div>
  );
}
