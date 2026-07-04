import { useRef, useState } from "react";
import { Search, X } from "lucide-react";
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
import { DateInput } from "@/components/ui/date-input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const STAFF_BOOKING_TYPES = [
  { value: "consultant" as const, label: "كشف استشاري" },
  { value: "specialist" as const, label: "كشف أخصائي" },
  { value: "lasik" as const, label: "فحوصات الليزك" },
  { value: "external" as const, label: "أشعة خارجي" },
  { value: "followup" as const, label: "متابعة" },
];

type BookingType =
  | "consultant"
  | "specialist"
  | "lasik"
  | "external"
  | "followup";

export function KfAddBookingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{
    kfId: number;
    name: string;
    code: string;
    phone: string;
  } | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("consultant");
  const [requestedDate, setRequestedDate] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = trpc.kf.searchPatients.useQuery(
    { term: search },
    { enabled: search.trim().length >= 2 },
  );

  const utils = trpc.useUtils();

  const createBooking = (trpc as any).patientPortal.createStaffGuestBooking.useMutation({
    onSuccess: async () => {
      await (utils as any).patientPortal.listBookings.invalidate();
      toast.success("تم إضافة الموعد بنجاح");
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSubmit = !!requestedDate && !!selectedPatient && !createBooking.isPending;

  function reset() {
    setSearch("");
    setSelectedPatient(null);
    setRequestedDate("");
    setShowDropdown(false);
    setBookingType("consultant");
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader dir="rtl">
          <DialogTitle>إضافة موعد — فرع كفر الشيخ</DialogTitle>
          <DialogDescription>
            ابحث عن مريض كفر الشيخ، حدد نوع الخدمة والتاريخ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative space-y-1.5" ref={searchRef}>
            <label className="text-xs font-medium text-muted-foreground block text-right">
              المريض
            </label>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setSearch("");
                  }}
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
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="اسم المريض أو الكود..."
                    className="h-10 rounded-xl pr-9 text-sm"
                  />
                </div>
                {showDropdown && searchResults && searchResults.length > 0 && (
                  <div className="absolute top-full z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                    {(searchResults as any[]).slice(0, 8).map((p) => (
                      <button
                        key={p.kfId}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2.5 text-right transition-colors hover:bg-muted/40"
                        onClick={() => {
                          setSelectedPatient({
                            kfId: p.kfId,
                            name: p.fullName,
                            code: p.kfCode ?? "",
                            phone: p.phone ?? "",
                          });
                          setSearch("");
                          setShowDropdown(false);
                        }}
                      >
                        <span className="text-xs text-muted-foreground">{p.kfCode}</span>
                        <span className="text-sm font-medium">{p.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block text-right">
              التاريخ
            </label>
            <DateInput
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="h-10 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block text-right">
              الخدمة
            </label>
            <div className="flex flex-wrap gap-1.5">
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
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              createBooking.mutate({
                guestName: selectedPatient!.name,
                guestPhone: selectedPatient!.phone || undefined,
                bookingType,
                branch: "kfs",
                requestedDate,
              })
            }
            className="h-9 rounded-xl px-6 font-bold text-sm"
          >
            {createBooking.isPending ? "جاري الحفظ…" : "حفظ الموعد"}
          </Button>
          <Button type="button" variant="ghost" className="h-9 text-sm" onClick={() => handleOpenChange(false)}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
