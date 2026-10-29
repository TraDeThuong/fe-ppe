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
}: CameraIntelligenceSidebarProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedEvidenceUrl, setSelectedEvidenceUrl] = useState<string | null>(null);

  const getViolationName = (type: string) => {
    const item = VT_LABEL[type];
    if (item) return isVietnamese ? item.vi : item.en;
    return type;
  };

  const cardShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.025)_inset,6px_8px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)]";

  const associations = currentEntry?.associations || [];
  const personsStateMap = useMemo(() => {
    return new Map((currentEntry?.persons || []).map((p) => [p.track_id, p]));
  }, [currentEntry]);

  // Ảnh bằng chứng động của video đang nạp
  const activeEvidencePath =
    currentEntry?.evidence?.[0]?.path ||
    (streamMetadata?.youtubeId
      ? `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`
      : "/images/camera-live-evidence.jpg");

  const latestViolation = allViolations[0];

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* ── CARD 1: BẢNG SỰ CỐ VI PHẠM XÁC NHẬN (VI-06 + VI-07) KÈM SNAPSHOT BẰNG CHỨNG (VI-08) ── */}
      <div
        className={`relative overflow-hidden rounded-[22px] border ${
          allViolations.length > 0 ? "border-rose-500/40" : "border-border/40"
        } bg-surface p-4 ${cardShadow}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                allViolations.length > 0
                  ? "bg-rose-500/15 text-rose-500"
                  : "bg-emerald-500/10 text-emerald-500"
              } shadow-[inset_1px_1px_3px_var(--shadow-dark)]`}
            >
              {allViolations.length > 0 ? (
                <ShieldAlert className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {isVietnamese ? "Sự Cố Vi Phạm Xác Nhận (VI-06 + VI-07)" : "Confirmed Violations (VI-06 + VI-07)"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {isVietnamese
                  ? `Tự động xác nhận khi thiếu PPE ≥ ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)}s • Cooldown ${safetyConfig?.cooldownDuration || 30}s`
                  : `Auto-confirmed on missing PPE ≥ ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)}s • Cooldown ${safetyConfig?.cooldownDuration || 30}s`}
              </p>
            </div>
          </div>

          <Badge variant={allViolations.length > 0 ? "danger" : "success"} size="sm">
            {allViolations.length} {isVietnamese ? "sự cố" : "incidents"}
          </Badge>
        </div>

        {/* Danh sách vi phạm thời gian thực dưới dạng BẢNG (TABLE) */}
        <div className="mt-3">
          {allViolations.length === 0 ? (
            <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-emerald-500/80 mb-1" />
              <p className="font-semibold text-foreground text-xs">
                {isVietnamese ? "Khu vực an toàn • Đang giám sát trực tiếp" : "Safe Zone • Active Live Surveillance"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese
                  ? "Các công nhân trong luồng video đang tuân thủ trang bị bảo hộ, chưa phát hiện vi phạm kéo dài."
                  : "Workers in stream are complying with PPE rules; no sustained violations detected."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-rose-500/30">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-b border-rose-500/20">
                  <tr>
                    <th className="p-2">{isVietnamese ? "Sự cố" : "Event"}</th>
                    <th className="p-2">{isVietnamese ? "Công nhân" : "Worker"}</th>
                    <th className="p-2">{isVietnamese ? "Loại vi phạm" : "Violation Type"}</th>
                    <th className="p-2">{isVietnamese ? "Thời gian" : "Time"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 bg-background/50">
                  {allViolations.map((v) => (
                    <tr key={v.event_id} className="hover:bg-rose-500/[0.06]">
                      <td className="p-2 font-bold text-foreground">#{v.event_id}</td>
                      <td className="p-2 font-bold text-primary">Worker #{v.person}</td>
                      <td className="p-2 font-semibold text-rose-600 dark:text-rose-400">
                        {(isVietnamese
                          ? VT_LABEL[v.violation_type]?.vi
                          : VT_LABEL[v.violation_type]?.en) || v.violation_type}
                      </td>
                      <td className="p-2 text-muted-foreground text-[10px]">
                        t={v.confirmed_t.toFixed(1)}s ({isVietnamese ? `kéo dài ${v.duration_s.toFixed(1)}s` : `duration ${v.duration_s.toFixed(1)}s`})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nút Xem Ảnh Bằng Chứng Snapshot (VI-08) */}
        {allViolations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              id="btn-toggle-live-evidence"
              onClick={() => setEvidenceOpen(!evidenceOpen)}
              className="gap-1.5 text-xs text-primary border-primary/30"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>
                {evidenceOpen
                  ? (isVietnamese ? "Ẩn ảnh bằng chứng Snapshot" : "Hide Evidence Snapshot")
                  : (isVietnamese ? `Xem ảnh bằng chứng Snapshot (${allViolations.length})` : `View Evidence Snapshot (${allViolations.length})`)}
              </span>
            </Button>

            <Link
              href={`/incidents?cameraId=${cameraId}&cameraCode=${cameraCode}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              <span>{isVietnamese ? "Xem trang Sự cố" : "View Incidents"}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        )}

        {/* Drawer Bằng chứng Snapshot động từ video hiện tại */}
        {evidenceOpen && (
          <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-background/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? `Snapshot chụp từ luồng camera này (Frame ${latestViolation?.frame || 375}):` : `Snapshot captured from this camera feed (Frame ${latestViolation?.frame || 375}):`}
              </span>
              <Badge variant="danger" size="sm">VI-08 ARCHIVED</Badge>
            </div>

            <div
              onClick={() => setSelectedEvidenceUrl(activeEvidencePath)}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-rose-500/40 bg-black aspect-video hover:opacity-95 transition shadow-md flex items-center justify-center"
            >
              <img
                src={activeEvidencePath}
                alt="Camera Live Evidence"
                className="h-full w-full object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                <span className="text-[10px] text-white font-semibold">
                  {isVietnamese ? "🔍 Click để phóng to ảnh bằng chứng" : "🔍 Click to zoom evidence snapshot"}
                </span>
              </div>
              <span className="absolute bottom-1.5 right-1.5 rounded-lg bg-black/85 px-2 py-0.5 text-[9px] font-mono text-white border border-white/20">
                {cameraCode} • Frame {latestViolation?.frame || 375}
              </span>
            </div>

            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-rose-500">{isVietnamese ? "✔ Đã ghi nhận bằng chứng:" : "✔ Evidence Recorded:"}</span>{" "}
              {isVietnamese
                ? `Worker #${latestViolation?.person || 102} không đội mũ bảo hộ quá ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)} giây. Đã tự động chụp khung hình từ luồng camera ${cameraCode}.`
                : `Worker #${latestViolation?.person || 102} missing hard hat > ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)}s. Frame captured from camera ${cameraCode}.`}
            </p>
          </div>
        )}
      </div>

      {/* ── CARD 2: BẢNG TỔNG HỢP CÔNG NHÂN (TRACK ID) ── */}
      <div
        className={`relative overflow-hidden rounded-[22px] border border-border/40 bg-surface p-4 ${cardShadow}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/[0.08] text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {isVietnamese ? "Tóm Tắt Theo Công Nhân (Track ID)" : "Summary by Worker (Track ID)"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {isVietnamese ? `Công nhân nhận diện trên luồng ${cameraCode}` : `Workers tracked on stream ${cameraCode}`}
              </p>
            </div>
          </div>

          <Badge variant="default" size="sm">
            {personTracks.length} {isVietnamese ? "người" : "workers"}
          </Badge>
        </div>

        {/* BẢNG TỔNG HỢP CÔNG NHÂN */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-background/80 text-muted-foreground border-b border-border/30">
              <tr>
                <th className="p-2">{isVietnamese ? "Công nhân" : "Worker"}</th>
                <th className="p-2">{isVietnamese ? "Mũ bảo hộ" : "Hard Hat"}</th>
                <th className="p-2">{isVietnamese ? "Áo phản quang" : "Safety Vest"}</th>
                <th className="p-2">{isVietnamese ? "Đánh giá" : "Assessment"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/40">
              {personTracks.map((p) => {
                const isViolating = p.noHelmetFrames.size > 0 || p.noVestFrames.size > 0;
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="p-2 font-bold text-foreground">
                      Worker #{p.id}
                    </td>
                    <td className="p-2">
                      {p.noHelmetFrames.size > 0 ? (
                        <span className="text-rose-500 font-bold">❌ {isVietnamese ? "Thiếu mũ" : "Missing Hat"}</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">✓ {isVietnamese ? "Có đủ" : "Compliant"}</span>
                      )}
                    </td>
                    <td className="p-2">
                      {p.noVestFrames.size > 0 ? (
                        <span className="text-rose-500 font-bold">❌ {isVietnamese ? "Thiếu áo" : "Missing Vest"}</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">✓ {isVietnamese ? "Có đủ" : "Compliant"}</span>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant={isViolating ? "danger" : "success"} size="sm">
                        {isViolating ? (isVietnamese ? "VI PHẠM?" : "VIOLATION?") : (isVietnamese ? "ĐỦ BẢO HỘ" : "COMPLIANT")}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CARD 3: BẢNG DETECTIONS & BOUNDING BOX TẠI KHUNG HÌNH ĐANG PHÁT ── */}
      <div
        className={`relative overflow-hidden rounded-[22px] border border-border/40 bg-surface p-4 ${cardShadow}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/[0.08] text-cyan-500 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">{isVietnamese ? "Khung Hình Đang Phát (Live Telemetry)" : "Live Telemetry Frame"}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                Frame {currentEntry?.frame || 1} • t = {(currentEntry?.t || 0).toFixed(1)}s
              </p>
            </div>
          </div>

          <Badge variant="info" size="sm">
            {currentEntry?.summary.tracks || 0} {isVietnamese ? "đối tượng" : "objects"}
          </Badge>
        </div>

        {/* BẢNG DETECTIONS TẠI FRAME HIỆN TẠI */}
        <div className="mt-3">
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border/30">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="bg-background/90 text-muted-foreground border-b border-border/30 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="p-2">{isVietnamese ? "Lớp" : "Class"}</th>
                  <th className="p-2">Track ID</th>
                  <th className="p-2">{isVietnamese ? "Độ tin cậy" : "Confidence"}</th>
                  <th className="p-2">{isVietnamese ? "Toạ độ Bounding Box" : "Bounding Box Coords"}</th>
                  <th className="p-2">{isVietnamese ? "Kích thước" : "Size"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 bg-background/40">
                {!currentEntry || currentEntry.detections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-muted-foreground">
                      {isVietnamese ? "Đang kết nối luồng AI..." : "Connecting AI stream..."}
                    </td>
                  </tr>
                ) : (
                  currentEntry.detections.map((d, idx) => (
                    <tr key={`${d.class_name}-${d.track_id}-${idx}`} className="hover:bg-muted/30">
                      <td className="p-2 font-bold">
                        <span
                          className={
                            d.class_name === "person"
                              ? "text-primary font-bold"
                              : d.class_name === "helmet"
                                ? "text-blue-500 font-bold"
                                : "text-cyan-500 font-bold"
                          }
                        >
                          {d.class_name}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-foreground">#{d.track_id ?? "-"}</td>
                      <td className="p-2">{(d.confidence * 100).toFixed(1)}%</td>
                      <td className="p-2 text-muted-foreground text-[9px]">
                        [{d.bbox.join(", ")}]
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {d.w}×{d.h}px
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── CARD 4: BẢNG GHÉP CẶP PPE–PERSON & ĐÁNH GIÁ LUẬT AN TOÀN (VI-04 + VI-05) ── */}
      <div
        className={`relative overflow-hidden rounded-[22px] border border-border/40 bg-surface p-4 ${cardShadow}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/[0.08] text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {isVietnamese ? "Ghép Cặp PPE–Person & Đánh Giá Luật (VI-04 + VI-05)" : "PPE–Person Association & Rule Engine (VI-04 + VI-05)"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {isVietnamese ? "Ma trận liên kết không gian IoU giữa Mũ, Áo và Công nhân" : "IoU spatial association matrix between Hats, Vests, and Workers"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-left font-mono text-[10px]">
            <thead className="bg-background/80 text-muted-foreground border-b border-border/30">
              <tr>
                <th className="p-2">{isVietnamese ? "Công nhân" : "Worker"}</th>
                <th className="p-2">{isVietnamese ? "Mũ đã ghép" : "Associated Hat"}</th>
                <th className="p-2">{isVietnamese ? "Áo đã ghép" : "Associated Vest"}</th>
                <th className="p-2">{isVietnamese ? "Kết luận an toàn" : "Safety Verdict"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/40">
              {associations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-muted-foreground">
                    {isVietnamese ? "Không có liên kết ở khung hình này" : "No associations in this frame"}
                  </td>
                </tr>
              ) : (
                associations.map((a) => {
                  const state = personsStateMap.get(a.person);
                  const isConfirmed = state?.status === "CONFIRMED_VIOLATION";
                  const isCandidate = state?.status === "VIOLATION_CANDIDATE";

                  return (
                    <tr key={a.person} className="hover:bg-muted/30">
                      <td className="p-2 font-bold text-foreground">Worker #{a.person}</td>
                      <td className="p-2">
                        {a.helmet != null ? (
                          <span className="text-primary font-semibold">{isVietnamese ? `Mũ #${a.helmet}` : `Hat #${a.helmet}`}</span>
                        ) : (
                          <span className="text-rose-500 font-bold">{isVietnamese ? "❌ KHÔNG MŨ" : "❌ NO HAT"}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {a.vest != null ? (
                          <span className="text-cyan-500 font-semibold">{isVietnamese ? `Áo #${a.vest}` : `Vest #${a.vest}`}</span>
                        ) : (
                          <span className="text-rose-500 font-bold">{isVietnamese ? "❌ KHÔNG ÁO" : "❌ NO VEST"}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={isConfirmed ? "danger" : isCandidate ? "warning" : "success"}
                          size="sm"
                        >
                          {isConfirmed
                            ? (isVietnamese ? "🚨 VI PHẠM (≥3s)" : "🚨 VIOLATION (≥3s)")
                            : isCandidate
                              ? (isVietnamese ? "⚠ CẢNH BÁO?" : "⚠ WARNING?")
                              : (isVietnamese ? "✓ ĐỦ BẢO HỘ" : "✓ COMPLIANT")}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CARD 5: BẢNG THÔNG SỐ VẬN HÀNH EDGE AI ENGINE & STREAM CAMERA ĐỘNG ── */}
      <div
        className={`relative overflow-hidden rounded-[22px] border border-border/40 bg-surface p-4 ${cardShadow}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {isVietnamese ? "Bảng Thông Số Vận Hành Mô Hình AI" : "AI Model Operational Telemetry"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {cameraCode} • {siteName}
              </p>
            </div>
          </div>

          <Badge variant="success" size="sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
            LIVE INFERENCE
          </Badge>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-background/80 text-muted-foreground border-b border-border/30">
              <tr>
                <th className="p-2">{isVietnamese ? "Tham số AI / Stream" : "AI / Stream Parameter"}</th>
                <th className="p-2">{isVietnamese ? "Giá trị vận hành" : "Operational Value"}</th>
                <th className="p-2 text-right">{isVietnamese ? "Trạng thái" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/40">
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">{isVietnamese ? "Mô hình AI:" : "AI Model:"}</td>
                <td className="p-2 font-bold text-foreground">{activeModelName}</td>
                <td className="p-2 text-right">
                  <Badge variant="primary" size="sm">{isVietnamese ? "Đang chạy" : "Active"}</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">{isVietnamese ? "Độ trễ suy luận:" : "Inference Latency:"}</td>
                <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400">24.6 ms (~40 FPS)</td>
                <td className="p-2 text-right">
                  <Badge variant="success" size="sm">{isVietnamese ? "Thời gian thực" : "Real-time"}</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">{isVietnamese ? "Ngưỡng tin cậy:" : "Confidence Min:"}</td>
                <td className="p-2 font-semibold text-foreground">
                  {Math.round((safetyConfig?.confidenceThreshold || 0.8) * 100)}%
                </td>
                <td className="p-2 text-right">
                  <Badge variant="default" size="sm">Filter &gt;= 80%</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">{isVietnamese ? "Quy tắc xác nhận:" : "Confirmation Rule:"}</td>
                <td className="p-2 font-semibold text-foreground">
                  ≥ {(safetyConfig?.confirmationDuration || 3.0).toFixed(1)}s (VI-06)
                </td>
                <td className="p-2 text-right">
                  <Badge variant="info" size="sm">{isVietnamese ? "QCVN BHLĐ" : "PPE Standard"}</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">{isVietnamese ? "Chống trùng lặp (Dedup):" : "Deduplication (Dedup):"}</td>
                <td className="p-2 font-semibold text-foreground">
                  {safetyConfig?.cooldownDuration || 30}s cooldown (VI-07)
                </td>
                <td className="p-2 text-right">
                  <Badge variant="default" size="sm">{isVietnamese ? "Kích hoạt" : "Active"}</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">{isVietnamese ? "Định dạng Video:" : "Video Format:"}</td>
                <td className="p-2 font-semibold text-foreground">
                  {streamMetadata?.aspectRatioLabel || "1920 × 1080 (16:9 Full HD)"}
                </td>
                <td className="p-2 text-right">
                  <Badge variant="default" size="sm">{isVietnamese ? "Khớp tỷ lệ" : "Matched"}</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">{isVietnamese ? "Giao thức Video:" : "Video Protocol:"}</td>
                <td className="p-2 font-semibold text-foreground">
                  {streamMetadata?.streamType === "youtube_shorts"
                    ? "YouTube Shorts Live Stream"
                    : streamMetadata?.streamType === "youtube_video"
                      ? "YouTube Live Embed"
                      : streamMetadata?.streamType === "html5_video"
                        ? "HTML5 MP4 Native Stream"
                        : streamMetadata?.streamType === "webcam"
                          ? "Webcam HD Live"
                          : "RTSP Camera Stream"}
                </td>
                <td className="p-2 text-right">
                  <Badge variant="success" size="sm">{isVietnamese ? "Đã kết nối" : "Connected"}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Modal xem ảnh bằng chứng thật phóng to */}
      {selectedEvidenceUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in"
          onClick={() => setSelectedEvidenceUrl(null)}
        >
          <div
            className="relative my-auto max-w-2xl w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-surface border border-white/20 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div>
                <span className="font-bold text-sm text-foreground">
                  {isVietnamese ? "Ảnh Bằng Chứng Vi Phạm (Evidence Snapshot — VI-08)" : "Violation Evidence Snapshot (VI-08)"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? `Camera: ${cameraCode} • Site: ${siteName} • Worker #${latestViolation?.person || 102}: Vi phạm an toàn`
                    : `Camera: ${cameraCode} • Site: ${siteName} • Worker #${latestViolation?.person || 102}: Safety violation`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidenceUrl(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-black border border-border/40 flex items-center justify-center">
              <img
                src={selectedEvidenceUrl}
                alt="Camera Live Evidence Large"
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{isVietnamese ? `Được AI trích xuất trực tiếp từ video Camera ${cameraCode}` : `Extracted directly by AI from video feed ${cameraCode}`}</span>
              <span className="font-mono text-emerald-500 font-semibold">{isVietnamese ? "Tự động đồng bộ MinIO S3" : "Synced to MinIO S3"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
