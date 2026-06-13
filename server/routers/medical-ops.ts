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
import { assertReadyTemplateImportPermission } from "./_medical/service-helpers";
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

import { canPushToMssql, findExistingPatientByNameOrPhone, normalizePhoneKey, pushNewPatientToMssql, readDoctorNameFromStateData, readFreshDoctorNameForPatient, readRoleSignatureFromStateData, registrationPricingPayload, resolveDoctorCodeById, resolveDoctorCodeByName, resolveNotificationTargetRolesByUserRole, resolvePatientNotifTitle, resolveServiceCodeForType } from "./_medical/patient-helpers";
import { DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG, assertPentacamViewPermission, decodeMojibake, doctorDirectoryEntrySchema, doctorLocationTypeSchema, doctorTypeSchema, getSystemSettingFallbackValue, inferSrvTyp, normalizeServiceCodeKey, normalizeServiceDefaultSheet, normalizeVisitType, readReadyPrescriptionTemplatesFromFile, readReadyTestTemplatesFromFile, readyTemplateOverrideImportSchema, readyTemplateOverrideUpdateSchema, readyTemplateScopeSchema, serviceDirectoryEntrySchema, serviceTypeFromSheetOrType, symptomDirectoryEntrySchema } from "./_medical/service-helpers";

export const medicalOpsRoutes = {
  getOpsHealth: adminProcedure.query(async () => {
    return await db.getOpsHealthStatus();
  }),

  getBuildInfo: protectedProcedure.query(async () => {
    return await getBuildInfo();
  }),

  getRuntimeDbInfo: adminProcedure.query(async () => {
    const raw = String(process.env.DATABASE_URL ?? "").trim();
    if (!raw) {
      return {
        hasDatabaseUrl: false,
        protocol: null as string | null,
        host: null as string | null,
        port: null as number | null,
        database: null as string | null,
        maskedUrl: null as string | null,
      };
    }
    try {
      const parsed = new URL(raw);
      const database = parsed.pathname?.replace(/^\//, "") || null;
      const portNum = parsed.port ? Number(parsed.port) : null;
      const maskedUser = parsed.username ? "***" : "";
      const maskedPass = parsed.password ? ":***" : "";
      const authPart =
        parsed.username || parsed.password ? `${maskedUser}${maskedPass}@` : "";
      const maskedUrl = `${parsed.protocol}//${authPart}${parsed.host}${parsed.pathname}${parsed.search}`;
      return {
        hasDatabaseUrl: true,
        protocol: parsed.protocol.replace(":", ""),
        host: parsed.hostname || null,
        port: Number.isFinite(portNum) ? portNum : null,
        database,
        maskedUrl,
      };
    } catch {
      return {
        hasDatabaseUrl: true,
        protocol: null as string | null,
        host: null as string | null,
        port: null as number | null,
        database: null as string | null,
        maskedUrl: "invalid DATABASE_URL format",
      };
    }
  }),

  fixOrphanedExaminations: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await db.fixOrphanedExaminations();
      await db.logAuditEvent(
        ctx.user.id,
        "FIX_ORPHANED_EXAMINATIONS",
        "examination",
        0,
        {
          message: `Fixed ${result.fixed} orphaned examinations out of ${result.total}`,
        },
      );
      return { success: true, ...result };
    } catch (error) {
      console.error("Fix orphaned examinations error:", error);
      throw new Error(`Failed to fix orphaned examinations: ${error}`);
    }
  }),

  autoFixAllDataIssues: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await db.autoFixAllDataIssues();
      await db.logAuditEvent(
        ctx.user.id,
        "AUTO_FIX_ALL_DATA_ISSUES",
        "system",
        0,
        {
          message: `Auto-fixed all data issues: ${result.totalFixed} items fixed total. Details: visitId0=${result.fixExamsWithVisitId0.fixed}, orphaned=${result.fixOrphanedExaminations.fixed}, noAppt=${result.fixVisitsWithoutAppointmentId.fixed}`,
        },
      );
      return { success: true, ...result };
    } catch (error) {
      console.error("Auto-fix all error:", error);
      throw new Error(`Failed to auto-fix all issues: ${error}`);
    }
  }),

  checkInvalidVisitIds: adminProcedure.query(async ({ ctx }) => {
    try {
      const result = await db.checkInvalidVisitIds();
      console.log("Invalid visitIds check result:", result);
      return { success: true, ...result };
    } catch (error) {
      console.error("Check invalid visitIds error:", error);
      throw new Error(`Failed to check invalid visitIds: ${error}`);
    }
  }),

  checkVisitsWithoutAppointments: adminProcedure.query(async ({ ctx }) => {
    try {
      const result = await db.checkVisitsWithoutAppointments();
      console.log("Visits without appointments check:", result);
      return { success: true, ...result };
    } catch (error) {
      console.error("Check visits without appointments error:", error);
      throw new Error(`Failed to check visits without appointments: ${error}`);
    }
  }),

  fixExamsWithVisitId0: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await db.fixExamsWithVisitId0();
      await db.logAuditEvent(
        ctx.user.id,
        "FIX_EXAMS_VISITID_0",
        "examination",
        0,
        {
          message: `Fixed ${result.fixed} exams with visitId = 0. ${result.message}`,
        },
      );
      return { success: true, ...result };
    } catch (error) {
      console.error("Fix exams with visitId 0 error:", error);
      throw new Error(`Failed to fix exams with visitId = 0: ${error}`);
    }
  }),

  fixVisitsWithoutAppointmentId: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await db.fixVisitsWithoutAppointmentId();
      await db.logAuditEvent(
        ctx.user.id,
        "FIX_VISITS_WITHOUT_APPOINTMENT",
        "visit",
        0,
        {
          message: `Fixed ${result.fixed} visits without appointmentId out of ${result.total}`,
        },
      );
      return { success: true, ...result };
    } catch (error) {
      console.error("Fix visits without appointment error:", error);
      throw new Error(`Failed to fix visits without appointmentId: ${error}`);
    }
  }),

  getDashboardCardVisibility: protectedProcedure.query(async () => {
    try {
      const setting = await db.getSystemSetting("dashboard_card_visibility_v1");
      const defaults = {
        // Panel cards
        showPatientDataPanel: true,
        showMedicalFileCard: true,
        showTodayPatientsPanel: true,
        // Dashboard cards
        showPatients: true,
        showPatientFile: true,
        showExaminations: true,
        showPentacam: true,
        showAppointments: true,
        showPricingRules: true,
        showMedicalReports: true,
        showPatientSummary: true,
        showPrescription: true,
        showRefraction: true,
        showRequestTests: true,
        showMedicationsTests: true,
        showVisits: true,
        showFollowups: true,
        showQuickEntry: true,
        showNewCases: true,
        showFollowupForm: true,
        showDoctorView: true,
        showSheetCopies: true,
      };
      if (setting?.value) {
        try {
          const stored = JSON.parse(setting.value);
          return { ...defaults, ...stored };
        } catch {
          return defaults;
        }
      }
      return defaults;
    } catch (error) {
      console.error("Get dashboard card visibility error:", error);
      return {
        showPatientDataPanel: true,
        showMedicalFileCard: true,
        showTodayPatientsPanel: true,
        showPatients: true,
        showPatientFile: true,
        showExaminations: true,
        showPentacam: true,
        showAppointments: true,
        showPricingRules: true,
        showMedicalReports: true,
        showPatientSummary: true,
        showPrescription: true,
        showRefraction: true,
        showRequestTests: true,
        showMedicationsTests: true,
        showVisits: true,
        showFollowups: true,
        showQuickEntry: true,
        showNewCases: true,
        showFollowupForm: true,
        showDoctorView: true,
        showSheetCopies: true,
      };
    }
  }),

  setDashboardCardVisibility: adminProcedure
    .input(
      z.object({
        // Panel cards
        showPatientDataPanel: z.boolean(),
        showMedicalFileCard: z.boolean(),
        showTodayPatientsPanel: z.boolean(),
        // Dashboard cards
        showPatients: z.boolean(),
        showPatientFile: z.boolean(),
        showExaminations: z.boolean(),
        showPentacam: z.boolean(),
        showAppointments: z.boolean(),
        showPricingRules: z.boolean(),
        showMedicalReports: z.boolean(),
        showPatientSummary: z.boolean(),
        showPrescription: z.boolean(),
        showRefraction: z.boolean(),
        showRequestTests: z.boolean(),
        showMedicationsTests: z.boolean(),
        showVisits: z.boolean(),
        showFollowups: z.boolean(),
        showQuickEntry: z.boolean(),
        showNewCases: z.boolean(),
        showFollowupForm: z.boolean(),
        showDoctorView: z.boolean(),
        showSheetCopies: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await db.updateSystemSettings("dashboard_card_visibility_v1", input);
        await db.logAuditEvent(
          ctx.user.id,
          "UPDATE_DASHBOARD_VISIBILITY",
          "system",
          0,
          {
            message: `Updated dashboard card visibility`,
          },
        );
        return { success: true, ...input };
      } catch (error) {
        console.error("Set dashboard card visibility error:", error);
        throw new Error(`Failed to set dashboard card visibility: ${error}`);
      }
    }),

  deletePatient: adminProcedure
    .input(z.object({ patientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new Error(`Patient ${input.patientId} not found`);
        }
        await db.deletePatient(input.patientId);
        await db.logAuditEvent(
          ctx.user.id,
          "DELETE_PATIENT",
          "patient",
          input.patientId,
          {
            message: `Deleted patient record: ${(patient as any).fullName}`,
          },
        );
        return { success: true, patientId: input.patientId };
      } catch (error) {
        throw new Error(`Failed to delete patient: ${error}`);
      }
    }),

  deleteAllPatients: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await db.deleteAllPatients();
      await db.logAuditEvent(ctx.user.id, "DELETE_ALL_PATIENTS", "patient", 0, {
        message: `Deleted all ${result.deletedCount} patients (records preserved)`,
      });
      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      throw new Error(`Failed to delete all patients: ${error}`);
    }
  }),

  getDoctors: protectedProcedure.query(async () => {
    return await db.getDoctors();
  }),

  getAllUsers: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  getNotificationMeta: adminProcedure.query(() => ({
    fcmConfigured: isFcmConfigured(),
  })),

  createUser: adminProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z
          .enum([
            "admin",
            "doctor",
            "nurse",
            "technician",
            "reception",
            "manager",
            "accountant",
            "worker",
            "supervisor",
          ])
          .optional(),
        branch: z.enum(["examinations", "surgery", "both"]).optional(),
        shift: z.union([z.literal(1), z.literal(2)]).optional(),
        writeToMssql: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const hashedPassword = await authService.hashPassword(input.password);
      const user = await db.createUser({
        username: input.username,
        password: hashedPassword as any,
        name: input.name,
        email: input.email,
        role: input.role,
        branch: input.branch,
        shift: input.shift,
      } as any);
      let createdUserId = (user as any)?.insertId as number | undefined;
      if (!createdUserId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user - no ID returned from database",
        });
      }
      const extras = input.writeToMssql ? ["/ops/mssql-add"] : [];
      await db.setUserPermissions(
        createdUserId,
        extras,
        extras.length > 0
          ? { emptyMode: "inherit", nonEmptyMode: "inherit_extras" }
          : { emptyMode: "inherit" },
      );
      await db.logAuditEvent(ctx.user.id, "CREATE_USER", "user", 0, {
        username: input.username,
      });
      return { success: true, userId: createdUserId };
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        updates: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const updates = { ...input.updates };
      if (typeof updates.password === "string" && updates.password.length > 0) {
        updates.password = await authService.hashPassword(updates.password);
      }
      await db.updateUser(input.userId, updates);
      if (typeof updates.role === "string" && updates.role.trim().length > 0) {
        await db.setUserPermissions(input.userId, [], { emptyMode: "inherit" });
      }
      await db.logAuditEvent(ctx.user.id, "UPDATE_USER", "user", input.userId, {
        updates: Object.keys(input.updates),
      });
      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteUser(input.userId);
      await db.logAuditEvent(ctx.user.id, "DELETE_USER", "user", input.userId);
      return { success: true };
    }),

  getUserPermissions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await db.getUserPermissions(input.userId);
    }),

  getUserPermissionState: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await db.getUserPermissionState(input.userId);
    }),

  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const permissions = await db.getEffectiveUserPermissions(
      ctx.user.id,
      ctx.user.role,
    );
    if (
      ctx.user.role === "reception" &&
      !permissions.includes("/examination")
    ) {
      permissions.push("/examination");
    }
    return permissions;
  }),

  getTeamPermissions: adminProcedure.query(async () => {
    return await db.getTeamPermissions();
  }),

  setTeamPermissions: adminProcedure
    .input(
      z.object({
        admin: z.array(z.string()),
        manager: z.array(z.string()),
        accountant: z.array(z.string()),
        reception: z.array(z.string()),
        nurse: z.array(z.string()),
        technician: z.array(z.string()),
        doctor: z.array(z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const previousPermissions = await db.getTeamPermissions();
      await db.setTeamPermissions(input);
      const nextPermissions = await db.getTeamPermissions();
      const users = await db.getAllUsers();
      for (const user of users) {
        const role = String(user.role ?? "")
          .trim()
          .toLowerCase() as keyof typeof input;
        const previousRolePermissions = previousPermissions[role] ?? [];
        const nextRolePermissions = nextPermissions[role] ?? [];
        const previousRoleBases = db.normalizePermissionPathsForTeamMirror(
          previousRolePermissions,
        );
        const nextRoleBases =
          db.normalizePermissionPathsForTeamMirror(nextRolePermissions);
        const newlyAddedRoleBases = nextRoleBases.filter(
          (pageId) => !previousRoleBases.includes(pageId),
        );
        const currentUserPermissions = await db.getUserPermissionState(user.id);
        if (currentUserPermissions.hasExplicitEmptyOverride) continue;
        if (!currentUserPermissions.hasOverride) continue;
        if (currentUserPermissions.hasInheritExtrasMarker) continue;
        if (
          db.userPermissionsMirrorTeamSnapshot(
            currentUserPermissions.pageIds,
            previousRolePermissions,
          )
        ) {
          await db.setUserPermissions(user.id, nextRolePermissions, {
            emptyMode: "inherit",
          });
          continue;
        }

        // Preserve custom explicit overrides, but backfill newly introduced role pages
        // so newly added screens (e.g., accounting/stockroom) start working immediately.
        if (newlyAddedRoleBases.length > 0) {
          const merged = db.normalizePermissionList([
            ...currentUserPermissions.pageIds,
            ...newlyAddedRoleBases,
          ]);
          await db.setUserPermissions(user.id, merged, {
            emptyMode: "explicit",
            nonEmptyMode: "replace",
          });
        }
      }
      await db.logAuditEvent(
        ctx.user.id,
        "SET_TEAM_PERMISSIONS",
        "systemSetting",
        0,
        {
          roles: Object.keys(input),
        },
      );
      return { success: true };
    }),

  setUserPermissions: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        pageIds: z.array(z.string()),
        /** Empty list: inherit live role (clear overrides) vs explicit deny-all */
        whenEmpty: z.enum(["inherit", "explicit_deny"]).optional(),
        /** Non-empty: full replace vs extras merged with live role */
        nonEmptyStorage: z.enum(["replace", "inherit_extras"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const normalized = db.normalizePermissionList(input.pageIds);

      if (normalized.length === 0) {
        const whenEmpty = input.whenEmpty ?? "explicit_deny";
        await db.setUserPermissions(input.userId, [], {
          emptyMode: whenEmpty === "inherit" ? "inherit" : "explicit",
        });
      } else {
        await db.setUserPermissions(input.userId, normalized, {
          emptyMode: "explicit",
          nonEmptyMode: input.nonEmptyStorage ?? "replace",
        });
      }
      await db.logAuditEvent(
        ctx.user.id,
        "SET_USER_PERMISSIONS",
        "user",
        input.userId,
        { count: normalized.length },
      );
      return { success: true };
    }),

  populatePatientNamesFromSheets: adminProcedure.mutation(async ({ ctx }) => {
    const result = await db.populatePatientNamesFromSheets();
    await db.logAuditEvent(ctx.user.id, "POPULATE_PATIENT_NAMES", "system", 0, {
      updated: result.updated,
    });
    return result;
  }),

  debugTodayPatients: adminProcedure.query(async () => {
    const result = await db.getTodayPatientsBySheet("2026-04-03");
    const totalWithoutName = result.groups.reduce(
      (sum, g) =>
        sum +
        g.patients.filter((p) => !p.fullName || !String(p.fullName).trim())
          .length,
      0,
    );
    const totalWithName = result.groups.reduce(
      (sum, g) =>
        sum +
        g.patients.filter((p) => p.fullName && String(p.fullName).trim())
          .length,
      0,
    );

    return {
      total: result.total,
      totalWithName,
      totalWithoutName,
      samplePatients: result.groups[0]?.patients?.slice(0, 3) || [],
    };
  }),

  getPatientMedicalStatusBatch: protectedProcedure
    .input(
      z.object({ patientIds: z.array(z.number().int().positive()).max(500) }),
    )
    .query(async ({ input }) => {
      const ids = input.patientIds;
      if (ids.length === 0)
        return {} as Record<
          number,
          {
            autoref: boolean;
            afterRef: boolean;
            glasses: boolean;
            pentacam: boolean;
            prescription: boolean;
            tests: boolean;
            reports: boolean;
          }
        >;

      const dbInstance = await db.getDb();
      if (!dbInstance)
        return {} as Record<
          number,
          {
            autoref: boolean;
            afterRef: boolean;
            glasses: boolean;
            pentacam: boolean;
            prescription: boolean;
            tests: boolean;
            reports: boolean;
          }
        >;

      const [
        autorefRows,
        afterRefRows,
        glassesRows,
        pentacamRows,
        prescriptionRows,
        testRows,
        reportRows,
      ] = await Promise.all([
        dbInstance
          .selectDistinct({ patientId: autorefractometryData.patientId })
          .from(autorefractometryData)
          .where(inArray(autorefractometryData.patientId, ids)),
        dbInstance
          .selectDistinct({ patientId: afterRefractionData.patientId })
          .from(afterRefractionData)
          .where(inArray(afterRefractionData.patientId, ids)),
        dbInstance
          .selectDistinct({ patientId: glassesRecords.patientId })
          .from(glassesRecords)
          .where(inArray(glassesRecords.patientId, ids)),
        dbInstance
          .selectDistinct({ patientId: pentacamResults.patientId })
          .from(pentacamResults)
          .where(inArray(pentacamResults.patientId, ids)),
        dbInstance
          .selectDistinct({ patientId: prescriptions.patientId })
          .from(prescriptions)
          .where(inArray(prescriptions.patientId, ids)),
        dbInstance
          .selectDistinct({ patientId: testRequests.patientId })
          .from(testRequests)
          .where(inArray(testRequests.patientId, ids)),
        dbInstance
          .selectDistinct({ patientId: doctorReports.patientId })
          .from(doctorReports)
          .where(inArray(doctorReports.patientId, ids)),
      ]);

      const withAutoref = new Set(autorefRows.map((r) => r.patientId));
      const withAfterRef = new Set(afterRefRows.map((r) => r.patientId));
      const withGlasses = new Set(glassesRows.map((r) => r.patientId));
      const withPentacam = new Set(pentacamRows.map((r) => r.patientId));
      const withPrescription = new Set(
        prescriptionRows.map((r) => r.patientId),
      );
      const withTests = new Set(testRows.map((r) => r.patientId));
      const withReports = new Set(reportRows.map((r) => r.patientId));

      const result: Record<
        number,
        {
          autoref: boolean;
          afterRef: boolean;
          glasses: boolean;
          pentacam: boolean;
          prescription: boolean;
          tests: boolean;
          reports: boolean;
        }
      > = {};
      for (const id of ids) {
        result[id] = {
          autoref: withAutoref.has(id),
          afterRef: withAfterRef.has(id),
          glasses: withGlasses.has(id),
          pentacam: withPentacam.has(id),
          prescription: withPrescription.has(id),
          tests: withTests.has(id),
          reports: withReports.has(id),
        };
      }
      return result;
    }),

  createDoctorReport: medicalStaffProcedure
    .input(
      z.object({
        visitId: z.number(),
        patientId: z.number(),
        diagnosis: z.string(),
        clinicalOpinion: z.string().optional(),
        recommendedTreatment: z.string().optional(),
        surgeryType: z.string().optional(),
        surgeryScheduledDate: z.string().optional(),
        additionalNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createDoctorReport({
          ...input,
          doctorId: ctx.user.id,
          surgeryScheduledDate: input.surgeryScheduledDate
            ? new Date(input.surgeryScheduledDate)
            : null,
        });

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_DOCTOR_REPORT",
          "doctorReport",
          0,
          { message: `Created doctor report for patient ${input.patientId}` },
        );

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create doctor report: ${error}`);
      }
    }),

  updateDoctorReport: medicalStaffProcedure
    .input(
      z.object({
        reportId: z.number(),
        diagnosis: z.string().optional(),
        clinicalOpinion: z.string().optional(),
        recommendedTreatment: z.string().optional(),
        surgeryType: z.string().optional(),
        surgeryScheduledDate: z.string().optional(),
        additionalNotes: z.string().optional(),
        diseases: z.array(z.any()).optional(),
        prescription: z.string().optional(),
        recommendations: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { reportId, diseases, ...updates } = input;
        const updateData = { ...updates };

        // Convert diseases array to JSON string if provided
        if (diseases) {
          updateData.additionalNotes = JSON.stringify(diseases);
        }

        // Convert surgeryScheduledDate to Date if provided
        if (updates.surgeryScheduledDate) {
          updateData.surgeryScheduledDate = new Date(
            updates.surgeryScheduledDate,
          ).toISOString();
        }

        await db.updateDoctorReport(reportId, updateData);
        await db.logAuditEvent(
          ctx.user.id,
          "UPDATE_DOCTOR_REPORT",
          "doctorReport",
          reportId,
          { message: `Updated doctor report` },
        );

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to update doctor report: ${error}`);
      }
    }),

  getDoctorReportsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getDoctorReportsByVisit(input.visitId);
    }),

  getMedicalReportsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getDoctorReportsByPatient(input.patientId);
    }),

  getMedicalReportsOverview: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(500).optional() }).optional(),
    )
    .query(async ({ input }) => {
      return await db.getMedicalReportsOverviewRows(input?.limit ?? 250);
    }),

  getDoctorReports: protectedProcedure.query(async () => {
    return await db.getAllDoctorReports();
  }),

  createMedicalReport: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitDate: z.string().optional(),
        diagnosis: z.string(),
        diseases: z.array(z.string()).optional(),
        prescription: z.string().optional(),
        clinicalOpinion: z.string().optional(),
        surgeryType: z.string().optional(),
        operationType: z.string().optional(),
        treatment: z.string().optional(),
        recommendations: z.string().optional(),
        additionalNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.createDoctorReport({
        visitId: 0,
        patientId: input.patientId,
        doctorId: ctx.user.id,
        diagnosis: input.diagnosis,
        diseases: input.diseases ? JSON.stringify(input.diseases) : null,
        treatment: input.prescription || input.treatment || "",
        recommendations: input.recommendations || "",
        visitDate: input.visitDate
          ? (() => {
              const [year, month, day] = input.visitDate.split("-");
              return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
              );
            })()
          : null,
        operationType: input.operationType || input.surgeryType || null,
        clinicalOpinion: input.clinicalOpinion || null,
        additionalNotes: input.additionalNotes || null,
        followUpDate: new Date(),
      });
      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_MEDICAL_REPORT",
        "doctorReport",
        0,
        { message: "Created medical report" },
      );
      return { success: true };
    }),

  updateMedicalReport: medicalStaffProcedure
    .input(
      z.object({
        reportId: z.number(),
        visitDate: z.string().optional(),
        diagnosis: z.string().optional(),
        diseases: z.array(z.string()).optional(),
        prescription: z.string().optional(),
        clinicalOpinion: z.string().optional(),
        operationType: z.string().optional(),
        recommendations: z.string().optional(),
        additionalNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateDoctorReport(input.reportId, {
        visitDate: input.visitDate
          ? (() => {
              const [year, month, day] = input.visitDate.split("-");
              return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
              );
            })()
          : null,
        diagnosis: input.diagnosis ?? null,
        diseases: input.diseases ? JSON.stringify(input.diseases) : null,
        treatment: input.prescription ?? null,
        recommendations: input.recommendations ?? null,
        clinicalOpinion: input.clinicalOpinion ?? null,
        operationType: input.operationType ?? null,
        additionalNotes: input.additionalNotes ?? null,
      });
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_MEDICAL_REPORT",
        "doctorReport",
        input.reportId,
        { message: "Updated medical report" },
      );
      return { success: true };
    }),

  deleteMedicalReport: managerProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteDoctorReport(input.reportId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_MEDICAL_REPORT",
        "doctorReport",
        input.reportId,
        { message: "Deleted medical report" },
      );
      return { success: true };
    }),

  getAuditLogs: managerProcedure
    .input(
      z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input }) => {
      return await db.getAuditLogs(input.limit);
    }),

  getOperationList: protectedProcedure
    .input(
      z.object({
        doctorTab: z.string(),
        listDate: z.string(),
        operationType: z.string().optional().nullable(),
      }),
    )
    .query(async ({ input }) => {
      if (!input.listDate) {
        return { id: null, items: [] as any[] };
      }
      return await db.getOperationList(
        input.doctorTab,
        input.listDate,
        input.operationType ?? null,
      );
    }),

  getOperationListById: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .query(async ({ input }) => {
      return await db.getOperationListById(input.listId);
    }),

  saveOperationList: protectedProcedure
    .input(
      z.object({
        listId: z.number().optional().nullable(),
        doctorTab: z.string(),
        listDate: z.string(),
        operationType: z.string().optional().nullable(),
        doctorName: z.string().optional().nullable(),
        listTime: z.string().optional().nullable(),
        items: z.array(
          z.object({
            number: z.string().optional(),
            name: z.string(),
            phone: z.string().optional(),
            doctor: z.string().optional(),
            operation: z.string().optional(),
            eye: z.string().optional(),
            center: z.boolean().optional(),
            payment: z.string().optional(),
            hospital: z.string().optional(),
            code: z.string().optional(),
            discountType: z.string().optional(),
            discountValue: z.number().optional(),
            notes: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.saveOperationList({
        listId: input.listId ?? null,
        doctorTab: input.doctorTab,
        listDate: input.listDate,
        operationType: input.operationType ?? null,
        doctorName: input.doctorName ?? null,
        listTime: input.listTime ?? null,
        items: input.items,
      });
      await db.logAuditEvent(
        ctx.user.id,
        "SAVE_OPERATION_LIST",
        "operationList",
        0,
        { message: `Saved operation list for ${input.doctorTab}` },
      );

      // Send notifications for operation lists
      const notificationSettings = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );

      if (notificationSettings.operations.enabled) {
        const opsTargetUserIds =
          notificationSettings.operations.userIds.length > 0
            ? notificationSettings.operations.userIds
            : null;
        const opsCaseCount = input.items?.length ?? 0;
        const opsDate = new Date(`${input.listDate}T00:00:00`);
        const opsDay = opsDate.toLocaleDateString("ar-EG", {
          timeZone: "Africa/Cairo",
          weekday: "long",
        });
        const opsTimeRaw = String(input.listTime ?? "").trim();
        const opsTime = opsTimeRaw
          ? (() => {
              const [h, m] = opsTimeRaw.split(":").map(Number);
              const ampm = h < 12 ? "ص" : "م";
              return `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
            })()
          : new Date().toLocaleTimeString("ar-EG", {
              timeZone: "Africa/Cairo",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
        const rawOpsDrName =
          String(input.doctorName ?? "").trim() ||
          (input.doctorTab.includes("saadany")
            ? "سعدني"
            : input.doctorTab.includes("sawaf")
              ? "صواف"
              : input.doctorTab);
        const opsDoctorName =
          rawOpsDrName.replace(/^د[./]?\s*/u, "").trim() || rawOpsDrName;
        const opsNotifText = `عمليات د. ${opsDoctorName} - ${opsCaseCount} حالة - ${opsDay} ${opsTime}`;

        await pushAppNotification({
          title: opsNotifText,
          message: opsNotifText,
          kind: "info",
          targetUserIds: opsTargetUserIds,
          source: "operation_list_save",
          entityType: "operationList",
          meta: {
            doctorTab: input.doctorTab,
            listDate: input.listDate,
            itemCount: input.items?.length ?? 0,
          },
          channels: {
            inApp: notificationSettings.operations.inApp,
            push: notificationSettings.operations.push,
          },
        });
      }

      return { success: true };
    }),

  getOperationListsHistory: protectedProcedure.query(async () => {
    return await db.getOperationListsHistoryWithItems();
  }),

  getTodayOperationLists: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input }) => {
      const date = input.date || new Date().toISOString().split("T")[0];
      const [manualLists, bookings] = await Promise.all([
        db.getOperationListsByDate(date),
        db.getTodayOperationBookingsGrouped(date),
      ]);

      const mappedBookings = bookings.map((b, i) => ({
        id: -(i + 1), // unique negative id for UI keys
        doctorName: b.doctorName,
        operationType: b.operationType,
        listTime: null,
        isBooking: true, // mark for frontend differentiation if needed
        items: [
          {
            id: -(i + 1),
            name: `حجز مسبق (${b.totalCount} حالة)`,
            doctor: b.doctorName,
            operation: b.operationType,
            casesCount: b.totalCount,
          },
        ],
      }));

      return [...manualLists, ...mappedBookings];
    }),

  deleteOperationList: protectedProcedure
    .input(
      z.object({
        doctorTab: z.string(),
        listDate: z.string(),
        operationType: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.deleteOperationList(input.doctorTab, input.listDate);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_OPERATION_LIST",
        "operationList",
        0,
        { message: `Deleted operation list for ${input.doctorTab}` },
      );
      return { success: true };
    }),

  deleteOperationListById: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteOperationListById(input.listId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_OPERATION_LIST",
        "operationList",
        input.listId,
        { message: "Deleted operation list by id" },
      );
      return { success: true };
    }),

  getOperationBookings: protectedProcedure
    .input(
      z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const today = new Date().toISOString().split("T")[0];
      const bookings = await db.getOperationBookingsByDateRange(
        input.fromDate ?? today,
        input.toDate ?? input.fromDate ?? today,
      );
      return bookings.map((b) => ({
        ...b,
        bookingDate:
          b.bookingDate instanceof Date
            ? b.bookingDate.toISOString().split("T")[0]
            : String(b.bookingDate),
      }));
    }),

  createOperationBooking: protectedProcedure
    .input(
      z.object({
        bookingDate: z.string(),
        bookingTime: z.string(),
        doctorName: z.string(),
        operationType: z.string(),
        casesCount: z.number().int().min(1),
        weekdayLabel: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const booking = await db.createOperationBooking(input as any);
      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_OPERATION_BOOKING",
        "operationBooking",
        booking.id,
        {
          bookingDate: input.bookingDate,
          doctorName: input.doctorName,
        },
      );

      const notificationSettings = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );

      if (notificationSettings.operations.enabled) {
        const bkTargetUserIds =
          notificationSettings.operations.userIds.length > 0
            ? notificationSettings.operations.userIds
            : null;
        const rawBkDrName = String(input.doctorName ?? "").trim();
        const bkDoctorName =
          rawBkDrName.replace(/^د[./]?\s*/u, "").trim() || rawBkDrName;
        const bkCaseCount = Math.max(
          1,
          Math.trunc(Number(input.casesCount) || 1),
        );
        const bkDate = new Date(`${input.bookingDate}T00:00:00`);
        const bkDay = bkDate.toLocaleDateString("ar-EG", {
          timeZone: "Africa/Cairo",
          weekday: "long",
        });
        const bkTimeRaw = String(input.bookingTime ?? "").trim();
        const bkTime = bkTimeRaw
          ? (() => {
              const [h, m] = bkTimeRaw.split(":").map(Number);
              const ampm = h < 12 ? "ص" : "م";
              return `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
            })()
          : new Date().toLocaleTimeString("ar-EG", {
              timeZone: "Africa/Cairo",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
        const bkNotifText = `عمليات د. ${bkDoctorName} - ${bkCaseCount} حالة - ${bkDay} ${bkTime}`;

        await pushAppNotification({
          title: bkNotifText,
          message: bkNotifText,
          kind: "success",
          targetUserIds: bkTargetUserIds,
          source: "operation_booking_create",
          entityType: "operationBooking",
          entityId: booking.id,
          meta: {
            type: "operation_booking",
            path: "/operations",
            doctorName: bkDoctorName || null,
            casesCount: bkCaseCount,
          },
          channels: {
            inApp: notificationSettings.operations.inApp,
            push: notificationSettings.operations.push,
          },
        }).catch((error) => {
          console.warn(
            "[operation-booking] Failed to append app notification:",
            error,
          );
        });
      }

      return { success: true, id: booking.id };
    }),

  updateOperationBooking: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        bookingDate: z.string().optional(),
        bookingTime: z.string().optional(),
        doctorName: z.string().optional(),
        operationType: z.string().optional(),
        casesCount: z.number().int().min(1).optional(),
        weekdayLabel: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      await db.updateOperationBooking(id, updates as any);
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_OPERATION_BOOKING",
        "operationBooking",
        id,
        {
          updates: Object.keys(updates),
        },
      );
      return { success: true };
    }),

  deleteOperationBooking: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteOperationBooking(input.id);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_OPERATION_BOOKING",
        "operationBooking",
        input.id,
        {},
      );
      return { success: true };
    }),

  getUserPageState: protectedProcedure
    .input(z.object({ page: z.string() }))
    .query(async ({ input, ctx }) => {
      return await db.getUserPageState(ctx.user.id, input.page);
    }),

  saveUserPageState: protectedProcedure
    .input(z.object({ page: z.string(), data: z.any() }))
    .mutation(async ({ input, ctx }) => {
      await db.upsertUserPageState(ctx.user.id, input.page, input.data);
      return { success: true };
    }),

  getPatientPageState: protectedProcedure
    .input(z.object({ patientId: z.number(), page: z.string() }))
    .query(async ({ input }) => {
      return await db.getPatientPageState(input.patientId, input.page);
    }),

  saveExaminationChecklist: protectedProcedure
    .input(
      z.object({
        examinationId: z.number().int().positive(),
        patientId: z.number().int().positive(),
        checklist: z.object({
          generalDiseases: z.boolean().optional(),
          pregnancyOrLactation: z.boolean().optional(),
          usesAllergySupplementsSteroidsOrPressureMeds: z.boolean().optional(),
          acneTreatment: z.boolean().optional(),
          familyKeratoconus: z.boolean().optional(),
          usesTearSubstituteOrExcessTearsOrSandySensation: z
            .boolean()
            .optional(),
          symptomsWorseWithAirOrAC: z.boolean().optional(),
          glaucomaTreatment: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      await db.upsertExaminationChecklist({
        examinationId: input.examinationId,
        patientId: input.patientId,
        checklist: input.checklist,
      });
      return { success: true };
    }),

  getExaminationChecklist: protectedProcedure
    .input(
      z.object({
        examinationId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getExaminationChecklistByExaminationId(
        input.examinationId,
      );
    }),

  savePatientPageState: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        page: z.string(),
        data: z
          .object({
            sheetSelection: z.string().optional(),
            visitDate: z.string().optional(),
            isFollowup: z.boolean().optional(),
            activeTab: z.union([z.number(), z.string()]).optional(),
            unsavedDraft: z.record(z.string(), z.any()).optional(),
            syncLockManual: z.boolean().optional(),
            // Allow other fields for different pages (patient-details, request-tests, etc)
          })
          .catchall(z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      await db.upsertPatientPageState(input.patientId, input.page, input.data);
      return { success: true };
    }),

  getReadyTemplateOverrides: protectedProcedure
    .input(z.object({ scope: readyTemplateScopeSchema }))
    .query(async ({ input }) => {
      const row = await db.getSystemSetting("ready_template_overrides");
      if (!row?.value) return {};
      try {
        const parsed = JSON.parse(row.value);
        const byScope =
          parsed && typeof parsed === "object"
            ? (parsed as Record<string, any>)
            : {};
        const scopeValue = byScope[input.scope];
        return scopeValue && typeof scopeValue === "object" ? scopeValue : {};
      } catch {
        return {};
      }
    }),

  upsertReadyTemplateOverride: protectedProcedure
    .input(readyTemplateOverrideUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const row = await db.getSystemSetting("ready_template_overrides");
      let parsed: Record<string, any> = {};
      if (row?.value) {
        try {
          const raw = JSON.parse(row.value);
          if (raw && typeof raw === "object")
            parsed = raw as Record<string, any>;
        } catch {
          parsed = {};
        }
      }
      const scopeMap =
        parsed[input.scope] && typeof parsed[input.scope] === "object"
          ? { ...(parsed[input.scope] as Record<string, any>) }
          : {};
      const existing =
        scopeMap[input.templateId] &&
        typeof scopeMap[input.templateId] === "object"
          ? { ...(scopeMap[input.templateId] as Record<string, any>) }
          : {};

      const hasItemsUpdate =
        "testItems" in input || "prescriptionItems" in input;
      const hasNameUpdate = "name" in input;
      const incomingName = String(input.name ?? "").trim();
      const incomingTestItems = Array.isArray(input.testItems)
        ? input.testItems
        : undefined;
      const incomingPrescriptionItems = Array.isArray(input.prescriptionItems)
        ? input.prescriptionItems
        : undefined;
      const shouldDelete =
        hasNameUpdate &&
        hasItemsUpdate &&
        !incomingName &&
        (incomingTestItems?.length ??
          incomingPrescriptionItems?.length ??
          0) === 0;

      if (shouldDelete) {
        delete scopeMap[input.templateId];
      } else {
        const next = { ...existing };
        if (hasNameUpdate) next.name = incomingName;
        if (incomingTestItems !== undefined) next.testItems = incomingTestItems;
        if (incomingPrescriptionItems !== undefined)
          next.prescriptionItems = incomingPrescriptionItems;
        scopeMap[input.templateId] = next;
      }

      parsed[input.scope] = scopeMap;
      await db.updateSystemSettings("ready_template_overrides", parsed);
      await db.logAuditEvent(
        ctx.user.id,
        "UPSERT_READY_TEMPLATE_OVERRIDE",
        "systemSetting",
        0,
        {
          scope: input.scope,
          templateId: input.templateId,
        },
      );
      return { success: true };
    }),

  importReadyTemplateOverrides: protectedProcedure
    .input(readyTemplateOverrideImportSchema)
    .mutation(async ({ input, ctx }) => {
      await assertReadyTemplateImportPermission(ctx, input.scope);
      const row = await db.getSystemSetting("ready_template_overrides");
      let parsed: Record<string, any> = {};
      if (row?.value) {
        try {
          const raw = JSON.parse(row.value);
          if (raw && typeof raw === "object")
            parsed = raw as Record<string, any>;
        } catch {
          parsed = {};
        }
      }
      const scopeMap: Record<string, any> = {};
      for (const template of input.templates) {
        scopeMap[template.templateId] = {
          ...(template.name !== undefined
            ? { name: String(template.name ?? "").trim() }
            : {}),
          ...(template.testItems !== undefined
            ? { testItems: template.testItems }
            : {}),
          ...(template.prescriptionItems !== undefined
            ? { prescriptionItems: template.prescriptionItems }
            : {}),
        };
      }
      parsed[input.scope] = scopeMap;
      await db.updateSystemSettings("ready_template_overrides", parsed);
      await db.logAuditEvent(
        ctx.user.id,
        "IMPORT_READY_TEMPLATE_OVERRIDES",
        "systemSetting",
        0,
        {
          scope: input.scope,
          count: input.templates.length,
        },
      );
      return { success: true };
    }),

  importReadyTemplateOverridesFromFile: protectedProcedure
    .input(
      z.object({
        scope: readyTemplateScopeSchema,
        filePath: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await assertReadyTemplateImportPermission(ctx, input.scope);
        const resolvedPath = path.resolve(input.filePath);
        const stats = await stat(resolvedPath).catch(() => null);
        if (!stats || !stats.isFile()) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found.",
          });
        }
        if (!/\.xlsx?$/i.test(resolvedPath)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only .xlsx/.xls files are supported.",
          });
        }
        if (stats.size > 20 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File is too large.",
          });
        }

        const templates =
          input.scope === "prescription"
            ? await readReadyPrescriptionTemplatesFromFile(resolvedPath)
            : await readReadyTestTemplatesFromFile(
                resolvedPath,
                (await db.getAllTests()).map((test) => ({
                  id: Number(test.id),
                  name: String(test.name ?? ""),
                })),
              );
        if (templates.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No valid templates found in file.",
          });
        }

        const row = await db.getSystemSetting("ready_template_overrides");
        let parsed: Record<string, any> = {};
        if (row?.value) {
          try {
            const raw = JSON.parse(row.value);
            if (raw && typeof raw === "object")
              parsed = raw as Record<string, any>;
          } catch {
            parsed = {};
          }
        }

        const scopeMap: Record<string, any> = {};
        for (const template of templates) {
          scopeMap[template.templateId] = {
            ...(template.name !== undefined
              ? { name: String(template.name ?? "").trim() }
              : {}),
            ...(input.scope === "prescription"
              ? { prescriptionItems: (template as any).prescriptionItems ?? [] }
              : { testItems: (template as any).testItems ?? [] }),
          };
        }

        parsed[input.scope] = scopeMap;
        await db.updateSystemSettings("ready_template_overrides", parsed);
        await db.logAuditEvent(
          ctx.user.id,
          "IMPORT_READY_TEMPLATE_OVERRIDES",
          "systemSetting",
          0,
          {
            scope: input.scope,
            count: templates.length,
            filePath: resolvedPath,
          },
        );
        return { success: true, count: templates.length };
      } catch (error) {
        console.error("[importReadyTemplateOverridesFromFile] failed", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to import templates from file.",
        });
      }
    }),

  getSystemSetting: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (
        input.key === "appointments_pricing_v1" &&
        String(ctx.user.role ?? "").toLowerCase() !== "admin"
      ) {
        const role = String(ctx.user.role ?? "").toLowerCase();
        if (role !== "accountant") {
          const permissions = await db.getEffectiveUserPermissions(
            ctx.user.id,
            ctx.user.role ?? undefined,
          );
          const canReadPricing =
            permissions.includes("appointments_pricing_v1") ||
            permissions.includes("/admin/settings/pricing-rules") ||
            permissions.includes("/appointments/accounts");
          if (!canReadPricing) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No permission to read appointments pricing.",
            });
          }
        }
      }
      const row = await db.getSystemSetting(input.key).catch((error) => {
        console.warn(
          `[medical.getSystemSetting] fallback for ${input.key}`,
          error,
        );
        return null;
      });
      if (!row) {
        const fallback = getSystemSettingFallbackValue(input.key);
        return fallback === null
          ? null
          : {
              key: input.key,
              value: fallback,
              updatedAt: null,
            };
      }
      try {
        return {
          key: row.key,
          value: row.value ? JSON.parse(row.value) : null,
          updatedAt: row.updatedAt,
        };
      } catch {
        return {
          key: row.key,
          value: row.value,
          updatedAt: row.updatedAt,
        };
      }
    }),

  registerPushDeviceToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(20),
        platform: z.enum(["android", "ios", "web"]),
        deviceId: z.string().min(1).max(191),
        appVersion: z.string().max(64).optional(),
        build: z.string().max(64).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const registrationId = await db.upsertPushDeviceRegistration({
        userId: ctx.user.id,
        provider: "fcm",
        platform: input.platform,
        token: input.token,
        deviceId: input.deviceId,
        appVersion: input.appVersion,
        build: input.build,
      });
      return { success: true, registrationId };
    }),

  unregisterPushDeviceToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(20),
      }),
    )
    .mutation(async ({ input }) => {
      await db.deletePushDeviceToken(input.token);
      return { success: true };
    }),

  updateSystemSetting: adminProcedure
    .input(z.object({ key: z.string().min(1), value: z.any() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateSystemSettings(input.key, input.value);
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_SYSTEM_SETTING",
        "systemSetting",
        0,
        {
          key: input.key,
        },
      );
      return { success: true };
    }),

  getDoctorDirectory: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    const rows = await dbInstance
      .select({
        id: doctorsLookup.id,
        code: doctorsLookup.code,
        name: doctorsLookup.name,
        isActive: doctorsLookup.isActive,
        locationType: doctorsLookup.locationType,
        doctorType: doctorsLookup.doctorType,
      })
      .from(doctorsLookup)
      .orderBy(asc(doctorsLookup.code));
    return rows.map((doctor) => ({
      id: doctor.id,
      code: decodeMojibake(String(doctor.code ?? "")),
      name: decodeMojibake(String(doctor.name ?? "")),
      isActive: Boolean(doctor.isActive),
      locationType: String(doctor.locationType ?? "center") as
        | "center"
        | "external",
      doctorType: String(doctor.doctorType ?? "consultant") as
        | "consultant"
        | "specialist"
        | "external",
    }));
  }),

  updateDoctorDirectory: adminProcedure
    .input(z.object({ doctors: z.array(doctorDirectoryEntrySchema) }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (dbInstance) {
        for (const doctor of input.doctors) {
          await dbInstance
            .insert(doctorsLookup)
            .values({
              id: doctor.id,
              code: doctor.code,
              name: doctor.name,
              isActive: doctor.isActive ? 1 : 0,
              locationType: doctor.locationType,
              doctorType: doctor.doctorType,
            })
            .onDuplicateKeyUpdate({
              set: {
                code: doctor.code,
                name: doctor.name,
                isActive: doctor.isActive ? 1 : 0,
                locationType: doctor.locationType,
                doctorType: doctor.doctorType,
              },
            });
        }
      }
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_DOCTOR_DIRECTORY",
        "doctors",
        0,
        {
          count: input.doctors.length,
        },
      );
      return { success: true };
    }),

  getServiceDirectory: protectedProcedure.query(async () => {
    const row = await db.getSystemSetting("service_directory");
    if (!row?.value)
      return [] as Array<z.infer<typeof serviceDirectoryEntrySchema>>;
    try {
      const parsed = JSON.parse(row.value);
      const normalized = z.array(serviceDirectoryEntrySchema).safeParse(parsed);
      if (!normalized.success)
        return [] as Array<z.infer<typeof serviceDirectoryEntrySchema>>;
      return normalized.data.map((entry) => ({
        ...entry,
        defaultSheet: normalizeServiceDefaultSheet(
          entry.defaultSheet ?? entry.serviceType,
          entry.serviceType,
        ),
        srvTyp: inferSrvTyp(entry),
        code: decodeMojibake(entry.code),
        name: decodeMojibake(entry.name),
      }));
    } catch {
      return [] as Array<z.infer<typeof serviceDirectoryEntrySchema>>;
    }
  }),

  getServicesCatalog: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) return [];
    const result = await dbInstance
      .select({
        id: services.id,
        code: services.code,
        name: services.name,
        price: services.price,
        serviceType: services.serviceType,
        category: services.category,
      })
      .from(services)
      .where(eq(services.isActive, true));
    return result.map((s: any) => ({
      ...s,
      price: Number(s.price ?? 0),
      code: decodeMojibake(String(s.code)),
      name: decodeMojibake(String(s.name)),
    }));
  }),

  updateServiceDirectory: adminProcedure
    .input(z.object({ services: z.array(serviceDirectoryEntrySchema) }))
    .mutation(async ({ input, ctx }) => {
      await db.updateSystemSettings("service_directory", input.services);
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_SERVICE_DIRECTORY",
        "systemSetting",
        0,
        {
          count: input.services.length,
        },
      );
      return { success: true };
    }),
};
