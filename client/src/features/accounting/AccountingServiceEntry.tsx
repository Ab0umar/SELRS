import { useMemo, useRef, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { fmt, todayIso } from "./accountingFormat";
import { AccountingQueryBoundary } from "./AccountingPagePrimitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ServiceLine = {
  svcCode: string;
  qty: string;
  discount: string;
  price: string;
};
const toDisplayDate = (iso: string) => iso.split("-").reverse().join("/");
const toIsoDate = (value: string) => {
  const parts = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : null;
};

export default function AccountingServiceEntry() {
  const utils = trpc.useUtils();
  const [patientCode, setPatientCode] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [shift, setShift] = useState<"" | "1" | "2">("");
  const [dateText, setDateText] = useState(toDisplayDate(todayIso()));
  const [lines, setLines] = useState<ServiceLine[]>([
    { svcCode: "", qty: "1", discount: "", price: "" },
  ]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [validationError, setValidationError] = useState("");
  const saving = useRef(false);
  const [summaryOpen, setSummaryOpen] = useState<"today" | "total" | null>(
    null,
  );
  const catalogQ = trpc.accounting.serviceEntryCatalog.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const patientQ = trpc.accounting.patientNameLookup.useQuery(
    { patientCode: patientCode.trim() },
    { enabled: patientCode.trim().length > 0, retry: false },
  );
  const saveMut = trpc.accounting.addPatientServices.useMutation({
    retry: false,
  });
  const todayServicesQ = trpc.accounting.serviceRevenue.useQuery(
    { fromDate: todayIso(), toDate: todayIso(), sectionCode: 15 },
    { enabled: summaryOpen !== null, refetchOnWindowFocus: false },
  );
  const services = catalogQ.data?.services ?? [];
  const doctors = catalogQ.data?.doctors ?? [];
  const updateLine = (index: number, patch: Partial<ServiceLine>) => {
    setSaved(false);
    setLines((old) =>
      old.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };
  const totals = useMemo(
    () =>
      lines.reduce(
        (sum, line) => {
          const fallback =
            services.find((service) => service.code === line.svcCode)?.price ??
            0;
          const price =
            line.price === "" ? Number(fallback) : Number(line.price);
          const qty = Math.max(1, Math.trunc(Number(line.qty) || 1));
          const discount = Number(line.discount) || 0;
          return {
            gross: sum.gross + (Number.isFinite(price) ? price : 0) * qty,
            discount: sum.discount + discount,
          };
        },
        { gross: 0, discount: 0 },
      ),
    [lines, services],
  );
  const reset = () => {
    setPatientCode("");
    setDoctorCode("");
    setShift("");
    setDateText(toDisplayDate(todayIso()));
    setLines([{ svcCode: "", qty: "1", discount: "", price: "" }]);
    setSaved(false);
    setSaveError("");
  };
  const save = async () => {
    if (saving.current) return;
    const serviceDate = toIsoDate(dateText);
    const filled = lines.filter((line) => line.svcCode.trim());
    if (!serviceDate) {
      setValidationError("أدخل التاريخ بصيغة يوم/شهر/سنة صحيحة.");
      return;
    }
    if (!patientCode.trim()) {
      setValidationError("أدخل كود المريض قبل حفظ الخدمة.");
      return;
    }
    if (filled.length === 0) {
      setValidationError("اختر خدمة واحدة على الأقل قبل الحفظ.");
      return;
    }
    setValidationError("");
    const payload = {
      patientCode: patientCode.trim(),
      doctorCode: doctorCode || undefined,
      doctorName: doctors.find((doctor) => doctor.code === doctorCode)?.name,
      shiftNumber: shift ? (Number(shift) as 1 | 2) : undefined,
      serviceDate,
      lines: filled.map((line) => ({
        serviceCode: line.svcCode,
        serviceName:
          services.find((service) => service.code === line.svcCode)?.name ?? "",
        quantity: Math.max(1, Math.trunc(Number(line.qty) || 1)),
        discount: line.discount === "" ? undefined : Number(line.discount),
        price: line.price === "" ? undefined : Number(line.price),
      })),
    };
    saving.current = true;
    setBusy(true);
    setSaved(false);
    setSaveError("");
    try {
      await saveMut.mutateAsync(payload);
      reset();
      setSaved(true);
      await Promise.all([
        utils.accounting.serviceRevenue.invalidate(),
        utils.accounting.lasikServices.invalidate(),
        utils.accounting.dashboardSummary.invalidate(),
      ]);
    } catch {
      setSaveError(
        "تعذر إكمال حفظ الخدمة. راجع حالة الخدمة قبل إعادة المحاولة.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const field =
    "h-14 w-full border-[3px] border-foreground/45 bg-card px-3 text-start text-xl font-bold text-foreground outline-none focus:border-primary";
  const label =
    "flex h-14 items-center justify-center border-2 border-foreground/35 bg-muted px-3 text-2xl font-black text-foreground whitespace-nowrap";
  const total = todayServicesQ.data?.grandTotal;
  return (
    <>
      <section
        dir="rtl"
        className="accounting-ledger accounting-entry-workspace accounting-mobile-entry mx-auto max-w-7xl text-foreground"
      >
        <div
          className="grid gap-5 xl:grid-cols-[12rem_minmax(0,1fr)_9rem]"
          dir="ltr"
        >
          <aside dir="rtl" className="grid content-start gap-3">
            <Button variant="bare"
              type="button"
              onClick={() => setSummaryOpen("today")}
              className="rounded-md border border-border bg-card px-3 py-3 text-center text-sm font-semibold hover:bg-muted"
            >
              خدمات اليوم
            </Button>
            <Button variant="bare"
              type="button"
              onClick={() => setSummaryOpen("total")}
              className="rounded-md border border-border bg-card px-3 py-3 text-center text-sm font-semibold hover:bg-muted"
            >
              إجمالي الخدمات
            </Button>
          </aside>
          <form
            dir="rtl"
            aria-busy={busy}
            onChangeCapture={() => setSaved(false)}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            className="grid content-start gap-3"
          >
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}
            {validationError && (
              <p
                id="service-entry-validation-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {validationError}
              </p>
            )}
            {busy && (
              <p role="status" className="text-sm text-muted-foreground">
                جارٍ حفظ الخدمة
              </p>
            )}
            <AccountingQueryBoundary
              query={catalogQ}
              label="قائمة الخدمات والأطباء"
            >
              <fieldset
                disabled={busy}
                className="grid min-w-0 gap-5 border-0 p-0"
              >
                <div className="grid items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <span className="text-3xl font-black">المريض</span>
                  <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
                    <Input bare
                      id="service-entry-patient-code"
                      aria-label="كود المريض"
                      aria-invalid={Boolean(validationError)}
                      aria-describedby={
                        validationError
                          ? "service-entry-validation-error"
                          : undefined
                      }
                      className={field}
                      value={patientCode}
                      onChange={(event) => {
                        setPatientCode(event.target.value);
                        setSaved(false);
                      }}
                      placeholder="كود المريض"
                      dir="ltr"
                    />
                    <output className="h-14 border-2 border-foreground/35 bg-card px-4 py-2 text-center text-xl font-black">
                      {patientQ.isFetching
                        ? "جارٍ البحث"
                        : patientQ.isError
                          ? "تعذر البحث"
                          : patientCode.trim()
                            ? (patientQ.data?.patientName ?? "غير موجود")
                            : ""}
                    </output>
                  </div>
                </div>
                <div className="accounting-entry-pair grid gap-3 sm:grid-cols-2">
                  <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                    <span className={label}>الدكتور</span>
                    <select
                      className={field}
                      value={doctorCode}
                      onChange={(event) => setDoctorCode(event.target.value)}
                    >
                      <option value="">بدون</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.code} value={doctor.code}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                    <span className={label}>الوردية</span>
                    <select
                      className={field}
                      value={shift}
                      onChange={(event) =>
                        setShift(event.target.value as "" | "1" | "2")
                      }
                    >
                      <option value="">تلقائي</option>
                      <option value="1">الأولى</option>
                      <option value="2">الثانية</option>
                    </select>
                  </label>
                </div>
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={label}>التاريخ</span>
                  <Input bare
                    id="service-entry-date"
                    className={field}
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError
                        ? "service-entry-validation-error"
                        : undefined
                    }
                    value={dateText}
                    onChange={(event) => setDateText(event.target.value)}
                  />
                </label>
                <div className="grid gap-2">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="accounting-service-line grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_7rem_5rem_6rem_auto]"
                    >
                      <select
                        aria-label={`الخدمة ${index + 1}`}
                        className={field}
                        value={line.svcCode}
                        onChange={(event) => {
                          const svc = services.find(
                            (item) => item.code === event.target.value,
                          );
                          updateLine(index, {
                            svcCode: event.target.value,
                            price: line.price || String(svc?.price ?? ""),
                          });
                        }}
                      >
                        <option value="">الخدمة</option>
                        {services.map((service) => (
                          <option key={service.code} value={service.code}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                      <label className="accounting-service-number contents">
                        <span className="hidden">السعر</span>
                        <Input bare
                          aria-label={`السعر ${index + 1}`}
                          className={field}
                          type="number"
                          min="0"
                          placeholder="السعر"
                          value={line.price}
                          onChange={(event) =>
                            updateLine(index, { price: event.target.value })
                          }
                        />
                      </label>
                      <label className="accounting-service-number contents">
                        <span className="hidden">العدد</span>
                        <Input bare
                          aria-label={`العدد ${index + 1}`}
                          className={field}
                          type="number"
                          min="1"
                          placeholder="عدد"
                          value={line.qty}
                          onChange={(event) =>
                            updateLine(index, { qty: event.target.value })
                          }
                        />
                      </label>
                      <label className="accounting-service-number contents">
                        <span className="hidden">الخصم</span>
                        <Input bare
                          aria-label={`الخصم ${index + 1}`}
                          className={field}
                          type="number"
                          min="0"
                          placeholder="خصم"
                          value={line.discount}
                          onChange={(event) =>
                            updateLine(index, { discount: event.target.value })
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="حذف الخدمة"
                        aria-label={`حذف الخدمة ${index + 1}`}
                        disabled={lines.length === 1}
                        onClick={() =>
                          setLines((old) =>
                            old.length === 1
                              ? old
                              : old.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLines((old) => [
                        ...old,
                        { svcCode: "", qty: "1", discount: "", price: "" },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4" /> خدمة
                  </Button>
                  <output className="rounded-md border-2 border-success/40 bg-success/10 px-5 py-3 text-2xl font-black text-success">
                    الإجمالي: {fmt(Math.max(0, totals.gross - totals.discount))}
                  </output>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" onClick={reset} variant="outline">
                    <Plus className="h-4 w-4" /> جديد
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      saveMut.isPending ||
                      !patientCode.trim() ||
                      !toIsoDate(dateText) ||
                      !lines.some((line) => line.svcCode)
                    }
                  >
                    <Save className="h-4 w-4" />{" "}
                    {busy ? "جارٍ الحفظ" : saved ? "تم الحفظ" : "حفظ"}
                  </Button>
                </div>
              </fieldset>
            </AccountingQueryBoundary>
          </form>
          <aside dir="rtl" className="grid content-start gap-3">
            <a
              href="/accounting/services"
              className="rounded-md border border-border bg-card px-3 py-3 text-center text-sm font-semibold hover:bg-muted"
            >
              الخدمات
            </a>
            <a
              href="/accounting/service-revenue"
              className="rounded-md border border-border bg-card px-3 py-3 text-center text-sm font-semibold hover:bg-muted"
            >
              التقارير
            </a>
          </aside>
        </div>
      </section>
      <Dialog
        open={summaryOpen !== null}
        onOpenChange={(open) => !open && setSummaryOpen(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-start">
              {summaryOpen === "today" ? "خدمات اليوم" : "إجمالي خدمات اليوم"}
            </DialogTitle>
          </DialogHeader>
          <AccountingQueryBoundary query={todayServicesQ} label="ملخص الخدمات">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">عدد الخدمات</p>
                <p className="mt-2 text-2xl font-black">
                  {todayServicesQ.isLoading ? "…" : (total?.rowCount ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border bg-success/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="mt-2 text-2xl font-black text-success">
                  {todayServicesQ.isLoading ? "…" : fmt(total?.totalPaid ?? 0)}
                </p>
              </div>
            </div>
          </AccountingQueryBoundary>
        </DialogContent>
      </Dialog>
    </>
  );
}
