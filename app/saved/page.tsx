"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSpin } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { toast } from "@/lib/ui/toast";
import { copyText } from "@/lib/ui/clipboard";
import { absoluteUrl, timeAgo } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { IdeaCard } from "@/components/idea/IdeaCard";
import { Button } from "@/components/ui/Button";
import type { HistoryEntry } from "@/types";

export default function SavedPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const history = useSpin((s) => s.history);
  const storeHydrated = useSpin((s) => s.hydrated);
  const clearHistory = useSpin((s) => s.clearHistory);
  const removeHistory = useSpin((s) => s.removeHistory);
  const toggleSave = useSpin((s) => s.toggleSave);
  const loadIdea = useSpin((s) => s.loadIdea);

  const [tab, setTab] = useState<"saved" | "history">("saved");
  const [confirming, setConfirming] = useState(false);
  const [search, setSearch] = useState("");

  const saved = history.filter((h) => h.saved);
  const currentList = tab === "saved" ? saved : history;
  const ready = hydrated && storeHydrated;

  const filtered = currentList.filter((entry) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const i = entry.idea;
    return (
      i.concept.name.toLowerCase().includes(q) ||
      i.concept.pitch.toLowerCase().includes(q) ||
      i.dna.domain.label.toLowerCase().includes(q) ||
      i.dna.target.label.toLowerCase().includes(q) ||
      i.dna.mechanic.label.toLowerCase().includes(q) ||
      i.dna.trend.title.toLowerCase().includes(q)
    );
  });

  const open = (entry: HistoryEntry) => {
    loadIdea(entry.idea, { record: false });
    router.push("/");
  };

  const exportJson = () => {
    if (currentList.length === 0) return;
    const data = JSON.stringify(currentList.map((item) => item.idea), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spin-build-${tab}-ideas.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("ĐÃ XUẤT FILE JSON", { detail: `${currentList.length} ý tưởng đã được tải về` });
  };

  const exportCsv = () => {
    if (currentList.length === 0) return;
    const headers = [
      "Code",
      "Name",
      "Pitch",
      "Hook",
      "Domain",
      "Target",
      "Mechanic",
      "Trend",
      "Chaos",
      "Constraint",
      "Difficulty",
      "Estimate",
      "ViralScore",
      "URL",
    ];
    const escapeCsv = (str: string) => `"${(str || "").replace(/"/g, '""')}"`;
    const rows = currentList.map((item) => {
      const i = item.idea;
      return [
        escapeCsv(i.code),
        escapeCsv(i.concept.name),
        escapeCsv(i.concept.pitch),
        escapeCsv(i.concept.hook),
        escapeCsv(i.dna.domain.label),
        escapeCsv(i.dna.target.label),
        escapeCsv(i.dna.mechanic.label),
        escapeCsv(i.dna.trend.title),
        escapeCsv(i.dna.chaos.short),
        escapeCsv(i.dna.constraint.short),
        escapeCsv(i.concept.difficulty),
        escapeCsv(i.concept.estimate),
        i.concept.viral.score,
        escapeCsv(absoluteUrl(`/idea/${i.code}`)),
      ].join(",");
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spin-build-${tab}-ideas.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("ĐÃ XUẤT FILE CSV", { detail: `${currentList.length} ý tưởng sẵn sàng mở bằng Excel / Google Sheets` });
  };

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="label text-muted">BỘ SƯU TẬP Ý TƯỞNG //</span>
          <h1 className="display text-[clamp(2.6rem,7vw,6.5rem)] tracking-tight">
            ĐÁNG GIỮ
            <br />
            LẠI.
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-line">
          <div className="flex" role="tablist">
            {(
              [
                ["saved", `ĐÃ LƯU (${saved.length})`],
                ["history", `LỊCH SỬ QUAY (${history.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => {
                  setTab(key);
                  setSearch("");
                }}
                className={cn(
                  "label h-11 border-b px-4 first:pl-0 transition-colors font-bold tracking-wider",
                  tab === key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentList.length > 0 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={exportJson}>
                  Xuất JSON
                </Button>
                <Button size="sm" variant="outline" onClick={exportCsv}>
                  Xuất CSV
                </Button>
              </div>
            )}

            <div className="label flex items-center gap-4 text-subtle text-xs">
              <span>Chỉ lưu cục bộ trên trình duyệt</span>
              {history.length > 0 &&
                (confirming ? (
                  <span className="flex items-center gap-3 text-fg">
                    Xác nhận xóa?
                    <button
                      type="button"
                      className="underline underline-offset-4 font-bold"
                      onClick={() => {
                        clearHistory();
                        setConfirming(false);
                        toast("ĐÃ XÓA LỊCH SỬ", { detail: "Các mục đã lưu vẫn được giữ nguyên" });
                      }}
                    >
                      Xóa hết
                    </button>
                    <button type="button" className="text-muted hover:text-fg" onClick={() => setConfirming(false)}>
                      Hủy
                    </button>
                  </span>
                ) : (
                  <button type="button" className="text-muted hover:text-fg underline underline-offset-4" onClick={() => setConfirming(true)}>
                    Xóa lịch sử
                  </button>
                ))}
            </div>
          </div>
        </div>

        {currentList.length > 0 && (
          <div className="flex items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, lĩnh vực, đối tượng, xu hướng..."
              className="label h-9 w-full max-w-md border border-line bg-transparent px-3 text-fg outline-none placeholder:text-subtle focus:border-fg"
            />
          </div>
        )}
      </header>

      {!ready ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 border border-line bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-6 border-b border-line py-16">
          <p className="display text-[clamp(1.8rem,4vw,3.2rem)] text-muted">
            {search
              ? "Không tìm thấy ý tưởng khớp với từ khóa."
              : tab === "saved"
              ? "CHƯA LƯU Ý TƯỞNG NÀO."
              : "CHƯA QUAY LẦN NÀO."}
          </p>
          <p className="text-sm text-muted">
            {search
              ? "Thử tìm kiếm bằng tên danh mục hoặc xóa bộ lọc."
              : tab === "saved"
              ? "Khi gặp ý tưởng xuất sắc trong phòng Lab, hãy bấm nút Lưu (hoặc nhấn phím S)."
              : "Hãy quay một vòng tại trang chủ để lưu lại dấu vết sáng tạo."}
          </p>
          <Link href="/" className="label underline underline-offset-4 hover:text-fg font-bold">
            VỀ VÒNG QUAY LAB →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <IdeaCard
              key={entry.id}
              idea={entry.idea}
              meta={<span>{timeAgo(entry.timestamp)}</span>}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {entry.locked.length > 0 && (
                    <span className="label mr-2 text-subtle">Ghim: {entry.locked.length}</span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => open(entry)}>
                    Mở trong Lab
                  </Button>
                  <Button size="sm" variant="outline" pressed={entry.saved} onClick={() => toggleSave(entry.id)}>
                    {entry.saved ? "Đã lưu" : "Lưu"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const ok = await copyText(absoluteUrl(`/idea/${entry.idea.code}`));
                      toast(ok ? "ĐÃ SAO CHÉP LIÊN KẾT" : "KHÔNG THỂ SAO CHÉP LIÊN KẾT");
                    }}
                  >
                    Chép link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeHistory(entry.id)} aria-label="Xóa khỏi danh sách">
                    Xóa
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
