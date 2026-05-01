import { ArrowRight, Home } from "lucide-react";
import { useLocation } from "wouter";

type PageHeaderProps = {
  backTo: string;
  label?: string;
  hideOnPrint?: boolean;
};

/** شريط خفيف: رجوع + الرئيسية فقط (بدون الهيدر الأزرق وبدون تسمية Navigation). */
export default function PageHeader({ backTo, label = "العودة", hideOnPrint = true }: PageHeaderProps) {
  const [, setLocation] = useLocation();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation(backTo);
  };

  return (
    <div
      className={`border-b border-border/80 bg-background/95 ${hideOnPrint ? "print:hidden" : ""}`}
      dir="rtl"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-2 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60"
        >
          <ArrowRight className="h-4 w-4 shrink-0" />
          {label}
        </button>
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60"
        >
          <Home className="h-4 w-4 shrink-0" />
          الصفحة الرئيسية
        </button>
      </div>
    </div>
  );
}
