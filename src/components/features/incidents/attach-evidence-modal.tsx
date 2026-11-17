"use client";

import { useState } from "react";
import { FileVideo, ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useLocale } from "@/providers/locale-provider";
import type { EvidenceType } from "@/types";

export interface AttachEvidenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  cameraId: string;
  siteId: string;
  loading?: boolean;
  onUploadDirect: (args: {
    incidentId: string;
    cameraId: string;
    evidenceType: EvidenceType | string;
    file: File;
  }) => Promise<unknown>;
  onUploadPresigned: (args: {
    incidentId: string;
    cameraId: string;
    siteId: string;
    evidenceType: EvidenceType | string;
    file: File;
  }) => Promise<unknown>;
}

export function AttachEvidenceModal({
  open,
  onOpenChange,
  incidentId,
  cameraId,
  siteId,
  loading = false,
  onUploadDirect,
  onUploadPresigned,
}: AttachEvidenceModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [mode, setMode] = useState<"direct" | "presigned">("direct");
  const [evidenceType, setEvidenceType] = useState<string>("SNAPSHOT");
  const [file, setFile] = useState<File | null>(null);

  const typeOptions: SelectOption[] =
    mode === "direct"
      ? [
          { value: "SNAPSHOT", label: "SNAPSHOT" },
          { value: "REFERENCE_SNAPSHOT", label: "REFERENCE_SNAPSHOT" },
        ]
      : [
          { value: "VIDEO_CLIP", label: "VIDEO_CLIP (MP4/WebM <= 500MB)" },
          { value: "SNAPSHOT", label: "SNAPSHOT" },
          { value: "REFERENCE_SNAPSHOT", label: "REFERENCE_SNAPSHOT" },
        ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (mode === "direct") {
      await onUploadDirect({
        incidentId,
        cameraId,
        evidenceType,
        file,
      });
    } else {
      await onUploadPresigned({
        incidentId,
        cameraId,
        siteId,
        evidenceType,
        file,
      });
    }

    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isVi ? "Đính kèm Minh chứng Số" : "Attach Digital Evidence"}
      description={
        isVi
          ? "Tải ảnh trực tiếp (<=5MB, tự tính SHA-256) hoặc Video Clip qua Presigned URL."
          : "Upload direct image (<=5MB, auto SHA-256) or large video clip via presigned URL."
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl p-1.5 shadow-nm-inset">
          <button
            type="button"
            onClick={() => {
              setMode("direct");
              setEvidenceType("SNAPSHOT");
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              mode === "direct"
                ? "bg-background text-primary shadow-nm-sm"
                : "text-muted-foreground"
            }`}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            <span>{isVi ? "Ảnh trực tiếp (<=5MB)" : "Direct Image"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("presigned");
              setEvidenceType("VIDEO_CLIP");
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              mode === "presigned"
                ? "bg-background text-primary shadow-nm-sm"
                : "text-muted-foreground"
            }`}
          >
            <FileVideo className="h-3.5 w-3.5" />
            <span>{isVi ? "Video / Presigned" : "Video / Presigned"}</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Loại minh chứng" : "Evidence Type"}
          </label>
          <Select
            size="sm"
            options={typeOptions}
            value={evidenceType}
            onValueChange={setEvidenceType}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {isVi ? "Chọn tệp *" : "Select File *"}
          </label>
          <input
            type="file"
            accept={
              mode === "direct"
                ? "image/jpeg,image/png,image/webp,image/avif"
                : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            }
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-border/30 bg-surface p-2 text-xs text-foreground"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !file} className="gap-1.5">
            <Upload className="h-4 w-4" />
            <span>{isVi ? "Tải lên & Gắn" : "Upload & Attach"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

