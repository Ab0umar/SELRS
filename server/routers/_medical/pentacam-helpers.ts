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
import { decodeMojibake } from "./service-helpers";

export type PentacamPatientCandidate = {
  patient: any;
  normalizedNameKeys: string[];
  tokenSet: Set<string>;
  tokenSignatureSet: Set<string>;
};

export type FailedPentacamSuggestion = {
  patientId: number;
  patientCode: string;
  fullName: string;
  matchedBy: string;
  score: number;
};

export type FailedPentacamPreview = {
  fileName: string;
  proposedFileName: string;
  willDuplicate: boolean;
};

export type LocalPentacamMismatchEntry = {
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

export const PENTACAM_ROOT_DIR = path.resolve(process.cwd(), "Pentacam");

export const PENTACAM_JPG_DIR = path.join(PENTACAM_ROOT_DIR, "Jpgs");

export const PENTACAM_FAILED_DIR = path.join(PENTACAM_ROOT_DIR, "Watcher", "_failed");

export function normalizePentacamMatchText(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePentacamPhoneticToken(token: string): string {
  const raw = normalizePentacamMatchText(token).replace(/\s+/g, "");
  if (!raw) return "";

  const arabicMap: Record<string, string> = {
    ا: "a",
    أ: "a",
    إ: "a",
    آ: "a",
    ء: "",
    ؤ: "w",
    ئ: "y",
    ب: "b",
    ت: "t",
    ث: "s",
    ج: "g",
    ح: "h",
    خ: "kh",
    د: "d",
    ذ: "z",
    ر: "r",
    ز: "z",
    س: "s",
    ش: "sh",
    ص: "s",
    ض: "d",
    ط: "t",
    ظ: "z",
    ع: "a",
    غ: "g",
    ف: "f",
    ق: "k",
    ك: "k",
    ل: "l",
    م: "m",
    ن: "n",
    ه: "h",
    ة: "h",
    و: "w",
    ي: "y",
    ى: "y",
  };

  const mapped = Array.from(raw)
    .map((ch) => arabicMap[ch] ?? ch)
    .join("")
    .toLowerCase();

  const folded = mapped.replace(/ph/g, "f").replace(/ch/g, "sh");

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

export function buildPentacamTokenSignatureSet(value: string): Set<string> {
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

export function buildPentacamNameKeys(fullName: string): string[] {
  const clean = String(fullName ?? "")
    .replace(/\s+/g, " ")
    .trim();
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

export function extractPentacamNameFragment(fileName: string): string {
  const stem = path.parse(String(fileName ?? "")).name;
  // IMAGEnet: "<name>_<date>_<time>" (often 2nd 3rd 1st).
  // Pentacam alt: "<name>_OD|OS_<date>_<time>_<suffix>"
  const withoutSuffix = stem
    .replace(/_(OD|OS)_\d{8}_\d{6}(?:_.+)?$/i, "")
    .replace(/_\d{8}_\d{6}(?:_.+)?$/i, "");
  return normalizePentacamMatchText(withoutSuffix);
}

export function extractPatientCodeCandidatesFromFileName(fileName: string): string[] {
  let stem = path.parse(String(fileName ?? "")).name;
  // Strip FAILED_ prefix produced by failed-import workflow before code extraction
  if (/^FAILED_/i.test(stem)) stem = stem.slice("FAILED_".length);
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
  if (
    /^[A-Za-z]{1,5}\d{3,12}$/.test(first) ||
    /^\d{3,12}[A-Za-z]{1,5}$/.test(first)
  ) {
    const digits = first.replace(/\D+/g, "");
    if (/^\d{3,12}$/.test(digits)) out.add(digits);
  }
  return Array.from(out);
}

export function tokenizePentacamMatchText(value: string): string[] {
  return normalizePentacamMatchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export async function buildPentacamPatientCandidates(): Promise<{
  byCode: Map<string, any>;
  candidates: PentacamPatientCandidate[];
}> {
  const byCode = new Map<string, any>();
  const candidates: PentacamPatientCandidate[] = [];
  const rows = await db.getAllPatientsForMatching();
  for (const row of rows) {
    const patientCode = String(row.patientCode ?? "").trim();
    if (patientCode) {
      byCode.set(patientCode, row);
      byCode.set(patientCode.toUpperCase(), row);
    }
    const fullName = String(row.fullName ?? "").trim();
    const keys = buildPentacamNameKeys(fullName);
    const tokenSet = new Set<string>();
    const tokenSignatureSet = new Set<string>();
    for (const key of keys) {
      for (const token of tokenizePentacamMatchText(key)) tokenSet.add(token);
      for (const signature of buildPentacamTokenSignatureSet(key))
        tokenSignatureSet.add(signature);
    }
    candidates.push({
      patient: row,
      normalizedNameKeys: keys,
      tokenSet,
      tokenSignatureSet,
    });
  }
  return { byCode, candidates };
}

export function resolvePatientForPentacamFileName(
  fileName: string,
  matcher: { byCode: Map<string, any>; candidates: PentacamPatientCandidate[] },
): { patient: any; matchedBy: string } | null {
  const codeCandidates = extractPatientCodeCandidatesFromFileName(fileName);
  const hasExplicitCode = codeCandidates.length > 0;
  for (const candidate of codeCandidates) {
    const patient =
      matcher.byCode.get(candidate) ??
      matcher.byCode.get(candidate.toUpperCase());
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
    if (!Number.isFinite(capturedAtMs) || !Number.isFinite(refMs))
      return Number.POSITIVE_INFINITY;
    return Math.abs(Math.round((capturedAtMs - refMs) / 86400000));
  };
  const patientTieKey = (patient: any) => {
    const code = String(patient?.patientCode ?? "").trim();
    if (code) return code;
    return String(Number(patient?.id ?? 0));
  };

  // First pass: direct key include (supports 2nd/3rd/1st order keys).
  let bestInclude: {
    patient: any;
    score: number;
    matchedBy: string;
    dayDiff: number;
  } | null = null;
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
        bestInclude = {
          patient: candidate.patient,
          score,
          matchedBy: `name:${nameKey}`,
          dayDiff,
        };
      }
    }
  }
  if (bestInclude)
    return { patient: bestInclude.patient, matchedBy: bestInclude.matchedBy };

  // Second pass: token overlap for partial names and spacing drift.
  if (fileTokens.size === 0) return null;

  let bestToken: {
    patient: any;
    overlap: number;
    matchedBy: string;
    dayDiff: number;
  } | null = null;
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
      bestToken = {
        patient: candidate.patient,
        overlap,
        matchedBy: `tokens:${overlap}`,
        dayDiff,
      };
    }
  }
  if (bestToken)
    return { patient: bestToken.patient, matchedBy: bestToken.matchedBy };

  // Third pass: Arabic-English phonetic overlap.
  // Guardrail: phonetic similarity alone is too risky for lookalike Arabic names
  // (e.g. حسين vs حسناء). Require both phonetic overlap and at least one exact token overlap.
  const fileTokenSignatures = buildPentacamTokenSignatureSet(workingFragment);
  if (fileTokenSignatures.size === 0) return null;
  const hasArabicCharsInFile = /[\u0600-\u06FF]/.test(workingFragment);

  let bestPhonetic: {
    patient: any;
    overlap: number;
    matchedBy: string;
    dayDiff: number;
  } | null = null;
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
      bestPhonetic = {
        patient: candidate.patient,
        overlap,
        matchedBy: `phonetic:${overlap}`,
        dayDiff,
      };
    }
  }

  if (bestPhonetic)
    return { patient: bestPhonetic.patient, matchedBy: bestPhonetic.matchedBy };

  // No aggressive fallback in clinical mode.
  return null;
}

export function suggestPatientsForPentacamFileName(
  fileName: string,
  matcher: { byCode: Map<string, any>; candidates: PentacamPatientCandidate[] },
  limit: number = 3,
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
      (tokenOverlap > 0
        ? `tokens:${tokenOverlap}`
        : `phonetic:${phoneticOverlap}`);
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

  const hasNearYear = scored.some(
    (entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365,
  );
  const hasNearThreeYears = scored.some(
    (entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365 * 3,
  );
  const filteredByDate = hasNearYear
    ? scored.filter(
        (entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365,
      )
    : hasNearThreeYears
      ? scored.filter(
          (entry) => Number.isFinite(entry.dayDiff) && entry.dayDiff <= 365 * 3,
        )
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
    if (closeScores && closeEvidence)
      return [top].map(({ patient, matchedBy, score }) => ({
        patient,
        matchedBy,
        score,
      }));
  }
  return outRaw.map(({ patient, matchedBy, score }) => ({
    patient,
    matchedBy,
    score,
  }));
}

export function reorderPatientNameSecondThirdFirst(rawName: string): string {
  const clean = rawName.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(" ");
  if (parts.length < 3) return clean;
  return [parts[1], parts[2], parts[0], ...parts.slice(3)].join(" ").trim();
}

export function sanitizeLabel(rawValue: string): string {
  return rawValue
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePentacamKey(key: string): string {
  return String(key ?? "")
    .trim()
    .replace(/^\/+/, "");
}

export function resolvePentacamSourceKeyCandidates(fileName: string): string[] {
  const base = path.posix.basename(String(fileName ?? "").trim());
  return [
    `pentacam-exports/${base}`,
    `Pentacam/${base}`,
    `pentacam/${base}`,
    base,
  ].map(normalizePentacamKey);
}

export function buildPentacamPatientPrefix(patientId: number): string {
  return `pentacam/patients/${Number(patientId)}/`;
}

export function buildPentacamPatientKey(patientId: number, fileName: string): string {
  return `${buildPentacamPatientPrefix(patientId)}${path.posix.basename(String(fileName ?? "").trim())}`;
}

export function buildPentacamObjectUrl(key: string): string {
  return `/api/pentacam/exports/file/${encodeURIComponent(normalizePentacamKey(key))}`;
}

export async function movePentacamObjectToPatient(params: {
  patientId: number;
  fileName: string;
}) {
  const sourceName = path.posix.basename(String(params.fileName ?? "").trim());
  const destinationKey = buildPentacamPatientKey(params.patientId, sourceName);
  const sourceCandidates = resolvePentacamSourceKeyCandidates(sourceName);
  let copiedFrom = "";
  for (const sourceKey of sourceCandidates) {
    try {
      await copyObjectInS3(sourceKey, destinationKey);
      copiedFrom = sourceKey;
      break;
    } catch {
      // Try the next likely key shape.
    }
  }
  if (!copiedFrom) {
    throw new Error(`Pentacam source file not found for ${sourceName}`);
  }
  try {
    await deleteFromS3(copiedFrom);
  } catch {
    // If delete fails, the copy is still enough for previewing from patient prefix.
  }
  return {
    sourceKey: copiedFrom,
    destinationKey,
    fileName: sourceName,
  };
}

export function parsePentacamLocalMeta(notes: unknown): null | {
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
    if (String((parsed as any).kind ?? "") !== "local-pentacam-export-v1")
      return null;
    return parsed as any;
  } catch {
    return null;
  }
}

export function pentacamEyeHasAnyData(
  row: Record<string, unknown>,
  side: "OD" | "OS",
): boolean {
  if (side === "OD") {
    return [row.k1OD, row.k2OD, row.axisOD, row.thinnestPointOD].some(
      (v) => String(v ?? "").trim().length > 0,
    );
  }
  return [row.k1OS, row.k2OS, row.axisOS, row.thinnestPointOS].some(
    (v) => String(v ?? "").trim().length > 0,
  );
}

export function pentacamEyeIsComplete(
  row: Record<string, unknown>,
  side: "OD" | "OS",
): boolean {
  if (side === "OD") {
    return [row.k1OD, row.k2OD, row.axisOD, row.thinnestPointOD].every(
      (v) => String(v ?? "").trim().length > 0,
    );
  }
  return [row.k1OS, row.k2OS, row.axisOS, row.thinnestPointOS].every(
    (v) => String(v ?? "").trim().length > 0,
  );
}

export function expandPentacamDashboardRows(rows: any[]) {
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
    const metaEye = String(meta?.eyeSide ?? "")
      .trim()
      .toLowerCase();
    const importStatus = String(meta?.importStatus ?? "")
      .trim()
      .toLowerCase();
    const forceRepeat =
      importStatus.includes("repeat") ||
      importStatus === "failed" ||
      importStatus.includes("quality");

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
      const quality: "accepted" | "repeat" =
        forceRepeat || !complete ? "repeat" : "accepted";
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
        rawDoctor && !/^د\.?/u.test(rawDoctor) && !/^dr\.?/i.test(rawDoctor)
          ? `د. ${rawDoctor}`
          : rawDoctor;

      out.push({
        resultId: Number(row.id),
        visitId: Number(row.visitId),
        patientId: Number(row.patientId),
        patientName: decodeMojibake(
          String(row.patientFullName ?? "").trim() || `مريض #${row.patientId}`,
        ),
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

export function stripLeadingCodeLabel(fileName: string): string {
  const raw = String(fileName ?? "").trim();
  if (!raw) return raw;
  return raw.replace(/^([A-Za-z]{1,5}\d{3,12}|\d{3,12})[_\-\s]+/i, "");
}

export function assertSafePentacamFileName(fileName: string): string {
  const normalized = String(fileName ?? "").trim();
  if (
    !normalized ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized.includes("..")
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid file name: ${fileName}`,
    });
  }
  return normalized;
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function nextAvailablePentacamPath(initialPath: string): Promise<string> {
  const parsed = path.parse(initialPath);
  let candidate = initialPath;
  let index = 1;
  while (await pathExists(candidate)) {
    candidate = path.join(
      parsed.dir,
      `${parsed.name}_dup${index}${parsed.ext}`,
    );
    index += 1;
  }
  return candidate;
}

export function extractPentacamPageType(fileName: string): string {
  const lower = String(fileName ?? "").toLowerCase();
  if (lower.includes("enhanced") && lower.includes("ectasia"))
    return "Enhanced Ectasia";
  if (lower.includes("topometric")) return "Topometric";
  if (lower.includes("4 maps") && lower.includes("refr")) return "4 Maps Refr";
  if (lower.includes("4 maps")) return "4 Maps";
  if (lower.includes("kc") && lower.includes("staging")) return "KC Staging";
  return "Other";
}

export function buildFailedPentacamGroupLabel(fileName: string): string {
  const stem = path.parse(String(fileName ?? "")).name;
  const withoutLeadingCode = stripLeadingCodeLabel(stem);
  const cleaned = withoutLeadingCode
    .replace(/_(OD|OS)_\d{8}_\d{6}(?:_.+)?$/i, "")
    .replace(/_\d{8}_\d{6}(?:_.+)?$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return cleaned || withoutLeadingCode || stem;
}

export function buildFailedPentacamGroupKey(fileName: string): string {
  return buildFailedPentacamGroupLabel(fileName).toLowerCase();
}

export async function listFailedPentacamRows() {
  const entries = await readdir(PENTACAM_FAILED_DIR, {
    withFileTypes: true,
  }).catch(() => []);
  const files = entries
    .filter(
      (entry) => entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const matcher = await buildPentacamPatientCandidates();
  const rows = await Promise.all(
    files.map(async (fileName) => {
      const fullPath = path.join(PENTACAM_FAILED_DIR, fileName);
      const info = await stat(fullPath);
      const suggestions = suggestPatientsForPentacamFileName(
        fileName,
        matcher,
        3,
      ).map((entry) => ({
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
    }),
  );

  rows.sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
  return rows;
}

export async function previewFailedPentacamRenameTargets(
  fileNames: string[],
  idCode: string,
): Promise<FailedPentacamPreview[]> {
  const normalizedId = String(idCode ?? "").trim();
  if (!/^\d{3,12}$/.test(normalizedId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A valid ID is required",
    });
  }

  const seenTargets = new Set<string>();
  const previews: FailedPentacamPreview[] = [];
  for (const rawFileName of fileNames) {
    const fileName = assertSafePentacamFileName(rawFileName);
    const baseName = stripLeadingCodeLabel(fileName);
    const targetPath = path.join(
      PENTACAM_JPG_DIR,
      `${normalizedId}_${baseName}`,
    );
    let candidate = targetPath;
    let willDuplicate = false;
    if (
      (await pathExists(candidate)) ||
      seenTargets.has(candidate.toLowerCase())
    ) {
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

export async function moveFailedPentacamFile(
  fileName: string,
  targetFileName: string,
): Promise<string> {
  const sourcePath = path.join(
    PENTACAM_FAILED_DIR,
    assertSafePentacamFileName(fileName),
  );
  const info = await stat(sourcePath).catch(() => null);
  if (!info?.isFile()) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Failed file not found",
    });
  }
  const finalPath = await nextAvailablePentacamPath(
    path.join(PENTACAM_JPG_DIR, targetFileName),
  );
  await rename(sourcePath, finalPath);
  return path.basename(finalPath);
}

export async function scanMismatchedLocalPentacamLinks(
  limit: number,
): Promise<LocalPentacamMismatchEntry[]> {
  // Scan srv100_uploads (where autolinking writes) not pentacamResults (old workflow)
  const rows = await db.getLinkedSrv100UploadsWithPatient(limit);
  const out: LocalPentacamMismatchEntry[] = [];

  // Build code→patient map only from the rows we have (avoid loading all patients)
  const codeToPatient = new Map<
    string,
    { id: number; patientCode: string; fullName: string }
  >();
  for (const row of rows as any[]) {
    const code = String(row.patientCode ?? "").trim();
    const id = Number(row.patient_id ?? 0);
    if (code && id > 0 && !codeToPatient.has(code)) {
      codeToPatient.set(code, {
        id,
        patientCode: code,
        fullName: String(row.fullName ?? "").trim(),
      });
    }
  }

  for (const row of rows as any[]) {
    const fileName = String(row.file_name ?? "").trim();
    if (!fileName) continue;
    const codeCandidates = Array.from(
      new Set(
        extractPatientCodeCandidatesFromFileName(fileName).filter((v) =>
          /^\d{3,12}$/.test(String(v)),
        ),
      ),
    );
    if (codeCandidates.length === 0) continue;

    const currentPatientId = Number(row.patient_id ?? 0);
    const currentPatientCode = String(row.patientCode ?? "").trim();
    const currentPatientName = String(row.fullName ?? "").trim();

    // File is correctly linked — skip
    if (currentPatientCode && codeCandidates.includes(currentPatientCode))
      continue;

    // Find which candidate codes resolve to known patients
    const suggestedCodes = codeCandidates.filter((code) =>
      codeToPatient.has(code),
    );

    if (suggestedCodes.length === 1) {
      const suggested = codeToPatient.get(suggestedCodes[0])!;
      if (suggested.id === currentPatientId) continue;
      out.push({
        resultId: Number(row.id ?? 0),
        fileName,
        currentPatientId,
        currentPatientCode,
        currentPatientName,
        codeCandidates,
        kind: "obvious",
        suggestedPatientId: suggested.id,
        suggestedPatientCode: suggested.patientCode,
        suggestedPatientName: suggested.fullName,
      });
    } else if (suggestedCodes.length > 1) {
      out.push({
        resultId: Number(row.id ?? 0),
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

export function inferPentacamEyeSideFromName(fileName: string): "OD" | "OS" | "" {
  const match = fileName.match(/(?:^|_)(OD|OS)(?:_|$)/i);
  if (!match) return "";
  const side = String(match[1] ?? "").toUpperCase();
  return side === "OD" || side === "OS" ? side : "";
}

export function inferPentacamCapturedAtFromName(fileName: string): string | null {
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

export function inferPentacamMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}
