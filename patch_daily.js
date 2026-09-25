const fs = require('fs');
let content = fs.readFileSync('app/daily/page.tsx', 'utf8');

const tHelper = `
const PAGE_T = {
  vi: {
    w1: "MỘT THẾ GIỚI.",
    w2: "MỘT HẠT GIỐNG.",
    w3: "24 GIỜ DUY NHẤT.",
    day_utc: "NGÀY UTC:",
    next_seed: "SEED MỚI SAU:",
    desc: "Mọi kỹ sư và nhà sáng lập truy cập trong ngày hôm nay trên toàn cầu đều nhận được một hạt giống ý tưởng tất định giống hệt nhau.",
  },
  en: {
    w1: "ONE WORLD.",
    w2: "ONE SEED.",
    w3: "24 HOURS ONLY.",
    day_utc: "UTC DAY:",
    next_seed: "NEXT SEED IN:",
    desc: "Every engineer and founder accessing the lab globally today receives the exact same deterministic idea seed.",
  }
};
`;

content = content.replace(
  'import { IdeaResult } from "@/components/idea/IdeaResult";',
  'import { IdeaResult } from "@/components/idea/IdeaResult";\nimport { useTranslation } from "@/lib/ui/useTranslation";\n' + tHelper
);

content = content.replace(
  'export default function DailyPage() {\n  const overlay = useOverlay();',
  'export default function DailyPage() {\n  const overlay = useOverlay();\n  const { lang } = useTranslation();\n  const tPage = (key: keyof typeof PAGE_T.vi) => PAGE_T[lang][key] ?? PAGE_T.vi[key];'
);

content = content.replace(/>MỘT THẾ GIỚI\.</, '>{tPage("w1")}<');
content = content.replace(/>MỘT HẠT GIỐNG\.</, '>{tPage("w2")}<');
content = content.replace(/>24 GIỜ DUY NHẤT\.</, '>{tPage("w3")}<');
content = content.replace(/>NGÀY UTC:</, '>{tPage("day_utc")}<');
content = content.replace(/>SEED MỚI SAU:</, '>{tPage("next_seed")}<');
content = content.replace(/>Mọi kỹ sư và nhà sáng lập truy cập trong ngày hôm nay trên toàn cầu đều nhận được một hạt giống ý tưởng tất định giống hệt nhau\.</, '>{tPage("desc")}<');

fs.writeFileSync('app/daily/page.tsx', content);
