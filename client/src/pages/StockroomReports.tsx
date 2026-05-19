import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileText, Download, Filter, RefreshCw } from "lucide-react";
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
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

function getStatusClass(status: string) {
  switch (status) {
    case "متوفر":
      return "bg-success/10 text-success-foreground border-success/20";
    case "كمية قليلة":
      return "bg-warning/10 text-warning-foreground border-warning/20";
    case "نفذ المخزون":
      return "bg-destructive/10 text-destructive-foreground border-destructive/20";
    default:
      return "";
  }
}

export default function StockroomReports() {
  const [activeTab, setActiveTab] = useState("summary");
  const reportsQuery = trpc.stockroom.getReports.useQuery({});

  const inventorySummary = reportsQuery.data?.inventory || [];
  const transactions = reportsQuery.data?.transactions || [];
  
  const additionsLog = transactions.filter(t => t.type === 'add');
  const dispenseLog = transactions.filter(t => t.type === 'dispense');

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تقارير المخزن"
        subtitle="متابعة المخزون، الاستلام، ومنصرفات المركز"
        icon={<FileText className="h-5 w-5 text-primary" />}
        action={
          <div className="flex gap-2">
            <Button onClick={() => reportsQuery.refetch()} variant="outline" size="icon" disabled={reportsQuery.isFetching}>
              <RefreshCw className={cn("h-4 w-4", reportsQuery.isFetching && "animate-spin")} />
            </Button>
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
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">اسم الصنف</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">الكمية الحالية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsQuery.isPending ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : inventorySummary.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground text-right">{row.itemCode || "-"}</TableCell>
                    <TableCell className="font-medium text-right">{row.name}</TableCell>
                    <TableCell className="text-right">{row.category || "-"}</TableCell>
                    <TableCell className="text-right font-bold">{row.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn("font-semibold", getStatusClass(row.status))}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="additions" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-white">
            <Table>
              <TableHeader className="bg-primary/5">
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
                {reportsQuery.isPending ? (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : additionsLog.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-right">{row.id}</TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">{new Date(row.createdAt).toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="font-medium text-right">{row.itemName}</TableCell>
                    <TableCell className="font-semibold text-success text-right">{"+"}{row.quantity}</TableCell>
                    <TableCell className="text-right">{row.unitPrice || "-"}</TableCell>
                    <TableCell className="font-bold text-right">{row.totalValue || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm text-right">{row.performedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="dispense" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-white">
            <Table>
              <TableHeader className="bg-primary/5">
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
                {reportsQuery.isPending ? (
                   Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : dispenseLog.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-right">{row.id}</TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">{new Date(row.createdAt).toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="font-medium text-right">{row.itemName}</TableCell>
                    <TableCell className="font-semibold text-warning text-right">{"-"}{row.quantity}</TableCell>
                    <TableCell className="text-right">{row.employeeName || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm text-right">{row.performedBy}</TableCell>
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
