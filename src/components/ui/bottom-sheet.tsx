"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Tiêu đề sheet — luôn được trình đọc màn hình đọc, kể cả khi ẩn */
  title: string;
  /** Ẩn tiêu đề khỏi giao diện nhưng vẫn giữ cho trình đọc màn hình */
  hideTitle?: boolean;
  closeLabel?: string;
  /** Vùng cố định ở đáy sheet (ví dụ nút "Áp dụng") */
  footer?: ReactNode;
  id?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * Bảng trượt từ dưới lên cho mobile.
 * Dùng thẻ <dialog> gốc của trình duyệt: tự khóa focus bên trong, ESC để đóng,
 * trả focus về nút đã mở khi đóng. Chạm vào vùng tối phía trên cũng đóng sheet.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  hideTitle = false,
  closeLabel = "Đóng",
  footer,
  id,
  className = "",
  bodyClassName = "",
  children,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Gỡ component khi đang mở (ví dụ chuyển trang) thì đóng hẳn để không kẹt lớp phủ.
  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(event) => {
        // Chạm vào vùng tối (backdrop) có target là chính thẻ <dialog>.
        if (event.target === event.currentTarget) onClose();
      }}
      className={[
        "m-0 mt-auto h-auto max-h-[88dvh] w-full max-w-none overflow-hidden border-0 p-0",
        "rounded-t-[1.75rem] bg-background text-foreground",
        "shadow-[0_-10px_40px_rgba(0,0,0,0.18)]",
        "backdrop:bg-black/45",
        "translate-y-0 transition-transform duration-300 ease-out starting:translate-y-full",
        "motion-reduce:transition-none",
        className,
      ].join(" ")}
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div aria-hidden="true" className="flex justify-center pt-2.5">
          <span className="h-1.5 w-10 rounded-full bg-foreground/15" />
        </div>

        <div className="flex items-center gap-2 px-5 pt-1">
          <h2
            id={titleId}
            className={hideTitle ? "sr-only" : "min-w-0 flex-1 truncate text-lg font-bold"}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 ml-auto flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div
          className={[
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4",
            footer ? "pb-3" : "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            bodyClassName,
          ].join(" ")}
        >
          {children}
        </div>

        {footer && (
          <div className="border-t border-border/60 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
