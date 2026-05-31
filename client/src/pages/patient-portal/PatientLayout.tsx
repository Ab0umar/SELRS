import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/my/file", label: "ملفي الطبي" },
  { href: "/my/scans", label: "الأشعة" },
  { href: "/my/book", label: "حجز موعد" },
  { href: "/my/bookings", label: "مواعيدي" },
];

export default function PatientLayout({ children }: { children: ReactNode }) {
  const { name, patientCode, logout } = usePatientAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{name ?? "المريض"}</p>
            {patientCode && <p className="text-xs text-gray-500">كود: {patientCode}</p>}
          </div>
          <Button size="sm" variant="ghost" onClick={logout} className="text-red-600 hover:text-red-700">
            خروج
          </Button>
        </div>
        <nav className="max-w-2xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  location.startsWith(item.href)
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
