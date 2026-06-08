import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

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

function getBadges(
  status: PatientMedicalStatus,
  canAccess: (path: string) => boolean,
): Badge[] {
  const badges: Badge[] = [];
  if (canAccess("/examination") && status.autoref && status.afterRef)
    badges.push({ color: "bg-success/100", title: "قياس الانكسار الآلي + ما بعد الانكسار" });
  if (canAccess("/refraction") && status.glasses)
    badges.push({ color: "bg-primary/50", title: "مقاس النظارة / الانكسار" });
  if (canAccess("/sheets") && status.pentacam)
    badges.push({ color: "bg-destructive/100", title: "بيانات بنتاكام" });
  if (
    (canAccess("/prescription") && status.prescription) ||
    (canAccess("/request-tests") && status.tests) ||
    (canAccess("/medical-reports") && status.reports)
  )
    badges.push({ color: "bg-secondary", title: "تشخيص / روشتة / تحاليل" });
  if (badges.length === 0)
    badges.push({ color: "bg-muted", title: "لا توجد بيانات طبية" });
  return badges;
}

/** Thin top-edge strip for mobile cards. Render outside CardContent padding. */
export function PatientMedicalStatusStrip({
  status,
  className,
}: {
  status: PatientMedicalStatus | undefined;
  className?: string;
}) {
  const { canAccess } = usePermissions();
  if (!status) return null;
  const badges = getBadges(status, canAccess);
  return (
    <div className={cn("flex h-[3px] w-full overflow-hidden rounded-t", className)}>
      {badges.map((b) => (
        <div key={b.title} className={cn("flex-1", b.color)} title={b.title} />
      ))}
    </div>
  );
}

/** Compact dot row for desktop table cells. */
export function PatientMedicalStatusDots({
  status,
}: {
  status: PatientMedicalStatus | undefined;
}) {
  const { canAccess } = usePermissions();
  if (!status) return null;
  const badges = getBadges(status, canAccess);
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
