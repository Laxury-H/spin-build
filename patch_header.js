const fs = require('fs');
let content = fs.readFileSync('components/shell/SiteHeader.tsx', 'utf8');

content = content.replace(
  'aria-label="SPIN//BUILD — Trang chủ"',
  'aria-label={t("home")}'
);

content = content.replace(
  'aria-label="Điều hướng chính"',
  'aria-label={t("main_nav")}'
);

content = content.replace(
  'aria-label="Điều hướng"',
  'aria-label={t("nav")}'
);

fs.writeFileSync('components/shell/SiteHeader.tsx', content);
