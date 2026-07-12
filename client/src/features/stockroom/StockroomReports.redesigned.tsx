import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileText, Download, Filter, RefreshCw, Pencil, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function getStatusClass(status: string) {
  switch (status) {
    case "متوفر":
      return "bg-success/10 text-success-foreground border-success/20";
    case "كمية قليلة":
      return "bg-warning/10 text-warning-foreground border-warning/20";
    case "نفذ المخزون":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "";
  }
}

export default function StockroomReports() {
  const [activeTab, setActiveTab] = useState("summary");
  const reportsQuery = trpc.stockroom.getReports.useQuery({});

  const inventorySummary = reportsQuery.data?.inventory || [];
  const transactions = reportsQuery.data?.transactions || [];

  const additionsLog = transactions.filter((t: any) => t.type === "add");
  const dispenseLog = transactions.filter((t: any) => t.type === "dispense");

  const [editingTx, setEditingTx] = useState<{
    id: number;
    type: "add" | "dispense";
    quantity: string;
    unitPrice: string;
    employeeName: string;
  } | null>(null);

  const updateTransactionMutation = trpc.stockroom.updateTransaction.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل الحركة بنجاح");
      setEditingTx(null);
      reportsQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "فشل تعديل الحركة"),
  });

  const deleteTransactionMutation = trpc.stockroom.deleteTransaction.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحركة بنجاح");
      reportsQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "فشل حذف الحركة"),
  });

  const handleSaveEdit = () => {
    if (!editingTx) return;
    const quantity = Number(editingTx.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("الكمية غير صحيحة");
      return;
    }
    updateTransactionMutation.mutate({
      id: editingTx.id,
      quantity,
      ...(editingTx.type === "add"
        ? { unitPrice: Number(editingTx.unitPrice) || undefined }
        : { employeeName: editingTx.employeeName || undefined }),
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تقارير المخزن"
        subtitle="متابعة المخزون، الاستلام، ومنصرفات المركز"
        icon={<FileText className="h-5 w-5 text-primary" />}
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => reportsQuery.refetch()}
              variant="outline"
              size="icon"
              disabled={reportsQuery.isFetching}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  reportsQuery.isFetching && "animate-spin",
                )}
              />
            </Button>
            <Button
              variant="outline"
              className="text-primary border-primary/20 hover:bg-primary/10"
            >
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

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
        dir="rtl"
      >
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-2xl w-fit mb-6">
          <button
            type="button"
            className={cn(
              "px-4 py-1.5 text-xs font-black rounded-xl transition-all duration-150 cursor-pointer",
              activeTab === "summary"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("summary")}
          >
            جرد المخزون
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-1.5 text-xs font-black rounded-xl transition-all duration-150 cursor-pointer",
              activeTab === "additions"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("additions")}
          >
            حركات الإستلام (إضافة)
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-1.5 text-xs font-black rounded-xl transition-all duration-150 cursor-pointer",
              activeTab === "dispense"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("dispense")}
          >
            حركات المنصرف (صرف)
          </button>
        </div>

        <TabsContent value="summary" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-card">
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
                {reportsQuery.isPending
                  ? Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-20" />
                          </TableCell>
                        </TableRow>
                      ))
                  : inventorySummary.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground text-right">
                          {row.itemCode || "-"}
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.category || "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-semibold",
                              getStatusClass(row.status),
                            )}
                          >
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
          <div className="rounded-lg border border-border/60 bg-card">
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
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsQuery.isPending
                  ? Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-8" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                        </TableRow>
                      ))
                  : additionsLog.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs text-right">
                          {row.id}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-xs">
                          {new Date(row.createdAt).toLocaleString("ar-EG")}
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          {row.itemName}
                        </TableCell>
                        <TableCell className="font-semibold text-success text-right">
                          {"+"}
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.unitPrice || "-"}
                        </TableCell>
                        <TableCell className="font-bold text-right">
                          {row.totalValue || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm text-right">
                          {row.performedBy}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              onClick={() =>
                                setEditingTx({
                                  id: row.id,
                                  type: "add",
                                  quantity: String(row.quantity),
                                  unitPrice: String(row.unitPrice || ""),
                                  employeeName: "",
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm(`حذف حركة الإستلام رقم ${row.id}؟`)) {
                                  deleteTransactionMutation.mutate({ id: row.id });
                                }
                              }}
                              disabled={deleteTransactionMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="dispense" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-card">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="text-right">رقم الإذن</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الصنف</TableHead>
                  <TableHead className="text-right">الكمية المنصرفة</TableHead>
                  <TableHead className="text-right">
                    المستلم (موظف/قسم)
                  </TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsQuery.isPending
                  ? Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-8" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                        </TableRow>
                      ))
                  : dispenseLog.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs text-right">
                          {row.id}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-xs">
                          {new Date(row.createdAt).toLocaleString("ar-EG")}
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          {row.itemName}
                        </TableCell>
                        <TableCell className="font-semibold text-warning text-right">
                          {"-"}
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.employeeName || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm text-right">
                          {row.performedBy}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              onClick={() =>
                                setEditingTx({
                                  id: row.id,
                                  type: "dispense",
                                  quantity: String(row.quantity),
                                  unitPrice: "",
                                  employeeName: row.employeeName || "",
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm(`حذف حركة الصرف رقم ${row.id}؟`)) {
                                  deleteTransactionMutation.mutate({ id: row.id });
                                }
                              }}
                              disabled={deleteTransactionMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              تعديل حركة {editingTx?.type === "add" ? "الإستلام" : "الصرف"}
            </DialogTitle>
          </DialogHeader>
          {editingTx && (
            <div className="space-y-3">
              <div>
                <Label>الكمية</Label>
                <Input
                  type="number"
                  value={editingTx.quantity}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, quantity: e.target.value })
                  }
                />
              </div>
              {editingTx.type === "add" ? (
                <div>
                  <Label>سعر الوحدة</Label>
                  <Input
                    type="number"
                    value={editingTx.unitPrice}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, unitPrice: e.target.value })
                    }
                  />
                </div>
              ) : (
                <div>
                  <Label>المستلم (موظف/قسم)</Label>
                  <Input
                    value={editingTx.employeeName}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, employeeName: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={handleSaveEdit}
              disabled={updateTransactionMutation.isPending}
            >
              {updateTransactionMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
