"use client";

import { useEffect, useRef, useState } from "react";
import { useSpin } from "@/lib/store";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/ui/cn";
import { MUTATIONS, type MutationKind } from "@/types";
import { Kbd } from "@/components/ui/Kbd";

const LABEL_VI: Record<MutationKind, [string, string]> = {
  useful: ["Hữu ích hơn", "Bớt dị, thêm giá trị dùng thật"],
  viral: ["Dễ lan hơn", "Thêm thứ để người ta chụp màn hình"],
  weird: ["Dị hơn", "Đổi luật chơi sang hướng lạ hơn"],
  technical: ["Kỹ thuật hơn", "Cơ chế nặng đô hơn, stack sâu hơn"],
  social: ["Xã hội hơn", "Kéo thêm người khác vào vòng lặp"],
  simpler: ["Đơn giản hơn", "Cắt còn MVP gọn nhất"],
  harder: ["Khó hơn", "Tham vọng kỹ thuật cao hơn"],
  cheaper: ["Rẻ hơn", "Bỏ chi phí server, dùng free tier"],
  chaotic: ["Hỗn loạn hơn", "Tăng độ dị, đổi luật và ràng buộc"],
};

/** Small command list for MUTATE. ↑/↓/Enter, 1–9, Esc. */
export function MutateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutate = useSpin((s) => s.mutate);
  const current = useSpin((s) => s.current);
  const [sel, setSel] = useState(0);
  const selRef = useRef(0);
  useEffect(() => {
    selRef.current = sel;
  }, [sel]);

  const close = () => {
    setSel(0);
    onClose();
  };

  const choose = (kind: MutationKind) => {
    mutate(kind);
    close();
    toast(`Biến dị // ${LABEL_VI[kind][0]}`);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") setSel((i) => (i + 1) % MUTATIONS.length);
      else if (e.key === "ArrowUp") setSel((i) => (i - 1 + MUTATIONS.length) % MUTATIONS.length);
      else if (e.key === "Enter") choose(MUTATIONS[selRef.current].kind);
      else if (/^[1-9]$/.test(e.key)) choose(MUTATIONS[Number(e.key) - 1].kind);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !current) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-bg/70" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Biến dị ý tưởng"
        className="enter fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-bg sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border"
      >
        <div className="flex h-11 items-center justify-between border-b border-line px-4">
          <span className="label text-fg">Biến dị //</span>
          <button type="button" onClick={close} className="label text-muted hover:text-fg">
            Esc
          </button>
        </div>
        <ul className="max-h-[60dvh] overflow-y-auto py-1">
          {MUTATIONS.map((m, i) => (
            <li key={m.kind}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => choose(m.kind)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left",
                  sel === i ? "bg-fg text-bg" : "text-fg",
                )}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium uppercase tracking-[0.02em]">{LABEL_VI[m.kind][0]}</span>
                  <span className={cn("text-xs", sel === i ? "opacity-70" : "text-muted")}>{LABEL_VI[m.kind][1]}</span>
                </span>
                <Kbd className={sel === i ? "border-bg/40 text-bg" : undefined}>{i + 1}</Kbd>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
