# Medical Data Ownership & Source-of-Truth Policy

## Executive Summary
SRV100 maintains clear separation between MySQL (medical source-of-truth) and MSSQL (accounting source-of-truth). This document locks the medical data ownership model for production stability.

## Medical Data Source-of-Truth

### Authoritative Tables (MySQL)
All medical record tables are **authoritative**. Display layers must read from these tables exclusively:

| Table | Purpose | Owner | Read-Only |
|-------|---------|-------|-----------|
| `examinations` | Exam headers | MySQL | Yes |
| `examination_checklist_items` | Medical checklist | MySQL | Yes |
| `autorefractometryData` | Refraction measurements | MySQL | Yes |
| `pentacamResults` | Pentacam exam data | MySQL | Yes |
| `glassesRecords` | Glasses prescriptions | MySQL | Yes |
| `prescriptions` | Medical prescriptions | MySQL | Yes |
| `prescriptionItems` | Prescription line items | MySQL | Yes |
| `doctorReports` | Doctor clinical notes | MySQL | Yes |
| `medicalHistoryChecklist` | Patient medical history | MySQL | Yes |
| `postOpFollowups` | Post-operation followup records | MySQL | Yes |
| `consentForms` | Patient consent records | MySQL | Yes |
| `surgeries` | Surgical records | MySQL | Yes |

### Synced Fields (MSSQL → MySQL)
The following patient fields are synced FROM MSSQL and stored in MySQL `patients` table:

| Field | Source | Sync Frequency | Cache Rule |
|-------|--------|-----------------|-----------|
| `doctorCode` | PAPAT_SRV.SRV_BY1 | MSSQL nightly sync | Never cache in patientPageStates |
| `doctorId` | doctorsLookup join | MSSQL nightly sync | Never cache in patientPageStates |
| `serviceCode` | PAPAT_SRV.SRV_CD | MSSQL nightly sync | Never cache in patientPageStates |
| `serviceType` | service catalog | MSSQL nightly sync | Never cache in patientPageStates |
| `locationType` | PAPAT_SRV metadata | MSSQL nightly sync | Never cache in patientPageStates |
| `treatingDoctor` | PAPAT_SRV.SRV_BY1 name | MSSQL nightly sync | Never cache in patientPageStates |

### Forbidden Cache Fields
**These fields MUST NEVER be stored in patientPageStates JSON cache:**
- ❌ `doctorCode`, `doctorId`, `doctorName`
- ❌ `serviceCode`, `serviceName`, `serviceType`, `serviceQty`
- ❌ `servicePrice`, `discountValue`
- ❌ `mssqlBackfill`, `syncLockManual`
- ❌ Any examination result (autorefraction, pentacam, etc.)
- ❌ Any medical checklist state
- ❌ Any prescription data

**Reason:** Cache is invalidated after MSSQL sync; stale values break medical workflows.

### Allowed Cache Fields (Workflow State Only)
**These UI workflow fields MAY be cached in patientPageStates:**
- ✅ `sheetSelection` (currently open sheet type)
- ✅ `visitDate` (form input state)
- ✅ `isFollowup` (boolean workflow flag)
- ✅ `activeTab` (currently active UI tab)
- ✅ `unsavedDraft` (temporary form state, not yet saved)

**Reason:** These are UI session state, not medical data. Safe to persist and replay.

## Cache Invalidation Rules

### Automatic Invalidation Triggers
Cache is **automatically deleted** in these scenarios:

1. **After MSSQL sync** (successful patients sync)
   - Patient IDs with changed `doctorCode` or `serviceCode`
   - Pages: `examination`, `quick-entry`, `medical-file`
   - Location: `server/integrations/mssqlPatients.ts` → `invalidatePatientPageStateCache()`

2. **On patient switch**
   - Clear cache when user navigates to different patient
   - Prevent stale hydration on new patient load

3. **On successful exam save**
   - Clear cache after examination record persists
   - Fresh load on reopen

4. **On logout/session reset**
   - Clear all patient-specific cache
   - Security: prevent cached data leakage

5. **On manual cache reset** (admin action)
   - `resetMssqlSyncCodes()` clears all sync-related cache
   - Emergency recovery mechanism

### Manual Cleanup
Current cleanup location:
- **File:** `server/db.ts`
- **Function:** `invalidatePatientPageStateCache(patientIds: number[])`
- **Scope:** Deletes `patientPageStates` WHERE `page` IN (`examination`, `quick-entry`, `medical-file`)

**Important:** Cleanup failures are logged but do NOT break sync. Cache invalidation is optional; stale cache is less critical than sync success.

## Sync Boundaries

### MSSQL → MySQL (One-Way Read)
- **Source:** MSSQL PAJRNRCVH, PAPAT_SRV, MDTEAM, SRVCMF
- **Destination:** MySQL `patients` table + `patientServiceEntries`
- **Frequency:** Nightly (configurable)
- **Direction:** Read-only from MSSQL
- **Transformation:** Code maps MSSQL codes to MySQL IDs

### MySQL ← → MSSQL (No Direct Write)
- ❌ SRV100 does NOT write back to MSSQL
- ❌ Doctor/service codes flow one direction only (MSSQL → MySQL)
- ✅ Manual patient edits stay in MySQL only

## Data Flow Rules

### Examination Form
```
Load: patientQuery(MySQL) → doctor/service from MySQL query
Cache: sheetSelection, visitDate (workflow only)
Save: examinations + checklist_items to MySQL
Clean: invalidate cache on save
```

### Medical File Panel
```
Load: examination_checklist_items, autorefractometryData, etc. (MySQL only)
Cache: None (always fetch fresh)
No cache fallback allowed
```

### Admin Patients
```
Load: patients table (MySQL) → doctorCode, serviceCode are synced values
Display: Fresh from latest sync, never from patientPageStates
Sync: MSSQL nightly → updates MySQL columns → invalidates cache
```

## Error Handling

### Cache Miss
**If cache is empty:** Use fresh query. Never show stale data. ✅

### Cache Invalidation Failure
**If delete fails:** Log warning, continue. Stale cache will be overwritten on next successful sync. ✅

### Sync Failure
**If MSSQL sync fails:** Keep existing data. Doctor/service unchanged. Next sync retry will update. ✅

### Network Offline
**If cannot reach MSSQL:** Use cached sync state (readonly). Do not attempt writes. ✅

## Testing & Validation

### Unit Tests
- [ ] Cache invalidation clears only specified pages
- [ ] Medical fields never hydrate from patientPageStates
- [ ] Workflow fields do hydrate from cache (sheetSelection, visitDate)
- [ ] Cleanup on patient switch works correctly

### Integration Tests
- [ ] Sync updates doctorCode → cache invalidates → fresh load shows new value
- [ ] Exam save → cache invalidates → reopen shows fresh data
- [ ] Offline mode → cached sync state readable
- [ ] Cache miss → empty state shows, not stale data

### Production Monitoring
- [ ] Log cache invalidation counts by patient
- [ ] Alert on invalidation failures
- [ ] Monitor stale hydration attempts (should be zero)
- [ ] Verify examination save triggers cleanup

## Violations & Rollback

### Red Flags (Stop and investigate)
- ❌ doctorName/doctorCode appears in patientPageStates JSON
- ❌ serviceCode/serviceName in patientPageStates
- ❌ Medical exam result (refraction, pentacam) in patientPageStates
- ❌ Cache hydration attempts on fields marked "Forbidden"
- ❌ Display fallback to JSON when MySQL table is empty

### Rollback Strategy
If cache invalidation breaks workflows:
1. Revert cache invalidation call in `mssqlPatients.ts`
2. Keep removal of cache hydration in `useExaminationForm.ts` (Phase 2)
3. Medical data will load fresh every load (slower but safe)
4. Investigate why cache invalidation broke the flow

---

**Last Updated:** 2026-05-07
**Policy Status:** Locked for Phase 3 production
**Owner:** Architecture team
