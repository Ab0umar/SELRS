import { useEffect, useRef, useState } from "react";
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
    <fieldset disabled={embeddedInPatientHub || readOnly} className="border-0 p-0 m-0 min-w-0 disabled:opacity-95 consultant-main-print-root">
      <div className="bg-white p-10 print:p-6" dir="ltr">

        {/* Brand Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-[#003D9B] pb-6" dir="rtl">
          <div className="text-right">
            <h1 className="text-2xl font-bold text-[#003D9B]">{BRAND_NAME_EN}</h1>
            <p className="text-lg font-semibold text-gray-900">ليزر و تصحيح الإبصار — {BRAND_NAME_AR}</p>
            <p className="text-sm text-gray-500">Ophthalmic Excellence Center</p>
          </div>
          <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
            <img className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAz1OixxO29XJc5YDeeML3-dfLFciXO3nXi6Hb_HfUgegZIpNhvlEDfHuWJRdxXsmpIvWrq5wlcXfYnU54mIHOzkaL3FrwGQEPYTYF01Vrr4xFgZt6lLEeVF1oxpss1HJrqkpV6toJLe2pYCLmtU1V1W9ynLkmuv5t9irRi05MliUzfk8IMH3fLkFxBYhrbmHDukEaaeNJJ9cdIXJ0pAOLOPXQ0j1AGoKQtsUlI2RRfRm0DshoyqwlPTDT3S5_bsIeOTdwpX_2MWbr2" alt="Logo" />
          </div>
        </div>

        {/* Patient Personal Info */}
        <div className="grid grid-cols-4 gap-4 mb-8 bg-[#f8f9fb] p-4 rounded-lg border border-gray-200" dir="rtl">
          <div className="flex flex-col gap-1 border-l border-gray-200 pl-4">
            <span className="text-xs text-gray-500 font-semibold">الاسم / Name</span>
            <span className="text-sm font-bold text-gray-900">{formData.patientName || <span className="text-gray-300">—</span>}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-gray-200 pl-4">
            <span className="text-xs text-gray-500 font-semibold">تاريخ الميلاد / DOB</span>
            <span className="text-sm font-bold text-gray-900">{formData.dateOfBirth || <span className="text-gray-300">—</span>}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-gray-200 pl-4">
            <span className="text-xs text-gray-500 font-semibold">السن / Age</span>
            <span className="text-sm font-bold text-gray-900">{formData.age || <span className="text-gray-300">—</span>}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-semibold">كود المريض / Patient Code</span>
            <span className="text-sm font-bold text-gray-900">{formData.code ? `#${formData.code}` : <span className="text-gray-300">—</span>}</span>
          </div>
          <div className="col-span-2 flex flex-col gap-1 border-l border-gray-200 pl-4 mt-2">
            <span className="text-xs text-gray-500 font-semibold">العنوان / Address</span>
            <span className="text-sm text-gray-900">{formData.address || <span className="text-gray-300">—</span>}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-gray-200 pl-4 mt-2">
            <span className="text-xs text-gray-500 font-semibold">الوظيفة / Job</span>
            <span className="text-sm text-gray-900">{formData.job || <span className="text-gray-300">—</span>}</span>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-xs text-gray-500 font-semibold">التليفون / Phone</span>
            <span className="text-sm text-gray-900 font-mono" dir="ltr">{formData.phone || <span className="text-gray-300">—</span>}</span>
          </div>
        </div>

        {/* Medical History Section */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-[#003D9B] border-r-4 border-[#003D9B] pr-3 mb-4 bg-[#dae2ff] p-2 rounded" dir="rtl">التاريخ المرضي / MEDICAL HISTORY</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 bg-[#f8f9fb] p-6 rounded-xl border border-gray-200" dir="rtl">
            {([
              { ar: "أمراض عامة (ضغط/سكر/غدة)", en: "General (BP/DM/Thyroid)", key: "keratoconusHistory" },
              { ar: "تاريخ عائلي للقرنية المخروطية", en: "Keratoconus Family History", key: "familyHistory" },
              { ar: "حمل أو رضاعة", en: "Pregnancy or Nursing", key: "tearIncreasePregnancy" },
              { ar: "استخدام بدائل الدموع", en: "Tear Substitutes Use", key: "tearSubstitute" },
              { ar: "تحسس من التكييف/الهواء", en: "Symptoms with AC/Air", key: "sandySensation" },
              { ar: "علاج حب الشباب (روأكيوتان)", en: "Acne (Roaccutane)", key: "treatmentUsed" },
              { ar: "علاج مياه زرقاء", en: "Glaucoma Treatment", key: "blueWaterTreatment" },
              { ar: "أمراض الغدة الدرقية", en: "Thyroid Diseases", key: "thyroidDiseases" },
              { ar: "أمراض المناعة", en: "Immune Diseases", key: "immuneDiseases" },
              { ar: "أخرى", en: "Other", key: "supplements" },
            ] as { ar: string; en: string; key: keyof typeof formData }[]).map(({ ar, en, key }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={Boolean(formData[key])}
                  onCheckedChange={v => setFormData(p => ({ ...p, [key]: !!v }))}
                  className="w-5 h-5 border-gray-400 data-[state=checked]:bg-[#003D9B] data-[state=checked]:border-[#003D9B]"
                />
                <span className="text-sm text-gray-700">{ar} / {en}</span>
              </label>
            ))}
            <div className="flex items-center gap-3 col-span-2 border-t border-gray-200/50 pt-2 mt-2">
              <span className="text-sm font-bold text-gray-800">أخرى / Other:</span>
              <div className="flex-1 border-b border-dotted border-gray-400 h-4"></div>
            </div>
          </div>
        </div>

        {/* Refraction Table */}
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-200" dir="ltr">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-[#003D9B] text-white">
                <th className="p-3 border-r border-white/20 text-xs font-semibold uppercase tracking-wider">EYE</th>
                <th className="p-3 border-r border-white/20 text-xs font-semibold uppercase tracking-wider">UCVA</th>
                <th className="p-3 border-r border-white/20 text-xs font-semibold uppercase tracking-wider">BCVA</th>
                <th className="p-3 border-r border-white/20 text-xs font-semibold uppercase tracking-wider">REFRACTION (S/C/A)</th>
                <th className="p-3 border-r border-white/20 text-xs font-semibold uppercase tracking-wider">IOP</th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wider">DOMINANT</th>
              </tr>
            </thead>
            <tbody>
              {[
                { eye: "OD", label: "OD (Right)", isOD: true, rowClass: "od-row" },
                { eye: "OS", label: "OS (Left)", isOD: false, rowClass: "os-row" },
              ].map(({ eye, label, isOD, rowClass }) => {
                const ucva = isOD ? formData.ucvaOD : formData.ucvaOS;
                const bcva = isOD ? formData.bcvaOD : formData.bcvaOS;
                const ref = isOD ? formData.refractionOD : formData.refractionOS;
                const iop = isOD ? formData.iopOD : formData.iopOS;
                const setUcva = isOD
                  ? (v: string) => setFormData(p => ({ ...p, ucvaOD: v }))
                  : (v: string) => setFormData(p => ({ ...p, ucvaOS: v }));
                const setBcva = isOD
                  ? (v: string) => setFormData(p => ({ ...p, bcvaOD: v }))
                  : (v: string) => setFormData(p => ({ ...p, bcvaOS: v }));
                const setRef = isOD
                  ? (k: "s"|"c"|"a", v: string) => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, [k]: v } }))
                  : (k: "s"|"c"|"a", v: string) => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, [k]: v } }));
                const setIop = isOD
                  ? (v: string) => setFormData(p => ({ ...p, iopOD: v }))
                  : (v: string) => setFormData(p => ({ ...p, iopOS: v }));
                const iopNum = Number(iop);
                return (
                  <tr key={eye} className={rowClass}>
                    <td className={`p-4 font-bold border-r border-gray-200 ${isOD ? "text-[#003D9B]" : "text-gray-700"}`}>{label}</td>
                    <td className="p-4 border-r border-gray-200">
                      <Input
                        className="text-center bg-transparent border-0 focus-visible:ring-2 focus-visible:ring-[#003D9B] rounded p-1 h-8 w-20 mx-auto"
                        value={ucva}
                        onChange={e => setUcva(e.target.value)}
                        placeholder="6/.."
                      />
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Input
                        className="text-center bg-transparent border-0 focus-visible:ring-2 focus-visible:ring-[#003D9B] rounded p-1 h-8 w-20 mx-auto"
                        value={bcva}
                        onChange={e => setBcva(e.target.value)}
                        placeholder="6/.."
                      />
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <div className="flex gap-2 justify-center items-center">
                        <Input
                          className="w-12 text-center bg-transparent border-0 border-b border-gray-300 focus-visible:border-[#003D9B] focus-visible:ring-0 rounded-none outline-none p-0 h-8"
                          value={ref.s}
                          onChange={e => setRef("s", e.target.value)}
                          placeholder="S"
                        />
                        <Input
                          className="w-12 text-center bg-transparent border-0 border-b border-gray-300 focus-visible:border-[#003D9B] focus-visible:ring-0 rounded-none outline-none p-0 h-8"
                          value={ref.c}
                          onChange={e => setRef("c", e.target.value)}
                          placeholder="C"
                        />
                        <Input
                          className="w-12 text-center bg-transparent border-0 border-b border-gray-300 focus-visible:border-[#003D9B] focus-visible:ring-0 rounded-none outline-none p-0 h-8"
                          value={ref.a}
                          onChange={e => setRef("a", e.target.value)}
                          placeholder="A"
                        />
                      </div>
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Input
                        className={`text-center bg-transparent border-0 focus-visible:ring-2 focus-visible:ring-[#003D9B] rounded p-1 h-8 w-24 mx-auto ${iopNum > 21 ? "text-red-600 font-bold" : ""}`}
                        value={iop}
                        onChange={e => setIop(e.target.value)}
                        placeholder="mmHg"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center items-center">
                        <input
                          type="radio"
                          name="dominant-eye"
                          value={eye}
                          checked={formData.dominantEye === eye}
                          onChange={() => setFormData(p => ({ ...p, dominantEye: eye }))}
                          className="h-5 w-5 text-[#003D9B] focus:ring-[#003D9B] border-gray-300"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Clinical Examination + Lid Margin */}
        <div className="grid grid-cols-3 gap-6 mb-8" dir="rtl">
          <div className="col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-[#003D9B] border-r-4 border-[#003D9B] pr-3 bg-[#dae2ff] p-2 rounded text-right">الفحص الإكلينيكي / CLINICAL EXAMINATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[#f8f9fb] rounded border border-gray-200 text-right">
                <p className="text-xs text-gray-500 font-semibold mb-2">Fundus Exam (OD/OS)</p>
                <Textarea
                  className="w-full h-24 bg-transparent border-0 focus-visible:ring-0 text-sm p-0 resize-none shadow-none text-right"
                  value={formData.fundusOD}
                  onChange={e => setFormData(p => ({ ...p, fundusOD: e.target.value }))}
                  placeholder="..."
                />
              </div>
              <div className="p-3 bg-[#f8f9fb] rounded border border-gray-200 text-right">
                <p className="text-xs text-gray-500 font-semibold mb-2">Tear Film / BUT / Schirmer</p>
                <Textarea
                  className="w-full h-24 bg-transparent border-0 focus-visible:ring-0 text-sm p-0 resize-none shadow-none text-right"
                  value={formData.drOD}
                  onChange={e => setFormData(p => ({ ...p, drOD: e.target.value }))}
                  placeholder="BUT: .. sec / Schirmer: .. mm"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#003D9B] border-r-4 border-[#003D9B] pr-3 bg-[#dae2ff] p-2 rounded text-right">Lid Margin</h3>
            <div className="p-3 bg-[#f8f9fb] rounded border border-gray-200 h-[calc(100%-40px)] text-right">
              <Textarea
                className="w-full h-full min-h-[96px] bg-transparent border-0 focus-visible:ring-0 text-sm p-0 resize-none shadow-none text-right"
                value={formData.drOS}
                onChange={e => setFormData(p => ({ ...p, drOS: e.target.value }))}
                placeholder="Lid margin status..."
              />
            </div>
          </div>
        </div>

        {/* Clinical Diagrams */}
        <div className="mb-8" dir="rtl">
          <h3 className="text-xs font-bold text-[#003D9B] border-r-4 border-[#003D9B] pr-3 mb-4 bg-[#dae2ff] p-2 rounded text-right">رسم توضيحي / CLINICAL DIAGRAMS</h3>
          <div className="relative w-full h-80 bg-[#f8f9fb] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
            <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-around items-center px-20">
              <div className="w-48 h-48 rounded-full border-4 border-[#003D9B]"></div>
              <div className="w-48 h-48 rounded-full border-4 border-[#003D9B]"></div>
            </div>
            <p className="text-gray-400 italic text-sm text-center px-4">Interactive drawing area for corneal findings, lens status, or retinal maps.</p>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button type="button" className="p-2 bg-white shadow-sm border border-gray-200 rounded-lg hover:bg-gray-50"><svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg></button>
              <button type="button" className="p-2 bg-white shadow-sm border border-gray-200 rounded-lg hover:bg-gray-50"><svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg></button>
              <button type="button" className="p-2 bg-white shadow-sm border border-red-200 rounded-lg hover:bg-red-50 text-red-500"><svg viewBox="0 0 24 24" className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
            </div>
          </div>
        </div>

        {/* Notes & Final Diagnosis */}
        <div className="grid grid-cols-2 gap-6 mb-8" dir="rtl">
          <div className="space-y-3 text-right">
            <h3 className="text-sm font-bold text-gray-800">ملاحظات / Notes & Comments</h3>
            <Textarea
              className="min-h-[120px] p-4 border border-gray-200 rounded-lg bg-[#f8f9fb] text-sm resize-none text-right"
              value={formData.comments}
              onChange={e => setFormData(p => ({ ...p, comments: e.target.value }))}
              placeholder="..."
            />
          </div>
          <div className="space-y-3 text-right">
            <h3 className="text-sm font-bold text-red-600">التشخيص النهائي / FINAL DIAGNOSIS</h3>
            <Textarea
              className="min-h-[120px] p-4 border-2 border-red-200 rounded-lg bg-red-50/50 text-base text-center font-bold text-red-700 resize-none"
              value={formData.final}
              onChange={e => setFormData(p => ({ ...p, final: e.target.value }))}
              placeholder="PRIMARY DIAGNOSIS HERE"
            />
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-4 gap-6 pt-6 border-t border-gray-200" dir="ltr">
          {[
            { label: "Doctor / الاستشاري", value: signatures.doctor },
            { label: "Technician / فني القياس", value: signatures.technician },
            { label: "Nurse / تمريض", value: signatures.nurse },
            { label: "Reception / استقبال", value: signatures.reception },
          ].map((sig, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-full border-b border-gray-400 mb-2 min-h-[40px] flex items-end justify-center pb-1">
                {sig.value && <span className="text-[#003D9B] font-bold text-sm">{sig.value}</span>}
              </div>
              <span className="text-xs font-bold text-gray-700">{sig.label}</span>
            </div>
          ))}
        </div>

        {/* Footer Meta */}
        <div className="mt-8 flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-gray-200" dir="ltr">
          <span>{BRAND_NAME_EN} Clinic Management System v4.2</span>
          <span>Date generated: {new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
          <span>Page 1 of 1</span>
        </div>

      </div>
    </fieldset>
  );

  return (
    <div
      className={`${embeddedInPatientHub ? "prescription-root min-h-0 flex-1" : "min-h-screen"} bg-[#F8F9FB] sheet-layout ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
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
            {activeTab === "followup" ? renderFollowupSection() : null}
          </TabsContent>
        </Tabs>

        <div className="hidden print:block">
          {renderSheetBody(true)}
          <div>{renderFollowupSection()}</div>
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

