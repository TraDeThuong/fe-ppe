/**
 * Contract AI Metrics & Model Governance theo Backend smart-ppe-reporting-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-reporting-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-reporting-service/src/modules/reporting/reporting.dto.ts
 * - Routes: smart-ppe-reporting-service/src/modules/reporting/reporting.route.ts
 */

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

export const AI_MODEL_TYPE = {
  OBJECT_DETECTION: "OBJECT_DETECTION",
  TRACKING: "TRACKING",
  CLASSIFICATION: "CLASSIFICATION",
  // Backward-compatibility aliases
  DETECTION: "OBJECT_DETECTION",
  SEGMENTATION: "CLASSIFICATION",
} as const;

export type AiModelType = (typeof AI_MODEL_TYPE)[keyof typeof AI_MODEL_TYPE];

export const AI_MODEL_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DEPRECATED: "DEPRECATED",
  ARCHIVED: "INACTIVE", // UI alias
} as const;

export type AiModelStatus = (typeof AI_MODEL_STATUS)[keyof typeof AI_MODEL_STATUS];

export const AI_MODEL_VERSION_STATUS = {
  DEVELOPMENT: "DEVELOPMENT",
  STAGING: "STAGING",
  DEPLOYED: "DEPLOYED",
  ARCHIVED: "ARCHIVED",
  // Backward-compatibility aliases
  ACTIVE: "DEPLOYED",
  CANDIDATE: "STAGING",
  FAILED: "ARCHIVED",
} as const;

export type AiModelVersionStatus =
  (typeof AI_MODEL_VERSION_STATUS)[keyof typeof AI_MODEL_VERSION_STATUS];

export const AI_MODEL_FRAMEWORK = {
  TENSORRT: "TENSORRT",
  ONNX: "ONNX",
  PYTORCH: "PYTORCH",
  OPENVINO: "OPENVINO",
} as const;

export type AiModelFramework =
  (typeof AI_MODEL_FRAMEWORK)[keyof typeof AI_MODEL_FRAMEWORK];

// ============================================================================
// 2. AI PERFORMANCE TELEMETRY & CONFUSION MATRIX
// ============================================================================

export interface PerClassMetric {
  className: "PERSON" | "HARD_HAT" | "SAFETY_VEST" | "NO_HELMET" | "NO_VEST" | string;
  precision: number;
  recall: number;
  f1Score: number;
  sampleCount: number;
}

export interface ConfusionMatrixDto {
  classes: string[];
  matrix: number[][];
}

export interface LatencyDataPoint {
  timestamp: string;
  latencyMs: number;
  fps: number;
  p95LatencyMs?: number | null;
  e2eAlertLatencyMs?: number | null;
}

export interface AiPerformanceDto {
  modelName: string;
  version: string;
  mAP50: number | null;
  mAP50_95: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  averageLatencyMs: number | null;
  p95LatencyMs?: number | null;
  e2eAlertLatencyMs?: number | null;
  averageFps: number | null;
  totalFramesProcessed: number | null;
  perClassMetrics: PerClassMetric[];
  confusionMatrix: ConfusionMatrixDto;
  latencyHistory: LatencyDataPoint[];
}

export interface AiPerformanceStatDto {
  id: string;
  cameraId: string;
  modelVersionId?: string | null;
  statDate: string;
  avgFps: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs?: number | null;
  e2eAlertLatencyMs?: number | null;
  totalFrames: string;
}

export type AiPerformanceResponse =
  | { kind: "rows"; rows: AiPerformanceStatDto[] }
  | { kind: "summary"; summary: AiPerformanceDto };

export interface RecordAiPerformanceDto {
  cameraId: string;
  modelVersionId?: string;
  statDate?: string;
  fps: number;
  latencyMs: number;
  p95LatencyMs?: number;
  e2eAlertLatencyMs?: number;
  frameCount?: number;
}

export interface AiPerformanceFilter {
  modelId?: string;
  versionId?: string;
  siteId?: string;
  cameraId?: string;
  cameraCode?: string;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================================================
// 3. AI MODEL GOVERNANCE & VERSIONS
// ============================================================================

export interface AiModelDeploySyncResultDto {
  status: "SYNCED" | "EVENT_PUBLISHED" | "FAILED" | "SKIPPED" | string;
  channel: "HTTP_AND_REDIS" | "HTTP" | "REDIS" | "NONE" | string;
  synced: boolean;
  eventName: string;
  targetUrl?: string;
  httpStatus?: number | null;
  redisPublished?: boolean;
  syncedAt: string;
  message: string;
}

export interface AiModelVersionDto {
  id: string;
  modelId: string;
  modelName?: string | null;
  model?: {
    id: string;
    name: string;
    code: string;
    modelType?: AiModelType | string;
    status?: AiModelStatus | string;
  } | null;
  version: string;
  modelPath?: string | null;
  framework: string;
  inputSize: string;
  status: AiModelVersionStatus | string;
  metrics?: {
    modelName?: string;
    precision?: number;
    recall?: number;
    f1?: number;
    f1Score?: number;
    mAP50?: number;
    mAP95?: number;
    mAP50_95?: number;
    fps?: number;
    latencyMs?: number;
    p95LatencyMs?: number;
    e2eAlertLatencyMs?: number;
    sizeMb?: number;
    sampleCount?: number;
    totalFramesProcessed?: number;
    perClassMetrics?: PerClassMetric[];
    confusionMatrix?: ConfusionMatrixDto;
    latencyHistory?: LatencyDataPoint[];
    [key: string]: unknown;
  } | null;
  deployedAt?: string | null;
  createdAt: string;
  aiRuntimeSync?: AiModelDeploySyncResultDto;
}

export interface AiModelDto {
  id: string;
  name: string;
  code: string;
  modelType: AiModelType | string;
  description?: string | null;
  status: AiModelStatus | string;
  createdAt: string;
  updatedAt: string;
  versions?: AiModelVersionDto[];
}

export interface CreateAiModelDto {
  name: string;
  code: string;
  modelType: AiModelType | string;
  description?: string;
}

export interface CreateAiModelVersionDto {
  version: string;
  modelPath?: string;
  framework?: string;
  inputSize?: string;
  metrics?: {
    precision?: number;
    recall?: number;
    f1?: number;
    mAP50?: number;
    mAP95?: number;
    fps?: number;
    latencyMs?: number;
    [key: string]: unknown;
  };
}
