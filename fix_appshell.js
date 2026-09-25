const fs = require('fs');
let content = fs.readFileSync('components/shell/AppShell.tsx', 'utf8');

content = content.replace(
  '<div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-fg selection:text-bg">',
  '<div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-fg selection:text-bg relative overflow-hidden">\n      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_20%,transparent_100%)] opacity-[0.15]" />\n      <div className="relative z-10 flex-1 flex flex-col">'
);

content = content.replace(
  '<Toaster />',
  '</div>\n      <Toaster />'
);

fs.writeFileSync('components/shell/AppShell.tsx', content);
