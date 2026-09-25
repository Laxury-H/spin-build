const fs = require('fs');
let content = fs.readFileSync('components/shell/controls.tsx', 'utf8');

content = content.replace(
  '  SANE: "Công cụ thực dụng, dùng được ngay.",\n  CREATIVE: "Side project có cá tính.",\n  EXPERIMENTAL: "Sản phẩm thử nghiệm.",\n  WEIRD: "App internet kỳ quặc.",\n  CURSED: "Bị nguyền, nhưng biết đâu lại hay.",\n};',
  ''
);

fs.writeFileSync('components/shell/controls.tsx', content);
