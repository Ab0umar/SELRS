import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ReportToolbar({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("attendance-report-toolbar"));
  }, []);

  return target ? createPortal(children, target) : null;
}
