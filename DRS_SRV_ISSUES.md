# DRS & SRV Issues Report

## Scope
Focused report on:
1. Doctor sync issues
2. Service sync issues
3. Heavy/laggy admin pages
4. Service overwrite behavior

## 1) Doctor Sync (DRS) Issues

### Problem
- Doctor sync was inconsistent and sometimes returned zero applied updates.
- Requirement was strict filtering to doctors of `DPT_NO = 15` only.

### Root Cause
- Sync path had non-strict department matching behavior.
- Upsert path for doctors was update-only for existing rows and did not always insert missing codes.

### Fixes Applied
- Enforced strict filter to `MDTEAM.DPT_NO = 15`.
- Changed doctor sync write path to true upsert behavior:
  - insert missing doctor codes
  - update existing doctor rows
- Added sync action in Admin Doctors UI for direct trigger and refresh.

### Current Behavior
- Doctors should sync only from department 15.
- Missing doctors should now be inserted, not ignored.

---

## 2) Service Sync (SRV) Issues

### Problem
- Service sync was overriding local/manual edits.
- User-edited service config (type/sheet/category/state) could drift after sync.

### Root Cause
- Duplicate-key update branch in sync was still writing back fields/state to existing rows.
- Additional post-sync UI behavior could trigger automatic category reshaping.

### Fixes Applied
- Changed service sync duplicate path to no-op for existing rows (insert-only for missing services).
- Removed post-sync auto-recategorization behavior in Admin Services page.

### Current Behavior
- Sync should add missing services only.
- Existing service rows should preserve manual edits.

---

## 3) Heavy / Laggy Pages

### A) `/admin/patients`
#### Problem
- Page was very heavy and laggy/freezing.

#### Fixes Applied
- Replaced expensive per-row doctor selectors with lighter text inputs.
- Removed render/debug log overhead.
- Reduced default page size for lighter first load.

### B) `/admin-hub/services`
#### Problem
- Services page heavy due to many controls/rows and duplicated render work.

#### Fixes Applied
- Added paging for rendered services.
- Render only one layout branch by viewport (instead of mounting both mobile/desktop trees).
- Collapsed heavy doctor-service mapping panel by default.

---

## 4) Remaining Validation Notes

If overwrite or wrong defaults still appear after code changes:
1. Restart dev server to ensure backend patch is active.
2. Re-run sync and confirm behavior.
3. Verify exact changed fields (`serviceType`, `defaultSheet`, `category`, `isActive`) to isolate any remaining write path.

---

## Main Files
- `server/routers/medical.ts`
- `server/db.ts`
- `server/integrations/mssqlPatients.ts`
- `client/src/pages/AdminDoctors.tsx`
- `client/src/pages/AdminServices.tsx`
- `client/src/pages/AdminPatients.tsx`
- `client/src/components/admin-patients/AdminPatientsTable.tsx`
- `client/src/hooks/admin-patients/useAdminPatientsList.ts`
