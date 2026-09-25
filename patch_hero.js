const fs = require('fs');
let content = fs.readFileSync('lib/ui/i18n.ts', 'utf8');

content = content.replace(
  /hero_title_1: "BUILD SOMETHING",\n\s*hero_title_2: "THAT SHOULDN'T",\n\s*hero_title_3: "EXIST\.",/,
  `hero_title_1: "TẠO RA THỨ",
    hero_title_2: "KHÔNG NÊN",
    hero_title_3: "TỒN TẠI.",`
);

fs.writeFileSync('lib/ui/i18n.ts', content);
