"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useTableContext } from "./table-context";

export interface TableEditableCellProps {
  row: unknown;
  rowId: string;
  columnId: string;
  value: string | number | null;
  displayValue?: ReactNode;
  inputType?: "text" | "number";
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TableEditableCell({
  row,
  rowId,
  columnId,
  value,
  displayValue,
  inputType = "text",
  disabled = false,
  placeholder = "Nhập giá trị...",
  className = "",
}: TableEditableCellProps) {
  const { onCellEdit, loading } = useTableContext();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const beginEdit = () => {
    if (disabled || loading || !onCellEdit) return;
    setDraft(String(value ?? ""));
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(String(value ?? ""));
    setError("");
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!onCellEdit) {
      setError("Chưa cấu hình callback onCellEdit.");
      return;
    }

    const nextValue =
      inputType === "number" && draft.trim() !== ""
        ? Number(draft)
        : draft;

    if (inputType === "number" && draft.trim() !== "" && !Number.isFinite(nextValue)) {
      setError("Vui lòng nhập một số hợp lệ.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onCellEdit({
        row,
        rowId,
        columnId,
        previousValue: value,
        value: nextValue,
      });

      setEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu thay đổi. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={disabled || loading || !onCellEdit ? -1 : 0}
        title="Nhấp vào ô để chỉnh sửa trực tiếp nội dung"
        aria-label={`Chỉnh sửa ${columnId}: ${String(value ?? "")}`}
        onClick={(event) => {
          event.stopPropagation();
          beginEdit();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          beginEdit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            beginEdit();
          }
        }}
        className={[
          "group/edit flex min-w-0 items-center justify-between gap-2.5",
          "rounded-xl px-2.5 py-1.5 -mx-2.5 -my-1.5",
          "cursor-pointer border border-transparent transition-all duration-200",
          "hover:border-primary/40 hover:bg-primary/[0.04]",
          "hover:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          className,
        ].join(" ")}
      >
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {displayValue ?? (value == null || value === "" ? "—" : String(value))}
        </span>

        <span
          className={[
            "flex size-6 shrink-0 items-center justify-center rounded-lg",
            "border border-border/40 bg-background text-muted-foreground",
            "shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]",
            "transition-all duration-200 group-hover/edit:text-primary group-hover/edit:scale-105",
            "opacity-70 group-hover/edit:opacity-100",
          ].join(" ")}
        >
          <Pencil size={11} />
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className={[
        "flex min-w-[200px] flex-col gap-2 p-2.5 rounded-2xl bg-background",
        "border border-primary/40 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.8)]",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
          <Pencil size={10} /> Đang sửa: {columnId}
        </span>
        <span className="text-[10px] text-muted-foreground">Enter để lưu</span>
      </div>

      <input
        ref={inputRef}
        type={inputType}
        value={draft}
        placeholder={placeholder}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void saveEdit();
          }

          if (event.key === "Escape") {
            cancelEdit();
          }
        }}
        aria-label={`Giá trị mới cho ${columnId}`}
        aria-invalid={Boolean(error)}
        className={[
          "h-9 w-full min-w-0 rounded-xl px-3 text-xs font-semibold",
          "border border-[var(--shadow-dark)]/35 dark:border-white/10",
          "bg-background text-foreground",
          "shadow-[inset_2.5px_2.5px_5px_var(--shadow-dark),inset_-2.5px_-2.5px_5px_var(--shadow-light)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent",
          error ? "border-danger text-danger" : "",
        ].join(" ")}
      />

      {error && (
        <p role="alert" className="text-[10px] font-semibold text-danger px-1">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveEdit()}
          className={[
            "inline-flex flex-1 items-center justify-center gap-1.5 h-8 rounded-xl",
            "bg-primary text-primary-foreground text-xs font-bold",
            "shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]",
            "hover:brightness-105 active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]",
            "disabled:opacity-50",
          ].join(" ")}
        >
          <Check size={13} />
          {saving ? "Lưu..." : "Lưu"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={cancelEdit}
          className={[
            "inline-flex flex-1 items-center justify-center gap-1.5 h-8 rounded-xl",
            "border border-border/40 bg-background text-muted-foreground text-xs font-bold",
            "shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]",
            "hover:text-foreground active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]",
            "disabled:opacity-50",
          ].join(" ")}
        >
          <X size={13} />
          Hủy
        </button>
      </div>
    </div>
  );
}

export default TableEditableCell;
