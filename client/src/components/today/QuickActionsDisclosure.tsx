import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface QuickActionsDisclosureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  label?: string;
  className?: string;
}

/**
 * Disclosure header for the Quick Actions panel.
 *
 * Radix sets aria-expanded and aria-controls on the trigger and the matching
 * id on the content, so the chevron stays aria-hidden: the label text is the
 * accessible name and aria-expanded already conveys the state.
 */
export function QuickActionsDisclosure({
  open,
  onOpenChange,
  children,
  label = "إجراءات سريعة",
  className,
}: QuickActionsDisclosureProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="bare"
          type="button"
          className="group mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {label}
          <ChevronDown
            aria-hidden="true"
            className="group-data-[state=open]:rotate-180 size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
