import { Fragment, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Download, Printer, User, FileText, Eye } from "lucide-react";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { connectSheetUpdates } from "@/lib/ws";
import {
  coerceSheetDesignerConfig,
  DEFAULT_SHEET_DESIGNER_CONFIG,
  loadSheetDesignerConfig,
  saveSheetDesignerConfig,
} from "@/lib/sheetDesigner";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";
import SheetCenterHeader from "@/components/SheetCenterHeader";
import FollowupTablesBody from "@/components/sheets/FollowupTablesBody";

export default function ConsultantSheet() {
  const { user, isAuthenticated } = useAuth();
  const { goBack, goHome } = useAppNavigation();
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/sheets/consultant/:id");
  const [, hubConsultParams] = useRoute("/patient-hub/sheets/consultant/:id");
  const initialPatientIdRaw = params?.id ?? hubConsultParams?.id;
  const initialPatientId = initialPatientIdRaw
    ? Number(initialPatientIdRaw)
    : undefined;
  const embeddedInPatientHub = location.startsWith("/patient-hub/sheets/");
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
  const printMode = usePrintMode({ ready: Boolean(initialPatientId) });
  const [operationDateLeft, setOperationDateLeft] = useState("");
  const [operationDateRight, setOperationDateRight] = useState("");
  const formatDateLabel = (value: string) => {
    if (!value) return "Not selected";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return value;
    return date.toLocaleDateString("ar-EG");
  };

  const [operationType, setOperationType] = useState("");
  const [operationEyes, setOperationEyes] = useState({
    right: false,
    left: false,
  });
  const [designerConfig, setDesignerConfig] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG,
  );

  const [formData, setFormData] = useState({
    patientName: "",
    dateOfBirth: "",
    age: "",
    phone: "",
    address: "",
    code: "",
    job: "",
    knowledgeType: "",
    consultantName: "",
    examinationDate: "",
    keratoconusHistory: false,
    familyHistory: false,
    eyeDiseases: false,
    tearSubstitute: false,
    tearIncreasePregnancy: false,
    sandySensation: false,
    treatmentUsed: false,
    dryEyeSymptoms: false,
    sensitivityMedicines: false,
    blueWaterTreatment: false,
    supplements: false,
    thyroidDiseases: false,
    immuneDiseases: false,
    dominantEye: "OD",
    ucvaOD: "",
    ucvaOS: "",
    bcvaOD: "",
    bcvaOS: "",
    refractionOD: { s: "", c: "", a: "" },
    refractionOS: { s: "", c: "", a: "" },
    drOD: "",
    drOS: "",
    fundusOD: "",
    fundusOS: "",
    iopOD: "",
    iopOS: "",
    comments: "",
    final: "",
  });
  const [signatures, setSignatures] = useState({
    reception: "",
    nurse: "",
    technician: "",
    doctor: "",
  });

  const [followups, setFollowups] = useState([
    { id: 1, date: "", type: "المتابعة الأولى", right: true, left: false },
    { id: 2, date: "", type: "المتابعة الثانية", right: false, left: true },
    { id: 3, date: "", type: "المتابعة الثالثة", right: false, left: false },
    { id: 4, date: "", type: "المتابعة الرابعة", right: true, left: true },
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;
  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, {
    enabled: Boolean(initialPatientId),
    refetchOnWindowFocus: false,
  });
  const sheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: initialPatientId ?? 0, sheetType: "consultant" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const prescriptionsQuery =
    trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
      { patientId: initialPatientId ?? 0 },
      { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
    );
  const surgeriesQuery = trpc.medical.getSurgeriesByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const followupsQuery = trpc.medical.getPostOpFollowupsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: initialPatientId ?? 0, limit: 10 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const testRequestsQuery = trpc.medical.getPatientTestRequests?.useQuery?.(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const syncRefetchTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!initialPatientId) return;
    const socket = connectSheetUpdates({
      patientId: initialPatientId,
      onUpdate: () => {
        if (syncRefetchTimerRef.current != null) return;
        syncRefetchTimerRef.current = window.setTimeout(() => {
          syncRefetchTimerRef.current = null;
          Promise.all([
            sheetQuery.refetch(),
            patientQuery.refetch(),
            examinationsQuery.refetch(),
            visitsQuery.refetch(),
            reportsQuery.refetch(),
            prescriptionsQuery.refetch(),
            surgeriesQuery.refetch(),
            followupsQuery.refetch(),
            pentacamQuery.refetch(),
            testRequestsQuery?.refetch?.(),
          ]);
        }, 250);
      },
    });
    return () => {
      socket?.close();
      if (syncRefetchTimerRef.current != null) {
        window.clearTimeout(syncRefetchTimerRef.current);
        syncRefetchTimerRef.current = null;
      }
    };
  }, [initialPatientId, sheetQuery, patientQuery]);
  const designerSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );
  const mobileSheetModeQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "mobile_sheet_mode_v1" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );

  const mobileSheetModeRaw = (mobileSheetModeQuery.data as any)?.value;
  const mobileSheetModeEnabled = Boolean(
    mobileSheetModeRaw && typeof mobileSheetModeRaw === "object"
      ? mobileSheetModeRaw.enabled
      : mobileSheetModeRaw,
  );

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!patientQuery.data) return;
    const patient = patientQuery.data as any;
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? "",
      dateOfBirth: formatDate(patient.dateOfBirth),
      age: patient.age != null ? String(patient.age) : "",
      phone: patient.phone ?? "",
      address: patient.address ?? "",
      code: patient.patientCode ?? "",
      job: patient.occupation ?? "",
    }));
  }, [patientQuery.data]);

  useEffect(() => {
    if (!sheetQuery.data) return;
    try {
      const parsed = JSON.parse(sheetQuery.data);
      if (parsed.examData?.autorefraction) {
        const auto = parsed.examData.autorefraction;
        setFormData((prev) => ({
          ...prev,
          ucvaOD: auto.od?.ucva ? auto.od.ucva : prev.ucvaOD,
          ucvaOS: auto.os?.ucva ? auto.os.ucva : prev.ucvaOS,
          bcvaOD: auto.od?.bcva ? auto.od.bcva : prev.bcvaOD,
          bcvaOS: auto.os?.bcva ? auto.os.bcva : prev.bcvaOS,
          refractionOD: {
            s: auto.od?.s ? auto.od.s : prev.refractionOD.s,
            c: auto.od?.c ? auto.od.c : prev.refractionOD.c,
            a: auto.od?.axis ? auto.od.axis : prev.refractionOD.a,
          },
          refractionOS: {
            s: auto.os?.s ? auto.os.s : prev.refractionOS.s,
            c: auto.os?.c ? auto.os.c : prev.refractionOS.c,
            a: auto.os?.axis ? auto.os.axis : prev.refractionOS.a,
          },
          iopOD: auto.od?.iop ? auto.od.iop : prev.iopOD,
          iopOS: auto.os?.iop ? auto.os.iop : prev.iopOS,
        }));
      }
      if (parsed.signatures) {
        setSignatures({
          reception: parsed.signatures.reception ?? "",
          nurse: parsed.signatures.nurse ?? "",
          technician: parsed.signatures.technician ?? "",
          doctor: parsed.signatures.doctor ?? "",
        });
      }
    } catch {
      // ignore malformed data
    }
  }, [sheetQuery.data]);

  useEffect(() => {
    if (!examinationsQuery.data || examinationsQuery.data.length === 0) return;
    const latestExam = examinationsQuery.data[0] as any;
    if (!latestExam.autorefraction) return;
    const auto = latestExam.autorefraction;
    setFormData((prev) => ({
      ...prev,
      ucvaOD: auto.od?.ucva ? auto.od.ucva : prev.ucvaOD,
      ucvaOS: auto.os?.ucva ? auto.os.ucva : prev.ucvaOS,
      bcvaOD: auto.od?.bcva ? auto.od.bcva : prev.bcvaOD,
      bcvaOS: auto.os?.bcva ? auto.os.bcva : prev.bcvaOS,
      refractionOD: {
        s: auto.od?.s ? auto.od.s : prev.refractionOD.s,
        c: auto.od?.c ? auto.od.c : prev.refractionOD.c,
        a: auto.od?.axis ? auto.od.axis : prev.refractionOD.a,
      },
      refractionOS: {
        s: auto.os?.s ? auto.os.s : prev.refractionOS.s,
        c: auto.os?.c ? auto.os.c : prev.refractionOS.c,
        a: auto.os?.axis ? auto.os.axis : prev.refractionOS.a,
      },
      iopOD: auto.od?.iop ? auto.od.iop : prev.iopOD,
      iopOS: auto.os?.iop ? auto.os.iop : prev.iopOS,
    }));
  }, [examinationsQuery.data]);

  useEffect(() => {
    const stateData = (examinationStateQuery.data as any)?.data;
    if (!stateData) return;
    const doctorFromState =
      String(stateData.doctorName ?? "").trim() ||
      String(stateData.signatures?.doctor ?? "").trim();
    if (!doctorFromState) return;
    setSignatures((prev) => ({ ...prev, doctor: doctorFromState }));
  }, [examinationStateQuery.data]);

  useEffect(() => {
    const fullName = String(user?.name ?? "").trim();
    if (!fullName) return;
    const role = String(user?.role ?? "").toLowerCase();
    setSignatures((prev) => ({
      ...prev,
      reception: role === "reception" ? fullName : prev.reception,
      nurse: role === "nurse" ? fullName : prev.nurse,
      technician: role === "technician" ? fullName : prev.technician,
      doctor: role === "doctor" ? prev.doctor || fullName : prev.doctor,
    }));
  }, [user?.name, user?.role, sheetQuery.data, examinationStateQuery.data]);

  useEffect(() => {
    setDesignerConfig(loadSheetDesignerConfig());
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setDesignerConfig(merged);
    saveSheetDesignerConfig(merged);
  }, [designerSettingsQuery.data]);

  useEffect(() => {
    setFollowups((prev) =>
      prev.map((item, index) => ({
        ...item,
        type:
          designerConfig.followupConsultant.followupNames[index] ?? item.type,
      })),
    );
  }, [designerConfig.followupConsultant.followupNames]);

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    phone?: string | null;
    age?: number | null;
    dateOfBirth?: string | Date | null;
    address?: string | null;
    patientCode?: string | null;
    occupation?: string | null;
  }) => {
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? "",
      dateOfBirth: formatDate(patient.dateOfBirth),
      age: patient.age != null ? String(patient.age) : "",
      phone: patient.phone ?? "",
      address: patient.address ?? "",
      code: patient.patientCode ?? "",
      job: patient.occupation ?? "",
    }));
    if (patient.id) {
      const qs = typeof window !== "undefined" ? window.location.search : "";
      if (embeddedInPatientHub) {
        setLocation(`/patient-hub/sheets/consultant/${patient.id}${qs}`);
      } else {
        setLocation(`/sheets/consultant/${patient.id}`);
      }
    }
  };

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.code || initialPatientId || "consultant-sheet").trim()}.pdf`,
      { forceBrowserPrint: true },
    );
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleBackNav = () => {
    const qs = typeof window !== "undefined" ? window.location.search : "";
    if (embeddedInPatientHub && initialPatientId) {
      setLocation(`/patient-hub/examination/${initialPatientId}${qs}`);
      return;
    }
    goBack();
  };

  const CONSULTANT_TABS_PERSIST_KEY = `consultant-sheet:${initialPatientId ?? "new"}`;
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "sheet";
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "followup") return "followup";
    try {
      const stored =
        localStorage.getItem(`tabs:${CONSULTANT_TABS_PERSIST_KEY}`) || "";
      if (stored === "sheet" || stored === "followup") return stored;
    } catch {
      // ignore
    }
    return "sheet";
  });
  const followupLabels = designerConfig.followupConsultant;
  const consultantTemplate = designerConfig.templates.consultant;

  // ─── Shared style helpers ────────────────────────────────────────────────────
  const ctd = "p-1.5 border border-[#c3c6d6] text-center";
  const inp =
    "w-full text-center bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] py-0.5 text-sm font-mono";
  const sectionHeader =
    "flex items-center gap-2 px-3 py-1.5 bg-[#003d9b] text-white text-xs font-bold uppercase tracking-wider rounded-t-md";

  const renderSheetBody = (readOnly = false) => {
    const today = new Date().toLocaleDateString("en-GB");
    return (
      <fieldset disabled={embeddedInPatientHub || readOnly} className="border-0 p-0 m-0 min-w-0 disabled:opacity-95 consultant-main-print-root">
        <div
          className="consultant-sheet-inner bg-white text-[#191c1e] font-sans p-6 print:p-[8mm] print:border-0 print:shadow-none border border-[#c3c6d6] shadow-md flex flex-col gap-4 w-[210mm] max-w-full mx-auto rounded-lg"
          data-purpose="main-document"
          dir="ltr"
        >
          {/* ── HEADER ── */}
          <header className="flex items-start justify-between border-b-2 border-[#003d9b] pb-3 mb-1">
            <div className="flex-1">
              <div className="text-xl font-extrabold text-[#003d9b] leading-tight tracking-tight">
                {BRAND_NAME_EN}
              </div>
              <div className="text-sm text-[#434654] leading-snug mt-0.5">
                Laser &amp; Vision Correction
              </div>
              <div className="text-xs text-[#737685] mt-0.5">Ophthalmic Excellence Center</div>
            </div>
            <div className="text-center px-4">
              <div className="text-base font-bold text-[#003d9b]">Consultant Sheet</div>

              <div className="text-xs text-[#737685] mt-0.5">{formData.examinationDate ? new Date(formData.examinationDate).toLocaleDateString("en-GB") : today}</div>
            </div>
            <div className="text-left text-xs text-[#434654] space-y-0.5">
              {formData.patientName && <div className="font-bold text-sm text-[#191c1e]">{formData.patientName}</div>}
              {formData.code && <div className="text-[#737685]">ID: {formData.code}</div>}
            </div>
          </header>

          {/* ── PATIENT INFORMATION ── */}
          <section data-purpose="patient-info">
            <div className={sectionHeader}>
              <User className="h-3.5 w-3.5" />
              <span>Patient Information</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 bg-[#f8f9fb]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm" dir="rtl">
                {/* Row 1: Name, DOB, Age, Code */}
                <div className="col-span-2 md:col-span-1">
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Full Name</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] font-semibold text-[#003d9b] pb-0.5 text-right" dir="rtl">{formData.patientName}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Date of Birth</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Age</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.age}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Patient Code</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 font-mono text-[#526069] text-right" dir="ltr">{formData.code}</div>
                </div>
                {/* Row 2: Address, Phone, Job, Date */}
                <div className="col-span-2">
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Address</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="rtl">{formData.address}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Phone</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.phone}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Occupation</span>
                  <input
                    dir="rtl"
                    className="w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] text-sm min-h-[22px] pb-0.5 text-right"
                    value={formData.job}
                    onChange={e => setFormData(p => ({ ...p, job: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#c3c6d6] flex items-center gap-2 text-sm" dir="rtl">
                <span className="text-xs text-[#434654] font-semibold">Consultant:</span>
                <span className="font-semibold text-[#003d9b]">{signatures.doctor || "—"}</span>
                <span className="mr-auto text-xs text-[#737685]">Exam Date: {today}</span>
              </div>
            </div>
          </section>

          {/* ── MEDICAL HISTORY ── */}
          <section className="print-consultant-questions" data-purpose="medical-history">
            <div className={sectionHeader}>
              <FileText className="h-3.5 w-3.5" />
              <span>Medical History</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full border-collapse text-sm" dir="rtl">
                <thead>
                  <tr className="bg-[#e7e8ea]">
                    <th className="w-10 p-1.5 border border-[#c3c6d6] text-center text-xs">No</th>
                    <th className="w-10 p-1.5 border border-[#c3c6d6] text-center text-xs">Yes</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-right text-xs">Condition</th>
                    <th className="w-10 p-1.5 border border-[#c3c6d6] text-center text-xs">No</th>
                    <th className="w-10 p-1.5 border border-[#c3c6d6] text-center text-xs">Yes</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-right text-xs">Condition</th>
                    <th className="w-10 p-1.5 border border-[#c3c6d6] text-center text-xs">No</th>
                    <th className="w-10 p-1.5 border border-[#c3c6d6] text-center text-xs">Yes</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-right text-xs">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["General Diseases (BP/DM/Thyroid)", "Pregnancy / Lactation", "AC/Air Sensitivity"],
                    ["Glaucoma Treatment", "Family Keratoconus History", "Eye Diseases"],
                    ["Cortisone / Steroids", "Thyroid Disorder", "Autoimmune Disease"],
                    ["Acne Treatment (Roaccutane)", "Tear Substitute Use", "Other"],
                  ].map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#f8f9fb]"}>
                      {row.map((q, colIndex) => (
                        q ? (
                          <Fragment key={`${rowIndex}-${colIndex}`}>
                            <td className="text-center border border-[#c3c6d6] p-1">
                              <input type="checkbox" className="w-3.5 h-3.5 accent-[#003d9b]" />
                            </td>
                            <td className="text-center border border-[#c3c6d6] p-1">
                              <input type="checkbox" className="w-3.5 h-3.5 accent-[#003d9b]" />
                            </td>
                            <td className="p-1.5 border border-[#c3c6d6] text-right text-xs" dir="ltr" style={{textAlign:'left'}}>{q}</td>
                          </Fragment>
                        ) : (
                          <Fragment key={`${rowIndex}-${colIndex}`}>
                            <td className="border border-[#c3c6d6] bg-[#f0f1f3]" />
                            <td className="border border-[#c3c6d6] bg-[#f0f1f3]" />
                            <td className="border border-[#c3c6d6] bg-[#f0f1f3]" />
                          </Fragment>
                        )
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── VISUAL ACUITY + DOMINANT EYE ── */}
          <section className="print-consultant-visual-grid grid grid-cols-1 lg:grid-cols-12 gap-4" data-purpose="examination-section" dir="ltr">
            <div className="lg:col-span-8">
              <div className={sectionHeader} dir="ltr">
                <Eye className="h-3.5 w-3.5" />
                <span>Comprehensive Refraction</span>
              </div>
              <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-[#003d9b] text-white text-xs font-bold uppercase">
                    <tr>
                      <th className="p-2 border border-[#003d9b]/40">EYE</th>
                      <th className="p-2 border border-[#003d9b]/40">UCVA</th>
                      <th className="p-2 border border-[#003d9b]/40">BCVA</th>
                      <th className="p-2 border border-[#003d9b]/40">IOP (mmHg)</th>
                      <th className="p-2 border border-[#003d9b]/40 w-8">DOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#003d9b]/5">
                      <td className="p-2 border border-[#c3c6d6] font-bold text-[#003d9b]">OD (Right)</td>
                      <td className={ctd}><input className={inp} value={formData.ucvaOD} onChange={e => setFormData(p => ({ ...p, ucvaOD: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.bcvaOD} onChange={e => setFormData(p => ({ ...p, bcvaOD: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.iopOD} onChange={e => setFormData(p => ({ ...p, iopOD: e.target.value }))} /></td>
                      <td className="p-2 border border-[#c3c6d6] text-center">
                        <input type="radio" name="dominant" checked={formData.dominantEye === "OD"} onChange={() => setFormData(p => ({ ...p, dominantEye: "OD" }))} className="accent-[#003d9b]" />
                      </td>
                    </tr>
                    <tr className="bg-[#f3f4f6]">
                      <td className="p-2 border border-[#c3c6d6] font-bold text-[#526069]">OS (Left)</td>
                      <td className={ctd}><input className={inp} value={formData.ucvaOS} onChange={e => setFormData(p => ({ ...p, ucvaOS: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.bcvaOS} onChange={e => setFormData(p => ({ ...p, bcvaOS: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.iopOS} onChange={e => setFormData(p => ({ ...p, iopOS: e.target.value }))} /></td>
                      <td className="p-2 border border-[#c3c6d6] text-center">
                        <input type="radio" name="dominant" checked={formData.dominantEye === "OS"} onChange={() => setFormData(p => ({ ...p, dominantEye: "OS" }))} className="accent-[#003d9b]" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className={sectionHeader} dir="ltr">
                <span>Clinical Examination</span>
              </div>
              <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
                <table className="w-full border-collapse text-sm" dir="ltr">
                  <tbody>
                    <tr className="border-b border-[#c3c6d6]">
                      <td className="p-2 bg-[#f3f4f6] text-xs font-semibold text-[#434654] w-1/2">Tear Film / BUT</td>
                      <td className="p-2"><input className={inp} /></td>
                    </tr>
                    <tr className="border-b border-[#c3c6d6]">
                      <td className="p-2 bg-[#f3f4f6] text-xs font-semibold text-[#434654]">Schirmer Test</td>
                      <td className="p-2"><input className={inp} /></td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-[#f3f4f6] text-xs font-semibold text-[#434654]">Lid Margin</td>
                      <td className="p-2"><input className={inp} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── CLINICAL REFRACTION ── */}
          <section dir="ltr">
            <div className={sectionHeader} dir="ltr">
              <span>Clinical Refraction (S / C / A)</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead className="bg-[#e7e8ea] text-xs uppercase font-bold">
                  <tr>
                    <th className="p-2 border border-[#c3c6d6] w-36" rowSpan={2}>Parameter</th>
                    <th className="p-2 border border-[#c3c6d6] text-[#003d9b]" colSpan={3}>OD — Right Eye</th>
                    <th className="p-2 border border-[#c3c6d6] text-[#526069]" colSpan={3}>OS — Left Eye</th>
                  </tr>
                  <tr>
                    <th className="p-1.5 border border-[#c3c6d6] text-[10px]">Sphere (S)</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-[10px]">Cylinder (C)</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-[10px]">Axis (A)</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-[10px]">Sphere (S)</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-[10px]">Cylinder (C)</th>
                    <th className="p-1.5 border border-[#c3c6d6] text-[10px]">Axis (A)</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  <tr className="bg-white">
                    <td className="p-2 border border-[#c3c6d6] text-left text-xs font-semibold text-[#434654] bg-[#f3f4f6]">Refraction</td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.s} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, s: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.c} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, c: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.a} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, a: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.s} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, s: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.c} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, c: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.a} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, a: e.target.value } }))} /></td>
                  </tr>
                  <tr className="bg-[#f8f9fb]">
                    <td className="p-2 border border-[#c3c6d6] text-left text-xs font-semibold text-[#434654] bg-[#f3f4f6]">Fundus Exam</td>
                    <td className={ctd} colSpan={3}><input className={inp} value={formData.fundusOD} onChange={e => setFormData(p => ({ ...p, fundusOD: e.target.value }))} /></td>
                    <td className={ctd} colSpan={3}><input className={inp} value={formData.fundusOS} onChange={e => setFormData(p => ({ ...p, fundusOS: e.target.value }))} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── CLINICAL DIAGRAMS ── */}
          <section className="print-consultant-diagrams" data-purpose="clinical-diagrams">
            <div className={sectionHeader} dir="ltr">
              <span>Clinical Diagrams</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-4 bg-white">
              <div className="grid grid-cols-2 gap-8 min-h-[80mm]">
                <div className="flex flex-col items-center justify-center gap-3">
                  <span className="text-xs font-bold uppercase px-3 py-1 bg-[#003d9b]/10 text-[#003d9b] rounded-full border border-[#003d9b]/20">OD — Right Eye</span>
                  <div className="w-52 h-52 rounded-full border-2 border-[#003d9b]/30 flex items-center justify-center relative bg-white shadow-inner">
                    <div className="absolute inset-0 rounded-full overflow-hidden opacity-5">
                      <div className="absolute top-1/2 left-0 right-0 border-t border-slate-900 -translate-y-1/2"></div>
                      <div className="absolute left-1/2 top-0 bottom-0 border-l border-slate-900 -translate-x-1/2"></div>
                    </div>
                    <span className="text-[#003d9b]/20 text-2xl font-bold select-none">OD</span>
                  </div>

                </div>
                <div className="flex flex-col items-center justify-center gap-3">
                  <span className="text-xs font-bold uppercase px-3 py-1 bg-[#526069]/10 text-[#526069] rounded-full border border-[#526069]/20">OS — Left Eye</span>
                  <div className="w-52 h-52 rounded-full border-2 border-[#526069]/30 flex items-center justify-center relative bg-white shadow-inner">
                    <div className="absolute inset-0 rounded-full overflow-hidden opacity-5">
                      <div className="absolute top-1/2 left-0 right-0 border-t border-slate-900 -translate-y-1/2"></div>
                      <div className="absolute left-1/2 top-0 bottom-0 border-l border-slate-900 -translate-x-1/2"></div>
                    </div>
                    <span className="text-[#526069]/20 text-2xl font-bold select-none">OS</span>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* ── DIAGNOSIS & NOTES ── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" dir="rtl">
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ba1a1a] text-white text-xs font-bold uppercase tracking-wider rounded-t-md">
                <span>Final Diagnosis</span>
              </div>
              <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 min-h-[80px] bg-white">
                <textarea
                  dir="rtl"
                  className="w-full bg-transparent border-0 focus:outline-none text-sm resize-none min-h-[70px] text-right"
                  placeholder="Enter diagnosis..."
                  value={formData.final}
                  onChange={e => setFormData(p => ({ ...p, final: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#e7e8ea] text-[#434654] text-xs font-bold uppercase tracking-wider rounded-t-md border border-[#c3c6d6]">
                <span>Notes &amp; Comments</span>
              </div>
              <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 min-h-[80px] bg-white">
                <textarea
                  dir="rtl"
                  className="w-full bg-transparent border-0 focus:outline-none text-sm resize-none min-h-[70px] text-right"
                  placeholder="Enter notes..."
                  value={formData.comments}
                  onChange={e => setFormData(p => ({ ...p, comments: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* ── SIGNATURES ── */}
          <footer className="print-consultant-signatures border-t-2 border-[#003d9b] pt-4 mt-2" dir="rtl">
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Reception", val: signatures.reception, isDoctor: false },
                { label: "Nurse", val: signatures.nurse, isDoctor: false },
                { label: "Technician", val: signatures.technician, isDoctor: false },
                { label: "Consultant", val: signatures.doctor, isDoctor: true },
              ].map(({ label, val, isDoctor }, i) => (
                <div key={i} className="flex flex-col gap-2 text-center">
                  <div className={`h-10 border-b-2 flex items-end justify-center pb-1 ${isDoctor ? "border-[#003d9b]" : "border-[#c3c6d6]"}`}>
                    {val && <span className={`text-xs italic ${isDoctor ? "text-[#003d9b] font-semibold" : "text-[#737685]"}`}>{val}</span>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isDoctor ? "text-[#003d9b]" : "text-[#434654]"}`}>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-2 border-t border-[#c3c6d6] flex justify-between items-center text-[10px] text-[#737685] uppercase tracking-widest" dir="ltr">
              <span>Page 1 of 1</span>
              <span>Ophthalmic Management System</span>
              <span>Date: {today}</span>
            </div>
          </footer>
        </div>
      </fieldset>
    );
  };

  return (
    <div
      className={`${embeddedInPatientHub ? "prescription-root min-h-0 flex-1" : "min-h-screen"} bg-[#F8F9FB] sheet-layout consultant-page-root ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
      dir="rtl"
    >
      <style>{`
        ${designerConfig.css.consultant || ""}
        .consultant-sheet-inner, .consultant-sheet-inner * {
          font-weight: 400 !important;
          text-decoration: none !important;
        }
        .consultant-sheet-inner th { font-weight: 700 !important; }
        @media print {
          /* ═══ ONE-PAGE A4 FIT ═══ */
          @page { size: A4 portrait; margin: 6mm 7mm; }

          /* ── Root reset ── */
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            overflow: hidden !important;
          }
          #root, .consultant-page-root {
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          /* ── Sheet container: fill exactly one A4 page ── */
          .print-page-center-a4 { width: 210mm !important; margin: 0 !important; }
          main[data-mobile-pdf-root] { width: 210mm !important; max-width: 210mm !important; margin: 0 !important; padding: 0 !important; }
          .consultant-main-print-root .consultant-sheet-inner {
            width: 196mm !important;
            max-width: 196mm !important;
            height: 285mm !important;
            max-height: 285mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 3mm 4mm !important;
            gap: 3px !important;
            border: 0 !important;
            box-shadow: none !important;
            font-size: 78% !important;
            line-height: 1.15 !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* ── Color preservation ── */
          .consultant-sheet-inner * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .consultant-sheet-inner [class*="bg-\[#003d9b"] {
            background-color: #003d9b !important;
            color: #ffffff !important;
          }
          .consultant-sheet-inner [class*="bg-\[#ba1a1a"] {
            background-color: #ba1a1a !important;
            color: #ffffff !important;
          }

          /* ── No page breaks — single page only ── */
          .consultant-sheet-inner section,
          .consultant-sheet-inner tr,
          .consultant-sheet-inner footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .consultant-sheet-inner * {
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* ── Aggressive size reduction ── */
          /* Header */
          .consultant-sheet-inner header {
            padding-bottom: 2px !important;
            margin-bottom: 0 !important;
          }
          /* All sections: remove gaps */
          .consultant-sheet-inner section {
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Section header bars */
          .consultant-sheet-inner [class*="px-3"][class*="py-1"] {
            padding: 1px 4px !important;
          }
          /* All padding classes */
          .consultant-sheet-inner .p-6 { padding: 2px 3px !important; }
          .consultant-sheet-inner .p-4 { padding: 2px 3px !important; }
          .consultant-sheet-inner .p-3 { padding: 1px 3px !important; }
          .consultant-sheet-inner .p-2 { padding: 1px 2px !important; }
          .consultant-sheet-inner .p-1 { padding: 1px !important; }
          .consultant-sheet-inner .p-1\.5 { padding: 1px 2px !important; }
          /* Gaps */
          .consultant-sheet-inner .gap-8 { gap: 4px !important; }
          .consultant-sheet-inner .gap-6 { gap: 3px !important; }
          .consultant-sheet-inner .gap-4 { gap: 3px !important; }
          .consultant-sheet-inner .gap-3 { gap: 2px !important; }
          .consultant-sheet-inner .gap-2 { gap: 2px !important; }
          .consultant-sheet-inner .gap-1 { gap: 1px !important; }
          /* Margins */
          .consultant-sheet-inner .mb-1 { margin-bottom: 0 !important; }
          .consultant-sheet-inner .mb-0\.5 { margin-bottom: 0 !important; }
          .consultant-sheet-inner .mt-2 { margin-top: 1px !important; }
          .consultant-sheet-inner .mt-4 { margin-top: 2px !important; }
          .consultant-sheet-inner .pt-2 { padding-top: 1px !important; }
          .consultant-sheet-inner .pt-4 { padding-top: 2px !important; }
          /* Tables */
          .consultant-sheet-inner table { font-size: 8px !important; }
          .consultant-sheet-inner th, .consultant-sheet-inner td { padding: 1px 2px !important; line-height: 1.1 !important; }
          /* Inputs */
          .consultant-sheet-inner input:not([type="checkbox"]):not([type="radio"]),
          .consultant-sheet-inner textarea {
            border: 0 !important;
            border-bottom: 1px solid #c3c6d6 !important;
            box-shadow: none !important;
            outline: 0 !important;
            background: transparent !important;
            font-size: 8px !important;
            line-height: 1.1 !important;
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
          }
          /* Min-heights: collapse them */
          .consultant-sheet-inner [class*="min-h-"] { min-height: 0 !important; }
          .consultant-sheet-inner [class*="min-h-\[22px\]"] { min-height: 14px !important; }
          .consultant-sheet-inner [class*="min-h-\[80px\]"] { min-height: 18px !important; }
          .consultant-sheet-inner [class*="min-h-\[70px\]"] { min-height: 16px !important; }
          .consultant-sheet-inner [class*="min-h-\[80mm\]"] { min-height: 30mm !important; }
          /* Diagrams: shrink circles */
          .consultant-sheet-inner .w-52 { width: 28mm !important; }
          .consultant-sheet-inner .h-52 { height: 28mm !important; }
          /* Medical history checkboxes */
          .print-consultant-questions table { font-size: 7.5px !important; }
          .print-consultant-questions input[type="checkbox"] { width: 9px !important; height: 9px !important; }
          /* Signature line */
          .consultant-sheet-inner .h-10 { height: 18px !important; }
          .consultant-sheet-inner .pt-4.mt-2 { padding-top: 2px !important; margin-top: 2px !important; }
          /* Footer text */
          .consultant-sheet-inner footer .text-\[10px\] { font-size: 7px !important; }

          /* ── Grid layouts ── */
          .print-consultant-visual-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important;
          }
          .print-consultant-signatures {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          .print-consultant-diagrams .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
          }

          /* ── Borders ── */
          .consultant-sheet-inner [class*="border-\[#c3c6d6"] { border-color: #c3c6d6 !important; }
          .consultant-sheet-inner [class*="border-\[#003d9b"] { border-color: #003d9b !important; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <header className={`sticky top-0 z-10 bg-white border-b border-gray-200 print:hidden ${printMode.printView ? "hidden" : ""} ${embeddedInPatientHub ? "py-1.5" : "py-2 shadow-sm"}`}>
        <div className={`flex items-center justify-between gap-2 ${embeddedInPatientHub ? "px-2" : "container mx-auto px-4"}`}>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackNav} className="gap-1">
              <ArrowRight className="h-4 w-4" /> Back
            </Button>
            {formData.patientName && <span className="text-sm font-semibold">{formData.patientName}</span>}
            {formData.code && <span className="text-xs text-muted-foreground">ID: {formData.code}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <PatientPicker initialPatientId={initialPatientId} onSelect={handleSelectPatient} />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Save Sheet
            </Button>
            <Button size="sm" className="gap-1.5 bg-[#003D9B] hover:bg-[#003D9B]/90 text-white" onClick={handleDownloadPDF}>
              <Download className="h-3.5 w-3.5" /> Print PDF
            </Button>
          </div>
        </div>
      </header>

      {printMode.printView && (
        <PrintPreviewBanner title={consultantTemplate.sheetTitle} subtitle={formData.patientName || undefined} onPrint={handlePrint} />
      )}

      <main data-mobile-pdf-root className={`print:p-0 ${embeddedInPatientHub ? "px-2 py-1" : "container mx-auto px-4 py-4 pb-24 sm:pb-4"}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} persistKey={CONSULTANT_TABS_PERSIST_KEY} className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
          <TabsList className={`mb-3 ${embeddedInPatientHub ? "h-8 w-fit gap-0.5 p-1 [&_[data-slot=tabs-trigger]]:px-2.5 [&_[data-slot=tabs-trigger]]:text-xs" : "mb-2 flex h-auto w-full"}`}>
            <TabsTrigger value="followup">Follow-ups</TabsTrigger>
            <TabsTrigger value="sheet">Examination</TabsTrigger>
          </TabsList>
          <TabsContent value="sheet" className="space-y-0">
            {activeTab === "sheet" ? renderSheetBody() : null}
          </TabsContent>
          <TabsContent value="followup" className="space-y-0">
            {activeTab === "followup" ? (
              <FollowupTablesBody
                titleEn="Consultant Follow-up"
                titleAr="Consultant Follow-up"
                patientName={formData.patientName}
                patientDOB={formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}
                operationType={operationType}
                setOperationType={setOperationType}
                operationEyes={operationEyes}
                setOperationEyes={setOperationEyes}
                operationDateRight={operationDateRight}
                setOperationDateRight={setOperationDateRight}
                followups={followups}
                setFollowups={setFollowups}
                followupLabels={followupLabels}
                signatures={signatures}
              />
            ) : null}
          </TabsContent>
        </Tabs>

        <div className="hidden print:block">
          <div className="print-page-center-a4">{renderSheetBody(true)}</div>
        </div>

        <div className={`sheet-mobile-actions print:hidden ${printMode.printView ? "hidden" : ""}`}>
          <Button type="button" variant="outline" onClick={handleBackNav}>Back</Button>
          <Button type="button" variant="outline" onClick={handlePrint}>Print</Button>
          <Button type="button" variant="default" onClick={handleDownloadPDF}>Download PDF</Button>
        </div>
      </main>
    </div>
  );
}
