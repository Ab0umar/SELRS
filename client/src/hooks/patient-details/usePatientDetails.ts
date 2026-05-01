import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function parseJson(value?: string | null) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
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
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatDisplayValue(item)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const maybeFundus = value as Record<string, unknown>;
    const fundusText = [maybeFundus.discStatus, maybeFundus.cupDiscRatio, maybeFundus.macuaStatus, maybeFundus.vesselStatus, maybeFundus.otherFindings]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
    if (fundusText) return fundusText;
    try { return JSON.stringify(value); } catch { return ""; }
  }
  return "";
}

export function classifyTest(test: any): "lab" | "imaging" | "other" {
  const type = String(test?.type ?? "").trim().toLowerCase();
  if (type === "lab") return "lab";
  if (type === "imaging") return "imaging";
  const category = String(test?.category ?? test?.serviceCategory ?? "").trim().toLowerCase();
  const name = String(test?.name ?? test?.serviceName ?? "").trim().toLowerCase();
  const isUncategorized = category.includes("uncategorized");
  if (
    category.includes("اشع") || category.includes("تصوير") || category.includes("radiology") || category.includes("imaging") ||
    name.includes("اشع") || name.includes("سونار") || name.includes("sonar") || name.includes("xray") ||
    name.includes("x-ray") || name.includes("ct") || name.includes("mri") || name.includes("ultrasound") ||
    name.includes("ocular") || name.includes("iol") || name.includes("pf iol")
  ) return "imaging";
  if (
    category.includes("تحليل") || category.includes("lab") ||
    name.includes("cbc") || name.includes("تحاليل") || name.includes("analysis") || name.includes("blood") ||
    name.includes("sugar") || name.includes("urea") || name.includes("creatinine") || name.includes("culture") ||
    name.includes("sensitivity") || name.includes("prothombine") || name.includes("prothrombin")
  ) return "lab";
  if (isUncategorized) return "lab";
  return "other";
}

interface UsePatientDetailsParams {
  patientId: number | undefined;
  user: any;
  isAuthenticated: boolean;
  setLocation: (to: string) => void;
}

export function usePatientDetails({ patientId, user, isAuthenticated, setLocation }: UsePatientDetailsParams) {
  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId), staleTime: 0 });
  const autorefractometryQuery = trpc.medical.getAutorefractometryByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId), staleTime: 0 });
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId), staleTime: 0 });
  const afterRefractionQuery = trpc.medical.getAfterRefractionByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId), staleTime: 0 });
  const consultantSheetQuery = trpc.medical.getSheetEntry.useQuery({ patientId: patientId ?? 0, sheetType: "consultant" }, { enabled: Boolean(patientId), staleTime: 0 });
  const specialistSheetQuery = trpc.medical.getSheetEntry.useQuery({ patientId: patientId ?? 0, sheetType: "specialist" }, { enabled: Boolean(patientId), staleTime: 0 });
  const lasikSheetQuery = trpc.medical.getSheetEntry.useQuery({ patientId: patientId ?? 0, sheetType: "lasik" }, { enabled: Boolean(patientId), staleTime: 0 });
  const externalSheetQuery = trpc.medical.getSheetEntry.useQuery({ patientId: patientId ?? 0, sheetType: "external" }, { enabled: Boolean(patientId), staleTime: 0 });
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId) });
  const prescriptionsQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId) });
  const surgeriesQuery = trpc.medical.getSurgeriesByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId) });
  const followupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId) });
  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery({ patientId: patientId ?? 0, limit: 10 }, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const patientServiceEntriesQuery = trpc.medical.getPatientServiceEntries.useQuery({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const requestTestsStateQuery = trpc.medical.getPatientPageState.useQuery({ patientId: patientId ?? 0, page: "request-tests" }, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const testRequestsQuery = trpc.medical.getPatientTestRequests?.useQuery?.({ patientId: patientId ?? 0 }, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 });
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery({ patientId: patientId ?? 0, page: "patient-details" }, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const examStateQuery = trpc.medical.getPatientPageState.useQuery({ patientId: patientId ?? 0, page: "examination" }, { enabled: Boolean(patientId), refetchOnWindowFocus: false });
  const serviceDirectoryQuery = trpc.medical.getSystemSetting.useQuery({ key: "service_directory" }, { refetchOnWindowFocus: false });
  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, { refetchOnWindowFocus: false });

  const deleteExamMutation = trpc.medical.deleteExaminationDirect.useMutation({
    onSuccess: () => { toast.success("تم حذف الزيارة بنجاح"); examinationsQuery.refetch(); visitsQuery.refetch(); },
    onError: (error) => { toast.error(error.message || "خطأ في حذف الزيارة"); },
  });
  const updateVisitDateMutation = trpc.medical.updateVisitDate.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث التاريخ بنجاح");
      Promise.all([visitsQuery.refetch(), examinationsQuery.refetch()]);
      setEditingVisitId(null);
      setEditVisitDate("");
    },
    onError: (error) => { toast.error("خطأ في تحديث التاريخ: " + (error.message || "")); },
  });
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const deletePatientMutation = trpc.medical.deletePatientWithAllData.useMutation();
  const deleteVisitMutation = trpc.medical.deleteVisitWithAllData.useMutation();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "examinations";
    try {
      const stored = localStorage.getItem(`tabs:patient-details:${patientId ?? "new"}`) || "";
      if (stored === "overview") return "examinations";
      if (["examinations", "diagnosis", "treatment", "tests", "followup", "pentacam"].includes(stored)) return stored;
    } catch { /* ignore */ }
    return "examinations";
  });
  const [patientCodeDraft, setPatientCodeDraft] = useState("");
  const [serviceTypeDraft, setServiceTypeDraft] = useState("");
  const [serviceCodeDraft, setServiceCodeDraft] = useState("");
  const [openExamSections, setOpenExamSections] = useState({ autoref: true, glasses: true, fundus: true, requestTests: true });
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [editVisitDate, setEditVisitDate] = useState<string>("");

  const patientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedPatientStateRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!patientId) return;
    reportsQuery.refetch();
    pentacamQuery.refetch();
    examinationsQuery.refetch();
    visitsQuery.refetch();
    testRequestsQuery?.refetch?.();
    prescriptionsQuery.refetch();
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    const raw = localStorage.getItem(`patient_state_details_${patientId}`);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.activeTab !== undefined) setActiveTab(data.activeTab === "overview" ? "examinations" : (data.activeTab ?? "examinations"));
    } catch { /* ignore */ }
  }, [patientId]);

  useEffect(() => { hydratedPatientStateRef.current = null; }, [patientId]);

  useEffect(() => {
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === (patientId ?? null)) return;
    if (data.activeTab !== undefined) setActiveTab(data.activeTab === "overview" ? "examinations" : (data.activeTab ?? "examinations"));
    hydratedPatientStateRef.current = patientId ?? null;
  }, [patientStateQuery.data, patientId]);

  useEffect(() => {
    if (!patientId) return;
    if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    const payload = { activeTab };
    localStorage.setItem(`patient_state_details_${patientId}`, JSON.stringify(payload));
    patientStateTimerRef.current = setTimeout(() => {
      savePatientStateMutation.mutate({ patientId, page: "patient-details", data: payload });
    }, 600);
    return () => { if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current); };
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
  const serviceCode = String((examStateQuery.data as any)?.data?.serviceCode ?? "").trim();

  useEffect(() => { setPatientCodeDraft(patient?.patientCode ?? ""); }, [patient?.patientCode]);
  useEffect(() => { setServiceTypeDraft(serviceType); }, [serviceType]);
  useEffect(() => { setServiceCodeDraft(serviceCode); }, [serviceCode]);

  const parseMedicalHistoryValue = (rawValue: unknown) => {
    const raw = String(rawValue ?? "").trim();
    if (!raw) return { history: "", symptoms: [] as string[] };
    const marker = "الأعراض:";
    const markerIndex = raw.indexOf(marker);
    if (markerIndex === -1) return { history: raw, symptoms: [] as string[] };
    const history = raw.slice(0, markerIndex).trim();
    const symptomsRaw = raw.slice(markerIndex + marker.length).trim();
    const parsedSymptoms = symptomsRaw.split(/[,\n،]/).map((item) => String(item ?? "").trim()).filter(Boolean);
    return { history, symptoms: Array.from(new Set(parsedSymptoms)) };
  };

  const latestReport = reports[0];
  const latestReportContent =
    parseJson((latestReport as any)?.content ?? latestReport?.diagnosis) ??
    (latestReport as any)?.content ?? latestReport?.diagnosis ?? latestReport?.treatment ?? null;

  const overviewData = useMemo(() => {
    const symptomSet = new Set<string>();
    const pushSymptoms = (value: unknown) => {
      if (Array.isArray(value)) { for (const item of value) { const text = String(item ?? "").trim(); if (text) symptomSet.add(text); } return; }
      const text = String(value ?? "").trim();
      if (!text) return;
      text.split(/[,\n،]/).map((item) => String(item ?? "").trim()).filter(Boolean).forEach((item) => symptomSet.add(item));
    };
    let history = "";
    if (typeof latestReportContent === "string") {
      const parsed = parseMedicalHistoryValue(latestReportContent);
      history = parsed.history || latestReportContent;
      pushSymptoms(parsed.symptoms);
    } else if (latestReportContent && typeof latestReportContent === "object") {
      const contentObj = latestReportContent as Record<string, unknown>;
      const parsed = parseMedicalHistoryValue(firstNonEmpty(contentObj.medicalHistory, contentObj.history, contentObj.chiefComplaint, contentObj.notes, contentObj.note, contentObj.text));
      history = parsed.history;
      pushSymptoms(parsed.symptoms);
      pushSymptoms(contentObj.selectedSymptoms);
      pushSymptoms(contentObj.symptoms);
    }
    if (!history) history = firstNonEmpty((latestReport as any)?.clinicalOpinion, (latestReport as any)?.diagnosis, (latestReport as any)?.recommendations);
    pushSymptoms((latestReport as any)?.symptoms);
    return { history: history.trim(), symptoms: Array.from(symptomSet) };
  }, [latestReport, latestReportContent]);

  const parsedExamSources = useMemo(() => {
    const autorefMap = new Map<number, any>();
    const glassesMap = new Map<number, any>();
    const afterMap = new Map<number, any>();
    if (Array.isArray(autorefractometryQuery.data)) for (const record of autorefractometryQuery.data) autorefMap.set(record.examinationId, record);
    if (Array.isArray(glassesRecordsQuery.data)) for (const record of glassesRecordsQuery.data) glassesMap.set(record.examinationId, record);
    if (Array.isArray(afterRefractionQuery.data)) for (const record of afterRefractionQuery.data) afterMap.set(record.examinationId, record);

    return examinations.map((exam: any) => {
      const notesData = parseJson(exam?.radiologyLabsNotes) ?? {};
      const afterRecord = afterMap.get(exam.id);
      const autorefRecord = autorefMap.get(exam.id);
      const autorefraction = autorefRecord ? {
        od: { s: autorefRecord.sphereOD, c: autorefRecord.cylinderOD, axis: autorefRecord.axisOD, ucva: autorefRecord.ucvaOD, bcva: autorefRecord.bcvaOD, iop: autorefRecord.iopOD },
        os: { s: autorefRecord.sphereOS, c: autorefRecord.cylinderOS, axis: autorefRecord.axisOS, ucva: autorefRecord.ucvaOS, bcva: autorefRecord.bcvaOS, iop: autorefRecord.iopOS },
      } : (exam.sphereOD || exam.sphereOS || exam.cylinderOD || exam.cylinderOS || exam.ucvaOD || exam.ucvaOS) ? {
        od: { s: exam.sphereOD, c: exam.cylinderOD, axis: exam.axisOD, ucva: exam.ucvaOD, bcva: exam.bcvaOD, iop: exam.iopOD },
        os: { s: exam.sphereOS, c: exam.cylinderOS, axis: exam.axisOS, ucva: exam.ucvaOS, bcva: exam.bcvaOS, iop: exam.iopOS },
      } : undefined;

      const glassesRecord = glassesMap.get(exam.id);
      let glassesData: any = undefined;
      if (glassesRecord) {
        glassesData = {
          od: glassesRecord.sOD || glassesRecord.cOD ? { s: glassesRecord.sOD, c: glassesRecord.cOD, axis: glassesRecord.axisOD, pd: glassesRecord.pdOD, add: glassesRecord.addOD, bcva: glassesRecord.bcvaOD } : undefined,
          os: glassesRecord.sOS || glassesRecord.cOS ? { s: glassesRecord.sOS, c: glassesRecord.cOS, axis: glassesRecord.axisOS, pd: glassesRecord.pdOS, add: glassesRecord.addOS, bcva: glassesRecord.bcvaOS } : undefined,
        };
      } else if (exam.glassesData) {
        try { glassesData = JSON.parse(exam.glassesData); } catch { /* ignore */ }
      }
      if (!glassesData) {
        for (const sheet of [consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data]) {
          if (sheet && typeof sheet === "object" && "examData" in sheet && (sheet as any).examData) {
            const sheetExamData = parseJson((sheet as any).examData);
            if (sheetExamData?.glasses) { glassesData = sheetExamData.glasses; break; }
          }
        }
      }

      const visitDate = autorefRecord?.visitDate || glassesRecord?.visitDate || exam?.createdAt;
      return {
        autorefraction, glasses: glassesData, visitDate,
        fundus: { od: exam?.posteriorSegmentOD ? parseJson(exam.posteriorSegmentOD) : undefined, os: exam?.posteriorSegmentOS ? parseJson(exam.posteriorSegmentOS) : undefined },
        radiologyLabsNotes: exam?.radiologyLabsNotes,
        pentacam: (notesData as any)?.pentacam || undefined,
        after: afterRecord
          ? { od: { s: afterRecord.sphereOD, c: afterRecord.cylinderOD, axis: afterRecord.axisOD }, os: { s: afterRecord.sphereOS, c: afterRecord.cylinderOS, axis: afterRecord.axisOS } }
          : ((notesData as any)?.measurements?.after || (notesData as any)?.after || undefined),
      };
    });
  }, [examinations, autorefractometryQuery.data, afterRefractionQuery.data, glassesRecordsQuery.data, consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data]);

  const autorefractionRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const eyeSources = parsedExamSources.map((source) => source?.autorefraction?.[eyeKey] ?? null);
      return { eye, ucva: firstNonEmpty(...eyeSources.map((item) => item?.ucva)), bcva: firstNonEmpty(...eyeSources.map((item) => item?.bcva)), s: firstNonEmpty(...eyeSources.map((item) => item?.s)), c: firstNonEmpty(...eyeSources.map((item) => item?.c)), axis: firstNonEmpty(...eyeSources.map((item) => item?.axis)), iop: firstNonEmpty(...eyeSources.map((item) => item?.iop)) };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) => [row.ucva, row.bcva, row.s, row.c, row.axis, row.iop].some(Boolean));
  }, [parsedExamSources]);

  const afterRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const afterSources = parsedExamSources.map((source) => (source as any)?.after?.[eyeKey] ?? null);
      return { eye, s: firstNonEmpty(...afterSources.map((item) => item?.s)), c: firstNonEmpty(...afterSources.map((item) => item?.c)), axis: firstNonEmpty(...afterSources.map((item) => item?.axis)) };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) => [row.s, row.c, row.axis].some(Boolean));
  }, [parsedExamSources]);

  const pentacamMeasurements = useMemo(() => Array.isArray(pentacamQuery.data) ? (pentacamQuery.data as any[]) : [], [pentacamQuery.data]);

  const glassesRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const glassesSources = parsedExamSources.map((source) => source?.glasses?.[eyeKey] ?? null);
      return { eye, s: firstNonEmpty(...glassesSources.map((item) => item?.s)), c: firstNonEmpty(...glassesSources.map((item) => item?.c)), axis: firstNonEmpty(...glassesSources.map((item) => item?.axis)), pd: firstNonEmpty(...glassesSources.map((item) => item?.pd)), bcva: firstNonEmpty(...glassesSources.map((item) => item?.bcva)) };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) => [row.s, row.c, row.axis, row.pd, row.bcva].some(val => val !== undefined && val !== null && val !== ""));
  }, [parsedExamSources]);

  const pentacamRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eyeSuffix: "OD" | "OS", eyeDisplay: "OD" | "OS") => {
      const dbSources = pentacamMeasurements.map((source) => ({ k1: source?.[`k1${eyeSuffix}`], k2: source?.[`k2${eyeSuffix}`], thinnest: source?.[`thinnestPoint${eyeSuffix}`], apex: source?.[`apex${eyeSuffix}`], residual: source?.[`residual${eyeSuffix}`], ttt: source?.[`ttt${eyeSuffix}`], ablation: source?.[`ablation${eyeSuffix}`] }));
      const examPentacamSources = parsedExamSources.map((source) => source?.pentacam?.[eyeKey]).filter(Boolean);
      return { eye: eyeDisplay, k1: firstNonEmpty(...dbSources.map((item) => item?.k1), ...examPentacamSources.map((item) => item?.k1)), k2: firstNonEmpty(...dbSources.map((item) => item?.k2), ...examPentacamSources.map((item) => item?.k2)), thinnest: firstNonEmpty(...dbSources.map((item) => item?.thinnest), ...examPentacamSources.map((item) => item?.thinnest)), apex: firstNonEmpty(...dbSources.map((item) => item?.apex), ...examPentacamSources.map((item) => item?.apex)), residual: firstNonEmpty(...dbSources.map((item) => item?.residual), ...examPentacamSources.map((item) => item?.residualStroma)), ttt: firstNonEmpty(...dbSources.map((item) => item?.ttt)), ablation: firstNonEmpty(...dbSources.map((item) => item?.ablation)) };
    };
    return [buildEye("od", "OD", "OD"), buildEye("os", "OS", "OS")].filter((row) => [row.k1, row.k2, row.thinnest, row.apex, row.residual, row.ttt, row.ablation].some(Boolean));
  }, [pentacamMeasurements, parsedExamSources]);

  const testsData = useMemo(() => {
    const allTests: any[] = [];
    parsedExamSources.forEach((source) => {
      if (source?.radiologyLabsNotes) {
        try { const parsed = JSON.parse(source.radiologyLabsNotes); if (parsed.tests && Array.isArray(parsed.tests)) allTests.push(...parsed.tests); } catch { /* ignore */ }
      }
    });
    return [...new Set(allTests)];
  }, [parsedExamSources]);

  const treatmentData = useMemo(() => {
    const allTreatment: any[] = [];
    parsedExamSources.forEach((source) => {
      if (source?.radiologyLabsNotes) {
        try { const parsed = JSON.parse(source.radiologyLabsNotes); if (parsed.treatment && Array.isArray(parsed.treatment)) allTreatment.push(...parsed.treatment); } catch { /* ignore */ }
      }
    });
    return [...new Set(allTreatment)];
  }, [parsedExamSources]);

  const fundusRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const fundusDetails = parsedExamSources.map((source) => source?.fundus?.[eyeKey]);
      const findings = firstNonEmpty(...fundusDetails.map((detail) => detail ? [detail.discStatus, detail.cupDiscRatio, detail.macuaStatus, detail.vesselStatus, detail.otherFindings].filter(Boolean).join(", ") : null));
      return { eye, findings };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) => row.findings);
  }, [parsedExamSources]);

  const selectedTests = useMemo(() => {
    const data = (requestTestsStateQuery.data as any)?.data ?? {};
    return Array.isArray(data.selectedTests) ? (data.selectedTests as any[]) : [];
  }, [requestTestsStateQuery.data]);

  const requestedImagingAndLabs = useMemo(() => {
    const allTests = [...selectedTests, ...testsData];
    const uniqueTests = Array.from(new Map(allTests.map((test) => [test?.id ?? `${test?.name}-${Math.random()}`, test])).values());
    return uniqueTests.filter((test) => { const kind = classifyTest(test); return kind === "imaging" || kind === "lab"; });
  }, [selectedTests, testsData]);

  const treatmentRows = useMemo(() => {
    const source = Array.isArray(prescriptionsQuery.data) ? (prescriptionsQuery.data as any[]) : [];
    const rows: Array<{ key: string; date: string; medication: string; dosage: string; frequency: string; duration: string; notes: string }> = [];
    source.forEach((prescription: any) => {
      const date = formatDate(prescription?.prescriptionDate);
      const items = Array.isArray(prescription?.items) ? prescription.items : [];
      if (items.length) {
        items.forEach((item: any, index: number) => {
          rows.push({ key: `${prescription?.id ?? "p"}-${index}`, date, medication: firstNonEmpty(item?.medicationName, prescription?.medicationName, "—"), dosage: firstNonEmpty(item?.dosage, "—"), frequency: firstNonEmpty(item?.frequency, "—"), duration: firstNonEmpty(item?.duration, "—"), notes: firstNonEmpty(item?.notes, "") });
        });
      } else {
        rows.push({ key: `${prescription?.id ?? "p"}-fallback`, date, medication: firstNonEmpty(prescription?.medicationName, "—"), dosage: "—", frequency: "—", duration: "—", notes: firstNonEmpty(prescription?.notes, "") });
      }
    });
    return rows;
  }, [prescriptionsQuery.data]);

  const serviceDirectory = useMemo(() => { const raw = (serviceDirectoryQuery.data as any)?.value; return Array.isArray(raw) ? raw : []; }, [serviceDirectoryQuery.data]);
  const activeServiceOptions = useMemo(() => serviceDirectory.filter((s: any) => s && s.isActive !== false).map((s: any) => ({ code: String(s.code ?? "").trim(), name: String(s.name ?? "").trim(), serviceType: String(s.serviceType ?? "").trim() })).filter((s: any) => s.code && s.name), [serviceDirectory]);
  const serviceByCode = useMemo(() => { const map = new Map<string, { code: string; name: string; serviceType: string }>(); for (const item of activeServiceOptions) map.set(item.code, item); return map; }, [activeServiceOptions]);
  const selectedDoctorName = useMemo(() => { const fromExam = String((examStateQuery.data as any)?.data?.doctorName ?? "").trim(); const fromPatient = String((patient as any)?.treatingDoctor ?? "").trim(); return fromExam || fromPatient; }, [examStateQuery.data, patient]);
  const selectedDoctor = useMemo(() => { const list = Array.isArray(doctorDirectoryQuery.data) ? (doctorDirectoryQuery.data as any[]) : []; if (!selectedDoctorName) return null; return list.find((d) => String(d?.name ?? "").trim() === selectedDoctorName && d?.isActive !== false) ?? null; }, [doctorDirectoryQuery.data, selectedDoctorName]);
  const filteredServiceOptions = useMemo(() => {
    const normalizedServiceType = String(serviceTypeDraft || serviceType || "").trim().toLowerCase();
    const doctorType = String((selectedDoctor as any)?.doctorType ?? "").trim().toLowerCase();
    let targetType = normalizedServiceType;
    if (!targetType && ["consultant", "specialist", "external"].includes(doctorType)) targetType = doctorType;
    if (!targetType) return activeServiceOptions;
    return activeServiceOptions.filter((opt: any) => String(opt.serviceType ?? "").trim().toLowerCase() === targetType);
  }, [activeServiceOptions, serviceTypeDraft, serviceType, selectedDoctor]);
  const multiServiceCodes = useMemo(() => {
    const fromExamRaw = Array.isArray((examStateQuery.data as any)?.data?.serviceCodes) ? ((examStateQuery.data as any).data.serviceCodes as unknown[]) : [];
    const fromPatientRaw = Array.isArray((patient as any)?.serviceCodes) ? ((patient as any).serviceCodes as unknown[]) : [];
    return Array.from(new Set([...fromExamRaw.map((v) => String(v ?? "").trim()), ...fromPatientRaw.map((v) => String(v ?? "").trim()), String((examStateQuery.data as any)?.data?.serviceCode ?? "").trim(), String((patient as any)?.serviceCode ?? "").trim(), serviceCodeDraft].filter(Boolean)));
  }, [examStateQuery.data, patient, serviceCodeDraft]);
  const serviceSelectOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; serviceType: string }>();
    for (const opt of filteredServiceOptions) map.set(opt.code, opt);
    for (const code of multiServiceCodes) { if (!code) continue; if (!map.has(code)) { const known = serviceByCode.get(code); map.set(code, { code, name: known?.name || code, serviceType: known?.serviceType || "" }); } }
    return Array.from(map.values());
  }, [filteredServiceOptions, multiServiceCodes, serviceByCode]);
  const overviewStats = useMemo(() => {
    const serviceEntries = Array.isArray(patientServiceEntriesQuery.data) ? (patientServiceEntriesQuery.data as any[]) : [];
    const earliestServiceDate = serviceEntries.map((entry) => String(entry?.serviceDate ?? "").trim()).filter(Boolean).sort()[0];
    const mssqlBackfill = ((examStateQuery.data as any)?.data?.mssqlBackfill ?? {}) as Record<string, any>;
    return { age: patient?.age ?? "", gender: patient?.gender ?? "", status: patient?.status ?? "", registrationDate: formatDate(firstNonEmpty(mssqlBackfill.ENTRYDATE, mssqlBackfill.DT, mssqlBackfill.secondDt, earliestServiceDate, (patient as any)?.lastVisit, patient?.createdAt)) };
  }, [examStateQuery.data, patient, patientServiceEntriesQuery.data]);

  const toggleExamSection = (key: keyof typeof openExamSections) => { setOpenExamSections((prev) => ({ ...prev, [key]: !prev[key] })); };

  const onRefresh = async () => {
    await Promise.all([
      patientQuery.refetch(), examinationsQuery.refetch(), reportsQuery.refetch(),
      prescriptionsQuery.refetch(), surgeriesQuery.refetch(), followupsQuery.refetch(),
      patientStateQuery.refetch(), examStateQuery.refetch(),
    ]);
  };

  return {
    patientQuery, examinationsQuery, visitsQuery, reportsQuery, prescriptionsQuery, surgeriesQuery,
    followupsQuery, pentacamQuery, testRequestsQuery, medicationsQuery, deleteExamMutation,
    updateVisitDateMutation, deletePatientMutation, deleteVisitMutation,
    patient, examinations, reports, prescriptions, surgeries, followups,
    patientName: patient?.fullName ?? "", patientCode: patient?.patientCode ?? "",
    canViewPentacam, isAdmin,
    activeTab, setActiveTab,
    patientCodeDraft, serviceTypeDraft, serviceCodeDraft, serviceSelectOptions,
    openExamSections, toggleExamSection,
    editingVisitId, setEditingVisitId, editVisitDate, setEditVisitDate,
    overviewData, overviewStats, parsedExamSources,
    autorefractionRows, afterRows, glassesRows, pentacamRows,
    fundusRows, requestedImagingAndLabs, treatmentRows, treatmentData,
    latestReport, latestReportContent,
    onRefresh,
  };
}
