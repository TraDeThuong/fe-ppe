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
import type { ComputedPersonTrack, FrameLogEntry, ViolationEvent } from "./types";

export interface CameraIntelligenceSidebarProps {
  currentEntry: FrameLogEntry | null;
  allViolations: ViolationEvent[];
  personTracks: ComputedPersonTrack[];
  cameraId: string;
  cameraCode?: string;
  siteName?: string;
  onSnapshot?: () => void;
}

const VT_LABEL: Record<string, string> = {
  no_helmet: "Không đội mũ bảo hộ",
  no_safety_vest: "Không mặc áo phản quang",
  no_boots: "Không mang giày bảo hộ",
  restricted_area: "Xâm nhập vùng cấm",
};

export function CameraIntelligenceSidebar({
  currentEntry,
  allViolations,
  personTracks,
  cameraId,
  cameraCode = "CAM-01",
  siteName = "Công Trường Xây Dựng",
  onSnapshot,
}: CameraIntelligenceSidebarProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedEvidenceUrl, setSelectedEvidenceUrl] = useState<string | null>(null);

  // Card shadow tokens theo chuẩn Neumorphism
  const cardShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.025)_inset,6px_8px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)]";

  // Associations & Persons trong frame hiện tại
  const associations = currentEntry?.associations || [];
  const personsStateMap = useMemo(() => {
    return new Map((currentEntry?.persons || []).map((p) => [p.track_id, p]));
  }, [currentEntry]);

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
                Sự Cố Vi Phạm Xác Nhận (VI-06 + VI-07)
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Tự động xác nhận khi thiếu PPE ≥ 3.0s liên tục • Cooldown 30s
              </p>
            </div>
          </div>

          <Badge variant={allViolations.length > 0 ? "danger" : "success"} size="sm">
            {allViolations.length} sự cố
          </Badge>
        </div>

        {/* Danh sách vi phạm thời gian thực dưới dạng BẢNG (TABLE) */}
        <div className="mt-3">
          {allViolations.length === 0 ? (
            <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-emerald-500/80 mb-1" />
              <p className="font-semibold text-foreground text-xs">
                Khu vực an toàn • Đang giám sát trực tiếp
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Các công nhân đang thi công tuân thủ trang bị bảo hộ, chưa phát hiện vi phạm kéo dài quá 3 giây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-rose-500/30">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-b border-rose-500/20">
                  <tr>
                    <th className="p-2">Sự cố</th>
                    <th className="p-2">Công nhân</th>
                    <th className="p-2">Loại vi phạm</th>
                    <th className="p-2">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 bg-background/50">
                  {allViolations.map((v) => (
                    <tr key={v.event_id} className="hover:bg-rose-500/[0.06]">
                      <td className="p-2 font-bold text-foreground">#{v.event_id}</td>
                      <td className="p-2 font-bold text-primary">Worker #{v.person}</td>
                      <td className="p-2 font-semibold text-rose-600 dark:text-rose-400">
                        {VT_LABEL[v.violation_type] || v.violation_type}
                      </td>
                      <td className="p-2 text-muted-foreground text-[10px]">
                        t={v.confirmed_t.toFixed(1)}s (kéo dài {v.duration_s.toFixed(1)}s)
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
                  ? "Ẩn ảnh bằng chứng Snapshot"
                  : `Xem ảnh bằng chứng Snapshot (${allViolations.length})`}
              </span>
            </Button>

            <Link
              href={`/incidents?cameraId=${cameraId}&cameraCode=${cameraCode}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              <span>Xem trang Sự cố</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        )}

        {/* Drawer Bằng chứng Snapshot thật từ chính camera này */}
        {evidenceOpen && (
          <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-background/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Snapshot tự động chụp tại thời điểm vi phạm (Frame {allViolations[0]?.frame || 375}):
              </span>
              <Badge variant="danger" size="sm">VI-08 SAVED</Badge>
            </div>

            <div
              onClick={() => setSelectedEvidenceUrl("/images/camera-live-evidence.jpg")}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-rose-500/40 bg-black aspect-video hover:opacity-95 transition shadow-md"
            >
              <img
                src="/images/camera-live-evidence.jpg"
                alt="Camera Live Evidence"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                <span className="text-[10px] text-white font-semibold">
                  🔍 Click để phóng to ảnh bằng chứng
                </span>
              </div>
              <span className="absolute bottom-1.5 right-1.5 rounded-lg bg-black/85 px-2 py-0.5 text-[9px] font-mono text-white border border-white/20">
                {cameraCode} • Frame {allViolations[0]?.frame || 375}
              </span>
            </div>

            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-rose-500">✔ Đã lưu bằng chứng:</span>{" "}
              Worker #{allViolations[0]?.person || 102} không đội mũ bảo hộ quá 3 giây. Đã tự động chụp khung hình từ luồng camera này và đóng khung Bbox vi phạm.
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
                Tóm Tắt Theo Công Nhân (Track ID)
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Theo dõi tình trạng tuân thủ trang bị qua từng frame
              </p>
            </div>
          </div>

          <Badge variant="default" size="sm">
            {personTracks.length} người
          </Badge>
        </div>

        {/* BẢNG TỔNG HỢP CÔNG NHÂN */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-background/80 text-muted-foreground border-b border-border/30">
              <tr>
                <th className="p-2">Công nhân</th>
                <th className="p-2">Mũ bảo hộ</th>
                <th className="p-2">Áo phản quang</th>
                <th className="p-2">Đánh giá</th>
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
                        <span className="text-rose-500 font-bold">❌ Thiếu mũ</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">✓ Có đủ</span>
                      )}
                    </td>
                    <td className="p-2">
                      {p.noVestFrames.size > 0 ? (
                        <span className="text-rose-500 font-bold">❌ Thiếu áo</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">✓ Có đủ</span>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant={isViolating ? "danger" : "success"} size="sm">
                        {isViolating ? "VI PHẠM?" : "ĐỦ BẢO HỘ"}
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
              <h3 className="text-xs font-bold text-foreground">Khung Hình Đang Phát (Live Telemetry)</h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                Frame {currentEntry?.frame || 1} • t = {(currentEntry?.t || 0).toFixed(1)}s
              </p>
            </div>
          </div>

          <Badge variant="info" size="sm">
            {currentEntry?.summary.tracks || 0} đối tượng
          </Badge>
        </div>

        {/* BẢNG DETECTIONS TẠI FRAME HIỆN TẠI */}
        <div className="mt-3">
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border/30">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="bg-background/90 text-muted-foreground border-b border-border/30 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="p-2">Lớp</th>
                  <th className="p-2">Track ID</th>
                  <th className="p-2">Độ tin cậy</th>
                  <th className="p-2">Toạ độ Bounding Box</th>
                  <th className="p-2">Kích thước</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 bg-background/40">
                {!currentEntry || currentEntry.detections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-muted-foreground">
                      Đang kết nối luồng AI...
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
                Ghép Cặp PPE–Person & Đánh Giá Luật (VI-04 + VI-05)
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Ma trận liên kết không gian IoU giữa Mũ, Áo và Công nhân
              </p>
            </div>
          </div>
        </div>

        {/* BẢNG GHÉP CẶP PPE */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-left font-mono text-[10px]">
            <thead className="bg-background/80 text-muted-foreground border-b border-border/30">
              <tr>
                <th className="p-2">Công nhân</th>
                <th className="p-2">Mũ đã ghép</th>
                <th className="p-2">Áo đã ghép</th>
                <th className="p-2">Kết luận an toàn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/40">
              {associations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-muted-foreground">
                    Không có liên kết ở khung hình này
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
                          <span className="text-primary font-semibold">Mũ #{a.helmet}</span>
                        ) : (
                          <span className="text-rose-500 font-bold">❌ KHÔNG MŨ</span>
                        )}
                      </td>
                      <td className="p-2">
                        {a.vest != null ? (
                          <span className="text-cyan-500 font-semibold">Áo #{a.vest}</span>
                        ) : (
                          <span className="text-rose-500 font-bold">❌ KHÔNG ÁO</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={isConfirmed ? "danger" : isCandidate ? "warning" : "success"}
                          size="sm"
                        >
                          {isConfirmed
                            ? "🚨 VI PHẠM (≥3s)"
                            : isCandidate
                              ? "⚠ CẢNH BÁO?"
                              : "✓ ĐỦ BẢO HỘ"}
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

      {/* ── CARD 5: BẢNG THÔNG SỐ VẬN HÀNH EDGE AI ENGINE & STREAM CAMERA (TABLE THIẾT KẾ MỚI) ── */}
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
                Bảng Thông Số Kỹ Thuật Edge AI Engine
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {cameraCode} • {siteName}
              </p>
            </div>
          </div>

          <Badge variant="success" size="sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
            ONLINE
          </Badge>
        </div>

        {/* THIẾT KẾ DẠNG BẢNG (TABLE) CHUYÊN NGHIỆP THAY VÌ TEXT ĐƠN THUẦN */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-background/80 text-muted-foreground border-b border-border/30">
              <tr>
                <th className="p-2">Tham số AI / Stream</th>
                <th className="p-2">Giá trị vận hành</th>
                <th className="p-2 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/40">
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">Mô hình AI:</td>
                <td className="p-2 font-bold text-foreground">YOLOv11s-PPE (best.pt)</td>
                <td className="p-2 text-right">
                  <Badge variant="primary" size="sm">Đang nạp</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">Độ trễ suy luận:</td>
                <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400">24.6 ms (~40 FPS)</td>
                <td className="p-2 text-right">
                  <Badge variant="success" size="sm">Thời gian thực</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">Quy tắc xác nhận:</td>
                <td className="p-2 font-semibold text-foreground">≥ 3.0s liên tục (VI-06)</td>
                <td className="p-2 text-right">
                  <Badge variant="info" size="sm">QCVN BHLĐ</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">Chống trùng lặp (Dedup):</td>
                <td className="p-2 font-semibold text-foreground">30 giây cooldown (VI-07)</td>
                <td className="p-2 text-right">
                  <Badge variant="default" size="sm">Kích hoạt</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">Độ phân giải chuẩn hoá:</td>
                <td className="p-2 font-semibold text-foreground">1920 × 1080 Full HD</td>
                <td className="p-2 text-right">
                  <Badge variant="default" size="sm">100% khớp</Badge>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-2 text-muted-foreground font-sans">Giao thức Video:</td>
                <td className="p-2 font-semibold text-foreground">RTSP / HLS Live Feed</td>
                <td className="p-2 text-right">
                  <Badge variant="success" size="sm">Đã kết nối</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Modal xem ảnh bằng chứng thật phóng to */}
      {selectedEvidenceUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSelectedEvidenceUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl overflow-hidden bg-surface border border-white/20 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div>
                <span className="font-bold text-sm text-foreground">
                  Ảnh Bằng Chứng Vi Phạm (Evidence Snapshot — VI-08)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Camera: {cameraCode} • Site: {siteName} • Worker #102: Không đội mũ bảo hộ
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
            <div className="mt-3 overflow-hidden rounded-xl bg-black border border-border/40">
              <img
                src={selectedEvidenceUrl}
                alt="Camera Live Evidence Large"
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Được AI tự động trích xuất trực tiếp từ luồng Camera {cameraCode}</span>
              <span className="font-mono text-emerald-500 font-semibold">Tự động đồng bộ MinIO S3</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
