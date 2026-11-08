import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function block(file: string, marker: RegExp): Record<string, string> {
  const source = readFileSync(resolve(__dirname, file), "utf8");
  const start = source.search(marker);
  expect(start, `${file} ${marker}`).toBeGreaterThan(-1);
  const end = source.indexOf("\n}", start);
  const tokens: Record<string, string> = {};
  for (const match of source.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] ??= match[2].trim().toLowerCase();
  }
  return tokens;
}

const LIGHT = ["background", "foreground", "card", "popover", "muted", "border"];
const DARK = [...LIGHT, "primary", "primary-foreground", "ring"];

describe("platform stylesheets repeat the design-system tokens", () => {
  const designLight = block("design-system.css", /\n\s*:root \{/);
  const designDark = block("design-system.css", /\n\s*\.dark \{/);

  for (const file of ["web.css", "mobile.css"]) {
    it(`${file} light tokens match design-system.css`, () => {
      const light = block(file, /\n:root \{/);
      for (const key of LIGHT) expect(light[key], `${file} --${key}`).toBe(designLight[key]);
    });
    it(`${file} dark tokens match design-system.css`, () => {
      const dark = block(file, /\n\.dark \{/);
      for (const key of DARK) expect(dark[key], `${file} --${key}`).toBe(designDark[key]);
    });
  }
});
