const fs = require('fs');
let content = fs.readFileSync('components/roulette/CsgoReel.tsx', 'utf8');

// Increase duration from 5200 to 7500
content = content.replace('const DURATION_MS = 5200;', 'const DURATION_MS = 7500;');

// Make ease out smoother
content = content.replace(
  'return 1 - Math.pow(1 - t, 4.4);',
  'return 1 - Math.pow(1 - t, 4.2); // Smoother, longer tail'
);

fs.writeFileSync('components/roulette/CsgoReel.tsx', content);
