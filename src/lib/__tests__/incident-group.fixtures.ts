import type { IncidentItem } from "@/types";
import type { IncidentGroupContext } from "../incident-group";

export const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const fixtureGroup = (n = 1000, count = 3): IncidentGroupContext => ({
  v: 1, groupId: uuid(n), incidentIds: Array.from({ length: count }, (_, i) => uuid(i + 1)),
  assignedBy: uuid(200), assignedTo: uuid(201), createdAt: "2026-11-18T01:00:00.000Z",
});
export const fixtureIncident = (n: number, status: IncidentItem["status"] = "CONFIRMED"): IncidentItem => ({
  id: uuid(n), status, cameraId: uuid(300), cameraCode: "CAM-01", siteId: uuid(400),
  severity: "HIGH", violationType: "NO_HELMET", detectedAt: "2026-11-18T00:00:00Z",
  createdAt: "2026-11-18T00:00:00Z", updatedAt: "2026-11-18T01:00:00Z",
  assignments: [{ id: uuid(500 + n), incidentId: uuid(n), assignedTo: uuid(201), status: "ACTIVE", assignedAt: "2026-11-18T01:00:00Z" }],
});

