const fs = require('fs');
let content = fs.readFileSync('components/idea/IdeaCard.tsx', 'utf8');

content = content.replace(
  'import { cn } from "@/lib/ui/cn";',
  'import { cn } from "@/lib/ui/cn";\nimport { useTranslation } from "@/lib/ui/useTranslation";'
);

content = content.replace(
  'export function IdeaCard({ idea, meta, className }: IdeaCardProps) {',
  'export function IdeaCard({ idea, meta, className }: IdeaCardProps) {\n  const { t } = useTranslation();'
);

content = content.replace(
  '<span>Độ dị {idea.recipe.chaos}%</span>',
  '<span>{t("chaos_label")} {idea.recipe.chaos}%</span>'
);

fs.writeFileSync('components/idea/IdeaCard.tsx', content);
