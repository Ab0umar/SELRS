import { useMemo, useState } from "react";
import { Scissors } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { fmt, todayIso } from "./accountingFormat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ServiceLine = { svcCode: string; qty: string; discount: string; price: string };
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
  const [lines, setLines] = useState<ServiceLine[]>([{ svcCode: "", qty: "1", discount: "", price: "" }]);
  const [saved, setSaved] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState<"today" | "total" | null>(null);
  const catalogQ = trpc.accounting.serviceEntryCatalog.useQuery(undefined, { refetchOnWindowFocus: false });
  const patientQ = trpc.accounting.patientNameLookup.useQuery({ patientCode: patientCode.trim() }, { enabled: patientCode.trim().length > 0, retry: false });
  const saveMut = trpc.accounting.addPatientServices.useMutation();
  const todayServicesQ = trpc.accounting.serviceRevenue.useQuery({ fromDate: todayIso(), toDate: todayIso(), sectionCode: 15 }, { enabled: summaryOpen !== null, refetchOnWindowFocus: false });
  const services = catalogQ.data?.services ?? [];
  const doctors = catalogQ.data?.doctors ?? [];
  const updateLine = (index: number, patch: Partial<ServiceLine>) => setLines((old) => old.map((line, i) => i === index ? { ...line, ...patch } : line));
  const totals = useMemo(() => lines.reduce((sum, line) => {
    const fallback = services.find((service) => service.code === line.svcCode)?.price ?? 0;
    const price = line.price === "" ? Number(fallback) : Number(line.price);
    const qty = Math.max(1, Math.trunc(Number(line.qty) || 1));
    const discount = Number(line.discount) || 0;
    return { gross: sum.gross + (Number.isFinite(price) ? price : 0) * qty, discount: sum.discount + discount };
  }, { gross: 0, discount: 0 }), [lines, services]);
  const reset = () => { setPatientCode(""); setDoctorCode(""); setShift(""); setDateText(toDisplayDate(todayIso())); setLines([{ svcCode: "", qty: "1", discount: "", price: "" }]); setSaved(false); };
  const save = async () => {
    const serviceDate = toIsoDate(dateText);
    const filled = lines.filter((line) => line.svcCode.trim());
    if (!serviceDate || !patientCode.trim() || filled.length === 0) return;
    await saveMut.mutateAsync({ patientCode: patientCode.trim(), doctorCode: doctorCode || undefined, doctorName: doctors.find((doctor) => doctor.code === doctorCode)?.name, shiftNumber: shift ? Number(shift) as 1 | 2 : undefined, serviceDate, lines: filled.map((line) => ({ serviceCode: line.svcCode, serviceName: services.find((service) => service.code === line.svcCode)?.name ?? "", quantity: Math.max(1, Math.trunc(Number(line.qty) || 1)), discount: line.discount === "" ? undefined : Number(line.discount), price: line.price === "" ? undefined : Number(line.price) })) });
    await Promise.all([utils.accounting.serviceRevenue.invalidate(), utils.accounting.lasikServices.invalidate(), utils.accounting.dashboardSummary.invalidate()]);
    reset(); setSaved(true);
  };
  const field = "h-14 w-full border-[3px] border-foreground/45 bg-card px-3 text-right text-xl font-bold text-foreground outline-none focus:border-primary";
  const label = "flex h-14 items-center justify-center border-2 border-foreground/35 bg-muted px-3 text-2xl font-black text-foreground whitespace-nowrap";
  const total = todayServicesQ.data?.grandTotal;
  return <><section dir="rtl" className="mx-auto max-w-7xl rounded-2xl border border-border bg-background p-4 text-foreground shadow-sm sm:p-6"><div className="grid gap-5 xl:grid-cols-[13rem_minmax(0,1fr)_9rem]" dir="ltr">
    <aside dir="rtl" className="grid content-start gap-3"><button type="button" onClick={() => setSummaryOpen("today")} className="rounded-lg border-4 border-cyan-950 bg-sky-800 px-3 py-3 text-center text-xl font-black text-white hover:bg-sky-700">خدمات اليوم</button><button type="button" onClick={() => setSummaryOpen("total")} className="rounded-lg border-4 border-cyan-950 bg-sky-800 px-3 py-3 text-center text-xl font-black text-white hover:bg-sky-700">إجمالي الخدمات</button></aside>
    <form dir="rtl" onSubmit={(event) => { event.preventDefault(); void save(); }} className="grid content-start gap-3"><div className="grid items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)]"><span className="text-3xl font-black">المريض</span><div className="grid gap-2 sm:grid-cols-[12rem_1fr]"><input className={field} value={patientCode} onChange={(event) => { setPatientCode(event.target.value); setSaved(false); }} placeholder="كود المريض" dir="ltr" /><output className="h-14 border-2 border-foreground/35 bg-card px-4 py-2 text-center text-xl font-black">{patientQ.isFetching ? "…" : patientQ.data?.patientName ?? ""}</output></div></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid grid-cols-[auto_minmax(0,1fr)] items-center"><span className={label}>الدكتور</span><select className={field} value={doctorCode} onChange={(event) => setDoctorCode(event.target.value)}><option value="">بدون</option>{doctors.map((doctor) => <option key={doctor.code} value={doctor.code}>{doctor.name}</option>)}</select></label><label className="grid grid-cols-[auto_minmax(0,1fr)] items-center"><span className={label}>الوردية</span><select className={field} value={shift} onChange={(event) => setShift(event.target.value as "" | "1" | "2")}><option value="">تلقائي</option><option value="1">الأولى</option><option value="2">الثانية</option></select></label></div><label className="grid grid-cols-[auto_minmax(0,1fr)] items-center"><span className={label}>التاريخ</span><input className={field} inputMode="numeric" placeholder="DD/MM/YYYY" value={dateText} onChange={(event) => setDateText(event.target.value)} /></label><div className="grid gap-2">{lines.map((line, index) => <div key={index} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_7rem_5rem_6rem_auto]"><select className={field} value={line.svcCode} onChange={(event) => { const svc = services.find((item) => item.code === event.target.value); updateLine(index, { svcCode: event.target.value, price: line.price || String(svc?.price ?? "") }); }}><option value="">الخدمة</option>{services.map((service) => <option key={service.code} value={service.code}>{service.name}</option>)}</select><input className={field} type="number" min="0" placeholder="السعر" value={line.price} onChange={(event) => updateLine(index, { price: event.target.value })} /><input className={field} type="number" min="1" placeholder="عدد" value={line.qty} onChange={(event) => updateLine(index, { qty: event.target.value })} /><input className={field} type="number" min="0" placeholder="خصم" value={line.discount} onChange={(event) => updateLine(index, { discount: event.target.value })} /><button type="button" onClick={() => setLines((old) => old.length === 1 ? old : old.filter((_, i) => i !== index))} className="rounded-md bg-red-600 px-4 text-xl font-black text-white">حذف</button></div>)}</div><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => setLines((old) => [...old, { svcCode: "", qty: "1", discount: "", price: "" }])} className="rounded-md bg-muted px-5 py-3 text-xl font-black">+ خدمة</button><output className="rounded-md border-2 border-success/40 bg-success/10 px-5 py-3 text-2xl font-black text-success">الإجمالي: {fmt(Math.max(0, totals.gross - totals.discount))}</output></div><div className="flex flex-wrap justify-between gap-2"><button type="button" onClick={reset} className="rounded-md bg-yellow-300 px-6 py-3 text-xl font-black text-black">جديد</button><button type="submit" disabled={saveMut.isPending || !patientCode.trim() || !toIsoDate(dateText) || !lines.some((line) => line.svcCode)} className="rounded-md bg-green-600 px-6 py-3 text-xl font-black text-white disabled:opacity-50">{saved ? "تم الحفظ" : "حفظ"}</button></div></form>
    <aside dir="rtl" className="grid content-center gap-5"><a href="/accounting/services" className="border-4 border-orange-950 bg-orange-500 px-3 py-3 text-center text-2xl font-black text-black hover:bg-orange-400">الخدمات</a><a href="/accounting/service-revenue" className="border-4 border-orange-950 bg-orange-500 px-3 py-3 text-center text-2xl font-black text-black hover:bg-orange-400">التقارير</a><div className="flex justify-center"><Scissors className="h-10 w-10 text-primary" /></div></aside>
  </div></section><Dialog open={summaryOpen !== null} onOpenChange={(open) => !open && setSummaryOpen(null)}><DialogContent dir="rtl"><DialogHeader><DialogTitle className="text-right">{summaryOpen === "today" ? "خدمات اليوم" : "إجمالي خدمات اليوم"}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border bg-muted p-4 text-center"><p className="text-sm text-muted-foreground">عدد الخدمات</p><p className="mt-2 text-2xl font-black">{todayServicesQ.isLoading ? "…" : total?.rowCount ?? 0}</p></div><div className="rounded-xl border bg-success/10 p-4 text-center"><p className="text-sm text-muted-foreground">الإجمالي</p><p className="mt-2 text-2xl font-black text-success">{todayServicesQ.isLoading ? "…" : fmt(total?.totalPaid ?? 0)}</p></div></div></DialogContent></Dialog></>;
}
