const fs = require('fs');

// CsgoReel.tsx
let content1 = fs.readFileSync('components/roulette/CsgoReel.tsx', 'utf8');

// Remove the sweeping light beam
content1 = content1.replace(
  /\{\/\* Flash light beam when passing \*\/\}[\s\S]*?\{\/\* Center Vertical Target Needle with CS:GO Gold\/Yellow Highlight \*\/\}/,
  '{/* Center Vertical Target Needle */}'
);

// Remove the needle scaling/flashing
content1 = content1.replace(
  /className=\{`pointer-events-none absolute left-1\/2 top-0 bottom-0 z-30 w-\[2px\] -translate-x-1\/2 bg-fg shadow-\[0_0_12px_rgba\(255,255,255,0\.9\)\] transition-transform duration-75 \$\{\n\s*needleTick \? "scale-y-110 brightness-200 shadow-\[0_0_30px_rgba\(255,255,255,1\)\]" : ""\n\s*\}`\}/,
  'className="pointer-events-none absolute left-1/2 top-0 bottom-0 z-30 w-[2px] -translate-x-1/2 bg-fg shadow-[0_0_12px_rgba(255,255,255,0.9)]"'
);

fs.writeFileSync('components/roulette/CsgoReel.tsx', content1);

// RouletteWheel.tsx
let content2 = fs.readFileSync('components/roulette/RouletteWheel.tsx', 'utf8');

// Remove the flash from the needle group
content2 = content2.replace(
  /<g className=\{`pointer-events-none transition-all duration-75 \$\{needleTick \? "opacity-100" : "opacity-80"\}`\}>[\s\S]*?<line/,
  '<g className="pointer-events-none">\n          <line'
);

fs.writeFileSync('components/roulette/RouletteWheel.tsx', content2);
