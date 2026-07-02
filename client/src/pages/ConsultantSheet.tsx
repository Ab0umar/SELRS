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
            {followupLabels.rtLabel}: {operationEyes.right ? "" : ""}{" "}
            &nbsp;&nbsp; {followupLabels.ltLabel}:{" "}
            {operationEyes.left ? "" : ""} &nbsp; //
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
              {operationDateRight || ""}
            </span>
            <span className="inline-block min-w-[95px] border-b border-black/60 text-center">
              {operationDateLeft || ""}
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
                    {followup.date || ""}
                  </span>
                </td>
              </tr>
              <tr>
                <td
                  colSpan={8}
                  className="border border-black/50 py-0.5 text-center font-semibold"
                >
                  Dominant eye
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

  const renderSheetBody = (readOnly = false) => {
    const ctd = "p-1 border border-[#c3c6d6]";
    const inp =
      "w-full text-center bg-transparent border-0 border-b border-solid border-[#737685] focus:outline-none focus:border-[#003d9b] py-1 text-sm";
    return (
    <fieldset disabled={embeddedInPatientHub || readOnly} className="border-0 p-0 m-0 min-w-0 disabled:opacity-95 consultant-main-print-root">
      <div className="consultant-sheet-inner bg-white text-[#191c1e] font-sans p-8 print:p-[10mm] print:border-0 print:shadow-none border border-[#c3c6d6] shadow-sm flex flex-col gap-5 w-[210mm] max-w-full mx-auto" data-purpose="main-document" dir="rtl">
        <SheetCenterHeader
          titleEn="Consultant Sheet"
          titleAr="شيت الاستشاري"
        />
        {/* BEGIN: Patient Demographics */}
        <section className="print-consultant-patient-grid p-4 bg-[#f3f4f6] rounded-xl border border-[#c3c6d6] flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" data-purpose="patient-info" dir="rtl">
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">الاسم:</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[160px] px-1 min-h-5">{formData.patientName}</span></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">تاريخ الميلاد (BD):</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[80px] px-1 min-h-5">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}</span></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">السن:</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[40px] px-1 min-h-5">{formData.age}</span></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">الوظيفة:</span> <input type="text" dir="rtl" className="border-none p-0 outline-none w-28 text-right border-b border-solid border-[#c3c6d6] text-sm focus:border-[#003d9b] bg-transparent" value={formData.job} onChange={e => setFormData(p => ({ ...p, job: e.target.value }))} /></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">تاريخ الفحص:</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[80px] px-1 min-h-5">{new Date().toLocaleDateString("en-GB")}</span></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">رقم التليفون:</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[100px] px-1 min-h-5">{formData.phone}</span></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">العنوان:</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[140px] px-1 min-h-5">{formData.address}</span></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">كود العميل:</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[70px] px-1 min-h-5">{formData.code}</span></p>
          <p className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">الاستشاري:</span> <span className="border-b border-solid border-[#c3c6d6] min-w-[140px] px-1 min-h-5">{signatures.doctor || "أ.د محمد السعني غرابة"}</span></p>
        </section>
        {/* END: Patient Demographics */}

        {/* BEGIN: Medical History Checklist */}
        <section className="print-consultant-questions" data-purpose="medical-history" dir="rtl">
          <table className="w-full border-collapse border border-[#c3c6d6] rounded-lg overflow-hidden text-sm">
            <thead className="bg-[#e7e8ea]">
              <tr>
                <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                <th className="p-2 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                <th className="p-2 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                <th className="p-2 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  { label: "أمراض عامة ؟", key: "keratoconusHistory" },
                  { label: "أمراض بالعين ؟", key: "blueWaterTreatment" },
                  { label: "حمل ؟", key: "tearIncreasePregnancy" },
                ],
                [
                  { label: "هل تستخدم علاج لحب الشباب ؟", key: "treatmentUsed" },
                  { label: "هل تستخدم علاج حب الشباب (الايزوتريتينوين)؟", key: "thyroidDiseases" },
                  { label: "هل تستخدم مضادات حساسية او إكتئاب؟", key: "immuneDiseases" },
                ],
                [
                  { label: "هل سمعت عن مرض القرنية المخروطية في أحد افراد العائلة؟", key: "familyHistory" },
                  { label: "هل تستخدم بديل دموع؟", key: "tearSubstitute" },
                  { label: "زيادة في إفراز الدموع؟", key: "sandySensation" },
                ],
                [
                  { label: "إحساس بالرمل داخل العين؟", key: "sandySensation" },
                  { label: "هل تزيد هذه الأعراض عند وجود هواء او تكييف ؟", key: "sandySensation" },
                  { label: "هل تعاني من حساسية بالعين/جفاف بالعين?", key: "immuneDiseases" },
                ],
              ].map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map(({ label, key }, colIndex) => (
                    <Fragment key={`${rowIndex}-${colIndex}`}>
                      <td className="text-center border border-[#c3c6d6]">
                        <input
                          type="checkbox"
                          checked={formData[key as keyof typeof formData] === false}
                          onChange={e => setFormData(p => ({ ...p, [key]: !e.target.checked }))}
                          className="w-4 h-4 rounded text-[#003d9b]"
                        />
                      </td>
                      <td className="text-center border border-[#c3c6d6]">
                        <input
                          type="checkbox"
                          checked={formData[key as keyof typeof formData] === true}
                          onChange={e => setFormData(p => ({ ...p, [key]: e.target.checked }))}
                          className="w-4 h-4 rounded text-[#003d9b]"
                        />
                      </td>
                      <td className="p-1.5 border border-[#c3c6d6] text-right">
                        {label}
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {/* END: Medical History Checklist */}

        {/* BEGIN: Visual Acuity + Dominant Eye */}
        <section className="ltr-content" data-purpose="examination-section" dir="ltr">
          <table className="w-full text-center border-collapse">
            <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
              <tr><th className={ctd}>Eye</th><th className={ctd}>UCVA</th><th className={ctd}>BCVA</th><th className={ctd}>IOP</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className={`${ctd} font-bold text-[#003d9b] bg-[#003d9b]/5`}>OD</td>
                <td className={ctd}><input className={inp} value={formData.ucvaOD} onChange={e => setFormData(p => ({ ...p, ucvaOD: e.target.value }))} /></td>
                <td className={ctd}><input className={inp} value={formData.bcvaOD} onChange={e => setFormData(p => ({ ...p, bcvaOD: e.target.value }))} /></td>
                <td className={ctd}><input className={inp} value={formData.iopOD} onChange={e => setFormData(p => ({ ...p, iopOD: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className={`${ctd} font-bold text-[#526069] bg-[#f3f4f6]`}>OS</td>
                <td className={ctd}><input className={inp} value={formData.ucvaOS} onChange={e => setFormData(p => ({ ...p, ucvaOS: e.target.value }))} /></td>
                <td className={ctd}><input className={inp} value={formData.bcvaOS} onChange={e => setFormData(p => ({ ...p, bcvaOS: e.target.value }))} /></td>
                <td className={ctd}><input className={inp} value={formData.iopOS} onChange={e => setFormData(p => ({ ...p, iopOS: e.target.value }))} /></td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-center gap-8 text-sm font-bold border border-[#c3c6d6] rounded-lg p-2">
            <span className="text-[#003d9b] uppercase">Dominant Eye:</span>
            <label className="flex items-center gap-2"><input type="radio" name="dominant" checked={formData.dominantEye === "OD"} onChange={() => setFormData(p => ({ ...p, dominantEye: "OD" }))} /> OD</label>
            <label className="flex items-center gap-2"><input type="radio" name="dominant" checked={formData.dominantEye === "OS"} onChange={() => setFormData(p => ({ ...p, dominantEye: "OS" }))} /> OS</label>
          </div>
        </section>
        {/* END: Visual Acuity + Dominant Eye */}

        {/* BEGIN: Clinical Refraction */}
        <section className="ltr-content" dir="ltr">
          <table className="w-full text-center border-collapse">
            <thead className="bg-[#e7e8ea] text-xs uppercase font-bold">
              <tr>
                <th className={`${ctd} w-48`} rowSpan={2}>Clinical Refraction</th>
                <th className={`${ctd} text-[#003d9b]`} colSpan={3}>OD (Right)</th>
                <th className={`${ctd} text-[#526069]`} colSpan={3}>OS (Left)</th>
              </tr>
              <tr><th className={ctd}>S</th><th className={ctd}>C</th><th className={ctd}>A</th><th className={ctd}>S</th><th className={ctd}>C</th><th className={ctd}>A</th></tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className={`${ctd} text-left font-bold bg-[#f3f4f6]`}>Refraction</td>
                <td className={ctd}><input className={inp} value={formData.refractionOD.s} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, s: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOD.c} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, c: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOD.a} onChange={e => setFormData(p => ({ ...p, refractionOD: { ...p.refractionOD, a: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOS.s} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, s: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOS.c} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, c: e.target.value } }))} /></td>
                <td className={ctd}><input className={inp} value={formData.refractionOS.a} onChange={e => setFormData(p => ({ ...p, refractionOS: { ...p.refractionOS, a: e.target.value } }))} /></td>
              </tr>
              <tr>
                <td className={`${ctd} text-left font-bold bg-[#f3f4f6]`}>Fundus</td>
                <td className={ctd} colSpan={3}><input className={inp} value={formData.fundusOD} onChange={e => setFormData(p => ({ ...p, fundusOD: e.target.value }))} /></td>
                <td className={ctd} colSpan={3}><input className={inp} value={formData.fundusOS} onChange={e => setFormData(p => ({ ...p, fundusOS: e.target.value }))} /></td>
              </tr>
            </tbody>
          </table>
        </section>
        {/* END: Clinical Refraction */}

        {/* BEGIN: Clinical Diagrams (replaces Pentacam / Target Refraction) */}
        <section className="print-consultant-diagrams grid grid-cols-1 lg:grid-cols-2 gap-6" data-purpose="clinical-diagrams">
          <div className="border-[#003d9b]/20 bg-[#003d9b]/5 p-4 rounded-xl border flex flex-col items-center">
            <span className="text-xs font-bold uppercase px-3 py-1 bg-white rounded shadow-sm text-[#003d9b] mb-3">Right Eye (OD)</span>
            <div className="w-40 h-40 rounded-full border-4 border-[#003d9b]/30 flex items-center justify-center relative bg-white">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="w-full border-t border-slate-900"></div>
                <div className="h-full border-l border-slate-900 absolute top-0"></div>
              </div>
              <span className="text-[#003d9b]/40 font-bold text-xl select-none">OD</span>
            </div>
            <p className="mt-3 font-bold text-[#003d9b]">العين اليمنى (OD)</p>
          </div>
          <div className="border-[#c3c6d6] bg-[#f3f4f6] p-4 rounded-xl border flex flex-col items-center">
            <span className="text-xs font-bold uppercase px-3 py-1 bg-white rounded shadow-sm text-[#526069] mb-3">Left Eye (OS)</span>
            <div className="w-40 h-40 rounded-full border-4 border-slate-300 flex items-center justify-center relative bg-white">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="w-full border-t border-slate-900"></div>
                <div className="h-full border-l border-slate-900 absolute top-0"></div>
              </div>
              <span className="text-slate-300 font-bold text-xl select-none">OS</span>
            </div>
            <p className="mt-3 font-bold text-[#526069]">العين اليسرى (OS)</p>
          </div>
        </section>
        {/* END: Clinical Diagrams */}

        {/* BEGIN: Notes + signatures */}
        <footer className="pt-6 border-t-2 border-[#003d9b] space-y-6" data-purpose="footer-signatures">
          <div className="print-consultant-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-8" dir="rtl">
            <div className="lg:col-span-8 space-y-4">
              <div>
                <label className="font-bold text-[#003d9b] text-sm">Comments / ملاحظات:</label>
                <textarea
                  dir="rtl"
                  className="w-full min-h-[70px] bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] text-sm resize-none p-1 text-right"
                  value={formData.comments}
                  onChange={e => setFormData(p => ({ ...p, comments: e.target.value }))}
                />
              </div>
              <div>
                <label className="font-bold text-[#003d9b] text-sm">Final Decision / القرار النهائي:</label>
                <textarea
                  dir="rtl"
                  className="w-full min-h-[50px] bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] text-sm resize-none p-1 text-right"
                  value={formData.final}
                  onChange={e => setFormData(p => ({ ...p, final: e.target.value }))}
                />
              </div>
            </div>
            <div className="lg:col-span-4 border-2 border-[#003d9b] rounded-xl p-4 bg-[#003d9b]/5">
              <div className="text-center font-bold text-[#003d9b] uppercase text-xs border-b border-[#003d9b]/20 pb-2 mb-3">Notes / ملاحظات</div>
              <textarea
                dir="rtl"
                className="w-full min-h-[110px] bg-transparent border-0 focus:outline-none text-sm resize-none p-1 text-right"
                value={formData.drOS}
                onChange={e => setFormData(p => ({ ...p, drOS: e.target.value }))}
              />
            </div>
          </div>
          <div className="print-consultant-signatures grid grid-cols-2 md:grid-cols-4 gap-8 pt-4 border-t border-[#c3c6d6]" dir="rtl">
            {[
              ["استقبال", signatures.reception],
              ["تمريض", signatures.nurse],
              ["فني", signatures.technician],
              ["الطبيب", signatures.doctor],
            ].map(([label, val], i) => (
              <div key={i} className="flex flex-col gap-2">
                <span className={`text-[11px] font-bold uppercase ${i === 3 ? "text-[#003d9b]" : "text-[#434654]"}`}>{label}</span>
                <div className={`border-b-2 h-9 flex items-end justify-center ${i === 3 ? "border-[#003d9b]" : "border-[#191c1e]"}`}>
                  <span className={`text-xs italic ${i === 3 ? "text-[#003d9b] font-bold" : "text-[#737685]"}`}>{val || ""}</span>
                </div>
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
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; }
          /* the shared .sheet-layout print rule clips this page's fixed 210mm sheet — undo it here */
          .consultant-page-root.sheet-layout {
            overflow: visible !important;
            max-height: none !important;
            font-size: 100% !important;
          }
          .consultant-main-print-root .consultant-sheet-inner {
            width: 210mm !important;
            max-width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: 296mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 6mm !important;
            gap: 10px !important;
            border: 0 !important;
            box-shadow: none !important;
            font-size: 92% !important;
            line-height: 1.15 !important;
            overflow: hidden !important;
          }
          /* outer wrappers must not constrain or offset the 210mm sheet */
          main[data-mobile-pdf-root] {
            width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .consultant-sheet-inner section,
          .consultant-sheet-inner footer,
          .consultant-sheet-inner table,
          .consultant-sheet-inner tr,
          .consultant-sheet-inner td,
          .consultant-sheet-inner th,
          .consultant-sheet-inner label,
          .consultant-sheet-inner input,
          .consultant-sheet-inner select,
          .consultant-sheet-inner span,
          .consultant-sheet-inner div {
            page-break-inside: avoid !important;
          }
          .consultant-sheet-inner table { font-size: 11px !important; }
          .consultant-sheet-inner input,
          .consultant-sheet-inner select {
            font-size: 11px !important;
            padding-top: 1px !important;
            padding-bottom: 1px !important;
          }
          .consultant-sheet-inner input:not([type="checkbox"]):not([type="radio"]),
          .consultant-sheet-inner textarea {
            border: 0 !important;
            border-bottom: 0 !important;
            box-shadow: none !important;
            outline: 0 !important;
            background: transparent !important;
          }
          .consultant-sheet-inner .gap-8 { gap: 12px !important; }
          .consultant-sheet-inner .gap-6 { gap: 10px !important; }
          .consultant-sheet-inner .gap-5 { gap: 8px !important; }
          .consultant-sheet-inner .gap-4 { gap: 6px !important; }
          .consultant-sheet-inner .p-8 { padding: 0 !important; }
          .consultant-sheet-inner .p-4 { padding: 8px !important; }
          .consultant-sheet-inner .pt-6 { padding-top: 10px !important; }
          .consultant-sheet-inner .pt-4 { padding-top: 8px !important; }
          .consultant-sheet-inner .mb-3 { margin-bottom: 6px !important; }
          .consultant-sheet-inner .mt-3 { margin-top: 6px !important; }
          .consultant-sheet-inner .h-9 { height: 28px !important; }
          .consultant-sheet-inner .sheet-center-header {
            padding-bottom: 1.5mm !important;
            margin-bottom: 1.5mm !important;
          }
          .print-consultant-patient-grid {
            display: flex !important;
            flex-wrap: wrap !important;
            column-gap: 6mm !important;
            row-gap: 1.5mm !important;
          }
          .print-consultant-questions {
            display: block !important;
          }
          .print-consultant-questions table {
            font-size: 10px !important;
          }
          .print-consultant-questions th {
            padding: 3px !important;
            line-height: 1.05 !important;
          }
          .print-consultant-questions td {
            padding: 2px 3px !important;
            line-height: 1.05 !important;
          }
          .print-consultant-questions input[type="checkbox"] {
            width: 12px !important;
            height: 12px !important;
          }
          .print-consultant-diagrams {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .print-consultant-diagrams .rounded-full {
            width: 26mm !important;
            height: 26mm !important;
            border-width: 2px !important;
          }
          .print-consultant-diagrams p {
            margin-top: 1.5mm !important;
          }
          .print-consultant-footer-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important;
          }
          .print-consultant-signatures {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
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
          {!originalMode ? <div>{renderFollowupSection()}</div> : null}
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

