# Data Model: Medical Router Split

**Date**: 2026-06-12

No new database entities. No schema changes. This document captures the **code structure model** — the domain decomposition and dependency graph.

---

## Domain Map

```
medical.ts (patient core, ~600 lines after split)
  createPatient
  stagePatientsImport / applyPatientsImport / getPatientImportErrors / getPatientImportPreview
  createPatientFromExamination
  getPatientServiceEntries
  searchPatients / getAllPatients
  getPatientStats / getPatientStatsBundle
  getTodayPatientsBySheet
  bulkAssignDoctorToPatients / bulkAssignSheetTypeToPatients / bulkRestorePatients
  ─── imports: patient-helpers.ts, service-helpers.ts

medical-pentacam.ts (~21 procedures)
  updatePentacamResult
  getPentacamResultsByVisit / listPentacamDashboard / getPentacamDashboardStats
  getPentacamFilesByPatient / getPentacamMeasurementsByPatient
  debugPentacamS3 / removePentacamLink
  importLocalPentacamExports / autoImportLocalPentacamExports
  getUnmatchedLocalPentacamSuggestions / getMismatchedLocalPentacamLinks
  listFailedPentacamFiles / previewFailedPentacamRename
  reviewFailedPentacamFile / reviewFailedPentacamGroup
  releaseFailedPentacamFile / retryFailedPentacamOcr
  unlinkMismatchedLocalPentacamLinks / reassignLocalPentacamLink
  searchPentacamPatients
  ─── imports: pentacam-helpers.ts, S3 helpers, fs/promises

medical-examinations.ts (~32 procedures)
  getAppointmentsByPatient / getMedicalTotals
  getOperations / getAllOperations / getAppointments
  deleteAppointment / updateAppointment
  createExamination / updateExamination
  getExaminationsByPatient / getAutorefractometryByPatient / getAutorefractometryOverview
  getGlassesRecordsByPatient / getAfterRefractionByPatient / saveAfterRefractionData
  getVisitsByPatient / getFollowupVisitsByPatient / getVisits / getExaminations
  updateVisitDate / updateVisitExamData
  saveFollowupSheet / getFollowupSheets / getAllExaminations / getRefractionsOverview
  getSheetEntry / saveSheetEntry / saveRefractionToExamination
  saveExaminationForm / saveMedicalVisit
  updateVisitQueueStatus / getTodayPatientsByQueueStatus
  ─── imports: service-helpers.ts, broadcastSheetUpdate (ws)

medical-mssql.ts (~19 procedures)
  syncPatientsFromMssql / resetPatientServiceTypesFromServiceCode
  resetMssqlSyncCodes / resetPatientsAutoIncrement
  getMssqlSyncStatus / backfillMssqlServiceNames
  getMssqlSyncRuntimeConfig / updateMssqlSyncRuntimeConfig
  linkMultipleServicesToMssql / linkPatientServiceToMssql
  deletePatientFromMssql / deletePatientWithAllData / deleteVisitWithAllData / deleteExaminationDirect
  syncRegistrationCatalogFromMssql / updateServicePriceInMssql
  addServiceInDb / getServicesFromDb / updateServiceInDb
  getRegistrationCatalog / getDataSourceAuditStatus
  ─── imports: patient-helpers.ts, service-helpers.ts, mssqlPatients integration

medical-catalog.ts (~38 procedures)
  getMedications / getAllMedications / createMedication / updateMedication / deleteMedication
  getAllDiseases / createDisease / updateDisease / deleteDisease
  getAllSymptoms / createSymptom / updateSymptom / deleteSymptom
  getTests / getAllTests / createTest / updateTest / deleteTest
  getMyTestFavorites / toggleTestFavorite
  createTestRequest / getTestRequestsByPatient / getPatientTestRequests / getTestRequestsByVisit
  createPrescription / getPrescriptionsByVisit / createPrescriptionWithItems
  getPrescriptionsByPatient / getPrescriptionsWithItemsByPatient
  getPrescriptionsOverview / getPrescriptionsWithItemsByVisit / deletePrescription
  createSurgery / getSurgeriesByPatient / deleteSurgery
  createPostOpFollowup / getPostOpFollowupsByPatient / getPostOpFollowupsBySurgery
  ─── imports: (self-contained, no shared helpers)

medical-ops.ts (~71 procedures — reports + admin merged here)
  [Reports/Directory]
  createDoctorReport / updateDoctorReport / getDoctorReportsByVisit
  getMedicalReportsByPatient / getMedicalReportsOverview / getDoctorReports
  createMedicalReport / updateMedicalReport / deleteMedicalReport
  getAuditLogs
  getOperationList / getOperationListById / saveOperationList
  getOperationListsHistory / getTodayOperationLists
  deleteOperationList / deleteOperationListById
  getOperationBookings / createOperationBooking / updateOperationBooking / deleteOperationBooking
  getUserPageState / saveUserPageState / getPatientPageState
  saveExaminationChecklist / getExaminationChecklist / savePatientPageState
  getReadyTemplateOverrides / upsertReadyTemplateOverride
  importReadyTemplateOverrides / importReadyTemplateOverridesFromFile
  getSystemSetting / registerPushDeviceToken / unregisterPushDeviceToken / updateSystemSetting
  getDoctorDirectory / updateDoctorDirectory
  getServiceDirectory / getServicesCatalog / updateServiceDirectory
  [Admin/Ops]
  getOpsHealth / getBuildInfo / getRuntimeDbInfo
  fixOrphanedExaminations / autoFixAllDataIssues
  checkInvalidVisitIds / checkVisitsWithoutAppointments
  fixExamsWithVisitId0 / fixVisitsWithoutAppointmentId
  getDashboardCardVisibility / setDashboardCardVisibility
  deletePatient / deleteAllPatients
  getDoctors / getAllUsers / getNotificationMeta
  createUser / updateUser / deleteUser
  getUserPermissions / getUserPermissionState / getMyPermissions
  getTeamPermissions / setTeamPermissions / setUserPermissions
  populatePatientNamesFromSheets / debugTodayPatients
  getPatientMedicalStatusBatch
  ─── imports: patient-helpers.ts, service-helpers.ts, FCM, build info
```

---

## Shared Helpers Map

```
_medical/pentacam-helpers.ts
  exports: buildPentacamPatientCandidates, resolvePatientForPentacamFileName,
           suggestPatientsForPentacamFileName, movePentacamObjectToPatient,
           listFailedPentacamRows, previewFailedPentacamRenameTargets,
           scanMismatchedLocalPentacamLinks,
           + ~30 internal utilities (normalize, tokenize, infer, build*, assert*)
  used by: medical-pentacam.ts only

_medical/patient-helpers.ts
  exports: findExistingPatientByNameOrPhone, resolveServiceCodeForType,
           pushNewPatientToMssql, readFreshDoctorNameForPatient,
           resolveDoctorCodeById, resolveDoctorCodeByName,
           canPushToMssql, registrationPricingPayload, normalizePhoneKey
  used by: medical.ts, medical-mssql.ts, medical-ops.ts

_medical/service-helpers.ts
  exports: inferSrvTyp, normalizeServiceDefaultSheet, serviceTypeFromSheetOrType,
           normalizeServiceCodeKey, decodeMojibake, LASIK_CODES, CONSULTANT_CODES,
           SPECIALIST_CODES, XRAY_CODES, doctorLocationTypeSchema, doctorTypeSchema,
           doctorDirectoryEntrySchema, serviceDirectoryEntrySchema,
           readyTemplateScopeSchema, inferPentacamEyeSideFromName, inferPentacamMimeType
  used by: medical.ts, medical-examinations.ts, medical-mssql.ts, medical-ops.ts
```

---

## Route State Model

```
Before:
  /kf             → renders GlobalSearch component
  /kf/patients    → renders KfPatientList component
  /KFsheets/consultant/:id         → renders KfConsultantSheet
  /KFsheets/consultant/:id/followup → renders KfFollowupSheet

After:
  /kf             → renders KfPatientList component (same as /kf/patients)
  /kf/patients    → renders KfPatientList component (unchanged)
  /kf/sheets/consultant/:id          → renders KfConsultantSheet (new canonical path)
  /kf/sheets/consultant/:id/followup → renders KfFollowupSheet (new canonical path)
  /KFsheets/consultant/:id           → redirects to /kf/sheets/consultant/:id
  /KFsheets/consultant/:id/followup  → redirects to /kf/sheets/consultant/:id/followup

ProtectedRoute.tsx permission check:
  Before: accepts /KFsheets/consultant as covered by /kf permission
  After:  accepts /kf/sheets/consultant as covered by /kf permission
  (redirect means /KFsheets path never reaches permission check at runtime)
```
