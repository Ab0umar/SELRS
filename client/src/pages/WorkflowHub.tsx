import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ListChecks, RefreshCw } from "lucide-react";

type WorkflowItem = {
  title: string;
  description: string;
  path: string;
  icon: typeof Calendar;
};

const ITEMS: WorkflowItem[] = [
  {
    title: "Operations",
    description: "قائمة المواعيد والعمليات",
    path: "/operations",
    icon: Calendar,
  },
  {
    title: "Today",
    description: "مرضى اليوم",
    path: "/today",
    icon: Clock,
  },
  {
    title: "Visits",
    description: "سجل الزيارات",
    path: "/visits",
    icon: ListChecks,
  },
  {
    title: "Followups",
    description: "المتابعات",
    path: "/followups",
    icon: RefreshCw,
  },
];

export default function WorkflowHub() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>العمل اليومي</CardTitle>
            <CardDescription>افتح الشاشة المطلوبة مباشرة</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="outline"
                    className="h-auto justify-start rounded-2xl border-slate-200 bg-white p-4 text-right shadow-sm hover:bg-slate-50"
                    onClick={() => setLocation(item.path)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-base font-semibold text-slate-900">{item.title}</span>
                        <span className="text-xs text-slate-500">{item.description}</span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
