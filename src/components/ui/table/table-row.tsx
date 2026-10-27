"use client";

import type { Row } from "@tanstack/react-table";
import { useTableContext } from "./table-context";
import { TableCell } from "./table-cell";

export interface TableRowProps {
  row: Row<any, any>;
  className?: string;
}

export function TableRow({
  row,
  className = "",
}: TableRowProps) {
  const { variant, onRowClick } = useTableContext();

  const isSelected = row.getIsSelected();
  const isClickable = Boolean(onRowClick);

  const rowHoverClass =
    variant === "sculpted"
      ? "hover:bg-primary/[0.05] dark:hover:bg-white/[0.03]"
      : "hover:bg-primary/[0.06] dark:hover:bg-white/[0.04]";

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
  ) => {
    if (!onRowClick) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <tr
      data-state={isSelected ? "selected" : undefined}
      data-clickable={isClickable ? "" : undefined}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : undefined}
      className={[
        "group border-b border-border/25 dark:border-white/[0.04] last:border-b-0",
        "even:bg-black/[0.01] dark:even:bg-white/[0.01]",
        "transition-all duration-200",
        rowHoverClass,
        isSelected
          ? "bg-primary/[0.1] dark:bg-primary/[0.16] shadow-[inset_4px_0_0_var(--accent)] font-medium"
          : "",
        isClickable
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {row.getVisibleCells().map((cell: any) => (
        <TableCell key={cell.id} cell={cell} />
      ))}
    </tr>
  );
}

export default TableRow;
