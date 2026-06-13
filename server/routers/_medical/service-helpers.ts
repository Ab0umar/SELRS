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
} from "../../_core/procedures";
import { authService } from "../../_core/auth";
import {
  getAppNotificationSettings,
  pushAppNotification,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../../_core/appNotifications";
import { isFcmConfigured } from "../../_core/fcmPush";
import * as db from "../../db";
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
} from "../../../drizzle/schema";
import { mssqlQuery } from "../../services/accounting/mssqlAccounting";
import { broadcastSheetUpdate } from "../../_core/ws";
import { getBuildInfo } from "../../_core/buildInfo";
import { copyObjectInS3, deleteFromS3, listObjectsInS3 } from "../../_core/s3";
import {
  backfillPapatSrvNamesInMssql,
  deletePatientFromMssqlByCode,
  ensurePatientServiceInMssql,
  getMssqlSyncStatus,
  insertPatientToMssql,
  syncPatientsFromMssql,
  syncSinglePatientFromMssql,
  upsertPatientToMssql,
} from "../../integrations/mssqlPatients";

export const LASIK_CODES = new Set(["1501", "1502"]);

export const CONSULTANT_CODES = new Set(["1589"]);

export const SPECIALIST_CODES = new Set([
  "1586",
  "1604",
  "1605",
  "1606",
  "1608",
  "1609",
  "1613",
]);

export const XRAY_CODES = new Set([
  "1590",
  "1600",
  "1601",
  "1614",
  "1615",
  "1616",
  "1572",
]);

export const MOJIBAKE_HINT = /[ØÙÃÂ]/;

export const DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG = {
  enabled: true,
  intervalMs: Math.max(
    5_000,
    Number(process.env.MSSQL_SYNC_INTERVAL_MS ?? 30_000),
  ),
  limit: Math.max(
    1,
    Math.min(20_000, Number(process.env.MSSQL_SYNC_LIMIT ?? 5000)),
  ),
  incremental:
    String(process.env.MSSQL_SYNC_INCREMENTAL_AUTO ?? "true").toLowerCase() !==
    "false",
  overwriteExisting:
    String(process.env.MSSQL_SYNC_UPDATE_EXISTING ?? "false").toLowerCase() ===
    "true",
  preserveManualEdits:
    String(
      process.env.MSSQL_SYNC_PRESERVE_MANUAL_EDITS ?? "true",
    ).toLowerCase() !== "false",
  linkServicesForExisting:
    String(
      process.env.MSSQL_SYNC_LINK_SERVICES_FOR_EXISTING ?? "true",
    ).toLowerCase() !== "false",
};

export const getSystemSettingFallbackValue = (key: string) => {
  if (key === "appointments_pricing_v1") return null;
  if (key === "app_notification_settings_v1")
    return DEFAULT_APP_NOTIFICATION_SETTINGS;
  if (key === "app_notifications_feed_v1") return [];
  if (key === "mssql_sync_runtime_v1") return DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG;
  return null;
};

export const decodeMojibake = (value: unknown) => {
  const raw = String(value ?? "");
  if (!raw || !MOJIBAKE_HINT.test(raw)) return raw;
  try {
    return Buffer.from(raw, "latin1").toString("utf8");
  } catch {
    return raw;
  }
};

export const normalizeServiceCodeKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.0+$/g, "")
    .toLowerCase();

export const inferSrvTyp = (entry: {
  serviceType: "consultant" | "specialist" | "lasik" | "surgery" | "external";
  defaultSheet?: string;
  srvTyp?: "1" | "2";
}): "1" | "2" => {
  if (entry.srvTyp === "1" || entry.srvTyp === "2") return entry.srvTyp;
  const sheet = String(entry.defaultSheet ?? "")
    .trim()
    .toLowerCase();
  if (
    entry.serviceType === "external" ||
    sheet === "external" ||
    sheet === "surgery_external" ||
    sheet === "pentacam_external" ||
    sheet === "pentacam_ex" ||
    sheet === "pentacam_ex_c" ||
    sheet === "radiology_external"
  ) {
    return "2";
  }
  return "1";
};

export const normalizeServiceDefaultSheet = (
  value: unknown,
  fallbackServiceType:
    | "consultant"
    | "specialist"
    | "lasik"
    | "surgery"
    | "external",
) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return fallbackServiceType;
  if (raw === "pentacam" || raw === "radiology_center")
    return "pentacam_center";
  if (raw === "radiology_external") return "pentacam_external";
  if (raw === "pentacam_c") return "pentacam_c";
  if (raw === "pentacam_ex") return "pentacam_ex";
  if (raw === "pentacam_ex_c") return "pentacam_ex_c";
  if (raw === "surgery") return "surgery_center";
  if (raw === "external") {
    if (fallbackServiceType === "surgery") return "surgery_external";
    if (fallbackServiceType === "specialist") return "pentacam_external";
    return fallbackServiceType;
  }
  if (raw === "pentacam_center") return "pentacam_c";
  if (raw === "pentacam_external") return "pentacam_ex";
  return raw;
};

export const serviceTypeFromSheetOrType = (
  defaultSheetRaw: unknown,
  serviceTypeRaw: unknown,
): "consultant" | "specialist" | "lasik" | "surgery" | "external" => {
  const sheet = String(defaultSheetRaw ?? "")
    .trim()
    .toLowerCase();
  const type = String(serviceTypeRaw ?? "")
    .trim()
    .toLowerCase();
  if (
    sheet === "external" ||
    sheet === "surgery_external" ||
    sheet === "pentacam_external" ||
    sheet === "pentacam_ex" ||
    sheet === "pentacam_ex_c" ||
    sheet === "radiology_external"
  ) {
    return "external";
  }
  if (sheet === "surgery" || sheet === "surgery_center") return "surgery";
  if (sheet === "specialist") return "specialist";
  if (
    sheet === "lasik" ||
    sheet === "pentacam" ||
    sheet === "pentacam_center" ||
    sheet === "pentacam_c" ||
    sheet === "radiology_center"
  ) {
    return "lasik";
  }
  if (sheet === "consultant") return "consultant";
  if (type === "external") return "external";
  if (type === "surgery") return "surgery";
  if (type === "specialist") return "specialist";
  if (type === "lasik") return "lasik";
  return "consultant";
};

export function normalizeVisitType(
  raw: string,
): "consultation" | "examination" | "surgery" | "followup" {
  const value = raw?.trim().toLowerCase();
  switch (value) {
    case "consultation":
    case "استشارة":
      return "consultation";
    case "examination":
    case "exam":
    case "checkup":
    case "فحص":
    case "فحص عام":
    case "كشف":
      return "examination";
    case "surgery":
    case "operation":
    case "جراحة":
    case "عملية":
      return "surgery";
    case "followup":
    case "follow-up":
    case "follow up":
    case "متابعة":
      return "followup";
    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid visitType: ${raw}`,
      });
  }
}

export const doctorLocationTypeSchema = z.preprocess(
  (value) => {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase();
    if (
      raw === "external" ||
      raw === "خارجي" ||
      raw === "outside" ||
      raw === "out"
    )
      return "external";
    return "center";
  },
  z.enum(["center", "external"]),
);

export const doctorTypeSchema = z.preprocess(
  (value) => {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase();
    if (raw === "specialist" || raw === "اخصائي" || raw === "أخصائي")
      return "specialist";
    if (
      raw === "external" ||
      raw === "خارجي" ||
      raw === "outside" ||
      raw === "out"
    )
      return "external";
    return "consultant";
  },
  z.enum(["consultant", "specialist", "external"]),
);

export const doctorDirectoryEntrySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean().default(true),
  locationType: doctorLocationTypeSchema.default("center"),
  doctorType: doctorTypeSchema.default("consultant"),
});

export const serviceDirectoryEntrySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  category: z
    .enum(["examination", "radiology", "operations", "miscellaneous"])
    .optional(),
  serviceType: z.enum([
    "consultant",
    "specialist",
    "lasik",
    "surgery",
    "external",
  ]),
  srvTyp: z.preprocess(
    (value) => {
      const raw = String(value ?? "").trim();
      if (!raw) return undefined;
      return raw;
    },
    z.enum(["1", "2"]).optional(),
  ),
  defaultSheet: z
    .enum([
      "consultant",
      "specialist",
      "lasik",
      "surgery",
      "external",
      "pentacam",
      "surgery_center",
      "surgery_external",
      "pentacam_center",
      "pentacam_external",
      "pentacam_c",
      "pentacam_ex",
      "pentacam_ex_c",
      "radiology_center",
      "radiology_external",
    ])
    .optional(),
  isActive: z.boolean().default(true),
});

export const readyTemplateScopeSchema = z.enum(["tests", "prescription"]);

export const symptomDirectoryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const readyTemplateOverrideUpdateSchema = z.object({
  scope: readyTemplateScopeSchema,
  templateId: z.string().min(1),
  name: z.string().optional(),
  testItems: z
    .array(
      z.object({
        testId: z.number().optional().default(0),
        testName: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  prescriptionItems: z
    .array(
      z.object({
        medicationName: z.string(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        duration: z.string().optional(),
        instructions: z.string().optional(),
      }),
    )
    .optional(),
});

export const readyTemplateOverrideImportSchema = z.object({
  scope: readyTemplateScopeSchema,
  templates: z.array(
    z.object({
      templateId: z.string().min(1),
      name: z.string().optional(),
      testItems: z
        .array(
          z.object({
            testId: z.number().optional().default(0),
            testName: z.string().optional(),
            notes: z.string().optional(),
          }),
        )
        .optional(),
      prescriptionItems: z
        .array(
          z.object({
            medicationName: z.string(),
            dosage: z.string().optional(),
            frequency: z.string().optional(),
            duration: z.string().optional(),
            instructions: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
});

export const readReadyPrescriptionTemplatesFromFile = async (filePath: string) => {
  const decodeHeader = (value: unknown) => {
    const raw = String(value ?? "");
    if (!raw || !/[ØÙÃÂ]/.test(raw)) return raw;
    try {
      return Buffer.from(raw, "latin1").toString("utf8");
    } catch {
      return raw;
    }
  };
  const normalizeHeader = (value: unknown) =>
    decodeHeader(value)
      .trim()
      .toLowerCase()
      .replace(/[\s\-_]+/g, "");
  const buildRowLookup = (row: Record<string, unknown>) => {
    const lookup = new Map<string, unknown>();
    for (const [key, value] of Object.entries(row)) {
      const normalized = normalizeHeader(key);
      if (!normalized || lookup.has(normalized)) continue;
      lookup.set(normalized, value);
    }
    return lookup;
  };
  const getRowValue = (lookup: Map<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      const normalized = normalizeHeader(key);
      if (lookup.has(normalized)) return lookup.get(normalized);
    }
    return undefined;
  };
  const normalizeTemplateId = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "")
      .slice(0, 64);

  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  if (!workbook.SheetNames.length) return [];
  const rows = workbook.SheetNames.flatMap((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [] as Array<Record<string, unknown>>;
    return XLSX.utils
      .sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
      .map((row) => ({
        ...row,
        __sheetName: sheetName,
        __sheetIndex: sheetIndex,
      }));
  });

  const grouped = new Map<
    string,
    {
      templateId: string;
      name?: string;
      prescriptionItems: Array<{
        medicationName: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string;
      }>;
    }
  >();

  const templateIdUsage = new Map<string, number>();

  for (const row of rows) {
    const lookup = buildRowLookup(row);
    const templateIdRaw = String(
      getRowValue(
        lookup,
        "templateId",
        "template_id",
        "template id",
        "كود القالب",
      ) ?? "",
    );
    const templateNameRaw = String(
      getRowValue(
        lookup,
        "templateName",
        "template_name",
        "template name",
        "اسم القالب",
      ) ?? "",
    );
    const templateKeyRaw = String(
      getRowValue(lookup, "templateKey", "template_key", "template key") ?? "",
    );
    const sheetNameRaw = String((row as any).__sheetName ?? "");
    const sheetIndexRaw = Number((row as any).__sheetIndex ?? -1);
    const medicationName = String(
      getRowValue(
        lookup,
        "medicationName",
        "medication_name",
        "medication name",
        "اسم الدواء",
      ) ?? "",
    ).trim();
    const dosage = String(
      getRowValue(lookup, "dosage", "الجرعة", "جرعة") ?? "",
    ).trim();
    const frequency = String(
      getRowValue(lookup, "frequency", "التكرار") ?? "",
    ).trim();
    const duration = String(
      getRowValue(lookup, "duration", "المدة") ?? "",
    ).trim();
    const instructions = String(
      getRowValue(lookup, "instructions", "التعليمات") ?? "",
    ).trim();

    const normalizedBaseId =
      normalizeTemplateId(templateKeyRaw) ||
      normalizeTemplateId(
        templateIdRaw && sheetIndexRaw >= 0
          ? `${templateIdRaw}__s${sheetIndexRaw}`
          : "",
      ) ||
      normalizeTemplateId(templateIdRaw) ||
      normalizeTemplateId(
        templateNameRaw && sheetIndexRaw >= 0
          ? `${templateNameRaw}__s${sheetIndexRaw}`
          : "",
      ) ||
      normalizeTemplateId(templateNameRaw) ||
      normalizeTemplateId(sheetNameRaw) ||
      "";

    let normalizedId = normalizedBaseId;
    if (normalizedId) {
      const currentCount = templateIdUsage.get(normalizedId) ?? 0;
      if (!grouped.has(normalizedId) && currentCount > 0) {
        normalizedId = `${normalizedId}-${currentCount + 1}`;
      }
      templateIdUsage.set(normalizedBaseId, currentCount + 1);
    }

    if (!normalizedId || !medicationName) continue;

    if (!grouped.has(normalizedId)) {
      grouped.set(normalizedId, {
        templateId: normalizedId,
        name: templateNameRaw.trim() || undefined,
        prescriptionItems: [],
      });
    }
    grouped.get(normalizedId)!.prescriptionItems.push({
      medicationName,
      dosage,
      frequency,
      duration,
      instructions,
    });
  }

  return Array.from(grouped.values()).filter(
    (t) => t.prescriptionItems.length > 0,
  );
};

export const readReadyTestTemplatesFromFile = async (
  filePath: string,
  tests: Array<{ id: number; name?: string | null }>,
) => {
  const decodeHeader = (value: unknown) => {
    const raw = String(value ?? "");
    if (!raw || !/[ØÙÃÂ]/.test(raw)) return raw;
    try {
      return Buffer.from(raw, "latin1").toString("utf8");
    } catch {
      return raw;
    }
  };
  const normalizeHeader = (value: unknown) =>
    decodeHeader(value)
      .trim()
      .toLowerCase()
      .replace(/[\s\-_]+/g, "");
  const buildRowLookup = (row: Record<string, unknown>) => {
    const lookup = new Map<string, unknown>();
    for (const [key, value] of Object.entries(row)) {
      const normalized = normalizeHeader(key);
      if (!normalized || lookup.has(normalized)) continue;
      lookup.set(normalized, value);
    }
    return lookup;
  };
  const getRowValue = (lookup: Map<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      const normalized = normalizeHeader(key);
      if (lookup.has(normalized)) return lookup.get(normalized);
    }
    return undefined;
  };
  const normalizeTemplateId = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "")
      .slice(0, 64);

  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  if (!workbook.SheetNames.length) return [];
  const rows = workbook.SheetNames.flatMap((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [] as Array<Record<string, unknown>>;
    return XLSX.utils
      .sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
      .map((row) => ({
        ...row,
        __sheetName: sheetName,
        __sheetIndex: sheetIndex,
      }));
  });

  const byName = new Map(
    tests
      .map(
        (test) =>
          [
            String(test?.name ?? "")
              .trim()
              .toLowerCase(),
            test.id,
          ] as const,
      )
      .filter((entry) => entry[0]),
  );

  const grouped = new Map<
    string,
    {
      templateId: string;
      name?: string;
      testItems: Array<{ testId: number; testName?: string; notes: string }>;
    }
  >();

  const templateIdUsage = new Map<string, number>();

  for (const row of rows) {
    const lookup = buildRowLookup(row);
    const templateIdRaw = String(
      getRowValue(
        lookup,
        "templateId",
        "template_id",
        "template id",
        "كود القالب",
      ) ?? "",
    );
    const templateNameRaw = String(
      getRowValue(
        lookup,
        "templateName",
        "template_name",
        "template name",
        "اسم القالب",
      ) ?? "",
    );
    const templateKeyRaw = String(
      getRowValue(lookup, "templateKey", "template_key", "template key") ?? "",
    );
    const sheetNameRaw = String((row as any).__sheetName ?? "");
    const sheetIndexRaw = Number((row as any).__sheetIndex ?? -1);
    const testIdRaw = Number(
      getRowValue(lookup, "testId", "test_id", "test id", "كود الفحص") ?? 0,
    );
    const testNameRaw = String(
      getRowValue(lookup, "testName", "test_name", "test name", "اسم الفحص") ??
        "",
    ).trim();
    const notes = String(
      getRowValue(lookup, "notes", "ملاحظات", "الملاحظات") ?? "",
    ).trim();

    const normalizedBaseId =
      normalizeTemplateId(templateKeyRaw) ||
      normalizeTemplateId(
        templateIdRaw && sheetIndexRaw >= 0
          ? `${templateIdRaw}__s${sheetIndexRaw}`
          : "",
      ) ||
      normalizeTemplateId(templateIdRaw) ||
      normalizeTemplateId(
        templateNameRaw && sheetIndexRaw >= 0
          ? `${templateNameRaw}__s${sheetIndexRaw}`
          : "",
      ) ||
      normalizeTemplateId(templateNameRaw) ||
      normalizeTemplateId(sheetNameRaw) ||
      "";

    let normalizedId = normalizedBaseId;
    if (normalizedId) {
      const currentCount = templateIdUsage.get(normalizedId) ?? 0;
      if (!grouped.has(normalizedId) && currentCount > 0) {
        normalizedId = `${normalizedId}-${currentCount + 1}`;
      }
      templateIdUsage.set(normalizedBaseId, currentCount + 1);
    }

    if (!normalizedId) continue;

    let testId = Number.isFinite(testIdRaw) && testIdRaw > 0 ? testIdRaw : 0;
    let testName = testNameRaw;
    if (!testId && testName) {
      testId = byName.get(testName.toLowerCase()) ?? 0;
    }
    if (!testId && !testName) continue;

    if (!grouped.has(normalizedId)) {
      grouped.set(normalizedId, {
        templateId: normalizedId,
        name: templateNameRaw.trim() || undefined,
        testItems: [],
      });
    }
    grouped.get(normalizedId)!.testItems.push({ testId, testName, notes });
  }

  return Array.from(grouped.values()).filter((t) => t.testItems.length > 0);
};

export async function assertPentacamViewPermission(user: {
  id: number;
  role?: string | null;
}) {
  const role = String(user?.role ?? "")
    .trim()
    .toLowerCase();
  if (role === "admin") return;
  const permissions = await db.getEffectiveUserPermissions(
    user.id,
    user.role ?? undefined,
  );
  if (permissions.includes("/sheets/pentacam/:id")) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "No permission for Pentacam exports",
  });
}

export async function assertReadyTemplateImportPermission(
  ctx: { user: { id: number; role?: string | null } },
  scope: "prescription" | "tests",
) {
  const role = String(ctx.user?.role ?? "")
    .trim()
    .toLowerCase();
  if (role === "admin") return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      scope === "prescription"
        ? "Prescription import is admin only"
        : "Tests import is admin only",
  });
}
