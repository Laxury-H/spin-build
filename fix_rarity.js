const fs = require('fs');
let content = fs.readFileSync('components/roulette/CsgoReel.tsx', 'utf8');

const replacement = `export const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = {
  GOLD: { tier: "GOLD", label: "★ EXCEEDINGLY RARE", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-fg" },
  COVERT: { tier: "COVERT", label: "COVERT", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-fg/80" },
  CLASSIFIED: { tier: "CLASSIFIED", label: "CLASSIFIED", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-fg/60" },
  RESTRICTED: { tier: "RESTRICTED", label: "RESTRICTED", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-fg/40" },
  MILSPEC: { tier: "MILSPEC", label: "MIL-SPEC", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-fg/20" },
};`;

content = content.replace(/export const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = \{[\s\S]*?\}\n\};\n/, replacement + '\n');
fs.writeFileSync('components/roulette/CsgoReel.tsx', content);
