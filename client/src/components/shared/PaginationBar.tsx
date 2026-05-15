import { Button } from "@/components/ui/button";

type PaginationBarProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function PaginationBar({ page, pageCount, total, pageSize, onPageChange }: PaginationBarProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-muted-foreground">
        {total === 0 ? "لا توجد نتائج" : `عرض ${start}-${end} من ${total}`}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          السابق
        </Button>
        <div className="min-w-24 rounded-md border border-border bg-background px-3 py-1.5 text-center text-sm font-medium">
          {page} / {pageCount}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount}>
          التالي
        </Button>
      </div>
    </div>
  );
}
