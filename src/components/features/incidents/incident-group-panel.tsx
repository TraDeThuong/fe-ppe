"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ListChecks, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import { canResolveGroupIncident, isGroupIncidentResolved, type IncidentGroupContext, type IncidentGroupRow } from "@/lib/incident-group";
import type { IncidentGroupController, GroupResolutionInput } from "@/hooks/incidents/use-incident-group";
import { BatchResolveModal } from "./batch-resolve-modal";

export function IncidentGroupPanel({ group, currentId, userId, controller, navigate, markDirty, confirmDiscard }: {
  group: IncidentGroupContext; currentId: string; userId: string;
  controller: IncidentGroupController; navigate: (id: string) => void;
  markDirty: (source: string, dirty: boolean) => void;
  confirmDiscard: (source?: string) => boolean;
}) {
  const { locale } = useLocale();
  const vi = locale === "vi-VN";
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const markBatchDirty = useCallback((dirty: boolean) => markDirty("batch", dirty), [markDirty]);
  const rows: IncidentGroupRow[] = controller.snapshot?.rows ?? group.incidentIds.map((id) => ({ id }));
  const selectedIncidents = useMemo(() => rows.flatMap((row) => row.incident && !row.error && selected.includes(row.id) &&
    controller.canAct && canResolveGroupIncident(row.incident, userId) ? [row.incident] : []),
  [rows, selected, controller.canAct, userId]);
  const index = group.incidentIds.indexOf(currentId);
  const progress = controller.progress!;
  const delivery = controller.delivery;
  const retrySummary = delivery && ["failed", "partial", "suppressed"].includes(delivery.state);
  const submitBatch = async (payload: GroupResolutionInput) => {
    const result = await controller.resolveMembers(selectedIncidents.map((incident) => incident.id), payload);
    setSelected(result.failed.map((failure) => failure.id));
    if (result.succeeded.length) toast.success(vi ? `Đã khắc phục ${result.succeeded.length} sự cố.` : `${result.succeeded.length} incidents remediated.`);
    if (result.failed.length) throw new Error(vi ? `${result.failed.length} hồ sơ chưa thành công. Chỉ thử lại các hồ sơ còn đủ điều kiện.` : `${result.failed.length} records failed. Retry only eligible failed records.`);
    markDirty("batch", false);
  };
  return <section aria-label={vi ? "Nhóm sự cố được giao" : "Assigned incident group"} className="space-y-4 rounded-2xl border border-primary/25 bg-surface p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-sm font-bold"><ListChecks className="h-4 w-4 text-primary" />{vi ? "Nhóm được giao" : "Assigned group"} · {group.incidentIds.length} {vi ? "sự cố" : "incidents"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">#{group.groupId.slice(0, 8)} · {new Date(group.createdAt).toLocaleString(locale)}</p></div>
      <Button size="sm" variant="outline" disabled={!controller.readable || controller.busy || controller.query.isFetching} onClick={() => void controller.refresh().catch(() => toast.error(vi ? "Không tải được nhóm." : "Unable to load this group."))} aria-label={vi ? "Làm mới nhóm" : "Refresh group"}><RefreshCw className={`mr-1 h-3.5 w-3.5 ${controller.query.isFetching ? "animate-spin" : ""}`} />{vi ? "Làm mới" : "Refresh"}</Button>
    </div>
    {!controller.snapshot ? <p role="status" className="text-xs text-muted-foreground">{!controller.readable ? (vi ? "Bạn chưa có quyền đọc sự cố để xác minh nhóm." : "Incident read permission is required to verify this group.") : controller.query.isError ? (vi ? "Không tải được nhóm. Vui lòng thử lại." : "Unable to load this group. Please retry.") : (vi ? "Đang đọc trạng thái các hồ sơ trong nhóm…" : "Loading group records…")}</p> : <>
      <p className="text-sm font-semibold" role="status">{vi ? `Đã khắc phục ${progress.resolved}/${progress.total} · Còn ${progress.remaining}` : `Remediated ${progress.resolved}/${progress.total} · Remaining ${progress.remaining}`}{progress.unavailable > 0 && <span className="ml-2 text-xs text-danger">{progress.unavailable} {vi ? "hồ sơ chưa xác minh" : "unverified records"}</span>}</p>
      <div className="h-2 overflow-hidden rounded-full bg-surface-elevated"><div className="h-full bg-primary transition-all" style={{ width: `${progress.resolved / progress.total * 100}%` }} /></div>
    </>}
    {progress.complete && <div role="status" className="space-y-2 rounded-xl border border-primary/25 bg-primary/10 p-3 text-xs">
      <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4 shrink-0" />{vi ? `Đã khắc phục ${progress.total}/${progress.total} sự cố — chờ quản lý nghiệm thu.` : `All ${progress.total}/${progress.total} incidents remediated — awaiting manager acceptance.`}</p>
      {delivery?.state === "sent" && <p>{vi ? "Đã tạo thông báo tổng kết cho người giao." : "Summary notification created for the assigning manager."}</p>}
      {delivery?.state === "recorded" && <p>{vi ? "Đã tìm thấy tổng kết của nhóm trước đó; không gửi lại tự động." : "An existing group summary was found; no automatic duplicate was sent."}</p>}
      {delivery?.state === "failed" && <p>{vi ? "Đã khắc phục hết nhóm, chưa gửi được tổng kết." : "Group remediation is complete, but the summary could not be sent."} {delivery.message}</p>}
      {(delivery?.state === "partial" || delivery?.state === "suppressed") && <p>{vi ? "Chưa tạo được thông báo cho người giao; kiểm tra tùy chọn nhận thông báo. Trạng thái khắc phục đã được lưu." : "No summary was created for the manager; check notification preferences. Remediation is saved."}</p>}
      {controller.canAct && retrySummary && <Button size="sm" variant="outline" disabled={controller.busy} onClick={() => void controller.sendCompletion(true)}>{vi ? "Gửi lại tổng kết" : "Retry summary"}</Button>}
    </div>}
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={index <= 0 || controller.busy} onClick={() => navigate(group.incidentIds[index - 1])}><ArrowLeft className="mr-1 h-3.5 w-3.5" />{vi ? "Trước" : "Previous"}</Button>
      <span className="text-xs font-medium">{vi ? "Đang xem sự cố" : "Viewing incident"} {index + 1}/{group.incidentIds.length}</span>
      <Button size="sm" variant="outline" disabled={index >= group.incidentIds.length - 1 || controller.busy} onClick={() => navigate(group.incidentIds[index + 1])}>{vi ? "Tiếp" : "Next"}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="outline" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{vi ? "Danh sách nhóm" : "Group records"}</Button>
      {controller.canAct && <Button size="sm" variant="primary" disabled={!selectedIncidents.length || controller.busy} onClick={() => setBatchOpen(true)}>{vi ? `Báo cáo chung (${selectedIncidents.length})` : `Group report (${selectedIncidents.length})`}</Button>}
    </div>
    {expanded && <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-xs"><thead><tr className="border-b border-border/40"><th className="p-2">{vi ? "Chọn" : "Select"}</th><th className="p-2">{vi ? "Sự cố / Camera" : "Incident / Camera"}</th><th className="p-2">{vi ? "Trạng thái" : "Status"}</th><th className="p-2">{vi ? "Mở" : "Open"}</th></tr></thead><tbody>
      {rows.map((row, rowIndex) => {
        const incident = row.incident;
        const eligible = !!incident && !row.error && controller.canAct && canResolveGroupIncident(incident, userId);
        const label = !incident || row.error ? (vi ? "Chưa xác minh / không tải được" : "Unverified / unavailable")
          : isGroupIncidentResolved(incident) ? (incident.status === "CLOSED" ? (vi ? "Đã nghiệm thu, đóng" : "Accepted and closed") : (vi ? "Đã khắc phục" : "Remediated"))
          : !(incident.assignments ?? []).some((assignment) => assignment.assignedTo === group.assignedTo && assignment.status === "ACTIVE") ? (vi ? "Đã chuyển / chưa được giao" : "Reassigned / not assigned")
          : incident.status === "PENDING_REVIEW" ? (vi ? "Chờ quản lý duyệt" : "Awaiting review")
          : incident.status === "CONFIRMED" ? (vi ? "Còn xử lý" : "Needs remediation") : (vi ? "Chưa thể kết luận hoàn tất" : "Not confirmed complete");
        return <tr key={row.id} className={`border-b border-border/20 ${row.id === currentId ? "bg-primary/5" : ""}`}>
          <td className="p-2"><input type="checkbox" aria-label={`${vi ? "Chọn sự cố" : "Select incident"} ${rowIndex + 1}`} checked={eligible && selected.includes(row.id)} disabled={!eligible || controller.busy} onChange={(event) => setSelected((values) => event.target.checked ? [...values, row.id] : values.filter((id) => id !== row.id))} /></td>
          <td className="p-2"><p className="font-mono" title={row.id}>#{row.id.slice(0, 8)}…{row.id.slice(-4)}</p><p className="text-muted-foreground">{incident?.cameraCode || incident?.cameraName || incident?.cameraId.slice(0, 8) || "—"}</p></td>
          <td className="p-2"><span>{label}</span>{row.error && <p className="text-danger">{row.error}</p>}</td>
          <td className="p-2"><Button size="sm" variant="ghost" disabled={controller.busy} onClick={() => navigate(row.id)}>{vi ? "Xem" : "View"}</Button></td>
        </tr>;
      })}
    </tbody></table></div>}
    <BatchResolveModal open={batchOpen} onOpenChange={(open) => { if (!open && !confirmDiscard("batch")) return; setBatchOpen(open); }} incidents={selectedIncidents}
      onSubmit={submitBatch} loading={controller.busy} groupMode onDirtyChange={markBatchDirty}
      failures={batchOpen ? controller.lastResult?.failed : []} />
  </section>;
}
