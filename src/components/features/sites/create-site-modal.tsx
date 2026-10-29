"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  Loader2,
  Phone,
  Plus,
  Trash2,
  User,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
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

  // Fetch users for the dropdown
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const allUsers: UserResponseDto[] = useMemo(() => usersData?.data ?? [], [usersData]);

  // Group safety personnel first
  const { safetyUsers, otherUsers } = useMemo(() => {
    const safety: UserResponseDto[] = [];
    const other: UserResponseDto[] = [];
    allUsers.forEach((u) => {
      const roleName = u.role?.name?.toUpperCase() || "";
      if (
        roleName.includes("SAFETY") ||
        roleName.includes("OFFICER") ||
        roleName.includes("MANAGER") ||
        roleName.includes("ADMIN")
      ) {
        safety.push(u);
      } else {
        other.push(u);
      }
    });
    return { safetyUsers: safety, otherUsers: other };
  }, [allUsers]);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Officers list state (at least 1 officer by default)
  const [officers, setOfficers] = useState<OfficerFormState[]>([
    {
      id: "officer-1",
      name: "",
      roleTitle: "Trưởng ban an toàn (Lead)",
      isManualName: false,
      phones: [""],
    },
  ]);

  const handleAddOfficer = () => {
    const nextRole =
      officers.length === 1
        ? "Phó ban an toàn (Deputy)"
        : officers.length === 2
          ? "Cán bộ giám sát an toàn (Officer)"
          : "Cán bộ an toàn";

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

        // If phones has empty first element, auto-populate user's phone
        const updatedPhones = [...off.phones];
        if (userPhone && (!updatedPhones[0] || updatedPhones[0].trim() === "")) {
          updatedPhones[0] = userPhone;
        }

        return {
          ...off,
          userId: value,
          name: userName,
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
      setError("Vui lòng nhập tên công trường.");
      return;
    }

    const formattedCode = code.trim().toUpperCase().replace(/\s+/g, "-");
    if (!formattedCode) {
      setError("Vui lòng nhập mã định danh công trường (VD: SITE-LANDMARK-01).");
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
      setAddress("");
      setDescription("");
      setOfficers([
        {
          id: "officer-1",
          name: "",
          roleTitle: "Trưởng ban an toàn (Lead)",
          isManualName: false,
          phones: [""],
        },
      ]);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo công trường";
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
              onChange={(e) => setName(e.target.value)}
              placeholder={t("sites.form.namePlaceholder")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
            />
          </div>

          {/* Site Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("sites.form.code")} <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("sites.form.codePlaceholder")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs uppercase shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
            />
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
                          {safetyUsers.length > 0 && (
                            <optgroup label="Cán bộ chuyên trách an toàn">
                              {safetyUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName || u.email} ({u.role?.name || "User"}
                                  {u.phoneNumber ? ` - ${u.phoneNumber}` : ""})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {otherUsers.length > 0 && (
                            <optgroup label="Nhân sự khác trong hệ thống">
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

