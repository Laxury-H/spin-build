import Link from "next/link";
import type { Metadata } from "next";
import { CHAOS_BANDS } from "@/types";

export const metadata: Metadata = {
  title: "Giới thiệu & Triết lý",
  description: "Công thức toán học và kiến trúc của cỗ máy tạo ý tưởng SPIN//BUILD.",
};

const GENES = ["LĨNH VỰC", "ĐỐI TƯỢNG", "CƠ CHẾ", "XU HƯỚNG", "CHAOS ĐỘT PHÁ", "RÀNG BUỘC"];

const BAND_VI: Record<string, string> = {
  SANE: "Công cụ thực dụng, giải quyết bài toán thực tế.",
  CREATIVE: "Side project có cá tính, tạo điểm nhấn khác biệt.",
  EXPERIMENTAL: "Sản phẩm thử nghiệm, kết hợp bất ngờ.",
  WEIRD: "Ý tưởng quái chiêu, tính lan truyền cao.",
  CURSED: "100% Chaos. Đột phá tới cùng cực, phá vỡ mọi khuôn khổ.",
};

const KEYS: [string, string][] = [
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

const SOURCES = [
  "Hacker News (Algolia Search API — cập nhật tin tức công nghệ & AI)",
  "Google Trends (RSS Feed dữ liệu tìm kiếm xu hướng thời gian thực)",
  "Curated Cultural Lexicon (Kho từ vựng & trào lưu internet được chọn lọc)",
];

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-3">
        <span className="label text-muted tracking-wider">CÔNG THỨC TỔNG HỢP //</span>
        <p className="display text-[clamp(1.8rem,4.6vw,4.4rem)] tracking-tight">
          {GENES.map((g, i) => (
            <span key={g}>
              {g}
              {i < GENES.length - 1 ? <span className="text-subtle"> × </span> : null}
            </span>
          ))}
          <span className="text-subtle"> = </span>
          <span className="bg-fg px-2 text-bg font-bold">Ý TƯỞNG MỚI</span>
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 border-t border-line pt-8 lg:grid-cols-12">
        <section className="flex flex-col gap-4 lg:col-span-5">
          <h1 className="label text-muted font-bold tracking-wider">BẢN CHẤT CỦA SPIN//BUILD</h1>
          <p className="text-lg leading-relaxed text-fg">
            SPIN//BUILD là một công cụ tạo ý tưởng dạng roulette phòng thí nghiệm dành cho các kỹ sư, nhà thiết kế và indie hacker muốn tạo ra những sản phẩm thực sự độc đáo thay vì sao chép những khuôn mẫu nhàm chán.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Sự thú vị nảy sinh từ sự va đập giữa các tổ hợp gen đối lập, không phải từ những câu đùa ngớ ngẩn. Bất kỳ ý tưởng nào rơi vào khuôn mẫu sáo mòn (như app todo, app ghi chú đơn thuần, app thời tiết…) đều được bộ lọc Boringness phát hiện và tự động kích hoạt biến dị đột phá trước khi hiển thị.
          </p>
        </section>

        <section className="flex flex-col gap-4 lg:col-span-6 lg:col-start-7">
          <h2 className="label text-muted font-bold tracking-wider">NGUYÊN LÝ HOẠT ĐỘNG</h2>
          <ol className="flex flex-col border-t border-line">
            {[
              "Tính tất định tuyệt đối: Kết quả được quyết định trước bởi seeded RNG — cùng recipe seed luôn cho ra cùng một ý tưởng duy nhất.",
              "Không cần tài khoản: Toàn bộ lịch sử quay, ý tưởng đã lưu trữ đều nằm trọn vẹn trong trình duyệt của bạn (Local-First).",
              "Đồng bộ toàn cầu: Mục Daily Spin cung cấp cùng một ý tưởng cố định cho mọi người dùng trên toàn thế giới theo ngày UTC.",
              "Xu hướng thời gian thực: Tự động thu thập xu hướng từ Hacker News & Google Trends; cơ chế tự động chuyển vùng đệm an toàn nếu mạng gián đoạn.",
              "Sẵn sàng lập trình: Bản đặc tả đi kèm cấu trúc kỹ thuật (Tech Stack), chu trình trải nghiệm (Core Loop) và Prompt tối ưu hóa cho Claude, Cursor hay ChatGPT.",
            ].map((t, i) => (
              <li key={i} className="flex gap-4 border-b border-line py-3.5 text-sm leading-relaxed">
                <span className="label pt-0.5 text-subtle font-mono">{String(i + 1).padStart(2, "0")}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4 border-t border-line pt-8 lg:col-span-5">
          <h2 className="label text-muted font-bold tracking-wider">5 CẤP ĐỘ CHAOS</h2>
          <div className="flex flex-col border-t border-line">
            {CHAOS_BANDS.map((b) => (
              <div key={b.label} className="flex flex-col gap-1 border-b border-line py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold">{b.label}</span>
                  <span className="label font-mono text-subtle">
                    {b.min}–{b.max}%
                  </span>
                </div>
                <p className="text-xs text-muted">{BAND_VI[b.label]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-line pt-8 lg:col-span-6 lg:col-start-7">
          <h2 className="label text-muted font-bold tracking-wider">PHÍM TẮT THAO TÁC NHANH</h2>
          <div className="flex flex-col border-t border-line">
            {KEYS.map(([k, desc]) => (
              <div key={k} className="flex items-center justify-between border-b border-line py-2.5">
                <span className="text-sm text-fg">{desc}</span>
                <span className="label font-mono border border-line bg-surface px-2 py-0.5 text-xs text-muted">{k}</span>
              </div>
            ))}
          </div>

          <h2 className="label mt-6 text-muted font-bold tracking-wider">NGUỒN DỮ LIỆU TREND TRỰC TIẾP</h2>
          <ul className="flex flex-col gap-2 text-xs text-muted">
            {SOURCES.map((s, i) => (
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
          ← VỀ VÒNG QUAY PHÒNG THÍ NGHIỆM
        </Link>
        <span className="label text-subtle font-mono text-xs">SPIN//BUILD LAB OS v0.1.0</span>
      </div>
    </main>
  );
}

