# KF Module — Task List

**Version:** 1.0.0
**Date:** 2026-06-09
**Dependency order:** Tasks must be executed top-to-bottom. Each task depends on all prior tasks completing.

---

## Priority & Difficulty Map

### 🔴 P1 — Foundation (do first, everything blocks on these)

| Task | Difficulty | What | Why critical |
|------|-----------|------|-------------|
| KF-01 | ⭐⭐ Medium | Append kf_* tables to `drizzle/schema.ts` | All backend and frontend types derive from this |
| KF-02 | ⭐ Easy | SQL migration DDL file | DB must exist before any runtime test |
| KF-03 | ⭐⭐ Medium | Shared Zod contracts | Router + frontend both import from here |
| KF-04 | ⭐⭐ Medium | Add `kfProcedure` to `procedures.ts` | Router cannot compile without it — touches protected file |

### 🟠 P2 — Core Backend (unlock the API)

| Task | Difficulty | What | Why |
|------|-----------|------|-----|
| KF-05 | ⭐⭐⭐ Hard | `server/routers/kf.ts` — all 19 procedures | Largest single file; code generation logic + bridge query |
| KF-06 | ⭐ Easy | Register kfRouter in `index.ts` (2 lines) | Nothing callable until registered |

### 🟡 P3 — Core Frontend (minimum usable UI)

| Task | Difficulty | What | Why |
|------|-----------|------|-----|
| KF-07 | ⭐⭐ Medium | `KfShell.tsx` + `KfHome.tsx` | Navigation wrapper needed by all other pages |
| KF-08 | ⭐⭐⭐ Hard | Patient list + form + detail (3 pages) | Main workflow — search, create, view |
| KF-10 | ⭐ Easy | Lazy imports + routes in `App.tsx` | Nothing reachable without routes |

### 🟢 P4 — Extended Clinical Forms

| Task | Difficulty | What | Why |
|------|-----------|------|-----|
| KF-09 | ⭐⭐⭐ Hard | 5 clinical form pages (visit, exam, op, operations list, followups list) | Complex medical fields; largest frontend chunk |

### ⚪ P5 — Verification (last, non-blocking)

| Task | Difficulty | What | Why |
|------|-----------|------|-----|
| KF-11 | ⭐ Easy | MSSQL safety audit (grep + diff) | Confirms no accidental MSSQL or cross-module leakage |

---

### Difficulty Legend
- ⭐ Easy — pattern copy, small edit, or config file
- ⭐⭐ Medium — requires reading existing patterns, multi-field work, touches protected file
- ⭐⭐⭐ Hard — large new file, complex logic, many procedures/forms, or clinical domain knowledge needed

### Suggested execution batches
- **Batch 1 (backend foundation):** KF-01 → KF-02 → KF-03 → KF-04 → KF-05 → KF-06 — complete the full backend, run `pnpm check`
- **Batch 2 (frontend shell + patients):** KF-07 → KF-08 → KF-10 — minimum navigable UI, run `pnpm build`
- **Batch 3 (clinical forms):** KF-09 — remaining forms, run `pnpm build`
- **Batch 4 (audit):** KF-11 — final safety verification

---

## TASK-KF-01 — DB Schema: Add kf_* tables to drizzle/schema.ts

**Owner Model:** Cursor / Codex
**Tool:** Edit
**Role:** Backend

### Input
- `drizzle/schema.ts` (append at end of file)
- `specs/kf/specify.md` §4 (entity column list)

### Output — changes to make
Append to `drizzle/schema.ts` (after last existing table):

```typescript
// ── KF Module Tables ──────────────────────────────────────────────────────

export const kfPatients = mysqlTable("kf_patients", {
  kfId: int("kf_id").autoincrement().primaryKey(),
  kfCode: varchar("kf_code", { length: 20 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  age: int("age"),
  gender: mysqlEnum("gender", ["male", "female"]),
  nationalId: varchar("national_id", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  address: text("address"),
  occupation: varchar("occupation", { length: 255 }),
  medicalHistory: text("medical_history"),
  allergies: text("allergies"),
  notes: text("notes"),
  selrsPatientCode: varchar("selrs_patient_code", { length: 50 }),
  createdByUserId: int("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KfPatient = typeof kfPatients.$inferSelect;
export type InsertKfPatient = typeof kfPatients.$inferInsert;

export const kfVisits = mysqlTable("kf_visits", {
  kfVisitId: int("kf_visit_id").autoincrement().primaryKey(),
  kfPatientId: int("kf_patient_id").notNull(),
  visitDate: date("visit_date").notNull(),
  visitType: mysqlEnum("visit_type", ["consultation","examination","followup","operation"]).default("consultation"),
  doctorName: varchar("doctor_name", { length: 255 }),
  status: mysqlEnum("status", ["scheduled","arrived","in_progress","completed","cancelled"]).default("scheduled"),
  notes: text("notes"),
  createdByUserId: int("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KfVisit = typeof kfVisits.$inferSelect;
export type InsertKfVisit = typeof kfVisits.$inferInsert;

export const kfExaminations = mysqlTable("kf_examinations", {
  kfExamId: int("kf_exam_id").autoincrement().primaryKey(),
  kfPatientId: int("kf_patient_id").notNull(),
  kfVisitId: int("kf_visit_id"),
  examDate: date("exam_date").notNull(),
  rightVa: varchar("right_va", { length: 20 }),
  leftVa: varchar("left_va", { length: 20 }),
  rightRefraction: json("right_refraction"),
  leftRefraction: json("left_refraction"),
  iopRight: varchar("iop_right", { length: 20 }),
  iopLeft: varchar("iop_left", { length: 20 }),
  diagnosis: text("diagnosis"),
  plan: text("plan"),
  notes: text("notes"),
  doctorName: varchar("doctor_name", { length: 255 }),
  examinedByUserId: int("examined_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KfExamination = typeof kfExaminations.$inferSelect;
export type InsertKfExamination = typeof kfExaminations.$inferInsert;

export const kfOperations = mysqlTable("kf_operations", {
  kfOpId: int("kf_op_id").autoincrement().primaryKey(),
  kfPatientId: int("kf_patient_id").notNull(),
  kfVisitId: int("kf_visit_id"),
  opDate: date("op_date").notNull(),
  opType: varchar("op_type", { length: 255 }).notNull(),
  eye: mysqlEnum("eye", ["right","left","both"]),
  doctorName: varchar("doctor_name", { length: 255 }),
  status: mysqlEnum("status", ["scheduled","completed","cancelled"]).default("scheduled"),
  notes: text("notes"),
  createdByUserId: int("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KfOperation = typeof kfOperations.$inferSelect;
export type InsertKfOperation = typeof kfOperations.$inferInsert;

export const kfFollowups = mysqlTable("kf_followups", {
  kfFollowupId: int("kf_followup_id").autoincrement().primaryKey(),
  kfPatientId: int("kf_patient_id").notNull(),
  kfVisitId: int("kf_visit_id"),
  kfOpId: int("kf_op_id"),
  followupDate: date("followup_date").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled","completed","missed"]).default("scheduled"),
  createdByUserId: int("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KfFollowup = typeof kfFollowups.$inferSelect;
export type InsertKfFollowup = typeof kfFollowups.$inferInsert;
```

### Acceptance Criteria
- `pnpm check` passes with zero errors
- `git diff drizzle/schema.ts` shows only additions (no existing lines deleted or modified)
- Each table has correct Drizzle types matching MySQL column types

### Verification
```bash
pnpm check
git diff --stat drizzle/schema.ts
```

---

## TASK-KF-02 — DB Migration: 00030_kf_tables.sql

**Owner Model:** Cursor / Codex
**Tool:** Write (new file)
**Role:** Backend / DBA

### Input
- Table designs from `specs/kf/specify.md` §4

### Output — create file
`drizzle/migrations/00030_kf_tables.sql`:

```sql
-- KF Module: create isolated kf_* tables (MySQL only, no MSSQL)

CREATE TABLE IF NOT EXISTS `kf_patients` (
  `kf_id`               INT            NOT NULL AUTO_INCREMENT,
  `kf_code`             VARCHAR(20)    NOT NULL,
  `full_name`           VARCHAR(255)   NOT NULL,
  `date_of_birth`       DATE,
  `age`                 INT,
  `gender`              ENUM('male','female'),
  `national_id`         VARCHAR(20),
  `phone`               VARCHAR(20),
  `alternate_phone`     VARCHAR(20),
  `address`             TEXT,
  `occupation`          VARCHAR(255),
  `medical_history`     TEXT,
  `allergies`           TEXT,
  `notes`               TEXT,
  `selrs_patient_code`  VARCHAR(50),
  `created_by_user_id`  INT,
  `created_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_id`),
  UNIQUE KEY `kf_patients_kf_code_unique` (`kf_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_visits` (
  `kf_visit_id`         INT            NOT NULL AUTO_INCREMENT,
  `kf_patient_id`       INT            NOT NULL,
  `visit_date`          DATE           NOT NULL,
  `visit_type`          ENUM('consultation','examination','followup','operation') DEFAULT 'consultation',
  `doctor_name`         VARCHAR(255),
  `status`              ENUM('scheduled','arrived','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `notes`               TEXT,
  `created_by_user_id`  INT,
  `created_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_visit_id`),
  KEY `kf_visits_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_examinations` (
  `kf_exam_id`          INT            NOT NULL AUTO_INCREMENT,
  `kf_patient_id`       INT            NOT NULL,
  `kf_visit_id`         INT,
  `exam_date`           DATE           NOT NULL,
  `right_va`            VARCHAR(20),
  `left_va`             VARCHAR(20),
  `right_refraction`    JSON,
  `left_refraction`     JSON,
  `iop_right`           VARCHAR(20),
  `iop_left`            VARCHAR(20),
  `diagnosis`           TEXT,
  `plan`                TEXT,
  `notes`               TEXT,
  `doctor_name`         VARCHAR(255),
  `examined_by_user_id` INT,
  `created_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_exam_id`),
  KEY `kf_exam_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_operations` (
  `kf_op_id`            INT            NOT NULL AUTO_INCREMENT,
  `kf_patient_id`       INT            NOT NULL,
  `kf_visit_id`         INT,
  `op_date`             DATE           NOT NULL,
  `op_type`             VARCHAR(255)   NOT NULL,
  `eye`                 ENUM('right','left','both'),
  `doctor_name`         VARCHAR(255),
  `status`              ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled',
  `notes`               TEXT,
  `created_by_user_id`  INT,
  `created_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_op_id`),
  KEY `kf_op_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_followups` (
  `kf_followup_id`      INT            NOT NULL AUTO_INCREMENT,
  `kf_patient_id`       INT            NOT NULL,
  `kf_visit_id`         INT,
  `kf_op_id`            INT,
  `followup_date`       DATE           NOT NULL,
  `notes`               TEXT,
  `status`              ENUM('scheduled','completed','missed') DEFAULT 'scheduled',
  `created_by_user_id`  INT,
  `created_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_followup_id`),
  KEY `kf_followup_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Acceptance Criteria
- File exists at `drizzle/migrations/00030_kf_tables.sql`
- Running the SQL against `selrs26` creates all 5 tables
- `SHOW TABLES LIKE 'kf_%'` returns exactly 5 rows

### Verification
```sql
SHOW TABLES LIKE 'kf_%';
-- Expected: kf_examinations, kf_followups, kf_operations, kf_patients, kf_visits
```

---

## TASK-KF-03 — Shared Contracts: shared/kf/contracts.ts

**Owner Model:** Cursor / Codex
**Tool:** Write (new file)
**Role:** Backend / Shared

### Input
- Table designs from `specs/kf/specify.md` §4
- API procedure table from `specs/kf/plan.md`

### Output — create file
`shared/kf/contracts.ts` with Zod schemas for all KF inputs and inferred types.

Key schemas:
- `KfCreatePatientSchema` — all patient fields, `fullName` required, others optional
- `KfCreateVisitSchema` — `kfPatientId` + `visitDate` required
- `KfCreateExaminationSchema` — `kfPatientId` + `examDate` required
- `KfCreateOperationSchema` — `kfPatientId` + `opDate` + `opType` required
- `KfCreateFollowupSchema` — `kfPatientId` + `followupDate` required
- Export inferred TypeScript types for each

### Acceptance Criteria
- File compiles cleanly (`pnpm check`)
- All required fields are non-optional in schema
- No imports from `server/` or `client/` (shared only)

### Verification
```bash
pnpm check
```

---

## TASK-KF-04 — Backend Procedure: add kfProcedure to procedures.ts

**Owner Model:** Cursor / Codex
**Tool:** Edit
**Role:** Backend
**⚠️ Protected file — minimal edit only**

### Input
- `server/_core/procedures.ts`
- Pattern: copy `accountingProcedure` structure exactly, change path from `/accounting` to `/kf`

### Output — append after last procedure export
```typescript
// KF module procedure — gate by /kf path permission or admin
export const kfProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    if (ctx.user.role === "admin" || ctx.user.role === "accountant") {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    const permissions = await db.getEffectiveUserPermissions(
      ctx.user.id,
      ctx.user.role ?? undefined,
    );
    const canAccessKf = permissions.some((p) => {
      const clean = String(p ?? "").replace(/:r[w]?$/, "").trim();
      return clean === "/kf" || clean.startsWith("/kf/");
    });

    if (!canAccessKf) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "KF access required",
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
```

### Acceptance Criteria
- `pnpm check` passes
- `git diff server/_core/procedures.ts` shows only the new export appended — no existing lines changed
- Pattern is identical to `accountingProcedure` with path `/kf`

### Verification
```bash
pnpm check
git diff server/_core/procedures.ts
```

---

## TASK-KF-05 — Backend Router: server/routers/kf.ts

**Owner Model:** Cursor / Codex
**Tool:** Write (new file)
**Role:** Backend

### Input
- `shared/kf/contracts.ts` (schemas)
- `drizzle/schema.ts` (kfPatients, kfVisits, kfExaminations, kfOperations, kfFollowups)
- `server/_core/procedures.ts` (kfProcedure)
- API procedure table from `specs/kf/plan.md`

### Output
`server/routers/kf.ts` implementing all procedures listed in plan.md §API Procedures.

Critical rules for this file:
- Import from `../../drizzle/schema` (kf tables only)
- Import `kfProcedure` from `../_core/procedures`
- Import `getDb` from `../db` for database access
- **Never import** `createMssqlPool`, `mssqlQuery`, or any file from `server/integrations/mssqlPatients.ts`
- **Never import** `insertPatient`, `updatePatient`, or any medical write helper
- For `bridgeLookupSelrsPatient`: `SELECT id, patientCode, fullName FROM patients WHERE patientCode = ?` via `getDb()` — read only
- Code generation: after insert into `kf_patients`, run `UPDATE kf_patients SET kf_code = CONCAT('KF-', LPAD(kf_id, 4, '0')) WHERE kf_id = ?` — produces `KF-0001`, `KF-0002`, etc.
- All mutations must check `kfPatientId` exists before child inserts
- Return shapes must match contracts in `shared/kf/contracts.ts`

### Acceptance Criteria
- `pnpm check` passes
- `grep -iE "mssql|createMssqlPool|mssqlQuery|insertPatient|updatePatient" server/routers/kf.ts` returns zero results
- All procedures return correct shape per contracts
- `createPatient` returns `{ kfId, kfCode }` with correctly formatted code

### Verification
```bash
pnpm check
grep -iE "mssql|createMssqlPool|mssqlQuery" server/routers/kf.ts
```

---

## TASK-KF-06 — Register Router: server/routers/index.ts

**Owner Model:** Cursor / Codex
**Tool:** Edit
**Role:** Backend
**Allowed shared edit point**

### Input
- `server/routers/index.ts`

### Output — add 2 lines
```typescript
// Add import:
import { kfRouter } from "./kf";

// Add to appRouter:
kf: kfRouter,
```

### Acceptance Criteria
- `pnpm check` passes
- `git diff server/routers/index.ts` shows exactly 2 lines added

### Verification
```bash
pnpm check
git diff server/routers/index.ts
```

---

## TASK-KF-07 — Frontend Shell + Home: KfShell.tsx + KfHome.tsx

**Owner Model:** Cursor / Codex (UI: Gemini alternative)
**Tool:** Write (new files)
**Role:** Frontend

### Input
- `client/src/pages/accounting/AccountingShell.tsx` (reference pattern)
- `specs/kf/plan.md` (routes)

### Output — create 2 files
`client/src/pages/kf/KfShell.tsx`:
- RTL layout (`dir="rtl"`)
- Top navigation: المرضى | العمليات | المتابعات | الرئيسية
- Renders `{children}` in main content area
- Uses shadcn/ui primitives only

`client/src/pages/kf/KfHome.tsx`:
- Dashboard card: total KF patients count (`trpc.kf.listPatients.useQuery({ pageSize: 1 })`)
- Recent visits list (`trpc.kf.listVisits` — last 5 across all patients, if added to API)
- Quick action buttons: إضافة مريض جديد, إضافة زيارة
- Loading / error / empty states

### Acceptance Criteria
- `pnpm check` passes
- Pages render without runtime errors
- `dir="rtl"` on root element

---

## TASK-KF-08 — Frontend Patient Pages: KfPatients + KfPatientForm + KfPatientDetail

**Owner Model:** Cursor / Codex
**Tool:** Write (new files)
**Role:** Frontend

### Input
- `shared/kf/contracts.ts`
- API: `trpc.kf.listPatients`, `trpc.kf.getPatient`, `trpc.kf.createPatient`, `trpc.kf.updatePatient`

### Output — create 3 files

`KfPatients.tsx`:
- Search input (calls `trpc.kf.searchPatients`)
- Table: kf_code | full_name | phone | created_at | actions
- "إضافة مريض جديد" button → navigate to `/kf/patients/new`
- Row click → navigate to `/kf/patients/:kfId`

`KfPatientForm.tsx`:
- Fields: الاسم (required), تاريخ الميلاد, السن, النوع, الرقم القومي, الموبايل, العنوان, المهنة, التاريخ المرضي, الحساسية, ملاحظات
- Optional: link to SELRS patient (calls `trpc.kf.bridgeLookupSelrsPatient`)
- Submit → `createPatient` or `updatePatient`
- On success → navigate to patient detail

`KfPatientDetail.tsx`:
- Patient header: kf_code, full_name, phone
- Tabs: الزيارات | الفحوصات | العمليات | المتابعات
- Each tab lists related records and has "إضافة" button

### Acceptance Criteria
- `pnpm check` passes
- Create form validates required fields client-side (name not empty)
- Code displayed as `KF-XXXXXX` format

---

## TASK-KF-09 — Frontend Visit + Exam + Operation + Followup Forms

**Owner Model:** Cursor / Codex
**Tool:** Write (new files)
**Role:** Frontend

### Output — create 4 files

`KfVisitForm.tsx`:
- Fields: تاريخ الزيارة (required), نوع الزيارة, اسم الطبيب, الحالة, ملاحظات
- Submit → `trpc.kf.createVisit`

`KfExaminationForm.tsx`:
- Fields: تاريخ الفحص (required), حدة الإبصار أيمن/أيسر, الانكسار أيمن/أيسر, ضغط العين, التشخيص, الخطة, ملاحظات, الطبيب
- Submit → `trpc.kf.createExamination`

`KfOperationForm.tsx`:
- Fields: تاريخ العملية (required), نوع العملية (required), العين, الطبيب, الحالة, ملاحظات
- Submit → `trpc.kf.createOperation`

`KfFollowups.tsx` (list page, all patients):
- Filter: by date, by status
- Table: patient name | followup date | status | notes

`KfOperations.tsx` (list page, all patients):
- Filter: by date, by status
- Table: patient name | op type | op date | eye | doctor | status

### Acceptance Criteria
- `pnpm check` passes
- All forms show loading state on submit
- On success navigate back to patient detail

---

## TASK-KF-10 — Frontend Routing: App.tsx + ProtectedRoute

**Owner Model:** Cursor / Codex
**Tool:** Edit
**Role:** Frontend
**Allowed shared edit point**

### Input
- `client/src/App.tsx`
- Pattern from existing accounting routes

### Output — add to App.tsx

Lazy imports:
```typescript
const KfShell = lazy(() => import("./pages/kf/KfShell"));
const KfHome = lazy(() => import("./pages/kf/KfHome"));
const KfPatients = lazy(() => import("./pages/kf/KfPatients"));
const KfPatientForm = lazy(() => import("./pages/kf/KfPatientForm"));
const KfPatientDetail = lazy(() => import("./pages/kf/KfPatientDetail"));
const KfVisitForm = lazy(() => import("./pages/kf/KfVisitForm"));
const KfExaminationForm = lazy(() => import("./pages/kf/KfExaminationForm"));
const KfOperationForm = lazy(() => import("./pages/kf/KfOperationForm"));
const KfOperations = lazy(() => import("./pages/kf/KfOperations"));
const KfFollowups = lazy(() => import("./pages/kf/KfFollowups"));
```

Routes (inside Switch, grouped after existing medical routes):
```tsx
<Route path="/kf">
  <ProtectedRoute allowedPaths={["/kf"]}>
    <KfShell>
      <KfHome />
    </KfShell>
  </ProtectedRoute>
</Route>
<Route path="/kf/patients">
  <ProtectedRoute allowedPaths={["/kf"]}>
    <KfShell><KfPatients /></KfShell>
  </ProtectedRoute>
</Route>
// ... etc for all /kf/* routes
```

### Acceptance Criteria
- `pnpm check` passes
- Navigating to `/kf` while unauthenticated → redirected to login
- Navigating to `/kf` with admin role → KfHome renders
- No existing routes broken

### Verification
```bash
pnpm check
pnpm build
```

---

## TASK-KF-11 — MSSQL Safety Audit

**Owner Model:** Claude (review only)
**Tool:** grep
**Role:** QA / Security

### Verification commands (must all return zero results)
```bash
# No MSSQL references in KF files
grep -rE "mssql|MSSQL|createMssqlPool|mssqlQuery" server/routers/kf.ts
grep -rE "mssql|MSSQL|createMssqlPool|mssqlQuery" server/services/kf/ 2>/dev/null

# No KF writes to existing patients table
grep -E "kfPatients|kf_patients" server/routers/kf.ts | grep -v "import\|schema\|SELECT\|select\|query"

# No medical router touched
git diff server/routers/medical.ts
git diff server/routers/patient.ts
git diff server/db.ts
git diff server/integrations/mssqlPatients.ts
git diff client/src/components/ProtectedRoute.tsx

# TypeScript clean
pnpm check

# Build clean
pnpm build
```

### Acceptance Criteria
- All grep commands return zero results
- All protected file diffs are empty
- `pnpm check` and `pnpm build` both pass

---

## Summary

| Task | Description | Files Changed | Blocked By |
|------|-------------|---------------|------------|
| KF-01 | Schema append | `drizzle/schema.ts` | — |
| KF-02 | SQL migration | `drizzle/migrations/00030_kf_tables.sql` | KF-01 |
| KF-03 | Shared contracts | `shared/kf/contracts.ts` | KF-01 |
| KF-04 | kfProcedure | `server/_core/procedures.ts` | — |
| KF-05 | KF router | `server/routers/kf.ts` | KF-01 KF-03 KF-04 |
| KF-06 | Register router | `server/routers/index.ts` | KF-05 |
| KF-07 | Shell + Home | `client/src/pages/kf/KfShell.tsx`, `KfHome.tsx` | KF-06 |
| KF-08 | Patient pages | `KfPatients.tsx`, `KfPatientForm.tsx`, `KfPatientDetail.tsx` | KF-06 |
| KF-09 | Clinical forms | `KfVisitForm.tsx`, `KfExaminationForm.tsx`, `KfOperationForm.tsx`, `KfOperations.tsx`, `KfFollowups.tsx` | KF-08 |
| KF-10 | App.tsx routes | `client/src/App.tsx` | KF-07 KF-08 KF-09 |
| KF-11 | Safety audit | — (grep + diff) | KF-10 |

**Follow the project Constitution and Project Principles strictly.**
