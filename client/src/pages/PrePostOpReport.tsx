import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Download, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PatientPicker from "@/components/PatientPicker";
import { ClinicalReportFrame } from "@/components/reports/ClinicalReportFrame";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { displaySheetDate } from "@/lib/sheetDates";

type EyeValues = {
  s: string;
  c: string;
  ax: string;
  pd: string;
  add: string;
};

const emptyEye: EyeValues = { s: "", c: "", ax: "", pd: "", add: "" };

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#727780]">
      {children}
    </span>
  );
}

function RefractionTable({
  title,
  od,
  os,
  setOd,
  setOs,
  showReading = true,
}: {
  title: string;
  od: EyeValues;
  os: EyeValues;
  setOd: (value: EyeValues) => void;
  setOs: (value: EyeValues) => void;
  showReading?: boolean;
}) {
  const setValue = (eye: "od" | "os", key: keyof EyeValues, value: string) => {
    if (eye === "od") setOd({ ...od, [key]: value });
    else setOs({ ...os, [key]: value });
  };

  return (
    <section className="report-block overflow-hidden border border-[#c2c7d1] bg-white">
      <table
        className="prepost-refraction-table w-full table-fixed border-collapse text-center text-[11px]"
        dir="ltr"
      >
        <thead>
          <tr className="bg-[#e8eff1] font-bold uppercase text-[#00355f]">
            <th className="w-[18%] px-2 py-1.5">{title}</th>
            <th colSpan={3} className="px-2 py-1.5">
              OD
            </th>
            <th colSpan={3} className="px-2 py-1.5">
              OS
            </th>
            <th className="w-[12%] px-2 py-1.5" />
          </tr>
          <tr className="bg-[#f4fafd] text-[9px] font-bold uppercase text-[#42474f]">
            <th className="px-1.5 py-1">Distance</th>
            <th className="px-1.5 py-1">S</th>
            <th className="px-1.5 py-1">C</th>
            <th className="px-1.5 py-1">A</th>
            <th className="px-1.5 py-1">S</th>
            <th className="px-1.5 py-1">C</th>
            <th className="px-1.5 py-1">A</th>
            <th className="px-1.5 py-1">IPD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-1.5 py-1">&nbsp;</td>
            {(["s", "c", "ax"] as const).map((key) => (
              <td key={`od-${key}`} className="p-0">
                <input
                  value={od[key]}
                  onChange={(event) => setValue("od", key, event.target.value)}
                  className="h-7 w-full border-0 bg-transparent px-1 text-center font-semibold outline-none focus:bg-[#d2e4ff]/40"
                />
              </td>
            ))}
            {(["s", "c", "ax"] as const).map((key) => (
              <td key={`os-${key}`} className="p-0">
                <input
                  value={os[key]}
                  onChange={(event) => setValue("os", key, event.target.value)}
                  className="h-7 w-full border-0 bg-transparent px-1 text-center font-semibold outline-none focus:bg-[#d2e4ff]/40"
                />
              </td>
            ))}
            <td className="p-0">
              <input
                value={od.pd || os.pd}
                onChange={(event) => {
                  setOd({ ...od, pd: event.target.value });
                  setOs({ ...os, pd: event.target.value });
                }}
                className="h-7 w-full border-0 bg-transparent px-1 text-center font-semibold outline-none focus:bg-[#d2e4ff]/40"
              />
            </td>
          </tr>
          {showReading ? (
            <tr>
              <td className="px-2 py-1.5 font-bold text-[#00355f]">Reading</td>
              <td colSpan={7} className="px-4 py-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="whitespace-nowrap font-bold">Add +</span>
                  <input
                    value={od.add || os.add}
                    onChange={(event) => {
                      setOd({ ...od, add: event.target.value });
                      setOs({ ...os, add: event.target.value });
                    }}
                    className="h-6 w-24 border-0 bg-transparent text-center font-semibold outline-none focus:bg-[#d2e4ff]/40"
                  />
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function VaSummary({
  metrics,
}: {
  metrics: Array<{
    title: string;
    od: string;
    os: string;
    setOd: (value: string) => void;
    setOs: (value: string) => void;
  }>;
}) {
  return (
    <div className="ml-auto flex items-center justify-center gap-6 text-center text-[11px] font-bold uppercase tracking-wide">
      {metrics.map((metric) => (
        <span key={metric.title} className="flex items-center gap-1">
          {metric.title}
          <input
            value={metric.od}
            onChange={(event) => metric.setOd(event.target.value)}
            className="h-6 w-14 border-0 bg-transparent text-center font-bold outline-none focus:bg-[#d2e4ff]/40"
          />
          /
          <input
            value={metric.os}
            onChange={(event) => metric.setOs(event.target.value)}
            className="h-6 w-14 border-0 bg-transparent text-center font-bold outline-none focus:bg-[#d2e4ff]/40"
          />
        </span>
      ))}
    </div>
  );
}

export default function PrePostOpReport() {
  const { isAuthenticated } = useAuth();
  const [, params] = useRoute("/pre-post-op-report/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const requestedVisitDate =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("visitDate") || ""
      : "";
  const [patientId, setPatientId] = useState<number | undefined>(
    initialPatientId,
  );

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });
  const surgeriesQuery = trpc.medical.getSurgeriesByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const glassesQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const patient = patientQuery.data as any;
  const surgeries = (surgeriesQuery.data as any[] | undefined) ?? [];
  const glassesRecords = (glassesQuery.data as any[] | undefined) ?? [];
  const autorefRecords = (autorefQuery.data as any[] | undefined) ?? [];
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [selectedSurgeryId, setSelectedSurgeryId] = useState<
    number | undefined
  >();
  const [operationDate, setOperationDate] = useState("");
  const [procedure, setProcedure] = useState("");
  const [preOd, setPreOd] = useState<EyeValues>(emptyEye);
  const [preOs, setPreOs] = useState<EyeValues>(emptyEye);
  const [residualOd, setResidualOd] = useState<EyeValues>(emptyEye);
  const [residualOs, setResidualOs] = useState<EyeValues>(emptyEye);
  const [ucvaOd, setUcvaOd] = useState("");
  const [ucvaOs, setUcvaOs] = useState("");
  const [bcvaOd, setBcvaOd] = useState("");
  const [bcvaOs, setBcvaOs] = useState("");
  const [postVaOd, setPostVaOd] = useState("");
  const [postVaOs, setPostVaOs] = useState("");
  const [notes, setNotes] = useState("");
  const [surgeon, setSurgeon] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientCode, setPatientCode] = useState("");

  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId);
  }, [initialPatientId]);

  useEffect(() => {
    if (!patient) return;
    setPatientName(patient.fullName || "");
    setPatientDob(
      patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "",
    );
    setPatientCode(patient.patientCode || "");
  }, [patient]);

  useEffect(() => {
    if (!selectedSurgeryId && surgeries.length > 0) {
      const matchingSurgery = requestedVisitDate
        ? surgeries.find(
            (surgery) =>
              String(surgery.surgeryDate ?? "").split("T")[0] ===
              requestedVisitDate,
          )
        : undefined;
      setSelectedSurgeryId(Number((matchingSurgery ?? surgeries[0]).id));
    }
  }, [surgeries, selectedSurgeryId, requestedVisitDate]);

  const selectedSurgery = surgeries.find(
    (s) => Number(s.id) === selectedSurgeryId,
  );

  useEffect(() => {
    if (!selectedSurgery) return;
    setOperationDate(String(selectedSurgery.surgeryDate).split("T")[0]);
    setProcedure(selectedSurgery.surgeryType || "");
    setSurgeon(selectedSurgery.surgeon || "");
    setNotes(selectedSurgery.notes || "");
    if (selectedSurgery.patientNameOverride)
      setPatientName(selectedSurgery.patientNameOverride);
    if (selectedSurgery.patientDobOverride)
      setPatientDob(String(selectedSurgery.patientDobOverride).split("T")[0]);
    if (selectedSurgery.patientCodeOverride)
      setPatientCode(selectedSurgery.patientCodeOverride);
  }, [selectedSurgery]);

  useEffect(() => {
    if (glassesRecords.length === 0) return;
    const orderedRecords = [...glassesRecords].sort(
      (left, right) => Number(left.id) - Number(right.id),
    );
    const preRecord = orderedRecords[0];
    const postRecord = orderedRecords[orderedRecords.length - 1];
    const preAutoref = autorefRecords.find(
      (record) =>
        Number(record.examinationId) === Number(preRecord?.examinationId),
    );
    const postAutoref = autorefRecords.find(
      (record) =>
        Number(record.examinationId) === Number(postRecord?.examinationId),
    );

    if (preRecord) {
      setPreOd({
        s: preRecord.sOD || "",
        c: preRecord.cOD || "",
        ax: preRecord.axisOD || "",
        pd: preRecord.pdOD || "",
        add: preRecord.addOD || "",
      });
      setPreOs({
        s: preRecord.sOS || "",
        c: preRecord.cOS || "",
        ax: preRecord.axisOS || "",
        pd: preRecord.pdOS || "",
        add: preRecord.addOS || "",
      });
      setUcvaOd(preAutoref?.ucvaOD || "");
      setUcvaOs(preAutoref?.ucvaOS || "");
      setBcvaOd(preRecord.bcvaOD || preAutoref?.bcvaOD || "");
      setBcvaOs(preRecord.bcvaOS || preAutoref?.bcvaOS || "");
    }
    if (postRecord) {
      setResidualOd({
        s: postRecord.sOD || "",
        c: postRecord.cOD || "",
        ax: postRecord.axisOD || "",
        pd: postRecord.pdOD || "",
        add: postRecord.addOD || "",
      });
      setResidualOs({
        s: postRecord.sOS || "",
        c: postRecord.cOS || "",
        ax: postRecord.axisOS || "",
        pd: postRecord.pdOS || "",
        add: postRecord.addOS || "",
      });
      setPostVaOd(
        postAutoref?.bcvaOD || postAutoref?.ucvaOD || postRecord.bcvaOD || "",
      );
      setPostVaOs(
        postAutoref?.bcvaOS || postAutoref?.ucvaOS || postRecord.bcvaOS || "",
      );
    }
  }, [autorefRecords, glassesRecords]);

  const createSurgeryMutation = trpc.medical.createSurgery.useMutation();
  const updateSurgeryMutation = trpc.medical.updateSurgery.useMutation();

  const handleSave = async () => {
    if (!patientId) {
      toast.error("اختر مريضاً أولاً");
      return;
    }
    if (!operationDate || !procedure) {
      toast.error("أدخل تاريخ العملية ونوعها");
      return;
    }
    try {
      if (selectedSurgeryId) {
        await updateSurgeryMutation.mutateAsync({
          surgeryId: selectedSurgeryId,
          surgeryType: procedure,
          surgeryDate: operationDate,
          surgeon,
          notes,
          patientNameOverride: patientName || undefined,
          patientDobOverride: patientDob || undefined,
          patientCodeOverride: patientCode || undefined,
        });
      } else {
        await createSurgeryMutation.mutateAsync({
          patientId,
          surgeryType: procedure,
          surgeryDate: operationDate,
          surgeon,
          notes,
          patientNameOverride: patientName || undefined,
          patientDobOverride: patientDob || undefined,
          patientCodeOverride: patientCode || undefined,
        });
      }
      toast.success("تم حفظ بيانات العملية");
      await surgeriesQuery.refetch();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="prepost-report-root medical-report-brand min-h-screen bg-[#eef5f7] text-[#161d1f]">
      <style>{`
        .prepost-paper {
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
        }
        .report-block {
          border-radius: 4px;
        }
        .prepost-refraction-table th,
        .prepost-refraction-table td {
          border: 1px solid #c2c7d1;
          text-align: center;
          vertical-align: middle;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .prepost-report-root {
            min-height: 0 !important;
            background: white !important;
          }
          .prepost-print-shell {
            box-sizing: border-box;
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .prepost-paper {
            box-sizing: border-box !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 10mm !important;
            justify-content: center !important;
            gap: 4mm !important;
          }
          .report-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          input, textarea, select {
            -webkit-appearance: none !important;
            appearance: none !important;
            box-shadow: none !important;
            outline: none !important;
            font: inherit !important;
            color: inherit !important;
          }
          table input {
            border: 0 !important;
            background: transparent !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <header className="no-print sticky top-0 z-50 border-b border-[#c2c7d1] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-lg font-extrabold text-[#00355f]">
              Pre & Post Op Report
            </h1>
            <p className="text-xs font-semibold text-[#727780]">
              تقرير ما قبل وبعد العملية
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-72">
              <PatientPicker
                initialPatientId={patientId}
                onSelect={(selected) => {
                  if (selected?.id) setPatientId(Number(selected.id));
                }}
              />
            </div>
            {surgeries.length > 0 ? (
              <select
                className="h-9 rounded border border-[#c2c7d1] bg-white px-2 text-xs"
                value={selectedSurgeryId ?? ""}
                onChange={(e) => setSelectedSurgeryId(Number(e.target.value))}
              >
                {surgeries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {displaySheetDate(String(s.surgeryDate).split("T")[0])} —{" "}
                    {s.surgeryType}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="border-[#00355f] text-[#00355f]"
              onClick={handleSave}
              disabled={
                createSurgeryMutation.isPending ||
                updateSurgeryMutation.isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />
              {createSurgeryMutation.isPending ||
              updateSurgeryMutation.isPending
                ? "جارٍ الحفظ..."
                : "Save"}
            </Button>
            <Button
              type="button"
              className="bg-[#00355f] text-white"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#c2c7d1]"
              onClick={() => window.print()}
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="prepost-print-shell flex justify-center p-8">
        <ClinicalReportFrame
          title="Pre & Post Op Report | تقرير ما قبل وبعد العملية"
          generatedDate={today}
          patient={{
            name: patientName,
            code: patientCode,
            age: patient?.age,
            birthDate: patientDob,
            phone: patient?.phone,
            occupation: patient?.occupation,
          }}
          signatureLabel="Doctor Signature & Stamp / توقيع وختم الطبيب"
        >
          <div className="flex flex-col gap-6">
            <section className="hidden">
              <div className="col-span-6 min-w-0">
                <FieldLabel>اسم المريض</FieldLabel>
                <Input
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                  className="mt-1 h-8 border-transparent bg-transparent text-center text-base font-bold shadow-none hover:border-[#c2c7d1] focus:border-[#00355f]"
                />
              </div>
              <label className="col-span-3 min-w-0">
                <FieldLabel>تاريخ الميلاد</FieldLabel>
                <DateInput
                  value={patientDob}
                  onChange={(event) => setPatientDob(event.target.value)}
                  className="mt-1 h-8 w-full min-w-0 border-transparent bg-transparent font-mono text-sm font-semibold shadow-none [&_input]:min-w-0 [&_input]:w-full"
                />
              </label>
              <label className="col-span-3 min-w-0">
                <FieldLabel>الكود</FieldLabel>
                <Input
                  value={patientCode}
                  onChange={(event) => setPatientCode(event.target.value)}
                  className="mt-1 h-8 border-transparent bg-transparent text-center font-mono text-sm font-semibold shadow-none hover:border-[#c2c7d1] focus:border-[#00355f]"
                />
              </label>
              <label className="col-span-3 min-w-0">
                <FieldLabel>تاريخ العملية</FieldLabel>
                <DateInput
                  value={operationDate}
                  onChange={(event) => setOperationDate(event.target.value)}
                  className="mt-1 h-8 w-full min-w-0 border-transparent bg-transparent shadow-none [&_input]:min-w-0 [&_input]:w-full"
                />
              </label>
              <div className="col-span-3 min-w-0">
                <FieldLabel>تاريخ التقرير</FieldLabel>
                <p className="mt-2 font-mono text-sm font-semibold">
                  {displaySheetDate(today)}
                </p>
              </div>
              <label className="col-span-6 min-w-0">
                <FieldLabel>العملية</FieldLabel>
                <Input
                  value={procedure}
                  onChange={(event) => setProcedure(event.target.value)}
                  className="mt-1 h-8 border-transparent bg-transparent text-center font-semibold shadow-none hover:border-[#c2c7d1] focus:border-[#00355f]"
                  placeholder="PRK / LASIK / Femto LASIK"
                />
              </label>
            </section>

            <section className="space-y-3">
              <div
                className="flex items-center gap-2 border-b border-[#c2c7d1] pb-1"
                dir="ltr"
              >
                <span className="h-2 w-2 rounded-full bg-[#00355f]" />
                <h3 className="text-lg font-bold text-[#00355f]">
                  Pre-Operative Metrics
                </h3>
                <VaSummary
                  metrics={[
                    {
                      title: "UCVA",
                      od: ucvaOd,
                      os: ucvaOs,
                      setOd: setUcvaOd,
                      setOs: setUcvaOs,
                    },
                    {
                      title: "BCVA",
                      od: bcvaOd,
                      os: bcvaOs,
                      setOd: setBcvaOd,
                      setOs: setBcvaOs,
                    },
                  ]}
                />
              </div>
              <RefractionTable
                title="Refraction"
                od={preOd}
                os={preOs}
                setOd={setPreOd}
                setOs={setPreOs}
              />
            </section>

            <section className="border border-[#0f4c81] bg-[#d2e4ff] p-4">
              <FieldLabel>Planned Treatment</FieldLabel>
              <Input
                value={procedure}
                onChange={(event) => setProcedure(event.target.value)}
                className="mt-1 h-10 border-transparent bg-transparent px-0 text-xl font-extrabold text-[#00355f] shadow-none hover:border-[#0f4c81]/40 focus-visible:border-[#0f4c81] focus-visible:ring-0 print:border-0 print:px-0"
                placeholder="Planned treatment"
              />
            </section>

            <section className="space-y-3">
              <div
                className="flex items-center gap-2 border-b border-[#c2c7d1] pb-1"
                dir="ltr"
              >
                <span className="h-2 w-2 rounded-full bg-[#00355f]" />
                <h3 className="text-lg font-bold text-[#00355f]">
                  Post-Operative Results
                </h3>
                <VaSummary
                  metrics={[
                    {
                      title: "VA Post-Op",
                      od: postVaOd,
                      os: postVaOs,
                      setOd: setPostVaOd,
                      setOs: setPostVaOs,
                    },
                  ]}
                />
              </div>
              <RefractionTable
                title="Refraction"
                od={residualOd}
                os={residualOs}
                setOd={setResidualOd}
                setOs={setResidualOs}
                showReading={false}
              />
            </section>

            <section className="grid grid-cols-[1fr_72mm] gap-8 border-t border-[#c2c7d1] pt-5">
              <label>
                <FieldLabel>Clinical Notes</FieldLabel>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-2 min-h-[96px] resize-none border-dashed border-[#c2c7d1] bg-[#f4fafd]"
                  placeholder="Procedure notes, complications, attachments, and follow-up instructions."
                />
              </label>
              <div className="flex flex-col justify-end gap-4">
                <label>
                  <FieldLabel>Consultant Surgeon</FieldLabel>
                  <Input
                    value={surgeon}
                    onChange={(event) => setSurgeon(event.target.value)}
                    className="mt-2 border-[#c2c7d1]"
                  />
                </label>
              </div>
            </section>
          </div>
        </ClinicalReportFrame>
      </div>
    </div>
  );
}
