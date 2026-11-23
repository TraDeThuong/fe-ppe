"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertCircle, Cpu, Info, Layers, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useAiModelDetail } from "@/hooks/ai-metrics";
import { useCameras } from "@/hooks/cameras";
import { useLocale } from "@/providers/locale-provider";
import type {
  AiModelDto,
  CreateAiModelDto,
  CreateAiModelVersionDto,
  RecordAiPerformanceDto,
} from "@/types";

export const MODEL_CODE_REGEX = /^[a-zA-Z0-9._-]+$/;
export const SEMVER_REGEX = /^v?\d+\.\d+\.\d+$/;
export const INPUT_SIZE_REGEX = /^\d+x\d+$/i;
export const MODEL_PATH_REGEX =
  /^(s3:\/\/[a-zA-Z0-9_-]+\/|models\/)(?!.*\.\.)[a-zA-Z0-9._/-]+\.(pt|onnx|engine|tflite|bin)$/i;

export function formatVersionTag(version: string): string {
  const clean = version.trim().replace(/^v/i, "");
  return clean ? `v${clean}` : version;
}

export function suggestNextVersion(model?: AiModelDto): string {
  const existing = (model?.versions ?? []).map((v) => v.version.trim());
  if (existing.length === 0) return "1.0.0";

  const existingSet = new Set(existing.map((v) => v.replace(/^v/i, "")));
  let best: [number, number, number] | null = null;

  for (const raw of existing) {
    const match = raw.match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
    if (!match) continue;
    const tuple: [number, number, number] = [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    ];
    if (
      !best ||
      tuple[0] > best[0] ||
      (tuple[0] === best[0] && tuple[1] > best[1]) ||
      (tuple[0] === best[0] && tuple[1] === best[1] && tuple[2] > best[2])
    ) {
      best = tuple;
    }
  }

  if (!best) return "1.0.0";

  let [major, minor, patch] = best;
  let candidate = `${major}.${minor}.${patch + 1}`;
  while (existingSet.has(candidate)) {
    patch += 1;
    candidate = `${major}.${minor}.${patch + 1}`;
  }
  return candidate;
}

function getTodayVietnamDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export interface CreateAiModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (dto: CreateAiModelDto) => Promise<unknown>;
}

const MODEL_TYPE_OPTIONS: SelectOption[] = [
  { value: "OBJECT_DETECTION", label: "OBJECT_DETECTION" },
  { value: "TRACKING", label: "TRACKING" },
  { value: "CLASSIFICATION", label: "CLASSIFICATION" },
];

export function CreateAiModelModal({
  open,
  onOpenChange,
  loading = false,
  onSubmit,
}: CreateAiModelModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [modelType, setModelType] = useState("OBJECT_DETECTION");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setCode("");
      setModelType("OBJECT_DETECTION");
      setDescription("");
      setFormError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (trimmedName.length < 2) {
      setFormError(
        isVi
          ? "Tên mô hình phải có ít nhất 2 ký tự (không tính khoảng trắng)."
          : "Model name must be at least 2 non-whitespace characters.",
      );
      return;
    }

    if (trimmedCode.length < 2 || !MODEL_CODE_REGEX.test(trimmedCode)) {
      setFormError(
        isVi
          ? "Mã định danh chỉ gồm chữ cái, số và các ký tự . _ - (tối thiểu 2 ký tự)."
          : "Model code must be at least 2 characters (letters, digits, '.', '_', '-').",
      );
      return;
    }

    setFormError(null);
    try {
      await onSubmit({
        name: trimmedName,
        code: trimmedCode,
        modelType,
        description: description.trim() || undefined,
      });
      setName("");
      setCode("");
      setModelType("OBJECT_DETECTION");
      setDescription("");
      onOpenChange(false);
    } catch {
      // Lỗi đã được hiển thị qua mutation toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isVi ? "Đăng ký Mô hình AI mới" : "Register New AI Model"}
      description="POST /api/v1/ai-models"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Tên mô hình *" : "Model Name *"}
            </label>
            <Input
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="YOLOv11 PPE Detector"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Mã định danh *" : "Model Code *"}
            </label>
            <Input
              required
              minLength={2}
              maxLength={50}
              pattern="^[a-zA-Z0-9._-]+$"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="yolo11-ppe"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Loại mô hình" : "Model Type"}
          </label>
          <Select
            size="sm"
            options={MODEL_TYPE_OPTIONS}
            value={modelType}
            onValueChange={setModelType}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Mô tả" : "Description"}
          </label>
          <Textarea
            rows={3}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>{isVi ? "Đăng ký" : "Register"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export interface CreateModelVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: AiModelDto[];
  defaultModelId?: string;
  loading?: boolean;
  onSubmit: (modelId: string, dto: CreateAiModelVersionDto) => Promise<unknown>;
}

export function CreateModelVersionModal({
  open,
  onOpenChange,
  models,
  defaultModelId,
  loading = false,
  onSubmit,
}: CreateModelVersionModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [modelId, setModelId] = useState(defaultModelId || models[0]?.id || "");
  const [version, setVersion] = useState("1.0.0");
  const [modelPath, setModelPath] = useState("models/best.pt");
  const [framework, setFramework] = useState("PyTorch");
  const [inputSize, setInputSize] = useState("640x640");
  const [mAP50, setMAP50] = useState("0.88");
  const [precision, setPrecision] = useState("0.86");
  const [recall, setRecall] = useState("0.84");
  const [latencyMs, setLatencyMs] = useState("18");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => models.find((m) => m.id === (modelId || models[0]?.id)),
    [models, modelId],
  );

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const initialModelId =
        (defaultModelId && models.some((m) => m.id === defaultModelId)
          ? defaultModelId
          : models[0]?.id) ?? "";
      const targetModel = models.find((m) => m.id === initialModelId);
      setModelId(initialModelId);
      setVersion(suggestNextVersion(targetModel));
      setModelPath("models/best.pt");
      setFramework("PyTorch");
      setInputSize("640x640");
      setMAP50("0.88");
      setPrecision("0.86");
      setRecall("0.84");
      setLatencyMs("18");
      setFormError(null);
    }
    wasOpenRef.current = open;
  }, [open, defaultModelId, models]);

  const handleModelChange = (nextId: string) => {
    setModelId(nextId);
    const nextModel = models.find((m) => m.id === nextId);
    setVersion(suggestNextVersion(nextModel));
    setFormError(null);
  };

  const modelOptions: SelectOption[] = useMemo(
    () => models.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` })),
    [models],
  );

  const parseOptionalMetric = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = modelId || models[0]?.id;
    if (!targetId) return;

    const trimmedVersion = version.trim();
    const trimmedPath = modelPath.trim();
    const trimmedInputSize = inputSize.trim() || "640x640";

    if (!SEMVER_REGEX.test(trimmedVersion)) {
      setFormError(
        isVi
          ? "Phiên bản phải theo chuẩn SemVer (ví dụ: 1.0.1 hoặc v1.2.0)."
          : "Version must follow SemVer format (e.g. 1.0.1 or v1.2.0).",
      );
      return;
    }

    const normalizedVersion = trimmedVersion.replace(/^v/i, "");
    const isDuplicate = (selectedModel?.versions ?? []).some(
      (v) => v.version.trim().replace(/^v/i, "") === normalizedVersion,
    );
    if (isDuplicate) {
      setFormError(
        isVi
          ? `Phiên bản ${formatVersionTag(trimmedVersion)} đã tồn tại trên mô hình này. Vui lòng chọn số phiên bản khác.`
          : `Version ${formatVersionTag(trimmedVersion)} already exists for this model.`,
      );
      return;
    }

    if (!INPUT_SIZE_REGEX.test(trimmedInputSize)) {
      setFormError(
        isVi
          ? "Input Size phải có định dạng WxH (ví dụ: 640x640)."
          : "Input size must be in WxH format (e.g. 640x640).",
      );
      return;
    }

    if (!trimmedPath || !MODEL_PATH_REGEX.test(trimmedPath)) {
      setFormError(
        isVi
          ? "Weight Path bắt buộc bắt đầu bằng models/ hoặc s3://<bucket>/ và kết thúc bằng .pt, .onnx, .engine, .tflite hoặc .bin (không chứa '..')."
          : "Weight Path must start with models/ or s3://<bucket>/ and end in .pt, .onnx, .engine, .tflite, or .bin (no '..').",
      );
      return;
    }

    setFormError(null);
    try {
      await onSubmit(targetId, {
        version: normalizedVersion,
        modelPath: trimmedPath,
        framework: framework.trim() || "PyTorch",
        inputSize: trimmedInputSize,
        metrics: {
          mAP50: parseOptionalMetric(mAP50),
          precision: parseOptionalMetric(precision),
          recall: parseOptionalMetric(recall),
          latencyMs: parseOptionalMetric(latencyMs),
        },
      });
      onOpenChange(false);
    } catch {
      // Lỗi đã được hiển thị qua mutation toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isVi ? "Thêm Phiên bản Model (Version)" : "Register Model Version"}
      description="POST /api/v1/ai-models/:id/versions"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">AI Model *</label>
            <Select
              size="sm"
              options={modelOptions}
              value={modelId || models[0]?.id || ""}
              onValueChange={handleModelChange}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Version (SemVer) *
            </label>
            <Input
              required
              pattern="^v?\d+\.\d+\.\d+$"
              value={version}
              onChange={(e) => {
                setVersion(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="1.2.0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-foreground">Framework</label>
            <Input
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="PyTorch / TensorRT"
            />
          </div>
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-foreground">Input Size</label>
            <Input
              pattern="^\d+x\d+$"
              value={inputSize}
              onChange={(e) => {
                setInputSize(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="640x640"
            />
          </div>
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-foreground">
              Weight Path *
            </label>
            <Input
              required
              value={modelPath}
              onChange={(e) => {
                setModelPath(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="models/yolo11_ppe.pt"
            />
            <p className="text-[10px] text-muted-foreground">
              {isVi
                ? "models/... hoặc s3://<bucket>/... (.pt, .onnx, .engine, .tflite, .bin)"
                : "models/... or s3://<bucket>/... (.pt, .onnx, .engine, .tflite, .bin)"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl p-3 shadow-nm-inset sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">mAP@50</label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={mAP50}
              onChange={(e) => setMAP50(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Precision</label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Recall</label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={recall}
              onChange={(e) => setRecall(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Latency (ms)</label>
            <Input
              type="number"
              step="0.1"
              min={0.1}
              value={latencyMs}
              onChange={(e) => setLatencyMs(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={loading || models.length === 0}>
            {isVi ? "Thêm phiên bản" : "Create Version"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export interface RecordAiBenchmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: AiModelDto[];
  loading?: boolean;
  onSubmit: (dto: RecordAiPerformanceDto) => Promise<unknown>;
}

export function RecordAiBenchmarkModal({
  open,
  onOpenChange,
  models,
  loading = false,
  onSubmit,
}: RecordAiBenchmarkModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const {
    data: camerasData,
    isLoading: isCamerasLoading,
  } = useCameras({ limit: 100 }, { enabled: open });
  const cameras = camerasData?.items ?? [];

  const activeDeployedVersion = useMemo(() => {
    for (const m of models) {
      const deployed = (m.versions || []).find((v) => v.status === "DEPLOYED");
      if (deployed) return deployed;
    }
    return null;
  }, [models]);

  const registeredVersions = useMemo(
    () =>
      models.flatMap((m) =>
        (m.versions || []).map((v) => ({
          id: v.id,
          label: `${m.name} ${formatVersionTag(v.version)}`,
        })),
      ),
    [models],
  );

  const todayDate = getTodayVietnamDate();
  const [cameraId, setCameraId] = useState("");
  const [modelVersionId, setModelVersionId] = useState("");
  const [statDate, setStatDate] = useState(todayDate);
  const [fps, setFps] = useState("24");
  const [latencyMs, setLatencyMs] = useState("22");
  const [frameCount, setFrameCount] = useState("1000");

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setCameraId("");
      setStatDate(getTodayVietnamDate());
      setFps("24");
      setLatencyMs("22");
      setFrameCount("1000");
      if (activeDeployedVersion) {
        setModelVersionId("");
      } else if (registeredVersions.length > 0) {
        setModelVersionId(registeredVersions[0].id);
      } else {
        setModelVersionId("");
      }
    }
    wasOpenRef.current = open;
  }, [open, activeDeployedVersion, registeredVersions]);

  const cameraOptions: SelectOption[] = useMemo(
    () => cameras.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [cameras],
  );

  const resolvedCameraId = cameras.some((c) => c.id === cameraId)
    ? cameraId
    : cameras[0]?.id || "";

  const versionOptions: SelectOption[] = useMemo(() => {
    const items: SelectOption[] = [];
    if (activeDeployedVersion) {
      items.push({
        value: "",
        label: isVi
          ? `Phiên bản đang Active (${formatVersionTag(activeDeployedVersion.version)})`
          : `Active Version (${formatVersionTag(activeDeployedVersion.version)})`,
      });
    }
    for (const v of registeredVersions) {
      items.push({ value: v.id, label: v.label });
    }
    return items;
  }, [activeDeployedVersion, registeredVersions, isVi]);

  const effectiveVersionId =
    modelVersionId || activeDeployedVersion?.id || registeredVersions[0]?.id || "";

  const canSubmit = !loading && !isCamerasLoading && Boolean(resolvedCameraId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedCameraId) return;
    const resolvedVersionId = effectiveVersionId || undefined;
    try {
      await onSubmit({
        cameraId: resolvedCameraId,
        modelVersionId: resolvedVersionId,
        statDate: statDate || undefined,
        fps: Number(fps),
        latencyMs: Number(latencyMs),
        frameCount: Number(frameCount) || 1,
      });
      onOpenChange(false);
    } catch {
      // Lỗi đã được hiển thị qua mutation toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isVi ? "Ghi nhận Telemetry Benchmark AI" : "Record AI Performance Telemetry"}
      description="POST /api/v1/statistics/record-ai-performance"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isCamerasLoading && cameras.length === 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {isVi
                ? "Chưa có camera nào để ghi nhận telemetry. Vui lòng tạo ít nhất 1 camera trước."
                : "No cameras available to record telemetry. Please register at least one camera first."}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">Camera *</label>
          <Select
            size="sm"
            disabled={isCamerasLoading || cameras.length === 0}
            placeholder={
              isCamerasLoading
                ? isVi
                  ? "Đang tải danh sách camera..."
                  : "Loading cameras..."
                : isVi
                  ? "Không có camera khả dụng"
                  : "No cameras available"
            }
            options={cameraOptions}
            value={resolvedCameraId}
            onValueChange={setCameraId}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Phiên bản AI Model" : "Model Version"}
            </label>
            <Select
              size="sm"
              disabled={versionOptions.length === 0}
              placeholder={
                isVi ? "Chưa có phiên bản model" : "No registered versions"
              }
              options={versionOptions}
              value={activeDeployedVersion ? modelVersionId : effectiveVersionId}
              onValueChange={setModelVersionId}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              {isVi ? "Ngày thống kê" : "Stat Date"}
            </label>
            <Input
              type="date"
              size="sm"
              max={todayDate}
              value={statDate}
              onChange={(e) => setStatDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">FPS (0.1–240)</label>
            <Input
              type="number"
              step="0.1"
              min={0.1}
              max={240}
              required
              value={fps}
              onChange={(e) => setFps(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Latency (ms)</label>
            <Input
              type="number"
              step="0.1"
              min={0.1}
              max={10000}
              required
              value={latencyMs}
              onChange={(e) => setLatencyMs(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Frames</label>
            <Input
              type="number"
              min={1}
              max={1000000}
              required
              value={frameCount}
              onChange={(e) => setFrameCount(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            {isVi
              ? "Telemetry được cộng dồn trung bình trọng số theo từng Camera mỗi ngày (nếu ghi nhiều lần trong cùng ngày trên 1 camera, hệ thống sẽ gộp vào bản ghi ngày đó)."
              : "Telemetry is aggregated per camera per day using weighted averages (multiple records for the same camera and date merge into that day's row)."}
          </span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit} className="gap-1.5">
            <Activity className="h-4 w-4" />
            <span>{isVi ? "Ghi nhận" : "Record"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export interface ModelDetailModalProps {
  modelId: string | null;
  onClose: () => void;
}

export function ModelDetailModal({ modelId, onClose }: ModelDetailModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { data: model, isLoading } = useAiModelDetail(modelId || "");

  return (
    <Dialog
      open={Boolean(modelId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={model?.name || (isVi ? "Chi tiết Mô hình AI" : "AI Model Detail")}
      description={model ? `${model.code} · ${model.modelType}` : ""}
      size="lg"
    >
      {isLoading ? (
        <div className="h-36 animate-pulse rounded-2xl bg-surface-elevated/40" />
      ) : !model ? (
        <p className="text-xs text-muted-foreground">No model data</p>
      ) : (
        <div className="space-y-4 text-xs">
          {model.description && (
            <p className="rounded-xl p-3 text-muted-foreground shadow-nm-inset">
              {model.description}
            </p>
          )}
          <div className="space-y-2">
            <h5 className="flex items-center gap-1.5 font-bold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              <span>
                {isVi
                  ? `Phiên bản đã đăng ký (${model.versions?.length ?? 0})`
                  : `Registered Versions (${model.versions?.length ?? 0})`}
              </span>
            </h5>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {(model.versions || []).map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/20 bg-surface p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-primary" />
                      <span className="font-mono font-bold text-foreground">
                        {formatVersionTag(v.version)}
                      </span>
                      <Badge variant={v.status === "DEPLOYED" ? "success" : "default"}>
                        {v.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {v.framework} · {v.inputSize} {v.modelPath ? `· ${v.modelPath}` : ""}
                    </p>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    mAP@50:{" "}
                    {typeof v.metrics?.mAP50 === "number"
                      ? `${(v.metrics.mAP50 * 100).toFixed(1)}%`
                      : "--"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
