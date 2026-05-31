import {
  eq,
  and,
  like,
  desc,
  or,
  not,
  sql,
  inArray,
  gte,
  lte,
  lt,
  getTableColumns,
  isNull,
  isNotNull,
  asc,
  ne,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import {
  InsertUser,
  users,
  patients,
  patientImportStaging,
  appointments,
  InsertAppointment,
  visits,
  examinations,
  pentacamResults,
  autorefractometryData,
  afterRefractionData,
  glassesRecords,
  doctorReports,
  prescriptions,
  prescriptionItems,
  surgeries,
  postOpFollowups,
  consentForms,
  medicalHistoryChecklist,
  examinationChecklistItems,
  auditLog,
  auditLogs,
  medications,
  tests,
  testRequests,
  testRequestItems,
  systemSettings,
  userPermissions,
  sheetEntries,
  operationLists,
  operationListItems,
  operationBookings,
  OperationBooking,
  InsertOperationBooking,
  diseases,
  userPageStates,
  patientPageStates,
  testFavorites,
  patientServiceEntries,
  pushDeviceRegistrations,
  InsertAuditLog,
  InsertDoctorReport,
  followupSheets,
  followupItems,
  doctorsLookup,
  services,
  visitScheduleRequests,
  InsertVisitScheduleRequest,
  stockItems,
  stockTransactions,
  InsertStockItem,
  InsertStockTransaction,
} from "../drizzle/schema";
import { PENTACAM_ALLOWED_SRV_CODES } from "../shared/pentacam";
const exec = promisify(execCb);

let _db: ReturnType<typeof drizzle> | null = null;
const OVERVIEW_ROW_LIMIT = 5000;
const OVERVIEW_PAGE_SIZE = 50;
const ACTIVE_DAYS = 30;
const EXPIRED_AFTER_DAYS = 120;

const MOJIBAKE_HINT = /[ØÙÃÂ]/;

function meaningfulValueCondition(column: any) {
  return sql`NULLIF(TRIM(COALESCE(CAST(${column} AS CHAR), '')), '') IS NOT NULL AND UPPER(TRIM(COALESCE(CAST(${column} AS CHAR), ''))) NOT IN ('0', '0.0', '0.00')`;
}

function anyMeaningfulValueCondition(columns: any[]) {
  return or(...columns.map((column) => meaningfulValueCondition(column)) as any);
}

function overviewSearchClause(search: string, columns: any[]) {
  const normalizedSearch = String(search ?? "").trim();
  if (!normalizedSearch) return undefined;
  const term = `%${normalizedSearch}%`;
  const legacyTerm = `%${encodeForLegacySearch(normalizedSearch)}%`;
  const searchClauses = columns.flatMap((column) => [like(column, term), like(column, legacyTerm)]);
  return or(...searchClauses as any);
}

function normalizeOverviewPage(page: number | undefined) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Math.floor(Number(page))) : 1;
  return safePage;
}

function normalizeOverviewPageSize(pageSize: number | undefined) {
  const safePageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.min(200, Math.floor(Number(pageSize)))) : OVERVIEW_PAGE_SIZE;
  return safePageSize;
}

function combineWhereClauses(...clauses: Array<any | undefined>) {
  const cleanClauses = clauses.filter(Boolean);
  return cleanClauses.length > 0 ? and(...(cleanClauses as any)) : undefined;
}

function decodeMojibake(value: unknown): string {
  const raw = String(value ?? "");
  if (!raw || !MOJIBAKE_HINT.test(raw)) return raw;
  try {
    return Buffer.from(raw, "latin1").toString("utf8");
  } catch {
    return raw;
  }
}

function encodeForLegacySearch(value: string): string {
  try {
    return Buffer.from(String(value ?? ""), "utf8").toString("latin1");
  } catch {
    return value;
  }
}

function decodePatientRow<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    fullName: decodeMojibake(row.fullName),
    address: decodeMojibake(row.address),
    occupation: decodeMojibake(row.occupation),
    referralSource: decodeMojibake(row.referralSource),
    treatingDoctor: decodeMojibake(row.treatingDoctor),
  } as T;
}

const PENTACAM_ALLOWED_SRV_CODE_SQL = sql.join(
  PENTACAM_ALLOWED_SRV_CODES.map((code) => sql`${code.toLowerCase()}`),
  sql`, `,
);

function pentacamEligibilityExpr() {
  const allowedLocationExpr = sql`LOWER(TRIM(COALESCE(${patients.locationType}, ''))) IN ('center', 'external')`;
  const directCodeExpr = sql`LOWER(TRIM(COALESCE(${patients.serviceCode}, ''))) IN (${PENTACAM_ALLOWED_SRV_CODE_SQL})`;
  const entryCodeExpr = sql`EXISTS (
    SELECT 1
    FROM ${patientServiceEntries} pse
    WHERE pse.patientId = ${patients.id}
      AND LOWER(TRIM(pse.serviceCode)) IN (${PENTACAM_ALLOWED_SRV_CODE_SQL})
  )`;

  return and(allowedLocationExpr as any, or(directCodeExpr as any, entryCodeExpr as any) as any);
}
// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/** Stable UUID-shaped id from a namespace + business key (deterministic upserts). */
export function deterministicCatalogId(ns: string, key: string): string {
  const h = createHash("sha1").update(`${ns}:${key}`).digest();
  const hex = Buffer.from(h.subarray(0, 16)).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function addServiceInDb(row: {
  id: string;
  code: string;
  name: string;
  category: string;
  serviceType: string;
  srvTyp: string;
  defaultSheet: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  await db.insert(services).values({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    serviceType: row.serviceType,
    srvTyp: row.srvTyp,
    defaultSheet: row.defaultSheet,
    locationType: "center",
    price: "0",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getAllServicesFromDb() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(services).orderBy(asc(services.code));
}

export async function updateServiceInDb(
  id: string,
  updates: Partial<{
    name: string;
    category: string | null;
    serviceType: string;
    srvTyp: string | null;
    defaultSheet: string;
    locationType: string;
    price: string;
    isActive: boolean;
  }>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(services).set({ ...updates, updatedAt: new Date() }).where(eq(services.id, id));
}

export async function getRegistrationCatalogFromDb(): Promise<{
  services: Array<{ code: string; name: string; price: number }>;
  doctors: Array<{ code: string; name: string }>;
}> {
  const db = await getDb();
  if (!db) {
    return { services: [], doctors: [] };
  }
  const svcRows = await db
    .select({
      code: services.code,
      name: services.name,
      price: services.price,
    })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.code));
  const docRows = await db
    .select({
      code: doctorsLookup.code,
      name: doctorsLookup.name,
    })
    .from(doctorsLookup)
    .where(and(isNotNull(doctorsLookup.code), ne(doctorsLookup.code, "")))
    .orderBy(asc(doctorsLookup.code));
  return {
    services: svcRows.map((r) => ({
      code: String(r.code ?? "").trim(),
      name: String(r.name ?? "").trim(),
      price: Number(r.price ?? 0),
    })),
    doctors: docRows.map((r) => ({
      code: String(r.code ?? "").trim(),
      name: String(r.name ?? "").trim(),
    })),
  };
}

export async function upsertRegistrationCatalogRows(params: {
  mssqlServices: Array<{ code: string; name: string; price: number }>;
  mssqlDoctors: Array<{ code: string; name: string }>;
}): Promise<{ servicesUpserted: number; doctorsUpserted: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const now = new Date();

  // Build service rows, one INSERT for all (ON DUPLICATE KEY UPDATE uses VALUES() ref)
  const serviceRows = params.mssqlServices
    .map((row) => {
      const code = String(row.code ?? "").trim();
      if (!code) return null;
      const id = deterministicCatalogId("svc", code);
      const priceStr = String(Number(row.price) || 0);
      return {
        id,
        code,
        name: String(row.name ?? "").trim() || code,
        category: null,
        serviceType: "specialist" as const,
        srvTyp: null,
        defaultSheet: "specialist" as const,
        locationType: "center" as const,
        price: priceStr,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (serviceRows.length > 0) {
    await db.insert(services).values(serviceRows).onDuplicateKeyUpdate({
      set: {
        // Strictly preserve local edits for existing services.
        // Keep duplicate-key branch as a no-op so sync only inserts missing services.
        id: sql`id`,
      },
    });
  }
  const servicesUpserted = serviceRows.length;

  // Upsert doctors by code:
  // - INSERT missing codes
  // - UPDATE names for existing codes
  const doctorRows = params.mssqlDoctors
    .map((row) => ({ code: String(row.code ?? "").trim(), name: String(row.name ?? "").trim() || String(row.code ?? "").trim() }))
    .filter((r) => r.code);

  let doctorsUpserted = 0;
  if (doctorRows.length > 0) {
    const doctorCodes = doctorRows.map((r) => r.code);
    const existingRows = await db
      .select({ code: doctorsLookup.code })
      .from(doctorsLookup)
      .where(inArray(doctorsLookup.code, doctorCodes));
    const existingCodes = new Set(existingRows.map((row) => String(row.code ?? "").trim()));

    const toInsert = doctorRows
      .filter((row) => !existingCodes.has(row.code))
      .map((row) => ({
        id: deterministicCatalogId("doc", row.code),
        code: row.code,
        name: row.name,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      }));

    if (toInsert.length > 0) {
      await db.insert(doctorsLookup).values(toInsert);
    }

    const toUpdate = doctorRows.filter((row) => existingCodes.has(row.code));
    let updatedCount = 0;
    if (toUpdate.length > 0) {
      const caseWhen = sql.join(
        toUpdate.map((row) => sql`WHEN ${row.code} THEN ${row.name}`),
        sql` `,
      );
      const codeList = sql.join(
        toUpdate.map((row) => sql`${row.code}`),
        sql`, `,
      );
      const result = await db.execute(
        sql`UPDATE doctors SET name = CASE code ${caseWhen} ELSE name END, isActive = 1, updatedAt = ${now} WHERE code IN (${codeList})`,
      );
      updatedCount = Number((result as any)?.[0]?.affectedRows ?? toUpdate.length);
    }

    doctorsUpserted = toInsert.length + updatedCount;
  }

  return { servicesUpserted, doctorsUpserted };
}

export async function updateServicePrices(
  rows: Array<{ code: string; price: number }>,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let updated = 0;
  for (const row of rows) {
    const code = String(row.code ?? "").trim();
    if (!code) continue;
    const priceStr = String(Number(row.price) || 0);
    const result = await db
      .update(services)
      .set({ price: priceStr, updatedAt: new Date() })
      .where(eq(services.code, code));
    if ((result as any)?.[0]?.affectedRows > 0) updated += 1;
  }
  return updated;
}

// ============ USER OPERATIONS ============

/**
 * Get user by username (for local auth)
 */
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const normalized = String(username ?? "").trim();
  const legacy = encodeForLegacySearch(normalized);
  const result = await db
    .select()
    .from(users)
    .where(or(eq(users.username, normalized), eq(users.username, legacy)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update user last signed in
 */
export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

/**
 * Create a new user
 */
export async function createUser(userData: InsertUser) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(users).values(userData);
    // Drizzle mysql2: result is [OkPacket, FieldPacket[]] or OkPacket depending on version
    const insertId = (result as any)?.[0]?.insertId ?? (result as any)?.insertId;
    if (insertId) return { insertId: Number(insertId) };
  } catch (err: any) {
    console.error("[createUser] MySQL error:", err?.code, err?.sqlMessage ?? err?.message, "| username:", userData.username);
    // INSERT may have committed despite Drizzle throwing (e.g. trigger warning, result parse error).
    // Fall through to check if the row actually landed.
  }

  // Attempt recovery: find user by username
  const found = await db.select({ insertId: users.id }).from(users).where(eq(users.username, userData.username)).limit(1);
  if (found.length > 0) return { insertId: found[0].insertId };

  return undefined;
}

/**
 * Get all users
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  const rows = await db.select().from(users);
  return rows.map((row) => ({
    ...row,
    username: decodeMojibake(row.username),
    name: decodeMojibake(row.name),
  }));
}

export async function getDoctors() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get doctors: database not available");
    return [];
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.role, "doctor"));

  return rows
    .filter((row) => row.isActive)
    .map((row) => ({
      id: row.id,
      username: decodeMojibake(row.username),
      name: decodeMojibake(row.name ?? row.username),
      code: `DR${String(row.id).padStart(3, "0")}`,
    }));
}

/**
 * Update user
 */
export async function updateUser(userId: number, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}

/**
 * Delete user
 */
export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete user: database not available");
    return;
  }

  await db.delete(users).where(eq(users.id, userId));
}

// ============ PATIENT OPERATIONS ============

export async function createPatient(patientData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(patients).values(patientData);
  return result;
}

type StagePatientImportRowInput = {
  rowNumber: number;
  patientCode?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  gender?: "male" | "female" | "" | null;
  phone?: string | null;
  address?: string | null;
  branch?: "examinations" | "surgery" | "" | null;
  serviceType?: "consultant" | "specialist" | "lasik" | "surgery" | "external" | "" | null;
  locationType?: "center" | "external" | "" | null;
  doctorCode?: string | null;
  doctorName?: string | null;
};

type StageBatchSummary = {
  batchId: string;
  total: number;
  valid: number;
  invalid: number;
};

const IMPORT_ALLOWED_SERVICE_TYPES = new Set(["consultant", "specialist", "lasik", "surgery", "external"]);
const IMPORT_ALLOWED_LOCATION_TYPES = new Set(["center", "external"]);
const IMPORT_ALLOWED_BRANCHES = new Set(["examinations", "surgery"]);

let doctorDirectoryCache:
  | {
      at: number;
      byCode: Map<string, { name: string; locationType: "center" | "external" }>;
      byName: Map<string, { code: string; locationType: "center" | "external" }>;
    }
  | null = null;

async function getDoctorDirectoryCached() {
  const now = Date.now();
  if (doctorDirectoryCache && now - doctorDirectoryCache.at < 60_000) {
    return doctorDirectoryCache;
  }

  const row = await getSystemSetting("doctor_directory");
  const byCode = new Map<string, { name: string; locationType: "center" | "external" }>();
  const byName = new Map<string, { code: string; locationType: "center" | "external" }>();
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as Array<any>;
      for (const item of parsed ?? []) {
        const code = String(item?.code ?? "").trim();
        const name = String(item?.name ?? "").trim();
        if (!code || !name) continue;
        const locationType = String(item?.locationType ?? "center").trim().toLowerCase() === "external" ? "external" : "center";
        byCode.set(code.toLowerCase(), { name, locationType });
        byName.set(name.toLowerCase(), { code, locationType });
      }
    } catch {
      // ignore malformed setting
    }
  }
  doctorDirectoryCache = { at: now, byCode, byName };
  return doctorDirectoryCache;
}

function normalizeIsoDate(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  if (Number.isNaN(dt.valueOf())) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function safeParseJsonArray(input: unknown): string[] {
  try {
    if (!input) return [];
    const parsed = JSON.parse(String(input));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function stagePatientImportRows(batchId: string, rows: StagePatientImportRowInput[]): Promise<StageBatchSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedBatchId = String(batchId ?? "").trim();
  if (!normalizedBatchId) throw new Error("batchId is required");

  await db.delete(patientImportStaging).where(eq(patientImportStaging.batchId, normalizedBatchId));

  const codeCounts = new Map<string, number>();
  for (const row of rows) {
    const code = String(row.patientCode ?? "").trim();
    if (!code) continue;
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }

  const directory = await getDoctorDirectoryCached();
  const doctorUsers = await getDoctors();
  const doctorIdByName = new Map<string, number>();
  for (const d of doctorUsers) {
    const key = String(d.name ?? "").trim().toLowerCase();
    if (key) doctorIdByName.set(key, Number(d.id));
  }

  let valid = 0;
  let invalid = 0;
  for (const row of rows) {
    const rowNumber = Number(row.rowNumber ?? 0) || 0;
    const patientCode = String(row.patientCode ?? "").trim();
    const fullName = String(row.fullName ?? "").trim();
    const dateOfBirthRaw = String(row.dateOfBirth ?? "").trim();
    const dateOfBirth = normalizeIsoDate(dateOfBirthRaw);
    const serviceType = String(row.serviceType ?? "").trim().toLowerCase();
    const branch = String(row.branch ?? "examinations").trim().toLowerCase();
    const explicitLocation = String(row.locationType ?? "").trim().toLowerCase();
    const doctorCode = String(row.doctorCode ?? "").trim();
    const doctorName = String(row.doctorName ?? "").trim();
    const genderRaw = String(row.gender ?? "").trim().toLowerCase();

    const errors: string[] = [];
    if (!patientCode) errors.push("Missing patient code");
    if (!fullName) errors.push("Missing full name");
    if (patientCode && (codeCounts.get(patientCode) ?? 0) > 1) errors.push("Duplicate patient code in same file");
    if (dateOfBirthRaw && !dateOfBirth) errors.push("Invalid dateOfBirth format (must be YYYY-MM-DD)");
    if (serviceType && !IMPORT_ALLOWED_SERVICE_TYPES.has(serviceType)) errors.push("Invalid serviceType");
    if (branch && !IMPORT_ALLOWED_BRANCHES.has(branch)) errors.push("Invalid branch");
    if (explicitLocation && !IMPORT_ALLOWED_LOCATION_TYPES.has(explicitLocation)) errors.push("Invalid locationType");

    const locationType = serviceType === "external" ? "external" : (IMPORT_ALLOWED_LOCATION_TYPES.has(explicitLocation) ? explicitLocation : "center");
    const gender = genderRaw === "male" || genderRaw === "female" ? genderRaw : null;

    let resolvedDoctorId: number | null = null;
    if (doctorName) {
      resolvedDoctorId = doctorIdByName.get(doctorName.toLowerCase()) ?? null;
    } else if (doctorCode) {
      const byCode = directory.byCode.get(doctorCode.toLowerCase());
      if (byCode) {
        resolvedDoctorId = doctorIdByName.get(byCode.name.toLowerCase()) ?? null;
      }
    }
    if ((doctorName || doctorCode) && !resolvedDoctorId) {
      errors.push("Doctor not found in users table");
    }

    const status = errors.length > 0 ? "invalid" : "valid";
    if (status === "valid") valid += 1;
    else invalid += 1;

    await db.insert(patientImportStaging).values({
      batchId: normalizedBatchId,
      rowNumber,
      patientCode: patientCode || null,
      fullName: fullName || null,
      dateOfBirthRaw: dateOfBirthRaw || null,
      dateOfBirth: dateOfBirth as any,
      gender: gender as any,
      phone: String(row.phone ?? "").trim() || null,
      address: String(row.address ?? "").trim() || null,
      branch: (IMPORT_ALLOWED_BRANCHES.has(branch) ? branch : "examinations") as any,
      serviceType: (IMPORT_ALLOWED_SERVICE_TYPES.has(serviceType) ? serviceType : "consultant") as any,
      locationType: locationType as any,
      doctorCode: doctorCode || null,
      doctorId: resolvedDoctorId,
      status: status as any,
      errors: errors.length ? JSON.stringify(errors) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    batchId: normalizedBatchId,
    total: rows.length,
    valid,
    invalid,
  };
}

export async function getPatientImportErrors(batchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedBatchId = String(batchId ?? "").trim();
  if (!normalizedBatchId) return [];
  const rows = await db
    .select()
    .from(patientImportStaging)
    .where(and(eq(patientImportStaging.batchId, normalizedBatchId), eq(patientImportStaging.status, "invalid" as any)))
    .orderBy(patientImportStaging.rowNumber);
  return rows.map((row) => ({
    rowNumber: Number(row.rowNumber ?? 0),
    patientCode: String(row.patientCode ?? ""),
    fullName: String(row.fullName ?? ""),
    errors: safeParseJsonArray(row.errors),
  }));
}

export async function getPatientImportPreview(batchId: string, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedBatchId = String(batchId ?? "").trim();
  if (!normalizedBatchId) return [];
  const safeLimit = Math.max(1, Math.min(500, Number(limit || 100)));
  const rows = await db
    .select()
    .from(patientImportStaging)
    .where(eq(patientImportStaging.batchId, normalizedBatchId))
    .orderBy(patientImportStaging.rowNumber)
    .limit(safeLimit);
  return rows.map((row) => ({
    rowNumber: Number(row.rowNumber ?? 0),
    patientCode: String(row.patientCode ?? ""),
    fullName: String(row.fullName ?? ""),
    serviceType: String(row.serviceType ?? ""),
    locationType: String(row.locationType ?? ""),
    status: String(row.status ?? "pending"),
    errors: safeParseJsonArray(row.errors),
  }));
}

export async function applyPatientImportBatch(batchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedBatchId = String(batchId ?? "").trim();
  if (!normalizedBatchId) throw new Error("batchId is required");

  const rows = await db
    .select()
    .from(patientImportStaging)
    .where(and(eq(patientImportStaging.batchId, normalizedBatchId), eq(patientImportStaging.status, "valid" as any)))
    .orderBy(patientImportStaging.rowNumber);

  const directory = await getDoctorDirectoryCached();
  let inserted = 0;
  let updated = 0;
  let failed = 0;
  let firstInserted: { fullName: string; serviceType: string } | null = null;

  for (const row of rows) {
    try {
      const patientCode = String(row.patientCode ?? "").trim();
      const fullName = String(row.fullName ?? "").trim();
      if (!patientCode || !fullName) {
        failed += 1;
        await db
          .update(patientImportStaging)
          .set({ status: "invalid" as any, errors: JSON.stringify(["Missing patientCode/fullName"]), updatedAt: new Date() })
          .where(eq(patientImportStaging.id, row.id));
        continue;
      }

      const payload: any = {
        patientCode,
        fullName,
        dateOfBirth: row.dateOfBirth ?? null,
        gender: row.gender ?? null,
        phone: row.phone ?? "",
        address: row.address ?? "",
        branch: row.branch ?? "examinations",
        serviceType: row.serviceType ?? "consultant",
        locationType: row.locationType ?? (row.serviceType === "external" ? "external" : "center"),
        lastVisit: row.dateOfBirth ?? new Date(),
        doctorId: row.doctorId ?? null,
        status: "new",
      };

      const existing = await getPatientByCode(patientCode);
      if (existing) {
        await db.update(patients).set(payload).where(eq(patients.id, Number(existing.id)));
        updated += 1;
      } else {
        await db.insert(patients).values(payload);
        inserted += 1;
        if (!firstInserted) firstInserted = { fullName, serviceType: String(row.serviceType ?? "consultant") };
      }

      const doctorCode = String(row.doctorCode ?? "").trim();
      let doctorName = "";
      if (doctorCode) {
        doctorName = directory.byCode.get(doctorCode.toLowerCase())?.name ?? "";
      }
      if (!doctorName && row.doctorId) {
        const owner = await getUserById(Number(row.doctorId));
        doctorName = String(owner?.name ?? owner?.username ?? "").trim();
      }
      await db
        .update(patientImportStaging)
        .set({ status: "applied" as any, errors: null, updatedAt: new Date() })
        .where(eq(patientImportStaging.id, row.id));
    } catch (error: any) {
      failed += 1;
      await db
        .update(patientImportStaging)
        .set({
          status: "invalid" as any,
          errors: JSON.stringify([String(error?.message ?? error ?? "Unknown import apply error")]),
          updatedAt: new Date(),
        })
        .where(eq(patientImportStaging.id, row.id));
    }
  }

  return {
    batchId: normalizedBatchId,
    total: rows.length,
    inserted,
    updated,
    failed,
    firstInserted: firstInserted as { fullName: string; serviceType: string } | null,
  };
}

export async function getOpsHealthStatus() {
  const db = await getDb();
  let dbConnected = false;
  let patientsCount = 0;
  let dbError = "";
  try {
    if (!db) throw new Error("Database not available");
    const rows = await db.select({ c: sql<number>`COUNT(*)` }).from(patients);
    dbConnected = true;
    patientsCount = Number(rows[0]?.c ?? 0);
  } catch (error: any) {
    dbConnected = false;
    dbError = String(error?.message ?? error ?? "db error");
  }

  let tunnelConnected = false;
  let tunnelInfo = "";
  try {
    const { stdout } = await exec("cloudflared tunnel list");
    tunnelInfo = stdout.trim();
    tunnelConnected = /[0-9a-f-]{36}/i.test(stdout);
  } catch (error: any) {
    tunnelInfo = String(error?.message ?? "cloudflared not available");
  }

  let api3000 = false;
  let web4000 = false;
  try {
    const { stdout } = await exec(
      'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -First 1 | ForEach-Object { $_.LocalPort }"'
    );
    api3000 = String(stdout).trim() === "3000";
  } catch {}
  try {
    const { stdout } = await exec(
      'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4000 -State Listen | Select-Object -First 1 | ForEach-Object { $_.LocalPort }"'
    );
    web4000 = String(stdout).trim() === "4000";
  } catch {}

  const backupsDir = path.join(process.cwd(), "backups");
  let latestBackupFile = "";
  let latestBackupAt = "";
  try {
    const files = await fs.readdir(backupsDir);
    const sqlFiles = files.filter((f) => f.toLowerCase().endsWith(".sql"));
    const withStat = await Promise.all(
      sqlFiles.map(async (name) => {
        const full = path.join(backupsDir, name);
        const stat = await fs.stat(full);
        return { name, full, mtime: stat.mtime };
      })
    );
    withStat.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const latest = withStat[0];
    if (latest) {
      latestBackupFile = latest.full;
      latestBackupAt = latest.mtime.toISOString();
    }
  } catch {
    // ignore missing backups dir
  }

  return {
    ok: dbConnected && web4000,
    env: process.env.NODE_ENV || "development",
    web4000,
    api3000,
    dbConnected,
    patientsCount,
    dbError,
    tunnelConnected,
    tunnelInfo,
    latestBackupFile,
    latestBackupAt,
  };
}

export async function getNextPatientCode() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      maxCode: sql<number>`MAX(CASE WHEN ${patients.patientCode} REGEXP '^[0-9]{4}$' THEN CAST(${patients.patientCode} AS UNSIGNED) ELSE NULL END)`,
    })
    .from(patients);

  const current = rows[0]?.maxCode ?? 0;
  const next = Number.isFinite(current) ? Number(current) + 1 : 1;
  return String(next).padStart(4, "0");
}

export async function getPatientById(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  return result.length > 0 ? decodePatientRow(result[0] as any) : null;
}

export async function getPatientByCode(patientCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(patients).where(eq(patients.patientCode, patientCode)).limit(1);
  return result.length > 0 ? decodePatientRow(result[0] as any) : null;
}

export async function searchPatients(
  searchTerm: string,
  sheetType?: "consultant" | "specialist" | "lasik" | "external" | "pentacam",
  locationType?: "center" | "external"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalized = String(searchTerm ?? "").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const legacy = encodeForLegacySearch(normalized);
  const term = `%${normalized}%`;
  const legacyTerm = `%${legacy}%`;
  const buildTokenClause = (token: string) => {
    const t = `%${token}%`;
    const lt = `%${encodeForLegacySearch(token)}%`;
    return or(
      like(patients.fullName, t),
      like(patients.fullName, lt),
      like(patients.patientCode, t),
      like(patients.phone, t),
      like(patients.alternatePhone, t)
    );
  };
  const phraseClause = or(
    like(patients.fullName, term),
    like(patients.fullName, legacyTerm),
    like(patients.patientCode, term),
    like(patients.phone, term),
    like(patients.alternatePhone, term)
  );
  const tokenClauses = tokens.map(buildTokenClause);
  const textMatch =
    tokenClauses.length > 1
      ? and(...tokenClauses)
      : tokenClauses.length === 1
      ? tokenClauses[0]
      : phraseClause;

  let whereClause = textMatch as any;
  if (sheetType) {
    if (sheetType === "pentacam") {
      whereClause = and(textMatch, pentacamEligibilityExpr() as any);
    } else {
      const rows = await db
        .select({ patientId: sheetEntries.patientId })
        .from(sheetEntries)
        .where(eq(sheetEntries.sheetType, sheetType as any))
        .groupBy(sheetEntries.patientId);
      const patientIds = rows.map((row) => Number(row.patientId)).filter((id) => Number.isFinite(id));
      if (patientIds.length === 0) return [];
      whereClause = and(textMatch, inArray(patients.id, patientIds));
    }
  }

  const normalizedLocationType = String(locationType ?? "").trim().toLowerCase();
  if (normalizedLocationType === "center" || normalizedLocationType === "external") {
    whereClause = and(whereClause, eq(patients.locationType, normalizedLocationType as any));
  }

  const result = await db.select().from(patients).where(whereClause).limit(50);
  const enriched = await attachTreatingDoctor(result);
  return enriched.map((row) => decodePatientRow(row as any));
}

export async function invalidatePatientPageStateCache(patientIds: number[]): Promise<void> {
  if (patientIds.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(patientPageStates).where(
    and(
      inArray(patientPageStates.patientId, patientIds),
      inArray(patientPageStates.page, ["examination", "quick-entry", "medical-file"])
    )
  );
}

export async function resetMssqlSyncCodes(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.execute(sql`
    DELETE FROM ${patientServiceEntries}
    WHERE ${patientServiceEntries.source} = 'mssql'
       OR LOWER(COALESCE(${patientServiceEntries.sourceRef}, '')) LIKE 'mssql:%'
  `);
  // Clear doctor/service overrides from saved sheet payloads too,
  // so patient list views do not keep stale local doctor values after reset.
  await db.execute(sql`
    UPDATE sheet_entries
    SET content = CAST(
      JSON_REMOVE(
        CASE
          WHEN JSON_VALID(content) THEN CAST(content AS JSON)
          ELSE JSON_OBJECT()
        END,
        '$.doctorName',
        '$.doctorCode',
        '$.doctorCodes',
        '$.doctorNames',
        '$.signatures.doctor',
        '$.serviceCode',
        '$.serviceCodes',
        '$.serviceSheetTypeByCode',
        '$.mssqlBackfill',
        '$.syncLockManual',
        '$.manualEditedAt'
      ) AS CHAR
    )
  `);
  await db.execute(sql`
    UPDATE patientPageStates
    SET data = JSON_REMOVE(
      COALESCE(data, JSON_OBJECT()),
      '$.doctorName',
      '$.doctorCode',
      '$.doctorCodes',
      '$.doctorNames',
      '$.signatures.doctor',
      '$.serviceCode',
      '$.serviceCodes',
      '$.serviceSheetTypeByCode',
      '$.mssqlBackfill',
      '$.syncLockManual',
      '$.manualEditedAt'
    )
  `);
  const result = await db.update(patients).set({
    doctorCode: null,
    doctorId: null,
    serviceCode: null,
  });
  // Also reset MSSQL sync markers so the next run can backfill from the start.
  await updateSystemSettings("mssql_sync_state_v1", {
    lastSuccessAt: null,
    lastMarker: null,
    lastMode: null,
    lastResult: null,
  });
  await updateSystemSettings("mssql_sync_runtime_status_v1", {
    running: false,
    lastRunStartedAt: null,
    lastRunFinishedAt: null,
    lastError: null,
    nextRunAt: null,
    lastChangeCount: null,
  });
  return Number((result as any)?.[0]?.affectedRows ?? 0);
}

export async function updatePatient(patientId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nextUpdates: Record<string, unknown> = { ...(updates ?? {}) };

  // Convert empty strings to null for optional fields
  for (const [key, value] of Object.entries(nextUpdates)) {
    if (typeof value === 'string' && value.trim() === '') {
      nextUpdates[key] = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(nextUpdates, "dateOfBirth")) {
    const rawDob = nextUpdates.dateOfBirth;
    const parseLooseDate = (value: unknown): string | null => {
      if (value == null) return null;
      if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);

      const raw = String(value).trim();
      if (!raw) return null;

      const ymd = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) {
        const normalized = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
        const strict = normalizeIsoDate(normalized);
        if (strict) return strict;
      }

      const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmy) {
        const dd = dmy[1].padStart(2, "0");
        const mm = dmy[2].padStart(2, "0");
        const normalized = `${dmy[3]}-${mm}-${dd}`;
        const strict = normalizeIsoDate(normalized);
        if (strict) return strict;
      }

      const sanitized = raw
        .replace(/\bGM\b/g, "GMT")
        .replace(/\s+\([^)]+\)\s*$/, "")
        .trim();
      const parsed = new Date(sanitized);
      if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);

      return null;
    };

    if (rawDob == null || String(rawDob).trim() === "") {
      nextUpdates.dateOfBirth = null;
    } else {
      const parsedDob = parseLooseDate(rawDob);
      if (parsedDob) {
        nextUpdates.dateOfBirth = parsedDob;
      } else {
        delete nextUpdates.dateOfBirth;
      }
    }
  }

  // Final guard: never send empty/invalid date strings to SQL date column.
  if (Object.prototype.hasOwnProperty.call(nextUpdates, "dateOfBirth")) {
    const raw = nextUpdates.dateOfBirth;
    if (raw == null) {
      nextUpdates.dateOfBirth = null;
    } else {
      const parsed = normalizeIsoDate(String(raw).trim());
      nextUpdates.dateOfBirth = parsed ?? null;
    }
  }

  try {
    await db.update(patients).set(nextUpdates).where(eq(patients.id, patientId));
  } catch (error: any) {
    const hasDoctorId = Object.prototype.hasOwnProperty.call(nextUpdates, "doctorId");
    const doctorIdRaw = String((nextUpdates as any).doctorId ?? "").trim();
    const doctorIdLooksLegacyString = !!doctorIdRaw && !/^\d+$/.test(doctorIdRaw);

    // Backward-compat fallback for DBs where patients.doctorId is still numeric.
    // Retry update without doctorId whenever payload carries non-numeric doctorId.
    if (hasDoctorId && doctorIdLooksLegacyString) {
      const retryUpdates = { ...nextUpdates };
      delete (retryUpdates as any).doctorId;
      await db.update(patients).set(retryUpdates).where(eq(patients.id, patientId));
      return;
    }

    throw error;
  }
}

export async function deletePatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(patients).where(eq(patients.id, patientId));
}

/**
 * Delete all patients but keep their exam data for archival
 * This deletes patient records and personal data but preserves all medical exam results
 */
export async function deleteAllPatientsData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete patient personal records and dependent data
  await db.delete(testRequestItems);
  await db.delete(prescriptionItems);
  await db.delete(postOpFollowups);
  await db.delete(consentForms);
  await db.delete(medicalHistoryChecklist);
  await db.delete(patientPageStates);
  await db.delete(patientServiceEntries);
  await db.delete(testRequests);
  await db.delete(prescriptions);
  await db.delete(surgeries);
  await db.delete(appointments);
  await db.delete(examinations);

  // Keep the detailed exam data for archival: autorefractometryData, glassesRecords, pentacamResults, doctorReports
  // Delete visits and patients last (these have FKs to them)
  await db.delete(visits);
  await db.delete(patients);

  // Note: The following tables are preserved for historical/reporting purposes:
  // - autorefractometryData (refraction measurements)
  // - glassesRecords (glasses prescriptions)
  // - pentacamResults (corneal topography)
  // - doctorReports (clinical reports)
  // - sheetEntries (exam sheets) - commented out to preserve
}

/**
 * Delete all medical data for a patient but keep the patient record
 */
export async function deletePatientWithAllData(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all visits for this patient to delete related data
  const patientVisits = await db.select({ id: visits.id }).from(visits).where(eq(visits.patientId, patientId));
  const visitIds = patientVisits.map(v => v.id);

  if (visitIds.length > 0) {
    // Delete data related to visits
    await db.delete(testRequestItems).where(inArray(testRequestItems.testRequestId,
      db.select({ id: testRequests.id }).from(testRequests).where(inArray(testRequests.visitId, visitIds)) as any
    )).catch(() => {}); // Ignore errors if no related items
    await db.delete(examinations).where(inArray(examinations.visitId, visitIds));
    await db.delete(pentacamResults).where(inArray(pentacamResults.visitId, visitIds));
    await db.delete(doctorReports).where(inArray(doctorReports.visitId, visitIds));
  }

  // Delete test requests and their items (handle both visit-based and patient-based)
  // First delete testRequestItems for all testRequests belonging to this patient
  await db.delete(testRequestItems).where(inArray(testRequestItems.testRequestId,
    db.select({ id: testRequests.id }).from(testRequests).where(eq(testRequests.patientId, patientId)) as any
  )).catch(() => {});
  // Then delete all testRequests for this patient (both with and without visitId)
  await db.delete(testRequests).where(eq(testRequests.patientId, patientId));

  // Delete prescription items before prescriptions
  await db.delete(prescriptionItems).where(
    inArray(prescriptionItems.prescriptionId,
      db.select({ id: prescriptions.id }).from(prescriptions).where(eq(prescriptions.patientId, patientId)) as any
    )
  ).catch(() => {});
  await db.delete(prescriptions).where(eq(prescriptions.patientId, patientId));

  // Delete surgeries first (before postOpFollowups since it references surgeryId)
  await db.delete(surgeries).where(eq(surgeries.patientId, patientId));

  // Delete post-op followups and consent forms
  await db.delete(postOpFollowups).where(eq(postOpFollowups.patientId, patientId));
  await db.delete(consentForms).where(eq(consentForms.patientId, patientId));
  await db.delete(medicalHistoryChecklist).where(eq(medicalHistoryChecklist.patientId, patientId));
  await db.delete(sheetEntries).where(eq(sheetEntries.patientId, patientId));
  await db.delete(patientServiceEntries).where(eq(patientServiceEntries.patientId, patientId));

  // Delete visits (but NOT the patient record itself)
  await db.delete(visits).where(eq(visits.patientId, patientId));

  // Note: We do NOT delete appointments or patientPageStates as these may be useful to keep
}

/**
 * Delete a visit/examination and all related data
 */
export async function deleteVisitWithAllData(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // CRITICAL: Prevent deletion of visits with invalid IDs (0 or negative)
  if (!visitId || visitId <= 0) {
    throw new Error(`CRITICAL: Attempted to delete visit with invalid ID: ${visitId}. This would delete all visits with visitId=0 or less!`);
  }

  // SAFETY CHECK: Verify the visit exists before deleting
  const visitToDelete = await db.select({ id: visits.id }).from(visits).where(eq(visits.id, visitId)).limit(1);
  if (visitToDelete.length === 0) {
    throw new Error(`CRITICAL: Visit with ID ${visitId} does not exist. Deletion aborted to prevent accidental deletion of other visits.`);
  }

  console.log(`[DELETE] Starting deletion of visit ${visitId}`);

  // Get prescriptions for this visit
  const visitPrescriptions = await db.select({ id: prescriptions.id }).from(prescriptions).where(eq(prescriptions.visitId, visitId));
  const prescriptionIds = visitPrescriptions.map(p => p.id);

  // Get test requests for this visit
  const visitTestRequests = await db.select({ id: testRequests.id }).from(testRequests).where(eq(testRequests.visitId, visitId));
  const testRequestIds = visitTestRequests.map(t => t.id);

  // Delete prescription items
  if (prescriptionIds.length > 0) {
    await db.delete(prescriptionItems).where(inArray(prescriptionItems.prescriptionId, prescriptionIds));
  }

  // Delete prescriptions
  await db.delete(prescriptions).where(eq(prescriptions.visitId, visitId));

  // Delete test request items
  if (testRequestIds.length > 0) {
    await db.delete(testRequestItems).where(inArray(testRequestItems.testRequestId, testRequestIds));
  }

  // Delete test requests
  await db.delete(testRequests).where(eq(testRequests.visitId, visitId));

  // Delete examination data
  await db.delete(examinations).where(eq(examinations.visitId, visitId));
  await db.delete(pentacamResults).where(eq(pentacamResults.visitId, visitId));
  await db.delete(doctorReports).where(eq(doctorReports.visitId, visitId));

  // Finally delete the visit
  console.log(`[DELETE] About to delete visit with ID ${visitId}`);
  const deleteResult = await db.delete(visits).where(eq(visits.id, visitId));
  console.log(`[DELETE] Visit ${visitId} deleted. Result:`, deleteResult);
}

export async function deleteExaminationDirect(examinationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related data for this examination
  const examination = await db.select().from(examinations).where(eq(examinations.id, examinationId)).limit(1);

  if (examination.length > 0) {
    const visitId = examination[0].visitId;

    // Delete pentacam results for this visit
    await db.delete(pentacamResults).where(eq(pentacamResults.visitId, visitId));

    // Delete doctor reports for this visit
    await db.delete(doctorReports).where(eq(doctorReports.visitId, visitId));
  }

  // Delete the examination itself
  await db.delete(examinations).where(eq(examinations.id, examinationId));
}

// Fix orphaned examinations by linking them to visits
export async function fixOrphanedExaminations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find all examinations with invalid visitIds (0 or null)
  const orphanedExams = await db.select().from(examinations).where(
    or(eq(examinations.visitId, 0), eq(examinations.visitId, null as any))
  );

  let fixedCount = 0;

  for (const exam of orphanedExams) {
    // Find visits for this patient, sorted by visitDate
    const patientVisits = await db.select().from(visits)
      .where(eq(visits.patientId, exam.patientId))
      .orderBy(desc(visits.visitDate));

    let linkedVisitId: number | null = null;

    if (patientVisits.length === 0) {
      // Create a new visit for this examination
      const newVisitResult = await db.insert(visits).values({
        patientId: exam.patientId,
        visitDate: exam.createdAt,
        visitType: "examination",
        branch: "examinations",
      });

      if (newVisitResult[0]) {
        linkedVisitId = (newVisitResult[0] as any).insertId ?? (newVisitResult[0] as any).id ?? newVisitResult[0];
      }
    } else {
      // Link to the most recent visit for this patient
      linkedVisitId = patientVisits[0].id;
    }

    // Update the examination with the valid visitId
    if (linkedVisitId) {
      await db.update(examinations).set({ visitId: linkedVisitId }).where(eq(examinations.id, exam.id));
      fixedCount++;
    }
  }

  return { fixed: fixedCount, total: orphanedExams.length };
}

// COMPREHENSIVE AUTO-FIX: Run all fixes in sequence
export async function autoFixAllDataIssues() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = {
    fixExamsWithVisitId0: { fixed: 0, total: 0 },
    fixOrphanedExaminations: { fixed: 0, total: 0 },
    fixVisitsWithoutAppointmentId: { fixed: 0, total: 0 },
    totalFixed: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Fix exams with visitId = 0 (CRITICAL)
    console.log("Step 1: Fixing exams with visitId = 0...");
    const result1 = await fixExamsWithVisitId0();
    results.fixExamsWithVisitId0 = result1;
    results.totalFixed += result1.fixed;

    // 2. Fix orphaned examinations
    console.log("Step 2: Fixing orphaned examinations...");
    const result2 = await fixOrphanedExaminations();
    results.fixOrphanedExaminations = result2;
    results.totalFixed += result2.fixed;

    // 3. Fix visits without appointmentId
    console.log("Step 3: Fixing visits without appointmentId...");
    const result3 = await fixVisitsWithoutAppointmentId();
    results.fixVisitsWithoutAppointmentId = result3;
    results.totalFixed += result3.fixed;

    console.log("Auto-fix completed:", results);
  } catch (error) {
    console.error("Auto-fix error:", error);
    throw error;
  }

  return results;
}

// Diagnostic: Check for visits and exams with invalid visitId
export async function checkInvalidVisitIds() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find all visits with visitId = 0 or null (in visits table)
  const visitsWithId0 = await db.select().from(visits).where(
    eq(visits.id, 0)
  );

  // Find all exams with visitId = 0 or null
  const examsWithId0 = await db.select().from(examinations).where(
    or(eq(examinations.visitId, 0), eq(examinations.visitId, null as any))
  );

  // Find all exams with visitId that doesn't exist in visits table
  const allExams = await db.select({ visitId: examinations.visitId }).from(examinations);
  const allVisitIds = await db.select({ id: visits.id }).from(visits);
  const validVisitIds = new Set(allVisitIds.map(v => v.id));

  const orphanedExams = allExams.filter(e => e.visitId && !validVisitIds.has(e.visitId));

  return {
    visitsWithId0: visitsWithId0.length,
    examsWithInvalidVisitId: examsWithId0.length,
    orphanedExamsWithBadReference: orphanedExams.length,
    details: {
      visitsWithId0,
      examsWithInvalidVisitId: examsWithId0.slice(0, 10), // First 10
      orphanedExamsCount: orphanedExams.length
    }
  };
}

// CRITICAL: Fix exams with visitId = 0 (the root cause of bulk deletion bug)
// OPTIMIZED: Use SQL batch update instead of looping
export async function fixExamsWithVisitId0() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Count exams with visitId = 0 before fixing
  const examsWithId0 = await db.select({ count: sql`COUNT(*) as count` }).from(examinations).where(
    eq(examinations.visitId, 0)
  );

  const totalBefore = (examsWithId0[0] as any)?.count ?? 0;
  if (totalBefore === 0) {
    return { fixed: 0, total: 0, message: "No exams found with visitId = 0" };
  }

  // Strategy: Link all exams with visitId=0 to the most recent visit for each patient
  // This is faster than creating individual visits
  const examsData = await db.select({
    id: examinations.id,
    patientId: examinations.patientId,
    createdAt: examinations.createdAt,
  }).from(examinations).where(
    eq(examinations.visitId, 0)
  ).limit(1000); // Process in batches

  let fixedCount = 0;

  // For each unique patient, create one visit and link all their exams to it
  const patientVisits = new Map<number, number>();

  for (const exam of examsData) {
    let visitId = patientVisits.get(exam.patientId);

    if (!visitId) {
      // Create one visit per patient
      const newVisitResult = await db.insert(visits).values({
        patientId: exam.patientId,
        visitDate: exam.createdAt,
        visitType: "examination",
        branch: "examinations",
      });
      visitId = (newVisitResult as any)?.insertId as number | undefined;
      if (visitId) {
        patientVisits.set(exam.patientId, visitId);
      }
    }

    if (visitId) {
      // Update this exam
      await db.update(examinations)
        .set({ visitId })
        .where(eq(examinations.id, exam.id));
      fixedCount++;
    }
  }

  // Update pentacam results with visitId = 0
  const pentacamData = await db.select({
    id: pentacamResults.id,
    patientId: pentacamResults.patientId,
  }).from(pentacamResults).where(
    eq(pentacamResults.visitId, 0)
  ).limit(1000);

  for (const pentacam of pentacamData) {
    const visitId = patientVisits.get(pentacam.patientId);
    if (visitId) {
      await db.update(pentacamResults)
        .set({ visitId })
        .where(eq(pentacamResults.id, pentacam.id));
    }
  }

  // Update doctor reports with visitId = 0
  const reportData = await db.select({
    id: doctorReports.id,
    patientId: doctorReports.patientId,
  }).from(doctorReports).where(
    eq(doctorReports.visitId, 0)
  ).limit(1000);

  for (const report of reportData) {
    const visitId = patientVisits.get(report.patientId);
    if (visitId) {
      await db.update(doctorReports)
        .set({ visitId })
        .where(eq(doctorReports.id, report.id));
    }
  }

  return {
    fixed: fixedCount,
    total: totalBefore,
    message: `Fixed ${fixedCount} exams with visitId = 0 by linking to patient visits.`
  };
}

// Fix visits without appointmentId by linking to matching appointments
// OPTIMIZED: Process in batches instead of one-by-one
export async function fixVisitsWithoutAppointmentId() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get visits without appointmentId (limit to avoid timeout)
  const visitsWithoutAppointment = await db.select({
    id: visits.id,
    patientId: visits.patientId,
    visitDate: visits.visitDate,
  }).from(visits).where(
    isNull(visits.appointmentId)
  ).limit(500); // Process in batches

  const totalCount = visitsWithoutAppointment.length;
  let fixedCount = 0;

  // Get all appointments once
  const allAppointments = await db.select().from(appointments);
  const appointmentsByPatient = new Map<number, any[]>();

  for (const apt of allAppointments) {
    if (!appointmentsByPatient.has(apt.patientId)) {
      appointmentsByPatient.set(apt.patientId, []);
    }
    appointmentsByPatient.get(apt.patientId)!.push(apt);
  }

  // Link visits to appointments
  for (const visit of visitsWithoutAppointment) {
    const patientAppointments = appointmentsByPatient.get(visit.patientId) || [];
    if (patientAppointments.length > 0) {
      // Use the first (or most recent) appointment
      const appointmentId = patientAppointments[0].id;
      await db.update(visits)
        .set({ appointmentId })
        .where(eq(visits.id, visit.id));
      fixedCount++;
    }
  }

  return { fixed: fixedCount, total: totalCount };
}

// Diagnostic: Show which visits are missing appointments
export async function checkVisitsWithoutAppointments() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all visits without appointmentId
  const visitsWithoutAppointment = await db.select({
    id: visits.id,
    patientId: visits.patientId,
    visitDate: visits.visitDate,
  }).from(visits).where(
    isNull(visits.appointmentId)
  );

  // For each visit, check if there's an appointment available for that patient
  const results = [];
  for (const visit of visitsWithoutAppointment) {
    const patientAppointments = await db.select().from(appointments)
      .where(eq(appointments.patientId, visit.patientId));

    results.push({
      visitId: visit.id,
      patientId: visit.patientId,
      visitDate: visit.visitDate,
      availableAppointmentsForPatient: patientAppointments.length,
      canBeLinked: patientAppointments.length > 0,
    });
  }

  const canBeLinked = results.filter(r => r.canBeLinked).length;
  const cannotBeLinked = results.filter(r => !r.canBeLinked).length;

  return {
    total: visitsWithoutAppointment.length,
    canBeLinked,
    cannotBeLinked,
    details: results.slice(0, 20), // First 20 for review
  };
}

function buildPatientFilterClauses(filters?: {
  branch?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  doctorName?: string;
  serviceType?: "consultant" | "specialist" | "lasik" | "surgery" | "external";
  locationType?: "center" | "external";
}) {
  const whereClauses: any[] = [];
  const normalizedBranch = String(filters?.branch ?? "").trim();
  if (normalizedBranch) {
    whereClauses.push(eq(patients.branch, normalizedBranch as any));
  }
  const normalizedSearch = String(filters?.searchTerm ?? "").trim();
  if (normalizedSearch) {
    const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);
    const effectiveSearchTokens = searchTokens.length > 0 ? searchTokens : [normalizedSearch];
    for (const token of effectiveSearchTokens) {
      const tokenTerm = `%${token}%`;
      const legacyTokenTerm = `%${encodeForLegacySearch(token)}%`;
      const simpleSearchConditions = or(
        or(
          or(like(patients.fullName, tokenTerm), like(patients.fullName, legacyTokenTerm)),
          or(
            like(patients.patientCode, tokenTerm),
            or(
              like(patients.phone, tokenTerm),
              like(patients.alternatePhone, tokenTerm)
            )
          )
        ),
        or(
          sql`EXISTS (
            SELECT 1
            FROM patientPageStates pps
            WHERE pps.patientId = ${patients.id}
              AND pps.page = 'examination'
              AND (
                TRIM(COALESCE(
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.doctorName')), ''),
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.signatures.doctor')), '')
                )) LIKE ${tokenTerm}
              )
          )` as any,
          sql`EXISTS (
            SELECT 1
            FROM patientServiceEntries pse
            WHERE pse.patientId = ${patients.id}
              AND (
                pse.serviceCode LIKE ${tokenTerm}
                OR pse.serviceName LIKE ${tokenTerm}
              )
          )` as any
        )
      );
      whereClauses.push(simpleSearchConditions as any);
    }
  }
  const normalizedDateFrom = String(filters?.dateFrom ?? "").trim();
  if (normalizedDateFrom) {
    whereClauses.push(gte(patients.lastVisit, normalizedDateFrom as any));
  }
  const normalizedDateTo = String(filters?.dateTo ?? "").trim();
  if (normalizedDateTo) {
    whereClauses.push(lte(patients.lastVisit, normalizedDateTo as any));
  }
  const normalizedServiceType = String(filters?.serviceType ?? "").trim();
  if (normalizedServiceType) {
    // Map legacy/old service types to modern ones for backward compatibility
    const serviceTypeVariants: string[] = [normalizedServiceType];
    if (normalizedServiceType === "consultant") {
      // Consultant should also match old pentacam_center and surgery
      serviceTypeVariants.push("pentacam_center", "surgery");
    } else if (normalizedServiceType === "lasik") {
      // Lasik should also match pentacam center aliases.
      serviceTypeVariants.push("pentacam_center", "pentacam_c");
    } else if (normalizedServiceType === "external") {
      // External should also match pentacam_external and surgery_external
      serviceTypeVariants.push("pentacam_external", "pentacam_ex", "pentacam_ex_c", "surgery_external");
    }

    // For lasik, also filter by service codes 1501, 1502 (in addition to serviceType)
    if (normalizedServiceType === "lasik") {
      whereClauses.push(
        sql`(
          ${inArray(patients.serviceType, serviceTypeVariants as any[])}
          OR EXISTS (
            SELECT 1
            FROM patientServiceEntries pse
            WHERE pse.patientId = ${patients.id}
              AND LOWER(TRIM(pse.serviceCode)) IN ('1501', '1502')
          )
        )`
      );
    } else {
      whereClauses.push(inArray(patients.serviceType, serviceTypeVariants as any[]));
    }
  }
  const normalizedLocationType = String(filters?.locationType ?? "").trim();
  if (normalizedLocationType) {
    whereClauses.push(eq(patients.locationType, normalizedLocationType as any));
  }
  const normalizedDoctor = String(filters?.doctorName ?? "").trim();
  if (normalizedDoctor) {
    const doctorTokens = normalizedDoctor.split(/\s+/).filter(Boolean);
    const effectiveDoctorTokens = doctorTokens.length > 0 ? doctorTokens : [normalizedDoctor];
    for (const token of effectiveDoctorTokens) {
      const doctorTokenTerm = `%${token}%`;
      whereClauses.push(sql`
        EXISTS (
          SELECT 1
          FROM patientPageStates pps
          WHERE pps.patientId = ${patients.id}
            AND pps.page = 'examination'
            AND (
              TRIM(COALESCE(
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.doctorName')), ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.signatures.doctor')), '')
              )) LIKE ${doctorTokenTerm}
            )
        )
      `);
    }
  }
  return whereClauses;
}

export async function getAllPatientsForMatching(): Promise<Array<{ id: number; patientCode: string; fullName: string; lastVisit: string | null; createdAt: string | null }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.execute(
    sql`SELECT id, patientCode, fullName, lastVisit, createdAt FROM patients ORDER BY CAST(patientCode AS UNSIGNED) ASC`
  );
  const rows = Array.isArray(result) ? result[0] : result;
  return (Array.isArray(rows) ? rows : []).map((r: any) => ({
    id: Number(r.id ?? 0),
    patientCode: String(r.patientCode ?? "").trim(),
    fullName: String(r.fullName ?? "").trim(),
    lastVisit: r.lastVisit ? String(r.lastVisit) : null,
    createdAt: r.createdAt ? String(r.createdAt) : null,
  }));
}

export async function getAllPatients(options?: {
  branch?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  doctorName?: string;
  serviceType?: "consultant" | "specialist" | "lasik" | "surgery" | "external";
  locationType?: "center" | "external";
  limit?: number;
  cursor?: {
    codeNum: number;
    patientCode: string;
    id: number;
  };
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereClauses: any[] = buildPatientFilterClauses(options);
  const limitValue = Math.max(1, Math.min(500, Number(options?.limit ?? 120)));
  const cursor = options?.cursor;
  if (
    cursor &&
    Number.isFinite(Number(cursor.codeNum)) &&
    Number.isFinite(Number(cursor.id))
  ) {
    whereClauses.push(
      sql`(
        CAST(${patients.patientCode} AS UNSIGNED) > ${Number(cursor.codeNum)}
        OR (
          CAST(${patients.patientCode} AS UNSIGNED) = ${Number(cursor.codeNum)}
          AND ${patients.patientCode} > ${String(cursor.patientCode ?? "")}
        )
        OR (
          CAST(${patients.patientCode} AS UNSIGNED) = ${Number(cursor.codeNum)}
          AND ${patients.patientCode} = ${String(cursor.patientCode ?? "")}
          AND ${patients.id} > ${Number(cursor.id)}
        )
      )`
    );
  }
  const whereExpr = whereClauses.length > 0 ? and(...whereClauses) : undefined;

  let query = db
    .select()
    .from(patients)
    .orderBy(sql`CAST(${patients.patientCode} AS UNSIGNED) ASC, ${patients.patientCode} ASC`)
    .limit(limitValue + 1);

  if (whereExpr) {
    query = query.where(whereExpr) as any;
  }
  const patientRows = await query;

  const enriched = await attachTreatingDoctor(patientRows);
  const decoded = enriched.map((row) => decodePatientRow(row as any));
  const hasMore = decoded.length > limitValue;
  const rows = hasMore ? decoded.slice(0, limitValue) : decoded;
  const last = rows.length > 0 ? (rows[rows.length - 1] as any) : null;
  const leadingCodeNum = (value: unknown) => {
    const raw = String(value ?? "").trim();
    const m = raw.match(/^\d+/);
    return m ? Number(m[0]) : 0;
  };
  const nextCursor = last
    ? {
        codeNum: leadingCodeNum(last.patientCode),
        patientCode: String(last.patientCode ?? ""),
        id: Number(last.id),
      }
    : null;
  return { rows, hasMore, nextCursor, limit: limitValue };
}

export async function getPatientStats(
  year: number,
  month?: number,
  filters?: {
    searchTerm?: string;
    doctorName?: string;
    serviceType?: "consultant" | "specialist" | "lasik" | "surgery" | "external";
    locationType?: "center" | "external";
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const safeYear = Number.isFinite(year) ? Math.trunc(year) : 0;
  const safeMonth = Number.isFinite(month as number) ? Math.trunc(month as number) : undefined;
  if (safeYear < 1900 || safeYear > 3000) {
    return { total: 0, center: 0, external: 0, lasik: 0 };
  }

  const normalizeServiceType = (value: unknown) => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === "specialist" || raw === "اخصائي" || raw === "أخصائي") return "specialist";
    if (raw === "external" || raw === "خارجي" || raw === "outside" || raw === "out") return "external";
    if (raw === "lasik" || raw === "ليزك") return "lasik";
    if (raw === "surgery" || raw === "عمليات" || raw === "عملية") return "surgery";
    return "consultant";
  };

  const defaultCodesByType: Record<string, string[]> = {
    consultant: ["1589"],
    specialist: ["1586", "1562"],
    // Lasik stats must be based on Lasik examination services only (not operations).
    lasik: ["1501", "1502"],
    surgery: [
      "1503",
      "1504",
      "1509",
      "1510",
      "1511",
      "1512",
      "1514",
      "1515",
      "1516",
      "1517",
      "1518",
      "1519",
      "1578",
      "1579",
      "1580",
      "1581",
      "1585",
      "1587",
      "1593",
      "1599",
      "1607",
      "1567",
      "1568",
    ],
    external: [
      "1613",
      "1590",
      "1572",
      "1600",
      "1505",
      "1506",
      "1507",
      "1508",
      "1520",
      "1521",
      "1563",
      "1564",
      "1565",
      "1566",
      "1569",
      "1570",
      "1571",
      "1573",
      "1574",
      "1598",
      "1595",
      "1596",
      "1597",
      "1601",
      "1603",
      "1610",
      "1611",
      "1612",
      "1614",
    ],
  };
  const serviceCodesByType = new Map<string, Set<string>>();
  Object.entries(defaultCodesByType).forEach(([type, codes]) => {
    serviceCodesByType.set(type, new Set(codes.map((code) => code.toLowerCase())));
  });
  const serviceDirectoryRow = await getSystemSetting("service_directory");
  if (serviceDirectoryRow?.value) {
    try {
      const parsed = JSON.parse(serviceDirectoryRow.value) as Array<any>;
      for (const entry of parsed ?? []) {
        const code = String(entry?.code ?? "").trim().toLowerCase();
        const mappedType = normalizeServiceType(entry?.serviceType);
        if (!code) continue;
        if (!serviceCodesByType.has(mappedType)) serviceCodesByType.set(mappedType, new Set<string>());
        serviceCodesByType.get(mappedType)!.add(code);
      }
    } catch {
      // Ignore malformed setting and keep defaults.
    }
  }

  // These service codes are center-only by business rule and must never be classified as external.
  const centerOnlyServiceCodes = new Set([
    "1503",
    "1504",
    "1509",
    "1510",
    "1511",
    "1512",
    "1514",
    "1515",
    "1516",
    "1517",
    "1518",
    "1519",
    "1567",
    "1568",
    "1578",
    "1579",
    "1580",
    "1581",
    "1585",
    "1587",
    "1593",
    "1599",
    "1607",
  ]);
  const externalCodes = serviceCodesByType.get("external");
  if (externalCodes) {
    centerOnlyServiceCodes.forEach((code) => externalCodes.delete(code));
  }

  const buildServiceCodeMatchExpr = (serviceType: string) => {
    const codes = Array.from(serviceCodesByType.get(serviceType) ?? []);
    if (!codes.length) return sql`0 = 1`;
    return sql`LOWER(TRIM(${patientServiceEntries.serviceCode})) IN (${sql.join(codes.map((code) => sql`${code}`), sql`, `)})`;
  };

  const effectiveServiceDate = sql`COALESCE(${patientServiceEntries.serviceDate}, DATE(${patientServiceEntries.updatedAt}))`;
  const whereClauses: any[] = [sql`YEAR(${effectiveServiceDate}) = ${safeYear}`];
  if (safeMonth && safeMonth >= 1 && safeMonth <= 12) {
    whereClauses.push(sql`MONTH(${effectiveServiceDate}) = ${safeMonth}`);
  }

  const normalizedDateFrom = String(filters?.dateFrom ?? "").trim();
  if (normalizedDateFrom) {
    whereClauses.push(sql`${effectiveServiceDate} >= ${normalizedDateFrom}`);
  }
  const normalizedDateTo = String(filters?.dateTo ?? "").trim();
  if (normalizedDateTo) {
    whereClauses.push(sql`${effectiveServiceDate} <= ${normalizedDateTo}`);
  }

  const normalizedServiceType = String(filters?.serviceType ?? "").trim().toLowerCase();
  if (normalizedServiceType) {
    const matchExpr =
      normalizedServiceType === "lasik"
        ? sql`LOWER(TRIM(${patientServiceEntries.serviceCode})) IN ('1501', '1502')`
        : buildServiceCodeMatchExpr(normalizedServiceType);
    whereClauses.push(sql`(${matchExpr})`);
  }

  whereClauses.push(
    ...buildPatientFilterClauses({
      ...filters,
      serviceType: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    })
  );

  // When a serviceType filter is active, we must join patientServiceEntries to filter by code.
  // When no serviceType filter is active, count ALL patients directly so patients without
  // service entries (no PAPAT_SRV record) are still included in the total.
  if (normalizedServiceType) {
    const whereClause = and(...whereClauses);
    const lasikExpr = sql`LOWER(TRIM(${patientServiceEntries.serviceCode})) IN ('1501', '1502')`;
    const rows = await db
      .select({
        total: sql<number>`COUNT(DISTINCT ${patients.id})`,
        center: sql<number>`COUNT(DISTINCT CASE WHEN ${patients.locationType} = 'center' THEN ${patients.id} END)`,
        external: sql<number>`COUNT(DISTINCT CASE WHEN ${patients.locationType} = 'external' THEN ${patients.id} END)`,
        lasik: sql<number>`COUNT(DISTINCT CASE WHEN ${lasikExpr} THEN ${patients.id} END)`,
      })
      .from(patientServiceEntries)
      .innerJoin(patients, eq(patientServiceEntries.patientId, patients.id))
      .where(whereClause);
    const row = rows[0] ?? { total: 0, center: 0, external: 0, lasik: 0 };
    return {
      total: Number(row.total ?? 0),
      center: Number(row.center ?? 0),
      external: Number(row.external ?? 0),
      lasik: Number(row.lasik ?? 0),
    };
  }

  // No serviceType filter: count patients on the patients table itself.
  // Only apply date filters when a specific month or explicit date range is requested.
  // For plain yearly totals (no month, no dateFrom/dateTo) count ALL patients so that
  // patients imported from MSSQL with old createdAt values are still included.
  const effectivePatientDate = sql`COALESCE(${patients.lastVisit}, DATE(${patients.createdAt}))`;
  const patientWhereClauses: any[] = [];
  const hasDateFilter = Boolean(
    (safeMonth && safeMonth >= 1 && safeMonth <= 12) || normalizedDateFrom || normalizedDateTo
  );
  if (hasDateFilter) {
    patientWhereClauses.push(sql`YEAR(${effectivePatientDate}) = ${safeYear}`);
    if (safeMonth && safeMonth >= 1 && safeMonth <= 12) {
      patientWhereClauses.push(sql`MONTH(${effectivePatientDate}) = ${safeMonth}`);
    }
    if (normalizedDateFrom) {
      patientWhereClauses.push(sql`${effectivePatientDate} >= ${normalizedDateFrom}`);
    }
    if (normalizedDateTo) {
      patientWhereClauses.push(sql`${effectivePatientDate} <= ${normalizedDateTo}`);
    }
  }
  // Apply patient-level filters (search, doctor, locationType) if present.
  patientWhereClauses.push(
    ...buildPatientFilterClauses({
      ...filters,
      serviceType: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    })
  );
  const patientWhereClause = patientWhereClauses.length > 0 ? and(...patientWhereClauses) : undefined;

  const rawCount = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      SUM(locationType = 'center') AS center,
      SUM(locationType = 'external') AS external
    FROM patients
    ${patientWhereClause ? sql`WHERE ${patientWhereClause}` : sql``}
  `) as any;
  const rawRow = Array.isArray(rawCount) ? rawCount[0]?.[0] : rawCount?.rows?.[0];

  const lasikRows = await db
    .select({ lasik: sql<number>`COUNT(DISTINCT ${patientServiceEntries.patientId})` })
    .from(patientServiceEntries)
    .innerJoin(patients, eq(patientServiceEntries.patientId, patients.id))
    .where(
      and(
        sql`LOWER(TRIM(${patientServiceEntries.serviceCode})) IN ('1501', '1502')`,
        sql`YEAR(COALESCE(${patientServiceEntries.serviceDate}, DATE(${patientServiceEntries.updatedAt}))) = ${safeYear}`,
        ...(patientWhereClause ? [patientWhereClause] : [])
      )
    );

  const patientRows = [rawRow ?? { total: 0, center: 0, external: 0 }];

  const pr = patientRows[0] ?? { total: 0, center: 0, external: 0 };
  const lr = lasikRows[0] ?? { lasik: 0 };
  return {
    total: Number(pr.total ?? 0),
    center: Number(pr.center ?? 0),
    external: Number(pr.external ?? 0),
    lasik: Number(lr.lasik ?? 0),
  };
}

export async function populatePatientNamesFromSheets() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all sheet entries that have patientId and content
  const sheets = await db.select().from(sheetEntries).limit(5000);

  console.log(`[populatePatientNamesFromSheets] Found ${sheets.length} sheet entries`);

  let updated = 0;
  let skipped = 0;
  let processed = 0;

  for (const sheet of sheets) {
    processed++;
    try {
      if (!sheet.patientId) {
        skipped++;
        continue;
      }

      const patient = await db.select().from(patients).where(eq(patients.id, sheet.patientId));
      if (!patient.length) {
        skipped++;
        continue;
      }

      // If patient already has fullName, skip
      if (patient[0].fullName && String(patient[0].fullName).trim()) {
        skipped++;
        continue;
      }

      // Try to extract patient name from sheet content
      let content = sheet.content;
      if (typeof content === "string") {
        try {
          content = JSON.parse(content);
        } catch (e) {
          skipped++;
          continue;
        }
      }

      if (!content || typeof content !== "object") {
        skipped++;
        continue;
      }

      const patientName =
        String((content as any).patient?.name ?? "").trim() ||
        String((content as any).patientName ?? "").trim() ||
        String((content as any).formData?.patientName ?? "").trim();

      if (patientName && patientName.length > 2) {
        await db.update(patients).set({ fullName: patientName }).where(eq(patients.id, sheet.patientId));
        updated += 1;
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`[populatePatientNamesFromSheets] Error processing sheet ${sheet.id}:`, e);
      skipped++;
    }
  }

  const message = `[populatePatientNamesFromSheets] Processed ${processed}, Updated ${updated}, Skipped ${skipped}`;
  console.log(message);
  return { updated, skipped, processed, sheets: sheets.length };
}

export async function getTodayPatientsBySheet(dateIso?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const localToday = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const target = String(dateIso ?? "").trim() || localToday;
  const rows = await db
    .select({
      id: patients.id,
      patientCode: patients.patientCode,
      fullName: patients.fullName,
      serviceType: patients.serviceType,
      lastVisit: patients.lastVisit,
    })
    .from(patients)
    .where(
      sql`(
        DATE(${patients.lastVisit}) = ${target}
        OR EXISTS (
          SELECT 1 FROM ${visits}
          WHERE ${visits.patientId} = ${patients.id}
            AND DATE(${visits.visitDate}) = ${target}
        )
      )`
    )
    .orderBy(sql`CAST(${patients.patientCode} AS UNSIGNED) ASC, ${patients.patientCode} ASC`);

  const groups: Record<string, { serviceType: string; total: number; patients: Array<{ id: number; patientCode: string; fullName: string }> }> = {
    consultant: { serviceType: "consultant", total: 0, patients: [] },
    specialist: { serviceType: "specialist", total: 0, patients: [] },
    lasik: { serviceType: "lasik", total: 0, patients: [] },
    external: { serviceType: "external", total: 0, patients: [] },
    surgery: { serviceType: "surgery", total: 0, patients: [] },
  };

  for (const raw of rows) {
    const row = decodePatientRow(raw as any);
    const key = String(row.serviceType ?? "").toLowerCase();
    const bucket = groups[key] ?? groups.consultant;
    bucket.total += 1;
    bucket.patients.push({
      id: Number(row.id),
      patientCode: String(row.patientCode ?? ""),
      fullName: String(row.fullName ?? ""),
    });
  }

  const result = {
    date: target,
    total: rows.length,
    groups: [groups.consultant, groups.specialist, groups.lasik, groups.external, groups.surgery],
  };

  // Debug logging
  const withNames = rows.filter(r => r.fullName && String(r.fullName).trim());
  const withoutNames = rows.filter(r => !r.fullName || !String(r.fullName).trim());
  console.log(`[getTodayPatientsBySheet] Date: ${target}, Total: ${rows.length}, With fullName: ${withNames.length}, Without fullName: ${withoutNames.length}`);
  if (rows.length > 0) {
    console.log(`[getTodayPatientsBySheet] Sample WITH name:`, JSON.stringify(withNames[0], null, 2));
    console.log(`[getTodayPatientsBySheet] Sample WITHOUT name:`, JSON.stringify(withoutNames[0], null, 2));
  }
  try {
    const fs = require('fs');
    const logMsg = `[${new Date().toISOString()}] Total: ${rows.length}, With: ${withNames.length}, Without: ${withoutNames.length}, Sample: ${JSON.stringify({id: rows[0]?.id, code: rows[0]?.patientCode, name: rows[0]?.fullName})}\n`;
    fs.appendFileSync('/tmp/today_patients_debug.log', logMsg, 'utf-8');
  } catch (e) {}

  return result;
}

async function attachTreatingDoctor(patientRows: any[]) {
  const db = await getDb();
  if (!db) return patientRows;
  if (!patientRows.length) return patientRows;
  const normalizeDoctorDisplay = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    // Strip trailing numeric code patterns like "Dr Name / 230794"
    return raw.replace(/\s*\/\s*\d{3,}\s*$/g, "").trim();
  };

  const patientIds = patientRows.map((p) => p.id).filter((id) => typeof id === "number");
  if (!patientIds.length) return patientRows;

  const stateRows = await db
    .select({
      patientId: patientPageStates.patientId,
      data: patientPageStates.data,
      updatedAt: patientPageStates.updatedAt,
    })
    .from(patientPageStates)
    .where(and(eq(patientPageStates.page, "examination"), inArray(patientPageStates.patientId, patientIds)))
    .orderBy(desc(patientPageStates.updatedAt));

  const latestExamDoctorByPatient = new Map<number, string>();
  const latestExamDoctorsByPatient = new Map<number, string[]>();
  const latestExamServiceCodeByPatient = new Map<number, string>();
  const latestExamServiceCodesByPatient = new Map<number, string[]>();
  const latestSheetTypeByServiceCodeByPatient = new Map<number, Record<string, string>>();
  const latestSyncLockManualByPatient = new Map<number, boolean>();
  const latestManualEditedAtByPatient = new Map<number, string>();
  for (const row of stateRows) {
    if (
      latestExamDoctorByPatient.has(row.patientId) &&
      latestExamServiceCodesByPatient.has(row.patientId) &&
      latestSheetTypeByServiceCodeByPatient.has(row.patientId)
    ) {
      continue;
    }
    const payload = (() => {
      if (!row.data) return null;
      if (typeof row.data === "string") {
        try {
          return JSON.parse(row.data);
        } catch {
          return null;
        }
      }
      return row.data as Record<string, unknown>;
    })();
    if (!payload || typeof payload !== "object") continue;

    const directDoctor = normalizeDoctorDisplay((payload as any).doctorName);
    const signatureDoctor = normalizeDoctorDisplay((payload as any).signatures?.doctor);
    const doctorNames = Array.isArray((payload as any).doctorNames)
      ? (payload as any).doctorNames.map((v: unknown) => normalizeDoctorDisplay(v)).filter(Boolean)
      : [];
    const mergedDoctors = Array.from(new Set([directDoctor, signatureDoctor, ...doctorNames].filter(Boolean)));
    if (mergedDoctors.length > 0 && !latestExamDoctorsByPatient.has(row.patientId)) {
      latestExamDoctorsByPatient.set(row.patientId, mergedDoctors);
    }
    const serviceCode = String(
      (payload as any).serviceCode ??
      (payload as any).srvCode ??
      (payload as any).srv_cd ??
      ""
    ).trim();
    const serviceCodes = Array.isArray((payload as any).serviceCodes)
      ? (payload as any).serviceCodes.map((v: unknown) => String(v ?? "").trim()).filter(Boolean)
      : [];
    const mergedServiceCodes = Array.from(new Set([serviceCode, ...serviceCodes].filter(Boolean)));
    if (mergedServiceCodes.length > 0 && !latestExamServiceCodesByPatient.has(row.patientId)) {
      latestExamServiceCodesByPatient.set(row.patientId, mergedServiceCodes);
    }
    if (serviceCode && !latestExamServiceCodeByPatient.has(row.patientId)) {
      latestExamServiceCodeByPatient.set(row.patientId, serviceCode);
    } else if (mergedServiceCodes.length > 0 && !latestExamServiceCodeByPatient.has(row.patientId)) {
      latestExamServiceCodeByPatient.set(row.patientId, mergedServiceCodes[0]);
    }
    const rawSheetMap = (payload as any).serviceSheetTypeByCode;
    if (rawSheetMap && typeof rawSheetMap === "object" && !latestSheetTypeByServiceCodeByPatient.has(row.patientId)) {
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawSheetMap as Record<string, unknown>)) {
        const key = String(k ?? "").trim();
        const value = String(v ?? "").trim().toLowerCase();
        if (!key || !value) continue;
        normalized[key] = value;
      }
      if (Object.keys(normalized).length > 0) {
        latestSheetTypeByServiceCodeByPatient.set(row.patientId, normalized);
      }
    }
    if (!latestSyncLockManualByPatient.has(row.patientId)) {
      latestSyncLockManualByPatient.set(row.patientId, Boolean((payload as any).syncLockManual));
    }
    if (!latestManualEditedAtByPatient.has(row.patientId)) {
      latestManualEditedAtByPatient.set(row.patientId, String((payload as any).manualEditedAt ?? "").trim());
    }
    const doctorName = directDoctor || signatureDoctor;
    if (!doctorName) continue;
    latestExamDoctorByPatient.set(row.patientId, doctorName);
  }

  // Build serviceCode → (serviceType, locationType) map from service_directory
  const serviceCodeMetaMap = new Map<string, { serviceType: string; locationType: string }>();
  try {
    const svcDir = await getSystemSetting("service_directory");
    if (svcDir?.value) {
      const parsed = JSON.parse(String(svcDir.value));
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const code = String(entry?.code ?? "").trim();
          const type = String(entry?.serviceType ?? "").trim();
          const locationType = String(entry?.locationType ?? "").trim();
          if (code) {
            serviceCodeMetaMap.set(code, { serviceType: type, locationType });
          }
        }
      }
    }
  } catch { /* fall back silently */ }

  // Build doctor name map from the `doctors` table via patients.doctorCode
  const doctorCodes = patientRows
    .map((p) => String((p as any).doctorCode ?? "").trim().toLowerCase())
    .filter(Boolean);
  const doctorNameByCode = new Map<string, string>();
  if (doctorCodes.length > 0) {
    try {
      const uniqueCodes = Array.from(new Set(doctorCodes));
      const drRows = await db
        .select({ code: doctorsLookup.code, name: doctorsLookup.name })
        .from(doctorsLookup)
        .where(inArray(doctorsLookup.code, uniqueCodes));
      for (const dr of drRows) {
        const code = String(dr.code ?? "").trim().toLowerCase();
        const name = decodeMojibake(String(dr.name ?? "").trim());
        if (code && name) doctorNameByCode.set(code, name);
      }
    } catch {
      // fall back silently
    }
  }

  const serviceEntryRows = await getPatientServiceEntriesByPatients(patientIds).catch(() => []);
  const serviceCodesByPatient = new Map<number, string[]>();
  const mssqlServiceCodesByPatient = new Map<number, string[]>();
  for (const row of serviceEntryRows as any[]) {
    const pid = Number((row as any).patientId ?? 0);
    const code = String((row as any).serviceCode ?? "").trim();
    const source = String((row as any).source ?? "").trim().toLowerCase();
    if (!pid || !code) continue;
    const existing = serviceCodesByPatient.get(pid) ?? [];
    if (!existing.includes(code)) existing.push(code);
    serviceCodesByPatient.set(pid, existing);
    if (source === "mssql") {
      const mssqlExisting = mssqlServiceCodesByPatient.get(pid) ?? [];
      if (!mssqlExisting.includes(code)) mssqlExisting.push(code);
      mssqlServiceCodesByPatient.set(pid, mssqlExisting);
    }
  }

  const reportRows = await db
    .select({
      patientId: doctorReports.patientId,
      doctorName: users.name,
      doctorUsername: users.username,
      createdAt: doctorReports.createdAt,
    })
    .from(doctorReports)
    .leftJoin(users, eq(doctorReports.doctorId, users.id))
    .where(inArray(doctorReports.patientId, patientIds))
    .orderBy(desc(doctorReports.createdAt));

  const latestDoctorByPatient = new Map<number, string>();
  for (const row of reportRows) {
    if (latestDoctorByPatient.has(row.patientId)) continue;
    const doctorName = normalizeDoctorDisplay(row.doctorName || row.doctorUsername || "");
    if (!doctorName) continue;
    latestDoctorByPatient.set(row.patientId, doctorName);
  }

  const result = patientRows.map((patient) => ({
    ...patient,
    treatingDoctor: (() => {
      const fromDoctorCode = doctorNameByCode.get(String((patient as any).doctorCode ?? "").trim().toLowerCase());
      const fromStored = String((patient as any).treatingDoctor ?? "").trim();
      return normalizeDoctorDisplay(fromDoctorCode || fromStored) || "";
    })(),
    treatingDoctors: latestExamDoctorsByPatient.get(patient.id) ?? [],
    serviceCode: (() => {
      const dbSynced = String((patient as any).serviceCode ?? "").trim();
      const fromEntries = mssqlServiceCodesByPatient.get(patient.id)?.[0] ?? serviceCodesByPatient.get(patient.id)?.[0];
      return fromEntries || dbSynced || "";
    })(),
    serviceType: (() => {
      const fromEntries = mssqlServiceCodesByPatient.get(patient.id) ?? serviceCodesByPatient.get(patient.id) ?? [];
      const dbSynced = String((patient as any).serviceCode ?? "").trim();
      const resolvedCode = String(fromEntries[0] ?? dbSynced).trim();
      return serviceCodeMetaMap.get(resolvedCode)?.serviceType ?? "";
    })(),
    locationType: (() => {
      const fromEntries = mssqlServiceCodesByPatient.get(patient.id) ?? serviceCodesByPatient.get(patient.id) ?? [];
      const dbSynced = String((patient as any).serviceCode ?? "").trim();
      const resolvedCode = String(fromEntries[0] ?? dbSynced).trim();
      return serviceCodeMetaMap.get(resolvedCode)?.locationType ?? "";
    })(),
    serviceCodes: (() => {
      const fromEntries = mssqlServiceCodesByPatient.get(patient.id) ?? serviceCodesByPatient.get(patient.id) ?? [];
      if (fromEntries.length > 0) return fromEntries;
      const dbSynced = String((patient as any).serviceCode ?? "").trim();
      return dbSynced ? [dbSynced] : [];
    })(),
    serviceSheetTypeByCode: latestSheetTypeByServiceCodeByPatient.get(patient.id) ?? {},
    syncLockManual: latestSyncLockManualByPatient.get(patient.id) ?? false,
    manualEditedAt: latestManualEditedAtByPatient.get(patient.id) ?? "",
  }));
  return result;
}

// ============ APPOINTMENT OPERATIONS ============

export async function createAppointment(appointmentData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: any = await db.insert(appointments).values(appointmentData);
  let insertId = Number(result?.insertId ?? result?.[0]?.insertId ?? result?.id ?? 0);

  // Some mysql2/drizzle paths don't surface insertId consistently.
  if (!Number.isFinite(insertId) || insertId <= 0) {
    const [latest] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, Number(appointmentData?.patientId ?? 0)),
          eq(appointments.appointmentDate, appointmentData?.appointmentDate as any),
          eq(appointments.appointmentType, String(appointmentData?.appointmentType ?? "") as any),
          eq(appointments.branch, String(appointmentData?.branch ?? "") as any)
        )
      )
      .orderBy(desc(appointments.id))
      .limit(1);
    insertId = Number(latest?.id ?? 0);
  }

  return {
    ...(result && typeof result === "object" ? result : {}),
    insertId,
    id: insertId,
  };
}

export async function getAppointmentsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(appointments).where(eq(appointments.patientId, patientId));
}

export async function getAllAppointments(branch?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const baseQuery = db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      appointmentDate: appointments.appointmentDate,
      appointmentType: appointments.appointmentType,
      branch: appointments.branch,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      patientName: patients.fullName,
      patientCode: patients.patientCode,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id));

  let result;
  if (branch) {
    result = await baseQuery
      .where(eq(appointments.branch, branch as any))
      .orderBy(desc(appointments.appointmentDate));
  } else {
    result = await baseQuery.orderBy(desc(appointments.appointmentDate));
  }

  const withPatientInfo = result.filter((r: any) => r.patientName !== null);
  const withoutPatientInfo = result.filter((r: any) => r.patientName === null);
  const logMsg = `[getAllAppointments] Total: ${result.length}, With patient info: ${withPatientInfo.length}, Without patient info: ${withoutPatientInfo.length}\nSample: ${JSON.stringify((withPatientInfo[0] || result[0]), null, 2)}`;
  console.log(logMsg);

  // Also write to file for debugging
  try {
    const fs = require('fs');
    fs.appendFileSync('/tmp/appointments_debug.log', logMsg + '\n\n', 'utf-8');
  } catch (e) {}

  return result;
}

export async function deleteAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(appointments).where(eq(appointments.id, appointmentId));
}

export async function updateAppointment(appointmentId: number, updates: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(appointments).set(updates).where(eq(appointments.id, appointmentId));
}

export async function getAppointmentsByDate(date: Date, branch?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  if (branch) {
    return await db.select().from(appointments).where(
      and(
        eq(appointments.branch, branch as any),
        // Add date range filter here
      )
    );
  }
  return await db.select().from(appointments);
}

// ============ VISIT OPERATIONS ============

export async function createVisit(visitData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(visits).values(visitData);

  // Query back the created visit by patientId and visitDate
  const createdVisits = await db
    .select()
    .from(visits)
    .where(
      and(
        eq(visits.patientId, visitData.patientId),
        eq(visits.visitDate, visitData.visitDate)
      )
    )
    .orderBy(desc(visits.id))
    .limit(1);

  if (createdVisits.length === 0) {
    return { insertId: null };
  }

  return { insertId: createdVisits[0].id, ...createdVisits[0] };
}

export async function getVisitsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(visits).where(eq(visits.patientId, patientId)).orderBy(desc(visits.visitDate));
}

export async function getAllVisits() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: visits.id,
      patientId: visits.patientId,
      appointmentId: visits.appointmentId,
      visitDate: visits.visitDate,
      visitType: visits.visitType,
      chiefComplaint: visits.chiefComplaint,
      branch: visits.branch,
      receptionSignature: visits.receptionSignature,
      createdAt: visits.createdAt,
      updatedAt: visits.updatedAt,
      patientName: patients.fullName,
      examId: examinations.id,
      examPatientId: examinations.patientId,
      ucvaOD: examinations.ucvaOD,
      ucvaOS: examinations.ucvaOS,
      bcvaOD: examinations.bcvaOD,
      bcvaOS: examinations.bcvaOS,
      sphereOD: examinations.sphereOD,
      sphereOS: examinations.sphereOS,
      cylinderOD: examinations.cylinderOD,
      cylinderOS: examinations.cylinderOS,
      axisOD: examinations.axisOD,
      axisOS: examinations.axisOS,
      iopOD: examinations.iopOD,
      iopOS: examinations.iopOS,
      glassesData: examinations.glassesData,
      radiologyLabsNotes: examinations.radiologyLabsNotes,
      airPuffOD: examinations.airPuffOD,
      airPuffOS: examinations.airPuffOS,
    })
    .from(visits)
    .innerJoin(examinations, eq(visits.id, examinations.visitId))
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .orderBy(desc(visits.visitDate));

  return result;
}

export async function getFollowupVisitsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(visits).where(
    and(
      eq(visits.patientId, patientId),
      eq(visits.visitType, "followup")
    )
  ).orderBy(desc(visits.visitDate));
}

export async function updateVisit(visitId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(visits).set(updates).where(eq(visits.id, visitId));
}

// ============ FOLLOWUP SHEET OPERATIONS ============

export async function createFollowupSheet(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(followupSheets).values(data);
  return result;
}

export async function getFollowupSheetsByPatient(patientId: number, sheetType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const condition = sheetType
    ? and(eq(followupSheets.patientId, patientId), eq(followupSheets.sheetType, sheetType as any))
    : eq(followupSheets.patientId, patientId);
  return db.select().from(followupSheets).where(condition).orderBy(desc(followupSheets.version));
}

export async function getLatestFollowupSheet(patientId: number, sheetType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(followupSheets)
    .where(and(
      eq(followupSheets.patientId, patientId),
      eq(followupSheets.sheetType, sheetType as any)
    ))
    .orderBy(desc(followupSheets.version))
    .limit(1);

  return result[0] || null;
}

export async function createFollowupItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(followupItems).values(data);
  return result;
}

export async function getFollowupItemsBySheet(followupSheetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(followupItems)
    .where(eq(followupItems.followupSheetId, followupSheetId))
    .orderBy(sql`tableIndex ASC`);
}

export async function updateFollowupItem(itemId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(followupItems).set(updates).where(eq(followupItems.id, itemId));
}

export async function deleteFollowupSheet(sheetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete items first
  await db.delete(followupItems).where(eq(followupItems.followupSheetId, sheetId));
  // Then delete sheet
  await db.delete(followupSheets).where(eq(followupSheets.id, sheetId));
}

// ============ EXAMINATION OPERATIONS ============

export async function createExamination(examinationData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: any = await db.insert(examinations).values(examinationData);
  let insertId = Number(result?.insertId ?? result?.[0]?.insertId ?? result?.id ?? 0);

  // Some mysql2/drizzle paths don't surface insertId consistently.
  if (!Number.isFinite(insertId) || insertId <= 0) {
    const [latest] = await db
      .select({ id: examinations.id })
      .from(examinations)
      .where(
        and(
          eq(examinations.patientId, Number(examinationData?.patientId ?? 0)),
          eq(examinations.visitId, Number(examinationData?.visitId ?? 0))
        )
      )
      .orderBy(desc(examinations.id))
      .limit(1);
    insertId = Number(latest?.id ?? 0);
  }

  return {
    ...(result && typeof result === "object" ? result : {}),
    insertId,
    id: insertId,
  };
}

export async function getExaminationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(examinations).where(eq(examinations.id, id)).limit(1);
  return row ?? null;
}

export async function getExaminationsByVisit(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(examinations).where(eq(examinations.visitId, visitId));
}

export async function getExaminationsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(examinations).where(eq(examinations.patientId, patientId)).orderBy(desc(examinations.createdAt));
}

export async function getAllExaminations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      ...getTableColumns(examinations),
      patientName: sql`JSON_UNQUOTE(JSON_EXTRACT(${sheetEntries.content}, '$.patient.name'))`,
    })
    .from(examinations)
    .leftJoin(sheetEntries, eq(examinations.patientId, sheetEntries.patientId))
    .orderBy(desc(examinations.createdAt));

  return result;
}

export async function getRefractionsOverviewRows(input: {
  page?: number;
  pageSize?: number;
  locationType?: "center" | "external";
  search?: string;
  statusFilter?: "all" | "complete" | "partial";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const page = normalizeOverviewPage(input.page);
  const pageSize = normalizeOverviewPageSize(input.pageSize);
  const offset = (page - 1) * pageSize;
  const cap = Math.min(pageSize, OVERVIEW_ROW_LIMIT);
  const normalizedLocationType = String(input.locationType ?? "").trim().toLowerCase();
  const locationWhere =
    normalizedLocationType === "center" || normalizedLocationType === "external"
      ? eq(patients.locationType, normalizedLocationType as any)
      : undefined;
  const dataWhere = anyMeaningfulValueCondition([
    examinations.ucvaOD,
    examinations.ucvaOS,
    examinations.bcvaOD,
    examinations.bcvaOS,
    examinations.sphereOD,
    examinations.sphereOS,
    examinations.cylinderOD,
    examinations.cylinderOS,
    examinations.axisOD,
    examinations.axisOS,
    examinations.iopOD,
    examinations.iopOS,
    examinations.glassesData,
    examinations.airPuffOD,
    examinations.airPuffOS,
  ]);
  const rightHas = anyMeaningfulValueCondition([
    examinations.ucvaOD,
    examinations.bcvaOD,
    examinations.sphereOD,
    examinations.cylinderOD,
    examinations.axisOD,
    examinations.iopOD,
    examinations.airPuffOD,
  ]);
  const leftHas = anyMeaningfulValueCondition([
    examinations.ucvaOS,
    examinations.bcvaOS,
    examinations.sphereOS,
    examinations.cylinderOS,
    examinations.axisOS,
    examinations.iopOS,
    examinations.airPuffOS,
  ]);
  const completeWhere = and(rightHas as any, leftHas as any);
  const status = String(input.statusFilter ?? "all").trim().toLowerCase();
  const statusWhere =
    status === "complete" ? completeWhere : status === "partial" ? not(completeWhere as any) : undefined;
  const searchWhere = overviewSearchClause(String(input.search ?? ""), [
    patients.fullName,
    patients.patientCode,
    doctorsLookup.name,
  ]);
  const whereExpr = combineWhereClauses(locationWhere, dataWhere, searchWhere, statusWhere);

  const totalRows = await db
    .select({
      total: sql<number>`cast(count(*) as signed)`.mapWith(Number),
    })
    .from(examinations)
    .leftJoin(visits, eq(examinations.visitId, visits.id))
    .innerJoin(patients, eq(examinations.patientId, patients.id))
    .leftJoin(doctorsLookup, eq(patients.doctorCode, doctorsLookup.code))
    .where(whereExpr as any);

  const rows = await db
    .select({
      id: examinations.id,
      visitId: examinations.visitId,
      patientId: examinations.patientId,
      visitDate: visits.visitDate,
      patientName: patients.fullName,
      patientCode: patients.patientCode,
      locationType: patients.locationType,
      doctorName: doctorsLookup.name,
      ucvaOD: examinations.ucvaOD,
      ucvaOS: examinations.ucvaOS,
      bcvaOD: examinations.bcvaOD,
      bcvaOS: examinations.bcvaOS,
      sphereOD: examinations.sphereOD,
      sphereOS: examinations.sphereOS,
      cylinderOD: examinations.cylinderOD,
      cylinderOS: examinations.cylinderOS,
      axisOD: examinations.axisOD,
      axisOS: examinations.axisOS,
      iopOD: examinations.iopOD,
      iopOS: examinations.iopOS,
      glassesData: examinations.glassesData,
      airPuffOD: examinations.airPuffOD,
      airPuffOS: examinations.airPuffOS,
      createdAt: examinations.createdAt,
      updatedAt: examinations.updatedAt,
    })
    .from(examinations)
    .leftJoin(visits, eq(examinations.visitId, visits.id))
    .innerJoin(patients, eq(examinations.patientId, patients.id))
    .leftJoin(doctorsLookup, eq(patients.doctorCode, doctorsLookup.code))
    .where(whereExpr as any)
    .orderBy(desc(sql`COALESCE(${visits.visitDate}, ${examinations.createdAt})`))
    .limit(cap)
    .offset(offset);

  return {
    rows: rows.map((row) => ({
      ...row,
      patientName: decodeMojibake(String(row.patientName ?? "")),
      doctorName: decodeMojibake(String(row.doctorName ?? "")),
    })),
    total: Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function updateExamination(examinationId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(examinations).set(updates).where(eq(examinations.id, examinationId));
}

// ============ AUTOREFRACTOMETRY OPERATIONS ============


export async function getAutorefractometryByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      ...getTableColumns(autorefractometryData),
      visitDate: visits.visitDate,
    })
    .from(autorefractometryData)
    .leftJoin(examinations, eq(autorefractometryData.examinationId, examinations.id))
    .leftJoin(visits, eq(examinations.visitId, visits.id))
    .where(eq(autorefractometryData.patientId, patientId))
    .orderBy(desc(visits.visitDate ?? autorefractometryData.createdAt));
}

export async function getAutorefractometryOverviewRows(input: {
  page?: number;
  pageSize?: number;
  locationType?: "center" | "external";
  search?: string;
  statusFilter?: "all" | "complete" | "partial";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const page = normalizeOverviewPage(input.page);
  const pageSize = normalizeOverviewPageSize(input.pageSize);
  const offset = (page - 1) * pageSize;
  const cap = Math.min(pageSize, OVERVIEW_ROW_LIMIT);
  const normalizedLocationType = String(input.locationType ?? "").trim().toLowerCase();
  const locationWhere =
    normalizedLocationType === "center" || normalizedLocationType === "external"
      ? eq(patients.locationType, normalizedLocationType as any)
      : undefined;
  const dataWhere = anyMeaningfulValueCondition([
    autorefractometryData.sphereOD,
    autorefractometryData.cylinderOD,
    autorefractometryData.axisOD,
    autorefractometryData.ucvaOD,
    autorefractometryData.bcvaOD,
    autorefractometryData.iopOD,
    autorefractometryData.sphereOS,
    autorefractometryData.cylinderOS,
    autorefractometryData.axisOS,
    autorefractometryData.ucvaOS,
    autorefractometryData.bcvaOS,
    autorefractometryData.iopOS,
  ]);
  const rightHas = anyMeaningfulValueCondition([
    autorefractometryData.sphereOD,
    autorefractometryData.cylinderOD,
    autorefractometryData.axisOD,
    autorefractometryData.ucvaOD,
    autorefractometryData.bcvaOD,
    autorefractometryData.iopOD,
  ]);
  const leftHas = anyMeaningfulValueCondition([
    autorefractometryData.sphereOS,
    autorefractometryData.cylinderOS,
    autorefractometryData.axisOS,
    autorefractometryData.ucvaOS,
    autorefractometryData.bcvaOS,
    autorefractometryData.iopOS,
  ]);
  const completeWhere = and(rightHas as any, leftHas as any);
  const status = String(input.statusFilter ?? "all").trim().toLowerCase();
  const statusWhere =
    status === "complete" ? completeWhere : status === "partial" ? not(completeWhere as any) : undefined;
  const searchWhere = overviewSearchClause(String(input.search ?? ""), [
    patients.fullName,
    patients.patientCode,
    doctorsLookup.name,
  ]);
  const whereExpr = combineWhereClauses(locationWhere, dataWhere, searchWhere, statusWhere);

  const totalRows = await db
    .select({
      total: sql<number>`cast(count(*) as signed)`.mapWith(Number),
    })
    .from(autorefractometryData)
    .leftJoin(examinations, eq(autorefractometryData.examinationId, examinations.id))
    .leftJoin(visits, eq(examinations.visitId, visits.id))
    .innerJoin(patients, eq(autorefractometryData.patientId, patients.id))
    .leftJoin(doctorsLookup, eq(patients.doctorCode, doctorsLookup.code))
    .where(whereExpr as any);

  const rows = await db
    .select({
      id: autorefractometryData.id,
      examinationId: autorefractometryData.examinationId,
      patientId: autorefractometryData.patientId,
      visitDate: visits.visitDate,
      patientName: patients.fullName,
      patientCode: patients.patientCode,
      locationType: patients.locationType,
      doctorName: doctorsLookup.name,
      sphereOD: autorefractometryData.sphereOD,
      cylinderOD: autorefractometryData.cylinderOD,
      axisOD: autorefractometryData.axisOD,
      ucvaOD: autorefractometryData.ucvaOD,
      bcvaOD: autorefractometryData.bcvaOD,
      iopOD: autorefractometryData.iopOD,
      sphereOS: autorefractometryData.sphereOS,
      cylinderOS: autorefractometryData.cylinderOS,
      axisOS: autorefractometryData.axisOS,
      ucvaOS: autorefractometryData.ucvaOS,
      bcvaOS: autorefractometryData.bcvaOS,
      iopOS: autorefractometryData.iopOS,
      createdAt: autorefractometryData.createdAt,
      updatedAt: autorefractometryData.updatedAt,
    })
    .from(autorefractometryData)
    .leftJoin(examinations, eq(autorefractometryData.examinationId, examinations.id))
    .leftJoin(visits, eq(examinations.visitId, visits.id))
    .innerJoin(patients, eq(autorefractometryData.patientId, patients.id))
    .leftJoin(doctorsLookup, eq(patients.doctorCode, doctorsLookup.code))
    .where(whereExpr as any)
    .orderBy(desc(sql`COALESCE(${visits.visitDate}, ${autorefractometryData.createdAt})`))
    .limit(cap)
    .offset(offset);

  return {
    rows: rows.map((row) => ({
      ...row,
      patientName: decodeMojibake(String(row.patientName ?? "")),
      doctorName: decodeMojibake(String(row.doctorName ?? "")),
    })),
    total: Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function getGlassesRecordsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      ...getTableColumns(glassesRecords),
      visitDate: visits.visitDate,
    })
    .from(glassesRecords)
    .leftJoin(examinations, eq(glassesRecords.examinationId, examinations.id))
    .leftJoin(visits, eq(examinations.visitId, visits.id))
    .where(eq(glassesRecords.patientId, patientId))
    .orderBy(desc(visits.visitDate ?? glassesRecords.createdAt));
}

export async function getAfterRefractionByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    return await db
      .select({
        ...getTableColumns(afterRefractionData),
        visitDate: visits.visitDate,
      })
      .from(afterRefractionData)
      .leftJoin(examinations, eq(afterRefractionData.examinationId, examinations.id))
      .leftJoin(visits, eq(examinations.visitId, visits.id))
      .where(eq(afterRefractionData.patientId, patientId))
      .orderBy(desc(visits.visitDate ?? afterRefractionData.createdAt));
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("doesn't exist")) return [];
    throw error;
  }
}

// ============ PENTACAM OPERATIONS ============

export async function createPentacamResult(pentacamData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Map input parameters to database columns
  const dbRecord = {
    visitId: pentacamData.visitId,
    patientId: pentacamData.patientId,
    recordedBy: pentacamData.recordedBy,
    pachymetryOD: pentacamData.pachymetryOD,
    pachymetryOS: pentacamData.pachymetryOS,
    // Right eye (OD) data
    k1OD: pentacamData.rtK1, // rtK1 = right K1 = OD K1
    k2OD: pentacamData.rtK2, // rtK2 = right K2 = OD K2
    axisOD: pentacamData.rtAX,
    thinnestPointOD: pentacamData.rtThinnestPoint,
    apexOD: pentacamData.rtApex,
    residualOD: pentacamData.rtResidual,
    tttOD: pentacamData.rtTTT,
    ablationOD: pentacamData.rtAblation,
    // Left eye (OS) data
    k1OS: pentacamData.ltK1, // ltK1 = left K1 = OS K1
    k2OS: pentacamData.ltK2,
    axisOS: pentacamData.ltAX,
    thinnestPointOS: pentacamData.ltThinnestPoint,
    apexOS: pentacamData.ltApex,
    residualOS: pentacamData.ltResidual,
    tttOS: pentacamData.ltTTT,
    ablationOS: pentacamData.ltAblation,
    notes: pentacamData.techniciansNotes,
  };

  const result = await db.insert(pentacamResults).values(dbRecord);
  return result;
}

export async function updatePentacamResult(resultId: number, pentacamData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Map input parameters to database columns
  const dbRecord: any = {};

  if (pentacamData.pachymetryOD) dbRecord.pachymetryOD = pentacamData.pachymetryOD;
  if (pentacamData.pachymetryOS) dbRecord.pachymetryOS = pentacamData.pachymetryOS;

  // Right eye (OD) data
  if (pentacamData.k1OD) dbRecord.k1OD = pentacamData.k1OD;
  if (pentacamData.k2OD) dbRecord.k2OD = pentacamData.k2OD;
  if (pentacamData.axisOD) dbRecord.axisOD = pentacamData.axisOD;
  if (pentacamData.thinnestPointOD) dbRecord.thinnestPointOD = pentacamData.thinnestPointOD;
  if (pentacamData.apexOD) dbRecord.apexOD = pentacamData.apexOD;
  if (pentacamData.residualOD) dbRecord.residualOD = pentacamData.residualOD;
  if (pentacamData.tttOD) dbRecord.tttOD = pentacamData.tttOD;
  if (pentacamData.ablationOD) dbRecord.ablationOD = pentacamData.ablationOD;

  // Left eye (OS) data
  if (pentacamData.k1OS) dbRecord.k1OS = pentacamData.k1OS;
  if (pentacamData.k2OS) dbRecord.k2OS = pentacamData.k2OS;
  if (pentacamData.axisOS) dbRecord.axisOS = pentacamData.axisOS;
  if (pentacamData.thinnestPointOS) dbRecord.thinnestPointOS = pentacamData.thinnestPointOS;
  if (pentacamData.apexOS) dbRecord.apexOS = pentacamData.apexOS;
  if (pentacamData.residualOS) dbRecord.residualOS = pentacamData.residualOS;
  if (pentacamData.tttOS) dbRecord.tttOS = pentacamData.tttOS;
  if (pentacamData.ablationOS) dbRecord.ablationOS = pentacamData.ablationOS;

  if (pentacamData.techniciansNotes) dbRecord.notes = pentacamData.techniciansNotes;
  if (pentacamData.recordedBy) dbRecord.recordedBy = pentacamData.recordedBy;

  await db.update(pentacamResults).set(dbRecord).where(eq(pentacamResults.id, resultId));
}

export async function getPentacamResultsByVisit(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(pentacamResults).where(eq(pentacamResults.visitId, visitId));
}

/**
 * Create or update autorefraction data
 * Accepts either flattened object (from ExaminationForm) or nested object (from MedicalFilePanel)
 */
export async function saveAutorefractometryData(dataInput: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const examinationId = Number(dataInput.examinationId ?? 0);
  const patientId = Number(dataInput.patientId ?? 0);
  if (!Number.isFinite(examinationId) || examinationId <= 0) {
    throw new Error("saveAutorefractometryData: missing valid examinationId");
  }
  if (!Number.isFinite(patientId) || patientId <= 0) {
    throw new Error("saveAutorefractometryData: missing valid patientId");
  }

  // Check if record already exists
  const existing = await db.select().from(autorefractometryData)
    .where(eq(autorefractometryData.examinationId, examinationId))
    .limit(1);

  const dbRecord: any = {
    examinationId,
    patientId,
  };

  // Handle both flattened format (from ExaminationForm) and nested format (from MedicalFilePanel)
  if (dataInput.sphereOD) dbRecord.sphereOD = dataInput.sphereOD;
  else if (dataInput.od?.s) dbRecord.sphereOD = dataInput.od.s;

  if (dataInput.cylinderOD) dbRecord.cylinderOD = dataInput.cylinderOD;
  else if (dataInput.od?.c) dbRecord.cylinderOD = dataInput.od.c;

  if (dataInput.axisOD) dbRecord.axisOD = dataInput.axisOD;
  else if (dataInput.od?.axis) dbRecord.axisOD = dataInput.od.axis;

  if (dataInput.ucvaOD) dbRecord.ucvaOD = dataInput.ucvaOD;
  else if (dataInput.od?.ucva) dbRecord.ucvaOD = dataInput.od.ucva;

  if (dataInput.bcvaOD) dbRecord.bcvaOD = dataInput.bcvaOD;
  else if (dataInput.od?.bcva) dbRecord.bcvaOD = dataInput.od.bcva;

  if (dataInput.sphereOS) dbRecord.sphereOS = dataInput.sphereOS;
  else if (dataInput.os?.s) dbRecord.sphereOS = dataInput.os.s;

  if (dataInput.cylinderOS) dbRecord.cylinderOS = dataInput.cylinderOS;
  else if (dataInput.os?.c) dbRecord.cylinderOS = dataInput.os.c;

  if (dataInput.axisOS) dbRecord.axisOS = dataInput.axisOS;
  else if (dataInput.os?.axis) dbRecord.axisOS = dataInput.os.axis;

  if (dataInput.ucvaOS) dbRecord.ucvaOS = dataInput.ucvaOS;
  else if (dataInput.os?.ucva) dbRecord.ucvaOS = dataInput.os.ucva;

  if (dataInput.bcvaOS) dbRecord.bcvaOS = dataInput.bcvaOS;
  else if (dataInput.os?.bcva) dbRecord.bcvaOS = dataInput.os.bcva;

  // IOP
  if (dataInput.iopOD) dbRecord.iopOD = dataInput.iopOD;
  else if (dataInput.iop?.od) dbRecord.iopOD = dataInput.iop.od;
  else if (dataInput.od?.airPuff1) dbRecord.iopOD = dataInput.od.airPuff1;
  else if (dataInput.od?.airPuff2) dbRecord.iopOD = dataInput.od.airPuff2;
  else if (dataInput.od?.airPuff3) dbRecord.iopOD = dataInput.od.airPuff3;

  if (dataInput.iopOS) dbRecord.iopOS = dataInput.iopOS;
  else if (dataInput.iop?.os) dbRecord.iopOS = dataInput.iop.os;
  else if (dataInput.os?.airPuff1) dbRecord.iopOS = dataInput.os.airPuff1;
  else if (dataInput.os?.airPuff2) dbRecord.iopOS = dataInput.os.airPuff2;
  else if (dataInput.os?.airPuff3) dbRecord.iopOS = dataInput.os.airPuff3;

  if (existing.length > 0) {
    await db.update(autorefractometryData)
      .set(dbRecord)
      .where(eq(autorefractometryData.examinationId, examinationId));
    return existing[0];
  } else {
    await db.insert(autorefractometryData).values(dbRecord);
    const [newRecord] = await db.select().from(autorefractometryData)
      .where(eq(autorefractometryData.examinationId, examinationId));
    return newRecord;
  }
}

/**
 * Create or update glasses records
 * Accepts either flattened object (from ExaminationForm) or nested object (from MedicalFilePanel)
 */
export async function saveGlassesRecord(dataInput: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const examinationId = dataInput.examinationId;
  const patientId = dataInput.patientId;

  // Check if record already exists
  const existing = await db.select().from(glassesRecords)
    .where(eq(glassesRecords.examinationId, examinationId))
    .limit(1);

  const dbRecord: any = {
    examinationId,
    patientId,
  };

  // Handle both flattened format (from ExaminationForm) and nested format (from MedicalFilePanel)
  if (dataInput.sOD) dbRecord.sOD = dataInput.sOD;
  else if (dataInput.od?.s) dbRecord.sOD = dataInput.od.s;

  if (dataInput.cOD) dbRecord.cOD = dataInput.cOD;
  else if (dataInput.od?.c) dbRecord.cOD = dataInput.od.c;

  if (dataInput.axisOD) dbRecord.axisOD = dataInput.axisOD;
  else if (dataInput.od?.axis) dbRecord.axisOD = dataInput.od.axis;

  if (dataInput.pdOD) dbRecord.pdOD = dataInput.pdOD;
  else if (dataInput.od?.pd) dbRecord.pdOD = dataInput.od.pd;

  if (dataInput.addOD) dbRecord.addOD = dataInput.addOD;
  else if (dataInput.od?.add) dbRecord.addOD = dataInput.od.add;

  if (dataInput.bcvaOD) dbRecord.bcvaOD = dataInput.bcvaOD;
  else if (dataInput.od?.bcva) dbRecord.bcvaOD = dataInput.od.bcva;

  if (dataInput.sOS) dbRecord.sOS = dataInput.sOS;
  else if (dataInput.os?.s) dbRecord.sOS = dataInput.os.s;

  if (dataInput.cOS) dbRecord.cOS = dataInput.cOS;
  else if (dataInput.os?.c) dbRecord.cOS = dataInput.os.c;

  if (dataInput.axisOS) dbRecord.axisOS = dataInput.axisOS;
  else if (dataInput.os?.axis) dbRecord.axisOS = dataInput.os.axis;

  if (dataInput.pdOS) dbRecord.pdOS = dataInput.pdOS;
  else if (dataInput.os?.pd) dbRecord.pdOS = dataInput.os.pd;

  if (dataInput.addOS) dbRecord.addOS = dataInput.addOS;
  else if (dataInput.os?.add) dbRecord.addOS = dataInput.os.add;

  if (dataInput.bcvaOS) dbRecord.bcvaOS = dataInput.bcvaOS;
  else if (dataInput.os?.bcva) dbRecord.bcvaOS = dataInput.os.bcva;

  if (existing.length > 0) {
    await db.update(glassesRecords)
      .set(dbRecord)
      .where(eq(glassesRecords.examinationId, examinationId));
    return existing[0];
  } else {
    await db.insert(glassesRecords).values(dbRecord);
    const [newRecord] = await db.select().from(glassesRecords)
      .where(eq(glassesRecords.examinationId, examinationId));
    return newRecord;
  }
}

export async function saveAfterRefractionData(dataInput: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const examinationId = Number(dataInput.examinationId ?? 0);
  const patientId = Number(dataInput.patientId ?? 0);
  if (!Number.isFinite(examinationId) || examinationId <= 0) {
    throw new Error("saveAfterRefractionData: missing valid examinationId");
  }
  if (!Number.isFinite(patientId) || patientId <= 0) {
    throw new Error("saveAfterRefractionData: missing valid patientId");
  }

  let existing: any[] = [];
  try {
    existing = await db
      .select()
      .from(afterRefractionData)
      .where(eq(afterRefractionData.examinationId, examinationId))
      .limit(1);
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("doesn't exist")) return null;
    throw error;
  }

  const dbRecord: any = {
    examinationId,
    patientId,
    sphereOD: dataInput.sphereOD ?? dataInput.od?.s ?? null,
    cylinderOD: dataInput.cylinderOD ?? dataInput.od?.c ?? null,
    axisOD: dataInput.axisOD ?? dataInput.od?.axis ?? null,
    sphereOS: dataInput.sphereOS ?? dataInput.os?.s ?? null,
    cylinderOS: dataInput.cylinderOS ?? dataInput.os?.c ?? null,
    axisOS: dataInput.axisOS ?? dataInput.os?.axis ?? null,
  };

  if (existing.length > 0) {
    try {
      await db
        .update(afterRefractionData)
        .set(dbRecord)
        .where(eq(afterRefractionData.examinationId, examinationId));
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (message.includes("doesn't exist")) return null;
      throw error;
    }
    return existing[0];
  }

  try {
    await db.insert(afterRefractionData).values(dbRecord);
    const [newRecord] = await db
      .select()
      .from(afterRefractionData)
      .where(eq(afterRefractionData.examinationId, examinationId));
    return newRecord;
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("doesn't exist")) return null;
    throw error;
  }
}

export async function getPentacamResultsByPatient(patientId: number, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(500, Number(limit))) : 100;
  const patientRow = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (patientRow.length === 0) return [];
  const patient = decodePatientRow(patientRow[0] as any);

  return await db
    .select({
      ...getTableColumns(pentacamResults),
      visitDate: visits.visitDate,
    })
    .from(pentacamResults)
    .leftJoin(visits, eq(pentacamResults.visitId, visits.id))
    .where(eq(pentacamResults.patientId, patientId))
    .orderBy(desc(visits.visitDate ?? pentacamResults.createdAt))
    .limit(safeLimit);
}

export type PentacamDashboardFilters = {
  resultId?: number;
  visitId?: number;
  patientId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  locationType?: "center" | "external";
  limit?: number;
  offset?: number;
};

/**
 * Pentacam list rows with patient + visit + doctor (lookup) for dashboard UI.
 */
export async function getPentacamResultsForDashboard(filters: PentacamDashboardFilters) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const safeLimit = Number.isFinite(Number(filters.limit))
    ? Math.max(1, Math.min(500, Number(filters.limit)))
    : 150;
  const safeOffset = Number.isFinite(Number(filters.offset)) ? Math.max(0, Number(filters.offset)) : 0;

  const clauses: any[] = [];

  if (filters.resultId !== undefined && Number.isFinite(Number(filters.resultId)) && Number(filters.resultId) > 0) {
    clauses.push(eq(pentacamResults.id, Number(filters.resultId)));
  }
  if (filters.visitId !== undefined && Number.isFinite(Number(filters.visitId))) {
    clauses.push(eq(pentacamResults.visitId, Number(filters.visitId)));
  }
  if (filters.patientId !== undefined && Number.isFinite(Number(filters.patientId)) && Number(filters.patientId) > 0) {
    clauses.push(eq(pentacamResults.patientId, Number(filters.patientId)));
  }
  clauses.push(pentacamEligibilityExpr() as any);

  const fromD = String(filters.fromDate ?? "").trim();
  const toD = String(filters.toDate ?? "").trim();
  if (fromD || toD) {
    const fromBound = fromD || "1970-01-01";
    const toBound = toD || "2099-12-31";
    clauses.push(
      sql`DATE(COALESCE(${visits.visitDate}, ${pentacamResults.createdAt})) >= ${fromBound}`,
    );
    clauses.push(sql`DATE(COALESCE(${visits.visitDate}, ${pentacamResults.createdAt})) <= ${toBound}`);
  }

  const normalizedSearch = String(filters.search ?? "").trim();
  if (normalizedSearch) {
    const term = `%${normalizedSearch}%`;
    const legacyTerm = `%${encodeForLegacySearch(normalizedSearch)}%`;
    clauses.push(
      or(
        like(patients.fullName, term),
        like(patients.fullName, legacyTerm),
        like(doctorsLookup.name, term),
        like(doctorsLookup.name, legacyTerm),
      ),
    );
  }

  const normalizedLocationType = String(filters.locationType ?? "").trim().toLowerCase();
  if (normalizedLocationType === "center" || normalizedLocationType === "external") {
    clauses.push(eq(patients.locationType, normalizedLocationType as any));
  }

  const whereExpr = clauses.length > 0 ? and(...clauses) : undefined;

  const rows = await db
    .select({
      ...getTableColumns(pentacamResults),
      visitDate: visits.visitDate,
      patientFullName: patients.fullName,
      doctorDisplayName: doctorsLookup.name,
    })
    .from(pentacamResults)
    .leftJoin(visits, eq(pentacamResults.visitId, visits.id))
    .innerJoin(patients, eq(pentacamResults.patientId, patients.id))
    .leftJoin(doctorsLookup, eq(patients.doctorCode, doctorsLookup.code))
    .where(whereExpr)
    .orderBy(desc(sql`COALESCE(${visits.visitDate}, ${pentacamResults.createdAt})`))
    .limit(safeLimit)
    .offset(safeOffset);

  return rows.map((row) => ({
    ...row,
    patientFullName: decodeMojibake((row as any).patientFullName),
    doctorDisplayName: decodeMojibake((row as any).doctorDisplayName),
  }));
}

export async function getPentacamDashboardDayStats(locationType?: "center" | "external") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedLocationType = String(locationType ?? "").trim().toLowerCase();
  const locationWhere =
    normalizedLocationType === "center" || normalizedLocationType === "external"
      ? eq(patients.locationType, normalizedLocationType as any)
      : undefined;

  const rows = await db
    .select({
      todayCount: sql<number>`COALESCE(SUM(CASE WHEN DATE(COALESCE(${visits.visitDate}, ${pentacamResults.createdAt})) = CURDATE() THEN 1 ELSE 0 END), 0)`,
      yesterdayCount: sql<number>`COALESCE(SUM(CASE WHEN DATE(COALESCE(${visits.visitDate}, ${pentacamResults.createdAt})) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END), 0)`,
    })
    .from(pentacamResults)
    .leftJoin(visits, eq(pentacamResults.visitId, visits.id))
    .innerJoin(patients, eq(pentacamResults.patientId, patients.id))
    .where(locationWhere ? and(pentacamEligibilityExpr() as any, locationWhere as any) : (pentacamEligibilityExpr() as any));

  const r = rows[0];
  return {
    todayCount: Number((r as any)?.todayCount ?? 0),
    yesterdayCount: Number((r as any)?.yesterdayCount ?? 0),
  };
}

export async function getRecentPentacamResultNotes(limit = 50000) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100000, Number(limit))) : 50000;
  const rows = await db
    .select({ notes: pentacamResults.notes })
    .from(pentacamResults)
    .orderBy(desc(pentacamResults.createdAt))
    .limit(safeLimit);
  return rows.map((row) => String(row.notes ?? ""));
}

export async function getRecentPentacamLocalResults(limit = 50000) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100000, Number(limit))) : 50000;
  return await db
    .select({
      id: pentacamResults.id,
      patientId: pentacamResults.patientId,
      notes: pentacamResults.notes,
      createdAt: pentacamResults.createdAt,
      updatedAt: pentacamResults.updatedAt,
    })
    .from(pentacamResults)
    .orderBy(desc(pentacamResults.createdAt))
    .limit(safeLimit);
}

export async function reassignPentacamResultPatient(resultId: number, patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(pentacamResults)
    .set({ patientId })
    .where(eq(pentacamResults.id, resultId));
}

export async function deletePentacamResultsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalized = Array.from(
    new Set(
      (ids ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  );
  if (normalized.length === 0) return 0;
  await db.delete(pentacamResults).where(inArray(pentacamResults.id, normalized));
  return normalized.length;
}

export async function getBlackiceUploadsByPatient(patientId: number, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const safeLimit = Math.min(Math.max(1, Number(limit)), 500);
  const result = await db.execute(
    sql`SELECT id, file_name, mime_type, s3_key, created_at
        FROM blackice_uploads
        WHERE patient_id = ${patientId}
        ORDER BY created_at DESC
        LIMIT ${safeLimit}`
  );
  const rows = Array.isArray(result) ? result[0] : result;
  return (Array.isArray(rows) ? rows : []) as Array<{
    id: number;
    file_name: string | null;
    mime_type: string | null;
    s3_key: string | null;
    created_at: Date | string | null;
  }>;
}

export async function linkBlackiceUploadToPatient(baseName: string, patientId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.execute(
    sql`UPDATE blackice_uploads SET patient_id = ${patientId}
        WHERE file_name = ${baseName} AND patient_id IS NULL
        LIMIT 1`
  );
  // Drizzle MySQL returns either [ResultSetHeader, ...] or the header directly.
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as any)?.affectedRows ?? 0);
}

export async function getUnlinkedBlackiceUploads(limit = 10000) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const safeLimit = Math.min(Math.max(1, Number(limit)), 100000);
  const result = await db.execute(
    sql`SELECT id, file_name, created_at
        FROM blackice_uploads
        WHERE patient_id IS NULL
          AND file_name REGEXP '\\.(jpg|jpeg|png|webp)$'
        ORDER BY created_at DESC
        LIMIT ${safeLimit}`
  );
  const rows = Array.isArray(result) ? result[0] : result;
  return (Array.isArray(rows) ? rows : []) as Array<{
    id: number;
    file_name: string | null;
    created_at: Date | string | null;
  }>;
}

// ============ DOCTOR REPORT OPERATIONS ============

export async function createDoctorReport(reportData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(doctorReports).values(reportData);
  return result;
}

export async function updateDoctorReport(reportId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(doctorReports).set(updates).where(eq(doctorReports.id, reportId));
}

export async function getDoctorReportsByVisit(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(doctorReports).where(eq(doctorReports.visitId, visitId));
}

export async function getAllDoctorReports() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(doctorReports).orderBy(desc(doctorReports.createdAt));
}

/** Joined rows for التقارير الطبية hub (جدول + إحصائيات). */
export async function getMedicalReportsOverviewRows(limit = 250) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const cap = Math.min(Math.max(limit, 1), 500);

  const rows = await dbConn
    .select({
      id: doctorReports.id,
      visitId: doctorReports.visitId,
      patientId: doctorReports.patientId,
      doctorUserId: doctorReports.doctorId,
      diagnosis: doctorReports.diagnosis,
      diseases: doctorReports.diseases,
      treatment: doctorReports.treatment,
      recommendations: doctorReports.recommendations,
      visitDate: doctorReports.visitDate,
      operationType: doctorReports.operationType,
      clinicalOpinion: doctorReports.clinicalOpinion,
      additionalNotes: doctorReports.additionalNotes,
      createdAt: doctorReports.createdAt,
      updatedAt: doctorReports.updatedAt,
      patientName: patients.fullName,
      patientCode: patients.patientCode,
      doctorName: users.name,
    })
    .from(doctorReports)
    .leftJoin(patients, eq(doctorReports.patientId, patients.id))
    .leftJoin(users, eq(doctorReports.doctorId, users.id))
    .orderBy(desc(doctorReports.createdAt))
    .limit(cap);

  return rows;
}

export async function getDoctorReportsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(doctorReports).where(eq(doctorReports.patientId, patientId)).orderBy(desc(doctorReports.createdAt));
}

export async function deleteDoctorReport(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(doctorReports).where(eq(doctorReports.id, reportId));
}

// ============ PRESCRIPTION OPERATIONS ============

export async function createPrescription(prescriptionData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    medicationName,
    dosage,
    frequency,
    duration,
    instructions,
    ...base
  } = prescriptionData ?? {};

  const result = await db.insert(prescriptions).values({
    ...base,
    prescriptionDate: base.prescriptionDate ?? new Date(),
  });

  if (medicationName) {
    const existing = await db.select().from(medications).where(eq(medications.name, medicationName)).limit(1);
    let medicationId: number | undefined;
    if (existing.length > 0) {
      medicationId = existing[0].id;
    } else {
      const inserted = await db.insert(medications).values({
        name: medicationName,
        type: "other",
      });
      medicationId = (inserted as any).insertId as number;
    }

    await db.insert(prescriptionItems).values({
      prescriptionId: (result as any).insertId,
      medicationId,
      dosage: dosage ?? null,
      frequency: frequency ?? null,
      duration: duration ?? null,
      instructions: instructions ?? null,
    });
  }

  return result;
}

export async function getPrescriptionsByVisit(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(prescriptions).where(eq(prescriptions.visitId, visitId));
}

export async function getPrescriptionsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId)).orderBy(desc(prescriptions.prescriptionDate));
}

export async function getPrescriptionsWithItemsByVisit(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      prescriptionId: prescriptions.id,
      prescriptionDate: prescriptions.prescriptionDate,
      notes: prescriptions.notes,
      itemId: prescriptionItems.id,
      medicationId: prescriptionItems.medicationId,
      medicationName: medications.name,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      instructions: prescriptionItems.instructions,
    })
    .from(prescriptions)
    .leftJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId))
    .leftJoin(medications, eq(prescriptionItems.medicationId, medications.id))
    .where(eq(prescriptions.visitId, visitId))
    .orderBy(desc(prescriptions.prescriptionDate));

  const grouped: Record<number, any> = {};
  for (const row of rows) {
    if (!grouped[row.prescriptionId]) {
      grouped[row.prescriptionId] = {
        id: row.prescriptionId,
        prescriptionDate: row.prescriptionDate,
        notes: row.notes ?? "",
        items: [],
      };
    }
    if (row.itemId) {
      grouped[row.prescriptionId].items.push({
        id: row.itemId,
        medicationId: row.medicationId,
        medicationName: row.medicationName ?? "",
        dosage: row.dosage ?? "",
        frequency: row.frequency ?? "",
        duration: row.duration ?? "",
        instructions: row.instructions ?? "",
      });
    }
  }

  return Object.values(grouped);
}

export async function getPrescriptionsWithItemsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      prescriptionId: prescriptions.id,
      prescriptionDate: prescriptions.prescriptionDate,
      notes: prescriptions.notes,
      itemId: prescriptionItems.id,
      medicationName: medications.name,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      instructions: prescriptionItems.instructions,
    })
    .from(prescriptions)
    .leftJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId))
    .leftJoin(medications, eq(prescriptionItems.medicationId, medications.id))
    .where(eq(prescriptions.patientId, patientId))
    .orderBy(desc(prescriptions.prescriptionDate));

  const grouped: Record<number, any> = {};
  for (const row of rows) {
    if (!grouped[row.prescriptionId]) {
      grouped[row.prescriptionId] = {
        id: row.prescriptionId,
        prescriptionDate: row.prescriptionDate,
        notes: row.notes ?? "",
        items: [],
      };
    }
    if (row.itemId) {
      grouped[row.prescriptionId].items.push({
        id: row.itemId,
        medicationName: row.medicationName ?? "",
        dosage: row.dosage ?? "",
        frequency: row.frequency ?? "",
        duration: row.duration ?? "",
        instructions: row.instructions ?? "",
      });
    }
  }

  return Object.values(grouped);
}

/** Recent prescriptions joined with patient/user for overview table (counts items in-memory). */
export async function getPrescriptionsOverviewRows(input: {
  page?: number;
  pageSize?: number;
  locationType?: "center" | "external";
  search?: string;
  statusFilter?: "all" | "active" | "completed" | "expired";
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const page = normalizeOverviewPage(input.page);
  const pageSize = normalizeOverviewPageSize(input.pageSize);
  const offset = (page - 1) * pageSize;
  const cap = Math.min(pageSize, OVERVIEW_ROW_LIMIT);
  const normalizedLocationType = String(input.locationType ?? "").trim().toLowerCase();
  const locationWhere =
    normalizedLocationType === "center" || normalizedLocationType === "external"
      ? eq(patients.locationType, normalizedLocationType as any)
      : undefined;
  const searchWhere = overviewSearchClause(String(input.search ?? ""), [
    patients.fullName,
    patients.patientCode,
    users.name,
    prescriptions.notes,
  ]);
  const dateExpr = sql<number>`DATEDIFF(CURDATE(), DATE(COALESCE(${prescriptions.prescriptionDate}, ${prescriptions.createdAt})))`;
  const status = String(input.statusFilter ?? "all").trim().toLowerCase();
  const statusWhere =
    status === "active"
      ? sql`${dateExpr} <= ${ACTIVE_DAYS}`
      : status === "expired"
        ? sql`${dateExpr} > ${EXPIRED_AFTER_DAYS}`
        : status === "completed"
          ? sql`${dateExpr} > ${ACTIVE_DAYS} AND ${dateExpr} <= ${EXPIRED_AFTER_DAYS}`
          : undefined;
  const hasItemsWhere = sql`EXISTS (SELECT 1 FROM ${prescriptionItems} pi WHERE pi.prescriptionId = ${prescriptions.id})`;
  const whereExpr = combineWhereClauses(locationWhere, searchWhere, statusWhere, hasItemsWhere);

  const baseQuery = dbConn
    .select({
      id: prescriptions.id,
      patientId: prescriptions.patientId,
      prescriptionDate: prescriptions.prescriptionDate,
      notes: prescriptions.notes,
      doctorId: prescriptions.doctorId,
      doctorName: users.name,
      patientName: patients.fullName,
      patientCode: patients.patientCode,
      locationType: patients.locationType,
    })
    .from(prescriptions)
    .leftJoin(patients, eq(prescriptions.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.doctorId, users.id));

  const totalRows = await dbConn
    .select({
      total: sql<number>`cast(count(*) as signed)`.mapWith(Number),
    })
    .from(prescriptions)
    .leftJoin(patients, eq(prescriptions.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.doctorId, users.id))
    .where(whereExpr as any);

  const base = await baseQuery
    .where(whereExpr as any)
    .orderBy(desc(prescriptions.prescriptionDate))
    .limit(cap)
    .offset(offset);

  if (base.length === 0) {
    return { rows: [], total: Number(totalRows[0]?.total ?? 0), page, pageSize };
  }

  const ids = base.map((r) => r.id);
  const countRows = await dbConn
    .select({
      prescriptionId: prescriptionItems.prescriptionId,
      cnt: sql<number>`cast(count(*) as signed)`.mapWith(Number),
    })
    .from(prescriptionItems)
    .where(inArray(prescriptionItems.prescriptionId, ids))
    .groupBy(prescriptionItems.prescriptionId);

  const countMap = new Map(countRows.map((r) => [r.prescriptionId, r.cnt]));

  return {
    rows: base
      .map((r) => ({
        ...r,
        itemCount: countMap.get(r.id) ?? 0,
      }))
      .filter((row) => row.itemCount > 0),
    total: Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function createPrescriptionWithItems(data: {
  patientId: number;
  visitId?: number;
  doctorId?: number;
  date?: string;
  notes?: string;
  items: Array<{
    medicationId?: number;
    medicationName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const validItems = data.items.filter((item) => {
    const hasId = typeof item.medicationId === "number" && item.medicationId > 0;
    const hasName = Boolean(item.medicationName && item.medicationName.trim());
    return hasId || hasName;
  });
  console.log("[createPrescriptionWithItems] validItems", {
    total: data.items.length,
    valid: validItems.length,
    first: validItems[0],
  });
  if (validItems.length === 0) {
    throw new Error("Cannot create prescription without items");
  }

  const prescription = await db.insert(prescriptions).values({
    patientId: data.patientId,
    visitId: data.visitId ?? null,
    doctorId: data.doctorId ?? null,
    notes: data.notes ?? null,
    prescriptionDate: data.date ? new Date(data.date) : new Date(),
  });

  let prescriptionId = (prescription as any).insertId as number | undefined;
  if (!prescriptionId) {
    const lastIdResult = await db.execute(sql`select last_insert_id() as id`);
    const rows = (lastIdResult as any)?.[0] ?? (lastIdResult as any)?.rows ?? lastIdResult;
    const resolvedId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
    prescriptionId = resolvedId ? Number(resolvedId) : undefined;
  }
  if (!prescriptionId) return prescription;

  for (const item of validItems) {
    const providedId = typeof item.medicationId === "number" && item.medicationId > 0 ? item.medicationId : undefined;
    let medicationId: number | undefined = providedId;
    if (!medicationId) {
      const name = item.medicationName?.trim();
      if (!name) continue;
      const existing = await db.select().from(medications).where(eq(medications.name, name)).limit(1);
      if (existing.length > 0) {
        medicationId = existing[0].id;
      } else {
        const inserted = await db.insert(medications).values({ name, type: "other" });
        medicationId = (inserted as any).insertId as number;
      }
    }

    await db.insert(prescriptionItems).values({
      prescriptionId,
      medicationId,
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
      instructions: item.instructions ?? null,
    });
  }

  return prescription;
}

export async function deletePrescription(prescriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(prescriptionItems).where(eq(prescriptionItems.prescriptionId, prescriptionId));
  await db.delete(prescriptions).where(eq(prescriptions.id, prescriptionId));
}

// ============ SURGERY OPERATIONS ============

export async function createSurgery(surgeryData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(surgeries).values(surgeryData);
  return result;
}

export async function getSurgeriesByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(surgeries).where(eq(surgeries.patientId, patientId)).orderBy(desc(surgeries.surgeryDate));
}

export async function deleteSurgery(surgeryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(surgeries).where(eq(surgeries.id, surgeryId));
}

export async function updateSurgery(surgeryId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(surgeries).set(updates).where(eq(surgeries.id, surgeryId));
}

// ============ POST-OP FOLLOWUP OPERATIONS ============

export async function createPostOpFollowup(followupData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(postOpFollowups).values(followupData);
  return result;
}

export async function getPostOpFollowupsBySurgery(surgeryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(postOpFollowups).where(eq(postOpFollowups.surgeryId, surgeryId)).orderBy(desc(postOpFollowups.followupDate));
}

export async function getPostOpFollowupsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(postOpFollowups).where(eq(postOpFollowups.patientId, patientId)).orderBy(desc(postOpFollowups.followupDate));
}

// ============ CONSENT FORM OPERATIONS ============

export async function createConsentForm(consentData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(consentForms).values(consentData);
  return result;
}

export async function getConsentFormsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(consentForms).where(eq(consentForms.patientId, patientId));
}

// ============ MEDICAL HISTORY OPERATIONS ============

export async function createMedicalHistory(historyData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(medicalHistoryChecklist).values(historyData);
  return result;
}

export async function getMedicalHistoryByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(medicalHistoryChecklist).where(eq(medicalHistoryChecklist.patientId, patientId));
}

export async function getExaminationChecklistByExaminationId(examinationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(examinationChecklistItems)
    .where(eq(examinationChecklistItems.examinationId, examinationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertExaminationChecklist(input: {
  examinationId: number;
  patientId: number;
  checklist: {
    generalDiseases?: boolean;
    pregnancyOrLactation?: boolean;
    usesAllergySupplementsSteroidsOrPressureMeds?: boolean;
    acneTreatment?: boolean;
    familyKeratoconus?: boolean;
    usesTearSubstituteOrExcessTearsOrSandySensation?: boolean;
    symptomsWorseWithAirOrAC?: boolean;
    glaucomaTreatment?: boolean;
  };
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getExaminationChecklistByExaminationId(input.examinationId);
  if (existing?.id) {
    await db
      .update(examinationChecklistItems)
      .set({
        ...input.checklist,
        updatedAt: new Date(),
      })
      .where(eq(examinationChecklistItems.id, existing.id));
    return { success: true, mode: "updated" as const };
  }

  await db.insert(examinationChecklistItems).values({
    examinationId: input.examinationId,
    patientId: input.patientId,
    ...input.checklist,
  });
  return { success: true, mode: "inserted" as const };
}

// ============ AUDIT LOG OPERATIONS ============

export async function createAuditLog(logData: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(auditLogs).values(logData);
  return result;
}

export async function getAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ============ MEDICATION OPERATIONS ============

export async function createMedication(medicationData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(medications).values(medicationData);
  return result;
}

export async function getAllMedications() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(medications);
}

export async function updateMedication(medicationId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(medications).set(updates).where(eq(medications.id, medicationId));
}

export async function deleteMedication(medicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(medications).where(eq(medications.id, medicationId));
}

// ============ TEST OPERATIONS ============

export async function createTest(testData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tests).values(testData);
  return result;
}

export async function getAllTests() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(tests);
}

export async function updateTest(testId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tests).set(updates).where(eq(tests.id, testId));
}

export async function deleteTest(testId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tests).where(eq(tests.id, testId));
}

export async function getTestFavoritesByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(testFavorites).where(eq(testFavorites.userId, userId));
}

export async function toggleTestFavorite(userId: number, testId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(testFavorites)
    .where(and(eq(testFavorites.userId, userId), eq(testFavorites.testId, testId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(testFavorites)
      .where(and(eq(testFavorites.userId, userId), eq(testFavorites.testId, testId)));
    return { favorite: false };
  }

  await db.insert(testFavorites).values({
    userId,
    testId,
    createdAt: new Date(),
  });
  return { favorite: true };
}

// ============ TEST REQUEST OPERATIONS ============

export async function createTestRequest(requestData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(testRequests).values(requestData);
  return result;
}

export async function createTestRequestItems(items: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (items.length === 0) return;
  await db.insert(testRequestItems).values(items);
}

export async function getTestRequestsByVisit(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const requestData = await db.select().from(testRequests).where(eq(testRequests.visitId, visitId));

  // Get items for each request with test names
  const withItems = await Promise.all(
    requestData.map(async (req: any) => {
      const items = await db
        .select({
          id: testRequestItems.id,
          testId: testRequestItems.testId,
          testName: tests.name,
          result: testRequestItems.result,
        })
        .from(testRequestItems)
        .innerJoin(tests, eq(testRequestItems.testId, tests.id))
        .where(eq(testRequestItems.testRequestId, req.id));
      return { ...req, items };
    })
  );
  return withItems;
}

export async function getTestRequestsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const requestData = await db.select().from(testRequests).where(eq(testRequests.patientId, patientId));

  // Get items for each request with test names
  const withItems = await Promise.all(
    requestData.map(async (req: any) => {
      const items = await db
        .select({
          id: testRequestItems.id,
          testId: testRequestItems.testId,
          testName: tests.name,
          result: testRequestItems.result,
        })
        .from(testRequestItems)
        .innerJoin(tests, eq(testRequestItems.testId, tests.id))
        .where(eq(testRequestItems.testRequestId, req.id));
      return { ...req, items };
    })
  );
  return withItems;
}

// ============ SYSTEM SETTINGS OPERATIONS ============

export async function getSystemSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(systemSettings);
}

export async function getSystemSetting(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  const row = rows[0] ?? null;
  if (!row) return null;

  const marker = String(row.value ?? "");
  const chunkPrefix = "__chunked_json_v1__:";
  if (!marker.startsWith(chunkPrefix)) return row;

  const partCount = Number(marker.slice(chunkPrefix.length));
  if (!Number.isFinite(partCount) || partCount <= 0) return row;

  const parts: string[] = [];
  for (let i = 0; i < partCount; i += 1) {
    const partKey = `${key}__chunk_${i}`;
    const partRows = await db.select().from(systemSettings).where(eq(systemSettings.key, partKey)).limit(1);
    parts.push(String(partRows[0]?.value ?? ""));
  }

  return {
    ...row,
    value: parts.join(""),
  };
}

export async function updateSystemSettings(key: string, value: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const chunkPrefix = "__chunked_json_v1__:";
  const maxTextBytes = 60_000;
  const chunkBytes = 24_000;
  const serialized = JSON.stringify(value);
  const payloadBytes = Buffer.byteLength(serialized, "utf8");

  const upsertRaw = async (settingKey: string, settingValue: string) => {
    const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, settingKey)).limit(1);
    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({ value: settingValue, updatedAt: new Date() })
        .where(eq(systemSettings.key, settingKey));
    } else {
      await db.insert(systemSettings).values({ key: settingKey, value: settingValue });
    }
  };

  const cleanupChunks = async () => {
    const chunkRows = await db
      .select({ key: systemSettings.key })
      .from(systemSettings)
      .where(like(systemSettings.key, `${key}__chunk_%`));
    if (chunkRows.length > 0) {
      await db
        .delete(systemSettings)
        .where(inArray(systemSettings.key, chunkRows.map((row) => String(row.key))));
    }
  };

  if (payloadBytes <= maxTextBytes) {
    await upsertRaw(key, serialized);
    await cleanupChunks();
    return;
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < serialized.length) {
    let end = cursor + Math.min(12_000, serialized.length - cursor);
    while (end < serialized.length && Buffer.byteLength(serialized.slice(cursor, end), "utf8") < chunkBytes) {
      end += 1;
    }
    if (end > serialized.length) end = serialized.length;
    while (end > cursor && Buffer.byteLength(serialized.slice(cursor, end), "utf8") > chunkBytes) {
      end -= 1;
    }
    if (end <= cursor) end = Math.min(serialized.length, cursor + 1);
    chunks.push(serialized.slice(cursor, end));
    cursor = end;
  }

  for (let i = 0; i < chunks.length; i += 1) {
    await upsertRaw(`${key}__chunk_${i}`, chunks[i]);
  }
  await upsertRaw(key, `${chunkPrefix}${chunks.length}`);

  const staleChunkRows = await db
    .select({ key: systemSettings.key })
    .from(systemSettings)
    .where(like(systemSettings.key, `${key}__chunk_%`));
  const keep = new Set(chunks.map((_, i) => `${key}__chunk_${i}`));
  const stale = staleChunkRows.map((row) => String(row.key)).filter((chunkKey) => !keep.has(chunkKey));
  if (stale.length > 0) {
    await db.delete(systemSettings).where(inArray(systemSettings.key, stale));
  }
}

// ============ USER PERMISSIONS ============

type TeamRole = "admin" | "manager" | "accountant" | "doctor" | "nurse" | "technician" | "reception";
type TeamPermissionsMap = Record<TeamRole, string[]>;
type UserPermissionSetOptions = {
  emptyMode?: "inherit" | "explicit";
  /** Non-empty list only: default "replace" (full explicit list). "inherit_extras" unions paths with live role defaults in getEffectiveUserPermissions. */
  nonEmptyMode?: "replace" | "inherit_extras";
};

const TEAM_PERMISSION_ROLES: TeamRole[] = ["admin", "manager", "accountant", "doctor", "nurse", "technician", "reception"];
const TEAM_PERMISSIONS_SETTING_KEY = "team_permissions_v1";
const EMPTY_PERMISSION_OVERRIDE = "__EMPTY_PERMISSION_OVERRIDE__";
/** When present with optional paths, effective permissions = live role defaults ∪ stored paths (extras only). */
const INHERIT_WITH_EXTRAS_MARKER = "__INHERIT_WITH_EXTRAS__";

export function normalizePermissionList(value: Iterable<unknown>) {
  return Array.from(
    new Set(
      Array.from(value)
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0)
    )
  ).sort();
}

export function arePermissionListsEqual(left: Iterable<unknown>, right: Iterable<unknown>) {
  const leftNormalized = normalizePermissionList(left);
  const rightNormalized = normalizePermissionList(right);
  if (leftNormalized.length !== rightNormalized.length) return false;
  return leftNormalized.every((entry, index) => entry === rightNormalized[index]);
}

/** Strip :r / :rw suffixes so team defaults (from Admin Permissions) match user rows saved as bare paths (from Admin Users). */
export function normalizePermissionPathsForTeamMirror(paths: Iterable<unknown>): string[] {
  return normalizePermissionList(
    Array.from(paths, (p) => String(p ?? "").trim().replace(/:r[w]?$/i, "")),
  );
}

/** True when this user's stored permissions are the same access set as the previous team snapshot for their role (sync target). */
export function userPermissionsMirrorTeamSnapshot(userPages: string[], teamPages: string[]): boolean {
  return arePermissionListsEqual(
    normalizePermissionPathsForTeamMirror(userPages),
    normalizePermissionPathsForTeamMirror(teamPages),
  );
}

export async function getUserPermissionState(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
  const rawPageIds = rows
    .map((row) => String(row.pageId ?? "").trim())
    .filter((pageId) => pageId.length > 0);
  const hasExplicitEmptyOverride = rawPageIds.includes(EMPTY_PERMISSION_OVERRIDE);
  const hasInheritExtrasMarker = rawPageIds.includes(INHERIT_WITH_EXTRAS_MARKER);
  const pageIds = rawPageIds.filter(
    (pageId) => pageId !== EMPTY_PERMISSION_OVERRIDE && pageId !== INHERIT_WITH_EXTRAS_MARKER,
  );
  return {
    hasOverride: rawPageIds.length > 0,
    hasExplicitEmptyOverride,
    hasInheritExtrasMarker,
    pageIds,
  };
}

export async function getUserPermissions(userId: number) {
  const state = await getUserPermissionState(userId);
  return state.pageIds;
}

function getDefaultTeamPermissions(): TeamPermissionsMap {
  return {
    admin: [],
    manager: [],
    accountant: ["/appointments", "/ops/mssql-add"],
    reception: [],
    nurse: [],
    technician: [],
    doctor: ["/prescription"],
  };
}

function normalizeTeamPermissions(raw: unknown): TeamPermissionsMap {
  const defaults = getDefaultTeamPermissions();
  if (!raw || typeof raw !== "object") return defaults;

  const next = { ...defaults };
  for (const role of TEAM_PERMISSION_ROLES) {
    const value = (raw as any)[role];
    if (!Array.isArray(value)) continue;
    next[role] = normalizePermissionList(value);
  }
  return next;
}

export async function getTeamPermissions(): Promise<TeamPermissionsMap> {
  const row = await getSystemSetting(TEAM_PERMISSIONS_SETTING_KEY);
  if (!row?.value) return getDefaultTeamPermissions();
  try {
    return normalizeTeamPermissions(JSON.parse(row.value));
  } catch {
    return getDefaultTeamPermissions();
  }
}

export async function setTeamPermissions(input: Partial<Record<TeamRole, string[]>>) {
  const current = await getTeamPermissions();
  const merged = normalizeTeamPermissions({ ...current, ...input });
  await updateSystemSettings(TEAM_PERMISSIONS_SETTING_KEY, merged);
}

export async function getRoleDefaultPermissions(role?: string) {
  const userRole = String(role ?? "").trim().toLowerCase() as TeamRole | "";
  if (!TEAM_PERMISSION_ROLES.includes(userRole as TeamRole)) {
    return [] as string[];
  }
  const teamPermissions = await getTeamPermissions();
  const roleKey = userRole as TeamRole;
  return teamPermissions[roleKey] ?? [];
}

export async function getEffectiveUserPermissions(userId: number, role?: string) {
  const directPermissions = await getUserPermissionState(userId);
  const inherited = await getRoleDefaultPermissions(role);
  if (directPermissions.hasExplicitEmptyOverride) {
    return normalizePermissionList([]);
  }
  if (!directPermissions.hasOverride) {
    return normalizePermissionList(inherited);
  }
  if (directPermissions.hasInheritExtrasMarker) {
    return normalizePermissionList([...inherited, ...directPermissions.pageIds]);
  }
  return normalizePermissionList(directPermissions.pageIds);
}

export async function setUserPermissions(userId: number, pageIds: string[], options: UserPermissionSetOptions = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cleanedPageIds = normalizePermissionList(pageIds);
  await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
  if (cleanedPageIds.length === 0) {
    if (options.emptyMode === "explicit") {
      await db.insert(userPermissions).values({
        userId,
        pageId: EMPTY_PERMISSION_OVERRIDE,
        createdAt: new Date(),
      });
    }
    return;
  }

  const toPersist =
    options.nonEmptyMode === "inherit_extras"
      ? [INHERIT_WITH_EXTRAS_MARKER, ...cleanedPageIds]
      : cleanedPageIds;

  await db.insert(userPermissions).values(
    toPersist.map((pageId) => ({
      userId,
      pageId,
      createdAt: new Date(),
    })),
  );
}

// ============ SHEET ENTRIES ============

export async function getSheetEntry(patientId: number, sheetType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(sheetEntries)
    .where(and(eq(sheetEntries.patientId, patientId), eq(sheetEntries.sheetType, sheetType as any)))
    .orderBy(desc(sheetEntries.updatedAt))
    .limit(1);

  return rows.length > 0 ? rows[0].content : null;
}

export async function getSheet_Entries(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(sheetEntries)
    .where(eq(sheetEntries.patientId, patientId))
    .orderBy(desc(sheetEntries.updatedAt));

  return rows;
}

export async function upsertSheetEntry(params: { patientId: number; sheetType: string; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(sheetEntries)
    .where(and(eq(sheetEntries.patientId, params.patientId), eq(sheetEntries.sheetType, params.sheetType as any)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(sheetEntries)
      .set({ content: params.content, updatedAt: new Date() })
      .where(eq(sheetEntries.id, existing[0].id));
    return { id: existing[0].id };
  }

  const result = await db.insert(sheetEntries).values({
    patientId: params.patientId,
    sheetType: params.sheetType as any,
    content: params.content,
  });
  return { id: (result as any).insertId };
}

// ============ OPERATION LISTS ============

function normalizeListDate(input: string | Date): string | null {
  if (input instanceof Date) {
    return input.toISOString().split("T")[0];
  }
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().split("T")[0];
  }
  // Handle non-standard timezone like "GM"
  const fixed = raw.replace(/\sGM$/, " GMT");
  const parsedFixed = new Date(fixed);
  if (!Number.isNaN(parsedFixed.valueOf())) {
    return parsedFixed.toISOString().split("T")[0];
  }
  // If already in YYYY-MM-DD, return as-is
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return null;
}

function normalizeOperationTypeKey(value?: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getOperationList(
  doctorTab: string,
  listDate: string | Date,
  operationType?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dateValue = normalizeListDate(listDate);
  if (!dateValue) {
    return { id: null, items: [] as any[] };
  }
  const operationTypeKey = normalizeOperationTypeKey(operationType);
  const lists = await db
    .select()
    .from(operationLists)
    .where(
      and(
        eq(operationLists.doctorTab, doctorTab),
        eq(operationLists.listDate, dateValue as any),
        operationTypeKey === null
          ? isNull(operationLists.operationType)
          : eq(operationLists.operationType, operationTypeKey)
      )
    )
    .limit(1);

  if (lists.length === 0) return { id: null, items: [] as any[] };

  const rawItems = await db.select().from(operationListItems).where(eq(operationListItems.listId, lists[0].id)).orderBy(operationListItems.id);
  const items = rawItems.map(item => ({ ...item, payment: item.payment != null ? String(item.payment) : null }));
  return {
    id: lists[0].id,
    items,
    operationType: lists[0].operationType ?? null,
    doctorName: lists[0].doctorName ?? null,
    listTime: lists[0].listTime ?? null,
  };
}

export async function getOperationListById(listId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const lists = await db.select().from(operationLists).where(eq(operationLists.id, listId)).limit(1);
  if (lists.length === 0) return { id: null, items: [] as any[] };

  const rawItemsById = await db.select().from(operationListItems).where(eq(operationListItems.listId, listId)).orderBy(operationListItems.id);
  const items = rawItemsById.map(item => ({ ...item, payment: item.payment != null ? String(item.payment) : null }));
  return {
    id: lists[0].id,
    items,
    operationType: lists[0].operationType ?? null,
    doctorName: lists[0].doctorName ?? null,
    listTime: lists[0].listTime ?? null,
    doctorTab: lists[0].doctorTab,
    listDate: lists[0].listDate,
  };
}

export async function saveOperationList(data: {
  listId?: number | null;
  doctorTab: string;
  listDate: string | Date;
  operationType?: string | null;
  doctorName?: string | null;
  listTime?: string | null;
  items: Array<{
    number?: string;
    name: string;
    phone?: string;
    doctor?: string;
    operation?: string;
    eye?: string;
    center?: boolean;
    payment?: string;
    hospital?: string;
    code?: string;
    notes?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const receiptNumbers = data.items
    .map((item) => String(item.number ?? "").trim())
    .filter((value) => value.length > 0);
  const duplicateInPayload = receiptNumbers.find((value, idx) => receiptNumbers.indexOf(value) !== idx);
  if (duplicateInPayload) {
    throw new Error(`Duplicate receipt number in list: ${duplicateInPayload}`);
  }
  const patientCodes = data.items
    .map((item) => String(item.code ?? "").trim())
    .filter((value) => value.length > 0);
  const duplicateCodeInPayload = patientCodes.find((value, idx) => patientCodes.indexOf(value) !== idx);
  if (duplicateCodeInPayload) {
    throw new Error(`Patient code cannot be repeated: ${duplicateCodeInPayload}`);
  }

  const dateValue = normalizeListDate(data.listDate);
  if (!dateValue) {
    throw new Error("Invalid listDate");
  }
  const operationTypeKey = normalizeOperationTypeKey(data.operationType);
  let listId =
    Number.isFinite(Number(data.listId ?? 0)) && Number(data.listId) > 0
      ? Number(data.listId)
      : null;

  if (!listId) {
    const existing = await db
      .select()
      .from(operationLists)
      .where(
        and(
          eq(operationLists.doctorTab, data.doctorTab),
          eq(operationLists.listDate, dateValue as any),
          operationTypeKey === null
            ? isNull(operationLists.operationType)
            : eq(operationLists.operationType, operationTypeKey)
        )
      )
      .limit(1);
    listId = existing.length > 0 ? existing[0].id : null;
  }
  if (receiptNumbers.length > 0) {
    const conflicts = await db
      .select({
        listId: operationListItems.listId,
        number: operationListItems.number,
      })
      .from(operationListItems)
      .where(inArray(operationListItems.number, receiptNumbers));
    const conflict = conflicts.find((row) => {
      if (!row?.number) return false;
      if (!listId) return true;
      return Number(row.listId) !== Number(listId);
    });
    if (conflict?.number) {
      throw new Error(`Receipt number already exists: ${conflict.number}`);
    }
  }
  if (patientCodes.length > 0) {
    const codeConflicts = await db
      .select({
        listId: operationListItems.listId,
        code: operationListItems.code,
      })
      .from(operationListItems)
      .where(inArray(operationListItems.code, patientCodes));
    const codeConflict = codeConflicts.find((row) => {
      if (!row?.code) return false;
      if (!listId) return true;
      return Number(row.listId) !== Number(listId);
    });
    if (codeConflict?.code) {
      throw new Error(`Patient code already exists in another record: ${codeConflict.code}`);
    }
  }

  if (!listId) {
    await db.insert(operationLists).values({
      doctorTab: data.doctorTab,
      listDate: dateValue as any,
      operationType: operationTypeKey,
      doctorName: data.doctorName ?? null,
      listTime: data.listTime ?? null,
    });

    // Query it back to get the ID (Drizzle doesn't return insertId)
    const created = await db
      .select()
      .from(operationLists)
      .where(
        and(
          eq(operationLists.doctorTab, data.doctorTab),
          eq(operationLists.listDate, dateValue as any),
          operationTypeKey === null
            ? isNull(operationLists.operationType)
            : eq(operationLists.operationType, operationTypeKey)
        )
      )
      .limit(1);

    if (created.length > 0) {
      listId = created[0].id;
    } else {
      throw new Error("Failed to create operation list");
    }
  } else {
    const duplicateTarget = await db
      .select({ id: operationLists.id })
      .from(operationLists)
      .where(
        and(
          eq(operationLists.doctorTab, data.doctorTab),
          eq(operationLists.listDate, dateValue as any),
          operationTypeKey === null
            ? isNull(operationLists.operationType)
            : eq(operationLists.operationType, operationTypeKey)
        )
      )
      .limit(1);
    if (duplicateTarget.length > 0 && Number(duplicateTarget[0].id) !== Number(listId)) {
      throw new Error("A different list already exists for this doctor/date/type");
    }

    await db.update(operationLists).set({
      doctorTab: data.doctorTab,
      listDate: dateValue as any,
      operationType: operationTypeKey,
      doctorName: data.doctorName ?? null,
      listTime: data.listTime ?? null,
      updatedAt: new Date(),
    }).where(eq(operationLists.id, listId));
    await db.delete(operationListItems).where(eq(operationListItems.listId, listId));
  }

  if (listId) {
    await db.insert(operationListItems).values(
      data.items.map((item) => ({
        listId,
        number: item.number ?? null,
        name: item.name,
        phone: item.phone ?? null,
        doctor: item.doctor ?? null,
        operation: item.operation ?? null,
        eye: item.eye ?? null,
        center: !!(item.center),
        payment: item.payment ?? null,
        hospital: item.hospital ?? null,
        code: item.code ?? null,
        notes: item.notes ?? null,
      }))
    );
  }

  return { id: listId };
}

export async function deleteOperationList(doctorTab: string, listDate: string | Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dateValue = normalizeListDate(listDate);
  if (!dateValue) return;
  const existing = await db
    .select()
    .from(operationLists)
    .where(and(eq(operationLists.doctorTab, doctorTab), eq(operationLists.listDate, dateValue as any)))
    .limit(1);

  if (existing.length === 0) return;

  await db.delete(operationListItems).where(eq(operationListItems.listId, existing[0].id));
  await db.delete(operationLists).where(eq(operationLists.id, existing[0].id));
}

export async function deleteOperationListById(listId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(operationListItems).where(eq(operationListItems.listId, listId));
  await db.delete(operationLists).where(eq(operationLists.id, listId));
}

export async function getOperationListsHistory() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(operationLists)
    .orderBy(desc(operationLists.listDate), desc(operationLists.updatedAt), desc(operationLists.id));
}

export async function getOperationListsHistoryWithItems() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const lists = await db
    .select()
    .from(operationLists)
    .orderBy(desc(operationLists.listDate), desc(operationLists.updatedAt), desc(operationLists.id));

  if (lists.length === 0) return [];

  const items = await db
    .select()
    .from(operationListItems)
    .orderBy(operationListItems.id);

  const byList = new Map<number, Array<{
    id: number;
    number: string | null;
    name: string | null;
    phone: string | null;
    doctor: string | null;
    operation: string | null;
    eye: string | null;
    center: boolean;
    payment: string | null;
    hospital: string | null;
    code: string | null;
  }>>();
  items.forEach((item: any) => {
    if (!byList.has(item.listId)) byList.set(item.listId, []);
    byList.get(item.listId)!.push({
      id: item.id,
      number: item.number ?? null,
      name: item.name ?? null,
      phone: item.phone ?? null,
      doctor: item.doctor ?? null,
      operation: item.operation ?? null,
      eye: item.eye ?? null,
      center: item.center,
      payment: item.payment ?? null,
      hospital: item.hospital ?? null,
      code: item.code ?? null,
    });
  });

  return lists.map((list: any) => ({
    ...list,
    items: byList.get(list.id) ?? [],
  }));
}

export async function getOperationListsByDate(dateString: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const lists = await db
    .select()
    .from(operationLists)
    .where(eq(operationLists.listDate, dateString as any))
    .orderBy(desc(operationLists.listDate), desc(operationLists.updatedAt));

  if (lists.length === 0) return [];

  const items = await db
    .select()
    .from(operationListItems)
    .orderBy(operationListItems.id);

  const byList = new Map<number, Array<{
    id: number;
    number: string | null;
    name: string | null;
    phone: string | null;
    doctor: string | null;
    operation: string | null;
    eye: string | null;
    center: boolean;
    payment: string | null;
    hospital: string | null;
    code: string | null;
  }>>();
  items.forEach((item: any) => {
    if (!byList.has(item.listId)) byList.set(item.listId, []);
    byList.get(item.listId)!.push({
      id: item.id,
      number: item.number ?? null,
      name: item.name ?? null,
      phone: item.phone ?? null,
      doctor: item.doctor ?? null,
      operation: item.operation ?? null,
      eye: item.eye ?? null,
      center: item.center,
      payment: item.payment ?? null,
      hospital: item.hospital ?? null,
      code: item.code ?? null,
    });
  });

  return lists.map((list: any) => ({
    ...list,
    items: byList.get(list.id) ?? [],
  }));
}

export async function getOperationBookingsByDateRange(
  fromDate: string,
  toDate: string,
): Promise<OperationBooking[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const from = normalizeListDate(fromDate);
  const to = normalizeListDate(toDate);
  if (!from || !to) return [];
  return await db
    .select()
    .from(operationBookings)
    .where(and(gte(operationBookings.bookingDate, from as any), lte(operationBookings.bookingDate, to as any)))
    .orderBy(operationBookings.bookingDate, operationBookings.bookingTime);
}

export async function createOperationBooking(data: InsertOperationBooking): Promise<OperationBooking> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const bookingDate = normalizeListDate(data.bookingDate as any);
  if (!bookingDate) throw new Error("Invalid booking date");
  const result: any = await db.insert(operationBookings).values({
    ...data,
    bookingDate: bookingDate as any,
  });
  const insertId = Number(result?.insertId ?? result?.[0]?.insertId ?? 0);
  const rows = await db
    .select()
    .from(operationBookings)
    .where(eq(operationBookings.id, insertId))
    .limit(1);
  if (!rows[0]) throw new Error("Failed to create operation booking");
  return rows[0];
}

export async function updateOperationBooking(
  id: number,
  data: Partial<InsertOperationBooking>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updates: Partial<InsertOperationBooking> = { ...data };
  if (updates.bookingDate != null) {
    const bookingDate = normalizeListDate(updates.bookingDate as any);
    if (!bookingDate) throw new Error("Invalid booking date");
    updates.bookingDate = bookingDate as any;
  }
  await db.update(operationBookings).set(updates).where(eq(operationBookings.id, id));
}

export async function deleteOperationBooking(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(operationBookings).where(eq(operationBookings.id, id));
}

export async function getTodayOperationBookingsGrouped(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const dateValue = normalizeListDate(date);
  if (!dateValue) return [];

  const results = await db
    .select({
      doctorName: operationBookings.doctorName,
      operationType: operationBookings.operationType,
      totalCount: sql<number>`sum(${operationBookings.casesCount})`,
      bookingDate: operationBookings.bookingDate,
    })
    .from(operationBookings)
    .where(eq(operationBookings.bookingDate, dateValue as any))
    .groupBy(operationBookings.doctorName, operationBookings.operationType, operationBookings.bookingDate);

  return results;
}

export async function getAutoOperationListsByDate(dateString: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizeCode = (value: unknown) => String(value ?? "").trim().toLowerCase();

  const dateValue = normalizeListDate(dateString);
  if (!dateValue) return [];

  const surgeryCodes = new Set<string>();
  try {
    const setting = await getSystemSetting("service_directory");
    const parsed = setting?.value ? JSON.parse(String(setting.value)) : [];
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        const code = normalizeCode((entry as any)?.code);
        const active = (entry as any)?.isActive !== false;
        const serviceType = String((entry as any)?.serviceType ?? "").trim().toLowerCase();
        const category = String((entry as any)?.category ?? "").trim().toLowerCase();
        const defaultSheet = String((entry as any)?.defaultSheet ?? "").trim().toLowerCase();
        const isSurgery =
          serviceType === "surgery" ||
          category === "operations" ||
          defaultSheet === "surgery" ||
          defaultSheet === "surgery_center" ||
          defaultSheet === "surgery_external";
        if (code && active && isSurgery) {
          surgeryCodes.add(code);
        }
      }
    }
  } catch {
    // best-effort fallback: no auto items when mapping is not readable
  }
  if (surgeryCodes.size === 0) return [];

  const rows = await db
    .select({
      entryId: patientServiceEntries.id,
      patientId: patientServiceEntries.patientId,
      serviceCode: patientServiceEntries.serviceCode,
      serviceName: patientServiceEntries.serviceName,
      serviceDate: patientServiceEntries.serviceDate,
      updatedAt: patientServiceEntries.updatedAt,
      fullName: patients.fullName,
      patientCode: patients.patientCode,
      doctorCode: patients.doctorCode,
      doctorName: doctorsLookup.name,
    })
    .from(patientServiceEntries)
    .innerJoin(patients, eq(patientServiceEntries.patientId, patients.id))
    .leftJoin(doctorsLookup, eq(patients.doctorCode, doctorsLookup.code))
    .where(
      and(
        eq(patientServiceEntries.source, "mssql"),
        sql`(
          DATE(COALESCE(${patientServiceEntries.serviceDate}, ${patientServiceEntries.updatedAt})) = ${dateValue}
          OR DATE(DATE_ADD(COALESCE(${patientServiceEntries.serviceDate}, ${patientServiceEntries.updatedAt}), INTERVAL 2 HOUR)) = ${dateValue}
          OR DATE(DATE_ADD(COALESCE(${patientServiceEntries.serviceDate}, ${patientServiceEntries.updatedAt}), INTERVAL 3 HOUR)) = ${dateValue}
        )`
      )
    )
    .orderBy(desc(patientServiceEntries.updatedAt), desc(patientServiceEntries.id));

  const filtered = rows.filter((row: any) => surgeryCodes.has(normalizeCode((row as any).serviceCode)));
  if (filtered.length === 0) return [];

  const byDoctor = new Map<string, any[]>();
  for (const row of filtered as any[]) {
    const doctor =
      String(row.doctorName ?? "").trim() ||
      (String(row.doctorCode ?? "").trim() ? `د/${String(row.doctorCode ?? "").trim()}` : "عمليات (MSSQL)");
    if (!byDoctor.has(doctor)) byDoctor.set(doctor, []);
    byDoctor.get(doctor)!.push(row);
  }

  let listIdSeed = 900000000;
  const out: any[] = [];
  for (const [doctor, doctorRows] of byDoctor.entries()) {
    const items = doctorRows.map((row: any) => ({
      id: Number(row.entryId),
      number: null,
      name: String(row.fullName ?? "").trim() || `Patient #${row.patientId}`,
      phone: null,
      doctor,
      operation: String(row.serviceName ?? "").trim() || String(row.serviceCode ?? "").trim() || "Surgery Service",
      eye: null,
      center: true,
      payment: null,
      hospital: null,
      code: String(row.patientCode ?? "").trim() || null,
    }));

    out.push({
      id: listIdSeed++,
      doctorTab: doctor,
      doctorName: doctor,
      doctorFullName: doctor,
      listDate: dateValue,
      operationType: "Auto Synced",
      listTime: null,
      isAutoFromMssql: true,
      items,
    });
  }

  return out;
}

// ============ PUSH DEVICE REGISTRATIONS ============

export async function upsertPushDeviceRegistration(input: {
  userId: number;
  provider?: "fcm";
  platform: "android" | "ios" | "web";
  token: string;
  deviceId?: string | null;
  appVersion?: string | null;
  build?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = String(input.token ?? "").trim();
  if (!token) throw new Error("Push token is required");

  const userId = Number(input.userId);
  if (!Number.isFinite(userId) || userId <= 0) throw new Error("Valid userId is required");

  const existingByToken = await db
    .select()
    .from(pushDeviceRegistrations)
    .where(eq(pushDeviceRegistrations.token, token))
    .limit(1);

  const payload = {
    userId,
    provider: "fcm" as const,
    platform: input.platform,
    token,
    deviceId: input.deviceId ? String(input.deviceId).trim() : null,
    appVersion: input.appVersion ? String(input.appVersion).trim() : null,
    build: input.build ? String(input.build).trim() : null,
    lastSeenAt: new Date(),
    disabledAt: null,
  };

  if (existingByToken.length > 0) {
    await db
      .update(pushDeviceRegistrations)
      .set({
        ...payload,
        updatedAt: new Date(),
      } as any)
      .where(eq(pushDeviceRegistrations.id, existingByToken[0].id));
    return existingByToken[0].id;
  }

  if (payload.deviceId) {
    const existingByDevice = await db
      .select()
      .from(pushDeviceRegistrations)
      .where(and(eq(pushDeviceRegistrations.userId, userId), eq(pushDeviceRegistrations.deviceId, payload.deviceId)))
      .limit(1);

    if (existingByDevice.length > 0) {
      await db
        .update(pushDeviceRegistrations)
        .set({
          ...payload,
          updatedAt: new Date(),
        } as any)
        .where(eq(pushDeviceRegistrations.id, existingByDevice[0].id));
      return existingByDevice[0].id;
    }
  }

  const result = await db.insert(pushDeviceRegistrations).values(payload as any);
  const registrationId = (result as any)?.insertId as number | undefined;
  if (!registrationId) {
    throw new Error("Failed to register push device - no ID returned from database");
  }
  return registrationId;
}

export async function disablePushDeviceToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalized = String(token ?? "").trim();
  if (!normalized) return;
  await db
    .update(pushDeviceRegistrations)
    .set({ disabledAt: new Date(), updatedAt: new Date() } as any)
    .where(eq(pushDeviceRegistrations.token, normalized));
}

export async function deletePushDeviceToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalized = String(token ?? "").trim();
  if (!normalized) return;
  await db.delete(pushDeviceRegistrations).where(eq(pushDeviceRegistrations.token, normalized));
}

export async function getActivePushDeviceRegistrations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(pushDeviceRegistrations)
    .where(sql`${pushDeviceRegistrations.disabledAt} IS NULL`)
    .orderBy(desc(pushDeviceRegistrations.lastSeenAt), desc(pushDeviceRegistrations.id));
}

export async function getPushDeviceRegistrations(filter: {
  platform?: "android" | "ios" | "web";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [sql`${pushDeviceRegistrations.disabledAt} IS NULL`];
  if (filter.platform) {
    conditions.push(eq(pushDeviceRegistrations.platform, filter.platform));
  }

  return await db
    .select()
    .from(pushDeviceRegistrations)
    .where(and(...conditions))
    .orderBy(desc(pushDeviceRegistrations.lastSeenAt), desc(pushDeviceRegistrations.id));
}

export async function getActivePushDeviceRegistrationsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(pushDeviceRegistrations)
    .where(and(eq(pushDeviceRegistrations.userId, userId), sql`${pushDeviceRegistrations.disabledAt} IS NULL`))
    .orderBy(desc(pushDeviceRegistrations.lastSeenAt), desc(pushDeviceRegistrations.id));
}

// ============ PAGE STATE (USER/PATIENT) ============

export async function getUserPageState(userId: number, page: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(userPageStates)
    .where(and(eq(userPageStates.userId, userId), eq(userPageStates.page, page)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertUserPageState(userId: number, page: string, data: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(userPageStates)
    .where(and(eq(userPageStates.userId, userId), eq(userPageStates.page, page)))
    .limit(1);
  if (!existing.length) {
    await db.insert(userPageStates).values({ userId, page, data: data as any });
    return;
  }
  await db.update(userPageStates).set({ data: data as any }).where(eq(userPageStates.id, existing[0].id));
}

const PASSWORD_CHANGE_STATE_PAGE = "__security_password_change__";

export async function isPasswordChangeRequired(userId: number) {
  const state = await getUserPageState(userId, PASSWORD_CHANGE_STATE_PAGE);
  const payload = state?.data as { changedAt?: string } | null | undefined;
  return !(payload && typeof payload.changedAt === "string" && payload.changedAt.trim().length > 0);
}

export async function markPasswordChanged(userId: number) {
  await upsertUserPageState(userId, PASSWORD_CHANGE_STATE_PAGE, {
    changedAt: new Date().toISOString(),
  });
}

export async function getPatientPageState(patientId: number, page: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(patientPageStates)
    .where(and(eq(patientPageStates.patientId, patientId), eq(patientPageStates.page, page)))
    .orderBy(desc(patientPageStates.updatedAt), desc(patientPageStates.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertPatientPageState(patientId: number, page: string, data: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existingRows = await db
    .select()
    .from(patientPageStates)
    .where(and(eq(patientPageStates.patientId, patientId), eq(patientPageStates.page, page)))
    .orderBy(desc(patientPageStates.updatedAt), desc(patientPageStates.id))
    .limit(1);
  if (!existingRows.length) {
    await db.insert(patientPageStates).values({ patientId, page, data: data as any });
    return;
  }
  const target = existingRows[0];
  await db
    .update(patientPageStates)
    .set({ data: data as any, updatedAt: new Date() })
    .where(eq(patientPageStates.id, target.id));
}

export async function upsertPatientServiceEntry(input: {
  patientId: number;
  serviceCode: string;
  serviceName?: string | null;
  source?: "mssql" | "manual" | "import";
  sourceRef: string;
  serviceDate?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sourceRef = String(input.sourceRef ?? "").trim();
  if (!sourceRef) return;
  const existing = await db
    .select()
    .from(patientServiceEntries)
    .where(eq(patientServiceEntries.sourceRef, sourceRef))
    .limit(1);
  const payload = {
    patientId: Number(input.patientId),
    serviceCode: String(input.serviceCode ?? "").trim(),
    serviceName: input.serviceName ? String(input.serviceName).trim() : null,
    source: (input.source ?? "mssql") as any,
    sourceRef,
    serviceDate: input.serviceDate ? String(input.serviceDate).slice(0, 10) : null,
  };
  if (!payload.patientId || !payload.serviceCode) return;
  if (!existing.length) {
    await db.insert(patientServiceEntries).values(payload as any);
    return;
  }
  await db
    .update(patientServiceEntries)
    .set({
      patientId: payload.patientId,
      serviceCode: payload.serviceCode,
      serviceName: payload.serviceName,
      source: payload.source,
      serviceDate: payload.serviceDate as any,
      updatedAt: new Date(),
    } as any)
    .where(eq(patientServiceEntries.id, existing[0].id));
}

export async function getPatientServiceEntriesByPatients(patientIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const ids = Array.from(new Set(patientIds.filter((id) => Number.isFinite(id))));
  if (!ids.length) return [];
  return await db
    .select()
    .from(patientServiceEntries)
    .where(inArray(patientServiceEntries.patientId, ids))
    .orderBy(desc(patientServiceEntries.updatedAt));
}

export async function getPatientServiceEntriesByPatient(patientId: number) {
  const rows = await getPatientServiceEntriesByPatients([patientId]);
  return rows.filter((row: any) => Number((row as any).patientId) === Number(patientId));
}

// ============ DISEASES ============

export async function getAllDiseases() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(diseases).orderBy(desc(diseases.id));
}

export async function createDisease(name: string, branch?: string | null, abbrev?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(diseases).values({ name, branch: branch || null, abbrev: abbrev || null });
}

export async function updateDisease(diseaseId: number, name: string, branch?: string | null, abbrev?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(diseases).set({ name, branch: branch || null, abbrev: abbrev || null }).where(eq(diseases.id, diseaseId));
}

export async function deleteDisease(diseaseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(diseases).where(eq(diseases.id, diseaseId));
}
// ============ QUEUE & PATIENT RETRIEVAL ============

/**
 * Get all patients who have visits today
 */
export async function getTodayPatients(dateIso: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      id: patients.id,
      patientCode: patients.patientCode,
      fullName: patients.fullName,
      phone: patients.phone,
      serviceType: patients.serviceType,
      doctorId: patients.doctorId,
    })
    .from(patients)
    .where(
      sql`EXISTS (
        SELECT 1 FROM ${visits}
        WHERE ${visits.patientId} = ${patients.id}
          AND DATE(${visits.visitDate}) = ${dateIso}
      )`
    )
    .limit(500);

  return rows.map(row => ({
    ...decodePatientRow(row as any),
    doctorName: null,
  }));
}

/**
 * Get visits for a specific date with patient and doctor info
 */
export async function getTodayVisitsByQueueStatus(dateIso: string, queueStatus?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereClauses: any[] = [sql`DATE(${visits.visitDate}) = ${dateIso}`];
  if (queueStatus) {
    whereClauses.push(eq(visits.queueStatus, queueStatus as any));
  }

  const rows = await db
    .select({
      id: visits.id,
      patientId: visits.patientId,
      patientCode: patients.patientCode,
      patientFullName: patients.fullName,
      patientPhone: patients.phone,
      patientServiceType: patients.serviceType,
      patientLocationType: patients.locationType,
      patientDoctorId: patients.doctorId,
      patientDoctorCode: patients.doctorCode,
      visitDate: visits.visitDate,
      visitType: visits.visitType,
      queueStatus: visits.queueStatus,
      checkedInAt: visits.checkedInAt,
      checkedInTime: sql<string>`DATE_FORMAT(${visits.checkedInAt}, '%H:%i')`,
      movedToNextAt: visits.movedToNextAt,
      movedToClinicAt: visits.movedToClinicAt,
      treatedAt: visits.treatedAt,
      doctorName: doctorsLookup.name,
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .leftJoin(doctorsLookup, sql`${doctorsLookup.id} = ${patients.doctorId}`)
    .where(and(...whereClauses))
    .orderBy(visits.id)
    .limit(500);

  return rows.map(row => ({
    ...row,
    patientFullName: decodeMojibake(row.patientFullName),
    doctorName: row.doctorName ?? null,
  }));
}

export async function getMedicalTotals() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [patientsRows, autorefRows, refractionRows, pentacamRows, operationsRows] = await Promise.all([
    db.select({ c: sql<number>`COUNT(*)` }).from(patients),
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(autorefractometryData)
      .where(sql`(
        NULLIF(TRIM(COALESCE(${autorefractometryData.sphereOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.cylinderOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.axisOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.ucvaOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.bcvaOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.iopOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.sphereOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.cylinderOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.axisOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.ucvaOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.bcvaOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${autorefractometryData.iopOS}, '')), '') IS NOT NULL
      )`),
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(glassesRecords)
      .where(sql`(
        NULLIF(TRIM(COALESCE(${glassesRecords.sOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.cOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.axisOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.pdOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.sOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.cOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.axisOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.pdOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.addOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${glassesRecords.addOS}, '')), '') IS NOT NULL
      )`),
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(pentacamResults)
      .where(sql`(
        NULLIF(TRIM(COALESCE(${pentacamResults.pachymetryOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.pachymetryOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.k1OD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.k2OD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.axisOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.thinnestPointOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.apexOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.residualOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.tttOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.ablationOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.k1OS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.k2OS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.axisOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.thinnestPointOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.apexOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.residualOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.tttOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.ablationOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.keratometryOD}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.keratometryOS}, '')), '') IS NOT NULL OR
        NULLIF(TRIM(COALESCE(${pentacamResults.notes}, '')), '') IS NOT NULL
      )`),
    db.select({ c: sql<number>`COUNT(*)` }).from(appointments),
  ]);

  return {
    patients: Number(patientsRows[0]?.c ?? 0),
    autoref: Number(autorefRows[0]?.c ?? 0),
    refraction: Number(refractionRows[0]?.c ?? 0),
    pentacam: Number(pentacamRows[0]?.c ?? 0),
    operations: Number(operationsRows[0]?.c ?? 0),
  };
}

/**
 * Daily rollover: mark all previous-day non-treated queue visits as treated.
 * This keeps each new day queue clean without manual cleanup.
 */
export async function rolloverPreviousQueueVisitsAsTreated(dateIso: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(visits)
    .set({
      queueStatus: "treated",
      treatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        sql`DATE(${visits.visitDate}) < ${dateIso}`,
        sql`${visits.queueStatus} IN ('checkedIn', 'next', 'clinic')`,
      ),
    );
}

/**
 * Auto-advance patients through queue based on current state.
 * يُستدعى قبل قراءة طابور اليوم. بعد ترقية next→clinic يجب إعادة قراءة الطابور؛ النسخة السابقة كانت تستخدم لقطات قديمة فلا يُعبَّأ «التالي» من «تسجيل».
 */
export async function autoAdvanceQueuePatients(dateIso: string) {
  const connMaybe = await getDb();
  if (!connMaybe) throw new Error("Database not available");
  const conn = connMaybe;

  const nonExternalExpr = sql`(
    ${patients.locationType} IS NULL
    OR LOWER(TRIM(${patients.locationType})) NOT IN ('external', 'خارجي', 'outside', 'out')
  )`;

  const dayMatch = sql`DATE(${visits.visitDate}) = ${dateIso}`;

  async function firstVisitId(status: "clinic" | "next" | "checkedIn"): Promise<number | undefined> {
    const rows = await conn
      .select({ id: visits.id })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(and(dayMatch, nonExternalExpr, eq(visits.queueStatus, status)))
      .orderBy(visits.id)
      .limit(1);
    return rows[0]?.id;
  }

  async function checkedInOrderedIds(limit: number): Promise<number[]> {
    const rows = await conn
      .select({ id: visits.id })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(and(dayMatch, nonExternalExpr, eq(visits.queueStatus, "checkedIn")))
      .orderBy(visits.id)
      .limit(limit);
    return rows.map((r) => r.id);
  }

  // 1) عيادة فارغة لكن يوجد «التالي» → صعود إلى عيادة
  let clinicId = await firstVisitId("clinic");
  const nextHead = await firstVisitId("next");
  if (clinicId == null && nextHead != null) {
    await conn
      .update(visits)
      .set({ queueStatus: "clinic", movedToClinicAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(visits.id, nextHead));
  }

  // 2) لا يزال لا يوجد في العيادة → أقدم «تسجيل»
  clinicId = await firstVisitId("clinic");
  if (clinicId == null) {
    const checked = await checkedInOrderedIds(1);
    if (checked.length === 0) return;
    await conn
      .update(visits)
      .set({ queueStatus: "clinic", movedToClinicAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(visits.id, checked[0]));
    clinicId = checked[0];
  }

  // 3) لا يوجد «التالي» → أقدم «تسجيل» غير من occupies العيادة (بعد قراءة حالة حديثة)
  const nextAfter = await firstVisitId("next");
  if (nextAfter != null) return;

  clinicId = await firstVisitId("clinic");
  const checkedList = await checkedInOrderedIds(12);
  const nextCandidate = checkedList.find((id) => id !== clinicId);
  if (nextCandidate != null) {
    await conn
      .update(visits)
      .set({ queueStatus: "next", movedToNextAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(visits.id, nextCandidate));
  }
}

/**
 * Delete all patients
 */
export async function deleteAllPatients() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(patients);
  return { deletedCount: 0 };
}

/**
 * Update visit queue status and set the corresponding timestamp
 */
export async function updateVisitQueueStatus(visitId: number, queueStatus: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const timestampCol: Record<string, any> = {};
  if (queueStatus === "checkedIn")  timestampCol.checkedInAt     = sql`CURRENT_TIMESTAMP`;
  if (queueStatus === "next")       timestampCol.movedToNextAt   = sql`CURRENT_TIMESTAMP`;
  if (queueStatus === "clinic")     timestampCol.movedToClinicAt = sql`CURRENT_TIMESTAMP`;
  if (queueStatus === "treated")    timestampCol.treatedAt       = sql`CURRENT_TIMESTAMP`;

  await db
    .update(visits)
    .set({ queueStatus: queueStatus as any, ...timestampCol })
    .where(eq(visits.id, visitId));
}

export async function getVisitDateIsoById(visitId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ visitDateIso: sql<string>`DATE_FORMAT(${visits.visitDate}, '%Y-%m-%d')` })
    .from(visits)
    .where(eq(visits.id, visitId))
    .limit(1);
  const raw = String(rows[0]?.visitDateIso ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/**
 * When a visit is marked treated, cascade: move next→clinic and checkedIn→next
 */
export async function cascadeQueueStatus(dateIso: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const nonExternalExpr = sql`(
    ${patients.locationType} IS NULL
    OR LOWER(TRIM(${patients.locationType})) NOT IN ('external', 'خارجي', 'outside', 'out')
  )`;

  // Move the first non-external "next" visit to "clinic"
  const nextVisits = await db
    .select({ id: visits.id })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(
      sql`DATE(${visits.visitDate}) = ${dateIso}`,
      nonExternalExpr,
      eq(visits.queueStatus, "next")
    ))
    .orderBy(visits.id)
    .limit(1);

  if (nextVisits.length > 0) {
    await db
      .update(visits)
      .set({ queueStatus: "clinic", movedToClinicAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(visits.id, nextVisits[0].id));
  }

  // Move the first non-external "checkedIn" visit to "next"
  const checkedInVisits = await db
    .select({ id: visits.id })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(
      sql`DATE(${visits.visitDate}) = ${dateIso}`,
      nonExternalExpr,
      eq(visits.queueStatus, "checkedIn")
    ))
    .orderBy(visits.id)
    .limit(1);

  if (checkedInVisits.length > 0) {
    await db
      .update(visits)
      .set({ queueStatus: "next", movedToNextAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(visits.id, checkedInVisits[0].id));
  }
}

export async function insertVisitScheduleRequest(
  row: Omit<InsertVisitScheduleRequest, "id" | "createdAt" | "updatedAt">,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result: unknown = await db.insert(visitScheduleRequests).values(row);
  const r = result as { insertId?: number; [0]?: { insertId?: number } };
  let insertId = Number(r?.insertId ?? r?.[0]?.insertId ?? 0);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    const [latest] = await db
      .select({ id: visitScheduleRequests.id })
      .from(visitScheduleRequests)
      .orderBy(desc(visitScheduleRequests.id))
      .limit(1);
    insertId = Number(latest?.id ?? 0);
  }
  return { id: insertId };
}

export async function getVisitScheduleRequestsByDate(dateIso: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(visitScheduleRequests)
    .where(eq(visitScheduleRequests.visitDate, dateIso as any))
    .orderBy(asc(visitScheduleRequests.createdAt), asc(visitScheduleRequests.id));
}

export async function getVisitScheduleRequestById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [row] = await db
    .select()
    .from(visitScheduleRequests)
    .where(eq(visitScheduleRequests.id, id))
    .limit(1);
  return row ?? null;
}

export async function deleteVisitScheduleRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(visitScheduleRequests).where(eq(visitScheduleRequests.id, id));
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  userId: number,
  action: string,
  entityType: string,
  entityId: number,
  changes?: Record<string, any>
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log audit event: database not available");
    return;
  }

  const logData: InsertAuditLog = {
    adminId: userId,
    action,
    entityType,
    entityId,
    changes: changes ? JSON.stringify(changes) : null,
    createdAt: new Date(),
  };

  await createAuditLog(logData);
}

// ============ STOCKROOM OPERATIONS ============

export async function getStockItems(category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(stockItems);
  if (category) {
    query = query.where(eq(stockItems.category, category)) as any;
  }
  return await query.orderBy(asc(stockItems.name));
}

export async function getStockItemByCode(itemCode: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(stockItems).where(eq(stockItems.itemCode, itemCode)).limit(1);
  return rows[0] ?? null;
}

export async function getStockItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(stockItems).where(eq(stockItems.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertStockItem(data: InsertStockItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result: any = await db.insert(stockItems).values(data);
  const insertId = Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
  return { insertId };
}

export async function updateStockItem(id: number, updates: Partial<InsertStockItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stockItems).set(updates).where(eq(stockItems.id, id));
}

export async function insertStockTransaction(data: InsertStockTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Start a transaction to update quantity and log movement
  return await db.transaction(async (tx) => {
    // 1. Insert transaction log
    const result: any = await tx.insert(stockTransactions).values(data);
    const txId = Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
    
    // 2. Get current item
    const [item] = await tx.select().from(stockItems).where(eq(stockItems.id, data.itemId)).limit(1);
    if (!item) throw new Error("Item not found");
    
    // 3. Calculate new quantity
    let newQuantity = item.quantity;
    if (data.type === 'add') {
      newQuantity += data.quantity;
    } else if (data.type === 'dispense') {
      newQuantity -= data.quantity;
    }
    
    if (newQuantity < 0) throw new Error("Insufficient stock quantity");
    
    // 4. Update item quantity and status
    let status: "متوفر" | "كمية قليلة" | "نفذ المخزون" = "متوفر";
    if (newQuantity === 0) status = "نفذ المخزون";
    else if (newQuantity < 10) status = "كمية قليلة"; // Threshold can be item-specific in real app
    
    await tx.update(stockItems)
      .set({ quantity: newQuantity, status, updatedAt: new Date() })
      .where(eq(stockItems.id, data.itemId));
      
    return { txId, newQuantity };
  });
}

export async function getStockTransactions(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  
  const rows = await db
    .select({
      id: stockTransactions.id,
      itemId: stockTransactions.itemId,
      type: stockTransactions.type,
      quantity: stockTransactions.quantity,
      unitPrice: stockTransactions.unitPrice,
      totalValue: stockTransactions.totalValue,
      employeeName: stockTransactions.employeeName,
      performedBy: stockTransactions.performedBy,
      createdAt: stockTransactions.createdAt,
      itemName: stockItems.name,
      itemCategory: stockItems.category,
    })
    .from(stockTransactions)
    .innerJoin(stockItems, eq(stockTransactions.itemId, stockItems.id))
    .orderBy(desc(stockTransactions.createdAt))
    .limit(limit);
    
  return rows;
}

