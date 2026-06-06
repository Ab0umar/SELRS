import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { FileImage, RefreshCw, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import DoctorLayout from "./DoctorLayout";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value instanceof Date ? value : value).toLocaleDateString("en-GB");
}

function matchesSearch(fullName: string | null, query: string): boolean {
  if (!query) return true;
  const name = (fullName ?? "").toLowerCase();
  const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return parts.every((part) => name.includes(part));
}

export default function DoctorDashboard() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = trpc.doctorPortal.getMyPatients.useQuery();

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => matchesSearch(p.fullName, search));
  }, [data, search]);

  return (
    <DoctorLayout>
      <div className="rounded-[2rem] border border-[#dbe7f4] bg-white p-4 shadow-[0_12px_36px_rgba(28,64,104,0.06)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">المرضى المخصصون</h2>
            <p className="text-sm text-muted-foreground">
              {data ? `${filtered.length} من ${data.length} مريض` : "جارٍ التحميل..."}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void refetch()} className="gap-2 text-muted-foreground">
            <RefreshCw className="size-4" />
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو جزء منه..."
            className="pl-9"
          />
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 animate-pulse rounded-xl bg-[#eef4fa]" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error.message}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d7e2ee] bg-[#f7fbfe] px-4 py-10 text-center">
            <User className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">لا يوجد مرضى مخصصون بعد</p>
            <p className="text-xs text-muted-foreground">تواصل مع الإدارة لتخصيص مرضى لحسابك.</p>
          </div>
        )}

        {data && data.length > 0 && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d7e2ee] bg-[#f7fbfe] px-4 py-6 text-center text-sm text-muted-foreground">
            لا يوجد مرضى يطابق "{search}"
          </div>
        )}

        {data && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div
                key={p.patientCode}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#e1ebf6] bg-[#fbfdff] p-3 transition-colors hover:bg-[#f0f7ff]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.fullName ?? "Unknown Patient"}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{p.patientCode}</span>
                    {p.age != null && <span>{p.age}y</span>}
                    {p.gender && <span className="capitalize">{p.gender}</span>}
                    {p.lastVisit && <span>آخر زيارة: {formatDate(String(p.lastVisit))}</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => navigate(`/doctor-portal/patient/${p.patientCode}`)}
                >
                  <FileImage className="size-4" />
                  عرض الصور
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DoctorLayout>
  );
}
