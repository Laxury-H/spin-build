const fs = require('fs');
let content = fs.readFileSync('components/shell/controls.tsx', 'utf8');

// Replace hardcoded strings
content = content.replace(
  'import { useSpin } from "@/lib/store";',
  'import { useSpin } from "@/lib/store";\nimport { useTranslation } from "@/lib/ui/useTranslation";'
);

content = content.replace(
  'const BAND_VI: Record<string, string> = {',
  'const BAND_DESC_KEY: Record<string, any> = {\n    SANE: "chaos_sane_desc",\n    CREATIVE: "chaos_creative_desc",\n    EXPERIMENTAL: "chaos_experimental_desc",\n    WEIRD: "chaos_weird_desc",\n    CURSED: "chaos_cursed_desc",\n  };'
);

content = content.replace(
  'SANE: "Công cụ thực dụng, dùng được ngay.",\n  CREATIVE: "Side project có cá tính.",\n  EXPERIMENTAL: "Sản phẩm thử nghiệm.",\n  WEIRD: "App internet kỳ quặc.",\n  CURSED: "Bị nguyền, nhưng biết đâu lại hay.",',
  ''
);

content = content.replace(
  /const PRESETS = \[\n\s*\{ label: "Thực tế", value: 15 \},\n\s*\{ label: "Cân bằng", value: 50 \},\n\s*\{ label: "Siêu dị", value: 90 \},\n\s*\];/,
  'const PRESETS = [\n    { key: "preset_sane", value: 15 },\n    { key: "preset_balanced", value: 50 },\n    { key: "preset_unhinged", value: 90 },\n  ];'
);

content = content.replace(
  'export function ChaosSlider({ className }: { className?: string }) {\n  const chaos = useSpin((s) => s.chaos);\n  const setChaos = useSpin((s) => s.setChaos);',
  'export function ChaosSlider({ className }: { className?: string }) {\n  const chaos = useSpin((s) => s.chaos);\n  const setChaos = useSpin((s) => s.setChaos);\n  const { t } = useTranslation();'
);

content = content.replace(
  '{PRESETS.map((p, i) => {',
  '{PRESETS.map((p, i) => {'
);

content = content.replace(
  /<button\n\s*key=\{p\.value\}\n\s*type="button"\n\s*onClick=\{\(\) => setChaos\(p\.value\)\}\n\s*className=\{cn\(\n\s*"label border-x border-transparent py-2 text-center text-xs transition-colors first:border-l-0 last:border-r-0",\n\s*active \? "bg-fg text-bg font-bold" : "text-muted hover:text-fg hover:bg-surface\/50"\n\s*\)\}\n\s*>\n\s*\{p\.label\}\n\s*<\/button>/g,
  '<button\n              key={p.value}\n              type="button"\n              onClick={() => setChaos(p.value)}\n              className={cn(\n                "label border-x border-transparent py-2 text-center text-[10px] transition-colors first:border-l-0 last:border-r-0",\n                active ? "bg-fg text-bg font-bold" : "text-muted hover:text-fg hover:bg-surface/50"\n              )}\n            >\n              {t(p.key as any)}\n            </button>'
);

content = content.replace(
  /<p className="text-xs leading-5 text-muted">\{BAND_VI\[band\.label\] \?\? band\.description\}<\/p>/,
  '<p className="text-xs leading-5 text-muted">{t(BAND_DESC_KEY[band.label] as any) ?? band.description}</p>'
);

content = content.replace(/<span className="text-muted">Độ dị<\/span>/g, '<span className="text-muted">{t("chaos_label")}</span>');
content = content.replace(/<span className="label text-muted">Độ dị<\/span>/g, '<span className="label text-muted">{t("chaos_label")}</span>');

content = content.replace(/aria-label="Độ dị"/, 'aria-label={t("chaos_label")}');
content = content.replace(/aria-label="Mức độ dị có sẵn"/, 'aria-label={t("chaos_level_aria")}');

content = content.replace(
  'export function RegionToggle({ className }: { className?: string }) {\n  const region = useSpin((s) => s.region);\n  const setRegion = useSpin((s) => s.setRegion);',
  'export function RegionToggle({ className }: { className?: string }) {\n  const region = useSpin((s) => s.region);\n  const setRegion = useSpin((s) => s.setRegion);\n  const { t } = useTranslation();'
);

content = content.replace(
  /aria-label="Khu vực xu hướng"/,
  'aria-label={t("region_aria")}'
);

content = content.replace(
  /\{r === "VN" \? "Việt Nam" : "Toàn cầu"\}/,
  '{r === "VN" ? t("region_vn") : t("region_global")}'
);

content = content.replace(
  'export function AudioToggle({ className }: { className?: string }) {\n  const audio = useSpin((s) => s.audio);\n  const setAudio = useSpin((s) => s.setAudio);',
  'export function AudioToggle({ className }: { className?: string }) {\n  const audio = useSpin((s) => s.audio);\n  const setAudio = useSpin((s) => s.setAudio);\n  const { t } = useTranslation();'
);

content = content.replace(
  /\{audio \? "\[ Bật \]" : "\[ Tắt \]"\}/,
  '{audio ? t("on") : t("off")}'
);

content = content.replace(
  'export function TrendEngineStatus({ bare, className }: { bare?: boolean; className?: string }) {\n  const status = useSpin((s) => s.trends.status);\n  const trendSync = useSpin((s) => s.trendSync);',
  'export function TrendEngineStatus({ bare, className }: { bare?: boolean; className?: string }) {\n  const status = useSpin((s) => s.trends.status);\n  const trendSync = useSpin((s) => s.trendSync);\n  const { t } = useTranslation();'
);

content = content.replace(
  /const text =\n\s*trendSync === "syncing"\n\s*\? "Đang đồng bộ"\n\s*: status === "ONLINE"\n\s*\? "Online"\n\s*: status === "PARTIAL"\n\s*\? "Một phần"\n\s*: "Bộ nhớ đệm";/,
  'const text =\n      trendSync === "syncing"\n        ? t("syncing")\n        : status === "ONLINE"\n          ? "Online"\n          : status === "PARTIAL"\n            ? t("partial")\n            : t("cache");'
);

fs.writeFileSync('components/shell/controls.tsx', content);
