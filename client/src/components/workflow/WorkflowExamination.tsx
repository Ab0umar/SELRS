import { useEffect, useRef, useState } from "react";
import { Save, Search } from "lucide-react";
import { toast } from "sonner";
import { AssistantField } from "@/components/medical-assistant/AssistantFields";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import { Button } from "@/components/ui/button";
import { getTrpcErrorMessage } from "@/lib/utils";
import {
  CYLINDER_OPTIONS,
  SPHERE_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";
import { trpc } from "@/lib/trpc";
import { FundusDrawingCanvas } from "./FundusDrawingCanvas";
import { WorkflowCard } from "./workflowShared";

type Eye = "od" | "os";
type ExamForm = {
  externalPtosis: boolean;
  externalSquint: boolean;
  externalOthers: boolean;
  externalOthersNote: string;
  muscleNormal: boolean;
  muscleAbnormal: boolean;
  muscleAbnormalNote: string;
  otherAbnormalities: string;
  fundusNormal: boolean;
  fundusAbnormal: boolean;
  fundusAbnormalNote: string;
  complains: string;
};
type Refraction = Record<Eye, { s: string; c: string; axis: string; pd: string }>;

const emptyExam = (): ExamForm => ({
  externalPtosis: false,
  externalSquint: false,
  externalOthers: false,
  externalOthersNote: "",
  muscleNormal: false,
  muscleAbnormal: false,
  muscleAbnormalNote: "",
  otherAbnormalities: "",
  fundusNormal: false,
  fundusAbnormal: false,
  fundusAbnormalNote: "",
  complains: "",
});
const emptyRefraction = (): Refraction => ({
  od: { s: "", c: "", axis: "", pd: "" },
  os: { s: "", c: "", axis: "", pd: "" },
});

const SHEET_TYPE = "consultant" as const;
const underline =
  "h-6 flex-1 border-0 border-b border-[#c3c6d6] bg-transparent px-1 outline-none focus:border-[#003d9b]";
const cell = "border border-[#c3c6d6] p-1";
const axisInput =
  "w-full border-0 border-b border-solid border-[#737685] bg-transparent py-1 text-center text-sm focus:border-[#003d9b] focus:outline-none";

const parseSheet = (raw: unknown): any => {
  try {
    return raw ? JSON.parse(String(raw)) : {};
  } catch {
    return {};
  }
};

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-[#003d9b]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * Standalone examination section (complaint, external appearance, muscles, fundus,
 * fundus drawing, clinical refraction). It reads and writes the same consultant sheet
 * entry and refraction record as the legacy examination sheet, but only the fields
 * shown here; every other key in the stored sheet is preserved as it was.
 */
export default function WorkflowExamination({
  patientId,
  patientName,
  visitId,
}: {
  patientId: number;
  patientName?: string | null;
  visitId?: number;
}) {
  const utils = trpc.useUtils();
  const sheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, visitId, sheetType: SHEET_TYPE },
    { refetchOnWindowFocus: false },
  );
  const examsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const glassesQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const symptomsQuery = trpc.medical.getAllSymptoms.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
  });
  const saveSheet = trpc.medical.saveSheetEntry.useMutation();
  const saveRefraction = trpc.medical.saveRefractionToExamination.useMutation();
  const updateComplaint = trpc.medical.updateVisitChiefComplaint.useMutation();

  const [exam, setExam] = useState<ExamForm>(emptyExam);
  const [drawing, setDrawing] = useState("");
  const [reading, setReading] = useState("");
  const [refraction, setRefraction] = useState<Refraction>(emptyRefraction);
  const [bcva, setBcva] = useState<Record<Eye, string>>({ od: "", os: "" });
  const [symptomSearch, setSymptomSearch] = useState("");
  const [symptomOpen, setSymptomOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  const exams = (examsQuery.data ?? []) as any[];
  const examination = exams.find((row) => Number(row.visitId) === Number(visitId));
  const sheetRaw = sheetQuery.data;

  // Fill the form from stored data until the user starts editing.
  useEffect(() => {
    if (dirtyRef.current || !visitId) return;
    const sheet = parseSheet(sheetRaw);
    const visit = ((visitsQuery.data ?? []) as any[]).find(
      (row) => Number(row.id) === Number(visitId),
    );
    const savedForVisit =
      Number(sheet?.visitId) === Number(visitId) &&
      Object.prototype.hasOwnProperty.call(sheet?.consultantExam ?? {}, "complains");
    const next = { ...emptyExam(), ...(sheet?.consultantExam ?? {}) };
    if (!savedForVisit) next.complains = String(visit?.chiefComplaint ?? "").trim();
    setExam(next);
    setDrawing(String(sheet?.consultantDrawing ?? ""));
    setReading(String(sheet?.readingValue ?? ""));

    const glasses = ((glassesQuery.data ?? []) as any[]).find(
      (row) =>
        Number(row.visitId) === Number(visitId) ||
        Number(row.examinationId) === Number(examination?.id),
    );
    const autoref = ((autorefQuery.data ?? []) as any[]).find(
      (row) =>
        Number(row.visitId) === Number(visitId) ||
        Number(row.examinationId) === Number(examination?.id),
    );
    const sheetAuto = sheet?.examData?.autorefraction;
    setBcva({
      od: String(glasses?.bcvaOD || autoref?.bcvaOD || sheetAuto?.od?.bcva || ""),
      os: String(glasses?.bcvaOS || autoref?.bcvaOS || sheetAuto?.os?.bcva || ""),
    });
    if (glasses) {
      setRefraction({
        od: {
          s: String(glasses.sOD ?? ""),
          c: String(glasses.cOD ?? ""),
          axis: String(glasses.axisOD ?? ""),
          pd: String(glasses.pdOD ?? ""),
        },
        os: {
          s: String(glasses.sOS ?? ""),
          c: String(glasses.cOS ?? ""),
          axis: String(glasses.axisOS ?? ""),
          pd: String(glasses.pdOS ?? ""),
        },
      });
    }
  }, [
    visitId,
    sheetRaw,
    visitsQuery.data,
    glassesQuery.data,
    autorefQuery.data,
    examination?.id,
  ]);

  const edit = <T,>(setter: (updater: (current: T) => T) => void) =>
    (updater: (current: T) => T) => {
      dirtyRef.current = true;
      setter(updater);
    };
  const editExam = edit(setExam);
  const editRefraction = edit(setRefraction);
  const setExamField = <K extends keyof ExamForm>(field: K, value: ExamForm[K]) =>
    editExam((current) => ({ ...current, [field]: value }));
  const setRefractionField = (
    eye: Eye,
    field: "s" | "c" | "axis",
    value: string,
  ) =>
    editRefraction((current) => ({
      ...current,
      [eye]: { ...current[eye], [field]: value },
    }));

  const needle = symptomSearch.trim().toLowerCase();
  const symptomMatches = needle
    ? ((symptomsQuery.data ?? []) as any[])
        .filter((symptom) => String(symptom.name ?? "").toLowerCase().includes(needle))
        .slice(0, 50)
    : [];
  const selectSymptom = (name: string) => {
    setExamField("complains", exam.complains ? `${exam.complains}, ${name}` : name);
    setSymptomSearch("");
    setSymptomOpen(false);
  };

  const save = async () => {
    if (saving) return;
    if (!visitId) {
      toast.error("يجب اختيار زيارة موجودة قبل الحفظ");
      return;
    }
    if (!examination?.id) {
      toast.error("الزيارة المختارة لا تحتوي على فحص قياسات محفوظ");
      return;
    }
    setSaving(true);
    try {
      const existing = parseSheet(sheetRaw);
      const keep = (next: string, prev?: string) => (next.trim() ? next : prev);
      const autorefExisting = existing.examData?.autorefraction ?? {};
      await saveSheet.mutateAsync({
        patientId,
        visitId,
        sheetType: SHEET_TYPE,
        content: JSON.stringify({
          ...existing,
          visitId,
          consultantExam: exam,
          consultantDrawing: drawing,
          readingValue: reading,
          examData: {
            ...(existing.examData ?? {}),
            autorefraction: {
              od: { ...(autorefExisting.od ?? {}), bcva: keep(bcva.od, autorefExisting.od?.bcva) },
              os: { ...(autorefExisting.os ?? {}), bcva: keep(bcva.os, autorefExisting.os?.bcva) },
            },
          },
        }),
      });
      await updateComplaint.mutateAsync({
        visitId,
        chiefComplaint: exam.complains.trim(),
      });
      const side = (eye: Eye) => ({
        s: refraction[eye].s || undefined,
        c: refraction[eye].c || undefined,
        axis: refraction[eye].axis || undefined,
        pd: refraction[eye].pd || undefined,
        bcva: bcva[eye] || undefined,
      });
      await saveRefraction.mutateAsync({
        patientId,
        visitId,
        examinationId: examination.id,
        createVisitIfMissing: false,
        glassesData: { od: side("od"), os: side("os") },
      });
      dirtyRef.current = false;
      await Promise.all([
        utils.medical.getSheetEntry.invalidate(),
        utils.medical.getExaminationsByPatient.invalidate({ patientId }),
        utils.medical.getGlassesRecordsByPatient.invalidate({ patientId }),
        utils.medical.getAutorefractometryByPatient.invalidate({ patientId }),
        utils.medical.getVisitsByPatient.invalidate({ patientId }),
      ]);
      toast.success("تم الحفظ");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  const loading = sheetQuery.isLoading || examsQuery.isLoading;
  const loadFailed = sheetQuery.isError || examsQuery.isError;

  return (
    <WorkflowCard
      title={patientName}
      footer={
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-4 py-2.5">
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => void save()}
            disabled={saving || loading || loadFailed}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "حفظ…" : "حفظ الفحص"}
          </Button>
        </div>
      }
    >
      {loadFailed ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          تعذر تحميل بيانات الفحص. أعد تحميل الصفحة.
        </p>
      ) : loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          جارٍ تحميل بيانات الفحص...
        </p>
      ) : (
        <div className="flex flex-col gap-4 text-[#191c1e]" dir="ltr">
          <section
            className="mx-auto w-full max-w-4xl"
            data-purpose="clinical-refraction"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="min-w-[42px] text-xs font-medium">BCVA</span>
              {(["od", "os"] as const).map((eye, index) => (
                <span key={eye} className="flex items-center gap-2">
                  {index === 1 ? <span className="text-muted-foreground">/</span> : null}
                  <RefractionValueSelect
                    value={bcva[eye]}
                    onChange={(value) => {
                      dirtyRef.current = true;
                      setBcva((current) => ({ ...current, [eye]: value }));
                    }}
                    options={UCVA_BCVA_OPTIONS}
                    placeholder={eye.toUpperCase()}
                    aria-label={`BCVA ${eye.toUpperCase()}`}
                    triggerClassName="h-8 w-20 text-center font-mono text-xs"
                  />
                </span>
              ))}
              <span className="mx-2 h-6 border-l" />
              <label className="flex items-center gap-2 text-xs font-medium">
                PD
                <input
                  className="h-8 w-20 rounded border border-input bg-background px-2 text-center font-mono text-xs outline-none focus:border-[#003d9b]"
                  inputMode="decimal"
                  value={refraction.od.pd}
                  onChange={(event) => {
                    const pd = event.target.value;
                    editRefraction((current) => ({
                      od: { ...current.od, pd },
                      os: { ...current.os, pd },
                    }));
                  }}
                />
              </label>
            </div>
            <div
              role="region"
              aria-label="جدول بيانات"
              tabIndex={0}
              className="hidden overflow-x-auto md:block"
            >
              <table className="w-full min-w-[480px] table-fixed border-collapse text-center">
                <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                  <tr>
                    <th className={cell}>Refraction</th>
                    <th className={`${cell} text-[#003d9b]`} colSpan={3}>
                      OD (Right)
                    </th>
                    <th className={`${cell} text-[#526069]`} colSpan={3}>
                      OS (Left)
                    </th>
                  </tr>
                  <tr>
                    <th className={cell}>Distance</th>
                    {["S", "C", "A", "S", "C", "A"].map((heading, index) => (
                      <th key={index} className={cell}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr>
                    <td className={`${cell} bg-[#f3f4f6]`}>&nbsp;</td>
                    {(["od", "os"] as const).map((eye) => (
                      <FragmentCells
                        key={eye}
                        eye={eye}
                        value={refraction[eye]}
                        onChange={setRefractionField}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td className={`${cell} bg-[#f3f4f6] font-bold text-[#003d9b]`}>
                      Reading
                    </td>
                    <td className={cell} colSpan={6}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="whitespace-nowrap font-bold">Add +</span>
                        <input
                          className={`${axisInput} max-w-24`}
                          aria-label="Reading Add"
                          value={reading}
                          onChange={(event) => {
                            dirtyRef.current = true;
                            setReading(event.target.value);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {(["od", "os"] as const).map((eye) => (
                <div key={eye} className="rounded-lg border border-[#c3c6d6] p-2">
                  <div
                    className={`mb-1.5 text-xs font-bold ${
                      eye === "od" ? "text-[#003d9b]" : "text-[#526069]"
                    }`}
                  >
                    {eye === "od" ? "OD (Right)" : "OS (Left)"}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      S
                      <RefractionValueSelect
                        value={refraction[eye].s}
                        onChange={(next) => setRefractionField(eye, "s", next)}
                        options={SPHERE_OPTIONS}
                        aria-label={`Refraction ${eye.toUpperCase()} S`}
                        triggerClassName="h-9 w-full text-center font-mono text-xs"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      C
                      <RefractionValueSelect
                        value={refraction[eye].c}
                        onChange={(next) => setRefractionField(eye, "c", next)}
                        options={CYLINDER_OPTIONS}
                        aria-label={`Refraction ${eye.toUpperCase()} C`}
                        triggerClassName="h-9 w-full text-center font-mono text-xs"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      Axis
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background text-center font-mono text-xs"
                        aria-label={`Refraction ${eye.toUpperCase()} Axis`}
                        inputMode="numeric"
                        value={refraction[eye].axis}
                        onChange={(event) =>
                          setRefractionField(eye, "axis", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              <label className="flex items-center gap-2 rounded-lg border border-[#c3c6d6] p-2 text-xs font-bold">
                Reading Add +
                <input
                  className={`${axisInput} max-w-24`}
                  aria-label="Reading Add"
                  value={reading}
                  onChange={(event) => {
                    dirtyRef.current = true;
                    setReading(event.target.value);
                  }}
                />
              </label>
            </div>
          </section>

          <section
            className="flex flex-wrap items-stretch gap-2 rounded-xl border border-[#c3c6d6] bg-white p-4"
            data-purpose="clinical-diagrams"
          >
            <div className="relative flex min-h-[300px] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-lg sm:w-1/4">
              {(["od", "os"] as const).map((eye) => (
                <div
                  key={eye}
                  className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1"
                >
                  <div
                    className={`relative flex aspect-square w-full max-w-[150px] items-center justify-center rounded-full border-4 bg-white ${
                      eye === "od" ? "border-[#003d9b]/30" : "border-slate-300"
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <div className="w-full border-t border-slate-900" />
                      <div className="absolute top-0 h-full border-l border-slate-900" />
                    </div>
                    <div
                      className={`absolute flex h-9 w-9 -translate-y-1 items-center justify-center rounded-full border border-[#c98f4a]/60 bg-[#f4c98a] ${
                        eye === "od" ? "translate-x-3" : "-translate-x-3"
                      }`}
                    >
                      <div className="h-4 w-4 rounded-full border border-[#c98f4a]/50 bg-white" />
                    </div>
                  </div>
                  <span
                    className={`select-none text-xs font-bold ${
                      eye === "od" ? "text-[#003d9b]/70" : "text-slate-500"
                    }`}
                  >
                    {eye.toUpperCase()}
                  </span>
                </div>
              ))}
              <FundusDrawingCanvas
                value={drawing}
                onChange={(value) => {
                  dirtyRef.current = true;
                  setDrawing(value);
                }}
              />
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-[calc(75%-0.5rem)]">
              <div className="flex-1 rounded-lg border border-[#c3c6d6] bg-[#f8f9fb] px-3 pb-3 pt-0 text-left text-[12px] text-[#1f2937]">
                <p className="mb-2 text-[13px] font-bold text-[#003d9b]">Complains:</p>
                <AssistantField label="Complaints">
                  <textarea
                    aria-label="اكتب الشكوى يدويًا أو ابحث من الأعراض بالأسفل…"
                    data-medical-proposals="complaints symptoms"
                    className="min-h-[48px] w-full resize-none rounded-md border border-[#c3c6d6] bg-white px-2 py-1 text-[12px] outline-none focus:border-[#003d9b]"
                    value={exam.complains}
                    onChange={(event) => setExamField("complains", event.target.value)}
                    placeholder="اكتب الشكوى يدويًا أو ابحث من الأعراض بالأسفل…"
                  />
                </AssistantField>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    aria-label="ابحث عن الأعراض…"
                    className="h-8 w-full rounded-md border border-[#c3c6d6] bg-white pl-7 pr-2 text-[12px] outline-none focus:border-[#003d9b]"
                    placeholder="ابحث عن الأعراض…"
                    value={symptomSearch}
                    onChange={(event) => setSymptomSearch(event.target.value)}
                    onFocus={() => setSymptomOpen(true)}
                    onBlur={() => window.setTimeout(() => setSymptomOpen(false), 150)}
                  />
                  {symptomOpen && symptomSearch ? (
                    <div className="absolute z-10 mt-1 max-h-[160px] w-full overflow-y-auto rounded-md border border-[#c3c6d6] bg-white p-1 shadow-md">
                      {symptomsQuery.isLoading ? (
                        <p className="px-2 py-1 text-[11px] text-muted-foreground">
                          جاري التحميل...
                        </p>
                      ) : symptomMatches.length === 0 ? (
                        <p className="px-2 py-1 text-[11px] text-muted-foreground">
                          لا توجد نتائج
                        </p>
                      ) : (
                        symptomMatches.map((symptom) => (
                          <button
                            type="button"
                            key={symptom.id}
                            className="block w-full rounded px-2 py-1 text-left text-[12px] hover:bg-muted/60 focus-visible:border focus-visible:border-[#003d9b] focus:outline-none"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectSymptom(String(symptom.name ?? ""));
                            }}
                          >
                            {symptom.name}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex-[3] rounded-lg border border-[#c3c6d6] bg-[#f8f9fb] p-3 text-left text-[12px] text-[#1f2937]">
                <p className="mb-2 text-[13px] font-bold text-[#003d9b]">Examination:</p>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">1. External Apperance:</span>
                    <Check label="Ptosis" checked={exam.externalPtosis} onChange={(v) => setExamField("externalPtosis", v)} />
                    <Check label="Squint" checked={exam.externalSquint} onChange={(v) => setExamField("externalSquint", v)} />
                    <Check label="Others" checked={exam.externalOthers} onChange={(v) => setExamField("externalOthers", v)} />
                    <input
                      aria-label="External appearance note"
                      className={`${underline} min-w-[170px]`}
                      value={exam.externalOthersNote}
                      onChange={(event) => setExamField("externalOthersNote", event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">2. Muscle action:</span>
                    <Check label="Normal" checked={exam.muscleNormal} onChange={(v) => setExamField("muscleNormal", v)} />
                    <Check label="Abnormal" checked={exam.muscleAbnormal} onChange={(v) => setExamField("muscleAbnormal", v)} />
                    <input
                      aria-label="Muscle action note"
                      className={`${underline} min-w-[190px]`}
                      value={exam.muscleAbnormalNote}
                      onChange={(event) => setExamField("muscleAbnormalNote", event.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">3. Other abnormalities:</span>
                    <input
                      aria-label="Other abnormalities"
                      className={underline}
                      value={exam.otherAbnormalities}
                      onChange={(event) => setExamField("otherAbnormalities", event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#d9dce8] pt-2">
                    <span className="font-bold">Fundus:</span>
                    <Check label="Normal" checked={exam.fundusNormal} onChange={(v) => setExamField("fundusNormal", v)} />
                    <Check label="Abnormal" checked={exam.fundusAbnormal} onChange={(v) => setExamField("fundusAbnormal", v)} />
                    <input
                      aria-label="Fundus note"
                      className={`${underline} min-w-[220px]`}
                      value={exam.fundusAbnormalNote}
                      onChange={(event) => setExamField("fundusAbnormalNote", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </WorkflowCard>
  );
}

function FragmentCells({
  eye,
  value,
  onChange,
}: {
  eye: Eye;
  value: Refraction[Eye];
  onChange: (eye: Eye, field: "s" | "c" | "axis", next: string) => void;
}) {
  return (
    <>
      <td className={cell}>
        <RefractionValueSelect
          value={value.s}
          onChange={(next) => onChange(eye, "s", next)}
          options={SPHERE_OPTIONS}
          aria-label={`Refraction ${eye.toUpperCase()} S`}
          triggerClassName="h-8 border-0 text-center font-mono"
        />
      </td>
      <td className={cell}>
        <RefractionValueSelect
          value={value.c}
          onChange={(next) => onChange(eye, "c", next)}
          options={CYLINDER_OPTIONS}
          aria-label={`Refraction ${eye.toUpperCase()} C`}
          triggerClassName="h-8 border-0 text-center font-mono"
        />
      </td>
      <td className={cell}>
        <input
          className={axisInput}
          aria-label={`Refraction ${eye.toUpperCase()} Axis`}
          inputMode="numeric"
          value={value.axis}
          onChange={(event) => onChange(eye, "axis", event.target.value)}
        />
      </td>
    </>
  );
}
