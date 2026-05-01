import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";
import { normalizeSearchText, matchesServiceCodeOrNameTerm } from "@/lib/patientFiltering";
import { normalizeServiceCode, normalizeSheetType } from "@/lib/patientsHelpers";

export type PatientCursor = {
  codeNum: number;
  patientCode: string;
  id: number;
};

const mapLegacyServiceTypeToModernTabs = (legacyType: string): string[] => {
  const normalized = normalizeSheetType(legacyType);
  if (normalized === "pentacam_center" || normalized === "pentacam_c") return ["lasik"];
  if (normalized === "pentacam_external" || normalized === "pentacam_ex" || normalized === "pentacam_ex_c") return ["external"];
  if (normalized === "surgery") return ["consultant"];
  if (normalized === "surgery_external") return ["external"];
  if (normalized === "consultant" || normalized === "specialist" || normalized === "lasik" || normalized === "external") {
    return [normalized];
  }
  return ["consultant"];
};

export function usePatientsList(isAuthenticated: boolean) {
  const utils = trpc.useUtils();
  const searchString = useSearch();
  const initialSearch = useMemo(() => new URLSearchParams(searchString).get("q") ?? "", []);
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [cursor, setCursor] = useState<PatientCursor | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<PatientCursor | null>>([]);
  const [pageSize, setPageSize] = useState(25);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("consultant");
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  const userStateQuery = trpc.medical.getUserPageState.useQuery(
    { page: "patients" },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, refetchOnReconnect: false }
  );
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();

  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });

  const serviceDirectoryQuery = trpc.medical.getServiceDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });

  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateUserStateRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 180);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const data = (userStateQuery.data as any)?.data;
    if (!data) return;
    if (didHydrateUserStateRef.current) return;
    if (data.searchTerm !== undefined) setSearchTerm(data.searchTerm ?? "");
    if (data.activeTab !== undefined) {
      const nextTab = String(data.activeTab ?? "consultant");
      const allowedTabs = new Set([
        "consultant", "specialist", "pentacam", "pentacam_center", "pentacam_external",
        "pentacam_c", "pentacam_ex", "pentacam_ex_c", "lasik", "external", "surgery", "surgery_external",
      ]);
      setActiveTab(allowedTabs.has(nextTab) ? nextTab : "consultant");
    }
    didHydrateUserStateRef.current = true;
  }, [userStateQuery.data]);

  useEffect(() => {
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      const payload = { searchTerm, activeTab, mode: "print-only" };
      saveUserStateMutation.mutate({ page: "patients", data: payload });
    }, 600);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [searchTerm, activeTab, saveUserStateMutation]);

  const normalizeTypedDateInput = (value: string) => {
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
    let match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
    if (match) {
      const dd = String(Number(match[1])).padStart(2, "0");
      const mm = String(Number(match[2])).padStart(2, "0");
      const yy = match[3];
      const yyyy = yy.length === 2 ? `20${yy}` : yy;
      return `${dd}/${mm}/${yyyy}`;
    }
    match = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (match) {
      const yyyy = match[1];
      const mm = match[2].padStart(2, "0");

      const dd = match[3].padStart(2, "0");
      return `${dd}/${mm}/${yyyy}`;
    }
    return raw;
  };

  const toIsoDate = (value: string) => {
    const raw = normalizeTypedDateInput(value);
    if (!raw) return "";
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
  };

  const hasActiveDateFilters = Boolean(toIsoDate(dateFrom) || toIsoDate(dateTo));
  const liveSearchTerm = normalizeSearchText(searchTerm);
  const useClientFilterWindow = Boolean(liveSearchTerm || hasActiveDateFilters);

  const backendServiceType = useMemo<"consultant" | "specialist" | "lasik" | "surgery" | "external" | undefined>(() => {
    if (activeTab === "consultant" || activeTab === "specialist" || activeTab === "lasik" || activeTab === "surgery" || activeTab === "external") {
      return activeTab;
    }
    if (activeTab === "pentacam_center" || activeTab === "pentacam_c") return "lasik";
    if (activeTab === "pentacam_external" || activeTab === "pentacam_ex" || activeTab === "pentacam_ex_c" || activeTab === "surgery_external") return "external";
    return undefined;
  }, [activeTab]);

  const patientsQuery = trpc.medical.getAllPatients.useQuery(
    {
      branch: undefined,
      searchTerm: debouncedSearchTerm || undefined,
      dateFrom: toIsoDate(dateFrom) || undefined,
      dateTo: toIsoDate(dateTo) || undefined,
      serviceType: backendServiceType,
      limit: useClientFilterWindow ? 500 : Math.min(500, Math.max(pageSize * 4, pageSize)),
      cursor: useClientFilterWindow ? undefined : cursor ?? undefined,
    },
    {
      enabled: isAuthenticated,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      refetchOnReconnect: false,
      retry: 1,
    }
  );

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
  }, [debouncedSearchTerm, activeTab, dateFrom, dateTo, pageSize]);

  const availableDoctors = ((doctorDirectoryQuery.data ?? []) as Array<{ id: string; name: string; code: string; isActive?: boolean }>)
    .filter((doctor) => doctor.isActive !== false)
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", { numeric: true }));

  const doctorsLoading = !!doctorDirectoryQuery?.isLoading;

  const rawPatientsData = patientsQuery.data as any;
  const patientsPayload = (
    Array.isArray(rawPatientsData)
      ? { rows: rawPatientsData, hasMore: false, nextCursor: null }
      : rawPatientsData ?? { rows: [], hasMore: false, nextCursor: null }
  ) as {
    rows: any[];
    hasMore: boolean;
    nextCursor: PatientCursor | null;
  };
  const patientsFromDb = (Array.isArray(patientsPayload.rows) ? patientsPayload.rows : []) as any[];
  const hasMore = useClientFilterWindow ? false : Boolean(patientsPayload.hasMore);
  const nextCursor = useClientFilterWindow ? null : patientsPayload.nextCursor ?? null;
  const currentPage = useClientFilterWindow ? 1 : cursorHistory.length + 1;

  const serviceCodeToLabel = useMemo(() => {
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const map = new Map<string, string>();
    for (const item of list) {
      const code = String(item?.code ?? "").trim();
      const name = String(item?.name ?? "").trim();
      if (!code) continue;
      map.set(normalizeServiceCode(code), name || code);
    }
    return map;
  }, [serviceDirectoryQuery.data]);

  const serviceCodeToType = useMemo(() => {
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const map = new Map<string, string>();
    for (const item of list) {
      const code = String(item?.code ?? "").trim();
      const type = String((item as any)?.defaultSheet ?? item?.serviceType ?? "").trim().toLowerCase();
      if (!code || !type) continue;
      map.set(normalizeServiceCode(code), type);
    }
    return map;
  }, [serviceDirectoryQuery.data]);

  const serviceTypeToDefaultName = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    for (const item of list) {
      const code = String(item?.code ?? "").trim();
      const name = String(item?.name ?? "").trim();
      const type = String((item as any)?.defaultSheet ?? item?.serviceType ?? "").trim().toLowerCase();
      if (!code || !name || !type) continue;
      const normalized = normalizeSheetType(type);
      if (normalized && !map.has(normalized)) {
        map.set(normalized, name);
      }
    }
    return map;
  }, [serviceDirectoryQuery.data]);

  const getPatientRowKey = (patient: any) =>
    String(
      (patient as any).__rowKey ??
        `${patient.id}-${normalizeServiceCode((patient as any).__serviceCodeSingle || (patient as any).serviceCode || "base")}`
    );

  const resolveServiceTypes = (patient: any) => {
    const singleCode = normalizeServiceCode((patient as any).__serviceCodeSingle);
    if (singleCode) {
      const rowMappedType = normalizeSheetType((patient as any).__serviceTypeSingle);
      if (rowMappedType) return new Set<string>(mapLegacyServiceTypeToModernTabs(rowMappedType));
      const mapped = normalizeSheetType(serviceCodeToType.get(singleCode));
      if (mapped) {
        return new Set<string>(mapLegacyServiceTypeToModernTabs(mapped));
      }
      const singleType = normalizeSheetType((patient as any).__serviceTypeSingle ?? patient?.serviceType ?? "consultant");
      return new Set<string>(mapLegacyServiceTypeToModernTabs(singleType || "consultant"));
    }
    const codes = [
      ...((Array.isArray(patient?.serviceCodes) ? patient.serviceCodes : []) as unknown[]),
      patient?.serviceCode,
    ]
      .map((v) => normalizeServiceCode(v))
      .filter(Boolean);
    const types = new Set<string>();
    for (const code of codes) {
      const mapped = normalizeSheetType(serviceCodeToType.get(code));
      if (mapped) {
        for (const tab of mapLegacyServiceTypeToModernTabs(mapped)) {
          types.add(tab);
        }
      }
    }
    if (types.size === 0) {
      const fallback = normalizeSheetType(patient?.serviceType ?? "consultant");
      if (fallback) {
        for (const tab of mapLegacyServiceTypeToModernTabs(fallback)) {
          types.add(tab);
        }
      }
    }
    return types;
  };

  const currentPatients = useMemo(() => {
    const combined = [...patientsFromDb, ...[]]; // allPatients will be moved to separate state or passed in
    const term = liveSearchTerm;
    const splitByService = false;
    const parseUserDateInput = (rawInput: string): Date | null => {
      const raw = normalizeTypedDateInput(rawInput);
      if (!raw) return null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/");
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      return null;
    };
    const parseDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
      const raw = String(value).trim();
      if (!raw) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/");
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      const d = new Date(raw);
      return Number.isNaN(d.valueOf()) ? null : d;
    };
    const fromDate = parseUserDateInput(dateFrom);
    const toDate = (() => {
      const d = parseUserDateInput(dateTo);
      if (!d) return null;
      d.setHours(23, 59, 59, 999);
      return d;
    })();

    let filtered = combined.filter((p) => {
      const fullName = String(p.fullName ?? "").toLowerCase();
      const code = String(p.patientCode ?? "").toLowerCase();
      const phone = String(p.phone ?? "").toLowerCase();
      const nationalId = String(p.nationalId ?? "").toLowerCase();
      const treatingDoctor = String((p as any).treatingDoctor ?? "").toLowerCase();
      const rawServiceCodes = [
        ...((Array.isArray((p as any).serviceCodes) ? (p as any).serviceCodes : []) as unknown[]),
        (p as any).serviceCode,
      ]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean);
      const serviceCode = rawServiceCodes.join(" ").toLowerCase();
      const mappedServiceName = rawServiceCodes
        .map((code) => String(serviceCodeToLabel.get(normalizeServiceCode(code)) ?? ""))
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const serviceTypeRaw = String((p as any).serviceType ?? "").toLowerCase();
      const serviceTypeLabel = (() => {
        if (serviceTypeRaw === "consultant") return "استشاري";
        if (serviceTypeRaw === "specialist") return "اخصائي";
        if (serviceTypeRaw === "pentacam_c") return "Pentacam C";
        if (serviceTypeRaw === "pentacam_ex") return "Pentacam Ex";
        if (serviceTypeRaw === "pentacam_ex_c") return "Pentacam Ex.C";
        if (serviceTypeRaw === "pentacam" || serviceTypeRaw === "pentacam_center" || serviceTypeRaw === "pentacam_external") return "بنتاكام";
        if (serviceTypeRaw === "lasik") return "فحوصات الليزك";
        if (serviceTypeRaw === "external") return "خارجي";
        if (serviceTypeRaw === "surgery") return "عمليات";
        return "";
      })();
      const matchesTerm =
        !term ||
        fullName.includes(term) ||
        code.includes(term) ||
        phone.includes(term) ||
        nationalId.includes(term) ||
        treatingDoctor.includes(term) ||
        serviceCode.includes(term) ||
        mappedServiceName.includes(term) ||
        serviceTypeRaw.includes(term) ||
        serviceTypeLabel.includes(term);

      const patientDate = parseDate((p as any).lastVisit);
      const matchesFrom = !fromDate || (patientDate && patientDate >= fromDate);
      const matchesTo = !toDate || (patientDate && patientDate <= toDate);

      return matchesTerm && matchesFrom && matchesTo;
    });
    const toNumber = (value: any) => {
      const raw = String(value ?? "").trim();
      const num = Number(raw.replace(/[^\d]/g, ""));
      return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
    };
    const sorted = filtered.sort((a, b) => {
      const aNum = toNumber(a.patientCode);
      const bNum = toNumber(b.patientCode);
      if (aNum !== bNum) return aNum - bNum;
      const aCode = String(a.patientCode ?? "");
      const bCode = String(b.patientCode ?? "");
      return aCode.localeCompare(bCode, "ar");
    });
    if (!splitByService) return sorted;

    return sorted.flatMap((patient) => {
      const codes = Array.from(
        new Set(
          [
            ...((Array.isArray((patient as any)?.serviceCodes) ? (patient as any).serviceCodes : []) as unknown[]),
            (patient as any)?.serviceCode,
          ]
            .map((v) => normalizeServiceCode(v))
            .filter(Boolean)
        )
      );
      if (codes.length === 0) {
        const patientServiceType = normalizeSheetType(patient?.serviceType ?? "consultant");
        const defaultName = serviceTypeToDefaultName.get(patientServiceType) || String(patient?.serviceType ?? "");
        return [{ ...patient, __rowKey: `${patient.id}-no-service`, __defaultServiceName: defaultName }];
      }
      const rowCodes = (() => {
        if (!term) return codes;
        const matched = codes.filter((srvCode) => {
          return matchesServiceCodeOrNameTerm(
            term,
            String(srvCode ?? ""),
            String(serviceCodeToLabel.get(srvCode) ?? "")
          );
        });
        return matched.length > 0 ? matched : codes;
      })();
      return rowCodes.map((srvCode, idx) => ({
        ...patient,
        __serviceCodeSingle: srvCode,
        __serviceNameSingle: String(serviceCodeToLabel.get(srvCode) ?? "").trim(),
        __serviceTypeSingle: normalizeSheetType(
          (patient as any)?.serviceSheetTypeByCode?.[srvCode] ?? serviceCodeToType.get(srvCode) ?? ""
        ),
        __rowKey: `${patient.id}-${srvCode}-${idx}`,
      }));
    });
  }, [
      patientsFromDb,
      liveSearchTerm,
      dateFrom,
      dateTo,
      serviceCodeToLabel,
      serviceCodeToType,
      serviceTypeToDefaultName,
    ]);

  const tabFilteredPatients = currentPatients.filter((patient) => {
    const serviceTypes = resolveServiceTypes(patient);
    return serviceTypes.has(activeTab);
  });
  const filteredPatients = tabFilteredPatients;

  const searchSuggestions = useMemo(() => {
    if (!liveSearchTerm || liveSearchTerm.length < 2) return [];
    const seen = new Set<number>();
    const ranked: Array<{
      id: number;
      fullName: string;
      patientCode: string;
      phone: string;
      treatingDoctor: string;
      serviceLabel: string;
      score: number;
      matchKind: "patient" | "doctor" | "service" | "code";
    }> = [];
    for (const patient of currentPatients) {
      const id = Number(patient.id);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      const fullName = String(patient.fullName ?? "").trim();
      const patientCode = String(patient.patientCode ?? "").trim();
      const phone = String(patient.phone ?? "").trim();
      const treatingDoctor = String((patient as any).treatingDoctor ?? "").trim();
      const rawServiceCodes = [
        ...((Array.isArray((patient as any).serviceCodes) ? (patient as any).serviceCodes : []) as unknown[]),
        (patient as any).serviceCode,
        (patient as any).__serviceCodeSingle,
      ]
        .map((value) => normalizeServiceCode(value))
        .filter(Boolean);
      const serviceLabel = Array.from(
        new Set(
          rawServiceCodes
            .map((code) => String(serviceCodeToLabel.get(code) ?? "").trim())
            .filter(Boolean)
        )
      ).join(" / ");
      const blob = normalizeSearchText([fullName, patientCode, phone, treatingDoctor, serviceLabel].join(" "));
      if (!blob.includes(liveSearchTerm)) continue;
      const exactName = normalizeSearchText(fullName) === liveSearchTerm;
      const exactCode = normalizeSearchText(patientCode) === liveSearchTerm;
      const startsWithName = normalizeSearchText(fullName).startsWith(liveSearchTerm);
      const startsWithCode = normalizeSearchText(patientCode).startsWith(liveSearchTerm);
      const doctorMatch = normalizeSearchText(treatingDoctor).includes(liveSearchTerm);
      const serviceMatch = normalizeSearchText(serviceLabel).includes(liveSearchTerm);
      const codeMatch = normalizeSearchText(patientCode).includes(liveSearchTerm);
      const score =
        (exactCode ? 400 : 0) +
        (exactName ? 300 : 0) +
        (startsWithCode ? 120 : 0) +
        (startsWithName ? 100 : 0) +
        (normalizeSearchText(phone).includes(liveSearchTerm) ? 40 : 0) +
        (doctorMatch ? 20 : 0) +
        (serviceMatch ? 15 : 0);
      const matchKind: "patient" | "doctor" | "service" | "code" =
        exactCode || startsWithCode || codeMatch
          ? "code"
          : exactName || startsWithName
            ? "patient"
            : doctorMatch
              ? "doctor"
              : serviceMatch
                ? "service"
                : "patient";
      ranked.push({ id, fullName, patientCode, phone, treatingDoctor, serviceLabel, score, matchKind });
    }
    return ranked
      .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName, "ar"))
      .slice(0, 8);
  }, [currentPatients, liveSearchTerm, serviceCodeToLabel]);

  const groupedSearchSuggestions = useMemo(() => {
    const groups: Array<{
      key: "patient" | "doctor" | "service" | "code";
      label: string;
      items: typeof searchSuggestions;
    }> = [
      { key: "patient", label: "مرضى", items: [] },
      { key: "code", label: "أكواد", items: [] },
      { key: "doctor", label: "أطباء", items: [] },
      { key: "service", label: "خدمات", items: [] },
    ];
    for (const suggestion of searchSuggestions) {
      const target = groups.find((group) => group.key === suggestion.matchKind);
      if (target) target.items.push(suggestion);
    }
    return groups.filter((group) => group.items.length > 0);
  }, [searchSuggestions]);

  const flatSearchSuggestions = useMemo(
    () => groupedSearchSuggestions.flatMap((group) => group.items),
    [groupedSearchSuggestions]
  );

  const filteredRowKeys = filteredPatients.map((p) => getPatientRowKey(p));
  const isAllSelected =
    filteredRowKeys.length > 0 && filteredRowKeys.every((key) => selectedRowKeys.has(key));
  const selectedCount = filteredPatients.filter((p) => selectedRowKeys.has(getPatientRowKey(p))).length;

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    isSearchFocused,
    setIsSearchFocused,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    cursor,
    setCursor,
    cursorHistory,
    setCursorHistory,
    pageSize,
    setPageSize,
    dateFrom,
    setDateFrom,
    dateTo,
setDateTo,
    activeTab,
    setActiveTab,
    userStateQuery,
    saveUserStateMutation,
    doctorDirectoryQuery,
    availableDoctors,
    doctorsLoading,
    serviceDirectoryQuery,
    patientsQuery,
    currentPatients,
    tabFilteredPatients,
    filteredPatients,
    searchSuggestions,
    groupedSearchSuggestions,
    flatSearchSuggestions,
    filteredRowKeys,
    isAllSelected,
    selectedCount,
    serviceCodeToLabel,
    serviceCodeToType,
    serviceTypeToDefaultName,
    hasMore,
    nextCursor,
    currentPage,
    getPatientRowKey,
    resolveServiceTypes,
  };
}
