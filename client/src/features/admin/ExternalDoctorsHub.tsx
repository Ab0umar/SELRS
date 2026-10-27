import { Link } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import ExternalDoctors from "@/pages/ExternalDoctors";
import ExternalDoctorReferrals from "@/pages/ExternalDoctorReferrals";

export default function ExternalDoctorsHub({
  referrals = false,
}: {
  referrals?: boolean;
}) {
  const { canAccess } = usePermissions();
  return (
    <section className="w-full space-y-4" dir="rtl">
      <nav
        aria-label="أقسام الأطباء الخارجيين"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {[
          {
            href: "/admin-hub/external-doctors",
            label: "حسابات الأطباء",
            active: !referrals,
          },
          {
            href: "/admin-hub/external-referrals",
            label: "الحالات والإحالات",
            active: referrals,
          },
        ]
          .filter((tab) => canAccess(tab.href))
          .map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-semibold ${tab.active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
            >
              {tab.label}
            </Link>
          ))}
      </nav>
      {referrals ? <ExternalDoctorReferrals hideSectionLink /> : <ExternalDoctors hideSectionLink />}
    </section>
  );
}
