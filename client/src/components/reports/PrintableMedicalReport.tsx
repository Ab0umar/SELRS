import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import PatientPicker from "@/components/PatientPicker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Printer,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  FileText,
} from "lucide-react";

export interface RefractionEntry {
  eye: string;
  sphere?: string;
  cylinder?: string;
  axis?: string;
}

export interface PhysicianInfo {
  name: string;
  title: string;
}

export interface MedicalReportData {
  title: string;
  patientName: string;
  examinationDate: string;
  procedureDate: string;
  clinicalSummary: string;
  refraction: RefractionEntry[];
  procedure: string;
  followUp: string;
  physician: PhysicianInfo;
}

export const defaultReportEn: MedicalReportData = {
  title: "MEDICAL REPORT",
  patientName: "",
  examinationDate: "",
  procedureDate: "",
  clinicalSummary: "",
  refraction: [
    { eye: "OD", sphere: "", cylinder: "", axis: "" },
    { eye: "OS", sphere: "", cylinder: "", axis: "" },
  ],
  procedure: "",
  followUp: "",
  physician: {
    name: "",
    title: "",
  },
};

export const defaultReportAr: MedicalReportData = {
  title: "تقرير طبي",
  patientName: "",
  examinationDate: "",
  procedureDate: "",
  clinicalSummary: "",
  refraction: [
    { eye: "OD", sphere: "", cylinder: "", axis: "" },
    { eye: "OS", sphere: "", cylinder: "", axis: "" },
  ],
  procedure: "",
  followUp: "",
  physician: {
    name: "",
    title: "",
  },
};

interface MedicalReportProps {
  initialReport?: MedicalReportData;
  initialPatientId?: number;
  onSelectPatient?: (id: number | undefined) => void;
  hideTopBarSearch?: boolean;
  hidePrintButton?: boolean;
}

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function formatReportDateEn(dateVal?: string | Date | null): string {
  if (!dateVal) {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatReportDateAr(dateVal?: string | Date | null): string {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return String(dateVal);
  const day = d.getDate();
  const month = ARABIC_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function PrintableMedicalReport({
  initialReport,
  initialPatientId,
  onSelectPatient,
  hideTopBarSearch = false,
  hidePrintButton = false,
}: MedicalReportProps) {
  const [activeLang, setActiveLang] = useState<"en" | "ar">("ar");

  const [, params] = useRoute("/medical-report/:id");
  const queryParamId =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("patientId")) ||
        Number(new URLSearchParams(window.location.search).get("id")) ||
        undefined
      : undefined;

  const routePatientId = params?.id ? Number(params.id) : undefined;
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(
    initialPatientId || routePatientId || queryParamId,
  );

  useEffect(() => {
    setSelectedPatientId(initialPatientId);
    if (!initialPatientId) {
      setReportEn(defaultReportEn);
      setReportAr(defaultReportAr);
    }
  }, [initialPatientId]);

  // Separate states for English and Arabic reports
  const [reportEn, setReportEn] = useState<MedicalReportData>(initialReport || defaultReportEn);
  const [reportAr, setReportAr] = useState<MedicalReportData>(defaultReportAr);

  // Live database queries for the selected patient
  const patientQuery = trpc.patient.getPatient.useQuery(selectedPatientId ?? null, {
    enabled: Boolean(selectedPatientId),
    refetchOnWindowFocus: false,
  });

  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
  );

  const glassesRecordsQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
  );

  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
  );

  // Update reports automatically when live DB data arrives
  useEffect(() => {
    if (!selectedPatientId) {
      setReportEn(defaultReportEn);
      setReportAr(defaultReportAr);
      return;
    }
    if (!patientQuery.data) return;

    const patient = patientQuery.data as any;
    const exams = (examinationsQuery.data as any[] | undefined) || [];
    const latestExam = exams[0];

    const glassesList = (glassesRecordsQuery.data as any[] | undefined) || [];
    const latestGlasses = glassesList[0];

    const autorefList = (autorefQuery.data as any[] | undefined) || [];
    const latestAutoref = autorefList[0];

    const isFemale = patient.gender === "female" || patient.gender === "أنثى";
    const patientNameEn = `${isFemale ? "Ms." : "Mr."} ${patient.fullName || "Valued Patient"}`;
    const patientNameAr = `${isFemale ? "السيدة / " : "السيد / "} ${patient.fullName || "المريض الكريم"}`;

    const examDateRaw = latestExam?.visitDate || latestExam?.createdAt || new Date();
    const examDateEn = formatReportDateEn(examDateRaw);
    const examDateAr = formatReportDateAr(examDateRaw);

    const procDateEn = formatReportDateEn(new Date());
    const procDateAr = formatReportDateAr(new Date());

    // Extract refraction from glasses record or autoref
    const odCyl = latestGlasses?.cOD ?? latestAutoref?.cylinderOD;
    const odSph = latestGlasses?.sOD ?? latestAutoref?.sphereOD;
    const odAxis = latestGlasses?.axisOD ?? latestAutoref?.axisOD;

    const osCyl = latestGlasses?.cOS ?? latestAutoref?.cylinderOS;
    const osSph = latestGlasses?.sOS ?? latestAutoref?.sphereOS;
    const osAxis = latestGlasses?.axisOS ?? latestAutoref?.axisOS;

    const formattedOdSph = odSph ? `${Number(odSph) > 0 ? "+" : ""}${Number(odSph).toFixed(2)}` : "";
    const formattedOdCyl = odCyl ? `${Number(odCyl) > 0 ? "+" : ""}${Number(odCyl).toFixed(2)}` : "";
    const formattedOdAxis = odAxis ? `${odAxis}°` : "";

    const formattedOsSph = osSph ? `${Number(osSph) > 0 ? "+" : ""}${Number(osSph).toFixed(2)}` : "";
    const formattedOsCyl = osCyl ? `${Number(osCyl) > 0 ? "+" : ""}${Number(osCyl).toFixed(2)}` : "";
    const formattedOsAxis = osAxis ? `${osAxis}°` : "";

    const refractionEn: RefractionEntry[] = [
      { eye: "OD", sphere: formattedOdSph, cylinder: formattedOdCyl, axis: formattedOdAxis },
      { eye: "OS", sphere: formattedOsSph, cylinder: formattedOsCyl, axis: formattedOsAxis },
    ];

    const refractionAr: RefractionEntry[] = [
      { eye: "OD", sphere: formattedOdSph, cylinder: formattedOdCyl, axis: formattedOdAxis },
      { eye: "OS", sphere: formattedOsSph, cylinder: formattedOsCyl, axis: formattedOsAxis },
    ];

    const isHighAstig = Math.abs(Number(odCyl || 0)) >= 2.5 || Math.abs(Number(osCyl || 0)) >= 2.5;
    const diagnosisEn = latestExam?.diagnosis || (isHighAstig ? "high astigmatism" : "myopic astigmatism");
    const diagnosisAr = latestExam?.diagnosis || (isHighAstig ? "درجات استجماتيزم مرتفعة" : "استجماتيزم وحسر بصر");

    const isPrk = patient.serviceType && String(patient.serviceType).toLowerCase().includes("prk");
    const procEn = isPrk
      ? `Custom PRK was performed on ${procDateEn}.`
      : `Femto-LASIK was performed on ${procDateEn}.`;

    const procAr = isPrk
      ? ` ${procDateAr}.`
      : ` ${procDateAr}.`;

    const treatingDoctor = patient.treatingDoctor || "";
    const doctorAr = patient.treatingDoctor || "";

    setReportEn({
      title: "MEDICAL REPORT",
      patientName: patientNameEn,
      examinationDate: examDateEn,
      procedureDate: procDateEn,
      clinicalSummary: `The patient presented with ${diagnosisEn} and was evaluated for refractive surgery.`,
      refraction: refractionEn,
      procedure: procEn,
      followUp:
        "Postoperative improvement has been noted. Final visual assessment is recommended after approximately six weeks.",
      physician: {
        name: treatingDoctor,
        title: treatingDoctor ? "Professor of Ophthalmology" : "",
      },
    });

    setReportAr({
      title: "تقرير طبي",
      patientName: patientNameAr,
      examinationDate: examDateAr,
      procedureDate: procDateAr,
      clinicalSummary: `.`,
      refraction: refractionAr,
      procedure: procAr,
      followUp: "",
      physician: {
        name: doctorAr,
        title: doctorAr ? "أستاذ طب وجراحة العيون" : "",
      },
    });
  }, [
    selectedPatientId,
    patientQuery.data,
    examinationsQuery.data,
    glassesRecordsQuery.data,
    autorefQuery.data,
  ]);

  // Editing helpers
  const currentReport = activeLang === "en" ? reportEn : reportAr;
  const setReport = activeLang === "en" ? setReportEn : setReportAr;

  const updateField = (key: keyof MedicalReportData, val: any) => {
    setReport((prev) => ({ ...prev, [key]: val }));
  };

  const updateRefraction = (index: number, key: keyof RefractionEntry, val: string) => {
    setReport((prev) => {
      const nextRef = [...prev.refraction];
      nextRef[index] = { ...nextRef[index], [key]: val };
      return { ...prev, refraction: nextRef };
    });
  };

  const addRefractionRow = () => {
    setReport((prev) => ({
      ...prev,
      refraction: [
        ...prev.refraction,
        { eye: activeLang === "en" ? "OU" : "", sphere: "", cylinder: "", axis: "" },
      ],
    }));
  };

  const removeRefractionRow = (index: number) => {
    setReport((prev) => ({
      ...prev,
      refraction: prev.refraction.filter((_, i) => i !== index),
    }));
  };

  const updatePhysician = (key: keyof PhysicianInfo, val: string) => {
    setReport((prev) => ({
      ...prev,
      physician: { ...prev.physician, [key]: val },
    }));
  };

  const printReport = () => window.print();

  return (
    <main className="w-full min-h-[calc(100vh-220px)] bg-slate-100 dark:bg-slate-900/40 rounded-xl px-2 sm:px-4 py-6 print:bg-white print:p-0 print:rounded-none">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .print\\:hidden,
          .no-print {
            display: none !important;
          }

          .printable-report-sheet {
            box-sizing: border-box !important;
            width: 210mm !important;
            max-width: 210mm !important;
            min-width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            padding: 16mm 18mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }

          .printable-report-sheet table {
            border-collapse: collapse !important;
            border: 1.5px solid #075985 !important;
            width: 100% !important;
          }

          .printable-report-sheet thead,
          .printable-report-sheet thead tr,
          .printable-report-sheet thead th {
            background-color: #075985 !important;
            color: #ffffff !important;
            border: 1px solid #0c4a6e !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .printable-report-sheet tr.bg-sky-50,
          .printable-report-sheet tr.bg-sky-50 td,
          .printable-report-sheet div.bg-sky-50 {
            background-color: #f0f9ff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .printable-report-sheet div.bg-sky-800 {
            background-color: #075985 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .printable-report-sheet td {
            border: 1px solid #075985 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Interactive Controls, Patient Search Bar & Tabs Switcher (Hidden when printing) */}
      <div className="mx-auto mb-6 max-w-[210mm] space-y-3 print:hidden">
        <div className="bg-card text-foreground border border-border rounded-xl p-3.5 shadow-sm space-y-3">
          
          {/* Top Bar: Search, Language Tabs & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                📄
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight" style={{ direction: "ltr" }}>
                  التقرير الطبي | Medical Report
                </h3>
              </div>
            </div>

            {/* Language Switcher Tabs */}
            <div className="flex items-center gap-2">
              <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as any)}>
                <TabsList className="h-8 bg-muted/80">
                  <TabsTrigger value="ar" className="text-xs h-7 px-3 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    <span>النسخة العربية</span>
                  </TabsTrigger>
                  <TabsTrigger value="en" className="text-xs h-7 px-3 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    <span>English Copy</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPatientId(undefined);
                  setReportEn(defaultReportEn);
                  setReportAr(defaultReportAr);
                }}
                className="h-8 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                title="تفريغ النموذج ومسح الحقول"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تفريغ النموذج</span>
              </Button>

              {!hidePrintButton && (
                <Button
                  size="sm"
                  onClick={printReport}
                  className="h-8 text-xs bg-sky-700 hover:bg-sky-800 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة / حفظ PDF</span>
                </Button>
              )}
            </div>
          </div>

          {/* Live Patient Search Picker */}
          {!hideTopBarSearch && (
            <div className="pt-2 border-t border-border">
              <PatientPicker
                label="البحث عن مريض بالمركز:"
                placeholder="اكتب اسم المريض، كود الملف (مثال: 0412)، أو رقم الهاتف…"
                initialPatientId={selectedPatientId}
                onSelect={(p) => {
                  const newId = p?.id ? Number(p.id) : undefined;
                  setSelectedPatientId(newId);
                  onSelectPatient?.(newId);
                }}
              />
            </div>
          )}

          {selectedPatientId && patientQuery.data && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                تم ربط التقرير ببيانات المريض: <strong>{(patientQuery.data as any).fullName}</strong> (كود: {(patientQuery.data as any).patientCode || selectedPatientId})
              </span>
            </div>
          )}

          </div>
        </div>

      {/* ========================================================= */}
      {/* TAB 1: ENGLISH REPORT ARTICLE                             */}
      {/* ========================================================= */}
      {activeLang === "en" && (
        <article
          dir="ltr"
          className="printable-report-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[18mm] py-[18mm] font-sans text-[11pt] leading-relaxed text-slate-900 shadow-lg print:min-h-0 print:shadow-none"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {/* Document Title (Editable on screen, solid header on print) */}
          <div className="mb-6 text-center">
            <input
              type="text"
              value={reportEn.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full text-center text-[18pt] font-bold tracking-wide text-slate-900 bg-transparent border-none outline-none focus:bg-sky-50/70 focus:ring-1 focus:ring-sky-500 rounded p-1 transition-all print:hidden"
            />
            <h1 className="hidden print:block text-[18pt] font-bold tracking-wide text-slate-900 text-center">
              {reportEn.title || "MEDICAL REPORT"}
            </h1>
          </div>

          {/* Patient Metadata Grid */}
          <section
            className="mb-5 overflow-hidden rounded-sm border border-sky-800"
            style={{ borderColor: "#075985" }}
          >
            <InfoRow
              label="Patient Name"
              value={reportEn.patientName}
              onChange={(val) => updateField("patientName", val)}
              placeholder=""
              featured
            />
            <InfoRow
              label="Date of Examination"
              value={reportEn.examinationDate}
              onChange={(val) => updateField("examinationDate", val)}
              placeholder=""
            />
            <InfoRow
              label="Date of Procedure"
              value={reportEn.procedureDate}
              onChange={(val) => updateField("procedureDate", val)}
              placeholder=""
            />
          </section>

          {/* Clinical Summary */}
          <section className="mb-5">
            <h2 className="mb-1 font-bold text-slate-900">Clinical Summary:</h2>
            <textarea
              value={reportEn.clinicalSummary}
              onChange={(e) => updateField("clinicalSummary", e.target.value)}
              placeholder=""
              rows={2}
              className="w-full bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded p-1.5 text-slate-900 placeholder:text-slate-400 text-[11pt] leading-relaxed resize-none transition-all print:hidden"
            />
            <div className="hidden print:block text-slate-900 text-[11pt] leading-relaxed p-1 whitespace-pre-wrap">
              {reportEn.clinicalSummary || " "}
            </div>
          </section>

          {/* Refraction Table */}
          <section className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-slate-900">Refraction:</h2>
              <button
                type="button"
                onClick={addRefractionRow}
                className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 print:hidden cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Row</span>
              </button>
            </div>

            <table
              className="w-full border-collapse text-center"
              style={{
                borderCollapse: "collapse",
                borderColor: "#075985",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <thead
                className="bg-sky-800 text-white"
                style={{
                  backgroundColor: "#075985",
                  color: "#ffffff",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <tr>
                  <th
                    className="border border-sky-900 p-2 w-28 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    Eye
                  </th>
                  <th
                    className="border border-sky-900 p-2 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    S
                  </th>
                  <th
                    className="border border-sky-900 p-2 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    C
                  </th>
                  <th
                    className="border border-sky-900 p-2 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    A
                  </th>
                  <th className="border border-sky-900 p-1 w-8 print:hidden"></th>
                </tr>
              </thead>

              <tbody>
                {reportEn.refraction.map((item, index) => {
                  const isEven = index % 2 === 0;
                  const rowBg = isEven ? "#f0f9ff" : "#ffffff";
                  return (
                    <tr
                      key={index}
                      className={isEven ? "bg-sky-50" : "bg-white"}
                      style={{
                        backgroundColor: rowBg,
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      <td
                        className="border border-sky-800 p-1 font-bold text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.eye}
                          onChange={(e) => updateRefraction(index, "eye", e.target.value)}
                          className="w-full text-center bg-transparent border-none outline-none font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-bold">
                          {item.eye || " "}
                        </span>
                      </td>
                      <td
                        className="border border-sky-800 p-1 text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.sphere || ""}
                          onChange={(e) => updateRefraction(index, "sphere", e.target.value)}
                          placeholder="—"
                          className="w-full text-center bg-transparent border-none outline-none font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-mono">
                          {item.sphere || "—"}
                        </span>
                      </td>
                      <td
                        className="border border-sky-800 p-1 text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.cylinder || ""}
                          onChange={(e) => updateRefraction(index, "cylinder", e.target.value)}
                          placeholder="—"
                          className="w-full text-center bg-transparent border-none outline-none font-mono font-bold focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-mono font-bold">
                          {item.cylinder || "—"}
                        </span>
                      </td>
                      <td
                        className="border border-sky-800 p-1 text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.axis || ""}
                          onChange={(e) => updateRefraction(index, "axis", e.target.value)}
                          placeholder="—"
                          className="w-full text-center bg-transparent border-none outline-none font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-mono">
                          {item.axis || "—"}
                        </span>
                      </td>
                      <td className="border border-sky-800 p-1 text-center print:hidden">
                        {reportEn.refraction.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRefractionRow(index)}
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Procedure & Follow-Up */}
          <section className="space-y-3 mb-5">
            <div className="flex items-baseline gap-2">
              <strong className="text-slate-900 shrink-0">Procedure:</strong>
              <input
                type="text"
                value={reportEn.procedure}
                onChange={(e) => updateField("procedure", e.target.value)}
                placeholder=""
                className="w-full bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded px-1.5 py-0.5 text-slate-900 placeholder:text-slate-400 text-[11pt] transition-all print:hidden"
              />
              <div className="hidden print:block text-slate-900 text-[11pt]">
                {reportEn.procedure || " "}
              </div>
            </div>

            <div>
              <strong className="text-slate-900 block mb-0.5">Follow-Up:</strong>
              <textarea
                value={reportEn.followUp}
                onChange={(e) => updateField("followUp", e.target.value)}
                placeholder=""
                rows={2}
                className="w-full bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded p-1.5 text-slate-900 placeholder:text-slate-400 text-[11pt] leading-relaxed resize-none transition-all print:hidden"
              />
              <div className="hidden print:block text-slate-900 text-[11pt] leading-relaxed whitespace-pre-wrap">
                {reportEn.followUp || " "}
              </div>
            </div>
          </section>

          {/* Physician Footer */}
          <footer className="mt-8 pt-4">
            <p className="font-bold text-slate-900 mb-0.5">Physician</p>
            <input
              type="text"
              value={reportEn.physician.name}
              onChange={(e) => updatePhysician("name", e.target.value)}
              className="w-80 bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded px-1 py-0.5 text-slate-900 font-semibold block transition-all text-[11pt] print:hidden"
            />
            <div className="hidden print:block text-slate-900 font-semibold text-[11pt]">
              {reportEn.physician.name}
            </div>

            <input
              type="text"
              value={reportEn.physician.title}
              onChange={(e) => updatePhysician("title", e.target.value)}
              className="w-80 bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded px-1 py-0.5 text-slate-600 block transition-all text-[10pt] print:hidden"
            />
            <div className="hidden print:block text-slate-600 text-[10pt]">
              {reportEn.physician.title}
            </div>

            <div className="mt-8 flex items-end gap-3">
              <span className="font-bold text-slate-900">Signature:</span>
              <span
                className="h-6 flex-1 border-b-2 border-slate-900"
                style={{ borderBottom: "2px solid #0f172a" }}
              />
            </div>
          </footer>
        </article>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ARABIC REPORT ARTICLE                              */}
      {/* ========================================================= */}
      {activeLang === "ar" && (
        <article
          dir="rtl"
          className="printable-report-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[18mm] py-[18mm] font-sans text-[11pt] leading-relaxed text-slate-900 shadow-lg print:min-h-0 print:shadow-none"
          style={{ fontFamily: "Arial, Tahoma, Cairo, sans-serif" }}
        >
          {/* Document Title (Editable on screen, solid header on print) */}
          <div className="mb-6 text-center">
            <input
              type="text"
              value={reportAr.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full text-center text-[18pt] font-bold tracking-wide text-slate-900 bg-transparent border-none outline-none focus:bg-sky-50/70 focus:ring-1 focus:ring-sky-500 rounded p-1 transition-all print:hidden"
            />
            <h1 className="hidden print:block text-[18pt] font-bold tracking-wide text-slate-900 text-center">
              {reportAr.title || "تقرير طبي"}
            </h1>
          </div>

          {/* Patient Metadata Grid (RTL) */}
          <section
            className="mb-5 overflow-hidden rounded-sm border border-sky-800"
            style={{ borderColor: "#075985" }}
          >
            <InfoRow
              label="اسم المريض"
              value={reportAr.patientName}
              onChange={(val) => updateField("patientName", val)}
              placeholder=""
              featured
              rtl
            />
            <InfoRow
              label="تاريخ الفحص"
              value={reportAr.examinationDate}
              onChange={(val) => updateField("examinationDate", val)}
              placeholder=""
              rtl
            />
            <InfoRow
              label="تاريخ العملية "
              value={reportAr.procedureDate}
              onChange={(val) => updateField("procedureDate", val)}
              placeholder=""
              rtl
            />
          </section>

          {/* Clinical Summary */}
          <section className="mb-5">
            <h2 className="mb-1 font-bold text-slate-900">الملخص الإكلينيكي:</h2>
            <textarea
              value={reportAr.clinicalSummary}
              onChange={(e) => updateField("clinicalSummary", e.target.value)}
              placeholder=""
              rows={2}
              className="w-full bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded p-1.5 text-slate-900 placeholder:text-slate-400 text-[11pt] leading-relaxed resize-none transition-all print:hidden"
            />
            <div className="hidden print:block text-slate-900 text-[11pt] leading-relaxed p-1 whitespace-pre-wrap">
              {reportAr.clinicalSummary || " "}
            </div>
          </section>

          {/* Refraction Table (LTR) */}
          <section className="mb-5" style={{ direction: "ltr" }}>
            <div className="flex items-center justify-between mb-2" style={{ direction: "rtl" }}>
              <h2 className="font-bold text-slate-900">كارت النظارة:</h2>
              <button
                type="button"
                onClick={addRefractionRow}
                className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 print:hidden cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة صف قياس</span>
              </button>
            </div>

            <table
              className="w-full border-collapse text-center"
              style={{
                borderCollapse: "collapse",
                borderColor: "#075985",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <thead
                className="bg-sky-800 text-white"
                style={{
                  backgroundColor: "#075985",
                  color: "#ffffff",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <tr>
                  <th
                    className="border border-sky-900 p-2 w-36 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                     Eye
                  </th>
                  <th
                    className="border border-sky-900 p-2 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                     S
                  </th>
                  <th
                    className="border border-sky-900 p-2 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    C
                  </th>
                  <th
                    className="border border-sky-900 p-2 text-center"
                    style={{
                      borderColor: "#0c4a6e",
                      backgroundColor: "#075985",
                      color: "#ffffff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    A
                  </th>
                  <th className="border border-sky-900 p-1 w-8 print:hidden"></th>
                </tr>
              </thead>

              <tbody>
                {reportAr.refraction.map((item, index) => {
                  const isEven = index % 2 === 0;
                  const rowBg = isEven ? "#f0f9ff" : "#ffffff";
                  return (
                    <tr
                      key={index}
                      className={isEven ? "bg-sky-50" : "bg-white"}
                      style={{
                        backgroundColor: rowBg,
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      <td
                        className="border border-sky-800 p-1 font-bold text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.eye}
                          onChange={(e) => updateRefraction(index, "eye", e.target.value)}
                          className="w-full text-center bg-transparent border-none outline-none font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-bold">
                          {item.eye || " "}
                        </span>
                      </td>
                      <td
                        className="border border-sky-800 p-1 text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.sphere || ""}
                          onChange={(e) => updateRefraction(index, "sphere", e.target.value)}
                          placeholder="—"
                          dir="ltr"
                          className="w-full text-center bg-transparent border-none outline-none font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-mono">
                          {item.sphere || "—"}
                        </span>
                      </td>
                      <td
                        className="border border-sky-800 p-1 text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.cylinder || ""}
                          onChange={(e) => updateRefraction(index, "cylinder", e.target.value)}
                          placeholder="—"
                          dir="ltr"
                          className="w-full text-center bg-transparent border-none outline-none font-mono font-bold focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-mono font-bold">
                          {item.cylinder || "—"}
                        </span>
                      </td>
                      <td
                        className="border border-sky-800 p-1 text-slate-900"
                        style={{
                          borderColor: "#075985",
                          backgroundColor: rowBg,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      >
                        <input
                          type="text"
                          value={item.axis || ""}
                          onChange={(e) => updateRefraction(index, "axis", e.target.value)}
                          placeholder="—"
                          dir="ltr"
                          className="w-full text-center bg-transparent border-none outline-none font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 rounded p-1 print:hidden"
                        />
                        <span className="hidden print:inline-block font-mono">
                          {item.axis || "—"}
                        </span>
                      </td>
                      <td className="border border-sky-800 p-1 text-center print:hidden">
                        {reportAr.refraction.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRefractionRow(index)}
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                            title="حذف الصف"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Procedure & Follow-Up */}
          <section className="space-y-3 mb-5">
            <div className="flex items-baseline gap-2">
              <strong className="text-slate-900 shrink-0">العمليه:</strong>
              <input
                type="text"
                value={reportAr.procedure}
                onChange={(e) => updateField("procedure", e.target.value)}
                placeholder=""
                className="w-full bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded px-1.5 py-0.5 text-slate-900 placeholder:text-slate-400 text-[11pt] transition-all print:hidden"
              />
              <div className="hidden print:block text-slate-900 text-[11pt]">
                {reportAr.procedure || " "}
              </div>
            </div>

            <div>
              <strong className="text-slate-900 block mb-0.5">المتابعة وخطة العلاج:</strong>
              <textarea
                value={reportAr.followUp}
                onChange={(e) => updateField("followUp", e.target.value)}
                placeholder=""
                rows={2}
                className="w-full bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded p-1.5 text-slate-900 placeholder:text-slate-400 text-[11pt] leading-relaxed resize-none transition-all print:hidden"
              />
              <div className="hidden print:block text-slate-900 text-[11pt] leading-relaxed whitespace-pre-wrap">
                {reportAr.followUp || " "}
              </div>
            </div>
          </section>

          {/* Physician Footer */}
          <footer className="mt-8 pt-4">
            <p className="font-bold text-slate-900 mb-0.5">الطبيب المعالج</p>
            <input
              type="text"
              value={reportAr.physician.name}
              onChange={(e) => updatePhysician("name", e.target.value)}
              className="w-80 bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded px-1 py-0.5 text-slate-900 font-semibold block transition-all text-[11pt] print:hidden"
            />
            <div className="hidden print:block text-slate-900 font-semibold text-[11pt]">
              {reportAr.physician.name}
            </div>

            <input
              type="text"
              value={reportAr.physician.title}
              onChange={(e) => updatePhysician("title", e.target.value)}
              className="w-80 bg-transparent border border-slate-300 dark:border-slate-700 outline-none focus:bg-sky-50/50 focus:ring-1 focus:ring-sky-500 rounded px-1 py-0.5 text-slate-600 block transition-all text-[10pt] print:hidden"
            />
            <div className="hidden print:block text-slate-600 text-[10pt]">
              {reportAr.physician.title}
            </div>

            <div className="mt-8 flex items-end justify-start gap-3" dir="rtl">
              <div className="mr-auto text-left">
                <span className="font-bold text-slate-900">توقيع و ختم الطبيب:</span>
              </div>
            </div>
          </footer>
        </article>
      )}
    </main>
  );
}

function InfoRow({
  label,
  value,
  onChange,
  featured = false,
  rtl = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  featured?: boolean;
  rtl?: boolean;
  placeholder?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[35%_65%] border-b border-sky-800 last:border-b-0 ${
        featured ? "bg-sky-800 text-white" : "bg-sky-50 text-slate-900"
      }`}
      style={{
        backgroundColor: featured ? "#075985" : "#f0f9ff",
        color: featured ? "#ffffff" : "#0f172a",
        borderColor: "#075985",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        className={`${
          rtl ? "border-l" : "border-r"
        } border-sky-800 p-2 font-bold select-none`}
        style={{
          borderColor: "#075985",
          color: featured ? "#ffffff" : "#1e293b",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {label}
      </div>
      <div className="p-1 sm:p-1.5 flex items-center min-w-0">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-sky-400 rounded px-1.5 py-0.5 transition-all text-[11pt] print:hidden ${
            featured
              ? "text-white font-semibold placeholder:text-white/60 focus:bg-sky-900/50"
              : "text-slate-900 placeholder:text-slate-400 focus:bg-white/80"
          }`}
        />
        <div
          className={`hidden print:block w-full px-1.5 py-0.5 text-[11pt] break-words ${
            featured ? "text-white font-bold" : "text-slate-900 font-semibold"
          }`}
          style={{
            color: featured ? "#ffffff" : "#0f172a",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {value || " "}
        </div>
      </div>
    </div>
  );
}
