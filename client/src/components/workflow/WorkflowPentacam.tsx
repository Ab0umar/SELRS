import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  WorkflowCard,
  WorkflowSaveBar,
  useFinishVisit,
} from "./workflowShared";

type Eye = "od" | "os";
const FIELDS = [
  "k1",
  "k2",
  "axis",
  "thinnest",
  "apex",
  "residual",
  "ttt",
  "ablation",
] as const;
type Field = (typeof FIELDS)[number];
type PentacamForm = Record<Eye, Record<Field, string>>;

const HEADINGS: Record<Field, string> = {
  k1: "K1",
  k2: "K2",
  axis: "Axis",
  thinnest: "Thinnest",
  apex: "Apex",
  residual: "Residual",
  ttt: "TTT",
  ablation: "Ablation",
};

const emptyEye = (): Record<Field, string> => ({
  k1: "",
  k2: "",
  axis: "",
  thinnest: "",
  apex: "",
  residual: "",
  ttt: "",
  ablation: "",
});
const emptyForm = (): PentacamForm => ({ od: emptyEye(), os: emptyEye() });

/** Stored column names differ from the form keys only for "thinnest". */
const column = (field: Field, eye: Eye) =>
  `${field === "thinnest" ? "thinnestPoint" : field}${eye.toUpperCase()}`;

const fromRecord = (record: any): PentacamForm => {
  const form = emptyForm();
  for (const eye of ["od", "os"] as const) {
    for (const field of FIELDS) {
      form[eye][field] = record?.[column(field, eye)] || "";
    }
  }
  return form;
};

const toPayload = (form: PentacamForm) => {
  const payload: Record<string, string> = {};
  for (const eye of ["od", "os"] as const) {
    for (const field of FIELDS) {
      payload[column(field, eye)] = String(form[eye][field] || "");
    }
  }
  return payload;
};

/**
 * Standalone Pentacam section. Reads and writes the visit's pentacam result only.
 */
export default function WorkflowPentacam({
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
  const utils = trpc.useUtils();
  const query = trpc.medical.getPentacamResultsByVisit.useQuery(
    { visitId: hubVisitId ?? 0 },
    { enabled: Boolean(hubVisitId), refetchOnWindowFocus: false },
  );
  const updateResult = trpc.medical.updatePentacamResult.useMutation();
  const saveVisit = trpc.medical.saveMedicalVisit.useMutation();
  const finishVisit = useFinishVisit();

  const [form, setForm] = useState<PentacamForm>(emptyForm);
  const [saving, setSaving] = useState<"save" | "finish" | null>(null);
  const dirtyRef = useRef(false);

  const record = (query.data as any[] | undefined)?.[0];
  useEffect(() => {
    if (dirtyRef.current) return;
    setForm(fromRecord(record));
  }, [record]);

  const hasValues = (value: PentacamForm) =>
    (["od", "os"] as const).some((eye) =>
      FIELDS.some((field) => Boolean(value[eye][field])),
    );

  const edit = (eye: Eye, field: Field, next: string) => {
    dirtyRef.current = true;
    setForm((current) => ({
      ...current,
      [eye]: { ...current[eye], [field]: next },
    }));
  };

  const save = async (finish: boolean) => {
    if (saving) return;
    setSaving(finish ? "finish" : "save");
    try {
      let visitId = hubVisitId;
      if (!hasValues(form)) {
        toast.info("لا توجد بيانات Pentacam للحفظ");
      } else if (!visitId) {
        const result: any = await saveVisit.mutateAsync({
          patientId,
          visitDate,
          pentacam: form,
        });
        visitId = result?.visitId ?? undefined;
        if (visitId) onHubVisitIdChange?.(visitId);
        toast.success("تم حفظ بيانات البنتاكام بنجاح");
      } else {
        await updateResult.mutateAsync({
          visitId,
          patientId,
          pentacamId: record?.id,
          ...toPayload(form),
        });
        toast.success("تم حفظ بيانات البنتاكام بنجاح");
      }
      dirtyRef.current = false;
      if (visitId) {
        await utils.medical.getPentacamResultsByVisit.invalidate({ visitId });
      }
      if (finish) await finishVisit(visitId);
      await onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ بيانات Pentacam",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <WorkflowCard
      title={patientName}
      footer={
        <WorkflowSaveBar
          saving={saving}
          disabled={query.isLoading || query.isError}
          onSave={(finish) => void save(finish)}
        />
      }
    >
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        Pentacam
      </h3>
      {query.isError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          تعذر تحميل بيانات Pentacam. أعد تحميل الصفحة.
        </p>
      ) : query.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          جارٍ تحميل بيانات Pentacam...
        </p>
      ) : (
        <>
          <div className="mx-auto hidden max-w-4xl overflow-hidden rounded-lg border md:block">
            <table
              className="w-full border-collapse text-center text-base"
              dir="ltr"
            >
              <thead className="bg-muted/50 text-[13px] uppercase text-muted-foreground">
                <tr>
                  <th className="border px-2 py-2">Eye</th>
                  {FIELDS.map((field) => (
                    <th key={field} className="border px-2 py-2">
                      {HEADINGS[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["od", "os"] as const).map((eye) => (
                  <tr key={eye} className="hover:bg-muted/20">
                    <td className="border px-2 py-2 font-bold">
                      {eye.toUpperCase()}
                    </td>
                    {FIELDS.map((field) => (
                      <td key={field} className="border px-1 py-1">
                        <Input
                          type="number"
                          aria-label={`${eye.toUpperCase()} ${HEADINGS[field]}`}
                          value={form[eye][field]}
                          onChange={(event) => edit(eye, field, event.target.value)}
                          placeholder="—"
                          className="h-8 border-input px-2 text-center text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden" dir="ltr">
            {(["od", "os"] as const).map((eye) => (
              <div key={eye} className="rounded-lg border p-2">
                <div className="mb-1.5 text-xs font-semibold">
                  {eye.toUpperCase()}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {FIELDS.map((field) => (
                    <Input
                      key={field}
                      type="number"
                      aria-label={`${eye.toUpperCase()} ${HEADINGS[field]}`}
                      value={form[eye][field]}
                      onChange={(event) => edit(eye, field, event.target.value)}
                      placeholder={HEADINGS[field]}
                      className="h-9 border-input text-center text-xs"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </WorkflowCard>
  );
}
