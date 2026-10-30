import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, GripVertical, Mic, Minus, X } from "lucide-react";
import FieldDictation from "./FieldDictation";
import type { RoutedTranscript } from "./transcript-routing";
import ProposalReview from "./ProposalReview";
import { Button } from "@/components/ui/button";
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

const POSITION_KEY = "medical-assistant-card-position";
type CardPosition = { x: number; y: number };

function readStoredPosition(): CardPosition | null {
  try {
    const raw = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null");
    return Number.isFinite(raw?.x) && Number.isFinite(raw?.y) ? raw : null;
  } catch {
    return null;
  }
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
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<CardPosition | null>(
    readStoredPosition,
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef<CardPosition | null>(null);
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

  const isOpen = open ?? localOpen;
  const clamp = (x: number, y: number): CardPosition => {
    const card = cardRef.current;
    const width = card?.offsetWidth ?? 380;
    return {
      x: Math.max(0, Math.min(window.innerWidth - width, x)),
      y: Math.max(0, Math.min(window.innerHeight - 48, y)),
    };
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button") || !cardRef.current)
      return;
    const rect = cardRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const offset = dragOffset.current;
    if (offset)
      setPosition(clamp(event.clientX - offset.x, event.clientY - offset.y));
  };
  const endDrag = () => {
    if (!dragOffset.current) return;
    dragOffset.current = null;
    try {
      if (position)
        localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      // Position memory is a convenience only.
    }
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-expanded={isOpen}
          onClick={() => {
            if (!isOpen && !position && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setPosition(clamp(rect.left, rect.bottom + 8));
            }
            handleOpenChange(!isOpen);
          }}
          className="gap-2 print:hidden"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          Medical assistant
        </Button>
      )}
      {isOpen &&
        createPortal(
          <div
            ref={cardRef}
            role="dialog"
            aria-label="Medical assistant"
            dir="ltr"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !recording) handleOpenChange(false);
            }}
            style={
              position
                ? { left: position.x, top: position.y }
                : { left: 16, top: 120 }
            }
            className="fixed z-[55] flex max-h-[min(80dvh,640px)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl print:hidden"
          >
            <div
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="flex cursor-grab touch-none select-none items-center gap-2 border-b bg-muted/50 px-3 py-2 active:cursor-grabbing"
            >
              <GripVertical
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="flex-1 text-sm font-semibold">
                Medical assistant
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={minimized ? "Expand" : "Minimize"}
                onClick={() => setMinimized((value) => !value)}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Close"
                onClick={() => handleOpenChange(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div hidden={minimized} className="flex min-h-0 flex-1 flex-col">
              <p className="px-4 pt-3 text-xs text-muted-foreground">
                سجّل الزيارة كاملة وراجع النص. المساعد يملأ مسودة الحقول، والحفظ
                بعد مراجعتك فقط.
              </p>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
                  <legend className="text-sm font-medium">
                    Recording mode
                  </legend>
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
                    مزوّد الصوت يُحدّد من الإعداد المركزي بواسطة الأدمن. احصل
                    على موافقة المريض قبل التسجيل والإرسال إلى المزوّد.
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
                    <ClipboardList
                      className="mb-2 h-5 w-5"
                      aria-hidden="true"
                    />
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
              <footer className="border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  راجع التعديلات واختيارات الكتالوج، ثم اضغط حفظ الزيارة.
                </p>
              </footer>
            </div>
          </div>,
          document.body,
        )}
      {recording && isOpen && (
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
