# patientPageStates Cache Policy

## Quick Reference

**patientPageStates = UI workflow state cache, NOT medical source-of-truth**

```
Purpose: Persist temporary form state across page reloads
Scope:   Single patient, single workflow (examination, quick-entry, medical-file)
TTL:     Cleared after successful save OR after MSSQL sync
Risk:    Stale medical data if invalidation fails
Safety:  Automatic cleanup handles edge cases
```

## What Gets Stored

### ✅ ALLOWED - Workflow State
```json
{
  "page": "examination",
  "data": {
    "sheetSelection": "consultant",      // Which form tab is open
    "visitDate": "2026-05-07",            // Form date picker value
    "isFollowup": false,                  // Followup flag
    "activeTab": 2,                       // Tab index in examination
    "unsavedDraft": {                     // Temporary form state
      "symptoms": "patient complaint text"
    }
  }
}
```

### ❌ FORBIDDEN - Medical Data
```json
{
  "doctorName": "...",               // FORBIDDEN: Always load fresh
  "doctorCode": "...",               // FORBIDDEN: Always load fresh
  "serviceCode": "...",              // FORBIDDEN: Always load fresh
  "serviceQty": "2",                 // FORBIDDEN: Always load fresh
  "servicePrice": 500,               // FORBIDDEN: Always load fresh
  "discountValue": 50,               // FORBIDDEN: Always load fresh
  "medicalChecklist": {...},         // FORBIDDEN: Read from examination_checklist_items
  "autorefraction": {...},           // FORBIDDEN: Read from autorefractometryData
  "pentacam": {...},                 // FORBIDDEN: Read from pentacamResults
  "mssqlBackfill": {...}             // FORBIDDEN: Sync-only metadata
}
```

## Storage & Retrieval

### Table Schema
```sql
CREATE TABLE patientPageStates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  page VARCHAR(50) NOT NULL,         -- 'examination', 'quick-entry', 'medical-file'
  data JSON,                          -- Workflow state only
  createdAt DATETIME,
  updatedAt DATETIME,
  INDEX idx_patient_page_updated (patientId, page, updatedAt)
);
```

### API Endpoints
- **Save:** `medical.savePatientPageState` (tRPC mutation)
- **Load:** `medical.getPatientPageState` (tRPC query)

### Frontend Hook
- **Location:** `client/src/hooks/examination/useExaminationForm.ts`
- **Load:** Hydrates `sheetSelection`, `visitDate`, `isFollowup` only
- **Save:** Debounced 800ms auto-save (disabled for exam)
- **Clean:** Auto-clear on form save

## Cleanup Rules

### Automatic Deletion Triggers

#### 1. After MSSQL Sync (Most Important)
**Location:** `server/integrations/mssqlPatients.ts` (line ~3070)

```typescript
// After successful sync, invalidate cache for patients with changed codes
if (changedPatientIds.size > 0) {
  try {
    await db.invalidatePatientPageStateCache(Array.from(changedPatientIds));
  } catch (error) {
    console.warn("[MSSQL Sync] Cache invalidation failed (sync continues):", error?.message);
  }
}
```

**Trigger:** Runs when `doctorCode` OR `serviceCode` changes in any synced patient
**Scope:** Deletes `patientPageStates` where:
- `patientId` IN (patients with code changes)
- `page` IN ('examination', 'quick-entry', 'medical-file')

**Important:** Cache invalidation failure is **non-blocking**. Sync succeeds even if cleanup fails.

#### 2. On Patient Switch
**Location:** `client/src/hooks/admin-patients/useAdminPatientsList.ts` (proposed)

```typescript
// When user navigates to different patient, clear cache
useEffect(() => {
  if (previousPatientId && previousPatientId !== patientInfo.id) {
    clearPatientPageStateCache(previousPatientId);
  }
}, [patientInfo.id]);
```

**Trigger:** User clicks different patient in admin list
**Scope:** Clears all pages for previous patient
**Safety:** Prevents form rehydration on wrong patient

#### 3. On Successful Examination Save
**Location:** `client/src/pages/ExaminationForm.tsx` (proposed)

```typescript
// After exam saves to database, clear cache so next load fetches fresh
onSuccess: (result) => {
  clearPatientPageStateCache(patientId, ['examination']);
  // User can reopen examination, will fetch fresh data
}
```

**Trigger:** Examination record successfully inserted
**Scope:** Deletes only 'examination' page cache
**Safety:** Next open gets latest checklist/medical data

#### 4. On Logout / Session Reset
**Location:** `client/src/hooks/useAuth.ts` (logout handler)

```typescript
// On logout, clear all patient-specific data
const handleLogout = async () => {
  clearAllPatientPageStateCaches();
  // ...
};
```

**Trigger:** User clicks logout
**Scope:** Clears all caches for all patients
**Safety:** Security (prevent data leak to next user)

#### 5. Manual Cache Reset (Admin)
**Location:** `server/db.ts` → `resetMssqlSyncCodes()`

```typescript
export async function resetMssqlSyncCodes(): Promise<number> {
  // Nuclear option: clear all sync codes + all caches
  await db.update(patients).set({
    doctorCode: null,
    doctorId: null,
    serviceCode: null,
  });
  // Also clears patientPageStates completely
  await db.delete(patientPageStates);
  // ...
}
```

**Trigger:** Admin clicks "Reset MSSQL Sync" button
**Scope:** Clears all caches, resets all sync codes
**Recovery:** Full re-sync on next run

## Error Handling

### What Happens If Cleanup Fails?

#### Scenario 1: Sync succeeds, cache cleanup fails
```
Result:    patientPageStates still has old data
Risk:      Next form open might hydrate stale doctor/service
Mitigated: Because sync invalidation is part of queue, retry happens on next sync
Fallback:  Manual cache reset available to admin
```

#### Scenario 2: Patient switch, cache cleanup fails
```
Result:    Previous patient's cache still in DB
Risk:      Unlikely to affect workflow (different patient ID)
Fallback:  Cache cleanup retried on next patient switch
```

#### Scenario 3: Exam save, cache cleanup fails
```
Result:    Cache not deleted, user can reopen
Risk:      Might show stale form state
Mitigated: User can manually refresh page to fetch fresh
```

### Recovery Procedures

**For users:**
- Close and reopen page to clear browser cache + refetch server
- Navigate away and back to patient
- Log out and log back in (clears all caches)

**For admins:**
- Run MSSQL sync (invalidates caches for changed patients)
- Use "Reset MSSQL Sync" to clear all caches and codes
- Contact support if data appears stale

**For monitoring:**
- Alert if cache cleanup fails >3 times per hour
- Log all cleanup failures with patient count
- Track stale hydration attempts (should be zero)

## Implementation Status

### Phase 1 ✅ Complete
- [x] Add `invalidatePatientPageStateCache()` to db.ts
- [x] Call from `syncPatientsFromMssql()` for changed patients
- [x] Wrap in try/catch (non-blocking)

### Phase 2 ✅ Complete
- [x] Remove doctor/service hydration from useExaminationForm
- [x] Keep only sheetSelection, visitDate, isFollowup
- [x] Remove from auto-save payload

### Phase 3 🔄 In Progress
- [ ] Add cleanup on patient switch
- [ ] Add cleanup on successful exam save
- [ ] Add logout cleanup
- [ ] Add monitoring/diagnostics
- [ ] Document all cleanup triggers

## Monitoring & Alerts

### Metrics to Track
```typescript
// Log cache invalidation success
console.log(`[Cache] Invalidated ${patientIds.length} patients after sync`);

// Log cache cleanup failures
console.warn(`[Cache] Failed to cleanup patient ${patientId}: ${error.message}`);

// Log stale hydration attempts (should never happen)
console.error(`[Cache] SECURITY: Attempted stale hydration of ${field}`);

// Log successful cleanup
console.log(`[Cache] Cleaned up page=${page} for patient=${patientId}`);
```

### Alerts (Dev + Production)
- 🔴 **Error:** Cache invalidation fails on sync (log + continue sync)
- 🟡 **Warning:** Cleanup fails on form save (user can refresh)
- 🔴 **Error:** Stale hydration detected (should never happen)
- 🟡 **Warning:** Cache miss > 100ms (might indicate perf issue)

## Testing Checklist

- [ ] Cache invalidation deletes only specified pages
- [ ] Cleanup doesn't delete other patients' caches
- [ ] Cleanup doesn't delete other pages' caches
- [ ] Sync success triggers cache invalidation
- [ ] Cache invalidation failure doesn't block sync
- [ ] Patient switch clears previous patient's cache
- [ ] Exam save clears examination cache
- [ ] Logout clears all caches
- [ ] Manual reset clears all caches + sync codes
- [ ] Stale field hydration is impossible (code review only)

## FAQ

**Q: Why separate `sheetSelection`, `visitDate`, `isFollowup` from medical data?**
A: These are UI workflow state, not medical truth. Safe to persist across reloads without staleness risk.

**Q: Why not cache doctorCode/serviceCode?**
A: MSSQL syncs these nightly. Cache persists across syncs and becomes stale. Better to reload fresh.

**Q: What if sync fails and user opens exam form?**
A: Doctor/service fields load fresh from latest MSSQL sync (unmodified). Form loads correctly.

**Q: Can stale cache cause wrong exam to be saved?**
A: No. Medical data (checklist, results) always loads fresh. Form uses whatever doctor/service user selects.

**Q: What if cleanup fails and user reopens exam?**
A: Cache might have old sheetSelection/visitDate. User can manually refresh page or it's harmless (just form state).

**Q: Should cleanup block exam save?**
A: No. Exam should save first (commit to DB). Cache cleanup is optional housekeeping.

---

**Last Updated:** 2026-05-07
**Policy Status:** Locked for Phase 3 production
**Owner:** Architecture team
