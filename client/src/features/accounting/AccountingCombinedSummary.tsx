import { useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { fmt } from "./accountingFormat";
import { AccountingQueryBoundary } from "./AccountingPagePrimitives";

export default function AccountingCombinedSummary() {
  const [open, setOpen] = useState(false);
  const reports = trpc.accounting.accReports.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false,
  });
  const data = reports.data;
  const rows = [
    {
      label: "إجمالي السلف",
      first: "السلف",
      second: "المسدد",
      total: (data?.advances ?? []).reduce(
        (sum, row) => sum + row.totalAdvance,
        0,
      ),
      paid: (data?.advances ?? []).reduce(
        (sum, row) => sum + row.totalRepaid,
        0,
      ),
      remaining: (data?.advances ?? []).reduce(
        (sum, row) => sum + row.remaining,
        0,
      ),
    },
    {
      label: "إجمالي القرض",
      first: "القروض",
      second: "المسدد",
      total: (data?.loans ?? []).reduce((sum, row) => sum + row.totalLoan, 0),
      paid: (data?.loans ?? []).reduce((sum, row) => sum + row.totalPaid, 0),
      remaining: (data?.loans ?? []).reduce(
        (sum, row) => sum + row.remaining,
        0,
      ),
    },
    {
      label: "إجمالي انستا",
      first: "الإيراد",
      second: "المصروف",
      total: data?.instapay.totalIn ?? 0,
      paid: data?.instapay.totalOut ?? 0,
      remaining: data?.instapay.net ?? 0,
    },
    {
      label: "إجمالي البيت",
      first: "الإيراد",
      second: "المصروف",
      total: data?.home.totalIn ?? 0,
      paid: data?.home.totalOut ?? 0,
      remaining: data?.home.net ?? 0,
    },
    {
      label: "إجمالي د. السعدني",
      first: "المسحوبات",
      second: "المسدد",
      total: data?.saadany.totalWithdrawals ?? 0,
      paid: data?.saadany.totalRepaid ?? 0,
      remaining: data?.saadany.remaining ?? 0,
    },
  ];
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Calculator className="h-4 w-4" /> إجمالي شامل
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-2xl max-h-[85dvh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="ps-8 text-start">إجمالي شامل</DialogTitle>
          </DialogHeader>
          <AccountingQueryBoundary query={reports} label="إجمالي شامل">
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <section key={row.label} className="py-3">
                  <h3 className="mb-2 text-sm font-semibold text-primary">
                    {row.label}
                  </h3>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      [row.first, row.total],
                      [row.second, row.paid],
                      ["المتبقي", row.remaining],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-muted-foreground">
                          {label}
                        </dt>
                        <dd
                          dir="ltr"
                          className="mt-1 text-right font-semibold tabular-nums"
                        >
                          {reports.isLoading ? "…" : fmt(Number(value))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </AccountingQueryBoundary>
        </DialogContent>
      </Dialog>
    </>
  );
}
