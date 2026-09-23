"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSpin } from "@/lib/store";
import { toast } from "@/lib/ui/toast";
import { IdeaCard } from "@/components/idea/IdeaCard";
import { Button } from "@/components/ui/Button";

export default function SavedPage() {
  const router = useRouter();
  const history = useSpin((s) => s.history);
  const clearHistory = useSpin((s) => s.clearHistory);
  const removeHistory = useSpin((s) => s.removeHistory);
  const toggleSave = useSpin((s) => s.toggleSave);
  const loadIdea = useSpin((s) => s.loadIdea);

  const [activeTab, setActiveTab] = useState<"saved" | "history">("saved");

  const savedList = history.filter((h) => h.saved);
  const displayedList = activeTab === "saved" ? savedList : history;

  const handleOpenInLab = (entry: typeof history[0]) => {
    loadIdea(entry.idea);
    router.push("/");
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-line pb-4">
        <span className="text-xs font-mono text-muted uppercase">BỘ SƯU TẬP Ý TƯỞNG CỦA BẠN</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-fg uppercase tracking-tight">
            Ý TƯỞNG ĐÃ LƯU & LỊCH SỬ
          </h1>

          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử quay trên máy này?")) {
                  clearHistory();
                  toast("ĐÃ XÓA LỊCH SỬ");
                }
              }}
              className="text-xs font-mono text-muted hover:text-red-400"
            >
              XÓA LỊCH SỬ
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`py-2 px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "saved"
              ? "border-fg text-fg"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          Ý TƯỞNG ĐÃ LƯU ({savedList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`py-2 px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "history"
              ? "border-fg text-fg"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          TẤT CẢ LẦN QUAY ({history.length})
        </button>
      </div>

      {/* List */}
      {displayedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-line bg-surface/80 text-center gap-3">
          <span className="text-4xl">💡</span>
          <span className="font-mono text-sm text-fg font-bold uppercase">
            {activeTab === "saved"
              ? "CHƯA CÓ Ý TƯỞNG NÀO ĐƯỢC LƯU"
              : "CHƯA CÓ LỊCH SỬ QUAY NÀO"}
          </span>
          <p className="text-xs sm:text-sm text-muted max-w-sm leading-relaxed">
            {activeTab === "saved"
              ? "Khi quay được ý tưởng hay trong Vòng quay, bấm nút LƯU (hoặc phím S) để lưu lại tại đây."
              : "Hãy vào Vòng quay và nhấn QUAY Ý TƯỞNG để bắt đầu tạo ra các sản phẩm thú vị!"}
          </p>
          <Button
            variant="solid"
            size="sm"
            onClick={() => router.push("/")}
            className="mt-2"
          >
            VÀO VÒNG QUAY NGAY
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayedList.map((entry) => (
            <IdeaCard
              key={entry.id}
              idea={entry.idea}
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenInLab(entry)}
                  >
                    OPEN IN LAB
                  </Button>
                  <Button
                    size="sm"
                    variant={entry.saved ? "solid" : "outline"}
                    onClick={() => toggleSave(entry.id)}
                  >
                    {entry.saved ? "SAVED ✓" : "SAVE"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => removeHistory(entry.id)}
                    className="p-1 text-muted hover:text-fg font-mono text-xs cursor-pointer ml-1"
                    title="Remove from history"
                  >
                    ✕
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
