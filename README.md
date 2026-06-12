# SELRS

SELRS is a full-stack TypeScript application with a React/Vite frontend and a Node/Express + tRPC backend.

Read first:

- specs/AI_CONTEXT.md

Then follow the project Constitution and Project Principles strictly.

## Structure

- `client/src`: frontend app
- `server/_core`: backend core and server entry
- `server/routers`: API routers
- `shared`: shared types and contracts
- `drizzle`, `scripts`: database and maintenance scripts

## Run

```bash
pnpm install
pnpm dev
```

## Main Commands

```bash
pnpm check
pnpm test
pnpm build
pnpm start
pnpm smoke
```

## Database

```bash
pnpm db:migrate
pnpm db:push
pnpm db:sync-check
```

## Modules

| Module | Route prefix | Router file | Notes |
|---|---|---|---|
| Medical | `/dashboard`, `/patients/*`, `/operations`, etc. | `server/routers/medical.ts` | Core patient/doctor/exam flows. UNTOUCHABLE. |
| Accounting | `/accounting/*` | `server/routers/accounting.ts` | MSSQL read-only reports + MySQL cashbook. |
| KF (Clinical) | `/kf/*` | `server/routers/kf.ts` | Isolated clinical module. 5 `kf_*` tables. Admin + accountant bypass. Patient codes: KF-0001. |
| Attendance | `/attendance/*` | `server/routers/attendance.ts` | Fingerprint-based attendance. Admin + manager bypass. |
| Salary | `/salary/*` | `server/routers/salary.ts` | Payroll module. Admin + manager bypass. |
| Stockroom | `/stockroom`, `/stockroom/reports` | `server/routers/stockroom.ts` | Inventory. Admin + accountant bypass. |

## Permission System

Non-Medical modules use per-page factory procedures (`makeKfProcedure`, `makeSalaryProcedure`, etc.). Permissions are stored as path strings:

- Bare path (e.g. `/salary`) = full access (read + write). AdminUsers saves bare paths.
- `path:r` = read-only. `path:rw` = read + write. AdminPermissions saves these suffixed forms.
- Parent paths cover children: `/salary:rw` grants `/salary/payroll`.
- No matching permission = FORBIDDEN.

## AI Notes

- Repo-wide coding instructions for Claude Code live in `CLAUDE.md`.
- Keep code changes minimal and aligned with existing patterns.
