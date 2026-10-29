"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2, UserCheck, Building2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { useUsers } from "@/hooks/users";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import type { CreateAssignmentPayload, IncidentItem, UserResponseDto } from "@/types";

export interface AssignIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentItem | null;
  onSubmit: (id: string, payload: CreateAssignmentPayload) => Promise<void>;
  loading?: boolean;
}

export function AssignIncidentModal({
  open,
  onOpenChange,
  incident,
  onSubmit,
  loading = false,
}: AssignIncidentModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSite } = useEntityLookup();

  const currentSite = useMemo(
    () => (incident?.siteId ? getSite(incident.siteId) : undefined),
    [incident?.siteId, getSite]
  );

  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const allUsers: UserResponseDto[] = useMemo(() => usersData?.data ?? [], [usersData]);

  // Group users into site-specific officers, safety personnel, and general personnel
  const { siteOfficers, safetyOfficers, generalOfficers } = useMemo(() => {
    const siteAssigned: UserResponseDto[] = [];
    const safety: UserResponseDto[] = [];
    const general: UserResponseDto[] = [];

    const siteOfficerUserIds = new Set(
      (currentSite?.contactOfficers || [])
        .map((o) => o.userId)
        .filter((id): id is string => Boolean(id))
    );
    const siteOfficerNames = new Set(
      (currentSite?.contactOfficers || [])
        .map((o) => o.name?.trim().toLowerCase())
        .filter(Boolean)
    );

    allUsers.forEach((u) => {
      const isSiteAssigned =
        siteOfficerUserIds.has(u.id) ||
        (u.fullName && siteOfficerNames.has(u.fullName.trim().toLowerCase()));

      if (isSiteAssigned) {
        siteAssigned.push(u);
        return;
      }

      const roleName = u.role?.name?.toUpperCase() || "";
      if (
        roleName.includes("SAFETY") ||
        roleName.includes("OFFICER") ||
        roleName.includes("MANAGER") ||
        roleName.includes("ADMIN") ||
        roleName.includes("SUPERVISOR")
      ) {
        safety.push(u);
      } else {
        general.push(u);
      }
    });

    return {
      siteOfficers: siteAssigned,
      safetyOfficers: safety,
      generalOfficers: general,
    };
  }, [allUsers, currentSite]);

  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [priority, setPriority] = useState<"URGENT" | "HIGH" | "NORMAL">("HIGH");
  const [deadlineMinutes, setDeadlineMinutes] = useState(30);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Set default selection when users are loaded
  useEffect(() => {
    if (!assignedToUserId) {
      if (siteOfficers.length > 0) {
        setAssignedToUserId(siteOfficers[0].id);
      } else if (safetyOfficers.length > 0) {
        setAssignedToUserId(safetyOfficers[0].id);
      } else if (allUsers.length > 0) {
        setAssignedToUserId(allUsers[0].id);
      }
    }
  }, [siteOfficers, safetyOfficers, allUsers, assignedToUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    setError(null);

    const deadlineDate = new Date(Date.now() + deadlineMinutes * 60 * 1000).toISOString();

    try {
      await onSubmit(incident.id, {
        assignedToUserId,
        priority,
        deadline: deadlineDate,
        note: note.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi phân công cán bộ";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("incidents.modals.assignTitle")}
      description={`Điều phối cán bộ an toàn phụ trách giải quyết sự cố #${incident?.id.slice(0, 8)}`}
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
            form="assign-incident-form"
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            <span>{isVietnamese ? "Xác nhận phân công" : "Confirm Assignment"}</span>
          </Button>
        </div>
      }
    >
      <form id="assign-incident-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Site Context Chip */}
        {currentSite && (
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">
              {isVietnamese ? "Công trường liên quan:" : "Associated Site:"}{" "}
              <strong className="text-foreground">{currentSite.name}</strong> ({currentSite.code})
            </span>
          </div>
        )}

        {/* Officer Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Cán bộ An toàn tiếp nhận" : "Assigned Safety Officer"}{" "}
              <span className="text-danger">*</span>
            </label>
            {usersLoading && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                {isVietnamese ? "Đang tải nhân sự..." : "Loading personnel..."}
              </span>
            )}
          </div>
          <select
            value={assignedToUserId}
            onChange={(e) => setAssignedToUserId(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading || usersLoading}
            required
          >
            {usersLoading && (
              <option value="">
                {isVietnamese ? "Đang tải danh sách nhân sự..." : "Loading personnel directory..."}
              </option>
            )}
            {!usersLoading && allUsers.length === 0 && (
              <>
                <option value="00000000-0000-0000-0000-000000000002">
                  Nguyễn Văn An ({isVietnamese ? "Trưởng ca Giám sát An toàn" : "Lead Safety Supervisor"})
                </option>
                <option value="00000000-0000-0000-0000-000000000003">
                  Trần Đình Bình ({isVietnamese ? "Kỹ thuật viên Hiện trường" : "Field Operations Officer"})
                </option>
                <option value="00000000-0000-0000-0000-000000000004">
                  Lê Thị Cẩm ({isVietnamese ? "Cán bộ Kiểm tra Môi trường & PPE" : "HSE & PPE Compliance Officer"})
                </option>
              </>
            )}
            {siteOfficers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? `Cán bộ phụ trách tại ${currentSite?.name || "Công trường"} (Ưu tiên)`
                    : `Assigned Officers at ${currentSite?.name || "Site"} (Priority)`
                }
              >
                {siteOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    ⭐ {u.fullName || u.email} ({u.role?.name || (isVietnamese ? "Cán bộ tại chỗ" : "Site Officer")}
                    {u.phoneNumber ? ` - ${u.phoneNumber}` : ""})
                  </option>
                ))}
              </optgroup>
            )}
            {safetyOfficers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? "Cán bộ Giám sát An toàn (Toàn hệ thống)"
                    : "Safety Surveillance Officers (System-wide)"
                }
              >
                {safetyOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.role?.name || (isVietnamese ? "Cán bộ An toàn" : "Safety Officer")}
                    {u.phoneNumber ? ` - ${u.phoneNumber}` : ""})
                  </option>
                ))}
              </optgroup>
            )}
            {generalOfficers.length > 0 && (
              <optgroup label={isVietnamese ? "Nhân sự khác" : "Other Personnel"}>
                {generalOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.role?.name || (isVietnamese ? "Nhân viên" : "Staff")})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {isVietnamese ? "Mức độ ưu tiên" : "Priority Level"}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "URGENT" | "HIGH" | "NORMAL")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
              disabled={loading}
            >
              <option value="URGENT">
                {isVietnamese ? "Khẩn cấp (Xử lý ngay)" : "Urgent (Immediate)"}
              </option>
              <option value="HIGH">
                {isVietnamese ? "Ưu tiên cao" : "High Priority"}
              </option>
              <option value="NORMAL">
                {isVietnamese ? "Bình thường" : "Normal"}
              </option>
            </select>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {isVietnamese ? "Thời hạn giải quyết" : "Resolution SLA / Deadline"}
            </label>
            <select
              value={deadlineMinutes}
              onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
              disabled={loading}
            >
              <option value={15}>{isVietnamese ? "15 phút" : "15 minutes"}</option>
              <option value={30}>{isVietnamese ? "30 phút" : "30 minutes"}</option>
              <option value={60}>{isVietnamese ? "1 giờ" : "1 hour"}</option>
              <option value={120}>{isVietnamese ? "2 giờ" : "2 hours"}</option>
            </select>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            {isVietnamese ? "Chỉ đạo & Ghi chú cho cán bộ" : "Directives & Instructions for Officer"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isVietnamese
                ? "Yêu cầu công nhân trang bị đủ mũ bảo hộ trước khi tiếp tục làm việc..."
                : "Instruct worker to equip mandatory PPE before continuing work..."
            }
            rows={2}
            className="w-full resize-none rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}
