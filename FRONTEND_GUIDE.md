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
const { data: patients } = useQuery(["patients"], () => api.getPatients());
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

## 🕐 Attendance Module (`client/src/features/attendance/`)

### Layout & Navigation

#### **AttendanceLayout** / **AttendanceLayout.redesigned**
- Shell with sidebar nav for all attendance sub-pages
- Links: Dashboard, Employees, Reports, Settings

#### **AttendanceHome** (`AttendanceHome.tsx`)
- Landing page; quick-action cards based on user role (admin vs employee)
- Links to daily view, live punches, employee list, settings

#### **AttendanceDashboard** (`AttendanceDashboard.tsx`)
- Overview statistics: present/absent/late counts, punch activity chart

---

### Employee Management

#### **EmployeesList** (`EmployeesList.tsx`)
- Searchable list of all attendance employees
- Per-row link to `EmployeeDetail`
- tRPC: `attendance.employeesList`

#### **EmployeeDetail** (`EmployeeDetail.tsx`)
- Individual employee attendance history
- Monthly summary, daily breakdown
- Leave balance display
- Route: `/attendance/employees/:empCd`
- tRPC: `attendance.employeeDetail`, `attendance.leaveBalance`

#### **EmployeesHub** (`EmployeesHub.tsx`)
- Tab container: Employees | Leaves | Permissions
- Hosts `EmployeesList`, `LeaveManagement`, `Permissions`

#### **UserMappings** (`UserMappings.tsx`)
- Links system user accounts to attendance employee codes
- Admin tool for resolving "who is who" between auth users and machine IDs
- tRPC: `attendance.listUserMappings`, `saveUserMapping`

---

### Time & Punches

#### **DailyView** (`DailyView.tsx`)
- Date-picker + per-employee attendance grid for a single day
- Shows punch-in / punch-out, late minutes, status
- CSV export
- tRPC: `attendance.dailyAttendance`

#### **LiveBoard** (`LiveBoard.tsx`)
- Real-time attendance board via WebSocket
- Shows who is currently in/out
- Auto-refreshing

#### **LivePunches** (`LivePunches.tsx`)
- Scrolling feed of recent punch events from the device
- Polls or WebSocket-driven
- tRPC: `attendance.recentPunches`

#### **RawLogs** (`RawLogs.tsx`)
- Raw punch log viewer with date/employee filter
- Download as CSV
- tRPC: `attendance.rawPunches`

---

### Leaves & Permissions

#### **LeaveManagement** (`LeaveManagement.tsx`)
- List, add, approve, delete, and **edit** leave records (إجازات)
- Filter by employee and date range
- **Edit mode:** pencil icon per row; employee field locked during edit
- Form fields: employee, type (annual/sick/unpaid/other), dateFrom/dateTo (`DateInput`), note; day count auto-calculated
- tRPC: `attendance.listLeaves`, `createLeave`, `updateLeave`, `approveLeave`, `deleteLeave`

#### **Permissions** (`Permissions.tsx`)
- List, add, approve, delete, and **edit** permission requests (إذن دخول متأخر / خروج مبكر)
- Filter by employee and date range
- **Edit mode:** pencil icon per row; employee field locked during edit
- Form fields: employee, date, type (in/out), duration (minutes), "لا يؤثر على الراتب" checkbox, note
- tRPC: `attendance.listPermissions`, `createPermission`, `updatePermission`, `approvePermission`, `deletePermission`

#### **PermissionReport** (`PermissionReport.tsx`)
- Printable summary report of permissions by period
- Groups by employee, totals per type
- tRPC: `attendance.listPermissions`

#### **LeaveBalanceReport** (`LeaveBalanceReport.tsx`)
- Annual leave balance per employee
- Remaining days, used days, carry-over
- tRPC: `attendance.leaveBalance`

---

### Shifts

#### **ShiftManagement** (`ShiftManagement.tsx`)
- Create / edit / delete shift definitions (morning, evening, flexible…)
- Configure start/end times, grace periods, OT thresholds
- tRPC: `attendance.listShifts`, `createShift`, `updateShift`, `deleteShift`

#### **ShiftAssignments** (`ShiftAssignments.tsx`)
- Assign shifts to employees per date range or cycle
- Drag-row or select-based assignment UI
- tRPC: `attendance.listShiftAssignments`, `saveShiftAssignment`

#### **ScheduleSwap** (`ScheduleSwap.tsx`)
- Employee shift-swap requests
- Approve / reject swap requests
- tRPC: `attendance.listSwapRequests`, `approveSwap`

---

### Reports

#### **ReportsHub** (`ReportsHub.tsx`)
- Tab container: Daily View | Monthly Reports | Permission Report | Leave Balance
- Hosts `DailyView`, `Reports`, `PermissionReport`, `LeaveBalanceReport`

#### **Reports** (`Reports.tsx`)
- Monthly attendance report per employee
- Columns: working days, absent, late minutes, OT, leave days
- Print / export
- tRPC: `attendance.monthlyReports`

---

### Settings & Admin

#### **SettingsHub** (`SettingsHub.tsx`)
- Tab container: Shifts | Holidays | Settings | Admin Dashboard
- Entry point for all attendance config

#### **Holidays** (`Holidays.tsx`)
- Manage official holidays (excluded from absence calculations)
- Add / delete holidays by date
- tRPC: `attendance.listHolidays`, `addHoliday`, `deleteHoliday`

#### **Settings** (`Settings.tsx`)
- Attendance module config display (read-only info cards linking to device settings)

#### **MyAttendanceProfile** (`MyAttendanceProfile.tsx`)
- Employee self-service: own attendance history, leave balance, pending permissions
- Route: `/attendance/me`

---

### Admin Sub-module (`attendance/admin/`)

#### **AdminDashboard** (`admin/AdminDashboard.tsx`)
- Sync control panel: trigger pull from FK/ZK device, view last sync time
- Shows sync run history table
- tRPC: `attendance.syncFromFKDevice`, `attendance.syncFromZK40`, `attendance.zk40SyncLogs`

#### **DeviceSettings** (`admin/DeviceSettings.tsx`)
- Configure FK device IP/port and ZK40 IP
- Test device connection
- ZK40 ADMS: "إرسال الموظفين → ZK40" button (pushes employee list via ADMS command queue)
- ZK40 sync log table (last 20 TCP sync runs)
- tRPC: `attendance.getDeviceSettings`, `attendance.saveDeviceSettings`, `attendance.testDeviceConnection`, `attendance.pushEmployeesToZK40`, `attendance.zk40SyncLogs`

#### **DeviceConsole** (`admin/DeviceConsole.tsx`)
- Live device diagnostics; send raw commands to FK/ZK device
- Shows device info (firmware, serial, user count)

#### **EmpSync** (`admin/EmpSync.tsx`)
- Sync employee list from device to DB (or vice versa)
- Search and manual link employees
- tRPC: `attendance.syncEmployees`

#### **SyncStatus** (`admin/SyncStatus.tsx`)
- Real-time sync run status: in-progress, last result, error log
- tRPC: `attendance.syncStatus`

#### **BatchCorrections** (`admin/BatchCorrections.tsx`)
- Bulk correct attendance records (e.g. mark a day as holiday for all)
- Date range + action selection

---

## 💰 Salary Module (`client/src/features/salary/`)

### Layout & Navigation

#### **SalaryLayout** / **SalaryLayout.redesigned**
- Shell with sidebar nav for all salary sub-pages
- Summary bar: total penalties, advances, insurance for current month

#### **SalaryDashboard** (`SalaryDashboard.tsx`)
- Landing page with quick-action cards: payroll, penalties, basics, reports

---

### Core Salary Pages

#### **SalaryBasics** (`SalaryBasics.tsx`)
- Manage employee base salaries and insurance deduction per employee
- Effective-from date versioning (multiple rows per employee)
- Inline edit with pencil icon
- tRPC: `salary.listBasics`, `addBasic`, `updateBasic`, `deleteBasic`

#### **SalaryPenalties** (`SalaryPenalties.tsx`)
Tabs: **جزاءات | سلف | تأخيرات | تأمينات**

**Penalties tab:**
- Add / edit / delete penalties
- **Toggle بالأيام / بالمبلغ:**
  - بالأيام: fractional days (0.25, 0.5, 1, 1.5…); deducted at payroll as `penaltyDays × dailyRate`
  - بالمبلغ: fixed amount
- **التاريخ field:** optional date per penalty (`DateInput`)
- **Edit:** pencil icon per row; save calls `updatePenalty`
- Table columns: الموظف | القسم | التاريخ | أيام | المبلغ | السبب | actions
- tRPC: `salary.listPenalties`, `addPenalty`, `updatePenalty`, `deletePenalty`

**Advances tab:**
- Add / delete salary advances (سلف)
- tRPC: `salary.listAdvances`, `addAdvance`, `deleteAdvance`

**Late Days tab:**
- Read-only: employees grouped by late-day count for the period
- Derived from attendance daily records

**Insurance tab:**
- Inline-edit insurance deduction per employee (from salaryBasics)
- tRPC: `salary.listBasics`, `salary.updateBasic`

**Print button:** generates printable A4 landscape deduction summary (جزاءات + تأخيرات + تأمينات + غياب per employee)

#### **CurrentSalaryData** (`CurrentSalaryData.tsx`)
- Two-table view: مركز employees vs عيادة employees
- Shows basic salary, insurance, advances, penalties for the selected month

#### **PayrollReport** (`PayrollReport.tsx`)
- Compute and display full monthly payroll (كشف الرواتب)
- Sections: مركز / عيادة
- Columns: basic, absent deduction, late deduction, OT pay, penalty, advance, insurance, net
- Compute button triggers `salary.computePayroll`; print via native Android or browser
- tRPC: `salary.computePayroll`, `salary.getPayroll`

#### **AbsentReport** (`AbsentReport.tsx`)
- Absent employees report for a date range
- Grouped by employee; shows absent days and deduction amount
- Printable
- tRPC: `salary.listPayrollDeductions`

---

### Shift Salary

#### **ShiftStaff** (`ShiftStaff.tsx`)
- Manage shift staff (doctors / pharmacists on duty)
- Add / edit / delete staff; set type (doctor/pharmacist)
- tRPC: `salary.listShiftStaff`, `addShiftStaff`, `updateShiftStaff`, `deleteShiftStaff`

#### **ShiftSchedule** (`ShiftSchedule.tsx`)
- Monthly shift schedule grid: assign staff to shifts per day
- tRPC: `salary.getShiftSchedule`, `saveShiftSchedule`

#### **ShiftPayroll** (`ShiftPayroll.tsx`)
- Compute shift-based payroll (مناوبات)
- Per-shift attendance + rate → net pay
- Print support
- tRPC: `salary.computePayroll` (shift section)

#### **CommissionPools** (`CommissionPools.tsx`)
- Configure commission pools shared across staff (عمولة مشتركة)
- Edit pool amounts per month
- tRPC: `salary.listCommissionPools`, `updateCommissionPool`

#### **SalarySettings** (`SalarySettings.tsx`)
- Module-level salary config: working days assumption, OT multiplier, etc.
- tRPC: `salary.getSettings`, `salary.saveSettings`

---

## 🧾 Accounting Module (`client/src/features/accounting/`)

#### **AccountingShell** — layout/nav shell for all accounting pages
#### **AccountingHome** — daily revenue summary + cash entries for main clinic
#### **AccountingHomeFund** — fund (صندوق) cash entries view
#### **AccountingCashbook** — full cashbook ledger with date filter and print
#### **AccountingLedger** — double-entry ledger view
#### **AccountingInstapay** — Instapay receipts log
#### **AccountingAdvances** — staff advances ledger
#### **AccountingLoans** — loans management (قروض)
#### **AccountingDrSaadany** — Dr. Saadany-specific account view
#### **DoctorAccount** — per-doctor revenue account
#### **PatientAccount** — per-patient payment history
#### **DailyRevenue** — daily revenue breakdown by service type
#### **LasikRevenue** — LASIK procedure revenue report
#### **LasikServices** — LASIK service pricing management
#### **ReceiptsInquiry** / **AccountingPatientsInquiry** / **PatientsInquiry** — receipt search and patient payment inquiry
#### **AccEntryDrawer** — slide-over drawer for adding/editing cash entries
#### **AccServiceDrawer** — drawer for adding service-linked revenue entries
#### **AccLoanDrawer** — drawer for adding loan entries

---

## 🏥 KF Branch Module (`client/src/features/kf/`)

Separate branch (KF) with its own patient flow, examination forms, and accounting.

#### **KfShell** — layout/nav for KF branch
#### **KfHome** — KF branch landing page
#### **KfPatients** — patient list for KF branch
#### **KfPatientDetail** — KF patient profile with visit history
#### **KfPatientForm** — create/edit KF patient
#### **KfExaminationForm** — KF eye examination form
#### **KfFollowupForm** — KF follow-up form
#### **KfFollowups** — list of KF follow-up visits
#### **KfConsultantSheet** — KF consultant examination sheet
#### **KfConsultantFollowupSheet** — KF consultant follow-up sheet
#### **KfOperationForm** — KF surgical procedure form
#### **KfOperations** — KF operations list
#### **KfVisitForm** — KF visit entry form
#### **KfReceipts** — KF branch receipts
#### **KfAccounting** — KF branch accounting summary
#### **KfDailyRevenue** — KF daily revenue report
#### **KfServiceRevenue** — KF revenue by service
#### **KfLedger** — KF ledger

---

## 📦 Stockroom Module (`client/src/features/stockroom/`)

#### **StockroomShell** — layout/nav
#### **StockroomDashboard** — inventory overview: low-stock alerts, total items
#### **StockroomCategory** — manage item categories; add/edit/delete
#### **StockroomReports** — stock movement and valuation reports

---

## 👨‍⚕️ Doctor Portal (`client/src/features/doctor-portal/`)

Standalone portal for external doctors (separate login).

#### **DoctorLogin** — doctor-specific login page
#### **DoctorLayout** — portal shell
#### **DoctorDashboard** — doctor's patient queue and today's appointments
#### **DoctorPatientImages** — view patient scan/image files

---

## 🧑‍💻 Patient Portal (`client/src/features/patient-portal/`)

Self-service portal for patients (accessible via QR / link).

#### **PatientLogin** / **PatientGuestBook** — patient login or guest booking
#### **PatientLayout** — portal shell
#### **PatientDashboard** — patient home: upcoming appointments, recent prescriptions
#### **PatientBook** — book a new appointment
#### **PatientBookings** — view/cancel own bookings
#### **PatientFile** — view own medical file summary
#### **PatientPrescription** — view/print own prescriptions
#### **PatientRefraction** — view own refraction results
#### **PatientScans** — view own scan images (Pentacam, etc.)

---

**Last Updated:** June 25, 2026
**Frontend Version:** 1.0.31
