import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppBottomNav } from "./AppBottomNav";

vi.mock("@/components/ui/sheet", () => {
  const Content = ({ children }: { children: ReactNode }) => <>{children}</>;
  return { Sheet: Content, SheetContent: Content, SheetHeader: Content, SheetTitle: Content };
});

describe("mobile reception inbox navigation", () => {
  it("includes the reception inbox in More even without explicit page grants", () => {
    const html = renderToStaticMarkup(<AppBottomNav location="/home" onNavigate={() => {}} userRole="reception" allowedRoots={[]} permissionsLoaded />);
    expect(html).toContain("محادثات الاستقبال");
  });
  it.each(["doctor", "accountant", "manager", "nurse"])("does not expose the inbox to %s through generic page grants", role => {
    const html = renderToStaticMarkup(<AppBottomNav location="/home" onNavigate={() => {}} userRole={role} allowedRoots={["/reception-inbox"]} permissionsLoaded />);
    expect(html).not.toContain("محادثات الاستقبال");
  });
});
