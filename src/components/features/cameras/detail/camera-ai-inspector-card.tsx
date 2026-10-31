"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  Film,
  HardHat,
  HelpCircle,
  Layers,
  Link2,
  Radio,
  RotateCcw,
  Scan,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import { useLocale } from "@/providers/locale-provider";
import { formatFrameRanges } from "./live-tracking-engine";
import type {
  ComputedPersonTrack,
  DetectionItem,
  FrameAssociation,
  FrameLogEntry,
  PersonStatus,
  ViolationEvent,
} from "./types";

export interface CameraAiInspectorCardProps {
  currentEntry: FrameLogEntry | null;
  personTracks: ComputedPersonTrack[];
  allViolations: ViolationEvent[];
  onSeekToFrame?: (frame: number) => void;
  fps?: number;
  totalFrames?: number;
  availableJobs?: Array<{
    job_id: string;
    source: string;
    total_frames: number;
    fps: number;
    model?: string;
  }>;
  selectedJobId?: string | null;
  onSelectJob?: (jobId: string) => void;
  isLoadingJob?: boolean;
}

type TabKey = "person_summary" | "current_frame" | "associations" | "active_tracks";

export function CameraAiInspectorCard({
  currentEntry,
  personTracks,
  allViolations,
  onSeekToFrame,
  fps = 25,
  totalFrames = 500,
  availableJobs = [],
  selectedJobId,
  onSelectJob,
  isLoadingJob = false,
}: CameraAiInspectorCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Tab active state
  const [activeTab, setActiveTab] = useState<TabKey>("person_summary");

  // Jump to frame input state
  const [jumpInput, setJumpInput] = useState<string>("");

  const cardShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.025)_inset,6px_8px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)]";

  // Navigation options sử dụng component SegmentedControl có sẵn
  const navOptions = useMemo<SegmentedControlOption<TabKey>[]>(() => {
    return [
      {
        value: "person_summary",
        label: isVietnamese ? "Tóm tắt theo người" : "Person Summary",
        icon: <Users className="h-4 w-4 text-primary" />,
        badge: personTracks.length > 0 ? String(personTracks.length) : undefined,
      },
      {
        value: "current_frame",
        label: isVietnamese ? "Khung hình đang phát" : "Current Frame",
        icon: <Layers className="h-4 w-4 text-sky-500" />,
        badge: currentEntry ? `F${currentEntry.frame}` : undefined,
      },
      {
        value: "associations",
        label: isVietnamese ? "Ghép PPE + Luật (VI-04/05)" : "PPE-Person & Rules",
        icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
        badge: currentEntry?.associations?.length ? String(currentEntry.associations.length) : undefined,
      },
      {
        value: "active_tracks",
        label: isVietnamese ? "Người đang theo dõi" : "Active Tracks",
        icon: <Radio className="h-4 w-4 text-amber-500" />,
        badge: currentEntry?.persons?.length ? String(currentEntry.persons.length) : undefined,
      },
    ];
  }, [isVietnamese, personTracks.length, currentEntry]);

  // Handler nhảy tới frame
  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const frameNum = parseInt(jumpInput, 10);
    if (!isNaN(frameNum) && frameNum >= 1) {
      onSeekToFrame?.(frameNum);
    }
  };

  // Trích xuất dữ liệu frame hiện tại
  const frameNum = currentEntry?.frame ?? 1;
  const timeSec = currentEntry?.t ?? 0;
  const summary = currentEntry?.summary ?? { person: 0, helmet: 0, safety_vest: 0, tracks: 0 };
  const events = currentEntry?.events ?? [];
  const detections = currentEntry?.detections ?? [];
  const associations = currentEntry?.associations ?? [];
  const personsInFrame = currentEntry?.persons ?? [];

  // Map person status theo track_id
  const statesById = useMemo(() => {
    return new Map<number, PersonStatus>(personsInFrame.map((p) => [p.track_id, p]));
  }, [personsInFrame]);

  // Detections mũ / áo không ghép được với người nào
  const unassociatedPpe = useMemo(() => {
    const usedTracks = new Set<number>();
    associations.forEach((a) => {
      if (a.helmet != null) usedTracks.add(a.helmet);
      if (a.vest != null) usedTracks.add(a.vest);
    });

    return detections.filter(
      (d) =>
        (d.class_name === "helmet" || d.class_name === "safety_vest") &&
        d.track_id != null &&
        !usedTracks.has(d.track_id)
    );
  }, [associations, detections]);


  return (
    <div
      className="relative isolate w-full min-w-0 overflow-hidden rounded-[26px] border-0 bg-surface p-4 text-xs shadow-[10px_12px_24px_var(--shadow-dark)] transition-shadow duration-300"
    >
      {/* ── HEADER PHÍA TRÊN CARD: TIÊU ĐỀ + CHỌN JOB TỪ TEST-UI (8000) + NHẢY FRAME ── */}
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-surface text-primary shadow-[4px_5px_9px_var(--shadow-dark),-2px_-2px_6px_color-mix(in_srgb,var(--shadow-light)_30%,transparent)]">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {isVietnamese ? "Chi Tiết Giám Sát AI Video" : "Video Intelligence Inspector"}
              </h3>
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                Frame {frameNum} • {timeSec.toFixed(2)}s • {fps.toFixed(1)} fps
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Dữ liệu tương thích Test UI (VI-04 → VI-07) • Đồng bộ thời gian thực 1:1"
                : "Test UI Compatible Pipeline (VI-04 → VI-07) • Real-time frame sync"}
            </p>
          </div>
        </div>

        {/* Thanh công cụ phụ: Chọn Job từ port 8000 + Nhảy tới frame */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dropdown nạp Job từ server 8000 nếu có */}
          {availableJobs.length > 0 && onSelectJob && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedJobId || ""}
                onChange={(e) => onSelectJob(e.target.value)}
                disabled={isLoadingJob}
                aria-label={isVietnamese ? "Chọn video đã xử lý sẵn từ AI Service" : "Select processed video job"}
                className="h-8 rounded-xl border border-border/50 bg-background/80 px-2.5 text-[11px] font-medium text-foreground outline-none transition focus:border-primary shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)] max-w-[210px] truncate"
              >
                <option value="">
                  {isVietnamese ? "🎥 Luồng Camera Trực Tiếp" : "🎥 Live Camera Feed"}
                </option>
                {availableJobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>
                    📦 {j.source} ({j.total_frames} frames)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ô Nhập để nhảy tới frame bất kỳ */}
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline">
              {isVietnamese ? "Frame:" : "Frame:"}
            </span>
            <input
              type="number"
              min={1}
              max={totalFrames || 2000}
              placeholder={String(frameNum)}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="h-8 w-16 rounded-xl border border-border/50 bg-background/80 px-2 text-center text-xs font-mono font-bold text-foreground outline-none focus:border-primary shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)]"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl px-2.5 text-[11px] font-semibold border-border/40 hover:bg-surface-elevated"
            >
              {isVietnamese ? "Nhảy" : "Go"}
            </Button>
          </form>
        </div>
      </div>

      {/* ── THANH NAVIGATION (SỬ DỤNG COMPONENT SEGMENTED CONTROL CÓ SẴN) ── */}
      <div className="pt-3 pb-2">
        <SegmentedControl<TabKey>
          options={navOptions}
          value={activeTab}
          onValueChange={(val) => setActiveTab(val)}
          aria-label={isVietnamese ? "Chuyển đổi card giám sát AI" : "Switch AI inspection cards"}
          size="sm"
          fullWidth
        />
      </div>

      {/* ── NỘI DUNG CARD THEO TAB ĐANG CHỌN (KHÔNG CHỒNG CHÉO, TRÁNH RỐI MÀN HÌNH) ── */}
      <div className="mt-2 min-h-[320px]">
        {/* ════════ TAB 1: TÓM TẮT THEO NGƯỜI (CÓ MŨ / CÓ ÁO THEO TỪNG FRAME) ════════ */}
        {activeTab === "person_summary" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    {isVietnamese
                      ? "Tóm tắt theo người (có mũ / có áo theo từng frame)"
                      : "Person Summary (Helmet / Safety Vest by Frame)"}
                  </span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Tổng kết quá trình tuân thủ bảo hộ của từng công nhân qua toàn bộ các khung hình"
                    : "Comprehensive PPE compliance tracking across all video frames"}
                </p>
              </div>

              <div className="text-[10px] text-muted-foreground font-mono">
                {personTracks.length} {isVietnamese ? "người được nhận diện" : "tracked persons"}
              </div>
            </div>

            {personTracks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/40 bg-background/30 p-8 text-center text-muted-foreground">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-semibold">
                  {isVietnamese ? "Chưa tìm thấy người nào trong dữ liệu" : "No person tracks found"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isVietnamese
                    ? "Hãy phát video hoặc tải video kiểm tra để AI nhận diện công nhân"
                    : "Play or upload a video to inspect worker PPE status"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20 text-[11px] font-bold text-muted-foreground">
                      <th className="py-2.5 px-3 w-[15%]">{isVietnamese ? "Người" : "Person"}</th>
                      <th className="py-2.5 px-3 w-[22%]">{isVietnamese ? "Xuất hiện" : "Frames"}</th>
                      <th className="py-2.5 px-3 w-[25%]">{isVietnamese ? "Mũ bảo hộ" : "Hard Hat"}</th>
                      <th className="py-2.5 px-3 w-[25%]">{isVietnamese ? "Áo phản quang" : "Safety Vest"}</th>
                      <th className="py-2.5 px-3 w-[13%] text-right">{isVietnamese ? "Đánh giá" : "Verdict"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/25">
                    {personTracks.map((p) => {
                      const f0 = p.frames[0] ?? 1;
                      const f1 = p.frames[p.frames.length - 1] ?? p.frames.length;
                      const missH = Array.from(p.noHelmetFrames || []).sort((a, b) => a - b);
                      const missV = Array.from(p.noVestFrames || []).sort((a, b) => a - b);

                      // Vi phạm xác nhận từ server
                      const confs = allViolations.filter(
                        (v) => v.person === p.id || v.canonical_person === p.id
                      );

                      let verdict = isVietnamese ? "ĐỦ BẢO HỘ" : "COMPLIANT";
                      let badgeVariant: "success" | "danger" | "warning" = "success";

                      if (confs.length) {
                        const types = Array.from(new Set(confs.map((c) => c.violation_type))).join(", ");
                        verdict = isVietnamese ? `VI PHẠM XÁC NHẬN (${types})` : `CONFIRMED VIOLATION (${types})`;
                        badgeVariant = "danger";
                      } else if (missH.length || missV.length) {
                        const types: string[] = [];
                        if (missH.length) types.push("no_helmet");
                        if (missV.length) types.push("no_safety_vest");
                        verdict = isVietnamese ? `VI PHẠM DỰ KIẾN (${types.join(", ")})` : `CANDIDATE (${types.join(", ")})`;
                        badgeVariant = "danger";
                      } else if (!p.okFrames?.length) {
                        verdict = "UNKNOWN";
                        badgeVariant = "warning";
                      }

                      const helmetRangesStr = formatFrameRanges(missH);
                      const vestRangesStr = formatFrameRanges(missV);

                      return (
                        <tr key={p.id} className="hover:bg-background/80 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-surface border border-border/40 text-[10px] font-bold text-primary">
                                #{p.id}
                              </span>
                              <span>person #{p.id}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                            <span>
                              {f0} → {f1}
                            </span>{" "}
                            <span className="text-[10px] text-muted-foreground/80">
                              ({p.frames.length} frame)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            {missH.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => onSeekToFrame?.(missH[0])}
                                className="inline-flex items-center gap-1 font-mono font-semibold text-rose-500 hover:underline text-left"
                                title={isVietnamese ? `Nhảy tới frame thiếu mũ (${missH[0]})` : `Seek to missing helmet frame (${missH[0]})`}
                              >
                                <span>❌ thiếu {helmetRangesStr}</span>
                              </button>
                            ) : p.okFrames?.length ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{isVietnamese ? "có đủ" : "ok"}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            {missV.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => onSeekToFrame?.(missV[0])}
                                className="inline-flex items-center gap-1 font-mono font-semibold text-rose-500 hover:underline text-left"
                                title={isVietnamese ? `Nhảy tới frame thiếu áo (${missV[0]})` : `Seek to missing vest frame (${missV[0]})`}
                              >
                                <span>❌ thiếu {vestRangesStr}</span>
                              </button>
                            ) : p.okFrames?.length ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{isVietnamese ? "có đủ" : "ok"}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant={badgeVariant} size="sm" className="font-semibold text-[10px] whitespace-nowrap">
                              {verdict}
                            </Badge>
                            {p.unknownCount > 0 && (
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                ({p.unknownCount} frame UNKNOWN)
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ghi chú chuẩn luật VI-05 từ Test UI */}
            <div className="rounded-xl border border-border/30 bg-background/50 p-3 text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">
                {isVietnamese ? "Quy tắc an toàn VI-05 & VI-06:" : "Safety Rules VI-05 & VI-06:"}
              </span>{" "}
              {isVietnamese
                ? "Thiếu PPE bắt buộc → VI PHẠM DỰ KIẾN (chưa xác nhận — cần VI-06 tồn tại liên tục 3 giây); người < 60px / confidence thấp / bị cắt khung → UNKNOWN. Kết luận vi phạm chính thức xem thẻ VI-06 + VI-07 (đã khử trùng lặp 30 giây)."
                : "Missing mandatory PPE → CANDIDATE (requires continuous 3.0s confirmation via VI-06); person < 60px / low confidence → UNKNOWN. Confirmed violations apply 30s deduplication (VI-07)."}
            </div>
          </div>
        )}

        {/* ════════ TAB 2: KHUNG HÌNH ĐANG PHÁT (FRAME ĐANG CHẠY & BẢNG DETECTIONS) ════════ */}
        {activeTab === "current_frame" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Header thông số Frame */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-sky-500" />
                  <span>
                    {isVietnamese ? "Khung hình đang phát" : "Current Playing Frame"}
                  </span>
                  <span className="font-mono text-primary font-extrabold ml-1">
                    frame {frameNum}
                  </span>
                  <span className="font-mono text-muted-foreground font-normal">
                    (t = {timeSec.toFixed(2)}s)
                  </span>
                </h4>
              </div>

              {/* Tag tóm tắt số lượng đối tượng trong frame */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-lg border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400">
                  {summary.person} person
                </span>
                <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {summary.helmet} helmet
                </span>
                <span className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                  {summary.safety_vest} safety_vest
                </span>
                <span className="rounded-lg border border-border/40 bg-muted/40 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  {summary.tracks} track
                </span>
              </div>
            </div>

            {/* Hộp sự kiện xuất hiện / biến mất / vi phạm */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {isVietnamese ? "Sự kiện tại frame này" : "Events at this frame"}
              </span>
              <div className="min-h-7 rounded-xl border border-border/30 bg-background/50 p-2 font-mono text-[11px]">
                {events.length === 0 ? (
                  <span className="text-muted-foreground italic">
                    {isVietnamese ? "Không có sự kiện mới" : "No new events"}
                  </span>
                ) : (
                  <div className="space-y-1">
                    {events.map((ev, idx) => {
                      const isLost = ev.includes("biến mất") || ev.includes("lost");
                      const isViolation = ev.includes("🚨") || ev.includes("vi phạm");
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-1.5 ${
                            isViolation
                              ? "text-rose-500 font-bold"
                              : isLost
                                ? "text-rose-400"
                                : "text-emerald-500"
                          }`}
                        >
                          <span>{isViolation ? "🚨" : isLost ? "-" : "+"}</span>
                          <span>{ev}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bảng Detections chi tiết: Lớp, Track, Conf, Bbox, Kích thước */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {isVietnamese ? "Đối tượng phát hiện (Detections)" : "Detected Objects"}
              </span>

              <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)] max-h-56">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-muted/30 backdrop-blur-sm z-10">
                    <tr className="border-b border-border/40 text-[11px] font-bold text-muted-foreground">
                      <th className="py-2 px-3">{isVietnamese ? "Lớp" : "Class"}</th>
                      <th className="py-2 px-3">{isVietnamese ? "Track ID" : "Track"}</th>
                      <th className="py-2 px-3 text-right">{isVietnamese ? "Độ tin cậy" : "Conf"}</th>
                      <th className="py-2 px-3">{isVietnamese ? "Tọa độ Bbox (x1, y1, x2, y2)" : "Bbox"}</th>
                      <th className="py-2 px-3 text-right">{isVietnamese ? "Kích thước" : "Size"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/25 font-mono">
                    {detections.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground italic">
                          {isVietnamese ? "Không phát hiện đối tượng nào" : "No objects detected"}
                        </td>
                      </tr>
                    ) : (
                      detections.map((d, idx) => {
                        let colorClass = "text-foreground";
                        let badgeBg = "bg-muted";

                        if (d.class_name === "person") {
                          colorClass = "text-orange-500 font-bold";
                          badgeBg = "bg-orange-500/10 border-orange-500/25";
                        } else if (d.class_name === "helmet") {
                          colorClass = "text-emerald-500 font-bold";
                          badgeBg = "bg-emerald-500/10 border-emerald-500/25";
                        } else if (d.class_name === "safety_vest") {
                          colorClass = "text-sky-500 font-bold";
                          badgeBg = "bg-sky-500/10 border-sky-500/25";
                        }

                        return (
                          <tr key={idx} className="hover:bg-background/80 transition-colors">
                            <td className="py-1.5 px-3">
                              <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] ${badgeBg} ${colorClass}`}>
                                {d.class_name}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-foreground font-semibold">
                              {d.track_id != null ? `#${d.track_id}` : "—"}
                            </td>
                            <td className="py-1.5 px-3 text-right text-foreground">
                              {d.confidence.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-3 text-muted-foreground text-[11px]">
                              ({d.bbox.join(", ")})
                            </td>
                            <td className="py-1.5 px-3 text-right text-muted-foreground text-[11px]">
                              {d.w} × {d.h}px
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB 3: GHÉP PPE–PERSON + LUẬT AN TOÀN (VI-04 + VI-05) ════════ */}
        {activeTab === "associations" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div>
              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>
                  {isVietnamese
                    ? "Ghép PPE–Person + Luật an toàn (VI-04 + VI-05)"
                    : "PPE-Person Association + Safety Rules (VI-04 + VI-05)"}
                </span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Thuật toán liên kết đồ bảo hộ với từng công nhân và kiểm định tuân thủ theo frame"
                  : "Deterministic IoU matching & frame-by-frame compliance verification"}
              </p>
            </div>

            {/* Danh sách kết quả ghép cặp */}
            <div className="rounded-2xl border border-border/30 bg-background/40 p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)] space-y-2">
              {associations.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground italic">
                  {isVietnamese
                    ? "Không có người nào được ghép trong frame này"
                    : "No persons associated in this frame"}
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {associations.map((a) => {
                    const personState = statesById.get(a.person);
                    const isUnknown = a.status === "unknown" || personState?.status === "UNKNOWN";
                    const isViolating =
                      personState?.status === "VIOLATION_CANDIDATE" ||
                      personState?.status === "CONFIRMED_VIOLATION";

                    return (
                      <div
                        key={a.person}
                        className={`flex flex-wrap items-center justify-between rounded-xl border p-2.5 transition ${
                          isViolating
                            ? "border-rose-500/35 bg-rose-500/[0.05]"
                            : isUnknown
                              ? "border-amber-500/35 bg-amber-500/[0.05]"
                              : "border-border/30 bg-surface/80"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground">
                            person #{a.person}
                          </span>
                          <span className="text-muted-foreground">←</span>

                          {/* Mũ */}
                          {a.helmet != null ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              ⛑️ mũ #{a.helmet}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/25">
                              ❌ KHÔNG mũ
                            </span>
                          )}

                          <span className="text-muted-foreground">·</span>

                          {/* Áo */}
                          {a.vest != null ? (
                            <span className="inline-flex items-center gap-1 text-sky-500 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                              🦺 áo #{a.vest}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/25">
                              ❌ KHÔNG áo
                            </span>
                          )}
                        </div>

                        {/* Đánh giá luật an toàn VI-05 */}
                        <div className="mt-1 sm:mt-0 font-sans">
                          {isUnknown ? (
                            <Badge variant="warning" size="sm">
                              {isVietnamese ? "→ UNKNOWN (người < 60px / lý do)" : "→ UNKNOWN"}
                            </Badge>
                          ) : isViolating ? (
                            <Badge variant="danger" size="sm">
                              {isVietnamese
                                ? `→ VI PHẠM? (${personState?.violations.join(", ")})`
                                : `→ VIOLATION? (${personState?.violations.join(", ")})`}
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              {isVietnamese ? "→ OK: ĐỦ BẢO HỘ" : "→ OK: COMPLIANT"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Phần đồ bảo hộ không ghép được với ai (Leftovers) */}
              {unassociatedPpe.length > 0 && (
                <div className="pt-2 border-t border-border/25 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {isVietnamese ? "Đồ bảo hộ thừa không ghép được với ai:" : "Unassociated PPE Detections:"}
                  </span>
                  <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
                    {unassociatedPpe.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-muted-foreground/90">
                        <span>•</span>
                        <span className="font-semibold text-foreground">{d.class_name} #{d.track_id}</span>
                        <span>— {isVietnamese ? "không ghép được với ai" : "unmatched"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ghi chú giải thích VI-04 & VI-05 */}
            <div className="rounded-xl border border-border/30 bg-background/50 p-3 text-[11px] text-muted-foreground leading-relaxed space-y-1">
              <p>
                <strong className="text-foreground">{isVietnamese ? "Luật ghép VI-04:" : "VI-04 Association:"}</strong>{" "}
                {isVietnamese
                  ? "Dùng IoU bounding box và trọng tâm thân người để gán mũ bảo hộ (phần đầu) và áo phản quang (phần thân) cho từng worker."
                  : "Uses bounding box IoU & body center heuristics to assign hard hats to the head region and safety vests to the torso."}
              </p>
              <p>
                <strong className="text-foreground">{isVietnamese ? "Luật quyết định VI-05:" : "VI-05 Decision:"}</strong>{" "}
                {isVietnamese
                  ? "Đánh giá tức thời: Nếu thiếu bất kỳ PPE bắt buộc nào → gán nhãn VI PHẠM DỰ KIẾN; nếu đầy đủ → OK."
                  : "Evaluates immediate compliance: Missing required PPE triggers VIOLATION_CANDIDATE; full PPE yields COMPLIANT."}
              </p>
            </div>
          </div>
        )}

        {/* ════════ TAB 4: NGƯỜI ĐANG THEO DÕI (TẠI FRAME HIỆN TẠI) ════════ */}
        {activeTab === "active_tracks" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div>
              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-amber-500" />
                <span>
                  {isVietnamese
                    ? "Người đang theo dõi (tại frame hiện tại)"
                    : "Tracked Persons (at current frame)"}
                </span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Danh sách các Track ID công nhân hiện đang xuất hiện trong khung hình"
                  : "Active ByteTrack person tracks currently visible in frame"}
              </p>
            </div>

            {/* Dải Chips Track trực quan */}
            <div className="rounded-2xl border border-border/30 bg-background/40 p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)] space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {isVietnamese ? "Track Chips:" : "Track Chips:"}
              </span>

              <div className="flex flex-wrap gap-2">
                {personsInFrame.length === 0 ? (
                  <span className="text-muted-foreground italic text-xs">
                    {isVietnamese
                      ? "Không có người nào trong frame này"
                      : "No persons in this frame"}
                  </span>
                ) : (
                  personsInFrame.map((s) => {
                    const isViolating = s.status === "VIOLATION_CANDIDATE" || s.status === "CONFIRMED_VIOLATION";
                    const isUnknown = s.status === "UNKNOWN";

                    let badgeVariant: "success" | "danger" | "warning" = "success";
                    let label = isVietnamese ? "ĐỦ BẢO HỘ" : "COMPLIANT";

                    if (isViolating) {
                      badgeVariant = "danger";
                      label = isVietnamese
                        ? `VI PHẠM? (${s.violations.join(", ")})`
                        : `VIOLATION? (${s.violations.join(", ")})`;
                    } else if (isUnknown) {
                      badgeVariant = "warning";
                      label = `UNKNOWN (${s.reason || "low conf"})`;
                    }

                    return (
                      <div
                        key={s.track_id}
                        className="inline-flex items-center gap-2 rounded-xl border-0 bg-surface shadow-[3px_4px_8px_var(--shadow-dark),-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)] px-3 py-1.5 font-mono shadow-sm"
                      >
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span className="font-bold text-foreground">person #{s.track_id}</span>
                        <Badge variant={badgeVariant} size="sm">
                          {label}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Lưới chi tiết từng công nhân trong frame */}
              {personsInFrame.length > 0 && (
                <div className="pt-3 border-t border-border/25 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {personsInFrame.map((p) => {
                    const assoc = associations.find((a) => a.person === p.track_id);
                    const det = detections.find((d) => d.class_name === "person" && d.track_id === p.track_id);
                    const isViolating = p.status === "VIOLATION_CANDIDATE" || p.status === "CONFIRMED_VIOLATION";

                    return (
                      <div
                        key={p.track_id}
                        className={`rounded-xl p-2.5 space-y-1.5 shadow-[3px_4px_8px_var(--shadow-dark),-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_25%,transparent)] ${
                          isViolating
                            ? "border-rose-500/40 bg-rose-500/[0.04]"
                            : "border-border/30 bg-surface/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground font-mono flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px]">
                              #{p.track_id}
                            </span>
                            Worker #{p.track_id}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Conf: {det ? (det.confidence * 100).toFixed(0) : "95"}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={assoc?.helmet != null ? "text-emerald-500 font-semibold" : "text-rose-500 font-bold"}>
                            {assoc?.helmet != null ? "⛑️ Có mũ" : "❌ Thiếu mũ"}
                          </span>
                          <span className="text-border">•</span>
                          <span className={assoc?.vest != null ? "text-sky-500 font-semibold" : "text-rose-500 font-bold"}>
                            {assoc?.vest != null ? "🦺 Có áo" : "❌ Thiếu áo"}
                          </span>
                        </div>

                        {det && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Bbox: ({det.bbox.join(", ")}) • {det.w}x{det.h}px
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
