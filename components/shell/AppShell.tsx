"use client";

import { useEffect, type ReactNode } from "react";
import { useSpin } from "@/lib/store";
import { SiteHeader } from "./SiteHeader";
import { Toaster } from "./Toaster";
import { CommandPalette } from "./CommandPalette";

export function AppShell({ children }: { children: ReactNode }) {
  // Hydrate store on mount
  useEffect(() => {
    useSpin.getState().hydrate();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-fg selection:text-bg relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_20%,transparent_100%)] opacity-[0.15]" />
      <div className="relative z-10 flex-1 flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      </div>
      <Toaster />
      <CommandPalette />
    </div>
  );
}
