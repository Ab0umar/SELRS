import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  readPersistedOpen,
  usePersistedOpenState,
  writePersistedOpen,
} from "./usePersistedOpenState";

type FakeStorage = Record<string, string>;

function stubWindow(storage: FakeStorage = {}) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key in storage ? storage[key] : null),
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
  });
}

function stubWindowWithStorageError(failing: "getItem" | "setItem") {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => {
        if (failing === "getItem") throw new Error("storage blocked");
        return null;
      },
      setItem: (key: string, value: string) => {
        if (failing === "setItem") throw new Error("storage blocked");
      },
      removeItem: (key: string) => {
        void key;
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readPersistedOpen", () => {
  it("should_return_default_when_nothing_stored", () => {
    stubWindow();
    expect(readPersistedOpen("selrs:test:open", true)).toBe(true);
    expect(readPersistedOpen("selrs:test:open", false)).toBe(false);
  });

  it("should_return_false_when_stored_value_is_0", () => {
    stubWindow({ "selrs:test:open": "0" });
    expect(readPersistedOpen("selrs:test:open", true)).toBe(false);
  });

  it("should_return_true_when_stored_value_is_1", () => {
    stubWindow({ "selrs:test:open": "1" });
    expect(readPersistedOpen("selrs:test:open", false)).toBe(true);
  });

  it("should_fall_back_to_default_when_stored_value_is_garbage", () => {
    stubWindow({ "selrs:test:open": "yes", "selrs:test:blank": "" });
    expect(readPersistedOpen("selrs:test:open", true)).toBe(true);
    expect(readPersistedOpen("selrs:test:open", false)).toBe(false);
    expect(readPersistedOpen("selrs:test:blank", true)).toBe(true);
  });

  it("should_not_throw_when_storage_getItem_throws", () => {
    stubWindowWithStorageError("getItem");
    expect(() => readPersistedOpen("selrs:test:open", true)).not.toThrow();
    expect(readPersistedOpen("selrs:test:open", true)).toBe(true);
  });
});

describe("writePersistedOpen", () => {
  it("should_write_1_or_0_under_the_given_key", () => {
    const storage: FakeStorage = {};
    stubWindow(storage);
    writePersistedOpen("selrs:test:open", true);
    writePersistedOpen("selrs:test:closed", false);
    expect(storage["selrs:test:open"]).toBe("1");
    expect(storage["selrs:test:closed"]).toBe("0");
  });

  it("should_not_throw_when_storage_setItem_throws", () => {
    stubWindowWithStorageError("setItem");
    expect(() => writePersistedOpen("selrs:test:open", true)).not.toThrow();
  });
});

describe("usePersistedOpenState", () => {
  it("should_render_default_open_on_server_without_window", () => {
    let captured!: boolean;
    function Harness() {
      const [open] = usePersistedOpenState("selrs:test:open", true);
      captured = open;
      return createElement("div", null, String(open));
    }
    const html = renderToStaticMarkup(createElement(Harness));
    expect(captured).toBe(true);
    expect(html).toContain("true");
  });

  it("should_render_false_default_on_server_without_window", () => {
    let captured!: boolean;
    function Harness() {
      const [open] = usePersistedOpenState("selrs:test:open", false);
      captured = open;
      return createElement("div", null, String(open));
    }
    const html = renderToStaticMarkup(createElement(Harness));
    expect(captured).toBe(false);
    expect(html).toContain("false");
  });
});
