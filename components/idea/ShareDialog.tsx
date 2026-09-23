"use client";

import { useEffect, useRef, useState } from "react";
import type { Idea } from "@/types";
import { renderShareCard, shareCardBlob } from "./share-card";
import { ideaToText } from "@/lib/generator/brief";
import { copyText } from "@/lib/ui/clipboard";
import { toast } from "@/lib/ui/toast";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export function ShareDialog({
  idea,
  open,
  onClose,
  eyebrow,
  sharePath,
}: {
  idea: Idea | null;
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  sharePath?: string;
}) {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}${sharePath || `/idea/${idea?.code || ""}`}`
    : `http://localhost:3000${sharePath || `/idea/${idea?.code || ""}`}`;

  useEffect(() => {
    if (!open || !idea) return;
    let isCancelled = false;

    renderShareCard(idea, {
      eyebrow,
      host: typeof window !== "undefined" ? window.location.host : "SPIN//BUILD",
    }).then((c) => {
      if (!isCancelled) {
        setDataUrl(c.toDataURL("image/png"));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [open, idea, eyebrow]);

  if (!idea) return null;

  const handleCopyLink = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopiedLink(true);
      toast("ĐÃ SAO CHÉP ĐƯỜNG LINK", { detail: url });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyText = async () => {
    const ok = await copyText(ideaToText(idea));
    if (ok) {
      setCopiedText(true);
      toast("ĐÃ SAO CHÉP TÓM TẮT", { detail: "Sẵn sàng để dán vào tin nhắn" });
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleDownloadImage = async () => {
    const blob = await shareCardBlob(idea, { eyebrow });
    if (!blob) return;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `spin-build-${idea.recipe.seed || "card"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    toast("ĐÃ TẢI XUỐNG ẢNH POSTER", { detail: "Độ phân giải cao 1080×1350 PNG" });
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: idea.concept.name,
          text: idea.concept.pitch,
          url,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`CHIA SẺ // ${idea.concept.name}`}
      size="center"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Poster Card Preview */}
        <div
          ref={canvasContainerRef}
          className="rounded-xl border border-line bg-surface p-2 flex items-center justify-center overflow-hidden aspect-[4/5] max-h-[440px]"
        >
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={idea.concept.name}
              className="max-h-full w-auto object-contain rounded-lg border border-line shadow-lg"
            />
          ) : (
            <div className="text-xs font-mono text-muted animate-pulse">
              ĐANG TẠO ẢNH POSTER…
            </div>
          )}
        </div>

        {/* Share Actions */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono text-muted uppercase">LINK CHIA SẺ TRỰC TIẾP</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={url}
                className="w-full bg-surface-2 rounded-lg border border-line px-3 py-2 font-mono text-xs text-fg select-all outline-none"
              />
              <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0 font-mono">
                {copiedLink ? "ĐÃ SAO CHÉP ✓" : "SAO CHÉP"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-3 border-t border-line">
            <Button variant="solid" onClick={handleDownloadImage} className="font-bold">
              📥 TẢI XUỐNG ẢNH POSTER (PNG)
            </Button>
            <Button variant="outline" onClick={handleCopyText} className="font-mono text-xs">
              {copiedText ? "ĐÃ SAO CHÉP ✓" : "SAO CHÉP VĂN BẢN TÓM TẮT"}
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button variant="ghost" onClick={handleNativeShare} className="text-xs">
                CHIA SẺ LÊN ỨNG DỤNG KHÁC…
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
