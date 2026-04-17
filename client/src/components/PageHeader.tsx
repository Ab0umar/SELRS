import { ArrowRight, Home, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

type PageHeaderProps = {
  backTo: string;
  label?: string;
  hideOnPrint?: boolean;
};

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
    <>
      <header
        className={`bg-primary text-primary-foreground shadow-lg sticky top-0 z-[120] pointer-events-auto ${
          hideOnPrint ? "print:hidden" : ""
        }`}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="h-1" />
        </div>
      </header>
      <div className={`border-b border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] ${hideOnPrint ? "print:hidden" : ""}`}>
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            Navigation
          </div>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {label}
          </button>
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            الصفحة الرئيسية
          </button>
          </div>
        </div>
      </div>
    </>
  );
}
