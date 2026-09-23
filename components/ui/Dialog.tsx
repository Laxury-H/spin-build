"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible title (also rendered as the header label unless `hideTitle`). */
  title: string;
  children: ReactNode;
  className?: string;
  /** "center" modal panel, or "full" takeover (build brief, share). */
  size?: "center" | "full";
  hideTitle?: boolean;
  /** Extra header content (right side), e.g. a COPY button. */
  actions?: ReactNode;
}

/**
 * Native <dialog> modal: focus trap, Esc to close and inert background come
 * from the platform. Backdrop click closes. Styled with tokens only.
 */
export function Dialog({ open, onClose, title, children, className, size = "center", hideTitle, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto border border-line-strong bg-bg p-0 text-fg",
        "open:animate-[dialog-in_220ms_var(--ease-out)]",
        size === "full"
          ? "h-[100dvh] max-h-none w-full max-w-none border-0 sm:h-[calc(100dvh-48px)] sm:w-[min(1200px,calc(100vw-48px))] sm:border"
          : "max-h-[calc(100dvh-32px)] w-[min(640px,calc(100vw-32px))]",
        className,
      )}
    >
      {open ? (
        <div className="flex h-full max-h-[inherit] flex-col">
          <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
            <h2 className={cn("label text-muted", hideTitle && "sr-only")}>{title}</h2>
            <div className="flex items-center gap-2">
              {actions}
              <button
                type="button"
                onClick={onClose}
                className="label flex h-8 items-center gap-2 px-2 text-muted hover:text-fg"
                aria-label="Close"
              >
                ESC <span aria-hidden="true">✕</span>
              </button>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
