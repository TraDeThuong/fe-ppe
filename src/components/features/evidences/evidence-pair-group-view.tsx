"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Check,
  Download,
  ExternalLink,
  Film,
  ImageOff,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IncidentSeverityBadge } from "@/components/features/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/features/incidents/incident-status-badge";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { resolveEvidenceUrl } from "@/lib/evidence-url";
import {
  clusterIncidentsByPerson,
  type IncidentCluster,
} from "@/lib/incident-cluster-engine";
import {
  extractEvidenceBoundingBoxes,
  formatRelativeEvidenceTime,
  getViolationLabel,
  groupEvidencesByIncident,
} from "@/lib/evidence-utils";
import { useLocale } from "@/providers/locale-provider";
import type { EvidenceItem, IncidentItem } from "@/types";
import { EvidenceAiHudOverlay, EvidenceIntegrityPill } from "./evidence-status-pill";

export interface EvidencePairGroupViewProps {
  evidences: EvidenceItem[];
  incidentsMap: Map<string, IncidentItem>;
  selectedIds: Set<string>;
  verifyingIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onInspect: (evidence: EvidenceItem, openInCompare?: boolean) => void;
  onVerify: (evidence: EvidenceItem) => void;
  onDownload: (evidence: EvidenceItem) => void;
}

export function EvidencePairGroupView({
  evidences,
  incidentsMap,
  selectedIds,
  verifyingIds,
  onToggleSelect,
  onInspect,
  onVerify,
  onDownload,
}: EvidencePairGroupViewProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { getCamera, getCameraCode, getSiteCode, getSiteName } = useEntityLookup();

  const groups = groupEvidencesByIncident(
    evidences,
    incidentsMap,
    (camId) => getCamera(camId)?.siteId,
  );

  const clusterByIncidentId = useMemo(() => {
    const map = new Map<string, IncidentCluster>();
    const allIncidents = Array.from(incidentsMap.values());
    if (allIncidents.length === 0) return map;
    for (const cl of clusterIncidentsByPerson(allIncidents)) {
      if (cl.rawCount > 1) {
        for (const id of cl.incidentIds) {
          map.set(id, cl);
        }
      }
    }
    return map;
  }, [incidentsMap]);

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const refEv = group.reference;
        const snapEv = group.snapshot ?? group.others[0];
        const canCompare = Boolean(refEv && snapEv);
        const primaryTarget = snapEv ?? refEv ?? group.videos[0] ?? group.allItems[0];
        const inc = group.incident;
        const multiCluster = clusterByIncidentId.get(group.incidentId);
        const siteLabel = group.siteId
          ? getSiteCode(group.siteId) || getSiteName(group.siteId)
          : "";

        return (
          <section
            key={group.incidentId}
            className="rounded-2xl border border-white/40 bg-surface p-4 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/[0.06]"
          >
            {/* Group Header */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/25 pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  #{group.incidentId.slice(0, 8)}
                </span>
                {inc?.violationType && (
                  <Badge variant="danger" size="sm">
                    {getViolationLabel(inc.violationType, isVi)}
                  </Badge>
                )}
                {multiCluster && (
                  <span
                    title={multiCluster.violationCodes
                      .map((c) => getViolationLabel(c, isVi))
                      .join(" + ")}
                    className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-extrabold text-warning"
                  >
                    <Layers className="size-3" />
                    <span>
                      {isVi
                        ? `Cùng cụm đa vi phạm (${multiCluster.rawCount} lỗi)`
                        : `Multi-violation cluster (${multiCluster.rawCount})`}
                    </span>
                  </span>
                )}
                {inc?.severity && <IncidentSeverityBadge severity={inc.severity} />}
                {inc?.status && <IncidentStatusBadge status={inc.status} />}
                <span className="text-xs text-muted-foreground">
                  •{" "}
                  <span className="font-mono font-semibold text-foreground/85">
                    {getCameraCode(group.cameraId)}
                  </span>
                  {siteLabel ? ` (${siteLabel})` : ""}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  • {formatRelativeEvidenceTime(group.latestCapturedAt, isVi)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {canCompare && snapEv && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onInspect(snapEv, true)}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span>{t("evidences.pairs.compareSlider")}</span>
                  </Button>
                )}
                <Link href={`/incidents/${group.incidentId}`}>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{t("evidences.actions.openIncident")}</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Side-by-side Before / After slots */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PairSlotCard
                label={t("evidences.pairs.beforeSlot")}
                tone="info"
                evidence={refEv}
                selected={refEv ? selectedIds.has(refEv.id) : false}
                isVerifying={refEv ? verifyingIds.has(refEv.id) : false}
                onToggleSelect={onToggleSelect}
                onInspect={(ev) => onInspect(ev, canCompare)}
                onVerify={onVerify}
                onDownload={onDownload}
                emptyText={t("evidences.pairs.noReference")}
              />

              <PairSlotCard
                label={t("evidences.pairs.afterSlot")}
                tone="danger"
                evidence={snapEv}
                selected={snapEv ? selectedIds.has(snapEv.id) : false}
                isVerifying={snapEv ? verifyingIds.has(snapEv.id) : false}
                onToggleSelect={onToggleSelect}
                onInspect={(ev) => onInspect(ev, canCompare)}
                onVerify={onVerify}
                onDownload={onDownload}
                emptyText={t("evidences.pairs.noSnapshot")}
                showAiBox
              />
            </div>

            {/* Extra Videos / Additional Evidences */}
            {(group.videos.length > 0 || group.others.length > (snapEv && !group.snapshot ? 1 : 0)) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/20 pt-2.5">
                {group.videos.map((vid) => (
                  <Button
                    key={vid.id}
                    size="sm"
                    variant="outline"
                    onClick={() => onInspect(vid)}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Film className="h-3.5 w-3.5 text-warning" />
                    <span className="max-w-[200px] truncate">{vid.fileName}</span>
                  </Button>
                ))}
                {group.others
                  .filter((o) => o.id !== primaryTarget?.id)
                  .map((extra) => (
                    <Button
                      key={extra.id}
                      size="sm"
                      variant="ghost"
                      onClick={() => onInspect(extra)}
                      className="h-7 text-xs"
                    >
                      {extra.fileName}
                    </Button>
                  ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

interface PairSlotCardProps {
  label: string;
  tone: "info" | "danger";
  evidence?: EvidenceItem;
  selected: boolean;
  isVerifying: boolean;
  emptyText: string;
  showAiBox?: boolean;
  onToggleSelect: (id: string) => void;
  onInspect: (ev: EvidenceItem) => void;
  onVerify: (ev: EvidenceItem) => void;
  onDownload: (ev: EvidenceItem) => void;
}

function PairSlotCard({
  label,
  tone,
  evidence,
  selected,
  isVerifying,
  emptyText,
  showAiBox = false,
  onToggleSelect,
  onInspect,
  onVerify,
  onDownload,
}: PairSlotCardProps) {
  const { locale, t } = useLocale();
  const url = evidence ? resolveEvidenceUrl(evidence.url || evidence.storageKey) : "";
  const boxes = showAiBox && evidence ? extractEvidenceBoundingBoxes(evidence) : [];

  if (!evidence) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/50 bg-background/40 text-center text-xs text-muted-foreground">
        <ImageOff className="h-6 w-6 opacity-50" />
        <span className="font-semibold">{label}</span>
        <span className="text-[11px] opacity-80">{emptyText}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-2.5 transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border/35 bg-background/60 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant={tone} size="sm">
          {label}
        </Badge>
        <div className="flex items-center gap-1.5">
          <EvidenceIntegrityPill
            evidenceId={evidence.id}
            expectedChecksum={evidence.metadata?.checksum}
            isVerifying={isVerifying}
            onVerify={() => onVerify(evidence)}
            compact
          />
          <button
            type="button"
            onClick={() => onToggleSelect(evidence.id)}
            className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border transition-colors ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-transparent hover:border-primary/60"
            }`}
            aria-label={t("evidences.batch.toggleItem")}
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </button>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onInspect(evidence)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onInspect(evidence);
          }
        }}
        className="relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={evidence.fileName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
        {boxes.length > 0 && <EvidenceAiHudOverlay boxes={boxes} compact showLabels={false} />}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{evidence.fileName}</p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(evidence.capturedAt).toLocaleString(locale)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={isVerifying}
            onClick={() => onVerify(evidence)}
            className="h-7 px-2"
            title={t("evidences.actions.verifySha")}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDownload(evidence)}
            className="h-7 px-2"
            title={t("evidences.actions.downloadOriginal")}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
