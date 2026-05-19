import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Archive, PlusCircle, Search, MinusCircle, List, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

export default function StockroomCategory() {
  const categoryTitle = "قطرات العين";
  
  // Queries
  const itemsQuery = trpc.stockroom.getItems.useQuery({ category: categoryTitle });
  const utils = trpc.useContext();

  // Mutations
  const createItemMutation = trpc.stockroom.createItem.useMutation({
    onSuccess: () => {
      toast.success("تم تعريف الصنف الجديد بنجاح");
      setIsNewItemDialogOpen(false);
      resetNewItemForm();
      itemsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const receiveMutation = trpc.stockroom.receiveStock.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الاستلام وتحديث المخزون بنجاح");
      setActiveTab("inventory");
      itemsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const dispenseMutation = trpc.stockroom.dispenseStock.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل عملية الصرف بنجاح");
      setActiveTab("inventory");
      itemsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Tab state
  const [activeTab, setActiveTab] = useState("inventory");
  
  // Form states
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  
  // States for receiving a brand new, unregistered item in the Add tab
  const [isReceivingNewItem, setIsReceivingNewItem] = useState(false);
  const [receiveNewName, setReceiveNewName] = useState("");
  const [receiveNewCode, setReceiveNewCode] = useState("");
  const [receiveNewSupplier, setReceiveNewSupplier] = useState("");

  // New Item Dialog states
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [newItemSupplier, setNewItemSupplier] = useState("");

  const resetNewItemForm = () => {
    setNewItemName("");
    setNewItemCode("");
    setNewItemSupplier("");
  };

  const handleOpenAdd = (item?: {id: number}) => {
    if (item) {
      setSelectedItemId(String(item.id));
      setIsReceivingNewItem(false);
    } else {
      setSelectedItemId("");
    }
    setQuantity("");
    setUnitPrice("");
    setReceiveNewName("");
    setReceiveNewCode("");
    setReceiveNewSupplier("");
    setActiveTab("add");
  };

  const handleOpenDispense = (item: {id: number}) => {
    setSelectedItemId(String(item.id));
    setQuantity("");
    setEmployeeName("");
    setActiveTab("dispense");
  };

  const handleSubmitAdd = () => {
    if (!isReceivingNewItem && !selectedItemId) {
      toast.error("يرجى اختيار الصنف");
      return;
    }
    if (isReceivingNewItem && !receiveNewName) {
      toast.error("يرجى إدخال اسم الصنف الجديد");
      return;
    }

    receiveMutation.mutate({
      isNewItem: isReceivingNewItem,
      itemId: selectedItemId ? Number(selectedItemId) : undefined,
      newItem: isReceivingNewItem ? {
        name: receiveNewName,
        itemCode: receiveNewCode,
        supplier: receiveNewSupplier,
        category: categoryTitle
      } : undefined,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalValue: Number(quantity) * Number(unitPrice)
    });
  };

  const handleSubmitDispense = () => {
    if (!selectedItemId) {
      toast.error("يرجى اختيار الصنف");
      return;
    }
    dispenseMutation.mutate({
      itemId: Number(selectedItemId),
      quantity: Number(quantity),
      employeeName: employeeName
    });
  };

  const handleCreateNewItem = () => {
    if (!newItemName) {
      toast.error("اسم الصنف مطلوب");
      return;
    }
    createItemMutation.mutate({
      name: newItemName,
      itemCode: newItemCode,
      supplier: newItemSupplier,
      category: categoryTitle
    });
  };

  const totalValue = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={categoryTitle}
        subtitle={`إدارة الأصناف والكميات لـ ${categoryTitle}`}
        icon={<Archive className="h-5 w-5 text-primary" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1">
          <TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <List className="me-2 h-4 w-4" />
            جرد المخزون
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <ArrowDownToLine className="me-2 h-4 w-4" />
            إضافة رصيد (استلام)
          </TabsTrigger>
          <TabsTrigger value="dispense" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <ArrowUpFromLine className="me-2 h-4 w-4" />
            صرف رصيد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ابحث بالاسم أو الكود..." className="pr-9" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => itemsQuery.refetch()} variant="outline" size="icon" disabled={itemsQuery.isFetching}>
                <RefreshCw className={cn("h-4 w-4", itemsQuery.isFetching && "animate-spin")} />
              </Button>
              <Button onClick={() => setIsNewItemDialogOpen(true)} variant="default" className="bg-primary text-white">
                <PlusCircle className="me-2 h-4 w-4" />
                تعريف صنف جديد
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-white">
            <Table>
              <TableHeader className="bg-blue-50/50">
                <TableRow>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">اسم الصنف</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الصلاحية</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsQuery.isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-left"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : itemsQuery.data?.map((item) => (
                  <TableRow key={item.id} className="hover:bg-blue-50/30">
                    <TableCell className="font-mono text-xs text-muted-foreground text-right">{item.itemCode || "-"}</TableCell>
                    <TableCell className="font-medium text-foreground text-right">{item.name}</TableCell>
                    <TableCell className="font-semibold text-foreground text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn("font-semibold", getStatusClass(item.status))}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('ar-EG') : "-"}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                          onClick={() => handleOpenAdd(item)}
                        >
                          <ArrowDownToLine className="me-1.5 h-3.5 w-3.5" />
                          إضافة
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-warning hover:text-warning hover:bg-warning/10 border-warning/20"
                          onClick={() => handleOpenDispense(item)}
                          disabled={item.quantity === 0}
                        >
                          <ArrowUpFromLine className="me-1.5 h-3.5 w-3.5" />
                          صرف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-white p-6 sm:p-8 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 pb-4 mb-6 gap-4">
              <h2 className="text-lg font-bold text-primary flex items-center">
                <ArrowDownToLine className="me-2 h-5 w-5" />
                إذن استلام كمية
              </h2>
              <div className="flex bg-muted/50 p-1 rounded-md w-full sm:w-[240px]">
                <button 
                  type="button"
                  className={cn("flex-1 text-sm py-1.5 rounded-sm transition-all", !isReceivingNewItem ? "bg-white shadow-sm text-primary font-medium" : "text-muted-foreground")}
                  onClick={() => setIsReceivingNewItem(false)}
                >
                  صنف مسجل
                </button>
                <button 
                  type="button"
                  className={cn("flex-1 text-sm py-1.5 rounded-sm transition-all", isReceivingNewItem ? "bg-white shadow-sm text-primary font-medium" : "text-muted-foreground")}
                  onClick={() => setIsReceivingNewItem(true)}
                >
                  صنف جديد
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {!isReceivingNewItem ? (
                <div className="space-y-2">
                  <Label>اسم الصنف</Label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر الصنف --</option>
                    {itemsQuery.data?.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.itemCode || item.id})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>اسم الصنف الجديد</Label>
                    <Input 
                      value={receiveNewName}
                      onChange={(e) => setReceiveNewName(e.target.value)}
                      placeholder="أدخل اسم الصنف..."
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الكود (اختياري)</Label>
                    <Input 
                      value={receiveNewCode}
                      onChange={(e) => setReceiveNewCode(e.target.value)}
                      placeholder="EDXXX"
                      className="bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المُورِّد (اختياري)</Label>
                    <Input 
                      value={receiveNewSupplier}
                      onChange={(e) => setReceiveNewSupplier(e.target.value)}
                      placeholder="اسم الشركة..."
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>الكمية المستلمة</Label>
                  <Input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder="أدخل الكمية..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>سعر الوحدة (ج.م)</Label>
                  <Input 
                    type="number" 
                    value={unitPrice} 
                    onChange={(e) => setUnitPrice(e.target.value)} 
                    placeholder="أدخل سعر الوحدة..."
                  />
                </div>
              </div>
              
              <div className="pt-4 mt-6 border-t border-border/50">
                <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <span className="font-semibold text-primary text-lg">إجمالي القيمة:</span>
                  <span className="text-2xl font-bold text-primary">{totalValue.toFixed(2)} ج.م</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setActiveTab("inventory")}>إلغاء</Button>
                <Button 
                  onClick={handleSubmitAdd} 
                  className="bg-primary text-white"
                  disabled={receiveMutation.isLoading}
                >
                  {receiveMutation.isLoading ? "جاري الحفظ..." : "حفظ إذن الإضافة"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dispense" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-white p-6 sm:p-8 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-warning mb-6 flex items-center border-b border-border/50 pb-4">
              <ArrowUpFromLine className="me-2 h-5 w-5" />
              إذن صرف مخزون
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>اسم الصنف</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  <option value="" disabled>-- اختر الصنف --</option>
                  {itemsQuery.data?.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.itemCode || item.id}) - المتاح: {item.quantity}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>الكمية المنصرفة</Label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  placeholder="أدخل الكمية المطلوبة للصرف..."
                />
              </div>

              <div className="space-y-2">
                <Label>اسم الموظف / المستلم</Label>
                <Input 
                  value={employeeName} 
                  onChange={(e) => setEmployeeName(e.target.value)} 
                  placeholder="أدخل اسم الموظف أو القسم المستلم..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-border/50">
                <Button variant="outline" onClick={() => setActiveTab("inventory")}>إلغاء</Button>
                <Button 
                  onClick={handleSubmitDispense} 
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                  disabled={dispenseMutation.isLoading}
                >
                  {dispenseMutation.isLoading ? "جاري الحفظ..." : "تأكيد إذن الصرف"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Item Definition Dialog */}
      <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعريف صنف جديد</DialogTitle>
            <DialogDescription>
              أضف بيانات الصنف الجديد لتعريفه في قائمة جرد المخزون.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                اسم الصنف
              </Label>
              <Input
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="col-span-3 text-right"
                placeholder="أدخل اسم الصنف..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                الكود (SKU)
              </Label>
              <Input
                id="code"
                value={newItemCode}
                onChange={(e) => setNewItemCode(e.target.value)}
                className="col-span-3 font-mono text-right"
                placeholder="EDXXX"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier" className="text-right">
                المُورِّد
              </Label>
              <Input
                id="supplier"
                value={newItemSupplier}
                onChange={(e) => setNewItemSupplier(e.target.value)}
                className="col-span-3 text-right"
                placeholder="اسم الشركة المُورِّدة..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
            <Button 
              onClick={handleCreateNewItem} 
              className="bg-primary text-white"
              disabled={createItemMutation.isLoading}
            >
              {createItemMutation.isLoading ? "جاري الحفظ..." : "حفظ الصنف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
