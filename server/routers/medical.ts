import { z } from "zod";
import { access, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  doctorProcedure,
  nurseProcedure,
  technicianProcedure,
  receptionProcedure,
  managerProcedure,
  adminProcedure,
  medicalStaffProcedure,
} from "../_core/procedures";
import { authService } from "../_core/auth";
import {
  getAppNotificationSettings,
  pushAppNotification,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../_core/appNotifications";
import { isFcmConfigured } from "../_core/fcmPush";
import * as db from "../db";
import { eq, asc, desc, and, inArray, sql } from "drizzle-orm";
import {
  services,
  doctorsLookup,
  patients,
  examinations,
  examinationChecklistItems,
  patientPageStates,
  autorefractometryData,
  afterRefractionData,
  glassesRecords,
  pentacamResults,
  doctorReports,
  testRequests,
  prescriptions,
  patientServiceEntries,
} from "../../drizzle/schema";
import { mssqlQuery } from "../services/accounting/mssqlAccounting";
import { broadcastSheetUpdate } from "../_core/ws";
import { getBuildInfo } from "../_core/buildInfo";
import { copyObjectInS3, deleteFromS3, listObjectsInS3 } from "../_core/s3";
import {
  backfillPapatSrvNamesInMssql,
  deletePatientFromMssqlByCode,
  ensurePatientServiceInMssql,
  getMssqlSyncStatus,
  insertPatientToMssql,
  syncPatientsFromMssql,
  syncSinglePatientFromMssql,
  upsertPatientToMssql,
} from "../integrations/mssqlPatients";

import { medicalOpsRoutes } from "./medical-ops";
import { medicalMssqlRoutes } from "./medical-mssql";
import { medicalExaminationsRoutes } from "./medical-examinations";
import { medicalPentacamRoutes } from "./medical-pentacam";
import { medicalCatalogRoutes } from "./medical-catalog";
import { medicalPatientRoutes } from "./medical-patient";
import { PentacamPatientCandidate, FailedPentacamSuggestion, FailedPentacamPreview, LocalPentacamMismatchEntry, PENTACAM_ROOT_DIR, PENTACAM_FAILED_DIR, normalizePentacamMatchText, normalizePentacamPhoneticToken, buildPentacamTokenSignatureSet, buildPentacamNameKeys, extractPentacamNameFragment, extractPatientCodeCandidatesFromFileName, tokenizePentacamMatchText, buildPentacamPatientCandidates, resolvePatientForPentacamFileName, suggestPatientsForPentacamFileName, reorderPatientNameSecondThirdFirst, sanitizeLabel, normalizePentacamKey, resolvePentacamSourceKeyCandidates, buildPentacamPatientPrefix, buildPentacamPatientKey, buildPentacamObjectUrl, movePentacamObjectToPatient, parsePentacamLocalMeta, pentacamEyeHasAnyData, pentacamEyeIsComplete, expandPentacamDashboardRows, stripLeadingCodeLabel, assertSafePentacamFileName, pathExists, nextAvailablePentacamPath, extractPentacamPageType, buildFailedPentacamGroupLabel, buildFailedPentacamGroupKey, listFailedPentacamRows, previewFailedPentacamRenameTargets, moveFailedPentacamFile, scanMismatchedLocalPentacamLinks, inferPentacamEyeSideFromName, inferPentacamCapturedAtFromName, inferPentacamMimeType } from "./_medical/pentacam-helpers";
import { resolvePatientNotifTitle, resolveNotificationTargetRolesByUserRole, normalizePhoneKey, findExistingPatientByNameOrPhone, resolveServiceCodeForType, pushNewPatientToMssql, registrationPricingPayload, canPushToMssql, readFreshDoctorNameForPatient, readDoctorNameFromStateData, readRoleSignatureFromStateData, resolveDoctorCodeById, resolveDoctorCodeByName } from "./_medical/patient-helpers";
import { LASIK_CODES, CONSULTANT_CODES, SPECIALIST_CODES, XRAY_CODES, MOJIBAKE_HINT, DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG, getSystemSettingFallbackValue, decodeMojibake, normalizeServiceCodeKey, inferSrvTyp, normalizeServiceDefaultSheet, serviceTypeFromSheetOrType, normalizeVisitType, doctorLocationTypeSchema, doctorTypeSchema, doctorDirectoryEntrySchema, serviceDirectoryEntrySchema, readyTemplateScopeSchema, symptomDirectoryEntrySchema, readyTemplateOverrideUpdateSchema, readyTemplateOverrideImportSchema, readReadyPrescriptionTemplatesFromFile, readReadyTestTemplatesFromFile, assertPentacamViewPermission } from "./_medical/service-helpers";

export const medicalRouter = router({
  ...medicalOpsRoutes,
  ...medicalMssqlRoutes,
  ...medicalExaminationsRoutes,
  ...medicalPentacamRoutes,
  ...medicalCatalogRoutes,
  ...medicalPatientRoutes,
});
