"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Send, UserCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/users";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, UserResponseDto } from "@/types";

export interface BatchDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidents: IncidentItem[];
  onSubmit: (payload: { assignedTo: string; note?: string }) => Promise<void>;
  loading?: boolean;
}

export function BatchDispatchModal({
  open,
  onOpenChange,
  incidents,
  onSubmit,
  loading = false,
}: BatchDispatchModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSite, getCameraCode } = useEntityLookup();

  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const allUsers: UserResponseDto[] = useMemo(() => usersData?.data ?? [], [usersData]);

  const pendingCount = useMemo(
    () => incidents.filter((i) => i.status === "PENDING_REVIEW").length,
    [incidents],
  );

  const cameraSummary = useMemo(() => {
    const labels = new Set<string>();
    for (const item of incidents) {
      labels.add(item.cameraCode || getCameraCode(item.cameraId) || item.cameraId.slice(0, 8));
    }
    return Array.from(labels).slice(0, 4).join(", ") + (labels.size > 4 ? ` (+${labels.size - 4})` : "");
  }, [incidents, getCameraCode]);

  const siteOfficerIds = useMemo(() => {
    const ids = new Set<string>();
    const siteIds = new Set(incidents.map((i) => i.siteId).filter(Boolean));
    for (const sid of siteIds) {
      const site = getSite(sid);
      for (const off of site?.contactOfficers || []) {
        if (off.userId) ids.add(off.userId);
      }
      for (const u of allUsers) {
        if (Array.isArray(u.siteIds) && u.siteIds.includes(sid)) {
          ids.add(u.id);
        }
      }
    }
    return ids;
  }, [incidents, getSite, allUsers]);

  const { siteOfficers, otherSafetyOfficers, otherUsers } = useMemo(() => {
    const siteList: UserResponseDto[] = [];
    const safetyList: UserResponseDto[] = [];
    const otherList: UserResponseDto[] = [];

    for (const u of allUsers) {
      const roleName = (u.role?.name || "").toUpperCase();
      if (siteOfficerIds.has(u.id) && roleName !== "ADMIN") {
        siteList.push(u);
      } else if (
        roleName === "SAFETY_OFFICER" ||
        roleName.includes("SAFETY") ||
        roleName.includes("OFFICER")
      ) {
        safetyList.push(u);
      } else {
        otherList.push(u);
      }
    }

    // Ưu tiên SAFETY_OFFICER lên đầu trong siteList
    siteList.sort((a, b) => {
      const ra = (a.role?.name || "").toUpperCase() === "SAFETY_OFFICER" ? 0 : 1;
      const rb = (b.role?.name || "").toUpperCase() === "SAFETY_OFFICER" ? 0 : 1;
      return ra - rb;
    });

    return {
      siteOfficers: siteList,
      otherSafetyOfficers: safetyList,
      otherUsers: otherList,
    };
  }, [allUsers, siteOfficerIds]);

  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignedTo) {
      if (siteOfficers.length > 0) {
        setAssignedTo(siteOfficers[0].id);
      } else if (otherSafetyOfficers.length > 0) {
        setAssignedTo(otherSafetyOfficers[0].id);
      } else if (allUsers.length > 0) {
        setAssignedTo(allUsers[0].id);
      }
    }
  }, [assignedTo, siteOfficers, otherSafetyOfficers, allUsers]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setNote("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo) {
      setError(
        isVietnamese
          ? "Vui lòng chọn cán bộ an toàn tiếp nhận xử lý."
          : "Please select a safety officer to dispatch.",
      );
      return;
    }
    setError(null);
    try {
      await onSubmit({
        assignedTo,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Không thể điều phối hàng loạt."
            : "Failed to batch dispatch incidents.",
      );
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        isVietnamese
          ? `Duyệt & Giao xử lý hàng loạt (${incidents.length} sự cố)`
          : `Batch Confirm & Dispatch (${incidents.length} incidents)`
      }
      description={
        isVietnamese
          ? "Xác nhận đồng loạt các vi phạm đã chọn, phân công 1 cán bộ phụ trách và chỉ gửi đúng 1 tín hiệu thông báo tổng hợp."
          : "Confirm selected violations, assign one safety officer, and dispatch a single consolidated notification signal."
      }
      icon={<UserCheck className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            form="batch-dispatch-form"
            type="submit"
            variant="primary"
            disabled={loading || incidents.length === 0}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span>
              {isVietnamese
                ? `Giao ${incidents.length} sự cố & Gửi tín hiệu`
                : `Dispatch ${incidents.length} Incidents`}
            </span>
          </Button>
        </div>
      }
    >
      <form id="batch-dispatch-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>
              {isVietnamese
                ? `Camera liên quan: ${cameraSummary || "—"}`
                : `Cameras: ${cameraSummary || "—"}`}
            </span>
          </div>
          {pendingCount > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {isVietnamese
                ? `• Tự động thẩm duyệt xác nhận ${pendingCount} sự cố đang ở trạng thái Chờ duyệt.`
                : `• Automatically confirms ${pendingCount} pending review incidents.`}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {isVietnamese
              ? `• Gán cán bộ và phát duy nhất 1 tín hiệu [ĐIỀU PHỐI] để tránh làm phiền.`
              : `• Assigns officer and sends a single consolidated [ĐIỀU PHỐI] alert.`}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Cán bộ an toàn tiếp nhận" : "Safety Officer"}{" "}
            <span className="text-danger">*</span>
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading || usersLoading}
            required
          >
            {usersLoading && (
              <option value="">
                {isVietnamese ? "Đang tải nhân sự..." : "Loading personnel..."}
              </option>
            )}
            {siteOfficers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? "Cán bộ thuộc công trường (Ưu tiên)"
                    : "Site Personnel (Priority)"
                }
              >
                {siteOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.role?.name || "Officer"})
                  </option>
                ))}
              </optgroup>
            )}
            {otherSafetyOfficers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? "Cán bộ An toàn hệ thống"
                    : "System Safety Officers"
                }
              >
                {otherSafetyOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.role?.name || "Officer"})
                  </option>
                ))}
              </optgroup>
            )}
            {otherUsers.length > 0 && (
              <optgroup label={isVietnamese ? "Nhân sự khác" : "Other Staff"}>
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.role?.name || "User"})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            {isVietnamese
              ? "Chỉ đạo gửi kèm tín hiệu (tùy chọn)"
              : "Dispatch Directive (optional)"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={
              isVietnamese
                ? "Ví dụ: Ra khu vực cổng CAM-01 kiểm tra và nhắc tổ thi công đội mũ bảo hộ ngay..."
                : "Example: Inspect CAM-01 zone and enforce hard hat compliance immediately..."
            }
            className="w-full resize-none rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}
