import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ChevronDown, ChevronUp, Download, FileText, PrinterIcon, Stethoscope, UserRound, Trash2, AlertTriangle, Edit, X, Check } from "lucide-react";
import { toast } from "sonner";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { OfflinePageState } from "@/components/OfflinePageState";
import { PullToRefresh } from "@/components/PullToRefresh";

function parseJson(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => formatDisplayValue(item)).filter(Boolean).join(", ");
  }
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

export default function PatientDetails() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, patientsParams] = useRoute("/patients/:id");
  const [, patientFileParams] = useRoute("/patient-file/:id");
  const rawPatientId = patientsParams?.id ?? patientFileParams?.id;
  const patientId = rawPatientId ? Number(rawPatientId) : undefined;

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    {
      enabled: Boolean(patientId),
      staleTime: 0  // Always refetch when invalidated by exam form save
    }
  );

  // Load autorefraction data from separate table
  const autorefractometryQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 }
  );

  // Load glasses records from separate table
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 }
  );

  // Fetch sheet data for existing refraction (backward compatibility)
  const consultantSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'consultant' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );
  const specialistSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'specialist' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );
  const lasikSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'lasik' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );
  const externalSheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: 'external' },
    { enabled: Boolean(patientId), staleTime: 0 }
  );

  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) }
  );

  const prescriptionsQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) }
  );

  const surgeriesQuery = trpc.medical.getSurgeriesByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) }
  );

  const followupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) }
  );
  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: patientId ?? 0, limit: 10 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );
  const patientServiceEntriesQuery = trpc.medical.getPatientServiceEntries.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );
  const requestTestsStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "request-tests" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );
  const testRequestsQuery = trpc.medical.getPatientTestRequests?.useQuery?.(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );
  const symptomsQuery = trpc.medical.getAllSymptoms.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user),
    refetchOnWindowFocus: false,
  });
  const canViewPentacam =
    String(user?.role ?? "").toLowerCase() === "admin" ||
    (permissionsQuery.data ?? []).includes("/sheets/pentacam/:id");

  const deleteExaminationMutation = trpc.medical.deleteExaminationDirect.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الزيارة بنجاح");
      examinationsQuery.refetch();
      visitsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "خطأ في حذف الزيارة");
    },
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "overview";
    try {
      const stored = localStorage.getItem(`tabs:patient-details:${patientId ?? "new"}`) || "";
      if (stored === "overview" || stored === "history" || stored === "exams" || stored === "reports" || stored === "prescriptions" || stored === "surgeries" || stored === "tests" || stored === "pentacam") {
        return stored;
      }
    } catch {
      // ignore
    }
    return "overview";
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

  const updateVisitDateMutation = trpc.medical.updateVisitDate.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث التاريخ بنجاح");
      // Refetch both visits and examinations to sync all data
      Promise.all([
        visitsQuery.refetch(),
        examinationsQuery.refetch()
      ]);
      setEditingVisitId(null);
      setEditVisitDate("");
    },
    onError: (error) => {
      toast.error("خطأ في تحديث التاريخ: " + (error.message || ""));
    },
  });

  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "patient-details" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );
  const examStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "examination" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );
  const serviceDirectoryQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "service_directory" },
    { refetchOnWindowFocus: false }
  );
  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const deletePatientMutation = trpc.medical.deletePatientWithAllData.useMutation();
  const deleteVisitMutation = trpc.medical.deleteVisitWithAllData.useMutation();
  const deleteExamMutation = trpc.medical.deleteExaminationDirect.useMutation();
  const patientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedPatientStateRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Refetch all data when patient changes
  useEffect(() => {
    if (!patientId) return;
    console.log('[PatientDetails] Refetching data for patientId:', patientId);
    reportsQuery.refetch();
    pentacamQuery.refetch();
    examinationsQuery.refetch();
    visitsQuery.refetch();
    testRequestsQuery.refetch();
    prescriptionsQuery.refetch();
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    const raw = localStorage.getItem(`patient_state_details_${patientId}`);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.activeTab !== undefined) setActiveTab(data.activeTab ?? "overview");
    } catch {
      // ignore bad cache
    }
  }, [patientId]);

  useEffect(() => {
    hydratedPatientStateRef.current = null;
  }, [patientId]);

  useEffect(() => {
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === (patientId ?? null)) return;
    if (data.activeTab !== undefined) setActiveTab(data.activeTab ?? "overview");
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
    return () => {
      if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    };
  }, [patientId, activeTab, savePatientStateMutation]);

  if (!isAuthenticated) return null;

  const initialPatientId = patientId;
  const patient = patientQuery.data as any;

  const examinations = examinationsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const prescriptions = prescriptionsQuery.data ?? [];
  const surgeries = surgeriesQuery.data ?? [];
  const followups = followupsQuery.data ?? [];
  const symptoms = (symptomsQuery.data ?? []) as Array<{ id: string; name: string }>;

  const parseMedicalHistoryValue = (rawValue: unknown) => {
    const raw = String(rawValue ?? "").trim();
    if (!raw) return { history: "", symptoms: [] as string[] };
    const marker = "الأعراض:";
    const markerIndex = raw.indexOf(marker);
    if (markerIndex === -1) {
      return { history: raw, symptoms: [] as string[] };
    }
    const history = raw.slice(0, markerIndex).trim();
    const symptomsRaw = raw.slice(markerIndex + marker.length).trim();
    const parsedSymptoms = symptomsRaw
      .split(/[,\n،]/)
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return { history, symptoms: Array.from(new Set(parsedSymptoms)) };
  };
  const buildMedicalHistoryValue = (history: string, symptomNames: string[]) => {
    const normalizedHistory = String(history ?? "").trim();
    const normalizedSymptoms = Array.from(
      new Set(
        (symptomNames ?? [])
          .map((name) => String(name ?? "").trim())
          .filter(Boolean)
      )
    );
    if (!normalizedSymptoms.length) return normalizedHistory;
    return `${normalizedHistory ? `${normalizedHistory}\n\n` : ""}الأعراض: ${normalizedSymptoms.join("، ")}`;
  };

  const latestReport = reports[0];
  const latestReportContent =
    parseJson((latestReport as any)?.content ?? latestReport?.diagnosis) ??
    (latestReport as any)?.content ??
    latestReport?.diagnosis ??
    latestReport?.treatment ??
    null;

  // Single data source: ONLY use examination endpoint
  const parsedExamSources = useMemo(() => {
    // Create lookup maps for autorefraction and glasses records
    const autorefMap = new Map<number, any>();
    const glassesMap = new Map<number, any>();

    if (Array.isArray(autorefractometryQuery.data)) {
      for (const record of autorefractometryQuery.data) {
        autorefMap.set(record.examinationId, record);
      }
    }

    if (Array.isArray(glassesRecordsQuery.data)) {
      for (const record of glassesRecordsQuery.data) {
        glassesMap.set(record.examinationId, record);
      }
    }

	    // Extract examination data
	    const examData = examinations.map((exam: any) => {
	      const notesData = parseJson(exam?.radiologyLabsNotes) ?? {};
      // Get autorefraction from dedicated table, fallback to examination row columns
      const autorefRecord = autorefMap.get(exam.id);
      let autorefraction = autorefRecord ? {
        od: { s: autorefRecord.sphereOD, c: autorefRecord.cylinderOD, axis: autorefRecord.axisOD, ucva: autorefRecord.ucvaOD, bcva: autorefRecord.bcvaOD, iop: autorefRecord.iopOD },
        os: { s: autorefRecord.sphereOS, c: autorefRecord.cylinderOS, axis: autorefRecord.axisOS, ucva: autorefRecord.ucvaOS, bcva: autorefRecord.bcvaOS, iop: autorefRecord.iopOS },
      } : (exam.sphereOD || exam.sphereOS || exam.cylinderOD || exam.cylinderOS || exam.ucvaOD || exam.ucvaOS) ? {
        od: { s: exam.sphereOD, c: exam.cylinderOD, axis: exam.axisOD, ucva: exam.ucvaOD, bcva: exam.bcvaOD, iop: exam.iopOD },
        os: { s: exam.sphereOS, c: exam.cylinderOS, axis: exam.axisOS, ucva: exam.ucvaOS, bcva: exam.bcvaOS, iop: exam.iopOS },
      } : undefined;

      // Get glasses from dedicated table, fallback to glassesData JSON on examination row
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

      // Fallback: check sheets for existing refraction data (backward compatibility)
      if (!glassesData) {
        const sheetSources = [consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data];
        for (const sheet of sheetSources) {
          if (sheet?.examData) {
            const sheetExamData = parseJson(sheet.examData);
            if (sheetExamData?.glasses) {
              glassesData = sheetExamData.glasses;
              break;
            }
          }
        }
      }

      // Use visit date from refraction records if available, otherwise from examination
      const visitDate = autorefRecord?.visitDate || glassesRecord?.visitDate || exam?.createdAt;

	      return {
        // Auto-refraction data from separate table
        autorefraction,
        // Glasses data from separate table or sheets (backward compatibility)
        glasses: glassesData,
        // Visit date from refraction records or examination
        visitDate,
        // Fundus data from posteriorSegment JSON fields
        fundus: {
          od: exam?.posteriorSegmentOD ? parseJson(exam.posteriorSegmentOD) : undefined,
          os: exam?.posteriorSegmentOS ? parseJson(exam.posteriorSegmentOS) : undefined,
        },
	        // Tests and treatment from radiologyLabsNotes JSON field
	        radiologyLabsNotes: exam?.radiologyLabsNotes,
	        // "After" values from Measurements tab (القياسات)
	        after:
	          (notesData as any)?.measurements?.after ||
	          (notesData as any)?.after ||
	          undefined,
	      };
	    });
    // Don't filter out data - show if ANY field has data
    return examData;
  }, [examinations, autorefractometryQuery.data, glassesRecordsQuery.data, consultantSheetQuery.data, specialistSheetQuery.data, lasikSheetQuery.data, externalSheetQuery.data]);
  const autorefractionRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const eyeSources = parsedExamSources.map((source) => source?.autorefraction?.[eyeKey] ?? null);
      return {
        eye,
        ucva: firstNonEmpty(...eyeSources.map((item) => item?.ucva)),
        bcva: firstNonEmpty(...eyeSources.map((item) => item?.bcva)),
        s: firstNonEmpty(...eyeSources.map((item) => item?.s)),
        c: firstNonEmpty(...eyeSources.map((item) => item?.c)),
        axis: firstNonEmpty(...eyeSources.map((item) => item?.axis)),
        iop: firstNonEmpty(...eyeSources.map((item) => item?.iop)),
      };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) =>
      [row.ucva, row.bcva, row.s, row.c, row.axis, row.iop].some(Boolean)
    );
  }, [parsedExamSources]);
  const afterRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const afterSources = parsedExamSources.map((source) => (source as any)?.after?.[eyeKey] ?? null);
      const autorefSources = parsedExamSources.map((source) => source?.autorefraction?.[eyeKey] ?? null);
      return {
        eye,
        s: firstNonEmpty(...afterSources.map((item) => item?.s), ...autorefSources.map((item) => item?.s)),
        c: firstNonEmpty(...afterSources.map((item) => item?.c), ...autorefSources.map((item) => item?.c)),
        axis: firstNonEmpty(...afterSources.map((item) => item?.axis), ...autorefSources.map((item) => item?.axis)),
      };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) =>
      [row.s, row.c, row.axis].some(Boolean)
    );
  }, [parsedExamSources]);
  const pentacamMeasurements = useMemo(() => {
    return Array.isArray(pentacamQuery.data) ? (pentacamQuery.data as any[]) : [];
  }, [pentacamQuery.data]);

  const glassesRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const glassesSources = parsedExamSources.map((source) => source?.glasses?.[eyeKey] ?? null);
      return {
        eye,
        s: firstNonEmpty(...glassesSources.map((item) => item?.s)),
        c: firstNonEmpty(...glassesSources.map((item) => item?.c)),
        axis: firstNonEmpty(...glassesSources.map((item) => item?.axis)),
        pd: firstNonEmpty(...glassesSources.map((item) => item?.pd)),
        bcva: firstNonEmpty(...glassesSources.map((item) => item?.bcva)),
      };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) => {
      // Show row if ANY field has data (including empty strings from parsed data means we have glasses data)
      const hasData = [row.s, row.c, row.axis, row.pd, row.bcva].some(val => val !== undefined && val !== null && val !== "");
      return hasData;
    });
  }, [parsedExamSources]);

  const pentacamRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eyeSuffix: "OD" | "OS", eyeDisplay: "OD" | "OS") => {
      // Combine pentacamMeasurements and examination pentacam data
      const dbSources = pentacamMeasurements.map((source) => ({
        k1: source?.[`k1${eyeSuffix}`],
        k2: source?.[`k2${eyeSuffix}`],
        thinnest: source?.[`thinnestPoint${eyeSuffix}`],
        apex: source?.[`apex${eyeSuffix}`],
        residual: source?.[`residual${eyeSuffix}`],
        ttt: source?.[`ttt${eyeSuffix}`],
        ablation: source?.[`ablation${eyeSuffix}`],
      }));

      // Also get pentacam data from examinations (saved from RefractionPage)
      const examPentacamSources = parsedExamSources
        .map((source) => source?.pentacam?.[eyeKey])
        .filter(Boolean);

      return {
        eye: eyeDisplay,
        k1: firstNonEmpty(...dbSources.map((item) => item?.k1), ...examPentacamSources.map((item) => item?.k1)),
        k2: firstNonEmpty(...dbSources.map((item) => item?.k2), ...examPentacamSources.map((item) => item?.k2)),
        thinnest: firstNonEmpty(...dbSources.map((item) => item?.thinnest), ...examPentacamSources.map((item) => item?.thinnest)),
        apex: firstNonEmpty(...dbSources.map((item) => item?.apex), ...examPentacamSources.map((item) => item?.apex)),
        residual: firstNonEmpty(...dbSources.map((item) => item?.residual), ...examPentacamSources.map((item) => item?.residualStroma)),
        ttt: firstNonEmpty(...dbSources.map((item) => item?.ttt)),
        ablation: firstNonEmpty(...dbSources.map((item) => item?.ablation)),
      };
    };
    return [buildEye("od", "OD", "OD"), buildEye("os", "OS", "OS")].filter((row) =>
      [row.k1, row.k2, row.thinnest, row.apex, row.residual, row.ttt, row.ablation].some(Boolean)
    );
  }, [pentacamMeasurements, parsedExamSources]);

  const testsData = useMemo(() => {
    // Extract tests from radiologyLabsNotes
    const allTests: any[] = [];
    parsedExamSources.forEach((source) => {
      if (source?.radiologyLabsNotes) {
        try {
          const parsed = JSON.parse(source.radiologyLabsNotes);
          if (parsed.tests && Array.isArray(parsed.tests) && parsed.tests.length > 0) {
            allTests.push(...parsed.tests);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    return [...new Set(allTests)]; // Remove duplicates
  }, [parsedExamSources]);

  const treatmentData = useMemo(() => {
    // Extract treatment from radiologyLabsNotes
    const allTreatment: any[] = [];
    parsedExamSources.forEach((source) => {
      if (source?.radiologyLabsNotes) {
        try {
          const parsed = JSON.parse(source.radiologyLabsNotes);
          if (parsed.treatment && Array.isArray(parsed.treatment) && parsed.treatment.length > 0) {
            allTreatment.push(...parsed.treatment);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    return [...new Set(allTreatment)]; // Remove duplicates
  }, [parsedExamSources]);
  const fundusRows = useMemo(() => {
    const buildEye = (eyeKey: "od" | "os", eye: "OD" | "OS") => {
      const fundusDetails = parsedExamSources.map((source) => source?.fundus?.[eyeKey]);
      const findings = firstNonEmpty(
        ...fundusDetails.map((detail) =>
          detail ? [detail.discStatus, detail.cupDiscRatio, detail.macuaStatus, detail.vesselStatus, detail.otherFindings].filter(Boolean).join(", ") : null
        )
      );
      return { eye, findings };
    };
    return [buildEye("od", "OD"), buildEye("os", "OS")].filter((row) => row.findings);
  }, [parsedExamSources]);
  const selectedTests = useMemo(() => {
    const data = (requestTestsStateQuery.data as any)?.data ?? {};
    return Array.isArray(data.selectedTests) ? (data.selectedTests as any[]) : [];
  }, [requestTestsStateQuery.data]);
  const classifyTest = (test: any): "lab" | "imaging" | "other" => {
    const type = String(test?.type ?? "").trim().toLowerCase();
    if (type === "lab") return "lab";
    if (type === "imaging") return "imaging";
    const category = String(test?.category ?? test?.serviceCategory ?? "").trim().toLowerCase();
    const name = String(test?.name ?? test?.serviceName ?? "").trim().toLowerCase();

    // If category explicitly says "Uncategorized", treat as imaging or lab based on name
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
    ) {
      return "imaging";
    }

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
    ) {
      return "lab";
    }

    // Default: if uncategorized, assume it's something meaningful (lab or imaging)
    if (isUncategorized) {
      return "lab"; // Default uncategorized to lab
    }

    return "other";
  };
  const requestedImagingAndLabs = useMemo(
    () => {
      // Combine tests from both request-tests page state and from radiologyLabsNotes
      const allTests = [...selectedTests, ...testsData];
      // Remove duplicates based on ID or name
      const uniqueTests = Array.from(
        new Map(
          allTests.map((test) => [
            test?.id ?? `${test?.name}-${Math.random()}`,
            test,
          ])
        ).values()
      );
      return uniqueTests.filter((test) => {
        const kind = classifyTest(test);
        return kind === "imaging" || kind === "lab";
      });
    },
    [selectedTests, testsData]
  );
  const toggleExamSection = (key: keyof typeof openExamSections) => {
    setOpenExamSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const treatmentRows = useMemo(() => {
    const source = Array.isArray(prescriptionsQuery.data) ? (prescriptionsQuery.data as any[]) : [];
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
      const items = Array.isArray(prescription?.items) ? prescription.items : [];
      if (items.length) {
        items.forEach((item: any, index: number) => {
          rows.push({
            key: `${prescription?.id ?? "p"}-${index}`,
            date,
            medication: firstNonEmpty(item?.medicationName, prescription?.medicationName, "—"),
            dosage: firstNonEmpty(item?.dosage, "—"),
            frequency: firstNonEmpty(item?.frequency, "—"),
            duration: firstNonEmpty(item?.duration, "—"),
            notes: firstNonEmpty(item?.notes, ""),
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
  }, [prescriptionsQuery.data]);

  const handleSelectPatient = (p: {
    id: number;
    fullName: string;
    patientCode?: string | null;
  }) => {
    if (p.id) {
      setLocation(`/patient-file/${p.id}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const patientName = patient?.fullName ?? "";
  const patientCode = patient?.patientCode ?? "";
  const serviceType = String(patient?.serviceType ?? "").trim();
  const serviceCode = String((examStateQuery.data as any)?.data?.serviceCode ?? "").trim();
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
    [serviceDirectory]
  );
  const serviceByCode = useMemo(() => {
    const map = new Map<string, { code: string; name: string; serviceType: string }>();
    for (const item of activeServiceOptions) map.set(item.code, item);
    return map;
  }, [activeServiceOptions]);
  const selectedDoctorName = useMemo(() => {
    const fromExam = String((examStateQuery.data as any)?.data?.doctorName ?? "").trim();
    const fromPatient = String((patient as any)?.treatingDoctor ?? "").trim();
    return fromExam || fromPatient;
  }, [examStateQuery.data, patient]);
  const selectedDoctor = useMemo(() => {
    const list = Array.isArray(doctorDirectoryQuery.data) ? (doctorDirectoryQuery.data as any[]) : [];
    if (!selectedDoctorName) return null;
    return (
      list.find((d) => String(d?.name ?? "").trim() === selectedDoctorName && d?.isActive !== false) ??
      null
    );
  }, [doctorDirectoryQuery.data, selectedDoctorName]);

  if (patientQuery.isError && !patient) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <main className="container mx-auto px-4 py-8">
          <OfflinePageState
            title="تعذر تحميل ملف المريض"
            body="الملف المطلوب غير متاح الآن من الخادم. أعد المحاولة عندما يعود الاتصال."
            onRetry={() => {
              void patientQuery.refetch();
              void examinationsQuery.refetch();
              void reportsQuery.refetch();
              void prescriptionsQuery.refetch();
              void surgeriesQuery.refetch();
              void followupsQuery.refetch();
            }}
          />
        </main>
      </div>
    );
  }
  const filteredServiceOptions = useMemo(() => {
    const normalizedServiceType = String(serviceTypeDraft || serviceType || "").trim().toLowerCase();
    const doctorType = String((selectedDoctor as any)?.doctorType ?? "").trim().toLowerCase();

    let targetType = normalizedServiceType;
    if (!targetType && (doctorType === "consultant" || doctorType === "specialist" || doctorType === "external")) {
      targetType = doctorType;
    }

    if (!targetType) return activeServiceOptions;
    return activeServiceOptions.filter(
      (opt: any) => String(opt.serviceType ?? "").trim().toLowerCase() === targetType
    );
  }, [activeServiceOptions, serviceTypeDraft, serviceType, selectedDoctor]);
  const selectedServiceOption = useMemo(
    () => (serviceCodeDraft ? serviceByCode.get(serviceCodeDraft) : undefined),
    [serviceByCode, serviceCodeDraft]
  );
  const multiServiceCodes = useMemo(() => {
    const fromExamRaw = Array.isArray((examStateQuery.data as any)?.data?.serviceCodes)
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
        ].filter(Boolean)
      )
    );
  }, [examStateQuery.data, patient, serviceCodeDraft]);
  const serviceSelectOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; serviceType: string }>();
    for (const opt of filteredServiceOptions) map.set(opt.code, opt);
    for (const code of multiServiceCodes) {
      if (!code) continue;
      if (!map.has(code)) {
        const known = serviceByCode.get(code);
        map.set(code, { code, name: known?.name || code, serviceType: known?.serviceType || "" });
      }
    }
    return Array.from(map.values());
  }, [filteredServiceOptions, multiServiceCodes, serviceByCode]);

  useEffect(() => {
    setPatientCodeDraft(patient?.patientCode ?? "");
  }, [patient?.patientCode]);

  useEffect(() => {
    setServiceTypeDraft(serviceType);
  }, [serviceType]);

  useEffect(() => {
    setServiceCodeDraft(serviceCode);
  }, [serviceCode]);


  const overviewStats = useMemo(
    () => {
      const serviceEntries = Array.isArray(patientServiceEntriesQuery.data)
        ? (patientServiceEntriesQuery.data as any[])
        : [];
      const earliestServiceDate = serviceEntries
        .map((entry) => String(entry?.serviceDate ?? "").trim())
        .filter(Boolean)
        .sort()[0];
      const mssqlBackfill = ((examStateQuery.data as any)?.data?.mssqlBackfill ?? {}) as Record<string, any>;

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
            patient?.createdAt
          )
        ),
      };
    },
    [examStateQuery.data, patient, patientServiceEntriesQuery.data]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-0 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goBack()}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex-shrink-0"
              title="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)] text-white shadow-lg shadow-sky-200 flex-shrink-0">
                <UserRound className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 hidden sm:block">Patient File</div>
                <h1 className="text-lg md:text-2xl font-black tracking-tight text-slate-900 truncate">{patientName || "ملف المريض"}</h1>
                <p className="text-xs md:text-sm text-slate-500 truncate hidden sm:block">{patientCode || "بدون كود"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 md:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => patientId && setLocation(`/patient-summary/${patientId}`)}
                type="button"
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hidden md:inline-flex"
              >
                <FileText className="h-4 w-4 mr-2" />
                التقرير المجمع
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrint}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 md:hidden"
                title="طباعة"
              >
                <PrinterIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hidden md:inline-flex"
                type="button"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                طباعة
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownloadPDF}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 md:hidden"
                title="تحميل PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                type="button"
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hidden md:inline-flex"
              >
                <Download className="h-4 w-4 mr-2" />
                تحميل PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([
            patientQuery.refetch(),
            examinationsQuery.refetch(),
            reportsQuery.refetch(),
            prescriptionsQuery.refetch(),
            surgeriesQuery.refetch(),
            followupsQuery.refetch(),
            patientStateQuery.refetch(),
            examStateQuery.refetch(),
          ]);
        }}
        className="min-h-screen"
      >
      <main className="container mx-auto px-4 py-8 print:p-0">

        <div className="mb-4 flex items-center gap-3 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goBack()}
            className="rounded-xl border-slate-200 bg-white hover:bg-slate-100"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          {patientId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/patient-summary/${patientId}`)}
              className="rounded-xl border-slate-200 bg-white hover:bg-slate-100"
            >
              <FileText className="h-4 w-4 ml-2" />
              التقرير المجمع
            </Button>
          ) : null}
          <PatientPicker initialPatientId={initialPatientId} onSelect={handleSelectPatient} />
          {patientId ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (confirm("هل أنت متأكد من حذف المريض وكل بياناته؟\n\nهذا الإجراء لا يمكن التراجع عنه!")) {
                  try {
                    await deletePatientMutation.mutateAsync({ patientId });
                    toast.success("تم حذف المريض بنجاح");
                    setLocation("/patients");
                  } catch (error) {
                    toast.error("حدث خطأ في الحذف");
                  }
                }
              }}
              disabled={deletePatientMutation.isPending}
              className="rounded-xl"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف المريض
            </Button>
          ) : null}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">العمر</p>
              <p className="text-2xl font-black text-slate-900">{overviewStats.age} سنة</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">الجنس</p>
              <p className="text-2xl font-black text-slate-900">{overviewStats.gender || "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">الحالة</p>
              <Badge className="bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)]">{overviewStats.status || "—"}</Badge>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">تاريخ التسجيل</p>
              <p className="text-sm font-semibold text-slate-900">{overviewStats.registrationDate}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} persistKey={`patient-details:${patientId ?? "new"}`} className="w-full">
          <TabsList className="mb-8 flex h-auto w-full min-w-max rounded-3xl border border-slate-200/80 bg-white/85 p-2 shadow-sm print:hidden" dir="rtl" style={{ direction: "rtl" }}>
            <TabsTrigger className="rounded-2xl" value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger className="rounded-2xl" value="examinations">الفحوصات</TabsTrigger>
            {canViewPentacam ? (
              <TabsTrigger className="rounded-2xl" value="pentacam">بنتاكام</TabsTrigger>
            ) : null}
            <TabsTrigger className="rounded-2xl" value="diagnosis">التشخيص</TabsTrigger>
            <TabsTrigger className="rounded-2xl" value="treatment">العلاج</TabsTrigger>
            <TabsTrigger className="rounded-2xl" value="tests">الاشعه و التحاليل</TabsTrigger>
            <TabsTrigger className="rounded-2xl" value="followup">المتابعة</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="w-full">
              <Card className="border-slate-200/80 bg-white/92 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>التاريخ المرضي و الاعراض</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* All Doctor Reports */}
                  {reports.length > 0 ? (
                    <div className="space-y-3">
                      {reports.map((report: any, idx: number) => (
                        <div key={idx} className="rounded border border-slate-200 p-4 bg-slate-50/50">
                          <div className="mb-2 flex justify-between items-start">
                            <span className="text-xs font-semibold text-slate-500">
                              {report.createdAt ? new Date(report.createdAt).toLocaleDateString("ar-EG") : "—"}
                            </span>
                            {report.diagnosis && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">تشخيص</span>}
                          </div>
                          <div className="text-right text-sm whitespace-pre-wrap" dir="rtl">
                            <p className="font-medium text-slate-900 mb-1">{report.diagnosis || "—"}</p>
                            {report.clinicalOpinion && <p className="text-slate-700 text-xs">{report.clinicalOpinion}</p>}
                            {report.recommendations && <p className="text-slate-700 text-xs mt-1">{report.recommendations}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">لا توجد تقارير طبية محفوظة</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500">الأعراض</p>
                    {symptoms.length === 0 ? (
                      <p className="text-xs text-muted-foreground">لا توجد أعراض مضافة</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {symptoms.map((symptom) => (
                          <Badge
                            key={symptom.id}
                            variant="default"
                            className="rounded-full"
                          >
                            {symptom.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visits List */}
            <div className="w-full">
              <Card className="border-slate-200/80 bg-white/92 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>الزيارات</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {visitsQuery.isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : visitsQuery.isError ? (
                    <div className="text-sm text-red-600">خطأ في تحميل الزيارات</div>
                  ) : (visitsQuery.data ?? []).length === 0 ? (
                    <div className="text-sm text-slate-500">لا توجد زيارات</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(visitsQuery.data ?? []).map((visit: any) => {
                        const examForVisit = (examinationsQuery.data ?? []).find((e: any) => e.visitId === visit.id);
                        const isEditing = editingVisitId === visit.id;
                        return (
                          <div key={visit.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-slate-600">#{visit.id}</span>
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="date"
                                      value={editVisitDate}
                                      onChange={(e) => setEditVisitDate(e.target.value)}
                                      className="w-32 h-7 text-xs"
                                      dir="ltr"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        updateVisitDateMutation.mutate({
                                          visitId: visit.id,
                                          visitDate: editVisitDate
                                        });
                                      }}
                                      disabled={updateVisitDateMutation.isPending}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingVisitId(null)}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500">
                                    {new Date(visit.visitDate).toLocaleDateString("ar-EG")}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-medium text-slate-800">
                                {visit.visitType || "زيارة"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const dateObj = new Date(visit.visitDate);
                                    const dateStr = dateObj.toISOString().split("T")[0];
                                    setEditVisitDate(dateStr);
                                    setEditingVisitId(visit.id);
                                  }}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {examForVisit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("هل أنت متأكد من حذف هذه الزيارة؟")) {
                                      deleteExaminationMutation.mutate({ examinationId: examForVisit.id });
                                    }
                                  }}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="examinations" className="space-y-6">
            <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="ltr">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base">الفحوصات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="rounded-xl border border-slate-200 bg-white">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => toggleExamSection("autoref")}
                  >
                    <span>Autoref + IOP</span>
                    {openExamSections.autoref ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {openExamSections.autoref ? (
                    <div className="space-y-3 border-t border-slate-200 p-3">
                      {autorefractionRows.length ? (
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse text-center">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                            <tr>
                              <th className="border px-3 py-3">Eye</th>
                              <th className="border px-3 py-3">UCVA</th>
                              <th className="border px-3 py-3">S</th>
                              <th className="border px-3 py-3">C</th>
                              <th className="border px-3 py-3">Axis</th>
                              <th className="border px-3 py-3">IOP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {autorefractionRows.map((row) => (
                              <tr key={row.eye} className="bg-white text-sm font-medium text-slate-800">
                                <td className="border px-3 py-3 font-bold">{row.eye}</td>
                                <td className="border px-3 py-3">{row.ucva || "-"}</td>
                                <td className="border px-3 py-3">{row.s || "-"}</td>
                                <td className="border px-3 py-3">{row.c || "-"}</td>
                                <td className="border px-3 py-3">{row.axis || "-"}</td>
                                <td className="border px-3 py-3">{row.iop || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">لا توجد بيانات Autoref محفوظة</p>
                      )}

                      {afterRows.length ? (
                        <div className="overflow-x-auto">
                          <div className="mb-2 text-xs font-semibold text-slate-600">After</div>
                          <table className="w-full min-w-[440px] border-collapse text-center">
                            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                              <tr>
                                <th className="border px-3 py-3">Eye</th>
                                <th className="border px-3 py-3">S</th>
                                <th className="border px-3 py-3">C</th>
                                <th className="border px-3 py-3">Axis</th>
                              </tr>
                            </thead>
                            <tbody>
                              {afterRows.map((row) => (
                                <tr key={`after-${row.eye}`} className="bg-white text-sm font-medium text-slate-800">
                                  <td className="border px-3 py-3 font-bold">{row.eye}</td>
                                  <td className="border px-3 py-3">{row.s || "-"}</td>
                                  <td className="border px-3 py-3">{row.c || "-"}</td>
                                  <td className="border px-3 py-3">{row.axis || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => toggleExamSection("glasses")}
                  >
                    <span>👓 مقاس النظاره</span>
                    {openExamSections.glasses ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {openExamSections.glasses ? (
                    <div className="overflow-x-auto border-t border-slate-200">
                      {glassesRows.length ? (
                        <table className="w-full min-w-[520px] border-collapse text-center">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                            <tr>
                              <th className="border px-3 py-3">Eye</th>
                              <th className="border px-3 py-3">S</th>
                              <th className="border px-3 py-3">C</th>
                              <th className="border px-3 py-3">Axis</th>
                              <th className="border px-3 py-3">PD</th>
                              <th className="border px-3 py-3">BCVA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {glassesRows.map((row) => (
                              <tr key={`glass-${row.eye}`} className="bg-white text-sm font-medium text-slate-800">
                                <td className="border px-3 py-3 font-bold">{row.eye}</td>
                                <td className="border px-3 py-3">{row.s || "-"}</td>
                                <td className="border px-3 py-3">{row.c || "-"}</td>
                                <td className="border px-3 py-3">{row.axis || "-"}</td>
                                <td className="border px-3 py-3">{row.pd || "-"}</td>
                                <td className="border px-3 py-3">{row.bcva || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات مقاس النظاره محفوظة</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => toggleExamSection("fundus")}
                  >
                    <span>Fundus</span>
                    {openExamSections.fundus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {openExamSections.fundus ? (
                    <div className="overflow-x-auto border-t border-slate-200">
                      {fundusRows.length ? (
                        <table className="w-full min-w-[360px] border-collapse text-center">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                            <tr>
                              <th className="border px-3 py-3">Eye</th>
                              <th className="border px-3 py-3">Findings</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fundusRows.map((row) => (
                              <tr key={`fundus-${row.eye}`} className="bg-white text-sm font-medium text-slate-800">
                                <td className="border px-3 py-3 font-bold">{row.eye}</td>
                                <td className="border px-3 py-3 text-left">{row.findings || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات Fundus محفوظة</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => toggleExamSection("requestTests")}
                  >
                    <span>الأشعات + التحاليل (من طلب الفحوصات)</span>
                    {openExamSections.requestTests ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {openExamSections.requestTests ? (
                    <div className="overflow-x-auto border-t border-slate-200 space-y-4 p-4">
                      {/* Show radiologyLabsNotes directly if available */}
                      {parsedExamSources.some((s) => s?.radiologyLabsNotes) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">📋 ملخص الأشعات والتحاليل من الزيارات:</h4>
                          {parsedExamSources.map((source, idx) => {
                            if (!source?.radiologyLabsNotes) return null;
                            try {
                              const data = JSON.parse(source.radiologyLabsNotes);
                              return (
                                <div key={idx} className="text-sm text-blue-800 mb-2">
                                  {data.tests && Array.isArray(data.tests) && data.tests.length > 0 && (
                                    <p>🔬 <strong>الاختبارات:</strong> {data.tests.join(", ")}</p>
                                  )}
                                  {data.diagnosis && Array.isArray(data.diagnosis) && data.diagnosis.length > 0 && (
                                    <p>⚕️ <strong>التشخيص:</strong> {data.diagnosis.join(", ")}</p>
                                  )}
                                  {data.treatment && Array.isArray(data.treatment) && data.treatment.length > 0 && (
                                    <p>💊 <strong>العلاج:</strong> {data.treatment.join(", ")}</p>
                                  )}
                                </div>
                              );
                            } catch (e) {
                              return null;
                            }
                          })}
                        </div>
                      )}

                      {requestedImagingAndLabs.length ? (
                        <table className="w-full min-w-[640px] border-collapse text-center">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                            <tr>
                              <th className="border px-3 py-3">Type</th>
                              <th className="border px-3 py-3">Test Name</th>
                              <th className="border px-3 py-3">Category</th>
                              <th className="border px-3 py-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {requestedImagingAndLabs.map((test: any, index: number) => (
                              <tr key={`req-${String(test?.id ?? "")}-${index}`} className="bg-white text-sm font-medium text-slate-800">
                                <td className="border px-3 py-3">
                                  {classifyTest(test) === "imaging" ? "Imaging" : "Lab"}
                                </td>
                                <td className="border px-3 py-3">{String(test?.name ?? "—")}</td>
                                <td className="border px-3 py-3">{String(test?.category ?? "—")}</td>
                                <td className="border px-3 py-3 text-left">{String(test?.notes ?? "").trim() || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-4 text-sm text-muted-foreground">لا توجد أشعات أو تحاليل محفوظة في طلب الفحوصات</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canViewPentacam ? (
            <TabsContent value="pentacam" className="space-y-6">
              <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="ltr">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>جدول البنتاكام</CardTitle>
                </CardHeader>
                <CardContent>
                  {pentacamRows.length ? (
                    <div className="overflow-x-auto rounded-[1.25rem] border border-slate-200 bg-white">
                      <table className="w-full min-w-[720px] border-collapse text-center">
                        <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                          <tr>
                            <th className="border px-3 py-3">Eye</th>
                            <th className="border px-3 py-3">K1</th>
                            <th className="border px-3 py-3">K2</th>
                            <th className="border px-3 py-3">Thinnest</th>
                            <th className="border px-3 py-3">Apex</th>
                            <th className="border px-3 py-3">Residual</th>
                            <th className="border px-3 py-3">TTT</th>
                            <th className="border px-3 py-3">Ablation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pentacamRows.map((row) => (
                            <tr key={`pent-${row.eye}`} className="bg-white text-sm font-medium text-slate-800">
                              <td className="border px-3 py-3 font-bold">{row.eye}</td>
                              <td className="border px-3 py-3">{row.k1 || "-"}</td>
                              <td className="border px-3 py-3">{row.k2 || "-"}</td>
                              <td className="border px-3 py-3">{row.thinnest || "-"}</td>
                              <td className="border px-3 py-3">{row.apex || "-"}</td>
                              <td className="border px-3 py-3">{row.residual || "-"}</td>
                              <td className="border px-3 py-3">{row.ttt || "-"}</td>
                              <td className="border px-3 py-3">{row.ablation || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="pt-2 text-sm text-muted-foreground">لا توجد بيانات Pentacam محفوظة</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="rtl">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>صور البنتاكام</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">لا توجد صور بنتاكام محفوظة للمريض حالياً</p>
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}

          <TabsContent value="diagnosis">
            <Card className="border-slate-200/80 bg-white/92 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>التشخيص الطبي</CardTitle>
                <CardDescription>{latestReport ? formatDate(latestReport.createdAt) : ""}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestReportContent ? (
                  typeof latestReportContent === "string" ? (
                    <p className="text-sm whitespace-pre-wrap">{latestReportContent}</p>
                  ) : (
                    <pre className="bg-muted/40 p-3 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(latestReportContent, null, 2)}
                    </pre>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد تقارير طبية</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatment">
            <div className="space-y-6">
              {/* Prescriptions */}
              <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="ltr">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>الروشتات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {treatmentRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">لا توجد روشتات محفوظة</p>
                  )}
                  {treatmentRows.length ? (
                    <div className="overflow-x-auto rounded-[1.25rem] border border-slate-200 bg-white">
                      <table className="w-full min-w-[920px] border-collapse text-center">
                        <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                          <tr>
                            <th className="border px-3 py-3">Date</th>
                            <th className="border px-3 py-3">Medication</th>
                            <th className="border px-3 py-3">Dosage</th>
                            <th className="border px-3 py-3">Frequency</th>
                            <th className="border px-3 py-3">Duration</th>
                            <th className="border px-3 py-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {treatmentRows.map((row) => (
                            <tr key={row.key} className="bg-white text-sm font-medium text-slate-800">
                              <td className="border px-3 py-3">{row.date || "-"}</td>
                              <td className="border px-3 py-3">{row.medication || "-"}</td>
                              <td className="border px-3 py-3">{row.dosage || "-"}</td>
                              <td className="border px-3 py-3">{row.frequency || "-"}</td>
                              <td className="border px-3 py-3">{row.duration || "-"}</td>
                              <td className="border px-3 py-3 text-left">{row.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Selected Treatments from Medical File */}
              {treatmentData.length > 0 && (
                <Card className="border-slate-200/80 bg-white/92 shadow-sm" dir="rtl">
                  <CardHeader className="border-b border-slate-100">
                    <CardTitle>العلاجات المختارة من الملف الطبي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {treatmentData.map((treatmentId) => {
                        const medication = (medicationsQuery.data ?? []).find((m: any) => m.id === treatmentId);
                        return (
                          <Badge key={treatmentId} variant="default" className="rounded-full">
                            {medication?.name ?? `العلاج #${treatmentId}`}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tests" className="space-y-6">
            <Card className="border-slate-200/80 bg-white/92 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>الاشعه و التحاليل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!testRequestsQuery?.data || testRequestsQuery.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد طلبات فحوصات محفوظة</p>
                ) : (
                  <div className="space-y-4">
                    {(testRequestsQuery.data || []).map((request: any, idx: number) => (
                      <div key={idx} className="rounded border border-slate-200 p-4 bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-semibold text-slate-600">
                            {request.requestDate ? new Date(request.requestDate).toLocaleDateString("ar-EG") : "—"}
                          </p>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {request.items?.length || 0} فحص
                          </span>
                        </div>
                        {request.items && request.items.length > 0 ? (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">الفحوصات المطلوبة:</p>
                            <div className="flex flex-wrap gap-2">
                              {request.items.map((item: any) => (
                                <span key={item.id} className="text-xs bg-white px-2 py-1 border border-blue-200 rounded text-blue-900">
                                  {item.testName}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {request.notes && (
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-1">ملاحظات:</p>
                            <p className="text-sm text-slate-700">{request.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="followup">
            <div className="space-y-6">
              {/* All Visits/Examinations */}
              <Card className="border-slate-200/80 bg-white/92 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>جميع الزيارات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {examinations.length === 0 && (
                    <p className="text-sm text-muted-foreground">لا توجد زيارات محفوظة</p>
                  )}
                  {examinations
                    .sort((a: any, b: any) => {
                      const dateA = new Date(a.createdAt || 0).getTime();
                      const dateB = new Date(b.createdAt || 0).getTime();
                      return dateB - dateA; // Sort newest first
                    })
                    .map((exam: any) => {
                      const isEditing = editingVisitId === exam.visitId;
                      // Find the associated visit to get the visitDate
                      const visit = (visitsQuery.data ?? []).find((v: any) => v.id === exam.visitId);
                      const displayDate = visit?.visitDate || exam.createdAt;

                      return (
                      <div key={exam.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold">زيارة رقم {exam.id}</span>
                            <p className="text-xs text-slate-500 mt-1">
                              النوع: {exam.visitType === "followup" ? "متابعة" : "فحص"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <Input
                                  type="date"
                                  value={editVisitDate}
                                  onChange={(e) => setEditVisitDate(e.target.value)}
                                  className="w-32 h-7 text-xs"
                                  dir="ltr"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    updateVisitDateMutation.mutate({
                                      visitId: exam.visitId,
                                      visitDate: editVisitDate
                                    });
                                  }}
                                  disabled={updateVisitDateMutation.isPending}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingVisitId(null)}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-muted-foreground">{formatDate(displayDate)}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const dateObj = new Date(displayDate);
                                    const dateStr = dateObj.toISOString().split("T")[0];
                                    setEditVisitDate(dateStr);
                                    setEditingVisitId(exam.visitId);
                                  }}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!exam.visitId) {
                                  toast.error("خطأ: لا يوجد رقم زيارة");
                                  return;
                                }
                                const message = `هل أنت متأكد من حذف الزيارة رقم ${exam.visitId} (${formatDate(exam.createdAt)}) وكل بياناتها فقط؟\n\nسيتم حذف هذه الزيارة فقط، الزيارات الأخرى ستبقى محفوظة.`;
                                if (confirm(message)) {
                                  try {
                                    if (!exam.id) {
                                      toast.error("خطأ: معرّف الفحص مفقود");
                                      console.error("CRITICAL: Attempting to delete exam without ID:", exam);
                                      return;
                                    }
                                    console.log("Deleting exam ID:", exam.id, "from visitId:", exam.visitId);
                                    // Delete only this specific exam, not the entire visit
                                    await deleteExamMutation.mutateAsync({ examinationId: exam.id });
                                    toast.success("تم حذف الزيارة بنجاح");
                                    // Wait for mutations to complete before refetching
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    await Promise.all([
                                      examinationsQuery.refetch(),
                                      pentacamQuery.refetch(),
                                      followupsQuery.refetch(),
                                    ]);
                                  } catch (error) {
                                    console.error("Delete error details:", {
                                      visitId: exam.visitId,
                                      examId: exam.id,
                                      error: error
                                    });
                                    toast.error(`حدث خطأ في الحذف: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
                                  }
                                }
                              }}
                              disabled={deleteVisitMutation.isPending || !exam.visitId}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500 hover:text-red-700" />
                            </Button>
                          </div>
                        </div>

                        {/* Visual Acuity */}
                        {(exam.ucvaOD || exam.ucvaOS || exam.bcvaOD || exam.bcvaOS) && (
                          <div className="text-sm pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">الحدة البصرية:</span>
                            <p className="text-slate-600 mt-1">
                              {exam.ucvaOD && `UCVA OD: ${exam.ucvaOD}`}
                              {exam.ucvaOD && exam.ucvaOS && " | "}
                              {exam.ucvaOS && `UCVA OS: ${exam.ucvaOS}`}
                            </p>
                            {(exam.bcvaOD || exam.bcvaOS) && (
                              <p className="text-slate-600">
                                {exam.bcvaOD && `BCVA OD: ${exam.bcvaOD}`}
                                {exam.bcvaOD && exam.bcvaOS && " | "}
                                {exam.bcvaOS && `BCVA OS: ${exam.bcvaOS}`}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Refraction */}
                        {(exam.sphereOD || exam.sphereOS || exam.cylinderOD || exam.cylinderOS) && (
                          <div className="text-sm pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">الانكسار:</span>
                            <p className="text-slate-600 mt-1">
                              {exam.sphereOD && `OD: ${exam.sphereOD} / ${exam.cylinderOD || "-"} x ${exam.axisOD || "-"}`}
                            </p>
                            {exam.sphereOS && (
                              <p className="text-slate-600">
                                OS: {exam.sphereOS} / {exam.cylinderOS || "-"} x {exam.axisOS || "-"}
                              </p>
                            )}
                          </div>
                        )}

                        {/* IOP */}
                        {(exam.iopOD || exam.iopOS) && (
                          <div className="text-sm pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">ضغط العين:</span>
                            <p className="text-slate-600 mt-1">
                              {exam.iopOD && `OD: ${exam.iopOD}`}
                              {exam.iopOD && exam.iopOS && " | "}
                              {exam.iopOS && `OS: ${exam.iopOS}`}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                    })}
                </CardContent>
              </Card>

              {/* Surgeries */}
              {surgeries.length > 0 && (
                <Card className="border-slate-200/80 bg-white/92 shadow-sm">
                  <CardHeader className="border-b border-slate-100">
                    <CardTitle>العمليات الجراحية</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {surgeries.map((surgery: any) => (
                      <div key={surgery.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">عملية #{surgery.id}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(surgery.surgeryDate)}</span>
                        </div>
                        {surgery.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{surgery.notes}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Post-Op Followups */}
              {followups.length > 0 && (
                <Card className="border-slate-200/80 bg-white/92 shadow-sm">
                  <CardHeader className="border-b border-slate-100">
                    <CardTitle>متابعات ما بعد العملية</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {followups.map((followup: any) => (
                      <div key={followup.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-semibold">متابعة #{followup.id}</span>
                          <span className="text-xs font-medium text-blue-600">{formatDate(followup.followupDate)}</span>
                        </div>

                        {/* Visual Acuity */}
                        {(followup.visualAcuityOD || followup.visualAcuityOS) && (
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">الإبصار:</span>
                            <span className="ml-2 text-slate-600">
                              {followup.visualAcuityOD && `OD: ${followup.visualAcuityOD}`}
                              {followup.visualAcuityOD && followup.visualAcuityOS && " | "}
                              {followup.visualAcuityOS && `OS: ${followup.visualAcuityOS}`}
                            </span>
                          </div>
                        )}

                        {/* IOP */}
                        {(followup.iopOD || followup.iopOS) && (
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">ضغط العين:</span>
                            <span className="ml-2 text-slate-600">
                              {followup.iopOD && `OD: ${followup.iopOD}`}
                              {followup.iopOD && followup.iopOS && " | "}
                              {followup.iopOS && `OS: ${followup.iopOS}`}
                            </span>
                          </div>
                        )}

                        {/* Findings */}
                        {followup.findings && (
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">الملاحظات:</span>
                            <p className="text-slate-600 mt-1">{formatDisplayValue(followup.findings)}</p>
                          </div>
                        )}

                        {/* Prescription/Treatment */}
                        {followup.prescription && (
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">الوصفة:</span>
                            <p className="text-slate-600 mt-1">{formatDisplayValue(followup.prescription)}</p>
                          </div>
                        )}

                        {/* Status/Notes */}
                        {followup.status && (
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">الحالة:</span>
                            <span className="ml-2 text-slate-600">{followup.status}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      </PullToRefresh>
    </div>
  );
}
