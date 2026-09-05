import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);

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
    <div className="w-full space-y-4 pb-6 text-right" dir="rtl">
      <Card
        dir="rtl"
        className="overflow-hidden rounded-lg border-border text-right shadow-none"
      >
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={handleSearchSubmit}
            dir="rtl"
            className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(18rem,1fr)_10rem_11rem_auto]"
          >
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="الاسم أو كود المريض"
                className="h-10 pr-9"
              />
            </div>

            <Select value={year} onValueChange={handleYearChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="السنة" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-10 w-full">
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

            <Button
              type="submit"
              className="col-span-2 h-10 gap-2 lg:col-span-1"
              disabled={isFetching}
            >
              <Search className="h-4 w-4" aria-hidden />
              {isFetching && !isLoading ? "جاري التحديث" : "بحث"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card
        dir="rtl"
        className="overflow-hidden rounded-lg border-border text-right shadow-none"
      >
        <CardContent className="p-0">
          {error ? (
            <div
              className="m-4 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              تعذر تحميل المرضى: {error.message}
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-foreground">لا توجد نتائج</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  جرّب اسمًا أو كودًا مختلفًا، أو غيّر السنة
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                dir="rtl"
                className="min-w-[1180px] text-center [&_td]:text-center [&_th]:text-center"
              >
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead dir="rtl" className="w-28 text-right">
                      كود المريض
                    </TableHead>
                    <TableHead className="min-w-48 text-right">الاسم</TableHead>
                    <TableHead className="w-32 text-right">الهاتف</TableHead>
                    <TableHead className="w-32 text-right">
                      تاريخ الميلاد
                    </TableHead>
                    <TableHead className="w-20 text-right">الجنس</TableHead>
                    <TableHead className="min-w-36 text-right">
                      الطبيب
                    </TableHead>
                    <TableHead className="w-28 text-right">آخر زيارة</TableHead>
                    <TableHead className="w-28 text-right">
                      تاريخ الإضافة
                    </TableHead>
                    <TableHead className="min-w-72 text-right">
                      الخدمات المرتبطة
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((patient: any, index: number) => (
                    <TableRow
                      key={patient.id}
                      className={index % 2 === 1 ? "bg-muted/20" : undefined}
                    >
                      <TableCell dir="rtl" className="text-right">
                        <Badge
                          dir="rtl"
                          variant="outline"
                          className="justify-center font-mono tabular-nums [unicode-bidi:plaintext]"
                        >
                          {patient.patientCode || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {patient.fullName || "—"}
                      </TableCell>
                      <TableCell dir="ltr" className="font-mono tabular-nums">
                        {patient.phone || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDate(patient.dateOfBirth)}
                      </TableCell>
                      <TableCell>
                        {patient.gender === "male"
                          ? "ذكر"
                          : patient.gender === "female"
                            ? "أنثى"
                            : "—"}
                      </TableCell>
                      <TableCell>
                        {patient.doctorName || patient.doctorCode || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDate(patient.lastVisit)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDate(patient.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {(patient.services ?? []).length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            patient.services.map((service: any) => (
                              <Badge
                                key={service.id}
                                variant="secondary"
                                className="font-normal"
                              >
                                {service.serviceName || service.serviceCode}
                                {service.serviceDate
                                  ? ` · ${formatDate(service.serviceDate)}`
                                  : ""}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              className="gap-1"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
              السابق
            </Button>
            <span className="text-sm font-medium text-foreground">
              صفحة {page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasMore || isFetching}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="gap-1"
            >
              التالي
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
