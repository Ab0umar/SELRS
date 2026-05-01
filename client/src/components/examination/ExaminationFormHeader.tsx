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
    <div className="mb-6 rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
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
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={isFollowup} onCheckedChange={(checked) => setIsFollowup(Boolean(checked))} />
          <span className="font-bold">متابعة</span>
        </label>
      </div>
    </div>
  );
}

