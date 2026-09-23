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
    <div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-fg selection:text-bg">
      <SiteHeader />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <Toaster />
      <CommandPalette />
    </div>
  );
}
