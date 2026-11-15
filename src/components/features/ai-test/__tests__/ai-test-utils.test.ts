import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFrameLookupMap,
  computePersonTracks,
  extractJobViolationsSummary,
  filterEvidenceItems,
  findFrameEntryForTime,
  groupEvidenceByTrack,
  mergeContiguousRanges,
  normalizeJobEvidences,
  normalizeLiveEvidences,
  parseNdjsonLog,
  queryEvidenceItems,
  resolveEvidenceImageUrl,
  sortEvidenceItems,
} from "../ai-test-utils";
import type { EvidenceItem, FrameLogEntry, JobMeta } from "@/types/ai-test.types";

test("parseNdjsonLog parses valid lines, skips blank/corrupt lines, and sorts by frame_idx", () => {
  const raw = [
    JSON.stringify({ frame_idx: 10, time_sec: 0.36, persons: [] }),
    "",
    "{broken-json-tail",
    JSON.stringify({ frame_idx: 1, time_sec: 0.0, persons: [{ track_id: 1 }] }),
    JSON.stringify({ frame_idx: 5, time_sec: 0.16, persons: [] }),
  ].join("\n");

  const entries = parseNdjsonLog(raw);
  assert.deepEqual(
    entries.map((e) => e.frame_idx),
    [1, 5, 10],
  );
});

test("findFrameEntryForTime maps video currentTime*fps+1 and falls back to nearest prior frame", () => {
  const entries: FrameLogEntry[] = [
    { frame_idx: 1, time_sec: 0.0 },
    { frame_idx: 4, time_sec: 0.12 },
    { frame_idx: 7, time_sec: 0.24 },
  ];
  const map = buildFrameLookupMap(entries);

  // At t=0.12s, fps=25 -> floor(3) + 1 = frame 4 (exact)
  const exact = findFrameEntryForTime(entries, map, 0.12, 25);
  assert.equal(exact.targetFrameIdx, 4);
  assert.equal(exact.entry?.frame_idx, 4);

  // At t=0.20s, fps=25 -> frame 6 -> falls back to preceding logged frame 4 (stride=3)
  const fallback = findFrameEntryForTime(entries, map, 0.2, 25);
  assert.equal(fallback.targetFrameIdx, 6);
  assert.equal(fallback.entry?.frame_idx, 4);
});

test("mergeContiguousRanges merges contiguous frame numbers into start/end spans", () => {
  assert.deepEqual(mergeContiguousRanges([1, 2, 3, 5, 6, 6, 9]), [
    { start: 1, end: 3 },
    { start: 5, end: 6 },
    { start: 9, end: 9 },
  ]);
  assert.deepEqual(mergeContiguousRanges([]), []);
});

test("computePersonTracks and extractJobViolationsSummary aggregate track spans and violations", () => {
  const entries: FrameLogEntry[] = [
    {
      frame_idx: 1,
      time_sec: 0.0,
      persons: [{ track_id: 1 }, { track_id: 2 }],
      violations: [],
    },
    {
      frame_idx: 2,
      time_sec: 0.04,
      persons: [{ track_id: 1 }],
      violations: [{ track_id: 1, type: "no_helmet", sustained_sec: 1.5 }],
    },
    {
      frame_idx: 3,
      time_sec: 0.08,
      persons: [{ track_id: 1 }],
      violations: [{ track_id: 1, type: "no_helmet", sustained_sec: 2.2 }],
    },
    {
      frame_idx: 5,
      time_sec: 0.16,
      persons: [{ track_id: 1 }],
      violations: [],
    },
  ];

  const tracks = computePersonTracks(entries, 25);
  assert.equal(tracks.length, 2);
  assert.equal(tracks[0].trackId, "1");
  assert.deepEqual(tracks[0].ranges, [
    { start: 1, end: 3 },
    { start: 5, end: 5 },
  ]);
  assert.deepEqual(tracks[0].violationRanges, [{ start: 2, end: 3 }]);
  assert.deepEqual(tracks[0].violationTypes, ["no_helmet"]);

  const violations = extractJobViolationsSummary(entries, 25);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].startFrame, 2);
  assert.equal(violations[0].endFrame, 3);
  assert.equal(violations[0].maxDurationSec, 2.2);
});

test("resolveEvidenceImageUrl, normalize, and filterEvidenceItems handle job and live recent_violations pairs", () => {
  assert.equal(
    resolveEvidenceImageUrl("ev_01.jpg", "job", "job-123"),
    "/api/jobs/job-123/evidence/ev_01.jpg",
  );
  assert.equal(
    resolveEvidenceImageUrl("/api/live/evidence/snap.jpg", "live", "CAM-01"),
    "/api/live/evidence/snap.jpg",
  );

  const meta: JobMeta = {
    job_id: "job-1",
    evidences: [
      {
        evidence_id: "ev-a",
        track_id: 3,
        type: "no_helmet",
        before_filename: "before_a.jpg",
        after_filename: "after_a.jpg",
        time_sec: 4.5,
      },
    ],
  };
  const live = normalizeLiveEvidences("CAM-01", {
    camera_id: "CAM-01",
    recent_violations: [
      {
        event_id: "04afb4385088",
        camera_id: "CAM-01",
        person_id: 1,
        canonical_person_id: 7,
        violation_type: "NO_VEST",
        confirmed_t: 8.2,
        frame: 205,
        snapshot_url: "/api/live/evidence/04afb4385088.jpg",
        reference_snapshot_url: "/api/live/evidence/04afb4385088_ref.jpg",
      },
    ],
  });

  const combined = [...normalizeJobEvidences("job-1", meta, []), ...live];
  assert.equal(combined.length, 2);
  assert.equal(combined[0].beforeUrl, "/api/jobs/job-1/evidence/before_a.jpg");
  assert.equal(combined[0].afterUrl, "/api/jobs/job-1/evidence/after_a.jpg");
  assert.equal(combined[1].beforeUrl, "/api/live/evidence/04afb4385088_ref.jpg");
  assert.equal(combined[1].afterUrl, "/api/live/evidence/04afb4385088.jpg");
  assert.equal(combined[1].trackId, "7");

  assert.equal(filterEvidenceItems(combined, "ALL").length, 2);
  assert.equal(filterEvidenceItems(combined, "NO_HELMET").length, 1);
  assert.equal(filterEvidenceItems(combined, "NO_VEST").length, 1);
});

test("queryEvidenceItems, sortEvidenceItems, and groupEvidenceByTrack filter, sort, and group cleanly", () => {
  const sample: EvidenceItem[] = [
    {
      id: "1",
      source: "job",
      sourceId: "job-abc",
      type: "NO_VEST",
      trackId: "12",
      frameIdx: 120,
      timeSec: 4.8,
      beforeUrl: "/b1.jpg",
      afterUrl: "/a1.jpg",
      primaryUrl: "/a1.jpg",
    },
    {
      id: "2",
      source: "live",
      sourceId: "CAM-02",
      type: "NO_HELMET",
      trackId: "2",
      frameIdx: 300,
      timeSec: 12.0,
      beforeUrl: null,
      afterUrl: "/a2.jpg",
      primaryUrl: "/a2.jpg",
    },
    {
      id: "3",
      source: "job",
      sourceId: "job-abc",
      type: "RESTRICTED_AREA",
      trackId: "2",
      frameIdx: 60,
      timeSec: 2.4,
      beforeUrl: "/b3.jpg",
      afterUrl: "/a3.jpg",
      primaryUrl: "/a3.jpg",
    },
  ];

  // Pair filter + search
  assert.equal(queryEvidenceItems(sample, { pairMode: "pair" }).length, 2);
  assert.equal(queryEvidenceItems(sample, { pairMode: "single" }).length, 1);
  assert.equal(queryEvidenceItems(sample, { search: "cam-02" }).length, 1);
  assert.equal(queryEvidenceItems(sample, { trackId: "2" }).length, 2);

  // Sorting
  assert.deepEqual(
    sortEvidenceItems(sample, "newest").map((i) => i.id),
    ["2", "1", "3"],
  );
  assert.deepEqual(
    sortEvidenceItems(sample, "time_asc").map((i) => i.id),
    ["3", "1", "2"],
  );
  assert.deepEqual(
    sortEvidenceItems(sample, "track_asc").map((i) => i.id),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    sortEvidenceItems(sample, "type_asc").map((i) => i.id),
    ["2", "1", "3"],
  );

  // Grouping separates live Track #2 from job Track #2
  const groups = groupEvidenceByTrack(sortEvidenceItems(sample, "time_asc"));
  assert.equal(groups.length, 3);
  assert.equal(groups[0].trackId, "2");
  assert.equal(groups[0].source, "job");
  assert.equal(groups[0].pairCount, 1);
});

