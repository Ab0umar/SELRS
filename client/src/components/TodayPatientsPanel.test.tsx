// file: client/src/components/TodayPatientsPanel.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import TodayPatientsPanel, {
  QUICK_ACTIONS,
  withVisitDate,
} from "./TodayPatientsPanel";
import { ROUTES } from "../../../shared/routes";

const DATE_TRIGGER_LABEL = "تغيير تاريخ مرضى اليوم";

function renderPanel(): string {
  return renderToStaticMarkup(
    <Router ssrPath="/">
      <TodayPatientsPanel />
    </Router>,
  );
}

/** Opening tags of every <button ...> in the markup. */
function buttonTags(html: string): string[] {
  return html.match(/<button\s[^>]*>/g) ?? [];
}

/** Opening tags of every <div ...> in the markup. */
function divTags(html: string): string[] {
  return html.match(/<div\s[^>]*>/g) ?? [];
}

describe("TodayPatientsPanel", () => {
  it("should_render_date_trigger_as_labelled_button", () => {
    const trigger = buttonTags(renderPanel()).find(tag =>
      tag.includes(`aria-label="${DATE_TRIGGER_LABEL}"`),
    );

    expect(trigger).toBeDefined();
    expect(trigger).toContain('type="button"');
    expect(trigger).toContain('aria-haspopup="dialog"');
    expect(trigger).toContain('aria-expanded="false"');
  });

  it("should_not_render_clickable_div_for_date", () => {
    const html = renderPanel();

    // No div stands in for the date control: no div carries the trigger
    // label, a button role, or an inline click handler.
    for (const tag of divTags(html)) {
      expect(tag).not.toContain(`aria-label="${DATE_TRIGGER_LABEL}"`);
      expect(tag).not.toContain('role="button"');
      expect(tag).not.toContain("onclick=");
    }

    // The shown date text itself sits inside the trigger <button> element.
    const triggerElement = html.match(
      new RegExp(
        `<button[^>]*aria-label="${DATE_TRIGGER_LABEL}"[^>]*>[\\s\\S]*?</button>`,
      ),
    );
    expect(triggerElement).toBeDefined();
    expect(triggerElement?.[0]).toMatch(
      /<span dir="ltr"[^>]*>\d{4}-\d{2}-\d{2}<\/span>/,
    );
  });

  it("should_render_arabic_quick_action_labels", () => {
    const html = renderPanel();

    for (const label of [
      "الملف الطبي",
      "الروشتة",
      "طلب التحاليل",
      "التقارير الطبية",
    ]) {
      expect(html).toContain(label);
    }
    for (const label of ["Medical File", "Prescription", "Tests", "Reports"]) {
      expect(html).not.toContain(`>${label}<`);
    }
  });

  it("should_append_visit_date_to_quick_action_targets", () => {
    expect(QUICK_ACTIONS.map(action => action.path)).toEqual([
      ROUTES.patientFile,
      ROUTES.prescription,
      ROUTES.requestTests,
      ROUTES.medicalReports,
    ]);

    for (const action of QUICK_ACTIONS) {
      expect(withVisitDate(action.path, "2026-10-18")).toBe(
        `${action.path}?visitDate=2026-10-18`,
      );
    }
  });

  it("should_omit_visit_date_when_invalid", () => {
    for (const invalidDate of ["", "2026-3-5", "garbage"]) {
      const target = withVisitDate(ROUTES.prescription, invalidDate);

      expect(target).toBe(ROUTES.prescription);
      expect(target).not.toContain("visitDate");
    }
  });
});
