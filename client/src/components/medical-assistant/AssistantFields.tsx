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

type Scope = {
  patientId: number;
  visitId?: number | null;
  visitDate?: string;
  patientName?: string;
  disabled?: boolean;
};
const AssistantContext = createContext<{
  request: (field: DictationTarget) => void;
  disabled: boolean;
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
  const [target, setTarget] = useState<DictationTarget | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const prescriptions = useRef(
    new Map<symbol, { element: HTMLElement; get: () => PrescriptionBinding }>(),
  );
  if (parent) return <>{children}</>;
  return (
    <AssistantContext.Provider
      value={{
        request: setTarget,
        disabled: Boolean(scope.disabled),
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
