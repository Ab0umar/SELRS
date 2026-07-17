import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Download, Printer, Save } from "lucide-react";
import PatientPicker from "@/components/PatientPicker";
import { ClinicalReportFrame } from "@/components/reports/ClinicalReportFrame";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";

const TODAY = new Date().toISOString().split("T")[0];
const REF_ID = `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

interface FormData {
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientId: string;
  nationality: string;
  contact: string;
  examDate: string;
  // refraction
  refractionOD: string;
  refractionOS: string;
  // VA uncorrected
  vaOD: string;
  vaOS: string;
  // VA best corrected
  vaBestOD: string;
  vaBestOS: string;
  // IOP
  iopOD: string;
  iopOS: string;
  slitLamp: string;
  fundus: string;
  diagnosisTags: string;
  reasonForReferral: string;
  referredPhysician: string;
  referredPhysicianTitle: string;
  referredFacility: string;
  referredDept: string;
  physicianName: string;
  physicianTitle: string;
  physicianLicense: string;
}

const initialForm: FormData = {
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientId: "",
  nationality: "",
  contact: "",
  examDate: TODAY,
  refractionOD: "",
  refractionOS: "",
  vaOD: "",
  vaOS: "",
  vaBestOD: "",
  vaBestOS: "",
  iopOD: "",
  iopOS: "",
  slitLamp: "",
  fundus: "",
  diagnosisTags: "",
  reasonForReferral: "",
  referredPhysician: "",
  referredPhysicianTitle: "",
  referredFacility: "",
  referredDept: "",
  physicianName: "",
  physicianTitle: "استشاري طب وجراحة العيون",
  physicianLicense: "",
};

// Shared input style: invisible chrome, prints clean
const FIELD =
  "h-auto border-none shadow-none bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-300 disabled:opacity-100 disabled:cursor-default";

function refractionParts(value: string) {
  const [sphere = "", cylinder = "", axis = ""] = value
    .split(/\s*(?:\/|x)\s*/i)
    .map((part) => part.trim());
  return [sphere, cylinder, axis];
}

function updateRefractionPart(value: string, index: number, next: string) {
  const parts = refractionParts(value);
  parts[index] = next;
  return parts.join(" / ");
}

function formatFundusFinding(value: unknown) {
  if (!value) return "";
  let finding = value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      finding = JSON.parse(value) as Record<string, unknown>;
    } catch {
      return value;
    }
  }
  return [
    finding.discStatus && `Disc: ${finding.discStatus}`,
    finding.cupDiscRatio && `C/D: ${finding.cupDiscRatio}`,
    finding.macuaStatus && `Macula: ${finding.macuaStatus}`,
    finding.vesselStatus && `Vessels: ${finding.vesselStatus}`,
    finding.otherFindings && `Other: ${finding.otherFindings}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function ReferralLetter() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sheets/referral/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const [patientId, setPatientId] = useState<number | undefined>(
    initialPatientId,
  );
  const [existingLetterId, setExistingLetterId] = useState<
    number | undefined
  >();
  const [form, setForm] = useState<FormData>(initialForm);

  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId);
  }, [initialPatientId]);

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });
  const glassesQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const lettersQuery = trpc.medical.getReferralLettersByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );

  const patient = patientQuery.data as any;
  const glassesRecords = (glassesQuery.data as any[] | undefined) ?? [];
  const letters = (lettersQuery.data as any[] | undefined) ?? [];

  useEffect(() => {
    if (!patient) return;
    setForm((p) => ({
      ...p,
      patientName: p.patientName || patient.fullName || "",
      patientId: p.patientId || patient.patientCode || "",
      patientAge:
        p.patientAge ||
        (patient.dateOfBirth
          ? String(
              new Date().getFullYear() -
                new Date(patient.dateOfBirth).getFullYear(),
            )
          : ""),
      patientGender:
        p.patientGender ||
        (patient.gender === "male"
          ? "ذكر"
          : patient.gender === "female"
            ? "أنثى"
            : ""),
      contact: p.contact || patient.phone || "",
    }));
  }, [patient]);

  useEffect(() => {
    if (glassesRecords.length === 0) return;
    const latest = glassesRecords[0];
    setForm((p) => ({
      ...p,
      refractionOD:
        p.refractionOD ||
        [latest.sOD, latest.cOD, latest.axisOD].filter(Boolean).join(" / "),
      refractionOS:
        p.refractionOS ||
        [latest.sOS, latest.cOS, latest.axisOS].filter(Boolean).join(" / "),
      vaBestOD: p.vaBestOD || latest.bcvaOD || "",
      vaBestOS: p.vaBestOS || latest.bcvaOS || "",
    }));
  }, [glassesRecords]);

  useEffect(() => {
    const latestGlasses = glassesRecords[0];
    const examinations = (examinationsQuery.data as any[] | undefined) ?? [];
    const latestExam =
      examinations.find(
        (exam) => Number(exam.id) === Number(latestGlasses?.examinationId),
      ) ?? examinations[0];
    const autorefRecords = (autorefQuery.data as any[] | undefined) ?? [];
    const autoref =
      autorefRecords.find(
        (record) => Number(record.examinationId) === Number(latestExam?.id),
      ) ?? autorefRecords[0];
    const report = ((reportsQuery.data as any[] | undefined) ?? []).find(
      (item) => Number(item.visitId) === Number(latestExam?.visitId),
    );
    if (!latestExam && !autoref && !report) return;
    const slitLamp = [
      latestExam?.anteriorSegmentOD && `OD: ${latestExam.anteriorSegmentOD}`,
      latestExam?.anteriorSegmentOS && `OS: ${latestExam.anteriorSegmentOS}`,
    ]
      .filter(Boolean)
      .join(" | ");
    const fundus = [
      latestExam?.posteriorSegmentOD &&
        `OD: ${formatFundusFinding(latestExam.posteriorSegmentOD)}`,
      latestExam?.posteriorSegmentOS &&
        `OS: ${formatFundusFinding(latestExam.posteriorSegmentOS)}`,
    ]
      .filter(Boolean)
      .join(" | ");
    setForm((previous) => ({
      ...previous,
      vaOD: previous.vaOD || autoref?.ucvaOD || "",
      vaOS: previous.vaOS || autoref?.ucvaOS || "",
      vaBestOD: previous.vaBestOD || autoref?.bcvaOD || "",
      vaBestOS: previous.vaBestOS || autoref?.bcvaOS || "",
      iopOD: previous.iopOD || autoref?.iopOD || "",
      iopOS: previous.iopOS || autoref?.iopOS || "",
      slitLamp: previous.slitLamp || slitLamp,
      fundus: previous.fundus || fundus,
      diagnosisTags: previous.diagnosisTags || report?.diagnosis || "",
      reasonForReferral:
        previous.reasonForReferral || report?.recommendations || "",
    }));
  }, [
    autorefQuery.data,
    examinationsQuery.data,
    glassesRecords,
    reportsQuery.data,
  ]);

  useEffect(() => {
    const letter = letters[0];
    if (!letter) return;
    setExistingLetterId(Number(letter.id));
    setForm((p) => ({
      ...p,
      examDate: letter.examDate
        ? String(letter.examDate).split("T")[0]
        : p.examDate,
      refractionOD: letter.refractionOD || p.refractionOD,
      refractionOS: letter.refractionOS || p.refractionOS,
      vaOD: letter.vaOD || p.vaOD,
      vaOS: letter.vaOS || p.vaOS,
      vaBestOD: letter.vaBestOD || p.vaBestOD,
      vaBestOS: letter.vaBestOS || p.vaBestOS,
      iopOD: letter.iopOD || p.iopOD,
      iopOS: letter.iopOS || p.iopOS,
      slitLamp: letter.slitLamp || p.slitLamp,
      fundus: letter.fundus || p.fundus,
      diagnosisTags: letter.diagnosisTags || p.diagnosisTags,
      reasonForReferral: letter.reasonForReferral || p.reasonForReferral,
      referredPhysician: letter.referredPhysician || p.referredPhysician,
      referredPhysicianTitle:
        letter.referredPhysicianTitle || p.referredPhysicianTitle,
      referredFacility: letter.referredFacility || p.referredFacility,
      referredDept: letter.referredDept || p.referredDept,
      physicianName: letter.physicianName || p.physicianName,
      physicianTitle: letter.physicianTitle || p.physicianTitle,
      physicianLicense: letter.physicianLicense || p.physicianLicense,
      patientName: letter.patientNameOverride || p.patientName,
      patientId: letter.patientCodeOverride || p.patientId,
      patientGender: letter.patientGenderOverride || p.patientGender,
    }));
  }, [letters]);

  const saveLetterMutation = trpc.medical.saveReferralLetter.useMutation();

  const handleSave = async () => {
    if (!patientId) {
      toast.error("اختر مريضاً أولاً");
      return;
    }
    try {
      await saveLetterMutation.mutateAsync({
        id: existingLetterId,
        patientId,
        refCode: REF_ID,
        examDate: form.examDate || undefined,
        refractionOD: form.refractionOD || undefined,
        refractionOS: form.refractionOS || undefined,
        vaOD: form.vaOD || undefined,
        vaOS: form.vaOS || undefined,
        vaBestOD: form.vaBestOD || undefined,
        vaBestOS: form.vaBestOS || undefined,
        iopOD: form.iopOD || undefined,
        iopOS: form.iopOS || undefined,
        slitLamp: form.slitLamp || undefined,
        fundus: form.fundus || undefined,
        diagnosisTags: form.diagnosisTags || undefined,
        reasonForReferral: form.reasonForReferral || undefined,
        referredPhysician: form.referredPhysician || undefined,
        referredPhysicianTitle: form.referredPhysicianTitle || undefined,
        referredFacility: form.referredFacility || undefined,
        referredDept: form.referredDept || undefined,
        physicianName: form.physicianName || undefined,
        physicianTitle: form.physicianTitle || undefined,
        physicianLicense: form.physicianLicense || undefined,
        patientNameOverride: form.patientName || undefined,
        patientCodeOverride: form.patientId || undefined,
        patientGenderOverride: form.patientGender || undefined,
      });
      toast.success("تم حفظ خطاب الإحالة");
      await lettersQuery.refetch();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  const set =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const handlePrint = () => window.print();
  const handleDownloadPDF = () => window.print();

  const iopODNum = Number(form.iopOD);
  const iopOSNum = Number(form.iopOS);

  const renderBody = (readOnly = false) => (
    <fieldset
      disabled={readOnly}
      className="medical-report-brand border-0 p-0 m-0 min-w-0 disabled:opacity-95 referral-print-root"
    >
      <ClinicalReportFrame
        title="Medical Referral | خطاب تحويل طبي"
        generatedDate={form.examDate}
        patient={{
          name: form.patientName,
          code: form.patientId,
          age: form.patientAge,
          phone: form.contact,
          occupation: form.nationality,
        }}
        signatureLabel="Signature & Stamp / التوقيع والختم"
      >
        <div className="flex flex-1 flex-col space-y-8">
          {/* Patient Info */}
          <section className="hidden">
            <div className="grid grid-cols-3 gap-4 bg-muted/40 p-4 rounded-lg border border-border/70">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Full Name / الاسم الكامل
                </label>
                <Input
                  className={`${FIELD} text-base font-bold`}
                  value={form.patientName}
                  onChange={set("patientName")}
                  placeholder="اسم المريض"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Patient ID / رقم المريض
                </label>
                <Input
                  className={`${FIELD} text-base font-mono`}
                  value={form.patientId}
                  onChange={set("patientId")}
                  placeholder="P-0000000"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Age &amp; Gender / العمر والجنس
                </label>
                <div className="flex gap-2">
                  <Input
                    className={`${FIELD} text-base w-16`}
                    value={form.patientAge}
                    onChange={set("patientAge")}
                    placeholder="45"
                  />
                  <Input
                    className={`${FIELD} text-base`}
                    value={form.patientGender}
                    onChange={set("patientGender")}
                    placeholder="ذكر"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Nationality / الجنسية
                </label>
                <Input
                  className={`${FIELD} text-base`}
                  value={form.nationality}
                  onChange={set("nationality")}
                  placeholder="—"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Contact / التواصل
                </label>
                <Input
                  className={`${FIELD} text-base`}
                  dir="ltr"
                  value={form.contact}
                  onChange={set("contact")}
                  placeholder="+20 ..."
                />
              </div>
            </div>
          </section>

          {/* Clinical Findings table */}
          <section>
            <div className="mb-2 flex flex-row-reverse items-center justify-between gap-4 border-b border-border/70 pb-2">
              <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-primary">
                Clinical Findings
              </h3>
              <div className="flex flex-1 items-center justify-center gap-5 text-center text-[11px] font-bold uppercase">
                <label className="flex items-center gap-1">
                  UCVA
                  <Input
                    className={`${FIELD} w-8 text-center text-xs font-bold`}
                    value={form.vaOD}
                    onChange={set("vaOD")}
                    placeholder="..."
                  />
                  /
                  <Input
                    className={`${FIELD} w-8 text-center text-xs font-bold`}
                    value={form.vaOS}
                    onChange={set("vaOS")}
                    placeholder="..."
                  />
                </label>
                <label className="flex items-center gap-1">
                  BCVA
                  <Input
                    className={`${FIELD} w-8 text-center text-xs font-bold`}
                    value={form.vaBestOD}
                    onChange={set("vaBestOD")}
                    placeholder="..."
                  />
                  /
                  <Input
                    className={`${FIELD} w-8 text-center text-xs font-bold`}
                    value={form.vaBestOS}
                    onChange={set("vaBestOS")}
                    placeholder="..."
                  />
                </label>
                <label className="flex items-center gap-1">
                  IOP
                  <Input
                    className={`${FIELD} w-8 text-center text-xs font-bold ${iopODNum > 21 ? "text-destructive" : ""}`}
                    value={form.iopOD}
                    onChange={set("iopOD")}
                    placeholder="..."
                  />
                  /
                  <Input
                    className={`${FIELD} w-8 text-center text-xs font-bold ${iopOSNum > 21 ? "text-destructive" : ""}`}
                    value={form.iopOS}
                    onChange={set("iopOS")}
                    placeholder="..."
                  />
                </label>
              </div>
            </div>
            <div
              className="overflow-hidden rounded-md border border-[#c3c6d6]"
              dir="ltr"
            >
              <table className="w-full table-fixed border-collapse text-center text-xs">
                <thead className="bg-[#e7e8ea] font-bold">
                  <tr>
                    <th className="w-[18%] border border-[#c3c6d6] px-2 py-2">
                      Refraction
                    </th>
                    <th
                      colSpan={3}
                      className="border border-[#c3c6d6] px-2 py-2"
                    >
                      OD
                    </th>
                    <th
                      colSpan={3}
                      className="border border-[#c3c6d6] px-2 py-2"
                    >
                      OS
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-[#c3c6d6] px-2 py-2">
                      Distance
                    </th>
                    {["S", "C", "A", "S", "C", "A"].map((label, index) => (
                      <th
                        key={`${label}-${index}`}
                        className="border border-[#c3c6d6] px-2 py-2"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-primary/[0.04]">
                    <td className="border border-[#c3c6d6]">&nbsp;</td>
                    {(["refractionOD", "refractionOS"] as const).flatMap(
                      (eye) =>
                        refractionParts(form[eye]).map((value, index) => (
                          <td
                            key={`${eye}-${index}`}
                            className="border border-[#c3c6d6] px-2 py-2"
                          >
                            <Input
                              className={`${FIELD} text-center font-mono text-xs`}
                              value={value}
                              onChange={(event) =>
                                setForm((previous) => ({
                                  ...previous,
                                  [eye]: updateRefractionPart(
                                    previous[eye],
                                    index,
                                    event.target.value,
                                  ),
                                }))
                              }
                            />
                          </td>
                        )),
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Slit lamp + fundus */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-background rounded-lg border border-border/70">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Slit Lamp
                </p>
                <Textarea
                  className={`${FIELD} text-[13px] w-full resize-none min-h-[56px]`}
                  rows={3}
                  value={form.slitLamp}
                  onChange={set("slitLamp")}
                  placeholder="OD: ... OS: ..."
                />
              </div>
              <div className="p-3 bg-background rounded-lg border border-border/70">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Fundus
                </p>
                <Textarea
                  className={`${FIELD} text-[13px] w-full resize-none min-h-[56px]`}
                  rows={3}
                  value={form.fundus}
                  onChange={set("fundus")}
                  placeholder="OD: ... OS: ..."
                />
              </div>
            </div>
          </section>

          {/* Diagnosis + Reason */}
          <div className="grid grid-cols-2 gap-8">
            <section>
              <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">
                Diagnosis
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.diagnosisTags
                  .split(",")
                  .filter((t) => t.trim())
                  .map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                    >
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      {tag.trim()}
                    </span>
                  ))}
              </div>
              <Input
                className={`${FIELD} text-[11px] print:hidden border-b border-dotted border-border/70 w-full`}
                value={form.diagnosisTags}
                onChange={set("diagnosisTags")}
                placeholder="افصل التشخيصات بفاصلة: جلوكوما, قصر نظر"
              />
            </section>
            <section>
              <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">
                Reason for Referral
              </h3>
              <Textarea
                className={`${FIELD} text-[13px] italic bg-muted/40 p-3 rounded-lg w-full resize-none min-h-[70px]`}
                rows={3}
                value={form.reasonForReferral}
                onChange={set("reasonForReferral")}
                placeholder="سبب التحويل والإجراء المطلوب..."
              />
            </section>
          </div>

          {/* Referred To */}
          <section className="bg-primary/5 p-4 rounded-xl border border-primary/20">
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">
              Referred To
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-600 dark:text-slate-400 uppercase block">
                  Physician Name
                </label>
                <Input
                  className={`${FIELD} text-base font-bold`}
                  value={form.referredPhysician}
                  onChange={set("referredPhysician")}
                  placeholder="د. ..."
                />
                <Input
                  className={`${FIELD} text-[12px] text-slate-500 dark:text-slate-400`}
                  value={form.referredPhysicianTitle}
                  onChange={set("referredPhysicianTitle")}
                  placeholder="استشاري ..."
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 dark:text-slate-400 uppercase block">
                  Facility
                </label>
                <Input
                  className={`${FIELD} text-base font-bold`}
                  value={form.referredFacility}
                  onChange={set("referredFacility")}
                  placeholder="المستشفى / المركز"
                />
                <Input
                  className={`${FIELD} text-[12px] text-slate-500 dark:text-slate-400`}
                  value={form.referredDept}
                  onChange={set("referredDept")}
                  placeholder="القسم"
                />
              </div>
            </div>
          </section>

          {/* Signature footer */}
          <footer className="hidden">
            <div className="text-[13px] space-y-0.5">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                Referring Clinician / الطبيب المحوِّل
              </p>
              <Input
                className={`${FIELD} text-base font-bold`}
                value={form.physicianName}
                onChange={set("physicianName")}
                placeholder="د. ..."
              />
              <Input
                className={`${FIELD} text-[13px]`}
                value={form.physicianTitle}
                onChange={set("physicianTitle")}
                placeholder="استشاري طب وجراحة العيون"
              />
              <div
                className="flex items-center gap-1 text-muted-foreground/80"
                dir="ltr"
              >
                <span className="text-[11px]">License:</span>
                <Input
                  className={`${FIELD} text-[11px] w-32`}
                  value={form.physicianLicense}
                  onChange={set("physicianLicense")}
                  placeholder="MOH-EYE-0000"
                />
              </div>
            </div>
            <div className="text-center">
              <div className="w-48 h-16 border-b-2 border-foreground/80" />
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mt-1">
                Signature &amp; Stamp / التوقيع والختم
              </p>
            </div>
          </footer>
        </div>
      </ClinicalReportFrame>
    </fieldset>
  );

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap');

        .referral-print-root {
          font-family: 'Noto Sans Arabic', 'Inter', sans-serif;
        }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          .print-container {
              box-shadow: none !important; background-color: var(--card) !important;
              margin: 0 !important;
              width: 100% !important;
              min-height: 297mm !important;
              border: none !important;
          }
        }
      `}</style>

      <header
        className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-background border-b border-border/70"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-slate-600 dark:text-slate-400 hover:text-primary text-sm font-bold flex items-center gap-1"
            onClick={() => setLocation(-1 as any)}
          >
            <ArrowRight className="h-4 w-4" /> رجوع
          </button>
          <span className="text-base font-bold text-primary">
            خطاب إحالة / Referral Letter
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64 print:hidden">
            <PatientPicker
              initialPatientId={patientId}
              onSelect={(selected) => {
                if (selected?.id) setPatientId(Number(selected.id));
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-primary text-primary font-bold hover:bg-primary/10 gap-1.5"
            onClick={handleSave}
            disabled={saveLetterMutation.isPending}
          >
            <Save className="h-3.5 w-3.5" />{" "}
            {saveLetterMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-primary text-primary font-bold hover:bg-primary/10 gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" /> طباعة
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:opacity-90 text-white font-bold gap-1.5"
            onClick={handleDownloadPDF}
          >
            <Download className="h-3.5 w-3.5" /> Print PDF
          </Button>
        </div>
      </header>

      <main className="print:p-0 px-4 py-8">
        <div className="print:hidden">{renderBody()}</div>
        <div className="hidden print:block">{renderBody(true)}</div>
      </main>
    </div>
  );
}
