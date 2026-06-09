import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Phone, CreditCard, Calendar, Eye, Edit } from "lucide-react";

// Local useDebounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function KfPatients() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Queries
  const { data, isLoading, isError } = trpc.kf.listPatients.useQuery({
    search: debouncedSearch,
    page,
    pageSize
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleRowClick = (kfId: number) => {
    setLocation(`/kf/patients/${kfId}`);
  };

  return (
    <section dir="rtl" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">سجل مرضى KF</h1>
          <p className="text-muted-foreground text-sm">البحث، الإضافة واستعراض ملفات المرضى</p>
        </div>
        <Button asChild className="self-start sm:self-auto gap-2">
          <Link href="/kf/patients/new">
            <UserPlus className="h-4 w-4" />
            <span>تسجيل مريض جديد</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">قائمة البحث</CardTitle>
          <CardDescription>ابحث باستخدام الاسم، كود المريض (KF-XXXX)، رقم الهاتف، أو الرقم القومي</CardDescription>
          <div className="relative mt-2 max-w-md">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث هنا..."
              className="pr-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset page to 1 on search
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
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
                    <TableCell colSpan={6} className="text-center py-8 text-destructive">
                      حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
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
                          <span>
                            {new Date(patient.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-start gap-2">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                عرض {patients.length} من أصل {total} مريض
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                >
                  السابق
                </Button>
                <span className="text-sm font-medium">
                  صفحة {page} من {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
