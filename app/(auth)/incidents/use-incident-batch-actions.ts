"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBatchReviewIncidents } from "@/hooks/incidents/use-incident-lifecycle";
import {
  dispatchIncidentsWithSignal,
  resolveIncidentsWithReport,
  type DispatchIncidentsResult,
} from "@/lib/incident-actions";
import { runInBatches } from "@/lib/incident-workflow";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import type { IncidentItem } from "@/types";

interface IncidentBatchActionsOptions {
  closedHistoryAction: { label: string; href: string };
  onIncidentsChanged: (incidentIds: readonly string[]) => void;
}

export function useIncidentBatchActions({
  closedHistoryAction,
  onIncidentsChanged,
}: IncidentBatchActionsOptions) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const batchReviewMutation = useBatchReviewIncidents();

  const [batchRejectIds, setBatchRejectIds] = useState<string[] | null>(null);
  const [batchRejectNote, setBatchRejectNote] = useState("");
  const [batchRejectError, setBatchRejectError] = useState<string | null>(null);
  const [batchDispatchItems, setBatchDispatchItems] = useState<IncidentItem[] | null>(null);
  const [dispatchResult, setDispatchResult] = useState<DispatchIncidentsResult | null>(null);
  const [batchResolveItems, setBatchResolveItems] = useState<IncidentItem[] | null>(null);
  const [batchCloseItems, setBatchCloseItems] = useState<IncidentItem[] | null>(null);
  const [batchCloseNote, setBatchCloseNote] = useState("");
  const [batchActionPending, setBatchActionPending] = useState(false);

  const handleBatchReview = async (ids: string[], action: "CONFIRM" | "REJECT") => {
    if (action === "REJECT") {
      setBatchRejectIds(ids);
      setBatchRejectNote("");
      setBatchRejectError(null);
      return;
    }
    try {
      await batchReviewMutation.mutateAsync({ ids, action });
    } catch {
      // Handled by hook
    }
  };

  const handleConfirmBatchReject = async (e: FormEvent) => {
    e.preventDefault();
    if (!batchRejectIds || batchRejectIds.length === 0) return;
    const trimmed = batchRejectNote.trim();
    if (trimmed.length < 3) {
      setBatchRejectError(
        isVietnamese
          ? "Vui lòng nhập lý do bác bỏ (tối thiểu 3 ký tự)."
          : "Please provide a dismissal reason (at least 3 characters).",
      );
      return;
    }
    try {
      await batchReviewMutation.mutateAsync({
        ids: batchRejectIds,
        action: "REJECT",
        resolutionNote: trimmed,
      });
      setBatchRejectIds(null);
      setBatchRejectNote("");
      setBatchRejectError(null);
    } catch {
      // Handled by hook
    }
  };

  const handleConfirmBatchDispatch = async (payload: {
    assignedTo: string;
    note?: string;
  }) => {
    if (!batchDispatchItems || batchDispatchItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const res = await dispatchIncidentsWithSignal({
        incidents: batchDispatchItems,
        groupDispatch: true,
        managerId: user?.id,
        assignedTo: payload.assignedTo,
        note: payload.note,
        managerName: user?.fullName || user?.email || undefined,
      });
      setDispatchResult(res);
      onIncidentsChanged(batchDispatchItems.map((i) => i.id));
      if (res.assignedCount > 0) {
        toast.success(
          isVietnamese
            ? `Đã duyệt & giao ${res.assignedCount} sự cố cho cán bộ${res.signalSent ? " (đã gửi 1 tín hiệu điều phối)" : ""}.`
            : `Confirmed & dispatched ${res.assignedCount} incidents.`,
        );
      }
      if (res.failedCount > 0) {
        toast.error(
          isVietnamese
            ? `${res.failedCount} sự cố chưa thể phân công.`
            : `${res.failedCount} incidents failed to assign.`,
        );
      }
      setBatchDispatchItems(null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleConfirmBatchResolve = async (payload: {
    resolutionNote: string;
    afterFixFile?: File | null;
    closeImmediately?: boolean;
  }) => {
    if (!batchResolveItems || batchResolveItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const res = await resolveIncidentsWithReport({
        incidents: batchResolveItems,
        resolutionNote: payload.resolutionNote,
        afterFixFile: payload.afterFixFile,
        closeImmediately: payload.closeImmediately,
        officerName: user?.fullName || user?.email || undefined,
      });
      onIncidentsChanged(batchResolveItems.map((i) => i.id));
      if (res.resolvedCount > 0) {
        toast.success(
          res.closedCount > 0
            ? isVietnamese
              ? `Đã khắc phục & đóng ${res.closedCount} sự cố.`
              : `Resolved & closed ${res.closedCount} incidents.`
            : isVietnamese
              ? `Đã báo cáo khắc phục ${res.resolvedCount} sự cố${res.reportSignalSent ? " và gửi tín hiệu tới Quản lý" : ""}.`
              : `Reported remediation for ${res.resolvedCount} incidents.`,
          res.closedCount > 0 ? { action: closedHistoryAction } : undefined,
        );
      }
      if (res.failedCount > 0) {
        toast.error(
          isVietnamese
            ? `${res.failedCount} sự cố chưa thể cập nhật (kiểm tra quyền phân công).`
            : `${res.failedCount} incidents failed to resolve.`,
        );
      }
      setBatchResolveItems(null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleConfirmBatchClose = async (e: FormEvent) => {
    e.preventDefault();
    if (!batchCloseItems || batchCloseItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const closeNote =
        batchCloseNote.trim() ||
        (isVietnamese
          ? "Nghiệm thu và đóng hồ sơ sự cố an toàn (hàng loạt)"
          : "Batch accepted and closed safety incident records");
      const { succeeded, failed } = await runInBatches(batchCloseItems, 4, (inc) =>
        incidentService.closeIncident(inc.id, { closeNote }),
      );
      const closedIds = batchCloseItems.map((i) => i.id);
      setBatchCloseItems(null);
      setBatchCloseNote("");
      onIncidentsChanged(closedIds);
      if (succeeded.length > 0) {
        toast.success(
          isVietnamese
            ? `Đã nghiệm thu và đóng ${succeeded.length} hồ sơ sự cố.`
            : `Accepted and closed ${succeeded.length} incidents.`,
          { action: closedHistoryAction },
        );
      }
      if (failed.length > 0) {
        toast.error(
          isVietnamese
            ? `${failed.length} sự cố chưa thể đóng.`
            : `${failed.length} incidents failed to close.`,
        );
      }
    } finally {
      setBatchActionPending(false);
    }
  };

  return {
    dispatchResult,
    setDispatchResult,
    onBatchReview: handleBatchReview,
    onBatchDispatch: setBatchDispatchItems,
    onBatchResolve: setBatchResolveItems,
    onBatchClose: (items: IncidentItem[]) => {
      if (!items.length) return;
      setBatchCloseItems(items);
      setBatchCloseNote("");
    },
    modalProps: {
      batchDispatchItems,
      onClearBatchDispatch: () => setBatchDispatchItems(null),
      onSubmitBatchDispatch: handleConfirmBatchDispatch,
      batchResolveItems,
      onClearBatchResolve: () => setBatchResolveItems(null),
      onSubmitBatchResolve: handleConfirmBatchResolve,
      batchRejectIds,
      batchRejectNote,
      batchRejectError,
      batchReviewPending: batchReviewMutation.isPending,
      onBatchRejectNoteChange: setBatchRejectNote,
      onClearBatchReject: () => {
        setBatchRejectIds(null);
        setBatchRejectNote("");
        setBatchRejectError(null);
      },
      onConfirmBatchReject: handleConfirmBatchReject,
      batchCloseItems,
      batchCloseNote,
      batchActionPending,
      onBatchCloseNoteChange: setBatchCloseNote,
      onClearBatchClose: () => {
        setBatchCloseItems(null);
        setBatchCloseNote("");
      },
      onConfirmBatchClose: handleConfirmBatchClose,
    },
  };
}
