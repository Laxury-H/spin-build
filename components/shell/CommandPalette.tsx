"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSpin } from "@/lib/store";
import { useOverlay } from "@/lib/ui/dialogs";
import { toast } from "@/lib/ui/toast";
import { Kbd } from "@/components/ui/Kbd";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  action: () => void;
}

function getRandomChaosPercent(): number {
  return Math.floor(Math.random() * 100);
}

export function CommandPalette() {
  const overlay = useOverlay();
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = overlay.open === "palette";

  const spin = useSpin((s) => s.spin);
  const reroll = useSpin((s) => s.reroll);
  const clearLocks = useSpin((s) => s.clearLocks);
  const setChaos = useSpin((s) => s.setChaos);
  const toggleSave = useSpin((s) => s.toggleSave);
  const current = useSpin((s) => s.current);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        overlay.toggle("palette");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [overlay]);

  const executeSpin = (opts?: { cursed?: boolean; chaos?: number }) => {
    overlay.hide();
    if (pathname !== "/") {
      router.push("/?cmd=spin");
    } else {
      spin(opts);
    }
  };

  const commands: CommandItem[] = [
    {
      id: "spin",
      label: "SPIN WHEEL",
      description: "Trigger a fresh roulette roll",
      shortcut: "SPACE",
      action: () => executeSpin(),
    },
    {
      id: "cursed",
      label: "/CURSED",
      description: "100% chaos spin. No refunds.",
      shortcut: "CRSD",
      action: () => {
        executeSpin({ cursed: true, chaos: 100 });
        toast("CURSED MODE ACTIVATED", { detail: "MAXIMUM CHAOS GENERATION" });
      },
    },
    {
      id: "max-chaos",
      label: "MAX CHAOS",
      description: "Set chaos slider to 100%",
      action: () => {
        setChaos(100);
        overlay.hide();
        toast("CHAOS 100%", { detail: "SLIDER MAXED" });
      },
    },
    {
      id: "reroll",
      label: "REROLL UNLOCKED",
      description: "Re-roll unlocked DNA genes instantly",
      shortcut: "R",
      action: () => {
        overlay.hide();
        if (current) {
          reroll();
        } else {
          executeSpin();
        }
      },
    },
    {
      id: "randomize",
      label: "RANDOMIZE EVERYTHING",
      description: "Clear all locks and randomize chaos",
      action: () => {
        clearLocks();
        const randChaos = getRandomChaosPercent();
        setChaos(randChaos);
        executeSpin({ chaos: randChaos });
      },
    },
    {
      id: "clear-locks",
      label: "CLEAR LOCKS",
      description: "Unlock all DNA parameters",
      action: () => {
        clearLocks();
        overlay.hide();
        toast("LOCKS CLEARED", { detail: "ALL GENES UNLOCKED" });
      },
    },
    {
      id: "build",
      label: "BUILD THIS",
      description: "View full product brief & coding prompt",
      shortcut: "B",
      action: () => {
        overlay.show("brief");
      },
    },
    {
      id: "share",
      label: "SHARE IDEA",
      description: "Export poster card or copy link",
      shortcut: "⇧S",
      action: () => {
        overlay.show("share");
      },
    },
    {
      id: "save",
      label: "SAVE IDEA",
      description: "Bookmark the current idea to your collection",
      shortcut: "S",
      action: () => {
        overlay.hide();
        toggleSave();
        toast("IDEA BOOKMARKED", { detail: "SAVED TO LOCAL STORAGE" });
      },
    },
    {
      id: "daily",
      label: "DAILY SPIN",
      description: "Today's synchronized global seed idea",
      action: () => {
        overlay.hide();
        router.push("/daily");
      },
    },
    {
      id: "fuse",
      label: "FUSE TWO IDEAS",
      description: "Combine two concepts into a hybrid",
      action: () => {
        overlay.hide();
        router.push("/fuse");
      },
    },
    {
      id: "trends",
      label: "GO: TREND PULSE",
      description: "Inspect live cultural currents and memes",
      action: () => {
        overlay.hide();
        router.push("/trends");
      },
    },
    {
      id: "saved-page",
      label: "GO: SAVED & HISTORY",
      description: "View bookmarked ideas and generation history",
      action: () => {
        overlay.hide();
        router.push("/saved");
      },
    },
    {
      id: "about-page",
      label: "GO: ABOUT",
      description: "Manifesto and design philosophy",
      action: () => {
        overlay.hide();
        router.push("/about");
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      overlay.hide();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/80 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => overlay.hide()}
    >
      <div
        className="w-full max-w-xl bg-bg border border-line-strong overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
          <span className="font-mono text-muted text-sm font-bold">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or /cursed..."
            className="w-full bg-transparent font-mono text-sm text-fg outline-none placeholder:text-muted"
          />
          <Kbd>ESC</Kbd>
        </div>

        {/* Command List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-line/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-muted">
              NO COMMANDS MATCHING &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-fg text-bg" : "hover:bg-surface text-fg"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      {item.label}
                    </span>
                    <span
                      className={`text-[11px] ${
                        isSelected ? "text-bg/80" : "text-muted"
                      }`}
                    >
                      {item.description}
                    </span>
                  </div>

                  {item.shortcut && (
                    <Kbd className={isSelected ? "border-bg/40 text-bg" : ""}>
                      {item.shortcut}
                    </Kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts legend */}
        <div className="px-4 py-2 border-t border-line bg-surface flex items-center justify-between text-[10px] font-mono text-muted">
          <span>↑/↓ NAVIGATE</span>
          <span>↵ SELECT</span>
          <span>ESC CLOSE</span>
        </div>
      </div>
    </div>
  );
}
