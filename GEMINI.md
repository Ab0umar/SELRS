# SELRS (Saadany Eye Laser & Refractive Surgery) Platform Guidance

This is the comprehensive context and rulebook for the SELRS application. It defines the architecture, building/running instructions, critical design principles, development conventions, and safe execution practices for all interactive agents and developers in this repository.

---

## 1. Project Overview

SELRS is a full-stack, monolithic TypeScript medical center platform designed to manage clinical workflows and accounting. It integrates a React 19/Vite frontend with an Express + tRPC backend, using a dual-database architecture:
1. **Medical Database (MySQL - `selrs26`)**: Handles patient registrations, examinations, clinic bookings, surgical scheduling, ZK synchronization (attendance), and system permissions. Managed via Drizzle ORM.
2. **Accounting Database (MSSQL - `op2026`)**: An immutable legacy source of truth. All clinic receipts, invoice lines, and doctor fee shares are queried from this database. Parameterized `SELECT` queries only.

### Medical vs. Accounting Philosophy

| Feature | Medical Module | Accounting Module |
| :--- | :--- | :--- |
| **Database** | MySQL (`selrs26`) | MSSQL (`op2026`) |
| **Data Direction** | Read + Write (Full CRUD) | Read-Only (SELECT only) |
| **Primary Key** | `patients.id` (auto-increment) | `PAT_CD` (string, zero-padded, e.g., `"0013"`) |
| **Sync Bridge** | `patients.patientCode` maps to `PAT_CD` at read-time | Same |
| **Permission Gate**| Role-based (doctor, nurse, tech, reception, admin) | Path-based `/accounting` permissions |
| **UI Language** | Arabic + English mix | Arabic (RTL, Eastern Arabic-Indic digits) |
| **State Updates** | Real-time WebSockets (session-cookie based) | Polling (60s auto-refresh) |

---

## 2. Directory Structure

```text
client/
  src/
    App.tsx                  — Root router containing lazy-loaded routes with ProtectedRoute wrappers.
    pages/                   — Page containers for Medical and shared modules.
    features/                — Domain-specific feature modules containing pages/components (attendance, kf, salary, etc.)
    components/              — Reusable UI components (shadcn/ui primitives under `components/ui/`).
    hooks/                   — Authentication and state management custom React hooks.
    lib/                     — Source of truth for page-permissions and tRPC client initialization.
server/
  _core/
    procedures.ts            — Role-based tRPC procedure builders (the API security gates).
    context.ts               — Auth context resolver (staff cookie, patient OTP, external doctor portal JWT).
    ws.ts                    — WebSocket server supporting cookie and JWT (?doctorToken=) auth.
    index.ts                 — Express server bootstrap, startup services (e.g., Pentacam auto-linker), CORS.
  routers/
    index.ts                 — Compose root `appRouter` (Only allowed shared edit point).
    medical.ts               — Combines and spreads sub-routers (medical-catalog, medical-examinations, etc.).
    patient.ts               — Read-only patient query router (UNTOUCHABLE).
    accounting.ts            — Financial reporting and cashbook ledger procedures.
    attendance.ts            — Large domain router handling ZK sync, employee rosters, leaves, and daily reports.
  db.ts                      — Drizzle MySQL client and legacy-text decode/encode helpers (UNTOUCHABLE).
  integrations/
    mssqlPatients.ts         — MSSQL connection pool configurations (UNTOUCHABLE).
  services/                  — Decoupled domain service layer (accounting, attendance, salary, etc.).
shared/
  types.ts                   — Shared type exports (including Drizzle schema mapping).
  const.ts                   — Constant configurations.
  routes.ts                  — Complete type-safe route paths mapping via `ROUTES.*` constants.
drizzle/
  schema.ts                  — Complete MySQL database schema definition (~90 tables).
  migrations/                — Directory containing SQL migration files.
desktop/                     — .NET 8 WinForms + WebView2 desktop container (detects as `SELRSDesktop/1`).
specs/                       — AI context, specifications, active plans, tasks, and historical checklists.
scripts/                     — Maintenance, database sync checks, migrations, backups, and user utilities.
```

---

## 3. Building and Running

### Prerequisites & Package Manager
* This project is managed using **pnpm** (pinned version `pnpm@12.3.4`). Do not use `npm` or `yarn`.

### Key Scripts (from `package.json`)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Development** | `pnpm dev` | Starts the Express server with `tsx watch` for backend hot-reloads and frontend bundle. |
| **Type Check** | `pnpm check` | Compiles TypeScript without emitting output (`tsc --noEmit`). Mandatory for routing/permission changes. |
| **Testing** | `pnpm test` | Runs the full Vitest suite. |
| **Backend Tests**| `pnpm test:backend` | Executes dedicated backend integration tests targeting tRPC procedures. |
| **E2E Tests** | `pnpm test:ui` | Runs Playwright tests (end-to-end user journeys). |
| **Production Build**| `pnpm build` | Checks encoding, runs Vite build, fixes legacy media queries, and bundles server with esbuild. |
| **Production Start**| `pnpm start` | Boots the bundled production build of the server. |
| **Database Migration**| `pnpm db:migrate` | Runs custom migration script using drizzle/tsx. |
| **Database Push** | `pnpm db:push` | Generates schema changes via drizzle-kit and pushes modifications to MySQL. |
| **Smoke Tests** | `pnpm smoke` | Executes workflow-sensitive flow tests. |

---

## 4. Development Conventions & Rules

### I. Strict Module Separation (Principle I)
* **No Cross-Imports**: Medical code and Accounting code must NEVER import from each other. They must remain completely isolated.
* **Bridge Key**: The ONLY connection point is matching `patients.patientCode` (MySQL) to `PAT_CD` (MSSQL) during read-time presentation.
* **No Shared Mutations**: Never create a mutation that spans both databases or crosses the boundary.

### II. Service-Based Accounting Only (Principle II)
* **Revenue Derivation**: All financial revenue metrics MUST be computed directly from `PAPAT_SRV` (line items) joined with `PAJRNRCVH` (invoice headers).
* **Formula**: Gross = `QTY * PRC`, Net = `Gross - DISC_VL`.
* **Prohibited**: Never calculate revenue or financial ratios using patient count, visit counts, or doctor schedule counts.

### III. Read-Only Accounting APIs (Principle III)
* All tRPC endpoints in `server/routers/accounting.ts` MUST be read-only `query` procedures.
* **Exceptions**: Operations on the local MySQL-side Cashbook (`accLedger`, `accCategories`) and custom service entries mapping are allowed write privileges.

### IV. JSX Constant Route Injection
* Route collections in `client/src/App.tsx` must be structured as **JSX Constants, NOT function calls**.
* Correct Pattern:
  ```tsx
  // Inside feature routes files (e.g., client/src/features/attendance/attendance-routes.tsx)
  export const AttendanceRoutes = (
    <>
      <Route path={ROUTES.attendance} component={AttendanceHome} />
    </>
  );
  ```
* Insertion in `client/src/App.tsx`: Use `{AttendanceRoutes}`. Never use `{AttendanceRoutes()}` (function invocation).

### V. Mandatory UI Components
* **Date Entry**: All date picker/input fields app-wide must use the custom `<DateInput>` component from `client/src/components/ui/date-input.tsx`.
  * **Never** use native `<input type="date">` or shadcn's standard `<Input type="date">`.
  * `<DateInput>` standardizes date formatting to `dd/MM/yyyy` across all desktop browsers and operating systems, adhering to ISO `yyyy-MM-dd` internal values.

### VI. Database & Migration Syntax
* **Statement Breakpoints**: The Drizzle migration builder requires `--> statement-breakpoint` as separators between `ALTER TABLE` statements instead of standard semicolons on multi-line migration scripts.
* **Non-Null Safety**: Never apply `NOT NULL` constraints on alter modifications if existing database records contain `NULL` elements.

### VII. Legacy Text Handling (Mojibake Fixes)
* Legacy Arabic texts pulled from MSSQL/Access databases use legacy character mappings.
* Always wrap text queries with the established legacy-decode/encode helpers located in `server/db.ts` to prevent mojibake corruption.

### VIII. attachTreatingDoctor Pattern (Critical)
* `attachTreatingDoctor()` in `server/db.ts` enriches patient lists with service/doctor metadata.
* **Critical**: It MUST NOT overwrite valid, non-blank values in `patients.serviceType` or `patients.locationType` columns. Always check the database column value first:
  ```typescript
  serviceType: (() => {
    const dbServiceType = String((patient as any).serviceType ?? "").trim();
    if (dbServiceType) return dbServiceType; // Column value wins
    // service-code derived fallback is only applied if blank
  })()
  ```

### IX. Doctor/Service Matching Pattern
* In all reports, both `doctorCode` and `serviceCode` must be sourced from the **same row in the PAPAT_SRV table**.
* Priority: Use `SRV_BY1` (line-level treating doctor). Fall back to `DRS_CD` (header-level doctor) only if blank.
* **Forbidden**: Independent lookups of `PAJRNRCVH.DRS_CD` that mismatch service-line values.

### X. Print & Reporting Parity
* Reports must match legacy FoxPro/Access OP layout (`.rtm` format) structurally (Header, Body, Totals, Footer).
* Formatting money must utilize `formatMoneyAr()` and counts `formatCountAr()`. All Arabic digit representations must use `toArabicDigits()`.
* Every report modification must be verified against representative historical test datasets (specifically **April 2026** on database `op2026`) and respect the `limit` threshold (defaulting to warnings above 500 rows).

---

## 5. Protected Files & Directories

These files comprise the core system framework and must **NEVER** be modified unless explicitly authorized by the user:

| Protected File / Directory | Reason for Protection |
| :--- | :--- |
| `server/routers/medical.ts` | Composites the medical router namespace; edit sub-routers under `server/routers/` instead. |
| `server/routers/patient.ts` | Houses core medical patient query implementations. |
| `server/db.ts` | Controls Drizzle client instantiation and legacy text mapping encodings. |
| `server/integrations/mssqlPatients.ts` | Configures production-mirror MSSQL database pools. |
| `client/src/components/ProtectedRoute.tsx` | Front-facing security gate enforcing user role routing rules. |
| `server/_core/procedures.ts` | Role-based API procedure rules. |
| `server/_core/context.ts` | Core session resolving framework (Express requests mapping to roles). |
| `server/_core/trpc.ts` | Root configuration initializing tRPC services. |
| `server/_core/env.ts` | System environment parser. |
| `drizzle/schema.ts` | Root database structure. Modifications require official consensus. |

### Allowed Shared Edit Points:
1. `server/routers/index.ts` — To register newly developed routers (restricted to standard imports).
2. `client/src/App.tsx` — To register lazy-loaded routing nodes wrapped inside `ProtectedRoute` elements.
3. `shared/routes.ts` — To add global route path string identifiers typed `as const`.

---

## 6. Common Mistakes to Avoid

1. **Cross-importing files/types** between Medical and Accounting.
2. **Deriving financial values** from patient or physician headcounts instead of invoice lines.
3. **Adding mutations** to reporting structures (e.g. running `INSERT`, `UPDATE`, `DELETE` via MSSQL).
4. **Altering core schemas** or changing existing MySQL table columns without generating proper migration steps.
5. **Shipping reporting screens** without confirming April 2026 output parity.
6. **Executing changes** without drafting `/specify`, `/plan`, and `/tasks` first.
7. **Bypassing the type system** or using direct strings for route links inside `App.tsx` instead of `ROUTES.*` constants.
8. **Disrupting the Pentacam Scheduler**: The auto-linker matches files asynchronously every 5 minutes on server boot. Never add synchronous manual buttons.
9. **Coercing `PAT_CD` codes** to numbers. They are padded strings (e.g., `"0013"`, `"0699"`) and must remain strings.
10. **Placing page views directly** in `client/src/pages/` for modular services; they belong inside dedicated directories under `client/src/features/<domain>/`.
11. **Reverting route files to functional definitions** (always use JSX constants: `export const XRoutes = (<>...</>)`).
12. **Using the `doctorPortalWS` context** without specifying the JWT query parameter `?doctorToken=<jwt>`.

---

## 7. Safe Execution Checklist

Before modifying any code in this project, execute this checklist:

- [ ] A feature specification exists in `specs/` (use `specify` and `plan` workflows).
- [ ] No protected system files are listed for modification (unless explicitly agreed).
- [ ] Direct database edits are avoided; MySQL modifications are wrapped in Drizzle migration scripts.
- [ ] All inputs to MSSQL queries are fully parameterized (no string concatenation).
- [ ] Zero cross-module imports are introduced.
- [ ] Date input components rely strictly on standard `<DateInput>`.
- [ ] Target UI pages are structured under appropriate RTL directives (`dir="rtl"`).
- [ ] Cash metrics utilize `formatMoneyAr()` and Eastern Arabic-Indic digits.

### Post-Implementation Verification:
1. Run `pnpm check` to ensure zero type check failures are introduced across frontend, server, and shared directories.
2. Run `pnpm test` to verify current test suites are fully passing.
3. Verify git diff changes remain localized and clean (`git status` and `git diff HEAD`).
4. Output verification parity is complete (tolerances ≤ ±0.01).
