"use client";

import { useState } from "react";
import { AlertOctagon, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";
import {
  IncidentKpiSummary,
  IncidentFilterToolbar,
  IncidentTable,
  ReviewIncidentModal,
  AssignIncidentModal,
  ResolveIncidentModal,
  CloseIncidentDialog,
} from "@/components/features/incidents";
import {
  useIncidents,
  useReviewIncident,
  useAssignOfficer,
  useResolveIncident,
  useCloseIncident,
  useDeleteIncident,
} from "@/hooks";
import type { IncidentItem, IncidentQueryParams } from "@/types";

export default function IncidentsContent() {
  const { t } = useLocale();

  // Filter States
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [violationFilter, setViolationFilter] = useState("");

  // Query Params
  const queryParams: IncidentQueryParams = {
    page,
    limit,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    violationType: violationFilter || undefined,
    sortBy: "detectedAt",
    sortOrder: "desc",
  };

  const { data: incidentData, isLoading, refetch, isRefetching } = useIncidents(queryParams);
  const incidents = incidentData?.items || [];
  const meta = incidentData?.meta;

  // Mutations
  const reviewMutation = useReviewIncident();
  const assignMutation = useAssignOfficer();
  const resolveMutation = useResolveIncident();
  const closeMutation = useCloseIncident();
  const deleteMutation = useDeleteIncident();

  // Modals state
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Actions
  const handleOpenReview = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsReviewOpen(true);
  };

  const handleOpenAssign = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsAssignOpen(true);
  };

  const handleOpenResolve = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsResolveOpen(true);
  };

  const handleOpenClose = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsCloseOpen(true);
  };

  const handleOpenDelete = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedIncident) return;
    try {
      await deleteMutation.mutateAsync(selectedIncident.id);
      setIsDeleteOpen(false);
      setSelectedIncident(null);
    } catch {
      // Handled by onError in hook
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={ShieldAlert}
        title={t("incidents.title")}
        description={t("incidents.description")}
        badge="Safety Monitoring"
        badgeIcon={ShieldAlert}
        actions={
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span>{t("common.refresh")}</span>
          </Button>
        }
      />

      {/* KPI Overview */}
      <IncidentKpiSummary incidents={incidents} loading={isLoading} />

      {/* Filter Toolbar */}
      <IncidentFilterToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        severityFilter={severityFilter}
        onSeverityFilterChange={(val) => {
          setSeverityFilter(val);
          setPage(1);
        }}
        violationFilter={violationFilter}
        onViolationFilterChange={(val) => {
          setViolationFilter(val);
          setPage(1);
        }}
      />

      {/* Main Table */}
      <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm">
        <IncidentTable
          incidents={incidents}
          loading={isLoading}
          onReview={handleOpenReview}
          onAssign={handleOpenAssign}
          onResolve={handleOpenResolve}
        />

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              {t("common.showing")} {(meta.page - 1) * meta.limit + 1} -{" "}
              {Math.min(meta.page * meta.limit, meta.total)} / {meta.total} {t("incidents.title")}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>

              <span className="text-xs font-medium text-foreground px-2">
                {page} / {meta.totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                disabled={page >= meta.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <ReviewIncidentModal
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        incident={selectedIncident}
        loading={reviewMutation.isPending}
        onSubmit={async (id, payload) => {
          await reviewMutation.mutateAsync({ id, payload });
        }}
      />

      <AssignIncidentModal
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        incident={selectedIncident}
        loading={assignMutation.isPending}
        onSubmit={async (incidentId, payload) => {
          await assignMutation.mutateAsync({ incidentId, payload });
        }}
      />

      <ResolveIncidentModal
        open={isResolveOpen}
        onOpenChange={setIsResolveOpen}
        incident={selectedIncident}
        loading={resolveMutation.isPending}
        onSubmit={async (id, payload) => {
          await resolveMutation.mutateAsync({ id, payload });
        }}
      />

      <CloseIncidentDialog
        open={isCloseOpen}
        onOpenChange={setIsCloseOpen}
        incident={selectedIncident}
        loading={closeMutation.isPending}
        onConfirm={async (id, payload) => {
          await closeMutation.mutateAsync({ id, payload });
        }}
      />

      <Dialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("incidents.actions.delete")}
        description={`Bạn có chắc chắn muốn xóa vĩnh viễn sự cố vi phạm #${selectedIncident?.id.slice(0, 8)}? Hành động này không thể hoàn tác.`}
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsDeleteOpen(false)}
            disabled={deleteMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
