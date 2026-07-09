import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import SearchableCombobox from "@/components/SearchableCombobox";
import {
  SPHERE_OPTIONS,
  CYLINDER_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { Save } from "lucide-react";

const rowClass = "grid grid-cols-[80px_1fr_1fr] items-center gap-2";
const sectionDivider =
  "grid grid-cols-[80px_1fr_1fr] items-center gap-2 pt-3 mt-1 border-t border-border";
const fieldClass = "h-10 w-full text-sm text-center";
const labelClass = "text-sm font-semibold";
const subLabelClass = "text-xs text-muted-foreground pl-2";

const OP_TYPE_OPTIONS = [
  { value: "PRK", label: "PRK" },
  { value: "LASIK", label: "LASIK" },
  { value: "Femto", label: "Femto" },
  { value: "Cataract", label: "Cataract" },
  { value: "ICL", label: "ICL" },
  { value: "IOL", label: "IOL" },
  { value: "other", label: "Other" },
];

type EyeData = {
  s: string; c: string; axis: string;
  ucva: string; bcva: string;
  glassesS: string; glassesC: string; glassesAxis: string;
  iop: string;
};

const emptyEye = (): EyeData => ({
  s: "---", c: "---", axis: "",
  ucva: "", bcva: "",
  glassesS: "---", glassesC: "---", glassesAxis: "",
  iop: "",
});

export function FollowupFormDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  serviceType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName?: string | null;
  serviceType?: string | null;
}) {
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().slice(0, 10));
  const [operationDate, setOperationDate] = useState("");
  const [operationType, setOperationType] = useState("");
  const [od, setOd] = useState<EyeData>(emptyEye());
  const [os, setOs] = useState<EyeData>(emptyEye());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFollowupDate(new Date().toISOString().slice(0, 10));
      setOperationDate("");
      setOperationType("");
      setOd(emptyEye());
      setOs(emptyEye());
      setNotes("");
    }
  }, [open]);

  const saveMutation = trpc.medical.saveFollowupSheet.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ بيانات المتابعة بنجاح");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ البيانات"));
    },
  });

  const handleSave = async () => {
    if (!patientId) return;
    setSaving(true);
    try {
      const sheetType =
        (serviceType as "consultant" | "specialist" | "lasik" | "external") || "consultant";
      await saveMutation.mutateAsync({
        patientId,
        sheetType,
        followupItems: [{
          tableIndex: 0,
          followupDate,
          operationDate: operationDate || undefined,
          operationType: operationType || undefined,
          vaOD: od.ucva,
          vaOS: os.ucva,
          refracOD: {
            s: od.s, c: od.c, axis: od.axis, bcva: od.bcva,
            glasses: { s: od.glassesS, c: od.glassesC, axis: od.glassesAxis },
          },
          refracOS: {
            s: os.s, c: os.c, axis: os.axis, bcva: os.bcva,
            glasses: { s: os.glassesS, c: os.glassesC, axis: os.glassesAxis },
          },
          iopOD: od.iop,
          iopOS: os.iop,
          treatment: notes,
          notes,
        }],
      });
    } finally {
      setSaving(false);
    }
  };

  const updOd = (f: keyof EyeData, v: string) => setOd((p) => ({ ...p, [f]: v }));
  const updOs = (f: keyof EyeData, v: string) => setOs((p) => ({ ...p, [f]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-xl"
        dir="rtl"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">
            متابعة {patientName ? `— ${patientName}` : ""}
          </DialogTitle>
          <DialogDescription className="text-right text-muted-foreground sr-only">
            نموذج تسجيل بيانات المتابعة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm shrink-0">تاريخ المتابعة:</Label>
              <DateInput
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="h-7 w-36 text-xs"
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm shrink-0">تاريخ العملية:</Label>
              <DateInput
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                className="h-7 w-36 text-xs"
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm shrink-0">نوع العملية:</Label>
              <SearchableCombobox
                value={operationType}
                onChange={setOperationType}
                options={OP_TYPE_OPTIONS}
                placeholder="اختر النوع"
                className="h-7 w-36 text-xs"
              />
            </div>
          </div>

          {/* Autoref/IOP form */}
          <div className="w-full space-y-2" dir="ltr">
            <div className={rowClass}>
              <div />
              <div className="text-xs font-bold text-center text-muted-foreground">OD (Right)</div>
              <div className="text-xs font-bold text-center text-muted-foreground">OS (Left)</div>
            </div>

            <div className={rowClass}>
              <div className={labelClass}>UCVA</div>
              <RefractionValueSelect value={od.ucva} onChange={(v) => updOd("ucva", v)} options={UCVA_BCVA_OPTIONS} />
              <RefractionValueSelect value={os.ucva} onChange={(v) => updOs("ucva", v)} options={UCVA_BCVA_OPTIONS} />
            </div>

            <div className={rowClass}>
              <div className={labelClass}>BCVA</div>
              <RefractionValueSelect value={od.bcva} onChange={(v) => updOd("bcva", v)} options={UCVA_BCVA_OPTIONS} />
              <RefractionValueSelect value={os.bcva} onChange={(v) => updOs("bcva", v)} options={UCVA_BCVA_OPTIONS} />
            </div>

            <div className={sectionDivider}>
              <div className={labelClass}>Autoref S</div>
              <RefractionValueSelect value={od.s} onChange={(v) => updOd("s", v)} options={SPHERE_OPTIONS} allowEmpty={false} />
              <RefractionValueSelect value={os.s} onChange={(v) => updOs("s", v)} options={SPHERE_OPTIONS} allowEmpty={false} />
            </div>

            <div className={rowClass}>
              <div className={subLabelClass}>C</div>
              <RefractionValueSelect value={od.c} onChange={(v) => updOd("c", v)} options={CYLINDER_OPTIONS} allowEmpty={false} />
              <RefractionValueSelect value={os.c} onChange={(v) => updOs("c", v)} options={CYLINDER_OPTIONS} allowEmpty={false} />
            </div>

            <div className={rowClass}>
              <div className={subLabelClass}>Axis</div>
              <Input value={od.axis} onChange={(e) => updOd("axis", e.target.value)} className={fieldClass} placeholder="0-180" />
              <Input value={os.axis} onChange={(e) => updOs("axis", e.target.value)} className={fieldClass} placeholder="0-180" />
            </div>

            <div className={sectionDivider}>
              <div className={labelClass}>Refraction S</div>
              <RefractionValueSelect value={od.glassesS} onChange={(v) => updOd("glassesS", v)} options={SPHERE_OPTIONS} allowEmpty={false} />
              <RefractionValueSelect value={os.glassesS} onChange={(v) => updOs("glassesS", v)} options={SPHERE_OPTIONS} allowEmpty={false} />
            </div>

            <div className={rowClass}>
              <div className={subLabelClass}>C</div>
              <RefractionValueSelect value={od.glassesC} onChange={(v) => updOd("glassesC", v)} options={CYLINDER_OPTIONS} allowEmpty={false} />
              <RefractionValueSelect value={os.glassesC} onChange={(v) => updOs("glassesC", v)} options={CYLINDER_OPTIONS} allowEmpty={false} />
            </div>

            <div className={rowClass}>
              <div className={subLabelClass}>Axis</div>
              <Input value={od.glassesAxis} onChange={(e) => updOd("glassesAxis", e.target.value)} className={fieldClass} placeholder="0-180" />
              <Input value={os.glassesAxis} onChange={(e) => updOs("glassesAxis", e.target.value)} className={fieldClass} placeholder="0-180" />
            </div>

            <div className={sectionDivider}>
              <div className={labelClass}>IOP</div>
              <Input value={od.iop} onChange={(e) => updOd("iop", e.target.value)} className={fieldClass} placeholder="mmHg" />
              <Input value={os.iop} onChange={(e) => updOs("iop", e.target.value)} className={fieldClass} placeholder="mmHg" />
            </div>
          </div>

          <div className="space-y-1.5" dir="rtl">
            <Label className="text-sm font-semibold">ملاحظات / علاج</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات..."
              rows={3}
            />
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleSave}
            disabled={saving || saveMutation.isPending}
          >
            <Save className="h-4 w-4" />
            حفظ بيانات المتابعة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
