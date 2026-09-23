"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSpin } from "@/lib/store";
import { useOverlay } from "@/lib/ui/dialogs";
import { ChaosSlider, AudioToggle, RegionToggle } from "./controls";
import { Kbd } from "@/components/ui/Kbd";

export function SiteHeader() {
  const pathname = usePathname();
  const chaos = useSpin((s) => s.chaos);
  const audio = useSpin((s) => s.audio);
  const setAudio = useSpin((s) => s.setAudio);
  const overlay = useOverlay();
  const [chaosOpen, setChaosOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const trendsStatus = useSpin((s) => s.trends.status);
  const isTrendsLive = trendsStatus === "ONLINE" || trendsStatus === "PARTIAL";

  const navLinks = [
    { href: "/", label: "Vòng quay" },
    { href: "/trends", label: "Xu hướng", live: true },
    { href: "/saved", label: "Đã lưu" },
    { href: "/daily", label: "Hôm nay" },
    { href: "/fuse", label: "Ghép ý tưởng" },
    { href: "/about", label: "Giới thiệu" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-bg/90 backdrop-blur-md border-b border-line flex items-center justify-between px-4 md:px-6">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-fg text-bg flex items-center justify-center font-bold text-xs shadow-sm">
            🎡
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold tracking-tight text-sm text-fg leading-none flex items-center gap-1">
              SPIN<span className="text-muted font-mono">//</span>BUILD
            </span>
            <span className="text-[9px] font-mono text-muted tracking-widest uppercase">
              IDEA ROULETTE
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-surface-2 text-fg font-semibold border border-line"
                    : "text-muted hover:text-fg hover:bg-surface"
                }`}
              >
                <span>{link.label}</span>
                {link.live && isTrendsLive && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Audio Quick Toggle */}
        <button
          type="button"
          onClick={() => setAudio(!audio)}
          className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
            audio
              ? "border-line-strong bg-surface text-fg"
              : "border-line text-muted hover:text-fg"
          }`}
          title={audio ? "Âm thanh: Bật" : "Âm thanh: Tắt"}
          aria-label="Toggle audio"
        >
          {audio ? "🔊" : "🔇"}
        </button>

        {/* Chaos Level Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setChaosOpen(!chaosOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-surface hover:border-line-strong transition-colors text-xs cursor-pointer shadow-xs"
            aria-label="Cài đặt mức độ táo bạo"
          >
            <span className="text-muted text-[11px]">Độ dị:</span>
            <span className="font-mono tabular-nums text-fg font-bold">{chaos}%</span>
            <span className="text-[10px] text-muted">▾</span>
          </button>

          {chaosOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setChaosOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-72 shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <ChaosSlider />
              </div>
            </>
          )}
        </div>

        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={() => overlay.toggle("palette")}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line hover:border-line-strong text-muted hover:text-fg text-xs transition-colors cursor-pointer"
          title="Tìm kiếm lệnh nhanh (⌘K hoặc Ctrl+K)"
        >
          <span>Tìm</span>
          <Kbd>⌘K</Kbd>
        </button>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-1.5 px-2.5 rounded-md border border-line text-xs text-muted hover:text-fg cursor-pointer"
        >
          ☰ MENU
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-14 bottom-0 z-50 bg-bg/98 backdrop-blur-xl p-6 flex flex-col justify-between lg:hidden border-b border-line animate-in fade-in duration-150">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium py-2 px-3 rounded-lg transition-colors ${
                  pathname === link.href ? "bg-surface text-fg font-bold" : "text-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-4 pt-6 border-t border-line">
            <ChaosSlider />
            <div className="flex items-center justify-between">
              <RegionToggle />
              <AudioToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
