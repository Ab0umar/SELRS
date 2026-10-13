import { useEffect, useRef } from "react";
import { useAssistantForm } from "./AssistantFields";
import type { PrescriptionBinding as Binding } from "./prescription-template";
export default function PrescriptionBinding(props: Binding) {
  const registry = useAssistantForm()?.prescriptions;
  const element = useRef<HTMLSpanElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    if (!registry || !element.current) return;
    const key = Symbol("prescription");
    registry.current.set(key, {
      element: element.current,
      get: () => latest.current,
    });
    return () => {
      registry.current.delete(key);
    };
  }, [registry]);
  return <span ref={element} className="sr-only" aria-hidden="true" />;
}
