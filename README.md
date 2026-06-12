# SELRS

SELRS (Saadany Eye Laser & Refractive Surgery) is a full-stack TypeScript medical center platform with a React 19/Vite frontend and a Node/Express + tRPC backend serving 8 distinct modules.

Read first:

- `specs/AI_CONTEXT.md` — full architectural context for AI agents
- `CLAUDE.md` — coding rules for Claude Code
- `.claude/rules/` — module-specific rules (frontend.md, backend.md, permissions.md, database.md, verification.md)

Then follow the project Constitution and Project Principles strictly.

## Structure

```
client/
  src/
    App.tsx              — route definitions (lazy + ProtectedRoute)
    pages/               — page components per module
      accounting/        — /accounting/* pages
      kf/                — /kf/* pages (KF clinical module)
      attendance/        — /attendance/* pages
      salary/            — /salary/* pages
      marketing/         — /marketing/* pages (admin only)
      patient-portal/    — /my/* pages (patient self-service)
      doctor-portal/     — /doctor-portal/* pages
      dev/               — dev-only pages
    components/
      layout/            — AppNav, AppTopNav, AppBottomNav, AppSidebar
      ui/                — shadcn/ui primitives
    lib/
      page-permissions.ts — all permission page IDs (source of truth)
      nav-permission-utils.ts — permission-to-nav helpers
    hooks/               — auth hooks, data hooks
server/
  _core/
    procedures.ts        — role-based procedure builders + factory functions
    context.ts           — auth context (staff / patient / doctor sessions)
    index.ts             — Express server bootstrap, CORS, health endpoint
    trpc.ts              — tRPC init
    env.ts               — environment config
    ws.ts                — WebSocket server
  routers/
    index.ts             — appRouter composition
    medical.ts           — core medical CRUD (UNTOUCHABLE)
    patient.ts           — patient queries (UNTOUCHABLE)
    accounting.ts        — accounting reports + MySQL cashbook
    kf.ts                — KF clinical module
    attendance.ts        — attendance + ZKTeco device sync
    salary.ts            — salary + payroll
    stockroom.ts         — inventory management
    patientPortal.ts     — patient portal (OTP auth)
    marketing.ts         — marketing posts (admin only)
  db.ts                  — Drizzle MySQL access, legacy text helpers (UNTOUCHABLE)
  integrations/
    mssqlPatients.ts     — MSSQL pool + sync logic (UNTOUCHABLE)
  services/              — domain service layer (accounting, attendance, salary, etc.)
shared/
  types.ts               — re-exports drizzle schema types
  const.ts               — shared constants
  accounting/contracts.ts — accounting tRPC contracts (zod)
  kf/contracts.ts         — KF tRPC contracts (zod)
drizzle/
  schema.ts              — MySQL schema definition (~90 tables)
  migrations/            — migration SQL files
desktop/                 — .NET 8 Windows Forms + WebView2 desktop shell (SELRSDesktop)
scripts/                 — maintenance, sync, parity scripts
specs/                   — AI context, feature specs, plans, tasks
```

## Run

```bash
pnpm install
pnpm dev
```

## Main Commands

```bash
pnpm check       # TypeScript type check
pnpm test        # run tests
pnpm build       # production build
pnpm start       # start server
pnpm smoke       # smoke tests for workflow-sensitive changes
```

## Database

```bash
pnpm db:migrate
pnpm db:push
pnpm db:sync-check
```

## Modules

| Module | Route prefix | Router file | Permission gating | Bypass roles |
|---|---|---|---|---|
| Medical | `/dashboard`, `/patients/*`, `/operations`, `/today`, etc. | `server/routers/medical.ts` | Role-based procedures | admin, doctor, etc. |
| Accounting | `/accounting/*` | `server/routers/accounting.ts` | `makeAccProcedure` / `makeAccWriteProcedure` | admin |
| KF (Clinical) | `/kf/*`, `/KFsheets/*` | `server/routers/kf.ts` | `makeKfProcedure` / `makeKfWriteProcedure` | admin + accountant |
| Attendance | `/attendance/*` | `server/routers/attendance.ts` | `makeAttProcedure` / `makeAttWriteProcedure` | admin + manager |
| Salary | `/salary/*` | `server/routers/salary.ts` | `makeSalaryProcedure` / `makeSalaryWriteProcedure` | admin + manager |
| Stockroom | `/stockroom`, `/stockroom/*` | `server/routers/stockroom.ts` | `makeStockroomProcedure` / `makeStockroomWriteProcedure` | admin |
| Patient Portal | `/my/*` | `server/routers/patientPortal.ts` | `patientPortalProcedure` (OTP session) | — |
| Marketing | `/marketing/*` | `server/routers/marketing.ts` | `ProtectedRoute requiredRoles=["admin"]` | — |

## Permission System

Non-Medical modules use per-page factory procedures keyed to a path string. Permissions are stored in `user_permissions` as path strings:

- Bare path (e.g. `/salary`) = full access (read + write). AdminUsers saves bare paths.
- `path:r` = read-only. `path:rw` = read + write. AdminPermissions saves suffixed forms.
- Parent paths cover children: `/salary:rw` grants access to `/salary/payroll`.
- No matching permission = FORBIDDEN.
- Factory functions check `getEffectiveUserPermissions(userId, role)` and apply the hierarchy.

## Desktop App

A .NET 8 Windows Forms + WebView2 shell lives in `desktop/`. It embeds the web app and is distributed as `SELRSDesktop/1` (detected via `navigator.userAgent`). The desktop shell skips most health polling and never triggers hard reloads.

## Key Config Files

- `CLAUDE.md` — Claude Code instructions (codebase rules)
- `specs/AI_CONTEXT.md` — full AI context document
- `.claude/rules/` — per-domain rules for frontend, backend, permissions, database, verification
- `ecosystem.config.js` — PM2 process config
