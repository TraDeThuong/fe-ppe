
"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  X,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

type FileStatus = "ready" | "uploading" | "success" | "error";

interface UploadFile {
  id: number;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
}

export interface FileUploadProps {
  accept?: string[];
  maxSizeMB?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  onFilesChange?: (files: File[]) => void;
  onUpload?: (
    file: File,
    onProgress: (progress: number) => void,
  ) => Promise<void>;
}

const DEFAULT_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isAcceptedFile(file: File, accept: string[]) {
  if (accept.length === 0) return true;

  return accept.some((rule) => {
    const normalized = rule.toLowerCase();

    if (normalized.startsWith(".")) {
      return file.name.toLowerCase().endsWith(normalized);
    }

    if (normalized.endsWith("/*")) {
      return file.type.startsWith(normalized.slice(0, -1));
    }

    return file.type.toLowerCase() === normalized;
  });
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) {
    return ImageIcon;
  }

  if (file.type === "application/pdf") {
    return FileText;
  }

  return FileIcon;
}

export function FileUpload({
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
  multiple = true,
  disabled = false,
  className = "",
  onFilesChange,
  onUpload,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const updateFiles = (next: UploadFile[]) => {
    setFiles(next);
    onFilesChange?.(
      next
        .filter((item) => item.status !== "error")
        .map((item) => item.file),
    );
  };

  const addFiles = (incoming: File[]) => {
    if (disabled) return;

    const selected = multiple ? incoming : incoming.slice(0, 1);

    const newItems: UploadFile[] = selected.map((file) => {
      let error: string | undefined;

      if (!isAcceptedFile(file, accept)) {
        error = "Định dạng tệp không được hỗ trợ.";
      } else if (file.size > maxBytes) {
        error = `Tệp vượt quá giới hạn ${maxSizeMB} MB.`;
      }

      return {
        id: ++nextId.current,
        file,
        status: error ? "error" : "ready",
        progress: 0,
        error,
      };
    });

    const next = multiple
      ? [...files, ...newItems]
      : newItems;

    updateFiles(next);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    addFiles(Array.from(event.dataTransfer.files));
  };

  const removeFile = (id: number) => {
    if (disabled) return;

    updateFiles(files.filter((item) => item.id !== id));
  };

  const uploadFile = async (item: UploadFile) => {
    if (!onUpload || disabled) return;

    updateFiles(
      files.map((file) =>
        file.id === item.id
          ? {
              ...file,
              status: "uploading",
              progress: 0,
              error: undefined,
            }
          : file,
      ),
    );

    try {
      await onUpload(item.file, (progress) => {
        setFiles((current) =>
          current.map((file) =>
            file.id === item.id
              ? {
                  ...file,
                  progress: Math.min(100, Math.max(0, progress)),
                }
              : file,
          ),
        );
      });

      setFiles((current) =>
        current.map((file) =>
          file.id === item.id
            ? { ...file, status: "success", progress: 100 }
            : file,
        ),
      );
    } catch (error) {
      setFiles((current) =>
        current.map((file) =>
          file.id === item.id
            ? {
                ...file,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Không thể tải tệp lên.",
              }
            : file,
        ),
      );
    }
  };

  const clearCompleted = () => {
    updateFiles(files.filter((item) => item.status !== "success"));
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Chọn tệp để tải lên"
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (
            !disabled &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
        className={[
          "group flex min-h-52 cursor-pointer flex-col items-center justify-center",
          "rounded-3xl border-2 border-dashed p-6 text-center",
          "bg-background transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary/40",
          isDragging
            ? "border-primary bg-primary/5 shadow-[var(--nm-inset)]"
            : "border-border hover:border-primary/60",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />

        <span
          className={[
            "mb-4 flex size-16 items-center justify-center rounded-full",
            "border border-border/50 bg-background text-primary",
            "shadow-[var(--nm-raised)]",
            "transition-transform duration-300",
            isDragging ? "scale-110" : "group-hover:-translate-y-1",
          ].join(" ")}
        >
          <UploadCloud size={30} strokeWidth={1.7} />
        </span>

        <p className="text-sm font-semibold text-foreground">
          {isDragging
            ? "Thả tệp vào đây"
            : "Kéo thả tệp vào đây"}
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          hoặc nhấn để chọn từ thiết bị
        </p>

        <p className="mt-3 text-xs text-muted-foreground">
          {accept.join(", ")} · Tối đa {maxSizeMB} MB/tệp
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Danh sách tệp ({files.length})
            </p>

            {files.some((item) => item.status === "success") && (
              <button
                type="button"
                onClick={clearCompleted}
                disabled={disabled}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
              >
                Xóa tệp đã tải
              </button>
            )}
          </div>

          {files.map((item) => {
            const Icon = getFileIcon(item.file);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border/60 bg-background p-3 shadow-[var(--nm-raised-sm)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-[var(--nm-inset)]">
                    <Icon size={20} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      title={item.file.name}
                    >
                      {item.file.name}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {item.status === "uploading" &&
                        ` · ${Math.round(item.progress)}%`}
                    </p>
                  </div>

                  {item.status === "uploading" ? (
                    <LoaderCircle
                      className="shrink-0 animate-spin text-primary"
                      size={19}
                    />
                  ) : item.status === "success" ? (
                    <CheckCircle2
                      className="shrink-0 text-success"
                      size={19}
                    />
                  ) : item.status === "error" ? (
                    <AlertCircle
                      className="shrink-0 text-danger"
                      size={19}
                    />
                  ) : null}

                  {item.status === "ready" && onUpload && (
                    <button
                      type="button"
                      onClick={() => void uploadFile(item)}
                      disabled={disabled}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      Tải lên
                    </button>
                  )}

                  {item.status === "error" &&
                    onUpload &&
                    !item.error?.includes("định dạng") &&
                    !item.error?.includes("vượt quá") && (
                      <button
                        type="button"
                        onClick={() => void uploadFile(item)}
                        disabled={disabled}
                        aria-label={`Thử tải lại ${item.file.name}`}
                        className="rounded-full p-2 text-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}

                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    disabled={
                      disabled || item.status === "uploading"
                    }
                    aria-label={`Xóa ${item.file.name}`}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={17} />
                  </button>
                </div>

                {item.status === "uploading" && (
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-background shadow-[var(--nm-inset)]"
                    role="progressbar"
                    aria-label={`Tiến trình tải ${item.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(item.progress)}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {item.error && (
                  <p className="mt-2 text-xs text-danger">
                    {item.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
