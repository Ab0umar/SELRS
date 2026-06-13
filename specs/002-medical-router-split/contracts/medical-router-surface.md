# Contract: Medical Router Surface

**Date**: 2026-06-12
**Stability**: Frozen — this surface MUST NOT change as a result of the split

## Contract Statement

All 195 procedures currently accessible via `trpc.medical.*` MUST remain accessible via the same names after the split. The split is an internal implementation change only.

## Verification Method

Run `pnpm check` after the split. If any procedure was removed or renamed, the TypeScript compiler will report an error at every callsite. This is the primary contract enforcement mechanism.

## Procedure Inventory (by domain)

This list is the source of truth for what must exist after the split.

### Patient Core (remain in medical.ts)
createPatient, stagePatientsImport, applyPatientsImport, getPatientImportErrors, getPatientImportPreview, createPatientFromExamination, getPatientServiceEntries, searchPatients, getAllPatients, getPatientStats, getPatientStatsBundle, getTodayPatientsBySheet, bulkAssignDoctorToPatients, bulkAssignSheetTypeToPatients, bulkRestorePatients

### Pentacam (→ medical-pentacam.ts)
updatePentacamResult, getPentacamResultsByVisit, listPentacamDashboard, getPentacamDashboardStats, getPentacamFilesByPatient, getPentacamMeasurementsByPatient, debugPentacamS3, removePentacamLink, importLocalPentacamExports, autoImportLocalPentacamExports, getUnmatchedLocalPentacamSuggestions, getMismatchedLocalPentacamLinks, listFailedPentacamFiles, previewFailedPentacamRename, reviewFailedPentacamFile, reviewFailedPentacamGroup, releaseFailedPentacamFile, retryFailedPentacamOcr, unlinkMismatchedLocalPentacamLinks, reassignLocalPentacamLink, searchPentacamPatients

### Examinations/Visits (→ medical-examinations.ts)
getAppointmentsByPatient, getMedicalTotals, getOperations, getAllOperations, getAppointments, deleteAppointment, updateAppointment, createExamination, updateExamination, getExaminationsByPatient, getAutorefractometryByPatient, getAutorefractometryOverview, getGlassesRecordsByPatient, getAfterRefractionByPatient, saveAfterRefractionData, getVisitsByPatient, getFollowupVisitsByPatient, getVisits, getExaminations, updateVisitDate, updateVisitExamData, saveFollowupSheet, getFollowupSheets, getAllExaminations, getRefractionsOverview, getSheetEntry, saveSheetEntry, saveRefractionToExamination, saveExaminationForm, saveMedicalVisit, updateVisitQueueStatus, getTodayPatientsByQueueStatus

### MSSQL Sync (→ medical-mssql.ts)
syncPatientsFromMssql, resetPatientServiceTypesFromServiceCode, resetMssqlSyncCodes, resetPatientsAutoIncrement, getMssqlSyncStatus, backfillMssqlServiceNames, getMssqlSyncRuntimeConfig, updateMssqlSyncRuntimeConfig, linkMultipleServicesToMssql, linkPatientServiceToMssql, deletePatientFromMssql, deletePatientWithAllData, deleteVisitWithAllData, deleteExaminationDirect, syncRegistrationCatalogFromMssql, updateServicePriceInMssql, addServiceInDb, getServicesFromDb, updateServiceInDb, getRegistrationCatalog, getDataSourceAuditStatus

### Catalog (→ medical-catalog.ts)
getMedications, getAllMedications, createMedication, updateMedication, deleteMedication, getAllDiseases, createDisease, updateDisease, deleteDisease, getAllSymptoms, createSymptom, updateSymptom, deleteSymptom, getTests, getAllTests, createTest, updateTest, deleteTest, getMyTestFavorites, toggleTestFavorite, createTestRequest, getTestRequestsByPatient, getPatientTestRequests, getTestRequestsByVisit, createPrescription, getPrescriptionsByVisit, createPrescriptionWithItems, getPrescriptionsByPatient, getPrescriptionsWithItemsByPatient, getPrescriptionsOverview, getPrescriptionsWithItemsByVisit, deletePrescription, createSurgery, getSurgeriesByPatient, deleteSurgery, createPostOpFollowup, getPostOpFollowupsByPatient, getPostOpFollowupsBySurgery

### Ops/Admin (→ medical-ops.ts)
getOpsHealth, getBuildInfo, getRuntimeDbInfo, fixOrphanedExaminations, autoFixAllDataIssues, checkInvalidVisitIds, checkVisitsWithoutAppointments, fixExamsWithVisitId0, fixVisitsWithoutAppointmentId, getDashboardCardVisibility, setDashboardCardVisibility, deletePatient, deleteAllPatients, getDoctors, getAllUsers, getNotificationMeta, createUser, updateUser, deleteUser, getUserPermissions, getUserPermissionState, getMyPermissions, getTeamPermissions, setTeamPermissions, setUserPermissions, populatePatientNamesFromSheets, debugTodayPatients, getPatientMedicalStatusBatch, createDoctorReport, updateDoctorReport, getDoctorReportsByVisit, getMedicalReportsByPatient, getMedicalReportsOverview, getDoctorReports, createMedicalReport, updateMedicalReport, deleteMedicalReport, getAuditLogs, getOperationList, getOperationListById, saveOperationList, getOperationListsHistory, getTodayOperationLists, deleteOperationList, deleteOperationListById, getOperationBookings, createOperationBooking, updateOperationBooking, deleteOperationBooking, getUserPageState, saveUserPageState, getPatientPageState, saveExaminationChecklist, getExaminationChecklist, savePatientPageState, getReadyTemplateOverrides, upsertReadyTemplateOverride, importReadyTemplateOverrides, importReadyTemplateOverridesFromFile, getSystemSetting, registerPushDeviceToken, unregisterPushDeviceToken, updateSystemSetting, getDoctorDirectory, updateDoctorDirectory, getServiceDirectory, getServicesCatalog, updateServiceDirectory
