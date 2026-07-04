import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export function KfOperationBookingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const [term, setTerm] = useState("");

  const { data: results = [], isLoading } = trpc.kf.searchPatients.useQuery(
    { term },
    { enabled: open },
  );

  function handleSelect(kfId: number) {
    onOpenChange(false);
    setTerm("");
    setLocation(`/kf/patients/${kfId}/operations/new`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader dir="rtl">
          <DialogTitle>حجز عملية</DialogTitle>
          <DialogDescription>
            ابحث عن المريض أولاً لفتح نموذج حجز العملية الخاص به.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="اسم المريض أو الكود..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {term.trim() ? "لا يوجد مريض مطابق" : "ابدأ الكتابة للبحث عن مريض"}
            </p>
          ) : (
            results.map((p: any) => (
              <button
                key={p.kfId}
                type="button"
                onClick={() => handleSelect(p.kfId)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-right transition-colors",
                  "hover:border-border hover:bg-muted/40",
                )}
              >
                <span className="text-sm font-semibold text-foreground">{p.fullName}</span>
                <span className="font-mono text-xs text-primary">{p.kfCode}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
