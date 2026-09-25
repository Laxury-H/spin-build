const fs = require('fs');
let content = fs.readFileSync('components/lab/RevealOverlay.tsx', 'utf8');

content = content.replace(
  'import { useOverlay } from "@/lib/ui/dialogs";',
  'import { useOverlay } from "@/lib/ui/dialogs";\nimport { useTranslation } from "@/lib/ui/useTranslation";'
);

content = content.replace(
  'export function RevealOverlay({ idea, onComplete, onSkip }: RevealOverlayProps) {\n  const [step, setStep] = useState(0);',
  'export function RevealOverlay({ idea, onComplete, onSkip }: RevealOverlayProps) {\n  const [step, setStep] = useState(0);\n  const { t } = useTranslation();'
);

content = content.replace(
  /const lines: \[string, string\]\[\] = \[\n\s*\["Lĩnh vực", idea.dna.domain.short\],\n\s*\["Đối tượng", idea.dna.target.short\],\n\s*\["Cơ chế", idea.dna.mechanic.short\],\n\s*\["Xu hướng", idea.dna.trend.title.toUpperCase\(\)\],\n\s*\["Điểm dị", idea.dna.chaos.short\],\n\s*\["Ràng buộc", idea.dna.constraint.short\],\n\s*\];/,
  'const lines: [string, string][] = [\n    [t("gene_domain"), idea.dna.domain.short],\n    [t("gene_target"), idea.dna.target.short],\n    [t("gene_mechanic"), idea.dna.mechanic.short],\n    [t("gene_trend"), idea.dna.trend.title.toUpperCase()],\n    [t("gene_chaos"), idea.dna.chaos.short],\n    [t("gene_constraint"), idea.dna.constraint.short],\n  ];'
);

content = content.replace(
  '<span className="label text-muted">Dừng tại // {String(sector?.index ?? 1).padStart(2, "0")}</span>',
  '<span className="label text-muted">{t("stop_at")} {String(sector?.index ?? 1).padStart(2, "0")}</span>'
);

content = content.replace(
  'Đã tạo ý tưởng // #{idea.number}',
  '{t("idea_created")} #{idea.number}'
);

content = content.replace(
  '<span className="label text-subtle">Bấm hoặc SPACE để bỏ qua</span>',
  '<span className="label text-subtle">{t("skip_reveal")}</span>'
);

fs.writeFileSync('components/lab/RevealOverlay.tsx', content);
