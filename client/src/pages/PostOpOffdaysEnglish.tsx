import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Download, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import PatientPicker from "@/components/PatientPicker";
import { ClinicalReportFrame } from "@/components/reports/ClinicalReportFrame";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { displaySheetDate } from "@/lib/sheetDates";

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#727780]">
      {children}
    </span>
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

export default function PostOpOffdaysEnglish() {
  const { isAuthenticated, user } = useAuth();
  const [, params] = useRoute("/post-op-offdays-en/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const [patientId, setPatientId] = useState<number | undefined>(
    initialPatientId,
  );

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  const patient = patientQuery.data as any;
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [procedure, setProcedure] = useState("");
  const [operationDate, setOperationDate] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [duration, setDuration] = useState("");
  const [doctorName, setDoctorName] = useState("");

  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId);
  }, [initialPatientId]);

  useEffect(() => {
    const days = diffDaysInclusive(leaveStart, returnDate);
    if (days) setDuration(days);
  }, [leaveStart, returnDate]);

  useEffect(() => {
    const fullName = String(user?.name ?? "").trim();
    if (fullName && !doctorName) setDoctorName(fullName);
  }, [doctorName, user?.name]);

  if (!isAuthenticated) return null;

  return (
    <div
      className="post-op-offdays-en-root medical-report-brand min-h-screen bg-[#eef5f7] text-[#161d1f]"
      dir="ltr"
    >
      <style>{`
        .offdays-en-paper {
          width: 210mm;
          min-height: 297mm;
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
          .post-op-offdays-en-root {
            min-height: 0 !important;
            background: white !important;
          }
          .offdays-en-print-shell {
            padding: 0 !important;
          }
          .offdays-en-paper {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            padding: 24mm 22mm 18mm !important;
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
              Certificate of Medical Necessity
            </h1>
            <p className="text-xs font-semibold text-[#727780]">
              Ophthalmic Post-Op Recovery
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
            <Button
              type="button"
              variant="outline"
              className="border-[#00355f] text-[#00355f]"
            >
              <Save className="mr-2 h-4 w-4" />
              Save
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

      <div className="offdays-en-print-shell flex justify-center p-8">
        <ClinicalReportFrame
          title="Post-Operative Leave Report | تقرير إجازة ما بعد العملية"
          generatedDate={today}
          patient={{
            name: patient?.fullName,
            code: patient?.patientCode || patientId,
            age: patient?.age,
            birthDate: patient?.dateOfBirth,
            phone: patient?.phone,
            occupation: patient?.occupation,
          }}
          signatureLabel="Doctor Signature & Stamp / توقيع وختم الطبيب"
          dir="ltr"
        >
          <div className="flex flex-col">
            <header className="hidden">
              <div>
                <h2 className="text-2xl font-extrabold uppercase tracking-tight text-[#00355f]">
                  Certificate of Medical Necessity
                </h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#727780]">
                  Ophthalmic Post-Operative Recovery
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#00355f]">
                  Al Shrouq Eye Center
                </p>
                <p className="text-xs font-semibold text-[#727780]">
                  Issued: {displaySheetDate(today)}
                </p>
              </div>
            </header>

            <section className="hidden">
              <h3 className="mb-3 bg-[#eef5f7] px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[#00355f]">
                Patient Information
              </h3>
              <div className="grid grid-cols-3 gap-6 px-3">
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {patient?.fullName || "—"}
                  </p>
                </div>
                <div>
                  <FieldLabel>Patient ID</FieldLabel>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {patient?.patientCode || patientId || "—"}
                  </p>
                </div>
                <div>
                  <FieldLabel>Date of Birth</FieldLabel>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {displaySheetDate(patient?.dateOfBirth || "") || "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="mb-3 bg-[#eef5f7] px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[#00355f]">
                Clinical Justification
              </h3>
              <div className="space-y-4 px-3 text-[14px] leading-7">
                <p>
                  This is to certify that the above-named patient underwent an
                  ophthalmic surgical procedure and requires a mandatory period
                  of medical rest to support ocular surface healing and prevent
                  post-operative complications.
                </p>
                <div className="grid grid-cols-[1fr_1fr] gap-4">
                  <label>
                    <FieldLabel>Procedure</FieldLabel>
                    <Input
                      value={procedure}
                      onChange={(event) => setProcedure(event.target.value)}
                      className="mt-1 border-[#c2c7d1] font-semibold"
                      placeholder="PRK / LASIK / Femto LASIK"
                    />
                  </label>
                  <label>
                    <FieldLabel>Operation Date</FieldLabel>
                    <DateInput
                      value={operationDate}
                      onChange={(event) => setOperationDate(event.target.value)}
                      className="mt-1 border-[#c2c7d1] font-semibold"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="mb-4 bg-[#eef5f7] px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[#00355f]">
                Recommended Leave Period
              </h3>
              <div className="grid grid-cols-3 gap-6 px-3">
                <label className="border-l-4 border-[#0060ac] pl-4">
                  <FieldLabel>Commencement Date</FieldLabel>
                  <DateInput
                    value={leaveStart}
                    onChange={(event) => setLeaveStart(event.target.value)}
                    className="mt-2 border-[#c2c7d1] font-semibold"
                  />
                </label>
                <label className="border-l-4 border-[#0060ac] pl-4">
                  <FieldLabel>Resumption Date</FieldLabel>
                  <DateInput
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                    className="mt-2 border-[#c2c7d1] font-semibold"
                  />
                </label>
                <label className="border-l-4 border-[#0060ac] pl-4">
                  <FieldLabel>Duration</FieldLabel>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className="w-20 border-[#c2c7d1] text-center text-lg font-bold"
                    />
                    <span className="text-sm font-bold uppercase">
                      Calendar Days
                    </span>
                  </div>
                </label>
              </div>
            </section>

            <section className="mb-10">
              <h3 className="mb-4 bg-[#eef5f7] px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[#00355f]">
                Mandatory Activity Restrictions
              </h3>
              <div className="grid grid-cols-2 gap-4 px-3">
                {[
                  ["No Screen Time", "Avoid computers, phones, and tablets."],
                  [
                    "Light Protection",
                    "Avoid bright natural and artificial light.",
                  ],
                  [
                    "Physical Strain",
                    "No heavy lifting, swimming, or exercise.",
                  ],
                  [
                    "Driving Restriction",
                    "Patient is unfit to operate vehicles.",
                  ],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="border border-[#c2c7d1] bg-[#f4fafd] p-3"
                  >
                    <p className="font-bold text-[#161d1f]">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#42474f]">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-auto grid grid-cols-2 gap-12 border-t border-[#c2c7d1] pt-10">
              <div className="flex flex-col items-center justify-end">
                <div className="mb-2 h-px w-full bg-[#c2c7d1]" />
                <p className="text-xs font-bold uppercase text-[#727780]">
                  Official Clinic Stamp
                </p>
                <div className="mt-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#00355f]/30 text-center text-[#00355f]/40">
                  <div>
                    <p className="text-[9px] font-bold">AL SHROUQ</p>
                    <p className="text-[9px] font-bold">EYE CENTER</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end justify-end text-right">
                <Input
                  value={doctorName}
                  onChange={(event) => setDoctorName(event.target.value)}
                  className="mb-2 w-72 border-0 border-b border-[#161d1f] bg-transparent text-right font-bold shadow-none"
                />
                <p className="font-bold text-[#00355f]">Consultant Surgeon</p>
                <p className="text-xs text-[#727780]">
                  Refractive Surgery Department
                </p>
              </div>
            </section>

            <footer className="hidden">
              <div>
                <p>Verification Key: OP-REST-{patientId || "0000"}</p>
                <p>This document is valid for institutional use.</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center border border-[#c2c7d1] text-[10px] font-bold">
                QR
              </div>
            </footer>
          </div>
        </ClinicalReportFrame>
      </div>
    </div>
  );
}
