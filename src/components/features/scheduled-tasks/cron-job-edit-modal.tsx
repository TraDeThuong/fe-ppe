import { useCallback, useId, useState, type FormEvent } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form/foundation/form-field";
import { Input } from "@/components/ui/form/foundation/input";
import { Textarea } from "@/components/ui/form/foundation/textarea";
import { Select } from "@/components/ui/form/selection-controls/select";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/axios";
import {
  CRON_SCHEDULE_FREQUENCIES,
  formatCronSchedule,
  getCronEditChanges,
  getCronHourOptions,
  getCronJobSchedule,
  getCronParameter,
  getCronParameterValue,
} from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobItem, CronJobScheduleDto, UpdateCronJobPayload } from "@/types/cron.types";

const weekdays = [1, 2, 3, 4, 5, 6, 0];

function numberOptions(count: number, start = 0, pad = false) {
  return Array.from({ length: count }, (_, index) => {
    const value = String(index + start);
    return { value, label: pad ? value.padStart(2, "0") : value };
  });
}

const hours = numberOptions(24, 0, true);
const minutes = numberOptions(60, 0, true);
const monthDays = numberOptions(28, 1);

interface Props {
  job: CronJobItem;
  pending: boolean;
  blocked: boolean;
  fetching: boolean;
  listError: boolean;
  onSubmit: (payload: UpdateCronJobPayload) => Promise<void>;
  onRefresh: () => void;
  onClose: () => void;
}

export function CronJobEditModal({
  job, pending, blocked, fetching, listError, onSubmit, onRefresh, onClose,
}: Props) {
  const { t } = useLocale();
  const formId = useId();
  const saved = getCronJobSchedule(job);
  const parameter = getCronParameter(job.name);
  const parameterPath = parameter ? "defaultParams." + parameter.name : "";
  const [frequency, setFrequency] = useState<CronJobScheduleDto["frequency"] | "">(saved?.frequency ?? "");
  const [everyHours, setEveryHours] = useState(saved?.frequency === "HOURLY" ? saved.everyHours : 1);
  const [dayOfWeek, setDayOfWeek] = useState(saved?.frequency === "WEEKLY" ? saved.dayOfWeek : 1);
  const [dayOfMonth, setDayOfMonth] = useState(saved?.frequency === "MONTHLY" ? saved.dayOfMonth : 1);
  const [hour, setHour] = useState(saved && saved.frequency !== "HOURLY" ? saved.hour : 0);
  const [minute, setMinute] = useState(saved?.minute ?? 0);
  const [description, setDescription] = useState(job.description);
  const [parameterValue, setParameterValue] = useState(() => getCronParameterValue(job));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  let schedule: CronJobScheduleDto | null = null;
  switch (frequency) {
    case "HOURLY":
      schedule = { frequency, everyHours, minute };
      break;
    case "DAILY":
      schedule = { frequency, hour, minute };
      break;
    case "WEEKLY":
      schedule = { frequency, dayOfWeek, hour, minute };
      break;
    case "MONTHLY":
      schedule = { frequency, dayOfMonth, hour, minute };
      break;
  }

  const { payload, invalidDescription, invalidParameter } = getCronEditChanges(
    job, schedule, description, parameterValue,
  );
  const disabled = pending || blocked;
  const canSave = !disabled && !fetching && !listError && !invalidDescription &&
    !invalidParameter && Object.keys(payload).length > 0;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  const clearFieldError = (field: string) => {
    setError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit(payload);
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 400 || cause.status === 422)) {
        setFieldErrors(Object.fromEntries((cause.errors ?? []).map(({ field, message }) => [field, message])));
        setError(t("cron.edit.invalid"));
      } else if (cause instanceof ApiError && cause.status === 403) {
        setError(t("cron.edit.forbidden"));
      } else {
        setError(cause instanceof Error ? cause.message : t("cron.edit.failed"));
      }
    }
  };

  return (
    <Modal
      open
      onOpenChange={handleOpenChange}
      title={t("cron.edit.title")}
      description={t("cron.jobs." + job.name)}
      icon={<Pencil className="size-5" aria-hidden="true" />}
      size="lg"
      preventClose={pending}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
            {t("cron.cancel")}
          </Button>
          {blocked ? (
            <Button type="button" onClick={onRefresh} disabled={fetching}>
              {t("cron.refresh")}
            </Button>
          ) : (
            <Button type="submit" form={formId} disabled={!canSave}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t(pending ? "cron.edit.saving" : "cron.edit.save")}
            </Button>
          )}
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "Escape" && event.defaultPrevented) event.stopPropagation();
        }}
        className="space-y-4"
      >
        <FormField label={t("cron.edit.frequency")} error={fieldErrors["schedule.frequency"] ?? fieldErrors.schedule}>
          <Select
            value={frequency}
            options={CRON_SCHEDULE_FREQUENCIES.map((value) => ({ value, label: t("cron.edit.frequency." + value) }))}
            onValueChange={(value) => {
              const selected = CRON_SCHEDULE_FREQUENCIES.find((option) => option === value);
              if (!selected) return;
              setFrequency(selected);
              setFieldErrors((current) => Object.fromEntries(
                Object.entries(current).filter(([field]) => field !== "schedule" && !field.startsWith("schedule.")),
              ));
              setError(null);
            }}
            disabled={disabled}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          {frequency === "HOURLY" && (
            <FormField label={t("cron.edit.everyHours")} error={fieldErrors["schedule.everyHours"]} required>
              <Select
                value={String(everyHours)}
                options={getCronHourOptions(saved).map((value) => ({
                  value: String(value), label: t("cron.edit.hourInterval", { hours: value }),
                }))}
                onValueChange={(value) => {
                  setEveryHours(Number(value));
                  clearFieldError("schedule.everyHours");
                }}
                disabled={disabled}
              />
            </FormField>
          )}
          {frequency === "WEEKLY" && (
            <FormField label={t("cron.edit.dayOfWeek")} error={fieldErrors["schedule.dayOfWeek"]} className="col-span-2" required>
              <Select
                value={String(dayOfWeek)}
                options={weekdays.map((value) => ({ value: String(value), label: t("cron.schedule.weekday." + value) }))}
                onValueChange={(value) => {
                  setDayOfWeek(Number(value));
                  clearFieldError("schedule.dayOfWeek");
                }}
                disabled={disabled}
              />
            </FormField>
          )}
          {frequency === "MONTHLY" && (
            <FormField label={t("cron.edit.dayOfMonth")} error={fieldErrors["schedule.dayOfMonth"]} className="col-span-2" required>
              <Select
                value={String(dayOfMonth)}
                options={monthDays}
                onValueChange={(value) => {
                  setDayOfMonth(Number(value));
                  clearFieldError("schedule.dayOfMonth");
                }}
                disabled={disabled}
              />
            </FormField>
          )}
          {frequency && frequency !== "HOURLY" && (
            <FormField label={t("cron.edit.hour")} error={fieldErrors["schedule.hour"]} required>
              <Select
                value={String(hour)}
                options={hours}
                onValueChange={(value) => {
                  setHour(Number(value));
                  clearFieldError("schedule.hour");
                }}
                disabled={disabled}
              />
            </FormField>
          )}
          {frequency && (
            <FormField label={t("cron.edit.minute")} error={fieldErrors["schedule.minute"]} required>
              <Select
                value={String(minute)}
                options={minutes}
                onValueChange={(value) => {
                  setMinute(Number(value));
                  clearFieldError("schedule.minute");
                }}
                disabled={disabled}
              />
            </FormField>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("cron.edit.preview")}</p>
          <p aria-live="polite" className="mt-1 font-medium">
            {schedule ? formatCronSchedule(schedule, t) : t("cron.edit.legacySchedule")}
          </p>
          {frequency === "HOURLY" && (
            <p className="mt-1 text-xs text-muted-foreground">{t("cron.edit.hourlyHint")}</p>
          )}
        </div>

        {parameter && (
          <FormField
            label={t("cron.edit.params." + parameter.name)}
            helperText={parameter.name === "retentionDays" ? t("cron.edit.retentionHint") :
              t("cron.params.range", { min: parameter.min, max: parameter.max })}
            error={fieldErrors[parameterPath] ?? fieldErrors.defaultParams ?? (invalidParameter
              ? t("cron.params.range", { min: parameter.min, max: parameter.max })
              : undefined)}
            required
          >
            <Input
              type="number"
              min={parameter.min}
              max={parameter.max}
              step={1}
              value={parameterValue}
              disabled={disabled}
              onChange={(event) => {
                setParameterValue(event.target.value);
                clearFieldError(parameterPath);
                clearFieldError("defaultParams");
              }}
            />
          </FormField>
        )}

        <FormField
          label={t("cron.edit.description")}
          error={fieldErrors.description ?? (invalidDescription ? t("cron.edit.descriptionLength") : undefined)}
        >
          <Textarea
            rows={3}
            value={description}
            disabled={disabled}
            onChange={(event) => {
              setDescription(event.target.value);
              clearFieldError("description");
            }}
          />
        </FormField>
        {(error || listError) && (
          <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
            {error}
            {listError && <span className="block">{t("cron.edit.refreshFailed")}</span>}
          </p>
        )}
      </form>
    </Modal>
  );
}
