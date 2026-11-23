"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Loader2, Send, ShieldAlert, UserCheck, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/users";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import { summarizeIncidentGroup } from "@/lib/incident-assignment-groups";
import { formatViolationTypeLabel } from "@/lib/notification-display";
import type { IncidentItem, UserResponseDto } from "@/types";

export interface BatchDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidents: IncidentItem[];
  /** Tải công việc hiện tại của từng Officer để Manager cân đối phân công */
  officerWorkloadById?: ReadonlyMap<
    string,
    { activeCount: number; resolvedCount: number }
  >;
  onSubmit: (payload: { assignedTo: string; note?: string }) => Promise<void>;
  loading?: boolean;
}

export function BatchDispatchModal({
  open,
  onOpenChange,
  incidents,
  officerWorkloadById,
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

  const batchSummary = useMemo(
    () =>
      summarizeIncidentGroup(
        incidents,
        (item) =>
          item.cameraCode || getCameraCode(item.cameraId) || item.cameraId.slice(0, 8),
      ),
    [incidents, getCameraCode],
  );

  const cameraSummary = useMemo(() => {
    const labels = batchSummary.cameraLabels;
    return (
      labels.slice(0, 4).join(", ") +
      (labels.length > 4 ? ` (+${labels.length - 4})` : "")
    );
  }, [batchSummary.cameraLabels]);

  // 1. Ưu tiên cao nhất: Officer được cài đặt trực tiếp khi tạo site (`site.contactOfficers`)
  // 2. Nhóm tiếp theo: Nhân sự được gắn `siteIds` thuộc công trường này
  const { configuredContactOrder, siteMemberIds } = useMemo(() => {
    const contactOrder = new Map<string, number>();
    const memberIds = new Set<string>();
    const siteIds = new Set(incidents.map((i) => i.siteId).filter(Boolean));
    let seq = 0;

    for (const sid of siteIds) {
      const site = getSite(sid);
      for (const off of site?.contactOfficers || []) {
        if (off.userId && !contactOrder.has(off.userId)) {
          contactOrder.set(off.userId, seq++);
        }
      }
      for (const u of allUsers) {
        if (Array.isArray(u.siteIds) && u.siteIds.includes(sid)) {
          memberIds.add(u.id);
        }
      }
    }
    return { configuredContactOrder: contactOrder, siteMemberIds: memberIds };
  }, [incidents, getSite, allUsers]);

  const getActiveLoad = (userId: string) =>
    officerWorkloadById?.get(userId)?.activeCount ?? 0;

  const {
    configuredSiteOfficers,
    otherSiteMembers,
    otherSafetyOfficers,
    otherUsers,
    leastBusyAlternative,
  } = useMemo(() => {
    const configuredList: UserResponseDto[] = [];
    const siteLinkedList: UserResponseDto[] = [];
    const safetyList: UserResponseDto[] = [];
    const otherList: UserResponseDto[] = [];

    for (const u of allUsers) {
      const roleName = (u.role?.name || "").toUpperCase();
      if (configuredContactOrder.has(u.id) && roleName !== "ADMIN") {
        configuredList.push(u);
      } else if (siteMemberIds.has(u.id) && roleName !== "ADMIN") {
        siteLinkedList.push(u);
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

    // Giữ ưu tiên theo thứ tự cài đặt trên site (SAFETY_OFFICER trước), sau đó ít việc hơn
    configuredList.sort((a, b) => {
      const ra = (a.role?.name || "").toUpperCase() === "SAFETY_OFFICER" ? 0 : 1;
      const rb = (b.role?.name || "").toUpperCase() === "SAFETY_OFFICER" ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return (
        (configuredContactOrder.get(a.id) ?? 999) -
        (configuredContactOrder.get(b.id) ?? 999)
      );
    });

    // Các nhân sự khác: sắp xếp theo tải công việc tăng dần (ít việc / rảnh lên đầu để dễ chia việc)
    const byWorkloadAsc = (a: UserResponseDto, b: UserResponseDto) => {
      const loadA = officerWorkloadById?.get(a.id)?.activeCount ?? 0;
      const loadB = officerWorkloadById?.get(b.id)?.activeCount ?? 0;
      if (loadA !== loadB) return loadA - loadB;
      const ra = (a.role?.name || "").toUpperCase() === "SAFETY_OFFICER" ? 0 : 1;
      const rb = (b.role?.name || "").toUpperCase() === "SAFETY_OFFICER" ? 0 : 1;
      return ra - rb;
    };
    siteLinkedList.sort(byWorkloadAsc);
    safetyList.sort(byWorkloadAsc);
    otherList.sort(byWorkloadAsc);

    // Gợi ý nhanh 1 Officer khác ít việc hơn nếu Officer mặc định của site đang có tải > 0
    const allOfficerCandidates = [
      ...configuredList,
      ...siteLinkedList,
      ...safetyList,
    ];
    const primaryCandidate = allOfficerCandidates[0];
    const primaryLoad = primaryCandidate
      ? (officerWorkloadById?.get(primaryCandidate.id)?.activeCount ?? 0)
      : 0;
    const lighter =
      primaryCandidate && primaryLoad > 0
        ? allOfficerCandidates.find(
            (u) =>
              u.id !== primaryCandidate.id &&
              (officerWorkloadById?.get(u.id)?.activeCount ?? 0) < primaryLoad,
          ) ?? null
        : null;

    return {
      configuredSiteOfficers: configuredList,
      otherSiteMembers: siteLinkedList,
      otherSafetyOfficers: safetyList,
      otherUsers: otherList,
      leastBusyAlternative: lighter,
    };
  }, [allUsers, configuredContactOrder, siteMemberIds, officerWorkloadById]);

  const formatOptionLabel = (u: UserResponseDto, isSitePrimary = false) => {
    const load = getActiveLoad(u.id);
    const loadLabel =
      load === 0
        ? isVietnamese
          ? "Đang rảnh · 0 việc"
          : "Available · 0 active"
        : isVietnamese
          ? `Đang xử lý ${load} việc`
          : `${load} active`;
    const siteTag = isSitePrimary
      ? isVietnamese
        ? "★ Phụ trách site · "
        : "★ Site default · "
      : "";
    return `${siteTag}${u.fullName || u.email} (${u.role?.name || "Officer"}) — ${loadLabel}`;
  };

  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (configuredSiteOfficers.length > 0) {
      setAssignedTo(configuredSiteOfficers[0].id);
    } else if (otherSiteMembers.length > 0) {
      setAssignedTo(otherSiteMembers[0].id);
    } else if (otherSafetyOfficers.length > 0) {
      setAssignedTo(otherSafetyOfficers[0].id);
    } else if (allUsers.length > 0) {
      setAssignedTo(allUsers[0].id);
    }
  }, [open, configuredSiteOfficers, otherSiteMembers, otherSafetyOfficers, allUsers]);

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

        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>
              {isVietnamese
                ? `Camera liên quan: ${cameraSummary || "—"}`
                : `Cameras: ${cameraSummary || "—"}`}
            </span>
          </div>

          {/* Tóm tắt cấu trúc gói việc sắp giao */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
            {batchSummary.severityCounts.CRITICAL > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/12 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span>
                  {batchSummary.severityCounts.CRITICAL}{" "}
                  {isVietnamese ? "Khẩn cấp" : "Critical"}
                </span>
              </span>
            )}
            {batchSummary.severityCounts.HIGH > 0 && (
              <span className="rounded-md border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 font-bold text-amber-700 dark:text-amber-300">
                {batchSummary.severityCounts.HIGH} {isVietnamese ? "Cao" : "High"}
              </span>
            )}
            {batchSummary.violationBreakdown.slice(0, 3).map((vb) => (
              <span
                key={vb.type}
                className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background px-2 py-0.5 font-semibold text-foreground"
              >
                <ShieldAlert className="h-2.5 w-2.5 text-danger" />
                <span>
                  {vb.count} {formatViolationTypeLabel(vb.type, isVietnamese)}
                </span>
              </span>
            ))}
            {incidents.length > 1 &&
              batchSummary.estimatedDistinctPersons < incidents.length && (
                <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300">
                  <Users className="h-2.5 w-2.5" />
                  <span>
                    ≈ {batchSummary.estimatedDistinctPersons}{" "}
                    {isVietnamese ? "đối tượng" : "persons"}
                  </span>
                </span>
              )}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Cán bộ an toàn tiếp nhận" : "Safety Officer"}{" "}
              <span className="text-danger">*</span>
            </label>
            {leastBusyAlternative && assignedTo !== leastBusyAlternative.id && (
              <button
                type="button"
                onClick={() => setAssignedTo(leastBusyAlternative.id)}
                className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
              >
                {isVietnamese
                  ? `Chọn người ít việc hơn: ${leastBusyAlternative.fullName || leastBusyAlternative.email} (${getActiveLoad(leastBusyAlternative.id)} việc)`
                  : `Pick less busy: ${leastBusyAlternative.fullName || leastBusyAlternative.email} (${getActiveLoad(leastBusyAlternative.id)})`}
              </button>
            )}
          </div>
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
            {configuredSiteOfficers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? "Cán bộ phụ trách cài đặt theo công trường (Ưu tiên 1)"
                    : "Configured Site Officers (Priority 1)"
                }
              >
                {configuredSiteOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatOptionLabel(u, true)}
                  </option>
                ))}
              </optgroup>
            )}
            {otherSiteMembers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? "Nhân sự khác thuộc công trường (Sắp theo ít việc trước)"
                    : "Other Site Staff (Least busy first)"
                }
              >
                {otherSiteMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatOptionLabel(u)}
                  </option>
                ))}
              </optgroup>
            )}
            {otherSafetyOfficers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? "Cán bộ An toàn khác hỗ trợ chia tải (Ít việc lên trước)"
                    : "Other Safety Officers (Least busy first)"
                }
              >
                {otherSafetyOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatOptionLabel(u)}
                  </option>
                ))}
              </optgroup>
            )}
            {otherUsers.length > 0 && (
              <optgroup label={isVietnamese ? "Nhân sự khác" : "Other Staff"}>
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatOptionLabel(u)}
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
