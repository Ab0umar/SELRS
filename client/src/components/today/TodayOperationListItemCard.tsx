import { cn } from "@/lib/utils";
import { Banknote, Eye, Hospital, Phone, Stethoscope } from "lucide-react";

type OpItem = {
  id?: number;
  name?: string | null;
  code?: string | null;
  doctor?: string | null;
  operation?: string | null;
  eye?: string | null;
  hospital?: string | null;
  payment?: string | null;
  phone?: string | null;
};

type OpRow = {
  key: string;
  listId: number;
  doctorTab: string;
  listDoctorName: string | null;
  listOperationType: string | null;
  listTime: string | null;
  isAutoFromMssql: boolean;
  item: OpItem;
};

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export function TodayOperationListItemCard({
  row,
  doctorNameByCode,
}: {
  row: OpRow;
  doctorNameByCode: Map<string, string>;
}) {
  const { item, listDoctorName, listOperationType } = row;

  const name = str(item.name) || "—";
  const code = str(item.code);

  const rawDoctor = str(item.doctor);
  const doctorResolved =
    rawDoctor
      ? (doctorNameByCode.get(rawDoctor.toLowerCase()) ?? rawDoctor)
      : (str(listDoctorName) || null);

  const operation = str(item.operation) || str(listOperationType) || null;
  const eye = str(item.eye) || null;
  const hospital = str(item.hospital) || null;
  const payment = str(item.payment) || null;
  const phone = str(item.phone) || null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3.5 text-right shadow-sm">
      {/* Patient name + code */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-snug text-foreground">{name}</p>
        {code ? (
          <span
            dir="ltr"
            className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
          >
            {code}
          </span>
        ) : null}
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {doctorResolved ? (
          <div className="flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{doctorResolved}</span>
          </div>
        ) : null}

        {(operation || eye) ? (
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {[operation, eye].filter(Boolean).join(" · ")}
            </span>
          </div>
        ) : null}

        {hospital ? (
          <div className="flex items-center gap-1.5">
            <Hospital className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{hospital}</span>
          </div>
        ) : null}

        {payment ? (
          <div className="flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{payment}</span>
          </div>
        ) : null}

        {phone ? (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span dir="ltr">{phone}</span>
          </div>
        ) : null}
      </div>

      {row.isAutoFromMssql ? (
        <p className={cn("mt-0.5 text-[10px] text-muted-foreground/60")}>مزامنة تلقائية</p>
      ) : null}
    </div>
  );
}
