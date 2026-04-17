import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Layers3, Sparkles } from "lucide-react";

const SHEET_COPY_LINKS = [
  { key: "consultant", title: "Consultant Copy", path: "/sheets/consultant/0?original=1" },
  { key: "consultant-followup", title: "Consultant Follow-up Copy", path: "/sheets/consultant/0/followup?original=1" },
  { key: "specialist", title: "Specialist Copy", path: "/sheets/specialist/0?original=1" },
  { key: "lasik", title: "LASIK Copy", path: "/sheets/lasik/0?original=1" },
  { key: "lasik-followup", title: "LASIK Follow-up Copy", path: "/sheets/lasik/0/followup?original=1" },
  { key: "external", title: "External Copy", path: "/sheets/external/0?original=1" },
] as const;

export default function AdminSheetCopies() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }
  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_36%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
              <Layers3 className="h-3.5 w-3.5" />
              Original Copies
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Sheet Copies</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                افتح النسخ الأصلية المعتمدة للشيتات بسرعة من مكان واحد للمراجعة أو المقارنة قبل أي تعديل.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Available</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{SHEET_COPY_LINKS.length}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Use Case</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Review baseline layouts
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Sheet Copies (View/Review)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/dashboard?tab=admin")}>
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            Home
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SHEET_COPY_LINKS.map((sheet) => (
          <Card key={sheet.key} className="border-slate-200/80 bg-white/95 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {sheet.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.open(sheet.path, "_blank", "noopener,noreferrer")}>
                Open Copy
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
