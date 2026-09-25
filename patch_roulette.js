const fs = require('fs');
let content = fs.readFileSync('components/roulette/RouletteWheel.tsx', 'utf8');

content = content.replace(
  'aria-label="Quay vòng quay"',
  'aria-label="Spin"'
);

fs.writeFileSync('components/roulette/RouletteWheel.tsx', content);
