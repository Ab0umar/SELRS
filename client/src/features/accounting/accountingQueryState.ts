import { fmt } from "./accountingFormat";

type AccountingQueryState = {
  isLoading: boolean;
  isError: boolean;
};

export function accountingMetricValue(
  query: AccountingQueryState,
  value: number | null | undefined,
  format: (value: number) => string = fmt,
) {
  if (query.isLoading) return "جارٍ التحميل";
  if (query.isError || value == null) return "تعذر التحميل";
  return format(value);
}
