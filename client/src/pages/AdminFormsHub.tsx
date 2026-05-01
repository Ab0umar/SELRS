import { Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminSheets from "./AdminSheets";
import AdminSheetDesigner from "./AdminSheetDesigner";
import AdminSheetCopies from "./AdminSheetCopies";

/** تجميع اختياري: `/admin/forms` — كل قسم يحتفظ برأس الصفحة الخاص به. */
export default function AdminFormsHub() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 pb-8 text-right lg:pb-10" dir="rtl">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Layers className="h-4 w-4" />
        مركز النماذج — اختر القسم
      </p>

      <Tabs defaultValue="manage" persistKey="admin-forms-hub" className="w-full">
        <TabsList className="mb-4 flex h-auto min-h-[2.75rem] w-full flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1.5">
          <TabsTrigger value="manage" className="shrink-0 rounded-lg text-xs sm:text-sm">
            النماذج
          </TabsTrigger>
          <TabsTrigger value="designer" className="shrink-0 rounded-lg text-xs sm:text-sm">
            مصمم النماذج
          </TabsTrigger>
          <TabsTrigger value="copies" className="shrink-0 rounded-lg text-xs sm:text-sm">
            نسخ النماذج
          </TabsTrigger>
        </TabsList>
        <TabsContent value="manage" className="mt-0">
          <AdminSheets />
        </TabsContent>
        <TabsContent value="designer" className="mt-0">
          <AdminSheetDesigner />
        </TabsContent>
        <TabsContent value="copies" className="mt-0">
          <AdminSheetCopies />
        </TabsContent>
      </Tabs>
    </div>
  );
}
