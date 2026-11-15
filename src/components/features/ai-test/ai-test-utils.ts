import type {
  EvidenceItem,
  FrameLogEntry,
  FrameRange,
  JobMeta,
  LiveStatsResponse,
  LiveViolationEvent,
  PersonTrackSummary,
  PpeAssociationItem,
  RawEvidenceRecord,
  ViolationFilterType,
  ViolationTimelineEvent,
} from "@/types/ai-test.types";

/**
 * Normalize violation type aliases across Offline JSONL & Live Stats
 * (`no_helmet` / `NO_HELMET` -> `NO_HELMET`, `no_safety_vest` / `no_vest` / `NO_VEST` -> `NO_VEST`).
 */
export function normalizeViolationType(type: string | undefined): string {
  const upper = (type ?? "").trim().toUpperCase();
  if (upper === "NO_HELMET") return "NO_HELMET";
  if (upper === "NO_VEST" || upper === "NO_SAFETY_VEST") return "NO_VEST";
  if (upper === "RESTRICTED_AREA") return "RESTRICTED_AREA";
  return upper || "UNKNOWN";
}

/**
 * Parse NDJSON log returned by GET /api/jobs/{jobId}/log into frame entries sorted by frame_idx.
 */
export function parseNdjsonLog(rawText: string): FrameLogEntry[] {
  if (!rawText || !rawText.trim()) return [];
  const entries: FrameLogEntry[] = [];
  const lines = rawText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as FrameLogEntry;
      if (parsed && typeof parsed.frame_idx === "number") {
        entries.push(parsed);
      }
    } catch {
      // Skip partial/trailing lines while log is still flushing
    }
  }

  entries.sort((a, b) => a.frame_idx - b.frame_idx);
  return entries;
}

/**
 * Build a Map keyed by 1-based frame_idx for O(1) exact frame lookup.
 */
export function buildFrameLookupMap(entries: FrameLogEntry[]): Map<number, FrameLogEntry> {
  const map = new Map<number, FrameLogEntry>();
  for (const entry of entries) {
    map.set(entry.frame_idx, entry);
  }
  return map;
}

/**
 * Compute target frame index (`video.currentTime * fps + 1`) and return the exact entry
 * or the closest preceding entry when stride > 1 skipped intermediate frames.
 */
export function findFrameEntryForTime(
  sortedEntries: FrameLogEntry[],
  frameMap: Map<number, FrameLogEntry>,
  currentTimeSec: number,
  fps: number,
): { targetFrameIdx: number; entry: FrameLogEntry | null } {
  const safeFps = fps > 0 ? fps : 25;
  const targetFrameIdx = Math.max(1, Math.floor(Math.max(0, currentTimeSec) * safeFps) + 1);

  const exact = frameMap.get(targetFrameIdx);
  if (exact) return { targetFrameIdx, entry: exact };
  if (sortedEntries.length === 0) return { targetFrameIdx, entry: null };

  // Binary search for largest frame_idx <= targetFrameIdx
  let lo = 0;
  let hi = sortedEntries.length - 1;
  let bestIdx = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedEntries[mid].frame_idx <= targetFrameIdx) {
      bestIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return { targetFrameIdx, entry: sortedEntries[bestIdx] ?? null };
}

/**
 * Group sorted/unsorted integer frame numbers into contiguous inclusive ranges.
 */
export function mergeContiguousRanges(frames: number[]): FrameRange[] {
  if (frames.length === 0) return [];
  const sortedUnique = Array.from(new Set(frames)).sort((a, b) => a - b);
  const result: FrameRange[] = [];

  let start = sortedUnique[0];
  let end = sortedUnique[0];

  for (let i = 1; i < sortedUnique.length; i++) {
    const f = sortedUnique[i];
    if (f <= end + 1) {
      end = f;
    } else {
      result.push({ start, end });
      start = f;
      end = f;
    }
  }
  result.push({ start, end });
  return result;
}

/**
 * Compute per-person track timelines (`ranges` + violation intervals) across all frames in log.jsonl.
 */
export function computePersonTracks(
  entries: FrameLogEntry[],
  fps: number,
): PersonTrackSummary[] {
  const safeFps = fps > 0 ? fps : 25;
  const trackMap = new Map<
    string,
    {
      frames: number[];
      violationFrames: number[];
      violationTypes: Set<string>;
      firstTimeSec: number;
      lastTimeSec: number;
    }
  >();

  for (const entry of entries) {
    const t = typeof entry.time_sec === "number" ? entry.time_sec : (entry.frame_idx - 1) / safeFps;

    for (const p of entry.persons ?? []) {
      const tid = String(p.track_id);
      let bucket = trackMap.get(tid);
      if (!bucket) {
        bucket = {
          frames: [],
          violationFrames: [],
          violationTypes: new Set<string>(),
          firstTimeSec: t,
          lastTimeSec: t,
        };
        trackMap.set(tid, bucket);
      }
      bucket.frames.push(entry.frame_idx);
      bucket.firstTimeSec = Math.min(bucket.firstTimeSec, t);
      bucket.lastTimeSec = Math.max(bucket.lastTimeSec, t);
    }

    for (const v of entry.violations ?? []) {
      const tid = String(v.track_id);
      let bucket = trackMap.get(tid);
      if (!bucket) {
        bucket = {
          frames: [entry.frame_idx],
          violationFrames: [],
          violationTypes: new Set<string>(),
          firstTimeSec: t,
          lastTimeSec: t,
        };
        trackMap.set(tid, bucket);
      }
      bucket.violationFrames.push(entry.frame_idx);
      if (v.type) bucket.violationTypes.add(v.type);
    }
  }

  return Array.from(trackMap.entries())
    .map(([trackId, data]) => {
      const sortedFrames = Array.from(new Set(data.frames)).sort((a, b) => a - b);
      return {
        trackId,
        totalFrames: sortedFrames.length,
        firstFrame: sortedFrames[0] ?? 1,
        lastFrame: sortedFrames[sortedFrames.length - 1] ?? 1,
        firstTimeSec: data.firstTimeSec,
        lastTimeSec: data.lastTimeSec,
        ranges: mergeContiguousRanges(sortedFrames),
        violationRanges: mergeContiguousRanges(data.violationFrames),
        violationTypes: Array.from(data.violationTypes),
      };
    })
    .sort((a, b) => {
      const na = Number(a.trackId);
      const nb = Number(b.trackId);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.trackId.localeCompare(b.trackId);
    });
}

/**
 * Aggregate per-(track, violationType) intervals across the offline log for clickable violation seeking.
 */
export function extractJobViolationsSummary(
  entries: FrameLogEntry[],
  fps: number,
): ViolationTimelineEvent[] {
  const safeFps = fps > 0 ? fps : 25;
  const activeByKey = new Map<string, ViolationTimelineEvent>();

  for (const entry of entries) {
    const t = typeof entry.time_sec === "number" ? entry.time_sec : (entry.frame_idx - 1) / safeFps;
    for (const v of entry.violations ?? []) {
      const trackId = String(v.track_id);
      const type = v.type || "unknown";
      const key = `${trackId}::${type}`;
      const duration = v.sustained_sec ?? v.duration_sec ?? 0;

      const existing = activeByKey.get(key);
      if (!existing) {
        activeByKey.set(key, {
          key,
          trackId,
          type,
          startFrame: entry.frame_idx,
          endFrame: entry.frame_idx,
          startTimeSec: t,
          endTimeSec: t,
          maxDurationSec: duration,
        });
      } else {
        existing.endFrame = Math.max(existing.endFrame, entry.frame_idx);
        existing.endTimeSec = Math.max(existing.endTimeSec, t);
        existing.maxDurationSec = Math.max(existing.maxDurationSec, duration);
      }
    }
  }

  return Array.from(activeByKey.values()).sort((a, b) => a.startFrame - b.startFrame);
}

/**
 * Resolve bare filename or backend relative path into a proxied Next.js URL.
 */
export function resolveEvidenceImageUrl(
  urlOrFilename: string,
  source: "job" | "live",
  sourceId: string,
): string {
  const trimmed = urlOrFilename.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/api/")) {
    return trimmed;
  }
  const cleanName = trimmed.replace(/^\/+/, "");
  if (source === "job") {
    return `/api/jobs/${encodeURIComponent(sourceId)}/evidence/${encodeURIComponent(cleanName)}`;
  }
  return `/api/live/evidence/${encodeURIComponent(cleanName)}`;
}

function toEvidenceItem(
  raw: RawEvidenceRecord,
  index: number,
  source: "job" | "live",
  sourceId: string,
  fallbackFrameIdx?: number,
  fallbackTimeSec?: number,
): EvidenceItem | null {
  const beforeRaw = raw.reference_snapshot_url || raw.before_url || raw.before_filename || "";
  const afterRaw =
    raw.snapshot_url ||
    raw.after_url ||
    raw.after_filename ||
    raw.url ||
    raw.image_url ||
    raw.filename ||
    raw.file ||
    "";

  const beforeUrl = beforeRaw ? resolveEvidenceImageUrl(beforeRaw, source, sourceId) : null;
  const afterUrl = afterRaw ? resolveEvidenceImageUrl(afterRaw, source, sourceId) : null;
  const primaryUrl = afterUrl || beforeUrl || "";

  if (!primaryUrl) return null;

  const trackIdRaw = raw.canonical_person_id ?? raw.person_id ?? raw.track_id;
  const trackId = trackIdRaw !== undefined ? String(trackIdRaw) : "-";
  const type = normalizeViolationType(raw.violation_type || raw.type);
  const frameIdx = raw.frame ?? raw.frame_idx ?? fallbackFrameIdx;
  const timeSec = raw.confirmed_t ?? raw.time_sec ?? raw.timestamp_sec ?? raw.start_t ?? fallbackTimeSec;
  const id =
    raw.evidence_id ||
    raw.id ||
    `${source}-${sourceId}-${trackId}-${type}-${frameIdx ?? index}-${index}`;

  return {
    id,
    source,
    sourceId,
    type,
    trackId,
    frameIdx,
    timeSec,
    timestamp: raw.timestamp || raw.created_at,
    beforeUrl,
    afterUrl,
    primaryUrl,
  };
}

/**
 * Collect deduplicated evidence items from JobMeta and FrameLogEntry[] (Before/After pairs).
 */
export function normalizeJobEvidences(
  jobId: string,
  meta: JobMeta | null,
  entries: FrameLogEntry[],
): EvidenceItem[] {
  const byId = new Map<string, EvidenceItem>();

  meta?.evidences?.forEach((raw, i) => {
    const item = toEvidenceItem(raw, i, "job", jobId);
    if (item) byId.set(item.id, item);
  });

  for (const entry of entries) {
    entry.evidences?.forEach((raw, i) => {
      const item = toEvidenceItem(raw, i, "job", jobId, entry.frame_idx, entry.time_sec);
      if (item && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    });
  }

  return Array.from(byId.values());
}

function fromLiveViolationEvent(ev: LiveViolationEvent): EvidenceItem | null {
  const afterRaw = ev.snapshot_url || "";
  const beforeRaw = ev.reference_snapshot_url || "";
  const beforeUrl = beforeRaw ? resolveEvidenceImageUrl(beforeRaw, "live", ev.camera_id) : null;
  const afterUrl = afterRaw ? resolveEvidenceImageUrl(afterRaw, "live", ev.camera_id) : null;
  const primaryUrl = afterUrl || beforeUrl || "";
  if (!primaryUrl) return null;

  const trackId = String(ev.canonical_person_id ?? ev.person_id ?? "-");
  return {
    id: `live-${ev.camera_id}-${ev.event_id}`,
    source: "live",
    sourceId: ev.camera_id,
    type: normalizeViolationType(ev.violation_type),
    trackId,
    frameIdx: ev.frame,
    timeSec: ev.confirmed_t ?? ev.start_t,
    timestamp: ev.timestamp,
    beforeUrl,
    afterUrl,
    primaryUrl,
  };
}

/**
 * Normalize live evidence records from GET /api/live/{camera_id}/stats (`recent_violations` + `evidences`).
 */
export function normalizeLiveEvidences(
  cameraId: string,
  statsOrRecords: LiveStatsResponse | RawEvidenceRecord[] | undefined,
): EvidenceItem[] {
  if (!statsOrRecords) return [];

  if (Array.isArray(statsOrRecords)) {
    const items: EvidenceItem[] = [];
    statsOrRecords.forEach((raw, i) => {
      const item = toEvidenceItem(raw, i, "live", cameraId);
      if (item) items.push(item);
    });
    return items;
  }

  const byId = new Map<string, EvidenceItem>();

  for (const ev of statsOrRecords.recent_violations ?? []) {
    const item = fromLiveViolationEvent(ev);
    if (item) byId.set(item.id, item);
  }

  (statsOrRecords.evidences ?? []).forEach((raw, i) => {
    const item = toEvidenceItem(raw, i, "live", cameraId);
    if (item && !byId.has(item.id)) byId.set(item.id, item);
  });

  return Array.from(byId.values());
}

/**
 * Filter evidence items by normalized violation category (`ALL`, `NO_HELMET`, `NO_VEST`, `RESTRICTED_AREA`).
 */
export function filterEvidenceItems(
  items: EvidenceItem[],
  filter: ViolationFilterType,
): EvidenceItem[] {
  if (filter === "ALL") return items;
  return items.filter((item) => normalizeViolationType(item.type) === filter);
}

export type EvidenceSortOrder = "newest" | "time_asc" | "track_asc" | "type_asc";
export type EvidencePairFilter = "all" | "pair" | "single";
export type EvidenceSourceFilter = "all" | "job" | "live";

export interface EvidenceQueryOptions {
  source?: EvidenceSourceFilter;
  violation?: ViolationFilterType;
  pairMode?: EvidencePairFilter;
  trackId?: string;
  search?: string;
}

export interface EvidenceTrackGroup {
  key: string;
  trackId: string;
  source: "job" | "live";
  sourceId: string;
  items: EvidenceItem[];
  pairCount: number;
  violationTypes: string[];
}

function compareTrackIds(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

function parseTimestampMs(ts: string | undefined): number | null {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Check whether an evidence item has both Before and After snapshots.
 */
export function isBeforeAfterPair(item: EvidenceItem): boolean {
  return Boolean(item.beforeUrl && item.afterUrl);
}

/**
 * Filter evidence items by source, violation type, Before/After pair mode, track ID, and free-text query.
 */
export function queryEvidenceItems(
  items: EvidenceItem[],
  options: EvidenceQueryOptions,
): EvidenceItem[] {
  const {
    source = "all",
    violation = "ALL",
    pairMode = "all",
    trackId = "all",
    search = "",
  } = options;
  const q = search.trim().toLowerCase();

  return items.filter((item) => {
    if (source !== "all" && item.source !== source) return false;
    if (violation !== "ALL" && normalizeViolationType(item.type) !== violation) {
      return false;
    }
    const isPair = isBeforeAfterPair(item);
    if (pairMode === "pair" && !isPair) return false;
    if (pairMode === "single" && isPair) return false;
    if (trackId !== "all" && item.trackId !== trackId) return false;

    if (q) {
      const haystack = [
        `track #${item.trackId}`,
        item.trackId,
        item.sourceId,
        item.source,
        normalizeViolationType(item.type),
        formatViolationLabel(item.type),
        typeof item.frameIdx === "number" ? `frame #${item.frameIdx}` : "",
        typeof item.timeSec === "number" ? formatTimeSec(item.timeSec) : "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Sort evidence items deterministically according to the selected view order.
 */
export function sortEvidenceItems(
  items: EvidenceItem[],
  sortOrder: EvidenceSortOrder,
): EvidenceItem[] {
  return [...items].sort((a, b) => {
    if (sortOrder === "time_asc") {
      const ta = a.timeSec ?? Number.POSITIVE_INFINITY;
      const tb = b.timeSec ?? Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      const fa = a.frameIdx ?? Number.POSITIVE_INFINITY;
      const fb = b.frameIdx ?? Number.POSITIVE_INFINITY;
      if (fa !== fb) return fa - fb;
      return compareTrackIds(a.trackId, b.trackId);
    }

    if (sortOrder === "track_asc") {
      const trackDiff = compareTrackIds(a.trackId, b.trackId);
      if (trackDiff !== 0) return trackDiff;
      const ta = a.timeSec ?? Number.POSITIVE_INFINITY;
      const tb = b.timeSec ?? Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return (a.frameIdx ?? 0) - (b.frameIdx ?? 0);
    }

    if (sortOrder === "type_asc") {
      const typeDiff = normalizeViolationType(a.type).localeCompare(
        normalizeViolationType(b.type),
      );
      if (typeDiff !== 0) return typeDiff;
      const trackDiff = compareTrackIds(a.trackId, b.trackId);
      if (trackDiff !== 0) return trackDiff;
      return (a.timeSec ?? 0) - (b.timeSec ?? 0);
    }

    // "newest"
    const msa = parseTimestampMs(a.timestamp);
    const msb = parseTimestampMs(b.timestamp);
    if (msa !== null && msb !== null && msa !== msb) return msb - msa;
    const ta = a.timeSec ?? -1;
    const tb = b.timeSec ?? -1;
    if (ta !== tb) return tb - ta;
    const fa = a.frameIdx ?? -1;
    const fb = b.frameIdx ?? -1;
    if (fa !== fb) return fb - fa;
    if (a.source !== b.source) return a.source === "live" ? -1 : 1;
    return compareTrackIds(a.trackId, b.trackId);
  });
}

/**
 * Group evidence items by (source, sourceId, trackId) for per-worker inspection.
 */
export function groupEvidenceByTrack(
  items: EvidenceItem[],
): EvidenceTrackGroup[] {
  const groups = new Map<string, EvidenceTrackGroup>();

  for (const item of items) {
    const key = `${item.source}::${item.sourceId}::${item.trackId}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        trackId: item.trackId,
        source: item.source,
        sourceId: item.sourceId,
        items: [],
        pairCount: 0,
        violationTypes: [],
      };
      groups.set(key, group);
    }
    group.items.push(item);
    if (isBeforeAfterPair(item)) {
      group.pairCount += 1;
    }
    const norm = normalizeViolationType(item.type);
    if (!group.violationTypes.includes(norm)) {
      group.violationTypes.push(norm);
    }
  }

  return Array.from(groups.values());
}

/**
 * Format seconds as mm:ss.s (e.g. 01:23.4).
 */
export function formatTimeSec(sec: number | undefined): string {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec < 0) return "00:00.0";
  const mins = Math.floor(sec / 60);
  const rem = sec - mins * 60;
  return `${String(mins).padStart(2, "0")}:${rem.toFixed(1).padStart(4, "0")}`;
}

export function extractAssociationPpeStatus(assoc: PpeAssociationItem): {
  trackId: string;
  helmetOk: boolean;
  helmetConf?: number;
  vestOk: boolean;
  vestConf?: number;
  missing: string[];
} {
  const trackId = String(assoc.person_track_id ?? assoc.track_id ?? "-");
  const missing = Array.isArray(assoc.missing) ? assoc.missing : [];

  const helmetVal = assoc.helmet;
  const helmetOk =
    typeof helmetVal === "boolean"
      ? helmetVal
      : helmetVal
        ? Boolean(helmetVal.matched ?? helmetVal.present ?? true)
        : !missing.includes("no_helmet") && !missing.includes("helmet");
  const helmetConf = typeof helmetVal === "object" && helmetVal ? helmetVal.conf : undefined;

  const vestVal = assoc.safety_vest ?? assoc.vest;
  const vestOk =
    typeof vestVal === "boolean"
      ? vestVal
      : vestVal
        ? Boolean(vestVal.matched ?? vestVal.present ?? true)
        : !missing.includes("no_safety_vest") && !missing.includes("safety_vest") && !missing.includes("vest");
  const vestConf = typeof vestVal === "object" && vestVal ? vestVal.conf : undefined;

  return { trackId, helmetOk, helmetConf, vestOk, vestConf, missing };
}

export function formatViolationLabel(type: string): string {
  const normalized = normalizeViolationType(type);
  if (normalized === "NO_HELMET") return "Thiếu mũ bảo hộ (NO_HELMET)";
  if (normalized === "NO_VEST") return "Thiếu áo phản quang (NO_VEST)";
  if (normalized === "RESTRICTED_AREA") return "Vùng nguy hiểm (RESTRICTED_AREA)";
  return type;
}
