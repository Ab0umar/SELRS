# Services & Doctors Log (SRV / DRS)

## Summary
This document contains only the **services/doctors** related work and fixes.

## Services (SRV)

### 1) Admin Services mapping tools
- Added `Delete All` action in **مطابقة الأطباء مع الخدمات والشيت**.
- Added confirmation + persisted clearing via `doctor_service_sheet_match_v1`.
- Added/kept dedup flow for mappings.

### 2) Mapping uniqueness behavior
- Updated mapping uniqueness to avoid repeating same doctor for same service.
- Matching now treated as unique by `doctorCode + serviceCode` (no duplicate doctor-service rows).

### 3) Sync overwrite protection (services)
- Investigated MSSQL catalog sync overwrite behavior.
- Changed sync behavior to preserve local manual edits.
- Removed auto-recategorization after sync in admin services page.
- Made sync duplicate-key path for services effectively insert-only (existing rows preserved).

### 4) Services page performance
- Added pagination for service listing to reduce heavy rendering.
- Avoided rendering both mobile and desktop lists at the same time.
- Collapsed heavy mapping section by default (show on demand).

---

## Doctors (DRS)

### 1) MSSQL doctor sync filter
- Enforced doctor sync to use **`DPT_NO = 15`** only.
- Removed loose department fallback behavior.

### 2) Doctor sync upsert fix
- Fixed backend doctor sync from update-only to true upsert behavior:
  - insert missing doctor codes
  - update existing names/active state
- This resolved cases where sync returned zero applied doctors despite source rows.

### 3) Admin Doctors UI
- Added **Sync** button in Admin Doctors page.
- Wired to existing `syncRegistrationCatalogFromMssql` mutation.
- Added loading state and post-sync refresh/invalidation.

---

## Related Files (Primary)
- `client/src/pages/AdminServices.tsx`
- `client/src/pages/AdminDoctors.tsx`
- `server/db.ts`
- `server/routers/medical.ts`

## Notes
- If backend sync behavior appears unchanged after patching, restart dev server so latest server code is loaded.
