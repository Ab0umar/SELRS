import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

type BackButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

/** RTL: chevron points toward logical “back” (end). */
export function BackButton({ href, label = "رجوع", className }: BackButtonProps) {
  const [, setLocation] = useLocation();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("gap-1 ps-1 text-primary hover:text-primary/90", className)}
      onClick={() => (href ? setLocation(href) : window.history.back())}
    >
      <span className="text-sm font-semibold">{label}</span>
      <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
    </Button>
  );
}
