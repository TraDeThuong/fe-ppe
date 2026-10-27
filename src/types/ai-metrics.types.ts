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
  DETECTION: "DETECTION",
  CLASSIFICATION: "CLASSIFICATION",
  SEGMENTATION: "SEGMENTATION",
} as const;

export type AiModelType = (typeof AI_MODEL_TYPE)[keyof typeof AI_MODEL_TYPE];

export const AI_MODEL_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export type AiModelStatus = (typeof AI_MODEL_STATUS)[keyof typeof AI_MODEL_STATUS];

export const AI_MODEL_VERSION_STATUS = {
  ACTIVE: "ACTIVE",
  CANDIDATE: "CANDIDATE",
  ARCHIVED: "ARCHIVED",
  FAILED: "FAILED",
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
}

export interface AiPerformanceDto {
  modelName: string;
  version: string;
  mAP50: number;
  mAP50_95: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageLatencyMs: number;
  averageFps: number;
  totalFramesProcessed: number;
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
  totalFrames: string;
}

export interface RecordAiPerformanceDto {
  cameraId: string;
  modelVersionId?: string;
  statDate?: string;
  fps: number;
  latencyMs: number;
  frameCount?: number;
}

export interface AiPerformanceFilter {
  modelId?: string;
  versionId?: string;
  siteId?: string;
  cameraCode?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================================================
// 3. AI MODEL GOVERNANCE & VERSIONS
// ============================================================================

export interface AiModelVersionDto {
  id: string;
  modelId: string;
  version: string;
  modelPath?: string | null;
  framework: string;
  inputSize: string;
  status: AiModelVersionStatus | string;
  metrics?: {
    precision?: number;
    recall?: number;
    f1?: number;
    mAP50?: number;
    mAP95?: number;
    fps?: number;
    latencyMs?: number;
    sampleCount?: number;
    [key: string]: unknown;
  } | null;
  deployedAt?: string | null;
  createdAt: string;
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
