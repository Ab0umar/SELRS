# SELRS Project Architecture Overview

## Project Name
**SELRS** - Healthcare Management & Clinic Operations System (Arabic: نظام إدارة العيادة الشاملة)

**Version:** 1.0.30
**License:** MIT
**Type:** Multi-platform healthcare application

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                     │
├─────────────────────────────────────────────────────────────┤
│ Web (React/Vite) │ Mobile (Capacitor) │ Desktop (Electron)   │
└─────────────────┬───────────────────┬──────────────────────┘
                  │                   │
                  └──────────┬────────┘
                             │
                    ┌────────▼─────────┐
                    │   tRPC API       │
                    │  (Express.js)    │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐        ┌─────▼─────┐
   │ MySQL   │         │  MSSQL  │        │ AWS S3    │
   │ Database│         │(External)       │ (Storage) │
   └─────────┘         └─────────┘        └───────────┘
```

---

## 📱 Frontend Applications

### 1. **Web Frontend** (`/client`)
- **Framework:** React 19.2.4
- **Build Tool:** Vite 8.0.1
- **Styling:** Tailwind CSS 4.2.2 + Custom CSS
- **UI Component Library:** Radix UI + shadcn/ui components
- **Build Output:** `/dist/public`

#### Key Pages & Features:
- **Dashboard** - Overview and statistics
- **Patients** - Patient management (search, filter, CRUD)
- **Appointments** - Appointment scheduling and management
- **Medical Records:**
  - Examination Forms (comprehensive patient examinations)
  - Consultant Sheets
  - Specialist Sheets
  - LASIK Examination & Followup
  - Operation Sheets (Internal/External)
  - Medical Reports
  - Pentacam Sheet results display

- **Testing & Diagnosis:**
  - Request Tests
  - Test Management
  - Medications/Tests Management

- **Administration:**
  - Users Management
  - Doctors Management
  - Services Management
  - Permissions Management
  - Sheet Designer (customize medical forms)
  - API Tools (admin debugging)
  - Settings
  - Migration Management
  - Status/Health Check

- **Other Features:**
  - Prescriptions/Medications Management
  - Patient Summaries
  - Medical Reports
  - Surgeries Management
  - Profile/Account Management
  - Force Password Change flow

#### Key Technologies:
- **State Management:** React Context + TanStack React Query
- **API Client:** tRPC + React Query integration
- **Forms:** React Hook Form + Zod validation
- **Date Handling:** date-fns
- **Export/Print:** html2canvas, pdf-lib
- **Excel:** XLSX (xlsx library)
- **Charts:** Recharts
- **Notifications:** Sonner (toast notifications)
- **Command Palette:** cmdk
- **Animations:** Framer Motion, Embla Carousel
- **Utilities:** lucide-react (icons), wouter (routing)

---

### 2. **Mobile App** (`/android` + Capacitor)
- **Platform:** Android (with Capacitor for cross-platform)
- **Framework:** React (shared codebase with web)
- **Build Output:** APK (Android Kotlin/Java wrapper)
- **Version:** 1.0.30

#### Capacitor Plugins:
- PushNotifications (Firebase Cloud Messaging)
- App (lifecycle management)
- Filesystem (local file access)
- Network (connectivity detection)
- Preferences (local storage)
- Share (native sharing)
- Local Notifications

#### Android-Specific Files:
- `/android/app/src/main/java/cc/selrs/app/MainActivity.java`
- `/android/app/src/main/java/cc/selrs/app/NativePrintPlugin.java`
- Uses Google Play Services for Firebase integration

---

### 3. **Desktop App** (`/desktop-electron`)
- **Framework:** Electron (Node.js + Chromium)
- **Package Version:** Defined in `/desktop-electron/package.json`
- **Build System:** Inno Setup (Windows installer)

#### Files:
- `main.js` - Main Electron process
- `preload.js` - Preload script for IPC
- `SelrsElectronInstaller.iss` - Windows installer configuration
- Build scripts for setup generation and deployment

---

## 🔌 Backend API

### Server Technology Stack
- **Runtime:** Node.js with Express.js 5.2.1
- **RPC Framework:** tRPC 11.13.4
- **Language:** TypeScript 5.9.3
- **Entry Point:** `/server/_core/index.ts`

### API Structure

#### 1. **tRPC Routers** (Primary API)

**Router Hierarchy:**
```
appRouter
├── auth
│   ├── me (query) - Get current user
│   ├── updateProfile (mutation) - Update email
│   ├── changeUsername (mutation) - Change username
│   ├── changePassword (mutation) - Change password
│   └── logout (mutation) - Clear cookies
│
├── system
│   ├── health (query) - Health check with build info
│   ├── listMigrations (query/admin) - List pending/applied migrations
│   ├── applyMigrations (mutation/admin) - Apply database migrations
│   └── notifyOwner (mutation/admin) - Send notification to owner
│
└── medical (Protected - detailed below)
```

#### 2. **Medical Router** (`/server/routers/medical.ts`)

**Procedures by Role:**
- `protectedProcedure` - All authenticated users
- `doctorProcedure` - Doctors only
- `nurseProcedure` - Nurses only
- `technicianProcedure` - Technicians only
- `receptionProcedure` - Reception staff only
- `managerProcedure` - Managers only
- `adminProcedure` - Administrators only

**Medical Endpoints (~80+ procedures):**

**Patients Management:**
- `createPatient` - Create new patient
- `updatePatient` - Update patient info
- `deletePatient` - Delete patient
- `deleteAllPatients` - Bulk delete (admin)
- `getPatient` - Get patient details
- `searchPatients` - Search/filter patients
- `bulkAssignSheetTypeToPatients` - Batch assignment
- `bulkAssignDoctorToPatients` - Batch assignment
- `bulkRestorePatients` - Restore deleted patients
- `getPatientHistory` - View patient history
- `importPatientsFromMssql` - Import from external MSSQL
- `deletePatientFromMssql` - Remove MSSQL sync

**Examinations:**
- `createExamination` - Create exam record
- `getExamination` - Retrieve exam
- `updateExamination` - Update exam
- `deleteExamination` - Delete exam
- `createPatientFromExamination` - Create patient from exam

**Sheets & Medical Forms:**
- `getSheets` - List patient's sheets
- `createSheet` - Create medical form (consultant/specialist/lasik/surgery/etc)
- `updateSheet` - Update medical form
- `deleteSheet` - Delete medical form
- `copySheet` - Duplicate sheet
- `getSheetById` - Get sheet details
- `searchSheets` - Search forms
- `getDefaultSheetType` - Get default form type
- `getPentacamExports` - Get Pentacam image exports
- `createPentacamResult` - Log Pentacam result
- `downloadPentacamExport` - Download/export Pentacam data
- `autoImportLocalPentacamExports` - Import Pentacam from local folder

**Appointments:**
- `createAppointment` - Schedule appointment
- `getAppointment` - Get appointment details
- `updateAppointment` - Update appointment
- `deleteAppointment` - Cancel appointment
- `getAppointmentsForDate` - Get date appointments
- `getAppointmentsByPatient` - Get patient appointments
- `getUpcomingAppointments` - Future appointments
- `checkAppointmentConflicts` - Check availability

**Medical Records:**
- `createMedicalReport` - Create medical report
- `getMedicalReport` - Get report
- `updateMedicalReport` - Update report
- `deleteMedicalReport` - Delete report
- `getMedicalReports` - List reports
- `getMedicalReportsByPatient` - Get patient's reports

**Prescriptions & Medications:**
- `createPrescription` - Create prescription
- `createPrescriptionWithItems` - Create with items
- `updatePrescription` - Update prescription
- `deletePrescription` - Delete prescription
- `getPrescription` - Get prescription
- `getPrescriptions` - List prescriptions
- `createMedication` - Add medication
- `updateMedication` - Update medication
- `deleteMedication` - Remove medication

**Tests & Diagnostics:**
- `createTest` - Create test
- `updateTest` - Update test
- `deleteTest` - Delete test
- `getTests` - List tests
- `createTestRequest` - Request test for patient
- `getTestRequests` - Get test requests
- `getTestFavorites` - Get favorite tests (user preference)

**Surgeries:**
- `createSurgery` - Create surgery record
- `getSurgery` - Get surgery details
- `updateSurgery` - Update surgery
- `deleteSurgery` - Delete surgery
- `getSurgeries` - List surgeries
- `createOperationList` - Create surgery list
- `deleteOperationList` - Delete surgery list
- `deleteOperationListById` - Delete by ID
- `createPostOpFollowup` - Create post-op followup

**Diseases & Symptoms:**
- `createDisease` - Add disease
- `updateDisease` - Update disease
- `deleteDisease` - Remove disease
- `getDiseases` - List diseases
- `createSymptom` - Add symptom
- `updateSymptom` - Update symptom
- `deleteSymptom` - Remove symptom
- `getSymptoms` - List symptoms

**Doctors:**
- `createDoctor` - Add doctor
- `updateDoctor` - Update doctor info
- `deleteDoctor` - Remove doctor
- `getDoctors` - List doctors
- `getDoctorsByService` - Get doctors by service

**Users & Permissions:**
- `createUser` - Create user account
- `updateUser` - Update user
- `deleteUser` - Delete user
- `getUsers` - List users
- `updateUserPermissions` - Modify user permissions
- `getEffectivePermissions` - Get user's permissions
- `getUserRoles` - Get user roles

**Services (Medical Services/Departments):**
- `createService` - Add service
- `updateService` - Update service
- `deleteService` - Remove service
- `getServices` - List services
- `getServicesByType` - Filter by type
- `getDefaultService` - Get default service
- `importServicesFromMssql` - Import from MSSQL

**Directory & Lookup:**
- `getDoctorsByCode` - Search doctors by code
- `getServicesByCode` - Search services by code
- `importDoctorDirectoryFromMssql` - Import doctor list
- `importServiceDirectoryFromMssql` - Import service list
- `syncAllFromMssql` - Full sync from MSSQL

**System Settings:**
- `getSystemSetting` - Get system configuration
- `updateSystemSetting` - Update configuration
- `getMssqlSyncStatus` - Get MSSQL sync status
- `getReadyPrescriptionTemplates` - Get prescription templates
- `importReadyPrescriptionTemplates` - Import templates
- `getAppNotifications` - Get notification feed

**Active Ingredients & Medications:**
- `getActiveIngredients` - List ingredients
- `createActiveIngredient` - Add ingredient
- `updateActiveIngredient` - Update ingredient

**Doctor Reports:**
- `createDoctorReport` - Create report
- `updateDoctorReport` - Update report
- `getDoctorReports` - List reports

---

### 3. **WebSocket Server**
- **Location:** `/server/_core/ws.ts`
- **Library:** ws (WebSocket)
- **Purpose:** Real-time updates for medical sheet changes
- **Events:**
  - `broadcastSheetUpdate` - Notify clients of sheet changes

---

### 4. **Authentication System**
- **Location:** `/server/_core/auth.ts`
- **Method:** JWT + Session Cookies
- **JWT Library:** jsonwebtoken, jose
- **Password Hashing:** bcryptjs
- **Cookie Name:** `COOKIE_NAME` (configurable via const)
- **Session Storage:** Client-side (browser cookies)

---

## 💾 Database

### Primary Database: MySQL
- **Connection:** `DATABASE_URL=mysql://user:password@host:3306/database`
- **ORM:** Drizzle ORM
- **Migration Tool:** Drizzle Kit

### Database Schema
**Location:** `/drizzle/schema.ts`

**Key Tables:**
- `users` - User accounts
- `patients` - Patient records
- `appointments` - Appointment scheduling
- `sheets` - Medical forms (various types)
- `examinations` - Exam records
- `prescriptions` - Prescription records
- `medications` - Medication inventory
- `tests` - Available tests
- `test_requests` - Test orders
- `surgeries` - Surgery records
- `diseases` - Disease reference
- `symptoms` - Symptom reference
- `doctors` - Doctor profiles
- `services` - Medical services/departments
- `medical_reports` - Medical reports
- `doctor_reports` - Doctor-specific reports
- `audit_logs` - Activity tracking
- `schema_migrations` - Migration tracking
- `page_state` - User UI state persistence
- `pentacam_results` - Pentacam imaging results
- `pentacam_exports` - Pentacam export files
- `system_settings` - Global settings
- `app_notifications` - Notification feed
- `permissions` - User permissions
- `roles` - User roles

**Migrations:** 16+ migration files in `/drizzle` directory

---

### Secondary Database: MSSQL (Optional)
- **Purpose:** Patient synchronization from external accounting system
- **Location:** `/server/integrations/mssqlPatients.ts`
- **Configuration:** Environment variables
  - `MSSQL_SERVER`, `MSSQL_PORT`, `MSSQL_DATABASE`
  - `MSSQL_USER`, `MSSQL_PASSWORD`
  - `MSSQL_AUTH_MODE` (sql or Windows auth)
  - `MSSQL_SYNC_LIMIT`, `MSSQL_SYNC_INTERVAL_MS`

**Features:**
- Auto-sync patients on interval
- Incremental sync support
- Preserve manual edits option
- Override existing records option
- Map doctor codes (via CSV)
- Link services for existing patients

---

## 📦 External Integrations

### 1. **AWS S3**
- **SDK:** @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
- **Purpose:** File storage (likely for medical documents/images)
- **Configuration:** Environment variables (likely `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

### 2. **Firebase Cloud Messaging (FCM)**
- **Location:** `/server/_core/fcmPush.ts`
- **Purpose:** Push notifications for mobile app
- **Configuration:**
  - `FCM_PROJECT_ID`
  - `FCM_CLIENT_EMAIL`
  - `FCM_PRIVATE_KEY`
  - `FCM_SERVICE_ACCOUNT_JSON`

### 3. **Black Ice Capture (Pentacam)**
- **Purpose:** Corneal topography imaging system integration
- **Features:**
  - Auto-import from local folder
  - OCR text extraction (optional, uses Tesseract)
  - Auto-link to patients by ID
  - Configuration:
    - `BLACKICE_IMPORT_SOURCE_DIR`
    - `BLACKICE_OCR_ENABLED`, `BLACKICE_OCR_TESSERACT_PATH`

### 4. **Optional OAuth/OpenID Connect**
- **Purpose:** External authentication
- **Configuration:**
  - `OAUTH_SERVER_URL`
  - `OWNER_OPEN_ID`

### 5. **Optional API Integration**
- **Name:** Built-in Forge API
- **Configuration:**
  - `BUILT_IN_FORGE_API_URL`
  - `BUILT_IN_FORGE_API_KEY`

---

## 🔒 Security Features

### Authentication & Authorization:
- JWT-based authentication
- Role-Based Access Control (RBAC) with 6+ roles
- Per-user permissions system
- Audit logging of all major actions
- Password hashing with bcryptjs
- Force password change capability

### CORS & Origin Validation:
- Configurable allowed origins (env: `CORS_ALLOWED_ORIGINS`)
- Default allowed:
  - `https://op.selrs.cc`
  - `http://localhost`, `https://localhost`
  - `capacitor://localhost`, `ionic://localhost`

### API Security:
- Protected procedures with role checks
- Input validation with Zod
- tRPC error handling

---

## 🏗️ Build & Deployment

### Scripts
```json
"dev"                    // Development server with watch
"build"                  // Full production build
"start"                  // Production server
"test"                   // Unit tests with Vitest
"test:ui"               // Browser automation tests (Playwright)
"db:migrate"            // Run database migrations
"db:push"               // Generate and migrate schema
"android:build-release" // Build Android release APK
"web:deploy"            // Deploy web build
```

### Build Configuration:
- **Frontend Build:** Vite (React + TypeScript)
- **Backend Build:** esbuild (ESM bundle, external packages)
- **Output:** `/dist` directory
- **Bundle Optimization:** Manual chunk splitting for better caching

---

## 📊 Tech Stack Summary

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 19.2.4 |
| Build Tool | Vite 8.0.1 |
| Styling | Tailwind CSS 4.2.2 |
| UI Components | Radix UI + shadcn/ui |
| State Management | React Query + Context |
| API Client | tRPC |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | Wouter |

### Backend
| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Server | Express.js 5.2.1 |
| RPC | tRPC 11.13.4 |
| Language | TypeScript 5.9.3 |
| Database ORM | Drizzle ORM |
| Validation | Zod |
| Auth | JWT + bcryptjs |
| WebSocket | ws |

### Mobile
| Component | Technology |
|-----------|-----------|
| Framework | Capacitor 8.2.0 |
| Android | Kotlin (generated) |
| Build | Gradle |
| Notifications | Firebase Cloud Messaging |
| Storage | Native filesystem access |

### Infrastructure
| Component | Service |
|-----------|---------|
| Primary DB | MySQL |
| Secondary DB | MSSQL (optional) |
| File Storage | AWS S3 |
| Push Notifications | Firebase Cloud Messaging |
| Image Analysis | Tesseract OCR (optional) |

---

## 📂 Project Structure

```
SELRS.cc/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities
│   │   ├── contexts/      # React contexts
│   │   ├── _core/         # Core setup (API client, etc)
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── public/            # Static assets
│   └── index.html         # HTML template
│
├── server/                 # Backend Express + tRPC
│   ├── _core/            # Core server setup
│   │   ├── index.ts      # Main server file
│   │   ├── auth.ts       # Auth service
│   │   ├── systemRouter.ts    # System endpoints
│   │   ├── ws.ts         # WebSocket setup
│   │   └── ...
│   ├── routers/
│   │   ├── medical.ts    # Medical endpoints (80+ procedures)
│   │   └── ...
│   ├── integrations/     # External integrations
│   │   └── mssqlPatients.ts
│   ├── db.ts             # Database queries
│   └── storage.ts        # File storage
│
├── android/               # Android Capacitor project
│   ├── app/
│   │   └── src/main/java/cc/selrs/app/
│   └── build.gradle
│
├── desktop-electron/      # Electron desktop app
│   ├── main.js
│   ├── preload.js
│   └── package.json
│
├── shared/               # Shared code
│   ├── _core/
│   ├── const.ts
│   └── types.ts
│
├── drizzle/              # Database migrations
│   ├── schema.ts
│   └── *.sql
│
├── tests/                # Test files
├── scripts/              # Build & utility scripts
└── docs/                 # Documentation
```

---

## 🚀 Running the Application

### Development:
```bash
npm run dev              # Start server + watch
npm run check           # Type check
npm run test            # Run tests
```

### Production:
```bash
npm run build           # Build all
npm run start           # Start server
npm run android:build-release    # Build Android APK
npm run web:deploy              # Deploy web
```

### Database:
```bash
npm run db:migrate      # Run migrations
npm run db:push         # Generate + migrate
```

---

## 🔧 Configuration

### Environment Variables (`.env`):
- `NODE_ENV`, `PORT`, `HOST`
- `DATABASE_URL` - MySQL connection
- `JWT_SECRET` - JWT signing key
- `MSSQL_*` - MSSQL sync configuration
- `AWS_*` - S3 credentials
- `FCM_*` - Firebase configuration
- `BLACKICE_*` - Pentacam import settings
- `CORS_ALLOWED_ORIGINS` - Allowed origins

---

## 📝 Key Features

1. **Comprehensive Patient Management** - Full CRUD with search/filter
2. **Medical Records** - Exam forms, reports, prescriptions
3. **Appointment Scheduling** - Calendar-based booking
4. **Multi-role System** - 6+ user roles with permissions
5. **Integration Ready** - MSSQL sync, S3 storage, Firebase messaging
6. **Multi-platform** - Web, mobile, desktop
7. **Real-time Updates** - WebSocket for medical form changes
8. **Data Import/Export** - Excel templates for bulk import
9. **Audit Logging** - Track all major user actions
10. **Offline Support** - Mobile app offline capability (Capacitor)

---

**Last Updated:** March 29, 2026
**Version:** 1.0.30
