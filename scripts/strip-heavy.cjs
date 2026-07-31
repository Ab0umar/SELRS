const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../client/src/features/kf');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'KfShell.tsx' && f !== 'KfHome.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Strip expensive effects
  content = content.replace(/backdrop-blur-xl/g, '');
  content = content.replace(/bg-white\/50/g, 'bg-white');
  content = content.replace(/dark:bg-slate-900\/50/g, 'dark:bg-slate-900');
  content = content.replace(/bg-white\/40/g, 'bg-slate-50');
  content = content.replace(/dark:bg-slate-900\/40/g, 'dark:bg-slate-800/50');
  
  fs.writeFileSync(filePath, content);
});
console.log('Stripped heavy effects from ' + files.length + ' files.');
