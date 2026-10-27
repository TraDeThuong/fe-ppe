
"use client";

import { TableRow } from "./table-row";
import { useTableContext } from "./table-context";

export interface TableBodyProps {
  className?: string;
  skeletonRows?: number;
}

export function TableBody({
  className = "",
  skeletonRows = 4,
}: TableBodyProps) {
  const { table, loading, emptyMessage } = useTableContext();

  const rows = table.getRowModel().rows;
  const columnCount = Math.max(
    table.getVisibleLeafColumns().length,
    1,
  );

  return (
    <tbody
      className={className}
      aria-live={loading ? "polite" : undefined}
    >
      {loading ? (
        Array.from(
          { length: Math.max(1, skeletonRows) },
          (_, index) => (
            <tr key={`skeleton-${index}`}>
              {Array.from(
                { length: columnCount },
                (_, cellIndex) => (
                  <td
                    key={`skeleton-cell-${index}-${cellIndex}`}
                    className="border-b border-border/30 px-4 py-4"
                  >
                    <div className="h-3.5 w-full max-w-40 animate-pulse rounded-md bg-muted/70" />
                  </td>
                ),
              )}
            </tr>
          ),
        )
      ) : rows.length === 0 ? (
        <tr>
          <td
            colSpan={columnCount}
            className={[
              "px-6 py-14 text-center",
              "text-sm text-muted-foreground",
            ].join(" ")}
          >
            <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-xl bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
              >
                <span className="text-lg">∅</span>
              </span>

              <p>{emptyMessage}</p>
            </div>
          </td>
        </tr>
      ) : (
        rows.map((row: any) => (
          <TableRow key={row.id} row={row} />
        ))
      )}
    </tbody>
  );
}

export default TableBody;
