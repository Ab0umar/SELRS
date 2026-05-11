import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_APPOINTMENTS_PRICING,
  EMPTY_APPOINTMENTS_PRICING,
  OPERATION_LABELS,
  TAB_CONFIG,
  TAB_OTHERS,
  TAB_SAADANY,
  TAB_SAWAF,
  getPricingDefaults,
  normalizeDoctorName,
  normalizeTabKey,
  operationTypeLabel,
  tabLabelByKey,
} from "@/lib/operationsPricing";
import { trpc } from "@/lib/trpc";
import {
  type AccountsAdjustmentInputs,
  type AccountsAdjustments,
  type ListData,
  type SavedSummary,
  type ViewMode,
  formatTime12h,
  getLocalDateIso,
  sanitizePayment,
  toDateInputValue,
} from "./operationsShared";

export function useOperations() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const userRole = String(user?.role ?? "").toLowerCase();

  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const myPermissions = (permissionsQuery.data ?? []) as string[];
  const canManageList = userRole === "reception" || userRole === "admin" || userRole === "accountant";
  const canOpenPricing =
    userRole === "admin" ||
    userRole === "accountant" ||
    myPermissions.includes("appointments_pricing_v1") ||
    myPermissions.includes("/admin/settings/pricing-rules");
  const canOpenAccounts = canOpenPricing || myPermissions.includes("/appointments/accounts");

  const [activeTab, setActiveTab] = useState(TAB_SAADANY);
  const [listDate, setListDate] = useState(() => getLocalDateIso());
  const [operationType, setOperationType] = useState("");
  const [operationTypeOther, setOperationTypeOther] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [listTime, setListTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [lists, setLists] = useState<Record<string, ListData[]>>({
    [TAB_SAADANY]: [],
    [TAB_SAWAF]: [],
    [TAB_OTHERS]: [],
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
  const [selectedListId, setSelectedListId] = useState(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  const safeListDate = toDateInputValue(listDate) || getLocalDateIso();
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
  const pricingSettingQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "appointments_pricing_v1" },
    {
      enabled: canOpenPricing,
      refetchOnWindowFocus: false,
    }
  );
  const patientSearchQuery = trpc.medical.searchPatients.useQuery(
    { searchTerm: debouncedPatientSearch.replace(/\s+/g, "") },
    { enabled: debouncedPatientSearch.trim().length >= 1, refetchOnWindowFocus: false }
  );

  const operationBookingsQuery = trpc.medical.getOperationBookings.useQuery(
    { fromDate: safeListDate, toDate: safeListDate },
    { refetchOnWindowFocus: false, enabled: activeTab === TAB_OTHERS }
  );

  const pricingConfig = useMemo(() => {
    if (!canOpenPricing) return EMPTY_APPOINTMENTS_PRICING;
    const value = (pricingSettingQuery.data as any)?.value;
    if (!value || typeof value !== "object") return DEFAULT_APPOINTMENTS_PRICING;
    return value;
  }, [pricingSettingQuery.data, canOpenPricing]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!canOpenAccounts && viewMode === "accounts") {
      setViewMode("table");
      return;
    }
    if (viewMode === "list") {
      setViewMode("table");
    }
  }, [canOpenAccounts, viewMode]);

  useEffect(() => {
    if (!historyQuery.data) return;
    const grouped: Record<string, SavedSummary[]> = {};
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
      const merged = { ...prev };
      Object.entries(grouped).forEach(([tab, items]) => {
        const existing = merged[tab] ?? [];
        const byKey = new Map(existing.map((item) => [item.key, item]));
        items.forEach((item) => {
          if (!byKey.has(item.key)) byKey.set(item.key, item);
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
    if (!listDate) setListDate(getLocalDateIso());
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
    const handle = setTimeout(() => setDebouncedPatientSearch(patientSearchTerm.trim()), 250);
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
      if (data.operationType !== "Other") setOperationTypeOther("");
    }
    if (data.doctorName !== undefined && data.doctorName !== null) {
      setDoctorName(normalizeDoctorName(String(data.doctorName)));
    }
    if (data.listTime !== undefined && data.listTime !== null) {
      setListTime(String(data.listTime));
    }
  }, [listQuery.data, activeTab, pricingConfig]);

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
      row.doctorAmount === null || row.doctorAmount === undefined ? baseDoctorAmount : Math.max(0, Number(row.doctorAmount ?? 0));
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

  const exportDoctorLabel = (doctorName || TAB_CONFIG.find((tab) => tab.key === activeTab)?.label || "-").trim();
  const exportOperationLabel = operationTypeLabel(operationType || "Other");
  const exportDateLabel = toDateInputValue(listDate) || "-";
  const exportTimeLabel = formatTime12h((listTime || "-").trim());

  return {
    OPERATION_LABELS,
    TAB_CONFIG,
    accountingTotals,
    accountsAdjustmentInputs,
    accountsAdjustments,
    accountsAdjustmentsByTab,
    accountsAdjustmentsTotal,
    accountsAdjustmentInputsByTab,
    accountsNetAfterAdjustments,
    activeTab,
    autoSaveEnabled,
    canManageList,
    canOpenAccounts,
    canOpenPricing,
    computeAccounting,
    currentList,
    debouncedPatientSearch,
    deleteTargetRoute: "/",
    doctorName,
    exportDateLabel,
    exportDoctorLabel,
    exportOperationLabel,
    exportTimeLabel,
    filteredSavedSummaries,
    historyQuery,
    historySearch,
    isAuthenticated,
    listByIdQuery,
    listDate,
    listQuery,
    listTime,
    lists,
    myPermissions,
    operationBookingsQuery,
    operationOptions,
    operationType,
    operationTypeOther,
    patientSearchQuery,
    patientSearchTerm,
    permissionsQuery,
    pricingConfig,
    pricingSettingQuery,
    savedSummariesByTab,
    selectedListId,
    setAccountsAdjustmentInputsByTab,
    setAccountsAdjustmentsByTab,
    setActiveTab,
    setAutoSaveEnabled,
    setDoctorName,
    setHistorySearch,
    setListDate,
    setListTime,
    setLists,
    setOperationType,
    setOperationTypeOther,
    setPatientSearchTerm,
    setSavedSummariesByTab,
    setSelectedListId,
    setViewMode,
    showSawafAdjustments,
    tabLabelByKey,
    userRole,
    viewMode,
  };
}

export type OperationsState = ReturnType<typeof useOperations>;
