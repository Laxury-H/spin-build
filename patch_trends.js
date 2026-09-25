const fs = require('fs');
let content = fs.readFileSync('app/trends/page.tsx', 'utf8');

const tHelper = `
const PAGE_T = {
  vi: {
    tech: "Công nghệ", culture: "Văn hóa", business: "Kinh doanh", music: "Âm nhạc", finance: "Tài chính", gaming: "Game", lifestyle: "Lối sống", sports: "Thể thao", science: "Khoa học", design: "Thiết kế", news: "Tin tức", other: "Khác",
    hot: "↑ Nóng", rising: "↗ Đang lên", steady: "→ Ổn định",
    ok: "OK", degraded: "Chập chờn", down: "Lỗi", disabled: "Tắt",
    target_locked: "Đã chọn //", next_spin: "Xu hướng này sẽ vào lần quay tới",
    title1: "Internet đang", title2: "ám ảnh điều gì.",
    live_sources: "nguồn live",
    curated: "Dữ liệu tuyển chọn",
    updated: "Cập nhật",
    syncing: "Đang tải…", refresh: "Làm mới",
    filter_all: "Tất cả", search_placeholder: "Tìm xu hướng",
    no_match: "Không có xu hướng nào khớp.", seen_in: "Thấy ở:",
    source: "Nguồn", inject: "[ Đưa vào vòng quay ]", injected: "Đã chọn cho lần quay tới",
    data_sources: "Nguồn dữ liệu",
    state: "Trạng thái", notes: "Ghi chú", count: "Số mục", latency: "Độ trễ",
    using_curated: "Đang dùng dữ liệu tuyển chọn sẵn", global: "toàn cầu", vn: "Việt Nam",
    score_desc: "Điểm số là trọng số nội bộ của vòng quay (độ mới, tín hiệu từ nguồn, số nguồn cùng nhắc tới, độ lạ, khả năng làm thành app) — không phải thước đo mức độ phổ biến khách quan."
  },
  en: {
    tech: "Tech", culture: "Culture", business: "Business", music: "Music", finance: "Finance", gaming: "Gaming", lifestyle: "Lifestyle", sports: "Sports", science: "Science", design: "Design", news: "News", other: "Other",
    hot: "↑ Hot", rising: "↗ Rising", steady: "→ Steady",
    ok: "OK", degraded: "Degraded", down: "Down", disabled: "Disabled",
    target_locked: "Target Locked //", next_spin: "Injected into next spin",
    title1: "What the internet", title2: "is obsessing over.",
    live_sources: "live sources",
    curated: "Curated data",
    updated: "Updated",
    syncing: "Syncing…", refresh: "Refresh",
    filter_all: "All", search_placeholder: "Search trends",
    no_match: "No matching trends.", seen_in: "Seen in:",
    source: "Source", inject: "[ Inject into Lab ]", injected: "Injected for next spin",
    data_sources: "Data Sources",
    state: "Status", notes: "Notes", count: "Items", latency: "Latency",
    using_curated: "Using curated data", global: "global", vn: "Vietnam",
    score_desc: "Scores represent internal roulette weight (recency, source signals, cross-source matches, weirdness, app-ability) — not objective popularity metrics."
  }
};
`;

content = content.replace(
  'import { useTranslation } from "@/lib/ui/useTranslation";',
  'import { useTranslation } from "@/lib/ui/useTranslation";\n' + tHelper
);

content = content.replace(
  'export default function TrendsPage() {',
  'export default function TrendsPage() {\n  const { lang } = useTranslation();\n  const tPage = (key: keyof typeof PAGE_T.vi) => PAGE_T[lang][key] ?? PAGE_T.vi[key];'
);

content = content.replace(
  /const CATEGORY_VI: Record<string, string> = \{[\s\S]*?\};\n/,
  `const CATEGORY_T = (cat: string, tPage: any) => {\n  switch(cat) {\n    case "TECH": return tPage("tech");\n    case "CULTURE": return tPage("culture");\n    case "BUSINESS": return tPage("business");\n    case "MUSIC": return tPage("music");\n    case "FINANCE": return tPage("finance");\n    case "GAMING": return tPage("gaming");\n    case "LIFESTYLE": return tPage("lifestyle");\n    case "SPORTS": return tPage("sports");\n    case "SCIENCE": return tPage("science");\n    case "DESIGN": return tPage("design");\n    case "NEWS": return tPage("news");\n    default: return tPage("other");\n  }\n};\n`
);

content = content.replace(
  /const HEAT_VI: Record<string, string> = \{[\s\S]*?\};\n/,
  `const HEAT_T = (heat: string, tPage: any) => {\n  if (heat === "HOT") return tPage("hot");\n  if (heat === "RISING") return tPage("rising");\n  return tPage("steady");\n};\n`
);

content = content.replace(
  /const STATE_VI: Record<string, string> = \{ ok: "OK", degraded: "Chập chờn", down: "Lỗi", disabled: "Tắt" \};/,
  `const STATE_T = (state: string, tPage: any) => {\n  switch(state) { case "ok": return tPage("ok"); case "degraded": return tPage("degraded"); case "down": return tPage("down"); default: return tPage("disabled"); }\n};`
);

content = content.replace(
  /toast\(`Đã chọn \/\/ \$\{t\.title\.toUpperCase\(\)\}`, \{\n\s*detail: "Xu hướng này sẽ vào lần quay tới",\n\s*\}\);/,
  `toast(\`\${tPage("target_locked")} \${t.title.toUpperCase()}\`, { detail: tPage("next_spin") });`
);

content = content.replace(/Internet đang/g, `{tPage("title1")}`);
content = content.replace(/ám ảnh điều gì\./g, `{tPage("title2")}`);
content = content.replace(/\{okCount\}\/\{liveProviders\.length\} nguồn live/, '{okCount}/{liveProviders.length} {tPage("live_sources")}');
content = content.replace(/"Dữ liệu tuyển chọn"/, 'tPage("curated")');
content = content.replace(/Cập nhật /, '{tPage("updated")} ');
content = content.replace(/\{syncing \? "Đang tải…" : "Làm mới"\}/, '{syncing ? tPage("syncing") : tPage("refresh")}');
content = content.replace(/\{c === "ALL" \? "Tất cả" : CATEGORY_VI\[c\]\}/, '{c === "ALL" ? tPage("filter_all") : CATEGORY_T(c, tPage)}');
content = content.replace(/aria-label="Tìm xu hướng"/, 'aria-label={tPage("search_placeholder")}');
content = content.replace(/placeholder="Tìm xu hướng"/, 'placeholder={tPage("search_placeholder")}');
content = content.replace(/Không có xu hướng nào khớp\./, '{tPage("no_match")}');
content = content.replace(/Thấy ở:/, '{tPage("seen_in")}');
content = content.replace(/Nguồn/, '{tPage("source")}');
content = content.replace(/\{injected \? "Đã chọn cho lần quay tới" : "\[ Đưa vào vòng quay \]"}/, '{injected ? tPage("injected") : tPage("inject")}');
content = content.replace(/>Nguồn dữ liệu</, '>{tPage("data_sources")}<');
content = content.replace(/>Trạng thái</, '>{tPage("state")}<');
content = content.replace(/>Ghi chú</, '>{tPage("notes")}<');
content = content.replace(/>Số mục</, '>{tPage("count")}<');
content = content.replace(/>Độ trễ</, '>{tPage("latency")}<');
content = content.replace(/Đang dùng dữ liệu tuyển chọn sẵn \(\{region === "VN" \? "Việt Nam" : "toàn cầu"\}\)\./, '{tPage("using_curated")} ({region === "VN" ? tPage("vn") : tPage("global")}).');
content = content.replace(/Điểm số là trọng số nội bộ của vòng quay \(độ mới, tín hiệu từ nguồn, số nguồn cùng nhắc tới, độ lạ, khả năng\s*làm thành app\) — không phải thước đo mức độ phổ biến khách quan\./, '{tPage("score_desc")}');
content = content.replace(/HEAT_VI\[t.heat\]/g, 'HEAT_T(t.heat, tPage)');
content = content.replace(/STATE_VI\[p.state\]/g, 'STATE_T(p.state, tPage)');

fs.writeFileSync('app/trends/page.tsx', content);
