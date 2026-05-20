import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
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
import { Eye, Search, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RefractionValueSelect from "./RefractionValueSelect";
import {
  SPHERE_OPTIONS,
  CYLINDER_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";
import { cn } from "@/lib/utils";

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
  onHubVisitDateChange?: (isoDate: string) => void;
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
const MEDICAL_TABS = ["data", "plan"];
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

export default function MedicalFilePanel({
  patientId,
  onClose,
  embedded = false,
  patientHubReadOnly = false,
  patientHubViewOnlyHint = "العرض فقط داخل المركز",
  hubVisitDate,
  hubVisitId,
  onHubVisitDateChange,
}: MedicalFilePanelProps) {
  const dismiss = onClose ?? (() => {});
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const hubRo = Boolean(patientHubReadOnly);
  const queryClient = useQueryClient();
  const [activeMedicalTab, setActiveMedicalTab] = useState("data");
  const [planEverActive, setPlanEverActive] = useState(false);
  const [fundusOpen, setFundusOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [formData, setFormData] = useState<any>({
    medicalHistory: "",
    measurements: {
      autoref: {
        od: { s: "", c: "", axis: "", ucva: "", bcva: "" },
        os: { s: "", c: "", axis: "", ucva: "", bcva: "" },
      },
      iop: { od: "", os: "" },
      after: { od: { s: "", c: "", axis: "" }, os: { s: "", c: "", axis: "" } },
    },
    glasses: {
      od: { s: "", c: "", axis: "", pd: "", bcva: "" },
      os: { s: "", c: "", axis: "", pd: "", bcva: "" },
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
    od: { s: "", c: "", a: "", pd: "" },
    os: { s: "", c: "", a: "", pd: "" },
  });
  const [testSearchText, setTestSearchText] = useState("");
  const [diseaseSearchText, setDiseaseSearchText] = useState("");
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
  const [autorefSectionTab, setAutorefSectionTab] = useState("all");

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
        (e) => Number((e as { visitId?: unknown }).visitId) === hubVisitId,
      );
      if (matchByVisit?.id != null) {
        setSelectedExaminationId((prev) =>
          prev === matchByVisit.id ? prev : matchByVisit.id,
        );
        return;
      }
    }
    if (!hubVisitDate) return;
    const match = examinations.find((e) => {
      const created = (e as { createdAt?: Date | string }).createdAt;
      const key = created ? new Date(created).toISOString().split("T")[0] : "";
      return key === hubVisitDate;
    });
    if (match?.id != null) {
      setSelectedExaminationId((prev) => (prev === match.id ? prev : match.id));
    }
  }, [embedded, hubVisitId, hubVisitDate, examinations]);

  // Get the latest visit for this patient
  const patientVisit = (visitsQuery.data as any)?.find(
    (v: any) => v.patientId === patientId,
  );

  // Load examination data when selected - MUST BE BEFORE pentacamQuery
  const selectedExamination = examinations.find(
    (e: any) => e.id === selectedExaminationId,
  );

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

      setFormData((prev: any) => {
        // Only override tests/treatment if we actually loaded data from the visit
        // Otherwise preserve what the user entered for a new exam
        const finalTests = testIds.length > 0 ? testIds : prev.tests;
        const finalTreatment =
          prescriptionMedIds.length > 0 ? prescriptionMedIds : prev.treatment;

        return {
          ...prev,
          measurements: {
            autoref: { od: autorefOD, os: autorefOS },
            iop: {
              od: selectedExamination.iopOD || "",
              os: selectedExamination.iopOS || "",
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
          diagnosis: doctorReport?.diagnosis || "",
          recommendations:
            doctorReport?.clinicalOpinion ||
            doctorReport?.recommendations ||
            "",
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
      const flattenedUpdates: any = {
        sphereOD: formData.measurements?.autoref?.od?.s || null,
        sphereOS: formData.measurements?.autoref?.os?.s || null,
        cylinderOD: formData.measurements?.autoref?.od?.c || null,
        cylinderOS: formData.measurements?.autoref?.os?.c || null,
        axisOD: formData.measurements?.autoref?.od?.axis || null,
        axisOS: formData.measurements?.autoref?.os?.axis || null,
        ucvaOD: formData.measurements?.autoref?.od?.ucva || null,
        ucvaOS: formData.measurements?.autoref?.os?.ucva || null,
        bcvaOD: formData.measurements?.autoref?.od?.bcva || null,
        bcvaOS: formData.measurements?.autoref?.os?.bcva || null,
        iopOD: formData.measurements?.iop?.od || null,
        iopOS: formData.measurements?.iop?.os || null,
        glassesData: JSON.stringify({
          od: {
            s:
              refractionTableData.od?.s ||
              formData.measurements?.autoref?.od?.s ||
              "",
            c:
              refractionTableData.od?.c ||
              formData.measurements?.autoref?.od?.c ||
              "",
            axis:
              refractionTableData.od?.a ||
              formData.measurements?.autoref?.od?.axis ||
              "",
            pd: refractionTableData.od?.pd || "",
            bcva: formData.measurements?.autoref?.od?.bcva || "",
          },
          os: {
            s:
              refractionTableData.os?.s ||
              formData.measurements?.autoref?.os?.s ||
              "",
            c:
              refractionTableData.os?.c ||
              formData.measurements?.autoref?.os?.c ||
              "",
            axis:
              refractionTableData.os?.a ||
              formData.measurements?.autoref?.os?.axis ||
              "",
            pd: refractionTableData.os?.pd || "",
            bcva: formData.measurements?.autoref?.os?.bcva || "",
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
              od: formData.measurements?.after?.od,
              os: formData.measurements?.after?.os,
            });
            const doctorReport = (doctorReportQuery.data as any)?.[0];
            if (doctorReport?.id) {
              updateDoctorReportMutation.mutate({
                reportId: doctorReport.id,
                diagnosis: formData.diagnosis || "",
                clinicalOpinion:
                  formData.recommendations || formData.medicalHistory || "",
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
      setFormData((prev: any) => ({
        ...prev,
        treatment: Array.from(
          new Set([...(prev.treatment || []), ...Array.from(allMedIds)]),
        ),
      }));
      toast.success(`تم إضافة ${allMedIds.size} دواء من القوالب`);
      setSelectedPrescriptionIds([]);
    }
  }, [selectedPrescriptionIds, prescriptionsQuery.data]);

  // Mutation for updating examination
  const updateExaminationMutation = trpc.medical.updateExamination.useMutation({
    onSuccess: () => {
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
            };
          });
          createPrescriptionWithItemsMutation.mutate({
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
    const glassesData = {
      od: {
        s: refractionTableData.od?.s || "",
        c: refractionTableData.od?.c || "",
        axis: refractionTableData.od?.a || "",
        pd: refractionTableData.od?.pd || "",
        bcva: formData.measurements?.autoref?.od?.bcva || "",
      },
      os: {
        s: refractionTableData.os?.s || "",
        c: refractionTableData.os?.c || "",
        axis: refractionTableData.os?.a || "",
        pd: refractionTableData.os?.pd || "",
        bcva: formData.measurements?.autoref?.os?.bcva || "",
      },
    };

    // Create a new visit when there are no exams OR when exams exist but none is selected.
    if (examinations.length === 0 || !selectedExaminationId) {
      setIsSaving(true);

      saveMedicalVisitMutation.mutate({
        patientId: patientId,
        visitDate: new Date().toISOString().split("T")[0],
        isFollowup: isFollowup,
        autoref: formData.measurements?.autoref,
        iop: formData.measurements?.iop,
        after: formData.measurements?.after,
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
    const flattenedUpdates: any = {
      sphereOD: formData.measurements?.autoref?.od?.s || null,
      sphereOS: formData.measurements?.autoref?.os?.s || null,
      cylinderOD: formData.measurements?.autoref?.od?.c || null,
      cylinderOS: formData.measurements?.autoref?.os?.c || null,
      axisOD: formData.measurements?.autoref?.od?.axis || null,
      axisOS: formData.measurements?.autoref?.os?.axis || null,
      ucvaOD: formData.measurements?.autoref?.od?.ucva || null,
      ucvaOS: formData.measurements?.autoref?.os?.ucva || null,
      bcvaOD: formData.measurements?.autoref?.od?.bcva || null,
      bcvaOS: formData.measurements?.autoref?.os?.bcva || null,
      iopOD: formData.measurements?.iop?.od || null,
      iopOS: formData.measurements?.iop?.os || null,
      glassesData: JSON.stringify({
        od: {
          s:
            refractionTableData.od?.s ||
            formData.measurements?.autoref?.od?.s ||
            "",
          c:
            refractionTableData.od?.c ||
            formData.measurements?.autoref?.od?.c ||
            "",
          axis:
            refractionTableData.od?.a ||
            formData.measurements?.autoref?.od?.axis ||
            "",
          pd: refractionTableData.od?.pd || "",
          bcva: formData.measurements?.autoref?.od?.bcva || "",
        },
        os: {
          s:
            refractionTableData.os?.s ||
            formData.measurements?.autoref?.os?.s ||
            "",
          c:
            refractionTableData.os?.c ||
            formData.measurements?.autoref?.os?.c ||
            "",
          axis:
            refractionTableData.os?.a ||
            formData.measurements?.autoref?.os?.axis ||
            "",
          pd: refractionTableData.os?.pd || "",
          bcva: formData.measurements?.autoref?.os?.bcva || "",
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
        onSuccess: () => {
          saveAfterRefractionMutation.mutate({
            examinationId: examIdToSave,
            patientId,
            od: formData.measurements?.after?.od,
            os: formData.measurements?.after?.os,
          });
          console.log("Exam saved, now saving doctor report");
          const doctorReport = (doctorReportQuery.data as any)?.[0];
          const visitId = selectedExam?.visitId;

          if (doctorReport?.id) {
            // Update existing report
            console.log("Updating doctor report:", doctorReport.id);
            updateDoctorReportMutation.mutate(
              {
                reportId: doctorReport.id,
                diagnosis: formData.diagnosis || "",
                clinicalOpinion:
                  formData.recommendations || formData.medicalHistory || "",
                additionalNotes: formData.diseases
                  ? JSON.stringify(formData.diseases)
                  : "",
                recommendations:
                  formData.recommendations || formData.medicalHistory || "",
                prescription: formData.treatment
                  ? JSON.stringify(formData.treatment)
                  : "",
              },
              {
                onSuccess: () => {
                  console.log("Doctor report updated");
                  // Also save to prescriptions table if treatment items exist
                  const visitId = selectedExam?.visitId;
                  const treatmentIds = (formData.treatment || []).filter(
                    (id: any) => id !== undefined && id !== null,
                  );
                  if (visitId && treatmentIds.length > 0) {
                    const prescriptionItems = treatmentIds.map(
                      (medId: number) => {
                        const medication = medicationsQuery.data?.find(
                          (m: any) => m.id === medId,
                        );
                        return {
                          medicationId: medId,
                          medicationName: medication?.name || `Med ${medId}`,
                        };
                      },
                    );
                    createPrescriptionWithItemsMutation.mutate({
                      patientId: patientId,
                      visitId: visitId,
                      notes: "Prescribed from medical file panel",
                      items: prescriptionItems,
                    });
                  }
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

          // Save test requests if any selected
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

          // Save prescriptions if any selected
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
                };
              });

              createPrescriptionWithItemsMutation.mutate({
                patientId: patientId,
                visitId: visitId,
                notes: "Prescribed from medical file panel",
                items: prescriptionItems,
              });
            }
          }

          setIsSaving(false);
        },
      },
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
                onValueChange={(val) => setSelectedExaminationId(Number(val))}
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
        <div className="flex gap-1 border-b border-border/40 px-4 py-2 flex-shrink-0">
          {(["data", "plan"] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => { setActiveMedicalTab(sec); if (sec === "plan") setPlanEverActive(true); }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeMedicalTab === sec
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted text-muted-foreground",
              )}
            >
              {sec === "data" ? "القياسات والبيانات" : "الخطة العلاجية"}
            </button>
          ))}
        </div>

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
                    onValueChange={(val) =>
                      setSelectedExaminationId(Number(val))
                    }
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

              <div className="flex items-center justify-end gap-2">
                <span className="text-xs font-medium text-muted-foreground">عرض القياسات</span>
                <Select value={autorefSectionTab} onValueChange={setAutorefSectionTab}>
                  <SelectTrigger className="h-7 w-[180px] text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_VIEWS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AutoRef | IOP */}
              {(autorefSectionTab === "all" || autorefSectionTab === "autoref") && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  AutoRef | IOP
                </h3>
                <div className="flex items-center gap-2 mb-3" dir="ltr">
                  <label className="font-medium min-w-[42px] text-xs">
                    UCVA
                  </label>
                  <input
                    type="text"
                    placeholder="OD"
                    value={formData.measurements?.autoref?.od?.ucva || ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        measurements: {
                          ...prev.measurements,
                          autoref: {
                            ...prev.measurements?.autoref,
                            od: {
                              ...prev.measurements?.autoref?.od,
                              ucva: e.target.value,
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
                    value={formData.measurements?.autoref?.os?.ucva || ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        measurements: {
                          ...prev.measurements,
                          autoref: {
                            ...prev.measurements?.autoref,
                            os: {
                              ...prev.measurements?.autoref?.os,
                              ucva: e.target.value,
                            },
                          },
                        },
                      }))
                    }
                    className="w-16 px-2 py-1 border rounded text-xs text-center"
                  />
                </div>
                <div className="rounded-lg border overflow-hidden hidden md:block">
                  <table
                    className="w-full border-collapse text-center text-xs"
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
                          UCVA
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
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          IOP
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
                                ]?.ucva || ""
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
                                        ucva: value,
                                      },
                                    },
                                  },
                                }))
                              }
                              options={UCVA_BCVA_OPTIONS}
                              triggerClassName="h-6 w-full text-[10px] text-center border-input"
                            />
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
                          <td className="border px-1 py-1">
                            <Input
                              value={
                                formData.measurements?.iop?.[
                                  eye as "od" | "os"
                                ] || ""
                              }
                              onChange={(e) =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  measurements: {
                                    ...prev.measurements,
                                    iop: {
                                      ...prev.measurements?.iop,
                                      [eye]: e.target.value,
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
                              ?.ucva || ""
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
                                    ucva: value,
                                  },
                                },
                              },
                            }))
                          }
                          options={UCVA_BCVA_OPTIONS}
                          triggerClassName="h-8 w-full text-xs text-center border-input"
                        />
                        <Input
                          value={
                            formData.measurements?.iop?.[eye as "od" | "os"] ||
                            ""
                          }
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                iop: {
                                  ...prev.measurements?.iop,
                                  [eye]: e.target.value,
                                },
                              },
                            }))
                          }
                          className="h-8 text-xs text-center border-input"
                          placeholder="IOP"
                        />
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
              {(autorefSectionTab === "all" || autorefSectionTab === "after") && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  After Refraction
                </h3>
                <div className="rounded-lg border overflow-hidden hidden md:block">
                  <table
                    className="w-full border-collapse text-center text-xs"
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
              {(autorefSectionTab === "all" || autorefSectionTab === "refraction") && (
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
                <div className="rounded-lg border overflow-hidden hidden md:block">
                  <table
                    className="w-full border-collapse text-center text-xs"
                    dir="ltr"
                  >
                    <thead className="bg-muted/50">
                      <tr>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          Type
                        </th>
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
                          A
                        </th>
                        <th
                          scope="col"
                          className="border px-2 py-1.5 font-semibold text-[10px]"
                        >
                          P.D.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-muted/20">
                        <td className="border px-2 py-1.5 font-bold text-[10px]">
                          DIST
                        </td>
                        <td className="border px-2 py-1.5 font-bold text-[10px]">
                          OD
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
                          <Input
                            value={refractionTableData.od.pd}
                            onChange={(e) =>
                              setRefractionTableData((prev: any) => ({
                                ...prev,
                                od: { ...prev.od, pd: e.target.value },
                              }))
                            }
                            className="h-6 w-full text-[10px] text-center border-input"
                          />
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="border px-2 py-1.5 font-bold text-[10px]">
                          DIST
                        </td>
                        <td className="border px-2 py-1.5 font-bold text-[10px]">
                          OS
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
                </div>
              </div>
              )}

              {/* Pentacam */}
              {(autorefSectionTab === "all" || autorefSectionTab === "pentacam") && (
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
                <div className="rounded-lg border overflow-hidden hidden md:block">
                  <table
                    className="w-full border-collapse text-center text-xs"
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
              {(autorefSectionTab === "all" || autorefSectionTab === "fundus") && (
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
                    <div className="rounded-lg border overflow-hidden hidden md:block">
                      <table
                        className="w-full border-collapse text-center text-xs"
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
            <div className={activeMedicalTab !== "plan" ? "hidden" : undefined}>
              {/* Patient profile */}
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
                  <Input
                    type="date"
                    value={examinationDate}
                    disabled
                    className="mt-0.5 text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    تاريخ الزيارة
                  </Label>
                  <Input
                    type="date"
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

              {/* Medical History */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  التاريخ المرضي
                </h3>
                <Textarea
                  value={formData.medicalHistory}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      medicalHistory: e.target.value,
                    }))
                  }
                  placeholder="اكتب التاريخ المرضي هنا..."
                  className="text-sm"
                  rows={3}
                />
              </div>

              {/* Diagnosis + Diseases */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">
                    التشخيص
                  </Label>
                  <Textarea
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        diagnosis: e.target.value,
                      }))
                    }
                    placeholder="أدخل تفاصيل التشخيص..."
                    className="text-sm min-h-[120px]"
                    rows={5}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-medium block">الأمراض</Label>
                  {(formData.diseases || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(formData.diseases || []).map((diseaseId: any) => {
                        const disease = diseasesQuery.data?.find(
                          (d: any) => d.id === diseaseId,
                        );
                        return disease ? (
                          <span
                            key={diseaseId}
                            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground"
                          >
                            {disease.name}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev: any) => ({
                                  ...prev,
                                  diseases: (prev.diseases || []).filter(
                                    (d: any) => d !== diseaseId,
                                  ),
                                }))
                              }
                              className="hover:text-destructive"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن الأمراض..."
                      value={diseaseSearchText}
                      onChange={(e) => setDiseaseSearchText(e.target.value)}
                      className="pr-8 text-xs h-8"
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
                        <div className="space-y-1 max-h-[160px] overflow-y-auto border rounded-md p-1.5">
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
                                <label
                                  key={disease.id}
                                  className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                                >
                                  <Checkbox
                                    id={`disease-${disease.id}`}
                                    checked={(formData.diseases || []).includes(
                                      disease.id,
                                    )}
                                    onCheckedChange={() => {
                                      setFormData((prev: any) => {
                                        const diseases = prev.diseases || [];
                                        if (diseases.includes(disease.id))
                                          return {
                                            ...prev,
                                            diseases: diseases.filter(
                                              (d: any) => d !== disease.id,
                                            ),
                                          };
                                        return {
                                          ...prev,
                                          diseases: [...diseases, disease.id],
                                        };
                                      });
                                    }}
                                  />
                                  <span className="flex-1">{disease.name}</span>
                                </label>
                              ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div>
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

              {/* Investigations */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  التحاليل و الأشعة
                </h3>
                <div className="relative mb-2">
                  <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن الفحوصات..."
                    value={testSearchText}
                    onChange={(e) => setTestSearchText(e.target.value)}
                    className="pr-8 text-xs h-8"
                  />
                </div>
                {testSearchText && (
                  <>
                    {testsQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">
                        جاري التحميل...
                      </p>
                    ) : testsQuery.isError ? (
                      <p className="text-xs text-destructive">
                        خطأ في تحميل الفحوصات
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-[160px] overflow-y-auto border rounded-md p-1.5">
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
                  <div className="mt-2 flex flex-wrap gap-1.5">
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
                    <div className="mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        قوالب:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(testRequestsQuery.data).map(
                          ([templateId, template]: [string, any]) => (
                            <button
                              key={templateId}
                              type="button"
                              className="rounded-md border px-2 py-0.5 text-[10px] hover:bg-muted/60 transition-colors"
                              onClick={() =>
                                setSelectedTestRequestId(templateId)
                              }
                            >
                              {template.name || templateId}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Treatment / Medications */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  العلاج
                </h3>
                <div className="relative mb-2">
                  <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن الأدوية..."
                    value={medicationSearchText}
                    onChange={(e) => setMedicationSearchText(e.target.value)}
                    className="pr-8 text-xs h-8"
                  />
                </div>
                {medicationSearchText && (
                  <>
                    {medicationsQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">
                        جاري التحميل...
                      </p>
                    ) : medicationsQuery.isError ? (
                      <p className="text-xs text-destructive">
                        خطأ في تحميل العلاجات
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-[160px] overflow-y-auto border rounded-md p-1.5">
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
                                .includes(medicationSearchText.toLowerCase()),
                            )
                            .map((med: any) => (
                              <label
                                key={med.id}
                                className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                              >
                                <Checkbox
                                  id={`med-${med.id}`}
                                  checked={(formData.treatment || []).includes(
                                    med.id,
                                  )}
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
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(formData.treatment || []).map((medId: number) => {
                      const medication = medicationsQuery.data?.find(
                        (m: any) => m.id === medId,
                      );
                      return (
                        <span
                          key={medId}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-0.5 text-[10px]"
                        >
                          {medication?.name || `Med ${medId}`}
                          <button
                            type="button"
                            onClick={() => toggleCheckbox("treatment", medId)}
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
                    <div className="mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        وصفات جاهزة:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(prescriptionsQuery.data).map(
                          ([templateId, template]: [string, any]) => (
                            <button
                              key={templateId}
                              type="button"
                              className="rounded-md border px-2 py-0.5 text-[10px] hover:bg-muted/60 transition-colors"
                              onClick={() => {
                                setSelectedPrescriptionIds([templateId]);
                              }}
                            >
                              {template.name || templateId}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
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
