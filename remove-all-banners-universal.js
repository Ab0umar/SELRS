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
  
  // Remove Sparkles and Users2 from imports
  content = content.replace(/,\s*Sparkles\s*(?=[,\n}])/g, '');
  content = content.replace(/Sparkles\s*,\s*(?=[A-Z])/g, '');
  content = content.replace(/,\s*Users2\s*(?=[,\n}])/g, '');
  content = content.replace(/Users2\s*,\s*(?=[A-Z])/g, '');
  
  // Remove ALL section tags with:
  // - overflow-hidden AND
  // - rounded-[2rem] AND  
  // - bg-[linear-gradient(
  // This catches all banner variations
  const lines = content.split('\n');
  const result = [];
  let inBanner = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect banner start: has all three characteristics
    if (/<section[^>]*/.test(line) &&
        /overflow-hidden/.test(line) &&
        /rounded-\[2rem\]/.test(line) &&
        /bg-\[linear-gradient\(/.test(line)) {
      inBanner = true;
      continue;
    }
    
    // Detect banner end
    if (inBanner && /<\/section>/.test(line)) {
      inBanner = false;
      continue;
    }
    
    // Skip lines inside banner
    if (!inBanner) {
      result.push(line);
    }
  }
  
  content = result.join('\n');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ ${file}`);
  }
});

console.log('\n✅ All banners removed!');
