import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
let cleaned = 0;

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Remove Sparkles and Users2 from imports more aggressively
  content = content.replace(/,\s*Sparkles\s*(?=[,\n}])/g, '');
  content = content.replace(/Sparkles\s*,/g, '');
  content = content.replace(/,\s*Users2\s*(?=[,\n}])/g, '');
  content = content.replace(/Users2\s*,/g, '');
  
  // Clean up empty imports or leading commas
  content = content.replace(/import\s*\{\s*,\s*/g, 'import { ');
  content = content.replace(/,\s*\}\s*from/g, ' } from');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    cleaned++;
  }
});

console.log(`✅ Cleaned up imports in ${cleaned} files`);
