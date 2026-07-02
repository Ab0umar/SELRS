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
  const [followups, setFollowups] = useState([
    { id: 1, date: "", type: "المتابعة الأولى", right: true, left: false },
    { id: 2, date: "", type: "المتابعة الثانية", right: false, left: true },
    { id: 3, date: "", type: "المتابعة الثالثة", right: false, left: false },
    { id: 4, date: "", type: "المتابعة الرابعة", right: true, left: true },
  ]);

  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, {
    enabled: Boolean(initialPatientId),
    refetchOnWindowFocus: false,
  });
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const followupVisitsQuery = trpc.medical.getFollowupVisitsByPatient.useQuery(
    initialPatientId ?? 0,
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
    const names = designerConfig.followupConsultant?.followupNames ?? [];
    setFollowups((prev) =>
      prev.map((item, i) => ({ ...item, type: names[i] ?? item.type })),
    );
  }, [designerConfig.followupConsultant?.followupNames]);

  useEffect(() => {
    if (!followupVisitsQuery.data) return;
    const visits = followupVisitsQuery.data as any[];
    if (visits.length === 0) {
      // Keep template data if no followups found
      return;
    }
    // Transform visits to followup format
    const transformedFollowups = visits.map((visit, index) => {
      const followupName =
        designerConfig.followupConsultant?.followupNames?.[index] ??
        `المتابعة #${index + 1}`;
      const visitDate =
        typeof visit.visitDate === "string"
          ? visit.visitDate.split("T")[0]
          : visit.visitDate instanceof Date
            ? visit.visitDate.toISOString().split("T")[0]
            : new Date(visit.visitDate).toISOString().split("T")[0];
      return {
        id: visit.id,
        date: visitDate,
        type: followupName,
        right: index % 2 === 0,
        left: index % 2 === 1,
      };
    });
    setFollowups(transformedFollowups);
  }, [
    followupVisitsQuery.data,
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
          const followupName =
            designerConfig.followupConsultant?.followupNames?.[index % 4] ??
            `المتابعة #${(index % 4) + 1}`;
          newFollowups.push({
            id: nextId + i,
            date: "",
            type: followupName,
            right: index % 2 === 0,
            left: index % 2 === 1,
          });
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
      // Add other empty fields for now
      vaOD: "",
      vaOS: "",
      treatment: "",
      notes: "",
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

  const followupTitles = ["1st Follow-up (Day 1)", "2nd Follow-up (1 Week)", "3rd Follow-up (1 Month)", "Later Follow-up"];

  return (
    <div className="min-h-screen bg-[#dde1e7] text-[#191c1e]" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .print-page-center-a4 {
            min-height: 297mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .followup-print-root {
            width: 190mm;
            margin: 0 auto;
          }
          .followup-print-root, .followup-print-root * { font-weight: 400 !important; text-decoration: none !important; }
          .followup-print-root th { font-weight: 700 !important; }
          .followup-print-root > * + * { margin-top: 2mm !important; }
          .followup-print-root .space-y-5 > * + * { margin-top: 2mm !important; }
          .followup-print-root section { page-break-inside: avoid !important; }
          .followup-print-root .sheet-center-header { padding-bottom: 1mm !important; margin-bottom: 1mm !important; }
          .followup-print-root td, .followup-print-root th { padding: 1mm 2mm !important; }
          .followup-print-root textarea { height: 9mm !important; min-height: 0 !important; }
          .followup-print-root .h-16 { height: 9mm !important; }
          .followup-print-root .h-10 { height: 5mm !important; }
          .followup-print-root .h-8 { height: 5mm !important; }
          .followup-print-root .h-7 { height: 5mm !important; }
          .followup-print-root .w-8 { width: 5mm !important; }
          .followup-print-root .p-4 { padding: 1.5mm !important; }
          .followup-print-root .py-2 { padding-top: 0.5mm !important; padding-bottom: 0.5mm !important; }
          .followup-print-root footer { padding-top: 1mm !important; }
          .followup-print-root section { box-shadow: none !important; }
        }
      `}</style>

      {/* Top nav */}
      <header className="print:hidden sticky top-0 z-50 flex justify-between items-center w-full px-6 py-2 bg-[#f8f9fb] border-b border-[#c3c6d6]">
        <span className="text-base font-bold text-[#003d9b]">Ophthalmic Clinic Management</span>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#737685] text-[#191c1e] text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:bg-[#edeef0]"
            onClick={() => setLocation(`/sheets/consultant/${initialPatientId ?? ""}`)}
          >
            ← Consultant Sheet
          </Button>
          <div className="w-60">
            <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
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
            className="border-[#737685] text-[#191c1e] text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:bg-[#edeef0]"
            onClick={() => void printOrExportPdf(`consultant-followup-${initialPatientId ?? "sheet"}.pdf`)}
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
