import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const filesToProcess = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

filesToProcess.forEach(file => {
  try {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // 1. Remove Sparkles and Users2 from imports safely
    content = content.replace(/,\s*Sparkles\s*(?=[,\n}])/g, '');
    content = content.replace(/Sparkles\s*,\s*(?=[A-Z])/g, '');
    content = content.replace(/,\s*Users2\s*(?=[,\n}])/g, '');
    content = content.replace(/Users2\s*,\s*(?=[A-Z])/g, '');
    
    // 2. Remove the banner sections line by line
    const lines = content.split('\n');
    const result = [];
    let skipUntilSectionEnd = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Start skipping at banner section start
      if (/<section[^>]*className="[^"]*mb-6[^"]*overflow-hidden[^"]*rounded-\[2rem\][^"]*bg-\[linear-gradient\(135deg/.test(line)) {
        skipUntilSectionEnd = true;
        continue;
      }
      
      // Stop skipping when we find the closing tag
      if (skipUntilSectionEnd) {
        if (/<\/section>/.test(line)) {
          skipUntilSectionEnd = false;
        }
        continue;
      }
      
      result.push(line);
    }
    
    content = result.join('\n');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ ${file}`);
    }
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
  }
});

console.log('\n✅ Done removing banners!');
