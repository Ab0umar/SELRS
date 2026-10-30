import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  CYLINDER_OPTIONS,
  IOP_OPTIONS,
  SPHERE_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";
import { trpc } from "@/lib/trpc";

type Eye = "od" | "os";
type Refraction = { s: string; c: string; axis: string };
type MeasurementsForm = {
  autoref: Record<Eye, Refraction & { ucva: string }>;
  iop: Record<Eye, string>;
  after: Record<Eye, Refraction>;
};

const EYES: Eye[] = ["od", "os"];
const FINISH_ROLES = [
  "doctor",
  "nurse",
  "technician",
  "reception",
  "accountant",
  "manager",
  "admin",
];

const emptyForm = (): MeasurementsForm => ({
  autoref: {
    od: { s: "", c: "", axis: "", ucva: "" },
    os: { s: "", c: "", axis: "", ucva: "" },
  },
  iop: { od: "", os: "" },
  after: {
    od: { s: "", c: "", axis: "" },
    os: { s: "", c: "", axis: "" },
  },
});

/** "---" is the UI placeholder for an unset value; the API stores it as empty. */
const clean = (value: string | undefined | null) =>
  !value || value === "---" ? "" : value;
const orNull = (value: string | undefined | null) => clean(value) || null;
const cleanRefraction = (value: Refraction) => ({
  s: clean(value.s),
  c: clean(value.c),
  axis: clean(value.axis),
});

const isoDay = (value: unknown) =>
  value ? new Date(value as string).toISOString().split("T")[0] : "";

function buildForm(exam: any, autorefRecord: any, afterRecord: any): MeasurementsForm {
  const source = autorefRecord ?? exam;
  const eye = (suffix: "OD" | "OS") => ({
    s: source[`sphere${suffix}`] || "",
    c: source[`cylinder${suffix}`] || "",
    axis: source[`axis${suffix}`] || "",
    ucva: source[`ucva${suffix}`] || "",
  });
  const after = (suffix: "OD" | "OS") => ({
    s: afterRecord?.[`sphere${suffix}`] || "",
    c: afterRecord?.[`cylinder${suffix}`] || "",
    axis: afterRecord?.[`axis${suffix}`] || "",
  });
  return {
    autoref: { od: eye("OD"), os: eye("OS") },
    iop: {
      od: autorefRecord?.iopOD ?? exam.iopOD ?? "",
      os: autorefRecord?.iopOS ?? exam.iopOS ?? "",
    },
    after: { od: after("OD"), os: after("OS") },
  };
}

function RefractionTable({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Record<Eye, Refraction>;
  onChange: (eye: Eye, field: keyof Refraction, next: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h3>
      <div className="mx-auto hidden max-w-4xl overflow-hidden rounded-lg border md:block">
        <table
          className="w-full border-collapse text-center text-base"
          dir="ltr"
        >
          <thead className="bg-muted/50">
            <tr>
              {["Eye", "S", "C", "Axis"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="border px-2 py-1 text-[13px] font-semibold"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EYES.map((eye) => (
              <tr key={eye} className="hover:bg-muted/20">
                <td className="border px-2 py-1 text-[13px] font-bold">
                  {eye.toUpperCase()}
                </td>
                <td className="border px-1 py-1">
                  <RefractionValueSelect
                    value={value[eye].s}
                    onChange={(next) => onChange(eye, "s", next)}
                    options={SPHERE_OPTIONS}
                    aria-label={`${title} ${eye.toUpperCase()} S`}
                    triggerClassName="h-8 w-full border-input text-center text-[13px]"
                  />
                </td>
                <td className="border px-1 py-1">
                  <RefractionValueSelect
                    value={value[eye].c}
                    onChange={(next) => onChange(eye, "c", next)}
                    options={CYLINDER_OPTIONS}
                    aria-label={`${title} ${eye.toUpperCase()} C`}
                    triggerClassName="h-8 w-full border-input text-center text-[13px]"
                  />
                </td>
                <td className="border px-1 py-1">
                  <Input
                    value={value[eye].axis}
                    onChange={(event) => onChange(eye, "axis", event.target.value)}
                    aria-label={`${title} ${eye.toUpperCase()} Axis`}
                    inputMode="numeric"
                    className="h-8 w-full border-input text-center text-[13px]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden" dir="ltr">
        {EYES.map((eye) => (
          <div key={eye} className="rounded-lg border p-2">
            <div className="mb-1.5 text-xs font-semibold">
              {eye.toUpperCase()}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <label className="space-y-1 text-[11px] text-muted-foreground">
                S
                <RefractionValueSelect
                  value={value[eye].s}
                  onChange={(next) => onChange(eye, "s", next)}
                  options={SPHERE_OPTIONS}
                  aria-label={`${title} ${eye.toUpperCase()} S`}
                  triggerClassName="h-9 w-full border-input text-center text-xs"
                />
              </label>
              <label className="space-y-1 text-[11px] text-muted-foreground">
                C
                <RefractionValueSelect
                  value={value[eye].c}
                  onChange={(next) => onChange(eye, "c", next)}
                  options={CYLINDER_OPTIONS}
                  aria-label={`${title} ${eye.toUpperCase()} C`}
                  triggerClassName="h-9 w-full border-input text-center text-xs"
                />
              </label>
              <label className="space-y-1 text-[11px] text-muted-foreground">
                Axis
                <Input
                  value={value[eye].axis}
                  onChange={(event) =>
                    onChange(eye, "axis", event.target.value)
                  }
                  aria-label={`${title} ${eye.toUpperCase()} Axis`}
                  inputMode="numeric"
                  className="h-9 w-full border-input text-center text-xs"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Standalone measurements section (UCVA, IOP, AutoRef, After) for the day workflow.
 * Reads and writes the same records as MedicalFilePanel's measurement views, but only
 * the measurement fields, so saving here never rewrites reports, tests or prescriptions.
 */
export default function WorkflowMeasurements({
  patientId,
  patientName,
  hubVisitId,
  visitDate,
  onHubVisitIdChange,
  onSaved,
}: {
  patientId: number;
  patientName?: string | null;
  hubVisitId?: number;
  visitDate?: string;
  onHubVisitIdChange?: (visitId: number) => void;
  onSaved?: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const examsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const afterQuery = trpc.medical.getAfterRefractionByPatient.useQuery(
    { patientId },
    { refetchOnWindowFocus: false },
  );
  const saveVisitMutation = trpc.medical.saveMedicalVisit.useMutation();
  const updateExamMutation = trpc.medical.updateExamination.useMutation();
  const saveAfterMutation = trpc.medical.saveAfterRefractionData.useMutation();
  const finishMutation = trpc.medical.updateVisitQueueStatus.useMutation();

  const exams = (examsQuery.data ?? []) as any[];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<MeasurementsForm>(emptyForm);
  const [isFollowup, setIsFollowup] = useState(false);
  const [saving, setSaving] = useState<"save" | "finish" | null>(null);
  const dirtyRef = useRef(false);
  const hydratedForRef = useRef<number | null>(null);

  // Pick the examination of the requested visit (or of the visit date) once it is loaded.
  useEffect(() => {
    if (!exams.length) return;
    let match: any;
    if (hubVisitId != null && hubVisitId > 0) {
      match = exams.find((exam) => Number(exam.visitId) === hubVisitId);
    } else if (visitDate) {
      match = exams.find((exam) => isoDay(exam.createdAt) === visitDate);
    }
    if (!match?.id) return;
    setSelectedId((current) => (current === match.id ? current : match.id));
    const matchedVisitId = Number(match.visitId);
    if (
      Number.isFinite(matchedVisitId) &&
      matchedVisitId > 0 &&
      matchedVisitId !== hubVisitId
    ) {
      onHubVisitIdChange?.(matchedVisitId);
    }
  }, [exams, hubVisitId, visitDate, onHubVisitIdChange]);

  const selected = exams.find((exam) => exam.id === selectedId) ?? null;
  const autorefRecord = (autorefQuery.data as any[] | undefined)?.find(
    (record) => record.examinationId === selected?.id,
  );
  const afterRecord = (afterQuery.data as any[] | undefined)?.find(
    (record) => record.examinationId === selected?.id,
  );

  // Fill the form from stored data, but never overwrite what the user is typing.
  useEffect(() => {
    if (!selected) return;
    if (dirtyRef.current && hydratedForRef.current === selected.id) return;
    setForm(buildForm(selected, autorefRecord, afterRecord));
    hydratedForRef.current = selected.id;
    dirtyRef.current = false;
  }, [selected, autorefRecord, afterRecord]);

  const edit = (update: (current: MeasurementsForm) => MeasurementsForm) => {
    dirtyRef.current = true;
    setForm(update);
  };

  const selectExam = (examId: number) => {
    dirtyRef.current = false;
    setSelectedId(examId);
    const next = exams.find((exam) => Number(exam.id) === examId);
    const nextVisitId = Number(next?.visitId);
    if (Number.isFinite(nextVisitId) && nextVisitId > 0) {
      onHubVisitIdChange?.(nextVisitId);
    }
  };

  const refresh = () =>
    Promise.all([
      utils.medical.getExaminationsByPatient.invalidate({ patientId }),
      utils.medical.getAutorefractometryByPatient.invalidate({ patientId }),
      utils.medical.getAfterRefractionByPatient.invalidate({ patientId }),
      utils.medical.getGlassesRecordsByPatient.invalidate({ patientId }),
      utils.medical.getVisitsByPatient.invalidate({ patientId }),
    ]);

  const save = async (finish = false) => {
    if (saving) return;
    setSaving(finish ? "finish" : "save");
    try {
      let visitId: number | undefined = selected?.visitId
        ? Number(selected.visitId)
        : undefined;
      if (!selected) {
        const result: any = await saveVisitMutation.mutateAsync({
          patientId,
          visitDate,
          isFollowup,
          autoref: {
            od: cleanRefractionWithUcva(form.autoref.od),
            os: cleanRefractionWithUcva(form.autoref.os),
          },
          iop: { od: clean(form.iop.od), os: clean(form.iop.os) },
          after: {
            od: cleanRefraction(form.after.od),
            os: cleanRefraction(form.after.os),
          },
        });
        visitId = result?.visitId ?? undefined;
        if (!visitId) {
          toast.info("لا توجد قياسات للحفظ");
        } else {
          toast.success("تم حفظ الزيارة والبيانات الطبية بنجاح");
        }
      } else {
        const { od, os } = form.autoref;
        await updateExamMutation.mutateAsync({
          examinationId: selected.id,
          updates: {
            sphereOD: orNull(od.s),
            sphereOS: orNull(os.s),
            cylinderOD: orNull(od.c),
            cylinderOS: orNull(os.c),
            axisOD: orNull(od.axis),
            axisOS: orNull(os.axis),
            ucvaOD: orNull(od.ucva),
            ucvaOS: orNull(os.ucva),
            iopOD: orNull(form.iop.od),
            iopOS: orNull(form.iop.os),
          },
        });
        await saveAfterMutation.mutateAsync({
          examinationId: selected.id,
          patientId,
          od: cleanRefraction(form.after.od),
          os: cleanRefraction(form.after.os),
        });
        toast.success("تم حفظ البيانات بنجاح");
      }
      dirtyRef.current = false;
      await refresh();
      if (finish) {
        const finishVisitId = visitId ?? hubVisitId;
        if (!finishVisitId) throw new Error("تعذر تحديد الزيارة لإنهائها");
        await finishMutation.mutateAsync({
          visitId: finishVisitId,
          queueStatus: "treated",
        });
        await utils.medical.getTodayPatientsByQueueStatus.invalidate();
        toast.success("تم حفظ وإنهاء الزيارة");
      }
      await onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ القياسات",
      );
    } finally {
      setSaving(null);
    }
  };

  const loading =
    examsQuery.isLoading || autorefQuery.isLoading || afterQuery.isLoading;
  const loadFailed =
    examsQuery.isError || autorefQuery.isError || afterQuery.isError;
  const canFinish = FINISH_ROLES.includes(String(user?.role ?? ""));

  return (
    <div className="flex min-h-0 w-full flex-col rounded-lg border border-border/50 bg-background text-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="truncate text-sm font-semibold">
          {patientName || "بدون اسم"}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-2">
        <label className="inline-flex items-center gap-2 rounded-md border border-warning/60 px-2.5 py-1.5 text-xs font-semibold text-warning-text">
          <Checkbox
            checked={isFollowup}
            onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
            className="h-4 w-4"
          />
          متابعه
        </label>
        {exams.length > 0 ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">الفحص:</span>
            <Select
              value={String(selectedId ?? "")}
              onValueChange={(value) => selectExam(Number(value))}
            >
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue placeholder="اختر فحص" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={String(exam.id)}>
                    {new Date(exam.createdAt).toLocaleDateString("ar-EG")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="space-y-5 px-4 py-4" dir="rtl">
        {loadFailed ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            تعذر تحميل القياسات. أعد تحميل الصفحة.
          </p>
        ) : loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            جارٍ تحميل القياسات...
          </p>
        ) : (
          <>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                AutoRef | IOP
              </h3>
              <div
                className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
                dir="ltr"
              >
                <PairRow
                  label="UCVA"
                  options={UCVA_BCVA_OPTIONS}
                  values={{ od: form.autoref.od.ucva, os: form.autoref.os.ucva }}
                  onChange={(eye, next) =>
                    edit((current) => ({
                      ...current,
                      autoref: {
                        ...current.autoref,
                        [eye]: { ...current.autoref[eye], ucva: next },
                      },
                    }))
                  }
                />
                <PairRow
                  label="IOP"
                  options={IOP_OPTIONS}
                  values={form.iop}
                  onChange={(eye, next) =>
                    edit((current) => ({
                      ...current,
                      iop: { ...current.iop, [eye]: next },
                    }))
                  }
                />
              </div>
              <RefractionTable
                title="AutoRef"
                value={form.autoref}
                onChange={(eye, field, next) =>
                  edit((current) => ({
                    ...current,
                    autoref: {
                      ...current.autoref,
                      [eye]: { ...current.autoref[eye], [field]: next },
                    },
                  }))
                }
              />
            </div>
            <RefractionTable
              title="After Refraction"
              value={form.after}
              onChange={(eye, field, next) =>
                edit((current) => ({
                  ...current,
                  after: {
                    ...current.after,
                    [eye]: { ...current.after[eye], [field]: next },
                  },
                }))
              }
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-4 py-2.5">
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => void save(false)}
          disabled={Boolean(saving) || loading || loadFailed}
        >
          <Save className="h-3.5 w-3.5" />
          {saving === "save" ? "جاري الحفظ…" : "حفظ"}
        </Button>
        {canFinish ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => void save(true)}
            disabled={Boolean(saving) || loading || loadFailed}
          >
            <Save className="h-3.5 w-3.5" />
            {saving === "finish" ? "جاري حفظ وإنهاء الزيارة…" : "حفظ وإنهاء الزيارة"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function cleanRefractionWithUcva(value: MeasurementsForm["autoref"][Eye]) {
  return { ...cleanRefraction(value), ucva: clean(value.ucva) };
}

function PairRow({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: Record<Eye, string>;
  onChange: (eye: Eye, next: string) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
      <label className="text-xs font-medium">{label}</label>
      <RefractionValueSelect
        value={values.od}
        onChange={(next) => onChange("od", next)}
        options={options}
        placeholder="OD"
        aria-label={`${label} OD`}
        triggerClassName="h-8 w-full min-w-0 text-center text-sm"
      />
      <span className="text-muted-foreground">/</span>
      <RefractionValueSelect
        value={values.os}
        onChange={(next) => onChange("os", next)}
        options={options}
        placeholder="OS"
        aria-label={`${label} OS`}
        triggerClassName="h-8 w-full min-w-0 text-center text-sm"
      />
    </div>
  );
}
