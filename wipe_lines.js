const fs = require('fs');
let lines = fs.readFileSync('components/shell/controls.tsx', 'utf8').split('\n');
lines = lines.filter(line => !line.includes('Công cụ thực dụng') && !line.includes('Side project có cá tính') && !line.includes('Sản phẩm thử nghiệm') && !line.includes('App internet kỳ quặc') && !line.includes('Bị nguyền, nhưng biết đâu lại hay'));
let result = lines.join('\n');
result = result.replace(/  \};\n\};/g, '  };');
fs.writeFileSync('components/shell/controls.tsx', result);
