import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAssistantForm } from "./AssistantFields";
import MedicationCatalogReview from "./MedicationCatalogReview";
import TestCatalogReview from "./TestCatalogReview";
import { normalizeTemplateName } from "./prescription-template";
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
  modelChoice,
}: {
  input: MedicalTranscript;
  onApplyField?: (text: string | undefined) => void;
  reviewOnly?: boolean;
  modelChoice?: string;
}) {
  const start = trpc.medicalAssistant.startProposals.useMutation({
    retry: false,
  });
  const read = trpc.medicalAssistant.readProposals.useMutation({
    retry: false,
  });
  const [consent, setConsent] = useState(false);
  const settings = trpc.medicalAssistant.settings.useQuery(undefined, {
    retry: false,
  });
  const options = trpc.medicalAssistant.providerOptions.useQuery(undefined, {
    retry: false,
  });
  const managed =
    options.data?.managementEnabled || options.data?.central != null;
  const engine = managed ? "central" : "current";
  const available =
    settings.isSuccess &&
    options.isSuccess &&
    (!managed || options.data?.central?.enabled === true);
  const [selection] = useState(
    modelChoice
      ? modelChoice.includes(":")
        ? modelChoice
        : `manus:${modelChoice}`
      : "manus:lite",
  );
  const savedSelection = settings.data?.processingModel ?? selection;
  const [submittedSelection, setSubmittedSelection] = useState<string>();
  const effectiveSelection =
    managed && options.data?.central?.provider && options.data.central.model
      ? `${options.data.central.provider}:${options.data.central.model}`
      : savedSelection;
  const displayedSelection = submittedSelection ?? effectiveSelection;
  const provider = displayedSelection.startsWith("gemini:")
    ? "gemini"
    : "manus";
  const providerName = provider === "gemini" ? "Gemini" : "Manus";
  const model = displayedSelection.slice(provider.length + 1);
  useEffect(() => {
    setConsent(false);
  }, [effectiveSelection]);
  const [jobId, setJobId] = useState<string>();
  const [paused, setPaused] = useState(false);
  const [terminalFailure, setTerminalFailure] = useState(false);
  const [result, setResult] = useState<MedicalProposals>();
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const form = useAssistantForm();
  const [confirmedDiagnosis, setConfirmedDiagnosis] = useState("");
  const diagnosisText =
    result?.proposals.find((item) => item.field === "diagnosis")?.text ?? "";
  const diseases = trpc.medical.getAllDiseases.useQuery(undefined, {
    enabled:
      !reviewOnly && input.kind === "conversation" && Boolean(diagnosisText),
    refetchOnWindowFocus: false,
  });
  const knownDiagnosis =
    Boolean(diagnosisText.trim()) &&
    (diseases.data ?? []).filter(
      (item: { name: string; abbrev?: string | null }) =>
        [item.name, item.abbrev].some(
          (name) =>
            name &&
            normalizeTemplateName(name) ===
              normalizeTemplateName(diagnosisText),
        ),
    ).length === 1;
  const diagnosisPending =
    Boolean(diagnosisText.trim()) &&
    !knownDiagnosis &&
    confirmedDiagnosis !== diagnosisText;
  const [applied, setApplied] = useState<Record<string, AppliedText>>({});
  const autoApplied = useRef(false);
  const draftSignature = useRef("");
  const [draftReceipt, setDraftReceipt] = useState<{
    skipped: string[];
    undo: () => void;
  }>();
  const narrativeProposals = (proposals: MedicalProposals["proposals"]) =>
    proposals.filter(
      (item) =>
        !(item.field === "diagnosis" && diagnosisPending) &&
        (!form?.getTests?.() || !["labs", "imaging"].includes(item.field)),
    );
  useEffect(() => {
    if (
      autoApplied.current ||
      !result ||
      reviewOnly ||
      input.kind !== "conversation" ||
      !form?.fillDraft ||
      form.disabled ||
      (Boolean(diagnosisText) && diseases.isLoading)
    )
      return;
    autoApplied.current = true;
    try {
      setDraftReceipt(form.fillDraft(narrativeProposals(result.proposals)));
      draftSignature.current = JSON.stringify(result.proposals);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "تعذّرت تعبئة المسودة.",
      );
    }
  }, [
    result,
    reviewOnly,
    input.kind,
    form,
    diseases.isLoading,
    diagnosisPending,
  ]);
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
          setTerminalFailure(true);
          setError(response.message);
          setPaused(true);
        } else timer = setTimeout(poll, 2500);
      } catch (cause) {
        if (!canceled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not check the AI task.",
          );
          if ((cause as { data?: { code?: string } })?.data?.code === "NOT_FOUND")
            setTerminalFailure(true);
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
      aria-label="AI proposal review"
    >
      <p className="text-sm">
        {input.kind === "field"
          ? `AI scope: ${input.label} only.`
          : "AI scope: full visit, all relevant clinical fields."}{" "}
        {`${providerName} ${model}`} · No automatic saving.
      </p>
      {!jobId && (
        <>
          <p className="text-sm text-muted-foreground">
            مزوّد المعالجة محدد من إعدادات الأدمن المركزية.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              disabled={start.isPending}
              onChange={(event) => setConsent(event.target.checked)}
            />
            {reviewOnly
              ? `حصلت على موافقة صاحب البيانات، وراجعت النص قبل إرساله إلى ${providerName}. قد تستهلك المعالجة رصيد المزوّد.`
              : `Patient consent obtained. Send this reviewed transcript to ${providerName} for AI processing; provider credits may be consumed.`}
          </label>
          <Button
            type="button"
            disabled={
              !available ||
              !consent ||
              start.isPending ||
              !input.transcript.trim()
            }
            onClick={async () => {
              setError("");
              try {
                const response = await start.mutateAsync({
                  recording: input,
                  consentConfirmed: true,
                  engine,
                  model,
                  provider,
                });
                if (alive.current) {
                  setSubmittedSelection(effectiveSelection);
                  setJobId(response.jobId);
                }
              } catch (cause) {
                if (alive.current)
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not start the AI task.",
                  );
              }
            }}
          >
            {reviewOnly
              ? start.isPending
                ? "جارٍ بدء المعالجة…"
                : "إنشاء اقتراحات للمراجعة"
              : start.isPending
                ? `Starting ${providerName}…`
                : "Generate proposals"}
          </Button>
          {!available && (
            <p role="status">
              {options.isError
                ? "تعذر التحقق من إعدادات المساعد. أعد فتح المراجعة للمحاولة."
                : options.isPending
                  ? "جارٍ التحقق من إعدادات المساعد…"
                  : "المساعد الطبي معطّل من المزوّدين والحدود."}
            </p>
          )}
        </>
      )}
      {jobId && !result && !paused && (
        <p role="status">
          {providerName} is processing. Closing this window does not cancel the
          provider task or its credits. Nothing will be applied automatically.
          Local task access expires after ten minutes or a server restart.
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
            if (terminalFailure) {
              setJobId(undefined);
              setSubmittedSelection(undefined);
              setConsent(false);
              setTerminalFailure(false);
            }
          }}
        >
          {terminalFailure
            ? "تجهيز محاولة جديدة (قد تُحتسب تكلفة جديدة)"
            : reviewOnly
              ? "متابعة نفس المهمة"
              : "Check same task again"}
        </Button>
      )}
      {result && (
        <>
          {!reviewOnly && input.kind === "conversation" && form?.saveDraft && (
            <div className="sticky top-0 z-10 rounded border bg-background p-3">
              <p className="mb-2 text-sm">
                راجع الحقول والاختيارات أدناه قبل حفظ الزيارة.
              </p>
              <Button
                type="button"
                disabled={
                  form.disabled ||
                  form.saving ||
                  savingDraft ||
                  diagnosisPending ||
                  (Boolean(form.fillDraft) && !draftReceipt) ||
                  (Boolean(draftReceipt) &&
                    draftSignature.current !== JSON.stringify(result.proposals))
                }
                onClick={async () => {
                  setError("");
                  setSavingDraft(true);
                  try {
                    await form.saveDraft!();
                    setCopyMessage("تم حفظ الزيارة والحقول المعبأة بنجاح.");
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "تعذر حفظ الزيارة.",
                    );
                  } finally {
                    setSavingDraft(false);
                  }
                }}
              >
                {savingDraft || form.saving
                  ? "جارٍ حفظ الزيارة…"
                  : "حفظ الزيارة بعد المراجعة"}
              </Button>
            </div>
          )}
          {result.warnings.map((warning, index) => (
            <p key={index} role="note" dir="auto">
              {warning}
            </p>
          ))}
          {draftReceipt && (
            <div>
              {draftSignature.current !== JSON.stringify(result.proposals) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    try {
                      flushSync(() => draftReceipt.undo());
                      setDraftReceipt(
                        form!.fillDraft!(narrativeProposals(result.proposals)),
                      );
                      draftSignature.current = JSON.stringify(result.proposals);
                      setError("");
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "تعذر تحديث الحقول.",
                      );
                    }
                  }}
                >
                  نقل التعديلات إلى الحقول
                </Button>
              )}
              <p role="status">
                تمت تعبئة مسودة الحقول المتاحة تلقائيًا. راجع الكشف ثم استخدم زر
                الحفظ؛ لم يحدث حفظ تلقائي.
              </p>
              {draftReceipt.skipped.length > 0 && (
                <p>
                  لم تُملأ تلقائيًا؛ راجع اختياراتها قبل الحفظ:{" "}
                  {draftReceipt.skipped
                    .map(
                      (field) =>
                        medicalProposalLabels[
                          field as keyof typeof medicalProposalLabels
                        ],
                    )
                    .join("، ")}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  try {
                    draftReceipt.undo();
                    setDraftReceipt(undefined);
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : "تعذّر التراجع.",
                    );
                  }
                }}
              >
                تراجع عن تعبئة الحقول
              </Button>
            </div>
          )}
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
              {!reviewOnly &&
                input.kind === "conversation" &&
                proposal.field === "diagnosis" &&
                diagnosisPending && (
                  <div className="space-y-2">
                    <p>
                      {diseases.isError
                        ? "تعذر التحقق من الكتالوج. راجع التشخيص وأكده كنص."
                        : "التشخيص غير مطابق بشكل وحيد للكتالوج. راجع النص قبل نقله للمسودة."}
                    </p>
                    <Button
                      className="h-auto max-w-full whitespace-normal text-start"
                      type="button"
                      variant="outline"
                      disabled={form?.disabled || diseases.isLoading}
                      onClick={() => {
                        try {
                          if (!form?.fillDraft) {
                            setConfirmedDiagnosis(diagnosisText);
                            return;
                          }
                          if (draftReceipt)
                            flushSync(() => draftReceipt.undo());
                          setDraftReceipt(
                            form.fillDraft(
                              result.proposals.filter(
                                (item) =>
                                  !form.getTests?.() ||
                                  !["labs", "imaging"].includes(item.field),
                              ),
                            ),
                          );
                          setConfirmedDiagnosis(diagnosisText);
                          draftSignature.current = JSON.stringify(
                            result.proposals,
                          );
                          setError("");
                        } catch (cause) {
                          setError(
                            cause instanceof Error
                              ? cause.message
                              : "تعذر نقل التشخيص للمسودة.",
                          );
                        }
                      }}
                    >
                      تأكيد التشخيص وإضافته للمسودة بدون إضافته للكتالوج
                    </Button>
                  </div>
                )}
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
                (proposal.field === "labs" || proposal.field === "imaging") && (
                  <TestCatalogReview
                    field={proposal.field}
                    text={proposal.text}
                  />
                )}
              {!reviewOnly &&
                input.kind === "conversation" &&
                proposal.field === "treatment" &&
                (proposal.medications?.length ? (
                  <MedicationCatalogReview medicines={proposal.medications} />
                ) : (
                  <p>
                    لم تُستخرج أسماء أدوية منفصلة. نص العلاج ليس عبارة بحث؛ راجع
                    الأسماء أو اختَر الدواء من الكتالوج.
                  </p>
                ))}
              {!reviewOnly &&
                input.kind === "conversation" &&
                proposal.field !== "treatment" &&
                !form?.fillDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      form?.disabled ||
                      !proposal.text.trim() ||
                      (proposal.field === "diagnosis" && diagnosisPending)
                    }
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
              التعبئة تخص المسودة فقط وتحافظ على النص السابق. راجع الحقول
              والأدوية قبل حفظ الكشف. لا تُستخدم الوصفات الجاهزة للبحث عن أسماء
              الأدوية.
            </p>
          )}
        </>
      )}
    </section>
  );
}
