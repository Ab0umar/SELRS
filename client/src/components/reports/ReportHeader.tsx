import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Element inside the reports hub header that hosts the active report's own title row. */
export const ReportHeaderSlotContext = createContext<HTMLElement | null>(null);

/**
 * A report's title row. Inside the reports hub it is moved into the hub's main
 * header; opened on its own it renders as the usual sticky page header.
 */
export function ReportHeader({
  className,
  style,
  dir,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  dir?: "ltr" | "rtl";
  children: ReactNode;
}) {
  const slot = useContext(ReportHeaderSlotContext);
  if (slot) {
    return createPortal(
      <div
        dir={dir}
        className="no-print flex flex-nowrap items-center gap-3 whitespace-nowrap print:hidden lg:flex-col lg:items-stretch lg:whitespace-normal [&>*]:!m-0 [&>*]:!max-w-none [&>*]:!flex-nowrap [&>*]:!p-0 [&>*]:!space-y-0 lg:[&>*]:!flex-col lg:[&>*]:!items-stretch"
        style={style}
      >
        {children}
      </div>,
      slot,
    );
  }
  return (
    <header className={className} style={style} dir={dir}>
      {children}
    </header>
  );
}
