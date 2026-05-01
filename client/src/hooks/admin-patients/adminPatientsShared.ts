export type ServiceType = "consultant" | "specialist" | "lasik" | "external" | "surgery";

export type SheetTypeChoice =
  | ServiceType
  | "pentacam_center"
  | "pentacam_external"
  | "pentacam_c"
  | "pentacam_ex"
  | "pentacam_ex_c"
  | "surgery_external";

export type PatientStatus = "new" | "followup" | "archived";

export type PatientRow = {
  id: number;
  patientCode?: string;
  fullName?: string;
  treatingDoctor?: string;
  dateOfBirth?: string | Date | null;
  age?: number | null;
  address?: string | null;
  phone?: string | null;
  occupation?: string | null;
  serviceType?: ServiceType;
  serviceCode?: string;
  serviceCodes?: string[];
  serviceSheetTypeByCode?: Record<string, string>;
  locationType?: "center" | "external";
  status?: PatientStatus;
  syncLockManual?: boolean;
  manualEditedAt?: string;
  __serviceCodeSingle?: string;
  __serviceNameSingle?: string;
  __rowKey?: string;
};

export type PatientDraft = {
  fullName: string;
  treatingDoctor: string;
  dateOfBirth: string;
  age: string;
  address: string;
  phone: string;
  occupation: string;
  serviceType: SheetTypeChoice;
  status: PatientStatus;
};

export type RowSaveState = {
  state: "saved" | "unsaved" | "saving" | "error";
  at?: string;
  message?: string;
};

export type DoctorDirectoryEntry = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  locationType?: "center" | "external";
};

export type BulkSnapshot = {
  patientId: number;
  serviceType?: string | null;
  locationType?: string | null;
  doctorName?: string;
};

export type PatientCursor = {
  codeNum: number;
  patientCode: string;
  id: number;
};

export type PatientStats = {
  total: number;
  center: number;
  external: number;
  lasik: number;
};

export type ImportPreviewRow = {
  rowNumber: number;
  patientCode: string;
  fullName: string;
  serviceType: string;
  locationType: string;
  status: string;
  errors: string[];
};

export const normalizeTypedDateInput = (value: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{6}$/.test(raw)) {
    const dd = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const yy = raw.slice(4, 6);
    return `${dd}/${mm}/20${yy}`;
  }
  if (/^\d{8}$/.test(raw)) {
    const dd = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const yyyy = raw.slice(4, 8);
    return `${dd}/${mm}/${yyyy}`;
  }
  return raw;
};

export const getServiceTypeLabel = (value: string) => {
  const key = String(value ?? "").trim().toLowerCase();
  if (key === "consultant") return "Consultant";
  if (key === "specialist") return "Specialist";
  if (key === "pentacam" || key === "pentacam_center" || key === "pentacam_c") return "Pentacam C";
  if (key === "pentacam_external" || key === "pentacam_ex") return "Pentacam Ex";
  if (key === "pentacam_ex_c") return "Pentacam Ex.C";
  if (key === "lasik") return "Lasik";
  if (key === "external") return "External";
  if (key === "surgery" || key === "operation" || key === "surgery_center" || key === "operation_center") return "Surgery";
  if (key === "surgery_external") return "Surgery (External)";
  return value || "-";
};

export const toIsoDate = (value: string) => {
  const raw = normalizeTypedDateInput(value);
  if (!raw) return "";
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

export const getYearMonth = (value: unknown): { year: string; month: string } | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return {
      year: String(value.getFullYear()),
      month: String(value.getMonth() + 1).padStart(2, "0"),
    };
  }
  const raw = String(value).trim();
  if (!raw) return null;
  let match = raw.match(/^(\d{4})-(\d{2})-/);
  if (match) return { year: match[1], month: match[2] };
  match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return { year: match[3], month: match[2] };
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.valueOf())) {
    return {
      year: String(parsed.getFullYear()),
      month: String(parsed.getMonth() + 1).padStart(2, "0"),
    };
  }
  return null;
};

export const isSheetTypeChoice = (value: string): value is SheetTypeChoice =>
  value === "consultant" ||
  value === "specialist" ||
  value === "lasik" ||
  value === "external" ||
  value === "surgery" ||
  value === "pentacam_center" ||
  value === "pentacam_external" ||
  value === "pentacam_c" ||
  value === "pentacam_ex" ||
  value === "pentacam_ex_c" ||
  value === "surgery_external";

export const normalizeSheetTypeChoice = (value: unknown): SheetTypeChoice | "" => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "pentacam" || raw === "radiology_center" || raw === "pentacam_center") return "pentacam_c";
  if (raw === "radiology_external" || raw === "pentacam_external") return "pentacam_ex";
  if (raw === "pentacam_c") return "pentacam_c";
  if (raw === "pentacam_ex") return "pentacam_ex";
  if (raw === "pentacam_ex_c") return "pentacam_ex_c";
  if (raw === "surgery_center" || raw === "operation" || raw === "operation_center") return "surgery";
  if (raw === "operation_external") return "surgery_external";
  return isSheetTypeChoice(raw) ? raw : "";
};

export function toLegacyServiceType(value: SheetTypeChoice): ServiceType {
  if (value === "pentacam_center" || value === "pentacam_c") return "lasik";
  if (
    value === "pentacam_external" ||
    value === "pentacam_ex" ||
    value === "pentacam_ex_c" ||
    value === "surgery_external"
  ) {
    return "external";
  }
  return value;
}

export const getPatientRowKey = (patient: PatientRow) => String((patient as { __rowKey?: string }).__rowKey ?? patient.id);
