import {
  createContext,
  useContext,
  useState,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FieldDictation, { type DictationTarget } from "./FieldDictation";
import type { PrescriptionBinding } from "./prescription-template";
import type { ConfirmedInvestigation } from "@shared/clinical-catalog-items";
import {
  prepareDraftAdditions,
  assertDraftUndo,
  type DraftBinding,
} from "./draft-binding";

type Scope = {
  patientId: number;
  visitId?: number | null;
  visitDate?: string;
  patientName?: string;
  disabled?: boolean;
  draftBinding?: DraftBinding;
  prescriptionDraft?: PrescriptionBinding;
  onSaveDraft?: () => Promise<void>;
  saving?: boolean;
  testsDraft?: TestCatalogBinding;
};
export type TestCatalogBinding = {
  manualItems?: ConfirmedInvestigation[];
  appendManual?: (item: ConfirmedInvestigation) => void;
  removeManual?: (name: string) => void;
  catalog: Array<{
    id: number | string;
    name: string;
    type?: string;
    isActive?: boolean;
  }>;
  ids: number[];
  disabled: boolean;
  append: (ids: number[]) => void;
  remove: (ids: number[]) => void;
};
const AssistantContext = createContext<{
  request: (field: DictationTarget) => void;
  disabled: boolean;
  saveDraft?: () => Promise<void>;
  saving: boolean;
  fillDraft?: (proposals: Array<{ field: string; text: string }>) => {
    skipped: string[];
    undo: () => void;
  };
  getPrescription?: () => PrescriptionBinding | undefined;
  getTests?: () => TestCatalogBinding | undefined;
  root: React.RefObject<HTMLDivElement | null>;
  prescriptions: React.RefObject<
    Map<symbol, { element: HTMLElement; get: () => PrescriptionBinding }>
  >;
} | null>(null);

export function useAssistantForm() {
  return useContext(AssistantContext);
}

export function AssistantFieldsProvider({
  children,
  ...scope
}: Scope & { children: ReactNode }) {
  const parent = useContext(AssistantContext);
  const latest = useRef(scope);
  latest.current = scope;
  const [target, setTarget] = useState<DictationTarget | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const prescriptions = useRef(
    new Map<symbol, { element: HTMLElement; get: () => PrescriptionBinding }>(),
  );
  if (parent && !scope.draftBinding) return <>{children}</>;
  return (
    <AssistantContext.Provider
      value={{
        request: setTarget,
        disabled: Boolean(scope.disabled),
        saving: Boolean(scope.saving),
        getTests: () =>
          latest.current.disabled ? undefined : latest.current.testsDraft,
        saveDraft: scope.onSaveDraft
          ? async () => {
              if (
                latest.current.disabled ||
                latest.current.saving ||
                !latest.current.onSaveDraft
              )
                throw new Error("الزيارة غير متاحة للحفظ الآن.");
              await latest.current.onSaveDraft();
            }
          : undefined,
        getPrescription: () =>
          latest.current.disabled
            ? undefined
            : latest.current.prescriptionDraft,
        fillDraft: scope.draftBinding
          ? (proposals) => {
              const current = latest.current;
              if (current.disabled || !current.draftBinding)
                throw new Error("المسودة غير متاحة للتعديل.");
              const receipt = prepareDraftAdditions(
                current.draftBinding,
                proposals,
              );
              current.draftBinding.change(receipt.after);
              return {
                skipped: receipt.skipped,
                undo: () => {
                  const binding = latest.current.draftBinding;
                  if (latest.current.disabled || !binding)
                    throw new Error("المسودة غير متاحة.");
                  assertDraftUndo(binding, receipt.after);
                  binding.change(receipt.before);
                },
              };
            }
          : undefined,
        root,
        prescriptions,
      }}
    >
      <div ref={root} className="contents">
        {children}
      </div>
      {target && (
        <FieldDictation
          target={target}
          patientName={scope.patientName}
          onClose={() => setTarget(null)}
        />
      )}
    </AssistantContext.Provider>
  );
}

export function AssistantField({
  children,
  label,
  disabled = false,
  order = "",
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  order?: string;
}) {
  const assistant = useContext(AssistantContext);
  if (!assistant || disabled || assistant.disabled) return <>{children}</>;
  return (
    <span className={`flex min-w-0 flex-1 items-start gap-1 ${order}`}>
      <span className="min-w-0 flex-1">{children}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 print:hidden"
        aria-label={`Dictate ${label}`}
        title={`Dictate ${label}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const visibleLabel = event.currentTarget
            .closest("label")
            ?.textContent?.trim();
          const element =
            event.currentTarget.parentElement?.querySelector("input, textarea");
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            assistant.request({
              label: label === "field" && visibleLabel ? visibleLabel : label,
              element,
            });
          }
        }}
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
      </Button>
    </span>
  );
}

export function AssistantTextarea(props: ComponentProps<typeof Textarea>) {
  const label = props["aria-label"] || props.placeholder || "field";
  return (
    <AssistantField
      label={label}
      disabled={props.disabled || props.readOnly}
      order={props.className?.match(/\border-\S+/)?.[0]}
    >
      <Textarea {...props} />
    </AssistantField>
  );
}

export function AssistantInput(props: ComponentProps<typeof Input>) {
  const label = props["aria-label"] || props.placeholder || "field";
  const numeric =
    props.type === "number" ||
    /^(Axis|P\.D\.|OD|OS|0\.3|—|S|C|A|IOP|UCVA|BCVA|PD|ADD)$/i.test(label);
  return (
    <AssistantField
      label={label}
      disabled={
        props.disabled || props.readOnly || numeric || props.type === "date"
      }
    >
      <Input {...props} />
    </AssistantField>
  );
}
