import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const remaining = [
  'AdminApiTools.tsx', 'AdminPatients.tsx', 'Dashboard.tsx',
  'DoctorPatientView.tsx', 'FollowupForm.tsx', 'NewCases.tsx',
  'OperationSheet.tsx', 'PatientSummary.tsx', 'PentacamSheet.tsx', 'Visits.tsx'
];

remaining.forEach(file => {
  try {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Remove ALL banner sections with the gradient pattern, might have multiple
    let removed = 0;
    let updated = true;
    while (updated) {
      updated = false;
      const lines = content.split('\n');
      let newLines = [];
      let inBanner = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (/<section[^>]*className="[^"]*mb-6[^"]*overflow-hidden[^"]*rounded-\[2rem\][^"]*bg-\[linear-gradient\(135deg/.test(line)) {
          inBanner = true;
          updated = true;
          removed++;
          continue;
        }
        
        if (inBanner && /<\/section>/.test(line)) {
          inBanner = false;
          continue;
        }
        
        if (!inBanner) {
          newLines.push(line);
        }
      }
      
      content = newLines.join('\n');
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ ${file} (${removed} banners removed)`);
    }
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
  }
});

console.log('\n✅ Done!');
