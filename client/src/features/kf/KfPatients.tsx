import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Phone, CreditCard, Calendar, Eye, Edit, Trash2, Loader2, Printer, ShieldOff, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { DateInput } from "@/components/ui/date-input";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

type FormState = {
  fullName: string;
  dateOfBirth: string;
  age: string;
  gender: "male" | "female" | "";
  nationalId: string;
  phone: string;
  alternatePhone: string;
  address: string;
  medicalHistory: string;
  allergies: string;
  notes: string;
};

const blankForm: FormState = {
  fullName: "", dateOfBirth: "", age: "", gender: "",
  nationalId: "", phone: "", alternatePhone: "",
  address: "", medicalHistory: "", allergies: "", notes: "",
};

function AddPatientDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (kfId: number) => void }) {
  const [form, setForm] = useState<FormState>(blankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lastAgeSyncRef = useRef<"dob" | "age" | null>(null);
  const createMut = trpc.kf.createPatient.useMutation();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) { setForm(blankForm); setErrors({}); }
  }, [open]);

  // DOB → Age sync
  useEffect(() => {
    if (!form.dateOfBirth) return;
    if (lastAgeSyncRef.current === "age") { lastAgeSyncRef.current = null; return; }
    const dob = new Date(form.dateOfBirth);
    if (isNaN(dob.valueOf())) return;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    if (!Number.isFinite(age) || age < 0) return;
    lastAgeSyncRef.current = "dob";
    setForm((p) => ({ ...p, age: String(age) }));
  }, [form.dateOfBirth]);

  // Age → DOB sync
  useEffect(() => {
    if (!form.age) return;
    if (lastAgeSyncRef.current === "dob") { lastAgeSyncRef.current = null; return; }
    const ageNum = Number(form.age);
    if (!Number.isFinite(ageNum) || ageNum < 0) return;
    const today = new Date();
    const d = new Date(today.getFullYear() - ageNum, today.getMonth(), today.getDate());
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    lastAgeSyncRef.current = "age";
    setForm((p) => ({ ...p, dateOfBirth: formatted }));
  }, [form.age]);

  const set = (key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => { const c = { ...p }; delete c[key]; return c; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) newErrors.fullName = "الاسم بالكامل مطلوب";
    if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 0)) newErrors.age = "السن يجب أن يكون رقماً صحيحاً موجباً";
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    try {
      const result = await createMut.mutateAsync({
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        nationalId: form.nationalId.trim() || null,
        phone: form.phone.trim() || null,
        alternatePhone: form.alternatePhone.trim() || null,
        address: form.address.trim() || null,
        occupation: null,
        medicalHistory: form.medicalHistory.trim() || null,
        allergies: form.allergies.trim() || null,
        notes: form.notes.trim() || null,
        selrsPatientCode: null,
      });
      toast.success(`تم تسجيل المريض بنجاح بكود ${result.kfCode}`);
      onCreated(result.kfId);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">تسجيل مريض جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Personal */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-primary border-b pb-1">البيانات الشخصية</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="dp-fullName" className="after:content-['*'] after:text-destructive after:mr-1">الاسم بالكامل</Label>
                <Input id="dp-fullName" placeholder="مثال: محمد أحمد علي" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className={errors.fullName ? "border-destructive" : ""} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="dp-age">السن</Label>
                <Input id="dp-age" type="number" min="0" placeholder="مثال: 45" value={form.age} onChange={(e) => set("age", e.target.value)} className={errors.age ? "border-destructive" : ""} />
                {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="dp-gender">النوع</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger id="dp-gender"><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dp-dob">تاريخ الميلاد</Label>
                <DateInput id="dp-dob" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dp-nationalId">الرقم القومي</Label>
                <Input id="dp-nationalId" placeholder="14 رقماً" maxLength={20} value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-primary border-b pb-1">بيانات الاتصال</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="dp-phone">رقم الموبايل</Label>
                <Input id="dp-phone" placeholder="01xxxxxxxxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dp-alt">رقم بديل</Label>
                <Input id="dp-alt" placeholder="01xxxxxxxxx" value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="dp-address">العنوان</Label>
                <Textarea id="dp-address" rows={2} placeholder="العنوان التفصيلي" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Medical */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-primary border-b pb-1">التاريخ المرضي</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="dp-mhx">التاريخ المرضي</Label>
                <Textarea id="dp-mhx" rows={2} placeholder="مثال: ضغط دم، سكر..." value={form.medicalHistory} onChange={(e) => set("medicalHistory", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dp-allergy">الحساسية</Label>
                <Textarea id="dp-allergy" rows={2} placeholder="مثال: بنسلين..." value={form.allergies} onChange={(e) => set("allergies", e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="dp-notes">ملاحظات</Label>
                <Textarea id="dp-notes" rows={2} placeholder="أي ملاحظات أخرى" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={createMut.isPending}>إلغاء</Button>
            <Button type="submit" disabled={createMut.isPending} className="gap-2">
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>تسجيل المريض</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function KfPatients() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "accountant";
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const pageSize = 15;

  const debouncedSearch = useDebounce(searchTerm, 300);
  const utils = trpc.useUtils();

  const { data, isLoading, isError, error } = trpc.kf.listPatients.useQuery({
    search: debouncedSearch,
    page,
    pageSize
  });
  const isForbidden = isError && error instanceof TRPCClientError && error.data?.code === "FORBIDDEN";
  const deleteMut = trpc.kf.deletePatient.useMutation({
    onSuccess: () => { utils.kf.listPatients.invalidate(); toast.success("تم حذف المريض وجميع سجلاته"); setDelConfirm(null); },
    onError: () => toast.error("تعذر حذف المريض"),
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleRowClick = (kfId: number) => setLocation(`/kf/patients/${kfId}`);

  return (
    <section dir="rtl" className="space-y-4">
      <AddPatientDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(kfId) => {
          utils.kf.listPatients.invalidate();
          setAddOpen(false);
          setLocation(`/kf/patients/${kfId}`);
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">سجل مرضى KF</h1>
          <p className="text-muted-foreground text-sm">البحث، الإضافة واستعراض ملفات المرضى</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={isLoading || patients.length === 0}>
            <Printer className="h-4 w-4" />
            <span>طباعة</span>
          </Button>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span>تسجيل مريض جديد</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 print:hidden">
          <CardTitle className="text-lg">قائمة البحث</CardTitle>
          <CardDescription>ابحث باستخدام الاسم، كود المريض (KF-XXXX)، رقم الهاتف، أو الرقم القومي</CardDescription>
          <div className="relative mt-2 max-w-md">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث هنا..."
              className="pr-10"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden print:block text-center py-2 mb-3 border-b-2 border-black">
            <div className="text-base font-bold">مركز ساعدني لجراحة وتقويم الإبصار — وحدة كفرالشيخ</div>
            <div className="text-sm">سجل المرضى — تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}</div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right font-semibold">كود المريض</TableHead>
                  <TableHead className="text-right font-semibold">الاسم بالكامل</TableHead>
                  <TableHead className="text-right font-semibold">رقم الموبايل</TableHead>
                  <TableHead className="text-right font-semibold">الرقم القومي</TableHead>
                  <TableHead className="text-right font-semibold">تاريخ التسجيل</TableHead>
                  <TableHead className="text-left font-semibold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10">
                      {isForbidden ? (
                        <div className="flex flex-col items-center gap-2 text-destructive" role="alert">
                          <ShieldOff className="h-8 w-8" />
                          <span className="font-semibold text-base">تم رفض الوصول</span>
                          <span className="text-sm text-muted-foreground">ليس لديك صلاحية الوصول إلى هذه الصفحة</span>
                        </div>
                      ) : (
                        <span className="block text-center text-destructive">حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.</span>
                      )}
                    </TableCell>
                  </TableRow>
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-base">
                      لم يتم العثور على أي نتائج تطابق البحث.
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient: any) => (
                    <TableRow
                      key={patient.kfId}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => handleRowClick(patient.kfId)}
                    >
                      <TableCell className="font-mono font-bold text-primary">{patient.kfCode}</TableCell>
                      <TableCell className="font-semibold">{patient.fullName}</TableCell>
                      <TableCell>
                        {patient.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span dir="ltr">{patient.phone}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.nationalId ? (
                          <span className="inline-flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            <span>{patient.nationalId}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(patient.createdAt).toLocaleDateString("ar-EG")}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-start gap-1">
                          <Button variant="ghost" size="icon" asChild title="عرض الملف">
                            <Link href={`/kf/patients/${patient.kfId}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="تعديل">
                            <Link href={`/kf/patients/${patient.kfId}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          {delConfirm === patient.kfId ? (
                            <div className="flex gap-1 items-center">
                              <Button variant="destructive" size="sm" className="h-7 px-2 text-xs" onClick={() => deleteMut.mutate({ kfId: patient.kfId })} disabled={deleteMut.isPending}>
                                {deleteMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDelConfirm(null)}>لا</Button>
                            </div>
                          ) : canDelete ? (
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" title="حذف" onClick={() => setDelConfirm(patient.kfId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 print:hidden">
              <span className="text-sm text-muted-foreground">
                عرض {patients.length} من أصل {total} مريض
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(p - 1, 1))}>السابق</Button>
                <span className="text-sm font-medium">صفحة {page} من {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(p + 1, totalPages))}>التالي</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
