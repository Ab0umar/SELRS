import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAssistantForm } from "./AssistantFields";
import PrescriptionTemplateReview from "./PrescriptionTemplateReview";
import {
  applyProposal,
  undoProposal,
  type AppliedText,
} from "./form-application";
import {
  medicalProposalLabels,
  type MedicalTranscript,
  type MedicalProposals,
} from "@shared/medical-assistant";

export default function ProposalReview({
  input,
  onApplyField,
  reviewOnly = false,
}: {
  input: MedicalTranscript;
  onApplyField?: (text: string | undefined) => void;
  reviewOnly?: boolean;
}) {
  const start = trpc.medicalAssistant.startProposals.useMutation({
    retry: false,
  });
  const read = trpc.medicalAssistant.readProposals.useMutation({
    retry: false,
  });
  const [consent, setConsent] = useState(false);
  const options = trpc.medicalAssistant.providerOptions.useQuery(undefined, {
    retry: false,
  });
  const [engine, setEngine] = useState<"current" | "central">("current");
  const [jobId, setJobId] = useState<string>();
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<MedicalProposals>();
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const form = useAssistantForm();
  const [applied, setApplied] = useState<Record<string, AppliedText>>({});
  const alive = useRef(true);
  const readTask = read.mutateAsync;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!jobId || paused || result) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await readTask({ jobId });
        if (canceled) return;
        if (response.status === "complete") setResult(response.result);
        else if (response.status === "failed") {
          setError(response.message);
          setPaused(true);
        } else timer = setTimeout(poll, 2500);
      } catch (cause) {
        if (!canceled) {
          setError(
            cause instanceof Error ? cause.message : "Could not check Manus.",
          );
          setPaused(true);
        }
      }
    };
    void poll();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [jobId, paused, result, readTask]);

  return (
    <section
      className="space-y-3 rounded border p-3"
      aria-label="Manus proposal review"
    >
      <p className="text-sm">
        {input.kind === "field"
          ? `AI scope: ${input.label} only.`
          : "AI scope: full visit, all relevant clinical fields."}{" "}
        {engine === "central"
          ? `Central Manus (${options.data?.central?.model ?? "lite"})`
          : "Manus Lite"}{" "}
        · No automatic saving.
      </p>
      {!jobId && (
        <>
          {options.data?.central?.enabled && (
            <label className="block space-y-2 text-sm">
              {reviewOnly ? "محرك المعالجة" : "Processing engine"}
              <select
                className="block min-h-11 rounded-md border bg-background px-3"
                value={engine}
                disabled={start.isPending}
                onChange={(event) => {
                  setEngine(event.target.value as typeof engine);
                  setConsent(false);
                }}
              >
                <option value="current">
                  {reviewOnly
                    ? "المسار الحالي: Manus Lite"
                    : "Current Manus Lite"}
                </option>
                <option value="central">
                  Central Manus ({options.data.central.model}) · managed limits
                </option>
              </select>
            </label>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              disabled={start.isPending}
              onChange={(event) => setConsent(event.target.checked)}
            />
            {reviewOnly
              ? "حصلت على موافقة صاحب البيانات، وراجعت النص قبل إرساله إلى Manus. قد تستهلك المعالجة رصيد المزوّد."
              : "Patient consent obtained. Send this reviewed transcript to Manus for AI processing; provider credits may be consumed."}
          </label>
          <Button
            type="button"
            disabled={!consent || start.isPending || !input.transcript.trim()}
            onClick={async () => {
              setError("");
              try {
                const response = await start.mutateAsync({
                  recording: input,
                  consentConfirmed: true,
                  engine,
                });
                if (alive.current) setJobId(response.jobId);
              } catch (cause) {
                if (alive.current)
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not start Manus.",
                  );
              }
            }}
          >
            {reviewOnly
              ? start.isPending
                ? "جارٍ بدء المعالجة…"
                : "إنشاء اقتراحات للمراجعة"
              : start.isPending
                ? "Starting Manus…"
                : "Generate proposals"}
          </Button>
        </>
      )}
      {jobId && !result && !paused && (
        <p role="status">
          Manus is processing. Closing this window does not cancel the provider
          task or its credits. Nothing will be applied automatically. Local task
          access expires after ten minutes or a server restart.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {copyMessage && <p role="status">{copyMessage}</p>}
      {jobId && paused && !result && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError("");
            setPaused(false);
          }}
        >
          {reviewOnly ? "متابعة نفس المهمة" : "Check same task again"}
        </Button>
      )}
      {result && (
        <>
          {result.warnings.map((warning, index) => (
            <p key={index} role="note" dir="auto">
              {warning}
            </p>
          ))}
          {!result.proposals.length && (
            <p>No supported field changes were found. Review the transcript.</p>
          )}
          {result.proposals.map((proposal) => (
            <div key={proposal.field} className="space-y-2 rounded border p-3">
              <p className="font-medium">
                {input.kind === "field"
                  ? input.label
                  : medicalProposalLabels[proposal.field]}
              </p>
              <p className="text-sm">
                Reported speaker: {proposal.speaker} · Doctor review required
              </p>
              <Textarea
                aria-label={`Proposal: ${proposal.field}`}
                style={reviewOnly ? { maxWidth: "none" } : undefined}
                dir="auto"
                value={proposal.text}
                onChange={(event) => {
                  setCopyMessage("");
                  onApplyField?.(undefined);
                  const text = event.target.value;
                  setResult((previous) =>
                    previous
                      ? {
                          ...previous,
                          proposals: previous.proposals.map((item) =>
                            item.field === proposal.field
                              ? { ...item, text }
                              : item,
                          ),
                        }
                      : previous,
                  );
                }}
              />
              <details>
                <summary>
                  {reviewOnly
                    ? "الاقتباسات من النص الأصلي"
                    : "Transcript evidence"}
                </summary>
                {proposal.sources.map((source, index) => (
                  <p key={index} dir="auto">
                    {source}
                  </p>
                ))}
              </details>
              {reviewOnly && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!proposal.text.trim()}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(proposal.text);
                      setCopyMessage("تم نسخ النص المُراجع");
                    } catch {
                      setError("تعذر النسخ؛ يمكنك تحديد النص ونسخه يدويًا.");
                    }
                  }}
                >
                  نسخ النص المُراجع
                </Button>
              )}
              {!reviewOnly && input.kind === "field" && onApplyField && (
                <Button
                  type="button"
                  disabled={!proposal.text.trim()}
                  onClick={() => onApplyField(proposal.text)}
                >
                  Approve proposal for this field
                </Button>
              )}
              {!reviewOnly &&
                input.kind === "conversation" &&
                proposal.field === "treatment" && (
                  <PrescriptionTemplateReview text={proposal.text} />
                )}
              {!reviewOnly &&
                input.kind === "conversation" &&
                proposal.field !== "treatment" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={form?.disabled || !proposal.text.trim()}
                    onClick={() => {
                      try {
                        const root = form?.root.current;
                        if (!root || form?.disabled)
                          throw new Error("The form is no longer available.");
                        if (applied[proposal.field]) {
                          undoProposal(root, applied[proposal.field]);
                          setApplied((previous) => {
                            const next = { ...previous };
                            delete next[proposal.field];
                            return next;
                          });
                        } else {
                          const receipt = applyProposal(
                            root,
                            proposal.field,
                            proposal.text,
                          );
                          setApplied((previous) => ({
                            ...previous,
                            [proposal.field]: receipt,
                          }));
                        }
                        setError("");
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "Could not update the draft.",
                        );
                      }
                    }}
                  >
                    {applied[proposal.field]
                      ? "Undo draft addition"
                      : "Append to open form"}
                  </Button>
                )}
            </div>
          ))}
          {!reviewOnly && input.kind === "conversation" && (
            <p className="text-sm">
              Apply supports mapped text fields in the open section only.
              Existing text is preserved; use the form’s Save button after
              review. History and test catalogs remain review-only. Prescription
              templates require separate confirmation.
            </p>
          )}
        </>
      )}
    </section>
  );
}
