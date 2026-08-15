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
import { DateInput } from "@/components/ui/date-input";
import SheetCenterHeader from "@/components/SheetCenterHeader";
import FollowupTablesBody from "@/components/sheets/FollowupTablesBody";

const FOLLOWUP_TITLES = [
  "المتابعة الأولى",
  "المتابعة الثانية",
  "المتابعة الثالثة",
  "المتابعة الرابعة",
];

export default function LasikFollowupPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sheets/lasik/:id/followup");
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [operationDateLeft, setOperationDateLeft] = useState("");
  const [operationDateRight, setOperationDateRight] = useState("");
  const [operationType, setOperationType] = useState("ليزك");
  const [operationEyes, setOperationEyes] = useState({
    right: true,
    left: false,
  });
  const [designerConfig, setDesignerConfig] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG,
  );
  const [patientName, setPatientName] = useState("");
  const [patientDOB, setPatientDOB] = useState("");
  const [signatures, setSignatures] = useState({ doctor: "" });
  const emptyFollowupRow = (id: number | string, type: string) => ({
    id,
    date: "",
    type,
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
    emptyFollowupRow(1, "المتابعة الأولى"),
    emptyFollowupRow(2, "المتابعة الثانية"),
    emptyFollowupRow(3, "المتابعة الثالثة"),
    emptyFollowupRow(4, "المتابعة الرابعة"),
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
    { patientId: initialPatientId ?? 0, sheetType: "lasik" },
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
  }, [designerConfig.followupLasik?.followupNames]);

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
  }, [followupSheetsQuery.data, designerConfig.followupLasik?.followupNames]);

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
          newFollowups.push(emptyFollowupRow(nextId + i, followupName));
        }
        setFollowups([...followups, ...newFollowups]);
      }
    }
  }, [followups, designerConfig.followupLasik?.followupNames]);

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
        sheetType: "lasik",
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
    designerConfig.followupLasik ?? DEFAULT_SHEET_DESIGNER_CONFIG.followupLasik;

  const onPickPatient = (patient: { id: number }) => {
    if (patient?.id) setLocation(`/sheets/lasik/${patient.id}/followup`);
  };

  const followupTitles = [
    "1st Follow-up (Day 1)",
    "2nd Follow-up (1 Week)",
    "3rd Follow-up (1 Month)",
    "Later Follow-up",
  ];

  return (
    <div
      className="lasik-followup-page min-h-screen bg-[#dde1e7] text-foreground"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .print\\:hidden { display: none !important; }
          html,
          body,
          #root,
          .lasik-followup-page,
          .lasik-followup-page main {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-page-center-a4 {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto;
          }
          .sheet-followup-body {
            width: 210mm !important;
            min-height: 297mm !important;
            box-sizing: border-box !important;
            margin: 0 auto;
            padding: 10mm !important;
          }
          .sheet-followup-body section { page-break-inside: avoid !important; }
          .sheet-followup-body table { font-size: inherit !important; }
          .sheet-followup-body th,
          .sheet-followup-body td {
            padding: 0 !important;
            line-height: normal !important;
          }
          .sheet-followup-body input,
          .sheet-followup-body select,
          .sheet-followup-body textarea {
            line-height: normal !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .sheet-followup-body .followup-record-table input {
            font-size: 12px !important;
          }
          .sheet-followup-body .followup-record-title > input {
            font-size: 13px !important;
          }
          .sheet-followup-body section { box-shadow: none !important; }
        }
        .print-page-center-a4 {
          width: 210mm;
          max-width: calc(100vw - 32px);
          margin: 0 auto;
        }
        .print-page-center-a4 .sheet-followup-body {
          width: 210mm;
          max-width: 100%;
          min-height: 297mm;
          box-sizing: border-box;
          padding: 10mm;
        }
        .a4-canvas {
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            padding: 15mm;
            position: relative;
        }
        .od-bg { background-color: rgba(0, 61, 155, 0.03); }
        .os-bg { background-color: transparent; }
        .table-input-cell {
            padding: 0 !important;
        }
        .table-input-cell input {
            height: 100%;
            border-radius: 0;
            text-align: center;
            background-color: transparent;
            border: 1px solid transparent;
            width: 100%;
            transition: all 0.2s;
        }
        .table-input-cell input:focus {
            border-color: #003d9b;
            background-color: #ffffff;
            outline: none;
            box-shadow: 0 0 0 2px rgba(0, 61, 155, 0.1);
        }
        .text-on-surface { color: #191c1e; }
        .text-primary { color: #003d9b; }
        .bg-primary { background-color: #003d9b; }
        .hover\:bg-primary-container:hover { background-color: #0052cc; }
        .bg-primary-container { background-color: #0052cc; }
        .text-on-primary-container { color: #c4d2ff; }
        .text-on-surface-variant { color: #434654; }
        .text-outline { color: #737685; }
        .border-outline-variant { border-color: #c3c6d6; }
        .border-outline { border-color: #737685; }
        .bg-surface-container-lowest { background-color: #ffffff; }
        .bg-surface-container-low { background-color: #f3f4f6; }
        .bg-surface-container-high { background-color: #e7e8ea; }
        .bg-surface-container-highest { background-color: #e1e2e4; }
        .bg-tertiary-container { background-color: #006476; }
        .text-on-tertiary-container { color: #70e2ff; }
        .text-secondary { color: #526069; }
        .bg-surface-variant { background-color: #e1e2e4; }
        .bg-surface { background-color: #f8f9fb; }
        
        .mb-section-margin { margin-bottom: 32px; }
        .mt-section-margin { margin-top: 32px; }
        .gap-gutter { gap: 16px; }
        .pt-gutter { padding-top: 16px; }
        
        .font-body-md, .text-body-md { font-size: 14px; line-height: 20px; font-weight: 400; }
        .font-headline-md, .text-headline-md { font-size: 24px; line-height: 32px; font-weight: 600; }
        .font-headline-sm, .text-headline-sm { font-size: 20px; line-height: 28px; font-weight: 600; }
        .font-body-lg, .text-body-lg { font-size: 16px; line-height: 24px; font-weight: 400; }
        .font-display-lg, .text-display-lg { font-size: 32px; line-height: 40px; letter-spacing: -0.02em; font-weight: 700; }
        .font-data-mono { font-size: 14px; line-height: 20px; font-weight: 600; }
        .font-label-caps { font-size: 12px; line-height: 16px; letter-spacing: 0.05em; font-weight: 700; text-transform: uppercase; }
      `}</style>

      {/* Top nav */}
      <header className="print:hidden sticky top-0 z-50 flex justify-between items-center w-full px-6 py-2 bg-background border-b border-border/70">
        <span className="text-base font-bold text-primary">
          Ophthalmic Clinic Management
        </span>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#737685] text-foreground text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:bg-[#edeef0]"
            onClick={() =>
              setLocation(`/sheets/lasik/${initialPatientId ?? ""}`)
            }
          >
            ← Lasik Sheet
          </Button>
          <div className="w-60">
            <PatientPicker
              initialPatientId={initialPatientId}
              onSelect={onPickPatient}
            />
          </div>
          <Button
            type="button"
            className="bg-[#003d9b] text-white text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:opacity-80 active:scale-95 disabled:opacity-60"
            onClick={handleSaveFollowup}
            disabled={saveFollowupSheetMutation.isPending}
          >
            {saveFollowupSheetMutation.isPending ? "Saving..." : "Save Sheet"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#737685] text-foreground text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:bg-[#edeef0]"
            onClick={() =>
              void printOrExportPdf(
                `lasik-followup-${initialPatientId ?? "sheet"}.pdf`,
                { forceBrowserPrint: true },
              )
            }
          >
            <Printer className="h-3 w-3 mr-1" /> Print PDF
          </Button>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Main content */}
        <main className="py-8 px-6 flex-1 print:p-0">
          <div className="print-page-center-a4">
            <FollowupTablesBody
              titleEn="Lasik Follow-up"
              titleAr="متابعة الليزك"
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
