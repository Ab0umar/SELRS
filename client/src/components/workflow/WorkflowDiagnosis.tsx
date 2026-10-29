import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { DiagnosisImagesPanel } from "@/components/patient-details/DiagnosisImagesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  WorkflowCard,
  WorkflowSaveBar,
  useFinishVisit,
} from "./workflowShared";

type Disease = { id: number; name: string };
const MAX_RESULTS = 50;

const parseDiseaseIds = (raw: unknown): number[] => {
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Standalone diagnosis section (diagnosis, diseases, recommendations, diagnosis images).
 * It writes only the doctor report fields it shows, so saving here never rewrites
 * measurements, pentacam, tests or prescriptions.
 */
export default function WorkflowDiagnosis({
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
  const reportQuery = trpc.medical.getDoctorReportsByVisit.useQuery(
    { visitId: hubVisitId ?? 0 },
    { enabled: Boolean(hubVisitId), refetchOnWindowFocus: false },
  );
  const diseasesQuery = trpc.medical.getAllDiseases.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
  });
  const createReport = trpc.medical.createDoctorReport.useMutation();
  const updateReport = trpc.medical.updateDoctorReport.useMutation();
  const saveVisit = trpc.medical.saveMedicalVisit.useMutation();
  const finishVisit = useFinishVisit();

  const [diagnosis, setDiagnosis] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [diseaseIds, setDiseaseIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<"save" | "finish" | null>(null);
  const dirtyRef = useRef(false);

  const report = (reportQuery.data as any[] | undefined)?.[0];
  useEffect(() => {
    if (dirtyRef.current) return;
    setDiagnosis(report?.diagnosis || "");
    setRecommendations(report?.recommendations || "");
    setDiseaseIds(parseDiseaseIds(report?.additionalNotes));
  }, [report]);

  const diseases = (diseasesQuery.data ?? []) as Disease[];
  const needle = search.trim().toLowerCase();
  const matches = needle
    ? diseases
        .filter((disease) => disease.name.toLowerCase().includes(needle))
        .slice(0, MAX_RESULTS)
    : [];

  const addDisease = (disease: Disease) => {
    dirtyRef.current = true;
    setDiagnosis((current) =>
      current ? `${current}, ${disease.name}` : disease.name,
    );
    setDiseaseIds((current) =>
      current.includes(disease.id) ? current : [...current, disease.id],
    );
    setSearch("");
  };

  const save = async (finish: boolean) => {
    if (saving) return;
    setSaving(finish ? "finish" : "save");
    try {
      let visitId = hubVisitId;
      const additionalNotes = JSON.stringify(diseaseIds);
      const hasContent = Boolean(
        diagnosis.trim() || recommendations.trim() || diseaseIds.length,
      );
      if (!visitId) {
        const result: any = await saveVisit.mutateAsync({
          patientId,
          visitDate,
          diagnosis,
          diseases: additionalNotes,
          recommendations,
        });
        visitId = result?.visitId ?? undefined;
        if (visitId) onHubVisitIdChange?.(visitId);
        toast[visitId ? "success" : "info"](
          visitId ? "تم حفظ الزيارة والتشخيص بنجاح" : "لا يوجد تشخيص للحفظ",
        );
      } else if (report?.id) {
        await updateReport.mutateAsync({
          reportId: report.id,
          diagnosis,
          additionalNotes,
          recommendations,
        });
        toast.success("تم حفظ التقرير بنجاح");
      } else if (hasContent) {
        await createReport.mutateAsync({
          visitId,
          patientId,
          diagnosis: diagnosis || "No diagnosis entered",
          additionalNotes,
          recommendations,
        });
        toast.success("تم حفظ التقرير بنجاح");
      } else {
        toast.info("لا يوجد تشخيص للحفظ");
      }
      dirtyRef.current = false;
      if (visitId) {
        await utils.medical.getDoctorReportsByVisit.invalidate({ visitId });
      }
      if (finish) await finishVisit(visitId);
      await onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ التشخيص");
    } finally {
      setSaving(null);
    }
  };

  const loadFailed = reportQuery.isError;
  const textField =
    "w-full rounded-md border-border bg-background px-2 py-1 !text-[12px]";

  return (
    <WorkflowCard
      title={patientName}
      footer={
        <WorkflowSaveBar
          saving={saving}
          disabled={reportQuery.isLoading || loadFailed}
          onSave={(finish) => void save(finish)}
        />
      }
    >
      {loadFailed ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          تعذر تحميل التقرير. أعد تحميل الصفحة.
        </p>
      ) : reportQuery.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          جارٍ تحميل التقرير...
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div
            className="flex flex-col rounded-lg border border-border/60 bg-muted/30 px-3 pb-3 pt-0 text-left text-foreground"
            dir="ltr"
          >
            <p className="mb-2 !text-[13px] font-bold text-primary">Diagnosis:</p>
            <Textarea
              aria-label="اكتب التشخيص يدويًا أو ابحث بالأسفل…"
              data-medical-proposals="diagnosis"
              value={diagnosis}
              onChange={(event) => {
                dirtyRef.current = true;
                setDiagnosis(event.target.value);
              }}
              placeholder="اكتب التشخيص يدويًا أو ابحث بالأسفل…"
              className={`min-h-[48px] ${textField}`}
              rows={2}
            />
            <div className="relative mt-2 w-full">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="ابحث عن التشخيص…"
                placeholder="ابحث عن التشخيص…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 w-full rounded-md border-border bg-background pl-7 pr-2 !text-[12px]"
              />
            </div>
            {search ? (
              diseasesQuery.isLoading ? (
                <p className="mt-1 text-xs text-muted-foreground">جاري التحميل...</p>
              ) : diseasesQuery.isError ? (
                <p className="mt-1 text-xs text-destructive">خطأ في تحميل الأمراض</p>
              ) : (
                <div className="mt-2 max-h-[160px] space-y-1 overflow-y-auto rounded-md border p-1.5">
                  {matches.length === 0 ? (
                    <p className="px-1.5 text-xs text-muted-foreground">لا توجد نتائج</p>
                  ) : (
                    matches.map((disease) => (
                      <Button
                        variant="bare"
                        type="button"
                        key={disease.id}
                        className="block w-full rounded px-1.5 py-1 text-left text-xs hover:bg-muted/50"
                        onClick={() => addDisease(disease)}
                      >
                        {disease.name}
                      </Button>
                    ))
                  )}
                </div>
              )
            ) : null}
          </div>

          <div
            className="flex flex-col rounded-lg border border-border/60 bg-muted/30 px-3 pb-3 pt-0 text-left text-foreground"
            dir="ltr"
          >
            <p className="mb-2 !text-[13px] font-bold text-primary">
              Recommendations:
            </p>
            <Textarea
              aria-label="اكتب التوصيات هنا…"
              data-medical-proposals="decision"
              value={recommendations}
              onChange={(event) => {
                dirtyRef.current = true;
                setRecommendations(event.target.value);
              }}
              placeholder="اكتب التوصيات هنا…"
              className={`min-h-[48px] flex-1 ${textField}`}
              rows={2}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/60 p-3">
        <p className="mb-3 block text-sm font-semibold">صور التشخيص</p>
        <DiagnosisImagesPanel patientId={patientId} />
      </div>
    </WorkflowCard>
  );
}
