"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  User,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import { useSitesCatalog } from "@/hooks/sites";
import { useUsers } from "@/hooks/users";
import {
  generateUniqueEntityCode,
  isCodeTaken,
  sanitizeManualCode,
} from "@/lib/code-generator";
import { useLocale } from "@/providers/locale-provider";
import { groupUsersBySafetyRole, suggestSiteRoleTitle } from "./site-helpers";
import type { CreateSitePayload, SiteContactOfficer, UserResponseDto } from "@/types";

export interface CreateSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSitePayload) => Promise<void>;
  loading?: boolean;
}

interface OfficerFormState {
  id: string;
  userId?: string;
  name: string;
  roleTitle: string;
  isManualName: boolean;
  phones: string[];
}

export function CreateSiteModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CreateSiteModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadSites = can("PPE_SITE_READ");
  const canReadUsers = can("USER_READ");

  // Fetch existing sites catalog to guarantee unique site code
  const { data: sitesCatalog } = useSitesCatalog({
    enabled: open && canReadSites,
  });
  const existingSiteCodes = useMemo(
    () => (sitesCatalog ?? []).map((s) => s.code),
    [sitesCatalog],
  );

  // Fetch users for the dropdown (only when modal is open and user has USER_READ)
  const { data: usersData, isLoading: usersLoading } = useUsers(
    { limit: 100 },
    { enabled: open && canReadUsers },
  );
  const allUsers: UserResponseDto[] = useMemo(() => usersData?.data ?? [], [usersData]);

  // Group personnel by hierarchy: SAFETY_MANAGER -> SAFETY_OFFICER -> Others
  const { managers: safetyManagers, officers: safetyOfficers, others: otherUsers } = useMemo(
    () => groupUsersBySafetyRole(allUsers),
    [allUsers],
  );

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCode((prev) => {
      if (prev.trim() && !isCodeTaken(prev, existingSiteCodes)) return prev;
      return generateUniqueEntityCode({
        prefix: "SITE",
        nameHint: name,
        existingCodes: existingSiteCodes,
      });
    });
  }, [open, existingSiteCodes]);

  const handleRandomizeCode = () => {
    const nextCode = generateUniqueEntityCode({
      prefix: "SITE",
      nameHint: name,
      existingCodes: [...existingSiteCodes, code],
    });
    setCode(nextCode);
    setIsCodeManual(false);
    setError(null);
  };

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    if (!isCodeManual) {
      setCode(
        generateUniqueEntityCode({
          prefix: "SITE",
          nameHint: nextName,
          existingCodes: existingSiteCodes,
        }),
      );
    }
  };

  const isDuplicateCode = useMemo(
    () => Boolean(code.trim()) && isCodeTaken(code, existingSiteCodes),
    [code, existingSiteCodes],
  );

  // Officers list state (at least 1 officer by default)
  const [officers, setOfficers] = useState<OfficerFormState[]>([
    {
      id: "officer-1",
      name: "",
      roleTitle: isVietnamese ? "Trưởng ban an toàn (Lead)" : "Lead Safety Officer",
      isManualName: false,
      phones: [""],
    },
  ]);

  const handleAddOfficer = () => {
    const nextRole =
      officers.length === 1
        ? isVietnamese
          ? "Phó ban an toàn (Deputy)"
          : "Deputy Safety Officer"
        : officers.length === 2
          ? isVietnamese
            ? "Cán bộ giám sát an toàn (Officer)"
            : "Safety Supervision Officer"
          : isVietnamese
            ? "Cán bộ an toàn"
            : "Safety Officer";

    setOfficers((prev) => [
      ...prev,
      {
        id: `officer-${Date.now()}`,
        name: "",
        roleTitle: nextRole,
        isManualName: false,
        phones: [""],
      },
    ]);
  };

  const handleRemoveOfficer = (id: string) => {
    setOfficers((prev) => prev.filter((o) => o.id !== id));
  };

  const handleUserSelect = (officerId: string, value: string) => {
    setOfficers((prev) =>
      prev.map((off) => {
        if (off.id !== officerId) return off;

        if (value === "MANUAL") {
          return {
            ...off,
            userId: undefined,
            isManualName: true,
          };
        }

        if (!value) {
          return {
            ...off,
            userId: undefined,
            name: "",
            isManualName: false,
          };
        }

        const found = allUsers.find((u) => u.id === value);
        const userName = found ? found.fullName || found.email || "" : "";
        const userPhone = found?.phoneNumber || "";
        const suggestedTitle = suggestSiteRoleTitle(found?.role?.name, isVietnamese);
        const shouldKeepSelectedRole =
          off.roleTitle.includes("Deputy") ||
          off.roleTitle.includes("Phó ban") ||
          off.roleTitle.includes("Chỉ huy trưởng") ||
          off.roleTitle.includes("Commander");

        // If phones has empty first element, auto-populate user's phone
        const updatedPhones = [...off.phones];
        if (userPhone && (!updatedPhones[0] || updatedPhones[0].trim() === "")) {
          updatedPhones[0] = userPhone;
        }

        return {
          ...off,
          userId: value,
          name: userName,
          roleTitle: shouldKeepSelectedRole
            ? off.roleTitle
            : suggestedTitle || off.roleTitle,
          isManualName: false,
          phones: updatedPhones,
        };
      })
    );
  };

  const handleOfficerChange = (
    officerId: string,
    field: "name" | "roleTitle",
    value: string
  ) => {
    setOfficers((prev) =>
      prev.map((off) => (off.id === officerId ? { ...off, [field]: value } : off))
    );
  };

  const handleAddPhone = (officerId: string) => {
    setOfficers((prev) =>
      prev.map((off) =>
        off.id === officerId ? { ...off, phones: [...off.phones, ""] } : off
      )
    );
  };

  const handlePhoneChange = (
    officerId: string,
    phoneIdx: number,
    value: string
  ) => {
    setOfficers((prev) =>
      prev.map((off) => {
        if (off.id !== officerId) return off;
        const newPhones = [...off.phones];
        newPhones[phoneIdx] = value;
        return { ...off, phones: newPhones };
      })
    );
  };

  const handleRemovePhone = (officerId: string, phoneIdx: number) => {
    setOfficers((prev) =>
      prev.map((off) => {
        if (off.id !== officerId) return off;
        const newPhones = off.phones.filter((_, idx) => idx !== phoneIdx);
        return { ...off, phones: newPhones.length > 0 ? newPhones : [""] };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(isVietnamese ? "Vui lòng nhập tên công trường." : "Please enter site name.");
      return;
    }

    const sanitizedManual = sanitizeManualCode(code, "standard");
    const formattedCode =
      sanitizedManual.length >= 2
        ? sanitizedManual
        : generateUniqueEntityCode({
            prefix: "SITE",
            nameHint: name,
            existingCodes: existingSiteCodes,
          });

    if (isCodeTaken(formattedCode, existingSiteCodes)) {
      setError(
        isVietnamese
          ? `Mã công trường "${formattedCode}" đã tồn tại. Vui lòng nhập mã khác hoặc bấm nút Random mã mới.`
          : `Site code "${formattedCode}" already exists. Please enter another code or click Randomize.`,
      );
      return;
    }

    // Format contact officers
    const validOfficers: SiteContactOfficer[] = officers
      .filter((o) => o.name.trim())
      .map((o) => ({
        userId: o.userId || undefined,
        name: o.name.trim(),
        roleTitle: o.roleTitle.trim(),
        phones: o.phones.map((p) => p.trim()).filter(Boolean),
      }));

    const primaryOfficer = validOfficers[0];
    const primaryPhone =
      primaryOfficer?.phones && primaryOfficer.phones.length > 0
        ? primaryOfficer.phones.join(", ")
        : undefined;

    try {
      await onSubmit({
        name: name.trim(),
        code: formattedCode,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        contactPerson: primaryOfficer?.name || undefined,
        contactPhone: primaryPhone,
        contactOfficers: validOfficers,
      });

      setName("");
      setCode("");
      setIsCodeManual(false);
      setAddress("");
      setDescription("");
      setOfficers([
        {
          id: "officer-1",
          name: "",
          roleTitle: isVietnamese ? "Trưởng ban an toàn (Lead)" : "Lead Safety Officer",
          isManualName: false,
          phones: [""],
        },
      ]);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Đã có lỗi xảy ra khi tạo công trường"
            : "Failed to create construction site";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("sites.modals.createTitle")}
      description={t("sites.modals.createDesc")}
      icon={<Building2 className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Site Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("sites.form.name")} <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("sites.form.namePlaceholder")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
            />
          </div>

          {/* Site Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("sites.form.code")}
              </label>
              <button
                type="button"
                onClick={handleRandomizeCode}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                title={
                  isVietnamese
                    ? "Tự động tạo mã ngẫu nhiên không trùng"
                    : "Generate a unique random site code"
                }
              >
                <RefreshCw className="h-3 w-3" />
                <span>{isVietnamese ? "Random mã" : "Randomize"}</span>
              </button>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const nextVal = e.target.value;
                setCode(nextVal);
                setIsCodeManual(Boolean(nextVal.trim()));
                if (error) setError(null);
              }}
              placeholder={
                isVietnamese
                  ? "Tự động sinh nếu bỏ trống (VD: SITE-9F4X)"
                  : "Auto-generated if left blank (e.g., SITE-9F4X)"
              }
              className={`w-full rounded-xl border bg-background/50 px-3.5 py-2.5 font-mono text-xs uppercase shadow-nm-inset focus:outline-none focus:ring-1 ${
                isDuplicateCode
                  ? "border-danger text-danger focus:border-danger focus:ring-danger"
                  : "border-border/50 focus:border-primary focus:ring-primary"
              }`}
              disabled={loading}
            />
            {isDuplicateCode && (
              <p className="text-[11px] font-medium text-danger">
                {isVietnamese
                  ? "Mã này đã tồn tại trong danh sách công trường. Bấm 'Random mã' để đổi mã mới."
                  : "This code already exists. Click 'Randomize' to generate a unique code."}
              </p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sites.form.address")}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("sites.form.addressPlaceholder")}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* ── CÁN BỘ PHỤ TRÁCH AN TOÀN & LIÊN HỆ KHẨN CẤP ─────────────────────── */}
        <div className="space-y-3 rounded-2xl border border-border/40 bg-surface-elevated/30 p-3 sm:p-4 dark:border-black/50 dark:bg-card/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  {t("sites.form.officersTitle")}
                </h4>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  {t("sites.form.officersDesc")}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOfficer}
              disabled={loading}
              className="flex items-center gap-1 rounded-xl text-[11px] h-7 px-2.5 text-primary border-primary/30 hover:bg-primary/10"
            >
              <Plus className="h-3 w-3" />
              <span>{t("sites.form.addOfficer")}</span>
            </Button>
          </div>

          {/* Officers List */}
          <div className="space-y-3">
            {officers.map((officer, oIdx) => (
              <div
                key={officer.id}
                className="rounded-xl border border-border/40 bg-background/60 p-3 space-y-3 shadow-nm-inset dark:border-black/50 dark:bg-card/70"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <User className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[11px] font-bold text-foreground shrink-0">
                      #{oIdx + 1}:
                    </span>

                    {/* Officer Duty/Role Selector */}
                    <select
                      value={officer.roleTitle}
                      onChange={(e) =>
                        handleOfficerChange(officer.id, "roleTitle", e.target.value)
                      }
                      className="rounded-lg border border-border/40 bg-surface px-2 py-1 text-xs font-semibold text-primary focus:border-primary focus:outline-none"
                    >
                      <option value="Trưởng ban an toàn (Lead)">
                        {t("sites.form.roles.lead")}
                      </option>
                      <option value="Phó ban an toàn (Deputy)">
                        {t("sites.form.roles.deputy")}
                      </option>
                      <option value="Cán bộ giám sát an toàn (Officer)">
                        {t("sites.form.roles.officer")}
                      </option>
                      <option value="Chỉ huy trưởng công trường">
                        {t("sites.form.roles.commander")}
                      </option>
                      <option value="Cán bộ an toàn">
                        {t("sites.form.roles.custom")}
                      </option>
                      {officer.roleTitle &&
                        ![
                          "Trưởng ban an toàn (Lead)",
                          "Phó ban an toàn (Deputy)",
                          "Cán bộ giám sát an toàn (Officer)",
                          "Chỉ huy trưởng công trường",
                          "Cán bộ an toàn",
                        ].includes(officer.roleTitle) && (
                          <option value={officer.roleTitle}>{officer.roleTitle}</option>
                        )}
                    </select>
                  </div>

                  {officers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOfficer(officer.id)}
                      className="p-1 text-muted-foreground hover:text-danger rounded-lg transition"
                      title={t("sites.form.removeOfficer")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Officer User Dropdown or Manual Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      {t("sites.form.officerName")}
                    </label>

                    {!officer.isManualName ? (
                      <div className="space-y-1">
                        <select
                          value={officer.userId || ""}
                          onChange={(e) => handleUserSelect(officer.id, e.target.value)}
                          className="w-full rounded-xl border border-border/50 bg-surface px-3 py-2 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
                        >
                          <option value="">{t("sites.form.selectUser")}</option>
                          {safetyManagers.length > 0 && (
                            <optgroup
                              label={
                                isVietnamese
                                  ? "Quản lý an toàn công trường (SAFETY_MANAGER)"
                                  : "Site Safety Managers (SAFETY_MANAGER)"
                              }
                            >
                              {safetyManagers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName || u.email} ({u.role?.name || "Manager"})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {safetyOfficers.length > 0 && (
                            <optgroup
                              label={
                                isVietnamese
                                  ? "Cán bộ trực ban an toàn (SAFETY_OFFICER)"
                                  : "Field Safety Officers (SAFETY_OFFICER)"
                              }
                            >
                              {safetyOfficers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName || u.email} ({u.role?.name || "Officer"})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {otherUsers.length > 0 && (
                            <optgroup
                              label={
                                isVietnamese
                                  ? "Nhân sự khác trong hệ thống"
                                  : "Other System Personnel"
                              }
                            >
                              {otherUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName || u.email} ({u.role?.name || "User"})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="MANUAL">{t("sites.form.manualInput")}</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={officer.name}
                          onChange={(e) =>
                            handleOfficerChange(officer.id, "name", e.target.value)
                          }
                          placeholder={t("sites.form.officerNamePlaceholder")}
                          className="flex-1 rounded-xl border border-border/50 bg-surface px-3 py-2 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setOfficers((prev) =>
                              prev.map((o) =>
                                o.id === officer.id
                                  ? { ...o, isManualName: false, userId: "" }
                                  : o
                              )
                            )
                          }
                          className="text-[11px] px-2 h-8 text-muted-foreground"
                          title={isVietnamese ? "Chọn lại từ danh sách người dùng" : "Select from user list"}
                        >
                          User
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Multiple Phone Numbers */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{t("sites.form.phones")}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleAddPhone(officer.id)}
                        className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{t("sites.form.addPhone")}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {officer.phones.map((phone, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-1.5">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) =>
                              handlePhoneChange(officer.id, pIdx, e.target.value)
                            }
                            placeholder={t("sites.form.phonePlaceholder")}
                            className="flex-1 rounded-xl border border-border/50 bg-surface px-3 py-1.5 font-mono text-xs shadow-nm-inset focus:border-primary focus:outline-none"
                          />
                          {officer.phones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePhone(officer.id, pIdx)}
                              className="p-1 text-muted-foreground hover:text-danger rounded-lg transition"
                              title={isVietnamese ? "Xóa số này" : "Remove phone number"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sites.form.description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("sites.form.descPlaceholder")}
            rows={2}
            className="w-full resize-none rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{t("sites.form.createButton")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

