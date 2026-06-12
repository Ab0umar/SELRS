# SELRS tRPC API Reference

## API Structure

All APIs use **tRPC** over HTTP with Express.js middleware. Base URL: `http://localhost:4000/trpc/`

**Request Format:**

```
POST /trpc/[router].[procedure]?batch=1
Content-Type: application/json

{
  "0": { "json": { ...input } }
}
```

---

## 🔐 Authentication Router (`auth`)

### 1. `auth.me` (Query)

Get current authenticated user.

```typescript
// Input: (none)
// Output:
{
  id: number;
  username: string;
  role: string;
  email?: string;
  mustChangePassword: boolean;
}
```

---

### 2. `auth.updateProfile` (Mutation)

Update user email.

```typescript
// Input:
{
  email?: string | ""  // Empty string = remove email
}

// Output:
{ success: true }
```

---

### 3. `auth.changeUsername` (Mutation)

Change username (must be different and unique).

```typescript
// Input:
{
  username: string; // Min 3, Max 64 chars
}

// Output:
{
  success: true;
}
```

---

### 4. `auth.changePassword` (Mutation)

Change password with current password verification.

```typescript
// Input:
{
  currentPassword: string;
  newPassword: string; // Min 6 chars, must differ from current
}

// Output:
{
  success: true;
}

// Errors:
// - INVALID_CURRENT_PASSWORD
// - PASSWORD_SAME_AS_CURRENT
```

---

### 5. `auth.logout` (Mutation)

Clear session cookies.

```typescript
// Input: (none)

// Output:
{
  success: true;
}
```

---

## 🔑 Permission System

All non-Medical routers use **per-page factory procedures** defined in `server/_core/procedures.ts`. Each factory is called with a `pagePath` string (e.g. `"/salary"`, `"/kf/patients"`) and enforces access based on the user's stored permission strings.

### Path-suffix semantics

| Stored permission | Access granted |
|---|---|
| `/salary` (bare) | Read + Write — backward-compatible; AdminUsers saves bare paths |
| `/salary:r` | Read-only |
| `/salary:rw` | Read + Write |
| (no match) | FORBIDDEN |

Parent paths cover children: `/salary:rw` grants access to `/salary/payroll`.

Write check: bare paths and `:rw` both pass the write guard. `:r` alone does not.

### Factory functions

| Factory | Module | Bypass roles |
|---|---|---|
| `makeKfProcedure` / `makeKfWriteProcedure` | KF clinical | admin + accountant |
| `makeAccProcedure` / `makeAccWriteProcedure` | Accounting | admin |
| `makeAttProcedure` / `makeAttWriteProcedure` | Attendance | admin + manager |
| `makeSalaryProcedure` / `makeSalaryWriteProcedure` | Salary | admin + manager |
| `makeStockroomProcedure` / `makeStockroomWriteProcedure` | Stockroom | admin + accountant |

**AdminUsers** (per-user permissions page) saves bare paths → full access.
**AdminPermissions** (team/role permissions) saves with `:r` or `:rw` suffix.

---

## ⚙️ System Router (`system`)

### 1. `system.health` (Query)

Health check endpoint with build information.

```typescript
// Input:
{
  timestamp: number;
} // Unix timestamp (ms)

// Output:
{
  ok: true;
  version: string;
  buildTime: string;
  commit: string;
}
```

---

### 2. `system.listMigrations` (Query, Admin Only)

List database migrations and their status.

```typescript
// Input: (none)

// Output:
{
  source: "schema" | "journal" | "none";
  dbError?: string | null;
  migrations: {
    name: string;
    appliedAt: string | null;  // ISO 8601 timestamp
    pending: boolean;
  }[];
}
```

---

### 3. `system.applyMigrations` (Mutation, Admin Only)

Apply pending database migrations.

```typescript
// Input:
{
  limit?: number  // Max 50, optional
}

// Output:
{ applied: number }  // Number of migrations applied
```

---

### 4. `system.notifyOwner` (Mutation, Admin Only)

Send notification to system owner.

```typescript
// Input:
{
  title: string; // Min 1 char
  content: string; // Min 1 char
}

// Output:
{
  success: boolean;
} // Whether notification was delivered
```

---

## 👥 Medical Router (`medical`)

### Patient Management

#### `createPatient` (Mutation, Protected)

```typescript
{
  code: string;
  name: string;
  age?: number;
  dateOfBirth?: string;
  gender?: "M" | "F";
  phone?: string;
  alternatePhone?: string;
  address?: string;
  email?: string;
}
// Output: { id: number; code: string; }
```

#### `updatePatient` (Mutation, Protected)

```typescript
{
  id: number;
  code?: string;
  name?: string;
  age?: number;
  // ... other fields
}
// Output: { success: true }
```

#### `getPatient` (Query, Protected)

```typescript
{
  id: number;
}
// Output: Full patient object
```

#### `deletePatient` (Mutation, Protected)

```typescript
{
  id: number;
}
// Output: { success: true }
```

#### `searchPatients` (Query, Protected)

```typescript
{
  query?: string;
  offset?: number;
  limit?: number;
}
// Output: { patients: Patient[]; total: number; }
```

#### `importPatientsFromMssql` (Mutation, Protected)

```typescript
{ force?: boolean }
// Output: { imported: number }
```

#### `deletePatientFromMssql` (Mutation, Protected)

```typescript
{
  patientCode: string;
}
// Output: { success: true }
```

#### `bulkAssignDoctorToPatients` (Mutation, Protected)

```typescript
{
  patientIds: number[];
  doctorId: number;
}
// Output: { updated: number }
```

#### `bulkAssignSheetTypeToPatients` (Mutation, Protected)

```typescript
{
  patientIds: number[];
  sheetType: string;
}
// Output: { updated: number }
```

#### `bulkRestorePatients` (Mutation, Protected)

```typescript
{ patientIds: number[] }
// Output: { restored: number }
```

---

### Appointments

#### `createAppointment` (Mutation, Protected)

```typescript
{
  patientId: number;
  doctorId: number;
  appointmentDate: string;  // ISO date
  appointmentType?: string;
}
// Output: { id: number }
```

#### `getAppointmentsForDate` (Query, Protected)

```typescript
{
  date: string;
} // ISO date
// Output: Appointment[]
```

#### `getUpcomingAppointments` (Query, Protected)

```typescript
{ limit?: number }
// Output: Appointment[]
```

#### `updateAppointment` (Mutation, Protected)

```typescript
{
  id: number;
  doctorId?: number;
  appointmentDate?: string;
  appointmentType?: string;
}
// Output: { success: true }
```

#### `deleteAppointment` (Mutation, Protected)

```typescript
{
  id: number;
}
// Output: { success: true }
```

---

### Medical Sheets/Forms

#### `createSheet` (Mutation, Protected)

```typescript
{
  patientId: number;
  sheetType: string; // "consultant" | "specialist" | "lasik" | "surgery" | "external" | "pentacam" | "radiology"
  data: Record<string, any>;
}
// Output: { id: number }
```

#### `getSheets` (Query, Protected)

```typescript
{
  patientId: number;
}
// Output: { sheets: Sheet[] }
```

#### `getSheetById` (Query, Protected)

```typescript
{
  id: number;
}
// Output: Full sheet object with data
```

#### `updateSheet` (Mutation, Protected)

```typescript
{
  id: number;
  data: Record<string, any>;
}
// Output: { success: true }
```

#### `deleteSheet` (Mutation, Protected)

```typescript
{
  id: number;
}
// Output: { success: true }
```

#### `copySheet` (Mutation, Protected)

```typescript
{
  id: number;
}
// Output: { newId: number }
```

#### `getPentacamExports` (Query, Protected)

```typescript
{
  patientId: number;
}
// Output: { exports: PentacamExport[] }
```

#### `autoImportLocalPentacamExports` (Mutation, Doctor/Admin)

```typescript
(no input)
// Output: { imported: number }
```

---

### Examinations

#### `createExamination` (Mutation, Protected)

```typescript
{
  patientId: number;
  date: string;
  findings: string;
  // ... medical fields
}
// Output: { id: number }
```

#### `createPatientFromExamination` (Mutation, Doctor)

```typescript
{
  examinationId: number;
  name: string;
  code: string;
  // ... patient fields
}
// Output: { patientId: number }
```

#### `updateExamination` (Mutation, Protected)

```typescript
{
  id: number;
  date?: string;
  findings?: string;
  // ...
}
// Output: { success: true }
```

#### `deleteExamination` (Mutation, Protected)

```typescript
{
  id: number;
}
// Output: { success: true }
```

---

### Prescriptions & Medications

#### `createPrescription` (Mutation, Doctor)

```typescript
{
  patientId: number;
  date: string;
  items?: { medicationId: number; dosage: string }[];
}
// Output: { id: number }
```

#### `createPrescriptionWithItems` (Mutation, Doctor)

```typescript
{
  patientId: number;
  date: string;
  items: Array<{
    medicationId: number;
    dosage: string;
    instructions?: string;
  }>;
}
// Output: { id: number }
```

#### `deletePrescription` (Mutation, Doctor)

```typescript
{
  id: number;
}
// Output: { success: true }
```

#### `createMedication` (Mutation, Admin/Manager)

```typescript
{
  name: string;
  activeIngredientId?: number;
  dosage?: string;
}
// Output: { id: number }
```

#### `updateMedication` (Mutation, Admin/Manager)

```typescript
{
  id: number;
  name?: string;
  dosage?: string;
  // ...
}
// Output: { success: true }
```

#### `deleteMedication` (Mutation, Admin)

```typescript
{
  id: number;
}
// Output: { success: true }
```

---

### Tests & Diagnostics

#### `createTest` (Mutation, Admin)

```typescript
{
  name: string;
  code: string;
  category?: string;
}
// Output: { id: number }
```

#### `createTestRequest` (Mutation, Doctor)

```typescript
{
  patientId: number;
  testId: number;
  requestedDate?: string;
}
// Output: { id: number }
```

#### `getTestRequests` (Query, Protected)

```typescript
{ patientId?: number }
// Output: TestRequest[]
```

#### `getTestFavorites` (Query, Protected)

```typescript
(no input)
// Output: { tests: Test[] }
```

#### `deleteTest` (Mutation, Admin)

```typescript
{
  id: number;
}
// Output: { success: true }
```

---

### Surgeries

#### `createSurgery` (Mutation, Doctor)

```typescript
{
  patientId: number;
  surgeryDate: string;
  surgeryType: string;
  notes?: string;
}
// Output: { id: number }
```

#### `getSurgeries` (Query, Protected)

```typescript
{ patientId?: number }
// Output: Surgery[]
```

#### `deleteSurgery` (Mutation, Doctor)

```typescript
{
  id: number;
}
// Output: { success: true }
```

#### `createOperationList` (Mutation, Doctor)

```typescript
{
  surgeryDate: string;
  surgeries: Array<{
    patientId: number;
    surgeryType: string;
  }>;
}
// Output: { id: number; count: number }
```

#### `createPostOpFollowup` (Mutation, Doctor)

```typescript
{
  surgeryId: number;
  followupDate: string;
  findings?: string;
}
// Output: { id: number }
```

---

### Diseases & Symptoms

#### `getDiseases` (Query, Protected)

```typescript
(no input)
// Output: Disease[]
```

#### `createDisease` (Mutation, Admin)

```typescript
{
  name: string;
  code?: string;
  branch?: string;
}
// Output: { id: number }
```

#### `updateDisease` (Mutation, Admin)

```typescript
{
  id: number;
  name?: string;
  // ...
}
// Output: { success: true }
```

#### `deleteDisease` (Mutation, Admin)

```typescript
{
  id: number;
}
// Output: { success: true }
```

#### `getSymptoms` (Query, Protected)

```typescript
(no input)
// Output: Symptom[]
```

#### `createSymptom` (Mutation, Admin)

```typescript
{
  name: string;
}
// Output: { id: number }
```

---

### Doctors

#### `getDoctors` (Query, Protected)

```typescript
(no input)
// Output: Doctor[]
```

#### `createDoctor` (Mutation, Admin)

```typescript
{
  code: string;
  name: string;
  isActive?: boolean;
  locationType?: "center" | "external";
  doctorType?: "consultant" | "specialist" | "external";
}
// Output: { id: number }
```

#### `updateDoctor` (Mutation, Admin)

```typescript
{
  id: number;
  name?: string;
  // ...
}
// Output: { success: true }
```

#### `getDoctorsByService` (Query, Protected)

```typescript
{
  serviceId: number;
}
// Output: Doctor[]
```

---

### Services (Medical Departments)

#### `getServices` (Query, Protected)

```typescript
(no input)
// Output: Service[]
```

#### `createService` (Mutation, Admin)

```typescript
{
  code: string;
  name: string;
  serviceType: "consultant" | "specialist" | "lasik" | "surgery" | "external";
  isActive?: boolean;
}
// Output: { id: number }
```

#### `getServicesByType` (Query, Protected)

```typescript
{
  serviceType: string;
}
// Output: Service[]
```

#### `importServicesFromMssql` (Mutation, Admin)

```typescript
(no input)
// Output: { imported: number }
```

---

### Users & Permissions

#### `getUsers` (Query, Admin)

```typescript
(no input)
// Output: User[]
```

#### `createUser` (Mutation, Admin)

```typescript
{
  username: string;
  password: string;
  email?: string;
  role?: string;
}
// Output: { id: number }
```

#### `updateUser` (Mutation, Admin)

```typescript
{
  id: number;
  username?: string;
  email?: string;
  role?: string;
}
// Output: { success: true }
```

#### `deleteUser` (Mutation, Admin)

```typescript
{
  id: number;
}
// Output: { success: true }
```

#### `updateUserPermissions` (Mutation, Admin)

```typescript
{
  userId: number;
  permissions: string[];
}
// Output: { success: true }
```

#### `getEffectivePermissions` (Query, Protected)

```typescript
{ userId?: number }
// Output: string[]
```

---

### Medical Reports

#### `createMedicalReport` (Mutation, Doctor)

```typescript
{
  patientId: number;
  reportDate: string;
  content: string;
  reportType?: string;
}
// Output: { id: number }
```

#### `getMedicalReports` (Query, Protected)

```typescript
{
  patientId: number;
}
// Output: MedicalReport[]
```

#### `updateMedicalReport` (Mutation, Doctor)

```typescript
{
  id: number;
  content?: string;
  // ...
}
// Output: { success: true }
```

#### `deleteMedicalReport` (Mutation, Doctor)

```typescript
{
  id: number;
}
// Output: { success: true }
```

---

### System Settings

#### `getSystemSetting` (Query, Protected)

```typescript
{
  key: string;
}
// Output: any  // Depends on setting key
```

Supported keys:

- `appointments_pricing_v1` - Pricing configuration
- `app_notification_settings_v1` - Notification settings
- `app_notifications_feed_v1` - Notification feed array
- `mssql_sync_runtime_v1` - MSSQL sync configuration

#### `updateSystemSetting` (Mutation, Admin)

```typescript
{
  key: string;
  value: any;
}
// Output: { success: true }
```

#### `getMssqlSyncStatus` (Query, Admin)

```typescript
(no input)
// Output: {
//   lastSyncTime?: string;
//   nextSyncTime?: string;
//   status: "idle" | "syncing" | "error";
//   errorMessage?: string;
// }
```

---

### Template Management

#### `getReadyPrescriptionTemplates` (Query, Protected)

```typescript
(no input)
// Output: ReadyTemplate[]
```

#### `importReadyPrescriptionTemplates` (Mutation, Admin)

```typescript
{
  filePath: string;
}
// Output: { imported: number }
```

---

### Directory Import

#### `importDoctorDirectoryFromMssql` (Mutation, Admin)

```typescript
(no input)
// Output: { imported: number }
```

#### `importServiceDirectoryFromMssql` (Mutation, Admin)

```typescript
(no input)
// Output: { imported: number }
```

#### `syncAllFromMssql` (Mutation, Admin)

```typescript
(no input)
// Output: { patients: number; doctors: number; services: number }
```

---

### Notifications

#### `getAppNotifications` (Query, Protected)

```typescript
(no input)
// Output: {
//   notifications: Notification[];
//   unreadCount: number;
// }
```

---

### Active Ingredients

#### `getActiveIngredients` (Query, Admin)

```typescript
(no input)
// Output: ActiveIngredient[]
```

#### `createActiveIngredient` (Mutation, Admin)

```typescript
{
  name: string;
}
// Output: { id: number }
```

---

## Error Handling

All errors follow tRPC standard error format:

```typescript
{
  code: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR" | ...
  message: string;
  data?: {
    code: string;
    httpStatus: number;
    // Additional error details
  }
}
```

---

## Role-Based Access Control

### Roles:

1. **admin** - Full access to all APIs
2. **doctor** - Medical procedures, can view patients
3. **specialist** - Similar to doctor
4. **technician** - Limited medical operations
5. **nurse** - Can record observations, notify doctors
6. **reception** - Patient scheduling, basic info
7. **manager** - Reports and admin tasks
8. **accountant** - Financial/billing access

---

## WebSocket Events

### `broadcastSheetUpdate`

Notifies connected clients when a medical sheet is updated.

```typescript
{
  event: "sheetUpdated";
  sheetId: number;
  patientId: number;
  updatedBy: number;
  timestamp: string;
}
```

---

## Example Requests

### Create Patient

```bash
curl -X POST http://localhost:4000/trpc/medical.createPatient \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "code": "P001",
      "name": "أحمد محمد",
      "age": 30,
      "phone": "+2010123456"
    }
  }'
```

### Search Patients

```bash
curl -X POST http://localhost:4000/trpc/medical.searchPatients \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "query": "أحمد",
      "offset": 0,
      "limit": 10
    }
  }'
```

### Get Health Status

```bash
curl -X POST http://localhost:4000/trpc/system.health \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "timestamp": 1680000000000
    }
  }'
```

---

## 🏥 KF Router (`kf`)

Isolated clinical module (MySQL-only, `kf_*` tables). All procedures gated by `makeKfProcedure` / `makeKfWriteProcedure` — admin and accountant bypass, otherwise requires a matching `/kf/*` permission.

Patient codes use the format `KF-0001`.

### Tables

- `kf_patients` — KF patient registry
- `kf_operations` — KF operations/surgeries
- `kf_followups` — Post-op follow-ups
- `kf_accounting_ledger` — KF ledger entries
- `kf_accounting_receipts` — KF receipts

### Page-to-procedure mapping

| Page path | Procedure type |
|---|---|
| `/kf/patients` | `makeKfProcedure("/kf/patients")` / `makeKfWriteProcedure("/kf/patients")` |
| `/kf/operations` | `makeKfProcedure("/kf/operations")` / `makeKfWriteProcedure("/kf/operations")` |
| `/kf/followups` | `makeKfProcedure("/kf/followups")` / `makeKfWriteProcedure("/kf/followups")` |
| `/kf/accounting/ledger` | `makeKfProcedure("/kf/accounting/ledger")` / `makeKfWriteProcedure("/kf/accounting/ledger")` |
| `/kf/accounting/receipts` | `makeKfProcedure("/kf/accounting/receipts")` / `makeKfWriteProcedure("/kf/accounting/receipts")` |

Router file: `server/routers/kf.ts`

---

## 📦 Stockroom Router (`stockroom`)

Inventory module. Previously used `protectedProcedure` (any logged-in user); now gated by `makeStockroomProcedure` / `makeStockroomWriteProcedure` — admin and accountant bypass.

### Tables

- `stockItems` — Inventory items
- `stockTransactions` — Stock movement transactions

### Routes

| Route | Procedure type |
|---|---|
| `/stockroom` | `makeStockroomProcedure("/stockroom")` / `makeStockroomWriteProcedure("/stockroom")` |
| `/stockroom/reports` | `makeStockroomProcedure("/stockroom/reports")` |

Router file: `server/routers/stockroom.ts`

---

**Last Updated:** 2026-06-12
**API Version:** 1.1.0
