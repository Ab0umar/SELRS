import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Plus, Save, RotateCcw, Trash2, ImageDown, Share2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { captureElementAsJpg } from "@/lib/nativePdf";
import PageHeader from "@/components/PageHeader";
import { OfflinePageState } from "@/components/OfflinePageState";

interface ListData {
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
  amount: number;
  paidAmount: number;
  doctorAmount: number | null;
  discountType: "amount" | "percent";
  discountValue: number;
}

interface DoctorOption {
  id: number;
  username: string;
  name: string;
  code: string;
}
interface AccountsAdjustments {
  radiology: number;
  external: number;
  cashbox: number;
}
interface AccountsAdjustmentInputs {
  radiology: string;
  external: string;
  cashbox: string;
}
interface SavedSummary {
  key: string;
  date: string;
  names: string[];
  listId?: number;
  items: any[];
  operationType?: string | null;
}
const TAB_SAADANY = "saadany";
const TAB_SAWAF = "sawaf";
const TAB_OTHERS = "others";
const TAB_CONFIG = [
  { key: TAB_SAADANY, label: "د/سعدني", doctor: "د. محمد السعدني" },
  { key: TAB_SAWAF, label: "د/صواف", doctor: "د. أحمد الصواف" },
  { key: TAB_OTHERS, label: "آخرون", doctor: "" },
] as const;
const normalizeTabKey = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (raw === TAB_SAADANY || raw === TAB_SAWAF || raw === TAB_OTHERS) return raw;
  return TAB_SAADANY;
};

const OPERATION_LABELS: Record<string, string> = {
  PRK: "PRK",
  Lasik: "Lasik",
  "Lasik Moria": "Moria",
  "Lasik Metal": "Metal",
  Femto: "Femto",
  Cataract: "Cataract",
  Yag: "Yag",
  Other: "Others",
};
const OPERATION_BASE_AMOUNTS: Record<string, number> = {
  PRK: 4500,
  Lasik: 5000,
  "Lasik Moria": 5000,
  "Lasik Metal": 5000,
  Femto: 35000,
  Cataract: 7000,
  Yag: 3000,
  Other: 0,
};
const FEMTO_CENTER_SHARE_DEFAULT = 1000;
type AppointmentsPricingConfig = {
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

const EMPTY_APPOINTMENTS_PRICING: AppointmentsPricingConfig = {
  amount: {
    prk: { saadanyConsultantSaadany: 0, saadanyConsultant: 0, saadanySpecialist: 0, fallback: 0 },
    lasik: { saadanyConsultantSaadany: 0, saadanyConsultant: 0, sawaf: 0, fallback: 0 },
  },
  doctorAccount: {
    prk: { saadany: 0, consultant: 0, specialist: 0, sawaf: 0, others: 0 },
    lasik: { saadany: 0, consultant: 0, sawafMoria: 0, sawafMetal: 0, sawafFallback: 0, othersMoria: 0, othersMetal: 0, othersFallback: 0 },
  },
};
type OpKey = "prk" | "lasik" | "lasik_moria" | "lasik_metal" | "femto" | "other";
type LevelKey = "consultant" | "specialist" | "unknown";
const normalizeText = (value: unknown) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const includesAny = (text: string, words: string[]) => words.some((word) => text.includes(word));
const detectOperationKey = (operation: unknown): OpKey => {
  const text = normalizeText(operation);
  if (includesAny(text, ["prk"])) return "prk";
  if (includesAny(text, ["femto", "فيمتو"])) return "femto";
  if (includesAny(text, ["metal", "ميتال"])) return "lasik_metal";
  if (includesAny(text, ["moria", "موريا"])) return "lasik_moria";
  if (includesAny(text, ["lasik", "ليزك"])) return "lasik";
  return "other";
};
const detectLevel = (value: unknown): LevelKey => {
  const text = normalizeText(value);
  if (includesAny(text, ["consultant", "استشاري"])) return "consultant";
  if (includesAny(text, ["specialist", "اخصائي", "أخصائي"])) return "specialist";
  return "unknown";
};
const detectDoctorGroup = (tabKey: string, doctorName: unknown): "saadany" | "sawaf" | "others" => {
  const text = normalizeText(doctorName);
  if (includesAny(text, ["د/السعدني", "saadany"])) return "saadany";
  if (includesAny(text, ["د/الصواف", "sawaf"])) return "sawaf";
  if (tabKey === TAB_SAADANY) return "saadany";
  if (tabKey === TAB_SAWAF) return "sawaf";
  return "others";
};
const getPricingDefaults = (
  tabKey: string,
  row: { operation?: string; doctor?: string },
  config: AppointmentsPricingConfig = DEFAULT_APPOINTMENTS_PRICING
) => {
  // Return empty amounts if user doesn't have pricing permission (config is EMPTY_APPOINTMENTS_PRICING)
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

const operationTypeLabel = (value: unknown) => {
  const key = String(value ?? "").trim();
  if (!key) return "أخرى";
  return OPERATION_LABELS[key] ?? key;
};

const normalizeDoctorName = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();
  if (lowered.includes("saadany") || lowered.includes("سعدني")) return "د. محمد السعدني";
  if (lowered.includes("sawaf") || lowered.includes("صواف")) return "د. أحمد الصواف";
  return raw;
};

const tabLabelByKey = (value: unknown) => {
  const key = normalizeTabKey(value);
  return TAB_CONFIG.find((tab) => tab.key === key)?.label ?? key;
};

export default function Appointments() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const userRole = String(user?.role ?? "").toLowerCase();
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const myPermissions = (permissionsQuery.data ?? []) as string[];
  const canManageList = userRole === "reception" || userRole === "admin" || userRole === "accountant";
  const canOpenPricing = userRole === "admin" || userRole === "accountant" || myPermissions.includes("appointments_pricing_v1") || myPermissions.includes("/admin/settings/pricing-rules");
  const canOpenAccounts = canOpenPricing || myPermissions.includes("/appointments/accounts");
  const canSearchList = canManageList || canOpenAccounts;

  const [activeTab, setActiveTab] = useState(TAB_SAADANY);
  const getLocalDateIso = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const [listDate, setListDate] = useState(() => getLocalDateIso());

  // Ensure listDate is always today's date on mount
  useEffect(() => {
    setListDate(getLocalDateIso());
  }, []);
  const [operationType, setOperationType] = useState("");
  const [operationTypeOther, setOperationTypeOther] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [listTime, setListTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  });
  const [viewMode, setViewMode] = useState<"list" | "accounts" | "history">("list");
  const [lists, setLists] = useState<Record<string, ListData[]>>({
    [TAB_SAADANY]: [],
    [TAB_SAWAF]: [],
    [TAB_OTHERS]: [],
  });

  const [newRow, setNewRow] = useState({
    number: "",
    name: "",
    phone: "",
    doctor: "",
    operation: "",
    eye: "",
    center: false,
    payment: "",
    hospital: "",
    code: "",
    amount: 0,
    paidAmount: 0,
    doctorAmount: null,
    discountType: "amount" as const,
    discountValue: 0,
  });
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [savedSummariesByTab, setSavedSummariesByTab] = useState<Record<string, SavedSummary[]>>({});
  const [accountsAdjustmentsByTab, setAccountsAdjustmentsByTab] = useState<Record<string, AccountsAdjustments>>({
    [TAB_SAADANY]: { radiology: 0, external: 0, cashbox: 0 },
    [TAB_SAWAF]: { radiology: 0, external: 0, cashbox: 0 },
    [TAB_OTHERS]: { radiology: 0, external: 0, cashbox: 0 },
  });
  const [accountsAdjustmentInputsByTab, setAccountsAdjustmentInputsByTab] = useState<Record<string, AccountsAdjustmentInputs>>({
    [TAB_SAADANY]: { radiology: "0", external: "0", cashbox: "0" },
    [TAB_SAWAF]: { radiology: "0", external: "0", cashbox: "0" },
    [TAB_OTHERS]: { radiology: "0", external: "0", cashbox: "0" },
  });

  const toDateInputValue = (value?: string | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };
  const [selectedListId, setSelectedListId] = useState<number>(0);
  const safeListDate = toDateInputValue(listDate) || new Date().toISOString().split("T")[0];
  const listQuery = trpc.medical.getOperationList.useQuery(
    { doctorTab: activeTab, listDate: safeListDate, operationType: operationType || null },
    { refetchOnWindowFocus: false, enabled: Boolean(safeListDate) && selectedListId === 0 }
  );
  const listByIdQuery = trpc.medical.getOperationListById.useQuery(
    { listId: selectedListId },
    { enabled: selectedListId > 0, refetchOnWindowFocus: false }
  );
  const historyQuery = trpc.medical.getOperationListsHistory.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const userStateQuery = trpc.medical.getUserPageState.useQuery(
    { page: "appointments" },
    { refetchOnWindowFocus: false }
  );
  const pricingSettingQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "appointments_pricing_v1" },
    {
      enabled: userRole === "admin" || userRole === "accountant" || myPermissions.includes("appointments_pricing_v1") || myPermissions.includes("/admin/settings/pricing-rules"),
      refetchOnWindowFocus: false
    }
  );
  const patientSearchQuery = trpc.medical.searchPatients.useQuery(
    { searchTerm: debouncedPatientSearch.replace(/\s+/g, "") },
    { enabled: debouncedPatientSearch.trim().length >= 1, refetchOnWindowFocus: false }
  );
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();
  const pricingConfig = useMemo(() => {
    // Only return pricing if user has permission
    if (!canOpenPricing) return EMPTY_APPOINTMENTS_PRICING;
    const value = (pricingSettingQuery.data as any)?.value;
    if (!value || typeof value !== "object") return DEFAULT_APPOINTMENTS_PRICING;
    return value as AppointmentsPricingConfig;
  }, [pricingSettingQuery.data, canOpenPricing]);

  const utils = trpc.useUtils();

  const saveListMutation = trpc.medical.saveOperationList.useMutation({
    onSuccess: async () => {
      // Clear list cache and refetch fresh data
      await utils.medical.getOperationList.invalidate();
      await listQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ القائمة"));
    },
  });

  const deleteListMutation = trpc.medical.deleteOperationList.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القائمة الحالية");
      listQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل حذف القائمة الحالية"));
    },
  });
  const deleteListByIdMutation = trpc.medical.deleteOperationListById.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القائمة من السجل");
      historyQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل حذف القائمة من السجل"));
    },
  });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const lastSavedRef = useRef<string>("");
  const lastSaveAttemptRef = useRef<{ snapshot: string; at: number }>({ snapshot: "", at: 0 });
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportTargetRef = useRef<HTMLDivElement | null>(null);
  const didHydrateUserStateRef = useRef(false);

  const formatDayDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    const day = date.toLocaleDateString("ar-EG", { weekday: "short" });
    const datePart = date.toLocaleDateString("ar-EG");
    return `${day} ${datePart}`;
  };

  const arabicWeekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const arabicWeekdaysByIndex = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  const getWeekdayIndex = (value?: string | null) => {
    if (!value) return new Date().getDay();
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return new Date().getDay();
    return date.getDay();
  };

  const formatDayDateLong = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    const weekday = arabicWeekdaysByIndex[date.getDay()] ?? "";
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${weekday} ${day}/${month}/${year}`;
  };

  const shiftDateToWeekday = (value: string, targetDayIndex: number) => {
    const base = new Date(value);
    if (Number.isNaN(base.valueOf())) return value;
    const delta = targetDayIndex - base.getDay();
    base.setDate(base.getDate() + delta);
    return toDateInputValue(base) || value;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!canOpenAccounts && viewMode === "accounts") {
      setViewMode("list");
    }
  }, [canOpenAccounts, viewMode]);




  useEffect(() => {
    if (!historyQuery.data) return;
    const grouped: typeof savedSummariesByTab = {};
    (historyQuery.data ?? []).forEach((item: any) => {
      const names = (item.items ?? []).map((row: any) => row?.name).filter(Boolean);
      const key = `${item.id}-${item.listDate}`;
      const tabKey = normalizeTabKey(item.doctorTab);
      grouped[tabKey] = grouped[tabKey] ?? [];
      grouped[tabKey].push({
        key,
        date: toDateInputValue(item.listDate) || String(item.listDate),
        names,
        listId: item.id,
        items: item.items ?? [],
        operationType: item.operationType ?? null,
      });
    });
    setSavedSummariesByTab((prev) => {
      const merged: typeof savedSummariesByTab = { ...prev };
      Object.entries(grouped).forEach(([tab, items]) => {
        const existing = merged[tab] ?? [];
        const byKey = new Map(existing.map((it) => [it.key, it]));
        items.forEach((it) => {
          if (!byKey.has(it.key)) {
            byKey.set(it.key, it);
          }
        });
        merged[tab] = Array.from(byKey.values());
      });
      return merged;
    });
  }, [historyQuery.data]);

  const normalizeOperationTypeFilter = (value?: string | null) => String(value ?? "").trim().toLowerCase();
  const selectedOperationTypeFilter = normalizeOperationTypeFilter(operationType || null);
  const filteredSavedSummaries = useMemo(() => {
    const items = savedSummariesByTab[activeTab] ?? [];
    if (!selectedOperationTypeFilter) return items;
    return items.filter((item) => normalizeOperationTypeFilter(item.operationType ?? null) === selectedOperationTypeFilter);
  }, [savedSummariesByTab, activeTab, selectedOperationTypeFilter]);

  useEffect(() => {
    if (!listDate) {
      setListDate(new Date().toISOString().split("T")[0]);
    }
  }, [listDate]);

  useEffect(() => {
    if (activeTab === TAB_SAADANY) {
      setDoctorName("د. محمد السعدني");
      return;
    }
    if (activeTab === TAB_SAWAF) {
      setDoctorName("د. أحمد الصواف");
    }
  }, [activeTab]);

  const operationOptions = useMemo(() => {
    if (activeTab === TAB_SAWAF || activeTab === TAB_OTHERS) {
      return ["PRK", "Lasik", "Lasik Moria", "Lasik Metal", "Femto"];
    }
    return ["PRK", "Lasik", "Lasik Moria", "Lasik Metal", "Femto", "Cataract", "Yag", "Other"];
  }, [activeTab]);

  useEffect(() => {
    if (operationType && !operationOptions.includes(operationType)) {
      setOperationType("");
      setOperationTypeOther("");
    }
  }, [operationType, operationOptions]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedPatientSearch(patientSearchTerm.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [patientSearchTerm]);

  useEffect(() => {
    const data = listQuery.data as any;
    if (!data || !data.items) return;
    setLists((prev) => {
      const existing = prev[activeTab] ?? [];
      const keyFor = (row: { code?: string; phone?: string; name?: string; id?: number }) =>
        `${String(row.code ?? "").trim()}|${String(row.phone ?? "").trim()}|${String(row.name ?? "").trim()}|${Number(row.id ?? 0)}`;
      const existingMap = new Map(existing.map((row) => [keyFor(row), row]));
      const items = (data.items ?? []).map((item: any, index: number) => {
        const next = {
          id: item.id ?? index + 1,
          number: item.number ?? "",
          name: item.name ?? "",
          phone: item.phone ?? "",
          doctor: normalizeDoctorName(item.doctor ?? ""),
          operation: item.operation ?? "",
          eye: item.eye ?? "",
          center: Boolean(item.center),
          payment: sanitizePayment(item.payment),
          hospital: item.hospital ?? "",
          code: item.code ?? "",
        };
        const current = existingMap.get(keyFor(next));
        const defaults = getPricingDefaults(activeTab, next, pricingConfig);
        return {
          ...next,
          amount: Number(current?.amount ?? 0) > 0 ? Number(current?.amount ?? 0) : defaults.amount,
          paidAmount: Number(current?.paidAmount ?? 0),
          doctorAmount: current?.doctorAmount ?? defaults.doctorAmount,
          discountType: current?.discountType ?? "amount",
          discountValue: Number(current?.discountValue ?? 0),
        };
      });
      return { ...prev, [activeTab]: items };
    });
    if (data.operationType !== undefined && data.operationType !== null) {
      setOperationType(String(data.operationType));
      if (data.operationType !== "Other") {
        setOperationTypeOther("");
      }
    }
    if (data.doctorName !== undefined && data.doctorName !== null) {
      setDoctorName(normalizeDoctorName(String(data.doctorName)));
    }
    if (data.listTime !== undefined && data.listTime !== null) {
      setListTime(String(data.listTime));
    }
  }, [listQuery.data, activeTab, pricingConfig]);

  if (!isAuthenticated) return null;

  const currentList = lists[activeTab] || [];
  const computeAccounting = (row: ListData) => {
    const defaults = getPricingDefaults(
      activeTab,
      { operation: row.operation || operationType || "Other", doctor: row.doctor || doctorName },
      pricingConfig
    );
    const amountFromRow = Number(row.amount ?? 0);
    const gross = amountFromRow > 0 ? amountFromRow : defaults.amount;
    const rawDiscount = Number(row.discountValue ?? 0);
    const normalizedDiscount = Number.isFinite(rawDiscount) ? Math.max(rawDiscount, 0) : 0;
    const discount =
      row.discountType === "percent"
        ? Math.min(gross, (gross * Math.min(normalizedDiscount, 100)) / 100)
        : Math.min(gross, normalizedDiscount);
    const net = Math.max(gross - discount, 0);
    const paid = net;
    const baseDoctorAmount = defaults.doctorAmount;
    const centerAmount =
      row.doctorAmount === null || row.doctorAmount === undefined
        ? baseDoctorAmount
        : Math.max(0, Number(row.doctorAmount ?? 0));
    const remainingAmount = paid - centerAmount;
    return { centerAmount, paid, remainingAmount };
  };
  const accountingTotals = currentList.reduce(
    (acc, row) => {
      const values = computeAccounting(row);
      return {
        centerAmount: acc.centerAmount + values.centerAmount,
        paid: acc.paid + values.paid,
        remainingAmount: acc.remainingAmount + values.remainingAmount,
      };
    },
    { centerAmount: 0, paid: 0, remainingAmount: 0 }
  );
  const accountsAdjustments = accountsAdjustmentsByTab[activeTab] ?? { radiology: 0, external: 0, cashbox: 0 };
  const accountsAdjustmentInputs = accountsAdjustmentInputsByTab[activeTab] ?? {
    radiology: String(accountsAdjustments.radiology ?? 0),
    external: String(accountsAdjustments.external ?? 0),
    cashbox: String(accountsAdjustments.cashbox ?? 0),
  };
  const accountsAdjustmentsTotal =
    Number(accountsAdjustments.radiology ?? 0) +
    Number(accountsAdjustments.external ?? 0) +
    Number(accountsAdjustments.cashbox ?? 0);
  const accountsNetAfterAdjustments = accountingTotals.remainingAmount - accountsAdjustmentsTotal;
  const showSawafAdjustments = activeTab === TAB_SAWAF;
  const handleAccountsAdjustmentInputChange = (key: keyof AccountsAdjustments, rawValue: string) => {
    setAccountsAdjustmentInputsByTab((prev) => ({
      ...prev,
      [activeTab]: {
        ...(prev[activeTab] ?? { radiology: "0", external: "0", cashbox: "0" }),
        [key]: rawValue,
      },
    }));
    const normalized = rawValue.trim().replace(",", ".");
    if (normalized === "" || normalized === "+" || normalized === "-") return;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return;
    setAccountsAdjustmentsByTab((prev) => ({
      ...prev,
      [activeTab]: {
        ...(prev[activeTab] ?? { radiology: 0, external: 0, cashbox: 0 }),
        [key]: parsed,
      },
    }));
  };
  const handleAccountsAdjustmentInputBlur = (key: keyof AccountsAdjustments) => {
    const numericValue = Number(accountsAdjustments[key] ?? 0);
    setAccountsAdjustmentInputsByTab((prev) => ({
      ...prev,
      [activeTab]: {
        ...(prev[activeTab] ?? { radiology: "0", external: "0", cashbox: "0" }),
        [key]: String(Number.isFinite(numericValue) ? numericValue : 0),
      },
    }));
  };
  const exportDoctorLabel = (doctorName || TAB_CONFIG.find((tab) => tab.key === activeTab)?.label || "-").trim();
  const exportOperationLabel = operationTypeLabel(operationType || "Other");
  const exportDateLabel = toDateInputValue(listDate) || "-";
  const exportTimeLabel = (listTime || "-").trim();

  const buildOpsTableHtml = (fontSize: string) => {
    const BORDER = "1px solid #555";
    const BASE = `border:${BORDER};padding:3px 5px;text-align:center;font-size:${fontSize};font-family:Arial,sans-serif;overflow:hidden;`;
    const H = `${BASE}background:#e5e7eb;font-weight:bold;`;
    const cols = [
      { label: "#",          w: "4%",  style: `${BASE}font-weight:bold;` },
      { label: "رقم الإيصال", w: "10%", style: BASE },
      { label: "اسم المريض", w: "26%", style: `${BASE}text-align:right;` },
      { label: "الهاتف",    w: "13%", style: `${BASE}direction:ltr;` },
      { label: "الطبيب",    w: "13%", style: BASE },
      { label: "العملية",   w: "10%", style: BASE },
      { label: "مركز",      w: "6%",  style: BASE },
      { label: "دفع",       w: "6%",  style: BASE },
      { label: "الكود",     w: "8%",  style: BASE },
    ];
    const colgroup = cols.map(c => `<col style="width:${c.w}">`).join("");
    const thead = cols.map(c => `<th style="${H}">${c.label}</th>`).join("");
    const tbody = currentList.map((apt, i) => {
      const vals = [i + 1, apt.number ?? "", apt.name ?? "", apt.phone ?? "", apt.doctor ?? "", operationTypeLabel(apt.operation), apt.center ? "✓" : "", apt.payment, apt.code ?? ""];
      return `<tr>${vals.map((v, ci) => `<td style="${cols[ci].style}">${v}</td>`).join("")}</tr>`;
    }).join("") || `<tr><td colspan="9" style="padding:10px;text-align:center;color:#888;font-size:${fontSize};">لا توجد حالات</td></tr>`;
    return `<colgroup>${colgroup}</colgroup><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody>`;
  };

  const buildAccountsPrintContent = (compact: boolean) => {
    const hindiDate = toHindi(exportDateLabel.replace(/-/g, "/"));
    const hindiTime = toHindi(exportTimeLabel);
    const bodyRows = currentList.map((apt) => {
      const values = computeAccounting(apt);
      return `<tr>
        <td>${apt.name || "-"}</td>
        <td>${operationTypeLabel(apt.operation || operationType || "Other")}</td>
        <td>${toHindi(String(Number(apt.amount ?? 0).toFixed(2)))}</td>
        <td>${apt.discountType === "percent" ? "نسبة %" : "قيمة"}</td>
        <td>${toHindi(String(Number(apt.discountValue ?? 0).toFixed(2)))}</td>
        <td>${toHindi(values.paid.toFixed(2))}</td>
        <td>${toHindi(values.centerAmount.toFixed(2))}</td>
        <td>${toHindi(values.remainingAmount.toFixed(2))}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="8" style="padding:10px;text-align:center;color:#888;">لا توجد حالات</td></tr>`;
    const extraRows = showSawafAdjustments
      ? `
        <tr>
          <td colspan="5"></td>
          <td style="font-weight:700;">الاشعه</td>
          <td colspan="2">${toHindi(accountsAdjustments.radiology.toFixed(2))}</td>
        </tr>
        <tr>
          <td colspan="5"></td>
          <td style="font-weight:700;">خارجي</td>
          <td colspan="2">${toHindi(accountsAdjustments.external.toFixed(2))}</td>
        </tr>
        <tr>
          <td colspan="5"></td>
          <td style="font-weight:700;">الصندوق</td>
          <td colspan="2">${toHindi(accountsAdjustments.cashbox.toFixed(2))}</td>
        </tr>
        <tr style="font-weight:700;background:#f5f5f5;">
          <td colspan="5">إجمالي (الاشعه + خارجي + الصندوق)</td>
          <td>${toHindi(accountsAdjustmentsTotal.toFixed(2))}</td>
          <td>${toHindi(accountingTotals.centerAmount.toFixed(2))}</td>
          <td>${toHindi(accountsNetAfterAdjustments.toFixed(2))}</td>
        </tr>
      `
      : "";
    const cellPad = compact ? "3px 6px" : "6px 6px";
    const headSize = compact ? "9pt" : "12pt";
    const bodySize = compact ? "9pt" : "12pt";
    return `
      <div dir="rtl" style="font-size:${compact ? "11px" : "14px"};font-weight:700;margin-bottom:8px;text-align:center;font-family:Tahoma,Arial,sans-serif;">
        حسابات العمليات - التاريخ: ${hindiDate} &nbsp;|&nbsp; الساعة: ${hindiTime} &nbsp;|&nbsp; الطبيب: ${exportDoctorLabel} &nbsp;|&nbsp; نوع العملية: ${exportOperationLabel}
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Tahoma,Arial,sans-serif;">
        <thead><tr>
          ${["اسم المريض", "نوع العملية", "المبلغ", "نوع الخصم", "الخصم", "المدفوع", "حساب المركز (من الدكتور)", "المتبقي (حساب الدكتور)"]
            .map((h) => `<th style="border:1px solid #444;padding:${cellPad};background:#d1d5db;font-weight:bold;font-size:${headSize};text-align:center;">${h}</th>`)
            .join("")}
        </tr></thead>
        <tbody style="font-size:${bodySize};">
          ${bodyRows}
          <tr style="font-weight:700;background:#f3f4f6;">
            <td colspan="5">الإجمالي</td>
            <td>${toHindi(accountingTotals.paid.toFixed(2))}</td>
            <td>${toHindi(accountingTotals.centerAmount.toFixed(2))}</td>
            <td>${toHindi(accountingTotals.remainingAmount.toFixed(2))}</td>
          </tr>
          ${extraRows}
        </tbody>
      </table>
      <style>tbody tr td{border:1px solid #444;padding:${cellPad};text-align:center;vertical-align:middle;}</style>
    `;
  };

  const buildOperationsPrintContent = () => {
    if (viewMode === "accounts") {
      return buildAccountsPrintContent(false);
    }
    const hindiDate = toHindi(exportDateLabel.replace(/-/g, "/"));
    const hindiTime = toHindi(exportTimeLabel);
    const hasCataract = operationType === "Cataract" || currentList.some(r => r.operation === "Cataract");
    const colSpan = hasCataract ? 10 : 9;
    const cols = [
      { key: "#", w: "4%" },
      { key: "name", w: "28%" },
      { key: "phone", w: "12%" },
      { key: "doctor", w: "14%" },
      { key: "operation", w: "10%" },
      { key: "eye", w: "8%" },
      ...(hasCataract ? [{ key: "hospital", w: "10%" }] : []),
      { key: "center", w: "7%" },
      { key: "payment", w: "7%" },
      { key: "code", w: "10%" },
    ];
    const colgroup = `<colgroup>${cols.map((c) => `<col style="width:${c.w}">`).join("")}</colgroup>`;
    const rows = currentList.map((apt, i) => `<tr>
      <td style="font-weight:bold;text-align:center;">${toHindi(String(i + 1))}</td>
      <td style="text-align:center;">${apt.name ?? ""}</td>
      <td style="direction:ltr;text-align:center;">${apt.phone ?? ""}</td>
      <td>${apt.doctor ?? ""}</td>
      <td>${operationTypeLabel(apt.operation)}</td>
      <td>${apt.eye ?? ""}</td>
      ${hasCataract ? `<td>${apt.hospital ?? ""}</td>` : ""}
      <td>${apt.center ? "✓" : ""}</td>
      <td>${apt.payment}</td>
      <td>${apt.code ?? ""}</td>
    </tr>`).join("") || `<tr><td colspan="${colSpan}" style="padding:10px;text-align:center;color:#888;">لا توجد حالات</td></tr>`;
    const headers = ["#","اسم المريض","الهاتف","الطبيب","العملية","العين",...(hasCataract ? ["المستشفى"] : []),"مركز","دفع","الكود"];
    return `
      <div dir="rtl" style="font-size:14px;font-weight:700;margin-bottom:10px;text-align:center;font-family:Tahoma,Arial,sans-serif;">
        التاريخ: ${hindiDate} &nbsp;|&nbsp; الساعة: ${hindiTime} &nbsp;|&nbsp; الطبيب: ${exportDoctorLabel}
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Tahoma,Arial,sans-serif;">
        ${colgroup}
        <thead><tr>
          ${headers.map(h=>`<th style="border:1px solid #444;padding:6px 6px;background:#d1d5db;font-weight:bold;font-size:12pt;text-align:center;white-space:nowrap;line-height:1.2;font-family:Tahoma,Arial,sans-serif;vertical-align:middle;height:44px;">${h}</th>`).join("")}
        </tr></thead>
        <tbody style="font-size:12pt;">${rows}</tbody>
      </table>
      <style>tbody tr td{border:1px solid #444;padding:6px 6px;text-align:center;vertical-align:middle !important;white-space:nowrap;line-height:1.2;font-family:Tahoma,Arial,sans-serif;height:42px;display:table-cell;} tbody tr td:nth-child(3){direction:ltr;}</style>`;
  };

  const handlePrint = () => {
    if (viewMode === "accounts") {
      const content = buildAccountsPrintContent(true);
      const overlay = document.createElement("div");
      overlay.id = "ops-print-overlay";
      overlay.dir = "rtl";
      overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:#fff;padding:8mm;box-sizing:border-box;overflow:auto;font-family:Arial,sans-serif;";
      overlay.innerHTML = content;
      document.body.appendChild(overlay);

      const style = document.createElement("style");
      style.id = "ops-print-style";
      style.textContent = `@page{size:A5 landscape;margin:6mm;} @media print{body>*{display:none!important;} body>#ops-print-overlay{display:block!important;position:fixed!important;inset:0!important;padding:0!important;}}`;
      document.head.appendChild(style);

      const cleanup = () => {
        overlay.remove();
        document.getElementById("ops-print-style")?.remove();
      };
      window.addEventListener("afterprint", cleanup, { once: true });
      window.print();
      return;
    }

    const hindiDate = toHindi(exportDateLabel.replace(/-/g, "/"));
    const hindiTime = toHindi(exportTimeLabel);
    const hasCataract = operationType === "Cataract" || currentList.some(r => r.operation === "Cataract");
    const colSpan = hasCataract ? 10 : 9;
    const rows = currentList.map((apt, i) => `<tr>
      <td style="font-weight:bold;text-align:center;">${toHindi(String(i + 1))}</td>
      <td style="text-align:right;">${apt.name ?? ""}</td>
      <td style="direction:ltr;text-align:center;">${apt.phone ?? ""}</td>
      <td>${apt.doctor ?? ""}</td>
      <td>${operationTypeLabel(apt.operation)}</td>
      <td>${apt.eye ?? ""}</td>
      ${hasCataract ? `<td>${apt.hospital ?? ""}</td>` : ""}
      <td>${apt.center ? "✓" : ""}</td>
      <td>${apt.payment}</td>
      <td>${apt.code ?? ""}</td>
    </tr>`).join("") || `<tr><td colspan="${colSpan}" style="padding:10px;text-align:center;color:#888;">لا توجد حالات</td></tr>`;
    const headers = ["#","اسم المريض","الهاتف","الطبيب","العملية","العين",...(hasCataract ? ["المستشفى"] : []),"مركز","دفع","الكود"];
    const content = `
      <div dir="rtl" style="font-size:11px;font-weight:700;margin-bottom:8px;text-align:center;font-family:Tahoma,Arial,sans-serif;">
        التاريخ: ${hindiDate} &nbsp;|&nbsp; الساعة: ${hindiTime} &nbsp;|&nbsp; الطبيب: ${exportDoctorLabel}
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:auto;font-family:Tahoma,Arial,sans-serif;">
        <thead><tr>
          ${headers.map(h=>`<th style="border:1px solid #444;padding:3px 6px;background:#d1d5db;font-weight:bold;font-size:9pt;text-align:center;">${h}</th>`).join("")}
        </tr></thead>
        <tbody style="font-size:9pt;">${rows}</tbody>
      </table>
      <style>tbody tr td{border:1px solid #444;padding:3px 6px;text-align:center;vertical-align:middle;}</style>`;

    const overlay = document.createElement("div");
    overlay.id = "ops-print-overlay";
    overlay.dir = "rtl";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:#fff;padding:8mm;box-sizing:border-box;overflow:auto;font-family:Arial,sans-serif;";
    overlay.innerHTML = content;
    document.body.appendChild(overlay);

    const style = document.createElement("style");
    style.id = "ops-print-style";
    style.textContent = `@page{size:A5 landscape;margin:6mm;} @media print{body>*{display:none!important;} body>#ops-print-overlay{display:block!important;position:fixed!important;inset:0!important;padding:0!important;}}`;
    document.head.appendChild(style);

    const cleanup = () => {
      overlay.remove();
      document.getElementById("ops-print-style")?.remove();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  };

  const toHindi = (s: string) => s.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  const sanitizePayment = (v: any) => { const s = String(v ?? ""); return (s === "true" || s === "false" || s === "1" || s === "0") ? "" : s; };

  const captureOperationsAsJpg = async (): Promise<Blob> => {
    const content = buildOperationsPrintContent();
    const captureWidth = 1180; // A5 landscape-like viewport used in print preview
    const captureHeight = 820;
    const captureRoot = document.createElement("div");
    captureRoot.dir = "rtl";
    captureRoot.style.cssText = `position:fixed;left:-99999px;top:0;z-index:-1;background:#fff;padding:8mm;box-sizing:border-box;overflow:hidden;font-family:Tahoma,Arial,sans-serif;width:${captureWidth}px;height:${captureHeight}px;`;
    captureRoot.innerHTML = content;
    document.body.appendChild(captureRoot);
    try {
      await new Promise((r) => setTimeout(r, 120));
      const blob = await captureElementAsJpg({
        element: captureRoot,
        quality: 0.92,
      });
      if (!blob) throw new Error("toBlob failed");
      return blob;
    } finally {
      captureRoot.remove();
    }
  };

  const buildExportFileName = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `operations-${activeTab}-${stamp}.jpg`;
  };

  const saveBlobInBrowser = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const blobToBase64Data = async (blob: Blob): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Cannot read export blob."));
      reader.readAsDataURL(blob);
    });
    const commaIndex = dataUrl.indexOf(",");
    return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  };

  const saveJpg = async () => {
    try {
      const blob = await captureOperationsAsJpg();
      const fileName = buildExportFileName();
      if (!Capacitor.isNativePlatform()) {
        saveBlobInBrowser(blob, fileName);
        toast.success("تم حفظ الصورة JPG");
        return;
      }

      const base64 = await blobToBase64Data(blob);
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      toast.success("تم حفظ الصورة JPG في Documents");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "تعذر حفظ الصورة JPG"));
    }
  };

  const shareJpg = async () => {
    try {
      const blob = await captureOperationsAsJpg();
      const fileName = buildExportFileName();

      if (Capacitor.isNativePlatform()) {
        const base64 = await blobToBase64Data(blob);
        const written = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title: "Operations",
          text: "Operations list JPG",
          url: written.uri,
          dialogTitle: "Share JPG",
        });
        return;
      }

      if (navigator.share) {
        const file = new File([blob], fileName, { type: "image/jpeg" });
        const canShareFiles =
          typeof (navigator as any).canShare === "function"
            ? (navigator as any).canShare({ files: [file] })
            : true;
        if (canShareFiles) {
          await navigator.share({ title: "Operations", files: [file] });
          return;
        }
      }

      saveBlobInBrowser(blob, fileName);
      toast.success("تم حفظ الصورة JPG");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "تعذر مشاركة الصورة JPG"));
    }
  };

  const handleAddPatientRow = (patient: any) => {
    if (!canManageList) return;
    if (!patient?.fullName) {
      toast.error("بيانات المريض غير مكتملة");
      return;
    }
    const exists = currentList.some(
      (row) =>
        row.patientId === patient.id ||
        (!!patient.patientCode && row.code === patient.patientCode) ||
        (!!patient.phone && row.phone === patient.phone)
    );
    if (exists) {
      toast.error("هذه الحالة موجودة بالفعل في القائمة");
      return;
    }
    const row: ListData = {
      id: currentList.length + 1,
      patientId: patient.id,
      number: "",
      name: patient.fullName ?? "",
      phone: patient.phone ?? "",
      doctor: doctorName,
      operation: operationType === "" ? operationTypeOther : operationType,
      eye: "",
      center: false,
      payment: "",
      hospital: "",
      code: patient.patientCode ?? "",
      amount: 0,
      paidAmount: 0,
      doctorAmount: null,
      discountType: "amount",
      discountValue: 0,
    };
    const defaults = getPricingDefaults(activeTab, row, pricingConfig);
    row.amount = defaults.amount;
    row.doctorAmount = defaults.doctorAmount;
    setLists({
      ...lists,
      [activeTab]: [...currentList, row],
    });
    setPatientSearchTerm("");
    setDebouncedPatientSearch("");
  };

  const handleDeleteRow = (id: number) => {
    if (!canManageList) return;
    setLists({
      ...lists,
      [activeTab]: currentList.filter((apt) => apt.id !== id),
    });
    toast.success("تم حذف الصف من القائمة");
  };

  const handleUpdateRow = (id: number, field: string, value: any) => {
    if (!canManageList) return;
    setLists({
      ...lists,
      [activeTab]: currentList.map((apt) => {
        if (apt.id !== id) return apt;
        const updated = { ...apt, [field]: value } as ListData;
        if (field === "amount" || field === "discountType" || field === "discountValue") {
          const amountFromRow = Number(updated.amount ?? 0);
          const rawDiscount = Number(updated.discountValue ?? 0);
          const normalizedDiscount = Number.isFinite(rawDiscount) ? Math.max(rawDiscount, 0) : 0;
          const discount =
            updated.discountType === "percent"
              ? Math.min(amountFromRow, (amountFromRow * Math.min(normalizedDiscount, 100)) / 100)
              : Math.min(amountFromRow, normalizedDiscount);
          updated.paidAmount = Math.max(amountFromRow - discount, 0);
        }
        return updated;
      }),
    });
  };

  const handleSaveList = async () => {
    if (!canManageList) {
      toast.error("عرض فقط لهذا الدور");
      return;
    }
    if (saveListMutation.isPending) return;
    if (currentList.length === 0) {
      toast.error("القائمة فارغة. أضف حالة واحدة على الأقل قبل الحفظ");
      return;
    }
    const receiptNumbers = currentList
      .map((row) => String(row.number ?? "").trim())
      .filter((value) => value.length > 0);
    const duplicateReceipt = receiptNumbers.find((value, idx) => receiptNumbers.indexOf(value) !== idx);
    if (duplicateReceipt) {
      toast.error(`رقم الإيصال مكرر: ${duplicateReceipt}`);
      return;
    }
    const patientCodes = currentList
      .map((row) => String(row.code ?? "").trim())
      .filter((value) => value.length > 0);
    const duplicateCode = patientCodes.find((value, idx) => patientCodes.indexOf(value) !== idx);
    if (duplicateCode) {
      toast.error(`كود المريض مكرر: ${duplicateCode}`);
      return;
    }

    const payload = {
      listId: selectedListId > 0 ? selectedListId : null,
      doctorTab: activeTab,
      listDate,
      operationType: operationType || null,
      doctorName: doctorName || null,
      listTime: listTime || null,
      items: currentList.map((row) => ({
        number: row.number,
        name: row.name,
        phone: row.phone,
        doctor: row.doctor,
        operation: row.operation,
        eye: row.eye,
        center: row.center,
        payment: sanitizePayment(row.payment),
        hospital: row.hospital,
        code: row.code,
        discountType: row.discountType,
        discountValue: row.discountValue,
        })),
    };
    const snapshot = JSON.stringify(payload);
    const now = Date.now();
    if (
      lastSaveAttemptRef.current.snapshot === snapshot &&
      now - lastSaveAttemptRef.current.at < 2000
    ) {
      return;
    }
    lastSaveAttemptRef.current = { snapshot, at: now };
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    // Prevent auto-save from submitting the same payload right after manual save.
    lastSavedRef.current = snapshot;

    await saveListMutation.mutateAsync(payload);

    const tabLabel = TAB_CONFIG.find((tab) => tab.key === activeTab)?.label ?? activeTab;
    const names = currentList.map((row) => row.name).filter(Boolean);
    const key = `${listDate}-${names.join("|")}`;
    setSavedSummariesByTab((prev) => {
      const next = prev[activeTab] ?? [];
      if (next.some((item) => item.key === key)) {
        return prev;
      }
      const updated = {
        ...prev,
        [activeTab]: [...next, { key, date: listDate, names, items: currentList, operationType: operationType || null }],
      };
      localStorage.setItem("appointments_saved_summaries", JSON.stringify(updated));
      return updated;
    });
    historyQuery.refetch();
  };

  const handleEditSavedSummary = (summary: SavedSummary) => {
    if (summary.listId) {
      handleLoadListById(summary.listId);
      return;
    }
    setListDate(summary.date);
    setLists({
      ...lists,
      [activeTab]: summary.items.map((row: any, idx: number) => {
        const mapped = {
          id: row.id ?? idx + 1,
          patientId: row.patientId ?? null,
          number: row.number ?? "",
          name: row.name ?? "",
          phone: row.phone ?? "",
          doctor: normalizeDoctorName(row.doctor ?? doctorName),
          operation: row.operation ?? "",
          eye: row.eye ?? "",
          center: Boolean(row.center),
          payment: sanitizePayment(row.payment),
          hospital: row.hospital ?? "",
          code: row.code ?? "",
          amount: Number(row.amount ?? 0),
          paidAmount: Number(row.paidAmount ?? 0),
          doctorAmount: row.doctorAmount === null || row.doctorAmount === undefined ? null : Number(row.doctorAmount),
          discountType: (row.discountType === "percent" ? "percent" : "amount") as "amount" | "percent",
          discountValue: Number(row.discountValue ?? 0),
        };
        const defaults = getPricingDefaults(activeTab, mapped, pricingConfig);
        return {
          ...mapped,
          amount: mapped.amount > 0 ? mapped.amount : defaults.amount,
          doctorAmount: mapped.doctorAmount ?? defaults.doctorAmount,
        };
      }),
    });
  };

  const handleDeleteSavedSummary = (key: string, listId?: number) => {
    if (listId) {
      deleteListByIdMutation.mutate({ listId });
    }
    setSavedSummariesByTab((prev) => {
      const updated = {
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).filter((item) => item.key !== key),
      };
      localStorage.setItem("appointments_saved_summaries", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (!canManageList) return;
    if (!autoSaveEnabled) return;
    if (saveListMutation.isPending) return;
    if (currentList.length === 0) return;
    const payload = {
      listId: selectedListId > 0 ? selectedListId : null,
      doctorTab: activeTab,
      listDate,
      operationType: operationType || null,
      doctorName: doctorName || null,
      listTime: listTime || null,
      items: currentList.map((row) => ({
        number: row.number,
        name: row.name,
        phone: row.phone,
        doctor: row.doctor,
        operation: row.operation,
        eye: row.eye,
        center: row.center,
        payment: sanitizePayment(row.payment),
        hospital: row.hospital,
        code: row.code,
        discountType: row.discountType,
        discountValue: row.discountValue,
      })),
    };
    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSavedRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const now = Date.now();
        if (
          lastSaveAttemptRef.current.snapshot === snapshot &&
          now - lastSaveAttemptRef.current.at < 2000
        ) {
          return;
        }
        lastSaveAttemptRef.current = { snapshot, at: now };
        await saveListMutation.mutateAsync(payload);
        lastSavedRef.current = snapshot;
        historyQuery.refetch();
      } catch {
        // errors handled by mutation handler
      }
    }, 1200);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [autoSaveEnabled, activeTab, listDate, operationType, doctorName, listTime, currentList, selectedListId, saveListMutation, saveListMutation.isPending, historyQuery]);


  useEffect(() => {
    const payload = {
      activeTab,
      listDate,
      operationType,
      operationTypeOther,
      doctorName,
      listTime,
      viewMode,
      historySearch,
      autoSaveEnabled,
    };
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      saveUserStateMutation.mutate({ page: "appointments", data: payload });
    }, 800);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [
    activeTab,
    listDate,
    operationType,
    operationTypeOther,
    doctorName,
    listTime,
    viewMode,
    historySearch,
    autoSaveEnabled,
    saveUserStateMutation,
  ]);

  const handleNewList = async () => {
    if (!canManageList) {
      toast.error("عرض فقط لهذا الدور");
      return;
    }
    // "New List" should only clear the current local working form, not delete saved DB history.
    setLists({ ...lists, [activeTab]: [] });
    setSelectedListId(0);
    setNewRow({
      number: "",
      name: "",
      phone: "",
      doctor: "",
      operation: "",
      eye: "",
      center: false,
      payment: "",
      hospital: "",
      code: "",
      amount: 0,
      paidAmount: 0,
      doctorAmount: null,
      discountType: "amount",
      discountValue: 0,
    });
  };

  const handleLoadListById = (listId: number) => {
    setSelectedListId(listId);
  };

  useEffect(() => {
    const data = listByIdQuery.data as any;
    if (!data || !data.id) return;
    setActiveTab(normalizeTabKey(data.doctorTab ?? activeTab));
    setListDate(toDateInputValue(data.listDate));
    setDoctorName(normalizeDoctorName(data.doctorName ?? ""));
    setOperationType(data.operationType ?? "");
    setListTime(data.listTime ?? "");
    const items = (data.items ?? []).map((item: any, index: number) => ({
      id: item.id ?? index + 1,
      number: item.number ?? "",
      name: item.name ?? "",
      phone: item.phone ?? "",
      doctor: normalizeDoctorName(item.doctor ?? ""),
      operation: item.operation ?? "",
      eye: item.eye ?? "",
      center: Boolean(item.center),
      payment: sanitizePayment(item.payment),
      hospital: item.hospital ?? "",
      code: item.code ?? "",
      amount: 0,
      paidAmount: 0,
      doctorAmount: null,
      discountType: "amount" as const,
      discountValue: 0,
    })).map((row: ListData) => {
      const defaults = getPricingDefaults(normalizeTabKey(data.doctorTab ?? activeTab), row, pricingConfig);
      return {
        ...row,
        amount: defaults.amount,
        doctorAmount: defaults.doctorAmount,
      };
    });
    setLists((prev) => ({ ...prev, [normalizeTabKey(data.doctorTab ?? activeTab)]: items }));
  }, [listByIdQuery.data, activeTab, pricingConfig]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader backTo="/dashboard" />

      <main className="container mx-auto px-4 py-8 print:p-0">
        {(listQuery.isError || historyQuery.isError || (canOpenPricing && pricingSettingQuery.isError) || permissionsQuery.isError) && (
          <div className="mb-4">
            <OfflinePageState
              title="تعذر مزامنة قوائم العمليات"
              body="قد لا تكون آخر القوائم أو التسعير أو الصلاحيات محدثة الآن. أعد المحاولة بعد استقرار الاتصال."
              onRetry={() => {
                void listQuery.refetch();
                void historyQuery.refetch();
                void pricingSettingQuery.refetch();
                void permissionsQuery.refetch();
              }}
            />
          </div>
        )}

        <div className="flex gap-2 mb-6 print:hidden border-b-2 border-gray-300">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 font-bold text-lg transition-all ${
                activeTab === tab.key ? "border-b-4 border-primary text-primary" : "text-gray-600 hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-4 print:hidden border-b border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 font-semibold transition-all ${
              viewMode === "list" ? "border-b-2 border-primary text-primary" : "text-gray-600 hover:text-primary"
            }`}
          >
            القائمة
          </button>
          {canOpenAccounts && (
            <button
              type="button"
              onClick={() => setViewMode("accounts")}
              className={`px-4 py-2 font-semibold transition-all ${
                viewMode === "accounts" ? "border-b-2 border-primary text-primary" : "text-gray-600 hover:text-primary"
              }`}
            >
              حسابات
            </button>
          )}
          <button
            type="button"
            onClick={() => setViewMode("history")}
            className={`px-4 py-2 font-semibold transition-all ${
              viewMode === "history" ? "border-b-2 border-primary text-primary" : "text-gray-600 hover:text-primary"
            }`}
          >
            السجل السابق
          </button>
        </div>

        <div className="bg-white p-8 print:p-0">
          {(viewMode === "list" || viewMode === "accounts") && (
          <>
            <div className="mb-4 border-b-2 pb-3" style={{ textAlign: "center" }}>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm print:hidden">
              <label className="flex items-center gap-2">
                <span>تاريخ القائمة:</span>
                <select
                  value={getWeekdayIndex(toDateInputValue(listDate) || new Date().toISOString().split("T")[0])}
                  onChange={(e) => {
                    const targetIndex = Number(e.target.value);
                    const base = toDateInputValue(listDate) || new Date().toISOString().split("T")[0];
                    setListDate(shiftDateToWeekday(base, targetIndex));
                  }}
                  disabled={!canManageList}
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                >
                  {arabicWeekdays.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={toDateInputValue(listDate)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setListDate(value || new Date().toISOString().split("T")[0]);
                  }}
                  disabled={!canManageList}
                  className="text-sm h-7 w-40 text-center"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>الطبيب المعالج:</span>
                <Input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="text-sm h-7 w-40 text-center"
                  readOnly={!canManageList || activeTab !== TAB_OTHERS}
                />
              </label>
              <div className="flex items-center gap-2">
                <span>نوع العملية:</span>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  disabled={!canManageList}
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                >
                  <option value="">-- اختر النوع --</option>
                  {operationOptions.map((opt) => (
                    <option key={opt} value={opt}>{operationTypeLabel(opt)}</option>
                  ))}
                </select>
                {operationType === "Other" && (
                  <Input
                    value={operationTypeOther}
                    onChange={(e) => setOperationTypeOther(e.target.value)}
                    disabled={!canManageList}
                    className="text-sm h-7 w-36 text-center"
                    placeholder="أخرى"
                  />
                )}
              </div>
              <label className="flex items-center gap-2">
                <span>الساعة:</span>
                <Input
                  type="time"
                  value={listTime}
                  onChange={(e) => setListTime(e.target.value)}
                  disabled={!canManageList}
                  className="text-sm h-7 w-32 text-center"
                />
              </label>
            </div>
            <div className="hidden print:flex items-center justify-center gap-6 text-[14px]">
              <div>{formatDayDateLong(toDateInputValue(listDate) || new Date().toISOString().split("T")[0])}</div>
              <div>الطبيب المعالج: {doctorName || "-"}</div>
              <div>الساعة: {listTime || "-"}</div>
            </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handleSaveList} disabled={!canManageList}>
                <Save className="h-4 w-4 mr-2" />
                حفظ القائمة
              </Button>
              <Button
                variant={autoSaveEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoSaveEnabled((prev) => !prev)}
                disabled={!canManageList}
                className={autoSaveEnabled ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                الحفظ التلقائي: {autoSaveEnabled ? "مفعل" : "متوقف"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewList} disabled={!canManageList}>
                <RotateCcw className="h-4 w-4 mr-2" />
                قائمة جديدة
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={saveJpg}>
                <ImageDown className="h-4 w-4 mr-2" />
                حفظ JPG
              </Button>
              <Button variant="outline" size="sm" onClick={shareJpg}>
                <Share2 className="h-4 w-4 mr-2" />
                مشاركة JPG
              </Button>
            </div>
          </div>

          {canManageList && (
            <div className="mb-4 space-y-3 print:hidden" dir="rtl">
              <Input
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder="ابحث في جدول المرضى بالكود أو الاسم أو الموبايل"
                className="w-full max-w-md ml-auto text-right"
              />
              {debouncedPatientSearch.trim().length >= 1 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full min-w-[520px] border-collapse text-xs text-center">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-200 px-3 py-2">الكود</th>
                        <th className="border border-slate-200 px-3 py-2">اسم المريض</th>
                        <th className="border border-slate-200 px-3 py-2">الهاتف</th>
                        <th className="border border-slate-200 px-3 py-2 w-24">إضافة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientSearchQuery.isLoading && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-muted-foreground">جاري البحث...</td>
                        </tr>
                      )}
                      {!patientSearchQuery.isLoading && ((patientSearchQuery.data as any[])?.length ?? 0) === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-muted-foreground">لا توجد نتائج</td>
                        </tr>
                      )}
                      {!patientSearchQuery.isLoading && ((patientSearchQuery.data as any[]) ?? []).map((patient: any) => (
                        <tr key={patient.id} className="hover:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2" dir="ltr">{patient.patientCode || "-"}</td>
                          <td className="border border-slate-200 px-3 py-2">{patient.fullName || "-"}</td>
                          <td className="border border-slate-200 px-3 py-2" dir="ltr">{patient.phone || "-"}</td>
                          <td className="border border-slate-200 px-3 py-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => handleAddPatientRow(patient)}>
                              <Plus className="h-4 w-4 ml-1" />
                              إضافة
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {viewMode === "list" && (
          <div className="mb-6" dir="rtl">
            {/* Editable table — screen only */}
            <div ref={exportTargetRef} className="overflow-x-auto ops-screen-table">
              <div className="mb-1 text-sm font-bold">قائمة العمليات</div>
              <div className="mb-2 text-xs text-muted-foreground">
                التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب: {exportDoctorLabel} | نوع العملية: {exportOperationLabel}
              </div>
              <table className="w-full table-fixed border-collapse border border-gray-500 text-xs text-center" dir="rtl">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-500 p-1 font-bold w-6 text-center">#</th>
                    <th className="border border-gray-500 p-1 font-bold w-16 text-center">رقم الإيصال</th>
                    <th className="border border-gray-500 p-1 font-bold w-36 text-center">اسم المريض</th>
                    <th className="border border-gray-500 p-1 font-bold w-24 text-center">الهاتف</th>
                    <th className="border border-gray-500 p-2 font-bold w-20 text-center">الطبيب</th>
                    <th className="border border-gray-500 p-1 font-bold w-12 text-center">العملية</th>
                    <th className="border border-gray-500 p-1 font-bold w-14 text-center">العين</th>
                    {(operationType === "Cataract" || currentList.some(r => r.operation === "Cataract")) && (
                      <th className="border border-gray-500 p-1 font-bold w-16 text-center">المستشفى</th>
                    )}
                    <th className="border border-gray-500 p-1 font-bold w-6 text-center">مركز</th>
                    <th className="border border-gray-500 p-1 font-bold w-12 text-center">دفع</th>
                    <th className="border border-gray-500 p-1 font-bold w-12 text-center">الكود</th>
                    <th className="border border-gray-500 p-1 font-bold w-12 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((apt, index) => (
                    <tr key={apt.id} className="border border-gray-500">
                      <td className="border border-gray-500 p-1 text-center font-bold w-6">{index + 1}</td>
                      <td className="border border-gray-500 p-1 w-16"><Input dir="ltr" value={apt.number} onChange={(e) => handleUpdateRow(apt.id, "number", e.target.value)} readOnly={!canManageList} className="text-[11px] h-6 text-center w-full" /></td>
                      <td className="border border-gray-500 p-1 w-36"><Input dir="rtl" value={apt.name} onChange={(e) => handleUpdateRow(apt.id, "name", e.target.value)} readOnly={!canManageList} className="text-[11px] h-6 text-center w-full !max-w-none" /></td>
                      <td className="border border-gray-500 p-1 w-24"><Input dir="rtl" value={apt.phone} onChange={(e) => handleUpdateRow(apt.id, "phone", e.target.value)} readOnly={!canManageList} className="text-[11px] h-6 text-center w-full" /></td>
                      <td className="border border-gray-500 p-1 w-20"><Input dir="rtl" value={apt.doctor} onChange={(e) => handleUpdateRow(apt.id, "doctor", e.target.value)} readOnly={!canManageList} className="text-[11px] h-6 text-center w-full" /></td>
                      <td className="border border-gray-500 p-1 w-12 text-center">
                        <select value={apt.operation || ""} onChange={(e) => handleUpdateRow(apt.id, "operation", e.target.value)} disabled={!canManageList} className="text-[11px] h-6 text-center w-full border-0 bg-transparent">
                          <option value="">-</option>
                          {operationOptions.map((opt) => (
                            <option key={opt} value={opt}>{operationTypeLabel(opt)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-500 p-1 w-14 text-center">
                        <select value={apt.eye || ""} onChange={(e) => handleUpdateRow(apt.id, "eye", e.target.value)} disabled={!canManageList} className="text-[11px] h-6 text-center w-full border-0 bg-transparent">
                          <option value="">-</option>
                          <option value="OD">OD</option>
                          <option value="OS">OS</option>
                          <option value="OU">OU</option>
                        </select>
                      </td>
                      {(operationType === "Cataract" || currentList.some(r => r.operation === "Cataract")) && (
                        <td className="border border-gray-500 p-1 w-16 text-center">
                          <select value={apt.hospital || ""} onChange={(e) => handleUpdateRow(apt.id, "hospital", e.target.value)} disabled={!canManageList} className="text-[11px] h-6 text-center w-full border-0 bg-transparent">
                            <option value="">-</option>
                            <option value="الشروق">الشروق</option>
                            <option value="الأمل">الأمل</option>
                          </select>
                        </td>
                      )}
                      <td className="border border-gray-500 p-1 w-6 text-center"><input type="checkbox" checked={apt.center} onChange={(e) => handleUpdateRow(apt.id, "center", e.target.checked)} disabled={!canManageList} /></td>
                      <td className="border border-gray-500 p-1 w-12"><Input value={apt.payment} onChange={(e) => handleUpdateRow(apt.id, "payment", e.target.value)} readOnly={!canManageList} className="text-[11px] h-6 text-center w-full" /></td>
                      <td className="border border-gray-500 p-1 w-12"><Input dir="rtl" value={apt.code} onChange={(e) => handleUpdateRow(apt.id, "code", e.target.value)} readOnly={!canManageList} className="text-[11px] h-6 text-center w-full" /></td>
                      <td className="border border-gray-500 p-1 w-12 text-center">
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteRow(apt.id)} disabled={!canManageList}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                  {currentList.length === 0 && (
                    <tr><td colSpan={(operationType === "Cataract" || currentList.some(r => r.operation === "Cataract")) ? 11 : 10} className="p-4 text-gray-500">لا توجد حالات في القائمة الحالية.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Print-only static table — no form controls */}
            <div className="ops-print-table" style={{ display: "none" }}>
              <div style={{ marginBottom: "6px", fontWeight: "bold", fontSize: "13px" }}>قائمة العمليات</div>
              <div style={{ marginBottom: "8px", fontSize: "10px" }}>
                التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب: {exportDoctorLabel}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", tableLayout: "auto" }} dir="rtl">
                <thead>
                  <tr style={{ background: "#e5e7eb" }}>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>#</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>رقم الإيصال</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>اسم المريض</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>الهاتف</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>الطبيب</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>العملية</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>العين</th>
                    {(operationType === "Cataract" || currentList.some(r => r.operation === "Cataract")) && (
                      <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>المستشفى</th>
                    )}
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>مركز</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>دفع</th>
                    <th style={{ border: "1px solid #6b7280", padding: "3px 5px", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>الكود</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((apt, index) => (
                    <tr key={`print-${apt.id}`}>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center", fontWeight: "bold" }}>{index + 1}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{apt.number}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 8px", textAlign: "right" }}>{apt.name}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center", direction: "ltr" }}>{apt.phone}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{apt.doctor}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{operationTypeLabel(apt.operation)}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{apt.eye || "-"}</td>
                      {(operationType === "Cataract" || currentList.some(r => r.operation === "Cataract")) && (
                        <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{apt.hospital || "-"}</td>
                      )}
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{apt.center ? "✓" : ""}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{apt.payment}</td>
                      <td style={{ border: "1px solid #6b7280", padding: "3px 5px", textAlign: "center" }}>{apt.code}</td>
                    </tr>
                  ))}
                  {currentList.length === 0 && (
                    <tr><td colSpan={(operationType === "Cataract" || currentList.some(r => r.operation === "Cataract")) ? 11 : 10} style={{ padding: "12px", textAlign: "center", color: "#6b7280" }}>لا توجد حالات في القائمة الحالية.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {viewMode === "accounts" && (
            <div ref={exportTargetRef} className="overflow-x-auto mb-6" dir="rtl">
              <div className="mb-1 text-sm font-bold">حسابات العمليات</div>
              <div className="mb-2 text-xs text-muted-foreground">
                التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب: {exportDoctorLabel} | نوع العملية: {exportOperationLabel}
              </div>
              <table className="w-full border-collapse border border-gray-500 text-xs text-center">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-500 p-2 font-bold">اسم المريض</th>
                    <th className="border border-gray-500 p-2 font-bold">نوع العملية</th>
                    <th className="border border-gray-500 p-2 font-bold">المبلغ</th>
                    <th className="border border-gray-500 p-2 font-bold">نوع الخصم</th>
                    <th className="border border-gray-500 p-2 font-bold">الخصم</th>
                    <th className="border border-gray-500 p-2 font-bold">المدفوع</th>
                    <th className="border border-gray-500 p-2 font-bold">حساب المركز (من الدكتور)</th>
                    <th className="border border-gray-500 p-2 font-bold">المتبقي (حساب الدكتور)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((apt) => {
                    const values = computeAccounting(apt);
                    return (
                      <tr key={`acc-${apt.id}`}>
                        <td className="border border-gray-500 p-2">{apt.name || "-"}</td>
                        <td className="border border-gray-500 p-2">{operationTypeLabel(apt.operation || operationType || "Other")}</td>
                        <td className="border border-gray-500 p-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(apt.amount ?? 0)}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              handleUpdateRow(apt.id, "amount", Number.isFinite(raw) ? raw : 0);
                            }}
                            readOnly={!canManageList}
                            className="h-7 text-center"
                          />
                        </td>
                        <td className="border border-gray-500 p-2">
                          <select
                            value={apt.discountType}
                            onChange={(e) => handleUpdateRow(apt.id, "discountType", e.target.value === "percent" ? "percent" : "amount")}
                            disabled={!canManageList}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                          >
                            <option value="amount">قيمة</option>
                            <option value="percent">نسبة %</option>
                          </select>
                        </td>
                        <td className="border border-gray-500 p-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(apt.discountValue ?? 0)}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              handleUpdateRow(apt.id, "discountValue", Number.isFinite(raw) ? raw : 0);
                            }}
                            readOnly={!canManageList}
                            className="h-7 text-center"
                          />
                        </td>
                        <td className="border border-gray-500 p-2">{values.paid.toFixed(2)}</td>
                        <td className="border border-gray-500 p-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(apt.doctorAmount ?? values.centerAmount)}
                            onChange={(e) => {
                              const rawText = e.target.value.trim();
                              if (rawText === "") {
                                handleUpdateRow(apt.id, "doctorAmount", null);
                                return;
                              }
                              const raw = Number(rawText);
                              handleUpdateRow(apt.id, "doctorAmount", Number.isFinite(raw) ? raw : null);
                            }}
                            readOnly={!canManageList}
                            className="h-7 text-center"
                          />
                        </td>
                        <td className="border border-gray-500 p-2">{values.remainingAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {currentList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-gray-500">لا توجد حالات في القائمة الحالية.</td>
                    </tr>
                  )}
                </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-500 p-2" colSpan={5}>الإجمالي</td>
                      <td className="border border-gray-500 p-2">{accountingTotals.paid.toFixed(2)}</td>
                      <td className="border border-gray-500 p-2">{accountingTotals.centerAmount.toFixed(2)}</td>
                      <td className="border border-gray-500 p-2">{accountingTotals.remainingAmount.toFixed(2)}</td>
                    </tr>
                    {showSawafAdjustments && (
                      <>
                        <tr className="bg-white">
                          <td className="border border-gray-500 p-2" colSpan={5}></td>
                          <td className="border border-gray-500 p-2 font-semibold">الاشعه</td>
                          <td className="border border-gray-500 p-2" colSpan={2}>
                            <Input
                              type="text"
                              inputMode="decimal"
                              step="0.01"
                              value={accountsAdjustmentInputs.radiology}
                              onChange={(e) => handleAccountsAdjustmentInputChange("radiology", e.target.value)}
                              onBlur={() => handleAccountsAdjustmentInputBlur("radiology")}
                              className="h-8 text-center"
                            />
                          </td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-gray-500 p-2" colSpan={5}></td>
                          <td className="border border-gray-500 p-2 font-semibold">خارجي</td>
                          <td className="border border-gray-500 p-2" colSpan={2}>
                            <Input
                              type="text"
                              inputMode="decimal"
                              step="0.01"
                              value={accountsAdjustmentInputs.external}
                              onChange={(e) => handleAccountsAdjustmentInputChange("external", e.target.value)}
                              onBlur={() => handleAccountsAdjustmentInputBlur("external")}
                              className="h-8 text-center"
                            />
                          </td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-gray-500 p-2" colSpan={5}></td>
                          <td className="border border-gray-500 p-2 font-semibold">الصندوق</td>
                          <td className="border border-gray-500 p-2" colSpan={2}>
                            <Input
                              type="text"
                              inputMode="decimal"
                              step="0.01"
                              value={accountsAdjustmentInputs.cashbox}
                              onChange={(e) => handleAccountsAdjustmentInputChange("cashbox", e.target.value)}
                              onBlur={() => handleAccountsAdjustmentInputBlur("cashbox")}
                              className="h-8 text-center"
                            />
                          </td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="border border-gray-500 p-2" colSpan={5}>إجمالي (الاشعه + خارجي + الصندوق)</td>
                          <td className="border border-gray-500 p-2">{accountsAdjustmentsTotal.toFixed(2)}</td>
                          <td className="border border-gray-500 p-2">{accountingTotals.centerAmount.toFixed(2)}</td>
                          <td className="border border-gray-500 p-2">{accountsNetAfterAdjustments.toFixed(2)}</td>
                        </tr>
                      </>
                    )}
                  </tfoot>
              </table>
            </div>
          )}

          </>
          )}

          {viewMode !== "history" && filteredSavedSummaries.length > 0 && (
            <div className="mt-4 border-t pt-3 print:hidden" dir="rtl">
              <div className="text-sm font-bold mb-2">القوائم المحفوظة</div>
              <div className="flex flex-col gap-2 text-sm">
                {filteredSavedSummaries.map((item) => (
                  <div key={item.key} className="border border-gray-200 rounded p-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{item.date}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.names.length > 0 ? item.names.join(" ") : "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditSavedSummary(item)}>
                        تعديل
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteSavedSummary(item.key, item.listId)} disabled={!canManageList}>
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === "history" && (
          <div className="mt-6 border-t pt-4 print:hidden">
            <h3 className="text-sm font-bold mb-3">السجل السابق لقوائم العمليات</h3>
            <div className="mb-3 flex justify-end">
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="ابحث داخل السجل باسم المريض"
                className="w-full max-w-sm ml-auto text-right"
                dir="rtl"
              />
            </div>
            {historyQuery.isLoading && (
              <div className="text-sm text-muted-foreground">جاري تحميل السجل...</div>
            )}
            {!historyQuery.isLoading && (historyQuery.data ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">لا يوجد سجل محفوظ حالياً.</div>
            )}
            {!historyQuery.isLoading && (historyQuery.data ?? []).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {(() => {
                  const needle = historySearch.trim().toLowerCase();
                  const normalized = (value: unknown) => String(value ?? "").toLowerCase();
                  const itemsWithMatches = (historyQuery.data ?? []).map((item: any) => {
                    const names = (item.items ?? []).map((it: any) => String(it.name ?? ""));
                    const matches = needle
                      ? names.filter((name: string) => normalized(name).includes(needle))
                      : names;
                    return {
                      item,
                      matches,
                      hasMatch: needle ? matches.length > 0 : true,
                    };
                  });
                  if (needle && itemsWithMatches.every(({ item }) => (item.items ?? []).length === 0)) {
                    return (
                      <div className="text-sm text-muted-foreground">لا توجد نتائج مطابقة في السجل.</div>
                    );
                  }
                  return [
                    { key: "PRK / ليزك", match: ["PRK", "Lasik"] },
                    { key: "مياه بيضاء", match: ["Cataract"] },
                    { key: "أخرى", match: [null, "", "Other"] },
                  ].map((group) => (
                    <div key={group.key} className="border rounded-md p-2">
                      <div className="font-bold text-sm mb-2">{group.key}</div>
                      <div className="flex flex-col gap-1">
                        {itemsWithMatches
                          .filter(({ item, hasMatch }) => hasMatch && group.match.includes(item.operationType ?? "Other"))
                          .map(({ item, matches }) => (
                          <div key={`${item.id}`} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-muted/40">
                            <button
                              type="button"
                              className="text-right flex-1"
                              onClick={() => handleLoadListById(item.id)}
                            >
                              <div className="text-sm font-medium">
                                {item.doctorName ?? tabLabelByKey(item.doctorTab)}
                              </div>
                              <div className="text-xs text-muted-foreground" dir="ltr">
                                {formatDayDate(item.listDate)}  {operationTypeLabel(item.operationType ?? "Other")}  {matches[0] ?? item.items?.[0]?.name ?? " "}
                              </div>
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadListById(item.id)}
                            >
                              تحميل
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteListByIdMutation.mutate({ listId: item.id })}
                              disabled={!canManageList}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {itemsWithMatches
                          .filter(({ item, hasMatch }) => hasMatch && group.match.includes(item.operationType ?? "Other")).length === 0 && (
                          <div className="text-xs text-muted-foreground">لا توجد نتائج في هذا القسم</div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
          )}

        </div>
      </main>
    </div>
  );
}




