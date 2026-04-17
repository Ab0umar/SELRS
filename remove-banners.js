import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'client/src/pages');

const files = [
  'AdminApiTools.tsx', 'AdminDoctors.tsx', 'AdminMigrations.tsx', 'AdminPatients.tsx',
  'AdminPentacamFailed.tsx', 'AdminPermissions.tsx', 'AdminServices.tsx', 'AdminSettings.tsx',
  'AdminSheetCopies.tsx', 'AdminSheetDesigner.tsx', 'AdminSheets.tsx', 'AdminStatus.tsx',
  'AdminUsers.tsx', 'Appointments.tsx', 'ConsultantFollowupPage.tsx', 'Dashboard.tsx',
  'DoctorPatientView.tsx', 'ExaminationForm.tsx', 'ExternalOperationSheet.tsx',
  'FollowupForm.tsx', 'Home.tsx', 'LasikFollowupPage.tsx', 'MedicalReports.tsx',
  'NewCases.tsx', 'NotFound.tsx', 'PatientDetails.tsx', 'PatientSummary.tsx', 'Profile.tsx',
  'RefractionPage.tsx', 'SpecialistSheet.tsx', 'TestsManagement.tsx', 'Visits.tsx'
];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove Sparkles from imports
  content = content.replace(/,?\s*Sparkles/g, '');
  
  // Remove the banner section pattern: <section className="mb-6 overflow-hidden rounded-[2rem]..."> to </section>
  content = content.replace(
    /<section\s+className="mb-6\s+overflow-hidden\s+rounded-\[2rem\][\s\S]*?<\/section>/g,
    ''
  );
  
  // Remove empty sections
  content = content.replace(/<section[^>]*>\s*<\/section>/g, '');
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Processed: ${file}`);
});

console.log('\n✅ Done! All banners removed.');
