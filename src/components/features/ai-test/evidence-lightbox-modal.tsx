"use client";

import { ChevronLeft, ChevronRight, Clock, Film, Play, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatTimeSec, formatViolationLabel, normalizeViolationType } from "./ai-test-utils";
import type { EvidenceItem } from "@/types/ai-test.types";

export interface EvidenceLightboxModalProps {
  open: boolean;
  items: EvidenceItem[];
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
  onSeekToJobTime?: (timeSec: number) => void;
}

export function EvidenceLightboxModal({
  open,
  items,
  activeIndex,
  onClose,
  onChangeIndex,
  onSeekToJobTime,
}: EvidenceLightboxModalProps) {
  const current = items[activeIndex] ?? null;

  if (!current) {
    return null;
  }

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < items.length - 1;
  const isPair = Boolean(current.beforeUrl && current.afterUrl);

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Chi tiết ảnh bằng chứng vi phạm"
      description={`${formatViolationLabel(current.type)} — Track #${current.trackId}`}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasPrev}
              onClick={() => onChangeIndex(activeIndex - 1)}
            >
              <ChevronLeft className="size-4" />
              Trước
            </Button>
            <span className="text-xs font-medium text-muted-foreground">
              {activeIndex + 1} / {items.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasNext}
              onClick={() => onChangeIndex(activeIndex + 1)}
            >
              Sau
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {current.source === "job" &&
              typeof current.timeSec === "number" &&
              onSeekToJobTime && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onSeekToJobTime(current.timeSec!);
                    onClose();
                  }}
                >
                  <Play className="size-4" />
                  Tua video tới {formatTimeSec(current.timeSec)}
                </Button>
              )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={normalizeViolationType(current.type) === "NO_HELMET" ? "danger" : "warning"}
            size="sm"
          >
            {formatViolationLabel(current.type)}
          </Badge>
          <Badge variant="outline" size="sm" icon={<User className="size-3" />}>
            Track #{current.trackId}
          </Badge>
          <Badge variant="secondary" size="sm" icon={<Film className="size-3" />}>
            {current.source === "live"
              ? `Live Session ${current.sourceId.slice(0, 8)}`
              : `Job ${current.sourceId.slice(0, 8)}`}
          </Badge>
          {typeof current.timeSec === "number" && (
            <Badge variant="default" size="sm" icon={<Clock className="size-3" />}>
              {formatTimeSec(current.timeSec)}
            </Badge>
          )}
          {typeof current.frameIdx === "number" && (
            <Badge variant="default" size="sm">
              Frame #{current.frameIdx}
            </Badge>
          )}
        </div>

        {isPair ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl bg-background p-3 shadow-[var(--nm-inset)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Before (Snapshot trước vi phạm)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.beforeUrl!}
                alt="Before snapshot"
                className="max-h-[420px] w-full rounded-xl object-contain"
              />
            </div>
            <div className="space-y-2 rounded-2xl bg-background p-3 shadow-[var(--nm-inset)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-danger">
                After (Khoảnh khắc xác nhận vi phạm)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.afterUrl!}
                alt="After snapshot"
                className="max-h-[420px] w-full rounded-xl object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-background p-3 shadow-[var(--nm-inset)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.primaryUrl}
              alt={`Evidence ${current.type}`}
              className="max-h-[500px] w-full rounded-xl object-contain"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

