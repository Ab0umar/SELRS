import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Info, Eye, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_SHEET_DESIGNER_CONFIG,
  loadSheetDesignerConfig,
} from "@/lib/sheetDesigner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";

export default function ConsultantFollowupPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/sheets/consultant/:kfPatientId/followup");
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
  const initialPatientId = (() => {
    const parsed = params?.kfPatientId ? Number(params.kfPatientId) : undefined;
    return parsed;
  })();

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

  const patientQuery = trpc.kf.getPatient.useQuery({ kfId: initialPatientId ?? 0 }, {
    enabled: Boolean(initialPatientId),
    refetchOnWindowFocus: false,
  });
  const examinationStateQuery = trpc.kf.listExaminations.useQuery(
    { kfPatientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const followupVisitsQuery = trpc.kf.listFollowups.useQuery(
    { kfPatientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    setDesignerConfig(loadSheetDesignerConfig());
  }, []);


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
      const rawDate = visit.followupDate ?? visit.visitDate;
      const visitDate = !rawDate
        ? ""
        : typeof rawDate === "string"
          ? rawDate.split("T")[0]
          : rawDate instanceof Date
            ? rawDate.toISOString().split("T")[0]
            : (() => { const d = new Date(rawDate); return isNaN(d.valueOf()) ? "" : d.toISOString().split("T")[0]; })();
      return {
        id: visit.kfFollowupId ?? visit.id,
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
      setPatientDOB(`${month}/${day}/${year}`);
    }
  }, [patientQuery.data]);

  useEffect(() => {
    const doctorFromState = String(
      (examinationStateQuery.data as any)?.[0]?.doctorName ?? "",
    ).trim();
    const fullName = String(user?.name ?? "").trim();
    setSignatures({ doctor: doctorFromState || fullName || "" });
  }, [examinationStateQuery.data, user?.name]);

  const saveFollowupSheetMutation = trpc.kf.createFollowup.useMutation();

  const handleSaveFollowup = async () => {
    if (!initialPatientId) return;

    // Collect filled followups in groups of 4
    const filledFollowups = followups.filter((f) => f.date);
    if (filledFollowups.length === 0) {
      alert("لا توجد بيانات لحفظها");
      return;
    }

    try {
      for (const f of filledFollowups) {
        await saveFollowupSheetMutation.mutateAsync({
          kfPatientId: initialPatientId,
          followupDate: f.date,
          notes: f.type,
        });
      }
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

  const followupTitles = [
    "1st Follow-up (Day 1)",
    "2nd Follow-up (1 Week)",
    "3rd Follow-up (1 Month)",
    "Later Follow-up",
  ];

  const BRAND = "#003D9B";

  return (
    <div className="min-h-screen bg-gray-50 sheet-layout">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          .followup-print-root,
          .sheet-layout,
          .sheet-layout main,
          .sheet-layout * {
            background: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
          }
          .followup-print-root {
            transform: translateX(${followupLabels.offsetXmm}mm) scale(0.9);
            transform-origin: top center;
            margin-top: ${followupLabels.offsetYmm}mm;
            width: 100% !important;
            max-width: 100% !important;
          }
          html, body, #root {
            overflow: hidden !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .sheet-layout, .sheet-layout main, .sheet-layout * {
            overflow: hidden !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .sheet-layout::-webkit-scrollbar, .sheet-layout *::-webkit-scrollbar {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP NAVBAR */}
      <nav className="sticky top-0 z-10 bg-gray-900 text-white print:hidden flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold text-white text-sm">Ophthalmic Clinic Management</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400 cursor-pointer hover:text-white">Dashboard</span>
            <span className="text-blue-400 underline cursor-pointer">Patient Records</span>
            <span className="text-gray-400 cursor-pointer hover:text-white">Diagnostics</span>
            <span className="text-gray-400 cursor-pointer hover:text-white">Appointments</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveFollowup}
            disabled={saveFollowupSheetMutation.isPending}
            className="bg-gray-700 text-white text-sm font-semibold px-4 py-1.5 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {saveFollowupSheetMutation.isPending ? "Saving..." : "SAVE SHEET"}
          </button>
          <button
            type="button"
            onClick={() =>
              void printOrExportPdf(
                `consultant-followup-${initialPatientId ?? "sheet"}.pdf`,
              )
            }
            className="border border-white text-white text-sm font-semibold px-4 py-1.5 rounded hover:bg-gray-800"
          >
            PRINT PDF
          </button>
        </div>
      </nav>

      {/* PRINT ROOT */}
      <div
        className="followup-print-root bg-white"
        dir="ltr"
        style={{
          fontFamily: '"Times New Roman", Tahoma, Arial, sans-serif',
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* OPERATION HEADER */}
        <div className="bg-white border-b px-6 py-4 flex items-center gap-6 flex-wrap">
          {/* 1. OPERATION DATE */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
              Operation Date
            </span>
            <DateInput
              value={operationDateLeft}
              onChange={(e) => setOperationDateLeft(e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>

          {/* 2. OPERATION TYPE */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
              Operation Type
            </span>
            <Input
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              placeholder="LASIK / Refractive Surgery"
              className="font-bold text-lg border-0 shadow-none p-0 h-auto focus-visible:ring-0"
              style={{ color: "#003D9B" }}
            />
          </div>

          {/* 3. Eye toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setOperationEyes((prev) => ({ ...prev, right: !prev.right }))
              }
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border transition-colors"
              style={
                operationEyes.right
                  ? {
                      backgroundColor: "#1B2B6B",
                      color: "#fff",
                      borderColor: "#1B2B6B",
                    }
                  : {
                      borderColor: "#d1d5db",
                      color: "#6b7280",
                      backgroundColor: "#fff",
                    }
              }
            >
              {operationEyes.right && <Check className="h-3 w-3" />}
              RIGHT EYE (OD)
            </button>
            <button
              type="button"
              onClick={() =>
                setOperationEyes((prev) => ({ ...prev, left: !prev.left }))
              }
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border transition-colors"
              style={
                operationEyes.left
                  ? {
                      backgroundColor: "#1B2B6B",
                      color: "#fff",
                      borderColor: "#1B2B6B",
                    }
                  : {
                      borderColor: "#d1d5db",
                      color: "#6b7280",
                      backgroundColor: "#fff",
                    }
              }
            >
              LEFT EYE (OS)
            </button>
          </div>

          {/* 4. POST-OP badge */}
          <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-sm">
            POST-OP DAY 1
          </span>

          {/* 5. Legend */}
          <div className="flex flex-col text-[10px] text-gray-500 ml-auto">
            <span>V.A: Visual Acuity</span>
            <span>IOP: Intraocular Pressure</span>
          </div>
        </div>

        {/* TITLE */}
        <div className="px-6 py-3">
          <h1 className="text-xl font-bold text-gray-900">
            Post-Op Follow-up /{" "}
            <span dir="rtl">متابعة ما بعد العمليات</span>
          </h1>
        </div>

        {/* 4 FOLLOW-UP SECTION CARDS */}
        {followups.slice(0, 4).map((followup, index) => {
          const hasDate = Boolean(followup.date);
          const showTable = index < 3 || hasDate;
          return (
            <div
              key={followup.id}
              className="mx-6 mb-4 border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Card header */}
              <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#1B2B6B] text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {followupTitles[index]}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold">DATE:</span>
                  <DateInput
                    value={followup.date}
                    onChange={(e) =>
                      setFollowups((prev) =>
                        prev.map((x) =>
                          x.id === followup.id
                            ? { ...x, date: e.target.value }
                            : x,
                        ),
                      )
                    }
                    className="h-7 w-32 text-sm"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              </div>

              {/* Card body */}
              {!showTable ? (
                <div className="py-8 text-center text-gray-400">
                  <p className="mb-3 text-sm">No data recorded for this visit.</p>
                  <button
                    type="button"
                    onClick={() =>
                      setFollowups((prev) =>
                        prev.map((x, i) =>
                          i === 3
                            ? {
                                ...x,
                                date: new Date().toISOString().split("T")[0],
                              }
                            : x,
                        ),
                      )
                    }
                    className="flex items-center gap-1 mx-auto text-[#003D9B] text-sm font-semibold border border-[#003D9B] rounded px-3 py-1 hover:bg-blue-50"
                  >
                    <span>+</span> Initialize Visit Row
                  </button>
                </div>
              ) : (
                <>
                  {/* Data table */}
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 font-semibold text-[11px] uppercase">
                        <th className="px-3 py-2 text-left border-b border-gray-200">
                          EYE
                        </th>
                        <th className="px-3 py-2 text-center border-b border-gray-200">
                          V.A (UCVA/BCVA)
                        </th>
                        <th
                          className="px-3 py-2 text-center border-b border-gray-200"
                          colSpan={3}
                        >
                          REFRACTION (S / C / A)
                        </th>
                        <th className="px-3 py-2 text-center border-b border-gray-200">
                          FLAP STATUS (EDGES/BED)
                        </th>
                        <th className="px-3 py-2 text-center border-b border-gray-200">
                          IOP (MMHG)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationEyes.right && (
                        <tr className="border-b border-gray-100">
                          <td className="px-3 py-2">
                            <span className="font-bold text-[#003D9B]">OD</span>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <Input
                              className="h-6 text-[11px] w-20 text-center border-gray-300"
                              placeholder="6/6"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="S"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="C"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="A"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              className="h-6 text-[11px] w-28 border-gray-300"
                              placeholder="Clear / Apposed"
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="14"
                            />
                          </td>
                        </tr>
                      )}
                      {operationEyes.left && (
                        <tr>
                          <td className="px-3 py-2">
                            <span className="text-gray-600">OS</span>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <Input
                              className="h-6 text-[11px] w-20 text-center border-gray-300"
                              placeholder="6/6"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="S"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="C"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="A"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              className="h-6 text-[11px] w-28 border-gray-300"
                              placeholder="Clear / Apposed"
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <Input
                              className="h-6 text-[11px] w-14 text-center border-gray-300"
                              placeholder="14"
                            />
                          </td>
                        </tr>
                      )}
                      {!operationEyes.right && !operationEyes.left && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-3 text-center text-gray-400 text-xs"
                          >
                            Select eye above to record data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* TREATMENT PLAN & MEDICATION */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">
                      TREATMENT PLAN &amp; MEDICATION
                    </p>
                    <div className="flex gap-4">
                      <div className="flex-[3]">
                        <Textarea
                          rows={2}
                          placeholder="Vigamox q2h, Pred Forte q2h..."
                          className="text-sm w-full border-gray-200"
                        />
                      </div>
                      <div className="flex-[2] grid grid-cols-3 gap-2">
                        {(["Receptionist", "Nurse", "Doctor"] as const).map(
                          (role) => (
                            <div
                              key={role}
                              className="flex flex-col items-center gap-1"
                            >
                              <div className="flex flex-col items-center w-full">
                                {role === "Doctor" && signatures.doctor && (
                                  <>
                                    <span className="text-[9px] text-gray-400">
                                      E-Signed (AM)
                                    </span>
                                    <span className="text-xs font-semibold text-blue-600">
                                      {signatures.doctor}
                                    </span>
                                  </>
                                )}
                                <div className="w-full border-b border-gray-400 h-5" />
                              </div>
                              <span className="text-[10px] text-gray-500">
                                {role}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* FOOTER CARDS */}
        <div className="mx-6 mb-6 grid grid-cols-3 gap-4">
          {/* Pentacam Status */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">
              PENTACAM STATUS
            </p>
            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center mb-2">
              <Eye className="h-4 w-4 text-gray-500" />
            </div>
            <p className="font-semibold text-sm text-gray-800">Map Available</p>
            <p className="text-[#003D9B] text-sm underline cursor-pointer">
              View Scans
            </p>
          </div>

          {/* Critical Warnings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">
              CRITICAL WARNINGS
            </p>
            <AlertTriangle className="h-5 w-5 text-red-500 mb-2" />
            <p className="font-semibold text-sm text-gray-800">None Detected</p>
            <p className="text-gray-500 text-sm">System Auto-Scan OK</p>
          </div>

          {/* Surgical Complication */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">
              SURGICAL COMPLICATION
            </p>
            <Info className="h-5 w-5 text-blue-500 mb-2" />
            <p className="font-semibold text-sm text-gray-800">Remark Clear</p>
            <p className="text-gray-500 text-sm">Routine Procedure</p>
          </div>
        </div>

        {/* PAGE FOOTER */}
        <div className="mx-6 mb-4 flex justify-between text-[10px] text-gray-400">
          <span>
            REF: OP-FUP-V2.1-2023 | PAGE 1 OF 1 | OPHTHALMIC MANAGEMENT SYSTEM
            (SECURE LINK)
          </span>
        </div>
      </div>
    </div>
  );
}
