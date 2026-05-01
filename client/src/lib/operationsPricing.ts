export const TAB_SAADANY = "saadany";
export const TAB_SAWAF = "sawaf";
export const TAB_OTHERS = "others";

export const TAB_CONFIG = [
  { key: TAB_SAADANY, label: "د/سعدني", doctor: "د. محمد السعدني" },
  { key: TAB_SAWAF, label: "د/صواف", doctor: "د. أحمد الصواف" },
  { key: TAB_OTHERS, label: "آخرون", doctor: "" },
] as const;

export const normalizeTabKey = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (raw === TAB_SAADANY || raw === TAB_SAWAF || raw === TAB_OTHERS) return raw;
  return TAB_SAADANY;
};

export const OPERATION_LABELS: Record<string, string> = {
  PRK: "PRK",
  Lasik: "Lasik",
  "Lasik Moria": "Moria",
  "Lasik Metal": "Metal",
  Femto: "Femto",
  Cataract: "Cataract",
  Yag: "Yag",
  Other: "Others",
};

export const OPERATION_BASE_AMOUNTS: Record<string, number> = {
  PRK: 4500,
  Lasik: 5000,
  "Lasik Moria": 5000,
  "Lasik Metal": 5000,
  Femto: 35000,
  Cataract: 7000,
  Yag: 3000,
  Other: 0,
};

export const FEMTO_CENTER_SHARE_DEFAULT = 1000;

export type AppointmentsPricingConfig = {
  amount: {
    prk: {
      saadanyConsultantSaadany: number;
      saadanyConsultant: number;
      saadanySpecialist: number;
      fallback: number;
    };
    lasik: {
      saadanyConsultantSaadany: number;
      saadanyConsultant: number;
      sawaf: number;
      fallback: number;
    };
  };
  doctorAccount: {
    prk: {
      saadany: number;
      consultant: number;
      specialist: number;
      sawaf: number;
      others: number;
    };
    lasik: {
      saadany: number;
      consultant: number;
      sawafMoria: number;
      sawafMetal: number;
      sawafFallback: number;
      othersMoria: number;
      othersMetal: number;
      othersFallback: number;
    };
  };
};

export const DEFAULT_APPOINTMENTS_PRICING: AppointmentsPricingConfig = {
  amount: {
    prk: {
      saadanyConsultantSaadany: 10000,
      saadanyConsultant: 7500,
      saadanySpecialist: 5500,
      fallback: OPERATION_BASE_AMOUNTS.PRK,
    },
    lasik: {
      saadanyConsultantSaadany: 18000,
      saadanyConsultant: 13500,
      sawaf: 10000,
      fallback: OPERATION_BASE_AMOUNTS.Lasik,
    },
  },
  doctorAccount: {
    prk: {
      saadany: 6250,
      consultant: 2000,
      specialist: 1200,
      sawaf: 1850,
      others: 1900,
    },
    lasik: {
      saadany: 9250,
      consultant: 3500,
      sawafMoria: 6050,
      sawafMetal: 3250,
      sawafFallback: 6050,
      othersMoria: 6150,
      othersMetal: 3500,
      othersFallback: 6150,
    },
  },
};

export const EMPTY_APPOINTMENTS_PRICING: AppointmentsPricingConfig = {
  amount: {
    prk: { saadanyConsultantSaadany: 0, saadanyConsultant: 0, saadanySpecialist: 0, fallback: 0 },
    lasik: { saadanyConsultantSaadany: 0, saadanyConsultant: 0, sawaf: 0, fallback: 0 },
  },
  doctorAccount: {
    prk: { saadany: 0, consultant: 0, specialist: 0, sawaf: 0, others: 0 },
    lasik: { saadany: 0, consultant: 0, sawafMoria: 0, sawafMetal: 0, sawafFallback: 0, othersMoria: 0, othersMetal: 0, othersFallback: 0 },
  },
};

export type OpKey = "prk" | "lasik" | "lasik_moria" | "lasik_metal" | "femto" | "other";
export type LevelKey = "consultant" | "specialist" | "unknown";

export const normalizeText = (value: unknown) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
export const includesAny = (text: string, words: string[]) => words.some((word) => text.includes(word));

export const detectOperationKey = (operation: unknown): OpKey => {
  const text = normalizeText(operation);
  if (includesAny(text, ["prk"])) return "prk";
  if (includesAny(text, ["femto", "فيمتو"])) return "femto";
  if (includesAny(text, ["metal", "ميتال"])) return "lasik_metal";
  if (includesAny(text, ["moria", "موريا"])) return "lasik_moria";
  if (includesAny(text, ["lasik", "ليزك"])) return "lasik";
  return "other";
};

export const detectLevel = (value: unknown): LevelKey => {
  const text = normalizeText(value);
  if (includesAny(text, ["consultant", "استشاري"])) return "consultant";
  if (includesAny(text, ["specialist", "اخصائي", "أخصائي"])) return "specialist";
  return "unknown";
};

export const detectDoctorGroup = (tabKey: string, doctorName: unknown): "saadany" | "sawaf" | "others" => {
  const text = normalizeText(doctorName);
  if (includesAny(text, ["د/السعدني", "saadany"])) return "saadany";
  if (includesAny(text, ["د/الصواف", "sawaf"])) return "sawaf";
  if (tabKey === TAB_SAADANY) return "saadany";
  if (tabKey === TAB_SAWAF) return "sawaf";
  return "others";
};

export const getPricingDefaults = (
  tabKey: string,
  row: { operation?: string; doctor?: string },
  config: AppointmentsPricingConfig = DEFAULT_APPOINTMENTS_PRICING
) => {
  if ((config.amount.prk.fallback ?? 0) === 0 && (config.amount.lasik.fallback ?? 0) === 0) {
    return { amount: 0, doctorAmount: 0 };
  }

  const op = detectOperationKey(row.operation);
  const level = detectLevel(row.operation);
  const group = detectDoctorGroup(tabKey, row.doctor);
  const doctorText = normalizeText(row.doctor);
  const isSaadanyDoctor = includesAny(doctorText, ["السعدني", "saadany"]);

  let amount = 0;
  if (op === "prk") {
    if (group === "saadany") {
      if (isSaadanyDoctor) amount = Number(config.amount.prk.saadanyConsultantSaadany ?? 0);
      else if (level === "specialist") amount = Number(config.amount.prk.saadanySpecialist ?? 0);
      else amount = Number(config.amount.prk.saadanyConsultant ?? 0);
    } else {
      amount = Number(config.amount.prk.fallback ?? OPERATION_BASE_AMOUNTS.PRK);
    }
  } else if (op === "lasik" || op === "lasik_moria" || op === "lasik_metal") {
    if (group === "saadany") {
      amount = isSaadanyDoctor
        ? Number(config.amount.lasik.saadanyConsultantSaadany ?? 0)
        : Number(config.amount.lasik.saadanyConsultant ?? 0);
    } else if (group === "sawaf") {
      amount = Number(config.amount.lasik.sawaf ?? 0);
    } else {
      amount = Number(config.amount.lasik.fallback ?? OPERATION_BASE_AMOUNTS.Lasik);
    }
  } else if (op === "femto") {
    amount = OPERATION_BASE_AMOUNTS.Femto;
  } else {
    amount = OPERATION_BASE_AMOUNTS.Other;
  }

  let doctorAmount = 0;
  if (op === "femto") {
    doctorAmount = FEMTO_CENTER_SHARE_DEFAULT;
  } else if (group === "saadany") {
    if (op === "prk") {
      if (isSaadanyDoctor) doctorAmount = Number(config.doctorAccount.prk.saadany ?? 0);
      else if (level === "specialist") doctorAmount = Number(config.doctorAccount.prk.specialist ?? 0);
      else doctorAmount = Number(config.doctorAccount.prk.consultant ?? 0);
    } else if (op === "lasik" || op === "lasik_moria" || op === "lasik_metal") {
      doctorAmount = isSaadanyDoctor
        ? Number(config.doctorAccount.lasik.saadany ?? 0)
        : Number(config.doctorAccount.lasik.consultant ?? 0);
    }
  } else if (group === "sawaf") {
    if (op === "prk") doctorAmount = Number(config.doctorAccount.prk.sawaf ?? 0);
    else if (op === "lasik_moria" || op === "lasik") doctorAmount = Number(config.doctorAccount.lasik.sawafMoria ?? 0);
    else if (op === "lasik_metal") doctorAmount = Number(config.doctorAccount.lasik.sawafMetal ?? 0);
    else doctorAmount = Number(config.doctorAccount.lasik.sawafFallback ?? 0);
  } else {
    if (op === "prk") doctorAmount = Number(config.doctorAccount.prk.others ?? 0);
    else if (op === "lasik_moria" || op === "lasik") doctorAmount = Number(config.doctorAccount.lasik.othersMoria ?? 0);
    else if (op === "lasik_metal") doctorAmount = Number(config.doctorAccount.lasik.othersMetal ?? 0);
    else doctorAmount = Number(config.doctorAccount.lasik.othersFallback ?? 0);
  }

  return { amount, doctorAmount };
};

export const operationTypeLabel = (value: unknown) => {
  const key = String(value ?? "").trim();
  if (!key) return "أخرى";
  return OPERATION_LABELS[key] ?? key;
};

export const normalizeDoctorName = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();
  if (lowered.includes("saadany") || lowered.includes("سعدني")) return "د. محمد السعدني";
  if (lowered.includes("sawaf") || lowered.includes("صواف")) return "د. أحمد الصواف";
  return raw;
};

export const tabLabelByKey = (value: unknown) => {
  const key = normalizeTabKey(value);
  return TAB_CONFIG.find((tab) => tab.key === key)?.label ?? key;
};
