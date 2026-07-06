import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Download, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PatientPicker from "@/components/PatientPicker";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { displaySheetDate } from "@/lib/sheetDates";

type EyeValues = {
  s: string;
  c: string;
  ax: string;
};

const emptyEye: EyeValues = { s: "", c: "", ax: "" };

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
}: {
  title: string;
  od: EyeValues;
  os: EyeValues;
  setOd: (value: EyeValues) => void;
  setOs: (value: EyeValues) => void;
}) {
  const setValue = (eye: "od" | "os", key: keyof EyeValues, value: string) => {
    if (eye === "od") setOd({ ...od, [key]: value });
    else setOs({ ...os, [key]: value });
  };

  return (
    <section className="report-block overflow-hidden border border-[#c2c7d1] bg-white">
      <div className="bg-[#e8eff1] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#00355f]">
        {title}
      </div>
      <table className="w-full border-collapse text-center" dir="ltr">
        <thead>
          <tr className="bg-[#f4fafd] text-[9px] font-bold uppercase text-[#42474f]">
            <th className="w-[18%] border-r border-t border-[#c2c7d1] px-1.5 py-1">
              Eye
            </th>
            <th className="border-r border-t border-[#c2c7d1] px-1.5 py-1">S</th>
            <th className="border-r border-t border-[#c2c7d1] px-1.5 py-1">C</th>
            <th className="border-t border-[#c2c7d1] px-1.5 py-1">Ax</th>
          </tr>
        </thead>
        <tbody>
          {(["od", "os"] as const).map((eye) => {
            const values = eye === "od" ? od : os;
            return (
              <tr key={eye}>
                <td className="border-r border-t border-[#c2c7d1] bg-[#eef5f7] px-1.5 py-1 text-[11px] font-bold text-[#00355f]">
                  {eye.toUpperCase()}
                </td>
                {(["s", "c", "ax"] as const).map((key) => (
                  <td
                    key={key}
                    className="border-r border-t border-[#c2c7d1] p-0 last:border-r-0"
                  >
                    <input
                      value={values[key]}
                      onChange={(event) =>
                        setValue(eye, key, event.target.value)
                      }
                      className="h-6 w-full border-0 bg-transparent px-1.5 text-center text-[11px] font-semibold outline-none focus:bg-[#d2e4ff]/40"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function VaBox({
  title,
  od,
  os,
  setOd,
  setOs,
}: {
  title: string;
  od: string;
  os: string;
  setOd: (value: string) => void;
  setOs: (value: string) => void;
}) {
  return (
    <section className="report-block overflow-hidden border border-[#c2c7d1] bg-white">
      <div className="bg-[#e8eff1] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#00355f]">
        {title}
      </div>
      <div className="grid grid-cols-2">
        <label className="border-r border-t border-[#c2c7d1] p-1.5 text-center">
          <FieldLabel>OD</FieldLabel>
          <Input
            value={od}
            onChange={(event) => setOd(event.target.value)}
            className="mt-1 h-7 border-[#c2c7d1] text-center text-sm font-bold"
          />
        </label>
        <label className="border-t border-[#c2c7d1] p-1.5 text-center">
          <FieldLabel>OS</FieldLabel>
          <Input
            value={os}
            onChange={(event) => setOs(event.target.value)}
            className="mt-1 h-7 border-[#c2c7d1] text-center text-sm font-bold"
          />
        </label>
      </div>
    </section>
  );
}

export default function PrePostOpReport() {
  const { isAuthenticated } = useAuth();
  const [, params] = useRoute("/pre-post-op-report/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
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

  const patient = patientQuery.data as any;
  const surgeries = (surgeriesQuery.data as any[] | undefined) ?? [];
  const glassesRecords = (glassesQuery.data as any[] | undefined) ?? [];
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [selectedSurgeryId, setSelectedSurgeryId] = useState<number | undefined>();
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

  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId);
  }, [initialPatientId]);

  useEffect(() => {
    if (!selectedSurgeryId && surgeries.length > 0) {
      setSelectedSurgeryId(Number(surgeries[0].id));
    }
  }, [surgeries, selectedSurgeryId]);

  const selectedSurgery = surgeries.find(
    (s) => Number(s.id) === selectedSurgeryId,
  );

  useEffect(() => {
    if (!selectedSurgery) return;
    setOperationDate(String(selectedSurgery.surgeryDate).split("T")[0]);
    setProcedure(selectedSurgery.surgeryType || "");
    setSurgeon(selectedSurgery.surgeon || "");
    setNotes(selectedSurgery.notes || "");
  }, [selectedSurgery]);

  useEffect(() => {
    if (!operationDate || glassesRecords.length === 0) return;
    const opTime = new Date(operationDate).getTime();
    const withDates = glassesRecords
      .filter((r) => r.visitDate)
      .map((r) => ({ ...r, _time: new Date(r.visitDate).getTime() }));

    const preRecord = withDates
      .filter((r) => r._time <= opTime)
      .sort((a, b) => b._time - a._time)[0];
    const postRecord = withDates
      .filter((r) => r._time > opTime)
      .sort((a, b) => a._time - b._time)[0];

    if (preRecord) {
      setPreOd({ s: preRecord.sOD || "", c: preRecord.cOD || "", ax: preRecord.axisOD || "" });
      setPreOs({ s: preRecord.sOS || "", c: preRecord.cOS || "", ax: preRecord.axisOS || "" });
      setBcvaOd(preRecord.bcvaOD || "");
      setBcvaOs(preRecord.bcvaOS || "");
    }
    if (postRecord) {
      setResidualOd({ s: postRecord.sOD || "", c: postRecord.cOD || "", ax: postRecord.axisOD || "" });
      setResidualOs({ s: postRecord.sOS || "", c: postRecord.cOS || "", ax: postRecord.axisOS || "" });
      setPostVaOd(postRecord.bcvaOD || "");
      setPostVaOs(postRecord.bcvaOS || "");
    }
  }, [operationDate, glassesRecords]);

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
        });
      } else {
        await createSurgeryMutation.mutateAsync({
          patientId,
          surgeryType: procedure,
          surgeryDate: operationDate,
          surgeon,
          notes,
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
    <div className="prepost-report-root min-h-screen bg-[#eef5f7] text-[#161d1f]">
      <style>{`
        .prepost-paper {
          width: 210mm;
          min-height: 297mm;
        }
        .report-block {
          border-radius: 4px;
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
            padding: 0 !important;
          }
          .prepost-paper {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 10mm !important;
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
                    {displaySheetDate(String(s.surgeryDate).split("T")[0])} — {s.surgeryType}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="border-[#00355f] text-[#00355f]"
              onClick={handleSave}
              disabled={createSurgeryMutation.isPending || updateSurgeryMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createSurgeryMutation.isPending || updateSurgeryMutation.isPending ? "جارٍ الحفظ..." : "Save"}
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

      <main className="prepost-print-shell flex justify-center p-8">
        <div className="prepost-paper flex flex-col gap-6 border border-[#c2c7d1] bg-white p-10 shadow-sm">
          <section className="grid grid-cols-4 gap-4 bg-[#eef5f7] p-4">
            <div className="col-span-2">
              <FieldLabel>Patient Name</FieldLabel>
              <p className="mt-1 text-lg font-bold">
                {patient?.fullName || "—"}
              </p>
            </div>
            <div>
              <FieldLabel>Date of Birth</FieldLabel>
              <p className="mt-1 font-mono text-sm font-semibold">
                {displaySheetDate(patient?.dateOfBirth || "") || "—"}
              </p>
            </div>
            <div>
              <FieldLabel>Patient ID</FieldLabel>
              <p className="mt-1 font-mono text-sm font-semibold">
                {patient?.patientCode || patientId || "—"}
              </p>
            </div>
            <label>
              <FieldLabel>Operation Date</FieldLabel>
              <DateInput
                value={operationDate}
                onChange={(event) => setOperationDate(event.target.value)}
                className="mt-1 h-9 border-[#c2c7d1] bg-white"
              />
            </label>
            <div>
              <FieldLabel>Report Date</FieldLabel>
              <p className="mt-1 font-mono text-sm font-semibold">
                {displaySheetDate(today)}
              </p>
            </div>
            <label className="col-span-2">
              <FieldLabel>Planned Procedure</FieldLabel>
              <Input
                value={procedure}
                onChange={(event) => setProcedure(event.target.value)}
                className="mt-1 h-9 border-[#c2c7d1] bg-white font-semibold"
                placeholder="PRK / LASIK / Femto LASIK"
              />
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="h-2 w-2 rounded-full bg-[#00355f]" />
              <h3 className="text-lg font-bold text-[#00355f]">
                Pre-Operative Metrics
              </h3>
            </div>
            <RefractionTable
              title="Refraction Measurement (Pre-Op)"
              od={preOd}
              os={preOs}
              setOd={setPreOd}
              setOs={setPreOs}
            />
            <div className="grid grid-cols-2 gap-4">
              <VaBox
                title="UCVA"
                od={ucvaOd}
                os={ucvaOs}
                setOd={setUcvaOd}
                setOs={setUcvaOs}
              />
              <VaBox
                title="BCVA"
                od={bcvaOd}
                os={bcvaOs}
                setOd={setBcvaOd}
                setOs={setBcvaOs}
              />
            </div>
          </section>

          <section className="border border-[#0f4c81] bg-[#d2e4ff] p-4">
            <FieldLabel>Planned Treatment</FieldLabel>
            <p className="mt-1 text-xl font-extrabold text-[#00355f]">
              {procedure || "—"}
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="h-2 w-2 rounded-full bg-[#00355f]" />
              <h3 className="text-lg font-bold text-[#00355f]">
                Post-Operative Results
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <VaBox
                title="VA Post-Op"
                od={postVaOd}
                os={postVaOs}
                setOd={setPostVaOd}
                setOs={setPostVaOs}
              />
              <RefractionTable
                title="Residual Refraction"
                od={residualOd}
                os={residualOs}
                setOd={setResidualOd}
                setOs={setResidualOs}
              />
            </div>
          </section>

          <section className="mt-auto grid grid-cols-[1fr_72mm] gap-8 border-t border-[#c2c7d1] pt-5">
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
              <div className="border-t border-[#727780] pt-2 text-center">
                <p className="text-xs font-bold text-[#161d1f]">
                  Doctor Signature & Stamp
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
