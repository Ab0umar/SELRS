export interface ListData {
  id: number;
  patientId?: number;
  number: string;
  name: string;
  phone: string;
  doctor: string;
  operation: string;
  eye: string;
  center: boolean;
  payment: string;
  hospital: string;
  code: string;
  notes?: string;
  amount: number;
  paidAmount: number;
  doctorAmount: number | null;
  discountType: "amount" | "percent";
  discountValue: number;
}

export interface AccountsAdjustments {
  radiology: number;
  external: number;
  cashbox: number;
}

export interface AccountsAdjustmentInputs {
  radiology: string;
  external: string;
  cashbox: string;
}

export interface SavedSummary {
  key: string;
  date: string;
  names: string[];
  listId?: number;
  items: any[];
  operationType?: string | null;
}

export type ViewMode = "list" | "table" | "accounts" | "history";

export const arabicWeekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const arabicWeekdaysByIndex = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const getLocalDateIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const toDateInputValue = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toISOString().split("T")[0];
};

export const formatDayDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const day = date.toLocaleDateString("ar-EG", { weekday: "short" });
  const datePart = date.toLocaleDateString("ar-EG");
  return `${day} ${datePart}`;
};

export const getWeekdayIndex = (value?: string | null) => {
  if (!value) return new Date().getDay();
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return new Date().getDay();
  return date.getDay();
};

export const formatDayDateLong = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const weekday = arabicWeekdaysByIndex[date.getDay()] ?? "";
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${weekday} ${day}/${month}/${year}`;
};

export const shiftDateToWeekday = (value: string, targetDayIndex: number) => {
  const base = new Date(value);
  if (Number.isNaN(base.valueOf())) return value;
  const delta = targetDayIndex - base.getDay();
  base.setDate(base.getDate() + delta);
  return toDateInputValue(base) || value;
};

export const toHindi = (value: string) => value.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);

export const formatTime12h = (time24: string): string => {
  if (!time24 || time24 === "-") return time24;
  const [hoursStr, minutesStr = "00"] = time24.split(":");
  const h = parseInt(hoursStr, 10);
  if (!Number.isFinite(h)) return time24;
  const period = h >= 12 ? "م" : "ص";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutesStr} ${period}`;
};

export const sanitizePayment = (value: unknown) => {
  const text = String(value ?? "");
  return text === "true" || text === "false" || text === "1" || text === "0" ? "" : text;
};
