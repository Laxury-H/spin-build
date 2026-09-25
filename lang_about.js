const fs = require('fs');
let content = fs.readFileSync('app/about/page.tsx', 'utf8');

content = `"use client";\n` + content;
content = content.replace(/import type \{ Metadata \} from "next";\n/, 'import { useSpin } from "@/lib/store";\n');
content = content.replace(/export const metadata: Metadata = \{[\s\S]*?\};\n/, '');

content = content.replace('export default function AboutPage() {', 'export default function AboutPage() {\n  const lang = useSpin((s) => s.lang);\n  const isEn = lang === "en";');

content = content.replace(
  'const GENES = ["LĨNH VỰC", "ĐỐI TƯỢNG", "CƠ CHẾ", "XU HƯỚNG", "CHAOS ĐỘT PHÁ", "RÀNG BUỘC"];',
  'const GENES = isEn ? ["DOMAIN", "TARGET", "MECHANIC", "TREND", "CHAOS BREAKTHROUGH", "CONSTRAINT"] : ["LĨNH VỰC", "ĐỐI TƯỢNG", "CƠ CHẾ", "XU HƯỚNG", "CHAOS ĐỘT PHÁ", "RÀNG BUỘC"];'
);

content = content.replace(
  /const BAND_VI: Record<string, string> = \{[\s\S]*?\};\n/,
  `const BAND_DESC = (label: string) => {\n    if (!isEn) {\n      if (label === "SANE") return "Công cụ thực dụng, giải quyết bài toán thực tế.";\n      if (label === "CREATIVE") return "Side project có cá tính, tạo điểm nhấn khác biệt.";\n      if (label === "EXPERIMENTAL") return "Sản phẩm thử nghiệm, kết hợp bất ngờ.";\n      if (label === "WEIRD") return "Ý tưởng quái chiêu, tính lan truyền cao.";\n      if (label === "CURSED") return "100% Chaos. Đột phá tới cùng cực, phá vỡ mọi khuôn khổ.";\n    } else {\n      if (label === "SANE") return "Practical tool, solving real-world problems.";\n      if (label === "CREATIVE") return "Side project with personality, finding unique angles.";\n      if (label === "EXPERIMENTAL") return "Experimental product, unexpected combination.";\n      if (label === "WEIRD") return "Weird idea, highly viral potential.";\n      if (label === "CURSED") return "100% Chaos. Extreme breakthroughs, breaking all molds.";\n    }\n    return "";\n  };\n`
);

content = content.replace(/BAND_VI\[band\.label\]/g, 'BAND_DESC(band.label)');

content = content.replace(
  /const KEYS: \[string, string\]\[\] = \[[\s\S]*?\];\n/,
  `const KEYS: [string, string][] = isEn ? [\n    ["SPACE", "Spin the roulette to generate an idea"],\n    ["R", "Reroll unpinned genes"],\n    ["1–6", "Lock / Unlock specific genes in DNA"],\n    ["M", "Trigger idea mutation (Mutate Menu)"],\n    ["B", "View implementation brief & AI Prompts (Build Brief)"],\n    ["S", "Save idea to local browser storage"],\n    ["⇧S (Shift+S)", "Export 1080×1350 graphic poster or share link"],\n    ["⌘K / Ctrl+K", "Global Command Palette"],\n    ["ESC", "Return to lab / Close dialog"],\n  ] : [\n    ["SPACE", "Kích hoạt vòng quay roulette tạo ý tưởng"],\n    ["R", "Quay lại (reroll) các mảnh gen chưa ghim"],\n    ["1–6", "Khóa / Mở khóa từng tham số gen trong cấu trúc DNA"],\n    ["M", "Kích hoạt biến dị ý tưởng (Mutate Menu)"],\n    ["B", "Xem bản đặc tả triển khai & Prompt cho AI (Build Brief)"],\n    ["S", "Lưu ý tưởng vào bộ nhớ trình duyệt"],\n    ["⇧S (Shift+S)", "Xuất poster đồ họa 1080×1350 hoặc chia sẻ link"],\n    ["⌘K / Ctrl+K", "Bảng lệnh tập trung (Command Palette)"],\n    ["ESC", "Quay về vòng quay / Đóng hộp thoại"],\n  ];\n`
);

content = content.replace(
  /const LIVE_SOURCES = \[[\s\S]*?\];\n/,
  `const LIVE_SOURCES = isEn ? [\n    "Hacker News (Algolia Search API — live tech & AI news)",\n    "Google Trends (RSS Feed for real-time search trends)",\n    "Curated Cultural Lexicon (Handpicked internet culture & trends)",\n  ] : [\n    "Hacker News (Algolia Search API — cập nhật tin tức công nghệ & AI)",\n    "Google Trends (RSS Feed dữ liệu tìm kiếm xu hướng thời gian thực)",\n    "Curated Cultural Lexicon (Kho từ vựng & trào lưu internet được chọn lọc)",\n  ];\n`
);

content = content.replace(/>CÔNG THỨC TỔNG HỢP \/\/</, '>{isEn ? "SYNTHESIS FORMULA //" : "CÔNG THỨC TỔNG HỢP //"}<');
content = content.replace(/>Ý TƯỞNG MỚI</, '>{isEn ? "NEW IDEA" : "Ý TƯỞNG MỚI"}<');
content = content.replace(/>BẢN CHẤT CỦA SPIN\/\/BUILD</, '>{isEn ? "THE NATURE OF SPIN//BUILD" : "BẢN CHẤT CỦA SPIN//BUILD"}<');
content = content.replace(/>SPIN\/\/BUILD là một công cụ tạo ý tưởng dạng roulette phòng thí nghiệm dành cho các kỹ sư, nhà thiết kế và indie hacker muốn tạo ra những sản phẩm thực sự độc đáo thay vì sao chép những khuôn mẫu nhàm chán\.</, '>{isEn ? "SPIN//BUILD is a lab-style idea roulette for engineers, designers, and indie hackers who want to build truly unique products instead of copying boring templates." : "SPIN//BUILD là một công cụ tạo ý tưởng dạng roulette phòng thí nghiệm dành cho các kỹ sư, nhà thiết kế và indie hacker muốn tạo ra những sản phẩm thực sự độc đáo thay vì sao chép những khuôn mẫu nhàm chán."}<');
content = content.replace(/>Sự thú vị nảy sinh từ sự va đập giữa các tổ hợp gen đối lập, không phải từ những câu đùa ngớ ngẩn\. Bất kỳ ý tưởng nào rơi vào khuôn mẫu sáo mòn \(như app todo, app ghi chú đơn thuần, app thời tiết…\) đều được bộ lọc Boringness phát hiện và tự động kích hoạt biến dị đột phá trước khi hiển thị\.</, '>{isEn ? "The fun comes from the collision of opposing gene combinations, not silly jokes. Any idea falling into cliché patterns (like todo apps, simple notes, weather apps...) is caught by the Boringness filter and auto-mutated before display." : "Sự thú vị nảy sinh từ sự va đập giữa các tổ hợp gen đối lập, không phải từ những câu đùa ngớ ngẩn. Bất kỳ ý tưởng nào rơi vào khuôn mẫu sáo mòn (như app todo, app ghi chú đơn thuần, app thời tiết…) đều được bộ lọc Boringness phát hiện và tự động kích hoạt biến dị đột phá trước khi hiển thị."}<');
content = content.replace(/>NGUYÊN LÝ HOẠT ĐỘNG</, '>{isEn ? "HOW IT WORKS" : "NGUYÊN LÝ HOẠT ĐỘNG"}<');
content = content.replace(/>Tính tất định tuyệt đối: Kết quả được quyết định trước bởi seeded RNG — cùng recipe seed luôn cho ra cùng một ý tưởng duy nhất\.</, '>{isEn ? "Absolute determinism: Results are pre-determined by a seeded RNG — the same recipe seed always yields the exact same idea." : "Tính tất định tuyệt đối: Kết quả được quyết định trước bởi seeded RNG — cùng recipe seed luôn cho ra cùng một ý tưởng duy nhất."}<');
content = content.replace(/>Không cần tài khoản: Toàn bộ lịch sử quay, ý tưởng đã lưu trữ đều nằm trọn vẹn trong trình duyệt của bạn \(Local-First\)\.</, '>{isEn ? "No accounts needed: Your entire spin history and saved ideas live entirely in your browser (Local-First)." : "Không cần tài khoản: Toàn bộ lịch sử quay, ý tưởng đã lưu trữ đều nằm trọn vẹn trong trình duyệt của bạn (Local-First)."}<');
content = content.replace(/>Đồng bộ toàn cầu: Mục Daily Spin cung cấp cùng một ý tưởng cố định cho mọi người dùng trên toàn thế giới theo ngày UTC\.</, '>{isEn ? "Global sync: Daily Spin gives everyone worldwide the exact same deterministic idea based on the UTC day." : "Đồng bộ toàn cầu: Mục Daily Spin cung cấp cùng một ý tưởng cố định cho mọi người dùng trên toàn thế giới theo ngày UTC."}<');
content = content.replace(/>Xu hướng thời gian thực: Tự động thu thập xu hướng từ Hacker News & Google Trends; cơ chế tự động chuyển vùng đệm an toàn nếu mạng gián đoạn\.</, '>{isEn ? "Real-time trends: Automatically scrapes Hacker News & Google Trends; auto-falls back to safe data if network drops." : "Xu hướng thời gian thực: Tự động thu thập xu hướng từ Hacker News & Google Trends; cơ chế tự động chuyển vùng đệm an toàn nếu mạng gián đoạn."}<');
content = content.replace(/>Sẵn sàng lập trình: Bản đặc tả đi kèm cấu trúc kỹ thuật \(Tech Stack\), chu trình trải nghiệm \(Core Loop\) và Prompt tối ưu hóa cho Claude, Cursor hay ChatGPT\.</, '>{isEn ? "Ready to code: The brief includes Tech Stack, Core Loop, and optimized Prompts for Claude, Cursor, or ChatGPT." : "Sẵn sàng lập trình: Bản đặc tả đi kèm cấu trúc kỹ thuật (Tech Stack), chu trình trải nghiệm (Core Loop) và Prompt tối ưu hóa cho Claude, Cursor hay ChatGPT."}<');
content = content.replace(/>5 CẤP ĐỘ CHAOS</, '>{isEn ? "5 CHAOS LEVELS" : "5 CẤP ĐỘ CHAOS"}<');
content = content.replace(/>PHÍM TẮT THAO TÁC NHANH</, '>{isEn ? "KEYBOARD SHORTCUTS" : "PHÍM TẮT THAO TÁC NHANH"}<');
content = content.replace(/>NGUỒN DỮ LIỆU TREND TRỰC TIẾP</, '>{isEn ? "LIVE TREND SOURCES" : "NGUỒN DỮ LIỆU TREND TRỰC TIẾP"}<');
content = content.replace(/>← VỀ VÒNG QUAY PHÒNG THÍ NGHIỆM</, '>{isEn ? "← BACK TO LABORATORY" : "← VỀ VÒNG QUAY PHÒNG THÍ NGHIỆM"}<');

fs.writeFileSync('app/about/page.tsx', content);
