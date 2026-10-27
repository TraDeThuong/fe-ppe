
"use client";

import type { ChangeEvent } from "react";
import type { Row } from "@tanstack/react-table";

import { useTableContext } from "./table-context";

export interface TableSelectionCellProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}

import { Check, Minus } from "lucide-react";

export function TableSelectionCell({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onChange,
}: TableSelectionCellProps) {
  const isCheckedOrMixed = checked || indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={[
        "relative flex size-5 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer hover:scale-105 active:scale-95",
        isCheckedOrMixed
          ? "border border-primary bg-primary text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light),0_0_8px_rgba(var(--accent-rgb,56,189,248),0.4)]"
          : "border border-border/60 bg-background text-transparent shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
      ].join(" ")}
    >
      {indeterminate ? (
        <Minus size={12} strokeWidth={3.5} className="text-primary-foreground" />
      ) : checked ? (
        <Check size={12} strokeWidth={3.5} className="text-primary-foreground" />
      ) : null}
    </button>
  );
}

export function TableSelectionHeader() {
  const { table } = useTableContext();

  const rows = table.getRowModel().rows;
  const checked = table.getIsAllPageRowsSelected();
  const indeterminate =
    table.getIsSomePageRowsSelected() && !checked;
  const hasSelectableRows = rows.some((row: Row<any, any>) =>
    row.getCanSelect(),
  );

  return (
    <TableSelectionCell
      checked={checked}
      indeterminate={indeterminate}
      disabled={!hasSelectableRows}
      ariaLabel="Chọn tất cả dòng trên trang hiện tại"
      onChange={(nextChecked) =>
        table.toggleAllPageRowsSelected(nextChecked)
      }
    />
  );
}

export interface TableSelectionRowProps {
  row: {
    id: string;
    getIsSelected: () => boolean;
    getCanSelect: () => boolean;
    toggleSelected: (value: boolean) => void;
  };
}

export function TableSelectionRow({ row }: TableSelectionRowProps) {
  return (
    <TableSelectionCell
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      ariaLabel={`Chọn dòng ${row.id}`}
      onChange={(checked) => row.toggleSelected(checked)}
    />
  );
}

export default TableSelectionCell;
