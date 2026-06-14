import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  FileImage,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useDoctorAuth } from "@/hooks/useDoctorAuth";
import DoctorLayout from "./DoctorLayout";
import { cn } from "@/lib/utils";

const GENDER_AR: Record<string, string> = { male: "ذكر", female: "أنثى" };

function formatDate(value?: string | Date | null) {
  if (!value) return null;
  return new Date(value instanceof Date ? value : value).toLocaleDateString(
    "ar-EG",
    { year: "numeric", month: "short", day: "numeric" },
  );
}

function matchesSearch(fullName: string | null, query: string): boolean {
  if (!query) return true;
  const name = (fullName ?? "").toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => name.includes(p));
}

function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    void Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    });
  }
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#e8f0f9] bg-white p-4">
      <div className="size-11 shrink-0 animate-pulse rounded-xl bg-[#eef4fa]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-40 animate-pulse rounded-full bg-[#eef4fa]" />
        <div className="h-2.5 w-56 animate-pulse rounded-full bg-[#eef4fa]" />
      </div>
      <div className="h-8 w-24 shrink-0 animate-pulse rounded-xl bg-[#eef4fa]" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d7e2ee] bg-[#f7fbfe] px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#eef4fa] text-muted-foreground/60">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Patient card row ──────────────────────────────────────────────────────────
function PatientRow({
  patient,
  onClick,
}: {
  patient: {
    fullName: string | null;
    patientCode: string;
    age?: number | null;
    gender?: string | null;
    lastVisit?: string | Date | null;
  };
  onClick: () => void;
}) {
  const initial = (patient.fullName ?? "?").trim().charAt(0);
  const lastVisit = formatDate(patient.lastVisit);

  const meta = [
    patient.patientCode,
    patient.age != null ? `${patient.age} سنة` : null,
    patient.gender ? (GENDER_AR[patient.gender] ?? patient.gender) : null,
    lastVisit ? `آخر زيارة: ${lastVisit}` : null,
  ].filter(Boolean);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-[#e1ebf6] bg-white p-4 transition-all duration-150 hover:border-secondary/30 hover:bg-[#f4f9ff] hover:shadow-xs"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#003D82] text-base font-bold text-white shadow-xs">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {patient.fullName ?? "مريض غير معروف"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {meta.map((item, i) => (
            <span
              key={i}
              className={cn(
                "text-[11px] text-muted-foreground",
                i === 0 && "font-mono font-semibold text-primary/80",
              )}
            >
              {item}
              {i < meta.length - 1 && (
                <span className="ml-2 opacity-30">·</span>
              )}
            </span>
          ))}
        </div>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 rounded-xl bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/90"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <FileImage className="size-3.5" />
        <span className="hidden sm:inline">عرض الصور</span>
      </Button>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const [, navigate] = useLocation();
  const { token } = useDoctorAuth();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const { data, isLoading, error, refetch } =
    trpc.doctorPortal.getMyPatients.useQuery();

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => matchesSearch(p.fullName, search));
  }, [data, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Request notification permission proactively
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  // WebSocket: connect with doctor JWT, listen for new-patient events
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(
      `${protocol}//${host}/ws?doctorToken=${encodeURIComponent(token)}`,
    );
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg?.type === "new-patient") {
          showBrowserNotification(
            "مريض جديد",
            String(msg.patientName ?? msg.patientCode ?? ""),
          );
          void refetch();
        }
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, refetch]);

  return (
    <DoctorLayout>
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              المرضى المخصصون
            </h2>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "جارٍ التحميل..."
                : data
                  ? `${filtered.length} من ${data.length} مريض`
                  : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoading || refreshing}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#dbe7f4] bg-white text-muted-foreground shadow-xs transition-colors hover:bg-[#f4f9ff] hover:text-primary disabled:opacity-40"
            aria-label="تحديث القائمة"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو جزء منه..."
            className="h-11 rounded-xl border-[#d7e2ee] bg-white pr-10 focus-visible:ring-primary/10"
            dir="rtl"
          />
        </div>

        {/* States */}
        {isLoading && (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((n) => (
              <SkeletonRow key={n} />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <EmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل القائمة"
            description={error.message}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleRefresh()}
                className="gap-2 rounded-xl"
              >
                <RefreshCw className="size-3.5" />
                إعادة المحاولة
              </Button>
            }
          />
        )}

        {!isLoading && !error && data?.length === 0 && (
          <EmptyState
            icon={<UserRound className="size-5" />}
            title="لا يوجد مرضى مخصصون بعد"
            description="تواصل مع إدارة المركز لتخصيص مرضى لحسابك."
          />
        )}

        {!isLoading &&
          !error &&
          data &&
          data.length > 0 &&
          filtered.length === 0 && (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title={`لا يوجد مريض يطابق «${search}»`}
              description="جرّب كلمة بحث مختلفة أو جزءاً من الاسم."
            />
          )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-2.5">
            {filtered.map((p) => (
              <PatientRow
                key={p.patientCode}
                patient={p}
                onClick={() =>
                  navigate(`/doctor-portal/patient/${p.patientCode}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </DoctorLayout>
  );
}
