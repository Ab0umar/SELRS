export type ReportStock = "blank" | "preprinted";

export function ReportLetterhead() {
  return (
    <div className="report-stationery-letterhead" aria-label="ترويسة عيون الشروق">
      <img src="/logos/full.png" alt="شعار عيون الشروق" />
      <div>
        <strong>عيون الشروق</strong>
        <span>لليزك وتصحيح الإبصار</span>
        <small dir="ltr">SHOROUK EYES · FOR LASIK & REFRACTIVE SURGERY</small>
      </div>
    </div>
  );
}

export function ReportStationeryFooter() {
  return (
    <div className="report-stationery-footer" aria-label="تذييل عيون الشروق">
      <span>عيون الشروق · لليزك وتصحيح الإبصار</span>
      <span dir="ltr">selrs.cc</span>
    </div>
  );
}
