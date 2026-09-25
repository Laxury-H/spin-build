"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSpin } from "@/lib/store";
import { useOverlay } from "@/lib/ui/dialogs";
import { useTranslation } from "@/lib/ui/useTranslation";
import { cn } from "@/lib/ui/cn";
import { ChaosSlider, AudioToggle, RegionToggle } from "./controls";
import { Kbd } from "@/components/ui/Kbd";



const NAV_KEYS = [
  { href: "/trends", key: "nav_trends" as const },
  { href: "/saved", key: "nav_saved" as const },
  { href: "/daily", key: "nav_daily" as const },
  { href: "/fuse", key: "nav_fuse" as const },
  { href: "/about", key: "nav_about" as const },
];

export function SiteHeader() {
  const { t, lang } = useTranslation();
  const setLang = useSpin((s) => s.setLang);
  const pathname = usePathname();
  const chaos = useSpin((s) => s.chaos);
  const overlay = useOverlay();
  // Popovers remember which path they were opened on, so navigating closes them.
  const [chaosFor, setChaosFor] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const chaosOpen = chaosFor === pathname;
  const menuOpen = menuFor === pathname;
  const setChaosOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setChaosFor((typeof v === "function" ? v(chaosOpen) : v) ? pathname : null);
  const setMenuOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setMenuFor((typeof v === "function" ? v(menuOpen) : v) ? pathname : null);

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-line bg-bg/95 backdrop-blur-xs">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-sans text-[15px] font-semibold tracking-[-0.02em] uppercase" aria-label="SPIN//BUILD — Trang chủ">
            SPIN<span className="text-muted">{"//"}</span>BUILD
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Điều hướng chính">
            {NAV_KEYS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "label font-mono text-[11px] tracking-wider transition-colors",
                    active ? "text-fg underline decoration-1 underline-offset-[6px]" : "text-muted hover:text-fg",
                  )}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setChaosOpen((v) => !v)}
              aria-expanded={chaosOpen}
              className="label flex h-8 items-center gap-2 border border-line bg-surface/50 px-2.5 text-xs text-muted transition-colors hover:border-fg hover:text-fg"
            >
              CHAOS: <span className="tabular font-mono font-bold text-fg">{chaos}%</span>
            </button>
            {chaosOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setChaosOpen(false)} aria-hidden="true" />
                <div className="enter absolute right-0 top-full z-50 mt-3 w-80 border border-line-strong bg-bg p-5 shadow-2xl">
                  <ChaosSlider />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="hidden h-8 w-8 items-center justify-center border border-line bg-surface/30 text-xs text-muted transition-colors hover:border-fg hover:text-fg sm:flex uppercase font-mono"
            aria-label="Toggle Language"
          >
            {lang}
          </button>

          <button
            type="button"
            onClick={() => overlay.toggle("palette")}
            className="hidden h-8 items-center gap-2 border border-line bg-surface/30 px-2.5 text-muted transition-colors hover:border-fg hover:text-fg sm:flex"
            aria-label={t("command_palette")}
          >
            <span className="label font-mono text-[10px] tracking-wider">{t("command_palette")}</span>
            <Kbd>⌘K</Kbd>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="label h-8 border border-line px-3 text-xs text-muted hover:border-fg hover:text-fg lg:hidden"
          >
            {menuOpen ? t("close") + " [×]" : t("menu") + " [≡]"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col justify-between overflow-y-auto bg-bg px-6 py-8 lg:hidden">
          <nav className="flex flex-col border-t border-line" aria-label="Điều hướng">
            {[{ href: "/", key: "lab_ready" as const }, ...NAV_KEYS].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "display border-b border-line py-4 text-3xl tracking-tight uppercase",
                  pathname === link.href ? "text-fg font-bold" : "text-muted",
                )}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-6 pt-8 border-t border-line">
            <ChaosSlider />
            <div className="flex items-center justify-between">
              <RegionToggle />
              <span className="label flex items-center gap-2 text-muted text-xs">
                {t("audio")} <AudioToggle />
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
