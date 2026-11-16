"use client";

import {
  Laptop,
  Smartphone,
  LogOut,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useUserSessions,
  useRevokeUserSession,
  useRevokeAllUserSessions,
  useUserDevices,
  useDeleteUserDevice,
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
  const deleteDeviceMutation = useDeleteUserDevice();

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

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      await deleteDeviceMutation.mutateAsync({
        userId: user.id,
        deviceId,
      });
    } catch {
      // Handled by toast
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Active Sessions Panel */}
      <div className="space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]">
        {/* Header không đường kẻ ngang */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Icon Box 2 tầng: Vỏ lồi + Lõi lõm */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <Laptop size={16} strokeWidth={2.3} />
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-black tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Phiên Đăng Nhập Đang Hoạt Động"
                  : "Active Sessions"}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {isVietnamese
                  ? `Hiện có ${sessions.length} phiên đang kết nối với tài khoản này`
                  : `${sessions.length} sessions currently active`}
              </p>
            </div>
          </div>

          {sessions.length > 0 && (
            <button
              type="button"
              onClick={handleRevokeAll}
              disabled={revokeAllSessionsMutation.isPending}
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-xs font-bold text-danger shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)] active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] disabled:opacity-50"
            >
              <LogOut size={13} strokeWidth={2.4} />
              <span>
                {isVietnamese
                  ? "Đăng xuất tất cả phiên"
                  : "Revoke All Sessions"}
              </span>
            </button>
          )}
        </div>

        {/* Khay lõm chứa danh sách phiên đăng nhập */}
        <div className="rounded-[20px] bg-background p-3 sm:p-3.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
          {isLoadingSessions ? (
            <div className="flex min-h-[160px] items-center justify-center gap-2.5 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs font-medium">
                {isVietnamese
                  ? "Đang tải phiên làm việc..."
                  : "Loading sessions..."}
              </span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-muted-foreground">
              {isVietnamese
                ? "Không có phiên làm việc nào đang hoạt động."
                : "No active sessions found."}
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={[
                    "group flex items-center justify-between gap-4 rounded-[15px] bg-background p-3.5 transition-all duration-200",
                    session.isCurrent
                      ? "ring-1 ring-primary/35 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]"
                      : "shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] hover:-translate-y-[1px] hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    {/* Icon thiết bị trong hốc lõm */}
                    <div
                      className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] ${session.isCurrent
                          ? "text-primary"
                          : "text-muted-foreground"
                        }`}
                    >
                      <Laptop size={17} strokeWidth={2.2} />
                      {session.isCurrent && (
                        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-xs font-extrabold text-foreground sm:text-[13px]">
                          {session.deviceName ||
                            session.userAgent ||
                            (isVietnamese
                              ? "Trình duyệt không xác định"
                              : "Unknown Browser")}
                        </span>

                        {session.isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                            <span className="size-1.5 rounded-full bg-primary" />
                            {isVietnamese ? "Hiện tại" : "Current"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <span className="rounded-md bg-background px-2 py-0.5 text-[10px] font-semibold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                          IP: {session.ipAddress || (isVietnamese ? "Không rõ" : "Unknown")}
                        </span>
                        <span className="opacity-40">•</span>
                        <span>
                          {isVietnamese ? "Tạo: " : "Created: "}
                          {new Date(session.createdAt).toLocaleDateString(
                            isVietnamese ? "vi-VN" : "en-US",
                          )}
                        </span>
                        {session.expiresAt && (
                          <>
                            <span className="opacity-40">•</span>
                            <span>
                              {isVietnamese ? "Hết hạn: " : "Expires: "}
                              {new Date(session.expiresAt).toLocaleDateString(
                                isVietnamese ? "vi-VN" : "en-US",
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revokeSessionMutation.isPending}
                      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 text-xs font-bold text-danger shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] disabled:opacity-50"
                      title={isVietnamese ? "Đóng phiên này" : "Revoke session"}
                    >
                      <Trash2 size={12} strokeWidth={2.4} />
                      <span>{isVietnamese ? "Thu hồi" : "Revoke"}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Registered Devices Panel */}
      <div className="space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]">
        {/* Header không đường kẻ ngang */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <Smartphone size={16} strokeWidth={2.3} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Thiết Bị Tin Cậy Đã Đăng Ký"
                  : "Registered Devices"}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Lịch sử các thiết bị mà tài khoản này từng sử dụng"
                  : "Hardware devices recognized by the authentication provider"}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-background px-3 py-1 font-mono text-xs font-extrabold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
            {devices.length} {isVietnamese ? "thiết bị" : "devices"}
          </span>
        </div>

        {/* Khay lõm chứa lưới thiết bị */}
        <div className="rounded-[20px] bg-background p-3 sm:p-3.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
          {isLoadingDevices ? (
            <div className="flex min-h-[140px] items-center justify-center gap-2.5 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs font-medium">
                {isVietnamese ? "Đang tải thiết bị..." : "Loading devices..."}
              </span>
            </div>
          ) : devices.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-muted-foreground">
              {isVietnamese
                ? "Chưa có thiết bị nào được lưu."
                : "No registered devices found."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="group flex items-center justify-between gap-3.5 rounded-[15px] bg-background p-3.5 shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    {/* Icon nằm trong hốc lõm */}
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-accent-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] transition-colors group-hover:text-primary">
                      <Smartphone size={17} strokeWidth={2.2} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-xs font-extrabold text-foreground sm:text-[13px]">
                        {device.deviceName ||
                          (isVietnamese
                            ? "Thiết bị không định danh"
                            : "Generic Device")}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                        <span className="rounded-md bg-background px-2 py-0.5 font-semibold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                          IP: {device.ipAddress || "-"}
                        </span>
                        <span className="opacity-40">•</span>
                        <span>
                          {device.lastLoginAt
                            ? new Date(device.lastLoginAt).toLocaleDateString(
                              isVietnamese ? "vi-VN" : "en-US",
                            )
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDevice(device.id)}
                    disabled={deleteDeviceMutation.isPending}
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background text-danger shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] disabled:opacity-50"
                    title={isVietnamese ? "Xóa thiết bị tin cậy" : "Remove trusted device"}
                  >
                    <Trash2 size={13} strokeWidth={2.3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
