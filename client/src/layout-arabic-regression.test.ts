import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientRoot = resolve(__dirname, "..");

function readClientFile(path: string) {
  return readFileSync(resolve(clientRoot, path), "utf8");
}

describe("layout Arabic regressions", () => {
  it("keeps AppShell account toasts and the forced-password notice in Arabic", () => {
    const source = readClientFile("src/components/layout/AppShell.tsx");

    expect(source).not.toContain("Username Is Required");
    expect(source).not.toContain("Must Be At Least 3 Characters");
    expect(source).not.toContain("Failed To Update Username");
    expect(source).not.toContain("Failed To Update Profile");
    expect(source).not.toContain("For Security, You Must Change");

    expect(source).toContain("اسم المستخدم مطلوب");
    expect(source).toContain("لأسباب أمنية، يجب تغيير كلمة المرور قبل المتابعة");
  });

  it("keeps the sidebar and top-nav account menus in Arabic", () => {
    const sidebar = readClientFile("src/components/layout/AppSidebar.tsx");
    const topNav = readClientFile("src/components/layout/AppTopNav.tsx");

    expect(sidebar).not.toContain("Account Settings");
    expect(sidebar).not.toContain("Sign Out");
    expect(sidebar).toContain("إعدادات الحساب");
    expect(sidebar).toContain("خروج");

    expect(topNav).not.toContain("Account Settings");
    expect(topNav).toContain("إعدادات الحساب");
    expect(topNav).toContain("خروج");
  });

  it("keeps the AppHeader theme toggle label in Arabic", () => {
    const source = readClientFile("src/components/layout/AppHeader.tsx");

    expect(source).not.toContain("Dark mode");
    expect(source).not.toContain("Light mode");
    expect(source).toContain("تبديل المظهر");
  });

  it("keeps the ProtectedRoute permissions-error card in Arabic", () => {
    const source = readClientFile("src/components/ProtectedRoute.tsx");

    expect(source).not.toContain("Unable to verify page permissions");
    expect(source).not.toMatch(/>Sign out</);
    expect(source).toContain("تعذر التحقق من صلاحيات الصفحة");
    expect(source).toContain("إعادة المحاولة");
    expect(source).toContain("إعادة التحميل");
  });
});
