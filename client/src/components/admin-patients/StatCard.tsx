interface StatCardProps {
  label: string;
  value: number;
  isTotal?: boolean;
}

export function StatCard({ label, value, isTotal = false }: StatCardProps) {
  return (
    <div
      className={`rounded-lg border px-2 py-3 sm:px-3 sm:py-3 ${
        isTotal ? "border-secondary bg-secondary/8" : "border-border bg-muted/15"
      }`}
    >
      <p
        className={`text-xs sm:text-sm font-medium leading-tight tracking-tight ${
          isTotal ? "text-secondary font-semibold" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums leading-none ${
          isTotal ? "text-secondary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
