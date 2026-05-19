import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileText, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Mock Data for Reports
const inventorySummary = [
  { id: "ED001", name: "محلول ملحي (Saline)", category: "قطرات العين", quantity: 150, value: 3000 },
  { id: "OP042", name: "كمامات جراحية", category: "غرفة العمليات", quantity: 500, value: 1250 },
  { id: "ED003", name: "سيكلوسبورين 0.1%", category: "قطرات العين", quantity: 0, value: 0 },
];

const additionsLog = [
  { id: "ADD-101", date: "2026-05-18", item: "محلول ملحي (Saline)", quantity: 100, unitPrice: 20, total: 2000, user: "أحمد مسؤل المخزن" },
  { id: "ADD-102", date: "2026-05-15", item: "كمامات جراحية", quantity: 500, unitPrice: 2.5, total: 1250, user: "أحمد مسؤل المخزن" },
];

const dispenseLog = [
  { id: "OUT-201", date: "2026-05-19", item: "محلول ملحي (Saline)", quantity: 5, employee: "د. محمد السعدني", user: "علي (استقبال)" },
  { id: "OUT-202", date: "2026-05-19", item: "كمامات جراحية", quantity: 50, employee: "غرفة العمليات الرئيسية", user: "سارة (تمريض)" },
];

export default function StockroomReports() {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تقارير المخزن"
        subtitle="متابعة المخزون، الاستلام، ومنصرفات المركز"
        icon={<FileText className="h-5 w-5 text-primary" />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/10">
              <Filter className="me-2 h-4 w-4" />
              تصفية
            </Button>
            <Button variant="default" className="bg-primary text-white">
              <Download className="me-2 h-4 w-4" />
              تصدير (Excel)
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1">
          <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">جرد المخزون</TabsTrigger>
          <TabsTrigger value="additions" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">حركات الإستلام (إضافة)</TabsTrigger>
          <TabsTrigger value="dispense" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">حركات المنصرف (صرف)</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-white">
            <Table>
              <TableHeader className="bg-primary/5/50">
                <TableRow>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">اسم الصنف</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">الكمية الحالية</TableHead>
                  <TableHead className="text-right">إجمالي القيمة (ج.م)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventorySummary.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground text-right">{row.id}</TableCell>
                    <TableCell className="font-medium text-right">{row.name}</TableCell>
                    <TableCell className="text-right">{row.category}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.quantity === 0 ? "destructive" : "outline"} className={cn(row.quantity === 0 && "bg-destructive/10 text-destructive-foreground border-destructive/20")}>
                        {row.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-right">{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="additions" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-white">
            <Table>
              <TableHeader className="bg-primary/5/50">
                <TableRow>
                  <TableHead className="text-right">رقم الإذن</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الصنف</TableHead>
                  <TableHead className="text-right">الكمية المضافة</TableHead>
                  <TableHead className="text-right">سعر الوحدة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {additionsLog.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-right">{row.id}</TableCell>
                    <TableCell className="text-muted-foreground text-right">{row.date}</TableCell>
                    <TableCell className="font-medium text-right">{row.item}</TableCell>
                    <TableCell className="font-semibold text-success text-right">{"+"}{row.quantity}</TableCell>
                    <TableCell className="text-right">{row.unitPrice}</TableCell>
                    <TableCell className="font-bold text-right">{row.total}</TableCell>
                    <TableCell className="text-muted-foreground text-sm text-right">{row.user}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="dispense" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-white">
            <Table>
              <TableHeader className="bg-primary/5/50">
                <TableRow>
                  <TableHead className="text-right">رقم الإذن</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الصنف</TableHead>
                  <TableHead className="text-right">الكمية المنصرفة</TableHead>
                  <TableHead className="text-right">المستلم (موظف/قسم)</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispenseLog.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-right">{row.id}</TableCell>
                    <TableCell className="text-muted-foreground text-right">{row.date}</TableCell>
                    <TableCell className="font-medium text-right">{row.item}</TableCell>
                    <TableCell className="font-semibold text-warning text-right">{"-"}{row.quantity}</TableCell>
                    <TableCell className="text-right">{row.employee}</TableCell>
                    <TableCell className="text-muted-foreground text-sm text-right">{row.user}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}