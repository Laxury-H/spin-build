const fs = require('fs');
let content = fs.readFileSync('components/roulette/CsgoReel.tsx', 'utf8');

// Replace rarity configs
content = content.replace(
  /export const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = \{[\s\S]*?\};\n/,
  `export const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = {
  GOLD: {
    tier: "GOLD",
    label: "★ EXCEEDINGLY RARE",
    color: "var(--fg)",
    bgGlow: "var(--surface)",
    borderClass: "border-fg",
  },
  COVERT: {
    tier: "COVERT",
    label: "COVERT",
    color: "var(--fg)",
    bgGlow: "transparent",
    borderClass: "border-fg/80",
  },
  CLASSIFIED: {
    tier: "CLASSIFIED",
    label: "CLASSIFIED",
    color: "var(--fg)",
    bgGlow: "transparent",
    borderClass: "border-fg/60",
  },
  RESTRICTED: {
    tier: "RESTRICTED",
    label: "RESTRICTED",
    color: "var(--fg)",
    bgGlow: "transparent",
    borderClass: "border-fg/40",
  },
  MILSPEC: {
    tier: "MILSPEC",
    label: "MIL-SPEC",
    color: "var(--fg)",
    bgGlow: "transparent",
    borderClass: "border-fg/20",
  },
};\n`
);

content = content.replace(/bg-amber-400 animate-ping/g, 'bg-fg animate-ping');
content = content.replace(/bg-emerald-500/g, 'bg-fg/50');
content = content.replace(/bg-amber-400/g, 'bg-fg');
content = content.replace(/border-t-amber-400/g, 'border-t-fg');
content = content.replace(/border-b-amber-400/g, 'border-b-fg');
content = content.replace(/border-amber-400/g, 'border-fg');
content = content.replace(/shadow-\[0_0_12px_rgba\(245,158,11,0\.9\)\]/g, 'shadow-[0_0_12px_rgba(255,255,255,0.9)]');
content = content.replace(/shadow-\[0_0_24px_rgba\(245,158,11,0\.5\)\]/g, 'shadow-[0_0_24px_rgba(255,255,255,0.5)]');
content = content.replace(/bg-amber-500\/10/g, 'bg-fg/10');
content = content.replace(/CS:GO CASE OPENING \/\/ SECTOR ROULETTE/g, 'SECTOR ROULETTE');

fs.writeFileSync('components/roulette/CsgoReel.tsx', content);
