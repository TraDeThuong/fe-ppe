"use client";

import { useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CreateAssignmentPayload, IncidentItem } from "@/types";

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
  const { t } = useLocale();

  const [assignedToUserId, setAssignedToUserId] = useState("00000000-0000-0000-0000-000000000002");
  const [priority, setPriority] = useState<"URGENT" | "HIGH" | "NORMAL">("HIGH");
  const [deadlineMinutes, setDeadlineMinutes] = useState(30);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Officer Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cán bộ An toàn tiếp nhận <span className="text-danger">*</span>
          </label>
          <select
            value={assignedToUserId}
            onChange={(e) => setAssignedToUserId(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading}
          >
            <option value="00000000-0000-0000-0000-000000000002">
              Nguyễn Văn An (Trưởng ca Giám sát An toàn)
            </option>
            <option value="00000000-0000-0000-0000-000000000003">
              Trần Đình Bình (Kỹ thuật viên Hiện trường)
            </option>
            <option value="00000000-0000-0000-0000-000000000004">
              Lê Thị Cẩm (Cán bộ Kiểm tra Môi trường & PPE)
            </option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Mức độ ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "URGENT" | "HIGH" | "NORMAL")}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
              disabled={loading}
            >
              <option value="URGENT">Khẩn cấp (Xử lý ngay)</option>
              <option value="HIGH">Ưu tiên cao</option>
              <option value="NORMAL">Bình thường</option>
            </select>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Thời hạn giải quyết
            </label>
            <select
              value={deadlineMinutes}
              onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
              disabled={loading}
            >
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>1 giờ</option>
              <option value={120}>2 giờ</option>
            </select>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Chỉ đạo & Ghi chú cho cán bộ
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Yêu cầu công nhân trang bị đủ mũ bảo hộ trước khi tiếp tục làm việc..."
            rows={2}
            className="w-full resize-none rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3">
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
              <UserCheck className="h-4 w-4" />
            )}
            <span>Xác nhận phân công</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
