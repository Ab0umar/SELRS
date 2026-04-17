import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const filesToProcess = [
  'AdminUsers.tsx',
  'AdminPermissions.tsx', 
  'AdminDoctors.tsx',
  'AdminServices.tsx',
  'AdminSettings.tsx',
  'AdminStatus.tsx',
  'AdminMigrations.tsx',
  'AdminApiTools.tsx',
  'Appointments.tsx',
  'ExaminationForm.tsx',
  'MedicalReports.tsx',
  'PatientDetails.tsx'
];

filesToProcess.forEach(file => {
  try {
    const filePath = path.join(pagesDir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Remove Sparkles and Users2 imports
    content = content.replace(/,?\s*Sparkles/g, '');
    content = content.replace(/,?\s*Users2/g, '');
    
    // Remove banner sections with gradient background
    // More careful pattern: only sections with bg-[linear-gradient and specific styling
    content = content.replace(
      /<section[^>]*className="[^"]*mb-6[^"]*overflow-hidden[^"]*rounded-\[2rem\][^"]*bg-\[linear-gradient\(135deg[^>]*>[\s\S]*?<\/section>\s*/g,
      ''
    );
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Updated: ${file}`);
    } else {
      console.log(`- No changes: ${file}`);
    }
  } catch (e) {
    console.log(`✗ Error processing ${file}:`, e.message);
  }
});

console.log('\n✅ Done!');
