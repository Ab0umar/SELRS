import { useEffect, useState } from "react";
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

function CertLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-bold text-[#727780]">{children}</span>
  );
}

function diffDaysInclusive(from: string, to: string) {
  if (!from || !to) return "";
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return "";
  return String(Math.floor(ms / 86_400_000) + 1);
}

const DEFAULT_CERTIFICATE_STATEMENT =
  "يشهد المركز بأن المريض المذكور أدناه قد خضع لإجراء عملية تصحيح الإبصار، ويتطلب فترة راحة طبية لتقليل الإجهاد البصري وحماية العين أثناء مرحلة التعافي.";

export type PostOpOffdaysProps = {
  params?: { id?: string };
  patientId?: number;
  onSelectPatient?: (id: number | undefined) => void;
  hideHeaderSearch?: boolean;
  hidePrintButton?: boolean;
};

export default function PostOpOffdays({
  params: routeParams,
  patientId: propPatientId,
  onSelectPatient,
  hideHeaderSearch = false,
  hidePrintButton = false,
}: PostOpOffdaysProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const [, params] = useRoute("/post-op-offdays/:id");
  const routePatientId = params?.id
    ? Number(params.id)
    : routeParams?.id
      ? Number(routeParams.id)
      : undefined;
  const queryParamId =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("patientId")) ||
        Number(new URLSearchParams(window.location.search).get("id")) ||
        undefined
      : undefined;
  const requestedVisitDate =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("visitDate") || ""
      : "";
  const [patientId, setPatientId] = useState<number | undefined>(
    propPatientId ?? routePatientId ?? queryParamId,
  );

  useEffect(() => {
    if (hideHeaderSearch || onSelectPatient) {
      setPatientId(propPatientId);
    } else if (propPatientId !== undefined) {
      setPatientId(propPatientId);
    }
  }, [propPatientId, hideHeaderSearch, onSelectPatient]);

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });
  const certsQuery = trpc.medical.getPostOpOffdaysByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const patient = patientQuery.data as any;
  const certs = (certsQuery.data as any[] | undefined) ?? [];
  const [existingCertId, setExistingCertId] = useState<number | undefined>();
  const [operationDate, setOperationDate] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [duration, setDuration] = useState("");
  const [method, setMethod] = useState("");
  const [certificateStatement, setCertificateStatement] = useState(
    DEFAULT_CERTIFICATE_STATEMENT,
  );
  const [vaOd, setVaOd] = useState("");
  const [vaOs, setVaOs] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [patientDob, setPatientDob] = useState("");

  useEffect(() => {
    const days = diffDaysInclusive(leaveStart, returnDate);
    if (days) setDuration(days);
  }, [leaveStart, returnDate]);

  useEffect(() => {
    const fullName = String(user?.name ?? "").trim();
    if (fullName && !doctorName) setDoctorName(fullName);
  }, [doctorName, user?.name]);

  useEffect(() => {
    if (!patientId) {
      setPatientName("");
      setPatientCode("");
      setPatientDob("");
      setOperationDate("");
      setLeaveStart("");
      setReturnDate("");
      setDuration("");
      setMethod("");
      setVaOd("");
      setVaOs("");
      setExistingCertId(undefined);
      return;
    }
    if (!patient) return;
    setPatientName(patient.fullName || "");
    setPatientCode(patient.patientCode || "");
    setPatientDob(
      patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "",
    );
  }, [patientId, patient]);

  useEffect(() => {
    const cert = requestedVisitDate
      ? certs.find(
          (item) =>
            String(item.createdAt ?? "").split("T")[0] === requestedVisitDate,
        )
      : certs[0];
    if (!cert) {
      setExistingCertId(undefined);
      return;
    }
    setExistingCertId(Number(cert.id));
    setOperationDate(
      cert.operationDate ? String(cert.operationDate).split("T")[0] : "",
    );
    setMethod(cert.method || "");
    setCertificateStatement(
      cert.certificateStatement || DEFAULT_CERTIFICATE_STATEMENT,
    );
    setVaOd(cert.vaOD || "");
    setVaOs(cert.vaOS || "");
    setLeaveStart(cert.leaveStart ? String(cert.leaveStart).split("T")[0] : "");
    setReturnDate(cert.returnDate ? String(cert.returnDate).split("T")[0] : "");
    if (cert.durationDays) setDuration(String(cert.durationDays));
    if (cert.doctorName) setDoctorName(cert.doctorName);
    if (cert.patientNameOverride) setPatientName(cert.patientNameOverride);
    if (cert.patientCodeOverride) setPatientCode(cert.patientCodeOverride);
    if (cert.patientDobOverride)
      setPatientDob(String(cert.patientDobOverride).split("T")[0]);
  }, [certs, requestedVisitDate]);

  const createCertMutation =
    trpc.medical.savePostOpOffdaysCertificate.useMutation();

  const handleSave = async () => {
    if (!patientId) {
      toast.error("اختر مريضاً أولاً");
      return;
    }
    try {
      await createCertMutation.mutateAsync({
        id: existingCertId,
        patientId,
        operationDate: operationDate || undefined,
        method: method || undefined,
        certificateStatement: certificateStatement || undefined,
        vaOD: vaOd || undefined,
        vaOS: vaOs || undefined,
        leaveStart: leaveStart || undefined,
        returnDate: returnDate || undefined,
        durationDays: duration ? Number(duration) : undefined,
        doctorName: doctorName || undefined,
        patientNameOverride: patientName || undefined,
        patientCodeOverride: patientCode || undefined,
        patientDobOverride: patientDob || undefined,
      });
      toast.success("تم حفظ الشهادة");
      await certsQuery.refetch();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="post-op-offdays-root medical-report-brand min-h-screen bg-[#eef5f7] text-[#161d1f]">
      <style>{`
        .offdays-paper {
          width: 210mm;
          min-height: 297mm;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .post-op-offdays-root {
            min-height: 0 !important;
            height: 297mm !important;
            background: white !important;
            overflow: hidden !important;
          }
          .offdays-print-shell {
            padding: 0 !important;
            height: 297mm !important;
            overflow: hidden !important;
          }
          .offdays-paper {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 0 !important;
            max-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            padding: 30mm 18mm 12mm !important;
            overflow: hidden !important;
          }
          .offdays-paper header {
            margin-bottom: 6mm !important;
            padding-bottom: 4mm !important;
          }
          .offdays-paper section {
            margin-bottom: 5mm !important;
          }
          .offdays-recommendations {
            margin-bottom: 1mm !important;
          }
          .offdays-paper section:nth-of-type(1) {
            padding: 4mm !important;
          }
          .offdays-paper section:nth-of-type(1) h3 {
            margin-bottom: 2mm !important;
            font-size: 15px !important;
          }
          .offdays-paper p {
            line-height: 1.45 !important;
          }
          .offdays-paper table th,
          .offdays-paper table td {
            padding-top: 1.6mm !important;
            padding-bottom: 1.6mm !important;
          }
          .offdays-paper input,
          .offdays-paper textarea {
            height: 7mm !important;
            min-height: 0 !important;
            font-size: 15px !important;
          }
          .offdays-status-table input {
            font-size: 16px !important;
          }
          .offdays-status-table textarea {
            height: 32mm !important;
            min-height: 32mm !important;
            overflow: visible !important;
          }
          .offdays-statement,
          .offdays-status-table textarea {
            font-size: 18px !important;
            font-weight: 700 !important;
            line-height: 1.35 !important;
          }
          .offdays-statement {
            height: 27mm !important;
            min-height: 27mm !important;
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .offdays-paper .h-20 {
            height: 14mm !important;
          }
          .offdays-paper footer {
            margin-top: 4mm !important;
            padding-top: 3mm !important;
            gap: 14mm !important;
          }
          .offdays-paper footer p {
            margin-bottom: 3mm !important;
          }
          input {
            box-shadow: none !important;
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
              Post-Op Offdays Certificate
            </h1>
            <p className="text-xs font-semibold text-[#727780]">
              شهادة إجازة مرضية بعد العملية
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!hideHeaderSearch && (
              <div className="w-72">
                <PatientPicker
                  initialPatientId={patientId}
                  onSelect={(selected) => {
                    const newId = selected?.id ? Number(selected.id) : undefined;
                    setPatientId(newId);
                    onSelectPatient?.(newId);
                  }}
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="border-[#00355f] text-[#00355f]"
              onClick={handleSave}
              disabled={createCertMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createCertMutation.isPending ? "جارٍ الحفظ…" : "Save"}
            </Button>
            {!hidePrintButton && (
              <>
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
              </>
            )}
          </div>
        </div>
      </header>

      <div className="offdays-print-shell flex justify-center p-8" dir="rtl">
        <ClinicalReportFrame
          title="Post-Operative Leave Report | تقرير إجازة ما بعد العملية"
          generatedDate={operationDate}
          patient={{
            name: patientName,
            code: patientCode,
            age: patient?.age,
            birthDate: patientDob,
            phone: patient?.phone,
            occupation: patient?.occupation,
          }}
          signatureLabel="توقيع الطبيب المعالج"
        >
          <div className="flex flex-col">
            <section className="mb-8 border border-[#c2c7d1] bg-[#eef5f7] p-5">
              <h3 className="mb-3 text-lg font-bold text-[#00355f]">إفادة</h3>
              <Textarea
                value={certificateStatement}
                onChange={(event) => setCertificateStatement(event.target.value)}
                className="offdays-statement block !w-full !max-w-none min-h-28 resize-none border-[#c2c7d1] bg-white px-3 py-2 text-lg font-bold leading-6 text-[#161d1f] shadow-none [field-sizing:fixed] focus-visible:ring-[#00355f]"
              />
            </section>

            <section className="hidden">
              <label className="flex items-center justify-between gap-2 border-b border-[#c2c7d1] py-2">
                <CertLabel>الاسم الكامل:</CertLabel>
                <Input
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                  className="h-8 w-56 border-0 border-b border-dotted border-[#727780] bg-transparent text-right text-base font-bold shadow-none focus-visible:ring-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 border-b border-[#c2c7d1] py-2">
                <CertLabel>رقم المريض:</CertLabel>
                <Input
                  value={patientCode}
                  onChange={(event) => setPatientCode(event.target.value)}
                  className="h-8 w-36 border-0 border-b border-dotted border-[#727780] bg-transparent text-center font-mono text-base font-semibold shadow-none focus-visible:ring-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 border-b border-[#c2c7d1] py-2">
                <CertLabel>تاريخ الميلاد:</CertLabel>
                <DateInput
                  value={patientDob}
                  onChange={(event) => setPatientDob(event.target.value)}
                  className="h-8 w-36 border-[#c2c7d1] text-center font-mono text-base font-semibold"
                />
              </label>
              <label className="flex items-center justify-between gap-4 border-b border-[#c2c7d1] py-2">
                <CertLabel>تاريخ العملية:</CertLabel>
                <DateInput
                  value={operationDate}
                  onChange={(event) => setOperationDate(event.target.value)}
                  className="h-8 w-36 border-[#c2c7d1] text-center text-base"
                />
              </label>
            </section>

            <section
              className="mb-8 overflow-hidden border border-[#c2c7d1]"
              dir="ltr"
            >
              <h3 className="border-b border-[#c2c7d1] bg-[#00355f] px-4 py-2 text-center text-sm font-extrabold text-white">
                قياسات ما بعد العملية / Post-Op Status
              </h3>
              <table className="offdays-status-table w-full table-fixed border-collapse text-center">
                <thead>
                  <tr className="bg-[#e8eff1] text-[12px] font-bold text-[#42474f]">
                    <th className="w-[9%] border border-[#c2c7d1] px-3 py-2">Eye</th>
                    <th className="w-[46%] border border-[#c2c7d1] px-3 py-2">VA</th>
                    <th className="w-[45%] border border-[#c2c7d1] px-3 py-2">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#c2c7d1] px-3 py-2 font-bold">
                      OD
                    </td>
                    <td className="border border-[#c2c7d1] p-0">
                      <Input
                        value={vaOd}
                        onChange={(event) => setVaOd(event.target.value)}
                        className="h-10 border-0 text-center text-lg font-bold"
                      />
                    </td>
                    <td className="border border-[#c2c7d1] p-0 align-middle" rowSpan={2}>
                      <Textarea
                        value={method}
                        onChange={(event) => setMethod(event.target.value)}
                        rows={5}
                        className="h-[120px] min-h-[120px] resize-none border-0 px-3 py-2 text-center text-lg font-bold leading-6"
                        placeholder="PRK / LASIK"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#c2c7d1] px-3 py-2 font-bold">
                      OS
                    </td>
                    <td className="border border-[#c2c7d1] p-0">
                      <Input
                        value={vaOs}
                        onChange={(event) => setVaOs(event.target.value)}
                        className="h-10 border-0 text-center text-lg font-bold"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mb-8 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-0 border-2 border-[#c2c7d1] p-5">
              <label className="min-w-0 border-l border-[#c2c7d1] px-3 text-center">
                <CertLabel>تاريخ البدء</CertLabel>
                <DateInput
                  value={leaveStart}
                  onChange={(event) => setLeaveStart(event.target.value)}
                  className="mt-2 h-9 w-full min-w-0 border-[#c2c7d1] px-2 text-center text-sm font-bold"
                  inputClassName="min-w-0 flex-1 basis-0 px-1 text-sm"
                />
              </label>
              <label className="min-w-0 border-l border-[#c2c7d1] px-3 text-center">
                <CertLabel>تاريخ العودة</CertLabel>
                <DateInput
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
                  className="mt-2 h-9 w-full min-w-0 border-[#c2c7d1] px-2 text-center text-sm font-bold"
                  inputClassName="min-w-0 flex-1 basis-0 px-1 text-sm"
                />
              </label>
              <label className="min-w-0 px-3 text-center">
                <CertLabel>المدة</CertLabel>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Input
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className="h-9 w-20 border-[#c2c7d1] text-center text-xl font-bold text-[#00355f]"
                  />
                  <span className="font-bold text-[#00355f]">يوماً</span>
                </div>
              </label>
            </section>

            <section className="offdays-recommendations mb-2">
              <h3 className="mb-3 text-sm font-bold text-[#00355f]">
                وقد اوصى الطبيب
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "لا وقت للشاشة / No screen time",
                  "تجنب الإجهاد البدني / Avoid strain",
                  "الحماية من الضوء / Light protection",
                  "تجنب ملامسة الماء / Keep dry",
                ].map((label) => (
                  <div
                    key={label}
                    className="border border-[#ba1a1a]/25 bg-[#ffdad6]/70 px-3 py-2 text-sm font-bold text-[#93000a]"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </section>

            <footer className="hidden">
              <div dir="ltr" className="text-left">
                <p dir="ltr" className="mb-5 text-left font-bold">
                  توقيع الطبيب المعالج:
                </p>
                <div className="mb-2 w-56 border-b border-[#42474f]" />
                <Input
                  value={doctorName}
                  onChange={(event) => setDoctorName(event.target.value)}
                  dir="ltr"
                  className="w-64 border-0 bg-transparent p-0 text-left font-bold shadow-none"
                />
                <p className="text-xs text-[#727780]">استشاري جراحة العيون</p>
              </div>
            </footer>
          </div>
        </ClinicalReportFrame>
      </div>
    </div>
  );
}
