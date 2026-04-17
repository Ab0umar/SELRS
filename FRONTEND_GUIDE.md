# SELRS Frontend Architecture & Component Guide

## Overview

The SELRS frontend is a React-based healthcare management system with three deployment targets:
- **Web** (React + Vite)
- **Mobile** (Capacitor for Android)
- **Desktop** (Electron for Windows)

All share the same React codebase in `/client/src`, with platform-specific wrappers.

---

## 📂 Project Structure

```
client/
├── src/
│   ├── pages/                  # Full-page components
│   ├── components/             # Reusable UI components
│   ├── _core/                 # Core setup (API client, providers)
│   ├── contexts/              # React contexts (auth, notifications)
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utility functions
│   ├── data/                  # Constants, lookup data
│   ├── styles/                # Global styles
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # Entry point
│   ├── index.css             # Global styles
│   └── globals.d.ts          # TypeScript declarations
│
├── public/                    # Static assets
├── index.html                # HTML template
└── ... config files
```

---

## 🎯 Key Pages

### Dashboard Pages

#### **Home** (`Home.tsx`)
- Entry point for logged-in users
- Quick navigation to main features
- System status overview

#### **Dashboard** (`Dashboard.tsx`)
- Analytics and statistics
- Charts and reports (Recharts)
- Patient metrics
- Appointment overview
- Real-time activity feed

---

### Patient Management

#### **Patients** (`Patients.tsx`) - Large file (125KB)
- **Features:**
  - Search/filter patients by code, name, phone
  - Pagination (cursor-based)
  - Patient list view
  - Create new patient dialog
  - Bulk operations (assign doctor, assign sheet type, restore)
  - Patient status indicators
  - Last visit tracking

- **Components:**
  - PatientPicker (autocomplete)
  - Patient row with actions
  - Filter sidebar
  - Bulk action toolbar

#### **PatientDetails** (`PatientDetails.tsx`)
- Individual patient profile
- Patient demographics
- Medical history
- Linked sheets and records
- Appointment history
- Contact information
- Medical notes

#### **PatientSummary** (`PatientSummary.tsx`)
- Quick overview of patient
- Recent exams
- Current medications
- Latest appointments
- Disease/symptom list

---

### Medical Forms/Sheets

#### **ExaminationForm** (`ExaminationForm.tsx`) - Largest file (123KB)
- **Comprehensive eye examination form**
- Visual acuity tests (BCVA, UCVA)
- Refraction data
- Intraocular pressure (IOP)
- Eye pressure mapping
- Anterior/posterior segment findings
- Disease and symptom tracking
- Patient medical history
- Dynamic field rendering
- Validation with Zod

#### **ConsultantSheet** (`ConsultantSheet.tsx`)
- Consultation notes form
- Clinical impression
- Diagnosis
- Treatment plan
- Follow-up recommendations

#### **SpecialistSheet** (`SpecialistSheet.tsx`)
- Specialist examination data
- Extended findings
- Complex cases
- Specialist recommendations

#### **LasikExamSheet** (`LasikExamSheet.tsx`)
- LASIK pre-operative assessment
- Corneal topography (Pentacam integration)
- Tear film analysis
- Wavefront analysis
- Patient suitability assessment

#### **LasikFollowupPage** (`LasikFollowupPage.tsx`)
- Post-LASIK follow-up
- Visual acuity tracking
- Complications monitoring
- Healing progress

#### **OperationSheet** (`OperationSheet.tsx`)
- Surgical procedure details
- Intra-operative findings
- Complications
- Outcome documentation

#### **ExternalOperationSheet** (`ExternalOperationSheet.tsx`)
- Surgery performed at external facility
- Referral documentation
- External findings
- Integration with external system

#### **PentacamSheet** (`PentacamSheet.tsx`)
- Corneal topography imaging
- Pentacam export display
- Image analysis and interpretation

---

### Appointments & Scheduling

#### **Appointments** (`Appointments.tsx`)
- **Calendar-based appointment management**
- Date navigation
- View appointments by date
- Create/edit/delete appointments
- Doctor and patient assignment
- Appointment types (consultation, surgery, etc)
- Conflict detection
- Time slot management
- Status tracking

---

### Diagnostics & Testing

#### **RequestTests** (`RequestTests.tsx`)
- Request diagnostic tests
- Test selection from catalog
- Patient test history
- Test status tracking
- Results upload capability

#### **TestsManagement** (`TestsManagement.tsx`)
- Admin: Manage test catalog
- Add/edit/delete tests
- Test categorization
- Test codes and names

#### **MedicationsTestsManagement** (`MedicationsTestsManagement.tsx`)
- Combined medication and test admin
- Inventory management
- Test and medication linking

---

### Prescriptions & Medications

#### **WritePrescription** (`WritePrescription.tsx`)
- Create prescriptions
- Select medications
- Set dosage and instructions
- Add multiple medication items
- Print prescription
- Patient medication history

#### **MedicationsManagement** (`MedicationsManagement.tsx`)
- Admin: Manage medications
- Add/edit/delete medications
- Link to active ingredients
- Dosage management
- Track medication inventory

---

### Medical Reports

#### **MedicalReports** (`MedicalReports.tsx`)
- Create medical reports
- Report types
- Rich text editor
- Disease linking
- Export to PDF
- Archive reports

---

### Surgery Management

#### **Surgeries** (`Surgeries.tsx`)
- Surgery scheduling
- Operation list generation
- Pre-operative checklists
- Assign surgeons
- Track surgical outcomes
- Schedule follow-ups

---

### Administration

#### **AdminUsers** (`AdminUsers.tsx`)
- User account management
- Create/edit/delete users
- Assign roles
- Reset passwords
- View user activity
- Deactivate accounts

#### **AdminDoctors** (`AdminDoctors.tsx`)
- Manage doctor profiles
- Doctor codes and names
- Assign specialties
- Set availability
- Location (center/external)

#### **AdminServices** (`AdminServices.tsx`)
- Manage medical services/departments
- Service types (consultation, specialist, surgery, etc)
- Link doctors to services
- Service availability
- Default service assignment

#### **AdminSettings** (`AdminSettings.tsx`)
- Global system settings
- Email configuration
- Notification settings
- App preferences
- Import/export settings
- Backup management

#### **AdminPermissions** (`AdminPermissions.tsx`)
- Role-based permission management
- Fine-grained permission control
- Permission assignment to roles
- Route-level permissions

#### **AdminSheets** (`AdminSheets.tsx`)
- Manage sheet types
- Default sheet assignment
- Sheet templates
- Active sheet types

#### **AdminSheetDesigner** (`AdminSheetDesigner.tsx`)
- **Visual sheet/form designer**
- Drag-and-drop field builder
- Field configuration
- Validation rules
- Custom form builder
- Save custom forms

#### **AdminSheetCopies** (`AdminSheetCopies.tsx`)
- Manage form duplicates
- Deduplicate sheets
- Copy management

#### **AdminPatients** (`AdminPatients.tsx`)
- Patient admin utilities
- Bulk patient operations
- Patient data cleanup
- Import patients
- Export patient lists
- MSSQL sync management

#### **AdminStatus** (`AdminStatus.tsx`)
- System health dashboard
- Database status
- Migration status
- Service status
- Error monitoring

#### **AdminMigrations** (`AdminMigrations.tsx`)
- Database migration management
- View pending migrations
- Apply migrations
- Migration history

#### **AdminApiTools** (`AdminApiTools.tsx`)
- API testing interface
- tRPC procedure explorer
- Manual API call execution
- Request/response inspection
- Debug API issues

#### **AdminPentacamFailed** (`AdminPentacamFailed.tsx`)
- Failed Pentacam imports
- Retry failed imports
- Manual patient linking
- OCR status tracking

---

### Other Pages

#### **Profile** (`Profile.tsx`)
- User profile management
- Change password
- Update email
- View permissions
- Logout

#### **ForcePasswordChange** (`ForcePasswordChange.tsx`)
- Force user to change password
- Initial login redirection
- Password requirements

#### **RefractionPage** (`RefractionPage.tsx`)
- Refraction test interface
- Visual acuity measurement
- Refraction data entry
- Auto-calculation tools

#### **ConsultantFollowupPage** (`ConsultantFollowupPage.tsx`)
- Post-consultation follow-up
- Tracking patient progress
- Update findings
- Schedule next visit

#### **NotFound** (`NotFound.tsx`)
- 404 page
- Navigation help

---

## 🧩 Core Components

### Layout Components

#### **DashboardLayout** (`DashboardLayout.tsx`)
- Main application shell
- Sidebar navigation
- Header with user menu
- Responsive design
- Mobile drawer navigation

#### **PageHeader** (`PageHeader.tsx`)
- Page title and breadcrumbs
- Action buttons
- Help text

---

### UI Components (`/components/ui`)

Radix UI + shadcn/ui components:
- Buttons
- Cards
- Forms & Inputs
- Dialogs & Modals
- Dropdowns & Menus
- Tabs
- Accordions
- Checkboxes & Radios
- Select dropdowns
- Tooltips
- Progress bars
- Badges
- And more...

---

### Utility Components

#### **ProtectedRoute** (`ProtectedRoute.tsx`)
- Role-based route protection
- Permission checking
- Redirect to login if unauthorized
- Role-specific access

#### **ErrorBoundary** (`ErrorBoundary.tsx`)
- Catch React component errors
- Error UI display
- Log errors

#### **GlobalCommandPalette** (`GlobalCommandPalette.tsx`)
- Global keyboard shortcut (Cmd/Ctrl+K)
- Search across pages
- Quick navigation
- Command execution

#### **PatientPicker** (`PatientPicker.tsx`)
- Autocomplete patient selection
- Search by code/name
- Patient highlight
- Selection confirmation

#### **PentacamFilesPanel** (`PentacamFilesPanel.tsx`)
- Pentacam file browser
- Image preview
- File management
- Export options

#### **LocalPentacamExportsPanel** (`LocalPentacamExportsPanel.tsx`)
- Local Pentacam export import
- Folder monitoring
- Auto-import status
- File management

#### **AuthenticatedImage** (`AuthenticatedImage.tsx`)
- Secure image loading
- Token-based access
- S3 integration
- Error handling

#### **PullToRefresh** (`PullToRefresh.tsx`)
- Mobile pull-to-refresh
- Data synchronization
- Loading state

#### **MobileAppEnhancements** (`MobileAppEnhancements.tsx`)
- Mobile-specific features
- Touch optimizations
- Mobile UI patterns

#### **WebAppEnhancements** (`WebAppEnhancements.tsx`)
- Web-specific features
- Responsive optimizations

#### **AppShellStatus** (`AppShellStatus.tsx`)
- Connection status indicator
- Offline/online indicator
- Sync status display

---

### Form Components

#### **FormField** (`FormField.tsx`)
- Reusable form field wrapper
- Label, input, error display
- Integration with React Hook Form

#### **RefractionValueSelect** (`RefractionValueSelect.tsx`)
- Specialized select for refraction values
- Optical power values
- Diopter selection

---

## 🔌 Core Setup (`_core/`)

### API Client Setup
- tRPC client initialization
- React Query integration
- Automatic request batching
- Token/cookie management

### Context Providers
- Authentication context
- Theme context (light/dark)
- Notification context
- Patient context
- User context

### Hooks

#### **useAuth**
- Get current user
- Login/logout
- Permission checking

#### **useToast** / **useSonner**
- Toast notifications
- Success/error messages

#### **useQuery / useMutation**
- React Query hooks
- Data fetching
- Cache management

#### **useLocalStorage**
- Persistent local storage
- UI state persistence

---

## 🎨 Styling

### Tailwind CSS
- Utility-first CSS framework
- Custom configuration in `tailwind.config.js`
- Dark mode support via `next-themes`

### CSS Files
- `index.css` - Global styles (31KB)
- `index-Office.css` - Office/print styles (26KB)
- Component-scoped styles

### Theme System
- Light/Dark mode support
- Color tokens defined in Tailwind config
- CSS variables for dynamic theming

---

## 📦 Dependencies

### Major Libraries
- **react** 19.2.4 - UI framework
- **react-dom** 19.2.4 - DOM rendering
- **react-hook-form** 7.71.2 - Form management
- **@tanstack/react-query** 5.91.2 - Data fetching
- **@trpc/react-query** 11.13.4 - API client
- **zod** 4.3.6 - Validation
- **axios** 1.13.6 - HTTP client
- **wouter** 3.9.0 - Routing
- **recharts** 3.8.0 - Charts
- **framer-motion** 12.38.0 - Animations
- **date-fns** 4.1.0 - Date utilities
- **xlsx** 0.18.5 - Excel export
- **pdf-lib** 1.17.1 - PDF generation
- **html2canvas** 1.4.1 - Screenshot to image
- **lucide-react** 0.577.0 - Icons
- **sonner** 2.0.7 - Toast notifications

---

## 🚀 Development Workflow

### Running the Development Server
```bash
npm run dev
```
- Starts Vite dev server on port 5173
- Hot module replacement (HMR)
- Express backend on port 4000

### Building for Production
```bash
npm run build
```
- Vite builds React app → `/dist/public`
- esbuild bundles backend → `/dist/index.js`
- Automatic code splitting for chunks

### Type Checking
```bash
npm run check
```
- TypeScript type checking
- No emit, just validation

---

## 📱 Mobile-Specific

### Capacitor Integration
- Bridge between React and native Android
- Platform-specific plugins loaded
- Native file access
- Push notifications via FCM
- Network status detection
- Local storage via Preferences API

### Build Process
```bash
npm run android:build-release
```
- Builds React app
- Compiles Android APK
- Kotlin/Java wrappers
- Signs release APK

---

## 🖥️ Desktop-Specific

### Electron Integration
- `/desktop-electron/main.js` - Main process
- `/desktop-electron/preload.js` - IPC bridge
- Native window management
- File system access
- Auto-update capability

### Build Process
```bash
npm run build
```
- Creates Windows executable
- Inno Setup installer
- Desktop shortcut
- Auto-update support

---

## 🔐 Security Practices

### Authentication
- JWT tokens in cookies
- HTTP-only cookies (where supported)
- Token refresh on expiration
- Secure logout clearing cookies

### Input Validation
- Zod schema validation on all forms
- Server-side validation
- XSS prevention via React
- CSRF protection via tRPC

### API Security
- tRPC adapter secures endpoints
- Role-based access control
- Permission checking before operations
- Audit logging of actions

---

## 🌍 Internationalization

### Language Support
- Arabic (ع) - Primary language
- English - Secondary
- RTL support via Tailwind

### Localization Strategy
- Messages stored in components
- Locale-specific formatting (dates, numbers)
- Component text mix of Arabic/English

---

## 📊 Performance Optimizations

### Bundle Splitting
```javascript
// From vite.config.ts
manualChunks:
  - react-core (React, ReactDOM)
  - data-core (React Query, tRPC, Zod)
  - radix-ui (Radix UI components)
  - icons (Lucide React)
  - motion (Framer Motion, Embla)
  - charts (Recharts)
  - excel (XLSX)
  - aws-sdk (AWS SDK)
```

### Lazy Loading
- Route-based code splitting
- Component lazy loading
- Image optimization
- CSS chunking

### Caching
- React Query caching
- Browser caching headers
- Service worker (potential)
- IndexedDB for offline data

---

## 🐛 Debugging

### Browser DevTools Integration
- React DevTools
- Redux DevTools (not used, but framework ready)
- Network tab inspection
- Console logging
- Performance profiling

### Debug Logging
- Vite debug collector (`/.manus/`)
- Browser console logs saved to disk
- Network request logging
- Session replay events

---

## 📝 Common Patterns

### Form Submission
```typescript
const { control, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});

const mutation = trpc.medical.createPatient.useMutation();

const onSubmit = async (data) => {
  await mutation.mutateAsync(data);
  toast.success("Patient created");
};
```

### Data Fetching
```typescript
const { data, isLoading } = trpc.medical.getPatients.useQuery();
const { data: patients } = useQuery(
  ["patients"],
  () => api.getPatients()
);
```

### Protected Routes
```typescript
<ProtectedRoute requiredRole="doctor">
  <DoctorOnlyPage />
</ProtectedRoute>
```

---

## 📚 Testing

### Unit Tests
```bash
npm run test
```
- Vitest framework
- Component testing
- Hook testing
- Utility function testing

### Integration Tests
```bash
npm run test:ui
```
- Playwright browser automation
- Full application testing
- User interaction simulation
- Cross-browser testing

---

**Last Updated:** March 29, 2026
**Frontend Version:** 1.0.30
