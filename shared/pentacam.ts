export const PENTACAM_ALLOWED_SRV_CODES = [
  "1502",
  "1524",
  "1562",
  "1571",
  "1572",
  "1590",
  "1600",
  "1601",
  "1614",
  "1615",
  "1616",
] as const;

const PENTACAM_ALLOWED_SRV_CODE_SET = new Set(PENTACAM_ALLOWED_SRV_CODES.map((code) => code.toLowerCase()));
const PENTACAM_ALLOWED_LOCATION_TYPES = new Set(["center", "external"]);

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function pushCode(set: Set<string>, value: unknown): void {
  const normalized = normalizeText(value);
  if (normalized) set.add(normalized);
}

export function extractPentacamServiceCodes(patient: unknown): string[] {
  const row = (patient ?? {}) as Record<string, unknown>;
  const codes = new Set<string>();

  pushCode(codes, row.serviceCode);
  pushCode(codes, row.srvCode);
  pushCode(codes, row.srvcode);

  const serviceCodes = row.serviceCodes;
  if (Array.isArray(serviceCodes)) {
    for (const value of serviceCodes) {
      pushCode(codes, value);
    }
  }

  const serviceCode = row.serviceCode;
  if (Array.isArray(serviceCode)) {
    for (const value of serviceCode) {
      pushCode(codes, value);
    }
  }

  return Array.from(codes);
}

export function isPentacamEligiblePatient(patient: unknown): boolean {
  const row = (patient ?? {}) as Record<string, unknown>;
  const locationType = normalizeText(row.locationType);
  if (!PENTACAM_ALLOWED_LOCATION_TYPES.has(locationType)) {
    return false;
  }

  const serviceCodes = extractPentacamServiceCodes(row);
  return serviceCodes.some((code) => PENTACAM_ALLOWED_SRV_CODE_SET.has(code));
}

