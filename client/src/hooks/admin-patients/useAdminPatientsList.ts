import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { matchesDoctorFilter, matchesServiceCodeOrNameTerm, normalizeServiceCodeForSearch } from "@/lib/patientFiltering";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import {
  type DoctorDirectoryEntry,
  type PatientCursor,
  type PatientDraft,
  type PatientRow,
  type PatientStats,
  type RowSaveState,
  type SheetTypeChoice,
  type PatientStatus,
  getPatientRowKey,
  getServiceTypeLabel,
  getYearMonth,
  normalizeSheetTypeChoice,
  normalizeTypedDateInput,
  toIsoDate,
  toLegacyServiceType,
} from "./adminPatientsShared";

type UseAdminPatientsListResult = ReturnType<typeof useAdminPatientsList>;

export function useAdminPatientsList() {
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [cursor, setCursor] = useState<PatientCursor | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<PatientCursor | null>>([]);
  const [pageSize, setPageSize] = useState(50);
  const [statsYear, setStatsYear] = useState(String(new Date().getFullYear()));
  const [statsMonth, setStatsMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<"all" | SheetTypeChoice>("all");
  const [locationFilter, setLocationFilter] = useState<"all" | "center" | "external">("all");
  const [drafts, setDrafts] = useState<Record<string, PatientDraft>>({});
  const [rowSaveState, setRowSaveState] = useState<Record<string, RowSaveState>>({});
  const [manualLockOverrides, setManualLockOverrides] = useState<Record<number, boolean>>({});
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [expandedPatients, setExpandedPatients] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 180);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const patientsQuery = trpc.medical.getAllPatients.useQuery(
    {
      branch: undefined,
      searchTerm: undefined,
      dateFrom: toIsoDate(dateFrom) || undefined,
      dateTo: toIsoDate(dateTo) || undefined,
      doctorName: undefined,
      serviceType:
        serviceTypeFilter === "all" || serviceTypeFilter === "surgery" || serviceTypeFilter === "surgery_external"
          ? undefined
          : toLegacyServiceType(serviceTypeFilter),
      locationType: locationFilter === "all" ? undefined : locationFilter,
      limit: doctorFilter === "all" ? (debouncedSearchTerm ? 500 : pageSize) : 500,
      cursor: doctorFilter === "all" ? cursor ?? undefined : undefined,
    },
    { refetchOnWindowFocus: false, staleTime: 30_000, refetchOnReconnect: false },
  );
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
  const updatePatientMutation = trpc.medical.updatePatient.useMutation();
  const savePatientPageStateMutation = trpc.medical.savePatientPageState.useMutation();
  const deletePatientFromMssqlMutation = trpc.medical.deletePatientFromMssql.useMutation();
  const deletePatientMutation = trpc.medical.deletePatient.useMutation({
    onSuccess: () => {
      utils.medical.getAllPatients.invalidate();
      toast.success("Patient deleted successfully");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Failed to delete patient"));
    },
  });
  const deleteAllPatientsMutation = trpc.medical.deleteAllPatients.useMutation();
  const statsFilterInput = useMemo(
    () => ({
      searchTerm: debouncedSearchTerm || undefined,
      doctorName: doctorFilter === "all" ? undefined : doctorFilter,
      serviceType:
        serviceTypeFilter === "all" || serviceTypeFilter === "surgery" || serviceTypeFilter === "surgery_external"
          ? undefined
          : toLegacyServiceType(serviceTypeFilter),
      locationType: locationFilter === "all" ? undefined : locationFilter,
      dateFrom: toIsoDate(dateFrom) || undefined,
      dateTo: toIsoDate(dateTo) || undefined,
    }),
    [
      debouncedSearchTerm,
      doctorFilter,
      serviceTypeFilter,
      locationFilter,
      dateFrom,
      dateTo,
    ],
  );

  const monthlyStatsQuery = trpc.medical.getPatientStats.useQuery(
    {
      year: Number(statsYear),
      month: Number(statsMonth),
      ...statsFilterInput,
    },
    { refetchOnWindowFocus: false },
  );

  const previousStatsPeriod = useMemo(() => {
    let y = Number(statsYear);
    let m = Number(statsMonth);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return { year: y, month: m };
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    return { year: y, month: m };
  }, [statsYear, statsMonth]);

  const previousMonthlyStatsQuery = trpc.medical.getPatientStats.useQuery(
    {
      year: previousStatsPeriod.year,
      month: previousStatsPeriod.month,
      ...statsFilterInput,
    },
    {
      refetchOnWindowFocus: false,
      enabled: Number.isFinite(previousStatsPeriod.year) && Number.isFinite(previousStatsPeriod.month),
    },
  );
  const yearlyStatsQuery = trpc.medical.getPatientStats.useQuery(
    {
      year: Number(statsYear),
      ...statsFilterInput,
    },
    { refetchOnWindowFocus: false },
  );
  const mssqlSyncStatusQuery = trpc.medical.getMssqlSyncStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });

  const patientsPayload = (patientsQuery.data ?? { rows: [], hasMore: false, nextCursor: null }) as {
    rows: PatientRow[];
    hasMore: boolean;
    nextCursor: PatientCursor | null;
  };
  const patients = (patientsPayload.rows ?? []) as PatientRow[];
  const hasMore = doctorFilter === "all" ? Boolean(patientsPayload.hasMore) : false;
  const nextCursor = doctorFilter === "all" ? patientsPayload.nextCursor ?? null : null;

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
  }, [debouncedSearchTerm, serviceTypeFilter, locationFilter, doctorFilter, dateFrom, dateTo, pageSize]);

  const years = useMemo(() => {
    const yearSet = new Set<string>();
    const currentYear = new Date().getFullYear();
    yearSet.add(String(currentYear));
    for (const patient of patients) {
      const yearMonth = getYearMonth((patient as PatientRow & { lastVisit?: unknown }).lastVisit);
      if (yearMonth) yearSet.add(yearMonth.year);
    }
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [patients]);

  const monthStats = (monthlyStatsQuery.data ?? { total: 0, center: 0, external: 0, lasik: 0 }) as PatientStats;
  const yearStats = (yearlyStatsQuery.data ?? { total: 0, center: 0, external: 0, lasik: 0 }) as PatientStats;

  const activeDoctors = useMemo(
    () =>
      ((doctorDirectoryQuery.data ?? []) as DoctorDirectoryEntry[])
        .filter((doctor) => doctor.isActive !== false)
        .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "ar")),
    [doctorDirectoryQuery.data],
  );

  const doctorOptions = useMemo(() => {
    const names = new Set<string>();
    for (const doctor of activeDoctors) {
      const doctorName = String(doctor.name ?? "").trim();
      if (doctorName) names.add(doctorName);
    }
    for (const patient of patients) {
      const doctorName = String(patient.treatingDoctor ?? "").trim();
      if (doctorName) names.add(doctorName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ar"));
  }, [activeDoctors, patients]);

  const serviceCodeToLabel = useMemo(() => {
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const map = new Map<string, string>();
    for (const item of list) {
      const code = String((item as { code?: string }).code ?? "").trim();
      const name = String((item as { name?: string }).name ?? "").trim();
      if (!code) continue;
      map.set(normalizeServiceCodeForSearch(code), name || code);
    }
    return map;
  }, [serviceDirectoryQuery.data]);

  const serviceCodeToType = useMemo(() => {
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const map = new Map<string, string>();
    for (const item of list) {
      const code = String((item as { code?: string }).code ?? "").trim();
      const type = normalizeSheetTypeChoice(
        (item as { defaultSheet?: string; serviceType?: string }).defaultSheet ??
          (item as { serviceType?: string }).serviceType ??
          "",
      );
      if (!code || !type) continue;
      map.set(normalizeServiceCodeForSearch(code), type);
    }
    return map;
  }, [serviceDirectoryQuery.data]);

  const getRowServiceCode = (patient: PatientRow) =>
    normalizeServiceCodeForSearch(
      String((patient as PatientRow & { __serviceCodeSingle?: string }).__serviceCodeSingle ?? patient.serviceCode ?? "").trim(),
    );

  const getRowSheetType = (patient: PatientRow): SheetTypeChoice => {
    const rowServiceCode = getRowServiceCode(patient);
    const mappedOverride = rowServiceCode ? normalizeSheetTypeChoice(patient.serviceSheetTypeByCode?.[rowServiceCode]) : "";
    if (mappedOverride) return mappedOverride;
    const mappedDefault = rowServiceCode ? normalizeSheetTypeChoice(serviceCodeToType.get(rowServiceCode)) : "";
    if (mappedDefault) return mappedDefault;
    const fallback = normalizeSheetTypeChoice(patient.serviceType ?? "consultant");
    return fallback || "consultant";
  };

  const filteredPatients = useMemo(() => {
    const localTerm = debouncedSearchTerm.trim().toLowerCase();
    const selectedSheetType = serviceTypeFilter === "all" ? "" : serviceTypeFilter;
    const selectedDoctor = doctorFilter === "all" ? "" : doctorFilter.trim().toLowerCase();
    const selectedDoctorEntry =
      doctorFilter === "all"
        ? null
        : activeDoctors.find((doctor) => String(doctor.name ?? "").trim() === doctorFilter) ?? null;
    const toSortableCode = (value: unknown) => {
      const raw = String(value ?? "").trim();
      const numeric = Number(raw.replace(/[^\d]/g, ""));
      return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
    };

    const locallyFiltered = patients.filter((patient) => {
      const patientCode = String(patient.patientCode ?? "").toLowerCase();
      const fullName = String(patient.fullName ?? "").toLowerCase();
      const doctorName = String(patient.treatingDoctor ?? "").toLowerCase();
      const rawServiceCodes = [...(Array.isArray(patient.serviceCodes) ? patient.serviceCodes : []), patient.serviceCode]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      const joinedServiceCodes = rawServiceCodes.join(" ").toLowerCase();
      const mappedServiceName = rawServiceCodes
        .map((serviceCode) => String(serviceCodeToLabel.get(normalizeServiceCodeForSearch(serviceCode)) ?? ""))
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const serviceTypeRaw = String(patient.serviceType ?? "").toLowerCase();
      const serviceTypeLabel = getServiceTypeLabel(serviceTypeRaw).toLowerCase();

      const matchesTerm =
        !localTerm ||
        patientCode.includes(localTerm) ||
        fullName.includes(localTerm) ||
        doctorName.includes(localTerm) ||
        joinedServiceCodes.includes(localTerm) ||
        mappedServiceName.includes(localTerm) ||
        serviceTypeRaw.includes(localTerm) ||
        serviceTypeLabel.includes(localTerm);

      if (!matchesTerm) return false;
      return matchesDoctorFilter({
        doctorValue: doctorName,
        selectedDoctor,
        selectedDoctorName: String(selectedDoctorEntry?.name ?? ""),
        selectedDoctorCode: String(selectedDoctorEntry?.code ?? ""),
      });
    });

    const sorted = locallyFiltered.sort((a, b) => {
      const aNumber = toSortableCode(a.patientCode);
      const bNumber = toSortableCode(b.patientCode);
      if (aNumber !== bNumber) return aNumber - bNumber;
      return String(a.patientCode ?? "").localeCompare(String(b.patientCode ?? ""), "ar");
    });

    return sorted.flatMap((patient) => {
      const codes = Array.from(
        new Set(
          [...(Array.isArray(patient.serviceCodes) ? patient.serviceCodes : []), patient.serviceCode]
            .map((value) => normalizeServiceCodeForSearch(value))
            .filter(Boolean),
        ),
      );

      if (codes.length === 0) {
        if (selectedSheetType) {
          const fallback = normalizeSheetTypeChoice(patient.serviceType ?? "consultant");
          if (fallback !== selectedSheetType) return [];
        }
        return [{ ...patient, __rowKey: `${patient.id}-no-service` }];
      }

      const rowCodes = (() => {
        if (!localTerm) return codes;
        const matched = codes.filter((serviceCode) =>
          matchesServiceCodeOrNameTerm(localTerm, String(serviceCode ?? ""), String(serviceCodeToLabel.get(serviceCode) ?? "")),
        );
        return matched.length > 0 ? matched : codes;
      })();

      const filteredRowCodes = !selectedSheetType
        ? rowCodes
        : rowCodes.filter((serviceCode) => {
            const mappedType = normalizeSheetTypeChoice(
              patient.serviceSheetTypeByCode?.[serviceCode] ?? serviceCodeToType.get(serviceCode) ?? patient.serviceType ?? "",
            );
            return mappedType === selectedSheetType;
          });

      if (filteredRowCodes.length === 0) return [];
      const primaryCode = filteredRowCodes[0];

      return [
        {
          ...patient,
          __serviceCodeSingle: primaryCode,
          __serviceNameSingle: String(serviceCodeToLabel.get(primaryCode) ?? "").trim(),
          __serviceTypeSingle: String(serviceCodeToType.get(primaryCode) ?? "").trim().toLowerCase(),
          __rowKey: `${patient.id}`,
        },
      ];
    });
  }, [patients, debouncedSearchTerm, doctorFilter, activeDoctors, serviceCodeToLabel, serviceCodeToType, serviceTypeFilter]);

  const currentPage = doctorFilter === "all" ? cursorHistory.length + 1 : 1;
  const visiblePatients = filteredPatients;

  const previousMonthStats = (previousMonthlyStatsQuery.data ?? {
    total: 0,
    center: 0,
    external: 0,
    lasik: 0,
  }) as PatientStats;

  const monthOverMonthPercent = useMemo(() => {
    const cur = Number(monthStats.total);
    const prev = Number(previousMonthStats.total);
    if (prev === 0) return cur === 0 ? 0 : 100;
    return Math.round(((cur - prev) / prev) * 100);
  }, [monthStats.total, previousMonthStats.total]);

  const patientDashboardRollup = useMemo(() => {
    const byId = new Map<number, PatientRow>();
    for (const row of filteredPatients) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    let center = 0;
    let external = 0;
    for (const row of byId.values()) {
      if (String(row.locationType ?? "").trim().toLowerCase() === "external") external += 1;
      else center += 1;
    }
    return { totalUnique: byId.size, center, external };
  }, [filteredPatients]);

  const isExpanded = (patientId: number) => expandedPatients.has(patientId);

  const toggleExpanded = (patientId: number) => {
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const getDraft = (patient: PatientRow): PatientDraft => {
    const rowKey = getPatientRowKey(patient);
    const existing = drafts[rowKey];
    if (existing) return existing;
    return {
      fullName: String(patient.fullName ?? ""),
      treatingDoctor: String(patient.treatingDoctor ?? ""),
      dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "",
      age: patient.age != null ? String(patient.age) : "",
      address: String(patient.address ?? ""),
      phone: String(patient.phone ?? ""),
      occupation: String(patient.occupation ?? ""),
      serviceType: getRowSheetType(patient),
      status: (patient.status ?? "new") as PatientStatus,
    };
  };

  const setDraftField = (patient: PatientRow, field: keyof PatientDraft, value: string) => {
    const rowKey = getPatientRowKey(patient);
    const base = getDraft(patient);
    setDrafts((prev) => ({
      ...prev,
      [rowKey]: {
        ...base,
        [field]: value,
      },
    }));
    setRowSaveState((prev) => ({
      ...prev,
      [rowKey]: { state: "unsaved", at: new Date().toISOString() },
    }));
  };

  const savePatientRow = async (patient: PatientRow, draft?: PatientDraft) => {
    const rowKey = getPatientRowKey(patient);
    const nextDraft = draft ?? getDraft(patient);
    try {
      setRowSaveState((prev) => ({
        ...prev,
        [rowKey]: { state: "saving", at: new Date().toISOString() },
      }));

      const rowServiceCode = getRowServiceCode(patient);
      const currentSheetType = getRowSheetType(patient);
      const sheetTypeChanged = nextDraft.serviceType !== currentSheetType;
      const nextDoctor = nextDraft.treatingDoctor.trim();
      const normalizedDoctorName = nextDoctor.toLocaleLowerCase("ar");
      const selectedDoctor =
        activeDoctors.find((doctor) => String(doctor.name ?? "").trim().toLocaleLowerCase("ar") === normalizedDoctorName) ?? null;

      if (nextDoctor && !selectedDoctor) {
        throw new Error("Doctor name must match an active doctor from directory");
      }

      const selectedDoctorCode = String(selectedDoctor?.code ?? "").trim() || null;
      const selectedDoctorId = String(selectedDoctor?.id ?? "").trim() || null;
      const selectedLocationType = selectedDoctor ? (selectedDoctor.locationType === "external" ? "external" : "center") : null;
      const doctorUpdates =
        nextDoctor && selectedDoctor
          ? {
              doctorCode: selectedDoctorCode,
              doctorId: selectedDoctorId,
              locationType: selectedLocationType,
            }
          : {};

      const updates: Record<string, unknown> = {
        fullName: nextDraft.fullName.trim(),
        dateOfBirth: nextDraft.dateOfBirth || null,
        age: nextDraft.age ? Number(nextDraft.age) : null,
        address: nextDraft.address.trim() || null,
        phone: nextDraft.phone.trim() || null,
        occupation: nextDraft.occupation.trim() || null,
        ...doctorUpdates,
        status: nextDraft.status,
      };

      if (!rowServiceCode && sheetTypeChanged) {
        updates.serviceType = toLegacyServiceType(nextDraft.serviceType);
      }

      await updatePatientMutation.mutateAsync({
        patientId: patient.id,
        updates,
      });

      const existingState = await utils.medical.getPatientPageState.fetch({ patientId: patient.id, page: "examination" }).catch(() => null);
      const existingData =
        existingState && typeof (existingState as { data?: unknown }).data === "object" && (existingState as { data?: unknown }).data
          ? ((existingState as { data: Record<string, unknown> }).data as Record<string, unknown>)
          : {};

      const existingDoctorName = String(existingData.doctorName ?? "").trim();
      const doctorNameForState = nextDoctor || existingDoctorName;
      const existingDoctorSignature =
        existingData.signatures && typeof existingData.signatures === "object"
          ? String((existingData.signatures as Record<string, unknown>).doctor ?? "").trim()
          : "";
      const doctorSignatureForState = nextDoctor || existingDoctorSignature;

      await savePatientPageStateMutation.mutateAsync({
        patientId: patient.id,
        page: "examination",
        data: {
          ...existingData,
          syncLockManual: true,
          manualEditedAt: new Date().toISOString(),
          ...(rowServiceCode && sheetTypeChanged
            ? {
                serviceSheetTypeByCode: {
                  ...(existingData.serviceSheetTypeByCode && typeof existingData.serviceSheetTypeByCode === "object"
                    ? (existingData.serviceSheetTypeByCode as Record<string, unknown>)
                    : {}),
                  [rowServiceCode]: nextDraft.serviceType,
                },
              }
            : {}),
          doctorName: doctorNameForState,
          signatures: {
            ...(existingData.signatures && typeof existingData.signatures === "object"
              ? (existingData.signatures as Record<string, unknown>)
              : {}),
            doctor: doctorSignatureForState,
          },
        },
      });

      setDrafts((prev) => {
        const nextDrafts = { ...prev };
        delete nextDrafts[rowKey];
        return nextDrafts;
      });
      setRowSaveState((prev) => ({
        ...prev,
        [rowKey]: { state: "saved", at: new Date().toISOString() },
      }));
      toast.success("Patient updated");
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      setRowSaveState((prev) => ({
        ...prev,
        [rowKey]: {
          state: "error",
          at: new Date().toISOString(),
          message: getTrpcErrorMessage(error, "Failed to update patient"),
        },
      }));
      toast.error(getTrpcErrorMessage(error, "Failed to update patient"));
    }
  };

  const isManualLockEnabled = (patient: PatientRow) => {
    if (Object.prototype.hasOwnProperty.call(manualLockOverrides, patient.id)) {
      return Boolean(manualLockOverrides[patient.id]);
    }
    return Boolean(patient.syncLockManual) || String(patient.manualEditedAt ?? "").trim().length > 0;
  };

  const handleToggleManualLock = async (patient: PatientRow) => {
    const currentlyEnabled = isManualLockEnabled(patient);
    const nextEnabled = !currentlyEnabled;
    try {
      const existingState = await utils.medical.getPatientPageState.fetch({ patientId: patient.id, page: "examination" }).catch(() => null);
      const existingData =
        existingState && typeof (existingState as { data?: unknown }).data === "object" && (existingState as { data?: unknown }).data
          ? ((existingState as { data: Record<string, unknown> }).data as Record<string, unknown>)
          : {};
      await savePatientPageStateMutation.mutateAsync({
        patientId: patient.id,
        page: "examination",
        data: {
          ...existingData,
          syncLockManual: nextEnabled,
          manualEditedAt: nextEnabled ? new Date().toISOString() : "",
        },
      });
      setManualLockOverrides((prev) => ({ ...prev, [patient.id]: nextEnabled }));
      setRowSaveState((prev) => ({
        ...prev,
        [getPatientRowKey(patient)]: { state: "saved", at: new Date().toISOString() },
      }));
      toast.success(nextEnabled ? "Manual lock enabled" : "Manual lock disabled");
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to toggle manual lock"));
    }
  };

  const handleSaveAll = async () => {
    const changedRows = Object.keys(drafts);
    if (changedRows.length === 0) {
      toast.info("No pending changes");
      return;
    }
    for (const rowKey of changedRows) {
      const patient =
        visiblePatients.find((row) => getPatientRowKey(row) === rowKey) ??
        patients.find((row) => getPatientRowKey(row) === rowKey);
      if (!patient) continue;
      await savePatientRow(patient, drafts[rowKey]);
    }
    toast.success("All changes saved");
  };

  const handleDeleteAll = async () => {
    const confirmText = window.prompt("Type DELETE to remove all patients");
    if (confirmText !== "DELETE") return;
    try {
      await deleteAllPatientsMutation.mutateAsync();
      setDrafts({});
      toast.success("All patients deleted");
      await utils.medical.getAllPatients.invalidate();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to delete all patients"));
    }
  };

  const handleDeleteFromMssql = async (patient: PatientRow) => {
    const patientCode = String(patient.patientCode ?? "").trim();
    if (!patientCode) {
      toast.error("Patient code is missing");
      return;
    }
    const confirmed = window.confirm(`Delete patient ${patientCode} from MSSQL only?`);
    if (!confirmed) return;
    try {
      const result = await deletePatientFromMssqlMutation.mutateAsync({
        patientId: patient.id,
        patientCode,
      });
      if ((result as { deleted?: boolean }).deleted) toast.success(`Deleted ${patientCode} from MSSQL`);
      else toast.info(`No MSSQL row found for ${patientCode}`);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to delete patient from MSSQL"));
    }
  };

  const handleDeletePatient = async (patient: PatientRow) => {
    const patientName = String(patient.fullName ?? "").trim();
    const patientCode = String(patient.patientCode ?? "").trim();
    const displayName = patientName || patientCode || `ID ${patient.id}`;
    const confirmed = window.confirm(`Are you sure you want to delete patient: ${displayName}?\n\nThis will remove the patient record but keep exam data.`);
    if (!confirmed) return;
    const confirmName = window.prompt(`Type the patient name \"${displayName}\" to confirm deletion:`);
    if (confirmName !== displayName) {
      toast.error("Patient name did not match. Deletion cancelled.");
      return;
    }
    try {
      await deletePatientMutation.mutateAsync({ patientId: patient.id });
      toast.success(`Patient ${displayName} deleted successfully`);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to delete patient"));
    }
  };

  const allVisibleSelected = visiblePatients.length > 0 && visiblePatients.every((patient) => selectedPatients.has(patient.id));

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedPatients((prev) => {
      const next = new Set(prev);
      if (checked) {
        visiblePatients.forEach((patient) => next.add(patient.id));
      } else {
        visiblePatients.forEach((patient) => next.delete(patient.id));
      }
      return next;
    });
  };

  const toggleSelectedPatient = (patientId: number, checked: boolean) => {
    setSelectedPatients((prev) => {
      const next = new Set(prev);
      if (checked) next.add(patientId);
      else next.delete(patientId);
      return next;
    });
  };

  const goToPreviousPage = () => {
    if (cursorHistory.length === 0) return;
    const previous = [...cursorHistory];
    const previousCursor = previous.pop() ?? null;
    setCursorHistory(previous);
    setCursor(previousCursor);
  };

  const goToNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor]);
    setCursor(nextCursor);
  };

  return {
    activeDoctors,
    allVisibleSelected,
    currentPage,
    dateFrom,
    dateTo,
    deleteAllPatientsMutation,
    deletePatientFromMssqlMutation,
    deletePatientMutation,
    doctorFilter,
    doctorOptions,
    drafts,
    expandedPatients,
    filteredPatients,
    getDraft,
    getRowServiceCode,
    getRowSheetType,
    goToNextPage,
    goToPreviousPage,
    handleDeleteAll,
    handleDeleteFromMssql,
    handleDeletePatient,
    handleSaveAll,
    handleToggleManualLock,
    hasMore,
    isExpanded,
    isManualLockEnabled,
    monthStats,
    mssqlSyncStatusQuery,
    nextCursor,
    normalizeTypedDateInput,
    pageSize,
    patientsQuery,
    rowSaveState,
    savePatientPageStateMutation,
    savePatientRow,
    searchTerm,
    selectedPatients,
    serviceCodeToLabel,
    serviceTypeFilter,
    setDateFrom,
    setDateTo,
    setDraftField,
    setManualLockOverrides,
    setPageSize,
    setSearchTerm,
    setServiceTypeFilter,
    setDoctorFilter,
    setLocationFilter,
    setStatsMonth,
    setStatsYear,
    statsMonth,
    statsYear,
    toggleExpanded,
    toggleSelectedPatient,
    toggleSelectAllVisible,
    updatePatientMutation,
    utils,
    visiblePatients,
    years,
    yearStats,
    locationFilter,
    monthOverMonthPercent,
    patientDashboardRollup,
    previousMonthStats,
  };
}

export type AdminPatientsListState = UseAdminPatientsListResult;
