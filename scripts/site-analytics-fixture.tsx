/** Isolated harness for the actual Analytics tab; all API calls are mocked by the browser suite. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/providers/locale-provider";
import { SiteAnalyticsTab } from "@/components/features/sites/detail/tabs/site-analytics-tab";
import { ToasterProvider, toast } from "@/components/ui/toaster";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import type { MeDto, SiteItem } from "@/types";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const [mode, setMode] = useState("normal");
  const [incidents, setIncidents] = useState(true);
  const [reports, setReports] = useState(true);
  const [exporting, setExporting] = useState(true);
  const [userId, setUserId] = useState("author");
  const user = {
    id: userId, role: "USER", permissions: [
      ...(incidents ? ["PPE_INCIDENT_READ"] : []),
      ...(reports ? ["PPE_REPORTING_READ"] : []),
      ...(exporting ? ["PPE_REPORTING_EXPORT"] : []),
    ],
  } as MeDto;
  const site = { id: mode, name: `Site ${mode}`, code: mode, status: "ACTIVE" } as SiteItem;
  return <AuthContext value={{ user, status: "authenticated", setUser: () => { }, logout: async () => { } }}>
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <nav className="flex flex-wrap gap-3 border p-3">
        <label>Scenario
          <select
            aria-label="Scenario"
            value={mode}
            onChange={(e) => setMode(e.target.value)}>
            {["normal", "other", "empty", "limit", "closed-limit", "closed-history", "detail-error", "page-error", "metadata", "slow", "denied"].map((key) => <option key={key}>{key}</option>)}
          </select>
        </label>
        <button onClick={() => setIncidents((v) => !v)}>Toggle incident permission</button>
        <button onClick={() => setReports((v) => !v)}>Toggle report permission</button>
        <button onClick={() => setExporting((v) => !v)}>Toggle export permission</button>
        <button onClick={() => setUserId((v) => v === "author" ? "another" : "author")}>Switch user</button>
        <button onClick={() => void client.invalidateQueries({ queryKey: incidentKeys.lists() })}>Invalidate after review</button>
        <button onClick={() => toast.dismiss()}>Clear notifications</button>
      </nav>
      <SiteAnalyticsTab site={site} />
    </div>
    <ToasterProvider />
  </AuthContext>;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <LocaleProvider>
      <Fixture />
    </LocaleProvider>
  </QueryClientProvider>,
);
