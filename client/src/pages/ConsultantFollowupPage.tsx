import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import {
  coerceSheetDesignerConfig,
  DEFAULT_SHEET_DESIGNER_CONFIG,
  loadSheetDesignerConfig,
  saveSheetDesignerConfig,
} from "@/lib/sheetDesigner";
import { printOrExportPdf } from "@/lib/nativePdf";
import FollowupTablesBody from "@/components/sheets/FollowupTablesBody";

const FOLLOWUP_TITLES = [
  "المتابعة الأولى",
  "المتابعة الثانية",
  "المتابعة الثالثة",
  "المتابعة الرابعة",
];

export default function ConsultantFollowupPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sheets/consultant/:id/followup");
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [operationDateLeft, setOperationDateLeft] = useState("");
  const [operationDateRight, setOperationDateRight] = useState("");
  const [operationType, setOperationType] = useState("");
  const [operationEyes, setOperationEyes] = useState({
    right: false,
    left: false,
  });
  const [designerConfig, setDesignerConfig] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG,
  );
  const [patientName, setPatientName] = useState("");
  const [patientDOB, setPatientDOB] = useState("");
  const [signatures, setSignatures] = useState({ doctor: "" });
  const emptyFollowupRow = (
    id: number | string,
    type: string,
    right: boolean,
    left: boolean,
  ) => ({
    id,
    date: "",
    type,
    right,
    left,
    odVa: "",
    osVa: "",
    odS: "",
    odC: "",
    odAxis: "",
    osS: "",
    osC: "",
    osAxis: "",
    odFlapEdges: "",
    odFlapBed: "",
    osFlapEdges: "",
    osFlapBed: "",
    odIop: "",
    osIop: "",
    treatment: "",
    notes: "",
  });

  const [followups, setFollowups] = useState([
    emptyFollowupRow(1, "المتابعة الأولى", true, false),
    emptyFollowupRow(2, "المتابعة الثانية", false, true),
    emptyFollowupRow(3, "المتابعة الثالثة", false, false),
    emptyFollowupRow(4, "المتابعة الرابعة", true, true),
  ]);

  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, {
    enabled: Boolean(initialPatientId),
    refetchOnWindowFocus: false,
  });
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const followupSheetsQuery = trpc.medical.getFollowupSheets.useQuery(
    { patientId: initialPatientId ?? 0, sheetType: "consultant" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const designerSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

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
      prev.map((item, i) => ({ ...item, type: FOLLOWUP_TITLES[i % 4] })),
    );
  }, [designerConfig.followupConsultant?.followupNames]);

  useEffect(() => {
    if (!followupSheetsQuery.data) return;
    const sheets = followupSheetsQuery.data as any[];
    // Each saved follow-up fills its own table, ordered by visit date.
    const items = sheets
      .slice()
      .sort((a, b) => a.version - b.version)
      .flatMap((sheet) =>
        (sheet.items ?? [])
          .slice()
          .map((item: any) => ({ ...item, sheetVersion: sheet.version })),
      )
      .filter((item: any) => item.followupDate)
      .sort((a: any, b: any) => {
        const dateOrder =
          new Date(a.followupDate).getTime() -
          new Date(b.followupDate).getTime();
        if (dateOrder !== 0) return dateOrder;
        const versionOrder = Number(a.sheetVersion) - Number(b.sheetVersion);
        return versionOrder !== 0
          ? versionOrder
          : Number(a.tableIndex) - Number(b.tableIndex);
      });
    if (items.length === 0) {
      // Keep template data if no followups found
      return;
    }
    const parseRefrac = (json: unknown) => {
      if (!json) return { s: "", c: "", axis: "" };
      try {
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        return {
          s: parsed?.s ?? "",
          c: parsed?.c ?? "",
          axis: parsed?.axis ?? "",
        };
      } catch {
        return { s: "", c: "", axis: "" };
      }
    };
    const parseFlap = (json: unknown) => {
      if (!json) return { edges: "", bed: "" };
      try {
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        return { edges: parsed?.edges ?? "", bed: parsed?.bed ?? "" };
      } catch {
        return { edges: "", bed: "" };
      }
    };
    const transformedFollowups = items.map((item: any, index: number) => {
      const followupName = FOLLOWUP_TITLES[index % 4];
      const followupDate = item.followupDate
        ? (typeof item.followupDate === "string"
            ? item.followupDate
            : new Date(item.followupDate).toISOString()
          ).split("T")[0]
        : "";
      const od = parseRefrac(item.refracOD);
      const os = parseRefrac(item.refracOS);
      const flapOD = parseFlap(item.flapOD);
      const flapOS = parseFlap(item.flapOS);
      return {
        id: item.id,
        date: followupDate,
        type: followupName,
        right: Boolean(item.rightEye),
        left: Boolean(item.leftEye),
        odVa: item.vaOD ?? "",
        osVa: item.vaOS ?? "",
        odS: od.s,
        odC: od.c,
        odAxis: od.axis,
        osS: os.s,
        osC: os.c,
        osAxis: os.axis,
        odFlapEdges: flapOD.edges,
        odFlapBed: flapOD.bed,
        osFlapEdges: flapOS.edges,
        osFlapBed: flapOS.bed,
        odIop: item.iopOD ?? "",
        osIop: item.iopOS ?? "",
        treatment: item.treatment ?? "",
        notes: item.notes ?? "",
      };
    });
    setFollowups(transformedFollowups);
  }, [
    followupSheetsQuery.data,
    designerConfig.followupConsultant?.followupNames,
  ]);

  // Dynamic loading: add 4 new followups when last one is filled
  useEffect(() => {
    if (followups.length === 0) return;

    const lastFollowup = followups[followups.length - 1];
    const isLastFollowupOfGroup = followups.length % 4 === 0;

    // Check if last followup in the current group has a date
    if (
      isLastFollowupOfGroup &&
      lastFollowup.date &&
      !lastFollowup.id?.toString().includes("temp-")
    ) {
      // Check if next group is already loaded
      const nextGroupStart = followups.length;
      const hasNextGroup =
        followups.length > 4 && followups.some((f, i) => i >= nextGroupStart);

      if (!hasNextGroup) {
        // Add 4 new followups dynamically
        const nextId =
          Math.max(
            ...followups.map((f) => (typeof f.id === "number" ? f.id : 0)),
          ) + 1;
        const newFollowups = [];
        for (let i = 0; i < 4; i++) {
          const index = followups.length + i;
          const followupName = FOLLOWUP_TITLES[index % 4];
          newFollowups.push(
            emptyFollowupRow(
              nextId + i,
              followupName,
              index % 2 === 0,
              index % 2 === 1,
            ),
          );
        }
        setFollowups([...followups, ...newFollowups]);
      }
    }
  }, [followups, designerConfig.followupConsultant?.followupNames]);

  useEffect(() => {
    const p = patientQuery.data as any;
    if (p?.fullName) setPatientName(String(p.fullName));
    if (p?.dateOfBirth) {
      const dob = new Date(p.dateOfBirth);
      const month = String(dob.getMonth() + 1).padStart(2, "0");
      const day = String(dob.getDate()).padStart(2, "0");
      const year = dob.getFullYear();
      setPatientDOB(`${day}/${month}/${year}`);
    }
  }, [patientQuery.data]);

  useEffect(() => {
    const doctorFromState = String(
      (examinationStateQuery.data as any)?.data?.doctorName ?? "",
    ).trim();
    const fullName = String(user?.name ?? "").trim();
    setSignatures({ doctor: doctorFromState || fullName || "" });
  }, [examinationStateQuery.data, user?.name]);

  const saveFollowupSheetMutation =
    trpc.medical.saveFollowupSheet.useMutation();

  const handleSaveFollowup = async () => {
    if (!initialPatientId) return;

    // Collect filled followups in groups of 4
    const filledFollowups = followups.filter((f) => f.date);
    if (filledFollowups.length === 0) {
      alert("لا توجد بيانات لحفظها");
      return;
    }

    // Convert to followup items format (only filled items)
    const followupItems = filledFollowups.map((f, index) => ({
      tableIndex: index % 4,
      followupDate: f.date,
      followupName: f.type,
      rightEye: f.right ?? false,
      leftEye: f.left ?? false,
      vaOD: f.odVa,
      vaOS: f.osVa,
      refracOD: { s: f.odS, c: f.odC, axis: f.odAxis },
      refracOS: { s: f.osS, c: f.osC, axis: f.osAxis },
      flapOD: { edges: f.odFlapEdges, bed: f.odFlapBed },
      flapOS: { edges: f.osFlapEdges, bed: f.osFlapBed },
      iopOD: f.odIop,
      iopOS: f.osIop,
      treatment: f.treatment,
      notes: f.notes,
    }));

    try {
      await saveFollowupSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "consultant",
        followupItems,
      });
      alert("تم حفظ البيانات بنجاح");
    } catch (error) {
      alert("فشل حفظ البيانات");
      console.error(error);
    }
  };

  if (!isAuthenticated) return null;

  const followupLabels =
    designerConfig.followupConsultant ??
    DEFAULT_SHEET_DESIGNER_CONFIG.followupConsultant;

  const onPickPatient = (patient: { id: number }) => {
    if (patient?.id) setLocation(`/sheets/consultant/${patient.id}/followup`);
  };

  return (
    <div
      className="min-h-screen bg-[#dde1e7] text-foreground"
      style={{ fontFamily: "Inter, sans-serif" }}
      dir="rtl"
    >
      <style>{`
        .consultant-followup-page {
          background: #dde1e7;
        }
        .consultant-followup-toolbar {
          backdrop-filter: blur(8px);
        }
        .consultant-followup-shell {
          width: 210mm;
          max-width: calc(100vw - 32px);
          margin: 0 auto;
        }
        .consultant-followup-shell .sheet-followup-body {
          width: 210mm;
          min-height: 0;
          margin: 0 auto;
          border: 0;
          padding: 10mm;
          box-shadow: 0 18px 45px rgba(25, 28, 30, 0.12);
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .print\\:hidden,
          .consultant-followup-toolbar {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
            overflow-y: hidden !important;
            background: white !important;
          }
          .consultant-followup-page,
          .consultant-followup-page main {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
            overflow-y: hidden !important;
          }
          .print-page-center-a4 {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          .sheet-followup-body {
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            box-shadow: none !important;
            border: 0 !important;
            padding: 8mm 10mm !important;
            background: white !important;
          }
          .sheet-followup-body .sheet-followup-content {
            height: auto !important;
            flex: 0 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5mm !important;
          }
          .sheet-followup-body, .sheet-followup-body * {
            box-sizing: border-box !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
            font-weight: 400 !important;
            text-decoration: none !important;
          }
          .sheet-followup-body th { font-weight: 700 !important; }
          .sheet-followup-body .sheet-print-header {
            flex: 0 0 16mm !important;
            height: 16mm !important;
            min-height: 16mm !important;
            padding: 0 0 1.5mm !important;
            margin: 0 !important;
            align-items: center !important;
          }
          .sheet-followup-body .sheet-print-clinic-name {
            font-size: 14px !important;
            font-weight: 700 !important;
          }
          .sheet-followup-body .sheet-print-clinic-tagline {
            font-size: 8px !important;
          }
          .sheet-followup-body .sheet-print-type {
            font-size: 12px !important;
            font-weight: 700 !important;
          }
          .sheet-followup-body .sheet-print-logo {
            width: 10mm !important;
            height: 10mm !important;
          }
          .sheet-followup-body .followup-record-head {
            flex: 0 0 19mm !important;
            height: 19mm !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            border-radius: 0.8mm !important;
          }
          .sheet-followup-body .followup-record-head,
          .sheet-followup-body .followup-record-head * {
            font-size: 9.5px !important;
            line-height: 1.15 !important;
          }
          .sheet-followup-body .followup-record-head input,
          .sheet-followup-body .followup-record-head button {
            height: 4.5mm !important;
            min-height: 4.5mm !important;
            border-radius: 1mm !important;
          }
          .sheet-followup-body .followup-record-list {
            flex: 0 0 auto !important;
            min-height: 0 !important;
            gap: 2.2mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
          }
          .sheet-followup-body .followup-record-section {
            flex: 0 0 56mm !important;
            height: 56mm !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            border-radius: 0.8mm !important;
          }
          .sheet-followup-body .followup-record-title {
            flex: 0 0 8mm !important;
            height: 8mm !important;
            min-height: 8mm !important;
            padding: 0 !important;
            grid-template-columns: minmax(0, 1fr) 55mm 55mm !important;
            gap: 0 !important;
          }
          .sheet-followup-body .followup-record-title input {
            height: 6mm !important;
            min-height: 6mm !important;
            font-size: 10.5px !important;
            padding: 0 1mm !important;
          }
          .sheet-followup-body .followup-clinical-grid {
            flex: 0 0 21mm !important;
            height: 21mm !important;
            min-height: 0 !important;
            display: flex !important;
            overflow: hidden !important;
          }
          .sheet-followup-body .followup-record-table {
            flex: 1 1 auto !important;
            height: 42mm !important;
            min-height: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .sheet-followup-body .followup-record-table th {
            height: auto !important;
            padding: 0.45mm 0.7mm !important;
            font-size: 8.5px !important;
            letter-spacing: 0 !important;
          }
          .sheet-followup-body .followup-record-table td {
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
          }
          .sheet-followup-body .followup-record-title .followup-date-label {
            font-size: 8.5px !important;
            line-height: 1 !important;
          }
          .sheet-followup-body .followup-record-table tr {
            height: auto !important;
          }
          .sheet-followup-body .followup-section-bottom {
            flex: 0 0 12mm !important;
            height: 12mm !important;
            min-height: 12mm !important;
            grid-template-columns: 1fr 48mm !important;
          }
          .sheet-followup-body .followup-section-bottom span,
          .sheet-followup-body .followup-section-bottom label {
            font-size: 7px !important;
            line-height: 1.05 !important;
          }
          .sheet-followup-body .followup-section-bottom textarea {
            height: 8mm !important;
            min-height: 8mm !important;
            padding: 0.7mm 1.2mm !important;
            font-size: 8px !important;
          }
          .sheet-followup-body .followup-section-bottom input[type="checkbox"] {
            width: 2.2mm !important;
            height: 2.2mm !important;
          }
          .sheet-followup-body .followup-signature-row {
            flex: 0 0 16mm !important;
            height: 16mm !important;
            gap: 4mm !important;
            padding-top: 4mm !important;
            font-size: 9.5px !important;
          }
          .sheet-followup-body section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .sheet-followup-body input,
          .sheet-followup-body textarea {
            font-size: 9px !important;
            min-height: 0 !important;
            box-shadow: none !important;
            outline: 0 !important;
          }
          .sheet-followup-body input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
          }
          .sheet-followup-body .followup-record-title label button,
          .sheet-followup-body .followup-record-head label button {
            display: none !important;
          }
          .sheet-followup-body .h-10 { height: 5mm !important; }
          .sheet-followup-body .h-8 { height: 5mm !important; }
          .sheet-followup-body .h-7 { height: 5mm !important; }
          .sheet-followup-body .p-6 { padding: 8mm 10mm !important; }
          .sheet-followup-body section { box-shadow: none !important; }
          .sheet-followup-body .sheet-watermark img {
            width: 120mm !important;
            height: 120mm !important;
            opacity: 0.055 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Top nav */}
      <header className="consultant-followup-toolbar print:hidden sticky top-0 z-50 flex justify-between items-center w-full px-5 py-2 bg-[#f8f9fb]/95 border-b border-[#c3c6d6]">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#737685] text-foreground text-xs font-bold px-4 py-2 rounded hover:bg-[#edeef0]"
            onClick={() =>
              setLocation(`/sheets/consultant/${initialPatientId ?? ""}`)
            }
          >
            كشف الاستشاري
          </Button>
          <div className="w-60">
            <PatientPicker
              initialPatientId={initialPatientId}
              onSelect={onPickPatient}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="bg-[#003d9b] text-white text-xs font-bold px-4 py-2 rounded hover:opacity-80 active:scale-95 disabled:opacity-60"
            onClick={handleSaveFollowup}
            disabled={saveFollowupSheetMutation.isPending}
          >
            {saveFollowupSheetMutation.isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#737685] text-foreground text-xs font-bold px-4 py-2 rounded hover:bg-[#edeef0]"
            onClick={() =>
              void printOrExportPdf(
                `consultant-followup-${initialPatientId ?? "sheet"}.pdf`,
                { forceBrowserPrint: true },
              )
            }
          >
            <Printer className="h-3 w-3 ml-1" /> طباعة
          </Button>
        </div>
      </header>

      <div className="consultant-followup-page flex min-h-screen">
        {/* Main content */}
        <main className="py-6 px-4 flex-1 print:p-0">
          <div className="consultant-followup-shell print-page-center-a4">
            <FollowupTablesBody
              titleEn="Consultant Follow-up"
              titleAr="متابعة الاستشاري"
              patientName={patientName}
              patientDOB={patientDOB}
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
          </div>
        </main>
      </div>
    </div>
  );
}
