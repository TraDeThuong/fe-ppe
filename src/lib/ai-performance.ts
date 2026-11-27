import type {
  AiModelDto,
  AiModelVersionDto,
  AiPerformanceDto,
  AiPerformanceFilter,
  AiPerformanceResponse,
  LatencyDataPoint,
} from "@/types";

function metricNumber(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

function roundAverage(sum: number, weight: number) {
  return weight > 0 ? Number((sum / weight).toFixed(2)) : null;
}

export function resolveAiPerformance(
  response: AiPerformanceResponse | undefined,
  filter: Pick<AiPerformanceFilter, "modelId" | "versionId">,
  models: AiModelDto[],
  activeVersion?: AiModelVersionDto | null,
): AiPerformanceDto | null {
  if (response?.kind === "summary") return response.summary;

  const model = filter.modelId
    ? models.find((item) => item.id === filter.modelId)
    : (models.find((item) => item.id === activeVersion?.modelId) ?? models[0]);
  const versions = model?.versions ?? [];
  const matchingActive = activeVersion && (!filter.modelId || activeVersion.modelId === filter.modelId)
    ? activeVersion
    : undefined;
  const version = filter.versionId
    ? (versions.find((item) => item.id === filter.versionId) ??
      (matchingActive?.id === filter.versionId ? matchingActive : undefined))
    : (matchingActive ??
      versions.find((item) => item.status === "DEPLOYED" || item.status === "ACTIVE") ??
      versions[0]);
  const rows = response?.rows ?? [];
  const versionIds = new Set(versions.map((item) => item.id));
  if (version) versionIds.add(version.id);

  const selectedRows = filter.versionId
    ? rows.filter((row) => row.modelVersionId === filter.versionId)
    : filter.modelId
      ? rows.filter((row) => row.modelVersionId && versionIds.has(row.modelVersionId))
      : version && rows.some((row) => row.modelVersionId === version.id)
        ? rows.filter((row) => row.modelVersionId === version.id)
        : rows;

  if (!model && !version && selectedRows.length === 0) return null;

  let frames: number | null = null;
  let totalWeight = 0;
  let latencySum = 0;
  let fpsSum = 0;
  let p95Sum = 0;
  let p95Weight = 0;
  let e2eSum = 0;
  let e2eWeight = 0;
  const days = new Map<
    string,
    {
      weight: number;
      latency: number;
      fps: number;
      p95Sum: number;
      p95Weight: number;
      e2eSum: number;
      e2eWeight: number;
    }
  >();

  for (const row of selectedRows) {
    const count = metricNumber(row.totalFrames);
    const latency = metricNumber(row.avgLatencyMs);
    const fps = metricNumber(row.avgFps);
    const p95 = metricNumber(row.p95LatencyMs);
    const e2e = metricNumber(row.e2eAlertLatencyMs);
    if (count !== null) frames = (frames ?? 0) + count;

    const weight = count !== null && count > 0 ? count : 1;
    if (p95 !== null) {
      p95Sum += p95 * weight;
      p95Weight += weight;
    }
    if (e2e !== null) {
      e2eSum += e2e * weight;
      e2eWeight += weight;
    }

    if (latency === null || fps === null) continue;

    totalWeight += weight;
    latencySum += latency * weight;
    fpsSum += fps * weight;

    const date = String(row.statDate).slice(0, 10);
    const daily = days.get(date) ?? {
      weight: 0,
      latency: 0,
      fps: 0,
      p95Sum: 0,
      p95Weight: 0,
      e2eSum: 0,
      e2eWeight: 0,
    };
    daily.weight += weight;
    daily.latency += latency * weight;
    daily.fps += fps * weight;
    if (p95 !== null) {
      daily.p95Sum += p95 * weight;
      daily.p95Weight += weight;
    }
    if (e2e !== null) {
      daily.e2eSum += e2e * weight;
      daily.e2eWeight += weight;
    }
    days.set(date, daily);
  }

  const latencyHistory: LatencyDataPoint[] = Array.from(days.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, daily]) => ({
      timestamp: date.slice(5),
      latencyMs: Number((daily.latency / daily.weight).toFixed(2)),
      fps: Number((daily.fps / daily.weight).toFixed(2)),
      ...(daily.p95Weight > 0
        ? { p95LatencyMs: Number((daily.p95Sum / daily.p95Weight).toFixed(2)) }
        : {}),
      ...(daily.e2eWeight > 0
        ? { e2eAlertLatencyMs: Number((daily.e2eSum / daily.e2eWeight).toFixed(2)) }
        : {}),
    }));

  const metrics = version?.metrics;
  const matrix = metrics?.confusionMatrix;
  const precision = metricNumber(metrics?.precision);
  const recall = metricNumber(metrics?.recall);
  const derivedF1 = precision !== null && recall !== null
    ? precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
    : null;

  return {
    modelName: model?.name || version?.modelName || metrics?.modelName || version?.version || "",
    version: version?.version || "",
    mAP50: metricNumber(metrics?.mAP50),
    mAP50_95: metricNumber(metrics?.mAP50_95 ?? metrics?.mAP95),
    precision,
    recall,
    f1Score: metricNumber(metrics?.f1Score ?? metrics?.f1) ?? derivedF1,
    averageLatencyMs: roundAverage(latencySum, totalWeight),
    p95LatencyMs: roundAverage(p95Sum, p95Weight),
    e2eAlertLatencyMs: roundAverage(e2eSum, e2eWeight),
    averageFps: roundAverage(fpsSum, totalWeight),
    totalFramesProcessed: frames,
    perClassMetrics: Array.isArray(metrics?.perClassMetrics) ? metrics.perClassMetrics : [],
    confusionMatrix: matrix && Array.isArray(matrix.classes) && Array.isArray(matrix.matrix)
      ? matrix
      : { classes: [], matrix: [] },
    latencyHistory,
  };
}
