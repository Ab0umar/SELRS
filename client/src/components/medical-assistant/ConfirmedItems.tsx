import type {
  ConfirmedInvestigation,
  ConfirmedMedication,
} from "@shared/clinical-catalog-items";
import { Button } from "@/components/ui/button";

export function ConfirmedItems({
  medicines = [],
  tests = [],
  disabled,
  removeMedicine,
  removeTest,
}: {
  medicines?: ConfirmedMedication[];
  tests?: ConfirmedInvestigation[];
  disabled?: boolean;
  removeMedicine?: (name: string) => void;
  removeTest?: (name: string) => void;
}) {
  if (!medicines.length && !tests.length) return null;
  return (
    <section
      className="space-y-2 rounded border p-2"
      aria-label="بنود مؤكدة خارج الكتالوج"
    >
      <p className="text-sm text-muted-foreground print:hidden">
        بنود أكدها الطبيب لهذه الزيارة؛ لم تُضف للكتالوج.
      </p>
      {medicines.map((item) => (
        <div
          key={item.medicationName}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <div>
            <p dir="auto">{item.medicationName}</p>
            <p className="text-sm" dir="auto">
              {[item.dosage, item.frequency, item.duration, item.instructions]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {removeMedicine && (
            <Button
              className="print:hidden"
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => removeMedicine(item.medicationName)}
            >
              حذف {item.medicationName}
            </Button>
          )}
        </div>
      ))}
      {tests.map((item) => (
        <div
          key={item.testName}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <span dir="auto">
            {item.testName}
            {item.notes ? ` · ${item.notes}` : ""}
          </span>
          {removeTest && (
            <Button
              className="print:hidden"
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => removeTest(item.testName)}
            >
              حذف {item.testName}
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}
