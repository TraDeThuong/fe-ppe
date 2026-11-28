"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2, UserCheck, Building2, Phone } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PhoneReveal } from "@/components/ui/phone-reveal";
import { useLocale } from "@/providers/locale-provider";
import { useCan } from "@/hooks/use-can";
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/hooks/users/user.query-keys";
import { userService } from "@/services/user.service";
import { useSiteStaff } from "@/hooks/users/use-site-staff";
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
  const can = useCan();
  const canReadUsers = can("USER_READ");
  const { getSite } = useEntityLookup({ enabled: open });

  const currentSite = useMemo(
    () => (incident?.siteId ? getSite(incident.siteId) : undefined),
    [incident?.siteId, getSite]
  );

  // Chỉ lấy nhân sự đang hoạt động thuộc đúng công trường của sự cố (BE lọc theo siteId), vì BE từ chối
  // giao cho người ngoài công trường. Không giữ dữ liệu của sự cố trước để tránh chọn nhầm công trường khác.
  const siteId = incident?.siteId;
  // Ưu tiên `/users/site-staff` (không cần USER_READ). BE chưa có endpoint → `GET /users?siteId=`
  // (cần USER_READ) → cuối cùng là cán bộ liên hệ khai báo ở công trường.
  const siteStaff = useSiteStaff(siteId ? [siteId] : [], open);
  const useLegacyDirectory = !siteStaff.isLoading && siteStaff.users === null;
  // Dùng chung cache "danh bạ theo công trường" với /incidents/assignments; tải đủ mọi trang.
  const { data: usersData, isLoading: usersQueryLoading } = useQuery({
    queryKey: [...userKeys.all, "directory", { siteId }] as const,
    queryFn: () => userService.getAllUsers({ siteId }),
    enabled: open && useLegacyDirectory && canReadUsers && Boolean(siteId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const usersLoading =
    siteStaff.isLoading || (useLegacyDirectory && canReadUsers && usersQueryLoading);

  const allUsers: UserResponseDto[] = useMemo(() => {
    if (siteStaff.users) return siteStaff.users;
    if (canReadUsers) return usersData?.data ?? [];
    return (currentSite?.contactOfficers || [])
      .filter((o): o is typeof o & { userId: string } => Boolean(o.userId))
      .map((o) => ({
        id: o.userId,
        email: null,
        fullName: o.name,
        phoneNumber: o.phones?.[0] ?? null,
        roleId: "",
        role: { name: o.roleTitle || "SAFETY_OFFICER" } as UserResponseDto["role"],
        siteIds: siteId ? [siteId] : [],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      }));
  }, [siteStaff.users, canReadUsers, usersData, currentSite, siteId]);

  // Chỉ cán bộ an toàn của công trường: bỏ tài khoản role USER / ADMIN và người không gắn công trường này.
  const { siteOfficers, safetyOfficers, generalOfficers } = useMemo(() => {
    const isEligibleRole = (roleName: string) =>
      !roleName.includes("ADMIN") &&
      (roleName.includes("SAFETY") ||
        roleName.includes("OFFICER") ||
        roleName.includes("MANAGER") ||
        roleName.includes("SUPERVISOR"));
    const officerFirst = (u: UserResponseDto) =>
      (u.role?.name || "").toUpperCase() === "SAFETY_OFFICER" ? 0 : 1;

    const siteAssigned = allUsers
      .filter((u) => u.isActive !== false)
      .filter((u) => !siteId || !Array.isArray(u.siteIds) || u.siteIds.length === 0 || u.siteIds.includes(siteId))
      .filter((u) => isEligibleRole((u.role?.name || "").toUpperCase()))
      .sort(
        (a, b) =>
          officerFirst(a) - officerFirst(b) ||
          (a.fullName || a.email || "").localeCompare(b.fullName || b.email || "", "vi"),
      );

    return {
      siteOfficers: siteAssigned,
      safetyOfficers: [] as UserResponseDto[],
      generalOfficers: [] as UserResponseDto[],
    };
  }, [allUsers, siteId]);

  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedOfficer = useMemo(
    () => allUsers.find((u) => u.id === assignedToUserId) ?? null,
    [allUsers, assignedToUserId]
  );

  // Reset lựa chọn mỗi khi mở modal cho một sự cố khác
  useEffect(() => {
    if (!open) return;
    setNote("");
    setError(null);
    setAssignedToUserId(siteOfficers[0]?.id ?? "");
  }, [open, incident?.id, siteOfficers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    setError(null);

    try {
      await onSubmit(incident.id, {
        assignedTo: assignedToUserId,
        assignedToUserId,
        note: note.trim() || undefined,
      });

      setNote("");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Đã có lỗi xảy ra khi phân công cán bộ"
            : "Failed to assign safety officer";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("incidents.modals.assignTitle")}
      description={
        isVietnamese
          ? `Điều phối cán bộ an toàn phụ trách giải quyết sự cố #${incident?.id.slice(0, 8)}`
          : `Assign a safety officer to resolve incident #${incident?.id.slice(0, 8)}`
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
            {!usersLoading && siteOfficers.length === 0 && (
              <option value="">
                {isVietnamese
                  ? "-- Chưa có danh sách nhân sự khả dụng --"
                  : "-- No personnel directory available --"}
              </option>
            )}
            {siteOfficers.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? `Cán bộ thuộc công trường ${currentSite?.name || ""}`.trim()
                    : `Officers at site ${currentSite?.name || ""}`.trim()
                }
              >
                {siteOfficers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.role?.name || (isVietnamese ? "Cán bộ tại chỗ" : "Site Officer")})
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
                    {u.fullName || u.email} ({u.role?.name || (isVietnamese ? "Cán bộ An toàn" : "Safety Officer")})
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
          {selectedOfficer?.phoneNumber && (
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{isVietnamese ? "SĐT liên hệ:" : "Contact phone:"}</span>
              <PhoneReveal
                key={selectedOfficer.id}
                phoneNumber={selectedOfficer.phoneNumber}
                isVietnamese={isVietnamese}
                iconSize={12}
                buttonClassName="size-6"
              />
            </div>
          )}
        </div>

        {/* Note sent with realtime [ĐIỀU PHỐI] signal */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            {isVietnamese
              ? "Chỉ đạo gửi kèm tín hiệu cho cán bộ (tùy chọn)"
              : "Dispatch Directive Sent with Signal (optional)"}
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
