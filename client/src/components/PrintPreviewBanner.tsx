import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type PrintPreviewBannerProps = {
  title: string;
  subtitle?: string;
  onPrint: () => void;
};

export default function PrintPreviewBanner({
  title,
  subtitle,
  onPrint,
}: PrintPreviewBannerProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-right print:hidden">
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Print Preview</div>
        <div className="mt-1 text-sm font-bold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-600">{subtitle}</div> : null}
      </div>
      <Button type="button" size="sm" onClick={onPrint} className="shrink-0 bg-sky-600 hover:bg-sky-700">
        <Printer className="ml-2 h-4 w-4" />
        طباعة الآن
      </Button>
    </div>
  );
}
