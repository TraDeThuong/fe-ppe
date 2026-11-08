"use client";

import { useState } from "react";
import { Play, Power } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form/foundation/input";
import { buildCronPayload, getCronParameter } from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobExecutionResult, CronJobItem, TriggerCronJobPayload } from "@/types/cron.types";
import { CronResult } from "./cron-result";

interface Props {
  job: CronJobItem;
  action: "trigger" | "toggle";
  pending: boolean;
  error: string | null;
  blocked: boolean;
  result: CronJobExecutionResult | null;
  onConfirm: (payload: TriggerCronJobPayload) => Promise<void>;
  onClose: () => void;
}

export function CronJobDialog({ job, action, pending, error, blocked, result, onConfirm, onClose }: Props) {
  const { t } = useLocale();
  const field = action === "trigger" ? getCronParameter(job.name) : null;
  const [value, setValue] = useState(String(field?.defaultValue ?? ""));
  const [attempted, setAttempted] = useState(false);
  const payload = buildCronPayload(job.name, value);
  const invalid = action === "trigger" && field && !payload;
  const title = result ? t("cron.result.title") : action === "trigger" ? t("cron.confirmRun") : t(job.isEnabled ? "cron.confirmDisable" : "cron.confirmEnable");
  const confirm = async () => {
    setAttempted(true);
    if (pending || blocked || (action === "trigger" && !payload)) return;
    await onConfirm(action === "trigger" ? payload! : { params: {} });
  };

  return <Modal open onOpenChange={(open) => { if (!open) onClose(); }} title={title} description={t(`cron.jobs.${job.name}`)}
    icon={action === "trigger" ? <Play className="size-5" /> : <Power className="size-5" />}
    preventClose={pending} size="lg"
    footer={<div className="flex flex-wrap justify-end gap-3">
      <Button variant="ghost" disabled={pending} onClick={onClose}>{t(result ? "cron.close" : "cron.cancel")}</Button>
      {!result ? <Button variant={action === "trigger" && job.name.startsWith("cleanup-") ? "danger" : "primary"} disabled={pending || blocked} onClick={() => void confirm()}>{t(pending ? "cron.processing" : "cron.confirm")}</Button> : null}
    </div>}
  >
    <div className="space-y-4">
      <p className="break-all rounded-xl bg-muted/40 p-3 font-mono text-xs text-primary">{job.name}</p>
      {result ? <CronResult result={result} /> : <>
        {action === "trigger" ? <>
          <p className="text-sm leading-relaxed">{t(job.name.startsWith("cleanup-") ? "cron.cleanupImpact" : "cron.digestImpact")}</p>
          {!job.isEnabled ? <p className="text-sm text-muted-foreground">{t("cron.manualWhileDisabled")}</p> : null}
          {field ? <div className="space-y-2">
            <label htmlFor="cron-parameter" className="text-sm font-medium">{t(`cron.params.${field.name}`)}</label>
            <Input id="cron-parameter" type="number" min={field.min} max={field.max} step={1} value={value} disabled={pending || blocked}
              onChange={(event) => setValue(event.target.value)} error={Boolean(attempted && invalid)} aria-describedby="cron-parameter-help" />
            <p id="cron-parameter-help" role={attempted && invalid ? "alert" : undefined} className={`text-xs ${attempted && invalid ? "text-danger" : "text-muted-foreground"}`}>{t("cron.params.range", { min: field.min, max: field.max })}</p>
          </div> : null}
          <p className="text-xs text-muted-foreground">{t("cron.params.manualOnly")}</p>
        </> : <>
          <p className="text-sm">{t("cron.currentSchedule")}: <strong>{t(job.isEnabled ? "cron.enabled" : "cron.disabled")}</strong></p>
          <p className="text-sm leading-relaxed">{t(job.isEnabled ? "cron.disableImpact" : "cron.enableImpact")}</p>
        </>}
        {pending ? <p role="status" className="text-sm text-primary">{t("cron.waitForResponse")}</p> : null}
        {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p> : null}
        {blocked ? <p className="text-xs text-muted-foreground">{t("cron.refreshRequired")}</p> : null}
      </>}
    </div>
  </Modal>;
}
