import type { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BrandCardProps = {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function BrandCard({ header, children, footer, className }: BrandCardProps) {
  return (
    <Card className={cn("selrs-card overflow-hidden border-border/80 shadow-sm", className)}>
      {header ? <CardHeader className="border-b border-border/60 pb-3">{header}</CardHeader> : null}
      <CardContent className={cn(header ? "pt-4" : "pt-6")}>{children}</CardContent>
      {footer ? <CardFooter className="border-t border-border/60 pt-3">{footer}</CardFooter> : null}
    </Card>
  );
}
