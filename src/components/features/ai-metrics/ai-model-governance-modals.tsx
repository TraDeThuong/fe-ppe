"use client";

import { useMemo, useState } from "react";
import { Activity, Cpu, Layers, Plus } from "lucide-react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name: name.trim(),
      code: code.trim(),
      modelType,
      description: description.trim() || undefined,
    });
    setName("");
    setCode("");
    setDescription("");
    onOpenChange(false);
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setCode(e.target.value)}
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

        <div className="flex justify-end gap-2 pt-2">
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
  loading?: boolean;
  onSubmit: (modelId: string, dto: CreateAiModelVersionDto) => Promise<unknown>;
}

export function CreateModelVersionModal({
  open,
  onOpenChange,
  models,
  loading = false,
  onSubmit,
}: CreateModelVersionModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [version, setVersion] = useState("1.0.0");
  const [modelPath, setModelPath] = useState("models/best.pt");
  const [framework, setFramework] = useState("PyTorch");
  const [inputSize, setInputSize] = useState("640x640");
  const [mAP50, setMAP50] = useState("0.88");
  const [precision, setPrecision] = useState("0.86");
  const [recall, setRecall] = useState("0.84");
  const [latencyMs, setLatencyMs] = useState("18");

  const modelOptions: SelectOption[] = useMemo(
    () => models.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` })),
    [models],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = modelId || models[0]?.id;
    if (!targetId) return;
    await onSubmit(targetId, {
      version: version.trim(),
      modelPath: modelPath.trim() || undefined,
      framework: framework.trim() || "PyTorch",
      inputSize: inputSize.trim() || "640x640",
      metrics: {
        mAP50: Number(mAP50) || undefined,
        precision: Number(precision) || undefined,
        recall: Number(recall) || undefined,
        latencyMs: Number(latencyMs) || undefined,
      },
    });
    onOpenChange(false);
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">AI Model *</label>
            <Select
              size="sm"
              options={modelOptions}
              value={modelId || models[0]?.id || ""}
              onValueChange={setModelId}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Version (SemVer) *
            </label>
            <Input
              required
              pattern="^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
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
              onChange={(e) => setInputSize(e.target.value)}
              placeholder="640x640"
            />
          </div>
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-foreground">
              Weight Path (models/... or s3://...)
            </label>
            <Input
              value={modelPath}
              onChange={(e) => setModelPath(e.target.value)}
              placeholder="models/yolo11_ppe.pt"
            />
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

        <div className="flex justify-end gap-2 pt-2">
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
  const { data: camerasData } = useCameras({ limit: 100 });
  const cameras = camerasData?.items ?? [];

  const [cameraId, setCameraId] = useState("");
  const [modelVersionId, setModelVersionId] = useState("");
  const [fps, setFps] = useState("24");
  const [latencyMs, setLatencyMs] = useState("22");
  const [frameCount, setFrameCount] = useState("1000");

  const cameraOptions: SelectOption[] = useMemo(
    () => cameras.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [cameras],
  );

  const versionOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: isVi ? "Phiên bản đang Active" : "Active Version" },
      ...models.flatMap((m) =>
        (m.versions || []).map((v) => ({
          value: v.id,
          label: `${m.name} v${v.version}`,
        })),
      ),
    ],
    [models, isVi],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCam = cameraId || cameras[0]?.id;
    if (!targetCam) return;
    await onSubmit({
      cameraId: targetCam,
      modelVersionId: modelVersionId || undefined,
      fps: Number(fps),
      latencyMs: Number(latencyMs),
      frameCount: Number(frameCount) || 1,
    });
    onOpenChange(false);
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
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">Camera *</label>
          <Select
            size="sm"
            options={cameraOptions}
            value={cameraId || cameras[0]?.id || ""}
            onValueChange={setCameraId}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Phiên bản AI Model" : "Model Version"}
          </label>
          <Select
            size="sm"
            options={versionOptions}
            value={modelVersionId}
            onValueChange={setModelVersionId}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">FPS (1–240)</label>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="gap-1.5">
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
                        v{v.version}
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

