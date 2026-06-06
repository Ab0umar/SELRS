import { useState } from "react";
import { ChevronDown, ChevronUp, Link2, Link2Off, PlusCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  patientCode: string;
}

export function ExternalDoctorReferralPanel({ patientCode }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const { data: referrals, refetch } = trpc.externalDoctors.listReferrals.useQuery(
    { doctorId: undefined },
    { enabled: open },
  );

  const { data: doctors } = trpc.externalDoctors.listDoctors.useQuery(undefined, { enabled: open && adding });

  const patientReferrals = (referrals ?? []).filter((r) => r.patientCode === patientCode);
  const activeIds = new Set(patientReferrals.filter((r) => r.isActive).map((r) => r.externalDoctorId));

  const create = trpc.externalDoctors.createReferral.useMutation({
    onSuccess: () => { toast.success("Doctor assigned"); setAdding(false); setSelectedDoctorId(""); void refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const toggle = trpc.externalDoctors.toggleReferral.useMutation({
    onSuccess: () => void refetch(),
    onError: (e) => toast.error(e.message),
  });

  const availableDoctors = (doctors ?? []).filter((d) => d.isActive && !activeIds.has(d.id));

  return (
    <div className="border-t border-border/50 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Share2 className="size-3.5 shrink-0" />
        <span className="flex-1 text-right">الأطباء الخارجيون</span>
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-1.5">
          {patientReferrals.length === 0 && !adding && (
            <p className="text-[11px] text-muted-foreground text-right">لا يوجد أطباء مرتبطون</p>
          )}

          {patientReferrals.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-1 rounded-lg bg-muted/40 px-2 py-1">
              <button
                type="button"
                title={r.isActive ? "إلغاء الربط" : "تفعيل"}
                onClick={() => toggle.mutate({ id: r.id, isActive: !r.isActive })}
                className={cn(
                  "transition-colors",
                  r.isActive ? "text-primary hover:text-destructive" : "text-muted-foreground hover:text-primary",
                )}
              >
                {r.isActive ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
              </button>
              <span
                className={cn(
                  "flex-1 text-right text-[11px] truncate",
                  r.isActive ? "text-foreground" : "text-muted-foreground line-through",
                )}
              >
                {r.doctorName ?? r.doctorUsername}
              </span>
            </div>
          ))}

          {adding && (
            <div className="space-y-1">
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="اختر طبيب..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">لا يوجد أطباء متاحون</div>
                  )}
                  {availableDoctors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-6 flex-1 text-[11px]"
                  disabled={create.isPending || !selectedDoctorId}
                  onClick={() => create.mutate({ externalDoctorId: Number(selectedDoctorId), patientCode })}
                >
                  {create.isPending ? "..." : "ربط"}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { setAdding(false); setSelectedDoctorId(""); }}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-end gap-1 text-[11px] text-primary hover:underline"
            >
              <PlusCircle className="size-3" />
              إضافة طبيب
            </button>
          )}
        </div>
      )}
    </div>
  );
}
