const fs = require('fs');
let content = fs.readFileSync('components/lab/RevealOverlay.tsx', 'utf8');

content = content.replace(
  /const rows: \[string, string\]\[\] = \[\n\s*\["Đối tượng", idea\.dna\.target\.short\],\n\s*\["Cơ chế", idea\.dna\.mechanic\.short\],\n\s*\["Xu hướng", idea\.dna\.trend\.title\.toUpperCase\(\)\],\n\s*\["Điểm dị", idea\.dna\.chaos\.short\],\n\s*\["Ràng buộc", idea\.dna\.constraint\.short\],\n\s*\];/,
  `const rows: [string, string][] = [
    [t("gene_target"), idea.dna.target.short],
    [t("gene_mechanic"), idea.dna.mechanic.short],
    [t("gene_trend"), idea.dna.trend.title.toUpperCase()],
    [t("gene_chaos"), idea.dna.chaos.short],
    [t("gene_constraint"), idea.dna.constraint.short],
  ];`
);

fs.writeFileSync('components/lab/RevealOverlay.tsx', content);
