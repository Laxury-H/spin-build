const fs = require('fs');
let content = fs.readFileSync('components/shell/controls.tsx', 'utf8');

const regex = /const BAND_DESC_KEY: Record<string, any> = \{[\s\S]*?\};\n\s*SANE: "Công cụ thực dụng, dùng được ngay\.",\n\s*CREATIVE: "Side project có cá tính\.",\n\s*EXPERIMENTAL: "Sản phẩm thử nghiệm\.",\n\s*WEIRD: "App internet kỳ quặc\.",\n\s*CURSED: "Bị nguyền, nhưng biết đâu lại hay\.",\n\};/g;

content = content.replace(regex, `const BAND_DESC_KEY: Record<string, any> = {
    SANE: "chaos_sane_desc",
    CREATIVE: "chaos_creative_desc",
    EXPERIMENTAL: "chaos_experimental_desc",
    WEIRD: "chaos_weird_desc",
    CURSED: "chaos_cursed_desc",
  };`);

fs.writeFileSync('components/shell/controls.tsx', content);
