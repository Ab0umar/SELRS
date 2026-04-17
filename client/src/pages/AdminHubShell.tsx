import { useLocation, Link } from "wouter";
import AdminUsers from "./AdminUsers";
import AdminMigrations from "./AdminMigrations";
import AdminApiTools from "./AdminApiTools";
import AdminStatus from "./AdminStatus";
import AdminSettings from "./AdminSettings";
import AdminPermissions from "./AdminPermissions";
import AdminSheets from "./AdminSheets";
import AdminSheetDesigner from "./AdminSheetDesigner";
import AdminDoctors from "./AdminDoctors";
import AdminPentacamFailed from "./AdminPentacamFailed";
import AdminServices from "./AdminServices";
import TestsManagement from "./TestsManagement";
import AdminSheetCopies from "./AdminSheetCopies";
import AdminCardVisibility from "./AdminCardVisibility";
import AdminDiagnostics from "./AdminDiagnostics";
import AdminNotificationSettings from "./AdminNotificationSettings";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin-hub/diagnostics", label: "🔧 التشخيص والإصلاح" },
  { href: "/admin-hub/users", label: "المستخدمون" },
  { href: "/admin-hub/permissions", label: "الصلاحيات" },
  { href: "/admin-hub/services", label: "الخدمات" },
  { href: "/admin-hub/tests", label: "التحاليل" },
  { href: "/admin-hub/card-visibility", label: "إعدادات الكروت" },
  { href: "/admin-hub/notifications", label: "إعدادات الإخطارات" },
  { href: "/admin-hub/settings", label: "الإعدادات" },
  { href: "/admin-hub/api-tools", label: "أدوات API" },
  { href: "/admin-hub/migrations", label: "الترحيلات" },
  { href: "/admin-hub/status", label: "الحالة" },
  { href: "/admin-hub/sheets", label: "الشيتات" },
  { href: "/admin-hub/sheet-designer", label: "مصمم الشيت" },
  { href: "/admin-hub/sheet-copies", label: "نسخ الشيت" },
  { href: "/admin-hub/doctors", label: "الأطباء" },
  { href: "/admin-hub/pentacam-failed", label: "Pentacam Failed" },
];

export default function AdminHubShell() {
  const [location] = useLocation();

  const renderComponent = () => {
    if (location === "/admin-hub" || location === "/admin-hub/") {
      return (
        <div className="rounded-lg border bg-white p-4 text-right text-sm text-slate-700">
          اختر صفحة إدارية من الأزرار أعلاه لإدارة النظام من مكان واحد.
        </div>
      );
    }
    if (location === "/admin-hub/users" || location === "/admin/users") return <AdminUsers />;
    if (location === "/admin-hub/migrations" || location === "/admin/migrations") return <AdminMigrations />;
    if (location === "/admin-hub/api-tools" || location === "/admin/api-tools") return <AdminApiTools />;
    if (location === "/admin-hub/status" || location === "/admin/status") return <AdminStatus />;
    if (location === "/admin-hub/card-visibility" || location === "/admin/card-visibility") return <AdminCardVisibility />;
    if (location === "/admin-hub/settings/pricing-rules" || location === "/admin/settings/pricing-rules") return <AdminSettings pricingOnly />;
    if (location === "/admin-hub/settings" || location === "/admin/settings") return <AdminSettings />;
    if (location === "/admin-hub/permissions" || location === "/admin/permissions") return <AdminPermissions />;
    if (location === "/admin-hub/sheets" || location === "/admin/sheets") return <AdminSheets />;
    if (location === "/admin-hub/sheet-designer" || location === "/admin/sheet-designer") return <AdminSheetDesigner />;
    if (location === "/admin-hub/sheet-copies" || location === "/admin/sheet-copies") return <AdminSheetCopies />;
    if (location === "/admin-hub/doctors" || location === "/admin/doctors") return <AdminDoctors />;
    if (location === "/admin-hub/pentacam-failed" || location === "/admin/pentacam-failed") return <AdminPentacamFailed />;
    if (location === "/admin-hub/services" || location === "/admin/services") return <AdminServices />;
    if (location === "/admin-hub/tests" || location === "/admin/tests") return <TestsManagement />;
    if (location === "/admin-hub/diagnostics") return <AdminDiagnostics />;
    if (location === "/admin-hub/notifications" || location === "/admin/notifications") return <AdminNotificationSettings />;

    return (
      <div className="rounded-lg border bg-white p-4 text-right text-sm text-slate-700">
        اختر صفحة إدارية من الأزرار أعلاه لإدارة النظام من مكان واحد.
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="space-y-3">
        {/* HIGHLIGHTED: Diagnostics Button */}
        <div className="mb-4">
          <Link href="/admin-hub/diagnostics">
            <Button
              size="lg"
              className={`w-full bg-green-600 hover:bg-green-700 text-white ${
                location === "/admin-hub/diagnostics" ? 'ring-2 ring-green-400' : ''
              }`}
            >
              🔧 التشخيص والإصلاح - أدوات إصلاح البيانات
            </Button>
          </Link>
        </div>

        {/* Other Admin Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {navItems.filter(item => item.href !== "/admin-hub/diagnostics").map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="outline"
                size="sm"
                className={`min-w-[140px] ${location === item.href ? 'bg-slate-100' : ''}`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {renderComponent()}
    </div>
  );
}
