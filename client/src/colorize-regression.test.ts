import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientRoot = resolve(__dirname, "..");

function readClientFile(path: string) {
  return readFileSync(resolve(clientRoot, path), "utf8");
}

function readClientTsxFiles(dir = resolve(clientRoot, "src")): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      const fullPath = resolve(dir, entry.name);

      if (entry.isDirectory()) return readClientTsxFiles(fullPath);
      if (!entry.isFile() || !entry.name.endsWith(".tsx")) return [];

      return readFileSync(fullPath, "utf8");
    })
    .join("\n");
}

describe("color token regressions", () => {
  it("keeps primary as SELRS navy and reserves orange for secondary accents", () => {
    const source = readClientFile("src/index.css");

    expect(source).toContain("--primary: #003D82;");
    expect(source).toContain("--secondary: #FF9500;");
    expect(source).not.toContain("--primary: #FF9500;");
  });

  it("keeps the login submit label readable on the navy action background", () => {
    const source = readClientFile("src/pages/Home.tsx");

    expect(source).not.toContain("bg-[#001F47] text-[15px] font-bold text-card-foreground");
    expect(source).toContain("bg-[#001F47] text-[15px] font-bold text-primary-foreground");
  });

  it("does not render a theme toggle when the product is light-theme only", () => {
    const source = readClientFile("src/components/layout/AppTopNav.tsx");

    expect(source).not.toContain("toggleTheme");
    expect(source).not.toContain("Dark mode");
    expect(source).not.toContain("Light mode");
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
    expect(source).not.toContain("data-[selected-single=true]:bg-primary text-primary-foreground");
    expect(source).not.toContain("text-primary-foreground=checked]");
    expect(source).not.toContain("border-primary=checked]");
    expect(source).not.toMatch(/bg-primary[^\n]*text-primary-foreground[^\n]*hover:bg-primary\/10/);
    expect(source).not.toContain("bg-destructive/10 text-destructive-foreground");
    expect(source).not.toContain("text-destructive-foreground bg-destructive/10");
    expect(source).not.toMatch(/hover:bg-destructive(?!\/)[^\n]*hover:text-destructive(?!-foreground)/);
    expect(source).not.toContain("hover:text-destructive-foreground:bg-red");
  });
});
