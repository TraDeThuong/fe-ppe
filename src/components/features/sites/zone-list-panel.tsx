"use client";

import { useMemo, useState } from "react";
import { Edit2, Layers, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCreateZone,
  useDeleteZone,
  useSiteZones,
  useUpdateZone,
} from "@/hooks/sites";
import { useCan } from "@/hooks/use-can";
import { isCodeTaken, sanitizeManualCode } from "@/lib/code-generator";
import { useLocale } from "@/providers/locale-provider";
import { generateUniqueZoneCode } from "./site-helpers";
import type { ZoneItem, ZoneStatus } from "@/types";

export interface ZoneListPanelProps {
  siteId: string;
}

export function ZoneListPanel({ siteId }: ZoneListPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const canManage = useCan()("PPE_ZONE_MANAGE");

  const { data: zones = [], isLoading } = useSiteZones(siteId, Boolean(siteId));
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [status, setStatus] = useState<ZoneStatus>("ACTIVE");
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const existingZoneCodes = useMemo(
    () =>
      zones
        .filter((z) => z.id !== editingZoneId)
        .map((z) => z.code),
    [zones, editingZoneId],
  );

  const resetForm = () => {
    setName("");
    setCode("");
    setIsCodeManual(false);
    setStatus("ACTIVE");
    setEditingZoneId(null);
    setIsAdding(false);
  };

  const handleRandomizeCode = () => {
    const nextCode = generateUniqueZoneCode(
      name,
      [...existingZoneCodes, code],
      true,
    );
    setCode(nextCode);
    setIsCodeManual(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const sanitizedManual = sanitizeManualCode(code, "standard");
    const formattedCode =
      sanitizedManual.length >= 2 &&
      !isCodeTaken(sanitizedManual, existingZoneCodes)
        ? sanitizedManual
        : generateUniqueZoneCode(name, existingZoneCodes, false);

    if (editingZoneId) {
      await updateZone.mutateAsync({
        siteId,
        zoneId: editingZoneId,
        payload: {
          name: name.trim(),
          code: formattedCode,
          status,
        },
      });
    } else {
      await createZone.mutateAsync({
        siteId,
        payload: {
          name: name.trim(),
          code: formattedCode,
          status,
        },
      });
    }

    resetForm();
  };

  const handleStartEdit = (zone: ZoneItem) => {
    setEditingZoneId(zone.id);
    setName(zone.name);
    setCode(zone.code);
    setIsCodeManual(true);
    setStatus((zone.status as ZoneStatus) || "ACTIVE");
    setIsAdding(true);
  };

  const handleDelete = async (zone: ZoneItem) => {
    try {
      await deleteZone.mutateAsync({
        siteId,
        zoneId: zone.id,
        name: zone.name,
      });
    } catch {
      // Handled by toast; if zone contains restricted areas, user can force-delete in Spatial Zones tab
    }
  };

  const isSaving = createZone.isPending || updateZone.isPending;

  return (
    <div className="space-y-4">
      {/* Add/Edit Zone Trigger / Form */}
      {canManage && !isAdding && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingZoneId(null);
            setName("");
            setCode(generateUniqueZoneCode("", existingZoneCodes, true));
            setIsCodeManual(false);
            setIsAdding(true);
          }}
          className="flex items-center gap-1.5 text-xs w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          <span>{t("sites.zones.addZone")}</span>
        </Button>
      )}

      {canManage && isAdding && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                if (!editingZoneId && !isCodeManual) {
                  setCode(
                    generateUniqueZoneCode(
                      nextName,
                      existingZoneCodes,
                      !nextName.trim(),
                    ),
                  );
                }
              }}
              placeholder={t("sites.zones.namePlaceholder")}
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
              required
            />
            <div className="relative flex items-center">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setCode(val);
                  setIsCodeManual(Boolean(val.trim()));
                }}
                placeholder={t("sites.zones.codePlaceholder")}
                className="w-full rounded-lg border border-border/50 bg-background/80 pl-3 pr-8 py-1.5 font-mono text-xs uppercase shadow-nm-inset focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRandomizeCode}
                title={
                  isVietnamese
                    ? "Random mã phân khu không trùng"
                    : "Randomize unique zone code"
                }
                className="absolute right-1.5 rounded-md p-1 text-primary hover:bg-primary/15 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ZoneStatus)}
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetForm}
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="flex items-center gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>
                {editingZoneId
                  ? isVietnamese
                    ? "Cập nhật"
                    : "Update"
                  : t("sites.zones.create")}
              </span>
            </Button>
          </div>
        </form>
      )}

      {/* Zones List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-elevated/40" />
            ))}
          </div>
        ) : zones.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-surface/30 p-8 text-center text-xs text-muted-foreground">
            {t("sites.zones.empty")}
          </div>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between rounded-xl border border-border/30 bg-surface/60 p-3 shadow-nm-inset transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{zone.name}</p>
                  <span className="font-mono text-[10px] text-primary">{zone.code}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {zone.status}
                </span>

                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(zone)}
                      title={isVietnamese ? "Sửa phân khu" : "Edit zone"}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(zone)}
                      disabled={deleteZone.isPending}
                      title={isVietnamese ? "Xóa phân khu" : "Delete zone"}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-danger transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
