import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { DiagnosisImagesPanel } from "./patient-details/DiagnosisImagesPanel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Eye, Search, Save, Trash2, ChevronDown, Printer } from "lucide-react";
import { toast } from "sonner";
import RefractionValueSelect from "./RefractionValueSelect";
import {
  SPHERE_OPTIONS,
  CYLINDER_OPTIONS,
  UCVA_BCVA_OPTIONS,
  IOP_OPTIONS,
  ADD_OPTIONS,
} from "@/lib/refractionOptions";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

interface MedicalFilePanelProps {
  patientId: number;
  onClose?: () => void;
  /** عرض داخل مركز المريض بدل طبقة ملء الشاشة */
  embedded?: boolean;
  /** مزامنة تاريخ الزيارة مع المركز — يطبَّق كقيمة أولية ويحدِّد الفحص عند توفر مطابقة */
  hubVisitDate?: string;
  /** عرض داخل مركز المريض — تعطيل الحفظ والتعديل */
  patientHubReadOnly?: boolean;
  /** رسالة تلميح للأزرار المعطّلة */
  patientHubViewOnlyHint?: string;
  /** ربط صريح بصفحة الزيارة (visit) عند المعرف في الرابط؛ يفضّل على مطابقة تاريخ الإنشاء لوحده */
  hubVisitId?: number;
  /** تاب أولي اختياري عند فتحه من WorkflowPrototype */
  initialMedicalTab?: "data" | "plan" | "images";
  /** قسم القياسات الأولي داخل تاب البيانات */
  initialMeasurementView?: string;
  /** داخل الـWorkflow: القياسات والبيانات فقط بدون تبويبات الخطة والصور. */
  workflowMeasurementsOnly?: boolean;
  /** داخل الـWorkflow: الخطة العلاجية فقط بدون القياسات والصور. */
  workflowPlanOnly?: boolean;
  /** Restrict the measurements selector when the panel is embedded in a workflow stage. */
  workflowMeasurementViews?: Array<(typeof MEASUREMENT_VIEWS)[number]["value"]>;
  /** Show all allowed workflow measurement views together instead of using the selector. */
  workflowStackMeasurementViews?: boolean;
  /** Called only after the primary legacy-table save succeeds. */
  onSaved?: () => void | Promise<void>;

  onHubVisitDateChange?: (isoDate: string) => void;
  onHubVisitIdChange?: (visitId: number) => void;
}

const READY_TABS = [
  "Tracoma",
  "بديل دموع",
  "مضاد حيوي",
  "عياده",
  "تصحيح ابصار",
  "جلوكوما",
  "التهاب قرنيه",
  "أخرى 1",
  "أخرى 2",
  "أخرى 3",
];

const TEST_READY_TABS = ["مياه بيضاء", "ليزك", "زراعة عدسات", "اخري"];

const escapePrintText = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const printDirectly = (markup: string) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.right = "-10000px";
  frame.style.bottom = "0";
  frame.style.opacity = "0";
  frame.srcdoc = markup;
  frame.onload = () => {
    window.setTimeout(() => frame.contentWindow?.print(), 30);
  };
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 60_000);
};

const getTestTemplateCategory = (name: string) => {
  for (const tab of TEST_READY_TABS) {
    if (name.includes(tab)) return tab;
  }
  return "اخري";
};
const MEDICAL_TABS = ["data", "plan", "images"] as const;
const MEASUREMENT_VIEWS = [
  { value: "all", label: "الكل" },
  { value: "autoref", label: "AutoRef | IOP" },
  { value: "after", label: "After Refraction" },
  { value: "refraction", label: "Refraction" },
  { value: "pentacam", label: "Pentacam" },
  { value: "fundus", label: "Fundus" },
] as const;
const CollapsibleChevron = ({ open }: { open: boolean }) => (
  <svg
    className={cn(
      "h-3.5 w-3.5 transition-transform duration-200",
      open && "rotate-180",
    )}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function stripDash(obj: any): any {
  if (typeof obj === "string") return obj === "---" ? "" : obj;
  if (Array.isArray(obj)) return obj.map(stripDash);
  if (obj && typeof obj === "object")
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, stripDash(v)]),
    );
  return obj;
}

const stripTemplateCategory = (value: string) =>
  String(value ?? "")
    .replace(/^\[(.+?)\]\s*/, "")
    .trim();

const getTemplateDisplayName = (
  templateId: string,
  fallbackName: string,
  templateOverrides: any,
) => {
  const raw = templateOverrides?.[templateId]?.name || fallbackName;
  return stripTemplateCategory(raw);
};

export default function MedicalFilePanel({
  patientId,
  onClose,
  embedded = false,
  patientHubReadOnly = false,
  patientHubViewOnlyHint = "العرض فقط داخل المركز",
  hubVisitDate,
  hubVisitId,
  initialMedicalTab = "data",
  initialMeasurementView = "all",
  workflowMeasurementsOnly = false,
  workflowPlanOnly = false,
  workflowMeasurementViews,
  workflowStackMeasurementViews = false,
  onSaved,
  onHubVisitDateChange,
  onHubVisitIdChange,
}: MedicalFilePanelProps) {
  const dismiss = onClose ?? (() => {});
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const hubRo = Boolean(patientHubReadOnly);
  const queryClient = useQueryClient();
  const [activeMedicalTab, setActiveMedicalTab] = useState(initialMedicalTab);

  const [planEverActive, setPlanEverActive] = useState(
    initialMedicalTab === "plan" || workflowPlanOnly,
  );
  const [fundusOpen, setFundusOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [formData, setFormData] = useState<any>({
    medicalHistory: "",
    measurements: {
      autoref: {
        od: { s: "---", c: "---", axis: "", ucva: "", bcva: "" },
        os: { s: "---", c: "---", axis: "", ucva: "", bcva: "" },
      },
      iop: { od: "", os: "" },
      after: {
        od: { s: "---", c: "---", axis: "" },
        os: { s: "---", c: "---", axis: "" },
      },
    },
    glasses: {
      od: { s: "---", c: "---", axis: "", pd: "", bcva: "" },
      os: { s: "---", c: "---", axis: "", pd: "", bcva: "" },
    },
    fundus: {
      od: {
        discStatus: "",
        cupDiscRatio: "",
        macuaStatus: "",
        vesselStatus: "",
        otherFindings: "",
      },
      os: {
        discStatus: "",
        cupDiscRatio: "",
        macuaStatus: "",
        vesselStatus: "",
        otherFindings: "",
      },
    },
    pentacam: {
      od: {
        k1: "",
        k2: "",
        axis: "",
        thinnest: "",
        apex: "",
        residual: "",
        ttt: "",
        ablation: "",
      },
      os: {
        k1: "",
        k2: "",
        axis: "",
        thinnest: "",
        apex: "",
        residual: "",
        ttt: "",
        ablation: "",
      },
    },
    tests: [],
    treatment: [],
    diagnosis: "",
    diseases: [],
    recommendations: "",
  });
  const [treatmentDetailsByMedicationId, setTreatmentDetailsByMedicationId] =
    useState<
      Record<
        number,
        {
          dosage: string;
          frequency: string;
          duration: string;
          instructions: string;
        }
      >
    >({});

  const [examinationDate, setExaminationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedExaminationId, setSelectedExaminationId] = useState<
    number | null
  >(null);
  const [refractionTableData, setRefractionTableData] = useState<any>({
    od: { s: "---", c: "---", a: "", pd: "", add: "" },
    os: { s: "---", c: "---", a: "", pd: "", add: "" },
  });
  const [testSearchText, setTestSearchText] = useState("");
  const [diseaseSearchText, setDiseaseSearchText] = useState("");
  const [symptomSearchText, setSymptomSearchText] = useState("");
  const [medicationSearchText, setMedicationSearchText] = useState("");
  const [prescriptionTab, setPrescriptionTab] = useState("Tracoma");
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<
    string[]
  >([]);
  const [selectedTestRequestId, setSelectedTestRequestId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [destinationTab, setDestinationTab] = useState<string | null>(null);
  const [shouldSaveAfterCreate, setShouldSaveAfterCreate] = useState(false);
  const [isFollowup, setIsFollowup] = useState(false);
  const [autorefSectionTab, setAutorefSectionTab] = useState(
    initialMeasurementView,
  );
  const visibleMeasurementViews = workflowMeasurementViews?.length
    ? MEASUREMENT_VIEWS.filter((option) =>
        workflowMeasurementViews.includes(option.value),
      )
    : MEASUREMENT_VIEWS;
  const showsMeasurementView = (
    view: Exclude<(typeof MEASUREMENT_VIEWS)[number]["value"], "all">,
  ) =>
    workflowStackMeasurementViews
      ? Boolean(workflowMeasurementViews?.includes(view))
      : autorefSectionTab === "all" || autorefSectionTab === view;

  // Get patient data
  const patientQuery = trpc.patient.getPatient.useQuery(patientId, {
    refetchOnWindowFocus: false,
  });

  // Get patient visits
  const visitsQuery = trpc.medical.getVisits.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Get patient examinations
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId },
    {
      refetchOnWindowFocus: false,
    },
  );

  const patient = patientQuery.data;
  const examinations = examinationsQuery.data || [];

  useEffect(() => {
    if (!embedded || !hubVisitDate) return;
    setVisitDate(hubVisitDate);
  }, [embedded, hubVisitDate]);

  useEffect(() => {
    if (!embedded || !examinations.length) return;
    if (hubVisitId != null && hubVisitId > 0) {
      const matchByVisit = examinations.find(
        (e: any) => Number((e as { visitId?: unknown }).visitId) === hubVisitId,
      );
      if (matchByVisit?.id != null) {
        setSelectedExaminationId((prev) =>
          prev === matchByVisit.id ? prev : matchByVisit.id,
        );
        onHubVisitIdChange?.(Number(matchByVisit.visitId));
        return;
      }
    }
    if (!hubVisitDate) return;
    const match = examinations.find((e: any) => {
      const created = (e as { createdAt?: Date | string }).createdAt;
      const key = created ? new Date(created).toISOString().split("T")[0] : "";
      return key === hubVisitDate;
    });
    if (match?.id != null) {
      setSelectedExaminationId((prev) => (prev === match.id ? prev : match.id));
      const matchedVisitId = Number(match.visitId);
      if (Number.isFinite(matchedVisitId) && matchedVisitId > 0) {
        onHubVisitIdChange?.(matchedVisitId);
      }
    }
  }, [embedded, hubVisitId, hubVisitDate, examinations, onHubVisitIdChange]);

  // Get the latest visit for this patient
  const patientVisit = (visitsQuery.data as any)?.find(
    (v: any) => v.patientId === patientId,
  );

  // Load examination data when selected - MUST BE BEFORE pentacamQuery
  const selectedExamination = examinations.find(
    (e: any) => e.id === selectedExaminationId,
  );
  const handleSelectExamination = (examinationId: number) => {
    setSelectedExaminationId(examinationId);
    const examination = examinations.find(
      (item: any) => Number(item.id) === Number(examinationId),
    );
    const nextVisitId = Number(examination?.visitId);
    if (Number.isFinite(nextVisitId) && nextVisitId > 0) {
      onHubVisitIdChange?.(nextVisitId);
    }
  };

  // Get pentacam results for the selected visit
  const pentacamQuery = trpc.medical.getPentacamResultsByVisit.useQuery(
    { visitId: selectedExamination?.visitId || 0 },
    {
      enabled: Boolean(selectedExamination?.visitId),
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  // Get autoref from dedicated table
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const afterRefractionQuery =
    trpc.medical.getAfterRefractionByPatient.useQuery(
      { patientId },
      { refetchOnWindowFocus: false },
    );

  // Get glasses/refraction from dedicated table
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );

  // Get medications, diseases, tests, prescriptions
  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const diseasesQuery = trpc.medical.getAllDiseases.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const symptomsQuery = trpc.medical.getAllSymptoms.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const testRequestsQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "tests" },
    { refetchOnWindowFocus: false },
  );

  const prescriptionsQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "prescription" },
    { refetchOnWindowFocus: false },
  );

  // Get doctor report for the selected examination
  const doctorReportQuery = trpc.medical.getDoctorReportsByVisit.useQuery(
    { visitId: selectedExamination?.visitId || 0 },
    {
      enabled: Boolean(selectedExamination?.visitId),
      refetchOnWindowFocus: false,
      staleTime: 0, // Always consider stale to force refetch when query key changes
    },
  );

  // Get test requests for the selected visit
  const visitTestRequestsQuery = trpc.medical.getTestRequestsByVisit.useQuery(
    { visitId: selectedExamination?.visitId || 0 },
    {
      enabled: Boolean(selectedExamination?.visitId),
      refetchOnWindowFocus: false,
    },
  );

  // Get prescriptions for the selected visit
  const visitPrescriptionsQuery =
    trpc.medical.getPrescriptionsWithItemsByVisit.useQuery(
      { visitId: selectedExamination?.visitId || 0 },
      {
        enabled: Boolean(selectedExamination?.visitId),
        refetchOnWindowFocus: false,
      },
    );

  // Update form when examination is selected (must be useEffect — setState inside useMemo causes render loops / max update depth)
  useEffect(() => {
    if (selectedExamination) {
      // Parse glassesData if it exists
      let glassesData = { od: {}, os: {} };
      if (selectedExamination.glassesData) {
        try {
          glassesData = JSON.parse(selectedExamination.glassesData);
        } catch (e) {
          // Keep default empty object
        }
      }

      // Parse fundus data if it exists
      let fundusData = {
        od: {
          discStatus: "",
          cupDiscRatio: "",
          macuaStatus: "",
          vesselStatus: "",
          otherFindings: "",
        },
        os: {
          discStatus: "",
          cupDiscRatio: "",
          macuaStatus: "",
          vesselStatus: "",
          otherFindings: "",
        },
      };
      if (selectedExamination.posteriorSegmentOD) {
        try {
          fundusData.od = JSON.parse(selectedExamination.posteriorSegmentOD);
        } catch (e) {
          // Keep default empty object
        }
      }
      if (selectedExamination.posteriorSegmentOS) {
        try {
          fundusData.os = JSON.parse(selectedExamination.posteriorSegmentOS);
        } catch (e) {
          // Keep default empty object
        }
      }

      // Get pentacam data
      const pentacam = pentacamQuery.data?.[0];

      // Get autoref from dedicated table (matched by examinationId), fallback to examination row
      const autorefRecord = autorefQuery.data?.find(
        (r: any) => r.examinationId === selectedExamination.id,
      );
      const afterRecord = afterRefractionQuery.data?.find(
        (r: any) => r.examinationId === selectedExamination.id,
      );
      const autorefOD = autorefRecord
        ? {
            s: autorefRecord.sphereOD || "",
            c: autorefRecord.cylinderOD || "",
            axis: autorefRecord.axisOD || "",
            ucva: autorefRecord.ucvaOD || "",
            bcva: autorefRecord.bcvaOD || "",
          }
        : {
            s: selectedExamination.sphereOD || "",
            c: selectedExamination.cylinderOD || "",
            axis: selectedExamination.axisOD || "",
            ucva: selectedExamination.ucvaOD || "",
            bcva: selectedExamination.bcvaOD || "",
          };
      const autorefOS = autorefRecord
        ? {
            s: autorefRecord.sphereOS || "",
            c: autorefRecord.cylinderOS || "",
            axis: autorefRecord.axisOS || "",
            ucva: autorefRecord.ucvaOS || "",
            bcva: autorefRecord.bcvaOS || "",
          }
        : {
            s: selectedExamination.sphereOS || "",
            c: selectedExamination.cylinderOS || "",
            axis: selectedExamination.axisOS || "",
            ucva: selectedExamination.ucvaOS || "",
            bcva: selectedExamination.bcvaOS || "",
          };
      const afterOD = {
        s: afterRecord?.sphereOD || "",
        c: afterRecord?.cylinderOD || "",
        axis: afterRecord?.axisOD || "",
      };
      const afterOS = {
        s: afterRecord?.sphereOS || "",
        c: afterRecord?.cylinderOS || "",
        axis: afterRecord?.axisOS || "",
      };

      // Get glasses/refraction from dedicated table (matched by examinationId), fallback to glassesData JSON
      const glassesRecord = glassesRecordsQuery.data?.find(
        (r: any) => r.examinationId === selectedExamination.id,
      );
      if (glassesRecord && !selectedExamination.glassesData) {
        glassesData = {
          od: {
            s: glassesRecord.sOD || "",
            c: glassesRecord.cOD || "",
            a: glassesRecord.axisOD || "",
            pd: glassesRecord.pdOD || "",
          },
          os: {
            s: glassesRecord.sOS || "",
            c: glassesRecord.cOS || "",
            a: glassesRecord.axisOS || "",
            pd: glassesRecord.pdOS || "",
          },
        };
      }

      // Get doctor report data
      const doctorReport = doctorReportQuery.data?.[0];

      let diseases: any[] = [];
      if (doctorReport?.additionalNotes) {
        try {
          diseases = JSON.parse(doctorReport.additionalNotes);
          if (!Array.isArray(diseases)) {
            diseases = [];
          }
        } catch (e) {
          diseases = [];
        }
      }

      // Load test request IDs from visit
      const testIds = (visitTestRequestsQuery.data ?? []).flatMap((req: any) =>
        req.items && Array.isArray(req.items)
          ? req.items.map((item: any) => item.testId || item.id)
          : [],
      );

      // Load prescription medication IDs from visit
      const prescriptionMedIds = (visitPrescriptionsQuery.data ?? []).flatMap(
        (presc: any) =>
          presc.items && Array.isArray(presc.items)
            ? presc.items.map((item: any) => item.medicationId || item.id)
            : [],
      );
      const prescriptionDetails = Object.fromEntries(
        (visitPrescriptionsQuery.data ?? []).flatMap((presc: any) =>
          Array.isArray(presc.items)
            ? presc.items
                .filter((item: any) => Number(item.medicationId || item.id) > 0)
                .map((item: any) => [
                  Number(item.medicationId || item.id),
                  {
                    dosage: String(item.dosage ?? ""),
                    frequency: String(item.frequency ?? ""),
                    duration: String(item.duration ?? ""),
                    instructions: String(item.instructions ?? ""),
                  },
                ])
            : [],
        ),
      );
      setTreatmentDetailsByMedicationId(prescriptionDetails);

      setFormData((prev: any) => {
        // Only override tests/treatment if we actually loaded data from the visit
        // Otherwise preserve what the user entered for a new exam
        const finalTests = testIds;
        const finalTreatment = prescriptionMedIds;

        return {
          ...prev,
          measurements: {
            autoref: { od: autorefOD, os: autorefOS },
            iop: {
              od: autorefRecord?.iopOD ?? selectedExamination.iopOD ?? "",
              os: autorefRecord?.iopOS ?? selectedExamination.iopOS ?? "",
            },
            after: { od: afterOD, os: afterOS },
          },
          glasses: glassesData,
          fundus: fundusData,
          pentacam: pentacam
            ? {
                od: {
                  k1: pentacam.k1OD || "",
                  k2: pentacam.k2OD || "",
                  axis: pentacam.axisOD || "",
                  thinnest: pentacam.thinnestPointOD || "",
                  apex: pentacam.apexOD || "",
                  residual: pentacam.residualOD || "",
                  ttt: pentacam.tttOD || "",
                  ablation: pentacam.ablationOD || "",
                },
                os: {
                  k1: pentacam.k1OS || "",
                  k2: pentacam.k2OS || "",
                  axis: pentacam.axisOS || "",
                  thinnest: pentacam.thinnestPointOS || "",
                  apex: pentacam.apexOS || "",
                  residual: pentacam.residualOS || "",
                  ttt: pentacam.tttOS || "",
                  ablation: pentacam.ablationOS || "",
                },
              }
            : prev.pentacam,
          medicalHistory:
            (selectedExamination as any)?.chiefComplaint ||
            (selectedExamination as any)?.symptoms ||
            (visitsQuery.data as any[])?.find(
              (v: any) => v.id === selectedExamination.visitId,
            )?.chiefComplaint ||
            doctorReport?.clinicalOpinion ||
            "",
          diagnosis: doctorReport?.diagnosis || "",
          recommendations: doctorReport?.recommendations || "",
          diseases: diseases,
          tests: finalTests,
          treatment: finalTreatment,
        };
      });

      // Update refraction table data from glassesData (handle both old 'axis' and new 'a' formats)
      if (glassesData.od || glassesData.os) {
        setRefractionTableData({
          od: {
            s: (glassesData.od as any)?.s || "",
            c: (glassesData.od as any)?.c || "",
            a:
              (glassesData.od as any)?.a || (glassesData.od as any)?.axis || "",
            pd: (glassesData.od as any)?.pd || "",
          },
          os: {
            s: (glassesData.os as any)?.s || "",
            c: (glassesData.os as any)?.c || "",
            a:
              (glassesData.os as any)?.a || (glassesData.os as any)?.axis || "",
            pd: (glassesData.os as any)?.pd || "",
          },
        });
      }

      // Update dates
      if (selectedExamination.createdAt) {
        const dateStr = new Date(selectedExamination.createdAt)
          .toISOString()
          .split("T")[0];
        setExaminationDate(dateStr);
      }
    }
  }, [
    selectedExaminationId,
    selectedExamination,
    pentacamQuery.data,
    doctorReportQuery.data,
    visitTestRequestsQuery.data,
    visitPrescriptionsQuery.data,
    autorefQuery.data,
    afterRefractionQuery.data,
    glassesRecordsQuery.data,
  ]);

  // Auto-save after creating examination
  useEffect(() => {
    if (hubRo) {
      setShouldSaveAfterCreate(false);
      return;
    }
    if (
      shouldSaveAfterCreate &&
      selectedExaminationId &&
      examinations.length > 0
    ) {
      console.log(
        "Exam created with ID:",
        selectedExaminationId,
        "Now saving all data...",
      );
      setShouldSaveAfterCreate(false);

      const examIdToSave = selectedExaminationId;
      const selectedExam = examinations.find((e: any) => e.id === examIdToSave);

      if (!examIdToSave || !selectedExam) return;

      // Build updates
      const fv2 = (v: string | undefined | null) =>
        !v || v === "---" ? null : v;
      const fvs2 = (v: string | undefined | null) =>
        !v || v === "---" ? "" : v;
      const flattenedUpdates: any = {
        sphereOD: fv2(formData.measurements?.autoref?.od?.s),
        sphereOS: fv2(formData.measurements?.autoref?.os?.s),
        cylinderOD: fv2(formData.measurements?.autoref?.od?.c),
        cylinderOS: fv2(formData.measurements?.autoref?.os?.c),
        axisOD: fv2(formData.measurements?.autoref?.od?.axis),
        axisOS: fv2(formData.measurements?.autoref?.os?.axis),
        ucvaOD: fv2(formData.measurements?.autoref?.od?.ucva),
        ucvaOS: fv2(formData.measurements?.autoref?.os?.ucva),
        iopOD: fv2(formData.measurements?.iop?.od),
        iopOS: fv2(formData.measurements?.iop?.os),
        glassesData: JSON.stringify({
          od: {
            s: fvs2(refractionTableData.od?.s),
            c: fvs2(refractionTableData.od?.c),
            axis: fvs2(refractionTableData.od?.a),
            pd: fvs2(refractionTableData.od?.pd),
            bcva: fvs2(formData.measurements?.autoref?.od?.bcva),
          },
          os: {
            s: fvs2(refractionTableData.os?.s),
            c: fvs2(refractionTableData.os?.c),
            axis: fvs2(refractionTableData.os?.a),
            pd: fvs2(refractionTableData.os?.pd),
            bcva: fvs2(formData.measurements?.autoref?.os?.bcva),
          },
        }),
        radiologyLabsNotes: formData.radiologyLabsNotes || null,
      };

      // Save examination immediately
      updateExaminationMutation.mutate(
        {
          examinationId: examIdToSave,
          updates: flattenedUpdates,
        },
        {
          onSuccess: () => {
            saveAfterRefractionMutation.mutate({
              examinationId: examIdToSave,
              patientId,
              od: stripDash(formData.measurements?.after?.od),
              os: stripDash(formData.measurements?.after?.os),
            });
            const doctorReport = (doctorReportQuery.data as any)?.[0];
            if (doctorReport?.id) {
              updateDoctorReportMutation.mutate({
                reportId: doctorReport.id,
                diagnosis: formData.diagnosis || "",
                clinicalOpinion: formData.medicalHistory || "",
                additionalNotes: formData.diseases
                  ? JSON.stringify(formData.diseases)
                  : "",
                recommendations: formData.recommendations || "",
                prescription: formData.treatment
                  ? JSON.stringify(formData.treatment)
                  : "",
              });
            }

            // Save pentacam data if any
            const hasPentacamData =
              Object.values(formData.pentacam?.od || {}).some((v) => v) ||
              Object.values(formData.pentacam?.os || {}).some((v) => v);
            if (selectedExam?.visitId && hasPentacamData) {
              const existingPentacam = pentacamQuery.data?.[0];
              updatePentacamResultMutation.mutate({
                visitId: selectedExam.visitId,
                patientId: patientId,
                pentacamId: existingPentacam?.id,
                k1OD: String(formData.pentacam?.od?.k1 || ""),
                k2OD: String(formData.pentacam?.od?.k2 || ""),
                axisOD: String(formData.pentacam?.od?.axis || ""),
                thinnestPointOD: String(formData.pentacam?.od?.thinnest || ""),
                apexOD: String(formData.pentacam?.od?.apex || ""),
                residualOD: String(formData.pentacam?.od?.residual || ""),
                tttOD: String(formData.pentacam?.od?.ttt || ""),
                ablationOD: String(formData.pentacam?.od?.ablation || ""),
                k1OS: String(formData.pentacam?.os?.k1 || ""),
                k2OS: String(formData.pentacam?.os?.k2 || ""),
                axisOS: String(formData.pentacam?.os?.axis || ""),
                thinnestPointOS: String(formData.pentacam?.os?.thinnest || ""),
                apexOS: String(formData.pentacam?.os?.apex || ""),
                residualOS: String(formData.pentacam?.os?.residual || ""),
                tttOS: String(formData.pentacam?.os?.ttt || ""),
                ablationOS: String(formData.pentacam?.os?.ablation || ""),
              });
            }

            // Save test requests if any
            if (selectedExam?.visitId && (formData.tests || []).length > 0) {
              const validTests = (formData.tests || []).filter(
                (id: any) => id !== undefined && id !== null,
              );
              if (validTests.length > 0) {
                console.log(
                  "Saving test requests for first visit:",
                  validTests,
                );
                const testItems = validTests.map((testId: number) => ({
                  testId: testId,
                }));
                createTestRequestMutation.mutate({
                  patientId: patientId,
                  visitId: selectedExam.visitId,
                  items: testItems,
                });
              }
            }

            // Save prescriptions if any
            if (
              selectedExam?.visitId &&
              (formData.treatment || []).length > 0
            ) {
              const validMeds = (formData.treatment || []).filter(
                (id: any) => id !== undefined && id !== null,
              );
              if (validMeds.length > 0) {
                console.log("Saving prescriptions for first visit:", validMeds);
                const prescriptionItems = validMeds.map((medId: number) => {
                  const medication = medicationsQuery.data?.find(
                    (m: any) => m.id === medId,
                  );
                  return {
                    medicationId: medId,
                    medicationName: medication?.name || `Med ${medId}`,
                    ...(treatmentDetailsByMedicationId[medId] ?? {}),
                  };
                });
                createPrescriptionWithItemsMutation.mutate({
                  patientId: patientId,
                  visitId: selectedExam.visitId,
                  notes: "Prescribed from medical file panel",
                  items: prescriptionItems,
                });
              }
            }

            // Wait longer for all mutations to complete before closing (2.5s)
            setTimeout(() => {
              setIsSaving(false);
              if (!embedded) dismiss();
            }, 2500);
          },
        },
      );
    }
  }, [shouldSaveAfterCreate, selectedExaminationId]);

  // Load test request template items when selected
  useEffect(() => {
    if (!selectedTestRequestId || !testRequestsQuery.data) {
      return;
    }
    console.log("Selected test template ID:", selectedTestRequestId);
    console.log("Test templates data:", testRequestsQuery.data);

    const template = testRequestsQuery.data[selectedTestRequestId];
    console.log("Found template:", template);

    if (!template || !template.testItems) {
      console.log("No template or testItems found");
      setSelectedTestRequestId(null);
      return;
    }

    // testItems is an array of objects with testId property
    const itemIds = Array.isArray(template.testItems)
      ? template.testItems
          .map((item: any) => item.testId || item.id)
          .filter((id: any) => id !== undefined && id !== null)
      : [];
    console.log("Item IDs to add:", itemIds);

    if (itemIds.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        tests: Array.from(new Set([...(prev.tests || []), ...itemIds])),
      }));
      toast.success(`تم إضافة ${itemIds.length} فحص من القالب`);
    }
    setSelectedTestRequestId(null);
  }, [selectedTestRequestId, testRequestsQuery.data]);

  // Load prescription template items when selected
  useEffect(() => {
    if (selectedPrescriptionIds.length === 0 || !prescriptionsQuery.data) {
      return;
    }

    console.log("Selected prescription template IDs:", selectedPrescriptionIds);
    console.log("Prescription templates data:", prescriptionsQuery.data);

    const allMedIds = new Set<number>();
    const templateDetails: Record<
      number,
      {
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string;
      }
    > = {};
    selectedPrescriptionIds.forEach((templateId: string) => {
      const template = prescriptionsQuery.data[templateId];
      console.log(`Found template ${templateId}:`, template);

      // prescriptionItems is an array of objects with medication info
      if (
        template &&
        template.prescriptionItems &&
        Array.isArray(template.prescriptionItems)
      ) {
        template.prescriptionItems.forEach((item: any) => {
          // Item has medicationName, find the medication ID from medicationsQuery
          const medName = item.medicationName;
          if (medName) {
            const medication = medicationsQuery.data?.find(
              (m: any) => m.name === medName,
            );
            const medId = medication?.id;
            if (medId !== undefined && medId !== null) {
              allMedIds.add(medId);
              templateDetails[medId] = {
                dosage: String(item.dosage ?? ""),
                frequency: String(item.frequency ?? ""),
                duration: String(item.duration ?? ""),
                instructions: String(item.instructions ?? ""),
              };
              console.log(`Found medication "${medName}" with ID: ${medId}`);
            } else {
              console.log(`Could not find medication ID for: "${medName}"`);
            }
          }
        });
      }
    });

    console.log("Total medication IDs to add:", Array.from(allMedIds));

    if (allMedIds.size > 0) {
      setTreatmentDetailsByMedicationId((previous) => ({
        ...previous,
        ...templateDetails,
      }));
      setFormData((prev: any) => ({
        ...prev,
        treatment: Array.from(
          new Set([...(prev.treatment || []), ...Array.from(allMedIds)]),
        ),
      }));
      toast.success(`تم إضافة ${allMedIds.size} دواء من القوالب`);
      setSelectedPrescriptionIds([]);
    }
  }, [selectedPrescriptionIds, prescriptionsQuery.data, medicationsQuery.data]);

  const updateVisitChiefComplaintMutation =
    trpc.medical.updateVisitChiefComplaint.useMutation();

  // Mutation for updating examination
  const updateExaminationMutation = trpc.medical.updateExamination.useMutation({
    onSuccess: async () => {
      await autorefQuery.refetch();
      await onSaved?.();
      toast.success("تم حفظ البيانات بنجاح");
      setIsSaving(false);
      if (!embedded) {
        setTimeout(() => dismiss(), 1000);
      }
    },
    onError: (error) => {
      setIsSaving(false);
      toast.error(error.message || "خطأ في حفظ البيانات");
    },
  });

  // Mutation for creating doctor report
  const createDoctorReportMutation =
    trpc.medical.createDoctorReport.useMutation({
      onSuccess: () => {
        console.log("Doctor report created successfully");
        toast.success("تم حفظ التقرير بنجاح");
      },
      onError: (error: any) => {
        console.error("Doctor report create error:", error);
        toast.error(error.message || "خطأ في إنشاء التقرير");
      },
    });

  // Mutation for updating doctor report
  const updateDoctorReportMutation =
    trpc.medical.updateDoctorReport.useMutation({
      onSuccess: () => {
        console.log("Doctor report saved successfully");
        toast.success("تم حفظ التقرير بنجاح");
      },
      onError: (error: any) => {
        console.error("Doctor report save error:", error);
        toast.error(error.message || "خطأ في حفظ التقرير");
      },
    });

  // Mutation for updating pentacam results
  const updatePentacamResultMutation =
    trpc.medical.updatePentacamResult.useMutation({
      onSuccess: () => {
        console.log("Pentacam data saved successfully");
        toast.success("تم حفظ بيانات البنتاكام بنجاح");
      },
      onError: (error: any) => {
        console.error("Pentacam save error:", error);
        toast.error(error.message || "خطأ في حفظ بيانات البنتاكام");
      },
    });

  // Mutation for creating test requests
  const createTestRequestMutation = trpc.medical.createTestRequest.useMutation({
    onSuccess: () => {
      console.log("Test request created successfully");
      toast.success("تم حفظ طلب الفحص بنجاح");
      // Refetch to reload test requests
      queryClient.invalidateQueries({
        queryKey: ["medical.getPatientTestRequests"],
      });
    },
    onError: (error: any) => {
      console.error("Test request create error:", error);
      toast.error(error.message || "خطأ في حفظ طلب الفحص");
    },
  });
  const replaceTestRequestMutation =
    trpc.medical.replaceTestRequest.useMutation({
      onSuccess: async () => {
        await visitTestRequestsQuery.refetch();
        toast.success("تم تحديث طلب التحاليل والأشعة");
      },
      onError: (error: any) => {
        toast.error(error.message || "خطأ في تحديث طلب التحاليل والأشعة");
      },
    });

  // Mutation for creating prescriptions with multiple items
  const createPrescriptionWithItemsMutation =
    trpc.medical.createPrescriptionWithItems.useMutation({
      onSuccess: () => {
        console.log("Prescription created successfully");
        toast.success("تم حفظ الوصفة الطبية بنجاح");
        // Refetch to reload prescriptions
        queryClient.invalidateQueries({
          queryKey: ["medical.getPrescriptionsWithItemsByPatient"],
        });
      },
      onError: (error: any) => {
        console.error("Prescription create error:", error);
        toast.error(error.message || "خطأ في حفظ الوصفة الطبية");
      },
    });
  const replacePrescriptionWithItemsMutation =
    trpc.medical.replacePrescriptionWithItems.useMutation({
      onSuccess: async () => {
        await visitPrescriptionsQuery.refetch();
        toast.success("تم تحديث الوصفة الطبية");
      },
      onError: (error: any) => {
        toast.error(error.message || "خطأ في تحديث الوصفة الطبية");
      },
    });

  // Mutation for creating an empty examination
  const createExaminationMutation = trpc.medical.createExamination.useMutation({
    onSuccess: async (examData: any) => {
      console.log("Examination created successfully:", examData);
      setTimeout(async () => {
        console.log("Refetching examinations...");
        const result = await examinationsQuery.refetch();
        console.log("Refetch result:", result.data);
        const newExams = result.data || [];
        if (newExams.length > 0) {
          console.log("Found exams, setting ID:", newExams[0].id);
          setSelectedExaminationId(newExams[0].id);
          setShouldSaveAfterCreate(true);
          toast.success("تم إنشاء الزيارة والفحص");
        } else {
          console.log("No exams found after creation");
          toast.error("تم إنشاء الزيارة لكن لم يتم العثور على الفحص");
        }
        setIsSaving(false);
      }, 800);
    },
    onError: (error) => {
      console.error("createExamination error:", error);
      setIsSaving(false);
      toast.error(error.message || "خطأ في إنشاء الفحص");
    },
  });

  // Mutation for saving medical visit (creates visit AND examination with all data)
  const saveMedicalVisitMutation = trpc.medical.saveMedicalVisit.useMutation({
    onSuccess: async (data: any) => {
      console.log("Medical visit saved with all data:", data);
      toast.success("تم حفظ الزيارة والبيانات الطبية بنجاح");

      const visitId = data.visitId;

      // Save test requests if any
      if (visitId && (formData.tests || []).length > 0) {
        const validTests = (formData.tests || []).filter(
          (id: any) => id !== undefined && id !== null,
        );
        if (validTests.length > 0) {
          console.log("Saving test requests:", validTests);
          const testItems = validTests.map((testId: number) => ({
            testId: testId,
          }));
          createTestRequestMutation.mutate({
            patientId: patientId,
            visitId: visitId,
            items: testItems,
          });
        }
      }

      // Save prescriptions if any
      if (visitId && (formData.treatment || []).length > 0) {
        const validMeds = (formData.treatment || []).filter(
          (id: any) => id !== undefined && id !== null,
        );
        if (validMeds.length > 0) {
          console.log("Saving prescriptions:", validMeds);
          const prescriptionItems = validMeds.map((medId: number) => {
            const medication = medicationsQuery.data?.find(
              (m: any) => m.id === medId,
            );
            return {
              medicationId: medId,
              medicationName: medication?.name || `Med ${medId}`,
              ...(treatmentDetailsByMedicationId[medId] ?? {}),
            };
          });
          await createPrescriptionWithItemsMutation.mutateAsync({
            patientId: patientId,
            visitId: visitId,
            notes: "Prescribed from medical file panel",
            items: prescriptionItems,
          });
        }
      }

      // Refetch visits and examinations to load the newly created data
      if (visitId) {
        console.log(
          "Refetching visits and examinations after visit creation...",
        );
        // Invalidate and refetch to ensure all panels see the new data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["medical.getVisits"] }),
          queryClient.invalidateQueries({
            queryKey: ["medical.getExaminations"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["medical.getExaminationsByPatient", { patientId }],
          }),
          queryClient.invalidateQueries({
            queryKey: ["medical.getAutorefractometryByPatient", { patientId }],
          }),
          queryClient.invalidateQueries({
            queryKey: ["medical.getGlassesRecordsByPatient", { patientId }],
          }),
          queryClient.invalidateQueries({
            queryKey: ["medical.getVisitsByPatient", { patientId }],
          }),
          visitsQuery.refetch(),
          examinationsQuery.refetch(),
        ]);
      }

      await onSaved?.();

      setTimeout(() => {
        setIsSaving(false);
        if (!embedded) dismiss();
      }, 2500);
    },
    onError: (error) => {
      console.error("saveMedicalVisit error:", error);
      setIsSaving(false);
      toast.error(error.message || "خطأ في حفظ الزيارة والبيانات");
    },
  });
  const saveAfterRefractionMutation =
    trpc.medical.saveAfterRefractionData.useMutation();

  const deleteExaminationMutation =
    trpc.medical.deleteExaminationDirect.useMutation({
      onSuccess: () => {
        toast.success("تم حذف الزيارة بنجاح");
        setSelectedExaminationId(null);
        queryClient.invalidateQueries({
          queryKey: ["medical.getExaminationsByPatient", { patientId }],
        });
        queryClient.invalidateQueries({
          queryKey: ["medical.getAutorefractometryByPatient", { patientId }],
        });
        queryClient.invalidateQueries({
          queryKey: ["medical.getGlassesRecordsByPatient", { patientId }],
        });
        queryClient.invalidateQueries({
          queryKey: ["medical.getVisitsByPatient", { patientId }],
        });
        examinationsQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message || "خطأ في حذف الزيارة");
      },
    });

  const getTemplateCategory = (name: string) => {
    for (const tab of READY_TABS) {
      if (name.includes(tab)) return tab;
    }
    return "أخرى 1";
  };

  const toggleCheckbox = (field: string, value: any) => {
    setFormData((prev: any) => {
      const arr = prev[field] || [];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v: any) => v !== value) };
      } else {
        return { ...prev, [field]: [...arr, value] };
      }
    });
  };

  const handleSave = () => {
    if (hubRo) {
      toast.info(patientHubViewOnlyHint);
      return;
    }
    // Build glasses data from refraction table (used for both first visit and no exam selected cases)
    const refVal = (v: string | undefined) => (!v || v === "---" ? "" : v);
    const glassesData = {
      od: {
        s: refVal(refractionTableData.od?.s),
        c: refVal(refractionTableData.od?.c),
        axis: refVal(refractionTableData.od?.a),
        pd: refVal(refractionTableData.od?.pd),
        add: refVal(refractionTableData.od?.add),
        bcva: formData.measurements?.autoref?.od?.bcva || "",
      },
      os: {
        s: refVal(refractionTableData.os?.s),
        c: refVal(refractionTableData.os?.c),
        axis: refVal(refractionTableData.os?.a),
        pd: refVal(refractionTableData.os?.pd),
        add: refVal(refractionTableData.os?.add),
        bcva: formData.measurements?.autoref?.os?.bcva || "",
      },
    };
    const autorefForSave = {
      od: {
        ...formData.measurements?.autoref?.od,
        bcva: undefined,
      },
      os: {
        ...formData.measurements?.autoref?.os,
        bcva: undefined,
      },
    };

    // Create a new visit when there are no exams OR when exams exist but none is selected.
    if (examinations.length === 0 || !selectedExaminationId) {
      setIsSaving(true);

      saveMedicalVisitMutation.mutate({
        patientId: patientId,
        visitDate: visitDate,
        isFollowup: isFollowup,
        autoref: stripDash(autorefForSave),
        iop: stripDash(formData.measurements?.iop),
        after: stripDash(formData.measurements?.after),
        glasses: glassesData,
        fundus: formData.fundus,
        pentacam: formData.pentacam,
        symptoms: formData.medicalHistory,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment
          ? JSON.stringify(formData.treatment)
          : undefined,
        diseases: formData.diseases
          ? JSON.stringify(formData.diseases)
          : undefined,
        recommendations: formData.recommendations,
      });
      return;
    }

    const examIdToSave = selectedExaminationId;
    const selectedExam = examinations.find((e: any) => e.id === examIdToSave);

    if (examinationsQuery.isLoading) {
      toast.error("جاري تحميل الفحوصات...");
      return;
    }

    if (!examIdToSave || !selectedExam) {
      toast.error("خطأ في تحديد الفحص");
      return;
    }

    setIsSaving(true);

    // Flatten the nested formData structure to database column names
    const fv = (v: string | undefined | null) => (!v || v === "---" ? null : v);
    const fvs = (v: string | undefined | null) => (!v || v === "---" ? "" : v);
    const flattenedUpdates: any = {
      sphereOD: fv(formData.measurements?.autoref?.od?.s),
      sphereOS: fv(formData.measurements?.autoref?.os?.s),
      cylinderOD: fv(formData.measurements?.autoref?.od?.c),
      cylinderOS: fv(formData.measurements?.autoref?.os?.c),
      axisOD: fv(formData.measurements?.autoref?.od?.axis),
      axisOS: fv(formData.measurements?.autoref?.os?.axis),
      ucvaOD: fv(formData.measurements?.autoref?.od?.ucva),
      ucvaOS: fv(formData.measurements?.autoref?.os?.ucva),
      iopOD: fv(formData.measurements?.iop?.od),
      iopOS: fv(formData.measurements?.iop?.os),
      glassesData: JSON.stringify({
        od: {
          s: fvs(refractionTableData.od?.s),
          c: fvs(refractionTableData.od?.c),
          axis: fvs(refractionTableData.od?.a),
          pd: fvs(refractionTableData.od?.pd),
          bcva: fvs(formData.measurements?.autoref?.od?.bcva),
        },
        os: {
          s: fvs(refractionTableData.os?.s),
          c: fvs(refractionTableData.os?.c),
          axis: fvs(refractionTableData.os?.a),
          pd: fvs(refractionTableData.os?.pd),
          bcva: fvs(formData.measurements?.autoref?.os?.bcva),
        },
      }),
      posteriorSegmentOD: Object.values(formData.fundus?.od || {}).some(
        (v) => v,
      )
        ? JSON.stringify(formData.fundus?.od)
        : null,
      posteriorSegmentOS: Object.values(formData.fundus?.os || {}).some(
        (v) => v,
      )
        ? JSON.stringify(formData.fundus?.os)
        : null,
      radiologyLabsNotes: formData.radiologyLabsNotes || null,
    };

    console.log("flattenedUpdates:", flattenedUpdates);

    // Save examination data
    updateExaminationMutation.mutate(
      {
        examinationId: examIdToSave,
        updates: flattenedUpdates,
      },
      {
        onSuccess: async () => {
          saveAfterRefractionMutation.mutate({
            examinationId: examIdToSave,
            patientId,
            od: stripDash(formData.measurements?.after?.od),
            os: stripDash(formData.measurements?.after?.os),
          });
          const visitId = selectedExam?.visitId;
          if (visitId && formData.medicalHistory) {
            updateVisitChiefComplaintMutation.mutate({
              visitId,
              chiefComplaint: formData.medicalHistory,
            });
          }
          console.log("Exam saved, now saving doctor report");
          const doctorReport = (doctorReportQuery.data as any)?.[0];

          if (doctorReport?.id) {
            // Update existing report
            console.log("Updating doctor report:", doctorReport.id);
            updateDoctorReportMutation.mutate(
              {
                reportId: doctorReport.id,
                diagnosis: formData.diagnosis || "",
                clinicalOpinion: formData.medicalHistory || "",
                additionalNotes: formData.diseases
                  ? JSON.stringify(formData.diseases)
                  : "",
                recommendations: formData.recommendations || "",
                prescription: formData.treatment
                  ? JSON.stringify(formData.treatment)
                  : "",
              },
              {
                onSuccess: () => {
                  console.log("Doctor report updated");
                  setIsSaving(false);
                },
                onError: (err: any) => {
                  console.error("Doctor report update error:", err);
                  setIsSaving(false);
                },
              },
            );
          } else if (
            visitId &&
            (formData.diagnosis ||
              formData.recommendations ||
              formData.diseases?.length > 0)
          ) {
            // Create new report if none exists and there's data to save
            console.log("Creating new doctor report for visitId:", visitId);
            createDoctorReportMutation.mutate(
              {
                visitId: visitId,
                patientId: patientId,
                diagnosis: formData.diagnosis || "No diagnosis entered",
                clinicalOpinion: formData.recommendations || "",
                additionalNotes: formData.diseases
                  ? JSON.stringify(formData.diseases)
                  : "",
              },
              {
                onSuccess: () => {
                  console.log("Doctor report created");
                  doctorReportQuery.refetch();
                  setIsSaving(false);
                },
                onError: (err: any) => {
                  console.error("Doctor report create error:", err);
                  setIsSaving(false);
                },
              },
            );
          } else {
            console.log("No visit found or no doctor report data to save");
          }

          // Save pentacam data if any fields are filled
          const hasPentacamData =
            Object.values(formData.pentacam?.od || {}).some((v) => v) ||
            Object.values(formData.pentacam?.os || {}).some((v) => v);
          if (visitId && hasPentacamData) {
            console.log("Saving pentacam data for visitId:", visitId);
            const existingPentacam = pentacamQuery.data?.[0];
            updatePentacamResultMutation.mutate({
              visitId: visitId,
              patientId: patientId,
              pentacamId: existingPentacam?.id,
              k1OD: String(formData.pentacam?.od?.k1 || ""),
              k2OD: String(formData.pentacam?.od?.k2 || ""),
              axisOD: String(formData.pentacam?.od?.axis || ""),
              thinnestPointOD: String(formData.pentacam?.od?.thinnest || ""),
              apexOD: String(formData.pentacam?.od?.apex || ""),
              residualOD: String(formData.pentacam?.od?.residual || ""),
              tttOD: String(formData.pentacam?.od?.ttt || ""),
              ablationOD: String(formData.pentacam?.od?.ablation || ""),
              k1OS: String(formData.pentacam?.os?.k1 || ""),
              k2OS: String(formData.pentacam?.os?.k2 || ""),
              axisOS: String(formData.pentacam?.os?.axis || ""),
              thinnestPointOS: String(formData.pentacam?.os?.thinnest || ""),
              apexOS: String(formData.pentacam?.os?.apex || ""),
              residualOS: String(formData.pentacam?.os?.residual || ""),
              tttOS: String(formData.pentacam?.os?.ttt || ""),
              ablationOS: String(formData.pentacam?.os?.ablation || ""),
            });
          }

          // Replace the visit test request, including clearing it when empty.
          if (visitId) {
            const validTests = (formData.tests || []).filter(
              (id: any) => id !== undefined && id !== null,
            );
            const testItems = validTests.map((testId: number) => ({ testId }));
            await replaceTestRequestMutation.mutateAsync({
              patientId,
              visitId,
              items: testItems,
            });
          }

          // Replace the visit prescription, including clearing it when no items remain.
          if (visitId) {
            const validMeds = (formData.treatment || []).filter(
              (id: any) => id !== undefined && id !== null,
            );
            const prescriptionItems = validMeds.map((medId: number) => {
              const medication = medicationsQuery.data?.find(
                (m: any) => m.id === medId,
              );
              return {
                medicationId: medId,
                medicationName: medication?.name || `Med ${medId}`,
                ...(treatmentDetailsByMedicationId[medId] ?? {}),
              };
            });

            await replacePrescriptionWithItemsMutation.mutateAsync({
              patientId: patientId,
              visitId: visitId,
              notes: "Prescribed from medical file panel",
              items: prescriptionItems,
            });
          }

          setIsSaving(false);
        },
      },
    );
  };

  const printCurrentMedicalItems = (kind: "tests" | "treatment") => {
    const isTests = kind === "tests";
    const ids = isTests ? formData.tests || [] : formData.treatment || [];
    const prescriptionItems = !isTests
      ? ids
          .map((id: number) => {
            const item = medicationsQuery.data?.find(
              (entry: any) => entry.id === id,
            );
            const details = treatmentDetailsByMedicationId[id];
            const instructions = details
              ? [
                  details.dosage,
                  details.frequency,
                  details.duration,
                  details.instructions,
                ]
                  .filter(Boolean)
                  .join(" - ")
              : "";
            return `<div class="prescription-item"><div class="medication-name">${escapePrintText(item?.name || id)}</div>${instructions ? `<div class="medication-instructions">${escapePrintText(instructions)}</div>` : ""}</div>`;
          })
          .join("")
      : "";
    const testItems = isTests
      ? ids
          .map((id: number, index: number) => {
            const item = testsQuery.data?.find((entry: any) => entry.id === id);
            return `<div class="request-test-item"><b><span dir="ltr">${index + 1}.</span> ${escapePrintText(item?.name || id)}</b></div>`;
          })
          .join("")
      : "";
    const printableContent = isTests
      ? testItems
        ? `<div class="request-tests-list">${testItems}</div>`
        : '<div class="empty">لا توجد عناصر مسجلة</div>'
      : prescriptionItems
        ? `<div class="prescription"><div class="rx-mark">RX :</div>${prescriptionItems}</div>`
        : '<div class="empty">لا توجد عناصر مسجلة</div>';
    printDirectly(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${isTests ? "طلب تحاليل وأشعة" : "روشتة علاج"}</title><style>@page{size:A5;margin:0}*{box-sizing:border-box}body{width:132mm;margin:35mm auto 0;font-family:Arial,"Segoe UI",sans-serif;color:#111}.head{border-bottom:1px solid #17468f;padding-bottom:2.4mm;margin-bottom:3mm}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 5mm;font-size:9.5pt;line-height:1.25}.diagnosis{grid-column:1/-1;border-top:1px solid #d1d5db;padding-top:1.5mm;text-align:center}.request-tests-list{direction:ltr;text-align:left;margin-top:3mm;border:1px solid #e5e5e5;font-size:10pt;line-height:1.3}.request-test-item{padding:2.5mm 3.5mm;border-bottom:1px solid #e5e5e5;break-inside:avoid}.request-test-item:last-child{border-bottom:0}.prescription{margin-top:3mm;border:1px solid #e5e5e5;font-size:10pt;line-height:1.3}.rx-mark{direction:ltr;text-align:left;border-bottom:1px solid #e5e5e5;font-size:12pt;line-height:1.25;padding:2.5mm 2mm;font-weight:800}.prescription-item{display:block;min-height:11.3mm;padding:2.2mm 2mm;border-bottom:1px solid #e5e5e5;break-inside:avoid}.prescription-item:last-child{border-bottom:0}.medication-name{direction:ltr;text-align:left;font-size:9.8pt;line-height:1.25;font-weight:800;text-transform:uppercase}.medication-instructions{direction:rtl;text-align:right;margin-top:1mm;font-size:9pt;line-height:1.35;font-weight:700;white-space:pre-line}.empty{text-align:center;padding:8mm;color:#666}.sign{margin-top:12mm;border-top:1px solid #bbb;padding-top:3mm;font-size:9.5pt}</style></head><body><div class="head"><div class="meta"><div>الاسم: <b>${escapePrintText(patient?.fullName)}</b></div><div>الكود: <b>${escapePrintText(patient?.patientCode)}</b></div><div>التاريخ: <b>${escapePrintText(visitDate)}</b></div><div class="diagnosis">التشخيص: <b>${escapePrintText(formData.diagnosis)}</b></div></div></div>${printableContent}<div class="sign">توقيع الطبيب: ................................</div></body></html>`,
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = Math.abs(touchStartY.current - touchEndY);

    // Only consider it a horizontal swipe if vertical movement is minimal
    if (Math.abs(deltaX) > 50 && deltaY < 50) {
      const currentIndex = MEDICAL_TABS.indexOf(activeMedicalTab);

      if (deltaX > 0 && currentIndex < MEDICAL_TABS.length - 1) {
        // Swipe left -> next tab
        setActiveMedicalTab(MEDICAL_TABS[currentIndex + 1]);
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe right -> previous tab
        setActiveMedicalTab(MEDICAL_TABS[currentIndex - 1]);
      }
    }
  };

  const outerCls = embedded
    ? "relative z-0 w-full flex min-h-0 flex-1 flex-col"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4";
  const innerCls = embedded
    ? "flex min-h-[min(85vh,900px)] w-full max-h-[min(92vh,1000px)] flex-col rounded-lg border border-border/50 bg-background text-foreground shadow-sm min-h-0"
    : "flex h-[95vh] max-h-[95vh] w-full max-w-[960px] flex-col rounded-lg bg-background shadow-lg min-h-0";

  return (
    <div className={outerCls}>
      <div className={innerCls}>
        {/* Header */}
        <div
          data-impeccable-variants="c28c42c2"
          data-impeccable-variant-count="3"
          style={{ display: "contents" }}
        >
          {/* impeccable-variants-start c28c42c2 */}
          {/* Original */}
          <div data-impeccable-variant="original">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 flex-shrink-0">
              <h2 className="text-sm font-semibold truncate">
                {patientQuery.isLoading
                  ? "جاري التحميل..."
                  : (patient?.fullName ?? "بدون اسم")}
              </h2>
              {embedded ? (
                <span className="text-xs text-muted-foreground" aria-hidden />
              ) : (
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-muted-foreground bg-muted/60 transition-colors"
                  aria-label="إغلاق"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Variants: insert below this line */}
          {/* impeccable-variants-end c28c42c2 */}
        </div>

        {/* Followup + Exam selector */}
        <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-2 flex-shrink-0 flex-wrap">
          <label
            className={cn(
              "inline-flex items-center gap-2 rounded-md border border-warning/60 bg-warning/10/60 px-2.5 py-1.5 text-xs font-semibold text-warning",
              hubRo && "opacity-60",
            )}
          >
            <Checkbox
              checked={isFollowup}
              disabled={hubRo}
              onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
              className="h-4 w-4"
            />
            متابعه
          </label>
          {examinations && examinations.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">الفحص:</span>
              <Select
                value={String(selectedExaminationId || "")}
                onValueChange={(val) => handleSelectExamination(Number(val))}
              >
                <SelectTrigger className="h-7 w-[160px] text-xs">
                  <SelectValue placeholder="اختر فحص" />
                </SelectTrigger>
                <SelectContent>
                  {examinations.map((exam: any) => (
                    <SelectItem key={exam.id} value={String(exam.id)}>
                      {new Date(exam.createdAt).toLocaleDateString("ar-EG")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && !hubRo ? (
                <button
                  type="button"
                  disabled={!selectedExaminationId}
                  onClick={() => {
                    if (
                      selectedExaminationId &&
                      confirm("هل أنت متأكد من حذف هذه الزيارة؟")
                    ) {
                      deleteExaminationMutation.mutate({
                        examinationId: selectedExaminationId,
                      });
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40 transition-colors"
                  aria-label="حذف الفحص"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Section toggle */}
        {!workflowMeasurementsOnly && !workflowPlanOnly && (
          <div className="flex gap-1 border-b border-border/40 px-4 py-2 flex-shrink-0">
            {(["data", "plan", "images"] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setActiveMedicalTab(sec);
                  if (sec === "plan") setPlanEverActive(true);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  activeMedicalTab === sec
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted text-muted-foreground",
                )}
              >
                {sec === "data"
                  ? "القياسات والبيانات"
                  : sec === "plan"
                    ? "الخطة العلاجية"
                    : "صور التشخيص"}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-5"
          dir="rtl"
        >
          <div className={activeMedicalTab !== "data" ? "hidden" : undefined}>
            {examinations && examinations.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">تاريخ الزيارة</span>
                <Select
                  value={String(selectedExaminationId || "")}
                  onValueChange={(val) => handleSelectExamination(Number(val))}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs max-w-[200px]">
                    <SelectValue placeholder="اختر زيارة" />
                  </SelectTrigger>
                  <SelectContent>
                    {examinations.map((exam: any) => (
                      <SelectItem key={exam.id} value={String(exam.id)}>
                        {new Date(exam.createdAt).toLocaleDateString("ar-EG")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!workflowStackMeasurementViews ? (
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  عرض القياسات
                </span>
                <Select
                  value={autorefSectionTab}
                  onValueChange={setAutorefSectionTab}
                >
                  <SelectTrigger className="h-7 w-[180px] text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleMeasurementViews.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {/* AutoRef | IOP */}
            {showsMeasurementView("autoref") && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  AutoRef | IOP
                </h3>
                <div
                  className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
                  dir="ltr"
                >
                  <div className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                    <label className="font-medium text-xs">UCVA</label>
                    <RefractionValueSelect
                      value={formData.measurements?.autoref?.od?.ucva || ""}
                      onChange={(value) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          measurements: {
                            ...prev.measurements,
                            autoref: {
                              ...prev.measurements?.autoref,
                              od: {
                                ...prev.measurements?.autoref?.od,
                                ucva: value,
                              },
                            },
                          },
                        }))
                      }
                      options={UCVA_BCVA_OPTIONS}
                      placeholder="OD"
                      triggerClassName="h-8 w-full min-w-0 text-sm text-center"
                    />
                    <span className="text-muted-foreground">/</span>
                    <RefractionValueSelect
                      value={formData.measurements?.autoref?.os?.ucva || ""}
                      onChange={(value) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          measurements: {
                            ...prev.measurements,
                            autoref: {
                              ...prev.measurements?.autoref,
                              os: {
                                ...prev.measurements?.autoref?.os,
                                ucva: value,
                              },
                            },
                          },
                        }))
                      }
                      options={UCVA_BCVA_OPTIONS}
                      placeholder="OS"
                      triggerClassName="h-8 w-full min-w-0 text-sm text-center"
                    />
                  </div>
                  <div className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                    <label className="font-medium text-xs">IOP</label>
                    <RefractionValueSelect
                      value={formData.measurements?.iop?.od || ""}
                      onChange={(value) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          measurements: {
                            ...prev.measurements,
                            iop: { ...prev.measurements?.iop, od: value },
                          },
                        }))
                      }
                      options={IOP_OPTIONS}
                      placeholder="OD"
                      triggerClassName="h-8 w-full min-w-0 text-sm text-center"
                    />
                    <span className="text-muted-foreground">/</span>
                    <RefractionValueSelect
                      value={formData.measurements?.iop?.os || ""}
                      onChange={(value) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          measurements: {
                            ...prev.measurements,
                            iop: { ...prev.measurements?.iop, os: value },
                          },
                        }))
                      }
                      options={IOP_OPTIONS}
                      placeholder="OS"
                      triggerClassName="h-8 w-full min-w-0 text-sm text-center"
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    "hidden overflow-hidden rounded-lg border md:block",
                    workflowStackMeasurementViews && "mx-auto max-w-4xl",
                  )}
                >
                  <table
                    className={cn(
                      "w-full border-collapse text-center text-xs",
                      workflowStackMeasurementViews &&
                        "mx-auto max-w-4xl text-base [&_button]:!text-base [&_button_span]:!text-base [&_input]:!text-base [&_td]:!py-1 [&_td]:!text-base [&_th]:!py-1 [&_th]:!text-base",
                    )}
                    dir="ltr"
                  >
                    <thead className="bg-muted/50">
                      <tr>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          Eye
                        </th>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          S
                        </th>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          C
                        </th>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          Axis
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {["od", "os"].map((eye) => (
                        <tr key={eye} className="hover:bg-muted/20">
                          <td className="border px-2 py-1.5 font-bold text-[10px]">
                            {eye === "od" ? "OD" : "OS"}
                          </td>
                          <td className="border px-1 py-1">
                            <RefractionValueSelect
                              value={
                                formData.measurements?.autoref?.[
                                  eye as "od" | "os"
                                ]?.s || ""
                              }
                              onChange={(value) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  measurements: {
                                    ...prev.measurements,
                                    autoref: {
                                      ...prev.measurements?.autoref,
                                      [eye]: {
                                        ...prev.measurements?.autoref?.[
                                          eye as "od" | "os"
                                        ],
                                        s: value,
                                      },
                                    },
                                  },
                                }))
                              }
                              options={SPHERE_OPTIONS}
                              triggerClassName="h-6 w-full text-[10px] text-center border-input"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <RefractionValueSelect
                              value={
                                formData.measurements?.autoref?.[
                                  eye as "od" | "os"
                                ]?.c || ""
                              }
                              onChange={(value) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  measurements: {
                                    ...prev.measurements,
                                    autoref: {
                                      ...prev.measurements?.autoref,
                                      [eye]: {
                                        ...prev.measurements?.autoref?.[
                                          eye as "od" | "os"
                                        ],
                                        c: value,
                                      },
                                    },
                                  },
                                }))
                              }
                              options={CYLINDER_OPTIONS}
                              triggerClassName="h-6 w-full text-[10px] text-center border-input"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <Input
                              value={
                                formData.measurements?.autoref?.[
                                  eye as "od" | "os"
                                ]?.axis || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  measurements: {
                                    ...prev.measurements,
                                    autoref: {
                                      ...prev.measurements?.autoref,
                                      [eye]: {
                                        ...prev.measurements?.autoref?.[
                                          eye as "od" | "os"
                                        ],
                                        axis: e.target.value,
                                      },
                                    },
                                  },
                                }))
                              }
                              className="h-6 w-full text-[10px] text-center border-input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2" dir="ltr">
                  {["od", "os"].map((eye) => (
                    <div
                      key={`auto-m-${eye}`}
                      className="rounded-lg border p-2"
                    >
                      <div className="text-xs font-semibold mb-1.5">
                        {eye === "od" ? "OD" : "OS"}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <RefractionValueSelect
                          value={
                            formData.measurements?.autoref?.[eye as "od" | "os"]
                              ?.s || ""
                          }
                          onChange={(value) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                autoref: {
                                  ...prev.measurements?.autoref,
                                  [eye]: {
                                    ...prev.measurements?.autoref?.[
                                      eye as "od" | "os"
                                    ],
                                    s: value,
                                  },
                                },
                              },
                            }))
                          }
                          options={SPHERE_OPTIONS}
                          triggerClassName="h-8 w-full text-xs text-center border-input"
                        />
                        <RefractionValueSelect
                          value={
                            formData.measurements?.autoref?.[eye as "od" | "os"]
                              ?.c || ""
                          }
                          onChange={(value) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                autoref: {
                                  ...prev.measurements?.autoref,
                                  [eye]: {
                                    ...prev.measurements?.autoref?.[
                                      eye as "od" | "os"
                                    ],
                                    c: value,
                                  },
                                },
                              },
                            }))
                          }
                          options={CYLINDER_OPTIONS}
                          triggerClassName="h-8 w-full text-xs text-center border-input"
                        />
                        <Input
                          value={
                            formData.measurements?.autoref?.[eye as "od" | "os"]
                              ?.axis || ""
                          }
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                autoref: {
                                  ...prev.measurements?.autoref,
                                  [eye]: {
                                    ...prev.measurements?.autoref?.[
                                      eye as "od" | "os"
                                    ],
                                    axis: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                          className="h-8 text-xs text-center border-input col-span-2"
                          placeholder="Axis"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* After Refraction */}
            {showsMeasurementView("after") && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  After Refraction
                </h3>
                <div
                  className={cn(
                    "hidden overflow-hidden rounded-lg border md:block",
                    workflowStackMeasurementViews && "mx-auto max-w-4xl",
                  )}
                >
                  <table
                    className={cn(
                      "w-full border-collapse text-center text-xs",
                      workflowStackMeasurementViews &&
                        "mx-auto max-w-4xl text-base [&_button]:!text-base [&_button_span]:!text-base [&_input]:!text-base [&_td]:!py-1 [&_td]:!text-base [&_th]:!py-1 [&_th]:!text-base",
                    )}
                    dir="ltr"
                  >
                    <thead className="bg-muted/50">
                      <tr>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          Eye
                        </th>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          S
                        </th>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          C
                        </th>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          Axis
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {["od", "os"].map((eye) => (
                        <tr key={`after-${eye}`} className="hover:bg-muted/20">
                          <td className="border px-2 py-1.5 font-bold text-[10px]">
                            {eye === "od" ? "OD" : "OS"}
                          </td>
                          <td className="border px-1 py-1">
                            <RefractionValueSelect
                              value={
                                formData.measurements?.after?.[
                                  eye as "od" | "os"
                                ]?.s || ""
                              }
                              onChange={(value) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  measurements: {
                                    ...prev.measurements,
                                    after: {
                                      ...prev.measurements?.after,
                                      [eye]: {
                                        ...prev.measurements?.after?.[
                                          eye as "od" | "os"
                                        ],
                                        s: value,
                                      },
                                    },
                                  },
                                }))
                              }
                              options={SPHERE_OPTIONS}
                              triggerClassName="h-6 w-full text-[10px] text-center border-input"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <RefractionValueSelect
                              value={
                                formData.measurements?.after?.[
                                  eye as "od" | "os"
                                ]?.c || ""
                              }
                              onChange={(value) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  measurements: {
                                    ...prev.measurements,
                                    after: {
                                      ...prev.measurements?.after,
                                      [eye]: {
                                        ...prev.measurements?.after?.[
                                          eye as "od" | "os"
                                        ],
                                        c: value,
                                      },
                                    },
                                  },
                                }))
                              }
                              options={CYLINDER_OPTIONS}
                              triggerClassName="h-6 w-full text-[10px] text-center border-input"
                            />
                          </td>
                          <td className="border px-1 py-1">
                            <Input
                              value={
                                formData.measurements?.after?.[
                                  eye as "od" | "os"
                                ]?.axis || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  measurements: {
                                    ...prev.measurements,
                                    after: {
                                      ...prev.measurements?.after,
                                      [eye]: {
                                        ...prev.measurements?.after?.[
                                          eye as "od" | "os"
                                        ],
                                        axis: e.target.value,
                                      },
                                    },
                                  },
                                }))
                              }
                              className="h-6 w-full text-[10px] text-center border-input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2" dir="ltr">
                  {["od", "os"].map((eye) => (
                    <div
                      key={`after-m-${eye}`}
                      className="rounded-lg border p-2"
                    >
                      <div className="text-xs font-semibold mb-1.5">
                        {eye === "od" ? "OD" : "OS"}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <RefractionValueSelect
                          value={
                            formData.measurements?.after?.[eye as "od" | "os"]
                              ?.s || ""
                          }
                          onChange={(value) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                after: {
                                  ...prev.measurements?.after,
                                  [eye]: {
                                    ...prev.measurements?.after?.[
                                      eye as "od" | "os"
                                    ],
                                    s: value,
                                  },
                                },
                              },
                            }))
                          }
                          options={SPHERE_OPTIONS}
                          triggerClassName="h-8 w-full text-xs text-center border-input"
                        />
                        <RefractionValueSelect
                          value={
                            formData.measurements?.after?.[eye as "od" | "os"]
                              ?.c || ""
                          }
                          onChange={(value) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                after: {
                                  ...prev.measurements?.after,
                                  [eye]: {
                                    ...prev.measurements?.after?.[
                                      eye as "od" | "os"
                                    ],
                                    c: value,
                                  },
                                },
                              },
                            }))
                          }
                          options={CYLINDER_OPTIONS}
                          triggerClassName="h-8 w-full text-xs text-center border-input"
                        />
                        <Input
                          value={
                            formData.measurements?.after?.[eye as "od" | "os"]
                              ?.axis || ""
                          }
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                after: {
                                  ...prev.measurements?.after,
                                  [eye]: {
                                    ...prev.measurements?.after?.[
                                      eye as "od" | "os"
                                    ],
                                    axis: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                          className="h-8 text-xs text-center border-input col-span-2"
                          placeholder="Axis"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Glasses / Refraction */}
            {showsMeasurementView("refraction") && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Refraction
                </h3>
                <div className="flex items-center gap-2 mb-3" dir="ltr">
                  <label className="font-medium min-w-[42px] text-xs">
                    BCVA
                  </label>
                  <input
                    type="text"
                    placeholder="OD"
                    value={formData.measurements?.autoref?.od?.bcva || ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        measurements: {
                          ...prev.measurements,
                          autoref: {
                            ...prev.measurements?.autoref,
                            od: {
                              ...prev.measurements?.autoref?.od,
                              bcva: e.target.value,
                            },
                          },
                        },
                      }))
                    }
                    className="w-16 px-2 py-1 border rounded text-xs text-center"
                  />
                  <span className="text-muted-foreground">/</span>
                  <input
                    type="text"
                    placeholder="OS"
                    value={formData.measurements?.autoref?.os?.bcva || ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        measurements: {
                          ...prev.measurements,
                          autoref: {
                            ...prev.measurements?.autoref,
                            os: {
                              ...prev.measurements?.autoref?.os,
                              bcva: e.target.value,
                            },
                          },
                        },
                      }))
                    }
                    className="w-16 px-2 py-1 border rounded text-xs text-center"
                  />
                </div>
                <div
                  className={cn(
                    "hidden overflow-hidden rounded-lg border md:block",
                    workflowStackMeasurementViews && "mx-auto max-w-4xl",
                  )}
                >
                  <table
                    className={cn(
                      "w-full border-collapse text-center text-xs",
                      workflowStackMeasurementViews &&
                        "mx-auto max-w-4xl text-base [&_button]:!text-base [&_button_span]:!text-base [&_input]:!text-base [&_td]:!py-1 [&_td]:!text-base [&_th]:!py-1 [&_th]:!text-base",
                    )}
                    dir="ltr"
                  >
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          Eye
                        </th>
                        <th
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                          colSpan={3}
                        >
                          OD
                        </th>
                        <th
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                          colSpan={4}
                        >
                          OS
                        </th>
                      </tr>
                      <tr>
                        <th className="border px-2 py-1.5 text-[10px]"></th>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          S
                        </th>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          C
                        </th>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          Ax
                        </th>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          S
                        </th>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          C
                        </th>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          Ax
                        </th>
                        <th className="border px-2 py-1.5 font-semibold text-[10px]">
                          PD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-muted/20">
                        <td className="border px-2 py-1.5 font-bold text-[10px]">
                          Dis.
                        </td>
                        <td className="border px-1 py-1">
                          <RefractionValueSelect
                            value={refractionTableData.od.s}
                            onChange={(value) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                od: { ...prev.od, s: value },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                        <td className="border px-1 py-1">
                          <RefractionValueSelect
                            value={refractionTableData.od.c}
                            onChange={(value) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                od: { ...prev.od, c: value },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                        <td className="border px-1 py-1">
                          <Input
                            value={refractionTableData.od.a}
                            onChange={(e) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                od: { ...prev.od, a: e.target.value },
                              }))
                            }
                            className="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                        <td className="border px-1 py-1">
                          <RefractionValueSelect
                            value={refractionTableData.os.s}
                            onChange={(value) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                os: { ...prev.os, s: value },
                              }))
                            }
                            options={SPHERE_OPTIONS}
                            triggerClassName="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                        <td className="border px-1 py-1">
                          <RefractionValueSelect
                            value={refractionTableData.os.c}
                            onChange={(value) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                os: { ...prev.os, c: value },
                              }))
                            }
                            options={CYLINDER_OPTIONS}
                            triggerClassName="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                        <td className="border px-1 py-1">
                          <Input
                            value={refractionTableData.os.a}
                            onChange={(e) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                os: { ...prev.os, a: e.target.value },
                              }))
                            }
                            className="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                        <td className="border px-1 py-1">
                          <Input
                            value={refractionTableData.os.pd}
                            onChange={(e) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                os: { ...prev.os, pd: e.target.value },
                              }))
                            }
                            className="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="border px-2 py-1.5 font-bold text-[10px]">
                          Reading
                        </td>
                        <td className="border px-1 py-1" colSpan={7}>
                          <RefractionValueSelect
                            value={refractionTableData.od.add}
                            onChange={(value) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                od: { ...prev.od, add: value },
                                os: { ...prev.os, add: value },
                              }))
                            }
                            options={ADD_OPTIONS}
                            triggerClassName="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2" dir="ltr">
                  {[
                    { key: "od", label: "OD" },
                    { key: "os", label: "OS" },
                  ].map((row) => (
                    <div
                      key={`ref-m-${row.key}`}
                      className="rounded-lg border p-2"
                    >
                      <div className="text-xs font-semibold mb-1.5">
                        {row.label}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <RefractionValueSelect
                          value={
                            refractionTableData[row.key as "od" | "os"]?.s || ""
                          }
                          onChange={(value) =>
                            setRefractionTableData((prev: any) => ({
                              ...prev,
                              [row.key]: { ...prev[row.key], s: value },
                            }))
                          }
                          options={SPHERE_OPTIONS}
                          triggerClassName="h-8 w-full text-xs text-center border-input"
                        />
                        <RefractionValueSelect
                          value={
                            refractionTableData[row.key as "od" | "os"]?.c || ""
                          }
                          onChange={(value) =>
                            setRefractionTableData((prev: any) => ({
                              ...prev,
                              [row.key]: { ...prev[row.key], c: value },
                            }))
                          }
                          options={CYLINDER_OPTIONS}
                          triggerClassName="h-8 w-full text-xs text-center border-input"
                        />
                        <Input
                          value={
                            refractionTableData[row.key as "od" | "os"]?.a || ""
                          }
                          onChange={(e) =>
                            setRefractionTableData((prev: any) => ({
                              ...prev,
                              [row.key]: {
                                ...prev[row.key],
                                a: e.target.value,
                              },
                            }))
                          }
                          className="h-8 text-xs text-center border-input"
                          placeholder="Axis"
                        />
                        <Input
                          value={
                            refractionTableData[row.key as "od" | "os"]?.pd ||
                            ""
                          }
                          onChange={(e) =>
                            setRefractionTableData((prev: any) => ({
                              ...prev,
                              [row.key]: {
                                ...prev[row.key],
                                pd: e.target.value,
                              },
                            }))
                          }
                          className="h-8 text-xs text-center border-input"
                          placeholder="P.D."
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-1" dir="ltr">
                    <label className="text-xs font-medium min-w-[32px]">
                      Add
                    </label>
                    <RefractionValueSelect
                      value={refractionTableData.od?.add || ""}
                      onChange={(value) =>
                        setRefractionTableData((prev: any) => ({
                          ...prev,
                          od: { ...prev.od, add: value },
                          os: { ...prev.os, add: value },
                        }))
                      }
                      options={ADD_OPTIONS}
                      triggerClassName="h-8 flex-1 text-xs text-center border-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pentacam */}
            {showsMeasurementView("pentacam") && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pentacam
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-[10px]"
                    onClick={() =>
                      toast.info("البنتاكام", {
                        description: "عرض صور البنتاكام — قريباً",
                      })
                    }
                  >
                    <Eye className="h-3 w-3" /> عرض الصور
                  </Button>
                </div>
                <div
                  className={cn(
                    "hidden overflow-hidden rounded-lg border md:block",
                    workflowStackMeasurementViews && "mx-auto max-w-4xl",
                  )}
                >
                  <table
                    className={cn(
                      "w-full border-collapse text-center text-xs",
                      workflowStackMeasurementViews &&
                        "mx-auto max-w-4xl text-base [&_button]:!text-base [&_button_span]:!text-base [&_input]:!text-base [&_td]:!py-1 [&_td]:!text-base [&_th]:!py-1 [&_th]:!text-base",
                    )}
                    dir="ltr"
                  >
                    <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="border px-2 py-2">Eye</th>
                        <th className="border px-2 py-2">K1</th>
                        <th className="border px-2 py-2">K2</th>
                        <th className="border px-2 py-2">Axis</th>
                        <th className="border px-2 py-2">Thinnest</th>
                        <th className="border px-2 py-2">Apex</th>
                        <th className="border px-2 py-2">Residual</th>
                        <th className="border px-2 py-2">TTT</th>
                        <th className="border px-2 py-2">Ablation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["od", "os"].map((eye) => (
                        <tr key={`pc-${eye}`} className="hover:bg-muted/20">
                          <td className="border px-2 py-2 font-bold">
                            {eye === "od" ? "OD" : "OS"}
                          </td>
                          {(
                            [
                              "k1",
                              "k2",
                              "axis",
                              "thinnest",
                              "apex",
                              "residual",
                              "ttt",
                              "ablation",
                            ] as const
                          ).map((field) => (
                            <td key={field} className="border px-1 py-1">
                              <Input
                                type="number"
                                value={
                                  formData.pentacam?.[eye as "od" | "os"]?.[
                                    field
                                  ] || ""
                                }
                                onChange={(e) =>
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    pentacam: {
                                      ...prev.pentacam,
                                      [eye]: {
                                        ...prev.pentacam?.[eye as "od" | "os"],
                                        [field]: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                placeholder="—"
                                className="h-7 text-xs text-center border-input px-2"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2" dir="ltr">
                  {["od", "os"].map((eye) => (
                    <div key={`pc-m-${eye}`} className="rounded-lg border p-2">
                      <div className="text-xs font-semibold mb-1.5">
                        {eye === "od" ? "OD" : "OS"}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {(
                          [
                            "k1",
                            "k2",
                            "axis",
                            "thinnest",
                            "apex",
                            "residual",
                            "ttt",
                            "ablation",
                          ] as const
                        ).map((field) => (
                          <Input
                            key={field}
                            type="number"
                            value={
                              formData.pentacam?.[eye as "od" | "os"]?.[
                                field
                              ] || ""
                            }
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: {
                                  ...prev.pentacam,
                                  [eye]: {
                                    ...prev.pentacam?.[eye as "od" | "os"],
                                    [field]: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder={field}
                            className="h-8 text-xs text-center border-input"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fundus (collapsible) */}
            {showsMeasurementView("fundus") && (
              <div>
                <button
                  type="button"
                  onClick={() => setFundusOpen((p) => !p)}
                  className="flex w-full items-center justify-between mb-2"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Fundus Examination
                  </h3>
                  <CollapsibleChevron open={fundusOpen} />
                </button>
                {fundusOpen && (
                  <>
                    <div
                      className={cn(
                        "hidden overflow-hidden rounded-lg border md:block",
                        workflowStackMeasurementViews && "mx-auto max-w-4xl",
                      )}
                    >
                      <table
                        className={cn(
                          "w-full border-collapse text-center text-xs",
                          workflowStackMeasurementViews &&
                            "mx-auto max-w-4xl text-base [&_button]:!text-base [&_button_span]:!text-base [&_input]:!text-base [&_td]:!py-1 [&_td]:!text-base [&_th]:!py-1 [&_th]:!text-base",
                        )}
                        dir="ltr"
                      >
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="border px-2 py-1.5 font-semibold text-[10px]">
                              Eye
                            </th>
                            <th className="border px-2 py-1.5 font-semibold text-[10px]">
                              Disc
                            </th>
                            <th className="border px-2 py-1.5 font-semibold text-[10px]">
                              C/D
                            </th>
                            <th className="border px-2 py-1.5 font-semibold text-[10px]">
                              Macula
                            </th>
                            <th className="border px-2 py-1.5 font-semibold text-[10px]">
                              Vessels
                            </th>
                            <th className="border px-2 py-1.5 font-semibold text-[10px]">
                              Other
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {["od", "os"].map((eye) => (
                            <tr key={`fu-${eye}`} className="hover:bg-muted/20">
                              <td className="border px-2 py-1.5 font-bold text-[10px]">
                                {eye === "od" ? "OD" : "OS"}
                              </td>
                              <td className="border px-1 py-1">
                                <Input
                                  value={
                                    formData.fundus?.[eye as "od" | "os"]
                                      ?.discStatus || ""
                                  }
                                  onChange={(e) =>
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      fundus: {
                                        ...prev.fundus,
                                        [eye]: {
                                          ...prev.fundus?.[eye as "od" | "os"],
                                          discStatus: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  placeholder="Normal"
                                  className="h-6 w-full text-[10px] text-center border-input"
                                />
                              </td>
                              <td className="border px-1 py-1">
                                <Input
                                  value={
                                    formData.fundus?.[eye as "od" | "os"]
                                      ?.cupDiscRatio || ""
                                  }
                                  onChange={(e) =>
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      fundus: {
                                        ...prev.fundus,
                                        [eye]: {
                                          ...prev.fundus?.[eye as "od" | "os"],
                                          cupDiscRatio: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  placeholder="0.3"
                                  className="h-6 w-full text-[10px] text-center border-input"
                                />
                              </td>
                              <td className="border px-1 py-1">
                                <Input
                                  value={
                                    formData.fundus?.[eye as "od" | "os"]
                                      ?.macuaStatus || ""
                                  }
                                  onChange={(e) =>
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      fundus: {
                                        ...prev.fundus,
                                        [eye]: {
                                          ...prev.fundus?.[eye as "od" | "os"],
                                          macuaStatus: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  placeholder="Normal"
                                  className="h-6 w-full text-[10px] text-center border-input"
                                />
                              </td>
                              <td className="border px-1 py-1">
                                <Input
                                  value={
                                    formData.fundus?.[eye as "od" | "os"]
                                      ?.vesselStatus || ""
                                  }
                                  onChange={(e) =>
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      fundus: {
                                        ...prev.fundus,
                                        [eye]: {
                                          ...prev.fundus?.[eye as "od" | "os"],
                                          vesselStatus: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  placeholder="Normal"
                                  className="h-6 w-full text-[10px] text-center border-input"
                                />
                              </td>
                              <td className="border px-1 py-1">
                                <Input
                                  value={
                                    formData.fundus?.[eye as "od" | "os"]
                                      ?.otherFindings || ""
                                  }
                                  onChange={(e) =>
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      fundus: {
                                        ...prev.fundus,
                                        [eye]: {
                                          ...prev.fundus?.[eye as "od" | "os"],
                                          otherFindings: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  placeholder="—"
                                  className="h-6 w-full text-[10px] text-center border-input"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-2" dir="ltr">
                      {["od", "os"].map((eye) => (
                        <div
                          key={`fu-m-${eye}`}
                          className="rounded-lg border p-2"
                        >
                          <div className="text-xs font-semibold mb-1.5">
                            {eye === "od" ? "OD" : "OS"}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            <Input
                              value={
                                formData.fundus?.[eye as "od" | "os"]
                                  ?.discStatus || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  fundus: {
                                    ...prev.fundus,
                                    [eye]: {
                                      ...prev.fundus?.[eye as "od" | "os"],
                                      discStatus: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="Disc"
                              className="h-8 text-xs text-center border-input"
                            />
                            <Input
                              value={
                                formData.fundus?.[eye as "od" | "os"]
                                  ?.cupDiscRatio || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  fundus: {
                                    ...prev.fundus,
                                    [eye]: {
                                      ...prev.fundus?.[eye as "od" | "os"],
                                      cupDiscRatio: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="C/D"
                              className="h-8 text-xs text-center border-input"
                            />
                            <Input
                              value={
                                formData.fundus?.[eye as "od" | "os"]
                                  ?.macuaStatus || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  fundus: {
                                    ...prev.fundus,
                                    [eye]: {
                                      ...prev.fundus?.[eye as "od" | "os"],
                                      macuaStatus: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="Macula"
                              className="h-8 text-xs text-center border-input"
                            />
                            <Input
                              value={
                                formData.fundus?.[eye as "od" | "os"]
                                  ?.vesselStatus || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  fundus: {
                                    ...prev.fundus,
                                    [eye]: {
                                      ...prev.fundus?.[eye as "od" | "os"],
                                      vesselStatus: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="Vessels"
                              className="h-8 text-xs text-center border-input"
                            />
                            <Input
                              value={
                                formData.fundus?.[eye as "od" | "os"]
                                  ?.otherFindings || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  fundus: {
                                    ...prev.fundus,
                                    [eye]: {
                                      ...prev.fundus?.[eye as "od" | "os"],
                                      otherFindings: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="Other"
                              className="h-8 text-xs text-center border-input col-span-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {planEverActive && (
            <div
              className={cn(
                "text-base [&_h3]:!text-base [&_label]:!text-base [&_input]:!text-base [&_textarea]:!text-base [&_button]:!text-sm",
                activeMedicalTab !== "plan" && "hidden",
              )}
            >
              {/* Patient profile */}
              {!workflowPlanOnly && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      الاسم
                    </Label>
                    <Input
                      value={patient?.fullName ?? ""}
                      disabled
                      className="mt-0.5 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      السن
                    </Label>
                    <Input
                      value={patient?.age ?? ""}
                      disabled
                      className="mt-0.5 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      تاريخ الفحص
                    </Label>
                    <DateInput
                      value={examinationDate}
                      disabled
                      className="mt-0.5 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      تاريخ الزيارة
                    </Label>
                    <DateInput
                      value={visitDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setVisitDate(v);
                        onHubVisitDateChange?.(v);
                      }}
                      className="mt-0.5 text-xs h-8"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {/* Complaint & Symptoms */}
                {!workflowPlanOnly && (
                  <div className="flex flex-col rounded-md border border-border/60 p-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      الشكوى و الاعراض
                    </h3>
                    <Textarea
                      value={formData.medicalHistory}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          medicalHistory: e.target.value,
                        }))
                      }
                      placeholder="اكتب الشكوى و الاعراض هنا..."
                      className="order-3 min-h-[120px] text-sm"
                      rows={5}
                    />
                    <div className="relative order-1 mb-2 ml-auto w-full md:w-80">
                      <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن الأعراض..."
                        value={symptomSearchText}
                        onChange={(e) => setSymptomSearchText(e.target.value)}
                        className="h-10 pr-8 text-xs"
                      />
                    </div>
                    {symptomSearchText && (
                      <>
                        {symptomsQuery.isLoading ? (
                          <p className="order-2 text-xs text-muted-foreground mt-1">
                            جاري التحميل...
                          </p>
                        ) : symptomsQuery.isError ? (
                          <p className="order-2 text-xs text-destructive mt-1">
                            خطأ في تحميل الأعراض
                          </p>
                        ) : (
                          <div className="order-2 space-y-1 max-h-[160px] overflow-y-auto border rounded-md p-1.5 mt-1">
                            {(symptomsQuery.data ?? []).filter((symptom: any) =>
                              symptom.name
                                .toLowerCase()
                                .includes(symptomSearchText.toLowerCase()),
                            ).length === 0 ? (
                              <p className="text-xs text-muted-foreground px-1.5">
                                لا توجد نتائج
                              </p>
                            ) : (
                              (symptomsQuery.data ?? [])
                                .filter((symptom: any) =>
                                  symptom.name
                                    .toLowerCase()
                                    .includes(symptomSearchText.toLowerCase()),
                                )
                                .map((symptom: any) => (
                                  <button
                                    type="button"
                                    key={symptom.id}
                                    className="block w-full rounded px-1.5 py-1 text-left text-xs hover:bg-muted/50"
                                    onClick={() => {
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        medicalHistory: prev.medicalHistory
                                          ? `${prev.medicalHistory}, ${symptom.name}`
                                          : symptom.name,
                                      }));
                                      setSymptomSearchText("");
                                    }}
                                  >
                                    {symptom.name}
                                  </button>
                                ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Diagnosis + Diseases */}
                <div
                  className="flex flex-col rounded-lg border border-[#c3c6d6] bg-[#f8f9fb] px-3 pb-3 pt-0 text-left text-[#1f2937]"
                  dir="ltr"
                >
                  <p className="mb-2 !text-[13px] font-bold text-[#003d9b]">
                    Diagnosis:
                  </p>
                  <Textarea
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        diagnosis: e.target.value,
                      }))
                    }
                    placeholder="اكتب التشخيص يدويًا أو ابحث بالأسفل..."
                    className="min-h-[48px] w-full rounded-md border-[#c3c6d6] bg-white px-2 py-1 !text-[12px] print:placeholder-transparent"
                    rows={2}
                  />
                  <div className="relative mt-2 w-full">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن التشخيص..."
                      value={diseaseSearchText}
                      onChange={(e) => setDiseaseSearchText(e.target.value)}
                      className="h-8 w-full rounded-md border-[#c3c6d6] bg-white pl-7 pr-2 !text-[12px]"
                    />
                  </div>
                  {diseaseSearchText && (
                    <>
                      {diseasesQuery.isLoading ? (
                        <p className="text-xs text-muted-foreground">
                          جاري التحميل...
                        </p>
                      ) : diseasesQuery.isError ? (
                        <p className="text-xs text-destructive">
                          خطأ في تحميل الأمراض
                        </p>
                      ) : (
                        <div className="mb-2 max-h-[160px] space-y-1 overflow-y-auto rounded-md border p-1.5">
                          {(diseasesQuery.data ?? []).filter((disease: any) =>
                            disease.name
                              .toLowerCase()
                              .includes(diseaseSearchText.toLowerCase()),
                          ).length === 0 ? (
                            <p className="text-xs text-muted-foreground px-1.5">
                              لا توجد نتائج
                            </p>
                          ) : (
                            (diseasesQuery.data ?? [])
                              .filter((disease: any) =>
                                disease.name
                                  .toLowerCase()
                                  .includes(diseaseSearchText.toLowerCase()),
                              )
                              .map((disease: any) => (
                                <button
                                  type="button"
                                  key={disease.id}
                                  className="block w-full rounded px-1.5 py-1 text-left text-xs hover:bg-muted/50"
                                  onClick={() => {
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      diagnosis: prev.diagnosis
                                        ? `${prev.diagnosis}, ${disease.name}`
                                        : disease.name,
                                      diseases: (prev.diseases || []).includes(
                                        disease.id,
                                      )
                                        ? prev.diseases
                                        : [
                                            ...(prev.diseases || []),
                                            disease.id,
                                          ],
                                    }));
                                    setDiseaseSearchText("");
                                  }}
                                >
                                  {disease.name}
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {workflowPlanOnly && (
                  <div
                    className="flex flex-col rounded-lg border border-[#c3c6d6] bg-[#f8f9fb] px-3 pb-3 pt-0 text-left text-[#1f2937]"
                    dir="ltr"
                  >
                    <p className="mb-2 !text-[13px] font-bold text-[#003d9b]">
                      Recommendations:
                    </p>
                    <Textarea
                      value={formData.recommendations}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          recommendations: e.target.value,
                        }))
                      }
                      placeholder="اكتب التوصيات هنا..."
                      className="min-h-[48px] w-full flex-1 rounded-md border-[#c3c6d6] bg-white px-2 py-1 !text-[12px] print:placeholder-transparent"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {!workflowPlanOnly && (
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                  {/* Investigations */}
                  <div className="flex flex-col rounded-md border border-border/60 p-3">
                    <div className="order-0 mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        التحاليل و الأشعة
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => printCurrentMedicalItems("tests")}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        طباعة
                      </Button>
                    </div>
                    <div className="relative order-2 mb-2 ml-auto w-full md:w-80">
                      <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن الفحوصات..."
                        value={testSearchText}
                        onChange={(e) => setTestSearchText(e.target.value)}
                        className="h-10 pr-8 text-xs"
                      />
                    </div>
                    {testSearchText && (
                      <>
                        {testsQuery.isLoading ? (
                          <p className="order-3 text-xs text-muted-foreground">
                            جاري التحميل...
                          </p>
                        ) : testsQuery.isError ? (
                          <p className="order-3 text-xs text-destructive">
                            خطأ في تحميل الفحوصات
                          </p>
                        ) : (
                          <div className="order-3 space-y-1 max-h-[160px] overflow-y-auto border rounded-md p-1.5">
                            {(testsQuery.data ?? []).filter((test: any) =>
                              test.name
                                .toLowerCase()
                                .includes(testSearchText.toLowerCase()),
                            ).length === 0 ? (
                              <p className="text-xs text-muted-foreground px-1.5">
                                لا توجد نتائج
                              </p>
                            ) : (
                              (testsQuery.data ?? [])
                                .filter((test: any) =>
                                  test.name
                                    .toLowerCase()
                                    .includes(testSearchText.toLowerCase()),
                                )
                                .map((test: any) => (
                                  <label
                                    key={test.id}
                                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                                  >
                                    <Checkbox
                                      id={`test-${test.id}`}
                                      checked={(formData.tests || []).includes(
                                        test.id,
                                      )}
                                      onCheckedChange={() =>
                                        toggleCheckbox("tests", test.id)
                                      }
                                    />
                                    <span className="flex-1">{test.name}</span>
                                  </label>
                                ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {(formData.tests || []).length > 0 && (
                      <div className="order-4 mt-2 flex flex-wrap gap-1.5">
                        {(formData.tests || []).map((testId: number) => {
                          const test = testsQuery.data?.find(
                            (t: any) => t.id === testId,
                          );
                          return (
                            <span
                              key={testId}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px]"
                            >
                              {test?.name || `Test ${testId}`}
                              <button
                                type="button"
                                onClick={() => toggleCheckbox("tests", testId)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {testRequestsQuery.data &&
                      Object.keys(testRequestsQuery.data).length > 0 && (
                        <div className="order-1 mb-2">
                          <span className="text-[10px] text-muted-foreground">
                            قوالب:
                          </span>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {TEST_READY_TABS.map((tab) => {
                              const templatesInTab = Object.entries(
                                testRequestsQuery.data || {},
                              ).filter(
                                ([templateId, template]: [string, any]) =>
                                  getTestTemplateCategory(
                                    template.name || templateId,
                                  ) === tab,
                              );
                              if (templatesInTab.length === 0) return null;
                              return (
                                <DropdownMenu key={tab}>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="rounded-md border border-input bg-transparent px-2.5 py-1 text-[10px] hover:bg-muted/60 transition-colors flex items-center gap-1 font-medium text-[#1e3a66]"
                                    >
                                      <span>{tab}</span>
                                      <ChevronDown className="h-3 w-3 opacity-70" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    className="max-h-[300px] overflow-y-auto min-w-[160px]"
                                  >
                                    {templatesInTab.map(
                                      ([templateId, template]: [
                                        string,
                                        any,
                                      ]) => (
                                        <DropdownMenuItem
                                          key={templateId}
                                          className="text-right text-xs cursor-pointer hover:bg-muted/50 pr-4 py-2"
                                          onClick={() => {
                                            setSelectedTestRequestId(
                                              templateId,
                                            );
                                          }}
                                        >
                                          {getTemplateDisplayName(
                                            templateId,
                                            template.name || templateId,
                                            testRequestsQuery.data,
                                          )}
                                        </DropdownMenuItem>
                                      ),
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Treatment / Medications */}
                  <div className="flex flex-col rounded-md border border-border/60 p-3">
                    <div className="order-0 mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        العلاج
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => printCurrentMedicalItems("treatment")}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        طباعة
                      </Button>
                    </div>
                    <div className="relative order-2 mb-2 ml-auto w-full md:w-80">
                      <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن الأدوية..."
                        value={medicationSearchText}
                        onChange={(e) =>
                          setMedicationSearchText(e.target.value)
                        }
                        className="h-10 pr-8 text-xs"
                      />
                    </div>
                    {medicationSearchText && (
                      <>
                        {medicationsQuery.isLoading ? (
                          <p className="order-3 text-xs text-muted-foreground">
                            جاري التحميل...
                          </p>
                        ) : medicationsQuery.isError ? (
                          <p className="order-3 text-xs text-destructive">
                            خطأ في تحميل العلاجات
                          </p>
                        ) : (
                          <div className="order-3 space-y-1 max-h-[160px] overflow-y-auto border rounded-md p-1.5">
                            {(medicationsQuery.data ?? []).filter((med: any) =>
                              med.name
                                .toLowerCase()
                                .includes(medicationSearchText.toLowerCase()),
                            ).length === 0 ? (
                              <p className="text-xs text-muted-foreground px-1.5">
                                لا توجد نتائج
                              </p>
                            ) : (
                              (medicationsQuery.data ?? [])
                                .filter((med: any) =>
                                  med.name
                                    .toLowerCase()
                                    .includes(
                                      medicationSearchText.toLowerCase(),
                                    ),
                                )
                                .map((med: any) => (
                                  <label
                                    key={med.id}
                                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                                  >
                                    <Checkbox
                                      id={`med-${med.id}`}
                                      checked={(
                                        formData.treatment || []
                                      ).includes(med.id)}
                                      onCheckedChange={() =>
                                        toggleCheckbox("treatment", med.id)
                                      }
                                    />
                                    <span className="flex-1">{med.name}</span>
                                  </label>
                                ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {(formData.treatment || []).length > 0 && (
                      <div className="order-4 mt-2 flex flex-wrap gap-1.5">
                        {(formData.treatment || []).map((medId: number) => {
                          const medication = medicationsQuery.data?.find(
                            (m: any) => m.id === medId,
                          );
                          const details = treatmentDetailsByMedicationId[medId];
                          const detailsText = [
                            details?.dosage,
                            details?.frequency,
                            details?.duration,
                            details?.instructions,
                          ]
                            .filter(Boolean)
                            .join(" • ");
                          return (
                            <span
                              key={medId}
                              className="inline-flex max-w-full items-start gap-1 rounded-md bg-primary/8 px-2 py-1 text-[10px]"
                            >
                              <span className="min-w-0">
                                <span className="block font-medium">
                                  {medication?.name || `Med ${medId}`}
                                </span>
                                {detailsText && (
                                  <span className="mt-0.5 block whitespace-pre-wrap text-muted-foreground">
                                    {detailsText}
                                  </span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleCheckbox("treatment", medId)
                                }
                                className="text-muted-foreground hover:text-destructive"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {prescriptionsQuery.data &&
                      Object.keys(prescriptionsQuery.data).length > 0 && (
                        <div className="order-1 mb-2">
                          <span className="text-[10px] text-muted-foreground">
                            وصفات جاهزة:
                          </span>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {READY_TABS.map((tab) => {
                              const templatesInTab = Object.entries(
                                prescriptionsQuery.data || {},
                              ).filter(
                                ([templateId, template]: [string, any]) =>
                                  getTemplateCategory(
                                    template.name || templateId,
                                  ) === tab,
                              );
                              if (templatesInTab.length === 0) return null;
                              return (
                                <DropdownMenu key={tab}>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="rounded-md border border-input bg-transparent px-2.5 py-1 text-[10px] hover:bg-muted/60 transition-colors flex items-center gap-1 font-medium text-[#1e3a66]"
                                    >
                                      <span>{tab}</span>
                                      <ChevronDown className="h-3 w-3 opacity-70" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    className="max-h-[300px] overflow-y-auto min-w-[160px]"
                                  >
                                    {templatesInTab.map(
                                      ([templateId, template]: [
                                        string,
                                        any,
                                      ]) => (
                                        <DropdownMenuItem
                                          key={templateId}
                                          className="text-right text-xs cursor-pointer hover:bg-muted/50 pr-4 py-2"
                                          onClick={() => {
                                            setSelectedPrescriptionIds([
                                              templateId,
                                            ]);
                                          }}
                                        >
                                          {getTemplateDisplayName(
                                            templateId,
                                            template.name || templateId,
                                            prescriptionsQuery.data,
                                          )}
                                        </DropdownMenuItem>
                                      ),
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {!workflowPlanOnly && (
                <div className="rounded-md border border-border/60 p-3">
                  <Label className="text-xs font-medium mb-1.5 block">
                    التوصيات
                  </Label>
                  <Textarea
                    value={formData.recommendations}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        recommendations: e.target.value,
                      }))
                    }
                    placeholder="أدخل التوصيات..."
                    className="text-sm"
                    rows={3}
                  />
                </div>
              )}

              {workflowPlanOnly && (
                <div className="rounded-md border border-border/60 p-3">
                  <Label className="mb-3 block text-sm font-semibold">
                    صور التشخيص
                  </Label>
                  <DiagnosisImagesPanel
                    patientId={patientId}
                    readOnly={hubRo}
                  />
                </div>
              )}
            </div>
          )}

          {activeMedicalTab === "images" && (
            <DiagnosisImagesPanel patientId={patientId} readOnly={hubRo} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          {!hubRo ? (
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "جاري الحفظ..." : "حفظ"}
            </Button>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              {patientHubViewOnlyHint}
            </span>
          )}
          {!embedded ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={dismiss}
            >
              إغلاق
            </Button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
