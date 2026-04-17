import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove Sparkles and Users2 from imports
  content = content.replace(/,?\s*Sparkles/g, '');
  content = content.replace(/,?\s*Users2/g, '');
  
  // Remove only the header/banner sections that contain gradient backgrounds
  // Pattern: <section className="mb-6 overflow-hidden rounded-[2rem]..."> containing gradient
  content = content.replace(
    /<section[^>]*className="mb-6\s+overflow-hidden\s+rounded-\[2rem\][^>]*bg-\[linear-gradient\([^>]*>[\s\S]*?<\/section>/,
    ''
  );
  
  // Remove standalone badge groups (quick stats)
  content = content.replace(
    /<div\s+className="grid\s+grid-cols-2\s+gap-3[\s\S]*?<\/div>\s*<\/div>/,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ ${file}`);
});

console.log('\n✅ All banners removed from pages.');
