import { useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const STAFF_BOOKING_TYPES = [
  { value: "consultant" as const, label: "كشف استشاري" },
  { value: "specialist" as const, label: "كشف أخصائي" },
  { value: "lasik"      as const, label: "فحوصات الليزك" },
  { value: "external"   as const, label: "أشعة خارجي" },
  { value: "followup"   as const, label: "متابعة" },
];

type BookingType = "consultant" | "specialist" | "lasik" | "external" | "followup";

export function AddPortalBookingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{
    id: number;
    name: string;
    code: string;
  } | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("consultant");
  const [requestedDate, setRequestedDate] = useState("");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = trpc.medical.searchPatients.useQuery(
    { searchTerm: search },
    { enabled: search.trim().length >= 2 },
  );

  const create = trpc.patientPortal.createStaffBooking.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحجز بنجاح");
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const canSubmit = !!selectedPatient && !!requestedDate && !create.isPending;

  function reset() {
    setSearch("");
    setSelectedPatient(null);
    setRequestedDate("");
    setConfirmedDate("");
    setStaffNotes("");
    setShowDropdown(false);
    setBookingType("consultant");
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-2xl border-none shadow-2xl p-0"
        dir="rtl"
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="text-right">
              <DialogTitle className="text-base font-bold">
                إضافة حجز للمريض
              </DialogTitle>
              <DialogDescription className="text-[11px]">
                ابحث عن المريض، حدد نوع الخدمة والتاريخ، ثم احفظ الحجز مباشرةً.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-4 bg-background space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Patient search */}
            <div className="relative space-y-1.5" ref={searchRef}>
              <label className="text-xs font-medium text-muted-foreground">
                المريض
              </label>
              {selectedPatient ? (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => { setSelectedPatient(null); setSearch(""); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="إزالة المريض المختار"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{selectedPatient.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedPatient.code}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="اسم المريض أو الكود أو الموبايل..."
                      className="h-10 rounded-xl pr-9 text-sm"
                    />
                  </div>
                  {showDropdown && searchResults && searchResults.length > 0 && (
                    <div className="absolute top-full z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                      {(searchResults as any[]).slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2.5 text-right transition-colors hover:bg-muted/40"
                          onClick={() => {
                            setSelectedPatient({ id: p.id, name: p.fullName, code: p.patientCode ?? "" });
                            setSearch("");
                            setShowDropdown(false);
                          }}
                        >
                          <span className="text-xs text-muted-foreground">{p.patientCode}</span>
                          <span className="text-sm font-medium">{p.fullName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Booking type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                نوع الحجز
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STAFF_BOOKING_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setBookingType(t.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                      bookingType === t.value
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Requested date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                تاريخ الموعد
              </label>
              <Input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="h-10 rounded-xl text-sm"
                dir="ltr"
              />
            </div>

            {/* Confirmed date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                تاريخ مؤكد{" "}
                <span className="font-normal opacity-60">(اختياري)</span>
              </label>
              <Input
                type="date"
                value={confirmedDate}
                onChange={(e) => setConfirmedDate(e.target.value)}
                className="h-10 rounded-xl text-sm"
                dir="ltr"
              />
            </div>

            {/* Staff notes */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                ملاحظات للمريض{" "}
                <span className="font-normal opacity-60">(اختياري)</span>
              </label>
              <textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                rows={2}
                placeholder="تُعرض للمريض في البوابة..."
                className="w-full resize-none rounded-xl border border-border bg-muted/10 px-3 py-2.5 text-sm leading-6 outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t bg-muted/10 px-4 py-3">
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              create.mutate({
                patientId: selectedPatient!.id,
                bookingType,
                requestedDate,
                confirmedDate: confirmedDate || undefined,
                status: "confirmed",
                staffNotes: staffNotes || undefined,
              })
            }
            className="h-9 rounded-xl px-6 font-bold text-sm"
          >
            {create.isPending ? "جاري الحفظ…" : "حفظ الحجز"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 text-sm"
            onClick={() => handleOpenChange(false)}
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
