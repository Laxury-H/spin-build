const fs = require('fs');
let content = fs.readFileSync('components/lab/SpinLab.tsx', 'utf8');

content = content.replace(
  'aria-label="Lối tắt"',
  'aria-label={t("shortcut_nav")}'
);

content = content.replace(
  'aria-label="Khu vực quay ý tưởng"',
  'aria-label={t("spin_area")}'
);

content = content.replace(
  'aria-label="Thông số hệ thống"',
  'aria-label={t("system_params")}'
);

content = content.replace(
  'aria-label="System Telemetry"',
  'aria-label={t("system_params")}'
);

content = content.replace(
  'aria-label="System parameters"',
  'aria-label={t("system_params")}'
);

content = content.replace(
  'aria-label="Hủy chèn xu hướng"',
  'aria-label={t("cancel_trend")}'
);

fs.writeFileSync('components/lab/SpinLab.tsx', content);
