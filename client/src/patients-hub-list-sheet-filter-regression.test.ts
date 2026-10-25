import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pageSource = readFileSync(
  resolve(__dirname, "pages", "PatientsHubList.tsx"),
  "utf8",
);

describe("patients hub list sheet-filter regression", () => {
  it("should_render_filtered_rows_in_mobile_and_desktop_branches", () => {
    const cardIdx = pageSource.indexOf("<HubPatientCard");
    expect(cardIdx).toBeGreaterThanOrEqual(0);
    expect(pageSource.slice(Math.max(0, cardIdx - 60), cardIdx)).toContain(
      "filteredRows.map",
    );

    const rowIdx = pageSource.indexOf("<HubPatientRow");
    expect(rowIdx).toBeGreaterThanOrEqual(0);
    expect(pageSource.slice(Math.max(0, rowIdx - 60), rowIdx)).toContain(
      "filteredRows.map",
    );

    // No render branch may fall back to the unfiltered list.
    // Scoped to the JSX after the {/* list */} marker: visiblePatientIds
    // still maps allRows by design — the status batch query must cover
    // every row before filtering, because filteredRows is derived from
    // those statuses.
    const componentStart = pageSource.indexOf(
      "export default function PatientsHubList",
    );
    expect(componentStart).toBeGreaterThanOrEqual(0);
    const listMarker = pageSource.indexOf("{/* list */}", componentStart);
    expect(listMarker).toBeGreaterThan(componentStart);
    expect(pageSource.slice(listMarker)).not.toContain("allRows.map(");
  });

  it("should_use_filtered_rows_for_empty_state", () => {
    const emptyBranch = pageSource.indexOf("filteredRows.length === 0 ?");
    expect(emptyBranch).toBeGreaterThanOrEqual(0);
    const nextBranch = pageSource.indexOf(") : isMobile ?", emptyBranch);
    expect(nextBranch).toBeGreaterThan(emptyBranch);
    const emptyJsx = pageSource.slice(emptyBranch, nextBranch);
    expect(emptyJsx).toContain('sheetFilter !== "all"');
    expect(emptyJsx).toContain("لا توجد نتائج مطابقة للفلتر المحدد");
    expect(emptyJsx).toContain("لا توجد بيانات مرضى");
    // The unfiltered empty-state check must not come back.
    expect(pageSource).not.toContain("allRows.length === 0");
  });

  it("should_reflect_filtered_count_in_badge", () => {
    const badgeIdx = pageSource.indexOf(
      '<Badge variant="secondary" className="tabular-nums shrink-0">',
    );
    expect(badgeIdx).toBeGreaterThanOrEqual(0);
    const badgeEnd = pageSource.indexOf("</Badge>", badgeIdx);
    expect(badgeEnd).toBeGreaterThan(badgeIdx);
    const badgeBlock = pageSource.slice(badgeIdx, badgeEnd);
    expect(badgeBlock).toContain('sheetFilter !== "all"');
    expect(badgeBlock).toContain("filteredRows.length");
    expect(badgeBlock).toContain("allRows.length");
    // dir-safe: the "filtered / total" pair renders LTR inside the RTL page.
    expect(badgeBlock).toContain('dir="ltr"');
  });
});
