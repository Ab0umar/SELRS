import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
let updatedCount = 0;

files.forEach(file => {
  try {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Remove Sparkles and Users2 imports
    content = content.replace(/,?\s*Sparkles/g, '');
    content = content.replace(/,?\s*Users2/g, '');
    
    // Clean up empty imports {, }
    content = content.replace(/import\s*\{\s*,\s*/g, 'import { ');
    content = content.replace(/,\s*\}\s*from/g, ' } from');
    content = content.replace(/import\s*\{\s*\}\s*from/g, '');
    
    // Remove banner sections - careful pattern
    // Match: <section with mb-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg to </section>
    let modified = false;
    const lines = content.split('\n');
    let inBanner = false;
    let newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect banner start
      if (line.includes('overflow-hidden') && 
          line.includes('rounded-[2rem]') && 
          line.includes('bg-[linear-gradient(135deg')) {
        inBanner = true;
        modified = true;
        continue;
      }
      
      // Detect banner end
      if (inBanner && line.includes('</section>')) {
        inBanner = false;
        continue;
      }
      
      // Skip lines inside banner
      if (!inBanner) {
        newLines.push(line);
      }
    }
    
    content = newLines.join('\n');
    
    // Remove trailing commas after imports
    content = content.replace(/import\s*\{\s*,/g, 'import {');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      updatedCount++;
      console.log(`✓ ${file}`);
    }
  } catch (e) {
    console.log(`✗ Error in ${file}: ${e.message}`);
  }
});

console.log(`\n✅ Updated ${updatedCount} files!`);
