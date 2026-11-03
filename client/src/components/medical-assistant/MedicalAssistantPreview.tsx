import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList, Mic, X } from "lucide-react";
import FieldDictation from "./FieldDictation";
import FloatingBar from "./FloatingBar";
import type { RoutedTranscript } from "./transcript-routing";
import ProposalReview from "./ProposalReview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMedicalAssistantAccess } from "./useMedicalAssistantAccess";
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
  const [result, setResult] = useState<Extract<
    RoutedTranscript,
    { kind: "conversation" }
  > | null>(null);
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
    setResult({ kind: "conversation", mode, transcript: draftText });
    setReviewRun((value) => value + 1);
    setExpanded(true);
  };
  const isOpen = open ?? localOpen;
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
          className="gap-2 print:hidden"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          المساعد الطبي
        </Button>
      )}
      {isOpen && (
        <FloatingBar
          label="المساعد الطبي"
          storageKey="medical-assistant-bar-position"
          expanded={expanded}
          hidden={recording}
          onEscape={() => handleOpenChange(false)}
          sheetTitle={
            <>
              <h2 className="text-sm font-semibold">المساعد الطبي</h2>
              <p className="text-xs text-muted-foreground" dir="auto">
                {patientLabel} · {visitLabel}
              </p>
            </>
          }
          sheet={
            <>
              <section className="space-y-1">
                <Label htmlFor={`assistant-transcript-${patientId}`}>
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
                {result ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={recording}
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
                aria-labelledby={`assistant-changes-${patientId}`}
                className="space-y-2"
              >
                <h3
                  id={`assistant-changes-${patientId}`}
                  className="text-xs font-medium"
                >
                  التعديلات المقترحة على الحقول
                </h3>
                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  <ClipboardList className="mb-1 h-4 w-4" aria-hidden="true" />
                  {result
                    ? "أُرسل النص وصار ثابتًا لهذه المهمة. راجع الاقتراحات وعدّلها قبل الحفظ."
                    : "اكتب أو الصق أو سجّل الزيارة ثم اضغط «معالجة النص» لتجهيز الشكوى والتاريخ والتشخيص والعلاج والفحوصات والقرار النهائي للمراجعة."}
                </div>
                {result && (
                  <ProposalReview
                    key={reviewRun}
                    input={result}
                    context={{ patientId, visitId }}
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
                disabled={disabled || recording}
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
          onClose={() => setRecording(false)}
          onTranscript={(transcript) => {
            setResult(null);
            setDraft(transcript.transcript);
            setRecording(false);
            setExpanded(true);
          }}
        />
      )}
    </>
  );
}
