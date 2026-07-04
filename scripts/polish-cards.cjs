const fs = require('fs');
const path = require('path');

const dir = 'D:/C/SRV100_Acc/client/src/features/kf';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'KfShell.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace generic Card with more styled versions
  content = content.replace(/<Card className=\"(.*?)\">/g, '<Card className=\"$1 shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hover:shadow-md transition-all duration-300\">');
  content = content.replace(/<Card>/g, '<Card className=\"shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hover:shadow-md transition-all duration-300\">');
  
  // Enhance CardHeader
  content = content.replace(/<CardHeader className=\"(.*?)\">/g, '<CardHeader className=\"$1 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 rounded-t-xl\">');
  content = content.replace(/<CardHeader>/g, '<CardHeader className=\"pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 rounded-t-xl\">');

  fs.writeFileSync(filePath, content);
});
console.log('Automated polish applied to ' + files.length + ' files.');
