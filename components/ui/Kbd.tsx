import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/** Small monospace key hint: <Kbd>SPACE</Kbd>. */
export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center border border-line px-1 font-mono text-[10px] leading-none tracking-[0.04em] text-muted",
        className,
      )}
      {...rest}
    />
  );
}
