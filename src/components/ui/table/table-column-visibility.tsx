"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Columns3, RotateCcw } from "lucide-react";
import { useTableContext } from "./table-context";

/** Portal keeps column controls usable inside short tables and scrolling panels. */
export function TableColumnVisibility({ label, title, resetLabel }: { label: string; title: string; resetLabel: string }) {
  const { table, loading } = useTableContext();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    const outside = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setPosition(null);
        trigger.current?.focus();
      }
    };
    const close = (event: Event) => {
      if (!(event.target instanceof Node) || !panel.current?.contains(event.target)) setPosition(null);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position !== null]);

  const toggle = () => {
    if (position) { setPosition(null); return; }
    const rect = trigger.current!.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 16;
    const height = Math.min(288, Math.max(below, rect.top - 16));
    setPosition({ top: below >= Math.min(240, height) ? rect.bottom + 8 : Math.max(8, rect.top - height - 8), left: Math.max(8, Math.min(rect.right - 240, window.innerWidth - 248)), maxHeight: height });
  };

  return <>
    <button ref={trigger} type="button" disabled={loading} aria-haspopup="dialog" aria-expanded={Boolean(position)} onClick={toggle} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/40 bg-background px-3 text-xs font-bold text-muted-foreground shadow-nm-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-10">
      <Columns3 size={14} className="text-primary" />{label}
    </button>
    {position ? createPortal(<div ref={panel} role="dialog" aria-label={title} style={{ position: "fixed", zIndex: 9999, ...position, width: 240 }} className="overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-background p-3 text-foreground shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/30 pb-2 text-xs font-bold">
        <span>{title}</span>
        <button type="button" onClick={() => table.resetColumnVisibility()} title={resetLabel} className="inline-flex items-center gap-1 text-primary"><RotateCcw size={12} />{resetLabel}</button>
      </div>
      {table.getAllLeafColumns().filter((column: any) => column.getCanHide()).map((column: any) => <label key={column.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-xs hover:bg-muted/30">
        <span>{typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}</span>
        <input type="checkbox" checked={column.getIsVisible()} onChange={event => column.toggleVisibility(event.target.checked)} className="size-4 accent-[var(--primary)]" />
      </label>)}
    </div>, document.body) : null}
  </>;
}
