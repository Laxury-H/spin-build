const fs = require('fs');

const content = `"use client";

import Link from "next/link";
import { CHAOS_BANDS } from "@/types";
import { useSpin } from "@/lib/store";

export default function AboutPage() {
  const lang = useSpin((s: any) => s.lang);
  const isEn = lang === "en";

  const GENES = isEn ? ["DOMAIN", "TARGET", "MECHANIC", "TREND", "CHAOS BREAKTHROUGH", "CONSTRAINT"] : ["LĨNH VỰC", "ĐỐI TƯỢNG", "CƠ CHẾ", "XU HƯỚNG", "CHAOS ĐỘT PHÁ", "RÀNG BUỘC"];

  const BAND_DESC = (label: string) => {
    if (!isEn) {
      if (label === "SANE") return "Công cụ thực dụng, giải quyết bài toán thực tế.";
      if (label === "CREATIVE") return "Side project có cá tính, tạo điểm nhấn khác biệt.";
      if (label === "EXPERIMENTAL") return "Sản phẩm thử nghiệm, kết hợp bất ngờ.";
      if (label === "WEIRD") return "Ý tưởng quái chiêu, tính lan truyền cao.";
      if (label === "CURSED") return "100% Chaos. Đột phá tới cùng cực, phá vỡ mọi khuôn khổ.";
    } else {
      if (label === "SANE") return "Practical tool, solving real-world problems.";
      if (label === "CREATIVE") return "Side project with personality, finding unique angles.";
      if (label === "EXPERIMENTAL") return "Experimental product, unexpected combination.";
      if (label === "WEIRD") return "Weird idea, highly viral potential.";
      if (label === "CURSED") return "100% Chaos. Extreme breakthroughs, breaking all molds.";
    }
    return "";
  };

  const KEYS: [string, string][] = isEn ? [
    ["SPACE", "Spin the roulette to generate an idea"],
    ["R", "Reroll unpinned genes"],
    ["1–6", "Lock / Unlock specific genes in DNA"],
    ["M", "Trigger idea mutation (Mutate Menu)"],
    ["B", "View implementation brief & AI Prompts (Build Brief)"],
    ["S", "Save idea to local browser storage"],
    ["⇧S (Shift+S)", "Export 1080×1350 graphic poster or share link"],
    ["⌘K / Ctrl+K", "Global Command Palette"],
    ["ESC", "Return to lab / Close dialog"],
  ] : [
    ["SPACE", "Kích hoạt vòng quay roulette tạo ý tưởng"],
    ["R", "Quay lại (reroll) các mảnh gen chưa ghim"],
    ["1–6", "Khóa / Mở khóa từng tham số gen trong cấu trúc DNA"],
    ["M", "Kích hoạt biến dị ý tưởng (Mutate Menu)"],
    ["B", "Xem bản đặc tả triển khai & Prompt cho AI (Build Brief)"],
    ["S", "Lưu ý tưởng vào bộ nhớ trình duyệt"],
    ["⇧S (Shift+S)", "Xuất poster đồ họa 1080×1350 hoặc chia sẻ link"],
    ["⌘K / Ctrl+K", "Bảng lệnh tập trung (Command Palette)"],
    ["ESC", "Quay về vòng quay / Đóng hộp thoại"],
  ];

  const LIVE_SOURCES = isEn ? [
    "Hacker News (Algolia Search API — live tech & AI news)",
    "Google Trends (RSS Feed for real-time search trends)",
    "Curated Cultural Lexicon (Handpicked internet culture & trends)",
  ] : [
    "Hacker News (Algolia Search API — cập nhật tin tức công nghệ & AI)",
    "Google Trends (RSS Feed dữ liệu tìm kiếm xu hướng thời gian thực)",
    "Curated Cultural Lexicon (Kho từ vựng & trào lưu internet được chọn lọc)",
  ];

  return (
    <main className="enter mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 md:px-8 lg:py-16">
      <div className="mb-12 flex flex-col gap-2">
        <span className="label text-muted tracking-wider">{isEn ? "SYNTHESIS FORMULA //" : "CÔNG THỨC TỔNG HỢP //"}</span>
        <h1 className="display text-4xl tracking-tight sm:text-5xl">
          {GENES.map((g, i) => (
            <span key={i} className={i % 2 === 0 ? "text-fg" : "text-subtle"}>
              {g}
              {i < GENES.length - 1 ? " × " : " = "}
            </span>
          ))}
          <span className="bg-fg px-2 text-bg font-bold">{isEn ? "NEW IDEA" : "Ý TƯỞNG MỚI"}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h1 className="label text-muted font-bold tracking-wider">{isEn ? "THE NATURE OF SPIN//BUILD" : "BẢN CHẤT CỦA SPIN//BUILD"}</h1>
          <p className="text-sm leading-relaxed text-fg">
            {isEn ? "SPIN//BUILD is a lab-style idea roulette for engineers, designers, and indie hackers who want to build truly unique products instead of copying boring templates." : "SPIN//BUILD là một công cụ tạo ý tưởng dạng roulette phòng thí nghiệm dành cho các kỹ sư, nhà thiết kế và indie hacker muốn tạo ra những sản phẩm thực sự độc đáo thay vì sao chép những khuôn mẫu nhàm chán."}
          </p>
          <p className="text-sm leading-relaxed text-muted">
            {isEn ? "The fun comes from the collision of opposing gene combinations, not silly jokes. Any idea falling into cliché patterns (like todo apps, simple notes, weather apps...) is caught by the Boringness filter and auto-mutated before display." : "Sự thú vị nảy sinh từ sự va đập giữa các tổ hợp gen đối lập, không phải từ những câu đùa ngớ ngẩn. Bất kỳ ý tưởng nào rơi vào khuôn mẫu sáo mòn (như app todo, app ghi chú đơn thuần, app thời tiết…) đều được bộ lọc Boringness phát hiện và tự động kích hoạt biến dị đột phá trước khi hiển thị."}
          </p>

          <h2 className="label mt-6 text-muted font-bold tracking-wider">{isEn ? "HOW IT WORKS" : "NGUYÊN LÝ HOẠT ĐỘNG"}</h2>
          <ul className="flex flex-col gap-4 text-sm leading-relaxed text-muted">
            <li>
              <strong className="text-fg">{isEn ? "Absolute determinism:" : "Tính tất định tuyệt đối:"}</strong> {isEn ? "Results are pre-determined by a seeded RNG — the same recipe seed always yields the exact same idea." : "Kết quả được quyết định trước bởi seeded RNG — cùng recipe seed luôn cho ra cùng một ý tưởng duy nhất."}
            </li>
            <li>
              <strong className="text-fg">{isEn ? "No accounts needed:" : "Không cần tài khoản:"}</strong> {isEn ? "Your entire spin history and saved ideas live entirely in your browser (Local-First)." : "Toàn bộ lịch sử quay, ý tưởng đã lưu trữ đều nằm trọn vẹn trong trình duyệt của bạn (Local-First)."}
            </li>
            <li>
              <strong className="text-fg">{isEn ? "Global sync:" : "Đồng bộ toàn cầu:"}</strong> {isEn ? "Daily Spin gives everyone worldwide the exact same deterministic idea based on the UTC day." : "Mục Daily Spin cung cấp cùng một ý tưởng cố định cho mọi người dùng trên toàn thế giới theo ngày UTC."}
            </li>
            <li>
              <strong className="text-fg">{isEn ? "Real-time trends:" : "Xu hướng thời gian thực:"}</strong> {isEn ? "Automatically scrapes Hacker News & Google Trends; auto-falls back to safe data if network drops." : "Tự động thu thập xu hướng từ Hacker News & Google Trends; cơ chế tự động chuyển vùng đệm an toàn nếu mạng gián đoạn."}
            </li>
            <li>
              <strong className="text-fg">{isEn ? "Ready to code:" : "Sẵn sàng lập trình:"}</strong> {isEn ? "The brief includes Tech Stack, Core Loop, and optimized Prompts for Claude, Cursor, or ChatGPT." : "Bản đặc tả đi kèm cấu trúc kỹ thuật (Tech Stack), chu trình trải nghiệm (Core Loop) và Prompt tối ưu hóa cho Claude, Cursor hay ChatGPT."}
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="label text-muted font-bold tracking-wider">{isEn ? "5 CHAOS LEVELS" : "5 CẤP ĐỘ CHAOS"}</h2>
          <div className="flex flex-col">
            {CHAOS_BANDS.map((band, i) => (
              <div key={band.label} className="flex gap-4 border-b border-line py-3 last:border-0">
                <span className="label w-24 shrink-0 text-fg font-mono">{band.label}</span>
                <p className="text-sm text-muted">{BAND_DESC(band.label)}</p>
              </div>
            ))}
          </div>

          <h2 className="label mt-6 text-muted font-bold tracking-wider">{isEn ? "KEYBOARD SHORTCUTS" : "PHÍM TẮT THAO TÁC NHANH"}</h2>
          <div className="flex flex-col">
            {KEYS.map(([key, desc], i) => (
              <div key={i} className="flex gap-4 border-b border-line py-2 last:border-0">
                <span className="label w-24 shrink-0 font-mono text-[10px] uppercase text-fg">{key}</span>
                <span className="text-xs text-muted">{desc}</span>
              </div>
            ))}
          </div>

          <h2 className="label mt-6 text-muted font-bold tracking-wider">{isEn ? "LIVE TREND SOURCES" : "NGUỒN DỮ LIỆU TREND TRỰC TIẾP"}</h2>
          <ul className="flex flex-col gap-2 text-xs text-muted">
            {LIVE_SOURCES.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1 w-1 bg-fg" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-16 flex items-center justify-between border-t border-line pt-8">
        <Link href="/" className="label font-bold text-fg underline underline-offset-4 hover:text-muted">
          {isEn ? "← BACK TO LABORATORY" : "← VỀ VÒNG QUAY PHÒNG THÍ NGHIỆM"}
        </Link>
        <span className="label text-subtle font-mono text-xs">SPIN//BUILD LAB OS v0.1.0</span>
      </div>
    </main>
  );
}
`;

fs.writeFileSync('app/about/page.tsx', content);
