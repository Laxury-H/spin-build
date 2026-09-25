const fs = require('fs');
let content = fs.readFileSync('components/idea/BuildBriefDialog.tsx', 'utf8');

content = content.replace(
  /toast\("ĐÃ SAO CHÉP PROMPT CHO AI"[\s\S]*?\);/,
  `toast(t("copied_prompt"), { detail: t("copied_prompt_detail") });`
);

content = content.replace(
  /toast\("ĐÃ SAO CHÉP TÓM TẮT Ý TƯỞNG"[\s\S]*?\);/,
  `toast(t("copied_summary"), { detail: t("copied_summary_detail") });`
);

fs.writeFileSync('components/idea/BuildBriefDialog.tsx', content);
