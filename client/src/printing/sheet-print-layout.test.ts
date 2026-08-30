import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = process.cwd();
const read = (path: string) => readFileSync(resolve(repo, path), "utf8");

describe("medical sheet print layout regressions", () => {
  it("keeps the follow-up sheet on one exact A4 page", () => {
    const css = read("client/src/components/sheets/followup-print.css");

    expect(css).toContain('data-print-document="followup"');
    expect(css).toContain("width: 210mm !important");
    // Keep the content box just inside A4 so print rounding cannot create a
    // trailing blank page after either printed sheet.
    expect(css).toContain("height: 296mm !important");
    expect(css).toContain("grid-template-rows: repeat(4, minmax(0, 1fr))");
    expect(css).not.toContain("overflow: scroll");
  });

  it("uses one shared follow-up renderer for consultant and Lasik", () => {
    const body = read(
      "client/src/components/sheets/FollowupTablesBody.tsx",
    );
    const consultant = read(
      "client/src/pages/ConsultantFollowupPage.tsx",
    );
    const lasik = read("client/src/pages/LasikFollowupPage.tsx");

    expect(body).toContain('import "@/components/sheets/followup-print.css"');
    expect(body).toContain("const sheetTypeLabel = titleAr");
    expect(body).not.toContain("<style>");
    expect(body).toContain('className="w-[20%]"');
    expect(body).toContain('className="w-[16%]"');
    expect(consultant).toContain('data-followup-kind="consultant"');
    expect(consultant).toContain('titleAr="متابعة الاستشاري"');
    expect(lasik).toContain('data-followup-kind="lasik"');
    expect(lasik).toContain('titleAr="متابعة الليزك"');
  });

  it("attaches one read-only follow-up page to consultant and Lasik", () => {
    const sheet = read("client/src/pages/LasikExamSheet.tsx");
    const css = read("client/src/components/sheets/followup-print.css");

    expect(sheet).toContain('data-print-document="lasik"');
    expect(sheet).toContain("sheet-type-${currentSheetType}");
    expect(sheet).toContain("trpc.medical.getFollowupSheets.useQuery");
    expect(sheet).toContain("hasAttachedFollowupPage");
    expect(sheet).toContain("renderAttachedFollowupPage");
    expect(sheet).toContain('data-print-page="followup"');
    expect(sheet).toContain('printVariant="attached"');
    expect(sheet).toContain('[data-sheet-type="consultant"]');
    expect(sheet).toContain("transform: none !important");
    expect(css).toContain('data-print-page="main"');
    expect(css).toContain("page-break-before: always !important");
    expect(css).toContain("page-break-after: avoid !important");
    expect(css).toContain('data-print-variant="attached"');
    expect(css).toContain("grid-template-rows: 20mm minmax(0, 1fr)");
  });

  it("honors browser print and isolates native print documents", () => {
    const nativePdf = read("client/src/lib/nativePdf.ts");
    const nativePrint = read("client/src/lib/nativePrint.ts");

    expect(nativePdf).toMatch(
      /!options\?\.forceBrowserPrint\s*&&\s*!hasSpecificTarget\s*&&\s*canUseNativeAndroidPrint\(\)/,
    );
    expect(nativePrint).toContain('"[data-print-document]"');
    expect(nativePrint).toContain('data-print-document="followup"');
    expect(nativePrint).not.toContain("attached-followup-page");
  });
});
