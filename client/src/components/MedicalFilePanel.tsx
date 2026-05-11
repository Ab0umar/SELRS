import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Eye, Search, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RefractionValueSelect from "./RefractionValueSelect";
import { SPHERE_OPTIONS, CYLINDER_OPTIONS, UCVA_BCVA_OPTIONS } from "@/lib/refractionOptions";

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
const MEDICAL_TABS = ["medical-history", "measurements", "pentacam", "investigation", "diagnosis", "treatment"];

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
  const [activeMedicalTab, setActiveMedicalTab] = useState("medical-history");
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [formData, setFormData] = useState<any>({
    medicalHistory: "",
    measurements: {
      autoref: { od: { s: "", c: "", axis: "", ucva: "", bcva: "" }, os: { s: "", c: "", axis: "", ucva: "", bcva: "" } },
      iop: { od: "", os: "" },
      after: { od: { s: "", c: "", axis: "" }, os: { s: "", c: "", axis: "" } },
    },
    glasses: { od: { s: "", c: "", axis: "", pd: "", bcva: "" }, os: { s: "", c: "", axis: "", pd: "", bcva: "" } },
    fundus: { od: { discStatus: "", cupDiscRatio: "", macuaStatus: "", vesselStatus: "", otherFindings: "" }, os: { discStatus: "", cupDiscRatio: "", macuaStatus: "", vesselStatus: "", otherFindings: "" } },
    pentacam: { od: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" }, os: { k1: "", k2: "", axis: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" } },
    tests: [],
    treatment: [],
    diagnosis: "",
    diseases: [],
    recommendations: "",
  });

  const [examinationDate, setExaminationDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedExaminationId, setSelectedExaminationId] = useState<number | null>(null);
  const [refractionTableData, setRefractionTableData] = useState<any>({
    od: { s: "", c: "", a: "", pd: "" },
    os: { s: "", c: "", a: "", pd: "" },
  });
  const [testSearchText, setTestSearchText] = useState("");
  const [diseaseSearchText, setDiseaseSearchText] = useState("");
  const [medicationSearchText, setMedicationSearchText] = useState("");
  const [prescriptionTab, setPrescriptionTab] = useState("Tracoma");
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<string[]>([]);
  const [selectedTestRequestId, setSelectedTestRequestId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [destinationTab, setDestinationTab] = useState<string | null>(null);
  const [shouldSaveAfterCreate, setShouldSaveAfterCreate] = useState(false);
  const [isFollowup, setIsFollowup] = useState(false);
  const [autorefSectionTab, setAutorefSectionTab] = useState("autoref");

  // Get patient data
  const patientQuery = trpc.patient.getPatient.useQuery(patientId, {
    refetchOnWindowFocus: false,
  });

  // Get patient visits
  const visitsQuery = trpc.medical.getVisits.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Get patient examinations
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery({ patientId }, {
    refetchOnWindowFocus: false,
  });

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
        setSelectedExaminationId((prev) => (prev === matchByVisit.id ? prev : matchByVisit.id));
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
  const patientVisit = (visitsQuery.data as any)?.find((v: any) => v.patientId === patientId);


  // Load examination data when selected - MUST BE BEFORE pentacamQuery
  const selectedExamination = examinations.find((e: any) => e.id === selectedExaminationId);

  // Get pentacam results for the selected visit
  const pentacamQuery = trpc.medical.getPentacamResultsByVisit.useQuery(
    { visitId: selectedExamination?.visitId || 0 },
    {
      enabled: Boolean(selectedExamination?.visitId),
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );

  // Get autoref from dedicated table
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false }
  );
  const afterRefractionQuery = trpc.medical.getAfterRefractionByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false }
  );

  // Get glasses/refraction from dedicated table
  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false }
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
    { refetchOnWindowFocus: false }
  );

  const prescriptionsQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "prescription" },
    { refetchOnWindowFocus: false }
  );

  // Get doctor report for the selected examination
  const doctorReportQuery = trpc.medical.getDoctorReportsByVisit.useQuery(
    { visitId: selectedExamination?.visitId || 0 },
    {
      enabled: Boolean(selectedExamination?.visitId),
      refetchOnWindowFocus: false,
      staleTime: 0, // Always consider stale to force refetch when query key changes
    }
  );

  // Get test requests for the selected visit
  const visitTestRequestsQuery = trpc.medical.getTestRequestsByVisit.useQuery(
    { visitId: selectedExamination?.visitId || 0 },
    {
      enabled: Boolean(selectedExamination?.visitId),
      refetchOnWindowFocus: false,
    }
  );

  // Get prescriptions for the selected visit
  const visitPrescriptionsQuery = trpc.medical.getPrescriptionsWithItemsByVisit.useQuery(
    { visitId: selectedExamination?.visitId || 0 },
    {
      enabled: Boolean(selectedExamination?.visitId),
      refetchOnWindowFocus: false,
    }
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
      let fundusData = { od: { discStatus: "", cupDiscRatio: "", macuaStatus: "", vesselStatus: "", otherFindings: "" }, os: { discStatus: "", cupDiscRatio: "", macuaStatus: "", vesselStatus: "", otherFindings: "" } };
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
      const autorefRecord = autorefQuery.data?.find((r: any) => r.examinationId === selectedExamination.id);
      const afterRecord = afterRefractionQuery.data?.find((r: any) => r.examinationId === selectedExamination.id);
      const autorefOD = autorefRecord
        ? { s: autorefRecord.sphereOD || "", c: autorefRecord.cylinderOD || "", axis: autorefRecord.axisOD || "", ucva: autorefRecord.ucvaOD || "", bcva: autorefRecord.bcvaOD || "" }
        : { s: selectedExamination.sphereOD || "", c: selectedExamination.cylinderOD || "", axis: selectedExamination.axisOD || "", ucva: selectedExamination.ucvaOD || "", bcva: selectedExamination.bcvaOD || "" };
      const autorefOS = autorefRecord
        ? { s: autorefRecord.sphereOS || "", c: autorefRecord.cylinderOS || "", axis: autorefRecord.axisOS || "", ucva: autorefRecord.ucvaOS || "", bcva: autorefRecord.bcvaOS || "" }
        : { s: selectedExamination.sphereOS || "", c: selectedExamination.cylinderOS || "", axis: selectedExamination.axisOS || "", ucva: selectedExamination.ucvaOS || "", bcva: selectedExamination.bcvaOS || "" };
      const afterOD = { s: afterRecord?.sphereOD || "", c: afterRecord?.cylinderOD || "", axis: afterRecord?.axisOD || "" };
      const afterOS = { s: afterRecord?.sphereOS || "", c: afterRecord?.cylinderOS || "", axis: afterRecord?.axisOS || "" };

      // Get glasses/refraction from dedicated table (matched by examinationId), fallback to glassesData JSON
      const glassesRecord = glassesRecordsQuery.data?.find((r: any) => r.examinationId === selectedExamination.id);
      if (glassesRecord && !selectedExamination.glassesData) {
        glassesData = {
          od: { s: glassesRecord.sOD || "", c: glassesRecord.cOD || "", a: glassesRecord.axisOD || "", pd: glassesRecord.pdOD || "" },
          os: { s: glassesRecord.sOS || "", c: glassesRecord.cOS || "", a: glassesRecord.axisOS || "", pd: glassesRecord.pdOS || "" },
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
        req.items && Array.isArray(req.items) ? req.items.map((item: any) => item.testId || item.id) : []
      );

      // Load prescription medication IDs from visit
      const prescriptionMedIds = (visitPrescriptionsQuery.data ?? []).flatMap((presc: any) =>
        presc.items && Array.isArray(presc.items) ? presc.items.map((item: any) => item.medicationId || item.id) : []
      );

      setFormData((prev: any) => {
        // Only override tests/treatment if we actually loaded data from the visit
        // Otherwise preserve what the user entered for a new exam
        const finalTests = testIds.length > 0 ? testIds : prev.tests;
        const finalTreatment = prescriptionMedIds.length > 0 ? prescriptionMedIds : prev.treatment;

        return {
          ...prev,
          measurements: {
            autoref: { od: autorefOD, os: autorefOS },
            iop: { od: selectedExamination.iopOD || "", os: selectedExamination.iopOS || "" },
            after: { od: afterOD, os: afterOS },
          },
          glasses: glassesData,
          fundus: fundusData,
          pentacam: pentacam ? {
            od: { k1: pentacam.k1OD || "", k2: pentacam.k2OD || "", axis: pentacam.axisOD || "", thinnest: pentacam.thinnestPointOD || "", apex: pentacam.apexOD || "", residual: pentacam.residualOD || "", ttt: pentacam.tttOD || "", ablation: pentacam.ablationOD || "" },
            os: { k1: pentacam.k1OS || "", k2: pentacam.k2OS || "", axis: pentacam.axisOS || "", thinnest: pentacam.thinnestPointOS || "", apex: pentacam.apexOS || "", residual: pentacam.residualOS || "", ttt: pentacam.tttOS || "", ablation: pentacam.ablationOS || "" },
          } : prev.pentacam,
          diagnosis: doctorReport?.diagnosis || "",
          recommendations: doctorReport?.clinicalOpinion || doctorReport?.recommendations || "",
          diseases: diseases,
          tests: finalTests,
          treatment: finalTreatment,
        };
      });

      // Update refraction table data from glassesData (handle both old 'axis' and new 'a' formats)
      if (glassesData.od || glassesData.os) {
        setRefractionTableData({
          od: { s: (glassesData.od as any)?.s || "", c: (glassesData.od as any)?.c || "", a: (glassesData.od as any)?.a || (glassesData.od as any)?.axis || "", pd: (glassesData.od as any)?.pd || "" },
          os: { s: (glassesData.os as any)?.s || "", c: (glassesData.os as any)?.c || "", a: (glassesData.os as any)?.a || (glassesData.os as any)?.axis || "", pd: (glassesData.os as any)?.pd || "" },
        });
      }

      // Update dates
      if (selectedExamination.createdAt) {
        const dateStr = new Date(selectedExamination.createdAt).toISOString().split("T")[0];
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
    if (shouldSaveAfterCreate && selectedExaminationId && examinations.length > 0) {
      console.log('Exam created with ID:', selectedExaminationId, 'Now saving all data...');
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
            s: refractionTableData.od?.s || formData.measurements?.autoref?.od?.s || "",
            c: refractionTableData.od?.c || formData.measurements?.autoref?.od?.c || "",
            axis: refractionTableData.od?.a || formData.measurements?.autoref?.od?.axis || "",
            pd: refractionTableData.od?.pd || "",
            bcva: formData.measurements?.autoref?.od?.bcva || "",
          },
          os: {
            s: refractionTableData.os?.s || formData.measurements?.autoref?.os?.s || "",
            c: refractionTableData.os?.c || formData.measurements?.autoref?.os?.c || "",
            axis: refractionTableData.os?.a || formData.measurements?.autoref?.os?.axis || "",
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
                clinicalOpinion: formData.recommendations || formData.medicalHistory || "",
                additionalNotes: formData.diseases ? JSON.stringify(formData.diseases) : "",
                recommendations: formData.recommendations || "",
                prescription: formData.treatment ? JSON.stringify(formData.treatment) : "",
              });
            }

            // Save pentacam data if any
            const hasPentacamData = Object.values(formData.pentacam?.od || {}).some(v => v) || Object.values(formData.pentacam?.os || {}).some(v => v);
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
              const validTests = (formData.tests || []).filter((id: any) => id !== undefined && id !== null);
              if (validTests.length > 0) {
                console.log('Saving test requests for first visit:', validTests);
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
            if (selectedExam?.visitId && (formData.treatment || []).length > 0) {
              const validMeds = (formData.treatment || []).filter((id: any) => id !== undefined && id !== null);
              if (validMeds.length > 0) {
                console.log('Saving prescriptions for first visit:', validMeds);
                const prescriptionItems = validMeds.map((medId: number) => {
                  const medication = medicationsQuery.data?.find((m: any) => m.id === medId);
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
        }
      );
    }
  }, [shouldSaveAfterCreate, selectedExaminationId]);

  // Load test request template items when selected
  useEffect(() => {
    if (!selectedTestRequestId || !testRequestsQuery.data) {
      return;
    }
    console.log('Selected test template ID:', selectedTestRequestId);
    console.log('Test templates data:', testRequestsQuery.data);

    const template = testRequestsQuery.data[selectedTestRequestId];
    console.log('Found template:', template);

    if (!template || !template.testItems) {
      console.log('No template or testItems found');
      setSelectedTestRequestId(null);
      return;
    }

    // testItems is an array of objects with testId property
    const itemIds = Array.isArray(template.testItems)
      ? template.testItems
          .map((item: any) => item.testId || item.id)
          .filter((id: any) => id !== undefined && id !== null)
      : [];
    console.log('Item IDs to add:', itemIds);

    if (itemIds.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        tests: Array.from(new Set([...(prev.tests || []), ...itemIds]))
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

    console.log('Selected prescription template IDs:', selectedPrescriptionIds);
    console.log('Prescription templates data:', prescriptionsQuery.data);

    const allMedIds = new Set<number>();
    selectedPrescriptionIds.forEach((templateId: string) => {
      const template = prescriptionsQuery.data[templateId];
      console.log(`Found template ${templateId}:`, template);

      // prescriptionItems is an array of objects with medication info
      if (template && template.prescriptionItems && Array.isArray(template.prescriptionItems)) {
        template.prescriptionItems.forEach((item: any) => {
          // Item has medicationName, find the medication ID from medicationsQuery
          const medName = item.medicationName;
          if (medName) {
            const medication = medicationsQuery.data?.find((m: any) => m.name === medName);
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

    console.log('Total medication IDs to add:', Array.from(allMedIds));

    if (allMedIds.size > 0) {
      setFormData((prev: any) => ({
        ...prev,
        treatment: Array.from(new Set([...(prev.treatment || []), ...Array.from(allMedIds)]))
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
  const createDoctorReportMutation = trpc.medical.createDoctorReport.useMutation({
    onSuccess: () => {
      console.log('Doctor report created successfully');
      toast.success("تم حفظ التقرير بنجاح");
    },
    onError: (error: any) => {
      console.error('Doctor report create error:', error);
      toast.error(error.message || "خطأ في إنشاء التقرير");
    },
  });

  // Mutation for updating doctor report
  const updateDoctorReportMutation = trpc.medical.updateDoctorReport.useMutation({
    onSuccess: () => {
      console.log('Doctor report saved successfully');
      toast.success("تم حفظ التقرير بنجاح");
    },
    onError: (error: any) => {
      console.error('Doctor report save error:', error);
      toast.error(error.message || "خطأ في حفظ التقرير");
    },
  });

  // Mutation for updating pentacam results
  const updatePentacamResultMutation = trpc.medical.updatePentacamResult.useMutation({
    onSuccess: () => {
      console.log('Pentacam data saved successfully');
      toast.success("تم حفظ بيانات البنتاكام بنجاح");
    },
    onError: (error: any) => {
      console.error('Pentacam save error:', error);
      toast.error(error.message || "خطأ في حفظ بيانات البنتاكام");
    },
  });

  // Mutation for creating test requests
  const createTestRequestMutation = trpc.medical.createTestRequest.useMutation({
    onSuccess: () => {
      console.log('Test request created successfully');
      toast.success("تم حفظ طلب الفحص بنجاح");
      // Refetch to reload test requests
      queryClient.invalidateQueries({ queryKey: ["medical.getPatientTestRequests"] });
    },
    onError: (error: any) => {
      console.error('Test request create error:', error);
      toast.error(error.message || "خطأ في حفظ طلب الفحص");
    },
  });

  // Mutation for creating prescriptions with multiple items
  const createPrescriptionWithItemsMutation = trpc.medical.createPrescriptionWithItems.useMutation({
    onSuccess: () => {
      console.log('Prescription created successfully');
      toast.success("تم حفظ الوصفة الطبية بنجاح");
      // Refetch to reload prescriptions
      queryClient.invalidateQueries({ queryKey: ["medical.getPrescriptionsWithItemsByPatient"] });
    },
    onError: (error: any) => {
      console.error('Prescription create error:', error);
      toast.error(error.message || "خطأ في حفظ الوصفة الطبية");
    },
  });

  // Mutation for creating an empty examination
  const createExaminationMutation = trpc.medical.createExamination.useMutation({
    onSuccess: async (examData: any) => {
      console.log('Examination created successfully:', examData);
      setTimeout(async () => {
        console.log('Refetching examinations...');
        const result = await examinationsQuery.refetch();
        console.log('Refetch result:', result.data);
        const newExams = result.data || [];
        if (newExams.length > 0) {
          console.log('Found exams, setting ID:', newExams[0].id);
          setSelectedExaminationId(newExams[0].id);
          setShouldSaveAfterCreate(true);
          toast.success("تم إنشاء الزيارة والفحص");
        } else {
          console.log('No exams found after creation');
          toast.error("تم إنشاء الزيارة لكن لم يتم العثور على الفحص");
        }
        setIsSaving(false);
      }, 800);
    },
    onError: (error) => {
      console.error('createExamination error:', error);
      setIsSaving(false);
      toast.error(error.message || "خطأ في إنشاء الفحص");
    },
  });

  // Mutation for saving medical visit (creates visit AND examination with all data)
  const saveMedicalVisitMutation = trpc.medical.saveMedicalVisit.useMutation({
    onSuccess: async (data: any) => {
      console.log('Medical visit saved with all data:', data);
      toast.success("تم حفظ الزيارة والبيانات الطبية بنجاح");

      const visitId = data.visitId;

      // Save test requests if any
      if (visitId && (formData.tests || []).length > 0) {
        const validTests = (formData.tests || []).filter((id: any) => id !== undefined && id !== null);
        if (validTests.length > 0) {
          console.log('Saving test requests:', validTests);
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
        const validMeds = (formData.treatment || []).filter((id: any) => id !== undefined && id !== null);
        if (validMeds.length > 0) {
          console.log('Saving prescriptions:', validMeds);
          const prescriptionItems = validMeds.map((medId: number) => {
            const medication = medicationsQuery.data?.find((m: any) => m.id === medId);
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
        console.log('Refetching visits and examinations after visit creation...');
        // Invalidate and refetch to ensure all panels see the new data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["medical.getVisits"] }),
          queryClient.invalidateQueries({ queryKey: ["medical.getExaminations"] }),
          queryClient.invalidateQueries({ queryKey: ["medical.getExaminationsByPatient", { patientId }] }),
          queryClient.invalidateQueries({ queryKey: ["medical.getAutorefractometryByPatient", { patientId }] }),
          queryClient.invalidateQueries({ queryKey: ["medical.getGlassesRecordsByPatient", { patientId }] }),
          queryClient.invalidateQueries({ queryKey: ["medical.getVisitsByPatient", { patientId }] }),
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
      console.error('saveMedicalVisit error:', error);
      setIsSaving(false);
      toast.error(error.message || "خطأ في حفظ الزيارة والبيانات");
    },
  });
  const saveAfterRefractionMutation = trpc.medical.saveAfterRefractionData.useMutation();

  const deleteExaminationMutation = trpc.medical.deleteExaminationDirect.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الزيارة بنجاح");
      setSelectedExaminationId(null);
      queryClient.invalidateQueries({ queryKey: ["medical.getExaminationsByPatient", { patientId }] });
      queryClient.invalidateQueries({ queryKey: ["medical.getAutorefractometryByPatient", { patientId }] });
      queryClient.invalidateQueries({ queryKey: ["medical.getGlassesRecordsByPatient", { patientId }] });
      queryClient.invalidateQueries({ queryKey: ["medical.getVisitsByPatient", { patientId }] });
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
        treatment: formData.treatment ? JSON.stringify(formData.treatment) : undefined,
        diseases: formData.diseases ? JSON.stringify(formData.diseases) : undefined,
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
          s: refractionTableData.od?.s || formData.measurements?.autoref?.od?.s || "",
          c: refractionTableData.od?.c || formData.measurements?.autoref?.od?.c || "",
          axis: refractionTableData.od?.a || formData.measurements?.autoref?.od?.axis || "",
          pd: refractionTableData.od?.pd || "",
          bcva: formData.measurements?.autoref?.od?.bcva || "",
        },
        os: {
          s: refractionTableData.os?.s || formData.measurements?.autoref?.os?.s || "",
          c: refractionTableData.os?.c || formData.measurements?.autoref?.os?.c || "",
          axis: refractionTableData.os?.a || formData.measurements?.autoref?.os?.axis || "",
          pd: refractionTableData.os?.pd || "",
          bcva: formData.measurements?.autoref?.os?.bcva || "",
        },
      }),
      posteriorSegmentOD: (Object.values(formData.fundus?.od || {}).some(v => v)) ? JSON.stringify(formData.fundus?.od) : null,
      posteriorSegmentOS: (Object.values(formData.fundus?.os || {}).some(v => v)) ? JSON.stringify(formData.fundus?.os) : null,
      radiologyLabsNotes: formData.radiologyLabsNotes || null,
    };

    console.log('flattenedUpdates:', flattenedUpdates);

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
          console.log('Exam saved, now saving doctor report');
          const doctorReport = (doctorReportQuery.data as any)?.[0];
          const visitId = selectedExam?.visitId;

          if (doctorReport?.id) {
            // Update existing report
            console.log('Updating doctor report:', doctorReport.id);
            updateDoctorReportMutation.mutate({
              reportId: doctorReport.id,
              diagnosis: formData.diagnosis || "",
              clinicalOpinion: formData.recommendations || formData.medicalHistory || "",
              additionalNotes: formData.diseases ? JSON.stringify(formData.diseases) : "",
              recommendations: formData.recommendations || formData.medicalHistory || "",
              prescription: formData.treatment ? JSON.stringify(formData.treatment) : "",
            }, {
              onSuccess: () => {
                console.log('Doctor report updated');
                // Also save to prescriptions table if treatment items exist
                const visitId = selectedExam?.visitId;
                const treatmentIds = (formData.treatment || []).filter((id: any) => id !== undefined && id !== null);
                if (visitId && treatmentIds.length > 0) {
                  const prescriptionItems = treatmentIds.map((medId: number) => {
                    const medication = medicationsQuery.data?.find((m: any) => m.id === medId);
                    return { medicationId: medId, medicationName: medication?.name || `Med ${medId}` };
                  });
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
                console.error('Doctor report update error:', err);
                setIsSaving(false);
              }
            });
          } else if (visitId && (formData.diagnosis || formData.recommendations || formData.diseases?.length > 0)) {
            // Create new report if none exists and there's data to save
            console.log('Creating new doctor report for visitId:', visitId);
            createDoctorReportMutation.mutate({
              visitId: visitId,
              patientId: patientId,
              diagnosis: formData.diagnosis || "No diagnosis entered",
              clinicalOpinion: formData.recommendations || "",
              additionalNotes: formData.diseases ? JSON.stringify(formData.diseases) : "",
            }, {
              onSuccess: () => {
                console.log('Doctor report created');
                doctorReportQuery.refetch();
                setIsSaving(false);
              },
              onError: (err: any) => {
                console.error('Doctor report create error:', err);
                setIsSaving(false);
              }
            });
          } else {
            console.log('No visit found or no doctor report data to save');
          }

          // Save pentacam data if any fields are filled
          const hasPentacamData = Object.values(formData.pentacam?.od || {}).some(v => v) || Object.values(formData.pentacam?.os || {}).some(v => v);
          if (visitId && hasPentacamData) {
            console.log('Saving pentacam data for visitId:', visitId);
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
            const validTests = (formData.tests || []).filter((id: any) => id !== undefined && id !== null);
            if (validTests.length > 0) {
              console.log('Saving test requests:', validTests);
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
            const validMeds = (formData.treatment || []).filter((id: any) => id !== undefined && id !== null);
            if (validMeds.length > 0) {
              console.log('Saving prescriptions:', validMeds);
              const prescriptionItems = validMeds.map((medId: number) => {
                const medication = medicationsQuery.data?.find((m: any) => m.id === medId);
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
      }
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
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
  const innerCls = embedded
    ? "flex min-h-[min(85vh,900px)] w-full max-h-[min(92vh,1000px)] flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm min-h-0"
    : "flex h-[95vh] max-h-[95vh] w-full max-w-[95vw] flex-col rounded-lg bg-white shadow-lg min-h-0";

  return (
    <div className={outerCls}>
      <div className={innerCls}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          {embedded ? (
            <span className="text-sm text-muted-foreground" aria-hidden />
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="text-2xl text-muted-foreground hover:text-foreground"
              aria-label="إغلاق"
            >
              ✕
            </button>
          )}
          <h2 className="text-lg font-semibold">
            {patientQuery.isLoading ? "جاري التحميل..." : patient?.fullName ?? "بدون اسم"}
          </h2>
        </div>

        {/* Followup Checkbox */}
        <div className="px-6 py-3 border-b bg-slate-50 flex-shrink-0">
          <label
            className={
              hubRo
                ? "inline-flex items-center gap-3 rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 opacity-70"
                : "inline-flex cursor-pointer items-center gap-3 rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 shadow-sm"
            }
          >
            <Checkbox
              checked={isFollowup}
              disabled={hubRo}
              onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
              className="h-5 w-5 border-2 border-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:text-white"
            />
            <span className="text-base font-extrabold text-amber-900">متابعه</span>
          </label>
        </div>

        {/* Examination Selector */}
        {examinations && examinations.length > 0 && (
          <div className="px-6 py-3 border-b bg-slate-50 flex-shrink-0">
            <Label className="text-sm font-medium block mb-2">اختر الفحص</Label>
            <div className="flex gap-2">
              <Select value={String(selectedExaminationId || "")} onValueChange={(val) => setSelectedExaminationId(Number(val))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر فحص" />
                </SelectTrigger>
                <SelectContent>
                  {examinations.map((exam: any) => (
                    <SelectItem key={exam.id} value={String(exam.id)}>
                      {new Date(exam.createdAt).toLocaleDateString("ar-EG")} - {new Date(exam.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && !hubRo ? (
                <Button
                  size="icon"
                  variant="destructive"
                  disabled={!selectedExaminationId}
                  onClick={() => {
                    if (selectedExaminationId && confirm("هل أنت متأكد من حذف هذه الزيارة؟")) {
                      deleteExaminationMutation.mutate({ examinationId: selectedExaminationId });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* TABS SECTION */}
          <Tabs value={activeMedicalTab} onValueChange={setActiveMedicalTab} dir="rtl" className="w-full flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="px-6 pt-6">
              <TabsList className="w-full justify-start gap-1 overflow-x-hidden flex-nowrap border-b">
                <TabsTrigger value="medical-history" className="text-sm whitespace-nowrap">التاريخ المرضي</TabsTrigger>
                <TabsTrigger value="measurements" className="text-sm whitespace-nowrap">القياسات</TabsTrigger>
                <TabsTrigger value="pentacam" className="text-sm whitespace-nowrap">بنتاكام</TabsTrigger>
                <TabsTrigger value="investigation" className="text-sm whitespace-nowrap">التحاليل و الأشعة</TabsTrigger>
                <TabsTrigger value="diagnosis" className="text-sm whitespace-nowrap">التشخيص</TabsTrigger>
                <TabsTrigger value="treatment" className="text-sm whitespace-nowrap">العلاج</TabsTrigger>
              </TabsList>
            </div>

            {/* Content Area */}
            <div className="px-6 py-6 flex flex-col flex-1 min-h-0 overflow-x-hidden">
              {hubRo ? (
                <p className="-mt-2 mb-2 text-xs text-muted-foreground" role="note">
                  {patientHubViewOnlyHint}
                </p>
              ) : null}
              <fieldset disabled={hubRo} className="flex min-h-0 w-full flex-1 flex-col border-0 p-0 m-0 min-w-0 disabled:opacity-95">
              {/* Medical History Tab */}
              <TabsContent value="medical-history" className="mt-0 space-y-4">
                {/* PROFILE DATA - Only visible in Medical History tab */}
                <div className="border-b pb-6 pt-1 mb-6">
                  <h3 className="text-base font-semibold mb-6">Profile Data</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Row 1: Name | Age */}
                    <div>
                      <Label>الاسم</Label>
                      <Input value={patient?.fullName ?? ""} disabled className="mt-1 text-xs" />
                    </div>
                    <div>
                      <Label>السن</Label>
                      <Input value={patient?.age ?? ""} disabled className="mt-1 text-xs" />
                    </div>

                    {/* Row 2: ExamDate | VisitDate */}
                    <div>
                      <Label>تاريخ الفحص</Label>
                      <Input type="date" value={examinationDate} disabled className="mt-1 text-xs" />
                    </div>
                    <div>
                      <Label>تاريخ الزيارة</Label>
                      <Input
                        type="date"
                        value={visitDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setVisitDate(v);
                          onHubVisitDateChange?.(v);
                        }}
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-5">التاريخ المرضي</h3>
                  <div>
                    <Textarea
                      value={formData.medicalHistory}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, medicalHistory: e.target.value }))
                      }
                      placeholder="اكتب التاريخ المرضي هنا..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Measurements Tab (AutoRef | IOP + Refraction) */}
              <TabsContent value="measurements" className="mt-0 space-y-6">
                {examinations && examinations.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-medium whitespace-nowrap">تاريخ الزيارة</Label>
                    <Select value={String(selectedExaminationId || "")} onValueChange={(val) => setSelectedExaminationId(Number(val))}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
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
                {/* AutoRef | IOP */}
                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-6">AutoRef | IOP</h3>

                  <Tabs value={autorefSectionTab} onValueChange={setAutorefSectionTab} dir="ltr" className="w-full">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="autoref" className="flex-1">Autoref | IOP</TabsTrigger>
                      <TabsTrigger value="after" className="flex-1">After</TabsTrigger>
                    </TabsList>

                    <TabsContent value="autoref" className="mt-0 space-y-4">
                      <div className="flex items-center gap-2 mb-4" dir="ltr">
                        <label className="font-semibold min-w-[50px]">UCVA</label>
                        <input type="text" placeholder="OD" value={formData.measurements?.autoref?.od?.ucva || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, od: { ...prev.measurements?.autoref?.od, ucva: e.target.value } } } }))} className="w-16 px-2 py-1 border border-slate-300 rounded text-xs" />
                        <span className="text-slate-400">/</span>
                        <input type="text" placeholder="OS" value={formData.measurements?.autoref?.os?.ucva || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, os: { ...prev.measurements?.autoref?.os, ucva: e.target.value } } } }))} className="w-16 px-2 py-1 border border-slate-300 rounded text-xs" />
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-x-hidden hidden md:block">
                        <table className="w-full border-collapse text-center text-[10px] sm:text-sm" dir="ltr">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">Eye</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">UCVA</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">S</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">C</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">Axis</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">IOP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {["od", "os"].map((eye) => (
                              <tr key={eye} className="bg-white hover:bg-slate-50">
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 font-bold text-[10px] sm:text-xs">{eye === "od" ? "OD" : "OS"}</td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <RefractionValueSelect value={formData.measurements?.autoref?.[eye as "od" | "os"]?.ucva || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], ucva: value } } } }))} options={UCVA_BCVA_OPTIONS} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                                </td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <RefractionValueSelect value={formData.measurements?.autoref?.[eye as "od" | "os"]?.s || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], s: value } } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                                </td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <RefractionValueSelect value={formData.measurements?.autoref?.[eye as "od" | "os"]?.c || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], c: value } } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                                </td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <Input
                                    value={formData.measurements?.autoref?.[eye as "od" | "os"]?.axis || ""}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], axis: e.target.value } } } }))}
                                    className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                                  />
                                </td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <Input
                                    value={formData.measurements?.iop?.[eye as "od" | "os"] || ""}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, iop: { ...prev.measurements?.iop, [eye]: e.target.value } } }))}
                                    className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden space-y-2" dir="ltr">
                        {["od", "os"].map((eye) => (
                          <div key={`auto-mobile-${eye}`} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
                            <div className="text-xs font-semibold">{eye === "od" ? "OD" : "OS"}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <RefractionValueSelect value={formData.measurements?.autoref?.[eye as "od" | "os"]?.ucva || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], ucva: value } } } }))} options={UCVA_BCVA_OPTIONS} triggerClassName="h-8 w-full text-xs text-center border-input" />
                              <Input value={formData.measurements?.iop?.[eye as "od" | "os"] || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, iop: { ...prev.measurements?.iop, [eye]: e.target.value } } }))} className="h-8 w-full text-xs text-center border-input" placeholder="IOP" />
                              <RefractionValueSelect value={formData.measurements?.autoref?.[eye as "od" | "os"]?.s || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], s: value } } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-8 w-full text-xs text-center border-input" />
                              <RefractionValueSelect value={formData.measurements?.autoref?.[eye as "od" | "os"]?.c || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], c: value } } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-8 w-full text-xs text-center border-input" />
                              <Input value={formData.measurements?.autoref?.[eye as "od" | "os"]?.axis || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, [eye]: { ...prev.measurements?.autoref?.[eye as "od" | "os"], axis: e.target.value } } } }))} className="h-8 w-full text-xs text-center border-input col-span-2" placeholder="Axis" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="after" className="mt-0 space-y-4">
                      <div className="rounded-xl border border-slate-200 overflow-x-hidden hidden md:block">
                        <table className="w-full border-collapse text-center text-[10px] sm:text-sm" dir="ltr">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">Eye</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">S</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">C</th>
                              <th className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600">Axis</th>
                            </tr>
                          </thead>
                          <tbody>
                            {["od", "os"].map((eye) => (
                              <tr key={`after-${eye}`} className="bg-white hover:bg-slate-50">
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 font-bold text-[10px] sm:text-xs">{eye === "od" ? "OD" : "OS"}</td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <RefractionValueSelect value={formData.measurements?.after?.[eye as "od" | "os"]?.s || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, after: { ...prev.measurements?.after, [eye]: { ...prev.measurements?.after?.[eye as "od" | "os"], s: value } } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                                </td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <RefractionValueSelect value={formData.measurements?.after?.[eye as "od" | "os"]?.c || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, after: { ...prev.measurements?.after, [eye]: { ...prev.measurements?.after?.[eye as "od" | "os"], c: value } } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                                </td>
                                <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                                  <Input value={formData.measurements?.after?.[eye as "od" | "os"]?.axis || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, after: { ...prev.measurements?.after, [eye]: { ...prev.measurements?.after?.[eye as "od" | "os"], axis: e.target.value } } } }))} className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden space-y-2" dir="ltr">
                        {["od", "os"].map((eye) => (
                          <div key={`after-mobile-${eye}`} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
                            <div className="text-xs font-semibold">{eye === "od" ? "OD" : "OS"}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <RefractionValueSelect value={formData.measurements?.after?.[eye as "od" | "os"]?.s || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, after: { ...prev.measurements?.after, [eye]: { ...prev.measurements?.after?.[eye as "od" | "os"], s: value } } } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-8 w-full text-xs text-center border-input" />
                              <RefractionValueSelect value={formData.measurements?.after?.[eye as "od" | "os"]?.c || ""} onChange={(value) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, after: { ...prev.measurements?.after, [eye]: { ...prev.measurements?.after?.[eye as "od" | "os"], c: value } } } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-8 w-full text-xs text-center border-input" />
                              <Input value={formData.measurements?.after?.[eye as "od" | "os"]?.axis || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, after: { ...prev.measurements?.after, [eye]: { ...prev.measurements?.after?.[eye as "od" | "os"], axis: e.target.value } } } }))} className="h-8 w-full text-xs text-center border-input col-span-2" placeholder="Axis" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Refraction */}
                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-6">👓 Refraction</h3>

                  {/* BCVA Input Row */}
                  <div className="flex items-center gap-2 mb-4" dir="ltr">
                    <label className="font-semibold min-w-[50px]">BCVA</label>
                    <input type="text" placeholder="OD" value={formData.measurements?.autoref?.od?.bcva || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, od: { ...prev.measurements?.autoref?.od, bcva: e.target.value } } } }))} className="w-16 px-2 py-1 border border-slate-300 rounded text-xs" />
                    <span className="text-slate-400">/</span>
                    <input type="text" placeholder="OS" value={formData.measurements?.autoref?.os?.bcva || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, measurements: { ...prev.measurements, autoref: { ...prev.measurements?.autoref, os: { ...prev.measurements?.autoref?.os, bcva: e.target.value } } } }))} className="w-16 px-2 py-1 border border-slate-300 rounded text-xs" />
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-x-hidden hidden md:block">
                    <table className="w-full border-collapse text-center text-xs sm:text-sm" dir="ltr">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Type</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Eye</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">S</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">C</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">A</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">P.D.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* DIST - OD */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-bold">DIST</td>
                          <td className="border border-slate-200 px-3 py-2 font-bold">OD</td>
                          <td className="border border-slate-200 px-3 py-2">
                            <RefractionValueSelect value={refractionTableData.od.s} onChange={(value) => setRefractionTableData((prev: any) => ({ ...prev, od: { ...prev.od, s: value } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <RefractionValueSelect value={refractionTableData.od.c} onChange={(value) => setRefractionTableData((prev: any) => ({ ...prev, od: { ...prev.od, c: value } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <Input
                              value={refractionTableData.od.a}
                              onChange={(e) => setRefractionTableData((prev: any) => ({ ...prev, od: { ...prev.od, a: e.target.value } }))}
                              className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                            />
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <Input
                              value={refractionTableData.od.pd}
                              onChange={(e) => setRefractionTableData((prev: any) => ({ ...prev, od: { ...prev.od, pd: e.target.value } }))}
                              className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                            />
                          </td>
                        </tr>
                        {/* DIST - OS */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-bold">DIST</td>
                          <td className="border border-slate-200 px-3 py-2 font-bold">OS</td>
                          <td className="border border-slate-200 px-3 py-2">
                            <RefractionValueSelect value={refractionTableData.os.s} onChange={(value) => setRefractionTableData((prev: any) => ({ ...prev, os: { ...prev.os, s: value } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <RefractionValueSelect value={refractionTableData.os.c} onChange={(value) => setRefractionTableData((prev: any) => ({ ...prev, os: { ...prev.os, c: value } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input" />
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <Input
                              value={refractionTableData.os.a}
                              onChange={(e) => setRefractionTableData((prev: any) => ({ ...prev, os: { ...prev.os, a: e.target.value } }))}
                              className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                            />
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <Input
                              value={refractionTableData.os.pd}
                              onChange={(e) => setRefractionTableData((prev: any) => ({ ...prev, os: { ...prev.os, pd: e.target.value } }))}
                              className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
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
                      <div key={`ref-mobile-${row.key}`} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
                        <div className="text-xs font-semibold">{row.label}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <RefractionValueSelect value={refractionTableData[row.key as "od" | "os"]?.s || ""} onChange={(value) => setRefractionTableData((prev: any) => ({ ...prev, [row.key]: { ...prev[row.key], s: value } }))} options={SPHERE_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-8 w-full text-xs text-center border-input" />
                          <RefractionValueSelect value={refractionTableData[row.key as "od" | "os"]?.c || ""} onChange={(value) => setRefractionTableData((prev: any) => ({ ...prev, [row.key]: { ...prev[row.key], c: value } }))} options={CYLINDER_OPTIONS} defaultValue="0.00" allowEmpty={false} triggerClassName="h-8 w-full text-xs text-center border-input" />
                          <Input value={refractionTableData[row.key as "od" | "os"]?.a || ""} onChange={(e) => setRefractionTableData((prev: any) => ({ ...prev, [row.key]: { ...prev[row.key], a: e.target.value } }))} className="h-8 w-full text-xs text-center border-input" placeholder="Axis" />
                          <Input value={refractionTableData[row.key as "od" | "os"]?.pd || ""} onChange={(e) => setRefractionTableData((prev: any) => ({ ...prev, [row.key]: { ...prev[row.key], pd: e.target.value } }))} className="h-8 w-full text-xs text-center border-input" placeholder="P.D." />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fundus */}
                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-6">👁️ Fundus Examination</h3>
                  <div className="rounded-xl border border-slate-200 overflow-x-hidden hidden md:block">
                    <table className="w-full border-collapse text-center text-xs sm:text-sm" dir="ltr">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Eye</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Disc Status</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cup/Disc</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Macula</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Vessels</th>
                          <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Other</th>
                        </tr>
                      </thead>
                      <tbody>
                        {["od", "os"].map((eye) => (
                          <tr key={eye} className="bg-white hover:bg-slate-50">
                            <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2 font-bold text-[10px] sm:text-xs">{eye === "od" ? "OD" : "OS"}</td>
                            <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                              <Input
                                value={formData.fundus?.[eye as "od" | "os"]?.discStatus || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], discStatus: e.target.value } } }))}
                                placeholder="Normal/Abnormal"
                                className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                              />
                            </td>
                            <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                              <Input
                                value={formData.fundus?.[eye as "od" | "os"]?.cupDiscRatio || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], cupDiscRatio: e.target.value } } }))}
                                placeholder="0.3"
                                className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                              />
                            </td>
                            <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                              <Input
                                value={formData.fundus?.[eye as "od" | "os"]?.macuaStatus || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], macuaStatus: e.target.value } } }))}
                                placeholder="Normal"
                                className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                              />
                            </td>
                            <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                              <Input
                                value={formData.fundus?.[eye as "od" | "os"]?.vesselStatus || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], vesselStatus: e.target.value } } }))}
                                placeholder="Normal"
                                className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                              />
                            </td>
                            <td className="border border-slate-200 px-1 py-1 sm:px-3 sm:py-2">
                              <Input
                                value={formData.fundus?.[eye as "od" | "os"]?.otherFindings || ""}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], otherFindings: e.target.value } } }))}
                                placeholder="Notes"
                                className="h-6 sm:h-8 w-full text-[10px] sm:text-xs text-center border-input"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-2" dir="ltr">
                    {["od", "os"].map((eye) => (
                      <div key={`fundus-mobile-${eye}`} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
                        <div className="text-xs font-semibold">{eye === "od" ? "OD" : "OS"}</div>
                        <Input value={formData.fundus?.[eye as "od" | "os"]?.discStatus || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], discStatus: e.target.value } } }))} placeholder="Disc Status" className="h-8 text-xs text-center border-input" />
                        <Input value={formData.fundus?.[eye as "od" | "os"]?.cupDiscRatio || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], cupDiscRatio: e.target.value } } }))} placeholder="Cup/Disc" className="h-8 text-xs text-center border-input" />
                        <Input value={formData.fundus?.[eye as "od" | "os"]?.macuaStatus || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], macuaStatus: e.target.value } } }))} placeholder="Macula" className="h-8 text-xs text-center border-input" />
                        <Input value={formData.fundus?.[eye as "od" | "os"]?.vesselStatus || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], vesselStatus: e.target.value } } }))} placeholder="Vessels" className="h-8 text-xs text-center border-input" />
                        <Input value={formData.fundus?.[eye as "od" | "os"]?.otherFindings || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, fundus: { ...prev.fundus, [eye]: { ...prev.fundus?.[eye as "od" | "os"], otherFindings: e.target.value } } }))} placeholder="Other" className="h-8 text-xs text-center border-input" />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Pentacam Tab */}
              <TabsContent value="pentacam" className="mt-0 space-y-4">
                {examinations && examinations.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-medium whitespace-nowrap">تاريخ الزيارة</Label>
                    <Select value={String(selectedExaminationId || "")} onValueChange={(val) => setSelectedExaminationId(Number(val))}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
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
                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-6">🔬 بنتاكام</h3>
                  <div className="space-y-4">
                    <Button
                      type="button"
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                    >
                      <Eye className="h-4 w-4 ml-2" />
                      عرض صور البنتاكام
                    </Button>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white mt-4 hidden md:block">
                    <table className="w-full border-collapse text-center text-xs sm:text-sm" dir="ltr">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="border px-3 py-3">Eye</th>
                          <th className="border px-3 py-3">K1</th>
                          <th className="border px-3 py-3">K2</th>
                          <th className="border px-3 py-3">Axis</th>
                          <th className="border px-3 py-3">Thinnest</th>
                          <th className="border px-3 py-3">Apex</th>
                          <th className="border px-3 py-3">Residual</th>
                          <th className="border px-3 py-3">TTT</th>
                          <th className="border px-3 py-3">Ablation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white text-sm font-medium text-slate-800">
                          <td className="border px-3 py-3 font-bold">OD</td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.k1 || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, k1: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.k2 || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, k2: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.axis || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, axis: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.thinnest || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, thinnest: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.apex || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, apex: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.residual || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, residual: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.ttt || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, ttt: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.od?.ablation || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, od: { ...prev.pentacam?.od, ablation: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                        </tr>
                        <tr className="bg-white text-sm font-medium text-slate-800">
                          <td className="border px-3 py-3 font-bold">OS</td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.k1 || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, k1: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.k2 || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, k2: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.axis || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, axis: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.thinnest || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, thinnest: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.apex || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, apex: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.residual || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, residual: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.ttt || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, ttt: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                          <td className="border px-3 py-3">
                            <Input type="number" value={formData.pentacam?.os?.ablation || ""} onChange={(e) => setFormData((prev: any) => ({ ...prev, pentacam: { ...prev.pentacam, os: { ...prev.pentacam?.os, ablation: e.target.value } } }))} placeholder="—" className="h-8 text-sm text-center border-slate-300 focus:border-slate-500 px-4 py-2" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden mt-4 space-y-2" dir="ltr">
                    {["od", "os"].map((eye) => (
                      <div key={`pentacam-mobile-${eye}`} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
                        <div className="text-xs font-semibold">{eye === "od" ? "OD" : "OS"}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.k1 || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], k1: e.target.value } },
                              }))
                            }
                            placeholder="K1"
                            className="h-8 text-xs text-center border-input"
                          />
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.k2 || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], k2: e.target.value } },
                              }))
                            }
                            placeholder="K2"
                            className="h-8 text-xs text-center border-input"
                          />
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.thinnest || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], thinnest: e.target.value } },
                              }))
                            }
                            placeholder="Thinnest"
                            className="h-8 text-xs text-center border-input"
                          />
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.axis || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], axis: e.target.value } },
                              }))
                            }
                            placeholder="Axis"
                            className="h-8 text-xs text-center border-input"
                          />
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.apex || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], apex: e.target.value } },
                              }))
                            }
                            placeholder="Apex"
                            className="h-8 text-xs text-center border-input"
                          />
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.residual || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], residual: e.target.value } },
                              }))
                            }
                            placeholder="Residual"
                            className="h-8 text-xs text-center border-input"
                          />
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.ttt || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], ttt: e.target.value } },
                              }))
                            }
                            placeholder="TTT"
                            className="h-8 text-xs text-center border-input"
                          />
                          <Input
                            type="number"
                            value={formData.pentacam?.[eye as "od" | "os"]?.ablation || ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam?.[eye as "od" | "os"], ablation: e.target.value } },
                              }))
                            }
                            placeholder="Ablation"
                            className="h-8 text-xs text-center border-input col-span-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Investigation Tab */}
              <TabsContent value="investigation" className="mt-0 space-y-4">
                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-6">التحاليل و الأشعة</h3>
                  <div className="space-y-6">
                    {/* Search Tests */}
                    <div>
                      <label className="font-semibold text-slate-900 text-sm block mb-2">Tests</label>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="ابحث عن الفحوصات..."
                          value={testSearchText}
                          onChange={(e) => setTestSearchText(e.target.value)}
                          className="pl-10 text-xs"
                        />
                      </div>
                      {testSearchText && (
                        <>
                          {testsQuery.isLoading ? (
                            <div className="text-slate-500 text-xs">جاري التحميل...</div>
                          ) : testsQuery.isError ? (
                            <div className="text-red-500 text-xs">خطأ في تحميل الفحوصات</div>
                          ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded p-2">
                              {(testsQuery.data ?? []).filter((test: any) => test.name.toLowerCase().includes(testSearchText.toLowerCase())).length === 0 ? (
                                <div className="text-slate-500 text-xs">لا توجد نتائج</div>
                              ) : (
                                (testsQuery.data ?? []).filter((test: any) => test.name.toLowerCase().includes(testSearchText.toLowerCase())).map((test: any) => (
                                  <div key={test.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`test-${test.id}`}
                                      checked={(formData.tests || []).includes(test.id)}
                                      onCheckedChange={() => toggleCheckbox("tests", test.id)}
                                    />
                                    <Label htmlFor={`test-${test.id}`} className="cursor-pointer text-xs flex-1">
                                      {test.name}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Selected Tests from Templates */}
                      {(formData.tests || []).length > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-xs font-semibold text-blue-900 mb-2">الفحوصات المختارة:</div>
                          <div className="flex flex-wrap gap-2">
                            {(formData.tests || []).map((testId: number) => {
                              const test = testsQuery.data?.find((t: any) => t.id === testId);
                              return (
                                <div key={testId} className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border border-blue-300">
                                  <span>{test?.name || `Test ${testId}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleCheckbox("tests", testId)}
                                    className="text-red-500 hover:text-red-700 font-bold"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Saved Test Requests Templates */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="font-semibold text-slate-900 mb-3 text-sm">Saved Test Requests</div>
                      {testRequestsQuery.isLoading ? (
                        <div className="text-slate-500 text-sm">جاري التحميل...</div>
                      ) : testRequestsQuery.isError ? (
                        <div className="text-red-500 text-sm">خطأ في تحميل الطلبات</div>
                      ) : !testRequestsQuery.data || Object.keys(testRequestsQuery.data).length === 0 ? (
                        <div className="text-slate-500 text-xs">لا توجد طلبات محفوظة</div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 flex-1 overflow-y-auto min-h-0">
                          {Object.entries(testRequestsQuery.data ?? {}).map(([templateId, template]: [string, any]) => (
                            <Button
                              key={templateId}
                              variant="outline"
                              type="button"
                              className="h-6 px-2 text-xs truncate"
                              onClick={() => {
                                setSelectedTestRequestId(templateId);
                              }}
                              title={template.name || templateId}
                            >
                              {template.name || templateId}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Diagnosis Tab */}
              <TabsContent value="diagnosis" className="mt-0 space-y-4">
                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-6">التشخيص</h3>
                  <div className="flex flex-col gap-4">
                    {/* Top Row: Diagnosis & Diseases */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Diagnosis Text */}
                      <div>
                        <Label htmlFor="diagnosis" className="text-sm font-medium">Diagnosis</Label>
                        <textarea
                          id="diagnosis"
                          value={formData.diagnosis}
                          onChange={(e) => setFormData((prev: any) => ({ ...prev, diagnosis: e.target.value }))}
                          className="w-full min-h-32 mt-2 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                          placeholder="Enter diagnosis details..."
                        />
                      </div>

                      {/* Diseases */}
                      <div>
                        <Label className="text-sm font-medium block mb-2">Diseases</Label>
                        {(formData.diseases || []).length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(formData.diseases || []).map((diseaseId: any) => {
                              const disease = diseasesQuery.data?.find((d: any) => d.id === diseaseId);
                              return disease ? (
                                <div key={diseaseId} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-2">
                                  {disease.name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        diseases: (prev.diseases || []).filter((d: any) => d !== diseaseId)
                                      }));
                                    }}
                                    className="font-bold text-sm"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="ابحث عن الأمراض..."
                            value={diseaseSearchText}
                            onChange={(e) => setDiseaseSearchText(e.target.value)}
                            className="pl-10 text-xs"
                          />
                        </div>
                        {diseaseSearchText && (
                          <>
                            {diseasesQuery.isLoading ? (
                              <div className="text-slate-500 text-xs">جاري التحميل...</div>
                            ) : diseasesQuery.isError ? (
                              <div className="text-red-500 text-xs">خطأ في تحميل الأمراض</div>
                            ) : (
                              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded p-2">
                                {(diseasesQuery.data ?? []).filter((disease: any) => disease.name.toLowerCase().includes(diseaseSearchText.toLowerCase())).length === 0 ? (
                                  <div className="text-slate-500 text-xs">لا توجد نتائج</div>
                                ) : (
                                  (diseasesQuery.data ?? []).filter((disease: any) => disease.name.toLowerCase().includes(diseaseSearchText.toLowerCase())).map((disease: any) => (
                                    <div key={disease.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`disease-${disease.id}`}
                                        checked={(formData.diseases || []).includes(disease.id)}
                                        onCheckedChange={() => {
                                          setFormData((prev: any) => {
                                            const diseases = prev.diseases || [];
                                            if (diseases.includes(disease.id)) {
                                              return { ...prev, diseases: diseases.filter((d: any) => d !== disease.id) };
                                            } else {
                                              return { ...prev, diseases: [...diseases, disease.id] };
                                            }
                                          });
                                        }}
                                      />
                                      <Label htmlFor={`disease-${disease.id}`} className="cursor-pointer text-xs flex-1">
                                        {disease.name}
                                      </Label>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {/* Recommendations */}
                        <div className="mt-4">
                          <Label htmlFor="recommendations" className="text-sm font-medium block mb-2">Recommendations</Label>
                          <textarea
                            id="recommendations"
                            value={formData.recommendations}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, recommendations: e.target.value }))}
                            className="w-full min-h-32 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                            placeholder="Enter recommendations..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Treatment Tab */}
              <TabsContent value="treatment" className="mt-0 space-y-4">
                <div className="border-b pb-2 pt-1 flex-1 flex flex-col">
                  <h3 className="text-base font-semibold mb-6">العلاج</h3>
                  <div className="space-y-6">
                    {/* Search Medications */}
                    <div>
                      <label className="font-semibold text-slate-900 text-sm block mb-2">Medications</label>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="ابحث عن الأدوية..."
                          value={medicationSearchText}
                          onChange={(e) => setMedicationSearchText(e.target.value)}
                          className="pl-10 text-xs"
                        />
                      </div>
                      {medicationSearchText && (
                        <>
                          {medicationsQuery.isLoading ? (
                            <div className="text-slate-500 text-xs">جاري التحميل...</div>
                          ) : medicationsQuery.isError ? (
                            <div className="text-red-500 text-xs">خطأ في تحميل العلاجات</div>
                          ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded p-2">
                              {(medicationsQuery.data ?? []).filter((med: any) => med.name.toLowerCase().includes(medicationSearchText.toLowerCase())).length === 0 ? (
                                <div className="text-slate-500 text-xs">لا توجد نتائج</div>
                              ) : (
                                (medicationsQuery.data ?? []).filter((med: any) => med.name.toLowerCase().includes(medicationSearchText.toLowerCase())).map((med: any) => (
                                  <div key={med.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`med-${med.id}`}
                                      checked={(formData.treatment || []).includes(med.id)}
                                      onCheckedChange={() => toggleCheckbox("treatment", med.id)}
                                    />
                                    <Label htmlFor={`med-${med.id}`} className="cursor-pointer text-xs flex-1">
                                      {med.name}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Selected Medications from Templates */}
                    {(formData.treatment || []).length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-xs font-semibold text-blue-900 mb-2">الأدوية المختارة:</div>
                        <div className="flex flex-wrap gap-2">
                          {(formData.treatment || []).map((medId: number) => {
                            const medication = medicationsQuery.data?.find((m: any) => m.id === medId);
                            return (
                              <div key={medId} className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border border-blue-300">
                                <span>{medication?.name || `Med ${medId}`}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleCheckbox("treatment", medId)}
                                  className="text-red-500 hover:text-red-700 font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Saved Prescriptions Templates */}
                    <div>
                      <div className="font-semibold text-slate-900 mb-3 text-sm">Saved Presc</div>
                      {prescriptionsQuery.isLoading ? (
                        <div className="text-slate-500 text-sm">جاري التحميل...</div>
                      ) : prescriptionsQuery.isError ? (
                        <div className="text-red-500 text-sm">خطأ في تحميل الوصفات</div>
                      ) : !prescriptionsQuery.data || Object.keys(prescriptionsQuery.data).length === 0 ? (
                        <div className="text-slate-500 text-xs">لا توجد وصفات محفوظة</div>
                      ) : (
                        <>
                          <Tabs value={prescriptionTab} onValueChange={setPrescriptionTab} dir="rtl" className="mb-3">
                            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1.5 bg-muted/50 p-1.5">
                              {READY_TABS.map((tab) => (
                                <TabsTrigger
                                  key={tab}
                                  value={tab}
                                  className="shrink-0 whitespace-normal px-2 py-1.5 text-[11px] leading-snug sm:text-xs"
                                >
                                  {tab}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                          {(() => {
                            const filteredTemplates = Object.entries(prescriptionsQuery.data ?? {}).filter(
                              ([_, template]: [string, any]) => getTemplateCategory(template.name || "") === prescriptionTab
                            );
                            const filteredTemplateIds = filteredTemplates.map(([id]) => id);
                            const allFiltered = filteredTemplateIds.length > 0 && filteredTemplateIds.every(id => selectedPrescriptionIds.includes(id));

                            return (
                              <>
                                <div className="flex flex-wrap items-center gap-2 rounded border p-2 mb-3">
                                  <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={allFiltered}
                                      onCheckedChange={(checked) => {
                                        if (Boolean(checked)) {
                                          setSelectedPrescriptionIds(prev =>
                                            Array.from(new Set([...prev, ...filteredTemplateIds]))
                                          );
                                        } else {
                                          setSelectedPrescriptionIds(prev =>
                                            prev.filter(id => !filteredTemplateIds.includes(id))
                                          );
                                        }
                                      }}
                                    />
                                    تحديد الكل
                                  </label>
                                  {selectedPrescriptionIds.length > 0 && (
                                    <div className="ml-auto flex gap-2">
                                      <Select value={destinationTab || ""} onValueChange={setDestinationTab}>
                                        <SelectTrigger className="h-7 w-32 text-xs">
                                          <SelectValue placeholder="اختر التاب" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {READY_TABS.filter(tab => tab !== prescriptionTab).map((tab) => (
                                            <SelectItem key={tab} value={tab} className="text-xs">
                                              {tab}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!destinationTab) {
                                            toast.error("اختر التاب المقصود");
                                            return;
                                          }
                                          // Just switch to destination tab and keep selection
                                          setPrescriptionTab(destinationTab);
                                          setDestinationTab(null);
                                          toast.success("تم الانتقال للتاب");
                                        }}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                      >
                                        نقل
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto">
                                  {filteredTemplates.map(([templateId, template]: [string, any]) => (
                                    <div key={templateId} className="flex items-center gap-1 text-xs">
                                      <Checkbox
                                        id={`presc-${templateId}`}
                                        checked={selectedPrescriptionIds.includes(templateId)}
                                        onCheckedChange={(checked) => {
                                          setSelectedPrescriptionIds(prev =>
                                            Boolean(checked)
                                              ? [...prev, templateId]
                                              : prev.filter(id => id !== templateId)
                                          );
                                        }}
                                      />
                                      <Button
                                        variant="outline"
                                        type="button"
                                        className="h-6 px-2 text-xs truncate"
                                        onClick={() => {
                                          // Could add selection logic here
                                        }}
                                        title={template.name || templateId}
                                      >
                                        {template.name || templateId}
                                      </Button>
                                    </div>
                                  ))}
                                  {filteredTemplates.length === 0 ? (
                                    <div className="col-span-full text-center text-xs text-slate-500 py-4">
                                      لا توجد وصفات في هذا التاب
                                    </div>
                                  ) : null}
                                </div>
                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              </fieldset>
            </div>
          </Tabs>
        </div>

        {/* Footer - Always visible */}
        <div className="border-t p-4 bg-slate-50 flex gap-2 flex-shrink-0">
          {!hubRo ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{ backgroundColor: isSaving ? '#9ca3af' : 'blue', color: 'white', padding: '10px 20px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              {isSaving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          ) : (
            <span className="self-center text-xs text-muted-foreground px-2">{patientHubViewOnlyHint}</span>
          )}
          {!embedded ? (
            <button
              type="button"
              onClick={dismiss}
              style={{
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              إغلاق
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
