"use client";

import { useState } from "react";
import { Play, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Switch, Textarea } from "@/components/ui/form";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  TriggerDemoJobPayload,
  TriggerDemoJobResponseDto,
} from "@/types";

export interface JobTriggerPlaygroundProps {
  onTrigger: (
    apiKey: string,
    payload: TriggerDemoJobPayload,
  ) => Promise<TriggerDemoJobResponseDto>;
  loading?: boolean;
}

export function JobTriggerPlayground({
  onTrigger,
  loading = false,
}: JobTriggerPlaygroundProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [apiKey, setApiKey] = useState("");
  const [taskName, setTaskName] = useState("sync_safety_report");
  const [dataJson, setDataJson] = useState(
    '{\n  "siteCode": "SITE-01",\n  "requestedBy": "erp"\n}',
  );
  const [simulateError, setSimulateError] = useState(false);
  const [result, setResult] = useState<TriggerDemoJobResponseDto | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error(isVi ? "Vui lòng nhập X-API-Key" : "Please enter an X-API-Key");
      return;
    }

    let parsedData: Record<string, string | number | boolean | null> = {};
    try {
      const parsed = JSON.parse(dataJson || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Payload must be a flat JSON object");
      }
      parsedData = parsed;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isVi
            ? "JSON payload không hợp lệ"
            : "Invalid JSON payload",
      );
      return;
    }

    try {
      const res = await onTrigger(apiKey.trim(), {
        taskName: taskName.trim(),
        data: parsedData,
        simulateError,
      });
      setResult(res);
      toast.success(
        isVi
          ? `Đã kích hoạt job (${res.webhooksNotified} webhook được thông báo)`
          : `Job triggered (${res.webhooksNotified} webhooks notified)`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : "Failed to trigger demo job");
      toast.error(msg);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border/30 bg-surface p-5 shadow-nm-sm lg:col-span-7"
      >
        <div className="flex items-center gap-2.5 border-b border-border/20 pb-3">
          <Terminal className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {isVi
                ? "Kiểm thử Callback Job qua X-API-Key"
                : "API Key Job Callback Playground"}
            </h3>
            <p className="text-xs text-muted-foreground">
              POST /api/v1/integration/jobs/trigger
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            X-API-Key *
          </label>
          <Input
            required
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ak_live_..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Tên tác vụ (taskName) *" : "Task Name *"}
          </label>
          <Input
            required
            maxLength={50}
            pattern="^[a-zA-Z0-9_-]+$"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="sync_safety_report"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Dữ liệu JSON phẳng (tối đa 50 trường)" : "Flat JSON Data (max 50 keys)"}
          </label>
          <Textarea
            rows={5}
            value={dataJson}
            onChange={(e) => setDataJson(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl p-3 shadow-nm-inset">
          <div>
            <p className="text-xs font-bold text-foreground">
              {isVi ? "Giả lập lỗi (simulateError)" : "Simulate Failure"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isVi
                ? "Phát sự kiện job.failed thay vì job.completed"
                : "Emit job.failed webhook event instead of job.completed"}
            </p>
          </div>
          <Switch checked={simulateError} onCheckedChange={setSimulateError} />
        </div>

        <Button type="submit" variant="primary" disabled={loading} className="gap-2">
          <Play className="h-4 w-4" />
          <span>{isVi ? "Gửi Yêu cầu Trigger" : "Send Trigger Request"}</span>
        </Button>
      </form>

      <div className="rounded-2xl border border-border/30 bg-surface p-5 shadow-nm-sm lg:col-span-5 space-y-3">
        <h4 className="text-sm font-bold text-foreground">
          {isVi ? "Kết quả Phản hồi (202 Accepted)" : "Response Output"}
        </h4>
        {!result ? (
          <div className="rounded-2xl p-6 text-center text-xs text-muted-foreground shadow-nm-inset">
            {isVi
              ? "Nhập X-API-Key hợp lệ và bấm gửi để kiểm tra luồng webhook callback."
              : "Provide a valid X-API-Key and trigger a job to inspect the response."}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl p-4 shadow-nm-inset">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Status</span>
              <Badge variant={result.status === "COMPLETED" ? "success" : "danger"}>
                {result.status}
              </Badge>
            </div>
            <pre className="overflow-auto font-mono text-xs text-foreground">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

