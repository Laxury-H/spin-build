const fs = require('fs');
let content = fs.readFileSync('app/about/page.tsx', 'utf8');

content = content.replace(/const GENES = [\s\S]*?;\n\nconst BAND_DESC = [\s\S]*?;\n\nconst KEYS: \[string, string\]\[\] = [\s\S]*?;\n\nconst LIVE_SOURCES = [\s\S]*?;\n/, '');

content = content.replace('export default function AboutPage() {\n  const lang = useSpin((s) => s.lang);\n  const isEn = lang === "en";',
`export default function AboutPage() {\n  const lang = useSpin((s: any) => s.lang);\n  const isEn = lang === "en";

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
`
);

fs.writeFileSync('app/about/page.tsx', content);
