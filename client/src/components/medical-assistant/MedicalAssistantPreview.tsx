import { useEffect, useState } from "react";
import { ClipboardList, Mic } from "lucide-react";
import FieldDictation from "./FieldDictation";
import type { RoutedTranscript } from "./transcript-routing";
import ProposalReview from "./ProposalReview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [recording, setRecording] = useState(false);
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

  return (
    <>
      <Dialog open={open ?? localOpen} onOpenChange={handleOpenChange}>
        {!hideTrigger && (
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="gap-2 print:hidden"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              Medical assistant
            </Button>
          </DialogTrigger>
        )}
        <DialogContent
          dir="ltr"
          className="z-[60] flex max-h-[90dvh] w-[calc(100%_-_2rem)] flex-col overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-b p-5 pr-12 text-left">
            <DialogTitle>Medical assistant</DialogTitle>
            <DialogDescription>
              سجّل الزيارة كاملة وراجع النص. المساعد يملأ مسودة الحقول، والحفظ
              بعد مراجعتك فقط.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 overflow-y-auto p-5">
            <section
              aria-label="Active patient and visit"
              className="rounded-lg border bg-muted/40 p-3"
            >
              <p className="font-medium" dir="auto">
                {patientName || `Patient #${patientId}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {visitId ? `Visit #${visitId}` : "New visit"}
                {visitDate ? ` · ${visitDate}` : ""}
              </p>
            </section>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Recording mode</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["conversation", "Doctor–patient conversation"],
                    ["dictation", "Doctor dictation"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm"
                  >
                    <input
                      type="radio"
                      name={`assistant-mode-${patientId}`}
                      value={value}
                      checked={mode === value}
                      disabled={recording}
                      onChange={() => {
                        setMode(value);
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div
              className="flex flex-wrap items-center gap-2"
              aria-label="Recording controls"
            >
              <p className="text-sm text-muted-foreground">
                مزوّد الصوت يُحدّد من الإعداد المركزي بواسطة الأدمن. احصل على
                موافقة المريض قبل التسجيل والإرسال إلى المزوّد.
              </p>
              <Button
                type="button"
                disabled={disabled || recording}
                onClick={() => setRecording(true)}
                className="gap-2"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                {result ? "Record again" : "Record full visit"}
              </Button>
            </div>
            <section className="space-y-2">
              <Label htmlFor={`assistant-transcript-${patientId}`}>
                Live transcript
              </Label>
              <Textarea
                id={`assistant-transcript-${patientId}`}
                readOnly={!result || recording}
                value={result?.transcript ?? ""}
                onChange={(event) =>
                  setResult((previous) =>
                    previous
                      ? { ...previous, transcript: event.target.value }
                      : null,
                  )
                }
                dir="auto"
                className="min-h-32 resize-none"
                placeholder="The reviewed full-visit transcript will appear here after recording."
              />
            </section>
            <section
              aria-labelledby={`assistant-changes-${patientId}`}
              className="space-y-3"
            >
              <h3
                id={`assistant-changes-${patientId}`}
                className="text-sm font-medium"
              >
                Proposed field changes
              </h3>
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                <ClipboardList className="mb-2 h-5 w-5" aria-hidden="true" />
                {result
                  ? "Full-visit transcript captured. Review it before sending it to the configured AI assistant."
                  : "Record the full visit to prepare complaints, history, diagnosis, treatment, tests, and the final decision for review."}
              </div>
              {result && result.transcript.trim() && (
                <ProposalReview
                  key={`${result.mode}:${result.transcript}`}
                  input={result}
                />
              )}
            </section>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
            <p className="text-sm text-muted-foreground">
              راجع التعديلات واختيارات الكتالوج، ثم اضغط حفظ الزيارة.
            </p>
          </footer>
        </DialogContent>
      </Dialog>
      {recording && (open ?? localOpen) && (
        <FieldDictation
          kind="conversation"
          mode={mode}
          patientName={patientName}
          onClose={() => setRecording(false)}
          onTranscript={(transcript) => {
            setResult(transcript);
            setRecording(false);
          }}
        />
      )}
    </>
  );
}
