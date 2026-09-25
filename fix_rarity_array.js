const fs = require('fs');
let lines = fs.readFileSync('components/roulette/CsgoReel.tsx', 'utf8').split('\n');
let start = lines.findIndex(l => l.includes('export const RARITY_CONFIGS'));
let end = start;
while(!lines[end].startsWith('};')) { end++; }
lines.splice(start, end - start + 1, `export const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = {
  GOLD: { tier: "GOLD", label: "★ EXCEEDINGLY RARE", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-fg" },
  COVERT: { tier: "COVERT", label: "COVERT", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-line-strong" },
  CLASSIFIED: { tier: "CLASSIFIED", label: "CLASSIFIED", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-line" },
  RESTRICTED: { tier: "RESTRICTED", label: "RESTRICTED", color: "var(--muted)", bgGlow: "transparent", borderClass: "border-line/50" },
  MILSPEC: { tier: "MILSPEC", label: "MIL-SPEC", color: "var(--muted)", bgGlow: "transparent", borderClass: "border-line/20" },
};`);
fs.writeFileSync('components/roulette/CsgoReel.tsx', lines.join('\n'));
