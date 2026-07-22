import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-EG");
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export default function AdminWhatsAppInbox() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);

  const { data, isLoading, isFetching, error } =
    trpc.whatsappInbox.list.useQuery({ page, pageSize });

  const rows = data?.rows ?? [];
  const hasMore = rows.length === pageSize;

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setPage(1);
  };

  return (
    <div className="w-full space-y-4 pb-6 text-right" dir="rtl">
      <Card dir="rtl" className="overflow-hidden border-border text-right shadow-sm">
        <CardHeader className="space-y-0 border-b border-border bg-muted/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground sm:text-xl">
                  رسائل واتساب الواردة
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  الرسائل المستلمة عبر Webhook واتساب
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
              {rows.length} رسالة
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="flex justify-end">
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-10 w-40">
                <SelectValue placeholder="عدد النتائج" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / صفحة
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card dir="rtl" className="overflow-hidden border-border text-right shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <div
              className="m-4 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              تعذر تحميل الرسائل: {error.message}
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
                <p className="font-semibold text-foreground">لا توجد رسائل بعد</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ستظهر هنا الرسائل فور استلامها عبر Webhook واتساب
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table dir="rtl" className="min-w-[900px]">
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="min-w-72 text-right">
                      نص الرسالة
                    </TableHead>
                    <TableHead className="text-right">وقت الاستلام</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((msg: any, index: number) => (
                    <TableRow
                      key={msg.id}
                      className={index % 2 === 1 ? "bg-muted/20" : undefined}
                    >
                      <TableCell dir="ltr" className="font-mono tabular-nums">
                        {msg.fromPhone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {msg.messageType || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        {msg.body || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDateTime(msg.receivedAt)}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
              السابق
            </Button>
            <span className="text-sm font-medium text-foreground">صفحة {page}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasMore || isFetching}
              onClick={() => setPage((p) => p + 1)}
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
