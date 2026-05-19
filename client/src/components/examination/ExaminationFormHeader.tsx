import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseExaminationFormResult } from "@/hooks/examination/useExaminationForm";

interface ExaminationFormHeaderProps {
  form: UseExaminationFormResult;
}

export default function ExaminationFormHeader({ form }: ExaminationFormHeaderProps) {
  const { visitDate, setVisitDate, isFollowup, setIsFollowup } = form;

  return (
    <div className="mb-6 rounded-lg border border-border/80 bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="visit-date-top" className="font-bold whitespace-nowrap">تاريخ الزيارة</Label>
          <Input
            name="visit-date-top"
            id="visit-date-top"
            type="date"
            value={visitDate}
            onChange={(event) => setVisitDate(event.target.value)}
            dir="ltr"
            className="text-sm border px-2 py-1"
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer rounded-md border-2 border-warning bg-warning/10 px-3 py-2 shadow-sm">
          <Checkbox
            checked={isFollowup}
            onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
            className="h-5 w-5 border-2 border-warning data-[state=checked]:bg-warning data-[state=checked]:text-warning-foreground"
          />
          <span className="text-base font-extrabold text-warning">متابعة</span>
        </label>
      </div>
    </div>
  );
}
