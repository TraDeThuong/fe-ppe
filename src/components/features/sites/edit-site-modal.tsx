"use client";

import { useEffect, useState } from "react";
import { Building2, Edit2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem, SiteStatus, UpdateSitePayload } from "@/types";

export interface EditSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteItem | null;
  onSubmit: (id: string, payload: UpdateSitePayload) => Promise<void>;
  loading?: boolean;
}

export function EditSiteModal({
  open,
  onOpenChange,
  site,
  onSubmit,
  loading = false,
}: EditSiteModalProps) {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<SiteStatus>("ACTIVE");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (site) {
      setName(site.name);
      setCode(site.code);
      setStatus(site.status);
      setAddress(site.address || "");
      setDescription(site.description || "");
      setContactPerson(site.contactPerson || "");
      setContactPhone(site.contactPhone || "");
      setError(null);
    }
  }, [site]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;
    setError(null);

    if (!name.trim()) {
      setError("Vui lòng nhập tên công trường.");
      return;
    }

    try {
      await onSubmit(site.id, {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        status,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi cập nhật công trường";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("sites.modals.editTitle")}
      description={t("sites.modals.editDesc")}
      icon={<Edit2 className="h-5 w-5 text-primary" />}
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
              {t("sites.form.code")}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("sites.form.codePlaceholder")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs uppercase shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("sites.form.status")}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SiteStatus)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            >
              <option value="ACTIVE">{t("sites.status.active")}</option>
              <option value="INACTIVE">{t("sites.status.inactive")}</option>
              <option value="SUSPENDED">{t("sites.status.suspended")}</option>
            </select>
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Contact Person */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("sites.form.contactPerson")}
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder={t("sites.form.contactPersonPlaceholder")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("sites.form.contactPhone")}
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder={t("sites.form.contactPhonePlaceholder")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
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
              <Building2 className="h-4 w-4" />
            )}
            <span>{t("sites.form.saveButton")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
