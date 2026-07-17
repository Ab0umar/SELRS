import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function parseJson(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value
      .map((item) => formatDisplayValue(item))
      .filter(Boolean)
      .join(", ");
  if (typeof value === "object") {
    const maybeFundus = value as Record<string, unknown>;
    const fundusText = [
      maybeFundus.discStatus,
      maybeFundus.cupDiscRatio,
      maybeFundus.macuaStatus,
      maybeFundus.vesselStatus,
      maybeFundus.otherFindings,
    ]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
    if (fundusText) return fundusText;
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

export function classifyTest(test: any): "lab" | "imaging" | "other" {
  const type = String(test?.type ?? "")
    .trim()
    .toLowerCase();
  if (type === "lab") return "lab";
  if (type === "imaging") return "imaging";
  const category = String(test?.category ?? test?.serviceCategory ?? "")
    .trim()
    .toLowerCase();
  const name = String(test?.name ?? test?.serviceName ?? "")
    .trim()
    .toLowerCase();
  const isUncategorized = category.includes("uncategorized");
  if (
    category.includes("اشع") ||
    category.includes("تصوير") ||
    category.includes("radiology") ||
    category.includes("imaging") ||
    name.includes("اشع") ||
    name.includes("سونار") ||
    name.includes("sonar") ||
    name.includes("xray") ||
    name.includes("x-ray") ||
    name.includes("ct") ||
    name.includes("mri") ||
    name.includes("ultrasound") ||
    name.includes("ocular") ||
    name.includes("iol") ||
    name.includes("pf iol")
  )
    return "imaging";
  if (
    category.includes("تحليل") ||
    category.includes("lab") ||
    name.includes("cbc") ||
    name.includes("تحاليل") ||
    name.includes("analysis") ||
    name.includes("blood") ||
    name.includes("sugar") ||
    name.includes("urea") ||
    name.includes("creatinine") ||
    name.includes("culture") ||
    name.includes("sensitivity") ||
    name.includes("prothombine") ||
    name.includes("prothrombin")
  )
    return "lab";
  if (isUncategorized) return "lab";
  return "other";
}

interface UsePatientDetailsParams {
  patientId: number | undefined;
  user: any;
  isAuthenticated: boolean;
  setLocation: (to: string) => void;
  mode?: "visit-report" | "clinical-portal";
}

export function usePatientDetails({
  patientId,
  user,
  isAuthenticated,
  setLocation,
  mode = "clinical-portal",
}: UsePatientDetailsParams) {
  const isVisitReport = mode === "visit-report";
  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );
  const autorefractometryQuery =
    trpc.medical.getAutorefractometryByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId), staleTime: 0 },
    );
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );
  const afterRefractionQuery =
    trpc.medical.getAfterRefractionByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId), staleTime: 0 },
    );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) && !isVisitReport },
  );
  const prescriptionsQuery =
    trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId) },
    );
  const surgeriesQuery = trpc.medical.getSurgeriesByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) && !isVisitReport },
  );
  const followupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) && !isVisitReport },
  );
  const followupSheetsQuery = trpc.medical.getFollowupSheets.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) && !isVisitReport, staleTime: 0 },
  );
  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: patientId ?? 0, limit: 500 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const pentacamFilesQuery =
    trpc.medical.getSrv100DiagnosticImagesByPatient.useQuery(
      { patientId: patientId ?? 0, limit: 500 },
      { enabled: Boolean(patientId), refetchOnWindowFocus: false },
    );
  const medicalHistoryQuery = trpc.medical.getMedicalHistoryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const patientServiceEntriesQuery =
    trpc.medical.getPatientServiceEntries.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId), refetchOnWindowFocus: false },
    );
  const testRequestsQuery = trpc.medical.getPatientTestRequests?.useQuery?.(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user),
    refetchOnWindowFocus: false,
  });
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "patient-details" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const examStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "examination" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const serviceDirectoryQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "service_directory" },
    { refetchOnWindowFocus: false },
  );
  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(
    undefined,
    { refetchOnWindowFocus: false },
  );
  const latestVisitId = useMemo(() => {
    const patientVisits = [...((visitsQuery.data ?? []) as any[])];
    const mappedVisitIds = new Set<number>();

    for (const examination of (examinationsQuery.data ?? []) as any[]) {
      const visitId = Number(examination.visitId);
      if (visitId) mappedVisitIds.add(visitId);
    }
    for (const measurement of (pentacamQuery.data ?? []) as any[]) {
      const visitId = Number(measurement.visitId);
      if (visitId) mappedVisitIds.add(visitId);
    }
    for (const request of (testRequestsQuery?.data ?? []) as any[]) {
      const visitId = Number(request.visitId);
      if (visitId) mappedVisitIds.add(visitId);
    }
    for (const prescription of (prescriptionsQuery.data ?? []) as any[]) {
      const visitId = Number(prescription.visitId);
      if (visitId) mappedVisitIds.add(visitId);
    }

    const reportVisits = patientVisits.filter((visit) =>
      mappedVisitIds.has(Number(visit.id)),
    );
    const candidates = reportVisits.length ? reportVisits : patientVisits;
    candidates.sort(
      (a, b) =>
        new Date(b.visitDate ?? b.createdAt).getTime() -
        new Date(a.visitDate ?? a.createdAt).getTime(),
    );
    return Number(candidates[0]?.id ?? 0) || null;
  }, [
    examinationsQuery.data,
    pentacamQuery.data,
    prescriptionsQuery.data,
    testRequestsQuery?.data,
    visitsQuery.data,
  ]);
  const latestExaminationId = useMemo(() => {
    const patientExaminations = (examinationsQuery.data ?? []) as any[];
    const latestExam = patientExaminations.find(
      (exam: any) => Number(exam.visitId) === latestVisitId,
    );
    return Number(latestExam?.id ?? 0) || null;
  }, [examinationsQuery.data, latestVisitId]);
  const examinationChecklistQuery =
    trpc.medical.getExaminationChecklist.useQuery(
      { examinationId: latestExaminationId ?? 0 },
      { enabled: Boolean(latestExaminationId), refetchOnWindowFocus: false },
    );
  const examinationChecklistsQuery =
    trpc.medical.getExaminationChecklistsByPatient.useQuery(
      { patientId: patientId ?? 0 },
      { enabled: Boolean(patientId), refetchOnWindowFocus: false },
    );

  const deleteExamMutation = trpc.medical.deleteExaminationDirect.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الزيارة بنجاح");
      examinationsQuery.refetch();
      visitsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في حذف الزيارة");
    },
  });
  const updateVisitDateMutation = trpc.medical.updateVisitDate.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث التاريخ بنجاح");
      Promise.all([visitsQuery.refetch(), examinationsQuery.refetch()]);
      setEditingVisitId(null);
      setEditVisitDate("");
    },
    onError: (error) => {
      toast.error("خطأ في تحديث التاريخ: " + (error.message || ""));
    },
  });
  const savePatientStateMutation =
    trpc.medical.savePatientPageState.useMutation();
  const deletePatientMutation =
    trpc.medical.deletePatientWithAllData.useMutation();
  const deleteVisitMutation = trpc.medical.deleteVisitWithAllData.useMutation();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "examinations";
    try {
      const stored =
        localStorage.getItem(`tabs:patient-details:${patientId ?? "new"}`) ||
        "";
      if (stored === "overview") return "examinations";
      if (
        [
          "examinations",
          "diagnosis",
          "treatment",
          "tests",
          "followup",
          "pentacam",
        ].includes(stored)
      )
        return stored;
    } catch {
      /* ignore */
    }
    return "examinations";
  });
  const [patientCodeDraft, setPatientCodeDraft] = useState("");
  const [serviceTypeDraft, setServiceTypeDraft] = useState("");
  const [serviceCodeDraft, setServiceCodeDraft] = useState("");
  const [openExamSections, setOpenExamSections] = useState({
    autoref: true,
    glasses: true,
    fundus: true,
    requestTests: true,
  });
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [editVisitDate, setEditVisitDate] = useState<string>("");

  const patientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hydratedPatientStateRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!patientId) return;
    if (!isVisitReport) reportsQuery.refetch();
    pentacamQuery.refetch();
    examinationsQuery.refetch();
    visitsQuery.refetch();
    testRequestsQuery?.refetch?.();
    prescriptionsQuery.refetch();
    if (!isVisitReport) followupSheetsQuery.refetch();
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    const raw = localStorage.getItem(`patient_state_details_${patientId}`);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.activeTab !== undefined)
        setActiveTab(
          data.activeTab === "overview"
            ? "examinations"
            : (data.activeTab ?? "examinations"),
        );
    } catch {
      /* ignore */
    }
  }, [patientId]);

  useEffect(() => {
    hydratedPatientStateRef.current = null;
  }, [patientId]);

  useEffect(() => {
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === (patientId ?? null)) return;
    if (data.activeTab !== undefined)
      setActiveTab(
        data.activeTab === "overview"
          ? "examinations"
          : (data.activeTab ?? "examinations"),
      );
    hydratedPatientStateRef.current = patientId ?? null;
  }, [patientStateQuery.data, patientId]);

  useEffect(() => {
    if (!patientId) return;
    if (patientStateTimerRef.current)
      clearTimeout(patientStateTimerRef.current);
    const payload = { activeTab };
    localStorage.setItem(
      `patient_state_details_${patientId}`,
      JSON.stringify(payload),
    );
    patientStateTimerRef.current = setTimeout(() => {
      savePatientStateMutation.mutate({
        patientId,
        page: "patient-details",
        data: payload,
      });
    }, 600);
    return () => {
      if (patientStateTimerRef.current)
        clearTimeout(patientStateTimerRef.current);
    };
  }, [patientId, activeTab]);

  const patient = patientQuery.data as any;

  const examinations = examinationsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const prescriptions = prescriptionsQuery.data ?? [];
  const surgeries = surgeriesQuery.data ?? [];
  const followups = followupsQuery.data ?? [];

  const canViewPentacam =
    String(user?.role ?? "").toLowerCase() === "admin" ||
    (permissionsQuery.data ?? []).includes("/sheets/pentacam/:id");
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  const serviceType = String(patient?.serviceType ?? "").trim();
  const serviceCode = String(
    (examStateQuery.data as any)?.data?.serviceCode ?? "",
  ).trim();

  useEffect(() => {
    setPatientCodeDraft(patient?.patientCode ?? "");
  }, [patient?.patientCode]);
  useEffect(() => {
    setServiceTypeDraft(serviceType);
  }, [serviceType]);
  useEffect(() => {
    setServiceCodeDraft(serviceCode);
  }, [serviceCode]);

  const latestReport = reports.find(
    (report: any) => Number(report.visitId) === latestVisitId,
  );
  const latestReportContent =
    parseJson((latestReport as any)?.content ?? latestReport?.diagnosis) ??
    (latestReport as any)?.content ??
    latestReport?.diagnosis ??
    latestReport?.treatment ??
    null;

  const overviewData = useMemo(() => {
    const symptomSet = new Set<string>();
    let history = "";
    const checklists = isVisitReport
      ? [examinationChecklistQuery.data as any].filter(Boolean)
      : (((examinationChecklistsQuery.data as any[]) ?? []) as any[]);
    const checklistHistoryLabels: Array<[string, string]> = [
      ["generalDiseases", "أمراض عامة"],
      ["pregnancyOrLactation", "حمل أو رضاعة"],
      [
        "usesAllergySupplementsSteroidsOrPressureMeds",
        "أدوية حساسية أو كورتيزون أو ضغط",
      ],
      ["acneTreatment", "علاج حب الشباب"],
      [
        "usesTearSubstituteOrExcessTearsOrSandySensation",
        "جفاف أو دموع زائدة أو إحساس بالرمل",
      ],
      ["symptomsWorseWithAirOrAC", "تزداد الأعراض مع الهواء أو التكييف"],
      ["glaucomaTreatment", "استخدام علاج الجلوكوما"],
      ["familyKeratoconus", "تاريخ عائلي للقرنية المخروطية"],
    ];
    const checklistHistory = new Set<string>();
    checklists.forEach((checklist) => {
      checklistHistoryLabels.forEach(([key, label]) => {
        if (checklist?.[key]) checklistHistory.add(label);
      });
    });
    const symptomVisits = isVisitReport
      ? ((visitsQuery.data as any[]) ?? []).filter(
          (visit) => Number(visit.id) === latestVisitId,
        )
      : ((visitsQuery.data as any[]) ?? []);
    symptomVisits.forEach((visit) => {
      const complaint = String(visit?.chiefComplaint ?? "").trim();
      if (complaint) symptomSet.add(complaint);
    });

    const historyRows = Array.isArray(medicalHistoryQuery.data)
      ? [...(medicalHistoryQuery.data as any[])].sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt).getTime() -
            new Date(a.updatedAt ?? a.createdAt).getTime(),
        )
      : [];
    const historyRow = historyRows[0];
    const historyParts = [
      ...Array.from(checklistHistory),
      historyRow?.diabetes && "السكري",
      historyRow?.hypertension && "ضغط الدم",
      historyRow?.heartDisease && "أمراض القلب",
      historyRow?.asthma && "الربو",
      historyRow?.allergies && "الحساسية",
      historyRow?.previousSurgeries &&
        `عمليات سابقة: ${historyRow.previousSurgeries}`,
      historyRow?.medications && `أدوية حالية: ${historyRow.medications}`,
      historyRow?.familyHistory && `تاريخ عائلي: ${historyRow.familyHistory}`,
    ].filter(Boolean);
    if (historyParts.length) history = historyParts.join("، ");
    return { history: history.trim(), symptoms: Array.from(symptomSet) };
  }, [
    examinationChecklistQuery.data,
    examinationChecklistsQuery.data,
    isVisitReport,
    latestVisitId,
    medicalHistoryQuery.data,
    visitsQuery.data,
  ]);

  const parsedExamSources = useMemo(() => {
    const autorefMap = new Map<number, any>();
    const glassesMap = new Map<number, any>();
    const afterMap = new Map<number, any>();
    if (Array.isArray(autorefractometryQuery.data))
      for (const record of autorefractometryQuery.data)
        autorefMap.set(record.examinationId, record);
    if (Array.isArray(glassesRecordsQuery.data))
      for (const record of glassesRecordsQuery.data)
        glassesMap.set(record.examinationId, record);
    if (Array.isArray(afterRefractionQuery.data))
      for (const record of afterRefractionQuery.data)
        afterMap.set(record.examinationId, record);

    const selectedExaminations = isVisitReport && latestVisitId
      ? examinations.filter(
          (exam: any) => Number(exam.visitId) === latestVisitId,
        )
      : examinations;
    return selectedExaminations.map((exam: any) => {
      const afterRecord = afterMap.get(exam.id);
      const autorefRecord = autorefMap.get(exam.id);
      const autorefraction = autorefRecord
        ? {
            od: {
              s: autorefRecord.sphereOD,
              c: autorefRecord.cylinderOD,
              axis: autorefRecord.axisOD,
              ucva: autorefRecord.ucvaOD,
              bcva: autorefRecord.bcvaOD,
              iop: autorefRecord.iopOD,
            },
            os: {
              s: autorefRecord.sphereOS,
              c: autorefRecord.cylinderOS,
              axis: autorefRecord.axisOS,
              ucva: autorefRecord.ucvaOS,
              bcva: autorefRecord.bcvaOS,
              iop: autorefRecord.iopOS,
            },
          }
        : undefined;

      const glassesRecord = glassesMap.get(exam.id);
      let glassesData: any = undefined;
      if (glassesRecord) {
        glassesData = {
          od:
            glassesRecord.sOD || glassesRecord.cOD
              ? {
                  s: glassesRecord.sOD,
                  c: glassesRecord.cOD,
                  axis: glassesRecord.axisOD,
                  pd: glassesRecord.pdOD,
                  add: glassesRecord.addOD || glassesRecord.addOS,
                  bcva: glassesRecord.bcvaOD || autorefRecord?.bcvaOD,
                }
              : undefined,
          os:
            glassesRecord.sOS || glassesRecord.cOS
              ? {
                  s: glassesRecord.sOS,
                  c: glassesRecord.cOS,
                  axis: glassesRecord.axisOS,
                  pd: glassesRecord.pdOS,
                  add: glassesRecord.addOS || glassesRecord.addOD,
                  bcva: glassesRecord.bcvaOS || autorefRecord?.bcvaOS,
                }
              : undefined,
        };
      }
      const visitDate =
        autorefRecord?.visitDate || glassesRecord?.visitDate || exam?.createdAt;
      return {
        autorefraction,
        glasses: glassesData,
        visitDate,
        fundus: {
          od: exam?.posteriorSegmentOD
            ? parseJson(exam.posteriorSegmentOD)
            : undefined,
          os: exam?.posteriorSegmentOS
            ? parseJson(exam.posteriorSegmentOS)
            : undefined,
        },
        after: afterRecord
          ? {
              od: {
                s: afterRecord.sphereOD,
                c: afterRecord.cylinderOD,
                axis: afterRecord.axisOD,
              },
              os: {
                s: afterRecord.sphereOS,
                c: afterRecord.cylinderOS,
                axis: afterRecord.axisOS,
              },
            }
          : undefined,
      };
    });
  }, [
    examinations,
    isVisitReport,
    latestVisitId,
    autorefractometryQuery.data,
    afterRefractionQuery.data,
    glassesRecordsQuery.data,
  ]);

  const autorefractionRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const eyeSources = parsedExamSources.map(
        (source: any) => source?.autorefraction?.[eyeKey] ?? null,
      );
      return {
        eye,
        ucva: firstNonEmpty(...eyeSources.map((item: any) => item?.ucva)),
        bcva: firstNonEmpty(...eyeSources.map((item: any) => item?.bcva)),
        s: firstNonEmpty(...eyeSources.map((item: any) => item?.s)),
        c: firstNonEmpty(...eyeSources.map((item: any) => item?.c)),
        axis: firstNonEmpty(...eyeSources.map((item: any) => item?.axis)),
        iop: firstNonEmpty(...eyeSources.map((item: any) => item?.iop)),
      };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) =>
      [row.ucva, row.bcva, row.s, row.c, row.axis, row.iop].some(Boolean),
    );
  }, [parsedExamSources]);

  const afterRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const afterSources = parsedExamSources.map(
        (source: any) => (source as any)?.after?.[eyeKey] ?? null,
      );
      return {
        eye,
        s: firstNonEmpty(...afterSources.map((item: any) => item?.s)),
        c: firstNonEmpty(...afterSources.map((item: any) => item?.c)),
        axis: firstNonEmpty(...afterSources.map((item: any) => item?.axis)),
      };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) =>
      [row.s, row.c, row.axis].some(Boolean),
    );
  }, [parsedExamSources]);

  const pentacamMeasurements = useMemo(() => {
    const rows = Array.isArray(pentacamQuery.data)
      ? (pentacamQuery.data as any[])
      : [];
    if (!latestVisitId) return [];
    const linkedRows = rows.filter(
      (row) => Number(row.visitId) === latestVisitId,
    );
    if (linkedRows.length) return linkedRows;
    return rows
      .filter((row) => !Number(row.visitId))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 1);
  }, [latestVisitId, pentacamQuery.data]);

  const pentacamFiles = useMemo(() => {
    const files = Array.isArray(pentacamFilesQuery.data)
      ? (pentacamFilesQuery.data as any[])
      : [];
    if (!files.length) return [];
    const latestFileDate = formatDate(
      files[0]?.capturedAt ?? files[0]?.importedAt,
    );
    return files.filter(
      (file) =>
        formatDate(file?.capturedAt ?? file?.importedAt) === latestFileDate,
    );
  }, [pentacamFilesQuery.data]);

  const glassesRows = useMemo(() => {
    const rows: Array<{
      visit: string;
      odS: string;
      odC: string;
      odAx: string;
      osS: string;
      osC: string;
      osAx: string;
      osPd: string;
      add: string;
    }> = [];
    for (const source of parsedExamSources) {
      if (!source?.glasses) continue;
      const od = source.glasses?.od;
      const os = source.glasses?.os;
      const hasData =
        (od && [od.s, od.c, od.axis].some(Boolean)) ||
        (os && [os.s, os.c, os.axis, os.pd].some(Boolean));
      if (!hasData) continue;
      rows.push({
        visit: formatDate(source.visitDate),
        odS: od?.s || "-",
        odC: od?.c || "-",
        odAx: od?.axis || "-",
        osS: os?.s || "-",
        osC: os?.c || "-",
        osAx: os?.axis || "-",
        osPd: os?.pd || "-",
        add: od?.add || os?.add || "-",
      });
    }
    return rows;
  }, [parsedExamSources]);

  const pentacamRows = useMemo(() => {
    const buildEye = (
      eyeKey: "od" | "os",
      eyeSuffix: "OD" | "OS",
      eyeDisplay: "OD" | "OS",
    ) => {
      const dbSources = pentacamMeasurements.map((source) => ({
        k1: source?.[`k1${eyeSuffix}`] ?? source?.[`keratometry${eyeSuffix}`],
        k2: source?.[`k2${eyeSuffix}`],
        thinnest:
          source?.[`thinnestPoint${eyeSuffix}`] ??
          source?.[`pachymetry${eyeSuffix}`],
        apex: source?.[`apex${eyeSuffix}`],
        residual: source?.[`residual${eyeSuffix}`],
        ttt: source?.[`ttt${eyeSuffix}`],
        ablation: source?.[`ablation${eyeSuffix}`],
      }));
      return {
        eye: eyeDisplay,
        k1: firstNonEmpty(...dbSources.map((item) => item?.k1)),
        k2: firstNonEmpty(...dbSources.map((item) => item?.k2)),
        thinnest: firstNonEmpty(...dbSources.map((item) => item?.thinnest)),
        apex: firstNonEmpty(...dbSources.map((item) => item?.apex)),
        residual: firstNonEmpty(...dbSources.map((item) => item?.residual)),
        ttt: firstNonEmpty(...dbSources.map((item) => item?.ttt)),
        ablation: firstNonEmpty(...dbSources.map((item) => item?.ablation)),
      };
    };
    return [buildEye("od", "OD", "OD"), buildEye("os", "OS", "OS")].filter(
      (row) =>
        [
          row.k1,
          row.k2,
          row.thinnest,
          row.apex,
          row.residual,
          row.ttt,
          row.ablation,
        ].some(Boolean),
    );
  }, [pentacamMeasurements, parsedExamSources]);

  const fundusRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const fundusDetails = parsedExamSources.map(
        (source: any) => source?.fundus?.[eyeKey],
      );
      const findings = firstNonEmpty(
        ...fundusDetails.map((detail: any) =>
          detail
            ? [
                detail.discStatus,
                detail.cupDiscRatio,
                detail.macuaStatus,
                detail.vesselStatus,
                detail.otherFindings,
              ]
                .filter(Boolean)
                .join(", ")
            : null,
        ),
      );
      return { eye, findings };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter(
      (row) => row.findings,
    );
  }, [parsedExamSources]);

  const requestedImagingAndLabs = useMemo(() => {
    const requests = Array.isArray(testRequestsQuery?.data)
      ? (testRequestsQuery.data as any[])
      : [];
    const visitRequests = isVisitReport
      ? requests.filter(
          (request) => Number(request.visitId) === latestVisitId,
        )
      : requests;
    const selectedRequests =
      isVisitReport && visitRequests.length === 0
        ? requests.filter((request) => !Number(request.visitId))
        : visitRequests;
    return selectedRequests
      .flatMap((request) =>
        (request.items ?? []).map((item: any) => ({
          id: item.id,
          visitId: request.visitId,
          name: item.testName,
          result: item.result,
          requestDate: request.requestDate,
          status: request.status,
        })),
      );
  }, [isVisitReport, latestVisitId, testRequestsQuery?.data]);

  const treatmentRows = useMemo(() => {
    const source = Array.isArray(prescriptionsQuery.data)
      ? (prescriptionsQuery.data as any[]).filter(
          (prescription) =>
            !isVisitReport ||
            Number(prescription.visitId) === latestVisitId,
        )
      : [];
    const rows: Array<{
      key: string;
      date: string;
      medication: string;
      dosage: string;
      frequency: string;
      duration: string;
      notes: string;
    }> = [];
    source.forEach((prescription: any) => {
      const date = formatDate(prescription?.prescriptionDate);
      const items = Array.isArray(prescription?.items)
        ? prescription.items
        : [];
      if (items.length) {
        items.forEach((item: any, index: number) => {
          rows.push({
            key: `${prescription?.id ?? "p"}-${index}`,
            date,
            medication: firstNonEmpty(
              item?.medicationName,
              prescription?.medicationName,
              "—",
            ),
            dosage: firstNonEmpty(item?.dosage, "—"),
            frequency: firstNonEmpty(item?.frequency, "—"),
            duration: firstNonEmpty(item?.duration, "—"),
            notes: firstNonEmpty(item?.instructions, ""),
          });
        });
      } else {
        rows.push({
          key: `${prescription?.id ?? "p"}-fallback`,
          date,
          medication: firstNonEmpty(prescription?.medicationName, "—"),
          dosage: "—",
          frequency: "—",
          duration: "—",
          notes: firstNonEmpty(prescription?.notes, ""),
        });
      }
    });
    return rows;
  }, [isVisitReport, latestVisitId, prescriptionsQuery.data]);

  const serviceDirectory = useMemo(() => {
    const raw = (serviceDirectoryQuery.data as any)?.value;
    return Array.isArray(raw) ? raw : [];
  }, [serviceDirectoryQuery.data]);
  const activeServiceOptions = useMemo(
    () =>
      serviceDirectory
        .filter((s: any) => s && s.isActive !== false)
        .map((s: any) => ({
          code: String(s.code ?? "").trim(),
          name: String(s.name ?? "").trim(),
          serviceType: String(s.serviceType ?? "").trim(),
        }))
        .filter((s: any) => s.code && s.name),
    [serviceDirectory],
  );
  const serviceByCode = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; serviceType: string }
    >();
    for (const item of activeServiceOptions) map.set(item.code, item);
    return map;
  }, [activeServiceOptions]);
  const selectedDoctorName = useMemo(() => {
    const fromExam = String(
      (examStateQuery.data as any)?.data?.doctorName ?? "",
    ).trim();
    const fromPatient = String((patient as any)?.treatingDoctor ?? "").trim();
    return fromExam || fromPatient;
  }, [examStateQuery.data, patient]);
  const selectedDoctor = useMemo(() => {
    const list = Array.isArray(doctorDirectoryQuery.data)
      ? (doctorDirectoryQuery.data as any[])
      : [];
    if (!selectedDoctorName) return null;
    return (
      list.find(
        (d) =>
          String(d?.name ?? "").trim() === selectedDoctorName &&
          d?.isActive !== false,
      ) ?? null
    );
  }, [doctorDirectoryQuery.data, selectedDoctorName]);
  const filteredServiceOptions = useMemo(() => {
    const normalizedServiceType = String(serviceTypeDraft || serviceType || "")
      .trim()
      .toLowerCase();
    const doctorType = String((selectedDoctor as any)?.doctorType ?? "")
      .trim()
      .toLowerCase();
    let targetType = normalizedServiceType;
    if (
      !targetType &&
      ["consultant", "specialist", "external"].includes(doctorType)
    )
      targetType = doctorType;
    if (!targetType) return activeServiceOptions;
    return activeServiceOptions.filter(
      (opt: any) =>
        String(opt.serviceType ?? "")
          .trim()
          .toLowerCase() === targetType,
    );
  }, [activeServiceOptions, serviceTypeDraft, serviceType, selectedDoctor]);
  const multiServiceCodes = useMemo(() => {
    const fromExamRaw = Array.isArray(
      (examStateQuery.data as any)?.data?.serviceCodes,
    )
      ? ((examStateQuery.data as any).data.serviceCodes as unknown[])
      : [];
    const fromPatientRaw = Array.isArray((patient as any)?.serviceCodes)
      ? ((patient as any).serviceCodes as unknown[])
      : [];
    return Array.from(
      new Set(
        [
          ...fromExamRaw.map((v) => String(v ?? "").trim()),
          ...fromPatientRaw.map((v) => String(v ?? "").trim()),
          String((examStateQuery.data as any)?.data?.serviceCode ?? "").trim(),
          String((patient as any)?.serviceCode ?? "").trim(),
          serviceCodeDraft,
        ].filter(Boolean),
      ),
    );
  }, [examStateQuery.data, patient, serviceCodeDraft]);
  const serviceSelectOptions = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; serviceType: string }
    >();
    for (const opt of filteredServiceOptions) map.set(opt.code, opt);
    for (const code of multiServiceCodes) {
      if (!code) continue;
      if (!map.has(code)) {
        const known = serviceByCode.get(code);
        map.set(code, {
          code,
          name: known?.name || code,
          serviceType: known?.serviceType || "",
        });
      }
    }
    return Array.from(map.values());
  }, [filteredServiceOptions, multiServiceCodes, serviceByCode]);
  const overviewStats = useMemo(() => {
    const serviceEntries = Array.isArray(patientServiceEntriesQuery.data)
      ? (patientServiceEntriesQuery.data as any[])
      : [];
    const earliestServiceDate = serviceEntries
      .map((entry) => String(entry?.serviceDate ?? "").trim())
      .filter(Boolean)
      .sort()[0];
    const mssqlBackfill = ((examStateQuery.data as any)?.data?.mssqlBackfill ??
      {}) as Record<string, any>;
    return {
      age: patient?.age ?? "",
      gender: patient?.gender ?? "",
      status: patient?.status ?? "",
      registrationDate: formatDate(
        firstNonEmpty(
          mssqlBackfill.ENTRYDATE,
          mssqlBackfill.DT,
          mssqlBackfill.secondDt,
          earliestServiceDate,
          (patient as any)?.lastVisit,
          patient?.createdAt,
        ),
      ),
    };
  }, [examStateQuery.data, patient, patientServiceEntriesQuery.data]);

  const toggleExamSection = (key: keyof typeof openExamSections) => {
    setOpenExamSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onRefresh = async () => {
    const reportRefreshes = [
      patientQuery.refetch(),
      examinationsQuery.refetch(),
      visitsQuery.refetch(),
      autorefractometryQuery.refetch(),
      afterRefractionQuery.refetch(),
      glassesRecordsQuery.refetch(),
      pentacamQuery.refetch(),
      pentacamFilesQuery.refetch(),
      medicalHistoryQuery.refetch(),
      examinationChecklistQuery.refetch(),
      testRequestsQuery?.refetch?.(),
      prescriptionsQuery.refetch(),
      patientStateQuery.refetch(),
      examStateQuery.refetch(),
    ];
    if (!isVisitReport) {
      reportRefreshes.push(
        reportsQuery.refetch(),
        surgeriesQuery.refetch(),
        followupsQuery.refetch(),
        followupSheetsQuery.refetch(),
      );
    }
    await Promise.all(reportRefreshes);
  };

  return {
    patientQuery,
    examinationsQuery,
    visitsQuery,
    reportsQuery,
    prescriptionsQuery,
    surgeriesQuery,
    followupsQuery,
    followupSheetsQuery,
    pentacamQuery,
    pentacamFilesQuery,
    medicalHistoryQuery,
    examinationChecklistQuery,
    testRequestsQuery,
    deleteExamMutation,
    updateVisitDateMutation,
    deletePatientMutation,
    deleteVisitMutation,
    patient,
    examinations,
    reports,
    prescriptions,
    surgeries,
    followups,
    patientName: patient?.fullName ?? "",
    patientCode: patient?.patientCode ?? "",
    canViewPentacam,
    isAdmin,
    activeTab,
    setActiveTab,
    patientCodeDraft,
    serviceTypeDraft,
    serviceCodeDraft,
    serviceSelectOptions,
    openExamSections,
    toggleExamSection,
    editingVisitId,
    setEditingVisitId,
    editVisitDate,
    setEditVisitDate,
    overviewData,
    overviewStats,
    parsedExamSources,
    autorefractionRows,
    afterRows,
    glassesRows,
    pentacamRows,
    pentacamFiles,
    latestVisitId,
    fundusRows,
    requestedImagingAndLabs,
    treatmentRows,
    latestReport,
    latestReportContent,
    onRefresh,
  };
}
