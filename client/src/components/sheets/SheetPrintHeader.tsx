import { BrandLogo } from "@/components/BrandLogo";

type SheetPrintHeaderProps = {
  sheetType: string;
};

export default function SheetPrintHeader({ sheetType }: SheetPrintHeaderProps) {
  return (
    <header
      className="sheet-print-header grid grid-cols-[1fr_auto_1fr] items-center border-b-2 border-[#003d9b] pb-3 mb-3"
      dir="ltr"
    >
      <div
        className="sheet-print-type justify-self-start text-left text-xl font-bold text-[#191c1e]"
        dir="rtl"
      >
        {sheetType}
      </div>

      <BrandLogo
        className="sheet-print-logo h-16 w-16 shrink-0"
        imgClassName="p-0"
      />

      <div className="sheet-print-brand justify-self-end text-right leading-tight" dir="rtl">
        <div className="sheet-print-clinic-name text-2xl font-bold text-[#003d9b]">
          مركز عيون الشروق
        </div>
        <div className="sheet-print-clinic-tagline mt-1 text-sm font-normal text-[#434654]">
          لليزك و تصحيح الابصار
        </div>
      </div>
    </header>
  );
}
