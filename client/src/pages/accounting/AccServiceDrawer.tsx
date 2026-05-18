import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Scissors, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ServiceLine = {
  id: string;
  serviceCode: string;
  quantity: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function createLine(): ServiceLine {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    serviceCode: "",
    quantity: "1",
  };
}

export default function AccServiceDrawer({ open, onClose, onSaved }: Props) {
  const utils = trpc.useUtils();
  const catalogQuery = trpc.accounting.serviceEntryCatalog.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const [patientCode, setPatientCode] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [lines, setLines] = useState<ServiceLine[]>(() => [createLine()]);
  const [saved, setSaved] = useState(false);

  const patientLookup = trpc.accounting.patientLookup.useQuery(
    { patientCode: patientCode.trim() },
    {
      enabled: open && patientCode.trim().length > 0,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const addServices = trpc.accounting.addPatientServices.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.accounting.lasikServices.invalidate(),
        utils.accounting.patientLasikSummary.invalidate(),
        utils.accounting.serviceRevenue.invalidate(),
        utils.accounting.dashboardSummary.invalidate(),
        utils.accounting.transactions.invalidate(),
      ]);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved();
      }, 900);
    },
  });

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setPatientCode("");
    setDoctorCode("");
    setLines([createLine()]);
  }, [open]);

  const services = catalogQuery.data?.services ?? [];
  const doctors = catalogQuery.data?.doctors ?? [];
  const selectedDoctor = doctors.find((doctor) => doctor.code === doctorCode);

  const serviceByCode = useMemo(() => {
    const map = new Map<string, (typeof services)[number]>();
    for (const service of services) {
      map.set(service.code, service);
    }
    return map;
  }, [services]);

  const validLines = lines
    .map((line) => {
      const service = serviceByCode.get(line.serviceCode);
      return {
        serviceCode: line.serviceCode.trim(),
        serviceName: service?.name ?? "",
        quantity: Math.max(1, Math.trunc(Number(line.quantity) || 1)),
      };
    })
    .filter((line) => line.serviceCode);

  const totalQuantity = validLines.reduce((sum, line) => sum + line.quantity, 0);
  const busy = addServices.isPending;
  const canSave = patientCode.trim().length > 0 && validLines.length > 0 && !busy;

  function updateLine(id: string, patch: Partial<ServiceLine>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id),
    );
  }

  async function handleSave() {
    if (!canSave) return;
    await addServices.mutateAsync({
      patientCode: patientCode.trim(),
      doctorCode: doctorCode || undefined,
      doctorName: selectedDoctor?.name || undefined,
      lines: validLines,
    });
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-background shadow-xl sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[480px]"
        style={{ animation: "slideInRight 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              <Scissors className="h-3.5 w-3.5" />
              الخدمات
            </div>
            <h2 className="mt-2 text-base font-bold text-foreground">
              إضافة خدمة لمريض
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="space-y-1.5">
              <label htmlFor="acc-service-patient" className="text-xs font-medium text-muted-foreground">
                كود المريض
              </label>
              <Input
                id="acc-service-patient"
                value={patientCode}
                onChange={(event) => setPatientCode(event.target.value)}
                className="text-left text-sm tabular-nums"
                dir="ltr"
                placeholder="PAT_CD"
              />
            </div>
            <div
              className={cn(
                "min-w-[150px] rounded-xl px-3 py-2 text-xs ring-1",
                patientLookup.data
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-muted text-slate-500 ring-slate-200",
              )}
            >
              {patientLookup.isFetching
                ? "بحث..."
                : patientLookup.data?.patientName || "اسم المريض"}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acc-service-doctor" className="text-xs font-medium text-muted-foreground">
              الدكتور
            </label>
            <select
              id="acc-service-doctor"
              value={doctorCode}
              onChange={(event) => setDoctorCode(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            >
              <option value="">بدون دكتور محدد</option>
              {doctors.map((doctor) => (
                <option key={doctor.code} value={doctor.code}>
                  {doctor.code} - {doctor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                الخدمات والعدد
              </label>
              <button
                type="button"
                onClick={() => setLines((current) => [...current, createLine()])}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Plus className="h-3.5 w-3.5" />
                خدمة أخرى
              </button>
            </div>

            {lines.map((line, index) => {
              const service = serviceByCode.get(line.serviceCode);
              return (
                <div
                  key={line.id}
                  className="grid grid-cols-[1fr_72px_32px] items-start gap-2 rounded-2xl border border-border bg-muted p-2"
                >
                  <div>
                    <select
                      aria-label={`الخدمة ${index + 1}`}
                      value={line.serviceCode}
                      onChange={(event) =>
                        updateLine(line.id, { serviceCode: event.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    >
                      <option value="">اختر الخدمة</option>
                      {services.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code} - {item.name}
                        </option>
                      ))}
                    </select>
                    {service ? (
                      <div className="mt-1 text-[11px] text-slate-500">
                        السعر: {Number(service.price || 0).toLocaleString("ar-EG")}
                      </div>
                    ) : null}
                  </div>
                  <Input
                    aria-label={`عدد الخدمة ${index + 1}`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.id, { quantity: event.target.value })
                    }
                    className="text-center text-sm tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                    className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            سيتم الحفظ في MySQL وتحديث MSSQL لنفس كود المريض. الإجمالي:{" "}
            <span className="font-bold tabular-nums">{totalQuantity}</span> خدمة.
          </div>

          {addServices.error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {addServices.error.message}
            </p>
          ) : null}
        </div>

        <div className="border-t border-border px-4 py-4 sm:px-5">
          <Button className="w-full" onClick={handleSave} disabled={!canSave}>
            {busy ? <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" /> : null}
            {saved ? "تم الحفظ" : "حفظ الخدمة"}
          </Button>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  );
}
