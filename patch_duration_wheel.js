const fs = require('fs');
let content = fs.readFileSync('components/roulette/physics.ts', 'utf8');

content = content.replace('export const MIN_SPIN_MS = 4200;', 'export const MIN_SPIN_MS = 6000;');
content = content.replace('export const MAX_SPIN_MS = 5600;', 'export const MAX_SPIN_MS = 8000;');

fs.writeFileSync('components/roulette/physics.ts', content);
