Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after the move. Do NOT proceed if check fails.

---

## T003 — Move KF pages to features/kf/

Task: Move all KF pages from `client/src/pages/` to `client/src/features/kf/`. Update import paths in `client/src/App.tsx`.

KF pages to move (from `specs/005-frontend-feature-folders/plan.md` Domain File Assignment):
`KfPatientList`, `KfPatientDetail`, `KfNewPatientForm`, `KfEditPatient`, `KfOperations`, `KfFollowups`, `KfNewVisit`, `KfNewExamination`, `KfNewOperation`, `KfNewFollowup`, `KfAccounting`, `KfAccountingDailyRevenue`, `KfAccountingServiceRevenue`, `KfAccountingReceipts`, `KfAccountingLedger`, `ConsultantSheet`, `ConsultantFollowupPage`

Steps:
1. For each file above, run: `git mv client/src/pages/FileName.tsx client/src/features/kf/FileName.tsx`
   - Use `git mv` NOT regular copy — this preserves git history
2. After all moves, update every KF page lazy import in `client/src/App.tsx`:
   - Change `() => import("../pages/KfPatientList")` → `() => import("../features/kf/KfPatientList")`
   - Same pattern for every file moved
3. Run `pnpm check`

**If any KF page file doesn't exist** (maybe the name is slightly different), check `client/src/pages/` for the actual filename before assuming it's missing.

Report: files moved (count), App.tsx import paths updated (count), pnpm check result.

---

## T004 — Move KF-specific components to features/kf/

Task: Move KF-specific components from `client/src/components/` to `client/src/features/kf/`. Update all import sites.

1. Read `client/src/components/` — list all files containing `Kf`, `KF`, `kf`, or `Consultant` in the filename
2. For each component that is KF-specific (NOT shared across non-KF features):
   - `git mv client/src/components/KfXxx.tsx client/src/features/kf/KfXxx.tsx`
   - Grep for all imports of that component (`import.*KfXxx` or `from.*KfXxx`)
   - Update each import path to the new location
3. Run `pnpm check`

**Do NOT move** `ProtectedRoute.tsx`, layout wrappers, or any component clearly shared by multiple non-KF domains.

Report: components moved, import sites updated, pnpm check result.
