"use client";

import { useState } from "react";
import { Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateZone, useDeleteZone, useSiteZones } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { ZoneItem } from "@/types";

export interface ZoneListPanelProps {
  siteId: string;
}

export function ZoneListPanel({ siteId }: ZoneListPanelProps) {
  const { t } = useLocale();
  const { data: zones = [], isLoading } = useSiteZones(siteId, Boolean(siteId));
  const createZone = useCreateZone();
  const deleteZone = useDeleteZone();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formattedCode =
      code.trim().toUpperCase() || name.trim().toUpperCase().replace(/\s+/g, "_");

    await createZone.mutateAsync({
      siteId,
      payload: {
        name: name.trim(),
        code: formattedCode,
      },
    });

    setName("");
    setCode("");
    setIsAdding(false);
  };

  const handleDelete = async (zone: ZoneItem) => {
    await deleteZone.mutateAsync({
      siteId,
      zoneId: zone.id,
      name: zone.name,
    });
  };

  return (
    <div className="space-y-4">
      {/* Add Zone Trigger / Form */}
      {!isAdding ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-xs w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          <span>{t("sites.zones.addZone")}</span>
        </Button>
      ) : (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("sites.zones.namePlaceholder")}
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
              required
            />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("sites.zones.codePlaceholder")}
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 font-mono text-xs uppercase shadow-nm-inset focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(false)}
              disabled={createZone.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createZone.isPending}
              className="flex items-center gap-1.5"
            >
              {createZone.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{t("sites.zones.create")}</span>
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
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">{zone.name}</p>
                  <span className="font-mono text-[10px] text-primary">{zone.code}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {zone.status}
                </span>

                <button
                  type="button"
                  onClick={() => handleDelete(zone)}
                  disabled={deleteZone.isPending}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
