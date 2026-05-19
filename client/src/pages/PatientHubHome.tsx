import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Clock, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const RECENT_KEY = "hub_recent_patients";
const MAX_RECENT = 6;

type RecentPatient = {
  id: number;
  name: string;
  code: string;
  lastVisit: string;
};

type SearchPatient = {
  id: number;
  fullName: string;
  patientCode?: string | null;
  phone?: string | null;
};

function loadRecent(): RecentPatient[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentPatient[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(entry: RecentPatient) {
  try {
    const prev = loadRecent().filter((r) => r.id !== entry.id);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...prev].slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

function formatArabicDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatPhone(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return value;
}

type PatientHubHomeProps = { visitDate: string };

export default function PatientHubHome({ visitDate }: PatientHubHomeProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentPatient[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
    inputRef.current?.focus();
  }, []);

  const normalizedQuery = query.replace(/\s+/g, "");
  const showResults = normalizedQuery.trim().length >= 1;

  const searchQuery = trpc.medical.searchPatients.useQuery(
    { searchTerm: normalizedQuery },
    { enabled: showResults, refetchOnWindowFocus: false },
  );

  const results = (searchQuery.data ?? []) as SearchPatient[];

  const handleSelect = (patient: SearchPatient) => {
    const entry: RecentPatient = {
      id: patient.id,
      name: patient.fullName,
      code: patient.patientCode ?? String(patient.id),
      lastVisit: visitDate,
    };
    saveRecent(entry);
    setRecent(loadRecent());
    navigate(`/patient-hub/brief/${patient.id}?visitDate=${encodeURIComponent(visitDate)}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-4 py-10 sm:py-14" dir="rtl">
      <div className="w-full max-w-xl">
        {/* Search input — no floating dropdown, results appear inline below */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute end-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/50"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الكود أو الرقم..."
            className="h-12 w-full rounded-xl border border-border bg-background pe-12 ps-4 text-base text-foreground placeholder:text-muted-foreground/50 transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            dir="rtl"
            autoComplete="off"
            spellCheck={false}
            aria-label="ابحث عن مريض"
          />
        </div>

        {/* Inline results list */}
        {showResults && (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            {searchQuery.isFetching && results.length === 0 && (
              <p className="px-4 py-3.5 text-sm text-muted-foreground">جاري البحث...</p>
            )}
            {!searchQuery.isFetching && results.length === 0 && (
              <p className="px-4 py-3.5 text-sm text-muted-foreground">
                لا توجد نتائج
              </p>
            )}
            {results.map((patient, i) => (
              <button
                key={patient.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
                  i > 0 && "border-t border-border/40",
                )}
                onClick={() => handleSelect(patient)}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                  aria-hidden
                >
                  {patient.fullName.trim()[0] ?? "م"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{patient.fullName}</p>
                  {patient.phone && (
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground" dir="ltr">
                      {formatPhone(patient.phone)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground/70" dir="ltr">
                  {patient.patientCode ?? "—"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Recent patients — only visible when search is empty */}
        {!showResults && recent.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              <Clock className="h-3 w-3" aria-hidden />
              الأخيرون
            </p>
            <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60">
              {recent.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
                  onClick={() => {
                    saveRecent({ ...r, lastVisit: visitDate });
                    navigate(
                      `/patient-hub/brief/${r.id}?visitDate=${encodeURIComponent(visitDate)}`,
                    );
                  }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    aria-hidden
                  >
                    {r.name.trim()[0] ?? "م"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatArabicDate(r.lastVisit)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground/70" dir="ltr">
                    {r.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
