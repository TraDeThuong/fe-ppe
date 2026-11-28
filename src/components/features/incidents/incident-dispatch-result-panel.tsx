"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { incidentGroupHref } from "@/lib/incident-group";
import { sendDispatchSignal, type DispatchIncidentsResult } from "@/lib/incident-actions";
import { toast } from "@/lib/toast";

export function IncidentDispatchResultPanel({ result, onChange, onRetryFailed }: {
  result: DispatchIncidentsResult;
  onChange: (result: DispatchIncidentsResult) => void;
  onRetryFailed: (ids: string[]) => Promise<void>;
}) {
  const { locale } = useLocale();
  const vi = locale === "vi-VN";
  const [busy, setBusy] = useState(false);
  const retrySignal = async () => {
    if (!result.notificationPayload || busy) return;
    setBusy(true);
    try {
      const signalSent = await sendDispatchSignal(result.notificationPayload);
      onChange({ ...result, signalSent });
      if (!signalSent) toast.error(vi ? "Chưa tạo được thông báo cho cán bộ; kiểm tra tùy chọn nhận thông báo." : "No notification was created for the officer; check notification preferences.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không gửi được thông báo."); }
    finally { setBusy(false); }
  };
  return <section aria-label={vi ? "Kết quả giao nhóm sự cố" : "Group dispatch result"} className="space-y-3 rounded-2xl border border-primary/25 bg-surface p-4 text-xs">
    <h3 className="text-sm font-bold">{vi ? "Kết quả giao xử lý" : "Dispatch result"}: {result.assignedCount} {vi ? "thành công" : "assigned"} · {result.failedCount} {vi ? "chưa thành công" : "failed"}</h3>
    {result.group && <Link className="inline-block font-semibold text-primary underline" href={incidentGroupHref(result.group)}>{vi ? "Xem nhóm đã giao" : "View assigned group"}</Link>}
    {!result.signalSent && result.assignedCount > 0 && <div className="flex flex-wrap items-center gap-2 text-danger"><p>{vi ? "Đã phân công nhưng chưa tạo được thông báo. Có thể gửi lại mà không phân công lại." : "Assignment saved, but notification was not created. Retry without reassigning."}</p><Button size="sm" variant="outline" disabled={busy} onClick={() => void retrySignal()}>{vi ? "Gửi lại thông báo giao việc" : "Retry dispatch notification"}</Button></div>}
    {result.signalSent && <p>{result.notifiedByServer
      ? (vi ? "Hệ thống đang gửi thông báo giao việc cho cán bộ." : "The system is sending the dispatch notification to the officer.")
      : (vi ? "Đã tạo thông báo giao việc cho cán bộ." : "Dispatch notification created for the officer.")}</p>}
    {result.failedItems.length > 0 && <>
      <ul className="space-y-1 text-danger">{result.failedItems.map((failure) => <li key={failure.id}>#{failure.id.slice(0, 8)}…{failure.id.slice(-4)} · {failure.stage === "review" ? (vi ? "Duyệt" : "Review") : (vi ? "Phân công" : "Assignment")}: {failure.message}</li>)}</ul>
      <Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await onRetryFailed(result.failedItems.map((item) => item.id)); } catch (error) { toast.error(error instanceof Error ? error.message : "Không đọc được hồ sơ cần thử lại."); } finally { setBusy(false); } }}>{vi ? "Thử lại các hồ sơ lỗi" : "Retry failed records"}</Button>
    </>}
  </section>;
}
