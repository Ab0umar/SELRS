import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PatientPicker from "@/components/PatientPicker";
import {
  Calendar,
  Eye,
  FileText,
  LayoutTemplate,
  Plus,
  Trash2,
  User,
  Copy,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PickedPatient = {
  id: number;
  fullName: string;
};

type FormStatus = "approved" | "draft";

const SHEET_LINKS = [
  {
    key: "consultant",
    title: "شيت كشف",
    description: "استمارة الكشف الشامل وفحص قاع العين للعيادات.",
    path: (id: number) => `/sheets/consultant/${id}`,
    status: "approved" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "followup",
    title: "متابعة استشاري",
    description: "استمارة المتابعة الدورية وفحص الحالات المعالجة.",
    path: (id: number) => `/sheets/consultant/${id}?tab=followup`,
    status: "draft" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "specialist",
    title: "شيت مقاس نظاره / اشعه خارجي",
    description: "فحص قياس النظر وطلب الأشعة والفحوصات الخارجية.",
    path: (id: number) => `/sheets/specialist/${id}`,
    status: "approved" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "lasik",
    title: "شيت تصحيح ابصار",
    description: "استمارة الفحص الجراحي وتصحيح الإبصار بالليزر.",
    path: (id: number) => `/sheets/lasik/${id}`,
    status: "approved" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "external",
    title: "شيت د.الصواف",
    description: "النموذج المخصص لحالات وعيادات د. الصواف.",
    path: (id: number) => `/sheets/external/${id}`,
    status: "draft" as FormStatus,
    doctorLabel: "قالب النظام",
  },
] as const;

const BLANK_COPIES = [
  {
    key: "consultant",
    title: "نسخة كشف (فارغة)",
    description: "قالب الكشف الاستشاري الأصلي غير مخصص لمريض.",
    path: "/sheets/consultant/0?original=1",
    tag: "كشف استشاري",
  },
  {
    key: "consultant-followup",
    title: "نسخة متابعة استشاري (فارغة)",
    description: "قالب متابعة الاستشاري الأصلي برقم 0.",
    path: "/sheets/consultant/0/followup?original=1",
    tag: "متابعة",
  },
  {
    key: "specialist",
    title: "نسخة مقاس نظارة / أشعة (فارغة)",
    description: "قالب قياس النظارة والأشعة الخارجية غير مخصص.",
    path: "/sheets/specialist/0?original=1",
    tag: "مقاس نظارة",
  },
  {
    key: "lasik",
    title: "نسخة تصحيح إبصار (فارغة)",
    description: "قالب تصحيح الإبصار والليزر برقم 0.",
    path: "/sheets/lasik/0?original=1",
    tag: "ليزك",
  },
  {
    key: "lasik-followup",
    title: "نسخة متابعة ليزك (فارغة)",
    description: "قالب متابعة الليزك الأصلية.",
    path: "/sheets/lasik/0/followup?original=1",
    tag: "متابعة ليزك",
  },
  {
    key: "external",
    title: "نسخة د. الصواف (فارغة)",
    description: "القالب المخصص لحالات د. الصواف غير مخصص.",
    path: "/sheets/external/0?original=1",
    tag: "استشاري خارجي",
  },
];

function withOriginalFlag(path: string) {
  return path.includes("?") ? `${path}&original=1` : `${path}?original=1`;
}

export default function AdminSheets() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<PickedPatient | null>(null);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"patient-forms" | "blank-copies">("patient-forms");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatientSheets = useMemo(() => {
    if (!searchQuery.trim()) return SHEET_LINKS;
    const q = searchQuery.toLowerCase().trim();
    return SHEET_LINKS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredBlankCopies = useMemo(() => {
    if (!searchQuery.trim()) return BLANK_COPIES;
    const q = searchQuery.toLowerCase().trim();
    return BLANK_COPIES.filter(
      (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const openPatientSheet = (pathBuilder: (id: number) => string) => {
    if (!selectedPatient) {
      toast.error("يرجى اختيار مريض أولاً لفتح الشيت المخصص له.");
      setPatientPickerOpen(true);
      return;
    }
    const fullPath = withOriginalFlag(pathBuilder(selectedPatient.id));
    setLocation(fullPath);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-6 text-right" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="ملفات الفحص الإلكترونية والشيتات"
          subtitle="معاينة وفتح استمارات الفحص المخصصة للمرضى أو استعراض القوالب الأصلية الفارغة للنظام."
          icon={<Layers className="h-5 w-5" />}
        />
        <Button
          type="button"
          className="selrs-gradient-btn shrink-0 gap-2 self-start text-primary-foreground sm:mt-1"
          onClick={() => setLocation("/admin-hub/sheet-designer")}
        >
          <Plus className="h-4 w-4" />
          نموذج جديد
        </Button>
      </div>

      {/* Tabs Switcher */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "patient-forms" | "blank-copies")}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger
              value="patient-forms"
              className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs"
            >
              <User className="size-3.5 ml-1.5" />
              <span>استمارات فحص المرضى</span>
            </TabsTrigger>
            <TabsTrigger
              value="blank-copies"
              className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs"
            >
              <Copy className="size-3.5 ml-1.5" />
              <span>القوالب والنسخ الأصلية (فارغة)</span>
            </TabsTrigger>
          </TabsList>

          <div className="w-full sm:w-72">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="بحث في أسماء ونوع النماذج..."
            />
          </div>
        </div>

        {/* Tab 1: Patient-Linked Forms */}
        <TabsContent value="patient-forms" className="space-y-6 mt-4">
          {/* Patient Selector Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <User className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">المريض المحدد حالياً:</span>
                <div className="text-sm font-black text-foreground mt-0.5">
                  {selectedPatient ? selectedPatient.fullName : "لم يتم تحديد مريض بعد"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={selectedPatient ? "outline" : "default"}
                size="sm"
                className="rounded-xl font-bold gap-2 text-xs"
                onClick={() => setPatientPickerOpen(true)}
              >
                <User className="size-3.5" />
                <span>{selectedPatient ? "تغيير المريض" : "اختيار مريض للفتح"}</span>
              </Button>
              {selectedPatient && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={() => setSelectedPatient(null)}
                >
                  إلغاء التحديد
                </Button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatientSheets.map((item) => (
              <Card
                key={item.key}
                className="border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-black text-foreground">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </div>
                    <Badge variant={item.status === "approved" ? "default" : "secondary"} className="text-[10px]">
                      {item.doctorLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <Button
                    type="button"
                    className="w-full rounded-xl text-xs font-bold gap-2"
                    onClick={() => openPatientSheet(item.path)}
                  >
                    <ExternalLink className="size-3.5" />
                    <span>فتح الشيت {selectedPatient ? `لـ ${selectedPatient.fullName}` : ""}</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Blank System Copies */}
        <TabsContent value="blank-copies" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBlankCopies.map((item) => (
              <Card
                key={item.key}
                className="border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-black text-foreground">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted/40">
                      {item.tag}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl text-xs font-bold gap-2 hover:bg-primary/5 hover:border-primary/30"
                    onClick={() => setLocation(item.path)}
                  >
                    <ExternalLink className="size-3.5 text-primary" />
                    <span>معاينة القالب الأصلي الفارغ</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Patient Picker Modal */}
      {patientPickerOpen && (
        <PatientPicker
          open={patientPickerOpen}
          onClose={() => setPatientPickerOpen(false)}
          onSelect={(patient) => {
            setSelectedPatient({
              id: patient.id,
              fullName: patient.name || "مريض بدون اسم",
            });
            setPatientPickerOpen(false);
            toast.success(`تم تحديد المريض: ${patient.name || "مريض"}`);
          }}
        />
      )}
    </div>
  );
}
