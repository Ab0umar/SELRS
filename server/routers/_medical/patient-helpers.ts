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
import {
  CONSULTANT_CODES,
  SPECIALIST_CODES,
  XRAY_CODES,
} from "./service-helpers";

export function resolvePatientNotifTitle(serviceCodes: string[]): string {
  const codes = new Set(
    serviceCodes.map((c) => String(c).trim()).filter(Boolean),
  );
  if (codes.has("1501") && codes.has("1502")) return "حجز فحص ليزك جديد";
  if ([...codes].some((c) => CONSULTANT_CODES.has(c)))
    return "حجز كشف استشاري جديد";
  if ([...codes].some((c) => SPECIALIST_CODES.has(c)))
    return "حجز كشف أخصائي جديد";
  if ([...codes].some((c) => XRAY_CODES.has(c))) return "حجز اشعه جديد";
  return "حجز جديد";
}

export function resolveNotificationTargetRolesByUserRole(
  role: unknown,
): string[] | null {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase();
  if (normalizedRole === "reception" || normalizedRole === "accountant") return null;
  if (normalizedRole === "nurse" || normalizedRole === "technician")
    return ["doctor"];
  return null;
}

export function normalizePhoneKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D+/g, "");
  return digits || raw.toLowerCase();
}

// Arabic diacritics (U+064B-U+065F, U+0670) and tatweel (U+0640).
const DIACRITICS_AND_TATWEEL = new RegExp(
  `[${String.fromCharCode(0x064b)}-${String.fromCharCode(0x065f)}${String.fromCharCode(0x0670)}${String.fromCharCode(0x0640)}]`,
  "g",
);

/** Name as written by reception: spacing, diacritics and the usual alef/ya/ta-marbuta variants ignored. */
export function canonicalPatientName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(DIACRITICS_AND_TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/** Egyptian numbers compared as 01XXXXXXXXX whether typed with +20, 0020 or the leading zero. */
export function canonicalPatientPhone(value: unknown): string {
  const digits = normalizePhoneKey(value);
  if (/^0020\d{10}$/.test(digits)) return `0${digits.slice(4)}`;
  if (/^20\d{10}$/.test(digits)) return `0${digits.slice(2)}`;
  return digits;
}

/** Substring that finds the number however it was stored (01..., +201..., spaces): its last 10 digits. */
function phoneSearchKey(value: unknown): string {
  const phone = canonicalPatientPhone(value);
  return phone.length >= 10 ? phone.slice(-10) : phone;
}

function phonesOf(patient: any): string[] {
  return [patient?.phone, patient?.alternatePhone]
    .map(canonicalPatientPhone)
    .filter(Boolean);
}

/**
 * The same person is only assumed when BOTH the name and a phone number match.
 * One phone number usually belongs to a whole family and common names repeat,
 * so either one alone must never merge two records (use
 * findPossibleDuplicatePatients to warn about those instead).
 */
export async function findExistingPatientByNameAndPhone(
  fullNameRaw?: string | null,
  phoneRaw?: string | null,
) {
  const name = canonicalPatientName(fullNameRaw);
  const phone = canonicalPatientPhone(phoneRaw);
  if (!name || !phone) return null;

  const candidates = await db.searchPatients(phoneSearchKey(phoneRaw));
  return (
    (candidates ?? []).find(
      (candidate: any) =>
        canonicalPatientName(candidate?.fullName) === name &&
        phonesOf(candidate).includes(phone),
    ) ?? null
  );
}

export type PossibleDuplicatePatient = {
  id: number;
  patientCode: string;
  fullName: string;
  phone: string | null;
  matchedOn: "name" | "phone";
};

/** Records sharing only the name or only a phone number with a new patient: shown to the user, never merged. */
export async function findPossibleDuplicatePatients(
  fullNameRaw?: string | null,
  phoneRaw?: string | null,
  limit = 5,
): Promise<PossibleDuplicatePatient[]> {
  const name = canonicalPatientName(fullNameRaw);
  const phone = canonicalPatientPhone(phoneRaw);
  const byId = new Map<number, PossibleDuplicatePatient>();
  const add = (candidate: any, matchedOn: "name" | "phone") => {
    const id = Number(candidate?.id ?? 0);
    if (!Number.isFinite(id) || id <= 0 || byId.has(id)) return;
    byId.set(id, {
      id,
      patientCode: String(candidate?.patientCode ?? ""),
      fullName: String(candidate?.fullName ?? ""),
      phone: candidate?.phone ? String(candidate.phone) : null,
      matchedOn,
    });
  };
  if (phone) {
    for (const candidate of (await db.searchPatients(phoneSearchKey(phoneRaw))) ?? []) {
      if (phonesOf(candidate).includes(phone)) add(candidate, "phone");
    }
  }
  if (name) {
    for (const candidate of (await db.searchPatients(String(fullNameRaw ?? "").trim())) ?? []) {
      if (canonicalPatientName((candidate as any)?.fullName) === name) add(candidate, "name");
    }
  }
  return Array.from(byId.values()).slice(0, limit);
}

export async function findExistingPatientByNameAgeAndPhone(
  fullNameRaw?: string | null,
  ageRaw?: number | null,
  phoneRaw?: string | null,
) {
  const fullName = String(fullNameRaw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  const age = Number(ageRaw);
  const phone = normalizePhoneKey(phoneRaw);
  if (!fullName || !Number.isFinite(age) || age < 0 || !phone) return null;

  const candidates = await db.searchPatients(fullName);
  return (
    candidates.find((candidate: any) => {
      const candidateName = String(candidate?.fullName ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
      const candidateAge = Number(candidate?.age);
      const candidatePhone = normalizePhoneKey(candidate?.phone);
      return (
        candidateName === fullName &&
        Number.isFinite(candidateAge) &&
        candidateAge === age &&
        candidatePhone === phone
      );
    }) ?? null
  );
}

export async function findExistingPatientByPhoneAndDob(
  phoneRaw?: string | null,
  dateOfBirthRaw?: string | null,
  fullNameRaw?: string | null,
) {
  const phone = String(phoneRaw ?? "").trim();
  const dob = String(dateOfBirthRaw ?? "").trim();
  if (!phone || !dob) return null;

  const targetPhone = canonicalPatientPhone(phone);
  const targetDob = dob.slice(0, 10);
  const targetName = canonicalPatientName(fullNameRaw);
  if (!targetPhone) return null;

  const rows = await db.searchPatients(phoneSearchKey(phone));
  for (const candidate of rows ?? []) {
    const candidateDob = String((candidate as any)?.dateOfBirth ?? "").slice(
      0,
      10,
    );
    // Siblings (twins) share a phone and a birth date, so the name has to agree too.
    if (
      targetName &&
      canonicalPatientName((candidate as any)?.fullName) !== targetName
    ) {
      continue;
    }
    if (phonesOf(candidate).includes(targetPhone) && candidateDob === targetDob) {
      return candidate;
    }
  }
  return null;
}

export async function resolveServiceCodeForType(
  serviceType: string | undefined,
): Promise<string> {
  console.log(
    `[resolveServiceCodeForType] Starting with serviceType="${serviceType}"`,
  );
  const type = String(serviceType ?? "")
    .trim()
    .toLowerCase();
  if (!type) {
    console.log(
      `[resolveServiceCodeForType] serviceType is empty, returning ""`,
    );
    return "";
  }

  try {
    const row = await db.getSystemSetting("service_directory");
    console.log(
      `[resolveServiceCodeForType] service_directory row exists:`,
      Boolean(row?.value),
    );

    let list: any[] = [];
    if (row?.value) {
      // Handle both string and already-parsed JSON
      const value =
        typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      list = Array.isArray(value) ? value : [];
    }

    console.log(`[resolveServiceCodeForType] Found ${list.length} services`);

    // Filter by matching serviceType
    const matching = list.filter(
      (entry: any) =>
        entry &&
        entry.isActive !== false &&
        String(entry.code ?? "").trim() &&
        String(entry.serviceType ?? "")
          .trim()
          .toLowerCase() === type,
    );

    if (matching.length > 0) {
      const code = String(matching[0].code).trim();
      console.log(
        `[resolveServiceCodeForType] Matched serviceType="${type}" to code=${code}`,
      );
      return code;
    }

    // Do not fallback to an unrelated service code from another type.
    // Returning empty avoids writing a wrong service to MSSQL.
    console.log(
      `[resolveServiceCodeForType] No active service matched type="${type}"`,
    );
  } catch (err) {
    console.error(`[resolveServiceCodeForType] Error:`, err);
  }

  console.log(`[resolveServiceCodeForType] Returning empty string`);
  return "";
}

export async function pushNewPatientToMssql(patient: {
  patientCode: string;
  allocatePatientCode?: boolean;
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
  shiftNumber?: 1 | 2 | null;
}) {
  console.log(
    `[pushNewPatientToMssql] Patient ${patient.patientCode}, serviceType="${patient.serviceType}", providedServiceCode="${patient.serviceCode}"`,
  );

  // Use only explicit serviceCode (or doctor-scoped resolution upstream). Avoid generic type-only inference.
  // Type-only fallback can map to the wrong service when multiple services share the same type.
  let serviceCode = String(patient.serviceCode ?? "").trim();
  console.log(`[pushNewPatientToMssql] Final serviceCode="${serviceCode}"`);

  return await insertPatientToMssql({
    patientCode: patient.patientCode,
    allocatePatientCode: patient.allocatePatientCode,
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
    shiftNumber: patient.shiftNumber ?? undefined,
  });
}

export function registrationPricingPayload(input: {
  servicePrice?: number | null;
  serviceQty?: number | null;
  discountValue?: number | null;
}):
  | {
      servicePrice: number;
      serviceQty: number;
      discountValue: number;
      paValue: number;
    }
  | Record<string, never> {
  if (
    input.servicePrice == null &&
    input.serviceQty == null &&
    input.discountValue == null
  ) {
    return {};
  }
  const servicePrice = Math.max(0, Number(input.servicePrice ?? 0));
  const serviceQty = Math.max(
    1,
    Math.trunc(Number(input.serviceQty ?? 1)) || 1,
  );
  const gross = servicePrice * serviceQty;
  const disc = Math.min(Math.max(0, Number(input.discountValue ?? 0)), gross);
  const paValue = Math.max(0, gross - disc);
  return { servicePrice, serviceQty, discountValue: disc, paValue };
}

export async function canPushToMssql(user: {
  id: number;
  role: string;
}): Promise<boolean> {
  const role = String(user.role ?? "")
    .trim()
    .toLowerCase();
  console.log(
    `[mssql-push] canPushToMssql check started for user ${user.id}, role=${role}`,
  );
  if (role === "admin") {
    console.log(`[mssql-push] User is admin, granting MSSQL push permission`);
    return true;
  }
  const required = "/ops/mssql-add";

  try {
    // Check user-specific permissions first
    const state = await db.getUserPermissionState(user.id);
    console.log(`[mssql-push] User permission state:`, {
      hasOverride: state.hasOverride,
      pageIds: state.pageIds,
    });
    if (state.hasOverride) {
      const hasPermission = state.pageIds.includes(required);
      console.log(
        `[mssql-push] User has override, has ${required}? ${hasPermission}`,
      );
      return hasPermission;
    }

    // Fall back to role defaults
    const roleDefaults = await db.getRoleDefaultPermissions(role);
    console.log(`[mssql-push] Role defaults for ${role}:`, roleDefaults);
    if (Array.isArray(roleDefaults) && roleDefaults.includes(required)) {
      console.log(`[mssql-push] Role has ${required}, granting permission`);
      return true;
    }

    // Final check: get effective permissions
    const effective = await db.getEffectiveUserPermissions(user.id, role);
    console.log(
      `[mssql-push] Effective permissions for user ${user.id}:`,
      effective,
    );
    if (Array.isArray(effective) && effective.includes(required)) {
      console.log(
        `[mssql-push] Effective permissions include ${required}, granting permission`,
      );
      return true;
    }

    console.log(
      `[mssql-push] No permission for ${required} found, denying MSSQL push`,
    );
    return false;
  } catch (error) {
    console.warn("[mssql-push] Permission check failed:", error);
    return false;
  }
}

export async function readFreshDoctorNameForPatient(
  patientId: number,
): Promise<string> {
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

export function readDoctorNameFromStateData(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const payload = value as Record<string, any>;
  const direct = String(payload.doctorName ?? "").trim();
  if (direct) return direct;
  const signed = String(payload.signatures?.doctor ?? "").trim();
  return signed;
}

export function readRoleSignatureFromStateData(
  value: unknown,
  role: "reception" | "nurse" | "technician",
): string {
  if (!value || typeof value !== "object") return "";
  const payload = value as Record<string, any>;
  return String(payload.signatures?.[role] ?? "").trim();
}

export async function resolveDoctorCodeById(
  doctorId?: number | null,
): Promise<string | undefined> {
  console.log(`[resolveDoctorCodeById] Looking up doctorId=${doctorId}`);
  if (!doctorId) {
    console.log(
      `[resolveDoctorCodeById] doctorId is empty, returning undefined`,
    );
    return undefined;
  }
  try {
    const row = await db.getSystemSetting("doctor_directory");
    if (row?.value) {
      const doctors = JSON.parse(row.value) as Array<{
        id?: string | number;
        code?: string;
      }>;
      console.log(
        `[resolveDoctorCodeById] Found ${doctors.length} doctors in directory`,
      );
      const doctor = doctors.find((d) => Number(d.id) === doctorId);
      if (doctor?.code) {
        console.log(
          `[resolveDoctorCodeById] Matched doctor ${doctorId} -> code=${doctor.code}`,
        );
        return String(doctor.code).trim();
      } else {
        console.log(
          `[resolveDoctorCodeById] No matching doctor found for id=${doctorId}`,
        );
      }
    } else {
      console.log(
        `[resolveDoctorCodeById] doctor_directory not found in system settings`,
      );
    }
  } catch (err) {
    console.error(
      `[resolveDoctorCodeById] Error parsing doctor_directory:`,
      err,
    );
  }
  return undefined;
}

export async function resolveDoctorCodeByName(
  doctorName?: string | null,
): Promise<string | undefined> {
  const target = String(doctorName ?? "")
    .trim()
    .toLowerCase();
  if (!target) return undefined;
  try {
    const row = await db.getSystemSetting("doctor_directory");
    if (!row?.value) return undefined;
    const doctors = JSON.parse(row.value) as Array<{
      name?: string;
      code?: string;
    }>;
    const exact = doctors.find(
      (d) =>
        String(d?.name ?? "")
          .trim()
          .toLowerCase() === target,
    );
    if (exact?.code) return String(exact.code).trim();
    const fuzzy = doctors.find((d) => {
      const n = String(d?.name ?? "")
        .trim()
        .toLowerCase();
      return n && (n.includes(target) || target.includes(n));
    });
    if (fuzzy?.code) return String(fuzzy.code).trim();
  } catch (err) {
    console.error(
      `[resolveDoctorCodeByName] Error parsing doctor_directory:`,
      err,
    );
  }
  return undefined;
}
