const fs = require('fs');
let content = fs.readFileSync('components/shell/controls.tsx', 'utf8');

content = content.replace(
  /const BAND_VI: Record<string, string> = \{[\s\S]*?\};\n/,
  ''
);
content = content.replace(
  /const PRESETS = \[[\s\S]*?\];/,
  `const PRESETS = [\n  { key: "preset_sane", value: 15 },\n  { key: "preset_balanced", value: 50 },\n  { key: "preset_unhinged", value: 90 },\n];`
);

content = content.replace(
  /aria-valuetext=\{`\$\{chaos\} phần trăm, \$\{band\.label\}`\}/,
  `aria-valuetext={\`\${chaos}%, \${t(BAND_DESC_KEY[band.label] as any)}\`}`
);

content = content.replace(
  /const text =[\s\S]*?: "Bộ nhớ đệm";/,
  `const text = trendSync === "syncing" ? t("syncing") : status === "ONLINE" ? "Online" : status === "PARTIAL" ? t("partial") : t("cache");`
);

fs.writeFileSync('components/shell/controls.tsx', content);
