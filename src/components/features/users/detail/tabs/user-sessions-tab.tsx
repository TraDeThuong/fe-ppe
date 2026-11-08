"use client";

import {
  Laptop,
  Smartphone,
  LogOut,
  Clock,
  MapPin,
  ShieldAlert,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useUserSessions,
  useRevokeUserSession,
  useRevokeAllUserSessions,
  useUserDevices,
} from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
import type { UserResponseDto } from "@/types";

export interface UserSessionsTabProps {
  user: UserResponseDto;
}

export function UserSessionsTab({ user }: UserSessionsTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: sessions = [], isLoading: isLoadingSessions } = useUserSessions(user.id);
  const { data: devices = [], isLoading: isLoadingDevices } = useUserDevices(user.id);

  const revokeSessionMutation = useRevokeUserSession();
  const revokeAllSessionsMutation = useRevokeAllUserSessions();

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSessionMutation.mutateAsync({
        userId: user.id,
        sessionId,
      });
    } catch {
      // Handled by toast
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAllSessionsMutation.mutateAsync(user.id);
    } catch {
      // Handled by toast
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Active Sessions Panel */}
      <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 sm:p-6 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Laptop size={16} />
            </span>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {isVietnamese ? "Phiên Đăng Nhập Đang Hoạt Động" : "Active Sessions"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? `Hiện có ${sessions.length} phiên đang kết nối với tài khoản này`
                  : `${sessions.length} sessions currently active`}
              </p>
            </div>
          </div>

          {sessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAll}
              disabled={revokeAllSessionsMutation.isPending}
              className="text-xs h-8 text-danger border-danger/30 hover:bg-danger/10 gap-1.5"
            >
              <LogOut size={13} />
              <span>{isVietnamese ? "Đăng xuất tất cả phiên" : "Revoke All Sessions"}</span>
            </Button>
          )}
        </div>

        {isLoadingSessions ? (
          <div className="flex min-h-[160px] items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs">{isVietnamese ? "Đang tải phiên làm việc..." : "Loading sessions..."}</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs">
            {isVietnamese ? "Không có phiên làm việc nào đang hoạt động." : "No active sessions found."}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-3.5 rounded-xl border border-border/50 bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Laptop size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">
                        {session.userAgent || (isVietnamese ? "Trình duyệt không xác định" : "Unknown Browser")}
                      </span>
                      {session.isCurrent && (
                        <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono text-[10px] font-bold">
                          {isVietnamese ? "Hiện tại" : "Current"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono mt-1">
                      <span>IP: {session.ipAddress || "127.0.0.1"}</span>
                      <span>•</span>
                      <span>
                        {new Date(session.createdAt).toLocaleDateString(
                          isVietnamese ? "vi-VN" : "en-US",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokeSessionMutation.isPending}
                    className="text-xs h-7 px-2 text-danger hover:text-danger hover:bg-danger/10 gap-1 shrink-0"
                    title={isVietnamese ? "Đóng phiên này" : "Revoke session"}
                  >
                    <Trash2 size={12} />
                    <span>{isVietnamese ? "Thu hồi" : "Revoke"}</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Registered Devices Panel */}
      <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 sm:p-6 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent border border-accent/20">
            <Smartphone size={16} />
          </span>
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isVietnamese ? "Thiết Bị Tin Cậy Đã Đăng Ký" : "Registered Devices"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Lịch sử các thiết bị mà tài khoản này từng sử dụng"
                : "Hardware devices recognized by the authentication provider"}
            </p>
          </div>
        </div>

        {isLoadingDevices ? (
          <div className="flex min-h-[140px] items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs">{isVietnamese ? "Đang tải thiết bị..." : "Loading devices..."}</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs">
            {isVietnamese ? "Chưa có thiết bị nào được lưu." : "No registered devices found."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="p-3.5 rounded-xl border border-border/50 bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] flex items-center gap-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Smartphone size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {device.deviceName || (isVietnamese ? "Thiết bị không định danh" : "Generic Device")}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    IP: {device.ipAddress || "-"} •{" "}
                    {device.lastLoginAt
                      ? new Date(device.lastLoginAt).toLocaleDateString(
                          isVietnamese ? "vi-VN" : "en-US",
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
