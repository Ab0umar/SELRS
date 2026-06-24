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
import { assertPentacamViewPermission } from "./_medical/service-helpers";
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

import { buildFailedPentacamGroupKey, buildFailedPentacamGroupLabel, buildPentacamNameKeys, buildPentacamObjectUrl, buildPentacamPatientCandidates, buildPentacamPatientKey, buildPentacamPatientPrefix, buildPentacamTokenSignatureSet, expandPentacamDashboardRows, extractPatientCodeCandidatesFromFileName, extractPentacamNameFragment, extractPentacamPageType, inferPentacamCapturedAtFromName, inferPentacamEyeSideFromName, inferPentacamMimeType, listFailedPentacamRows, moveFailedPentacamFile, movePentacamObjectToPatient, normalizePentacamKey, normalizePentacamMatchText, normalizePentacamPhoneticToken, parsePentacamLocalMeta, pathExists, pentacamEyeHasAnyData, pentacamEyeIsComplete, previewFailedPentacamRenameTargets, reorderPatientNameSecondThirdFirst, resolvePatientForPentacamFileName, resolvePentacamSourceKeyCandidates, sanitizeLabel, scanMismatchedLocalPentacamLinks, stripLeadingCodeLabel, suggestPatientsForPentacamFileName, tokenizePentacamMatchText, assertSafePentacamFileName, nextAvailablePentacamPath } from "./_medical/pentacam-helpers";

export const medicalPentacamRoutes = {
  updatePentacamResult: medicalStaffProcedure
    .input(
      z.object({
        visitId: z.number(),
        patientId: z.number(),
        pentacamId: z.number().optional(), // If updating existing
        k1OD: z.string().optional(),
        k2OD: z.string().optional(),
        axisOD: z.string().optional(),
        thinnestPointOD: z.string().optional(),
        apexOD: z.string().optional(),
        residualOD: z.string().optional(),
        tttOD: z.string().optional(),
        ablationOD: z.string().optional(),
        k1OS: z.string().optional(),
        k2OS: z.string().optional(),
        axisOS: z.string().optional(),
        thinnestPointOS: z.string().optional(),
        apexOS: z.string().optional(),
        residualOS: z.string().optional(),
        tttOS: z.string().optional(),
        ablationOS: z.string().optional(),
        techniciansNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { pentacamId, visitId, patientId, ...data } = input;

        if (pentacamId) {
          // Update existing pentacam record
          await db.updatePentacamResult(pentacamId, {
            ...data,
            recordedBy: ctx.user.id,
          });

          await db.logAuditEvent(
            ctx.user.id,
            "UPDATE_PENTACAM",
            "pentacamResult",
            pentacamId,
            { message: `Updated pentacam results` },
          );
        } else {
          // Create new pentacam record
          await db.createPentacamResult({
            visitId,
            patientId,
            recordedBy: ctx.user.id,
            ...data,
          });

          await db.logAuditEvent(
            ctx.user.id,
            "CREATE_PENTACAM",
            "pentacamResult",
            0,
            { message: `Created pentacam results for patient ${patientId}` },
          );
        }

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to save pentacam result: ${error}`);
      }
    }),

  getPentacamResultsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertPentacamViewPermission(ctx.user);
      return await db.getPentacamResultsByVisit(input.visitId);
    }),

  listPentacamDashboard: protectedProcedure
    .input(
      z.object({
        resultId: z.number().int().positive().optional(),
        visitId: z.number().int().nonnegative().optional(),
        patientId: z.number().int().positive().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        search: z.string().optional(),
        locationType: z.enum(["center", "external"]).optional(),
        eye: z.enum(["all", "OD", "OS"]).optional(),
        quality: z.enum(["all", "accepted", "repeat"]).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await assertPentacamViewPermission(ctx.user);
      const raw = await db.getPentacamResultsForDashboard({
        resultId: input.resultId,
        visitId: input.visitId,
        patientId: input.patientId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        search: input.search,
        locationType: input.locationType,
        limit: input.limit,
        offset: input.offset,
      });
      let expanded = expandPentacamDashboardRows(raw);
      const eye = input.eye ?? "all";
      if (eye !== "all") {
        expanded = expanded.filter((r) => r.eye === eye);
      }
      const quality = input.quality ?? "all";
      if (quality !== "all") {
        expanded = expanded.filter((r) => r.quality === quality);
      }
      return { rows: expanded };
    }),

  getPentacamDashboardStats: protectedProcedure
    .input(
      z
        .object({ locationType: z.enum(["center", "external"]).optional() })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      await assertPentacamViewPermission(ctx.user);
      const days = await db.getPentacamDashboardDayStats(input?.locationType);
      const sample = await db.getPentacamResultsForDashboard({
        limit: 400,
        offset: 0,
        locationType: input?.locationType,
      });
      const expanded = expandPentacamDashboardRows(sample);
      const needsRepeatEyes = expanded.filter(
        (r) => r.quality === "repeat",
      ).length;
      return {
        examsToday: days.todayCount,
        examsYesterday: days.yesterdayCount,
        needsRepeatEyes,
      };
    }),

  getPentacamFilesByPatient: protectedProcedure
    .input(z.object({ patientId: z.number(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      await assertPentacamViewPermission(ctx.user);
      const safeLimit = Math.min(
        Number.isFinite(Number(input.limit))
          ? Math.max(1, Number(input.limit))
          : 100,
        500,
      );

      // Source 1: files moved to patient-specific prefix in S3 (via admin import flow).
      let s3Items: Array<{
        fileName: string;
        storageUrl: string;
        ts: string | null;
      }> = [];
      try {
        const prefix = buildPentacamPatientPrefix(input.patientId);
        const s3Objects = await listObjectsInS3(prefix);
        s3Items = s3Objects
          .filter((obj) => /\.(jpg|jpeg|png|webp)$/i.test(obj.key))
          .map((obj) => ({
            fileName: path.posix.basename(obj.key),
            storageUrl: `/api/pentacam/exports/file/${encodeURIComponent(obj.key)}`,
            ts: obj.lastModified?.toISOString() ?? null,
          }));
      } catch {
        /* listing failed, continue */
      }

      // Source 2: blackice_uploads rows linked to this patient (OCR-imported pentacam JPGs).
      const seenNames = new Set<string>(
        s3Items.map((r) => r.fileName.toLowerCase()),
      );
      const blackiceRows = await db.getBlackiceUploadsByPatient(
        input.patientId,
        safeLimit,
      );
      const blackiceItems = blackiceRows
        .filter((row) => {
          const name = String(row.file_name ?? "").trim();
          return (
            /\.(jpg|jpeg|png|webp)$/i.test(name) &&
            !seenNames.has(path.posix.basename(name).toLowerCase())
          );
        })
        .map((row) => {
          const fileName = path.posix.basename(
            String(row.file_name ?? "").trim(),
          );
          seenNames.add(fileName.toLowerCase());
          return {
            id: row.id,
            fileName,
            storageUrl: `/api/blackice/uploads/${row.id}`,
            mimeType:
              String(row.mime_type ?? "").trim() ||
              inferPentacamMimeType(fileName),
            ts: row.created_at ? String(row.created_at) : null,
          };
        });

      const combined = [
        ...s3Items.map((item, i) => ({
          id: i + 1,
          patientId: input.patientId,
          visitId: 0,
          eyeSide: "",
          importStatus: "imported",
          sourceFileName: item.fileName,
          storageUrl: item.storageUrl,
          mimeType: inferPentacamMimeType(item.fileName),
          capturedAt: item.ts,
          importedAt: item.ts,
        })),
        ...blackiceItems.map((item) => ({
          id: item.id,
          patientId: input.patientId,
          visitId: 0,
          eyeSide: "",
          importStatus: "imported",
          sourceFileName: item.fileName,
          storageUrl: item.storageUrl,
          mimeType: item.mimeType,
          capturedAt: item.ts,
          importedAt: item.ts,
        })),
      ];

      return combined.slice(0, safeLimit);
    }),

  getPentacamMeasurementsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      await assertPentacamViewPermission(ctx.user);
      return await db.getPentacamResultsByPatient(
        input.patientId,
        input.limit ?? 10,
      );
    }),

  debugPentacamS3: adminProcedure
    .input(z.object({ prefix: z.string().optional() }))
    .query(async ({ input }) => {
      const objects = await listObjectsInS3(String(input.prefix ?? ""));
      return objects
        .slice(0, 200)
        .map((obj) => ({ key: obj.key, size: obj.size }));
    }),

  removePentacamLink: protectedProcedure
    .input(
      z.object({
        resultId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const deleted = await db.deletePentacamResultsByIds([input.resultId]);
      await db.logAuditEvent(
        ctx.user.id,
        "REMOVE_PENTACAM_LINK",
        "pentacamResult",
        input.resultId,
        {
          deleted,
        },
      );
      return {
        success: true,
        deleted,
      };
    }),

  importLocalPentacamExports: adminProcedure
    .input(
      z.object({
        patientId: z.number().int().positive(),
        fileNames: z.array(z.string().min(1)).min(1).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const patient = await db.getPatientById(input.patientId);
      if (!patient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient not found",
        });
      }
      const requested = Array.from(
        new Set(
          input.fileNames
            .map((value) => String(value ?? "").trim())
            .filter(Boolean),
        ),
      );
      if (requested.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No files selected",
        });
      }

      const invalidPath = requested.find(
        (fileName) =>
          fileName.includes("/") ||
          fileName.includes("\\") ||
          fileName.includes(".."),
      );
      if (invalidPath) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid file name: ${invalidPath}`,
        });
      }

      let imported = 0;
      let skipped = 0;
      let missing = 0;
      for (const fileName of requested) {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
          skipped += 1;
          continue;
        }
        // Try linking via blackice_uploads first (no S3 copy needed).
        const baseName = path.posix.basename(fileName);
        const linked = await db.linkBlackiceUploadToPatient(
          baseName,
          input.patientId,
        );
        if (linked > 0) {
          imported += 1;
          continue;
        }
        // Fall back to S3 copy for legacy pentacam-exports prefix files.
        try {
          await movePentacamObjectToPatient({
            patientId: input.patientId,
            fileName,
          });
          imported += 1;
        } catch {
          missing += 1;
        }
      }

      await db.logAuditEvent(
        ctx.user.id,
        "IMPORT_LOCAL_PENTACAM_EXPORTS",
        "pentacamResult",
        input.patientId,
        {
          patientId: input.patientId,
          requested: requested.length,
          imported,
          skipped,
          missing,
        },
      );

      return {
        success: true,
        patientId: input.patientId,
        requested: requested.length,
        imported,
        skipped,
        missing,
      };
    }),

  autoImportLocalPentacamExports: adminProcedure
    .input(
      z.object({
        fileNames: z.array(z.string().min(1)).min(1).max(2000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const requested = Array.from(
        new Set(
          input.fileNames
            .map((value) => String(value ?? "").trim())
            .filter(Boolean),
        ),
      );
      if (requested.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No files selected",
        });
      }

      const invalidPath = requested.find(
        (fileName) =>
          fileName.includes("/") ||
          fileName.includes("\\") ||
          fileName.includes(".."),
      );
      if (invalidPath) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid file name: ${invalidPath}`,
        });
      }

      let skipped = 0;
      let unmatched = 0;
      const unresolvedFiles: string[] = [];
      const linkPairs: Array<{ fileName: string; patientId: number }> = [];
      const importedByPatient: Record<string, number> = {};
      const needsNameMatch: string[] = [];

      // Phase 1a: fast code extraction — avoids loading all patients for id_name.jpg format
      // Map is fileName → code (NOT code → fileName, which would drop all but one file per patient)
      const extractedCodes = new Map<string, string>(); // baseName → code
      for (const fileName of requested) {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
          skipped += 1;
          continue;
        }
        const codes = extractPatientCodeCandidatesFromFileName(fileName);
        if (codes.length > 0) {
          extractedCodes.set(path.posix.basename(fileName), codes[0]);
        } else {
          needsNameMatch.push(fileName);
        }
      }
      // Phase 1b: batch SELECT for all code-matched files in one query
      if (extractedCodes.size > 0) {
        const uniqueCodes = Array.from(new Set(extractedCodes.values()));
        const codeMap = await db.getPatientIdsByCodes(uniqueCodes);
        for (const [baseName, code] of extractedCodes) {
          const patientId = codeMap.get(code);
          if (!patientId) {
            unmatched += 1;
            if (unresolvedFiles.length < 5000) unresolvedFiles.push(baseName);
            continue;
          }
          linkPairs.push({ fileName: baseName, patientId });
          importedByPatient[String(patientId)] =
            (importedByPatient[String(patientId)] ?? 0) + 1;
        }
      }

      // Phase 1c: name matching fallback (only for files without a leading code)
      if (needsNameMatch.length > 0) {
        const matcher = await buildPentacamPatientCandidates();
        for (const fileName of needsNameMatch) {
          const matched = resolvePatientForPentacamFileName(fileName, matcher);
          if (!matched?.patient) {
            unmatched += 1;
            if (unresolvedFiles.length < 5000) unresolvedFiles.push(fileName);
            continue;
          }
          const patientId = Number((matched.patient as any)?.id ?? 0);
          if (!Number.isFinite(patientId) || patientId <= 0) {
            unmatched += 1;
            if (unresolvedFiles.length < 5000) unresolvedFiles.push(fileName);
            continue;
          }
          linkPairs.push({
            fileName: path.posix.basename(fileName),
            patientId,
          });
          importedByPatient[String(patientId)] =
            (importedByPatient[String(patientId)] ?? 0) + 1;
        }
      }

      // Phase 2: one batch DB update
      const imported =
        linkPairs.length > 0 ? await db.linkBlackiceUploadsBatch(linkPairs) : 0;
      const alreadyLinked = Math.max(0, linkPairs.length - imported);
      const missing = 0;

      await db.logAuditEvent(
        ctx.user.id,
        "AUTO_IMPORT_LOCAL_PENTACAM_EXPORTS",
        "pentacamResult",
        0,
        {
          requested: requested.length,
          imported,
          alreadyLinked,
          skipped,
          missing,
          unmatched,
        },
      );

      return {
        success: true,
        requested: requested.length,
        imported,
        alreadyLinked,
        skipped,
        missing,
        unmatched,
        importedByPatient,
        unresolvedFiles,
      };
    }),

  getUnmatchedLocalPentacamSuggestions: adminProcedure
    .input(
      z.object({
        fileNames: z.array(z.string().min(1)).min(1).max(5000),
        limitPerFile: z.number().int().min(1).max(5).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const requested = Array.from(
        new Set(
          input.fileNames
            .map((value) => String(value ?? "").trim())
            .filter(Boolean),
        ),
      );
      const matcher = await buildPentacamPatientCandidates();
      const limitPerFile = Number(input.limitPerFile ?? 3);

      const suggestions: Array<{
        fileName: string;
        candidates: Array<{
          patientId: number;
          patientCode: string;
          fullName: string;
          matchedBy: string;
          score: number;
        }>;
      }> = [];

      for (const fileName of requested) {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(fileName)) continue;
        const top = suggestPatientsForPentacamFileName(
          fileName,
          matcher,
          limitPerFile,
        );
        // Always include the file even with no candidates — manual search input must show for every unmatched file
        suggestions.push({
          fileName,
          candidates: top.map((entry) => ({
            patientId: Number((entry.patient as any)?.id ?? 0),
            patientCode: String((entry.patient as any)?.patientCode ?? ""),
            fullName: String((entry.patient as any)?.fullName ?? ""),
            matchedBy: entry.matchedBy,
            score: entry.score,
          })),
        });
      }

      return {
        success: true,
        count: suggestions.length,
        suggestions,
      };
    }),

  getMismatchedLocalPentacamLinks: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100000).optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const limit = Number(input?.limit ?? 80000);
      const rows = await scanMismatchedLocalPentacamLinks(limit);
      return {
        success: true,
        count: rows.length,
        obviousCount: rows.filter((row) => row.kind === "obvious").length,
        ambiguousCount: rows.filter((row) => row.kind === "ambiguous").length,
        rows,
      };
    }),

  listFailedPentacamFiles: adminProcedure.query(async () => {
    return await listFailedPentacamRows();
  }),

  previewFailedPentacamRename: adminProcedure
    .input(
      z.object({
        fileNames: z.array(z.string().min(1)).min(1).max(30),
        idCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const files = await previewFailedPentacamRenameTargets(
        input.fileNames,
        input.idCode,
      );
      return {
        success: true,
        count: files.length,
        files,
        duplicateCount: files.filter((item) => item.willDuplicate).length,
      };
    }),

  reviewFailedPentacamFile: adminProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        idCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const previews = await previewFailedPentacamRenameTargets(
        [input.fileName],
        input.idCode,
      );
      const preview = previews[0];
      const finalFileName = await moveFailedPentacamFile(
        input.fileName,
        preview.proposedFileName,
      );
      await db.logAuditEvent(
        ctx.user.id,
        "REVIEW_FAILED_PENTACAM_FILE",
        "pentacamResult",
        0,
        {
          fileName: input.fileName,
          idCode: input.idCode,
          finalFileName,
          duplicate: preview.willDuplicate,
        },
      );
      return {
        success: true,
        fileName: input.fileName,
        finalFileName,
      };
    }),

  reviewFailedPentacamGroup: adminProcedure
    .input(
      z.object({
        fileNames: z.array(z.string().min(1)).min(1).max(50),
        idCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const previews = await previewFailedPentacamRenameTargets(
        input.fileNames,
        input.idCode,
      );
      for (const preview of previews) {
        await moveFailedPentacamFile(
          preview.fileName,
          preview.proposedFileName,
        );
      }
      await db.logAuditEvent(
        ctx.user.id,
        "REVIEW_FAILED_PENTACAM_GROUP",
        "pentacamResult",
        0,
        {
          count: previews.length,
          idCode: input.idCode,
          files: previews.map((item) => ({
            fileName: item.fileName,
            finalFileName: item.proposedFileName,
            duplicate: item.willDuplicate,
          })),
        },
      );
      return {
        success: true,
        count: previews.length,
        idCode: input.idCode,
      };
    }),

  releaseFailedPentacamFile: adminProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const safeFileName = assertSafePentacamFileName(input.fileName);
      const finalFileName = await moveFailedPentacamFile(
        safeFileName,
        safeFileName,
      );
      await db.logAuditEvent(
        ctx.user.id,
        "RELEASE_FAILED_PENTACAM_FILE",
        "pentacamResult",
        0,
        {
          fileName: input.fileName,
          finalFileName,
        },
      );
      return {
        success: true,
        fileName: input.fileName,
        finalFileName,
      };
    }),

  retryFailedPentacamOcr: adminProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const safeFileName = assertSafePentacamFileName(input.fileName);
      const matcher = await buildPentacamPatientCandidates();
      const suggestions = suggestPatientsForPentacamFileName(
        safeFileName,
        matcher,
        3,
      );
      const topSuggestion = suggestions[0];
      const detectedId = String(
        (topSuggestion?.patient as any)?.patientCode ?? "",
      ).trim();
      const score = Number(topSuggestion?.score ?? 0);
      const topPasses = topSuggestion
        ? [
            {
              pass: topSuggestion.matchedBy,
              text: `${String((topSuggestion.patient as any)?.fullName ?? "").trim()}`,
              candidates: detectedId ? [detectedId] : [],
            },
          ]
        : [];
      await db.logAuditEvent(
        ctx.user.id,
        "RETRY_FAILED_PENTACAM_OCR",
        "pentacamResult",
        0,
        {
          fileName: input.fileName,
          detectedId,
          score,
        },
      );
      return {
        success: true,
        fileName: input.fileName,
        detectedId,
        score,
        topPasses,
      };
    }),

  unlinkMismatchedLocalPentacamLinks: adminProcedure
    .input(
      z
        .object({
          resultIds: z.array(z.number().int().positive()).optional(),
          obviousOnly: z.boolean().optional(),
          limit: z.number().int().min(1).max(100000).optional(),
        })
        .optional(),
    )
    .mutation(async ({ input, ctx }) => {
      const explicitIds = Array.isArray(input?.resultIds)
        ? input!.resultIds
        : [];
      let ids = explicitIds;
      if (ids.length === 0) {
        const scanned = await scanMismatchedLocalPentacamLinks(
          Number(input?.limit ?? 80000),
        );
        const obviousOnly = input?.obviousOnly !== false;
        ids = scanned
          .filter((row) => (obviousOnly ? row.kind === "obvious" : true))
          .map((row) => row.resultId);
      }
      const deleted = await db.unlinkBlackiceUploadsByIds(ids);
      await db.logAuditEvent(
        ctx.user.id,
        "UNLINK_MISMATCHED_LOCAL_PENTACAM",
        "pentacamResult",
        0,
        {
          requested: ids.length,
          deleted,
        },
      );
      return {
        success: true,
        requested: ids.length,
        deleted,
      };
    }),

  reassignLocalPentacamLink: adminProcedure
    .input(
      z.object({
        resultId: z.number().int().positive(),
        patientId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const patient = await db.getPatientById(input.patientId);
      if (!patient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient not found",
        });
      }
      await db.reassignBlackiceUploadPatient(input.resultId, input.patientId);
      await db.logAuditEvent(
        ctx.user.id,
        "REASSIGN_LOCAL_PENTACAM_LINK",
        "pentacamResult",
        input.resultId,
        {
          patientId: input.patientId,
        },
      );
      return {
        success: true,
        resultId: input.resultId,
        patientId: input.patientId,
      };
    }),

  searchPentacamPatients: adminProcedure
    .input(
      z.object({
        searchTerm: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const rows = await db.searchPatients(
        String(input.searchTerm ?? "").trim(),
      );
      const limit = Number(input.limit ?? 10);
      const out: Array<{
        patientId: number;
        patientCode: string;
        fullName: string;
      }> = [];
      const seen = new Set<number>();
      for (const row of rows ?? []) {
        const patientId = Number((row as any)?.id ?? 0);
        if (!Number.isFinite(patientId) || patientId <= 0) continue;
        if (seen.has(patientId)) continue;
        seen.add(patientId);
        out.push({
          patientId,
          patientCode: String((row as any)?.patientCode ?? ""),
          fullName: String((row as any)?.fullName ?? ""),
        });
        if (out.length >= limit) break;
      }
      return out;
    }),

  findDuplicateBlackiceUploads: adminProcedure.query(async () => {
    return await db.findDuplicateBlackiceUploads();
  }),

  deleteBlackiceUploadsByIds: adminProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
        deleteFromS3: z.boolean().optional(),
        deleteLocalFile: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.ids.length) return { deleted: 0, s3Deleted: 0 };

      // Fetch file info before deleting
      const rows = await db.getBlackiceUploadsByIds(input.ids);

      // Delete from S3
      let s3Deleted = 0;
      if (input.deleteFromS3) {
        for (const row of rows) {
          const key = String(row.s3_key ?? row.file_name ?? "").trim();
          if (!key) continue;
          try {
            await deleteFromS3(key);
            s3Deleted++;
          } catch {
            // best-effort
          }
        }
      }

      // Delete local file
      if (input.deleteLocalFile) {
        const fs = await import("fs/promises");
        for (const row of rows) {
          const filePath = String(row.file_name ?? "").trim();
          if (!filePath) continue;
          try {
            await fs.unlink(filePath);
          } catch {
            // best-effort
          }
        }
      }

      // Delete from DB
      const deleted = await db.deleteBlackiceUploadsByIds(input.ids);
      return { deleted, s3Deleted };
    }),
};

export async function autoLinkUnlinkedPentacamFiles(): Promise<{
  processed: number;
  imported: number;
  alreadyLinked: number;
  unmatched: number;
  skipped: number;
}> {
  const rows = await db.getUnlinkedBlackiceUploads(10000);
  if (rows.length === 0) {
    return { processed: 0, imported: 0, alreadyLinked: 0, unmatched: 0, skipped: 0 };
  }

  const fileNames = rows
    .map((r) => path.basename(String(r.file_name ?? "").trim()))
    .filter(Boolean);

  let skipped = 0;
  let unmatched = 0;
  const linkPairs: Array<{ fileName: string; patientId: number }> = [];
  const needsNameMatch: string[] = [];
  const extractedCodes = new Map<string, string>();

  for (const fileName of fileNames) {
    if (!/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
      skipped += 1;
      continue;
    }
    const codes = extractPatientCodeCandidatesFromFileName(fileName);
    if (codes.length > 0) {
      extractedCodes.set(path.posix.basename(fileName), codes[0]);
    } else {
      needsNameMatch.push(fileName);
    }
  }

  if (extractedCodes.size > 0) {
    const uniqueCodes = Array.from(new Set(extractedCodes.values()));
    const codeMap = await db.getPatientIdsByCodes(uniqueCodes);
    for (const [baseName, code] of extractedCodes) {
      const patientId = codeMap.get(code);
      if (!patientId) {
        unmatched += 1;
        continue;
      }
      linkPairs.push({ fileName: baseName, patientId });
    }
  }

  if (needsNameMatch.length > 0) {
    const matcher = await buildPentacamPatientCandidates();
    for (const fileName of needsNameMatch) {
      const matched = resolvePatientForPentacamFileName(fileName, matcher);
      if (!matched?.patient) {
        unmatched += 1;
        continue;
      }
      const patientId = Number((matched.patient as any)?.id ?? 0);
      if (!Number.isFinite(patientId) || patientId <= 0) {
        unmatched += 1;
        continue;
      }
      linkPairs.push({ fileName: path.posix.basename(fileName), patientId });
    }
  }

  const imported =
    linkPairs.length > 0 ? await db.linkBlackiceUploadsBatch(linkPairs) : 0;
  const alreadyLinked = Math.max(0, linkPairs.length - imported);

  return { processed: fileNames.length, imported, alreadyLinked, unmatched, skipped };
}
