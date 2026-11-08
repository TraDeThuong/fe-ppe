import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { LocaleProvider } from "@/providers/locale-provider";
import { AuthContext } from "@/contexts/AuthContext";
import { Table, TableToolbar, TableContent, TablePagination, TableSelectionHeader, TableSelectionRow, TableRowActions, TableBulkActions, TableFilterPanel, TableFilter } from "@/components/ui/table";
import { UserTable } from "@/components/features/users/user-table";
import { SiteTable } from "@/components/features/sites/site-table";
import { RoleTable } from "@/components/features/roles/role-table";
import { IncidentTable } from "@/components/features/incidents/incident-table";
import { AuditLogTable } from "@/components/features/audit-logs/audit-log-table";
import { ReportHistoryTable } from "@/components/features/reports/report-history-table";
import { CameraTable } from "@/components/features/cameras/camera-table";
import { NotificationEmailLogsTab } from "@/components/features/notifications/notification-email-logs-tab";
import { NotificationTemplatesTab } from "@/components/features/notifications/notification-templates-tab";
import { SystemConfigTable } from "@/components/features/system/system-config-table";
import { ModelGovernanceTable } from "@/components/features/ai-metrics/model-governance-table";
import { CameraTelemetryTables } from "@/components/features/cameras/detail/camera-telemetry-tables";
import { SiteStatsDetailPanel } from "@/components/features/sites/site-stats-detail-panel";
import { RoleStatsDetailPanel } from "@/components/features/roles/role-stats-detail-panel";
import type { AiModelDto, SystemConfigItem } from "@/types";
import { SystemHealthMatrix } from "@/components/features/system/system-health-matrix";
import type { MeDto, SiteItem, RoleDto, CameraItem, IncidentItem, AuditLogItem, ReportGenerationDto, SystemHealthReport } from "@/types";

const noop = () => { };
const user = {
  id: "admin",
  email: "admin@example.test",
  role: new URLSearchParams(location.search).get("readonly") ? "USER" : "ADMIN",
  permissions: [],
  isActive: true
} as unknown as MeDto;
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
const router = {
  bfcacheId: "table-test",
  back: noop,
  forward: noop,
  refresh: noop,
  push: noop,
  replace: noop,
  prefetch: async () => { }
};
const rows = Array.from({ length: 25 }, (_, i) => ({
  id: String(i),
  name: `Record ${String(i).padStart(2, "0")}`,
  category: i < 12 ? "alpha" : "beta"
}));
function CoreTable() {
  const [data, setData] = useState(rows);
  const [opened, setOpened] = useState(0);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  return <><output data-testid="opened">{opened}</output><button onClick={() => setError(true)}>Simulate failure</button><button onClick={() => setData(rows.slice(0, 5))}>Shrink data</button><Table
    data={data}
    columns={[
      {
        id: "select",
        header: () => <TableSelectionHeader />,
        cell: ({ row }) => <TableSelectionRow row={row} />
      },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "category", header: "Category" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <TableRowActions row={row} actions={[{
          id: "view",
          label: "Open record",
          onClick: () => setOpened(x => x + 1)
        }]} />
      }
    ]}
    getRowId={row => row.id}
    onRowClick={() => setOpened(x => x + 1)}
    globalFilter={query}
    onGlobalFilterChange={value => setQuery(String(value))}
    error={error ? Error("offline") : undefined}
    onRetry={() => setError(false)}
  >
    <TableToolbar />
    <TableFilterPanel><span>Filter content</span></TableFilterPanel>
    <TableFilter filters={[{
      columnId: "category",
      label: "Category",
      type: "select",
      options: [{ label: "Alpha", value: "alpha" }, { label: "Beta", value: "beta" }]
    }]} />
    <TableBulkActions />
    <TableContent />
    <TablePagination />
  </Table></>;
}
const site = {
  id: "site-1",
  name: "Site Alpha",
  code: "ALPHA",
  status: "ACTIVE"
} as SiteItem;
const role = {
  id: "role-1",
  name: "SAFETY",
  description: "Safety team",
  permissions: [],
  userCount: 4,
  isSystem: false,
  createdAt: "2026-11-07",
  updatedAt: "2026-11-07"
} as RoleDto;
const camera = {
  id: "camera-1",
  name: "Gate Camera",
  code: "CAM-01",
  status: "ONLINE",
  siteId: "site-1",
  sourceType: "RTSP",
  rtspUrl: "rtsp://example.test/live"
} as unknown as CameraItem;
const incident = {
  id: "incident-1",
  cameraId: "camera-1",
  siteId: "site-1",
  violationType: "NO_HELMET",
  severity: "HIGH",
  status: "PENDING_REVIEW",
  detectedAt: "2026-11-07T00:00:00Z"
} as IncidentItem;
const log = {
  id: "log-1",
  createdAt: "2026-11-07T00:00:00Z",
  action: "USER_UPDATE",
  targetType: "USER",
  status: "SUCCESS"
} as AuditLogItem;
const report = {
  id: "report-1",
  fileName: "Safety report",
  reportType: "DAILY",
  status: "COMPLETED",
  createdAt: "2026-11-07T00:00:00Z"
} as ReportGenerationDto;
function Demo() {
  switch (new URLSearchParams(location.search).get("demo")) {
    case "users": return <UserTable />;
    case "sites": return <SiteTable
      sites={[site]}
      onManageZones={noop}
      onSafetyConfig={noop}
      onEdit={noop}
      onDelete={noop}
      tableState={{ manualPagination: false }}
    />;
    case "roles": return <RoleTable
      roles={[role]}
      onConfigurePermissions={noop}
      onEdit={noop}
      onDelete={noop}
    />;
    case "cameras": return <CameraTable
      cameras={[camera]}
      onViewLive={noop}
      onPing={noop}
      onConfigureRoi={noop}
      onEdit={noop}
      onDelete={noop}
    />;
    case "incidents": return <IncidentTable incidents={[incident]} onReview={noop} tableState={{ manualPagination: false }} />;
    case "audit": return <AuditLogTable items={[log]} onSelectRecord={noop} tableState={{ manualPagination: false }} />;
    case "reports": return <ReportHistoryTable history={[report]} tableState={{ manualPagination: false }} />;
    case "email": return <NotificationEmailLogsTab />;
    case "templates": return <NotificationTemplatesTab />;
    case "configs": return <SystemConfigTable items={[{ id: "cfg-1", key: "app.name", value: "Smart PPE", category: "GENERAL", isPublic: true } as SystemConfigItem]} onEdit={noop} onDelete={noop} />;
    case "models": return <ModelGovernanceTable models={[{ id: "model-1", name: "PPE detector", code: "PPE", versions: [{ id: "v1", version: "v1", framework: "ONNX", status: "DEPLOYED", createdAt: "2026-11-07T00:00:00Z", metrics: { mAP50: 0.8 } }] } as unknown as AiModelDto]} />;
    case "telemetry": return <CameraTelemetryTables cameraId={camera.id} camera={camera} realIncidents={[incident]} isIncidentsLoading={false} />;
    case "site-stats": return <SiteStatsDetailPanel activeStat="totalSites" sites={[site]} onClose={noop} />;
    case "role-stats": return <RoleStatsDetailPanel totalPermissionsCount={0} activeStat="totalRoles" roles={[role]} permissions={[]} onClose={noop} />;
    case "health": return <SystemHealthMatrix onRefresh={noop} healthReport={{
      services: Array.from({ length: 15 }, (_, i) => ({
        name: `Service ${i}`,
        serviceCode: `service-${i}`,
        status: "UP",
        latencyMs: 1,
        port: 8000 + i
      }))
    } as unknown as SystemHealthReport} />;
    default: return <CoreTable />;
  }
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={client}><AuthContext.Provider value={{
  user,
  status: "authenticated",
  setUser: noop,
  logout: async () => { }
}}><LocaleProvider><AppRouterContext.Provider value={router}><Demo /></AppRouterContext.Provider></LocaleProvider></AuthContext.Provider></QueryClientProvider>);
