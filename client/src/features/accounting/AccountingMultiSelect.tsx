import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useId } from "react";

type Props = {
  label: string;
  options: { code: string; name: string }[];
  selected: string[];
  onChange: (codes: string[]) => void;
  query: {
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<unknown>;
  };
};

export function AccountingMultiSelect({
  label,
  options,
  selected,
  onChange,
  query,
}: Props) {
  const id = useId();
  return (
    <div className="flex min-w-44 flex-col gap-1">
      <span id={id} className="text-sm font-semibold">
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            aria-labelledby={id}
            className="h-11 max-w-80 justify-between gap-3"
          >
            <span className="truncate">
              {selected.length
                ? selected
                    .map(
                      (code) =>
                        options.find((o) => o.code === code)?.name ?? code,
                    )
                    .join("، ")
                : "الكل"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          dir="rtl"
          align="start"
          className="max-h-80 w-80 overflow-y-auto p-2"
        >
          {query.isLoading ? (
            <p role="status" className="p-3">
              جارٍ تحميل {label}
            </p>
          ) : query.isError ? (
            <div role="alert" className="space-y-2 p-3">
              <p>تعذر تحميل {label}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void query.refetch()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                إعادة المحاولة
              </Button>
            </div>
          ) : options.length === 0 ? (
            <p className="p-3">لا توجد اختيارات</p>
          ) : (
            options.map((option) => (
              <label
                key={option.code}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded px-2 hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={selected.includes(option.code)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, option.code]
                        : selected.filter((code) => code !== option.code),
                    )
                  }
                />
                <span className="min-w-0 break-words">
                  {option.code} - {option.name}
                </span>
              </label>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
