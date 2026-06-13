# KF Clinical Module — Plan

**Status**: ✅ Complete. See `specs/kf/plan.md` for the original implementation plan.

## Architecture

- Backend: `server/routers/kf.ts` — plain object spreads into `appRouter.kf`
- Shared contracts: `shared/kf/contracts.ts`
- DB schema: `drizzle/schema.ts` (5 kf_* tables appended)
- Migration: `drizzle/migrations/00030_kf_tables.sql`
- Frontend pages: `client/src/features/kf/` (moved from `client/src/pages/kf/` by plan 005)
- Procedure builders: `kfProcedure` / `kfWriteProcedure` in `server/_core/procedures.ts`

## Constitution Check

- **I** (Module Separation): KF is isolated — no cross-imports with medical or accounting ✓
- **IV** (Schema as-is): Only new tables added, no existing columns touched ✓
- **VI** (Spec-driven): spec.md → plan.md → tasks.md → execute pipeline followed ✓
- **VII** (Don't break medical): `pnpm check` + `pnpm build` passed; medical routes unchanged ✓
