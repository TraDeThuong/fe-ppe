/** Interactive isolated harness for dashboard hooks. Served by serve-dashboard-fixture.py. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  useDashboardData,
  useDashboardPeriod,
} from "@/hooks/dashboard/use-dashboard-data";
import { DashboardKpiRibbon } from "@/components/features/dashboard/dashboard-kpi-ribbon";
import { DashboardDataState } from "@/components/features/dashboard/dashboard-data-state";
import { DashboardOperationalSuite } from "@/components/features/dashboard/dashboard-operational-suite";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function Fixture() {
  const [scenario, setScenario] = useState("normal");
  const [allowed, setAllowed] = useState(true);
  const [userId, setUserId] = useState("fixture-user");
  const period = useDashboardPeriod();
  const data = useDashboardData({
    userId,
    siteId: scenario,
    period: period.period,
    incidents: allowed,
    analytics: true,
    cameras: true,
    model: false,
    ready: true,
  });
  const { periodQuery, pendingQuery, cameraQuery, onlineQuery, analytics } =
    data;
  return (
    <div className="space-y-5 p-6">
      <h1>Dashboard isolated fixture</h1>
      <label>
        Scenario{" "}
        <select
          aria-label="Scenario"
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
        >
          {["normal", "empty", "page-error", "metadata", "limit", "slow"].map(
            (mode) => (
              <option key={mode}>{mode}</option>
            ),
          )}
        </select>
      </label>
      <button onClick={() => setAllowed((value) => !value)}>
        Toggle incident permission
      </button>
      <button
        onClick={() =>
          setUserId((value) =>
            value === "fixture-user" ? "another-user" : "fixture-user",
          )
        }
      >
        Switch user
      </button>
      <button
        onClick={() =>
          void client.invalidateQueries({ queryKey: incidentKeys.lists() })
        }
      >
        Invalidate after review
      </button>
      <button onClick={() => period.setPreset("7d")}>Last 7 days</button>
      <button
        onClick={() => {
          period.setPreset("custom");
          period.setCustomStart("2020-01-01");
        }}
      >
        Invalid 90-day range
      </button>
      <button onClick={() => period.setPreset("today")}>Today</button>
      <output data-testid="result">
        {JSON.stringify({
          scenario,
          allowed,
          userId,
          periodValid: !!period.period,
          loading: periodQuery.isFetching,
          total: periodQuery.data?.total ?? null,
          complete: periodQuery.data?.complete ?? false,
          issue: periodQuery.data?.issue ?? null,
          analyticsTotal: analytics?.total ?? null,
          reviewed: analytics?.reviewed ?? null,
          dismissed: analytics?.dismissed ?? null,
          pending: pendingQuery.data ?? null,
          cameras: cameraQuery.data?.items.length ?? null,
          online: onlineQuery.data ?? null,
        })}
      </output>
      <DashboardKpiRibbon
        total={periodQuery.data?.total ?? null}
        analytics={analytics}
        pendingCount={pendingQuery.data ?? null}
        totalCamerasCount={cameraQuery.data?.total ?? null}
        onlineCamerasCount={onlineQuery.data ?? null}
        canViewIncidents={allowed}
        canViewReports
        canViewCameras
        periodState={
          <DashboardDataState
            loading={periodQuery.isFetching}
            message={
              periodQuery.data?.issue ||
              (periodQuery.isError ? "Fixture request failed" : null)
            }
          />
        }
      />
      {analytics && (
        <DashboardOperationalSuite
          analytics={analytics}
          cameras={cameraQuery.data?.items}
          catalogComplete={cameraQuery.data?.complete}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <LocaleProvider>
      <Fixture />
    </LocaleProvider>
  </QueryClientProvider>,
);
