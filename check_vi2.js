const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchFiles(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(line)) {
          if (!fullPath.includes('data\\') && !fullPath.includes('data/') && !fullPath.includes('i18n.ts') && !fullPath.includes('lib\\trends\\') && !fullPath.includes('lib/trends/')) {
            console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }
  }
}
searchFiles('./components');
