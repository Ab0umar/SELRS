import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

// mysql2 returns DATE/DATETIME columns as JS Date instances, and the tRPC
// superjson transform preserves that across the wire — rendering one raw in
// JSX throws (React error #31: objects are not valid as a child).
function formatDate(value: unknown): string {
  if (!value) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

const YEAR_OPTIONS = [
  { value: "2026", label: "2026 (الحالي)" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
] as const;

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export default function AdminLegacyPatients() {
  const [year, setYear] = useState<"2023" | "2024" | "2025" | "2026">("2026");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);

  const { data, isLoading, isFetching, error } =
    trpc.legacyPatients.search.useQuery({
      year,
      query: query || undefined,
      page,
      pageSize,
    });

  const rows = data?.patients ?? [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleYearChange = (value: string) => {
    setYear(value as "2023" | "2024" | "2025" | "2026");
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setPage(1);
  };

  const hasMore = rows.length === pageSize;

  return (
    <div className="w-full space-y-6 pb-4 text-right" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">بحث المرضى القدامى</h1>
            <p className="text-sm text-muted-foreground">
              عرض للمراجعة فقط — بيانات المريض وخدماته المرتبطة لكل سنة على حدة
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="عدد النتائج" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} مريض / صفحة
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 min-w-[240px] items-center gap-2"
          >
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالاسم أو كود المريض..."
              className="flex-1"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm hover:bg-accent"
            >
              <Search className="h-4 w-4" />
              بحث
            </button>
          </form>

          {isFetching && !isLoading && (
            <span className="text-xs text-muted-foreground">...تحديث</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 text-sm text-destructive">
              خطأ: {error.message}
            </div>
          )}
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              ...جاري التحميل
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              لا توجد نتائج
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>كود المريض</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>تاريخ الميلاد</TableHead>
                  <TableHead>الجنس</TableHead>
                  <TableHead>الطبيب</TableHead>
                  <TableHead>آخر زيارة</TableHead>
                  <TableHead>تاريخ الإضافة</TableHead>
                  <TableHead>الخدمات المرتبطة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">
                      {row.patientCode}
                    </TableCell>
                    <TableCell>{row.fullName}</TableCell>
                    <TableCell>{row.phone || "—"}</TableCell>
                    <TableCell>{formatDate(row.dateOfBirth)}</TableCell>
                    <TableCell>
                      {row.gender === "male"
                        ? "ذكر"
                        : row.gender === "female"
                          ? "أنثى"
                          : "—"}
                    </TableCell>
                    <TableCell>
                      {row.doctorName || row.doctorCode || "—"}
                    </TableCell>
                    <TableCell>{formatDate(row.lastVisit)}</TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(row.services ?? []).length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          row.services.map((svc: any) => (
                            <Badge key={svc.id} variant="secondary">
                              {svc.serviceName || svc.serviceCode}
                              {svc.serviceDate ? ` (${formatDate(svc.serviceDate)})` : ""}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          السابق
        </button>
        <span className="text-sm text-muted-foreground">صفحة {page}</span>
        <button
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
