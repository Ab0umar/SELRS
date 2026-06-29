import { useEffect, useState } from "react";
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
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_SHEET_DESIGNER_CONFIG,
  loadSheetDesignerConfig,
} from "@/lib/sheetDesigner";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";

export default function KfConsultantSheet() {
  const { user, isAuthenticated } = useAuth();
  const { goBack, goHome } = useAppNavigation();
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/kf/sheets/consultant/:kfPatientId");
  const initialPatientIdRaw = params?.kfPatientId;
  const initialPatientId = initialPatientIdRaw
    ? Number(initialPatientIdRaw)
    : undefined;
  const embeddedInPatientHub = false;
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
  const kfPatientQuery = trpc.kf.getPatient.useQuery(
    { kfId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const kfExaminationsQuery = trpc.kf.listExaminations.useQuery(
    { kfPatientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const mobileSheetModeEnabled = false;

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!kfPatientQuery.data) return;
    const p = kfPatientQuery.data as any;
    setFormData((prev) => ({
      ...prev,
      patientName: p.fullName ?? "",
      dateOfBirth: formatDate(p.dateOfBirth),
      age: p.age != null ? String(p.age) : "",
      phone: p.phone ?? "",
      address: p.address ?? "",
      code: p.kfCode ?? "",
      job: p.occupation ?? "",
    }));
  }, [kfPatientQuery.data]);

  useEffect(() => {
    if (!kfExaminationsQuery.data || kfExaminationsQuery.data.length === 0) return;
    const exam = kfExaminationsQuery.data[0] as any;
    const od = (exam.rightRefraction ?? {}) as any;
    const os = (exam.leftRefraction ?? {}) as any;
    setFormData((prev) => ({
      ...prev,
      ucvaOD: exam.rightVa ?? od.ucva ?? prev.ucvaOD,
      ucvaOS: exam.leftVa ?? os.ucva ?? prev.ucvaOS,
      bcvaOD: od.bcva ?? prev.bcvaOD,
      bcvaOS: os.bcva ?? prev.bcvaOS,
      iopOD: exam.iopRight ?? od.iop ?? prev.iopOD,
      iopOS: exam.iopLeft ?? os.iop ?? prev.iopOS,
      refractionOD: {
        s: od.sph ?? prev.refractionOD.s,
        c: od.cyl ?? prev.refractionOD.c,
        a: od.axis ?? prev.refractionOD.a,
      },
      refractionOS: {
        s: os.sph ?? prev.refractionOS.s,
        c: os.cyl ?? prev.refractionOS.c,
        a: os.axis ?? prev.refractionOS.a,
      },
      examinationDate: formatDate(exam.examDate),
    }));
    if (exam.doctorName) {
      setSignatures((prev) => ({ ...prev, doctor: exam.doctorName }));
    }
  }, [kfExaminationsQuery.data]);

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
  }, [user?.name, user?.role]);

  useEffect(() => {
    setDesignerConfig(loadSheetDesignerConfig());
  }, []);


  useEffect(() => {
    setFollowups((prev) =>
      prev.map((item, index) => ({
        ...item,
        type:
          designerConfig.followupConsultant.followupNames[index] ?? item.type,
      })),
    );
  }, [designerConfig.followupConsultant.followupNames]);


  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.code || initialPatientId || "consultant-sheet").trim()}.pdf`,
    );
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleBackNav = () => {
    if (initialPatientId) {
      setLocation(`/kf/patients`);
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

  const renderFollowupSection = () => (
    <fieldset
      disabled={embeddedInPatientHub}
      className="border-0 p-0 m-0 min-w-0 disabled:opacity-95"
    >
      <div
        className="p-1 print:p-0 followup-print-root bg-background text-foreground"
        dir="ltr"
        style={{ fontFamily: '"Times New Roman", Tahoma, Arial, sans-serif' }}
      >
        <div className="mb-2 print:mb-1 flex items-center justify-between text-[15px] print:text-[13px] px-1 print:px-0">
          <div className="whitespace-nowrap">
            {followupLabels.rtLabel}: {operationEyes.right ? "" : "..."}{" "}
            &nbsp;&nbsp; {followupLabels.ltLabel}:{" "}
            {operationEyes.left ? "" : "..."} &nbsp; //
          </div>
          <div className="whitespace-nowrap">
            {followupLabels.operationTypeLabel}:
            <span className="inline-block min-w-[140px] border-b border-black/60 mx-1 text-center">
              {operationType || " "}
            </span>
          </div>
          <div className="whitespace-nowrap">
            {followupLabels.operationDateLabel}
            <span className="inline-block min-w-[95px] border-b border-black/60 mx-1 text-center">
              {operationDateRight || " /  / "}
            </span>
            <span className="inline-block min-w-[95px] border-b border-black/60 text-center">
              {operationDateLeft || " /  / "}
            </span>
          </div>
        </div>

        {followups.map((followup) => (
          <table
            key={followup.id}
            className="w-full border border-black/70 border-collapse text-[15px] print:text-[12px] table-fixed"
            style={{
              marginBottom: `${designerConfig.followupConsultant.tableGapMm}mm`,
            }}
          >
            <colgroup>
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black/50 px-1 py-0.5 print:py-0 text-center"
                >
                  {followupLabels.nextFollowupLabel}{" "}
                  <span className="mx-2 print:mx-1">{"/  /"}</span>
                </td>
                <td
                  colSpan={3}
                  className="border border-black/50 px-1 py-0.5 print:py-0 text-center font-semibold"
                >
                  {followup.type}
                </td>
                <td
                  colSpan={3}
                  className="border border-black/50 border-r-0 px-1 py-0.5 print:py-0 text-center"
                >
                  {followupLabels.followupDateLabel}
                  <span className="inline-block min-w-[88px] border-b border-black/60 mx-1 text-center">
                    {followup.date || " /  / "}
                  </span>
                </td>
              </tr>
              <tr>
                <td
                  colSpan={8}
                  className="border border-black/50 py-0.5 text-center font-semibold"
                >
                  Dominant eye _____________
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black/50 py-0.5"></td>
                <td
                  colSpan={3}
                  className="border border-black/50 py-0.5 text-center font-semibold"
                >
                  OD
                </td>
                <td
                  colSpan={3}
                  className="border border-black/50 border-r-0 py-0.5 text-center font-semibold"
                >
                  OS
                </td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black/50 py-1 print:py-0.5 text-center font-semibold"
                >
                  {followupLabels.vaLabel}
                </td>
                <td
                  colSpan={3}
                  className="border border-black/50 border-r-0 py-1 print:py-0.5"
                ></td>
                <td
                  colSpan={3}
                  className="border border-black/50 py-1 print:py-0.5"
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black/50 py-1 print:py-0.5 text-center font-semibold"
                >
                  {followupLabels.refractionLabel}
                </td>
                <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">
                  S
                </td>
                <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">
                  C
                </td>
                <td className="border border-black/50 border-r-0 py-1 print:py-0.5 text-center font-semibold">
                  A
                </td>
                <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">
                  S
                </td>
                <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">
                  C
                </td>
                <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">
                  A
                </td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black/50 py-1 print:py-0.5"
                ></td>
                <td className="border border-black/50 border-r-0 h-8 print:h-4">
                  &nbsp;
                </td>
                <td className="border border-black/50 h-8 print:h-4">&nbsp;</td>
                <td className="border border-black/50 h-8 print:h-4">&nbsp;</td>
                <td className="border border-black/50 h-8 print:h-4">&nbsp;</td>
                <td className="border border-black/50 h-8 print:h-4">&nbsp;</td>
                <td className="border border-black/50 h-8 print:h-4">&nbsp;</td>
              </tr>
              <tr>
                <td
                  rowSpan={2}
                  className="border border-black/50 py-1 print:py-0.5 text-center font-semibold"
                >
                  {followupLabels.flapLabel}
                </td>
                <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">
                  {followupLabels.edgesLabel}
                </td>
                <td
                  colSpan={6}
                  className="border border-black/50 border-r-0 py-1 print:py-0.5"
                ></td>
              </tr>
              <tr>
                <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">
                  {followupLabels.bedLabel}
                </td>
                <td
                  colSpan={6}
                  className="border border-black/50 border-r-0 py-1 print:py-0.5"
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black/50 py-1 print:py-0.5 text-center font-semibold"
                >
                  {followupLabels.iopLabel}
                </td>
                <td
                  colSpan={6}
                  className="border border-black/50 border-r-0 py-1 print:py-0.5"
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black/50 py-1 print:py-0.5 text-center font-semibold"
                >
                  {followupLabels.treatmentLabel}
                </td>
                <td
                  colSpan={6}
                  className="border border-black/50 border-r-0 py-1 print:py-0.5"
                ></td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-black/50 px-1 py-0.5 print:py-0 text-right font-semibold"
                >
                  {followupLabels.receptionLabel}
                </td>
                <td
                  colSpan={3}
                  className="border border-black/50 px-1 py-0.5 print:py-0 text-right font-semibold"
                >
                  {followupLabels.nurseLabel}
                </td>
                <td
                  colSpan={3}
                  className="border border-black/50 border-r-0 px-1 py-0.5 print:py-0 text-right font-semibold"
                >
                  {followupLabels.doctorLabel}
                  {signatures.doctor ? `: ${signatures.doctor}` : ""}
                </td>
              </tr>
            </tbody>
          </table>
        ))}
      </div>
    </fieldset>
  );

  const renderSheetBody = (readOnly = false) => (
    <fieldset disabled={readOnly} className="border-0 p-0 m-0 min-w-0 disabled:opacity-95 consultant-main-print-root">
      <div className="bg-white p-6 print:p-3" dir="ltr">

        {/* Brand Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-sm font-bold text-[#003D9B]">{BRAND_NAME_EN}</h1>
            <p className="text-[11px] text-gray-700 mt-0.5">Lasik & Vision Correction — {BRAND_NAME_AR}</p>
            <p className="text-[11px] text-gray-500">Ophthalmic Excellence Center</p>
          </div>
          <div className="border border-gray-300 rounded-xl p-2 flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#003D9B]" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {/* Patient Info */}
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden" dir="rtl">
          <div className="grid grid-cols-4 divide-x divide-gray-200 text-[11px]">
            {[
              { label: "الاسم / Name", value: formData.patientName },
              { label: "DOB / تاريخ الميلاد", value: formData.dateOfBirth },
              { label: "السن / Age", value: formData.age },
              { label: "Patient Code / كود المريض", value: formData.code ? `#${formData.code}` : "" },
            ].map(({ label, value }, i) => (
              <div key={i} className="p-2.5">
                <p className="text-gray-500 text-[10px] mb-0.5">{label}</p>
                <p className="font-bold text-gray-900">{value || <span className="text-gray-300">—</span>}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-200 text-[11px]">
            <div className="col-span-2 p-2.5">
              <p className="text-gray-500 text-[10px] mb-0.5">العنوان / Address</p>
              <p className="font-bold text-gray-900">{formData.address || <span className="text-gray-300">—</span>}</p>
            </div>
            <div className="p-2.5">
              <p className="text-gray-500 text-[10px] mb-0.5">Phone / هاتف</p>
              <p className="font-bold text-gray-900" dir="ltr">{formData.phone || <span className="text-gray-300">—</span>}</p>
            </div>
          </div>
          <div className="border-t border-gray-200 p-2.5 text-[11px]">
            <span className="text-gray-500 text-[10px]">Job / الوظيفة</span>
            <span className="font-bold text-gray-900 mr-2">{formData.job || <span className="text-gray-300">—</span>}</span>
          </div>
        </div>

        {/* Medical History */}
        <div className="mb-4">
          <div className="border-l-4 border-[#003D9B] bg-[#EEF4FF] pl-3 py-1 mb-2">
            <h3 className="text-[11px] font-bold text-[#003D9B] tracking-wide">التاريخ المرضى / MEDICAL HISTORY</h3>
          </div>
          <div className="border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-x-8 gap-y-2.5 text-[11px]" dir="rtl">
            {([
              { ar: "امراض عامة (ضغط/سكر/غدة)", en: "General (BP/DM/Thyroid)", key: "keratoconusHistory" },
              { ar: "تاريخ عائلي للقرنية المخروطية", en: "Keratoconus Family History", key: "familyHistory" },
              { ar: "حمل او رضاعة", en: "Pregnancy or Nursing", key: "tearIncreasePregnancy" },
              { ar: "استخدام بدائل الدموع", en: "Tear Substitutes Use", key: "tearSubstitute" },
              { ar: "تحسس من التكييف/الهواء", en: "Symptoms with AC/Air", key: "sandySensation" },
              { ar: "علاج حب الشباب (رواكيوتان)", en: "Acne (Roaccutane)", key: "treatmentUsed" },
              { ar: "علاج مياه زرقاء", en: "Glaucoma Treatment", key: "blueWaterTreatment" },
              { ar: "اخري", en: "Other", key: "supplements" },
            ] as { ar: string; en: string; key: keyof typeof formData }[]).map(({ ar, en, key }) => (
              <label key={key} className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={Boolean(formData[key])} onCheckedChange={v => setFormData(p => ({ ...p, [key]: !!v }))} className="mt-0.5 shrink-0" />
                <span className="text-[11px] text-gray-700 leading-tight">{ar} / <span className="text-gray-500">{en}</span></span>
              </label>
            ))}
          </div>
        </div>

        {/* Refraction Table */}
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden" dir="ltr">
          <table className="w-full border-collapse text-center text-[11px]">
            <thead>
              <tr className="bg-[#1B2B6B] text-white">
                <th className="px-3 py-2.5 font-semibold border-r border-[#2d3f82] text-left">EYE</th>
                <th className="px-3 py-2.5 font-semibold border-r border-[#2d3f82]">UCVA</th>
                <th className="px-3 py-2.5 font-semibold border-r border-[#2d3f82]">BCVA</th>
                <th className="px-3 py-2.5 font-semibold border-r border-[#2d3f82]" colSpan={3}>REFRACTION (S/C/A)</th>
                <th className="px-3 py-2.5 font-semibold border-r border-[#2d3f82]">IOP</th>
                <th className="px-3 py-2.5 font-semibold">DOMINANT</th>
              </tr>
            </thead>
            <tbody>
              {[{ eye: "OD", sub: "(Right)", isOD: true }, { eye: "OS", sub: "(Left)", isOD: false }].map(({ eye, sub, isOD }) => {
                const ucva = isOD ? formData.ucvaOD : formData.ucvaOS;
                const bcva = isOD ? formData.bcvaOD : formData.bcvaOS;
                const ref = isOD ? formData.refractionOD : formData.refractionOS;
                const iop = isOD ? formData.iopOD : formData.iopOS;
                const setUcva = isOD ? (v: string) => setFormData(p => ({ ...p, ucvaOD: v })) : (v: string) => setFormData(p => ({ ...p, ucvaOS: v }));
                const setBcva = isOD ? (v: string) => setFormData(p => ({ ...p, bcvaOD: v })) : (v: string) => setFormData(p => ({ ...p, bcvaOS: v }));
                const setRef = isOD ? (k: "s"|"c"|"a", v: string) => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, [k]: v } })) : (k: "s"|"c"|"a", v: string) => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, [k]: v } }));
                const setIop = isOD ? (v: string) => setFormData(p => ({ ...p, iopOD: v })) : (v: string) => setFormData(p => ({ ...p, iopOS: v }));
                const iopNum = Number(iop);
                return (
                  <tr key={eye} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-3 py-2 border-r border-gray-200 text-left">
                      <span className={`font-bold ${isOD ? "text-[#003D9B]" : "text-gray-800"}`}>{eye}</span>
                      <br /><span className="text-[10px] text-gray-500 font-normal">{sub}</span>
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200"><Input className="text-center text-[11px] h-7 border-gray-300 p-0 w-16 mx-auto" value={ucva} onChange={e => setUcva(e.target.value)} placeholder="6/.." /></td>
                    <td className="px-1 py-1 border-r border-gray-200"><Input className="text-center text-[11px] h-7 border-gray-300 p-0 w-16 mx-auto" value={bcva} onChange={e => setBcva(e.target.value)} placeholder="6/.." /></td>
                    <td className="px-1 py-1 border-r border-gray-200"><Input className="text-center text-[11px] h-7 border-gray-300 p-0 w-12 mx-auto" value={ref.a} onChange={e => setRef("a", e.target.value)} placeholder="A" /></td>
                    <td className="px-1 py-1 border-r border-gray-200"><Input className="text-center text-[11px] h-7 border-gray-300 p-0 w-12 mx-auto" value={ref.c} onChange={e => setRef("c", e.target.value)} placeholder="C" /></td>
                    <td className="px-1 py-1 border-r border-gray-200"><Input className="text-center text-[11px] h-7 border-gray-300 p-0 w-12 mx-auto" value={ref.s} onChange={e => setRef("s", e.target.value)} placeholder="S" /></td>
                    <td className="px-1 py-1 border-r border-gray-200"><Input className={`text-center text-[11px] h-7 border-gray-300 p-0 w-14 mx-auto ${iopNum > 21 ? "text-red-600 font-bold" : ""}`} value={iop} onChange={e => setIop(e.target.value)} placeholder="mmHg" /></td>
                    <td className="px-3 py-1"><input type="radio" name="dominant-eye" value={eye} checked={formData.dominantEye === eye} onChange={() => setFormData(p => ({ ...p, dominantEye: eye }))} className="h-4 w-4 accent-[#003D9B]" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Clinical Examination + Lid Margin */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="col-span-2 border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-l-4 border-[#003D9B] bg-[#EEF4FF] pl-3 py-1">
              <h3 className="text-[11px] font-bold text-[#003D9B] tracking-wide">CLINICAL EXAMINATION / الفحص الإكلينيكي</h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              <div className="p-3"><p className="text-[10px] text-gray-500 mb-1.5 font-medium">Fundus Exam (OD/OS)</p><Textarea className="text-[11px] resize-none border-gray-200 w-full" rows={4} value={formData.fundusOD} onChange={e => setFormData(p => ({ ...p, fundusOD: e.target.value }))} placeholder="Enter findings..." dir="ltr" /></div>
              <div className="p-3"><p className="text-[10px] text-gray-500 mb-1.5 font-medium">Tear Film / BUT / Schirmer</p><Textarea className="text-[11px] resize-none border-gray-200 w-full" rows={4} value={formData.drOD} onChange={e => setFormData(p => ({ ...p, drOD: e.target.value }))} placeholder="BUT: .. sec / Schirmer: .. mm" dir="ltr" /></div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-l-4 border-[#003D9B] bg-[#EEF4FF] pl-3 py-1"><h3 className="text-[11px] font-bold text-[#003D9B] tracking-wide">Lid Margin</h3></div>
            <div className="p-3"><Textarea className="text-[11px] resize-none border-gray-200 w-full" style={{ minHeight: 100 }} value={formData.drOS} onChange={e => setFormData(p => ({ ...p, drOS: e.target.value }))} placeholder="Lid margin status..." dir="ltr" /></div>
          </div>
        </div>

        {/* Clinical Diagrams */}
        <div className="mb-4">
          <div className="border-l-4 border-[#003D9B] bg-[#EEF4FF] pl-3 py-1 mb-2"><h3 className="text-[11px] font-bold text-[#003D9B] tracking-wide">CLINICAL DIAGRAMS / رسم توضيحي</h3></div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50" style={{ minHeight: 200 }}>
            <div className="flex items-center justify-center gap-24 py-6">
              <div className="border-2 border-gray-300 rounded-full bg-white" style={{ width: 110, height: 110 }} />
              <div className="border-2 border-gray-300 rounded-full bg-white" style={{ width: 110, height: 110 }} />
            </div>
            <p className="text-center text-[10px] text-gray-400 pb-2">Interactive drawing area for corneal findings, lens status, or retinal maps.</p>
            <div className="flex items-center gap-2 px-3 pb-3">
              <button className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 print:hidden"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg></button>
              <button className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 print:hidden"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg></button>
              <button className="p-1.5 rounded border border-red-200 bg-white hover:bg-red-50 print:hidden"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
            </div>
          </div>
        </div>

        {/* Notes & Final Diagnosis */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div><p className="text-[11px] font-semibold text-gray-800 mb-1.5">Notes & Comments / ملاحظات</p><Textarea className="text-[11px] resize-none border-gray-200 w-full" rows={5} value={formData.comments} onChange={e => setFormData(p => ({ ...p, comments: e.target.value }))} placeholder="Notes..." dir="ltr" /></div>
          <div><p className="text-[11px] font-bold text-red-600 mb-1.5">FINAL DIAGNOSIS / التشخيص النهائي</p><Textarea className="text-[11px] resize-none border-gray-200 w-full" rows={5} value={formData.final} onChange={e => setFormData(p => ({ ...p, final: e.target.value }))} placeholder="PRIMARY DIAGNOSIS HERE" dir="ltr" /></div>
        </div>

        {/* Signatures */}
        <div className="border-t border-gray-200 pt-4 grid grid-cols-4 gap-6 text-center" dir="ltr">
          {[
            { label: "Doctor / الاستشاري", value: signatures.doctor },
            { label: "Technician / فني القياس", value: signatures.technician },
            { label: "Nurse / تمريض", value: signatures.nurse },
            { label: "Reception / استقبال", value: signatures.reception },
          ].map((sig, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-full border-b border-gray-400 mb-2 min-h-[32px] flex items-end justify-center pb-1">
                {sig.value && <span className="text-[#003D9B] font-semibold text-[11px]">{sig.value}</span>}
              </div>
              <span className="text-[11px] font-semibold text-gray-700">{sig.label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[9px] text-gray-400 mt-5 pt-2 border-t border-gray-200" dir="ltr">
          <span>Page 1 of 1</span>
          <span>Date generated: {new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
          <span>{BRAND_NAME_EN} Clinic Management System v4.2</span>
        </div>

      </div>
    </fieldset>
  );

  return (
    <div
      className={`min-h-screen bg-[#F8F9FB] sheet-layout ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
      dir="rtl"
    >
      <style>{`
        ${designerConfig.css.consultant || ""}
        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          .consultant-main-print-root {
            transform: translateX(${designerConfig.layout.consultant.offsetXmm}mm) translateY(${designerConfig.layout.consultant.offsetYmm}mm) scale(${designerConfig.layout.consultant.scale});
            transform-origin: top center;
          }
          .followup-print-root {
            transform: translateX(${designerConfig.followupConsultant.offsetXmm}mm) scale(${designerConfig.followupConsultant.scale});
            transform-origin: top center;
            width: 104%;
            margin-left: auto;
            margin-right: auto;
            margin-top: ${designerConfig.followupConsultant.offsetYmm}mm;
          }
        }
      `}</style>
      <header className={`sticky top-0 z-10 bg-white border-b border-gray-200 print:hidden ${printMode.printView ? "hidden" : ""} py-2 shadow-sm`}>
        <div className="container mx-auto px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackNav} className="gap-1">
              <ArrowRight className="h-4 w-4" /> رجوع
            </Button>
            {formData.patientName && <span className="text-sm font-semibold">{formData.patientName}</span>}
            {formData.code && <span className="text-xs text-muted-foreground">ID: {formData.code}</span>}
          </div>
          <div className="flex items-center gap-1.5">
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

      <main data-mobile-pdf-root className="print:p-0 container mx-auto px-4 py-4 pb-24 sm:pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} persistKey={CONSULTANT_TABS_PERSIST_KEY} className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
          <TabsList className="mb-3 flex h-auto w-full">
            <TabsTrigger value="followup">المتابعات</TabsTrigger>
            <TabsTrigger value="sheet">الفحوصات</TabsTrigger>
          </TabsList>
          <TabsContent value="sheet" className="space-y-0">
            {activeTab === "sheet" ? renderSheetBody() : null}
          </TabsContent>
          <TabsContent value="followup" className="space-y-0">
            {activeTab === "followup" ? renderFollowupSection() : null}
          </TabsContent>
        </Tabs>

        <div className="hidden print:block">
          {renderSheetBody(true)}
          <div className="print:break-before-page">{renderFollowupSection()}</div>
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
