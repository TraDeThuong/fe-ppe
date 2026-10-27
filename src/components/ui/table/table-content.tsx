"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoveRight } from "lucide-react";
import { TableHeader } from "./table-header";
import { TableBody } from "./table-body";
import { useTableContext } from "./table-context";

export interface TableContentProps {
  className?: string;
  tableClassName?: string;
  children?: ReactNode;
  skeletonRows?: number;
  /**
   * Bật gợi ý vuốt ngang trên thiết bị di động
   * @default true
   */
  showMobileScrollHint?: boolean;
}

export function TableContent({
  className = "",
  tableClassName = "",
  children,
  skeletonRows,
  showMobileScrollHint = true,
}: TableContentProps) {
  const { variant } = useTableContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Kiểm tra trạng thái cuộn ngang để hiển thị viền bóng mờ chỉ dẫn quang học
  const checkScrollState = () => {
    const el = containerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    const isAtStart = el.scrollLeft <= 4;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;

    setCanScrollLeft(!isAtStart);
    setCanScrollRight(hasOverflow && !isAtEnd);
  };

  useEffect(() => {
    checkScrollState();
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => checkScrollState();
    const handleScroll = () => checkScrollState();

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    // Kích hoạt lại sau khi render DOM cập nhật
    const timer = setTimeout(checkScrollState, 150);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Chỉ dẫn vuốt ngang trên thiết bị di động */}
      {showMobileScrollHint && canScrollRight && (
        <div className="flex sm:hidden items-center justify-between px-4 py-1.5 bg-accent/10 border-b border-accent/20 text-[11px] font-bold text-accent">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent animate-ping" />
            Bảng rộng hơn màn hình
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
            Vuốt ngang <MoveRight size={12} className="animate-pulse" />
          </span>
        </div>
      )}

      {/* Hiệu ứng bóng quang học chỉ hướng cuộn trái */}
      {canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-6 bg-gradient-to-r from-[var(--background)] to-transparent opacity-90 transition-opacity duration-300"
        />
      )}

      {/* Hiệu ứng bóng quang học chỉ hướng cuộn phải */}
      {canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-[var(--background)] to-transparent opacity-90 transition-opacity duration-300"
        />
      )}

      {/* Vùng cuộn ngang chính */}
      <div
        ref={containerRef}
        className={[
          "w-full overflow-x-auto scroll-smooth",
          // Tối ưu vuốt cảm ứng mượt trên iOS & Android
          "[-webkit-overflow-scrolling:touch]",
          // Custom Neumorphic scrollbar
          "[scrollbar-width:thin] [scrollbar-color:var(--shadow-dark)_transparent]",
          variant === "sculpted"
            ? "bg-black/[0.015] dark:bg-black/[0.15]"
            : "bg-transparent",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <table
          className={[
            "w-full border-collapse text-left text-sm",
            "min-w-[640px] sm:min-w-full",
            tableClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children ?? (
            <>
              <TableHeader />
              <TableBody skeletonRows={skeletonRows} />
            </>
          )}
        </table>
      </div>
    </div>
  );
}

export default TableContent;
