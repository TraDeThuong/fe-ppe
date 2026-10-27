"use client";

import { useState } from "react";
import { AlertOctagon, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateRestrictedArea, useDeleteRestrictedArea, useRestrictedAreas } from "@/hooks/sites";
import type { RestrictedAreaItem } from "@/types";

export interface RestrictedAreaPanelProps {
  siteId: string;
}

export function RestrictedAreaPanel({ siteId }: RestrictedAreaPanelProps) {
  const { data: areas = [], isLoading } = useRestrictedAreas(siteId, Boolean(siteId));
  const createArea = useCreateRestrictedArea();
  const deleteArea = useDeleteRestrictedArea();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM">("CRITICAL");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createArea.mutateAsync({
      siteId,
      payload: {
        name: name.trim(),
        description: description.trim() || undefined,
        severity,
        boundary: [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.2 },
          { x: 0.8, y: 0.8 },
          { x: 0.2, y: 0.8 },
        ],
      },
    });

    setName("");
    setDescription("");
    setIsAdding(false);
  };

  const handleDelete = async (area: RestrictedAreaItem) => {
    await deleteArea.mutateAsync({
      siteId,
      areaId: area.id,
      name: area.name,
    });
  };

  return (
    <div className="space-y-4">
      {/* Add Trigger / Form */}
      {!isAdding ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-xs w-full justify-center text-danger hover:text-danger"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm Vùng cấm Nguy hiểm</span>
        </Button>
      ) : (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-3.5"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên vùng cấm (VD: Miệng hố thang máy tầng 10)"
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs shadow-nm-inset focus:border-danger focus:outline-none"
              required
            />

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as "CRITICAL" | "HIGH" | "MEDIUM")}
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs shadow-nm-inset focus:border-danger focus:outline-none"
            >
              <option value="CRITICAL">Mức độ: CRITICAL (Khẩn cấp)</option>
              <option value="HIGH">Mức độ: HIGH (Rủi ro cao)</option>
              <option value="MEDIUM">Mức độ: MEDIUM (Cảnh báo)</option>
            </select>
          </div>

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả mối nguy hiểm (VD: Nguy cơ rơi ngã từ độ cao 30m)..."
            className="w-full rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs shadow-nm-inset focus:border-danger focus:outline-none"
          />

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(false)}
              disabled={createArea.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={createArea.isPending}
              className="flex items-center gap-1.5"
            >
              {createArea.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Tạo vùng cấm</span>
            </Button>
          </div>
        </form>
      )}

      {/* Areas List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-elevated/40" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-surface/30 p-8 text-center text-xs text-muted-foreground">
            Chưa có vùng cấm nguy hiểm nào được thiết lập cho công trường này.
          </div>
        ) : (
          areas.map((area) => (
            <div
              key={area.id}
              className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger/5 p-3 shadow-nm-inset transition"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
                  <AlertOctagon className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground">{area.name}</p>
                    <span className="rounded bg-danger/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-danger uppercase">
                      {area.severity || "CRITICAL"}
                    </span>
                  </div>
                  {area.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {area.description}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(area)}
                disabled={deleteArea.isPending}
                className="rounded-lg p-1.5 text-danger/70 hover:bg-danger/10 hover:text-danger transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
