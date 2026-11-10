import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Mic, X } from "lucide-react";
import FieldDictation from "./FieldDictation";
import FloatingBar from "./FloatingBar";
import type { RoutedTranscript } from "./transcript-routing";
import ProposalReview from "./ProposalReview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMedicalAssistantAccess } from "./useMedicalAssistantAccess";
import { trpc } from "@/lib/trpc";
import { medicalTranscriptMaxChars } from "@shared/medical-assistant";

interface MedicalAssistantPreviewProps {
  patientId: number;
  patientName?: string;
  visitId?: number | null;
  visitDate?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export default function MedicalAssistantPreview(
  props: MedicalAssistantPreviewProps,
) {
  if (!useMedicalAssistantAccess()) return null;
  return (
    <MedicalAssistantDialog
      key={`${props.patientId}:${props.visitId ?? "new"}:${props.visitDate ?? ""}`}
      {...props}
    />
  );
}

function MedicalAssistantDialog({
  patientId,
  patientName,
  visitId,
  visitDate,
  disabled = false,
  open,
  onOpenChange,
  hideTrigger = false,
}: MedicalAssistantPreviewProps) {
  const [mode, setMode] = useState<"conversation" | "dictation">(
    "conversation",
  );
  const [localOpen, setLocalOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [recording, setRecording] = useState(false);
  const [reviewRun, setReviewRun] = useState(0);
  const [draft, setDraft] = useState("");
  // A finished recording or processed text goes to review on its own.
  const [autoStart, setAutoStart] = useState(false);
  // While a review runs, a new recording or text would orphan its paid result.
  const [aiRunning, setAiRunning] = useState(false);
  const [result, setResult] = useState<Extract<
    RoutedTranscript,
    { kind: "conversation" }
  > | null>(null);
  // A job this user already started for the visit (before a reload or a
  // remount) is shown again, so its paid result is not lost or paid twice.
  const [resumeJobId, setResumeJobId] = useState<string>();
  const [restoreChecked, setRestoreChecked] = useState(false);
  useEffect(() => {
    if (open === false || disabled) setRecording(false);
  }, [open, disabled]);
  const handleOpenChange = (value: boolean) => {
    setLocalOpen(value);
    if (!value) setRecording(false);
    onOpenChange?.(value);
  };

  const draftText = draft.trim();
  const tooLong = draftText.length > medicalTranscriptMaxChars;
  const processDraft = () => {
    if (!draftText || tooLong || recording || disabled) return;
    setAutoStart(true);
    setResumeJobId(undefined);
    setResult({ kind: "conversation", mode, transcript: draftText });
    setReviewRun((value) => value + 1);
    setExpanded(true);
  };
  const isOpen = open ?? localOpen;
  const latest = trpc.medicalAssistant.latestJob.useQuery(
    { patientId, visitId },
    {
      enabled: isOpen && !disabled && !restoreChecked,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  useEffect(() => {
    if (restoreChecked || !isOpen || disabled || latest.isFetching) return;
    if (!latest.isSuccess && !latest.isError) return;
    setRestoreChecked(true);
    const job = latest.data;
    if (!job || job.recording.kind !== "conversation" || result !== null)
      return;
    setMode(job.recording.mode);
    setDraft(job.recording.transcript);
    setAutoStart(true);
    setResumeJobId(job.jobId);
    setResult(job.recording);
    setReviewRun((value) => value + 1);
    setExpanded(true);
  }, [restoreChecked, isOpen, disabled, latest, result]);
  // Opening the assistant starts recording, unless a review is already there
  // (reopening after closing mid-review, or a job found for this visit, shows
  // that review instead).
  const wasOpen = useRef(false);
  const recordOnOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current && !disabled && result === null)
      recordOnOpen.current = true;
    if (!isOpen || disabled || result !== null) recordOnOpen.current = false;
    wasOpen.current = isOpen;
    if (recordOnOpen.current && restoreChecked) {
      recordOnOpen.current = false;
      setRecording(true);
    }
  }, [isOpen, disabled, result, restoreChecked]);
  const patientLabel = patientName || `مريض #${patientId}`;
  const visitLabel = `${visitId ? `زيارة #${visitId}` : "زيارة جديدة"}${
    visitDate ? ` · ${visitDate}` : ""
  }`;

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-expanded={isOpen}
          onClick={() => handleOpenChange(!isOpen)}
          aria-label="المساعد الطبي"
          className="gap-2 print:hidden max-sm:w-11 max-sm:px-0"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          <span className="max-sm:sr-only">المساعد الطبي</span>
        </Button>
      )}
      {/* With a review in progress or done, closing the bar only hides it: the
          job keeps polling and filling, the lock holds, and reopening shows the
          same review instead of starting it again. */}
      {(isOpen || result !== null) && (
        <FloatingBar
          label="المساعد الطبي"
          storageKey="medical-assistant-bar-position"
          expanded={expanded}
          hidden={recording || !isOpen}
          onEscape={() => handleOpenChange(false)}
          sheetTitle={
            <div className="flex min-w-0 items-baseline gap-x-2">
              <h2 className="shrink-0 text-sm font-semibold">المساعد الطبي</h2>
              <p
                className="min-w-0 truncate text-xs text-muted-foreground"
                dir="auto"
              >
                {patientLabel} · {visitLabel}
              </p>
            </div>
          }
          sheet={
            <>
              <section className="space-y-1">
                <Label className="sr-only" htmlFor={`assistant-transcript-${patientId}`}>
                  النص الحي
                </Label>
                <Textarea
                  id={`assistant-transcript-${patientId}`}
                  readOnly={recording || Boolean(result)}
                  value={result ? result.transcript : draft}
                  onChange={(event) => setDraft(event.target.value)}
                  dir="auto"
                  className="min-h-16 max-h-32 resize-none"
                  placeholder="اكتب أو الصق كلام الزيارة هنا، أو اضغط «تسجيل»."
                />
                {tooLong && (
                  <p role="alert" className="text-xs">
                    النص أطول من {medicalTranscriptMaxChars} حرف. قصّره أو قسّمه.
                  </p>
                )}
                {aiRunning && (
                  <p role="status" className="text-xs">
                    انتظر انتهاء المراجعة الحالية قبل تسجيل أو نص جديد.
                  </p>
                )}
                {result ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={recording || aiRunning}
                    onClick={() => {
                      setResult(null);
                      setDraft("");
                    }}
                  >
                    نص جديد
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      disabled || recording || !draftText || tooLong
                    }
                    onClick={processDraft}
                  >
                    معالجة النص
                  </Button>
                )}
              </section>
              <section
                aria-label="التعديلات المقترحة على الحقول"
                className="space-y-2"
              >
                {result && (
                  <ProposalReview
                    key={reviewRun}
                    input={result}
                    existingJobId={resumeJobId}
                    autoStart={autoStart}
                    context={{ patientId, visitId }}
                    onRunningChange={setAiRunning}
                  />
                )}
              </section>
            </>
          }
          pill={
            <>
              <span
                aria-hidden="true"
                className="hidden h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground sm:block"
              />
              <p
                className="hidden min-w-0 flex-1 truncate text-sm font-medium sm:block"
                dir="auto"
              >
                {patientLabel}
              </p>
              <div
                role="group"
                aria-label="نوع التسجيل"
                className="flex shrink-0 rounded-full bg-muted p-0.5 max-sm:me-auto"
              >
                {(
                  [
                    ["conversation", "محادثة"],
                    ["dictation", "إملاء"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    disabled={recording}
                    onClick={() => setMode(value)}
                    className={
                      "rounded-full px-2.5 py-1 text-xs font-medium " +
                      (mode === value
                        ? "bg-card shadow-sm"
                        : "text-muted-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={disabled || recording || aiRunning}
                onClick={() => setRecording(true)}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                {result ? "تسجيل جديد" : "تسجيل"}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label={expanded ? "إخفاء المراجعة" : "إظهار المراجعة"}
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="إغلاق"
                onClick={() => handleOpenChange(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          }
        />
      )}
      {recording && isOpen && (
        <FieldDictation
          kind="conversation"
          mode={mode}
          patientName={patientName}
          patientId={patientId}
          visitId={visitId}
          onClose={() => setRecording(false)}
          onTranscript={(transcript) => {
            setDraft(transcript.transcript);
            setRecording(false);
            setExpanded(true);
            const text = transcript.transcript.trim();
            if (!text || text.length > medicalTranscriptMaxChars) {
              setResult(null);
              return;
            }
            setAutoStart(true);
            setResumeJobId(undefined);
            setResult({ kind: "conversation", mode, transcript: text });
            setReviewRun((value) => value + 1);
          }}
        />
      )}
    </>
  );
}
