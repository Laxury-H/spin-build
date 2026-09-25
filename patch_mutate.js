const fs = require('fs');
let content = fs.readFileSync('components/idea/MutateMenu.tsx', 'utf8');

content = content.replace(
  'import { useSpin } from "@/lib/store";',
  'import { useSpin } from "@/lib/store";\nimport { useTranslation } from "@/lib/ui/useTranslation";'
);

content = content.replace(
  /const LABEL_VI: Record<MutationKind, \[string, string\]> = \{\n[\s\S]*?\};/,
  `const LABEL_KEY: Record<MutationKind, [any, any]> = {
  useful: ["mut_useful_title", "mut_useful_desc"],
  viral: ["mut_viral_title", "mut_viral_desc"],
  weird: ["mut_weird_title", "mut_weird_desc"],
  technical: ["mut_tech_title", "mut_tech_desc"],
  social: ["mut_social_title", "mut_social_desc"],
  simpler: ["mut_simpler_title", "mut_simpler_desc"],
  harder: ["mut_harder_title", "mut_harder_desc"],
  cheaper: ["mut_cheaper_title", "mut_cheaper_desc"],
  chaotic: ["mut_chaotic_title", "mut_chaotic_desc"],
};`
);

content = content.replace(
  'export function MutateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {\n  const mutate = useSpin((s) => s.mutate);',
  'export function MutateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {\n  const mutate = useSpin((s) => s.mutate);\n  const { t } = useTranslation();'
);

content = content.replace(
  'toast(`Biến dị // ${LABEL_VI[kind][0]}`);',
  'toast(`${t("mutate_btn_prefix")} ${t(LABEL_KEY[kind][0])}`);'
);

content = content.replace(
  'aria-label="Biến dị ý tưởng"',
  'aria-label={t("mutate_title")}'
);

content = content.replace(
  '<span className="label text-fg">Biến dị //</span>',
  '<span className="label text-fg">{t("mutate_btn_prefix")}</span>'
);

content = content.replace(
  '<span className="label text-fg">{LABEL_VI[k][0]}</span>\n              <span className="text-muted">{LABEL_VI[k][1]}</span>',
  '<span className="label text-fg">{t(LABEL_KEY[k][0])}</span>\n              <span className="text-muted">{t(LABEL_KEY[k][1])}</span>'
);

fs.writeFileSync('components/idea/MutateMenu.tsx', content);
