import type { IncidentAssignmentItem, IncidentItem } from "@/types";
import { MAX_GROUP_MEMBERS, type IncidentGroupContext } from "./incident-group";

/**
 * Dựng "Đợt giao việc" từ chính dữ liệu phân công của sự cố, không đọc nội dung thông báo.
 *
 * BE chưa lưu thực thể "đợt" (bảng incident_assignments chỉ có assignedTo + assignedAt, không có
 * assignedBy/note), nên một đợt = các sự cố giao cho cùng một cán bộ trong cùng một lần thao tác:
 * - `batch-assign` ghi mọi bản ghi trong 1 transaction → cùng `assignedAt`;
 * - luồng cũ (gọi từng sự cố) cách nhau vài trăm ms → gom các bản ghi liên tiếp cách nhau ≤ 10s.
 */

/** Khoảng cách tối đa giữa hai lần giao liên tiếp để vẫn tính là cùng một đợt. */
export const DISPATCH_BATCH_GAP_MS = 10_000;
/** BE không trả người giao; dùng UUID rỗng để thẻ hiển thị nhãn mặc định "Quản lý An toàn". */
export const UNKNOWN_DISPATCHER_ID = "00000000-0000-4000-8000-000000000000";

function fnv1a(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** UUID ổn định theo khóa đợt để giữ nguyên id giữa các lần tải lại. */
export function stableBatchId(key: string): string {
  const hex = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b]
    .map((seed) => fnv1a(key, seed).toString(16).padStart(8, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Bản ghi phân công đại diện cho sự cố: ACTIVE nếu còn, ngược lại bản ghi mới nhất. */
function currentAssignment(incident: IncidentItem): IncidentAssignmentItem | undefined {
  const list = incident.assignments ?? [];
  const active = list.find((a) => a.status === "ACTIVE");
  if (active) return active;
  return [...list].sort((a, b) => Date.parse(b.assignedAt) - Date.parse(a.assignedAt))[0];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đợt giao việc kèm chỉ đạo (khi BE lưu `note`, hợp đồng mục 4). */
export interface DispatchBatch extends IncidentGroupContext {
  note?: string;
}

export function deriveDispatchBatches(
  incidents: readonly IncidentItem[],
  options: { assignedTo?: string; minSize?: number } = {},
): DispatchBatch[] {
  const minSize = options.minSize ?? 2;
  const byOfficer = new Map<string, Array<{ incidentId: string; at: number }>>();
  // BE đã lưu batchId (hợp đồng mục 4) → gom chính xác theo đợt, kèm người giao và chỉ đạo.
  const byBatchId = new Map<string, { assignedTo: string; assignedBy?: string; note?: string; at: number; ids: string[] }>();

  for (const incident of incidents) {
    if (incident.status !== "CONFIRMED" && incident.status !== "RESOLVED" && incident.status !== "CLOSED") continue;
    const assignment = currentAssignment(incident);
    if (!assignment?.assignedTo) continue;
    if (options.assignedTo && assignment.assignedTo !== options.assignedTo) continue;
    const at = Date.parse(assignment.assignedAt);
    if (!Number.isFinite(at)) continue;
    if (assignment.batchId && UUID_RE.test(assignment.batchId)) {
      const entry = byBatchId.get(assignment.batchId) ?? {
        assignedTo: assignment.assignedTo, at, ids: [] as string[],
        assignedBy: assignment.assignedBy || undefined, note: assignment.note || undefined,
      };
      entry.at = Math.min(entry.at, at);
      entry.assignedBy ||= assignment.assignedBy || undefined;
      entry.note ||= assignment.note || undefined;
      if (!entry.ids.includes(incident.id)) entry.ids.push(incident.id);
      byBatchId.set(assignment.batchId, entry);
      continue;
    }
    const list = byOfficer.get(assignment.assignedTo) ?? [];
    list.push({ incidentId: incident.id, at });
    byOfficer.set(assignment.assignedTo, list);
  }

  const batches: DispatchBatch[] = [];
  for (const [batchId, entry] of byBatchId) {
    // Đợt có batchId là đợt thật (kể cả 1 sự cố); BE giới hạn 100 sự cố mỗi lệnh.
    batches.push({
      v: 1,
      groupId: batchId,
      incidentIds: entry.ids.slice(0, MAX_GROUP_MEMBERS),
      assignedBy: entry.assignedBy && UUID_RE.test(entry.assignedBy) ? entry.assignedBy : UNKNOWN_DISPATCHER_ID,
      assignedTo: entry.assignedTo,
      createdAt: new Date(entry.at).toISOString(),
      ...(entry.note ? { note: entry.note } : {}),
    });
  }
  const flush = (officerId: string, members: Array<{ incidentId: string; at: number }>) => {
    const unique = [...new Map(members.map((m) => [m.incidentId, m])).values()];
    if (unique.length < minSize) return;
    for (let i = 0; i < unique.length; i += MAX_GROUP_MEMBERS) {
      const part = unique.slice(i, i + MAX_GROUP_MEMBERS);
      const startedAt = part[0].at;
      batches.push({
        v: 1,
        groupId: stableBatchId(`${officerId}|${startedAt}|${i}`),
        incidentIds: part.map((m) => m.incidentId),
        assignedBy: UNKNOWN_DISPATCHER_ID,
        assignedTo: officerId,
        createdAt: new Date(startedAt).toISOString(),
      });
    }
  };

  for (const [officerId, list] of byOfficer) {
    list.sort((a, b) => a.at - b.at || a.incidentId.localeCompare(b.incidentId));
    let current: typeof list = [];
    for (const entry of list) {
      const last = current[current.length - 1];
      if (last && entry.at - last.at > DISPATCH_BATCH_GAP_MS) {
        flush(officerId, current);
        current = [];
      }
      current.push(entry);
    }
    flush(officerId, current);
  }

  // Đợt mới nhất lên trước
  return batches.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * Dựng nhóm từ kết quả `GET /incidents?batchId=<id>` (hợp đồng mục 4). Chỉ nhận sự cố có phân công
 * mang đúng batchId: BE cũ bỏ qua tham số và trả danh sách bất kỳ → không suy đoán thành viên.
 */
export function groupFromBatchItems(batchId: string, items: readonly IncidentItem[]): DispatchBatch | null {
  if (!UUID_RE.test(batchId)) return null;
  const members = items.filter((inc) => (inc.assignments ?? []).some((a) => a.batchId === batchId));
  if (members.length === 0) return null;
  const pinned = members.map((inc) => ({
    ...inc,
    // Lấy đúng bản ghi phân công của đợt này làm phân công đại diện
    assignments: (inc.assignments ?? []).filter((a) => a.batchId === batchId).map((a) => ({ ...a, status: "ACTIVE" })),
  }));
  return deriveDispatchBatches(pinned, { minSize: 1 }).find((b) => b.groupId === batchId) ?? null;
}
