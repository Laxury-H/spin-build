const fs = require('fs');
let content = fs.readFileSync('app/about/page.tsx', 'utf8');

// I will just remove all the top-level consts until the export default.
content = content.replace(/const GENES[\s\S]*?export default function AboutPage/g, 'export default function AboutPage');
fs.writeFileSync('app/about/page.tsx', content);
