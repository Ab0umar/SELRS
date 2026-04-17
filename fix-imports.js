import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Fix import statements with leading commas
  content = content.replace(/import\s*\{\s*,\s*/g, 'import { ');
  
  // Fix trailing commas in imports
  content = content.replace(/,\s*\}\s*from/g, ' } from');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${file}`);
  }
});

console.log('\n✅ All imports fixed!');
