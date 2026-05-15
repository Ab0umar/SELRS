import { z } from "zod";
import { access, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, doctorProcedure, nurseProcedure, technicianProcedure, receptionProcedure, managerProcedure, adminProcedure, medicalStaffProcedure } from "../_core/procedures";
import { authService } from "../_core/auth";
import { getAppNotificationSettings, pushAppNotification } from "../_core/appNotifications";
import * as db from "../db";
import { eq, asc, desc, and, inArray, sql } from "drizzle-orm";
import { services, doctorsLookup, patients, examinations, examinationChecklistItems, patientPageStates, autorefractometryData, afterRefractionData, glassesRecords, pentacamResults, doctorReports, testRequests, prescriptions, patientServiceEntries } from "../../drizzle/schema";
import { mssqlQuery } from "../services/accounting/mssqlAccounting";
import { broadcastSheetUpdate } from "../_core/ws";
import { getBuildInfo } from "../_core/buildInfo";
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

const DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG = {
  enabled: true,
  intervalMs: Math.max(5_000, Number(process.env.MSSQL_SYNC_INTERVAL_MS ?? 30_000)),
  limit: Math.max(1, Math.min(20_000, Number(process.env.MSSQL_SYNC_LIMIT ?? 5000))),
  incremental: String(process.env.MSSQL_SYNC_INCREMENTAL_AUTO ?? "true").toLowerCase() !== "false",
  overwriteExisting: String(process.env.MSSQL_SYNC_UPDATE_EXISTING ?? "false").toLowerCase() === "true",
  preserveManualEdits:
    String(process.env.MSSQL_SYNC_PRESERVE_MANUAL_EDITS ?? "true").toLowerCase() !== "false",
  linkServicesForExisting:
    String(process.env.MSSQL_SYNC_LINK_SERVICES_FOR_EXISTING ?? "true").toLowerCase() !== "false",
};

const getSystemSettingFallbackValue = (key: string) => {
  if (key === "appointments_pricing_v1") return null;
  if (key === "app_notification_settings_v1")
    return {
      mssqlOwnerEnabled: true,
      mssqlInAppEnabled: true,
      manualPatientInAppEnabled: true,
      operationsPushEnabled: false,
      operationsPushUserIds: [],
    };
  if (key === "app_notifications_feed_v1") return [];
  if (key === "mssql_sync_runtime_v1") return DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG;
  return null;
};

function resolveNotificationTargetRolesByUserRole(role: unknown): string[] | null {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  if (normalizedRole === "reception") return null;
  if (normalizedRole === "nurse" || normalizedRole === "technician") return ["doctor"];
  return null;
}

async function assertPentacamViewPermission(user: { id: number; role?: string | null }) {
  const role = String(user?.role ?? "").trim().toLowerCase();
  if (role === "admin") return;
  const permissions = await db.getEffectiveUserPermissions(user.id, user.role ?? undefined);
  if (permissions.includes("/sheets/pentacam/:id")) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "No permission for Pentacam exports" });
}

const doctorLocationTypeSchema = z.preprocess((value) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "external" || raw === "خارجي" || raw === "outside" || raw === "out") return "external";
  return "center";
}, z.enum(["center", "external"]));

const doctorTypeSchema = z.preprocess((value) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "specialist" || raw === "اخصائي" || raw === "أخصائي") return "specialist";
  if (raw === "external" || raw === "خارجي" || raw === "outside" || raw === "out") return "external";
  return "consultant";
}, z.enum(["consultant", "specialist", "external"]));

const doctorDirectoryEntrySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean().default(true),
  locationType: doctorLocationTypeSchema.default("center"),
  doctorType: doctorTypeSchema.default("consultant"),
});

const serviceDirectoryEntrySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["examination", "radiology", "operations", "miscellaneous"]).optional(),
  serviceType: z.enum(["consultant", "specialist", "lasik", "surgery", "external"]),
  srvTyp: z
    .preprocess((value) => {
      const raw = String(value ?? "").trim();
      if (!raw) return undefined;
      return raw;
    }, z.enum(["1", "2"]).optional()),
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

const readyTemplateScopeSchema = z.enum(["tests", "prescription"]);

const readReadyPrescriptionTemplatesFromFile = async (filePath: string) => {
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
    decodeHeader(value).trim().toLowerCase().replace(/[\s\-_]+/g, "");
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
      .map((row) => ({ ...row, __sheetName: sheetName, __sheetIndex: sheetIndex }));
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
      getRowValue(lookup, "templateId", "template_id", "template id", "كود القالب") ?? ""
    );
    const templateNameRaw = String(
      getRowValue(lookup, "templateName", "template_name", "template name", "اسم القالب") ?? ""
    );
    const templateKeyRaw = String(
      getRowValue(lookup, "templateKey", "template_key", "template key") ?? ""
    );
    const sheetNameRaw = String((row as any).__sheetName ?? "");
    const sheetIndexRaw = Number((row as any).__sheetIndex ?? -1);
    const medicationName = String(
      getRowValue(lookup, "medicationName", "medication_name", "medication name", "اسم الدواء") ?? ""
    ).trim();
    const dosage = String(getRowValue(lookup, "dosage", "الجرعة", "جرعة") ?? "").trim();
    const frequency = String(getRowValue(lookup, "frequency", "التكرار") ?? "").trim();
    const duration = String(getRowValue(lookup, "duration", "المدة") ?? "").trim();
    const instructions = String(getRowValue(lookup, "instructions", "التعليمات") ?? "").trim();

    const normalizedBaseId =
      normalizeTemplateId(templateKeyRaw) ||
      normalizeTemplateId(
        templateIdRaw && sheetIndexRaw >= 0 ? `${templateIdRaw}__s${sheetIndexRaw}` : ""
      ) ||
      normalizeTemplateId(templateIdRaw) ||
      normalizeTemplateId(
        templateNameRaw && sheetIndexRaw >= 0 ? `${templateNameRaw}__s${sheetIndexRaw}` : ""
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

  return Array.from(grouped.values()).filter((t) => t.prescriptionItems.length > 0);
};

const readReadyTestTemplatesFromFile = async (
  filePath: string,
  tests: Array<{ id: number; name?: string | null }>
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
    decodeHeader(value).trim().toLowerCase().replace(/[\s\-_]+/g, "");
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
      .map((row) => ({ ...row, __sheetName: sheetName, __sheetIndex: sheetIndex }));
  });

  const byName = new Map(
    tests
      .map((test) => [String(test?.name ?? "").trim().toLowerCase(), test.id] as const)
      .filter((entry) => entry[0])
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
      getRowValue(lookup, "templateId", "template_id", "template id", "كود القالب") ?? ""
    );
    const templateNameRaw = String(
      getRowValue(lookup, "templateName", "template_name", "template name", "اسم القالب") ?? ""
    );
    const templateKeyRaw = String(
      getRowValue(lookup, "templateKey", "template_key", "template key") ?? ""
    );
    const sheetNameRaw = String((row as any).__sheetName ?? "");
    const sheetIndexRaw = Number((row as any).__sheetIndex ?? -1);
    const testIdRaw = Number(
      getRowValue(lookup, "testId", "test_id", "test id", "كود الفحص") ?? 0
    );
    const testNameRaw = String(
      getRowValue(lookup, "testName", "test_name", "test name", "اسم الفحص") ?? ""
    ).trim();
    const notes = String(getRowValue(lookup, "notes", "ملاحظات", "الملاحظات") ?? "").trim();

    const normalizedBaseId =
      normalizeTemplateId(templateKeyRaw) ||
      normalizeTemplateId(
        templateIdRaw && sheetIndexRaw >= 0 ? `${templateIdRaw}__s${sheetIndexRaw}` : ""
      ) ||
      normalizeTemplateId(templateIdRaw) ||
      normalizeTemplateId(
        templateNameRaw && sheetIndexRaw >= 0 ? `${templateNameRaw}__s${sheetIndexRaw}` : ""
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
const symptomDirectoryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const readyTemplateOverrideUpdateSchema = z.object({
  scope: readyTemplateScopeSchema,
  templateId: z.string().min(1),
  name: z.string().optional(),
  testItems: z
    .array(
      z.object({
        testId: z.number().optional().default(0),
        testName: z.string().optional(),
        notes: z.string().optional(),
      })
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
      })
    )
    .optional(),
});

const readyTemplateOverrideImportSchema = z.object({
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
          })
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
          })
        )
        .optional(),
    })
  ),
});

const inferSrvTyp = (entry: {
  serviceType: "consultant" | "specialist" | "lasik" | "surgery" | "external";
  defaultSheet?: string;
  srvTyp?: "1" | "2";
}): "1" | "2" => {
  if (entry.srvTyp === "1" || entry.srvTyp === "2") return entry.srvTyp;
  const sheet = String(entry.defaultSheet ?? "").trim().toLowerCase();
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

const normalizeServiceDefaultSheet = (
  value: unknown,
  fallbackServiceType: "consultant" | "specialist" | "lasik" | "surgery" | "external"
) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallbackServiceType;
  if (raw === "pentacam" || raw === "radiology_center") return "pentacam_center";
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

const serviceTypeFromSheetOrType = (
  defaultSheetRaw: unknown,
  serviceTypeRaw: unknown
): "consultant" | "specialist" | "lasik" | "surgery" | "external" => {
  const sheet = String(defaultSheetRaw ?? "").trim().toLowerCase();
  const type = String(serviceTypeRaw ?? "").trim().toLowerCase();
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

const normalizeServiceCodeKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.0+$/g, "")
    .toLowerCase();

const MOJIBAKE_HINT = /[ØÙÃÂ]/;
const decodeMojibake = (value: unknown) => {
  const raw = String(value ?? "");
  if (!raw || !MOJIBAKE_HINT.test(raw)) return raw;
  try {
    return Buffer.from(raw, "latin1").toString("utf8");
  } catch {
    return raw;
  }
};

function inferPentacamEyeSideFromName(fileName: string): "OD" | "OS" | "" {
  const match = fileName.match(/(?:^|_)(OD|OS)(?:_|$)/i);
  if (!match) return "";
  const side = String(match[1] ?? "").toUpperCase();
  return side === "OD" || side === "OS" ? side : "";
}

function inferPentacamCapturedAtFromName(fileName: string): string | null {
  const match = fileName.match(/_(\d{8})_(\d{6})_/);
  if (!match) return null;
  const d = String(match[1] ?? "");
  const t = String(match[2] ?? "");
  if (d.length !== 8 || t.length !== 6) return null;
  let day = Number(d.slice(0, 2));
  let month = Number(d.slice(2, 4));
  let year = Number(d.slice(4, 8));
  // Also support YYYYMMDD naming.
  if (Number(d.slice(0, 4)) >= 1900 && Number(d.slice(0, 4)) <= 2100) {
    year = Number(d.slice(0, 4));
    month = Number(d.slice(4, 6));
    day = Number(d.slice(6, 8));
  }
  const hour = Number(t.slice(0, 2));
  const minute = Number(t.slice(2, 4));
  const second = Number(t.slice(4, 6));
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return null;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function inferPentacamMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function normalizePentacamMatchText(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPatientCodeCandidatesFromFileName(fileName: string): string[] {
  const stem = path.parse(String(fileName ?? "")).name;
  const out = new Set<string>();
  const parts = stem.split(/[^0-9A-Za-z]+/).filter(Boolean);
  const first = String(parts[0] ?? "").trim();
  if (!first) return [];

  // Clinical-safe: only trust leading token as patient code.
  if (/^\d{3,12}$/.test(first)) {
    out.add(first);
    return Array.from(out);
  }

  // IMAGEnet variants with short alpha prefix/suffix around numeric code.
  if (/^[A-Za-z]{1,5}\d{3,12}$/.test(first) || /^\d{3,12}[A-Za-z]{1,5}$/.test(first)) {
    const digits = first.replace(/\D+/g, "");
    if (/^\d{3,12}$/.test(digits)) out.add(digits);
  }
  return Array.from(out);
}

type PentacamPatientCandidate = {
  patient: any;
  normalizedNameKeys: string[];
  tokenSet: Set<string>;
  tokenSignatureSet: Set<string>;
};

function normalizePentacamPhoneticToken(token: string): string {
  const raw = normalizePentacamMatchText(token).replace(/\s+/g, "");
  if (!raw) return "";

  const arabicMap: Record<string, string> = {
    "ا": "a", "أ": "a", "إ": "a", "آ": "a", "ء": "",
    "ؤ": "w", "ئ": "y", "ب": "b", "ت": "t", "ث": "s",
    "ج": "g", "ح": "h", "خ": "kh", "د": "d", "ذ": "z",
    "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s",
    "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "g",
    "ف": "f", "ق": "k", "ك": "k", "ل": "l", "م": "m",
    "ن": "n", "ه": "h", "ة": "h", "و": "w", "ي": "y", "ى": "y",
  };

  const mapped = Array.from(raw)
    .map((ch) => arabicMap[ch] ?? ch)
    .join("")
    .toLowerCase();

  const folded = mapped
    .replace(/ph/g, "f")
    .replace(/ch/g, "sh");

  const normalizedAbd = folded
    // Unify Abd El / Abd Al / Abdel* shapes.
    .replace(/^ab[dt]e?l?/, "abd");

  const signature = normalizedAbd
    .replace(/[aeiouyw]+/g, "")
    .replace(/(.)\1+/g, "$1")
    .replace(/[^a-z0-9]+/g, "");

  if (signature.length >= 2) return signature;
  return normalizedAbd.replace(/[^a-z0-9]+/g, "");
}

function buildPentacamTokenSignatureSet(value: string): Set<string> {
  const out = new Set<string>();
  const tokens = tokenizePentacamMatchText(value);
  for (const token of tokens) {
    const signature = normalizePentacamPhoneticToken(token);
    if (signature.length >= 2) out.add(signature);
  }
  // Also index adjacent token joins to match exports like "abdelfatah" vs "عبد الفتاح".
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const joined = `${tokens[i]}${tokens[i + 1]}`;
    const joinedSignature = normalizePentacamPhoneticToken(joined);
    if (joinedSignature.length >= 3) out.add(joinedSignature);
  }
  return out;
}

function buildPentacamNameKeys(fullName: string): string[] {
  const clean = String(fullName ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.split(" ").filter(Boolean);
  const variants = new Set<string>();

  variants.add(clean);
  variants.add(reorderPatientNameSecondThirdFirst(clean));

  if (parts.length >= 3) {
    const first3 = parts.slice(0, 3);
    variants.add(first3.join(" "));
    variants.add([first3[1], first3[2], first3[0]].join(" "));
  }

  if (parts.length >= 4) {
    const first4 = parts.slice(0, 4);
    variants.add(first4.join(" "));
    variants.add([first4[1], first4[2], first4[0], first4[3]].join(" "));
  }

  return Array.from(variants)
    .map((value) => normalizePentacamMatchText(value))
    .filter((value) => value.length >= 4);
}

function extractPentacamNameFragment(fileName: string): string {
  const stem = path.parse(String(fileName ?? "")).name;
  // IMAGEnet: "<name>_<date>_<time>" (often 2nd 3rd 1st).
  // Pentacam alt: "<name>_OD|OS_<date>_<time>_<suffix>"
  const withoutSuffix = stem
    .replace(/_(OD|OS)_\d{8}_\d{6}(?:_.+)?$/i, "")
    .replace(/_\d{8}_\d{6}(?:_.+)?$/i, "");
  return normalizePentacamMatchText(withoutSuffix);
}

function tokenizePentacamMatchText(value: string): string[] {
  return normalizePentacamMatchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

async function buildPentacamPatientCandidates(): Promise<{
  byCode: Map<string, any>;
  candidates: PentacamPatientCandidate[];
}> {
  const byCode = new Map<string, any>();
  const candidates: PentacamPatientCandidate[] = [];
  let cursor: { codeNum: number; patientCode: string; id: number } | undefined = undefined;
  for (let page = 0; page < 100; page += 1) {
    const batch = await db.getAllPatients({ limit: 500, cursor });
    const rows = Array.isArray((batch as any)?.rows) ? (batch as any).rows : [];
    for (const row of rows) {
      const patientCode = String((row as any)?.patientCode ?? "").trim();
      if (patientCode) {
        byCode.set(patientCode, row);
        byCode.set(patientCode.toUpperCase(), row);
      }
      const fullName = String((row as any)?.fullName ?? "").trim();
      const keys = buildPentacamNameKeys(fullName);
      const tokenSet = new Set<string>();
      const tokenSignatureSet = new Set<string>();
      for (const key of keys) {
        for (const token of tokenizePentacamMatchText(key)) tokenSet.add(token);
        for (const signature of buildPentacamTokenSignatureSet(key)) tokenSignatureSet.add(signature);
      }
      candidates.push({
        patient: row,
        normalizedNameKeys: keys,
        tokenSet,
        tokenSignatureSet,
      });
    }
    if (!(batch as any)?.hasMore) break;
    cursor = (batch as any)?.nextCursor ?? undefined;
    if (!cursor) break;
  }
  return { byCode, candidates };
}

function resolvePatientForPentacamFileName(
  fileName: string,
  matcher: { byCode: Map<string, any>; candidates: PentacamPatientCandidate[] }
): { patient: any; matchedBy: string } | null {
  const codeCandidates = extractPatientCodeCandidatesFromFileName(fileName);
  const hasExplicitCode = codeCandidates.length > 0;
  for (const candidate of codeCandidates) {
    const patient = matcher.byCode.get(candidate) ?? matcher.byCode.get(candidate.toUpperCase());
    if (patient) return { patient, matchedBy: `code:${candidate}` };
  }
  if (hasExplicitCode) return null;

  const nameFragment = extractPentacamNameFragment(fileName);
  const stem = path.parse(String(fileName ?? "")).name;
  const coarseFragment = normalizePentacamMatchText(stem);
  const workingFragment = nameFragment || coarseFragment;
  if (!workingFragment) return null;
  const fileTokens = new Set(tokenizePentacamMatchText(workingFragment));
  if (fileTokens.size < 1) return null;
  const capturedAtIso = inferPentacamCapturedAtFromName(fileName);
  const capturedAtMs = capturedAtIso ? Date.parse(capturedAtIso) : NaN;
  const patientReferenceMs = (patient: any) => {
    const lastVisitRaw = patient?.lastVisit;
    const lastVisitMs = lastVisitRaw ? Date.parse(String(lastVisitRaw)) : NaN;
    if (Number.isFinite(lastVisitMs)) return lastVisitMs;
    const createdRaw = patient?.createdAt;
    const createdMs = createdRaw ? Date.parse(String(createdRaw)) : NaN;
    if (Number.isFinite(createdMs)) return createdMs;
    return NaN;
  };
  const patientDayDiff = (patient: any) => {
    const refMs = patientReferenceMs(patient);
    if (!Number.isFinite(capturedAtMs) || !Number.isFinite(refMs)) return Number.POSITIVE_INFINITY;
    return Math.abs(Math.round((capturedAtMs - refMs) / 86400000));
  };
  const patientTieKey = (patient: any) => {
    const code = String(patient?.patientCode ?? "").trim();
    if (code) return code;
    return String(Number(patient?.id ?? 0));
  };

  // First pass: direct key include (supports 2nd/3rd/1st order keys).
  let bestInclude: { patient: any; score: number; matchedBy: string; dayDiff: number } | null = null;
  for (const candidate of matcher.candidates) {
    for (const nameKey of candidate.normalizedNameKeys) {
      if (!nameKey || nameKey.length < 4) continue;
      if (!workingFragment.includes(nameKey)) continue;
      const keyTokens = tokenizePentacamMatchText(nameKey);
      if (keyTokens.length < 1) continue;
      let tokenOverlap = 0;
      for (const token of keyTokens) {
        if (fileTokens.has(token)) tokenOverlap += 1;
      }
      if (tokenOverlap < 1) continue;
      const score = nameKey.length;
      const dayDiff = patientDayDiff(candidate.patient);
      if (
        !bestInclude ||
        score > bestInclude.score ||
        (score === bestInclude.score && dayDiff < bestInclude.dayDiff) ||
        (score === bestInclude.score &&
          dayDiff === bestInclude.dayDiff &&
          patientTieKey(candidate.patient) < patientTieKey(bestInclude.patient))
      ) {
        bestInclude = { patient: candidate.patient, score, matchedBy: `name:${nameKey}`, dayDiff };
      }
    }
  }
  if (bestInclude) return { patient: bestInclude.patient, matchedBy: bestInclude.matchedBy };

  // Second pass: token overlap for partial names and spacing drift.
  if (fileTokens.size === 0) return null;

  let bestToken: { patient: any; overlap: number; matchedBy: string; dayDiff: number } | null = null;
  for (const candidate of matcher.candidates) {
    let overlap = 0;
    for (const token of fileTokens) {
      if (candidate.tokenSet.has(token)) overlap += 1;
    }
    if (overlap < 2) continue;
    const dayDiff = patientDayDiff(candidate.patient);
    if (
      !bestToken ||
      overlap > bestToken.overlap ||
      (overlap === bestToken.overlap && dayDiff < bestToken.dayDiff) ||
      (overlap === bestToken.overlap &&
        dayDiff === bestToken.dayDiff &&
        patientTieKey(candidate.patient) < patientTieKey(bestToken.patient))
    ) {
      bestToken = { patient: candidate.patient, overlap, matchedBy: `tokens:${overlap}`, dayDiff };
    }
  }
  if (bestToken) return { patient: bestToken.patient, matchedBy: bestToken.matchedBy };

  // Third pass: Arabic-English phonetic overlap.
  // Guardrail: phonetic similarity alone is too risky for lookalike Arabic names
  // (e.g. حسين vs حسناء). Require both phonetic overlap and at least one exact token overlap.
  const fileTokenSignatures = buildPentacamTokenSignatureSet(workingFragment);
  if (fileTokenSignatures.size === 0) return null;
  const hasArabicCharsInFile = /[\u0600-\u06FF]/.test(workingFragment);

  let bestPhonetic: { patient: any; overlap: number; matchedBy: string; dayDiff: number } | null = null;
  for (const candidate of matcher.candidates) {
    let overlap = 0;
    for (const signature of fileTokenSignatures) {
      if (candidate.tokenSignatureSet.has(signature)) {
        overlap += 1;
      }
    }
    if (overlap < 2) continue;
    let exactTokenOverlap = 0;
    for (const token of fileTokens) {
      if (candidate.tokenSet.has(token)) exactTokenOverlap += 1;
    }
    // Cross-language filenames (English) often have zero exact token overlap vs Arabic DB names.
    // Allow them only when phonetic signal is strong enough.
    if (exactTokenOverlap < 1) {
      if (hasArabicCharsInFile) continue;
      if (overlap < 3) continue;
    }
    const dayDiff = patientDayDiff(candidate.patient);
    if (
      !bestPhonetic ||
      overlap > bestPhonetic.overlap ||
      (overlap === bestPhonetic.overlap && dayDiff < bestPhonetic.dayDiff) ||
      (overlap === bestPhonetic.overlap &&
        dayDiff === bestPhonetic.dayDiff &&
        patientTieKey(candidate.patient) < patientTieKey(bestPhonetic.patient))
    ) {
      bestPhonetic = { patient: candidate.patient, overlap, matchedBy: `phonetic:${overlap}`, dayDiff };
    }
  }

  if (bestPhonetic) return { patient: bestPhonetic.patient, matchedBy: bestPhonetic.matchedBy };

  // No aggressive fallback in clinical mode.
  return null;
}

function suggestPatientsForPentacamFileName(
  fileName: string,
  matcher: { byCode: Map<string, any>; candidates: PentacamPatientCandidate[] },
  limit: number = 3
): Array<{ patient: any; matchedBy: string; score: number }> {
  const nameFragment = extractPentacamNameFragment(fileName);
  if (!nameFragment) return [];
  const fileTokens = new Set(tokenizePentacamMatchText(nameFragment));
  const fileSignatures = buildPentacamTokenSignatureSet(nameFragment);
  const capturedAtIso = inferPentacamCapturedAtFromName(fileName);
  const capturedAtMs = capturedAtIso ? Date.parse(capturedAtIso) : NaN;
  const scored: Array<{
    patient: any;
    matchedBy: string;
    score: number;
    includeScore: number;
    tokenOverlap: number;
    phoneticOverlap: number;
    dayDiff: number;
  }> = [];

  for (const candidate of matcher.candidates) {
    let includeScore = 0;
    let includeBy = "";
    for (const nameKey of candidate.normalizedNameKeys) {
      if (!nameKey || nameKey.length < 4) continue;
      if (!nameFragment.includes(nameKey)) continue;
      if (nameKey.length > includeScore) {
        includeScore = nameKey.length;
        includeBy = `name:${nameKey}`;
      }
    }

    let tokenOverlap = 0;
    for (const token of fileTokens) {
      if (candidate.tokenSet.has(token)) tokenOverlap += 1;
    }

    let phoneticOverlap = 0;
    for (const signature of fileSignatures) {
      if (candidate.tokenSignatureSet.has(signature)) phoneticOverlap += 1;
    }

    const strongInclude = includeScore >= 6;
    const goodTokenSignal = tokenOverlap >= 2;
    const goodPhoneticSignal = phoneticOverlap >= 2 && tokenOverlap >= 1;
    if (!strongInclude && !goodTokenSignal && !goodPhoneticSignal) continue;

    const score = includeScore * 100 + tokenOverlap * 20 + phoneticOverlap * 12;
    if (score < 24) continue;
    const lastVisitRaw = (candidate.patient as any)?.lastVisit;
    const lastVisitMs = lastVisitRaw ? Date.parse(String(lastVisitRaw)) : NaN;
    const createdRaw = (candidate.patient as any)?.createdAt;
    const createdMs = createdRaw ? Date.parse(String(createdRaw)) : NaN;
    const refMs = Number.isFinite(lastVisitMs) ? lastVisitMs : createdMs;
    const dayDiff =
      Number.isFinite(capturedAtMs) && Number.isFinite(refMs)
        ? Math.abs(Math.round((capturedAtMs - refMs) / 86400000))
        : Number.POSITIVE_INFINITY;
    const matchedBy =
      includeBy ||
      (tokenOverlap > 0 ? `tokens:${tokenOverlap}` : `phonetic:${phoneticOverlap}`);
    scored.push({
      patient: candidate.patient,
      matchedBy,
      score,
      includeScore,
      tokenOverlap,
      phoneticOverlap,
      dayDiff,
    });
  }

  const hasNearYear = scored.some((entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365);
  const hasNearThreeYears = scored.some((entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365 * 3);
  const filteredByDate = hasNearYear
    ? scored.filter((entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365)
    : hasNearThreeYears
      ? scored.filter((entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365 * 3)
      : scored;

  filteredByDate.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.dayDiff - b.dayDiff;
  });
  const outRaw: Array<{
    patient: any;
    matchedBy: string;
    score: number;
    includeScore: number;
    tokenOverlap: number;
    phoneticOverlap: number;
    dayDiff: number;
  }> = [];
  const seen = new Set<number>();
  for (const entry of filteredByDate) {
    const patientId = Number((entry.patient as any)?.id ?? 0);
    if (!Number.isFinite(patientId) || patientId <= 0) continue;
    if (seen.has(patientId)) continue;
    seen.add(patientId);
    outRaw.push(entry);
    if (outRaw.length >= limit) break;
  }
  if (outRaw.length === 0) return [];
  if (outRaw.length > 1) {
    const top = outRaw[0];
    const second = outRaw[1];
    const closeScores = second.score >= top.score * 0.92;
    const closeEvidence =
      second.includeScore >= top.includeScore - 1 &&
      second.tokenOverlap >= top.tokenOverlap - 1 &&
      second.phoneticOverlap >= top.phoneticOverlap - 1;
    if (closeScores && closeEvidence) return [top].map(({ patient, matchedBy, score }) => ({ patient, matchedBy, score }));
  }
  return outRaw.map(({ patient, matchedBy, score }) => ({ patient, matchedBy, score }));
}
function reorderPatientNameSecondThirdFirst(rawName: string): string {
  const clean = rawName.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(" ");
  if (parts.length < 3) return clean;
  return [parts[1], parts[2], parts[0], ...parts.slice(3)].join(" ").trim();
}

function sanitizeLabel(rawValue: string): string {
  return rawValue
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePentacamLocalMeta(notes: unknown): null | {
  kind: string;
  originalFileName?: string;
  sourceFileName?: string;
  storageUrl?: string;
  mimeType?: string;
  eyeSide?: string;
  importStatus?: string;
  capturedAt?: string | null;
  importedAt?: string | null;
} {
  const raw = String(notes ?? "").trim();
  if (!raw || raw[0] !== "{") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (String((parsed as any).kind ?? "") !== "local-pentacam-export-v1") return null;
    return parsed as any;
  } catch {
    return null;
  }
}

function pentacamEyeHasAnyData(row: Record<string, unknown>, side: "OD" | "OS"): boolean {
  if (side === "OD") {
    return [row.k1OD, row.k2OD, row.axisOD, row.thinnestPointOD].some((v) => String(v ?? "").trim().length > 0);
  }
  return [row.k1OS, row.k2OS, row.axisOS, row.thinnestPointOS].some((v) => String(v ?? "").trim().length > 0);
}

function pentacamEyeIsComplete(row: Record<string, unknown>, side: "OD" | "OS"): boolean {
  if (side === "OD") {
    return [row.k1OD, row.k2OD, row.axisOD, row.thinnestPointOD].every((v) => String(v ?? "").trim().length > 0);
  }
  return [row.k1OS, row.k2OS, row.axisOS, row.thinnestPointOS].every((v) => String(v ?? "").trim().length > 0);
}

function expandPentacamDashboardRows(rows: any[]) {
  const out: Array<{
    resultId: number;
    visitId: number;
    patientId: number;
    patientName: string;
    doctorName: string;
    visitDate: Date | string | null;
    eye: "OD" | "OS";
    k1: string | null;
    k2: string | null;
    axis: string | null;
    thinnest: string | null;
    quality: "accepted" | "repeat";
  }> = [];

  for (const row of rows) {
    const meta = parsePentacamLocalMeta((row as any)?.notes);
    const metaEye = String(meta?.eyeSide ?? "").trim().toLowerCase();
    const importStatus = String(meta?.importStatus ?? "").trim().toLowerCase();
    const forceRepeat =
      importStatus.includes("repeat") || importStatus === "failed" || importStatus.includes("quality");

    const considerOD =
      pentacamEyeHasAnyData(row, "OD") ||
      metaEye === "od" ||
      metaEye === "right" ||
      metaEye.includes("يمين");
    const considerOS =
      pentacamEyeHasAnyData(row, "OS") ||
      metaEye === "os" ||
      metaEye === "left" ||
      metaEye.includes("يسار");

    const emit = (side: "OD" | "OS") => {
      const complete = pentacamEyeIsComplete(row, side);
      const quality: "accepted" | "repeat" = forceRepeat || !complete ? "repeat" : "accepted";
      const vals =
        side === "OD"
          ? {
              k1: row.k1OD ?? null,
              k2: row.k2OD ?? null,
              axis: row.axisOD ?? null,
              thinnest: row.thinnestPointOD ?? null,
            }
          : {
              k1: row.k1OS ?? null,
              k2: row.k2OS ?? null,
              axis: row.axisOS ?? null,
              thinnest: row.thinnestPointOS ?? null,
            };
      const rawDoctor = String(row.doctorDisplayName ?? "").trim();
      const doctorName =
        rawDoctor && !/^د\.?/u.test(rawDoctor) && !/^dr\.?/i.test(rawDoctor) ? `د. ${rawDoctor}` : rawDoctor;

      out.push({
        resultId: Number(row.id),
        visitId: Number(row.visitId),
        patientId: Number(row.patientId),
        patientName: decodeMojibake(String(row.patientFullName ?? "").trim() || `مريض #${row.patientId}`),
        doctorName: decodeMojibake(doctorName),
        visitDate: (row as any).visitDate ?? row.createdAt ?? null,
        eye: side,
        k1: vals.k1 != null ? String(vals.k1) : null,
        k2: vals.k2 != null ? String(vals.k2) : null,
        axis: vals.axis != null ? String(vals.axis) : null,
        thinnest: vals.thinnest != null ? String(vals.thinnest) : null,
        quality,
      });
    };

    if (considerOD) emit("OD");
    if (considerOS) emit("OS");
    if (!considerOD && !considerOS) {
      emit("OD");
    }
  }

  return out;
}

function stripLeadingCodeLabel(fileName: string): string {
  const raw = String(fileName ?? "").trim();
  if (!raw) return raw;
  return raw.replace(/^([A-Za-z]{1,5}\d{3,12}|\d{3,12})[_\-\s]+/i, "");
}

const PENTACAM_ROOT_DIR = path.resolve(process.cwd(), "Pentacam");
const PENTACAM_FAILED_DIR = path.join(PENTACAM_ROOT_DIR, "_failed");

type FailedPentacamSuggestion = {
  patientId: number;
  patientCode: string;
  fullName: string;
  matchedBy: string;
  score: number;
};

type FailedPentacamPreview = {
  fileName: string;
  proposedFileName: string;
  willDuplicate: boolean;
};

function assertSafePentacamFileName(fileName: string): string {
  const normalized = String(fileName ?? "").trim();
  if (!normalized || normalized.includes("/") || normalized.includes("\\") || normalized.includes("..")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid file name: ${fileName}` });
  }
  return normalized;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function nextAvailablePentacamPath(initialPath: string): Promise<string> {
  const parsed = path.parse(initialPath);
  let candidate = initialPath;
  let index = 1;
  while (await pathExists(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name}_dup${index}${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

function extractPentacamPageType(fileName: string): string {
  const lower = String(fileName ?? "").toLowerCase();
  if (lower.includes("enhanced") && lower.includes("ectasia")) return "Enhanced Ectasia";
  if (lower.includes("topometric")) return "Topometric";
  if (lower.includes("4 maps") && lower.includes("refr")) return "4 Maps Refr";
  if (lower.includes("4 maps")) return "4 Maps";
  if (lower.includes("kc") && lower.includes("staging")) return "KC Staging";
  return "Other";
}

function buildFailedPentacamGroupLabel(fileName: string): string {
  const stem = path.parse(String(fileName ?? "")).name;
  const withoutLeadingCode = stripLeadingCodeLabel(stem);
  const cleaned = withoutLeadingCode
    .replace(/_(OD|OS)_\d{8}_\d{6}(?:_.+)?$/i, "")
    .replace(/_\d{8}_\d{6}(?:_.+)?$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return cleaned || withoutLeadingCode || stem;
}

function buildFailedPentacamGroupKey(fileName: string): string {
  return buildFailedPentacamGroupLabel(fileName).toLowerCase();
}

async function listFailedPentacamRows() {
  const entries = await readdir(PENTACAM_FAILED_DIR, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const matcher = await buildPentacamPatientCandidates();
  const rows = await Promise.all(
    files.map(async (fileName) => {
      const fullPath = path.join(PENTACAM_FAILED_DIR, fileName);
      const info = await stat(fullPath);
      const suggestions = suggestPatientsForPentacamFileName(fileName, matcher, 3).map((entry) => ({
        patientId: Number((entry.patient as any)?.id ?? 0),
        patientCode: String((entry.patient as any)?.patientCode ?? ""),
        fullName: String((entry.patient as any)?.fullName ?? ""),
        matchedBy: entry.matchedBy,
        score: entry.score,
      })) satisfies FailedPentacamSuggestion[];
      const topSuggestion = suggestions[0];
      return {
        fileName,
        groupKey: buildFailedPentacamGroupKey(fileName),
        groupLabel: buildFailedPentacamGroupLabel(fileName),
        pageType: extractPentacamPageType(fileName),
        size: Number(info.size ?? 0),
        modifiedAt: new Date(info.mtime).toISOString(),
        previewUrl: `/pentacam-failed/${encodeURIComponent(fileName)}`,
        detectedId: String(topSuggestion?.patientCode ?? ""),
        score: Number(topSuggestion?.score ?? 0),
        status: "failed",
        topPasses: topSuggestion
          ? [
              {
                pass: topSuggestion.matchedBy,
                text: `${topSuggestion.patientCode} | ${topSuggestion.fullName}`,
                candidates: [topSuggestion.patientCode],
              },
            ]
          : [],
        suggestions,
      };
    })
  );

  rows.sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
  return rows;
}

async function previewFailedPentacamRenameTargets(fileNames: string[], idCode: string): Promise<FailedPentacamPreview[]> {
  const normalizedId = String(idCode ?? "").trim();
  if (!/^\d{3,12}$/.test(normalizedId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A valid ID is required" });
  }

  const seenTargets = new Set<string>();
  const previews: FailedPentacamPreview[] = [];
  for (const rawFileName of fileNames) {
    const fileName = assertSafePentacamFileName(rawFileName);
    const baseName = stripLeadingCodeLabel(fileName);
    const targetPath = path.join(PENTACAM_ROOT_DIR, `${normalizedId}_${baseName}`);
    let candidate = targetPath;
    let willDuplicate = false;
    if ((await pathExists(candidate)) || seenTargets.has(candidate.toLowerCase())) {
      willDuplicate = true;
      candidate = await nextAvailablePentacamPath(candidate);
    }
    seenTargets.add(candidate.toLowerCase());
    previews.push({
      fileName,
      proposedFileName: path.basename(candidate),
      willDuplicate,
    });
  }
  return previews;
}

async function moveFailedPentacamFile(fileName: string, targetFileName: string): Promise<string> {
  const sourcePath = path.join(PENTACAM_FAILED_DIR, assertSafePentacamFileName(fileName));
  const info = await stat(sourcePath).catch(() => null);
  if (!info?.isFile()) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Failed file not found" });
  }
  const finalPath = await nextAvailablePentacamPath(path.join(PENTACAM_ROOT_DIR, targetFileName));
  await rename(sourcePath, finalPath);
  return path.basename(finalPath);
}

type LocalPentacamMismatchEntry = {
  resultId: number;
  fileName: string;
  currentPatientId: number;
  currentPatientCode: string;
  currentPatientName: string;
  codeCandidates: string[];
  kind: "obvious" | "ambiguous";
  suggestedPatientId?: number;
  suggestedPatientCode?: string;
  suggestedPatientName?: string;
};

async function scanMismatchedLocalPentacamLinks(limit: number): Promise<LocalPentacamMismatchEntry[]> {
  const matcher = await buildPentacamPatientCandidates();
  const byPatientId = new Map<number, any>();
  for (const candidate of matcher.candidates) {
    const id = Number((candidate.patient as any)?.id ?? 0);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (!byPatientId.has(id)) byPatientId.set(id, candidate.patient);
  }

  const rows = await db.getRecentPentacamLocalResults(limit);
  const out: LocalPentacamMismatchEntry[] = [];
  for (const row of rows as any[]) {
    const meta = parsePentacamLocalMeta((row as any)?.notes);
    const fileName = String(meta?.originalFileName ?? meta?.sourceFileName ?? "").trim();
    if (!fileName) continue;
    const codeCandidates = Array.from(
      new Set(
        extractPatientCodeCandidatesFromFileName(fileName).filter((value) => /^\d{3,12}$/.test(String(value)))
      )
    );
    if (codeCandidates.length === 0) continue;

    const currentPatientId = Number((row as any)?.patientId ?? 0);
    const currentPatient = byPatientId.get(currentPatientId);
    const currentPatientCode = String((currentPatient as any)?.patientCode ?? "").trim();
    const currentPatientName = String((currentPatient as any)?.fullName ?? "").trim();
    if (currentPatientCode && codeCandidates.includes(currentPatientCode)) continue;

    const suggestedCodes = Array.from(
      new Set(codeCandidates.filter((code) => matcher.byCode.get(code) || matcher.byCode.get(code.toUpperCase())))
    );
    if (suggestedCodes.length === 1) {
      const suggested =
        matcher.byCode.get(suggestedCodes[0]) ??
        matcher.byCode.get(suggestedCodes[0].toUpperCase());
      const suggestedPatientId = Number((suggested as any)?.id ?? 0);
      if (!Number.isFinite(suggestedPatientId) || suggestedPatientId <= 0) continue;
      if (suggestedPatientId === currentPatientId) continue;
      out.push({
        resultId: Number((row as any)?.id ?? 0),
        fileName,
        currentPatientId,
        currentPatientCode,
        currentPatientName,
        codeCandidates,
        kind: "obvious",
        suggestedPatientId,
        suggestedPatientCode: String((suggested as any)?.patientCode ?? "").trim(),
        suggestedPatientName: String((suggested as any)?.fullName ?? "").trim(),
      });
      continue;
    }

    if (suggestedCodes.length > 1) {
      out.push({
        resultId: Number((row as any)?.id ?? 0),
        fileName,
        currentPatientId,
        currentPatientCode,
        currentPatientName,
        codeCandidates,
        kind: "ambiguous",
      });
    }
  }

  return out;
}

function normalizeVisitType(raw: string): "consultation" | "examination" | "surgery" | "followup" {
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

/**
 * Get fresh doctor name from patient record (not from cache)
 * Called for notifications to ensure current doctor is displayed
 */
async function readFreshDoctorNameForPatient(patientId: number): Promise<string> {
  try {
    const patient = await db.getPatientById(patientId);
    if (patient?.treatingDoctor) {
      return String(patient.treatingDoctor).trim();
    }
  } catch {
    // Fall back to empty string if query fails
  }
  return "";
}

/**
 * @deprecated Use readFreshDoctorNameForPatient instead
 * This function reads from patientPageStates cache and is no longer preferred
 */
function readDoctorNameFromStateData(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const payload = value as Record<string, any>;
  const direct = String(payload.doctorName ?? "").trim();
  if (direct) return direct;
  const signed = String(payload.signatures?.doctor ?? "").trim();
  return signed;
}

function readRoleSignatureFromStateData(value: unknown, role: "reception" | "nurse" | "technician"): string {
  if (!value || typeof value !== "object") return "";
  const payload = value as Record<string, any>;
  return String(payload.signatures?.[role] ?? "").trim();
}

async function resolveDoctorCodeById(doctorId?: number | null): Promise<string | undefined> {
  console.log(`[resolveDoctorCodeById] Looking up doctorId=${doctorId}`);
  if (!doctorId) {
    console.log(`[resolveDoctorCodeById] doctorId is empty, returning undefined`);
    return undefined;
  }
  try {
    const row = await db.getSystemSetting("doctor_directory");
    if (row?.value) {
      const doctors = JSON.parse(row.value) as Array<{ id?: string | number; code?: string }>;
      console.log(`[resolveDoctorCodeById] Found ${doctors.length} doctors in directory`);
      const doctor = doctors.find((d) => Number(d.id) === doctorId);
      if (doctor?.code) {
        console.log(`[resolveDoctorCodeById] Matched doctor ${doctorId} -> code=${doctor.code}`);
        return String(doctor.code).trim();
      } else {
        console.log(`[resolveDoctorCodeById] No matching doctor found for id=${doctorId}`);
      }
    } else {
      console.log(`[resolveDoctorCodeById] doctor_directory not found in system settings`);
    }
  } catch (err) {
    console.error(`[resolveDoctorCodeById] Error parsing doctor_directory:`, err);
  }
  return undefined;
}

async function resolveDoctorCodeByName(doctorName?: string | null): Promise<string | undefined> {
  const target = String(doctorName ?? "").trim().toLowerCase();
  if (!target) return undefined;
  try {
    const row = await db.getSystemSetting("doctor_directory");
    if (!row?.value) return undefined;
    const doctors = JSON.parse(row.value) as Array<{ name?: string; code?: string }>;
    const exact = doctors.find((d) => String(d?.name ?? "").trim().toLowerCase() === target);
    if (exact?.code) return String(exact.code).trim();
    const fuzzy = doctors.find((d) => {
      const n = String(d?.name ?? "").trim().toLowerCase();
      return n && (n.includes(target) || target.includes(n));
    });
    if (fuzzy?.code) return String(fuzzy.code).trim();
  } catch (err) {
    console.error(`[resolveDoctorCodeByName] Error parsing doctor_directory:`, err);
  }
  return undefined;
}

function normalizePhoneKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D+/g, "");
  return digits || raw.toLowerCase();
}

async function findExistingPatientByNameOrPhone(fullNameRaw?: string | null, phoneRaw?: string | null) {
  const fullName = String(fullNameRaw ?? "").trim();
  const phone = String(phoneRaw ?? "").trim();
  if (!fullName && !phone) return null;

  const byId = new Map<number, any>();
  const collect = (rows: any[]) => {
    for (const row of rows ?? []) {
      const id = Number((row as any)?.id ?? 0);
      if (!Number.isFinite(id) || id <= 0) continue;
      if (!byId.has(id)) byId.set(id, row);
    }
  };

  if (fullName) collect(await db.searchPatients(fullName));
  if (phone && phone !== fullName) collect(await db.searchPatients(phone));
  if (byId.size === 0) return null;

  const targetName = fullName.toLowerCase();
  const targetPhone = normalizePhoneKey(phone);
  const candidates = Array.from(byId.values());
  for (const candidate of candidates) {
    const candidateName = String((candidate as any)?.fullName ?? "").trim().toLowerCase();
    const candidatePhone = normalizePhoneKey((candidate as any)?.phone ?? "");
    const candidateAltPhone = normalizePhoneKey((candidate as any)?.alternatePhone ?? "");
    const nameMatch = Boolean(targetName) && candidateName === targetName;
    const phoneMatch = Boolean(targetPhone) && (candidatePhone === targetPhone || candidateAltPhone === targetPhone);
    if (nameMatch || phoneMatch) return candidate;
  }
  return null;
}

async function resolveServiceCodeForType(serviceType: string | undefined): Promise<string> {
  console.log(`[resolveServiceCodeForType] Starting with serviceType="${serviceType}"`);
  const type = String(serviceType ?? "").trim().toLowerCase();
  if (!type) {
    console.log(`[resolveServiceCodeForType] serviceType is empty, returning ""`);
    return "";
  }

  try {
    const row = await db.getSystemSetting("service_directory");
    console.log(`[resolveServiceCodeForType] service_directory row exists:`, Boolean(row?.value));

    let list: any[] = [];
    if (row?.value) {
      // Handle both string and already-parsed JSON
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      list = Array.isArray(value) ? value : [];
    }

    console.log(`[resolveServiceCodeForType] Found ${list.length} services`);

    // Filter by matching serviceType
    const matching = list.filter(
      (entry: any) =>
        entry &&
        entry.isActive !== false &&
        String(entry.code ?? "").trim() &&
        String(entry.serviceType ?? "").trim().toLowerCase() === type
    );

    if (matching.length > 0) {
      const code = String(matching[0].code).trim();
      console.log(`[resolveServiceCodeForType] Matched serviceType="${type}" to code=${code}`);
      return code;
    }

    // Do not fallback to an unrelated service code from another type.
    // Returning empty avoids writing a wrong service to MSSQL.
    console.log(`[resolveServiceCodeForType] No active service matched type="${type}"`);
  } catch (err) {
    console.error(`[resolveServiceCodeForType] Error:`, err);
  }

  console.log(`[resolveServiceCodeForType] Returning empty string`);
  return "";
}

async function pushNewPatientToMssql(patient: {
  patientCode: string;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  age?: number | null;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  branch?: string | null;
  serviceType?: string | null;
  locationType?: "center" | "external" | null;
  doctorCode?: string | null;
  enteredBy?: string | null;
  serviceCode?: string | null;
  servicePrice?: number | null;
  serviceQty?: number | null;
  discountValue?: number | null;
  paValue?: number | null;
}) {
  console.log(`[pushNewPatientToMssql] Patient ${patient.patientCode}, serviceType="${patient.serviceType}", providedServiceCode="${patient.serviceCode}"`);

  // Use only explicit serviceCode (or doctor-scoped resolution upstream). Avoid generic type-only inference.
  // Type-only fallback can map to the wrong service when multiple services share the same type.
  let serviceCode = String(patient.serviceCode ?? "").trim();
  console.log(`[pushNewPatientToMssql] Final serviceCode="${serviceCode}"`);

  return await insertPatientToMssql({
    patientCode: patient.patientCode,
    fullName: patient.fullName,
    phone: patient.phone,
    address: patient.address,
    age: patient.age,
    gender: patient.gender,
    dateOfBirth: patient.dateOfBirth,
    branch: patient.branch,
    locationType: patient.locationType ?? null,
    enteredBy: patient.enteredBy ?? null,
    serviceCode: serviceCode || undefined,
    doctorCode: patient.doctorCode || undefined,
    servicePrice: patient.servicePrice ?? undefined,
    serviceQty: patient.serviceQty ?? undefined,
    discountValue: patient.discountValue ?? undefined,
    paValue: patient.paValue ?? undefined,
  });
}

/** When either field is present, compute clamped discount and net PA_VL for MSSQL PAPAT_SRV. */
function registrationPricingPayload(input: {
  servicePrice?: number | null;
  serviceQty?: number | null;
  discountValue?: number | null;
}): { servicePrice: number; serviceQty: number; discountValue: number; paValue: number } | Record<string, never> {
  if (input.servicePrice == null && input.serviceQty == null && input.discountValue == null) {
    return {};
  }
  const servicePrice = Math.max(0, Number(input.servicePrice ?? 0));
  const serviceQty = Math.max(1, Math.trunc(Number(input.serviceQty ?? 1)) || 1);
  const gross = servicePrice * serviceQty;
  const disc = Math.min(Math.max(0, Number(input.discountValue ?? 0)), gross);
  const paValue = Math.max(0, gross - disc);
  return { servicePrice, serviceQty, discountValue: disc, paValue };
}

async function canPushToMssql(user: { id: number; role: string }): Promise<boolean> {
  const role = String(user.role ?? "").trim().toLowerCase();
  if (role === "admin") return true;
  const required = "/ops/mssql-add";

  try {
    // Check user-specific permissions first
    const state = await db.getUserPermissionState(user.id);
    if (state.hasOverride) {
      return state.pageIds.includes(required);
    }

    // Fall back to role defaults
    const roleDefaults = await db.getRoleDefaultPermissions(role);
    if (Array.isArray(roleDefaults) && roleDefaults.includes(required)) {
      return true;
    }

    // Final check: get effective permissions
    const effective = await db.getEffectiveUserPermissions(user.id, role);
    if (Array.isArray(effective) && effective.includes(required)) {
      return true;
    }

    return false;
  } catch (error) {
    console.warn("[mssql-push] Permission check failed:", error);
    return false;
  }
}

export const medicalRouter = router({
  // ============ PATIENT ROUTERS ============

  // Reception: Create new patient
  createPatient: protectedProcedure
    .input(z.object({
      patientCode: z.string().optional(),
      fullName: z.string(),
      dateOfBirth: z.string().optional(),
      age: z.number().optional(),
      gender: z.enum(["male", "female"]).optional(),
      nationalId: z.string().optional(),
      phone: z.string(),
      alternatePhone: z.string().optional(),
      address: z.string().optional(),
      occupation: z.string().optional(),
      referralSource: z.string().optional(),
      branch: z.enum(["examinations", "surgery"]).optional(),
      serviceType: z.enum(["consultant", "specialist", "lasik", "surgery", "external"]).optional(),
      locationType: z.enum(["center", "external"]).optional(),
      doctorId: z.number().optional(),
      doctorCode: z.string().optional(),
      doctorName: z.string().optional(),
      serviceCode: z.string().optional(),
      servicePrice: z.number().nonnegative().optional(),
      discountValue: z.number().nonnegative().optional(),
      lastVisit: z.string().optional(),
      skipIfExists: z.boolean().optional(),
    }))
    .mutation(async (opts) => {
      const { input, ctx } = opts;
      console.log(`[createPatient] Input received: doctorId=${input.doctorId}, doctorCode=${input.doctorCode}, serviceType=${input.serviceType}`);

      // Check permission for creating/editing patient data
      const permissions = await db.getEffectiveUserPermissions(ctx.user.id, ctx.user.role);
      const canCreatePatient =
        permissions.includes("/patient-data/edit") ||
        permissions.includes("/quick-entry") ||
        permissions.includes("/new-cases");
      if (!canCreatePatient) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create patient records. Contact admin to enable /patient-data/edit or patient intake permissions.",
        });
      }
      try {
        const { skipIfExists, ...patientInput } = input;
        const hasExplicitPatientCode = Boolean(String(patientInput.patientCode ?? "").trim());
        const existingByIdentity = hasExplicitPatientCode
          ? null
          : await findExistingPatientByNameOrPhone(patientInput.fullName, patientInput.phone);
        if (existingByIdentity) {
          const existingId = Number((existingByIdentity as any)?.id ?? 0);
          const existingCode = String((existingByIdentity as any)?.patientCode ?? "").trim();
          let pushResult: { inserted: boolean; note?: string; trNo?: number | null } | null = null;
          let mssqlPushError: string | null = null;
          if (existingId > 0) {
            await db.updatePatient(existingId, {
              lastVisit: patientInput.lastVisit ? new Date(patientInput.lastVisit) : new Date(),
              ...(patientInput.serviceType ? { serviceType: patientInput.serviceType } : {}),
              ...(patientInput.locationType ? { locationType: patientInput.locationType } : {}),
              ...(patientInput.doctorId ? { doctorId: patientInput.doctorId } : {}),
            }).catch(() => null);
          }
          if (!existingCode) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Existing patient has no patientCode" });
          }
          // Prefer explicit doctorCode, then doctorId, then doctorName.
          let doctorCode = String(patientInput.doctorCode ?? "").trim() || null;
          if (!doctorCode) {
            doctorCode = await resolveDoctorCodeById(patientInput.doctorId ?? (existingByIdentity as any)?.doctorId) ?? null;
          }
          if (!doctorCode) {
            doctorCode = await resolveDoctorCodeByName(patientInput.doctorName ?? null) ?? null;
          }
          const pricingPayload = registrationPricingPayload({
            servicePrice: patientInput.servicePrice,
            discountValue: patientInput.discountValue,
          });
          pushResult = await pushNewPatientToMssql({
              patientCode: existingCode,
              fullName: String((existingByIdentity as any)?.fullName ?? patientInput.fullName ?? "").trim(),
              phone: String((existingByIdentity as any)?.phone ?? patientInput.phone ?? "").trim() || null,
              address: String((existingByIdentity as any)?.address ?? patientInput.address ?? "").trim() || null,
              age: Number.isFinite(Number((existingByIdentity as any)?.age))
                ? Number((existingByIdentity as any)?.age)
                : Number.isFinite(Number(patientInput.age))
                  ? Number(patientInput.age)
                  : null,
              gender: String((existingByIdentity as any)?.gender ?? "").trim() || null,
              dateOfBirth: (existingByIdentity as any)?.dateOfBirth ?? patientInput.dateOfBirth ?? null,
              branch: String((existingByIdentity as any)?.branch ?? patientInput.branch ?? "examinations").trim() || "examinations",
              serviceType: patientInput.serviceType ?? ((existingByIdentity as any)?.serviceType ?? null),
              locationType:
                (patientInput.serviceType === "external" ? "external" : patientInput.locationType) ??
                (String((existingByIdentity as any)?.locationType ?? "").trim() === "external" ? "external" : "center"),
              doctorCode: doctorCode || null,
              enteredBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
              serviceCode: patientInput.serviceCode || null,
              servicePrice: pricingPayload.servicePrice,
              discountValue: pricingPayload.discountValue,
              paValue: pricingPayload.paValue,
            }).catch((error) => {
              mssqlPushError = String((error as any)?.message ?? error ?? "unknown");
              console.warn("[mssql-push] createPatient(existing) failed", {
                patientCode: existingCode,
                message: mssqlPushError,
              });
              return null;
            });
          if (!pushResult?.inserted && pushResult?.note) {
            mssqlPushError = pushResult.note;
          }
          await db.logAuditEvent(ctx.user.id, "CREATE_PATIENT_RECEIPT_EXISTING", "patient", existingId, {
            message: `Created new receipt for existing patient (name/phone match): ${String((existingByIdentity as any)?.fullName ?? "")}`,
            patientCode: existingCode,
            mssqlPushError,
          });
          return {
            success: true,
            reused: true,
            patientId: existingId,
            patientCode: existingCode,
            receiptNo: pushResult?.trNo ?? null,
            mssqlLinked: Boolean(pushResult?.inserted),
            ...(mssqlPushError ? { mssqlWarning: mssqlPushError } : {}),
          };
        }
        const code =
          patientInput.patientCode && patientInput.patientCode.trim()
            ? patientInput.patientCode.trim()
            : await db.getNextPatientCode();
        const existing = await db.getPatientByCode(code);
        if (existing) {
          if (skipIfExists) {
            return { success: true, skipped: true, patientId: existing.id ?? 0, patientCode: code };
          }
          throw new TRPCError({ code: "CONFLICT", message: "Patient code already exists" });
        }
        console.log(`[createPatient] Saving patient with doctorId=${patientInput.doctorId}`);
        await db.createPatient({
          ...patientInput,
          patientCode: code,
          branch: patientInput.branch || "examinations",
          serviceType: patientInput.serviceType || "consultant",
          locationType:
            patientInput.serviceType === "external"
              ? "external"
              : patientInput.locationType || "center",
          doctorId: patientInput.doctorId ?? null,
          // Opening date is the reference date for patient timeline/stats.
          lastVisit: patientInput.lastVisit ? new Date(patientInput.lastVisit) : new Date(),
          status: "new",
        });

        const created = await db.getPatientByCode(code);
        console.log(`[createPatient] Retrieved patient: doctorId=${(created as any).doctorId}`);
        let pushResult: { inserted: boolean; note?: string; trNo?: number | null } | null = null;
        if (created?.patientCode && created?.fullName) {
          // Prefer explicit doctorCode, then doctorId, then doctorName.
          let doctorCode = String(patientInput.doctorCode ?? "").trim() || null;
          if (!doctorCode) {
            doctorCode = await resolveDoctorCodeById((created as any).doctorId) ?? null;
          }
          if (!doctorCode) {
            doctorCode = await resolveDoctorCodeByName(patientInput.doctorName ?? null) ?? null;
          }
          console.log(`[createPatient] Resolved doctorCode=${doctorCode}`);
          const pricingPayload = registrationPricingPayload({
            servicePrice: patientInput.servicePrice,
            discountValue: patientInput.discountValue,
          });
          pushResult = await pushNewPatientToMssql({
            patientCode: String(created.patientCode),
            fullName: String(created.fullName),
            phone: created.phone,
            address: created.address,
            age: created.age,
            gender: (created as any).gender ?? null,
            dateOfBirth: (created as any).dateOfBirth ?? null,
            branch: (created as any).branch ?? "examinations",
            serviceType: (created as any).serviceType ?? null,
            locationType: (created as any).locationType ?? "center",
            doctorCode: doctorCode || null,
            enteredBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
            serviceCode: patientInput.serviceCode || null,
            servicePrice: pricingPayload.servicePrice,
            discountValue: pricingPayload.discountValue,
            paValue: pricingPayload.paValue,
          }).catch((error) => {
            console.warn("[mssql-push] createPatient failed", {
              patientCode: String(created.patientCode),
              message: String((error as any)?.message ?? error ?? "unknown"),
            });
            return null;
          });
        }
        await db.logAuditEvent(ctx.user.id, "CREATE_PATIENT", "patient", created?.id ?? 0, {
          message: `Created patient: ${input.fullName}`,
        });
        const notificationSettings = await getAppNotificationSettings().catch(() => ({
          mssqlOwnerEnabled: true,
          mssqlInAppEnabled: true,
          manualPatientInAppEnabled: true,
        }));
        if (notificationSettings.manualPatientInAppEnabled) {
          const targetRoles = resolveNotificationTargetRolesByUserRole((ctx.user as any)?.role);
          await pushAppNotification({
            title: "تمت إضافة مريض جديد",
            message: `${input.fullName} (${code})`,
            kind: "success",
            targetRoles,
            source: "manual_patient_create",
            entityType: "patient",
            entityId: Number(created?.id ?? 0) || null,
            meta: {
              patientCode: code,
              fullName: input.fullName,
              createdBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
            },
          }).catch((error) => {
            console.warn("[patient-create] Failed to append app notification:", error);
          });
        }

        return { success: true, patientId: created?.id ?? 0, patientCode: code, receiptNo: pushResult?.trNo ?? null };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new Error(`Failed to create patient: ${error}`);
      }
    }),

  stagePatientsImport: adminProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            rowNumber: z.number().int().positive(),
            patientCode: z.string().optional(),
            fullName: z.string().optional(),
            dateOfBirth: z.string().optional(),
            gender: z.enum(["male", "female", ""]).optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            branch: z.enum(["examinations", "surgery", ""]).optional(),
            serviceType: z.enum(["consultant", "specialist", "lasik", "surgery", "external", ""]).optional(),
            locationType: z.enum(["center", "external", ""]).optional(),
            doctorCode: z.string().optional(),
            doctorName: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batchId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const summary = await db.stagePatientImportRows(batchId, input.rows);
      await db.logAuditEvent(ctx.user.id, "STAGE_PATIENT_IMPORT", "patient_import_staging", 0, {
        batchId,
        total: summary.total,
        valid: summary.valid,
        invalid: summary.invalid,
      });
      return summary;
    }),

  applyPatientsImport: adminProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.applyPatientImportBatch(input.batchId);
      await db.logAuditEvent(ctx.user.id, "APPLY_PATIENT_IMPORT", "patient_import_staging", 0, {
        batchId: input.batchId,
        inserted: result.inserted,
        updated: result.updated,
        failed: result.failed,
      });
      return result;
    }),

  getPatientImportErrors: adminProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .query(async ({ input }) => {
      return await db.getPatientImportErrors(input.batchId);
    }),

  getPatientImportPreview: adminProcedure
    .input(z.object({ batchId: z.string().min(1), limit: z.number().int().min(1).max(500).optional() }))
    .query(async ({ input }) => {
      return await db.getPatientImportPreview(input.batchId, input.limit ?? 100);
    }),

  getOpsHealth: adminProcedure
    .query(async () => {
      return await db.getOpsHealthStatus();
    }),

  getBuildInfo: protectedProcedure
    .query(async () => {
      return await getBuildInfo();
    }),

  getRuntimeDbInfo: adminProcedure
    .query(async () => {
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
        const authPart = parsed.username || parsed.password ? `${maskedUser}${maskedPass}@` : "";
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

  syncPatientsFromMssql: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(20000).optional(),
          dryRun: z.boolean().optional(),
          incremental: z.boolean().optional(),
        })
        .optional()
    )
    .mutation(async ({ input, ctx }) => {
      const result = await syncPatientsFromMssql({
        limit: input?.limit,
        dryRun: input?.dryRun ?? false,
        incremental: input?.incremental ?? false,
      });
      await db.logAuditEvent(ctx.user.id, "SYNC_PATIENTS_FROM_MSSQL", "patient", 0, {
        fetched: result.fetched,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        dryRun: result.dryRun,
        incremental: result.incremental,
        incrementalSince: result.incrementalSince,
        lastMarker: result.lastMarker,
      });
      return result;
    }),

  resetPatientServiceTypesFromServiceCode: adminProcedure
    .input(
      z
        .object({
          dryRun: z.boolean().optional(),
          onlyConsultant: z.boolean().optional(),
        })
        .optional()
    )
    .mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");

      const dryRun = Boolean(input?.dryRun);
      const onlyConsultant = Boolean(input?.onlyConsultant);

      const svcRows = await dbConn
        .select({
          code: services.code,
          serviceType: services.serviceType,
          defaultSheet: services.defaultSheet,
        })
        .from(services)
        .where(eq(services.isActive, true));
      const svcMap = new Map<
        string,
        { serviceType: string | null; defaultSheet: string | null }
      >();
      for (const row of svcRows) {
        const code = normalizeServiceCodeKey(row.code);
        if (!code) continue;
        svcMap.set(code, {
          serviceType: (row.serviceType as string | null) ?? null,
          defaultSheet: (row.defaultSheet as string | null) ?? null,
        });
      }
      console.log(`[resetPatientServiceTypes] Loaded ${svcMap.size} services. Sample codes:`, Array.from(svcMap.keys()).slice(0, 10));

      const pageStateRows = await dbConn
        .select({
          patientId: patientPageStates.patientId,
          data: patientPageStates.data,
        })
        .from(patientPageStates)
        .where(eq(patientPageStates.page, "examination"));
      const sheetTypeByPatientId = new Map<number, Record<string, string>>();
      for (const row of pageStateRows) {
        const patientId = Number(row.patientId ?? 0);
        if (!patientId) continue;
        const rawData = row.data as any;
        const dataObj =
          rawData && typeof rawData === "object"
            ? rawData
            : (() => {
                try {
                  return JSON.parse(String(rawData ?? "{}"));
                } catch {
                  return {};
                }
              })();
        const rawMap =
          dataObj && typeof dataObj.serviceSheetTypeByCode === "object"
            ? (dataObj.serviceSheetTypeByCode as Record<string, unknown>)
            : {};
        const normalizedMap: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawMap)) {
          const nk = normalizeServiceCodeKey(k);
          const sv = String(v ?? "").trim();
          if (nk && sv) normalizedMap[nk] = sv;
        }
        if (Object.keys(normalizedMap).length > 0) sheetTypeByPatientId.set(patientId, normalizedMap);
      }

      // Get all patients with their current service type
      const allPatients = await dbConn
        .select({
          id: patients.id,
          serviceType: patients.serviceType,
        })
        .from(patients);

      // Get all service entries ordered by date (latest first per patient)
      const allServiceEntries = await dbConn
        .select({
          patientId: patientServiceEntries.patientId,
          serviceCode: patientServiceEntries.serviceCode,
          serviceDate: patientServiceEntries.serviceDate,
          id: patientServiceEntries.id,
        })
        .from(patientServiceEntries)
        .orderBy(desc(patientServiceEntries.serviceDate), desc(patientServiceEntries.id));

      // Build map of patient ID -> latest service code
      const latestServiceByPatient = new Map<number, { serviceCode: string | null; currentType: string | null }>();
      for (const p of allPatients) {
        latestServiceByPatient.set(p.id, {
          serviceCode: null,
          currentType: p.serviceType,
        });
      }

      // For each patient, find their latest service entry
      const seenPatients = new Set<number>();
      let withServiceEntry = 0;
      for (const entry of allServiceEntries) {
        const patientId = Number(entry.patientId ?? 0);
        if (!patientId || seenPatients.has(patientId)) continue;
        seenPatients.add(patientId);
        withServiceEntry++;
        latestServiceByPatient.set(patientId, {
          serviceCode: entry.serviceCode,
          currentType: latestServiceByPatient.get(patientId)?.currentType ?? null,
        });
      }
      console.log(`[resetPatientServiceTypes] Found ${allServiceEntries.length} total service entries, ${withServiceEntry} patients with latest service entries`);

      let scanned = 0;
      let updated = 0;
      let withCode = 0;
      let mappedFromServices = 0;
      let mappedFromPageState = 0;
      let unresolved = 0;
      const changedSample: Array<{ id: number; from: string; to: string; code: string }> = [];

      let filteredByConsultant = 0;
      for (const [id, { serviceCode, currentType }] of latestServiceByPatient.entries()) {
        scanned += 1;
        const code = normalizeServiceCodeKey(serviceCode);
        const normalizedCurrentType = String(currentType ?? "").trim().toLowerCase();
        if (!id || !code) continue;
        withCode += 1;
        if (onlyConsultant && normalizedCurrentType !== "consultant") {
          filteredByConsultant++;
          continue;
        }

        const svc = svcMap.get(code);
        let nextType: string | null = null;

        // Map service's defaultSheet directly to patient serviceType
        if (svc && svc.defaultSheet) {
          const sheet = String(svc.defaultSheet).trim().toLowerCase();
          // Direct sheet-to-type mapping
          if (sheet === "external") nextType = "external";
          else if (sheet === "surgery") nextType = "surgery";
          else if (sheet === "specialist") nextType = "specialist";
          else if (sheet === "lasik") nextType = "lasik";
          else if (sheet === "consultant") nextType = "consultant";
          mappedFromServices += 1;
        } else {
          unresolved += 1;
        }

        if (id % 500 === 0 || code === "1586" || (code === "1521" && id < 1000) || (code === "1572" && id < 1000)) {
          console.log(`[resetPatientServiceTypes] Patient ${id}: code="${code}", currentType="${normalizedCurrentType}", svc=${svc ? `{defaultSheet:"${svc.defaultSheet}"}` : "null"}, nextType="${nextType}", willUpdate=${!nextType || nextType === normalizedCurrentType ? "NO" : "YES"}`);
        }
        if (!nextType || nextType === normalizedCurrentType) continue;

        if (!dryRun) {
          await dbConn
            .update(patients)
            .set({
              serviceType: nextType as any,
              ...(nextType === "external" ? { locationType: "external" as const } : {}),
              updatedAt: new Date(),
            })
            .where(eq(patients.id, id));
        }
        updated += 1;
        if (changedSample.length < 20) {
          changedSample.push({ id, from: normalizedCurrentType || "-", to: nextType, code });
        }
      }

      console.log(`[resetPatientServiceTypes] SUMMARY: scanned=${scanned}, withCode=${withCode}, filteredByConsultant=${filteredByConsultant}, mappedFromServices=${mappedFromServices}, mappedFromPageState=${mappedFromPageState}, unresolved=${unresolved}, updated=${updated}, dryRun=${dryRun}, onlyConsultant=${onlyConsultant}`);

      await db.logAuditEvent(ctx.user.id, "RESET_PATIENT_SERVICE_TYPES_FROM_SERVICE_CODE", "patient", 0, {
        scanned,
        updated,
        dryRun,
        onlyConsultant,
      });

      return {
        scanned,
        withCode,
        updated,
        dryRun,
        onlyConsultant,
        mappedFromServices,
        mappedFromPageState,
        unresolved,
        sample: changedSample,
      };
    }),

  resetMssqlSyncCodes: adminProcedure
    .mutation(async ({ ctx }) => {
      const affected = await db.resetMssqlSyncCodes();
      await db.logAuditEvent(ctx.user.id, "RESET_MSSQL_SYNC_CODES", "patient", 0, { affected });
      return { affected };
    }),

  resetPatientsAutoIncrement: adminProcedure
    .input(z.object({ value: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");
      await dbConn.execute(`ALTER TABLE patients AUTO_INCREMENT = ${input.value}`);
      await db.logAuditEvent(ctx.user.id, "RESET_PATIENTS_AUTO_INCREMENT", "patient", 0, { value: input.value });
      return { value: input.value };
    }),

  getMssqlSyncStatus: adminProcedure
    .query(async () => {
      try {
        return await getMssqlSyncStatus();
      } catch (error) {
        console.warn("[medical.getMssqlSyncStatus] fallback", error);
        return {
          lastSuccessAt: null,
          lastMarker: null,
          lastMode: null,
          lastResult: null,
          running: false,
          lastRunStartedAt: null,
          lastRunFinishedAt: null,
          lastError: "unavailable",
          nextRunAt: null,
          lastChangeCount: null,
        };
      }
    }),

  backfillMssqlServiceNames: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50000).optional(),
        })
        .optional()
    )
    .mutation(async ({ input, ctx }) => {
      const result = await backfillPapatSrvNamesInMssql(input?.limit);
      await db.logAuditEvent(ctx.user.id, "BACKFILL_MSSQL_PAPAT_SRV_NAMES", "systemSetting", 0, {
        limit: input?.limit ?? null,
        updated: result.updated,
        note: result.note ?? "",
      });
      return result;
    }),

  getMssqlSyncRuntimeConfig: adminProcedure
    .query(async () => {
      const fallback = DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG;
      const row = await db.getSystemSetting("mssql_sync_runtime_v1").catch(() => null);
      if (!row?.value) return fallback;
      try {
        const parsed = JSON.parse(String(row.value ?? "{}")) as Record<string, unknown>;
        return {
          enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : fallback.enabled,
          intervalMs:
            Number.isFinite(Number(parsed.intervalMs)) && Number(parsed.intervalMs) >= 5_000
              ? Math.trunc(Number(parsed.intervalMs))
              : fallback.intervalMs,
          limit:
            Number.isFinite(Number(parsed.limit)) && Number(parsed.limit) >= 1
              ? Math.min(20_000, Math.trunc(Number(parsed.limit)))
              : fallback.limit,
          incremental:
            typeof parsed.incremental === "boolean" ? parsed.incremental : fallback.incremental,
          overwriteExisting:
            typeof parsed.overwriteExisting === "boolean"
              ? parsed.overwriteExisting
              : fallback.overwriteExisting,
          preserveManualEdits:
            typeof parsed.preserveManualEdits === "boolean"
              ? parsed.preserveManualEdits
              : fallback.preserveManualEdits,
          linkServicesForExisting:
            typeof parsed.linkServicesForExisting === "boolean"
              ? parsed.linkServicesForExisting
              : fallback.linkServicesForExisting,
        };
      } catch {
        return fallback;
      }
    }),

  updateMssqlSyncRuntimeConfig: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        intervalMs: z.number().int().min(5000).max(3600000),
        limit: z.number().int().min(1).max(20000),
        incremental: z.boolean(),
        overwriteExisting: z.boolean().optional(),
        preserveManualEdits: z.boolean().optional(),
        linkServicesForExisting: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.overwriteExisting) {
        await db.logAuditEvent(ctx.user.id, "MSSQL_SYNC_OVERWRITE_MODE_ENABLED", "systemSetting", 0, {
          warning:
            "Overwrite mode will backfill patient fields. Existing user-edited values may be changed if empty-check allows update path.",
        });
      }
      await db.updateSystemSettings("mssql_sync_runtime_v1", {
        enabled: input.enabled,
        intervalMs: input.intervalMs,
        limit: input.limit,
        incremental: input.incremental,
        overwriteExisting:
          typeof input.overwriteExisting === "boolean"
            ? input.overwriteExisting
            : String(process.env.MSSQL_SYNC_UPDATE_EXISTING ?? "false").toLowerCase() === "true",
        preserveManualEdits:
          typeof input.preserveManualEdits === "boolean"
            ? input.preserveManualEdits
            : String(process.env.MSSQL_SYNC_PRESERVE_MANUAL_EDITS ?? "true").toLowerCase() !== "false",
        linkServicesForExisting:
          typeof input.linkServicesForExisting === "boolean"
            ? input.linkServicesForExisting
            : String(process.env.MSSQL_SYNC_LINK_SERVICES_FOR_EXISTING ?? "true").toLowerCase() !== "false",
      });
      await db.logAuditEvent(ctx.user.id, "UPDATE_MSSQL_SYNC_RUNTIME_CONFIG", "systemSetting", 0, {
        ...input,
      });
      return { success: true };
    }),

  // Create patient from examination (any authenticated user)
  createPatientFromExamination: protectedProcedure
    .input(z.object({
      patientCode: z.string().optional(),
      fullName: z.string(),
      dateOfBirth: z.string().optional(),
      age: z.number().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      occupation: z.string().optional(),
      serviceType: z.enum(["consultant", "specialist", "lasik", "surgery", "external"]).optional(),
      locationType: z.enum(["center", "external"]).default("center"),
      doctorId: z.number().optional(),
      doctorCode: z.string().optional(),
      doctorName: z.string().optional(),
      serviceCode: z.string().optional(),
      servicePrice: z.number().optional(),
      serviceQty: z.number().optional(),
      discountValue: z.number().optional(),
      services: z.array(z.object({
        code: z.string(),
        qty: z.union([z.string(), z.number()]),
        price: z.number(),
        discount: z.number(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const existingByIdentity = await findExistingPatientByNameOrPhone(input.fullName, input.phone ?? "");
        
        // Resolve doctor code
        let doctorCode = String(input.doctorCode ?? "").trim() || null;
        if (!doctorCode) {
          doctorCode = await resolveDoctorCodeById(input.doctorId ?? (existingByIdentity as any)?.doctorId) ?? null;
        }
        if (!doctorCode) {
          doctorCode = await resolveDoctorCodeByName(input.doctorName ?? null) ?? null;
        }

        const processServices = input.services && input.services.length > 0 
          ? input.services 
          : input.serviceCode ? [{ code: input.serviceCode, qty: input.serviceQty ?? 1, price: input.servicePrice ?? 0, discount: input.discountValue ?? 0 }] : [];

        if (existingByIdentity) {
          const existingId = Number((existingByIdentity as any)?.id ?? 0);
          const existingCode = String((existingByIdentity as any)?.patientCode ?? "").trim();
          
          if (existingId > 0) {
            await db.updatePatient(existingId, {
              lastVisit: new Date(),
              ...(input.serviceType ? { serviceType: input.serviceType } : {}),
              ...(input.locationType ? { locationType: input.locationType } : {}),
              ...(input.doctorId ? { doctorId: input.doctorId } : {}),
            }).catch(() => null);
          }

          if (!existingCode) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Existing patient has no patientCode" });
          }

          let firstTrNo: number | null = null;

          // Push all services
          for (let i = 0; i < processServices.length; i++) {
            const srv = processServices[i];
            const pricingPayload = registrationPricingPayload({
              servicePrice: srv.price,
              serviceQty: Number(srv.qty) || 1,
              discountValue: srv.discount,
            });

            const pushResult = await pushNewPatientToMssql({
              patientCode: existingCode,
              fullName: String((existingByIdentity as any)?.fullName ?? input.fullName ?? "").trim(),
              phone: String((existingByIdentity as any)?.phone ?? input.phone ?? "").trim() || null,
              address: String((existingByIdentity as any)?.address ?? input.address ?? "").trim() || null,
              age: Number.isFinite(Number((existingByIdentity as any)?.age))
                ? Number((existingByIdentity as any)?.age)
                : Number.isFinite(Number(input.age))
                  ? Number(input.age)
                  : null,
              gender: String((existingByIdentity as any)?.gender ?? "").trim() || null,
              dateOfBirth: (existingByIdentity as any)?.dateOfBirth ?? input.dateOfBirth ?? null,
              branch: String((existingByIdentity as any)?.branch ?? "examinations").trim() || "examinations",
              serviceType: input.serviceType ?? ((existingByIdentity as any)?.serviceType ?? null),
              locationType:
                (input.serviceType === "external" ? "external" : input.locationType) ??
                (String((existingByIdentity as any)?.locationType ?? "").trim() === "external" ? "external" : "center"),
              doctorCode: doctorCode || null,
              enteredBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
              serviceCode: srv.code,
              servicePrice: "servicePrice" in pricingPayload ? pricingPayload.servicePrice ?? null : null,
              serviceQty: "serviceQty" in pricingPayload ? pricingPayload.serviceQty ?? null : null,
              discountValue: "discountValue" in pricingPayload ? pricingPayload.discountValue ?? null : null,
              paValue: "paValue" in pricingPayload ? pricingPayload.paValue ?? null : null,
            });

            if (i === 0) firstTrNo = pushResult?.trNo ?? null;
          }

          await db.logAuditEvent(ctx.user.id, "CREATE_PATIENT_RECEIPT_EXISTING_MULTI", "patient", existingId, {
            message: `Created ${processServices.length} receipts for existing patient`,
            patientCode: existingCode,
          });

          return {
            id: existingId,
            patientCode: existingCode,
            fullName: String((existingByIdentity as any)?.fullName ?? input.fullName ?? ""),
            receiptNo: firstTrNo,
          };
        }

        const code =
          input.patientCode && input.patientCode.trim()
            ? input.patientCode.trim()
            : await db.getNextPatientCode();

        const existing = await db.getPatientByCode(code);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Patient code already exists" });
        }

        await db.createPatient({
          patientCode: code,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth || null,
          age: input.age ?? null,
          phone: input.phone || "",
          address: input.address || "",
          occupation: input.occupation || "",
          gender: null,
          branch: "examinations",
          serviceType: input.serviceType || "consultant",
          locationType: input.locationType || "center",
          doctorId: input.doctorId || null,
        });

        const newPatient = await db.getPatientByCode(code);
        if (!newPatient) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create patient record" });
        }

        let firstTrNo: number | null = null;
        for (let i = 0; i < processServices.length; i++) {
          const srv = processServices[i];
          const pricingPayload = registrationPricingPayload({
            servicePrice: srv.price,
            serviceQty: Number(srv.qty) || 1,
            discountValue: srv.discount,
          });

          const pushResult = await pushNewPatientToMssql({
            patientCode: code,
            fullName: input.fullName,
            phone: input.phone || null,
            address: input.address || null,
            age: input.age ?? null,
            dateOfBirth: input.dateOfBirth || null,
            branch: "examinations",
            serviceType: input.serviceType || "consultant",
            locationType: input.locationType,
            doctorCode: doctorCode || null,
            enteredBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
            serviceCode: srv.code,
            servicePrice: "servicePrice" in pricingPayload ? pricingPayload.servicePrice ?? null : null,
            serviceQty: "serviceQty" in pricingPayload ? pricingPayload.serviceQty ?? null : null,
            discountValue: "discountValue" in pricingPayload ? pricingPayload.discountValue ?? null : null,
            paValue: "paValue" in pricingPayload ? pricingPayload.paValue ?? null : null,
          });
          if (i === 0) firstTrNo = pushResult?.trNo ?? null;
        }

        await db.logAuditEvent(ctx.user.id, "CREATE_PATIENT_MULTI_SRV", "patient", Number(newPatient.id), {
          message: `Registered new patient with ${processServices.length} services`,
          patientCode: code,
        });

        return {
          id: Number(newPatient.id),
          patientCode: code,
          fullName: input.fullName,
          receiptNo: firstTrNo,
        };
      } catch (error: any) {
        console.error("[medical:createPatientFromExamination]", error);
        throw new TRPCError({
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create patient and receipts",
        });
      }
    }),

  linkMultipleServicesToMssql: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      services: z.array(z.object({
        code: z.string().min(1),
        quantity: z.number().int().min(1).max(10).optional(),
        doctorCode: z.string().optional(),
        doctorName: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowed = await canPushToMssql(ctx.user);
      if (!allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission for MSSQL adding" });
      }
      const patient = await db.getPatientById(input.patientId);
      const patientCode = String((patient as any)?.patientCode ?? "").trim();
      if (!patientCode) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Patient code missing" });
      }

      const results = [];
      for (const srv of input.services) {
        const res = await ensurePatientServiceInMssql(
          patientCode,
          srv.code,
          srv.quantity ?? null,
          String(srv.doctorCode ?? "").trim() || null,
          String(srv.doctorName ?? "").trim() || null
        );
        results.push({ serviceCode: srv.code, linked: res.linked, note: res.note });
      }

      await db.logAuditEvent(ctx.user.id, "LINK_MULTIPLE_SERVICES_MSSQL", "patient", input.patientId, {
        patientCode,
        count: input.services.length,
        results,
      });

      return { success: true, results };
    }),

  getPatientServiceEntries: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPatientServiceEntriesByPatient(input.patientId);
    }),

  // Search patients
  searchPatients: protectedProcedure
    .input(
      z.object({
        searchTerm: z.string(),
        sheetType: z.enum(["consultant", "specialist", "lasik", "external", "pentacam"]).optional(),
        locationType: z.enum(["center", "external"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.searchPatients(input.searchTerm, input.sheetType, input.locationType);
    }),

  // Get all patients
  getAllPatients: protectedProcedure
    .input(
      z.object({
        branch: z.enum(["examinations", "surgery"]).optional(),
        searchTerm: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        doctorName: z.string().optional(),
        serviceType: z.enum(["consultant", "specialist", "lasik", "surgery", "external"]).optional(),
        locationType: z.enum(["center", "external"]).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        cursor: z
          .object({
            codeNum: z.number(),
            patientCode: z.string(),
            id: z.number().int().positive(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.getAllPatients(input);
    }),

    getPatientStats: adminProcedure
      .input(
        z.object({
        year: z.number().int().min(1900).max(3000),
        month: z.number().int().min(1).max(12).optional(),
        searchTerm: z.string().optional(),
        doctorName: z.string().optional(),
        serviceType: z.enum(["consultant", "specialist", "lasik", "surgery", "external"]).optional(),
        locationType: z.enum(["center", "external"]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
        return await db.getPatientStats(input.year, input.month, {
          searchTerm: input.searchTerm,
          doctorName: input.doctorName,
          serviceType: input.serviceType,
          locationType: input.locationType,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        });
      }),
  getPatientStatsBundle: adminProcedure
      .input(
        z.object({
          year: z.number().int().min(1900).max(3000),
          month: z.number().int().min(1).max(12),
          searchTerm: z.string().optional(),
          doctorName: z.string().optional(),
          serviceType: z.enum(["consultant", "specialist", "lasik", "surgery", "external"]).optional(),
          locationType: z.enum(["center", "external"]).optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        const filters = {
          searchTerm: input.searchTerm,
          doctorName: input.doctorName,
          serviceType: input.serviceType,
          locationType: input.locationType,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        };

        let previousYear = input.year;
        let previousMonth = input.month - 1;
        if (previousMonth < 1) {
          previousMonth = 12;
          previousYear -= 1;
        }

        const [currentMonth, previousMonthStats, yearly] = await Promise.all([
          db.getPatientStats(input.year, input.month, filters),
          db.getPatientStats(previousYear, previousMonth, filters),
          db.getPatientStats(input.year, undefined, filters),
        ]);

        return {
          currentMonth,
          previousMonth: previousMonthStats,
          yearly,
        };
      }),

  getTodayPatientsBySheet: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getTodayPatientsBySheet(input?.date);
    }),

  // Update patient
  updatePatient: receptionProcedure
    .input(z.object({
      patientId: z.number(),
      updates: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const nextUpdates = { ...input.updates } as Record<string, any>;
        const beforePatient = await db.getPatientById(input.patientId);
        if (Object.prototype.hasOwnProperty.call(nextUpdates, "dateOfBirth")) {
          const rawDob = nextUpdates.dateOfBirth;
          if (rawDob == null || String(rawDob).trim() === "") {
            nextUpdates.dateOfBirth = null;
          } else {
            const raw = String(rawDob).trim();
            const ymd = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (ymd) {
              nextUpdates.dateOfBirth = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
            } else {
              const parsed = new Date(raw.replace(/\bGM\b/g, "GMT"));
              if (Number.isNaN(parsed.valueOf())) {
                delete nextUpdates.dateOfBirth;
              } else {
                nextUpdates.dateOfBirth = parsed.toISOString().slice(0, 10);
              }
            }
          }
        }
        if (nextUpdates.serviceType === "external") {
          nextUpdates.locationType = "external";
        }
        await db.updatePatient(input.patientId, nextUpdates);
        const updated = await db.getPatientById(input.patientId);

        // Push patient details only to MSSQL (no service linking from update flow).
        if (updated?.patientCode && updated?.fullName && (await canPushToMssql(ctx.user))) {
          await upsertPatientToMssql({
            patientCode: String(updated.patientCode),
            fullName: String(updated.fullName),
            phone: String((updated as any).phone ?? "").trim() || null,
            address: String((updated as any).address ?? "").trim() || null,
            age: Number.isFinite(Number((updated as any).age)) ? Number((updated as any).age) : null,
            gender: String((updated as any).gender ?? "").trim() || null,
            dateOfBirth: (updated as any).dateOfBirth ?? null,
            branch: String((updated as any).branch ?? "").trim() || null,
            locationType: String((updated as any).locationType ?? "").trim() || null,
            enteredBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
          }).catch((error) => {
            console.warn("[mssql-push] updatePatient upsert failed", {
              patientCode: String(updated.patientCode),
              message: String((error as any)?.message ?? error ?? "unknown"),
            });
          });
        }

        // Service linking to MSSQL is explicit only via linkPatientServiceToMssql mutation.
        // Keep updatePatient from adding extra service rows based on serviceType changes.
        
        await db.logAuditEvent(
          ctx.user.id,
          "UPDATE_PATIENT",
          "patient",
          input.patientId,
          { message: `Updated patient data` }
        );
        
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to update patient: ${error}`);
      }
    }),

  bulkAssignDoctorToPatients: adminProcedure
    .input(
      z.object({
        patientIds: z.array(z.number()).min(1),
        doctorCode: z.string().min(1),
        doctorName: z.string().min(1),
        doctorLocationType: z.enum(["center", "external"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const uniqueIds = Array.from(new Set(input.patientIds.filter((id) => Number.isFinite(id))));
      const nextDoctorCode = input.doctorCode.trim();
      const nextDoctorName = input.doctorName.trim();
      const nextLocationType = input.doctorLocationType;
      const snapshots: Array<{
        patientId: number;
        serviceType: string | null;
        locationType: string | null;
        doctorName: string;
      }> = [];

      for (const patientId of uniqueIds) {
        const patient = await db.getPatientById(patientId);
        if (!patient) continue;
        const previousDoctorName = String((patient as any).treatingDoctor ?? "").trim();
        snapshots.push({
          patientId,
          serviceType: (patient as any).serviceType ?? null,
          locationType: (patient as any).locationType ?? null,
          doctorName: previousDoctorName,
        });

        const nextUpdates: Record<string, any> = {
          doctorCode: nextDoctorCode || null,
          doctorId: null,
          treatingDoctor: nextDoctorName || null,
          locationType: nextLocationType,
        };
        if (nextLocationType === "external") {
          nextUpdates.serviceType = "external";
        }
        await db.updatePatient(patientId, nextUpdates);
      }

      await db.logAuditEvent(ctx.user.id, "BULK_ASSIGN_DOCTOR", "patient", 0, {
        count: snapshots.length,
        fromLocationCounts: snapshots.reduce<Record<string, number>>((acc, item) => {
          const key = String(item.locationType ?? "unknown");
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
        fromDoctorSamples: Array.from(new Set(snapshots.map((s) => s.doctorName).filter(Boolean))).slice(0, 10),
        toDoctor: nextDoctorName,
        doctorCode: nextDoctorCode,
        doctorName: nextDoctorName,
        doctorLocationType: nextLocationType,
        patientIds: uniqueIds.slice(0, 200),
      });

      return { success: true, updatedCount: snapshots.length, snapshots };
    }),

  bulkAssignSheetTypeToPatients: adminProcedure
    .input(
      z.object({
        patientIds: z.array(z.number()).min(1),
        sheetType: z.enum(["consultant", "specialist", "lasik", "external", "surgery"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const uniqueIds = Array.from(new Set(input.patientIds.filter((id) => Number.isFinite(id))));
      const nextSheetType = input.sheetType;
      const snapshots: Array<{
        patientId: number;
        serviceType: string | null;
        locationType: string | null;
        doctorName: string;
      }> = [];

      for (const patientId of uniqueIds) {
        const patient = await db.getPatientById(patientId);
        if (!patient) continue;
        const existingState = await db.getPatientPageState(patientId, "examination");
        const existingData =
          existingState && typeof (existingState as any).data === "object" && (existingState as any).data
            ? ((existingState as any).data as Record<string, any>)
            : {};
        snapshots.push({
          patientId,
          serviceType: (patient as any).serviceType ?? null,
          locationType: (patient as any).locationType ?? null,
          doctorName: readDoctorNameFromStateData(existingData),
        });

        await db.updatePatient(patientId, {
          serviceType: nextSheetType,
          locationType: nextSheetType === "external" ? "external" : "center",
        });
      }

      await db.logAuditEvent(ctx.user.id, "BULK_ASSIGN_SHEET_TYPE", "patient", 0, {
        count: snapshots.length,
        fromServiceTypeCounts: snapshots.reduce<Record<string, number>>((acc, item) => {
          const key = String(item.serviceType ?? "unknown");
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
        fromLocationCounts: snapshots.reduce<Record<string, number>>((acc, item) => {
          const key = String(item.locationType ?? "unknown");
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
        toSheetType: nextSheetType,
        sheetType: nextSheetType,
        patientIds: uniqueIds.slice(0, 200),
      });

      return { success: true, updatedCount: snapshots.length, snapshots };
    }),

  bulkRestorePatients: adminProcedure
    .input(
      z.object({
        snapshots: z.array(
          z.object({
            patientId: z.number(),
            serviceType: z.string().nullable().optional(),
            locationType: z.string().nullable().optional(),
            doctorName: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const snapshots = input.snapshots.filter((item) => Number.isFinite(item.patientId));
      let restoredCount = 0;
      for (const snapshot of snapshots) {
        const nextUpdates: Record<string, any> = {};
        if (snapshot.serviceType) nextUpdates.serviceType = snapshot.serviceType;
        if (snapshot.locationType) nextUpdates.locationType = snapshot.locationType;
        if (Object.keys(nextUpdates).length > 0) {
          await db.updatePatient(snapshot.patientId, nextUpdates);
        }

        restoredCount += 1;
      }

      await db.logAuditEvent(ctx.user.id, "BULK_RESTORE_PATIENTS", "patient", 0, {
        count: restoredCount,
        patientIds: snapshots.map((s) => s.patientId).slice(0, 200),
      });
      return { success: true, restoredCount };
    }),

  // Delete patient with all related data
  deletePatientWithAllData: adminProcedure
    .input(z.object({ patientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.deletePatientWithAllData(input.patientId);
        await db.logAuditEvent(ctx.user.id, "DELETE_PATIENT_WITH_DATA", "patient", input.patientId, { message: "Deleted patient and all related data" });
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to delete patient and data: ${error}`);
      }
    }),

  // Delete visit with all related data
  deleteVisitWithAllData: adminProcedure
    .input(z.object({ visitId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.deleteVisitWithAllData(input.visitId);
        await db.logAuditEvent(ctx.user.id, "DELETE_VISIT_WITH_DATA", "visit", input.visitId, { message: "Deleted visit and all related data" });
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to delete visit and data: ${error}`);
      }
    }),

  // Delete examination directly (for orphaned exams with invalid visitId)
  deleteExaminationDirect: adminProcedure
    .input(z.object({ examinationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.deleteExaminationDirect(input.examinationId);
        await db.logAuditEvent(ctx.user.id, "DELETE_EXAMINATION", "examination", input.examinationId, { message: "Deleted examination and related data" });
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to delete examination: ${error}`);
      }
    }),

  // Fix orphaned examinations by linking them to proper visits
  fixOrphanedExaminations: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const result = await db.fixOrphanedExaminations();
        await db.logAuditEvent(ctx.user.id, "FIX_ORPHANED_EXAMINATIONS", "examination", 0, {
          message: `Fixed ${result.fixed} orphaned examinations out of ${result.total}`
        });
        return { success: true, ...result };
      } catch (error) {
        console.error("Fix orphaned examinations error:", error);
        throw new Error(`Failed to fix orphaned examinations: ${error}`);
      }
    }),

  // COMPREHENSIVE AUTO-FIX: Run all data repairs
  autoFixAllDataIssues: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const result = await db.autoFixAllDataIssues();
        await db.logAuditEvent(ctx.user.id, "AUTO_FIX_ALL_DATA_ISSUES", "system", 0, {
          message: `Auto-fixed all data issues: ${result.totalFixed} items fixed total. Details: visitId0=${result.fixExamsWithVisitId0.fixed}, orphaned=${result.fixOrphanedExaminations.fixed}, noAppt=${result.fixVisitsWithoutAppointmentId.fixed}`
        });
        return { success: true, ...result };
      } catch (error) {
        console.error("Auto-fix all error:", error);
        throw new Error(`Failed to auto-fix all issues: ${error}`);
      }
    }),

  // Diagnostic: Check for invalid visitIds
  checkInvalidVisitIds: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const result = await db.checkInvalidVisitIds();
        console.log("Invalid visitIds check result:", result);
        return { success: true, ...result };
      } catch (error) {
        console.error("Check invalid visitIds error:", error);
        throw new Error(`Failed to check invalid visitIds: ${error}`);
      }
    }),

  // Diagnostic: Check which visits don't have matching appointments
  checkVisitsWithoutAppointments: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const result = await db.checkVisitsWithoutAppointments();
        console.log("Visits without appointments check:", result);
        return { success: true, ...result };
      } catch (error) {
        console.error("Check visits without appointments error:", error);
        throw new Error(`Failed to check visits without appointments: ${error}`);
      }
    }),

  // CRITICAL FIX: Fix exams with visitId = 0 (prevents bulk deletion bug)
  fixExamsWithVisitId0: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const result = await db.fixExamsWithVisitId0();
        await db.logAuditEvent(ctx.user.id, "FIX_EXAMS_VISITID_0", "examination", 0, {
          message: `Fixed ${result.fixed} exams with visitId = 0. ${result.message}`
        });
        return { success: true, ...result };
      } catch (error) {
        console.error("Fix exams with visitId 0 error:", error);
        throw new Error(`Failed to fix exams with visitId = 0: ${error}`);
      }
    }),

  // Fix visits without appointmentId by linking to matching appointments
  fixVisitsWithoutAppointmentId: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const result = await db.fixVisitsWithoutAppointmentId();
        await db.logAuditEvent(ctx.user.id, "FIX_VISITS_WITHOUT_APPOINTMENT", "visit", 0, {
          message: `Fixed ${result.fixed} visits without appointmentId out of ${result.total}`
        });
        return { success: true, ...result };
      } catch (error) {
        console.error("Fix visits without appointment error:", error);
        throw new Error(`Failed to fix visits without appointmentId: ${error}`);
      }
    }),

  // Get dashboard card visibility settings (shared for all users)
  getDashboardCardVisibility: protectedProcedure
    .query(async () => {
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

  // Set dashboard card visibility (admin only)
  setDashboardCardVisibility: adminProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.updateSystemSettings("dashboard_card_visibility_v1", input);
        await db.logAuditEvent(ctx.user.id, "UPDATE_DASHBOARD_VISIBILITY", "system", 0, {
          message: `Updated dashboard card visibility`
        });
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
        await db.logAuditEvent(ctx.user.id, "DELETE_PATIENT", "patient", input.patientId, {
          message: `Deleted patient record: ${(patient as any).fullName}`,
        });
        return { success: true, patientId: input.patientId };
      } catch (error) {
        throw new Error(`Failed to delete patient: ${error}`);
      }
    }),

  deleteAllPatients: adminProcedure
    .mutation(async ({ ctx }) => {
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

  deletePatientFromMssql: adminProcedure
    .input(
      z.object({
        patientId: z.number().optional(),
        patientCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const codeFromInput = String(input.patientCode ?? "").trim();
      let patientCode = codeFromInput;
      if (!patientCode && input.patientId) {
        const patient = await db.getPatientById(input.patientId);
        patientCode = String((patient as any)?.patientCode ?? "").trim();
      }
      if (!patientCode) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing patient code for MSSQL delete" });
      }

      const result = await deletePatientFromMssqlByCode(patientCode);
      await db.logAuditEvent(ctx.user.id, "DELETE_PATIENT_MSSQL", "patient", Number(input.patientId ?? 0), {
        patientCode,
        deleted: result.deleted,
        note: result.note ?? "",
      });
      return { success: true, ...result, patientCode };
    }),

  linkPatientServiceToMssql: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        serviceCode: z.string().min(1),
        quantity: z.number().int().min(1).max(10).optional(),
        doctorCode: z.string().optional(),
        doctorName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const allowed = await canPushToMssql(ctx.user);
      if (!allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission for MSSQL adding" });
      }
      const patient = await db.getPatientById(input.patientId);
      const patientCode = String((patient as any)?.patientCode ?? "").trim();
      if (!patientCode) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Patient code missing" });
      }
      const serviceCode = String(input.serviceCode ?? "").trim();
      const result = await ensurePatientServiceInMssql(
        patientCode,
        serviceCode,
        input.quantity ?? null,
        String(input.doctorCode ?? "").trim() || null,
        String(input.doctorName ?? "").trim() || null
      );
      if (!result.linked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.note ? `MSSQL add failed: ${result.note}` : "MSSQL add failed",
        });
      }
      await db.logAuditEvent(ctx.user.id, "LINK_PATIENT_SERVICE_MSSQL", "patient", input.patientId, {
        patientCode,
        serviceCode,
        quantity: input.quantity ?? null,
        doctorCode: String(input.doctorCode ?? "").trim(),
        doctorName: String(input.doctorName ?? "").trim(),
        linked: result.linked,
        note: result.note ?? "",
      });
      return { success: true, linked: true, note: result.note ?? "", patientCode, serviceCode };
    }),

  // ============ APPOINTMENT ROUTERS ============

  // Create appointment
  createAppointment: receptionProcedure
    .input(z.object({
      patientId: z.number(),
      doctorId: z.number().optional(),
      appointmentDate: z.string(),
      appointmentType: z.enum(["examination", "surgery", "followup"]),
      branch: z.enum(["examinations", "surgery"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await db.createAppointment({
          ...input,
          appointmentDate: new Date(input.appointmentDate),
          status: "scheduled",
        });

        let appointmentId = (result as any)?.insertId as number | undefined;
        if (!appointmentId) {
          const createdMs = new Date(input.appointmentDate).getTime();
          const patientAppointments = await db.getAppointmentsByPatient(input.patientId);
          const candidates = patientAppointments
            .filter((row: any) => String(row?.appointmentType ?? "") === input.appointmentType)
            .filter((row: any) => String(row?.branch ?? "") === input.branch)
            .map((row: any) => {
              const rowMs =
                row?.appointmentDate instanceof Date
                  ? row.appointmentDate.getTime()
                  : new Date(String(row?.appointmentDate ?? "")).getTime();
              const delta = Number.isFinite(rowMs) ? Math.abs(rowMs - createdMs) : Number.MAX_SAFE_INTEGER;
              return { row, delta };
            })
            .filter((item: any) => item.delta <= 2 * 60 * 1000)
            .sort((a: any, b: any) => {
              if (a.delta !== b.delta) return a.delta - b.delta;
              return Number(b?.row?.id ?? 0) - Number(a?.row?.id ?? 0);
            });
          const matched = candidates[0]?.row;
          if (matched?.id && Number(matched.id) > 0) {
            appointmentId = Number(matched.id);
          }
        }
        if (!appointmentId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create appointment - no ID returned from database"
          });
        }

        await db.logAuditEvent(ctx.user.id, "CREATE_APPOINTMENT", "appointment", appointmentId, { message: `Created appointment for patient ${input.patientId}` });

        return { success: true, appointmentId };
      } catch (error) {
        throw new Error(`Failed to create appointment: ${error}`);
      }
    }),

  // Get appointments by patient
  getAppointmentsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAppointmentsByPatient(input.patientId);
    }),
  getMedicalTotals: protectedProcedure.query(async () => {
    return await db.getMedicalTotals();
  }),
  // Get all operations
  getOperations: protectedProcedure
    .query(async () => {
      return await db.getAllAppointments();
    }),
  // Alias: Get all operations
  getAllOperations: protectedProcedure
    .query(async () => {
      return await db.getAllAppointments();
    }),
  // Legacy: Keep getAppointments for backward compatibility
  getAppointments: protectedProcedure
    .query(async () => {
      return await db.getAllAppointments();
    }),
  // Delete appointment
  deleteAppointment: managerProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteAppointment(input.appointmentId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_APPOINTMENT",
        "appointment",
        input.appointmentId,
        { message: "Deleted appointment" }
      );
      return { success: true };
    }),
  // Update appointment (status/notes)
  updateAppointment: managerProcedure
    .input(z.object({
      appointmentId: z.number(),
      updates: z
        .object({
          status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
          notes: z.string().optional(),
        })
        .partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateAppointment(input.appointmentId, input.updates);
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_APPOINTMENT",
        "appointment",
        input.appointmentId,
        { message: "Updated appointment" }
      );
      return { success: true };
    }),

  // ============ EXAMINATION ROUTERS ============

  // Nurse: Create examination data
  createExamination: medicalStaffProcedure
    .input(z.object({
      visitId: z.number(),
      patientId: z.number(),
      ucvaOD: z.string().optional(),
      ucvaOS: z.string().optional(),
      bcvaOD: z.string().optional(),
      bcvaOS: z.string().optional(),
      refOD_S: z.number().optional(),
      refOD_C: z.number().optional(),
      refOD_A: z.number().optional(),
      refOS_S: z.number().optional(),
      refOS_C: z.number().optional(),
      refOS_A: z.number().optional(),
      iopOD: z.number().optional(),
      iopOS: z.number().optional(),
      examinationNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createExamination({
          ...input,
          examinedBy: ctx.user.id,
        });
        
        await db.logAuditEvent(ctx.user.id, "CREATE_EXAMINATION", "examination", 0, { message: `Created examination for patient ${input.patientId}` });
        const notificationSettings = await getAppNotificationSettings().catch(() => ({
          mssqlOwnerEnabled: true,
          mssqlInAppEnabled: true,
          manualPatientInAppEnabled: true,
        }));
        if (notificationSettings.manualPatientInAppEnabled) {
          await pushAppNotification({
            title: "تم تسجيل فحص تمريض",
            message: `Patient #${input.patientId}`,
            kind: "info",
            targetRoles: ["doctor"],
            source: "nurse_examination_create",
            entityType: "patient",
            entityId: input.patientId,
            meta: {
              visitId: input.visitId,
              patientId: input.patientId,
              createdBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
            },
          }).catch((error) => {
            console.warn("[examination-create] Failed to append app notification:", error);
          });
        }
        
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create examination: ${error}`);
      }
    }),

  // Get examinations by patient
  getExaminationsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getExaminationsByPatient(input.patientId);
    }),

  getAutorefractometryByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAutorefractometryByPatient(input.patientId);
    }),

  getAutorefractometryOverview: protectedProcedure
    .input(z.object({
      page: z.number().min(1).optional(),
      pageSize: z.number().min(1).max(200).optional(),
      search: z.string().optional(),
      statusFilter: z.enum(["all", "complete", "partial"]).optional(),
      locationType: z.enum(["center", "external"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return await db.getAutorefractometryOverviewRows({
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
        statusFilter: input?.statusFilter,
        locationType: input?.locationType,
      });
    }),

  getGlassesRecordsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getGlassesRecordsByPatient(input.patientId);
    }),

  getAfterRefractionByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAfterRefractionByPatient(input.patientId);
    }),

  saveAfterRefractionData: protectedProcedure
    .input(
      z.object({
        examinationId: z.number().int().positive(),
        patientId: z.number().int().positive(),
        od: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional() }).optional(),
        os: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional() }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.saveAfterRefractionData(input);
    }),

  getVisitsByPatient: protectedProcedure
    .input(z.union([
      z.number(),
      z.object({ patientId: z.number() })
    ]).nullable().optional())
    .query(async ({ input }) => {
      let patientId = null;
      if (typeof input === 'number') {
        patientId = input;
      } else if (input && typeof input === 'object' && 'patientId' in input) {
        patientId = input.patientId;
      }
      if (patientId === 0) {
        return await db.getAllVisits();
      }
      if (!patientId) return [];
      return await db.getVisitsByPatient(patientId);
    }),

  getFollowupVisitsByPatient: protectedProcedure
    .input(z.union([
      z.number(),
      z.object({ patientId: z.number() })
    ]).nullable().optional())
    .query(async ({ input }) => {
      let patientId = null;
      if (typeof input === 'number') {
        patientId = input;
      } else if (input && typeof input === 'object' && 'patientId' in input) {
        patientId = input.patientId;
      }
      if (!patientId) return [];
      return await db.getFollowupVisitsByPatient(patientId);
    }),

  // Get all visits
  getVisits: protectedProcedure
    .query(async () => {
      return await db.getAllVisits();
    }),

  // Get all examinations
  getExaminations: protectedProcedure
    .query(async () => {
      return await db.getAllExaminations();
    }),

  // Update visit date
  updateVisitDate: adminProcedure
    .input(z.object({
      visitId: z.number(),
      visitDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Parse the date
      const [year, month, day] = input.visitDate.split('-');
      const visitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      await db.updateVisit(input.visitId, { visitDate });
      return { success: true };
    }),

  updateVisitExamData: protectedProcedure
    .input(z.object({
      visitId: z.number(),
      updates: z.object({
        autorefraction: z.any().optional(),
        pentacam: z.any().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["doctor", "nurse", "admin", "manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions to update exam data" });
      }

      // Get examinations for this visit
      const exams = await db.getExaminationsByVisit(input.visitId);

      // Update autorefraction if provided
      if (input.updates.autorefraction && exams.length > 0) {
        const exam = exams[0];
        await db.saveAutorefractometryData({
          examinationId: exam.id,
          patientId: exam.patientId,
          od: input.updates.autorefraction?.od,
          os: input.updates.autorefraction?.os,
        });
      }

      // Update pentacam if provided
      if (input.updates.pentacam) {
        const pentacams = await db.getPentacamResultsByVisit(input.visitId);
        if (pentacams.length > 0) {
          const pentacam = pentacams[0];
          const updates: any = {};
          if (input.updates.pentacam.od) {
            updates.k1OD = input.updates.pentacam.od.k1;
            updates.k2OD = input.updates.pentacam.od.k2;
            updates.thinnestPointOD = input.updates.pentacam.od.thinnest;
          }
          if (input.updates.pentacam.os) {
            updates.k1OS = input.updates.pentacam.os.k1;
            updates.k2OS = input.updates.pentacam.os.k2;
            updates.thinnestPointOS = input.updates.pentacam.os.thinnest;
          }

          if (Object.keys(updates).length > 0) {
            await db.updatePentacamResult(pentacam.id, updates);
          }
        }
      }

      return { success: true };
    }),

  // ============ FOLLOWUP SHEET OPERATIONS ============

  saveFollowupSheet: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      sheetType: z.enum(["consultant", "specialist", "lasik", "external"]),
      followupItems: z.array(z.object({
        tableIndex: z.number(),
        followupDate: z.string().optional(),
        followupName: z.string().optional(),
        vaOD: z.string().optional(),
        vaOS: z.string().optional(),
        refracOD: z.any().optional(),
        refracOS: z.any().optional(),
        flapOD: z.any().optional(),
        flapOS: z.any().optional(),
        iopOD: z.string().optional(),
        iopOS: z.string().optional(),
        treatment: z.string().optional(),
        notes: z.string().optional(),
        rightEye: z.boolean().optional(),
        leftEye: z.boolean().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["doctor", "nurse", "admin", "manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions to save followup sheet" });
      }

      // Get or create followup sheet
      let sheet: any = await db.getLatestFollowupSheet(input.patientId, input.sheetType);
      let nextVersion = 1;

      if (sheet) {
        // Check if current version is full (4 items with dates)
        const items = await db.getFollowupItemsBySheet(sheet.id);
        const fullItems = items.filter((i: any) => i.followupDate);
        if (fullItems.length >= 4) {
          nextVersion = sheet.version + 1;
          sheet = null; // Create new sheet
        }
      }

      if (!sheet) {
        const result = await db.createFollowupSheet({
          patientId: input.patientId,
          sheetType: input.sheetType,
          version: nextVersion,
        });
        sheet = { id: (result as any)[0], patientId: input.patientId, sheetType: input.sheetType, version: nextVersion, createdAt: new Date(), updatedAt: new Date() };
      }

      // Save items
      for (const item of input.followupItems) {
        if (!item.followupDate) continue; // Skip empty items

        const existingItem = await db.getFollowupItemsBySheet(sheet.id);
        const existingIndex = existingItem.find((i: any) => i.tableIndex === item.tableIndex);

        if (existingIndex) {
          await db.updateFollowupItem(existingIndex.id, {
            followupDate: item.followupDate ? new Date(item.followupDate) : null,
            followupName: item.followupName,
            vaOD: item.vaOD,
            vaOS: item.vaOS,
            refracOD: item.refracOD ? JSON.stringify(item.refracOD) : null,
            refracOS: item.refracOS ? JSON.stringify(item.refracOS) : null,
            flapOD: item.flapOD ? JSON.stringify(item.flapOD) : null,
            flapOS: item.flapOS ? JSON.stringify(item.flapOS) : null,
            iopOD: item.iopOD,
            iopOS: item.iopOS,
            treatment: item.treatment,
            notes: item.notes,
            rightEye: item.rightEye ?? false,
            leftEye: item.leftEye ?? false,
          });
        } else {
          await db.createFollowupItem({
            followupSheetId: sheet.id,
            tableIndex: item.tableIndex,
            followupDate: item.followupDate ? new Date(item.followupDate) : null,
            followupName: item.followupName,
            vaOD: item.vaOD,
            vaOS: item.vaOS,
            refracOD: item.refracOD ? JSON.stringify(item.refracOD) : null,
            refracOS: item.refracOS ? JSON.stringify(item.refracOS) : null,
            flapOD: item.flapOD ? JSON.stringify(item.flapOD) : null,
            flapOS: item.flapOS ? JSON.stringify(item.flapOS) : null,
            iopOD: item.iopOD,
            iopOS: item.iopOS,
            treatment: item.treatment,
            notes: item.notes,
            rightEye: item.rightEye ?? false,
            leftEye: item.leftEye ?? false,
          });
        }
      }

      await db.logAuditEvent(ctx.user.id, "SAVE_FOLLOWUP_SHEET", "followup_sheets", sheet.id, { message: `Saved followup sheet version ${sheet.version}` });
      return { success: true, sheetId: sheet.id, version: sheet.version };
    }),

  getFollowupSheets: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      sheetType: z.enum(["consultant", "specialist", "lasik", "external"]).optional(),
    }))
    .query(async ({ input }) => {
      const sheets = await db.getFollowupSheetsByPatient(input.patientId, input.sheetType);
      const sheetsWithItems = await Promise.all((sheets as any[]).map(async (sheet) => ({
        ...sheet,
        items: await db.getFollowupItemsBySheet(sheet.id),
      })));
      return sheetsWithItems;
    }),

  // Get all examinations
  getAllExaminations: protectedProcedure
    .query(async () => {
      return await db.getAllExaminations();
    }),

  getRefractionsOverview: protectedProcedure
    .input(z.object({
      page: z.number().min(1).optional(),
      pageSize: z.number().min(1).max(200).optional(),
      search: z.string().optional(),
      statusFilter: z.enum(["all", "complete", "partial"]).optional(),
      locationType: z.enum(["center", "external"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return await db.getRefractionsOverviewRows({
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
        statusFilter: input?.statusFilter,
        locationType: input?.locationType,
      });
    }),

  // Update examination
  updateExamination: medicalStaffProcedure
    .input(z.object({
      examinationId: z.number(),
      updates: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateExamination(input.examinationId, input.updates);

      // Also persist to dedicated tables if autoref/glasses fields are in updates
      const u = input.updates;
      const hasAutoref = u.sphereOD || u.sphereOS || u.cylinderOD || u.cylinderOS || u.axisOD || u.axisOS || u.ucvaOD || u.ucvaOS || u.bcvaOD || u.bcvaOS || u.iopOD || u.iopOS;
      const hasGlasses = u.glassesData;

      if (hasAutoref || hasGlasses) {
        const exam = await db.getExaminationById(input.examinationId);
        if (exam?.patientId) {
          if (hasAutoref) {
            await db.saveAutorefractometryData({
              examinationId: input.examinationId,
              patientId: exam.patientId,
              sphereOD: u.sphereOD, cylinderOD: u.cylinderOD, axisOD: u.axisOD, ucvaOD: u.ucvaOD, bcvaOD: u.bcvaOD, iopOD: u.iopOD,
              sphereOS: u.sphereOS, cylinderOS: u.cylinderOS, axisOS: u.axisOS, ucvaOS: u.ucvaOS, bcvaOS: u.bcvaOS, iopOS: u.iopOS,
            });
          }
          if (hasGlasses) {
            let gd: any = {};
            try { gd = JSON.parse(u.glassesData); } catch { /* ignore */ }
            await db.saveGlassesRecord({
              examinationId: input.examinationId,
              patientId: exam.patientId,
              sOD: gd.od?.s, cOD: gd.od?.c, axisOD: gd.od?.axis || gd.od?.a, pdOD: gd.od?.pd, bcvaOD: gd.od?.bcva,
              sOS: gd.os?.s, cOS: gd.os?.c, axisOS: gd.os?.axis || gd.os?.a, pdOS: gd.os?.pd, bcvaOS: gd.os?.bcva,
            });
          }
        }
      }

      await db.logAuditEvent(ctx.user.id, "UPDATE_EXAMINATION", "examination", input.examinationId, { message: "Updated examination" });
      return { success: true };
    }),

  // ============ PENTACAM ROUTERS ============

  // Technician: Record Pentacam results
  createPentacamResult: technicianProcedure
    .input(z.object({
      visitId: z.number(),
      patientId: z.number(),
      ltK1: z.number().optional(),
      ltK2: z.number().optional(),
      ltAX: z.number().optional(),
      ltThinnestPoint: z.number().optional(),
      rtK1: z.number().optional(),
      rtK2: z.number().optional(),
      rtAX: z.number().optional(),
      rtThinnestPoint: z.number().optional(),
      techniciansNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createPentacamResult({
          ...input,
          recordedBy: ctx.user.id,
        });
        
        await db.logAuditEvent(ctx.user.id, "CREATE_PENTACAM", "pentacamResult", 0, { message: `Recorded Pentacam results for patient ${input.patientId}` });
        const notificationSettings = await getAppNotificationSettings().catch(() => ({
          mssqlOwnerEnabled: true,
          mssqlInAppEnabled: true,
          manualPatientInAppEnabled: true,
        }));
        if (notificationSettings.manualPatientInAppEnabled) {
          await pushAppNotification({
            title: "تم تسجيل بنتاكام",
            message: `Patient #${input.patientId}`,
            kind: "info",
            targetRoles: ["doctor"],
            source: "technician_pentacam_create",
            entityType: "patient",
            entityId: input.patientId,
            meta: {
              visitId: input.visitId,
              patientId: input.patientId,
              createdBy: String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || null,
            },
          }).catch((error) => {
            console.warn("[pentacam-create] Failed to append app notification:", error);
          });
        }
        
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create pentacam result: ${error}`);
      }
    }),

  // Doctor: Update or create pentacam results
  updatePentacamResult: medicalStaffProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { pentacamId, visitId, patientId, ...data } = input;

        if (pentacamId) {
          // Update existing pentacam record
          await db.updatePentacamResult(pentacamId, {
            ...data,
            recordedBy: ctx.user.id,
          });

          await db.logAuditEvent(ctx.user.id, "UPDATE_PENTACAM", "pentacamResult", pentacamId, { message: `Updated pentacam results` });
        } else {
          // Create new pentacam record
          await db.createPentacamResult({
            visitId,
            patientId,
            recordedBy: ctx.user.id,
            ...data,
          });

          await db.logAuditEvent(ctx.user.id, "CREATE_PENTACAM", "pentacamResult", 0, { message: `Created pentacam results for patient ${patientId}` });
        }

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to save pentacam result: ${error}`);
      }
    }),

  // Get Pentacam results by visit
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
      })
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
    .input(z.object({ locationType: z.enum(["center", "external"]).optional() }).optional())
    .query(async ({ input, ctx }) => {
    await assertPentacamViewPermission(ctx.user);
    const days = await db.getPentacamDashboardDayStats(input?.locationType);
    const sample = await db.getPentacamResultsForDashboard({ limit: 400, offset: 0, locationType: input?.locationType });
    const expanded = expandPentacamDashboardRows(sample);
    const needsRepeatEyes = expanded.filter((r) => r.quality === "repeat").length;
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
      const rows = await db.getPentacamResultsByPatient(input.patientId, input.limit ?? 100);
      return rows.map((row: any) => {
        const meta = parsePentacamLocalMeta(row.notes);
        const sourceRaw = String(meta?.originalFileName ?? meta?.sourceFileName ?? `Pentacam ${row.id}`);
        return {
          id: row.id,
          patientId: row.patientId,
          visitId: row.visitId,
          eyeSide: meta?.eyeSide ?? "",
          importStatus: meta?.importStatus ?? "imported",
          sourceFileName: sourceRaw,
          storageUrl: meta?.storageUrl ?? "",
          mimeType: meta?.mimeType ?? "",
          capturedAt: meta?.capturedAt ?? row.createdAt ?? null,
          importedAt: meta?.importedAt ?? row.createdAt ?? null,
        };
      });
    }),

  getPentacamMeasurementsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      await assertPentacamViewPermission(ctx.user);
      return await db.getPentacamResultsByPatient(input.patientId, input.limit ?? 10);
    }),

  removePentacamLink: protectedProcedure
    .input(
      z.object({
        resultId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deleted = await db.deletePentacamResultsByIds([input.resultId]);
      await db.logAuditEvent(ctx.user.id, "REMOVE_PENTACAM_LINK", "pentacamResult", input.resultId, {
        deleted,
      });
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pentacamExportsDir = path.resolve(process.cwd(), "Pentacam");
      const patient = await db.getPatientById(input.patientId);
      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }
      const patientCode = String((patient as any).patientCode ?? "").trim();
      const patientNameOrdered = sanitizeLabel(
        reorderPatientNameSecondThirdFirst(String((patient as any).fullName ?? ""))
      );
      const requested = Array.from(
        new Set(
          input.fileNames
            .map((value) => String(value ?? "").trim())
            .filter(Boolean)
        )
      );
      if (requested.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No files selected" });
      }

      const invalidPath = requested.find(
        (fileName) => fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")
      );
      if (invalidPath) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid file name: ${invalidPath}` });
      }

      const existingRows = await db.getPentacamResultsByPatient(input.patientId, 500);
      const existingFileNames = new Set<string>();
      for (const row of existingRows) {
        const meta = parsePentacamLocalMeta((row as any)?.notes);
        const source = String(meta?.originalFileName ?? meta?.sourceFileName ?? "").trim().toLowerCase();
        if (source) existingFileNames.add(source);
      }

      let imported = 0;
      let skipped = 0;
      let missing = 0;
      for (const fileName of requested) {
        const lowered = fileName.toLowerCase();
        if (!/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
          skipped += 1;
          continue;
        }
        if (existingFileNames.has(lowered)) {
          skipped += 1;
          continue;
        }

        const absolutePath = path.join(pentacamExportsDir, fileName);
        try {
          const s = await stat(absolutePath);
          if (!s.isFile()) {
            missing += 1;
            continue;
          }
        } catch {
          missing += 1;
          continue;
        }

        const importedAt = new Date().toISOString();
        const sourceFileName = stripLeadingCodeLabel(fileName);
        const meta = {
          kind: "local-pentacam-export-v1",
          originalFileName: fileName,
          sourceFileName,
          storageUrl: `/pentacam-exports/${encodeURIComponent(fileName)}`,
          mimeType: inferPentacamMimeType(fileName),
          eyeSide: inferPentacamEyeSideFromName(fileName),
          importStatus: "imported",
          capturedAt: inferPentacamCapturedAtFromName(fileName),
          importedAt,
        };
        await db.createPentacamResult({
          visitId: 0,
          patientId: input.patientId,
          recordedBy: ctx.user.id,
          notes: JSON.stringify(meta),
        });
        existingFileNames.add(lowered);
        imported += 1;
      }

      await db.logAuditEvent(ctx.user.id, "IMPORT_LOCAL_PENTACAM_EXPORTS", "pentacamResult", input.patientId, {
        patientId: input.patientId,
        requested: requested.length,
        imported,
        skipped,
        missing,
      });

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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pentacamExportsDir = path.resolve(process.cwd(), "Pentacam");
      const requested = Array.from(
        new Set(
          input.fileNames
            .map((value) => String(value ?? "").trim())
            .filter(Boolean)
        )
      );
      if (requested.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No files selected" });
      }

      const invalidPath = requested.find(
        (fileName) => fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")
      );
      if (invalidPath) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid file name: ${invalidPath}` });
      }

      const matcher = await buildPentacamPatientCandidates();
      const globalExistingSourceNames = new Set<string>();
      try {
        const recentNotes = await db.getRecentPentacamResultNotes(80000);
        for (const notes of recentNotes) {
          const meta = parsePentacamLocalMeta(notes);
          const original = String(meta?.originalFileName ?? "").trim().toLowerCase();
          const source = String(meta?.sourceFileName ?? "").trim().toLowerCase();
          if (original) globalExistingSourceNames.add(original);
          if (source) globalExistingSourceNames.add(source);
        }
      } catch {
        // If global preload fails, continue with patient-level duplicate checks only.
      }
      const existingByPatient = new Map<number, Set<string>>();
      const ensureExistingSet = async (patientId: number) => {
        if (existingByPatient.has(patientId)) return existingByPatient.get(patientId)!;
        const rows = await db.getPentacamResultsByPatient(patientId, 1000);
        const set = new Set<string>();
        for (const row of rows) {
          const meta = parsePentacamLocalMeta((row as any)?.notes);
          const source = String(meta?.originalFileName ?? meta?.sourceFileName ?? "").trim().toLowerCase();
          if (source) set.add(source);
        }
        existingByPatient.set(patientId, set);
        return set;
      };

      let imported = 0;
      let skipped = 0;
      let missing = 0;
      let unmatched = 0;
      const importedByPatient: Record<string, number> = {};
      const unresolvedFiles: string[] = [];

      for (const fileName of requested) {
        const lowered = fileName.toLowerCase();
        if (!/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
          skipped += 1;
          continue;
        }
        if (globalExistingSourceNames.has(lowered)) {
          skipped += 1;
          continue;
        }

        const absolutePath = path.join(pentacamExportsDir, fileName);
        try {
          const s = await stat(absolutePath);
          if (!s.isFile()) {
            missing += 1;
            continue;
          }
        } catch {
          missing += 1;
          continue;
        }

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

        const existingSet = await ensureExistingSet(patientId);
        if (existingSet.has(lowered)) {
          skipped += 1;
          continue;
        }

        const patientCode = String((matched.patient as any).patientCode ?? "").trim();
        const patientNameOrdered = sanitizeLabel(
          reorderPatientNameSecondThirdFirst(String((matched.patient as any).fullName ?? ""))
        );
        const importedAt = new Date().toISOString();
        const sourceFileName = stripLeadingCodeLabel(fileName);
        const meta = {
          kind: "local-pentacam-export-v1",
          originalFileName: fileName,
          sourceFileName,
          storageUrl: `/pentacam-exports/${encodeURIComponent(fileName)}`,
          mimeType: inferPentacamMimeType(fileName),
          eyeSide: inferPentacamEyeSideFromName(fileName),
          importStatus: "imported",
          capturedAt: inferPentacamCapturedAtFromName(fileName),
          importedAt,
          matchedBy: matched.matchedBy,
        };
        await db.createPentacamResult({
          visitId: 0,
          patientId,
          recordedBy: ctx.user.id,
          notes: JSON.stringify(meta),
        });
        existingSet.add(lowered);
        globalExistingSourceNames.add(lowered);
        imported += 1;
        importedByPatient[String(patientId)] = (importedByPatient[String(patientId)] ?? 0) + 1;
      }

      await db.logAuditEvent(ctx.user.id, "AUTO_IMPORT_LOCAL_PENTACAM_EXPORTS", "pentacamResult", 0, {
        requested: requested.length,
        imported,
        skipped,
        missing,
        unmatched,
      });

      return {
        success: true,
        requested: requested.length,
        imported,
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
        })
      )
      .mutation(async ({ input }) => {
        const requested = Array.from(
        new Set(
          input.fileNames
            .map((value) => String(value ?? "").trim())
            .filter(Boolean)
        )
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
        const top = suggestPatientsForPentacamFileName(fileName, matcher, limitPerFile);
        if (top.length === 0) continue;
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
        z.object({
          limit: z.number().int().min(1).max(100000).optional(),
        }).optional()
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

  listFailedPentacamFiles: adminProcedure
      .query(async () => {
        return await listFailedPentacamRows();
      }),

  previewFailedPentacamRename: adminProcedure
      .input(
        z.object({
          fileNames: z.array(z.string().min(1)).min(1).max(30),
          idCode: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const files = await previewFailedPentacamRenameTargets(input.fileNames, input.idCode);
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        const previews = await previewFailedPentacamRenameTargets([input.fileName], input.idCode);
      const preview = previews[0];
      const finalFileName = await moveFailedPentacamFile(input.fileName, preview.proposedFileName);
      await db.logAuditEvent(ctx.user.id, "REVIEW_FAILED_PENTACAM_FILE", "pentacamResult", 0, {
        fileName: input.fileName,
        idCode: input.idCode,
        finalFileName,
        duplicate: preview.willDuplicate,
      });
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        const previews = await previewFailedPentacamRenameTargets(input.fileNames, input.idCode);
      for (const preview of previews) {
        await moveFailedPentacamFile(preview.fileName, preview.proposedFileName);
      }
      await db.logAuditEvent(ctx.user.id, "REVIEW_FAILED_PENTACAM_GROUP", "pentacamResult", 0, {
        count: previews.length,
        idCode: input.idCode,
        files: previews.map((item) => ({
          fileName: item.fileName,
          finalFileName: item.proposedFileName,
          duplicate: item.willDuplicate,
        })),
      });
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        const safeFileName = assertSafePentacamFileName(input.fileName);
      const finalFileName = await moveFailedPentacamFile(safeFileName, safeFileName);
      await db.logAuditEvent(ctx.user.id, "RELEASE_FAILED_PENTACAM_FILE", "pentacamResult", 0, {
        fileName: input.fileName,
        finalFileName,
      });
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        const safeFileName = assertSafePentacamFileName(input.fileName);
      const matcher = await buildPentacamPatientCandidates();
      const suggestions = suggestPatientsForPentacamFileName(safeFileName, matcher, 3);
      const topSuggestion = suggestions[0];
      const detectedId = String((topSuggestion?.patient as any)?.patientCode ?? "").trim();
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
      await db.logAuditEvent(ctx.user.id, "RETRY_FAILED_PENTACAM_OCR", "pentacamResult", 0, {
        fileName: input.fileName,
        detectedId,
        score,
      });
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
      z.object({
        resultIds: z.array(z.number().int().positive()).optional(),
        obviousOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(100000).optional(),
      }).optional()
    )
      .mutation(async ({ input, ctx }) => {
        const explicitIds = Array.isArray(input?.resultIds) ? input!.resultIds : [];
      let ids = explicitIds;
      if (ids.length === 0) {
        const scanned = await scanMismatchedLocalPentacamLinks(Number(input?.limit ?? 80000));
        const obviousOnly = input?.obviousOnly !== false;
        ids = scanned
          .filter((row) => (obviousOnly ? row.kind === "obvious" : true))
          .map((row) => row.resultId);
      }
      const deleted = await db.deletePentacamResultsByIds(ids);
      await db.logAuditEvent(ctx.user.id, "UNLINK_MISMATCHED_LOCAL_PENTACAM", "pentacamResult", 0, {
        requested: ids.length,
        deleted,
      });
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
      })
    )
      .mutation(async ({ input, ctx }) => {
        const patient = await db.getPatientById(input.patientId);
      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }
      await db.reassignPentacamResultPatient(input.resultId, input.patientId);
      await db.logAuditEvent(ctx.user.id, "REASSIGN_LOCAL_PENTACAM_LINK", "pentacamResult", input.resultId, {
        patientId: input.patientId,
      });
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
        })
      )
      .mutation(async ({ input }) => {
        const rows = await db.searchPatients(String(input.searchTerm ?? "").trim());
      const limit = Number(input.limit ?? 10);
      const out: Array<{ patientId: number; patientCode: string; fullName: string }> = [];
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
  // ============ DOCTOR REPORT ROUTERS ============

  // Doctor: Create report
  createDoctorReport: medicalStaffProcedure
    .input(z.object({
      visitId: z.number(),
      patientId: z.number(),
      diagnosis: z.string(),
      clinicalOpinion: z.string().optional(),
      recommendedTreatment: z.string().optional(),
      surgeryType: z.string().optional(),
      surgeryScheduledDate: z.string().optional(),
      additionalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createDoctorReport({
          ...input,
          doctorId: ctx.user.id,
          surgeryScheduledDate: input.surgeryScheduledDate ? new Date(input.surgeryScheduledDate) : null,
        });
        
        await db.logAuditEvent(ctx.user.id, "CREATE_DOCTOR_REPORT", "doctorReport", 0, { message: `Created doctor report for patient ${input.patientId}` });
        
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create doctor report: ${error}`);
      }
    }),

  // Doctor: Update existing report
  updateDoctorReport: medicalStaffProcedure
    .input(z.object({
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
    }))
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
          updateData.surgeryScheduledDate = new Date(updates.surgeryScheduledDate).toISOString();
        }

        await db.updateDoctorReport(reportId, updateData);
        await db.logAuditEvent(ctx.user.id, "UPDATE_DOCTOR_REPORT", "doctorReport", reportId, { message: `Updated doctor report` });

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to update doctor report: ${error}`);
      }
    }),

  // Get doctor reports by visit
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
    .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
    .query(async ({ input }) => {
      return await db.getMedicalReportsOverviewRows(input?.limit ?? 250);
    }),

  getDoctorReports: protectedProcedure.query(async () => {
    return await db.getAllDoctorReports();
  }),
  createMedicalReport: medicalStaffProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createDoctorReport({
        visitId: 0,
        patientId: input.patientId,
        doctorId: ctx.user.id,
        diagnosis: input.diagnosis,
        diseases: input.diseases ? JSON.stringify(input.diseases) : null,
        treatment: input.prescription || input.treatment || "",
        recommendations: input.recommendations || "",
        visitDate: input.visitDate ? (() => { const [year, month, day] = input.visitDate.split('-'); return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); })() : null,
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
        { message: "Created medical report" }
      );
    return { success: true };
  }),
  updateMedicalReport: medicalStaffProcedure
    .input(z.object({
      reportId: z.number(),
      visitDate: z.string().optional(),
      diagnosis: z.string().optional(),
      diseases: z.array(z.string()).optional(),
      prescription: z.string().optional(),
      clinicalOpinion: z.string().optional(),
      operationType: z.string().optional(),
      recommendations: z.string().optional(),
      additionalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateDoctorReport(input.reportId, {
        visitDate: input.visitDate ? (() => { const [year, month, day] = input.visitDate.split('-'); return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); })() : null,
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
        { message: "Updated medical report" }
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
        { message: "Deleted medical report" }
      );
      return { success: true };
    }),

  // ============ MEDICATION ROUTERS ============

  getMedications: protectedProcedure.query(async () => {
    return await db.getAllMedications();
  }),
  getAllMedications: protectedProcedure.query(async () => {
    return await db.getAllMedications();
  }),

  createMedication: managerProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["tablet", "drops", "ointment", "injection", "suspension", "other"]),
      activeIngredient: z.string().optional(),
      strength: z.string().optional(),
      manufacturer: z.string().optional(),
      dosage: z.string().optional(),
      description: z.string().optional(),
      stockPieces: z.number().int().nonnegative().optional(),
      inventoryStatus: z.enum(["available", "out_of_stock", "reserved"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createMedication({
        name: input.name,
        type: input.type,
        activeIngredient: input.activeIngredient || "",
        strength: input.strength || "",
        manufacturer: input.manufacturer || "",
        dosage: input.dosage || "",
        description: input.description || "",
        stockPieces: input.stockPieces ?? null,
        inventoryStatus: input.inventoryStatus ?? null,
      });
      await db.logAuditEvent(ctx.user.id, "CREATE_MEDICATION", "medication", 0, { message: `Added medication ${input.name}` });
      return { success: true };
    }),

  updateMedication: managerProcedure
    .input(z.object({
      medicationId: z.number(),
      updates: z.object({
        name: z.string().optional(),
        type: z.enum(["tablet", "drops", "ointment", "injection", "suspension", "other"]).optional(),
        activeIngredient: z.string().optional(),
        strength: z.string().optional(),
        manufacturer: z.string().optional(),
        dosage: z.string().optional(),
        description: z.string().optional(),
        stockPieces: z.number().int().nonnegative().nullable().optional(),
        inventoryStatus: z.enum(["available", "out_of_stock", "reserved"]).nullable().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateMedication(input.medicationId, input.updates);
      await db.logAuditEvent(ctx.user.id, "UPDATE_MEDICATION", "medication", input.medicationId, { message: "Updated medication" });
      return { success: true };
    }),

  deleteMedication: managerProcedure
    .input(z.object({ medicationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMedication(input.medicationId);
      await db.logAuditEvent(ctx.user.id, "DELETE_MEDICATION", "medication", input.medicationId, { message: "Deleted medication" });
      return { success: true };
    }),

  // ============ DISEASE ROUTERS ============

  getAllDiseases: protectedProcedure.query(async () => {
    return await db.getAllDiseases();
  }),

  createDisease: managerProcedure
    .input(z.object({ name: z.string(), branch: z.string().optional(), abbrev: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await db.createDisease(input.name, input.branch ?? null, input.abbrev ?? null);
      await db.logAuditEvent(ctx.user.id, "CREATE_DISEASE", "disease", 0, { message: `Added disease ${input.name}` });
      return { success: true };
    }),

  updateDisease: managerProcedure
    .input(z.object({ diseaseId: z.number(), name: z.string(), branch: z.string().optional(), abbrev: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateDisease(input.diseaseId, input.name, input.branch ?? null, input.abbrev ?? null);
      await db.logAuditEvent(ctx.user.id, "UPDATE_DISEASE", "disease", input.diseaseId, { message: "Updated disease" });
      return { success: true };
    }),

  deleteDisease: managerProcedure
    .input(z.object({ diseaseId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteDisease(input.diseaseId);
      await db.logAuditEvent(ctx.user.id, "DELETE_DISEASE", "disease", input.diseaseId, { message: "Deleted disease" });
      return { success: true };
    }),

  // ============ SYMPTOMS ROUTERS ============

  getAllSymptoms: protectedProcedure.query(async () => {
    const row = await db.getSystemSetting("symptoms_directory");
    if (!row?.value) return [] as Array<z.infer<typeof symptomDirectoryEntrySchema>>;
    try {
      const parsed = JSON.parse(row.value);
      const normalized = z.array(symptomDirectoryEntrySchema).safeParse(parsed);
      if (!normalized.success) return [] as Array<z.infer<typeof symptomDirectoryEntrySchema>>;
      return normalized.data;
    } catch {
      return [] as Array<z.infer<typeof symptomDirectoryEntrySchema>>;
    }
  }),

  createSymptom: managerProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getSystemSetting("symptoms_directory");
      let current: Array<z.infer<typeof symptomDirectoryEntrySchema>> = [];
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          const normalized = z.array(symptomDirectoryEntrySchema).safeParse(parsed);
          if (normalized.success) current = normalized.data;
        } catch {
          current = [];
        }
      }
      const name = String(input.name ?? "").trim();
      if (!name) return { success: true };
      if (current.some((item) => String(item.name ?? "").trim().toLowerCase() === name.toLowerCase())) {
        return { success: true, duplicate: true };
      }
      current.push({
        id: `sym_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
      });
      await db.updateSystemSettings("symptoms_directory", current);
      await db.logAuditEvent(ctx.user.id, "CREATE_SYMPTOM", "systemSetting", 0, { message: `Added symptom ${name}` });
      return { success: true };
    }),

  updateSymptom: managerProcedure
    .input(z.object({ symptomId: z.string().min(1), name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getSystemSetting("symptoms_directory");
      let current: Array<z.infer<typeof symptomDirectoryEntrySchema>> = [];
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          const normalized = z.array(symptomDirectoryEntrySchema).safeParse(parsed);
          if (normalized.success) current = normalized.data;
        } catch {
          current = [];
        }
      }
      const next = current.map((item) =>
        item.id === input.symptomId ? { ...item, name: String(input.name ?? "").trim() } : item
      );
      await db.updateSystemSettings("symptoms_directory", next);
      await db.logAuditEvent(ctx.user.id, "UPDATE_SYMPTOM", "systemSetting", 0, { symptomId: input.symptomId });
      return { success: true };
    }),

  deleteSymptom: managerProcedure
    .input(z.object({ symptomId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getSystemSetting("symptoms_directory");
      let current: Array<z.infer<typeof symptomDirectoryEntrySchema>> = [];
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          const normalized = z.array(symptomDirectoryEntrySchema).safeParse(parsed);
          if (normalized.success) current = normalized.data;
        } catch {
          current = [];
        }
      }
      const next = current.filter((item) => item.id !== input.symptomId);
      await db.updateSystemSettings("symptoms_directory", next);
      await db.logAuditEvent(ctx.user.id, "DELETE_SYMPTOM", "systemSetting", 0, { symptomId: input.symptomId });
      return { success: true };
    }),

  // ============ TEST ROUTERS ============

  getTests: protectedProcedure.query(async () => {
    return await db.getAllTests();
  }),
  getAllTests: protectedProcedure.query(async () => {
    return await db.getAllTests();
  }),

  createTest: managerProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["examination", "lab", "imaging", "other"]),
      category: z.string().optional(),
      normalRange: z.string().optional(),
      unit: z.string().optional(),
      description: z.string().optional(),
      priceEgp: z.string().optional(),
      durationMinutes: z.number().int().nonnegative().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createTest({
        name: input.name,
        type: input.type,
        category: input.category || "",
        normalRange: input.normalRange || "",
        unit: input.unit || "",
        description: input.description || "",
        priceEgp: input.priceEgp?.trim() || null,
        durationMinutes: input.durationMinutes ?? null,
        isActive: input.isActive ?? true,
      });
      await db.logAuditEvent(ctx.user.id, "CREATE_TEST", "test", 0, { message: `Added test ${input.name}` });
      return { success: true };
    }),

  updateTest: managerProcedure
    .input(z.object({
      testId: z.number(),
      updates: z.object({
        name: z.string().optional(),
        type: z.enum(["examination", "lab", "imaging", "other"]).optional(),
        category: z.string().optional(),
        normalRange: z.string().optional(),
        unit: z.string().optional(),
        description: z.string().optional(),
        priceEgp: z.string().nullable().optional(),
        durationMinutes: z.number().int().nonnegative().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const raw = { ...input.updates } as Record<string, unknown>;
      for (const key of Object.keys(raw)) {
        if (raw[key] === undefined) delete raw[key];
      }
      if (input.updates.category !== undefined) {
        raw.category = input.updates.category ?? "";
      }
      await db.updateTest(input.testId, raw);
      await db.logAuditEvent(ctx.user.id, "UPDATE_TEST", "test", input.testId, { message: "Updated test" });
      return { success: true };
    }),

  deleteTest: managerProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteTest(input.testId);
      await db.logAuditEvent(ctx.user.id, "DELETE_TEST", "test", input.testId, { message: "Deleted test" });
      return { success: true };
    }),

  getMyTestFavorites: medicalStaffProcedure
    .query(async ({ ctx }) => {
      return await db.getTestFavoritesByUser(ctx.user.id);
    }),

  toggleTestFavorite: medicalStaffProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await db.toggleTestFavorite(ctx.user.id, input.testId);
    }),

  // ============ TEST REQUESTS ============

  createTestRequest: medicalStaffProcedure
    .input(z.object({
      patientId: z.number(),
      visitId: z.number().optional(),
      date: z.string().optional(),
      priority: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        testId: z.number(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createTestRequest({
        patientId: input.patientId,
        visitId: input.visitId,
        requestDate: new Date(),
        status: "pending",
        notes: input.notes,
      });

      // Get the ID of the created test request
      const testRequestId = result[0].insertId;

      // Create test request items
      if (input.items && input.items.length > 0) {
        const itemsToInsert = input.items.map((item: any) => ({
          testRequestId: testRequestId,
          testId: item.testId,
          result: item.notes,
        }));
        await db.createTestRequestItems(itemsToInsert);
      }

      await db.logAuditEvent(ctx.user.id, "CREATE_TEST_REQUEST", "testRequest", testRequestId, {
        message: `Created test request for patient ${input.patientId} with ${input.items?.length || 0} items`
      });
      return { success: true };
    }),

  getTestRequestsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByPatient(input.patientId);
    }),

  // Alias: Get test requests by patient
  getPatientTestRequests: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByPatient(input.patientId);
    }),

  // Get test requests by visit
  getTestRequestsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByVisit(input.visitId);
    }),

  // ============ PRESCRIPTION ROUTERS ============

  // Doctor: Create prescription
  createPrescription: medicalStaffProcedure
    .input(z.object({
      visitId: z.number(),
      patientId: z.number(),
      medicationName: z.string(),
      dosage: z.string(),
      frequency: z.string().optional(),
      duration: z.string().optional(),
      instructions: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createPrescription({
          ...input,
          doctorId: ctx.user.id,
        });
        
        await db.logAuditEvent(ctx.user.id, "CREATE_PRESCRIPTION", "prescription", 0, { message: `Created prescription for patient ${input.patientId}` });
        
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create prescription: ${error}`);
      }
    }),

  // Get prescriptions by visit
  getPrescriptionsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsByVisit(input.visitId);
    }),

  createPrescriptionWithItems: medicalStaffProcedure
    .input(z.object({
      patientId: z.number(),
      visitId: z.number().optional(),
      date: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        medicationId: z.number().optional(),
        medicationName: z.string(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        duration: z.string().optional(),
        instructions: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log("[createPrescriptionWithItems] input", {
        patientId: input.patientId,
        itemsCount: input.items.length,
        firstItem: input.items[0],
      });
      await db.createPrescriptionWithItems({
        patientId: input.patientId,
        visitId: input.visitId,
        doctorId: ctx.user.id,
        date: input.date,
        notes: input.notes,
        items: input.items,
      });
      await db.logAuditEvent(ctx.user.id, "CREATE_PRESCRIPTION", "prescription", 0, { message: `Created prescription for patient ${input.patientId}` });
      return { success: true };
    }),

  // Get prescriptions by patient
  getPrescriptionsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsByPatient(input.patientId);
    }),
  getPrescriptionsWithItemsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsWithItemsByPatient(input.patientId);
    }),

  /** Recent prescriptions list for prescriptions hub (جدول نظرة عامة). */
  getPrescriptionsOverview: protectedProcedure
    .input(z.object({
      page: z.number().min(1).optional(),
      pageSize: z.number().min(1).max(200).optional(),
      search: z.string().optional(),
      statusFilter: z.enum(["all", "active", "completed", "expired"]).optional(),
      locationType: z.enum(["center", "external"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return await db.getPrescriptionsOverviewRows({
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
        statusFilter: input?.statusFilter,
        locationType: input?.locationType,
      });
    }),

  getPrescriptionsWithItemsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsWithItemsByVisit(input.visitId);
    }),

  deletePrescription: managerProcedure
    .input(z.object({ prescriptionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deletePrescription(input.prescriptionId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_PRESCRIPTION",
        "prescription",
        input.prescriptionId,
        { message: "Deleted prescription" }
      );
      return { success: true };
    }),

  // ============ SURGERY ROUTERS ============

  // Doctor: Create surgery record
  createSurgery: medicalStaffProcedure
    .input(z.object({
      patientId: z.number(),
      appointmentId: z.number().optional(),
      surgeryType: z.string(),
      surgeryDate: z.string(),
      preOpUCVA_OD: z.string().optional(),
      preOpUCVA_OS: z.string().optional(),
      preOpBCVA_OD: z.string().optional(),
      preOpBCVA_OS: z.string().optional(),
      surgeryNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createSurgery({
          ...input,
          doctorId: ctx.user.id,
          surgeryDate: new Date(input.surgeryDate),
          status: "scheduled",
        });
        
        await db.logAuditEvent(ctx.user.id, "CREATE_SURGERY", "surgery", 0, { message: `Created surgery record for patient ${input.patientId}` });
        
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create surgery: ${error}`);
      }
    }),

  // Get surgeries by patient
  getSurgeriesByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getSurgeriesByPatient(input.patientId);
    }),

  // Delete surgery
  deleteSurgery: medicalStaffProcedure
    .input(z.object({ surgeryId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteSurgery(input.surgeryId);
      await db.logAuditEvent(ctx.user.id, "DELETE_SURGERY", "surgery", input.surgeryId, { message: "Deleted surgery" });
      return { success: true };
    }),

  // Post-op followup
  createPostOpFollowup: medicalStaffProcedure
    .input(z.object({
      surgeryId: z.number(),
      patientId: z.number().optional(),
      date: z.string().optional(),
      followupDate: z.string().optional(),
      findings: z.string().optional(),
      recommendations: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createPostOpFollowup({
        surgeryId: input.surgeryId,
        patientId: input.patientId ?? 0,
        followupDate: input.followupDate
          ? new Date(input.followupDate)
          : input.date
            ? new Date(input.date)
            : new Date(),
        findings: input.findings ?? null,
        recommendations: input.recommendations ?? null,
      });
      await db.logAuditEvent(ctx.user.id, "CREATE_POST_OP", "postOpFollowup", input.surgeryId, { message: "Created followup" });
      return { success: true };
    }),

  getPostOpFollowupsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPostOpFollowupsByPatient(input.patientId);
    }),

  getPostOpFollowupsBySurgery: protectedProcedure
    .input(z.object({ surgeryId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPostOpFollowupsBySurgery(input.surgeryId);
    }),

  // ============ AUDIT LOG ROUTERS ============

  // Manager/Admin: Get audit logs
  getAuditLogs: managerProcedure
    .input(z.object({
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      return await db.getAuditLogs(input.limit);
    }),

  // ============ OPERATION LISTS ============

  getOperationList: protectedProcedure
    .input(z.object({
      doctorTab: z.string(),
      listDate: z.string(),
      operationType: z.string().optional().nullable(),
    }))
    .query(async ({ input }) => {
      if (!input.listDate) {
        return { id: null, items: [] as any[] };
      }
      return await db.getOperationList(input.doctorTab, input.listDate, input.operationType ?? null);
    }),
  getOperationListById: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .query(async ({ input }) => {
      return await db.getOperationListById(input.listId);
    }),

  saveOperationList: protectedProcedure
    .input(z.object({
      listId: z.number().optional().nullable(),
      doctorTab: z.string(),
      listDate: z.string(),
      operationType: z.string().optional().nullable(),
      doctorName: z.string().optional().nullable(),
      listTime: z.string().optional().nullable(),
      items: z.array(z.object({
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
      })),
    }))
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
      await db.logAuditEvent(ctx.user.id, "SAVE_OPERATION_LIST", "operationList", 0, { message: `Saved operation list for ${input.doctorTab}` });

      // Send notifications for operation lists
      const notificationSettings = await getAppNotificationSettings().catch(() => ({
        mssqlOwnerEnabled: true,
        mssqlInAppEnabled: true,
        manualPatientInAppEnabled: true,
        operationsPushEnabled: false,
        operationsPushUserIds: [],
      }));

      if (notificationSettings.operationsPushEnabled && Array.isArray(notificationSettings.operationsPushUserIds) && notificationSettings.operationsPushUserIds.length > 0) {
        const tabLabel = input.doctorTab.includes("saadany") ? "د/سعدني" : input.doctorTab.includes("sawaf") ? "د/صواف" : "آخرون";
        const itemNames = (input.items ?? [])
          .map((item) => item.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
        const countSuffix = input.items?.length ?? 0 > 3 ? ` و${(input.items?.length ?? 0) - 3} آخرين` : "";

        await pushAppNotification({
          title: `قائمة عمليات ${tabLabel}`,
          message: `${itemNames}${countSuffix}`,
          kind: "info",
          targetUserIds: notificationSettings.operationsPushUserIds,
          source: "operation_list_save",
          entityType: "operationList",
          meta: {
            doctorTab: input.doctorTab,
            listDate: input.listDate,
            itemCount: input.items?.length ?? 0,
          },
        });
      }

      return { success: true };
    }),

  getOperationListsHistory: protectedProcedure
    .query(async () => {
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
    .input(z.object({
      doctorTab: z.string(),
      listDate: z.string(),
      operationType: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteOperationList(input.doctorTab, input.listDate);
      await db.logAuditEvent(ctx.user.id, "DELETE_OPERATION_LIST", "operationList", 0, { message: `Deleted operation list for ${input.doctorTab}` });
      return { success: true };
    }),
  deleteOperationListById: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteOperationListById(input.listId);
      await db.logAuditEvent(ctx.user.id, "DELETE_OPERATION_LIST", "operationList", input.listId, { message: "Deleted operation list by id" });
      return { success: true };
    }),

  getOperationBookings: protectedProcedure
    .input(z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const today = new Date().toISOString().split("T")[0];
      const bookings = await db.getOperationBookingsByDateRange(input.fromDate ?? today, input.toDate ?? input.fromDate ?? today);
      return bookings.map((b) => ({
        ...b,
        bookingDate: b.bookingDate instanceof Date ? b.bookingDate.toISOString().split("T")[0] : String(b.bookingDate),
      }));
    }),
  createOperationBooking: protectedProcedure
    .input(z.object({
      bookingDate: z.string(),
      bookingTime: z.string(),
      doctorName: z.string(),
      operationType: z.string(),
      casesCount: z.number().int().min(1),
      weekdayLabel: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const booking = await db.createOperationBooking(input as any);
      await db.logAuditEvent(ctx.user.id, "CREATE_OPERATION_BOOKING", "operationBooking", booking.id, {
        bookingDate: input.bookingDate,
        doctorName: input.doctorName,
      });

      const notificationSettings = await getAppNotificationSettings().catch(() => ({
        mssqlOwnerEnabled: true,
        mssqlInAppEnabled: true,
        manualPatientInAppEnabled: true,
        operationsPushEnabled: false,
        operationsPushUserIds: [],
      }));

      if (
        notificationSettings.operationsPushEnabled &&
        Array.isArray(notificationSettings.operationsPushUserIds) &&
        notificationSettings.operationsPushUserIds.length > 0
      ) {
        const patientNumbersLabel = `${Math.max(1, Math.trunc(Number(input.casesCount) || 1))} حالة`;
        const doctorName = String(input.doctorName ?? "").trim();
        const operationName = String(input.operationType ?? "").trim();
        const bookingDate = String(input.bookingDate ?? "").trim();
        const bookingTime = String(input.bookingTime ?? "").trim();
        const messageParts = [`${patientNumbersLabel} - ${doctorName || "غير محدد"}`];
        if (operationName) messageParts.push(operationName);
        if (bookingDate || bookingTime) messageParts.push([bookingDate, bookingTime].filter(Boolean).join(" "));

        await pushAppNotification({
          title: "تم حجز العملية",
          message: messageParts.join(" - "),
          kind: "success",
          targetUserIds: notificationSettings.operationsPushUserIds,
          source: "operation_booking_create",
          entityType: "operationBooking",
          entityId: booking.id,
          meta: {
            type: "operation_booking",
            path: "/operations",
            patientNumbers: patientNumbersLabel,
            doctorName: doctorName || null,
            operationName: operationName || null,
            bookingDate: bookingDate || null,
            bookingTime: bookingTime || null,
            casesCount: Math.max(1, Math.trunc(Number(input.casesCount) || 1)),
          },
        }).catch((error) => {
          console.warn("[operation-booking] Failed to append app notification:", error);
        });
      }

      return { success: true, id: booking.id };
    }),

  updateOperationBooking: protectedProcedure
    .input(z.object({
      id: z.number(),
      bookingDate: z.string().optional(),
      bookingTime: z.string().optional(),
      doctorName: z.string().optional(),
      operationType: z.string().optional(),
      casesCount: z.number().int().min(1).optional(),
      weekdayLabel: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      await db.updateOperationBooking(id, updates as any);
      await db.logAuditEvent(ctx.user.id, "UPDATE_OPERATION_BOOKING", "operationBooking", id, {
        updates: Object.keys(updates),
      });
      return { success: true };
    }),

  deleteOperationBooking: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteOperationBooking(input.id);
      await db.logAuditEvent(ctx.user.id, "DELETE_OPERATION_BOOKING", "operationBooking", input.id, {});
      return { success: true };
    }),

  // ============ PAGE STATE (USER/PATIENT) ============

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
    .input(z.object({
      examinationId: z.number().int().positive(),
      patientId: z.number().int().positive(),
      checklist: z.object({
        generalDiseases: z.boolean().optional(),
        pregnancyOrLactation: z.boolean().optional(),
        usesAllergySupplementsSteroidsOrPressureMeds: z.boolean().optional(),
        acneTreatment: z.boolean().optional(),
        familyKeratoconus: z.boolean().optional(),
        usesTearSubstituteOrExcessTearsOrSandySensation: z.boolean().optional(),
        symptomsWorseWithAirOrAC: z.boolean().optional(),
        glaucomaTreatment: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.upsertExaminationChecklist({
        examinationId: input.examinationId,
        patientId: input.patientId,
        checklist: input.checklist,
      });
      return { success: true };
    }),

  getExaminationChecklist: protectedProcedure
    .input(z.object({
      examinationId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      return await db.getExaminationChecklistByExaminationId(input.examinationId);
    }),

  savePatientPageState: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        page: z.string(),
        data: z.object({
          sheetSelection: z.string().optional(),
          visitDate: z.string().optional(),
          isFollowup: z.boolean().optional(),
          activeTab: z.union([z.number(), z.string()]).optional(),
          unsavedDraft: z.record(z.string(), z.any()).optional(),
          syncLockManual: z.boolean().optional(),
          // Allow other fields for different pages (patient-details, request-tests, etc)
        }).catchall(z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const normalizedRole = String(ctx.user.role ?? "").trim().toLowerCase();
      const shouldNotifyRegistration =
        input.page === "examination" &&
        (normalizedRole === "reception" || normalizedRole === "nurse" || normalizedRole === "technician");
      const previousState = shouldNotifyRegistration
        ? await db.getPatientPageState(input.patientId, input.page).catch(() => null)
        : null;

      await db.upsertPatientPageState(input.patientId, input.page, input.data);

      if (shouldNotifyRegistration) {
        const role = normalizedRole as "reception" | "nurse" | "technician";
        const previousSignature = readRoleSignatureFromStateData(previousState?.data, role);
        const nextSignature = readRoleSignatureFromStateData(input.data, role);
        if (nextSignature && nextSignature !== previousSignature) {
          const patient = await db.getPatientById(input.patientId).catch(() => null);
          const patientName = String((patient as any)?.fullName ?? "").trim() || `مريض رقم ${input.patientId}`;
          const patientCode = String((patient as any)?.patientCode ?? "").trim();
          const actorName =
            String((ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "").trim() || nextSignature;
          const doctorName = await readFreshDoctorNameForPatient(input.patientId);
          const roleLabel = role === "reception" ? "الاستقبال" : role === "nurse" ? "التمريض" : "الفني";
          const targetRoles = resolveNotificationTargetRolesByUserRole(role);

          await pushAppNotification({
            title: `تم تسجيل ${roleLabel}`,
            message:
              `${patientName}${patientCode ? ` (${patientCode})` : ""}` +
              ` - بواسطة ${actorName}` +
              `${doctorName ? ` - الطبيب: ${doctorName}` : ""}`,
            kind: "info",
            targetRoles,
            source: `examination_${role}_registration`,
            entityType: "patient",
            entityId: input.patientId,
            meta: {
              path: `/patients/${input.patientId}`,
              patientCode: patientCode || null,
              patientName,
              actorName,
              doctorName: doctorName || null,
              page: input.page,
              role,
            },
          }).catch((error) => {
            console.warn("[savePatientPageState] Failed to send registration push:", error);
          });
        }
      }

      return { success: true };
    }),

  getReadyTemplateOverrides: protectedProcedure
    .input(z.object({ scope: readyTemplateScopeSchema }))
    .query(async ({ input }) => {
      const row = await db.getSystemSetting("ready_template_overrides");
      if (!row?.value) return {};
      try {
        const parsed = JSON.parse(row.value);
        const byScope = parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : {};
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
          if (raw && typeof raw === "object") parsed = raw as Record<string, any>;
        } catch {
          parsed = {};
        }
      }
      const scopeMap =
        parsed[input.scope] && typeof parsed[input.scope] === "object"
          ? { ...(parsed[input.scope] as Record<string, any>) }
          : {};
      const existing =
        scopeMap[input.templateId] && typeof scopeMap[input.templateId] === "object"
          ? { ...(scopeMap[input.templateId] as Record<string, any>) }
          : {};

      const hasItemsUpdate = "testItems" in input || "prescriptionItems" in input;
      const hasNameUpdate = "name" in input;
      const incomingName = String(input.name ?? "").trim();
      const incomingTestItems = Array.isArray(input.testItems) ? input.testItems : undefined;
      const incomingPrescriptionItems = Array.isArray(input.prescriptionItems)
        ? input.prescriptionItems
        : undefined;
      const shouldDelete =
        hasNameUpdate &&
        hasItemsUpdate &&
        !incomingName &&
        (incomingTestItems?.length ?? incomingPrescriptionItems?.length ?? 0) === 0;

      if (shouldDelete) {
        delete scopeMap[input.templateId];
      } else {
        const next = { ...existing };
        if (hasNameUpdate) next.name = incomingName;
        if (incomingTestItems !== undefined) next.testItems = incomingTestItems;
        if (incomingPrescriptionItems !== undefined) next.prescriptionItems = incomingPrescriptionItems;
        scopeMap[input.templateId] = next;
      }

      parsed[input.scope] = scopeMap;
      await db.updateSystemSettings("ready_template_overrides", parsed);
      await db.logAuditEvent(ctx.user.id, "UPSERT_READY_TEMPLATE_OVERRIDE", "systemSetting", 0, {
        scope: input.scope,
        templateId: input.templateId,
      });
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
          if (raw && typeof raw === "object") parsed = raw as Record<string, any>;
        } catch {
          parsed = {};
        }
      }
      const scopeMap: Record<string, any> = {};
      for (const template of input.templates) {
        scopeMap[template.templateId] = {
          ...(template.name !== undefined ? { name: String(template.name ?? "").trim() } : {}),
          ...(template.testItems !== undefined ? { testItems: template.testItems } : {}),
          ...(template.prescriptionItems !== undefined ? { prescriptionItems: template.prescriptionItems } : {}),
        };
      }
      parsed[input.scope] = scopeMap;
      await db.updateSystemSettings("ready_template_overrides", parsed);
      await db.logAuditEvent(ctx.user.id, "IMPORT_READY_TEMPLATE_OVERRIDES", "systemSetting", 0, {
        scope: input.scope,
        count: input.templates.length,
      });
      return { success: true };
    }),

  importReadyTemplateOverridesFromFile: protectedProcedure
    .input(
      z.object({
        scope: readyTemplateScopeSchema,
        filePath: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await assertReadyTemplateImportPermission(ctx, input.scope);
        const resolvedPath = path.resolve(input.filePath);
        const stats = await stat(resolvedPath).catch(() => null);
        if (!stats || !stats.isFile()) {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
        }
        if (!/\.xlsx?$/i.test(resolvedPath)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only .xlsx/.xls files are supported.",
          });
        }
        if (stats.size > 20 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File is too large." });
        }

        const templates =
          input.scope === "prescription"
            ? await readReadyPrescriptionTemplatesFromFile(resolvedPath)
            : await readReadyTestTemplatesFromFile(
                resolvedPath,
                (await db.getAllTests()).map((test) => ({
                  id: Number(test.id),
                  name: String(test.name ?? ""),
                }))
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
            if (raw && typeof raw === "object") parsed = raw as Record<string, any>;
          } catch {
            parsed = {};
          }
        }

        const scopeMap: Record<string, any> = {};
        for (const template of templates) {
          scopeMap[template.templateId] = {
            ...(template.name !== undefined ? { name: String(template.name ?? "").trim() } : {}),
            ...(input.scope === "prescription"
              ? { prescriptionItems: (template as any).prescriptionItems ?? [] }
              : { testItems: (template as any).testItems ?? [] }),
          };
        }

        parsed[input.scope] = scopeMap;
        await db.updateSystemSettings("ready_template_overrides", parsed);
        await db.logAuditEvent(ctx.user.id, "IMPORT_READY_TEMPLATE_OVERRIDES", "systemSetting", 0, {
          scope: input.scope,
          count: templates.length,
          filePath: resolvedPath,
        });
        return { success: true, count: templates.length };
      } catch (error) {
        console.error("[importReadyTemplateOverridesFromFile] failed", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to import templates from file.",
        });
      }
    }),

  // ============ SYSTEM SETTINGS ============

  getSystemSetting: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (input.key === "appointments_pricing_v1" && String(ctx.user.role ?? "").toLowerCase() !== "admin") {
        const role = String(ctx.user.role ?? "").toLowerCase();
        if (role !== "accountant") {
          const permissions = await db.getEffectiveUserPermissions(ctx.user.id, ctx.user.role ?? undefined);
          const canReadPricing =
            permissions.includes("appointments_pricing_v1") ||
            permissions.includes("/admin/settings/pricing-rules") ||
            permissions.includes("/appointments/accounts");
          if (!canReadPricing) {
            throw new TRPCError({ code: "FORBIDDEN", message: "No permission to read appointments pricing." });
          }
        }
      }
      const row = await db.getSystemSetting(input.key).catch((error) => {
        console.warn(`[medical.getSystemSetting] fallback for ${input.key}`, error);
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
    .input(z.object({
      token: z.string().min(20),
      platform: z.enum(["android", "ios", "web"]),
      deviceId: z.string().min(1).max(191),
      appVersion: z.string().max(64).optional(),
      build: z.string().max(64).optional(),
    }))
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
    .input(z.object({
      token: z.string().min(20),
    }))
    .mutation(async ({ input }) => {
      await db.deletePushDeviceToken(input.token);
      return { success: true };
    }),

  updateSystemSetting: adminProcedure
    .input(z.object({ key: z.string().min(1), value: z.any() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateSystemSettings(input.key, input.value);
      await db.logAuditEvent(ctx.user.id, "UPDATE_SYSTEM_SETTING", "systemSetting", 0, {
        key: input.key,
      });
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
      locationType: (String(doctor.locationType ?? "center") as "center" | "external"),
      doctorType: (String(doctor.doctorType ?? "consultant") as "consultant" | "specialist" | "external"),
    }));
  }),

  updateDoctorDirectory: adminProcedure
    .input(z.object({ doctors: z.array(doctorDirectoryEntrySchema) }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (dbInstance) {
        for (const doctor of input.doctors) {
          await dbInstance.insert(doctorsLookup).values({
            id: doctor.id,
            code: doctor.code,
            name: doctor.name,
            isActive: doctor.isActive ? 1 : 0,
            locationType: doctor.locationType,
            doctorType: doctor.doctorType,
          }).onDuplicateKeyUpdate({ set: { code: doctor.code, name: doctor.name, isActive: doctor.isActive ? 1 : 0, locationType: doctor.locationType, doctorType: doctor.doctorType } });
        }
      }
      await db.logAuditEvent(ctx.user.id, "UPDATE_DOCTOR_DIRECTORY", "doctors", 0, {
        count: input.doctors.length,
      });
      return { success: true };
    }),

  getServiceDirectory: protectedProcedure.query(async () => {
    const row = await db.getSystemSetting("service_directory");
    if (!row?.value) return [] as Array<z.infer<typeof serviceDirectoryEntrySchema>>;
    try {
      const parsed = JSON.parse(row.value);
      const normalized = z.array(serviceDirectoryEntrySchema).safeParse(parsed);
      if (!normalized.success) return [] as Array<z.infer<typeof serviceDirectoryEntrySchema>>;
      return normalized.data.map((entry) => ({
        ...entry,
        defaultSheet: normalizeServiceDefaultSheet(entry.defaultSheet ?? entry.serviceType, entry.serviceType),
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
      await db.logAuditEvent(ctx.user.id, "UPDATE_SERVICE_DIRECTORY", "systemSetting", 0, {
        count: input.services.length,
      });
      return { success: true };
    }),

  // ============ SHEET ENTRIES ============

  getSheetEntry: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      sheetType: z.enum(["consultant", "specialist", "lasik", "external"]),
    }))
    .query(async ({ input }) => {
      const stored = await db.getSheetEntry(input.patientId, input.sheetType);
      let base: any = {};
      if (stored) {
        try {
          base = JSON.parse(stored);
        } catch {
          base = {};
        }
      }

      // Build/refresh sheet payload from dedicated tables (source of truth).
      const [autorefRows, afterRefractionRows, glassesRows, pentacamRows, reports, surgeries] = await Promise.all([
        db.getAutorefractometryByPatient(input.patientId),
        db.getAfterRefractionByPatient(input.patientId),
        db.getGlassesRecordsByPatient(input.patientId),
        db.getPentacamResultsByPatient(input.patientId, 1),
        db.getDoctorReportsByPatient(input.patientId),
        db.getSurgeriesByPatient(input.patientId),
      ]);

      const pickFirstWithValues = (rows: any[] | undefined, keys: string[]) =>
        (rows ?? []).find((row: any) =>
          keys.some((key) => {
            const value = row?.[key];
            return value !== null && value !== undefined && String(value).trim() !== "";
          })
        ) ?? ((rows ?? [])[0] ?? {});

      const autoref = pickFirstWithValues(autorefRows as any[], [
        "sphereOD", "cylinderOD", "axisOD", "ucvaOD", "bcvaOD", "iopOD",
        "sphereOS", "cylinderOS", "axisOS", "ucvaOS", "bcvaOS", "iopOS",
      ]) as any;
      const afterRefraction = pickFirstWithValues(afterRefractionRows as any[], [
        "sphereOD", "cylinderOD", "axisOD",
        "sphereOS", "cylinderOS", "axisOS",
      ]) as any;
      const glasses = pickFirstWithValues(glassesRows as any[], [
        "sOD", "cOD", "axisOD", "pdOD", "bcvaOD",
        "sOS", "cOS", "axisOS", "pdOS", "bcvaOS",
      ]) as any;
      const pentacam = pickFirstWithValues(pentacamRows as any[], [
        "k1OD", "k2OD", "axisOD", "thinnestPointOD", "apexOD", "residualOD", "tttOD", "ablationOD",
        "k1OS", "k2OS", "axisOS", "thinnestPointOS", "apexOS", "residualOS", "tttOS", "ablationOS",
      ]) as any;
      const report = (reports?.[0] ?? {}) as any;
      const surgery = (surgeries?.[0] ?? {}) as any;
      const odSphere = autoref?.sphereOD ?? base?.examData?.autorefraction?.od?.s ?? "";
      const odCylinder = autoref?.cylinderOD ?? base?.examData?.autorefraction?.od?.c ?? "";
      const odAxis = autoref?.axisOD ?? base?.examData?.autorefraction?.od?.axis ?? "";
      const osSphere = autoref?.sphereOS ?? base?.examData?.autorefraction?.os?.s ?? "";
      const osCylinder = autoref?.cylinderOS ?? base?.examData?.autorefraction?.os?.c ?? "";
      const osAxis = autoref?.axisOS ?? base?.examData?.autorefraction?.os?.axis ?? "";
      const odAirPuff = autoref?.iopOD ?? base?.examData?.autorefraction?.od?.airPuff1 ?? "";
      const osAirPuff = autoref?.iopOS ?? base?.examData?.autorefraction?.os?.airPuff1 ?? "";

      const payload = {
        ...base,
        formData: {
          ...(base?.formData ?? {}),
          diagnosis: String(report?.diagnosis ?? "").trim() || base?.formData?.diagnosis || "",
          treatmentPlan: String(report?.treatment ?? "").trim() || base?.formData?.treatmentPlan || "",
          recommendations: String(report?.recommendations ?? "").trim() || base?.formData?.recommendations || "",
        },
        examData: {
          ...(base?.examData ?? {}),
          autorefraction: {
            od: {
              ...(base?.examData?.autorefraction?.od ?? {}),
              s: odSphere,
              s1: odSphere,
              s2: odSphere,
              s3: odSphere,
              c: odCylinder,
              c1: odCylinder,
              c2: odCylinder,
              c3: odCylinder,
              axis: odAxis,
              a1: odAxis,
              a2: odAxis,
              a3: odAxis,
              afterS: afterRefraction?.sphereOD ?? base?.examData?.autorefraction?.od?.afterS ?? "",
              afterC: afterRefraction?.cylinderOD ?? base?.examData?.autorefraction?.od?.afterC ?? "",
              afterA: afterRefraction?.axisOD ?? base?.examData?.autorefraction?.od?.afterA ?? "",
              ucva: autoref?.ucvaOD ?? base?.examData?.autorefraction?.od?.ucva ?? "",
              bcva: autoref?.bcvaOD ?? base?.examData?.autorefraction?.od?.bcva ?? "",
              iop: autoref?.iopOD ?? base?.examData?.autorefraction?.od?.iop ?? "",
              airPuff1: odAirPuff,
              airPuff2: odAirPuff,
              airPuff3: odAirPuff,
            },
            os: {
              ...(base?.examData?.autorefraction?.os ?? {}),
              s: osSphere,
              s1: osSphere,
              s2: osSphere,
              s3: osSphere,
              c: osCylinder,
              c1: osCylinder,
              c2: osCylinder,
              c3: osCylinder,
              axis: osAxis,
              a1: osAxis,
              a2: osAxis,
              a3: osAxis,
              afterS: afterRefraction?.sphereOS ?? base?.examData?.autorefraction?.os?.afterS ?? "",
              afterC: afterRefraction?.cylinderOS ?? base?.examData?.autorefraction?.os?.afterC ?? "",
              afterA: afterRefraction?.axisOS ?? base?.examData?.autorefraction?.os?.afterA ?? "",
              ucva: autoref?.ucvaOS ?? base?.examData?.autorefraction?.os?.ucva ?? "",
              bcva: autoref?.bcvaOS ?? base?.examData?.autorefraction?.os?.bcva ?? "",
              iop: autoref?.iopOS ?? base?.examData?.autorefraction?.os?.iop ?? "",
              airPuff1: osAirPuff,
              airPuff2: osAirPuff,
              airPuff3: osAirPuff,
            },
          },
          glasses: {
            od: {
              ...(base?.examData?.glasses?.od ?? {}),
              s: glasses?.sOD ?? base?.examData?.glasses?.od?.s ?? "",
              c: glasses?.cOD ?? base?.examData?.glasses?.od?.c ?? "",
              axis: glasses?.axisOD ?? base?.examData?.glasses?.od?.axis ?? "",
              pd: glasses?.pdOD ?? base?.examData?.glasses?.od?.pd ?? "",
              bcva: glasses?.bcvaOD ?? base?.examData?.glasses?.od?.bcva ?? "",
            },
            os: {
              ...(base?.examData?.glasses?.os ?? {}),
              s: glasses?.sOS ?? base?.examData?.glasses?.os?.s ?? "",
              c: glasses?.cOS ?? base?.examData?.glasses?.os?.c ?? "",
              axis: glasses?.axisOS ?? base?.examData?.glasses?.os?.axis ?? "",
              pd: glasses?.pdOS ?? base?.examData?.glasses?.os?.pd ?? "",
              bcva: glasses?.bcvaOS ?? base?.examData?.glasses?.os?.bcva ?? "",
            },
          },
          pentacam: {
            od: {
              ...(base?.examData?.pentacam?.od ?? {}),
              k1: pentacam?.k1OD ?? base?.examData?.pentacam?.od?.k1 ?? "",
              k2: pentacam?.k2OD ?? base?.examData?.pentacam?.od?.k2 ?? "",
              axis: pentacam?.axisOD ?? base?.examData?.pentacam?.od?.axis ?? "",
              ax1: pentacam?.axisOD ?? base?.examData?.pentacam?.od?.ax1 ?? "",
              ax2: pentacam?.axisOD ?? base?.examData?.pentacam?.od?.ax2 ?? "",
              thinnest: pentacam?.thinnestPointOD ?? base?.examData?.pentacam?.od?.thinnest ?? "",
              apex: pentacam?.apexOD ?? base?.examData?.pentacam?.od?.apex ?? "",
              residual: pentacam?.residualOD ?? base?.examData?.pentacam?.od?.residual ?? "",
              ttt: pentacam?.tttOD ?? base?.examData?.pentacam?.od?.ttt ?? "",
              ablation: pentacam?.ablationOD ?? base?.examData?.pentacam?.od?.ablation ?? "",
            },
            os: {
              ...(base?.examData?.pentacam?.os ?? {}),
              k1: pentacam?.k1OS ?? base?.examData?.pentacam?.os?.k1 ?? "",
              k2: pentacam?.k2OS ?? base?.examData?.pentacam?.os?.k2 ?? "",
              axis: pentacam?.axisOS ?? base?.examData?.pentacam?.os?.axis ?? "",
              ax1: pentacam?.axisOS ?? base?.examData?.pentacam?.os?.ax1 ?? "",
              ax2: pentacam?.axisOS ?? base?.examData?.pentacam?.os?.ax2 ?? "",
              thinnest: pentacam?.thinnestPointOS ?? base?.examData?.pentacam?.os?.thinnest ?? "",
              apex: pentacam?.apexOS ?? base?.examData?.pentacam?.os?.apex ?? "",
              residual: pentacam?.residualOS ?? base?.examData?.pentacam?.os?.residual ?? "",
              ttt: pentacam?.tttOS ?? base?.examData?.pentacam?.os?.ttt ?? "",
              ablation: pentacam?.ablationOS ?? base?.examData?.pentacam?.os?.ablation ?? "",
            },
          },
        },
        operationDetails: {
          ...(base?.operationDetails ?? {}),
          type: String(surgery?.surgeryType ?? "").trim() || base?.operationDetails?.type || "",
          date: surgery?.surgeryDate ?? base?.operationDetails?.date ?? "",
        },
      };

      return JSON.stringify(payload);
    }),

  saveSheetEntry: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        sheetType: z.enum(["consultant", "specialist", "lasik", "external"]),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.upsertSheetEntry({
          patientId: input.patientId,
          sheetType: input.sheetType,
          content: input.content,
        });
      broadcastSheetUpdate(input.patientId, input.sheetType);
      await db.logAuditEvent(ctx.user.id, "SAVE_SHEET", "sheetEntry", input.patientId, { sheetType: input.sheetType });
      return { success: true };
    }),

  saveRefractionToExamination: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      autorefraction: z.object({
        od: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), ucva: z.string().optional(), bcva: z.string().optional(), iop: z.string().optional() }).optional(),
        os: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), ucva: z.string().optional(), bcva: z.string().optional(), iop: z.string().optional() }).optional(),
      }).optional(),
      glassesData: z.object({
        od: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), pd: z.string().optional() }).optional(),
        os: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), pd: z.string().optional() }).optional(),
      }).optional(),
      pentacam: z.object({
        od: z.object({ k1: z.string().optional(), k2: z.string().optional(), axis: z.string().optional(), thinnest: z.string().optional(), apex: z.string().optional(), residualStroma: z.string().optional() }).optional(),
        os: z.object({ k1: z.string().optional(), k2: z.string().optional(), axis: z.string().optional(), thinnest: z.string().optional(), apex: z.string().optional(), residualStroma: z.string().optional() }).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get or create today's examination for patient
      const today = new Date().toISOString().split('T')[0];
      const visits = await db.getVisitsByPatient(input.patientId);
      let visitId = visits.find((v: any) => {
        const vDate = v.visitDate instanceof Date ? v.visitDate.toISOString() : String(v.visitDate ?? '');
        return vDate.split('T')[0] === today;
      })?.id;

      if (!visitId) {
        // Create new visit for today
        const newVisit = await db.createVisit({
          patientId: input.patientId,
          visitDate: new Date().toISOString(),
          notes: 'Created from refraction save'
        });
        visitId = (newVisit as any).id ?? (newVisit as any).insertId;
      }

      // Prepare examination data
      const examinationData: any = {
        patientId: input.patientId,
        visitId: visitId,
      };

      // Create/update examination
      const exams = await db.getExaminationsByVisit(visitId!);
      let examinationId: number;

      if (exams.length > 0) {
        // Update existing examination
        examinationId = exams[0].id;
        await db.updateExamination(examinationId, examinationData);
      } else {
        // Create new examination
        const result = await db.createExamination(examinationData);
        examinationId = (result as any).insertId;
      }

      // Save autorefraction to separate table
      if (input.autorefraction?.od || input.autorefraction?.os) {
        await db.saveAutorefractometryData({
          examinationId,
          patientId: input.patientId,
          sphereOD: input.autorefraction?.od?.s,
          cylinderOD: input.autorefraction?.od?.c,
          axisOD: input.autorefraction?.od?.axis,
          ucvaOD: input.autorefraction?.od?.ucva,
          bcvaOD: input.autorefraction?.od?.bcva,
          iopOD: input.autorefraction?.od?.iop,
          sphereOS: input.autorefraction?.os?.s,
          cylinderOS: input.autorefraction?.os?.c,
          axisOS: input.autorefraction?.os?.axis,
          ucvaOS: input.autorefraction?.os?.ucva,
          bcvaOS: input.autorefraction?.os?.bcva,
          iopOS: input.autorefraction?.os?.iop,
        });
      }

      // Save glasses to separate table
      if (input.glassesData?.od || input.glassesData?.os) {
        await db.saveGlassesRecord({
          examinationId,
          patientId: input.patientId,
          sOD: (input.glassesData?.od as any)?.s,
          cOD: (input.glassesData?.od as any)?.c,
          axisOD: (input.glassesData?.od as any)?.axis,
          pdOD: (input.glassesData?.od as any)?.pd,
          addOD: (input.glassesData?.od as any)?.add,
          bcvaOD: (input.glassesData?.od as any)?.bcva,
          sOS: (input.glassesData?.os as any)?.s,
          cOS: (input.glassesData?.os as any)?.c,
          axisOS: (input.glassesData?.os as any)?.axis,
          pdOS: (input.glassesData?.os as any)?.pd,
          addOS: (input.glassesData?.os as any)?.add,
          bcvaOS: (input.glassesData?.os as any)?.bcva,
        });
      }

      return { success: true };
    }),

  saveExaminationForm: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      visitDate: z.string(),
      visitType: z.string(),
      appointmentId: z.number().optional(),
      data: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["reception", "nurse", "technician", "doctor", "admin", "manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions for examination form" });
      }

      // Guard: reject saves when input.data carries no real clinical values
      const _hasRealData = (val: unknown): boolean => {
        if (val === null || val === undefined) return false;
        if (typeof val === "string") return val.trim().length > 0;
        if (typeof val === "number") return true;
        if (typeof val === "boolean") return val;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "object") return Object.values(val as Record<string, unknown>).some(_hasRealData);
        return false;
      };
      if (!_hasRealData(input.data)) {
        return { success: true, examinationId: null, visitId: null };
      }

      // Parse visitDate to avoid timezone issues
      const [year, month, day] = input.visitDate.split('-');
      const visitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const visitDateStr = visitDate.toISOString().split('T')[0];

      // Find existing visit for this patient on this date
      const existingVisits = await db.getVisitsByPatient(input.patientId);
      let visitId = existingVisits.find((v: any) => {
        const vDate = v.visitDate instanceof Date ? v.visitDate.toISOString() : String(v.visitDate ?? '');
        return vDate.split('T')[0] === visitDateStr;
      })?.id;

      // If no visit exists for today, create one
      if (!visitId) {
        const visit = await db.createVisit({
          patientId: input.patientId,
          visitDate: visitDate,
          visitType: normalizeVisitType(input.visitType),
          appointmentId: input.appointmentId || null,
        });

        visitId = (visit as any)?.insertId as number | undefined;
        if (!visitId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create visit - no ID returned from database"
          });
        }
      }

      // Keep examination row minimal; clinical values are stored in dedicated tables.
      const examinationData: any = {
        patientId: input.patientId,
        visitId: visitId,
      };

      const pickNonEmptyString = (...values: unknown[]): string | undefined => {
        for (const value of values) {
          if (value === null || value === undefined) continue;
          const normalized = String(value).trim();
          if (normalized) return normalized;
        }
        return undefined;
      };

      // Extract autoref data from payload
      const autorefractionPayload =
        input.data["autorefraction"] && typeof input.data["autorefraction"] === "object"
          ? (input.data["autorefraction"] as Record<string, any>)
          : null;
      const autorefractionOd =
        (input.data["autoref-od"] as Record<string, any> | undefined) ??
        ((input.data["autoref"] as any)?.od as Record<string, any> | undefined) ??
        (autorefractionPayload?.od as Record<string, any> | undefined);
      const autorefractionOs =
        (input.data["autoref-os"] as Record<string, any> | undefined) ??
        ((input.data["autoref"] as any)?.os as Record<string, any> | undefined) ??
        (autorefractionPayload?.os as Record<string, any> | undefined);

      const sphereOD = pickNonEmptyString(
        autorefractionOd?.s,
        autorefractionOd?.s1,
        autorefractionOd?.s2,
        autorefractionOd?.s3
      );
      const cylinderOD = pickNonEmptyString(
        autorefractionOd?.c,
        autorefractionOd?.c1,
        autorefractionOd?.c2,
        autorefractionOd?.c3
      );
      const axisOD = pickNonEmptyString(
        autorefractionOd?.axis,
        autorefractionOd?.a1,
        autorefractionOd?.a2,
        autorefractionOd?.a3
      );
      const sphereOS = pickNonEmptyString(
        autorefractionOs?.s,
        autorefractionOs?.s1,
        autorefractionOs?.s2,
        autorefractionOs?.s3
      );
      const cylinderOS = pickNonEmptyString(
        autorefractionOs?.c,
        autorefractionOs?.c1,
        autorefractionOs?.c2,
        autorefractionOs?.c3
      );
      const axisOS = pickNonEmptyString(
        autorefractionOs?.axis,
        autorefractionOs?.a1,
        autorefractionOs?.a2,
        autorefractionOs?.a3
      );
      const airPuffOD = pickNonEmptyString(
        autorefractionOd?.airPuff1,
        autorefractionOd?.airPuff2,
        autorefractionOd?.airPuff3
      );
      const airPuffOS = pickNonEmptyString(
        autorefractionOs?.airPuff1,
        autorefractionOs?.airPuff2,
        autorefractionOs?.airPuff3
      );

      // Extract glasses data for dedicated table save
      const glassesPayload = input.data["glasses"];

      // Store the entire payload as JSON for record-keeping
      examinationData.radiologyLabsNotes = JSON.stringify(input.data);

      let examinationId: number | undefined;

      // Ensure there is one examination row per visit (FK target for dedicated exam tables).
      const existingExams = await db.getExaminationsByVisit(visitId);
      if (existingExams.length > 0) {
        await db.updateExamination(existingExams[0].id, examinationData);
        examinationId = existingExams[0].id;
      } else {
        const result = await db.createExamination(examinationData);
        examinationId = (result as any).insertId;
      }

      // Save autorefraction to separate table
      if (examinationId && (_hasRealData(autorefractionOd) || _hasRealData(autorefractionOs))) {
        await db.saveAutorefractometryData({
          examinationId,
          patientId: input.patientId,
          sphereOD,
          cylinderOD,
          axisOD,
          ucvaOD: autorefractionOd?.ucva,
          bcvaOD: autorefractionOd?.bcva,
          iopOD: autorefractionOd?.iop ?? airPuffOD,
          od: autorefractionOd,
          sphereOS,
          cylinderOS,
          axisOS,
          ucvaOS: autorefractionOs?.ucva,
          bcvaOS: autorefractionOs?.bcva,
          iopOS: autorefractionOs?.iop ?? airPuffOS,
          os: autorefractionOs,
        });
      }

      // Save AFTER refraction to dedicated table when present.
      const afterRefractionPayload =
        input.data["afterRefraction"] && typeof input.data["afterRefraction"] === "object"
          ? (input.data["afterRefraction"] as Record<string, any>)
          : null;
      const afterSphereOD = pickNonEmptyString(
        autorefractionOd?.afterS,
        afterRefractionPayload?.od?.s,
        afterRefractionPayload?.od?.sphere
      );
      const afterCylinderOD = pickNonEmptyString(
        autorefractionOd?.afterC,
        afterRefractionPayload?.od?.c,
        afterRefractionPayload?.od?.cylinder
      );
      const afterAxisOD = pickNonEmptyString(
        autorefractionOd?.afterA,
        afterRefractionPayload?.od?.axis,
        afterRefractionPayload?.od?.a
      );
      const afterSphereOS = pickNonEmptyString(
        autorefractionOs?.afterS,
        afterRefractionPayload?.os?.s,
        afterRefractionPayload?.os?.sphere
      );
      const afterCylinderOS = pickNonEmptyString(
        autorefractionOs?.afterC,
        afterRefractionPayload?.os?.c,
        afterRefractionPayload?.os?.cylinder
      );
      const afterAxisOS = pickNonEmptyString(
        autorefractionOs?.afterA,
        afterRefractionPayload?.os?.axis,
        afterRefractionPayload?.os?.a
      );
      if (
        examinationId &&
        (afterSphereOD || afterCylinderOD || afterAxisOD || afterSphereOS || afterCylinderOS || afterAxisOS)
      ) {
        await db.saveAfterRefractionData({
          examinationId,
          patientId: input.patientId,
          sphereOD: afterSphereOD,
          cylinderOD: afterCylinderOD,
          axisOD: afterAxisOD,
          sphereOS: afterSphereOS,
          cylinderOS: afterCylinderOS,
          axisOS: afterAxisOS,
        });
      }

      // Save glasses to separate table
      if (examinationId && glassesPayload && typeof glassesPayload === 'object' && (_hasRealData(glassesPayload.od) || _hasRealData(glassesPayload.os))) {
        await db.saveGlassesRecord({
          examinationId,
          patientId: input.patientId,
          sOD: glassesPayload.od?.s,
          cOD: glassesPayload.od?.c,
          axisOD: glassesPayload.od?.axis,
          pdOD: glassesPayload.od?.pd,
          addOD: glassesPayload.od?.add,
          bcvaOD: glassesPayload.od?.bcva,
          sOS: glassesPayload.os?.s,
          cOS: glassesPayload.os?.c,
          axisOS: glassesPayload.os?.axis,
          pdOS: glassesPayload.os?.pd,
          addOS: glassesPayload.os?.add,
          bcvaOS: glassesPayload.os?.bcva,
        });
      }

      // Extract pentacam data if present
      const pentacamPayload = input.data["pentacam"];
      if (pentacamPayload && typeof pentacamPayload === 'object' && (_hasRealData(pentacamPayload.od) || _hasRealData(pentacamPayload.os))) {
        const odData = pentacamPayload.od || {};
        const osData = pentacamPayload.os || {};

        await db.createPentacamResult({
          visitId: visitId,
          patientId: input.patientId,
          rtK1: odData.k1,
          rtK2: odData.k2,
          rtAX: odData.axis || odData.ax1,
          rtThinnestPoint: odData.thinnest,
          rtApex: odData.apex,
          rtResidual: odData.residual,
          rtTTT: odData.ttt,
          rtAblation: odData.ablation,
          ltK1: osData.k1,
          ltK2: osData.k2,
          ltAX: osData.axis || osData.ax1,
          ltThinnestPoint: osData.thinnest,
          ltApex: osData.apex,
          ltResidual: osData.residual,
          ltTTT: osData.ttt,
          ltAblation: osData.ablation,
        });
      }

      const readString = (...keys: string[]) => {
        for (const key of keys) {
          const raw = input.data[key];
          if (typeof raw === "string") {
            const v = raw.trim();
            if (v) return v;
          }
        }
        return "";
      };

      const parseAnyArray = (value: unknown): any[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) return [];
          try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const diagnosisText = readString("diagnosis", "doctor-diagnosis", "medical-diagnosis");
      const treatmentText = readString("treatment", "recommended-treatment", "doctor-treatment", "prescription");
      const recommendationsText = readString("recommendations", "report", "doctor-report");
      const additionalNotesText = readString("additional-notes", "notes");
      const diseasesArray = parseAnyArray(input.data["diseases"]);

      // Same behavior as other save flows: always ensure a doctor report row exists per visit.
      const existingReports = await db.getDoctorReportsByVisit(visitId);
      const doctorReportData = {
        visitId,
        patientId: input.patientId,
        doctorId: ctx.user.id,
        diagnosis: diagnosisText,
        treatment: treatmentText,
        recommendations: recommendationsText,
        additionalNotes: additionalNotesText,
        diseases: diseasesArray.length > 0 ? JSON.stringify(diseasesArray) : null,
        clinicalOpinion: additionalNotesText || null,
      };

      const _hasReportData = diagnosisText || treatmentText || recommendationsText || additionalNotesText || diseasesArray.length > 0;
      if (_hasReportData) {
        if ((existingReports ?? []).length > 0) {
          await db.updateDoctorReport(existingReports[0].id, doctorReportData);
        } else {
          await db.createDoctorReport(doctorReportData);
        }
      }

      // Upsert tests from payload (expected IDs array).
      const requestedTestIds = Array.from(
        new Set(
          parseAnyArray(input.data["tests"])
            .map((v: any) => Number(v?.testId ?? v?.id ?? v))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        )
      );
      const existingRequests = await db.getTestRequestsByVisit(visitId);
      if ((existingRequests ?? []).length === 0) {
        const createdRequest: any = await db.createTestRequest({
          patientId: input.patientId,
          visitId,
          requestDate: new Date(),
          status: "pending",
          notes: "Created from examination form",
        });
        const testRequestId = Number(createdRequest?.insertId ?? createdRequest?.[0]?.insertId ?? 0);
        if (testRequestId > 0 && requestedTestIds.length > 0) {
          await db.createTestRequestItems(
            requestedTestIds.map((testId) => ({
              testRequestId,
              testId,
              result: null,
            }))
          );
        }
      }

      // Upsert prescription from payload (expected medication IDs array).
      const requestedMedicationIds = Array.from(
        new Set(
          parseAnyArray(input.data["treatment"])
            .map((v: any) => Number(v?.medicationId ?? v?.id ?? v))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        )
      );
      const existingPrescriptions = await db.getPrescriptionsWithItemsByVisit(visitId);
      if ((existingPrescriptions ?? []).length === 0) {
        if (requestedMedicationIds.length > 0) {
          const meds = await db.getAllMedications();
          const medById = new Map((meds ?? []).map((m: any) => [Number(m.id), String(m.name ?? "")]));
          await db.createPrescriptionWithItems({
            patientId: input.patientId,
            visitId,
            doctorId: ctx.user.id,
            notes: "Created from examination form",
            items: requestedMedicationIds.map((medicationId) => ({
              medicationId,
              medicationName: medById.get(medicationId) || `Medication ${medicationId}`,
            })),
          });
        } else {
          await db.createPrescription({
            visitId,
            patientId: input.patientId,
            doctorId: ctx.user.id,
            prescriptionDate: new Date(),
            notes: "Created from examination form",
          });
        }
      }

      await db.logAuditEvent(ctx.user.id, "CREATE_EXAMINATION_FORM", "examination", input.patientId, { message: "Saved examination form" });

      // Clear examination cache so next open fetches fresh medical data
      try {
        await db.invalidatePatientPageStateCache([input.patientId]);
      } catch (error) {
        console.warn(`[Exam Save] Cache invalidation failed for patient ${input.patientId}:`, error);
        // Non-blocking: exam already saved successfully
      }

      return { success: true, examinationId: examinationId ?? null, visitId };
    }),

  // Save medical visit data from dashboard patient medical file
  saveMedicalVisit: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      visitDate: z.string().optional(),
      isFollowup: z.boolean().optional(),
      appointmentId: z.number().optional(),
      // Medical measurements
      symptoms: z.string().optional(),
      autoref: z.object({
        od: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), ucva: z.string().optional(), bcva: z.string().optional() }).optional(),
        os: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), ucva: z.string().optional(), bcva: z.string().optional() }).optional(),
      }).optional(),
      iop: z.object({
        od: z.string().optional(),
        os: z.string().optional(),
      }).optional(),
      after: z.object({
        od: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional() }).optional(),
        os: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional() }).optional(),
      }).optional(),
      glasses: z.object({
        od: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), pd: z.string().optional(), bcva: z.string().optional() }).optional(),
        os: z.object({ s: z.string().optional(), c: z.string().optional(), axis: z.string().optional(), pd: z.string().optional(), bcva: z.string().optional() }).optional(),
      }).optional(),
      fundus: z.object({
        od: z.object({ discStatus: z.string().optional(), cupDiscRatio: z.string().optional(), macuaStatus: z.string().optional(), vesselStatus: z.string().optional(), otherFindings: z.string().optional() }).optional(),
        os: z.object({ discStatus: z.string().optional(), cupDiscRatio: z.string().optional(), macuaStatus: z.string().optional(), vesselStatus: z.string().optional(), otherFindings: z.string().optional() }).optional(),
      }).optional(),
      pentacam: z.object({
        od: z.object({
          k1: z.string().optional(),
          k2: z.string().optional(),
          ax1: z.string().optional(),
          ax2: z.string().optional(),
          axis: z.string().optional(),
          thinnest: z.string().optional(),
          apex: z.string().optional(),
          residual: z.string().optional(),
          ttt: z.string().optional(),
          ablation: z.string().optional(),
        }).optional(),
        os: z.object({
          k1: z.string().optional(),
          k2: z.string().optional(),
          ax1: z.string().optional(),
          ax2: z.string().optional(),
          axis: z.string().optional(),
          thinnest: z.string().optional(),
          apex: z.string().optional(),
          residual: z.string().optional(),
          ttt: z.string().optional(),
          ablation: z.string().optional(),
        }).optional(),
      }).optional(),
      radiologyLabs: z.string().optional(),
      // Tests and treatment from dashboard
      tests: z.string().optional(),
      // Doctor notes
      diagnosis: z.string().optional(),
      treatment: z.string().optional(),
      report: z.string().optional(),
      diseases: z.string().optional(),
      recommendations: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["doctor", "nurse", "admin", "manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions to save medical visit" });
      }

      // Validate patient exists
      const patient = await db.getPatientById(input.patientId);
      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }

      // Guard: reject saves with no real clinical data to prevent empty visit/exam rows
      const _hasVal = (v: string | undefined): boolean => Boolean(v && String(v).trim().length > 0);
      const _hasObjData = (obj: Record<string, string | undefined> | undefined): boolean =>
        Boolean(obj && Object.values(obj).some((v) => _hasVal(v as string | undefined)));
      const _hasMeasurements =
        _hasObjData(input.autoref?.od) || _hasObjData(input.autoref?.os) ||
        _hasVal(input.iop?.od) || _hasVal(input.iop?.os) ||
        _hasObjData(input.after?.od) || _hasObjData(input.after?.os) ||
        _hasObjData(input.glasses?.od) || _hasObjData(input.glasses?.os) ||
        _hasObjData(input.fundus?.od as any) || _hasObjData(input.fundus?.os as any) ||
        _hasObjData(input.pentacam?.od as any) || _hasObjData(input.pentacam?.os as any);
      const _hasClinicalText =
        _hasVal(input.symptoms) || _hasVal(input.diagnosis) || _hasVal(input.treatment) ||
        _hasVal(input.report) || _hasVal(input.diseases) || _hasVal(input.recommendations) ||
        _hasVal(input.radiologyLabs);
      const _hasTests = (() => {
        try { const t = JSON.parse(input.tests ?? "[]"); return Array.isArray(t) && t.length > 0; }
        catch { return false; }
      })();
      if (!_hasMeasurements && !_hasClinicalText && !_hasTests) {
        return { success: true, examinationId: null, visitId: null };
      }

      // Parse visitDate to avoid timezone issues
      let visitDate: Date;
      if (input.visitDate) {
        const [year, month, day] = input.visitDate.split('-');
        visitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        visitDate = new Date();
      }
      const visitType = input.isFollowup ? "followup" : "examination";

      // Create or get visit
      const visit = await db.createVisit({
        patientId: input.patientId,
        visitDate: visitDate,
        visitType: visitType,
        chiefComplaint: input.symptoms,
        appointmentId: input.appointmentId || null,
      });

      let visitId = (visit as any)?.insertId as number | undefined;
      if (!visitId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create visit - no ID returned from database"
        });
      }

      // Prepare examination data from autoref, IOP, glasses, pentacam
      const examinationData: any = {
        patientId: input.patientId,
        visitId: visitId,
      };

      // Map autoref data
      if (input.autoref) {
        if (input.autoref.od) {
          examinationData.sphereOD = input.autoref.od.s;
          examinationData.cylinderOD = input.autoref.od.c;
          examinationData.axisOD = input.autoref.od.axis;
          examinationData.ucvaOD = input.autoref.od.ucva;
          examinationData.bcvaOD = input.autoref.od.bcva;
        }
        if (input.autoref.os) {
          examinationData.sphereOS = input.autoref.os.s;
          examinationData.cylinderOS = input.autoref.os.c;
          examinationData.axisOS = input.autoref.os.axis;
          examinationData.ucvaOS = input.autoref.os.ucva;
          examinationData.bcvaOS = input.autoref.os.bcva;
        }
      }

      // Map IOP data
      if (input.iop) {
        examinationData.iopOD = input.iop.od;
        examinationData.iopOS = input.iop.os;
      }

      // Map glasses data (store as JSON)
      if (input.glasses?.od || input.glasses?.os) {
        examinationData.glassesData = JSON.stringify(input.glasses);
      }

      // Map fundus data (store as JSON in posteriorSegment fields for now)
      if (input.fundus?.od || input.fundus?.os) {
        // Store fundus findings as JSON in posteriorSegment fields
        if (input.fundus.od && Object.values(input.fundus.od).some(v => v)) {
          examinationData.posteriorSegmentOD = JSON.stringify(input.fundus.od);
        }
        if (input.fundus.os && Object.values(input.fundus.os).some(v => v)) {
          examinationData.posteriorSegmentOS = JSON.stringify(input.fundus.os);
        }
      }

      // Map radiology/labs notes and tests/treatment data
      const radiologyData: any = {};
      if (input.radiologyLabs) {
        try {
          Object.assign(radiologyData, JSON.parse(input.radiologyLabs));
        } catch {
          radiologyData.notes = input.radiologyLabs;
        }
      }
      // Add tests and treatment from dashboard
      if (input.tests) {
        try {
          radiologyData.tests = JSON.parse(input.tests);
        } catch {
          radiologyData.tests = [];
        }
      }
      if (input.treatment) {
        try {
          radiologyData.treatment = JSON.parse(input.treatment);
        } catch {
          radiologyData.treatment = [];
        }
      }
      if (Object.keys(radiologyData).length > 0) {
        examinationData.radiologyLabsNotes = JSON.stringify(radiologyData);
      }

      // Always create examination row
      const examResult = await db.createExamination(examinationData);
      const examinationId: number = (examResult as any)?.insertId || (examResult as any)?.id;

      // Save autoref only when at least one eye has real data
      if (_hasObjData(input.autoref?.od) || _hasObjData(input.autoref?.os)) {
        await db.saveAutorefractometryData({
          examinationId,
          patientId: input.patientId,
          ...input.autoref,
        });
      }

      // Save AFTER refraction only when at least one eye has real data
      if (_hasObjData(input.after?.od) || _hasObjData(input.after?.os)) {
        await db.saveAfterRefractionData({
          examinationId,
          patientId: input.patientId,
          ...input.after,
        });
      }

      // Save glasses only when at least one eye has real data
      if (_hasObjData(input.glasses?.od) || _hasObjData(input.glasses?.os)) {
        await db.saveGlassesRecord({
          examinationId,
          patientId: input.patientId,
          ...input.glasses,
        });
      }

      const hasPentacamValue = [
        input.pentacam?.od?.k1,
        input.pentacam?.od?.k2,
        input.pentacam?.os?.k1,
        input.pentacam?.os?.k2,
        input.pentacam?.od?.thinnest,
        input.pentacam?.os?.thinnest,
      ].some((value) => String(value ?? "").trim().length > 0);

      if (hasPentacamValue) {
        await db.createPentacamResult({
          visitId: visitId,
          patientId: input.patientId,
          rtK1: input.pentacam?.od?.k1,
          rtK2: input.pentacam?.od?.k2,
          rtAX: input.pentacam?.od?.axis || input.pentacam?.od?.ax1,
          rtThinnestPoint: input.pentacam?.od?.thinnest,
          rtApex: input.pentacam?.od?.apex,
          rtResidual: input.pentacam?.od?.residual,
          rtTTT: input.pentacam?.od?.ttt,
          rtAblation: input.pentacam?.od?.ablation,
          ltK1: input.pentacam?.os?.k1,
          ltK2: input.pentacam?.os?.k2,
          ltAX: input.pentacam?.os?.axis || input.pentacam?.os?.ax1,
          ltThinnestPoint: input.pentacam?.os?.thinnest,
          ltApex: input.pentacam?.os?.apex,
          ltResidual: input.pentacam?.os?.residual,
          ltTTT: input.pentacam?.os?.ttt,
          ltAblation: input.pentacam?.os?.ablation,
          techniciansNotes: input.radiologyLabs,
        });
      }

      // Save doctor report only when at least one clinical field has real data
      if (
        _hasVal(input.diagnosis) || _hasVal(input.treatment) ||
        _hasVal(input.recommendations) || _hasVal(input.report) ||
        _hasVal(input.symptoms) || _hasVal(input.diseases) || _hasVal(input.radiologyLabs)
      ) {
        await db.createDoctorReport({
          visitId: visitId,
          patientId: input.patientId,
          doctorId: ctx.user.id,
          diagnosis: input.diagnosis,
          treatment: input.treatment,
          recommendations: input.recommendations || input.report,
          diseases: input.diseases,
          additionalNotes: input.radiologyLabs,
          clinicalOpinion: input.symptoms,
        });
      }

      // Log audit event
      await db.logAuditEvent(ctx.user.id, "SAVE_MEDICAL_VISIT", "visit", input.patientId, {
        visitId: visitId,
        isFollowup: input.isFollowup,
        hasDiagnosis: !!input.diagnosis,
        hasTreatment: !!input.treatment,
      });

      return { success: true, visitId: visitId };
    }),

  // ============ ADMIN USERS ============

  getDoctors: protectedProcedure.query(async () => {
    return await db.getDoctors();
  }),

  getAllUsers: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  createUser: adminProcedure
    .input(z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["admin", "doctor", "nurse", "technician", "reception", "manager", "accountant"]).optional(),
      branch: z.enum(["examinations", "surgery", "both"]).optional(),
      shift: z.union([z.literal(1), z.literal(2)]).optional(),
      writeToMssql: z.boolean().optional(),
    }))
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
          message: "Failed to create user - no ID returned from database"
        });
      }
      const extras = input.writeToMssql ? ["/ops/mssql-add"] : [];
      await db.setUserPermissions(
        createdUserId,
        extras,
        extras.length > 0 ? { emptyMode: "inherit", nonEmptyMode: "inherit_extras" } : { emptyMode: "inherit" },
      );
      await db.logAuditEvent(ctx.user.id, "CREATE_USER", "user", 0, { username: input.username });
      return { success: true, userId: createdUserId };
    }),

  updateUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      updates: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      const updates = { ...input.updates };
      if (typeof updates.password === "string" && updates.password.length > 0) {
        updates.password = await authService.hashPassword(updates.password);
      }
      await db.updateUser(input.userId, updates);
      if (typeof updates.role === "string" && updates.role.trim().length > 0) {
        await db.setUserPermissions(input.userId, [], { emptyMode: "inherit" });
      }
      await db.logAuditEvent(ctx.user.id, "UPDATE_USER", "user", input.userId, { updates: Object.keys(input.updates) });
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
    const permissions = await db.getEffectiveUserPermissions(ctx.user.id, ctx.user.role);
    if (ctx.user.role === "reception" && !permissions.includes("/examination")) {
      permissions.push("/examination");
    }
    return permissions;
  }),

  getTeamPermissions: adminProcedure.query(async () => {
    return await db.getTeamPermissions();
  }),

  setTeamPermissions: adminProcedure
    .input(z.object({
      admin: z.array(z.string()),
      manager: z.array(z.string()),
      accountant: z.array(z.string()),
      reception: z.array(z.string()),
      nurse: z.array(z.string()),
      technician: z.array(z.string()),
      doctor: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const previousPermissions = await db.getTeamPermissions();
      await db.setTeamPermissions(input);
      const nextPermissions = await db.getTeamPermissions();
      const users = await db.getAllUsers();
      for (const user of users) {
        const role = String(user.role ?? "").trim().toLowerCase() as keyof typeof input;
        const previousRolePermissions = previousPermissions[role] ?? [];
        const nextRolePermissions = nextPermissions[role] ?? [];
        const currentUserPermissions = await db.getUserPermissionState(user.id);
        if (currentUserPermissions.hasExplicitEmptyOverride) continue;
        if (!currentUserPermissions.hasOverride) continue;
        if (currentUserPermissions.hasInheritExtrasMarker) continue;
        if (db.userPermissionsMirrorTeamSnapshot(currentUserPermissions.pageIds, previousRolePermissions)) {
          await db.setUserPermissions(user.id, nextRolePermissions, { emptyMode: "inherit" });
        }
      }
      await db.logAuditEvent(ctx.user.id, "SET_TEAM_PERMISSIONS", "systemSetting", 0, {
        roles: Object.keys(input),
      });
      return { success: true };
    }),

  setUserPermissions: adminProcedure
    .input(z.object({
      userId: z.number(),
      pageIds: z.array(z.string()),
      /** Empty list: inherit live role (clear overrides) vs explicit deny-all */
      whenEmpty: z.enum(["inherit", "explicit_deny"]).optional(),
      /** Non-empty: full replace vs extras merged with live role */
      nonEmptyStorage: z.enum(["replace", "inherit_extras"]).optional(),
    }))
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
      await db.logAuditEvent(ctx.user.id, "SET_USER_PERMISSIONS", "user", input.userId, { count: normalized.length });
      return { success: true };
    }),

  // Populate missing patient names from sheet data
  populatePatientNamesFromSheets: adminProcedure
    .mutation(async ({ ctx }) => {
      const result = await db.populatePatientNamesFromSheets();
      await db.logAuditEvent(ctx.user.id, "POPULATE_PATIENT_NAMES", "system", 0, { updated: result.updated });
      return result;
    }),

  // Debug: Check what's in the database for today's patients
  debugTodayPatients: adminProcedure
    .query(async () => {
      const result = await db.getTodayPatientsBySheet("2026-04-03");
      const totalWithoutName = result.groups.reduce((sum, g) => sum + g.patients.filter(p => !p.fullName || !String(p.fullName).trim()).length, 0);
      const totalWithName = result.groups.reduce((sum, g) => sum + g.patients.filter(p => p.fullName && String(p.fullName).trim()).length, 0);

      return {
        total: result.total,
        totalWithName,
        totalWithoutName,
        samplePatients: result.groups[0]?.patients?.slice(0, 3) || [],
      };
    }),

  // ============ PATIENT QUEUE MANAGEMENT ============

  // Get today's patients filtered by queue status
  getTodayPatientsByQueueStatus: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      queueStatus: z.enum(["checkedIn", "next", "clinic", "treated"]),
    }))
    .query(async ({ input }) => {
      try {
        const dateIso = input.date || new Date().toISOString().split("T")[0];

        // Daily rollover: carry forward unfinished old queues as treated.
        await db.rolloverPreviousQueueVisitsAsTreated(dateIso);

        // Auto-advance patients through queue
        await db.autoAdvanceQueuePatients(dateIso);

        const visits = await db.getTodayVisitsByQueueStatus(dateIso, input.queueStatus);

        // Reshape flattened data back to structured format
        const patientMap = new Map();
        for (const visit of visits) {
          const patientId = visit.patientId;
          if (!patientMap.has(patientId)) {
            patientMap.set(patientId, {
              id: patientId,
              patientCode: visit.patientCode,
              fullName: visit.patientFullName,
              phone: visit.patientPhone,
              serviceType: visit.patientServiceType,
              locationType: visit.patientLocationType,
              doctorId: visit.patientDoctorId,
              doctorName: visit.doctorName,
              visitId: visit.id,
              visitDate: visit.visitDate,
              visitType: visit.visitType,
              queueStatus: visit.queueStatus,
              checkedInAt: visit.checkedInAt,
              checkedInTime: (visit as any).checkedInTime ?? null,
              movedToNextAt: visit.movedToNextAt,
              movedToClinicAt: visit.movedToClinicAt,
              treatedAt: visit.treatedAt,
            });
          }
        }


        return Array.from(patientMap.values()).sort(
          (a, b) => {
            const aTime = a.checkedInAt ? new Date(a.checkedInAt).getTime() : (a.visitDate ? new Date(a.visitDate).getTime() : 0);
            const bTime = b.checkedInAt ? new Date(b.checkedInAt).getTime() : (b.visitDate ? new Date(b.visitDate).getTime() : 0);
            return aTime - bTime;
          }
        );
      } catch (error) {
        console.error("getTodayPatientsByQueueStatus error:", error);
        throw error;
      }
    }),

  // Update visit queue status
  updateVisitQueueStatus: protectedProcedure
    .input(z.object({
      visitId: z.number(),
      queueStatus: z.enum(["checkedIn", "next", "clinic", "treated"]),
      patientId: z.number().optional(),
      date: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Same practical access as today-queue reads: طاقم طبي + استقبال + إدارة (وليس فقط doctor/nurse أو مسار /patients).
      const permissions = await db.getEffectiveUserPermissions(ctx.user.id, ctx.user.role);
      const role = String(ctx.user.role ?? "").toLowerCase();
      const staffRoles = ["doctor", "nurse", "technician", "reception", "manager", "admin"];
      const canUpdateQueue = permissions.includes("/patients") || staffRoles.includes(role);
      if (!canUpdateQueue) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to update patient queue status." });
      }

      await db.updateVisitQueueStatus(input.visitId, input.queueStatus);

      // If marked as treated, advance the non-external queue one-by-one.
      if (input.queueStatus === "treated") {
        const normalizedInputDate =
          typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())
            ? input.date.trim()
            : null;
        const visitDateIso = normalizedInputDate || (await db.getVisitDateIsoById(input.visitId));
        if (visitDateIso) {
          await db.cascadeQueueStatus(visitDateIso);
          await db.autoAdvanceQueuePatients(visitDateIso);
        }
      }

      await db.logAuditEvent(ctx.user.id, "UPDATE_QUEUE_STATUS", "visit", input.visitId, {
        newStatus: input.queueStatus,
      });

      return { success: true };
    }),

  // Sync registration catalog (services + doctors) from MSSQL to MySQL
  syncRegistrationCatalogFromMssql: managerProcedure.mutation(async ({ ctx }) => {
    const stageStats: Record<string, unknown> = {};
    try {
      // Discover column names via INFORMATION_SCHEMA
      const srvColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SRVCMF'`, {},
      );
      const mdColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MDTEAM'`, {},
      );
      const lstdColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
        `SELECT COLUMN_NAME FROM op2026.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SRVLSTD'`, {},
      );
      const srvCols = new Set(srvColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()));
      const mdCols = new Set(mdColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()));
      const lstdCols = new Set(lstdColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()));

      const pickCol = (cols: Set<string>, candidates: string[]): string | null =>
        candidates.find((c) => cols.has(c.toUpperCase())) ?? null;

      const srvCodeCol = pickCol(srvCols, ["SRV_CD", "SRVCOD", "SRV_CODE", "CODE"]);
      const srvNameCol = pickCol(srvCols, ["SRV_NM_AR", "SRV_NM_EN", "SRV_NM", "SRV_NAME", "SRVNAME", "NAME", "NM"]);
      const drsCodeCol = pickCol(mdCols, ["CODE", "DRS_CD", "DRSCOD", "DRS_CODE"]);
      const drsNameCol = pickCol(mdCols, ["PHNM_AR", "PHNM_EN", "DRS_NM", "DRS_NAME", "DRSNAME", "NAME", "NM"]);
      const drsDeptNoCol = mdCols.has("DPT_NO") ? "DPT_NO" : null;
      const lstdCodeCol = pickCol(lstdCols, ["SRV_CD", "SRVCOD", "SRV_CODE", "CODE"]);
      const lstdPriceCol = pickCol(lstdCols, ["PR_VL", "PRC1", "PRC", "PRC_VL", "PRICE", "PRCVL", "DISC_VL", "SRVRAT"]);

      if (!srvCodeCol || !srvNameCol) {
        throw new Error(`Cannot find service code/name columns in SRVCMF. Available: ${[...srvCols].join(", ")}`);
      }
      if (!drsCodeCol || !drsNameCol) {
        throw new Error(`Cannot find doctor code/name columns in MDTEAM. Available: ${[...mdCols].join(", ")}`);
      }
      if (!lstdCodeCol || !lstdPriceCol) {
        throw new Error(`Cannot find code/price columns in SRVLSTD. Available: ${[...lstdCols].join(", ")}`);
      }

      const servicesQuery = `
        SELECT
          l.${lstdCodeCol} AS code,
          MAX(s.${srvNameCol}) AS name,
          CAST(ISNULL(TRY_CAST(MAX(l.${lstdPriceCol}) AS DECIMAL(10,2)), 0) AS DECIMAL(10,2)) AS price
        FROM op2026.dbo.SRVLSTD l
        JOIN SRVCMF s ON s.${srvCodeCol} = l.${lstdCodeCol}
        WHERE l.${lstdCodeCol} IS NOT NULL AND l.${lstdCodeCol} <> ''
          AND s.DPT_NO = 15
        GROUP BY l.${lstdCodeCol}
        ORDER BY l.${lstdCodeCol}
      `;

      const mssqlServices = await mssqlQuery(servicesQuery, {});
      stageStats.servicesRows = mssqlServices.length;

      if (!drsDeptNoCol) {
        throw new Error(`DPT_NO column not found in MDTEAM. Available: ${[...mdCols].join(", ")}`);
      }

      const doctorsQuery = `
        SELECT DISTINCT
          ${drsCodeCol} AS code,
          ${drsNameCol} AS name
        FROM MDTEAM
        WHERE ${drsCodeCol} IS NOT NULL AND ${drsCodeCol} <> ''
          AND ${drsDeptNoCol} = 15
        ORDER BY ${drsCodeCol}
      `;
      const mssqlDoctors = await mssqlQuery(doctorsQuery, {});
      stageStats.doctorsRows = mssqlDoctors.length;

      // Upsert to MySQL services and doctorsLookup tables
      const result = await db.upsertRegistrationCatalogRows({
        mssqlServices: mssqlServices.map((row: any) => ({
          code: String(row.code ?? "").trim(),
          name: String(row.name ?? "").trim(),
          price: Number(row.price ?? 0),
        })),
        mssqlDoctors: mssqlDoctors.map((row: any) => ({
          code: String(row.code ?? "").trim(),
          name: String(row.name ?? "").trim(),
        })),
      });
      stageStats.servicesUpserted = result.servicesUpserted;
      stageStats.doctorsUpserted = result.doctorsUpserted;

      await db.logAuditEvent(ctx.user.id, "SYNC_REGISTRATION_CATALOG", "system", 0, {
        servicesUpserted: result.servicesUpserted,
        doctorsUpserted: result.doctorsUpserted,
      });

      return {
        success: true,
        servicesUpserted: result.servicesUpserted,
        doctorsUpserted: result.doctorsUpserted,
        mssqlServicesRows: mssqlServices.length,
        mssqlDoctorsRows: mssqlDoctors.length,
      };
    } catch (error) {
      const err = error as any;
      console.error("syncRegistrationCatalogFromMssql error:", {
        stageStats,
        message: err?.message ?? String(err),
        code: err?.code,
        name: err?.name,
        state: err?.state,
        number: err?.number,
        originalError: err?.originalError?.message ?? null,
        precedingErrors: Array.isArray(err?.precedingErrors)
          ? err.precedingErrors.map((e: any) => e?.message ?? String(e))
          : null,
      });
      const errMsg = err?.message ?? String(err);
      const originalMsg = err?.originalError?.message ?? null;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to sync registration catalog from MSSQL: ${originalMsg ?? errMsg} (stage: ${JSON.stringify(stageStats)})`,
      });
    }
  }),



  updateServicePriceInMssql: managerProcedure
    .input(z.object({ code: z.string().min(1), price: z.number().min(0) }))
    .mutation(async ({ input }) => {
      const lstdColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
        `SELECT COLUMN_NAME FROM op2026.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SRVLSTD'`, {},
      );
      const lstdCols = new Set(lstdColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()));
      const pickCol = (cols: Set<string>, candidates: string[]): string | null =>
        candidates.find((c) => cols.has(c.toUpperCase())) ?? null;
      const lstdCodeCol = pickCol(lstdCols, ["SRV_CD", "SRVCOD", "SRV_CODE", "CODE"]);
      const lstdPriceCol = pickCol(lstdCols, ["PR_VL", "PRC1", "PRC", "PRC_VL", "PRICE", "PRCVL", "DISC_VL", "SRVRAT"]);
      if (!lstdCodeCol || !lstdPriceCol) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Cannot find code/price columns in SRVLSTD. Available: ${[...lstdCols].join(", ")}`,
        });
      }
      await mssqlQuery(
        `UPDATE op2026.dbo.SRVLSTD SET ${lstdPriceCol} = @price WHERE ${lstdCodeCol} = @code AND CA_CD = '000000'`,
        { price: input.price, code: input.code },
      );
      return { success: true };
    }),

  addServiceInDb: managerProcedure
    .input(z.object({
      id: z.string().min(1),
      code: z.string().min(1),
      name: z.string().min(1),
      category: z.string(),
      serviceType: z.string(),
      srvTyp: z.string(),
      defaultSheet: z.string(),
    }))
    .mutation(async ({ input }) => {
      await db.addServiceInDb(input);
      return { success: true };
    }),

  getServicesFromDb: managerProcedure.query(async () => {
    return db.getAllServicesFromDb();
  }),

  updateServiceInDb: managerProcedure
    .input(z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      category: z.string().nullable().optional(),
      serviceType: z.string().optional(),
      srvTyp: z.string().nullable().optional(),
      defaultSheet: z.string().optional(),
      locationType: z.string().optional(),
      price: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateServiceInDb(id, updates);
      return { success: true };
    }),

  // Get registration catalog (services + doctors) from MySQL
  getRegistrationCatalog: protectedProcedure.query(async () => {
    try {
      return await db.getRegistrationCatalogFromDb();
    } catch (error) {
      console.error("getRegistrationCatalog error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch registration catalog",
      });
    }
  }),

  // ============ DOCTORS & SERVICES now use doctors and services tables directly ============
  // createDoctor, updateDoctor, deleteDoctor, getServices, createService, updateService, deleteService
  // can be added as admin endpoints when needed

  // ============ DATA SOURCE AUDIT — admin debug endpoint ============
  getDataSourceAuditStatus: adminProcedure
    .input(z.object({ patientId: z.number().optional() }))
    .query(async ({ input }) => {
      if (!input.patientId) {
        return { checked: false };
      }

      const patientId = input.patientId;
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");

      // 1. Patient row from patients table
      const patientRow = await db.getPatientById(patientId);

      // 2. Latest examination for this patient
      const examinationRows = await dbConn
        .select()
        .from(examinations)
        .where(eq(examinations.patientId, patientId))
        .orderBy(desc(examinations.createdAt))
        .limit(1);
      const latestExam = examinationRows[0] ?? null;

      // 3. Checklist from examination_checklist_items
      let checklistNormalized: Record<string, boolean | null> | null = null;
      if (latestExam) {
        const checklistRows = await dbConn
          .select()
          .from(examinationChecklistItems)
          .where(eq(examinationChecklistItems.examinationId, latestExam.id))
          .limit(1);
        if (checklistRows[0]) {
          const row = checklistRows[0];
          checklistNormalized = {
            generalDiseases: row.generalDiseases ?? null,
            pregnancyOrLactation: row.pregnancyOrLactation ?? null,
            usesAllergySupplementsSteroidsOrPressureMeds: row.usesAllergySupplementsSteroidsOrPressureMeds ?? null,
            acneTreatment: row.acneTreatment ?? null,
            familyKeratoconus: row.familyKeratoconus ?? null,
            usesTearSubstituteOrExcessTearsOrSandySensation: row.usesTearSubstituteOrExcessTearsOrSandySensation ?? null,
            symptomsWorseWithAirOrAC: row.symptomsWorseWithAirOrAC ?? null,
            glaucomaTreatment: row.glaucomaTreatment ?? null,
          };
        }
      }

      // 4. patientPageStates for examination page
      const pageStateRows = await dbConn
        .select()
        .from(patientPageStates)
        .where(
          and(
            eq(patientPageStates.patientId, patientId),
            eq(patientPageStates.page, "examination")
          )
        )
        .orderBy(desc(patientPageStates.updatedAt))
        .limit(1);
      const pageStateData = (pageStateRows[0]?.data ?? null) as Record<string, unknown> | null;
      const checklistInPageState = pageStateData
        ? {
            generalDiseases: pageStateData.generalDiseases ?? null,
            pregnancyOrLactation: pageStateData.pregnancyOrLactation ?? null,
            usesAllergySupplementsSteroidsOrPressureMeds: pageStateData.usesAllergySupplementsSteroidsOrPressureMeds ?? null,
            acneTreatment: pageStateData.acneTreatment ?? null,
            familyKeratoconus: pageStateData.familyKeratoconus ?? null,
            usesTearSubstituteOrExcessTearsOrSandySensation: pageStateData.usesTearSubstituteOrExcessTearsOrSandySensation ?? null,
            symptomsWorseWithAirOrAC: pageStateData.symptomsWorseWithAirOrAC ?? null,
            glaucomaTreatment: pageStateData.glaucomaTreatment ?? null,
          }
        : null;

      // 5. Autorefractometry data (autoref + IOP)
      const autorefRows = await dbConn
        .select()
        .from(autorefractometryData)
        .where(eq(autorefractometryData.patientId, patientId))
        .orderBy(desc(autorefractometryData.createdAt))
        .limit(1);
      const latestAutoref = autorefRows[0] ?? null;

      // 6. After refraction data
      const afterRefRows = latestExam
        ? await dbConn
            .select()
            .from(afterRefractionData)
            .where(eq(afterRefractionData.examinationId, latestExam.id))
            .limit(1)
        : [];
      const afterRefData = afterRefRows[0] ?? null;

      // 7. Glasses records
      const glassesRows = await dbConn
        .select()
        .from(glassesRecords)
        .where(eq(glassesRecords.patientId, patientId))
        .orderBy(desc(glassesRecords.createdAt))
        .limit(1);
      const latestGlasses = glassesRows[0] ?? null;

      // 8. Pentacam data
      const pentacamRows = latestExam
        ? await dbConn
            .select()
            .from(pentacamResults)
            .where(eq(pentacamResults.visitId, latestExam.id))
            .limit(1)
        : [];
      const pentacamData = pentacamRows[0] ?? null;

      // 9. Doctor report (diagnosis, treatment)
      const doctorReportRows = latestExam
        ? await dbConn
            .select()
            .from(doctorReports)
            .where(eq(doctorReports.visitId, latestExam.id))
            .limit(1)
        : [];
      const doctorReportData = doctorReportRows[0] ?? null;

      // 10. Test requests
      const testReqRows = await dbConn
        .select()
        .from(testRequests)
        .where(eq(testRequests.patientId, patientId))
        .orderBy(desc(testRequests.createdAt))
        .limit(1);
      const latestTestRequest = testReqRows[0] ?? null;

      return {
        checked: true,
        patientId,
        patient: patientRow
          ? {
              id: patientRow.id,
              fullName: patientRow.fullName,
              patientCode: patientRow.patientCode,
              phone: patientRow.phone,
              doctorCode: patientRow.doctorCode,
              serviceCode: patientRow.serviceCode,
            }
          : null,
        latestExamId: latestExam?.id ?? null,
        checklistNormalized,
        checklistInPageState,
        pageStateUpdatedAt: pageStateRows[0]?.updatedAt ?? null,
        pageStateSessionFields: pageStateData
          ? {
              doctorName: pageStateData.doctorName ?? null,
              visitDate: pageStateData.visitDate ?? null,
              sheetSelection: pageStateData.sheetSelection ?? null,
              serviceCode: pageStateData.serviceCode ?? null,
            }
          : null,
        // Additional exam data
        autoref: latestAutoref
          ? {
              sphereOD: latestAutoref.sphereOD ?? null,
              cylinderOD: latestAutoref.cylinderOD ?? null,
              axisOD: latestAutoref.axisOD ?? null,
              sphereOS: latestAutoref.sphereOS ?? null,
              cylinderOS: latestAutoref.cylinderOS ?? null,
              axisOS: latestAutoref.axisOS ?? null,
              iopOD: latestAutoref.iopOD ?? null,
              iopOS: latestAutoref.iopOS ?? null,
            }
          : null,
        afterRef: afterRefData
          ? {
              sphereOD: afterRefData.sphereOD ?? null,
              cylinderOD: afterRefData.cylinderOD ?? null,
              axisOD: afterRefData.axisOD ?? null,
              sphereOS: afterRefData.sphereOS ?? null,
              cylinderOS: afterRefData.cylinderOS ?? null,
              axisOS: afterRefData.axisOS ?? null,
            }
          : null,
        glasses: latestGlasses
          ? {
              sOD: latestGlasses.sOD ?? null,
              cOD: latestGlasses.cOD ?? null,
              axisOD: latestGlasses.axisOD ?? null,
              sOS: latestGlasses.sOS ?? null,
              cOS: latestGlasses.cOS ?? null,
              axisOS: latestGlasses.axisOS ?? null,
              pdOD: latestGlasses.pdOD ?? null,
              addOD: latestGlasses.addOD ?? null,
            }
          : null,
        pentacam: pentacamData
          ? {
              k1OD: pentacamData.k1OD ?? null,
              k2OD: pentacamData.k2OD ?? null,
              k1OS: pentacamData.k1OS ?? null,
              k2OS: pentacamData.k2OS ?? null,
              thinnestPointOD: pentacamData.thinnestPointOD ?? null,
              thinnestPointOS: pentacamData.thinnestPointOS ?? null,
            }
          : null,
        doctorReport: doctorReportData
          ? {
              diagnosis: doctorReportData.diagnosis ?? null,
              treatment: doctorReportData.treatment ?? null,
              recommendations: doctorReportData.recommendations ?? null,
            }
          : null,
        testRequest: latestTestRequest
          ? {
              requestDate: latestTestRequest.requestDate ?? null,
              status: latestTestRequest.status ?? null,
            }
          : null,
      };
    }),

  getPatientMedicalStatusBatch: protectedProcedure
    .input(z.object({ patientIds: z.array(z.number().int().positive()).max(500) }))
    .query(async ({ input }) => {
      const ids = input.patientIds;
      if (ids.length === 0) return {} as Record<number, { autoref: boolean; afterRef: boolean; glasses: boolean; pentacam: boolean; prescription: boolean; tests: boolean; reports: boolean }>;

      const dbInstance = await db.getDb();
      if (!dbInstance) return {} as Record<number, { autoref: boolean; afterRef: boolean; glasses: boolean; pentacam: boolean; prescription: boolean; tests: boolean; reports: boolean }>;

      const [autorefRows, afterRefRows, glassesRows, pentacamRows, prescriptionRows, testRows, reportRows] = await Promise.all([
        dbInstance.selectDistinct({ patientId: autorefractometryData.patientId }).from(autorefractometryData).where(inArray(autorefractometryData.patientId, ids)),
        dbInstance.selectDistinct({ patientId: afterRefractionData.patientId }).from(afterRefractionData).where(inArray(afterRefractionData.patientId, ids)),
        dbInstance.selectDistinct({ patientId: glassesRecords.patientId }).from(glassesRecords).where(inArray(glassesRecords.patientId, ids)),
        dbInstance.selectDistinct({ patientId: pentacamResults.patientId }).from(pentacamResults).where(inArray(pentacamResults.patientId, ids)),
        dbInstance.selectDistinct({ patientId: prescriptions.patientId }).from(prescriptions).where(inArray(prescriptions.patientId, ids)),
        dbInstance.selectDistinct({ patientId: testRequests.patientId }).from(testRequests).where(inArray(testRequests.patientId, ids)),
        dbInstance.selectDistinct({ patientId: doctorReports.patientId }).from(doctorReports).where(inArray(doctorReports.patientId, ids)),
      ]);

      const withAutoref = new Set(autorefRows.map((r) => r.patientId));
      const withAfterRef = new Set(afterRefRows.map((r) => r.patientId));
      const withGlasses = new Set(glassesRows.map((r) => r.patientId));
      const withPentacam = new Set(pentacamRows.map((r) => r.patientId));
      const withPrescription = new Set(prescriptionRows.map((r) => r.patientId));
      const withTests = new Set(testRows.map((r) => r.patientId));
      const withReports = new Set(reportRows.map((r) => r.patientId));

      const result: Record<number, { autoref: boolean; afterRef: boolean; glasses: boolean; pentacam: boolean; prescription: boolean; tests: boolean; reports: boolean }> = {};
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

});




async function assertReadyTemplateImportPermission(
  ctx: { user: { id: number; role?: string | null } },
  scope: "prescription" | "tests"
) {
  const role = String(ctx.user?.role ?? "").trim().toLowerCase();
  if (role === "admin") return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: scope === "prescription" ? "Prescription import is admin only" : "Tests import is admin only",
  });
}
