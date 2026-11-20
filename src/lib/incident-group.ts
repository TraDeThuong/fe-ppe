import type { IncidentItem } from "@/types";
import { DISPATCH_SIGNAL_PREFIX, RESOLVED_REPORT_PREFIX } from "./incident-workflow";

export interface IncidentGroupContext {
  v: 1;
  groupId: string;
  incidentIds: string[];
  assignedBy: string;
  assignedTo: string;
  createdAt: string;
}

export const MAX_GROUP_MEMBERS = 100;
const MAX_CONTEXT_LENGTH = 7500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GROUP_LINK_LINE = /^Mở nhóm xử lý: (\S+)\s*$/gm;

export function isIncidentGroup(value: unknown): value is IncidentGroupContext {
  if (!value || typeof value !== "object") return false;
  const group = value as Partial<IncidentGroupContext>;
  return group.v === 1 && typeof group.groupId === "string" && UUID.test(group.groupId) &&
    typeof group.assignedBy === "string" && UUID.test(group.assignedBy) &&
    typeof group.assignedTo === "string" && UUID.test(group.assignedTo) &&
    typeof group.createdAt === "string" && group.createdAt.length <= 32 &&
    /^\d{4}-\d{2}-\d{2}T/.test(group.createdAt) && Number.isFinite(Date.parse(group.createdAt)) &&
    Array.isArray(group.incidentIds) && group.incidentIds.length > 0 &&
    group.incidentIds.length <= MAX_GROUP_MEMBERS &&
    group.incidentIds.every((id) => typeof id === "string" && UUID.test(id)) &&
    new Set(group.incidentIds).size === group.incidentIds.length;
}

export function encodeIncidentGroup(group: IncidentGroupContext): string {
  if (!isIncidentGroup(group)) throw new Error("Invalid incident group");
  // All fields are ASCII identifiers/timestamps; browser btoa and Node agree on this wire format.
  const { v, groupId, incidentIds, assignedBy, assignedTo, createdAt } = group;
  return btoa(JSON.stringify({ v, groupId, incidentIds, assignedBy, assignedTo, createdAt }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeIncidentGroup(encoded: string | null, groupId: string | null, incidentId: string): IncidentGroupContext | null {
  if (!encoded || encoded.length > MAX_CONTEXT_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const value: unknown = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    if (!isIncidentGroup(value) || value.groupId !== groupId || !value.incidentIds.includes(incidentId)) return null;
    const { v, incidentIds, assignedBy, assignedTo, createdAt } = value;
    return { v, groupId, incidentIds, assignedBy, assignedTo, createdAt };
  } catch { return null; }
}

export function incidentGroupHref(group: IncidentGroupContext, incidentId = group.incidentIds[0], compare = false): string {
  if (!group.incidentIds.includes(incidentId)) throw new Error("Incident is not a member of this group");
  const query = new URLSearchParams({ group: group.groupId, context: encodeIncidentGroup(group) });
  if (compare) query.set("focus", "compare");
  return `/incidents/${encodeURIComponent(incidentId)}?${query}`;
}

export function appendIncidentGroupLink(content: string, group: IncidentGroupContext, appOrigin?: string): string {
  const path = incidentGroupHref(group);
  const origin = appOrigin ? new URL(appOrigin).origin : "";
  return `${content}\nMở nhóm xử lý: ${origin}${path}`;
}

export function groupFromNotification(content: string, incidentId: string): IncidentGroupContext | null {
  // Never use the origin from message text for navigation; rebuild a validated local route instead.
  for (const match of content.matchAll(GROUP_LINK_LINE)) {
    try {
      const url = new URL(match[1], "https://local.invalid");
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      if (url.pathname !== `/incidents/${incidentId}`) continue;
      const group = decodeIncidentGroup(url.searchParams.get("context"), url.searchParams.get("group"), incidentId);
      if (group) return group;
    } catch { /* An unrelated or damaged link is not a group context. */ }
  }
  return null;
}

export function notificationIncidentTarget(data: { incidentId?: string | null; content?: string; description?: string }, compare = false) {
  const incidentId = data.incidentId || "";
  const content = data.content || data.description || "";
  const group = incidentId ? groupFromNotification(content, incidentId) : null;
  const legacy = !group && content.trim().startsWith(DISPATCH_SIGNAL_PREFIX);
  const query = new URLSearchParams();
  if (legacy) query.set("dispatch", "legacy");
  if (compare) query.set("focus", "compare");
  const href = group ? incidentGroupHref(group, incidentId, compare)
    : incidentId ? `/incidents/${encodeURIComponent(incidentId)}${query.size ? `?${query}` : ""}` : null;
  return { href, group, legacy, content: content.replace(GROUP_LINK_LINE, "").trim() };
}

export function isGroupIncidentResolved(incident: IncidentItem): boolean {
  if (incident.status === "RESOLVED") return true;
  if (incident.status !== "CLOSED") return false;
  const closure = [...(incident.statusHistory ?? [])]
    .filter((history) => history.newStatus === "CLOSED")
    .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt))[0];
  if (closure?.oldStatus === "DISMISSED") return false;
  const resolved = Date.parse(incident.resolvedAt ?? "");
  return (Number.isFinite(resolved) && resolved >= Date.parse(incident.detectedAt)) || closure?.oldStatus === "RESOLVED";
}

export function canResolveGroupIncident(incident: IncidentItem, userId: string): boolean {
  return incident.status === "CONFIRMED" && !!userId && (incident.assignments ?? []).some(
    (assignment) => assignment.assignedTo === userId && assignment.status === "ACTIVE",
  );
}

export interface IncidentGroupRow {
  id: string;
  incident?: IncidentItem;
  error?: string;
}
export interface IncidentGroupSnapshot {
  rows: IncidentGroupRow[];
  checkedAt: string;
}

export function groupProgress(group: IncidentGroupContext, rows: readonly IncidentGroupRow[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = group.incidentIds.map((id) => byId.get(id));
  const resolved = ordered.filter((row) => row?.incident && !row.error && isGroupIncidentResolved(row.incident)).length;
  const unavailable = ordered.filter((row) => !row?.incident || row.error).length;
  return { total: group.incidentIds.length, resolved, remaining: group.incidentIds.length - resolved,
    unavailable, complete: resolved === group.incidentIds.length && unavailable === 0 };
}

export function nextGroupIncident(group: IncidentGroupContext, currentId: string, rows: readonly IncidentGroupRow[], userId: string): string | null {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const current = group.incidentIds.indexOf(currentId);
  for (let offset = 1; offset < group.incidentIds.length; offset++) {
    const id = group.incidentIds[(current + offset) % group.incidentIds.length];
    const row = byId.get(id);
    if (row?.incident && !row.error && canResolveGroupIncident(row.incident, userId)) return id;
  }
  return null;
}

export function isGroupCompletionReceipt(content: string, incidentId: string | null, group: IncidentGroupContext): boolean {
  if (!incidentId || !content.startsWith(RESOLVED_REPORT_PREFIX)) return false;
  const saved = groupFromNotification(content, incidentId);
  return !!saved && saved.groupId === group.groupId && saved.assignedBy === group.assignedBy &&
    saved.assignedTo === group.assignedTo && saved.createdAt === group.createdAt &&
    saved.incidentIds.join(",") === group.incidentIds.join(",");
}
