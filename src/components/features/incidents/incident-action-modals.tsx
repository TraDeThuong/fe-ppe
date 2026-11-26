"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";
import type {
  CloseIncidentPayload,
  CreateAssignmentPayload,
  CreateIncidentPayload,
  IncidentItem,
  ReviewIncidentPayload,
  UpdateIncidentPayload,
} from "@/types";
import { AssignIncidentModal } from "./assign-incident-modal";
import { BatchDispatchModal } from "./batch-dispatch-modal";
import { BatchResolveModal } from "./batch-resolve-modal";
import { CloseIncidentDialog } from "./close-incident-dialog";
import { CreateIncidentModal } from "./create-incident-modal";
import { EditIncidentModal } from "./edit-incident-modal";
import { ExportFeedbackDatasetModal } from "./export-feedback-dataset-modal";
import { ResolveIncidentModal } from "./resolve-incident-modal";
import { ReviewIncidentModal } from "./review-incident-modal";

export interface IncidentActionModalsProps {
  selectedIncident: IncidentItem | null;
  defaultSiteId?: string;
  canCloseIncident: boolean;
  // Single modals
  isCreateOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  createPending: boolean;
  onSubmitCreate: (payload: CreateIncidentPayload) => Promise<void>;

  isEditOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  updatePending: boolean;
  onSubmitEdit: (id: string, payload: UpdateIncidentPayload) => Promise<void>;

  isReviewOpen: boolean;
  onReviewOpenChange: (open: boolean) => void;
  reviewPending: boolean;
  onSubmitReview: (id: string, payload: ReviewIncidentPayload) => Promise<void>;

  isAssignOpen: boolean;
  onAssignOpenChange: (open: boolean) => void;
  singleActionPending: boolean;
  onSubmitAssign: (incidentId: string, payload: CreateAssignmentPayload) => Promise<void>;

  isResolveOpen: boolean;
  onResolveOpenChange: (open: boolean) => void;
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
  closePending: boolean;
  onSubmitClose: (id: string, payload?: CloseIncidentPayload) => Promise<void>;

  isDeleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  deletePending: boolean;
  onConfirmDelete: () => Promise<void>;

  // Batch modals
  batchDispatchItems: IncidentItem[] | null;
  onClearBatchDispatch: () => void;
  onSubmitBatchDispatch: (payload: { assignedTo: string; note?: string }) => Promise<void>;

  batchResolveItems: IncidentItem[] | null;
  onClearBatchResolve: () => void;
  onSubmitBatchResolve: (payload: {
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
  onConfirmBatchReject: (e: React.FormEvent) => Promise<void>;

  batchCloseItems: IncidentItem[] | null;
  batchCloseNote: string;
  batchActionPending: boolean;
  onBatchCloseNoteChange: (val: string) => void;
  onClearBatchClose: () => void;
  onConfirmBatchClose: (e: React.FormEvent) => Promise<void>;

  // AI Feedback Dataset Export modal
  isExportFeedbackOpen: boolean;
  onExportFeedbackOpenChange: (open: boolean) => void;
  exportFilterScope: {
    siteId?: string;
    cameraId?: string;
    cameraIds?: string[];
    violationType?: string;
    fromDate?: string;
    toDate?: string;
  };
}

export function IncidentActionModals({
  selectedIncident,
  defaultSiteId,
  canCloseIncident,
  isCreateOpen,
  onCreateOpenChange,
  createPending,
  onSubmitCreate,
  isEditOpen,
  onEditOpenChange,
  updatePending,
  onSubmitEdit,
  isReviewOpen,
  onReviewOpenChange,
  reviewPending,
  onSubmitReview,
  isAssignOpen,
  onAssignOpenChange,
  singleActionPending,
  onSubmitAssign,
  isResolveOpen,
  onResolveOpenChange,
  onSubmitResolve,
  isCloseOpen,
  onCloseOpenChange,
  closePending,
  onSubmitClose,
  isDeleteOpen,
  onDeleteOpenChange,
  deletePending,
  onConfirmDelete,
  batchDispatchItems,
  onClearBatchDispatch,
  onSubmitBatchDispatch,
  batchResolveItems,
  onClearBatchResolve,
  onSubmitBatchResolve,
  batchRejectIds,
  batchRejectNote,
  batchRejectError,
  batchReviewPending,
  onBatchRejectNoteChange,
  onClearBatchReject,
  onConfirmBatchReject,
  batchCloseItems,
  batchCloseNote,
  batchActionPending,
  onBatchCloseNoteChange,
  onClearBatchClose,
  onConfirmBatchClose,
  isExportFeedbackOpen,
  onExportFeedbackOpenChange,
  exportFilterScope,
}: IncidentActionModalsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <>
      <ReviewIncidentModal
        open={isReviewOpen}
        onOpenChange={onReviewOpenChange}
        incident={selectedIncident}
        loading={reviewPending}
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
        canClose={canCloseIncident}
        onSubmit={onSubmitResolve}
      />

      <BatchDispatchModal
        open={Boolean(batchDispatchItems?.length)}
        onOpenChange={(open) => {
          if (!open) onClearBatchDispatch();
        }}
        incidents={batchDispatchItems || []}
        loading={batchActionPending}
        onSubmit={onSubmitBatchDispatch}
      />

      <BatchResolveModal
        open={Boolean(batchResolveItems?.length)}
        onOpenChange={(open) => {
          if (!open) onClearBatchResolve();
        }}
        incidents={batchResolveItems || []}
        loading={batchActionPending}
        canClose={canCloseIncident}
        onSubmit={onSubmitBatchResolve}
      />

      <CloseIncidentDialog
        open={isCloseOpen}
        onOpenChange={onCloseOpenChange}
        incident={selectedIncident}
        loading={closePending}
        onConfirm={onSubmitClose}
      />

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
        <form onSubmit={onConfirmBatchReject} className="space-y-4 pt-2">
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
            <Button type="submit" variant="danger" disabled={batchReviewPending}>
              {isVietnamese ? "Xác nhận bác bỏ" : "Confirm Dismiss"}
            </Button>
          </div>
        </form>
      </Dialog>

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
        <form onSubmit={onConfirmBatchClose} className="space-y-4 pt-2">
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

      <Dialog
        open={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
        title={t("incidents.actions.delete")}
        description={
          isVietnamese
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn sự cố vi phạm #${selectedIncident?.id.slice(0, 8)}? Hành động này không thể hoàn tác.`
            : `Are you sure you want to permanently delete incident #${selectedIncident?.id.slice(0, 8)}? This action cannot be undone.`
        }
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDeleteOpenChange(false)}
            disabled={deletePending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void onConfirmDelete()}
            disabled={deletePending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </Dialog>

      <CreateIncidentModal
        open={isCreateOpen}
        onOpenChange={onCreateOpenChange}
        defaultSiteId={defaultSiteId}
        loading={createPending}
        onSubmit={onSubmitCreate}
      />

      <EditIncidentModal
        open={isEditOpen}
        onOpenChange={onEditOpenChange}
        incident={selectedIncident}
        loading={updatePending}
        onSubmit={onSubmitEdit}
      />

      <ExportFeedbackDatasetModal
        open={isExportFeedbackOpen}
        onOpenChange={onExportFeedbackOpenChange}
        siteId={exportFilterScope.siteId}
        cameraId={exportFilterScope.cameraId}
        cameraIds={exportFilterScope.cameraIds}
        violationType={exportFilterScope.violationType}
        fromDate={exportFilterScope.fromDate}
        toDate={exportFilterScope.toDate}
      />
    </>
  );
}
