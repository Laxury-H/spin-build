const fs = require('fs');
let content = fs.readFileSync('components/idea/IdeaResult.tsx', 'utf8');

content = content.replace(
  'aria-label="Cấu trúc liên kết ý tưởng"',
  'aria-label={t("dna_structure")}'
);

fs.writeFileSync('components/idea/IdeaResult.tsx', content);
