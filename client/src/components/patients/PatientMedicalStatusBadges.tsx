import { cn } from "@/lib/utils";

export type PatientMedicalStatus = {
  autoref: boolean;
  afterRef: boolean;
  glasses: boolean;
  pentacam: boolean;
  prescription: boolean;
  tests: boolean;
  reports: boolean;
};

type Badge = { color: string; title: string };

function getBadges(status: PatientMedicalStatus): Badge[] {
  const badges: Badge[] = [];
  if (status.autoref && status.afterRef) badges.push({ color: "bg-emerald-500", title: "قياس الانكسار الآلي + ما بعد الانكسار" });
  if (status.glasses) badges.push({ color: "bg-blue-500", title: "مقاس النظارة / الانكسار" });
  if (status.pentacam) badges.push({ color: "bg-red-500", title: "بيانات بنتاكام" });
  if (status.prescription || status.tests || status.reports) badges.push({ color: "bg-purple-500", title: "تشخيص / روشتة / تحاليل" });
  if (badges.length === 0) badges.push({ color: "bg-slate-600", title: "لا توجد بيانات طبية" });
  return badges;
}

/** Thin top-edge strip for mobile cards. Render outside CardContent padding. */
export function PatientMedicalStatusStrip({ status, className }: { status: PatientMedicalStatus | undefined; className?: string }) {
  if (!status) return null;
  const badges = getBadges(status);
  return (
    <div className={cn("flex h-[3px] w-full overflow-hidden rounded-t", className)}>
      {badges.map((b) => (
        <div key={b.title} className={cn("flex-1", b.color)} title={b.title} />
      ))}
    </div>
  );
}

/** Compact dot row for desktop table cells. */
export function PatientMedicalStatusDots({ status }: { status: PatientMedicalStatus | undefined }) {
  if (!status) return null;
  const badges = getBadges(status);
  return (
    <div className="flex items-center justify-center gap-0.5">
      {badges.map((b) => (
        <span
          key={b.title}
          className={cn("inline-block h-2 w-2 shrink-0 rounded-full", b.color)}
          title={b.title}
        />
      ))}
    </div>
  );
}
