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
import { ArrowRight, Download, Printer } from "lucide-react";
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
    if (!value) return "لم يتم الاختيار";
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
    // Patient Info
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

    // Medical History
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

    // Examination Data
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

    // Comments
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

  const handleFollowupDateChange = (id: number, value: string) => {
    setFollowups((prev) =>
      prev.map((item) => (item.id === id ? { ...item, date: value } : item)),
    );
  };

  const handleFollowupTypeChange = (id: number, value: string) => {
    setFollowups((prev) =>
      prev.map((item) => (item.id === id ? { ...item, type: value } : item)),
    );
  };

  const handleFollowupEyeChange = (
    id: number,
    eye: "right" | "left",
    checked: boolean,
  ) => {
    setFollowups((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [eye]: checked } : item)),
    );
  };

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

  const handleHomeNav = () => {
    goHome();
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

  const renderSheetBody = (readOnly = false) => {
    const ctd = "p-1.5 border border-[#c3c6d6] text-sm";
    const inp =
      "w-full text-center bg-transparent border-0 focus:outline-none focus:ring-0 py-0.5 text-sm leading-tight";
    return (
    <fieldset disabled={embeddedInPatientHub || readOnly} className="border-0 p-0 m-0 min-w-0 disabled:opacity-95 consultant-main-print-root">
      <div className="consultant-sheet-inner bg-white text-[#191c1e] font-sans p-6 print:p-[8mm] print:border-0 print:shadow-none border border-[#c3c6d6] shadow-md flex flex-col gap-4 w-[210mm] max-w-full mx-auto rounded-lg" data-purpose="main-document" dir="rtl">
        <SheetCenterHeader
          titleEn="Consultant Sheet"
          titleAr="شيت الاستشاري"
        />
        {/* BEGIN: Patient Demographics */}
        <section className="print-consultant-patient-grid" data-purpose="patient-info">
          <div className="bg-[#003d9b] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">بيانات المريض — Patient Information</div>
          <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 bg-[#f8f9fb]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm" dir="rtl">
              <div className="col-span-2 md:col-span-1">
                <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">الاسم</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] font-semibold text-[#003d9b] pb-0.5 text-right" dir="rtl">{formData.patientName}</div>
              </div>
              <div>
                <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">تاريخ الميلاد</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}</div>
              </div>
              <div>
                <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">السن</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.age}</div>
              </div>
              <div>
                <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">كود العميل</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 font-mono text-[#526069] text-right" dir="ltr">{formData.code}</div>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">العنوان</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="rtl">{formData.address}</div>
              </div>
              <div>
                <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">رقم التليفون</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.phone}</div>
              </div>
              <div>
                <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">الوظيفة</span>
                <input dir="rtl" className="w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] text-sm min-h-[22px] pb-0.5 text-right" value={formData.job} onChange={e => setFormData(p => ({ ...p, job: e.target.value }))} />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#c3c6d6] flex items-center gap-3 text-sm" dir="rtl">
              <span className="text-[10px] text-[#434654] font-semibold">الاستشاري:</span>
              <span className="font-semibold text-[#003d9b]">{signatures.doctor || "أ.د محمد السعني غرابة"}</span>
              <span className="mr-auto text-[10px] text-[#737685]">تاريخ الفحص: {new Date().toLocaleDateString("en-GB")}</span>
            </div>
          </div>
        </section>
        {/* END: Patient Demographics */}

        {/* BEGIN: Medical History Checklist */}
        <section className="print-consultant-questions" data-purpose="medical-history" dir="rtl">
          <div className="bg-[#526069] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">التاريخ المرضي — Medical History</div>
          <table className="w-full border-collapse border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden text-sm">
            <thead className="bg-[#e7e8ea] text-xs">
              <tr>
                <th className="w-10 p-1.5 border border-[#c3c6d6] text-center">لا</th>
                <th className="w-10 p-1.5 border border-[#c3c6d6] text-center">نعم</th>
                <th className="p-1.5 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
                <th className="w-10 p-1.5 border border-[#c3c6d6] text-center">لا</th>
                <th className="w-10 p-1.5 border border-[#c3c6d6] text-center">نعم</th>
                <th className="p-1.5 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
                <th className="w-10 p-1.5 border border-[#c3c6d6] text-center">لا</th>
                <th className="w-10 p-1.5 border border-[#c3c6d6] text-center">نعم</th>
                <th className="p-1.5 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["كورتيزون/ضغط؟", "الغدة الدرقية؟", "أمراض مناعة؟"],
                ["علاج لحب الشباب؟", "الأيزوتريتينوين؟", "مضادات حساسية/اكتئاب؟"],
                ["أمراض عامة؟", "أمراض بالعين؟", "حمل؟"],
                ["قرنية مخروطية بالعائلة؟", "ماء زرقاء؟", "بديل دموع؟"],
              ].map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#f8f9fb]"}>
                  {row.map((q, colIndex) => (
                    q ? (
                      <Fragment key={`${rowIndex}-${colIndex}`}>
                        <td className="text-center border border-[#c3c6d6] p-1"><input type="checkbox" className="w-3.5 h-3.5 accent-[#003d9b]" /></td>
                        <td className="text-center border border-[#c3c6d6] p-1"><input type="checkbox" className="w-3.5 h-3.5 accent-[#003d9b]" /></td>
                        <td className="p-1.5 border border-[#c3c6d6] text-right text-xs">{q}</td>
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
        </section>
        {/* END: Medical History Checklist */}

        {/* BEGIN: Visual Acuity + Dominant Eye */}
        <section className="print-consultant-visual-grid grid grid-cols-1 lg:grid-cols-12 gap-3 ltr-content" data-purpose="examination-section" dir="ltr">
          <div className="lg:col-span-8">
            <div className="bg-[#003d9b] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">Visual Acuity &amp; IOP</div>
            <table className="w-full text-center border-collapse border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                <tr>
                  <th className={ctd}>Eye</th>
                  <th className={ctd}>UCVA</th>
                  <th className={ctd}>BCVA</th>
                  <th className={ctd}>IOP (mmHg)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[#003d9b]/5">
                  <td className={`${ctd} font-bold text-[#003d9b]`}>OD (Right)</td>
                  <td className={ctd}><input className={inp} value={formData.ucvaOD} onChange={e => setFormData(p => ({ ...p, ucvaOD: e.target.value }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.bcvaOD} onChange={e => setFormData(p => ({ ...p, bcvaOD: e.target.value }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.iopOD} onChange={e => setFormData(p => ({ ...p, iopOD: e.target.value }))} /></td>
                </tr>
                <tr className="bg-[#f3f4f6]">
                  <td className={`${ctd} font-bold text-[#526069]`}>OS (Left)</td>
                  <td className={ctd}><input className={inp} value={formData.ucvaOS} onChange={e => setFormData(p => ({ ...p, ucvaOS: e.target.value }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.bcvaOS} onChange={e => setFormData(p => ({ ...p, bcvaOS: e.target.value }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.iopOS} onChange={e => setFormData(p => ({ ...p, iopOS: e.target.value }))} /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="lg:col-span-4">
            <div className="bg-[#003d9b] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">Dominant Eye</div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 flex items-center justify-center gap-6 text-sm font-bold bg-[#f8f9fb] h-[calc(100%-28px)]">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dominant" checked={formData.dominantEye === "OD"} onChange={() => setFormData(p => ({ ...p, dominantEye: "OD" }))} className="accent-[#003d9b]" /> <span className="text-[#003d9b]">OD</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dominant" checked={formData.dominantEye === "OS"} onChange={() => setFormData(p => ({ ...p, dominantEye: "OS" }))} className="accent-[#003d9b]" /> <span className="text-[#526069]">OS</span></label>
            </div>
          </div>
        </section>
        {/* END: Visual Acuity + Dominant Eye */}

        {/* BEGIN: Clinical Refraction */}
        <section className="ltr-content" dir="ltr">
          <div className="bg-[#526069] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">Clinical Refraction (S / C / A)</div>
          <table className="w-full text-center border-collapse border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
            <thead className="bg-[#e7e8ea] text-xs uppercase font-bold">
              <tr>
                <th className={`${ctd} w-36 bg-[#e7e8ea]`} rowSpan={2}>Parameter</th>
                <th className={`${ctd} text-[#003d9b]`} colSpan={3}>OD — Right Eye</th>
                <th className={`${ctd} text-[#526069]`} colSpan={3}>OS — Left Eye</th>
              </tr>
              <tr>
                <th className={`${ctd} text-[10px]`}>Sphere (S)</th>
                <th className={`${ctd} text-[10px]`}>Cylinder (C)</th>
                <th className={`${ctd} text-[10px]`}>Axis (A)</th>
                <th className={`${ctd} text-[10px]`}>Sphere (S)</th>
                <th className={`${ctd} text-[10px]`}>Cylinder (C)</th>
                <th className={`${ctd} text-[10px]`}>Axis (A)</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              <tr className="bg-white">
                <td className={`${ctd} text-left bg-[#f3f4f6] font-semibold text-xs text-[#434654]`}>Refraction</td>
                <td className={ctd}><input className={inp} value={formData.refractionOD.s} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, s: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOD.c} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, c: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOD.a} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, a: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOS.s} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, s: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOS.c} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, c: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOS.a} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, a: e.target.value } }))} /></td>
              </tr>
              <tr className="bg-[#f8f9fb]">
                <td className={`${ctd} text-left bg-[#f3f4f6] font-semibold text-xs text-[#434654]`}>Fundus</td>
                <td className={ctd} colSpan={3}><input className={inp} value={formData.fundusOD} onChange={e => setFormData(p => ({ ...p, fundusOD: e.target.value }))} /></td>
                <td className={ctd} colSpan={3}><input className={inp} value={formData.fundusOS} onChange={e => setFormData(p => ({ ...p, fundusOS: e.target.value }))} /></td>
              </tr>
            </tbody>
          </table>
        </section>
        {/* END: Clinical Refraction */}

        {/* BEGIN: Clinical Diagrams */}
        <section className="print-consultant-diagrams" data-purpose="clinical-diagrams">
          <div className="bg-[#003d9b] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">Clinical Diagrams — الرسم السريري</div>
          <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-4 bg-white">
            <div className="grid grid-cols-2 gap-8 min-h-[80mm]">
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="text-xs font-bold uppercase px-3 py-1 bg-[#003d9b]/10 text-[#003d9b] rounded-full border border-[#003d9b]/20">Right Eye — OD</span>
                <div className="w-52 h-52 rounded-full border-2 border-[#003d9b]/40 flex items-center justify-center relative bg-white shadow-inner">
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-[#003d9b]/15 -translate-y-1/2"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-[#003d9b]/15 -translate-x-1/2"></div>
                  </div>
                  <span className="text-[#003d9b]/20 text-2xl font-bold select-none">OD</span>
                </div>
                <p className="text-xs text-[#003d9b] font-medium">العين اليمنى (OD)</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="text-xs font-bold uppercase px-3 py-1 bg-[#526069]/10 text-[#526069] rounded-full border border-[#526069]/20">Left Eye — OS</span>
                <div className="w-52 h-52 rounded-full border-2 border-[#526069]/40 flex items-center justify-center relative bg-white shadow-inner">
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-[#526069]/15 -translate-y-1/2"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-[#526069]/15 -translate-x-1/2"></div>
                  </div>
                  <span className="text-[#526069]/20 text-2xl font-bold select-none">OS</span>
                </div>
                <p className="text-xs text-[#526069] font-medium">العين اليسرى (OS)</p>
              </div>
            </div>
          </div>
        </section>
        {/* END: Clinical Diagrams */}

        {/* BEGIN: Notes + signatures */}
        <footer className="pt-4 border-t-2 border-[#003d9b] space-y-4" data-purpose="footer-signatures">
          <div className="print-consultant-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-4" dir="rtl">
            <div className="lg:col-span-8 space-y-3">
              <div>
                <label className="font-bold text-[#003d9b] text-xs uppercase tracking-wide">Comments / ملاحظات:</label>
                <textarea
                  dir="rtl"
                  className="w-full min-h-[70px] bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] text-sm resize-none p-1 text-right"
                  value={formData.comments}
                  onChange={e => setFormData(p => ({ ...p, comments: e.target.value }))}
                />
              </div>
              <div>
                <label className="font-bold text-[#003d9b] text-xs uppercase tracking-wide">Final Decision / القرار النهائي:</label>
                <textarea
                  dir="rtl"
                  className="w-full min-h-[50px] bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] text-sm resize-none p-1 text-right"
                  value={formData.final}
                  onChange={e => setFormData(p => ({ ...p, final: e.target.value }))}
                />
              </div>
            </div>
            <div className="lg:col-span-4 border border-[#003d9b]/30 rounded-lg p-3 bg-[#003d9b]/5">
              <div className="text-center font-bold text-[#003d9b] uppercase text-xs border-b border-[#003d9b]/20 pb-1.5 mb-2">Notes / ملاحظات</div>
              <textarea
                dir="rtl"
                className="w-full min-h-[110px] bg-transparent border-0 focus:outline-none text-sm resize-none p-1 text-right"
                value={formData.drOS}
                onChange={e => setFormData(p => ({ ...p, drOS: e.target.value }))}
              />
            </div>
          </div>
          <div className="print-consultant-signatures grid grid-cols-2 md:grid-cols-4 gap-6 pt-3 border-t border-[#c3c6d6]" dir="rtl">
            {[
              ["استقبال", signatures.reception, false],
              ["تمريض", signatures.nurse, false],
              ["فني", signatures.technician, false],
              ["الطبيب", signatures.doctor, true],
            ].map(([label, val, isDoctor], i) => (
              <div key={i} className="flex flex-col gap-1.5 text-center">
                <div className={`h-10 border-b-2 flex items-end justify-center pb-1 ${isDoctor ? "border-[#003d9b]" : "border-[#c3c6d6]"}`}>
                  {val && <span className={`text-xs italic ${isDoctor ? "text-[#003d9b] font-semibold" : "text-[#737685]"}`}>{val as string}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isDoctor ? "text-[#003d9b]" : "text-[#434654]"}`}>{label as string}</span>
              </div>
            ))}
          </div>
        </footer>
        {/* END: Notes + signatures */}
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
          /* ── Page setup ── */
          @page { size: A4 portrait; margin: 8mm 7mm; }
          html, body {
            width: 210mm !important;
            margin: 0 !important; padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #root, .consultant-page-root {
            width: 210mm !important; max-width: 210mm !important;
            margin: 0 !important; padding: 0 !important;
            overflow: visible !important;
          }
          .consultant-page-root.sheet-layout {
            overflow: visible !important; max-height: none !important;
            font-size: 100% !important;
            page-break-inside: auto !important; break-inside: auto !important;
          }
          .print-page-break { page-break-before: always !important; break-before: page !important; }
          .print-page-center-a4 { width: 210mm !important; margin: 0 auto !important; }
          main[data-mobile-pdf-root] {
            width: 210mm !important; max-width: 210mm !important;
            margin: 0 auto !important; padding: 0 !important;
          }

          /* ── Sheet container ── */
          .consultant-main-print-root .consultant-sheet-inner {
            width: 210mm !important; max-width: 210mm !important;
            height: auto !important; min-height: 0 !important;
            box-sizing: border-box !important;
            margin: 0 auto !important; padding: 5mm 6mm !important;
            gap: 6px !important; border: 0 !important; box-shadow: none !important;
            border-radius: 0 !important;
            font-size: 88% !important; line-height: 1.2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Color preservation ── */
          .consultant-sheet-inner * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .consultant-sheet-inner [class*="bg-\[#003d9b"] { background-color: #003d9b !important; color: #fff !important; }
          .consultant-sheet-inner [class*="bg-\[#526069"] { background-color: #526069 !important; color: #fff !important; }
          .consultant-sheet-inner [class*="bg-\[#e7e8ea"] { background-color: #e7e8ea !important; }
          .consultant-sheet-inner [class*="bg-\[#f3f4f6"] { background-color: #f3f4f6 !important; }
          .consultant-sheet-inner [class*="bg-\[#f8f9fb"] { background-color: #f8f9fb !important; }
          .consultant-sheet-inner [class*="bg-\[#003d9b\/5"] { background-color: rgba(0,61,155,0.05) !important; }
          .consultant-sheet-inner [class*="bg-\[#003d9b\/10"] { background-color: rgba(0,61,155,0.1) !important; }

          /* ── Page-break control ── */
          .consultant-sheet-inner section,
          .consultant-sheet-inner footer,
          .consultant-sheet-inner tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .consultant-sheet-inner thead { display: table-header-group !important; }
          .print-consultant-signatures { break-inside: avoid !important; page-break-inside: avoid !important; }
          .print-consultant-diagrams { break-inside: avoid !important; page-break-inside: avoid !important; }

          /* ── Typography ── */
          .consultant-sheet-inner table { font-size: 10px !important; }
          .consultant-sheet-inner th, .consultant-sheet-inner td { padding: 2px 3px !important; line-height: 1.1 !important; }
          .consultant-sheet-inner input:not([type="checkbox"]):not([type="radio"]),
          .consultant-sheet-inner textarea {
            border: 0 !important; border-bottom: 1px solid #c3c6d6 !important;
            box-shadow: none !important; outline: 0 !important;
            background: transparent !important;
            font-size: 10px !important; line-height: 1.15 !important;
          }

          /* ── Spacing reduction ── */
          .consultant-sheet-inner .gap-8 { gap: 10px !important; }
          .consultant-sheet-inner .gap-6 { gap: 8px !important; }
          .consultant-sheet-inner .gap-5 { gap: 6px !important; }
          .consultant-sheet-inner .gap-4 { gap: 5px !important; }
          .consultant-sheet-inner .gap-3 { gap: 4px !important; }
          .consultant-sheet-inner .p-6 { padding: 4mm !important; }
          .consultant-sheet-inner .p-4 { padding: 6px !important; }
          .consultant-sheet-inner .p-3 { padding: 4px !important; }
          .consultant-sheet-inner .pt-4 { padding-top: 6px !important; }
          .consultant-sheet-inner .pt-3 { padding-top: 4px !important; }
          .consultant-sheet-inner .mb-3 { margin-bottom: 4px !important; }
          .consultant-sheet-inner .h-10 { height: 24px !important; }
          .consultant-sheet-inner .space-y-4 > * + * { margin-top: 5px !important; }
          .consultant-sheet-inner .space-y-3 > * + * { margin-top: 4px !important; }

          /* ── Patient grid ── */
          .print-consultant-patient-grid .grid {
            display: grid !important;
            grid-template-columns: 2fr 1fr 1fr 1fr !important;
          }

          /* ── Medical history ── */
          .print-consultant-questions table { font-size: 9px !important; }
          .print-consultant-questions th, .print-consultant-questions td { padding: 2px 3px !important; line-height: 1.05 !important; }
          .print-consultant-questions input[type="checkbox"] { width: 11px !important; height: 11px !important; }

          /* ── Diagrams ── */
          .print-consultant-diagrams .grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; }
          .print-consultant-diagrams { min-height: 72mm !important; }
          .print-consultant-diagrams .w-52 { width: 46mm !important; }
          .print-consultant-diagrams .h-52 { height: 46mm !important; }
          .print-consultant-diagrams p { margin-top: 2mm !important; }

          /* ── Grid layouts ── */
          .print-consultant-visual-grid { display: grid !important; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important; }
          .print-consultant-footer-grid { display: grid !important; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important; }
          .print-consultant-signatures { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }

          /* ── Borders ── */
          .consultant-sheet-inner [class*="border-\[#c3c6d6"] { border-color: #c3c6d6 !important; }
          .consultant-sheet-inner [class*="border-\[#003d9b"] { border-color: #003d9b !important; }
        }
      `}</style>
      {/* Top bar */}
      <header className={`sticky top-0 z-10 bg-white border-b border-gray-200 print:hidden ${printMode.printView ? "hidden" : ""} ${embeddedInPatientHub ? "py-1.5" : "py-2 shadow-sm"}`}>
        <div className={`flex items-center justify-between gap-2 ${embeddedInPatientHub ? "px-2" : "container mx-auto px-4"}`}>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackNav} className="gap-1">
              <ArrowRight className="h-4 w-4" /> رجوع
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
            <TabsTrigger value="followup">المتابعات</TabsTrigger>
            <TabsTrigger value="sheet">الفحوصات</TabsTrigger>
          </TabsList>
          <TabsContent value="sheet" className="space-y-0">
            {activeTab === "sheet" ? renderSheetBody() : null}
          </TabsContent>
          <TabsContent value="followup" className="space-y-0">
            {activeTab === "followup" ? (
              <FollowupTablesBody
                titleEn="Consultant Follow-up"
                titleAr="متابعة الاستشاري"
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
          <Button type="button" variant="outline" onClick={handleBackNav}>رجوع</Button>
          <Button type="button" variant="outline" onClick={handlePrint}>طباعة</Button>
          <Button type="button" variant="default" onClick={handleDownloadPDF}>تحميل</Button>
        </div>
      </main>
    </div>
  );
}

