import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import {
  referralDoctorInput,
  type ReferralDoctorDetails,
} from "../../../../shared/referral-doctors";

const emptyDoctor = {
  name: "",
  specialty: "",
  hospital: "",
  schedule: "",
  address: "",
};
const fields = [
  ["name", "اسم الدكتور"],
  ["specialty", "التخصص"],
  ["hospital", "المستشفى"],
  ["schedule", "المواعيد"],
  ["address", "العنوان"],
] as const;

export function ReferralDoctorPicker({
  value,
  onSelect,
}: {
  value: number | null;
  onSelect: (doctor: ReferralDoctorDetails | null) => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const query = trpc.referralDoctors.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>();
  const [draft, setDraft] = useState(emptyDoctor);
  const save = trpc.referralDoctors.save.useMutation();
  const selected = query.data?.find((doctor) => doctor.id === value);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = referralDoctorInput.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    try {
      const result = await save.mutateAsync({ ...parsed.data, id: editId });
      await query.refetch();
      onSelect({ ...parsed.data, id: result.id });
      setOpen(false);
      toast.success("تم حفظ بيانات دكتور التحويل");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "تعذر حفظ الدكتور"));
    }
  }

  return (
    <div dir="rtl" className="print:hidden space-y-2">
      <label className="block text-sm font-medium">
        دكتور التحويل
        <select
          className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground"
          value={value ?? ""}
          disabled={query.isLoading || query.isError}
          onChange={(event) =>
            onSelect(
              query.data?.find(
                (doctor) => doctor.id === Number(event.target.value),
              ) ?? null,
            )
          }
        >
          <option value="">
            {query.isLoading
              ? "جارٍ تحميل الأطباء…"
              : "اختر الدكتور أو أدخل البيانات يدويًا"}
          </option>
          {value && !selected && (
            <option value={value}>الدكتور المحفوظ في الخطاب</option>
          )}
          {query.data?.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} — {doctor.specialty}
              {doctor.hospital ? ` — ${doctor.hospital}` : ""}
            </option>
          ))}
        </select>
      </label>
      {query.isError && (
        <div role="alert" className="text-sm text-destructive">
          تعذر تحميل أطباء التحويل. يمكنك إدخال البيانات يدويًا.
          <Button
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            إعادة المحاولة
          </Button>
        </div>
      )}
      {isAdmin && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(emptyDoctor);
              setEditId(undefined);
              setOpen(true);
            }}
          >
            إضافة دكتور
          </Button>
          {selected && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(selected);
                setEditId(selected.id);
                setOpen(true);
              }}
            >
              تعديل بيانات الدكتور
            </Button>
          )}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editId ? "تعديل دكتور التحويل" : "إضافة دكتور تحويل"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            {fields.map(([key, label]) => (
              <label key={key} className="block text-sm">
                {label}
                {key === "schedule" || key === "address" ? (
                  <Textarea
                    value={draft[key]}
                    maxLength={2000}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.value })
                    }
                  />
                ) : (
                  <Input
                    required={key === "name" || key === "specialty"}
                    value={draft[key]}
                    maxLength={255}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.value })
                    }
                  />
                )}
              </label>
            ))}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "جارٍ الحفظ…" : "حفظ الدكتور"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
