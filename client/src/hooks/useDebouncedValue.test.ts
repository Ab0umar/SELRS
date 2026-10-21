import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  it("returns the incoming value on first render so prefilled pickers never flash empty", () => {
    let captured!: string;
    function Harness() {
      captured = useDebouncedValue("abc", 250);
      return createElement("div", null, captured);
    }
    const html = renderToStaticMarkup(createElement(Harness));
    expect(captured).toBe("abc");
    expect(html).toContain("abc");
  });
});
