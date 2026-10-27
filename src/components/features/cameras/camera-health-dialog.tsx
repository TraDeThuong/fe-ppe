"use client";

import { Activity, AlertTriangle, CheckCircle, Clock, Loader2, Wifi, Zap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCameraHealthLogs, usePingCamera } from "@/hooks/cameras";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";

export interface CameraHealthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: CameraItem | null;
}

export function CameraHealthDialog({
  open,
  onOpenChange,
  camera,
}: CameraHealthDialogProps) {
  const { t } = useLocale();

  const pingMutation = usePingCamera();
  const { data: logs = [], isLoading: logsLoading } = useCameraHealthLogs(
    camera?.id || "",
    open && Boolean(camera?.id),
  );

  const handlePing = () => {
    if (!camera) return;
    pingMutation.mutate(camera.id);
  };

  const pingResult = pingMutation.data;
  const isHealthy = camera?.status === "ONLINE";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cameras.modals.healthTitle")}
      description={`Kiểm tra đường truyền RTSP & mạng nội bộ cho ${camera?.name || ""}`}
      icon={<Activity className="h-5 w-5 text-primary" />}
      size="md"
    >
      <div className="space-y-4">
        {/* Real-time Diagnostics Card */}
        <div className="rounded-2xl border border-border/40 bg-surface/60 p-4 shadow-nm-inset">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">
                {camera?.code}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-semibold text-foreground">
                {camera?.sourceType}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                isHealthy
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-danger/10 text-danger"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isHealthy ? "bg-emerald-500 animate-pulse" : "bg-danger"
                }`}
              />
              {camera?.status}
            </span>
          </div>

          {/* Ping metrics grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-xl border border-border/30 bg-surface p-3">
              <span className="text-[11px] text-muted-foreground">Độ trễ hiện tại</span>
              <p className="mt-1 font-mono text-base font-bold text-foreground">
                {pingResult ? `${pingResult.latencyMs ?? 0} ms` : `${camera?.currentLatencyMs || 42} ms`}
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-surface p-3">
              <span className="text-[11px] text-muted-foreground">Tỷ lệ rớt gói</span>
              <p className="mt-1 font-mono text-base font-bold text-emerald-500">
                {pingResult?.packetLoss ?? 0}%
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/30 bg-surface p-3">
              <span className="text-[11px] text-muted-foreground">Tốc độ khung</span>
              <p className="mt-1 font-mono text-base font-bold text-primary">
                {camera?.currentFps || 25} FPS
              </p>
            </div>
          </div>

          {/* Trigger Ping Button */}
          <div className="mt-4 flex justify-center">
            <Button
              variant="primary"
              onClick={handlePing}
              disabled={pingMutation.isPending}
              className="flex items-center gap-2"
            >
              {pingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>Gửi tín hiệu Ping ngay</span>
            </Button>
          </div>
        </div>

        {/* Health History List */}
        <div className="space-y-2">
          <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Nhật ký nhịp tim gần đây</span>
          </h5>

          <div className="max-h-40 overflow-y-auto rounded-xl border border-border/30 bg-surface/30 divide-y divide-border/20 text-xs">
            {logsLoading ? (
              <p className="p-3 text-center text-muted-foreground">Đang tải nhật ký...</p>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-3 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>Không có sự cố gián đoạn nào được ghi nhận.</span>
              </div>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2">
                    {log.status === "ONLINE" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                    )}
                    <span className="font-mono text-[11px]">{log.status}</span>
                    {log.errorMessage && (
                      <span className="text-muted-foreground line-clamp-1">
                        - {log.errorMessage}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {log.latencyMs ? `${log.latencyMs}ms` : "-"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
