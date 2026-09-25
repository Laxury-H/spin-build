const fs = require('fs');
let content = fs.readFileSync('app/about/page.tsx', 'utf8');

const tHelper = `
const PAGE_T = {
  vi: {
    gene_1: "LĨNH VỰC", gene_2: "ĐỐI TƯỢNG", gene_3: "CƠ CHẾ", gene_4: "XU HƯỚNG", gene_5: "CHAOS ĐỘT PHÁ", gene_6: "RÀNG BUỘC",
    sane: "Công cụ thực dụng, giải quyết bài toán thực tế.",
    creative: "Side project có cá tính, tạo điểm nhấn khác biệt.",
    experimental: "Sản phẩm thử nghiệm, kết hợp bất ngờ.",
    weird: "Ý tưởng quái chiêu, tính lan truyền cao.",
    cursed: "100% Chaos. Đột phá tới cùng cực, phá vỡ mọi khuôn khổ.",
    key_space: "Kích hoạt vòng quay roulette tạo ý tưởng",
    key_r: "Quay lại (reroll) các mảnh gen chưa ghim",
    key_16: "Khóa / Mở khóa từng tham số gen trong cấu trúc DNA",
    key_m: "Kích hoạt biến dị ý tưởng (Mutate Menu)",
    key_b: "Xem bản đặc tả triển khai & Prompt cho AI (Build Brief)",
    key_s: "Lưu ý tưởng vào bộ nhớ trình duyệt",
    key_shifts: "Xuất poster đồ họa 1080×1350 hoặc chia sẻ link",
    key_cmdk: "Bảng lệnh tập trung (Command Palette)",
    key_esc: "Quay về vòng quay / Đóng hộp thoại",
    hn: "Hacker News (Algolia Search API — cập nhật tin tức công nghệ & AI)",
    google: "Google Trends (RSS Feed dữ liệu tìm kiếm xu hướng thời gian thực)",
    curated: "Curated Cultural Lexicon (Kho từ vựng & trào lưu internet được chọn lọc)",
    formula: "CÔNG THỨC TỔNG HỢP //",
    new_idea: "Ý TƯỞNG MỚI",
    h1: "BẢN CHẤT CỦA SPIN//BUILD",
    p1: "SPIN//BUILD là một công cụ tạo ý tưởng dạng roulette phòng thí nghiệm dành cho các kỹ sư, nhà thiết kế và indie hacker muốn tạo ra những sản phẩm thực sự độc đáo thay vì sao chép những khuôn mẫu nhàm chán.",
    p2: "Sự thú vị nảy sinh từ sự va đập giữa các tổ hợp gen đối lập, không phải từ những câu đùa ngớ ngẩn. Bất kỳ ý tưởng nào rơi vào khuôn mẫu sáo mòn (như app todo, app ghi chú đơn thuần, app thời tiết…) đều được bộ lọc Boringness phát hiện và tự động kích hoạt biến dị đột phá trước khi hiển thị.",
    h2: "NGUYÊN LÝ HOẠT ĐỘNG",
    li1: "Tính tất định tuyệt đối: Kết quả được quyết định trước bởi seeded RNG — cùng recipe seed luôn cho ra cùng một ý tưởng duy nhất.",
    li2: "Không cần tài khoản: Toàn bộ lịch sử quay, ý tưởng đã lưu trữ đều nằm trọn vẹn trong trình duyệt của bạn (Local-First).",
    li3: "Đồng bộ toàn cầu: Mục Daily Spin cung cấp cùng một ý tưởng cố định cho mọi người dùng trên toàn thế giới theo ngày UTC.",
    li4: "Xu hướng thời gian thực: Tự động thu thập xu hướng từ Hacker News & Google Trends; cơ chế tự động chuyển vùng đệm an toàn nếu mạng gián đoạn.",
    li5: "Sẵn sàng lập trình: Bản đặc tả đi kèm cấu trúc kỹ thuật (Tech Stack), chu trình trải nghiệm (Core Loop) và Prompt tối ưu hóa cho Claude, Cursor hay ChatGPT.",
    h3: "5 CẤP ĐỘ CHAOS",
    h4: "PHÍM TẮT THAO TÁC NHANH",
    h5: "NGUỒN DỮ LIỆU TREND TRỰC TIẾP",
    back: "← VỀ VÒNG QUAY PHÒNG THÍ NGHIỆM"
  },
  en: {
    gene_1: "DOMAIN", gene_2: "TARGET", gene_3: "MECHANIC", gene_4: "TREND", gene_5: "CHAOS", gene_6: "CONSTRAINT",
    sane: "Practical tool, solving real-world problems.",
    creative: "Side project with personality, finding unique angles.",
    experimental: "Experimental product, unexpected combination.",
    weird: "Weird idea, highly viral potential.",
    cursed: "100% Chaos. Extreme breakthroughs, breaking all molds.",
    key_space: "Spin the roulette to generate an idea",
    key_r: "Reroll unpinned genes",
    key_16: "Lock / Unlock specific genes in DNA",
    key_m: "Trigger idea mutation (Mutate Menu)",
    key_b: "View implementation brief & AI Prompts (Build Brief)",
    key_s: "Save idea to local browser storage",
    key_shifts: "Export 1080×1350 graphic poster or share link",
    key_cmdk: "Global Command Palette",
    key_esc: "Return to lab / Close dialog",
    hn: "Hacker News (Algolia Search API — live tech & AI news)",
    google: "Google Trends (RSS Feed for real-time search trends)",
    curated: "Curated Cultural Lexicon (Handpicked internet culture & trends)",
    formula: "SYNTHESIS FORMULA //",
    new_idea: "NEW CONCEPT",
    h1: "THE NATURE OF SPIN//BUILD",
    p1: "SPIN//BUILD is a laboratory roulette generator for engineers, designers, and indie hackers who want to build truly unique products instead of copying boring templates.",
    p2: "The fun comes from the collision of opposing gene combinations, not silly jokes. Any idea falling into cliché patterns (like todo apps, simple notes, weather apps...) is caught by the Boringness filter and auto-mutated before display.",
    h2: "HOW IT WORKS",
    li1: "Absolute determinism: Results are pre-determined by a seeded RNG — the same recipe seed always yields the exact same idea.",
    li2: "No accounts needed: Your entire spin history and saved ideas live entirely in your browser (Local-First).",
    li3: "Global sync: Daily Spin gives everyone worldwide the exact same deterministic idea based on the UTC day.",
    li4: "Real-time trends: Automatically scrapes Hacker News & Google Trends; auto-falls back to safe data if network drops.",
    li5: "Ready to code: The brief includes Tech Stack, Core Loop, and optimized Prompts for Claude, Cursor, or ChatGPT.",
    h3: "5 CHAOS LEVELS",
    h4: "KEYBOARD SHORTCUTS",
    h5: "LIVE TREND SOURCES",
    back: "← BACK TO LABORATORY"
  }
};
`;

content = content.replace(
  'import { AppShell } from "@/components/shell/AppShell";',
  'import { AppShell } from "@/components/shell/AppShell";\nimport { useTranslation } from "@/lib/ui/useTranslation";\n' + tHelper
);

content = content.replace(
  'export default function AboutPage() {',
  'export default function AboutPage() {\n  const { lang } = useTranslation();\n  const tPage = (key: keyof typeof PAGE_T.vi) => PAGE_T[lang][key] ?? PAGE_T.vi[key];\n  \n  const GENES = [tPage("gene_1"), tPage("gene_2"), tPage("gene_3"), tPage("gene_4"), tPage("gene_5"), tPage("gene_6")];\n  const BANDS = [\n    { label: "SANE", desc: tPage("sane") },\n    { label: "CREATIVE", desc: tPage("creative") },\n    { label: "EXPERIMENTAL", desc: tPage("experimental") },\n    { label: "WEIRD", desc: tPage("weird") },\n    { label: "CURSED", desc: tPage("cursed") },\n  ];\n  const HOTKEYS = [\n    ["SPACE", tPage("key_space")],\n    ["R", tPage("key_r")],\n    ["1–6", tPage("key_16")],\n    ["M", tPage("key_m")],\n    ["B", tPage("key_b")],\n    ["S", tPage("key_s")],\n    ["⇧S (Shift+S)", tPage("key_shifts")],\n    ["⌘K / Ctrl+K", tPage("key_cmdk")],\n    ["ESC", tPage("key_esc")],\n  ];\n  const SOURCES = [\n    tPage("hn"),\n    tPage("google"),\n    tPage("curated"),\n  ];\n'
);

// Wipe old constants
content = content.replace(/const GENES = \[[^\]]*\];\n/, '');
content = content.replace(/const BANDS = \[\n(?:.*\n)*?  \];\n/, '');
content = content.replace(/const HOTKEYS = \[\n(?:.*\n)*?  \];\n/, '');
content = content.replace(/const SOURCES = \[\n(?:.*\n)*?  \];\n/, '');

content = content.replace(/>CÔNG THỨC TỔNG HỢP \/\/</, '>{tPage("formula")}<');
content = content.replace(/>Ý TƯỞNG MỚI</, '>{tPage("new_idea")}<');
content = content.replace(/>BẢN CHẤT CỦA SPIN\/\/BUILD</, '>{tPage("h1")}<');
content = content.replace(/>SPIN\/\/BUILD là một công cụ tạo ý tưởng dạng roulette phòng thí nghiệm dành cho các kỹ sư, nhà thiết kế và indie hacker muốn tạo ra những sản phẩm thực sự độc đáo thay vì sao chép những khuôn mẫu nhàm chán\.</, '>{tPage("p1")}<');
content = content.replace(/>Sự thú vị nảy sinh từ sự va đập giữa các tổ hợp gen đối lập, không phải từ những câu đùa ngớ ngẩn\. Bất kỳ ý tưởng nào rơi vào khuôn mẫu sáo mòn \(như app todo, app ghi chú đơn thuần, app thời tiết…\) đều được bộ lọc Boringness phát hiện và tự động kích hoạt biến dị đột phá trước khi hiển thị\.</, '>{tPage("p2")}<');
content = content.replace(/>NGUYÊN LÝ HOẠT ĐỘNG</, '>{tPage("h2")}<');
content = content.replace(/>Tính tất định tuyệt đối: Kết quả được quyết định trước bởi seeded RNG — cùng recipe seed luôn cho ra cùng một ý tưởng duy nhất\.</, '>{tPage("li1")}<');
content = content.replace(/>Không cần tài khoản: Toàn bộ lịch sử quay, ý tưởng đã lưu trữ đều nằm trọn vẹn trong trình duyệt của bạn \(Local-First\)\.</, '>{tPage("li2")}<');
content = content.replace(/>Đồng bộ toàn cầu: Mục Daily Spin cung cấp cùng một ý tưởng cố định cho mọi người dùng trên toàn thế giới theo ngày UTC\.</, '>{tPage("li3")}<');
content = content.replace(/>Xu hướng thời gian thực: Tự động thu thập xu hướng từ Hacker News & Google Trends; cơ chế tự động chuyển vùng đệm an toàn nếu mạng gián đoạn\.</, '>{tPage("li4")}<');
content = content.replace(/>Sẵn sàng lập trình: Bản đặc tả đi kèm cấu trúc kỹ thuật \(Tech Stack\), chu trình trải nghiệm \(Core Loop\) và Prompt tối ưu hóa cho Claude, Cursor hay ChatGPT\.</, '>{tPage("li5")}<');
content = content.replace(/>5 CẤP ĐỘ CHAOS</, '>{tPage("h3")}<');
content = content.replace(/>PHÍM TẮT THAO TÁC NHANH</, '>{tPage("h4")}<');
content = content.replace(/>NGUỒN DỮ LIỆU TREND TRỰC TIẾP</, '>{tPage("h5")}<');
content = content.replace(/>← VỀ VÒNG QUAY PHÒNG THÍ NGHIỆM</, '>{tPage("back")}<');

fs.writeFileSync('app/about/page.tsx', content);
