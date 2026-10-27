"use client";

import type { Cell } from "@tanstack/react-table";
import { useTableContext } from "./table-context";

export interface TableCellProps {
  cell: Cell<any, any>;
  className?: string;
}

export function TableCell({
  cell,
  className = "",
}: TableCellProps) {
  const { table } = useTableContext();

  return (
    <td
      className={[
        "px-4 sm:px-5 py-3.5 sm:py-4 align-middle",
        "text-xs sm:text-sm text-foreground",
        "bg-transparent transition-colors duration-200",
        "border-r border-border/10 last:border-r-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {cell.getIsPlaceholder() ? null : (
        <table.FlexRender cell={cell} />
      )}
    </td>
  );
}

export default TableCell;
