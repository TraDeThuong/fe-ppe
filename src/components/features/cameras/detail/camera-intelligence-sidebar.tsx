"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  ExternalLink,
  Eye,
  HardHat,
  Layers,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type {
  AiInspectionConfig,
  ComputedPersonTrack,
  FrameLogEntry,
  StreamMetadata,
  ViolationEvent,
} from "./types";

export interface CameraIntelligenceSidebarProps {
  currentEntry: FrameLogEntry | null;
  allViolations: ViolationEvent[];
  personTracks: ComputedPersonTrack[];
  cameraId: string;
  cameraCode?: string;
  siteName?: string;
  streamMetadata?: StreamMetadata;
  safetyConfig?: Partial<AiInspectionConfig>;
  activeModelName?: string;
  onSnapshot?: () => void;
  onViewSnapshot?: (url: string) => void;
  onSeekToFrame?: (frame: number) => void;
  cameraStatus?: string;
  realIncidentsCount?: number;
  totalFrames?: number;
}

const VT_LABEL: Record<string, { vi: string; en: string }> = {
  no_helmet: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  no_safety_vest: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
  no_boots: { vi: "Không mang giày bảo hộ", en: "No Safety Boots" },
  restricted_area: { vi: "Xâm nhập vùng cấm", en: "Restricted Area Breach" },
};

export function CameraIntelligenceSidebar({
  currentEntry,
  allViolations,
  personTracks,
  cameraId,
  cameraCode = "CAM-01",
  siteName = "Công Trường Xây Dựng",
  streamMetadata,
  safetyConfig,
  activeModelName = "YOLOv11s-PPE (best.pt)",
  onSnapshot,
  onViewSnapshot,
  onSeekToFrame,
  cameraStatus = "ONLINE",
  realIncidentsCount = 0,
  totalFrames,
}: CameraIntelligenceSidebarProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const getViolationName = (type: string) => {
    const item = VT_LABEL[type];
    if (item) return isVietnamese ? item.vi : item.en;
    return type;
  };

  const cardShadow =
    "shadow-[0_-1px_0_rgba(0,0,0,0.025)_inset,6px_8px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)]";

  // Thống kê nhân sự trong khung hình hiện tại
  const persons = currentEntry?.persons || [];
  const totalInFrame = persons.length;
  const violatingPersons = persons.filter(
    (p) => p.status === "CONFIRMED_VIOLATION" || p.status === "VIOLATION"
  );
  const candidatePersons = persons.filter(
    (p) => p.status === "VIOLATION_CANDIDATE"
  );
  const compliantCount = totalInFrame - violatingPersons.length - candidatePersons.length;
  const complianceRate =
    totalInFrame > 0 ? Math.round((compliantCount / totalInFrame) * 100) : 100;

  const isCurrentFrameViolating = violatingPersons.length > 0;
  const isCurrentFrameCandidate = candidatePersons.length > 0;

  // Lấy ảnh bằng chứng gần nhất
  const activeEvidencePath =
    currentEntry?.evidence?.[0]?.path ||
    (streamMetadata?.youtubeId
      ? `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`
      : "/images/camera-live-evidence.jpg");

  const latestViolation = allViolations[0];
  const timelineTotalFrames = useMemo(() => {
    if (totalFrames && totalFrames > 0) return totalFrames;

    const lastTrackFrame = personTracks.reduce(
      (max, track) => Math.max(max, track.frames[track.frames.length - 1] ?? 0),
      0,
    );
    const lastViolationFrame = allViolations.reduce(
      (max, violation) => Math.max(max, violation.frame),
      0,
    );

    return Math.max(currentEntry?.frame ?? 0, lastTrackFrame, lastViolationFrame, 1);
  }, [allViolations, currentEntry?.frame, personTracks, totalFrames]);

  const currentProgress = Math.min(
    100,
    Math.max(0, ((currentEntry?.frame ?? 0) / timelineTotalFrames) * 100),
  );

  const timelineMarkers = useMemo(
    () => allViolations.slice(0, 8).map((violation) => ({
      frame: violation.frame,
      position: Math.min(100, Math.max(0, (violation.frame / timelineTotalFrames) * 100)),
      label: `${getViolationName(violation.violation_type)} · F${violation.frame}`,
    })),
    [allViolations, timelineTotalFrames, isVietnamese],
  );

  const trackingLog = useMemo(() => {
    if (currentEntry?.events?.length) return currentEntry.events.slice(-4).reverse();

    return persons.slice(0, 4).map((person) => {
      if (person.status === "CONFIRMED_VIOLATION") {
        return isVietnamese
          ? `Worker #${person.track_id}: đã xác nhận vi phạm PPE`
          : `Worker #${person.track_id}: PPE violation confirmed`;
      }
      if (person.status === "VIOLATION_CANDIDATE") {
        return isVietnamese
          ? `Worker #${person.track_id}: đang đếm thời gian thiếu PPE`
          : `Worker #${person.track_id}: missing PPE timer running`;
      }
      return isVietnamese
        ? `Worker #${person.track_id}: bám vết ổn định`
        : `Worker #${person.track_id}: tracking stable`;
    });
  }, [currentEntry?.events, isVietnamese, persons]);

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-[24px] border ${
        isCurrentFrameViolating
          ? "border-rose-500/40 bg-surface"
          : isCurrentFrameCandidate
            ? "border-amber-500/40 bg-surface"
            : "border-border/40 bg-surface"
      } h-auto w-full p-4 text-xs ${cardShadow} min-h-[520px] transition-colors lg:h-full lg:min-h-0`}
    >
      {/* ── 1. HEADER BẢNG ĐIỀU HÀNH TRỰC TIẾP ── */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                isCurrentFrameViolating
                  ? "bg-rose-500/15 text-rose-500 animate-pulse"
                  : isCurrentFrameCandidate
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-emerald-500/15 text-emerald-500"
              } shadow-[inset_1px_1px_3px_var(--shadow-dark)]`}
            >
              {isCurrentFrameViolating ? (
                <ShieldAlert className="h-5 w-5" />
              ) : isCurrentFrameCandidate ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {isVietnamese ? "Bảng Giám Sát An Toàn Trực Tiếp" : "Live Safety Inspection Panel"}
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                {cameraCode} • {siteName}
              </p>
            </div>
          </div>

          <Badge
            variant={
              isCurrentFrameViolating
                ? "danger"
                : isCurrentFrameCandidate
                  ? "warning"
                  : "success"
            }
            size="sm"
          >
            {isCurrentFrameViolating ? (
              <span className="flex items-center gap-1 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                {isVietnamese ? "🚨 PHÁT HIỆN VI PHẠM" : "🚨 VIOLATION DETECTED"}
              </span>
            ) : isCurrentFrameCandidate ? (
              <span className="flex items-center gap-1 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {isVietnamese ? "⚠ ĐANG ĐẾM THỜI GIAN" : "⚠ TEMPORAL COUNT"}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {isVietnamese ? "✓ KHU VỰC AN TOÀN" : "✓ SAFE ZONE"}
              </span>
            )}
          </Badge>
        </div>

        {/* ── 2. METRICS AN TOÀN TỨC THỜI (KPI LIVE) ── */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {/* Người trong khung */}
          <div className="rounded-xl border border-border/30 bg-background/50 p-2.5 text-center shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
            <span className="text-[10px] text-muted-foreground font-medium block">
              {isVietnamese ? "Người trong khung" : "Workers in View"}
            </span>
            <span className="text-sm font-extrabold font-mono text-foreground mt-0.5 block">
              {totalInFrame}
            </span>
          </div>

          {/* Tỷ lệ tuân thủ PPE */}
          <div className="rounded-xl border border-border/30 bg-background/50 p-2.5 text-center shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
            <span className="text-[10px] text-muted-foreground font-medium block">
              {isVietnamese ? "Tuân thủ PPE" : "PPE Compliance"}
            </span>
            <span
              className={`text-sm font-extrabold font-mono mt-0.5 block ${
                complianceRate === 100
                  ? "text-emerald-500"
                  : complianceRate >= 50
                    ? "text-amber-500"
                    : "text-rose-500"
              }`}
            >
              {complianceRate}%
            </span>
          </div>

          {/* Sự cố đang ghi nhận */}
          <div className="rounded-xl border border-border/30 bg-background/50 p-2.5 text-center shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
            <span className="text-[10px] text-muted-foreground font-medium block">
              {isVietnamese ? "Sự cố trong ca" : "Session Incidents"}
            </span>
            <span className="text-sm font-extrabold font-mono text-primary mt-0.5 block">
              {allViolations.length}
            </span>
          </div>
        </div>

        {/* ── 3. DANH SÁCH CÔNG NHÂN ĐANG THEO DÕI TRỰC TIẾP (COMPACT TRACKED WORKERS) ── */}
        <div className="mt-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{isVietnamese ? "Công nhân trong khung hình" : "Workers in Frame"}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              ByteTrack • Kalman Filter
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
            {persons.length === 0 ? (
              <div className="rounded-xl border border-border/20 bg-background/30 p-3 text-center text-muted-foreground text-[11px]">
                {isVietnamese ? "Chưa có công nhân nào trong khung hình" : "No workers detected in frame"}
              </div>
            ) : (
              persons.map((p) => {
                const isViolating = p.status === "CONFIRMED_VIOLATION";
                const isCandidate = p.status === "VIOLATION_CANDIDATE";

                // Kiểm tra liên kết mũ, áo của người này
                const assoc = currentEntry?.associations.find(
                  (a) => a.person === p.track_id
                );
                const hasHelmet = assoc?.helmet != null;
                const hasVest = assoc?.vest != null;

                return (
                  <div
                    key={p.track_id}
                    className={`flex items-center justify-between rounded-xl border p-2 transition ${
                      isViolating
                        ? "border-rose-500/40 bg-rose-500/[0.08]"
                        : isCandidate
                          ? "border-amber-500/40 bg-amber-500/[0.08]"
                          : "border-border/30 bg-background/40 hover:bg-background/70"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface font-mono font-bold text-xs text-foreground border border-border/30">
                        #{p.track_id}
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-xs block">
                          Worker #{p.track_id}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] mt-0.5">
                          <span
                            className={
                              hasHelmet ? "text-emerald-500 font-semibold" : "text-rose-500 font-bold"
                            }
                          >
                            {hasHelmet ? "⛑️ Có mũ" : "❌ Thiếu mũ"}
                          </span>
                          <span className="text-border">•</span>
                          <span
                            className={
                              hasVest ? "text-emerald-500 font-semibold" : "text-rose-500 font-bold"
                            }
                          >
                            {hasVest ? "🦺 Có áo" : "❌ Thiếu áo"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={isViolating ? "danger" : isCandidate ? "warning" : "success"}
                      size="sm"
                    >
                      {isViolating
                        ? isVietnamese
                          ? "🚨 VI PHẠM (≥3s)"
                          : "🚨 VIOLATION (≥3s)"
                        : isCandidate
                          ? isVietnamese
                            ? "⚠ ĐANG ĐẾM..."
                            : "⚠ COUNTING..."
                          : isVietnamese
                            ? "✓ ĐỦ BẢO HỘ"
                            : "✓ COMPLIANT"}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 4. THẺ CẢNH BÁO VI PHẠM TỨC THỜI & BẰNG CHỨNG SNAPSHOT (COMPACT HERO ALERT) ── */}
        <div className="mt-3.5 pt-3 border-t border-border/30">
          {latestViolation ? (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/[0.06] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>
                    {isVietnamese ? "Sự Cố Vi Phạm Vừa Xác Nhận" : "Recent Confirmed Violation"}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Frame {latestViolation.frame}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Worker #{latestViolation.person}</strong>{" "}
                {isVietnamese ? "được xác nhận" : "confirmed"}:{" "}
                <span className="font-semibold text-rose-500">
                  {getViolationName(latestViolation.violation_type)}
                </span>{" "}
                ({isVietnamese ? `kéo dài ${latestViolation.duration_s.toFixed(1)}s` : `duration ${latestViolation.duration_s.toFixed(1)}s`}).
              </p>

              {/* Thumbnail snapshot bằng chứng vi phạm */}
              <div className="flex items-center gap-2 pt-1">
                <div
                  onClick={() => onViewSnapshot?.(activeEvidencePath)}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-rose-500/40 bg-black h-14 w-24 shrink-0 hover:opacity-90 transition shadow-sm"
                  title={isVietnamese ? "Xem ảnh bằng chứng phóng to" : "Zoom evidence snapshot"}
                >
                  <img
                    src={activeEvidencePath}
                    alt="Evidence Thumbnail"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Eye className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between h-14 py-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Snapshot VI-08 • MinIO S3
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSnapshot?.(activeEvidencePath)}
                    className="h-7 text-[11px] gap-1 text-primary border-primary/30 w-fit"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{isVietnamese ? "Xem ảnh chụp" : "View Snapshot"}</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3 text-center space-y-1">
              <ShieldCheck className="mx-auto h-5 w-5 text-emerald-500" />
              <p className="font-bold text-foreground text-xs">
                {isVietnamese ? "Không có vi phạm an toàn nào" : "No Active Safety Violations"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isVietnamese
                  ? `Quy tắc xác nhận ≥ ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)}s • Cooldown ${safetyConfig?.cooldownDuration || 30}s`
                  : `Confirmation rule ≥ ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)}s • Cooldown ${safetyConfig?.cooldownDuration || 30}s`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline và nhật ký được neo dưới đáy để dữ liệu ở trên đổi theo frame không làm chúng nhảy vị trí. */}
      <div className="mt-4 shrink-0">
        <div className="border-t border-border/30 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>{isVietnamese ? "Đồng bộ video & AI" : "Video & AI sync"}</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              F{currentEntry?.frame ?? 0}/{timelineTotalFrames} · {(streamMetadata?.fps ?? 25).toFixed(1)} FPS
            </span>
          </div>

          <div className="mt-2 rounded-xl border border-border/30 bg-background/45 px-3 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="relative h-7" aria-label={isVietnamese ? "Timeline video với mốc vi phạm" : "Video timeline with violation markers"}>
              <div className="absolute inset-x-0 top-3 h-1 rounded-full bg-border/45" />
              <div className="absolute left-0 top-3 h-1 rounded-full bg-primary/65" style={{ width: `${currentProgress}%` }} />
              {timelineMarkers.map((marker) => (
                <button
                  key={`${marker.frame}-${marker.label}`}
                  type="button"
                  title={isVietnamese ? `Nhảy tới ${marker.label}` : `Seek to ${marker.label}`}
                  aria-label={isVietnamese ? `Nhảy tới ${marker.label}` : `Seek to ${marker.label}`}
                  onClick={() => onSeekToFrame?.(marker.frame)}
                  className="absolute top-1.5 h-4 w-1.5 -translate-x-1/2 rounded-full bg-danger shadow-[0_0_0_2px_var(--background)] transition-transform hover:scale-y-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                  style={{ left: `${marker.position}%` }}
                />
              ))}
              <span
                aria-hidden="true"
                className="absolute top-1 h-5 w-1 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_0_2px_var(--background)]"
                style={{ left: `${currentProgress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{isVietnamese ? "Bắt đầu" : "Start"}</span>
              <span className="text-danger">{timelineMarkers.length} {isVietnamese ? "mốc cần chú ý" : "attention markers"}</span>
              <span>{isVietnamese ? "Hiện tại" : "Now"}</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 border-t border-border/30 pt-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>{isVietnamese ? "Hoạt động tracking mới nhất" : "Latest tracking activity"}</span>
            </div>
            <span className="text-[10px] font-normal text-muted-foreground">{isVietnamese ? "4 sự kiện gần nhất" : "Last 4 events"}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {Array.from({ length: 4 }, (_, index) => trackingLog[index]).map((event, index) => (
              <div
                key={event ? `${event}-${index}` : `tracking-placeholder-${index}`}
                className={`flex h-7 items-center gap-2 rounded-lg px-2.5 text-[10px] ${
                  event ? "bg-background/35 text-muted-foreground" : "bg-transparent"
                }`}
              >
                {event ? (
                  <>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="truncate leading-4">{event}</span>
                  </>
                ) : index === 0 ? (
                  <span className="truncate text-muted-foreground">
                    {isVietnamese ? "Đang chờ dữ liệu tracking từ khung hình kế tiếp." : "Waiting for tracking data from the next frame."}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {isVietnamese ? "Sự cố lưu trong DB:" : "Database Incidents:"}{" "}
            <strong className="text-foreground">{realIncidentsCount}</strong>
          </span>

          <Link
            href={`/incidents?cameraId=${cameraId}&cameraCode=${cameraCode}`}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <span>{isVietnamese ? "Mở danh sách sự cố" : "View Incidents"}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
