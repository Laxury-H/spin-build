const fs = require('fs');
let content = fs.readFileSync('components/shell/controls.tsx', 'utf8');

content = content.replace(
  /const BAND_DESC_KEY: Record<string, any> = \{[\s\S]*?CURSED: "Bị nguyền, nhưng biết đâu lại hay\.",\n\};/,
  `const BAND_DESC_KEY: Record<string, any> = {
    SANE: "chaos_sane_desc",
    CREATIVE: "chaos_creative_desc",
    EXPERIMENTAL: "chaos_experimental_desc",
    WEIRD: "chaos_weird_desc",
    CURSED: "chaos_cursed_desc",
  };`
);

fs.writeFileSync('components/shell/controls.tsx', content);
