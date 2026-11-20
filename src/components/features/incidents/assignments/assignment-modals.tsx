"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  AssignIncidentModal,
  BatchDispatchModal,
  BatchResolveModal,
  CloseIncidentDialog,
  ResolveIncidentModal,
  ReviewIncidentModal,
} from "@/components/features/incidents";
import { useLocale } from "@/providers/locale-provider";
import type {
  CloseIncidentPayload,
  CreateAssignmentPayload,
  IncidentItem,
  ReviewIncidentPayload,
} from "@/types";

export interface AssignmentModalsProps {
  selectedIncident: IncidentItem | null;
  isReviewOpen: boolean;
  onReviewOpenChange: (open: boolean) => void;
  reviewLoading: boolean;
  onSubmitReview: (id: string, payload: ReviewIncidentPayload) => Promise<void>;

  isAssignOpen: boolean;
  onAssignOpenChange: (open: boolean) => void;
  singleActionPending: boolean;
  onSubmitAssign: (
    id: string,
    payload: CreateAssignmentPayload,
  ) => Promise<void>;

  isResolveOpen: boolean;
  onResolveOpenChange: (open: boolean) => void;
  canClose: boolean;
  onSubmitResolve: (
    id: string,
    payload: {
      resolutionNote: string;
      afterFixFile?: File | null;
      closeImmediately?: boolean;
    },
  ) => Promise<void>;

  isCloseOpen: boolean;
  onCloseOpenChange: (open: boolean) => void;
  closeLoading: boolean;
  onConfirmClose: (
    id: string,
    payload?: CloseIncidentPayload,
  ) => Promise<void>;

  batchDispatchItems: IncidentItem[] | null;
  onClearBatchDispatch: () => void;
  batchActionPending: boolean;
  onConfirmBatchDispatch: (payload: {
    assignedTo: string;
    note?: string;
  }) => Promise<void>;

  batchResolveItems: IncidentItem[] | null;
  onClearBatchResolve: () => void;
  onConfirmBatchResolve: (payload: {
    resolutionNote: string;
    afterFixFile?: File | null;
    closeImmediately?: boolean;
  }) => Promise<void>;

  batchRejectIds: string[] | null;
  batchRejectNote: string;
  batchRejectError: string | null;
  batchReviewPending: boolean;
  onBatchRejectNoteChange: (val: string) => void;
  onClearBatchReject: () => void;
  onSubmitBatchReject: (e: React.FormEvent) => void;

  batchCloseItems: IncidentItem[] | null;
  batchCloseNote: string;
  onBatchCloseNoteChange: (val: string) => void;
  onClearBatchClose: () => void;
  onSubmitBatchClose: (e: React.FormEvent) => void;
}

export function AssignmentModals({
  selectedIncident,
  isReviewOpen,
  onReviewOpenChange,
  reviewLoading,
  onSubmitReview,
  isAssignOpen,
  onAssignOpenChange,
  singleActionPending,
  onSubmitAssign,
  isResolveOpen,
  onResolveOpenChange,
  canClose,
  onSubmitResolve,
  isCloseOpen,
  onCloseOpenChange,
  closeLoading,
  onConfirmClose,
  batchDispatchItems,
  onClearBatchDispatch,
  batchActionPending,
  onConfirmBatchDispatch,
  batchResolveItems,
  onClearBatchResolve,
  onConfirmBatchResolve,
  batchRejectIds,
  batchRejectNote,
  batchRejectError,
  batchReviewPending,
  onBatchRejectNoteChange,
  onClearBatchReject,
  onSubmitBatchReject,
  batchCloseItems,
  batchCloseNote,
  onBatchCloseNoteChange,
  onClearBatchClose,
  onSubmitBatchClose,
}: AssignmentModalsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <>
      <ReviewIncidentModal
        open={isReviewOpen}
        onOpenChange={onReviewOpenChange}
        incident={selectedIncident}
        loading={reviewLoading}
        onSubmit={onSubmitReview}
      />

      <AssignIncidentModal
        open={isAssignOpen}
        onOpenChange={onAssignOpenChange}
        incident={selectedIncident}
        loading={singleActionPending}
        onSubmit={onSubmitAssign}
      />

      <ResolveIncidentModal
        open={isResolveOpen}
        onOpenChange={onResolveOpenChange}
        incident={selectedIncident}
        loading={singleActionPending}
        canClose={canClose}
        onSubmit={onSubmitResolve}
      />

      <CloseIncidentDialog
        open={isCloseOpen}
        onOpenChange={onCloseOpenChange}
        incident={selectedIncident}
        loading={closeLoading}
        onConfirm={onConfirmClose}
      />

      <BatchDispatchModal
        open={Boolean(batchDispatchItems?.length)}
        onOpenChange={(open) => {
          if (!open) onClearBatchDispatch();
        }}
        incidents={batchDispatchItems || []}
        loading={batchActionPending}
        onSubmit={onConfirmBatchDispatch}
      />

      <BatchResolveModal
        open={Boolean(batchResolveItems?.length)}
        onOpenChange={(open) => {
          if (!open) onClearBatchResolve();
        }}
        incidents={batchResolveItems || []}
        loading={batchActionPending}
        canClose={canClose}
        onSubmit={onConfirmBatchResolve}
      />

      {/* Hộp thoại Bác bỏ hàng loạt */}
      <Dialog
        open={Boolean(batchRejectIds?.length)}
        onOpenChange={(open) => {
          if (!open) onClearBatchReject();
        }}
        title={
          isVietnamese
            ? `Bác bỏ hàng loạt (${batchRejectIds?.length ?? 0} sự cố)`
            : `Batch Dismiss (${batchRejectIds?.length ?? 0} incidents)`
        }
        description={
          isVietnamese
            ? "Bắt buộc nhập lý do bác bỏ (tối thiểu 3 ký tự) theo quy chuẩn kiểm toán an toàn."
            : "A dismissal reason (minimum 3 characters) is required for safety audit compliance."
        }
      >
        <form onSubmit={onSubmitBatchReject} className="space-y-4 pt-2">
          {batchRejectError && (
            <p className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
              {batchRejectError}
            </p>
          )}
          <textarea
            rows={3}
            value={batchRejectNote}
            onChange={(e) => onBatchRejectNoteChange(e.target.value)}
            placeholder={
              isVietnamese
                ? "Ví dụ: Ánh sáng phản chiếu / nhận diện nhầm vật thể..."
                : "Example: Light reflection / false object detection..."
            }
            className="w-full rounded-xl border border-border/50 bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClearBatchReject}
              disabled={batchReviewPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={batchReviewPending}
            >
              {isVietnamese ? "Xác nhận bác bỏ" : "Confirm Dismiss"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Hộp thoại Xác nhận Nghiệm thu & Đóng hàng loạt */}
      <Dialog
        open={Boolean(batchCloseItems?.length)}
        onOpenChange={(open) => {
          if (!open) onClearBatchClose();
        }}
        title={
          isVietnamese
            ? `Nghiệm thu & Đóng hàng loạt (${batchCloseItems?.length ?? 0} hồ sơ)`
            : `Batch Accept & Close (${batchCloseItems?.length ?? 0} records)`
        }
        description={
          isVietnamese
            ? "Sau khi đóng, hồ sơ sự cố sẽ được khóa vĩnh viễn để lưu trữ kiểm toán an toàn."
            : "Once closed, incident records are permanently locked for safety audit archiving."
        }
      >
        <form onSubmit={onSubmitBatchClose} className="space-y-4 pt-2">
          <textarea
            rows={3}
            value={batchCloseNote}
            onChange={(e) => onBatchCloseNoteChange(e.target.value)}
            placeholder={
              isVietnamese
                ? "Ghi chú nghiệm thu (tùy chọn): Đã kiểm tra ảnh hiện trường sau khắc phục đạt yêu cầu..."
                : "Acceptance note (optional): Verified field remediation evidence..."
            }
            className="w-full rounded-xl border border-border/50 bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClearBatchClose}
              disabled={batchActionPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={batchActionPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isVietnamese
                ? `Xác nhận Đóng (${batchCloseItems?.length ?? 0})`
                : `Confirm Close (${batchCloseItems?.length ?? 0})`}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
