import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PatientPicker from "@/components/PatientPicker";
import { FileText, LayoutTemplate, Sparkles } from "lucide-react";

type PickedPatient = {
  id: number;
  fullName: string;
};

const SHEET_LINKS = [
  { key: "consultant", title: "Consultant Sheet", path: (id: number) => `/sheets/consultant/${id}` },
  { key: "followup", title: "Consultant Follow-up", path: (id: number) => `/sheets/consultant/${id}?tab=followup` },
  { key: "specialist", title: "Specialist Sheet", path: (id: number) => `/sheets/specialist/${id}` },
  { key: "lasik", title: "LASIK Sheet", path: (id: number) => `/sheets/lasik/${id}` },
  { key: "external", title: "External Operation Sheet", path: (id: number) => `/sheets/external/${id}` },
] as const;

function withOriginalFlag(path: string) {
  return path.includes("?") ? `${path}&original=1` : `${path}?original=1`;
}

export default function AdminSheets() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<PickedPatient | null>(null);

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  if (user?.role !== "admin") {
    return null;
  }

  const patientId = selectedPatient?.id ?? null;
  const subtitle = useMemo(() => {
    if (!selectedPatient) return "Select A Patient, Then Open Any Sheet To Edit.";
    return `Selected: ${selectedPatient.fullName}`;
  }, [selectedPatient]);

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Sheet Control
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">All Sheets</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                اختر المريض مرة واحدة ثم افتح أي شيت مباشرة للتعديل أو للمراجعة بالنسخة الأصلية من نفس المكان.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Sheets</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{SHEET_LINKS.length}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Current Patient</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Sparkles className="h-4 w-4 text-sky-600" />
                {selectedPatient ? selectedPatient.fullName : "Waiting for selection"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Sheets
          </CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Button
              variant="outline"
              className="mr-2 border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
              onClick={() => setLocation("/dashboard?tab=admin")}
            >
              Admin Home
            </Button>
            <Button
              variant="outline"
              className="border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
              onClick={() => setLocation("/admin/sheet-designer")}
            >
              Open Sheet Designer
            </Button>
          </div>
          <PatientPicker
            initialPatientId={patientId ?? undefined}
            onSelect={(patient) => {
              setSelectedPatient({
                id: patient.id,
                fullName: patient.fullName,
              });
            }}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SHEET_LINKS.map((sheet) => (
          <Card key={sheet.key} className="border-slate-200/80 bg-white/95 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200">
            <CardHeader>
              <CardTitle className="text-base">{sheet.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-sky-600 text-white hover:bg-sky-700"
                  disabled={!patientId}
                  onClick={() => {
                    if (!patientId) return;
                    setLocation(sheet.path(patientId));
                  }}
                >
                  Open And Edit
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                  disabled={!patientId}
                  onClick={() => {
                    if (!patientId) return;
                    setLocation(withOriginalFlag(sheet.path(patientId)));
                  }}
                >
                  Open Original
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
