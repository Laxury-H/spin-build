"use client";

import { useToasts } from "@/lib/ui/toast";
import Link from "next/link";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto max-w-md w-full bg-bg border border-line-strong p-3 flex items-center justify-between gap-4"
        >
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-fg">
              {t.message}
            </span>
            {t.detail && (
              <span className="text-[11px] font-mono text-muted tracking-wide">
                {t.detail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {t.action && (
              t.action.href ? (
                <Link
                  href={t.action.href}
                  onClick={() => dismiss(t.id)}
                  className="px-2 py-0.5 border border-line bg-surface text-xs font-mono text-fg hover:border-line-strong cursor-pointer"
                >
                  {t.action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onAction?.();
                    dismiss(t.id);
                  }}
                  className="px-2 py-0.5 border border-line bg-surface text-xs font-mono text-fg hover:border-line-strong cursor-pointer"
                >
                  {t.action.label}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-fg font-mono text-xs px-1 cursor-pointer"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
