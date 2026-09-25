const fs = require('fs');
let content = fs.readFileSync('components/shell/controls.tsx', 'utf8');
content = content.replace('  };\n};', '  };');
fs.writeFileSync('components/shell/controls.tsx', content);
