import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientRoot = resolve(__dirname, "..");

function readClientFile(path: string) {
  return readFileSync(resolve(clientRoot, path), "utf8");
}

function readClientTsxFiles(dir = resolve(clientRoot, "src")): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = resolve(dir, entry.name);

      if (entry.isDirectory()) return readClientTsxFiles(fullPath);
      if (!entry.isFile() || !entry.name.endsWith(".tsx")) return [];

      return readFileSync(fullPath, "utf8");
    })
    .join("\n");
}

describe("color token regressions", () => {
  it("uses the blue and orange brand for screens while preserving the clinical print palette", () => {
    const source = readClientFile("src/styles/design-system.css").toLowerCase();

    expect(source).toContain("--primary: #0b4a8f;");
    expect(source).toContain("--secondary: #f7941d;");
    expect(source).toMatch(/\.lasik-print-root[\s\S]*--primary: #003d82;/);
    expect(source).not.toContain("--primary: #ff9500;");
  });

  it("keeps the login submit label readable on the navy action background", () => {
    const source = readClientFile("src/pages/Home.tsx");

    expect(source).not.toContain(
      "bg-primary text-sm font-bold text-card-foreground",
    );
    expect(source).toMatch(/<Button\s+type="submit"/);
    const button = readClientFile("src/components/ui/button.tsx");
    expect(button).toContain("bg-primary text-primary-foreground");
  });

  it("offers a light/dark toggle in Arabic with light as the default theme", () => {
    const nav = readClientFile("src/components/layout/AppTopNav.tsx");
    const app = readClientFile("src/App.tsx");

    expect(app).toContain('<ThemeProvider defaultTheme="light" switchable={true}>');
    expect(nav).toContain("toggleTheme");
    expect(nav).toContain("الوضع الداكن");
    expect(nav).toContain("الوضع الفاتح");
    expect(nav).not.toContain("Dark mode");
    expect(nav).not.toContain("Light mode");
  });

  it("does not pair dark action backgrounds with card foreground text", () => {
    const source = readClientTsxFiles();

    expect(source).not.toMatch(/selrs-gradient-btn[^\n]*text-card-foreground/);
    expect(source).not.toMatch(/text-card-foreground[^\n]*selrs-gradient-btn/);
    expect(source).not.toMatch(/bg-primary(?!\/)[^\n]*text-card-foreground/);
    expect(source).not.toMatch(/bg-slate-900[^\n]*text-card-foreground/);
  });

  it("keeps white foreground scoped to selected or filled controls", () => {
    const source = readClientTsxFiles();

    expect(source).not.toContain("hover:bg-primary text-primary-foreground");
    expect(source).not.toContain(
      "data-[selected-single=true]:bg-primary text-primary-foreground",
    );
    expect(source).not.toContain("text-primary-foreground=checked]");
    expect(source).not.toContain("border-primary=checked]");
    expect(source).not.toMatch(
      // Do not combine classes from separate string literals (e.g. ternary branches).
      /bg-primary[^"'`\n]*text-primary-foreground[^"'`\n]*hover:bg-primary\/10/,
    );
    expect(source).not.toContain(
      "bg-destructive/10 text-destructive-foreground",
    );
    expect(source).not.toContain(
      "text-destructive-foreground bg-destructive/10",
    );
    expect(source).not.toMatch(
      /hover:bg-destructive(?!\/)[^\n]*hover:text-destructive(?!-foreground)/,
    );
    expect(source).not.toContain("hover:text-destructive-foreground:bg-red");
  });
});
