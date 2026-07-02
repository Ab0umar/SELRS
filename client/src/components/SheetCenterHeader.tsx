/**
 * رأس موحّد يُطبع في منتصف أعلى الشيتات (استشاري/ليزك/أخصائي/متابعات).
 * SELRS — <Sheet Name> / <الاسم بالعربي> — التاريخ
 */
export default function SheetCenterHeader({
  titleEn,
  titleAr,
  date,
}: {
  titleEn: string;
  titleAr: string;
  date?: string;
}) {
  const shownDate = (() => {
    if (!date || !date.trim()) return new Date().toLocaleDateString("en-GB");
    const parsed = new Date(date);
    return Number.isNaN(parsed.valueOf())
      ? date
      : parsed.toLocaleDateString("en-GB");
  })();
  return (
    <div
      className="sheet-center-header text-center border-b-2 border-[#003d9b] pb-2 mb-3"
      dir="ltr"
    >
      <div className="text-lg font-bold text-[#003d9b] leading-tight">
        SELRS — {titleEn}
      </div>
      <div className="text-sm font-bold text-[#434654] leading-tight">
        {titleAr} — {shownDate}
      </div>
    </div>
  );
}
