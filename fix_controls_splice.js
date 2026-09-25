const fs = require('fs');
let lines = fs.readFileSync('components/shell/controls.tsx', 'utf8').split('\n');
lines.splice(15, 1);
fs.writeFileSync('components/shell/controls.tsx', lines.join('\n'));
