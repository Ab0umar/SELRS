import { afterEach, expect, it, vi } from "vitest";
import { applyProposal, undoProposal } from "./form-application";

afterEach(() => vi.unstubAllGlobals());

function fixture(fields = "complaints symptoms") {
  class Field {
    private text = "Existing complaint";
    dataset = { medicalProposals: fields };
    isConnected = true;
    disabled = false;
    readOnly = false;
    get value() {
      return this.text;
    }
    set value(value: string) {
      this.text = value;
    }
    getClientRects() {
      return [1];
    }
    dispatchEvent = vi.fn();
  }
  vi.stubGlobal("HTMLTextAreaElement", Field);
  const field = new Field();
  const root = {
    querySelectorAll: () => [field],
    contains: (element: unknown) => element === field,
  };
  return { field, root: root as unknown as HTMLElement };
}

it("appends to the mapped draft and restores existing text on undo", () => {
  const { root, field } = fixture();
  const applied = applyProposal(root, "symptoms", "Blurred vision");
  expect(field.value).toBe("Existing complaint\nBlurred vision");
  expect(field.dispatchEvent).toHaveBeenCalledOnce();
  undoProposal(root, applied);
  expect(field.value).toBe("Existing complaint");
});

it("does not route patient history into the complaints field", () => {
  const { root, field } = fixture();
  expect(() => applyProposal(root, "history", "Diabetes")).toThrow(
    "no unique destination",
  );
  expect(field.value).toBe("Existing complaint");
});

it("does not undo over newer manual edits", () => {
  const { root, field } = fixture();
  const applied = applyProposal(root, "complaints", "Headache");
  field.value = "Doctor edited this";
  expect(() => undoProposal(root, applied)).toThrow("newer edits");
  expect(field.value).toBe("Doctor edited this");
});

it("rejects locked or detached fields", () => {
  const { root, field } = fixture();
  field.readOnly = true;
  expect(() => applyProposal(root, "complaints", "Headache")).toThrow(
    "not editable",
  );
  field.readOnly = false;
  field.isConnected = false;
  expect(() => applyProposal(root, "complaints", "Headache")).toThrow(
    "not editable",
  );
});

it("rejects ambiguous destinations", () => {
  const { root, field } = fixture();
  root.querySelectorAll = vi.fn(() => [
    field,
    field,
  ]) as unknown as typeof root.querySelectorAll;
  expect(() => applyProposal(root, "complaints", "Headache")).toThrow(
    "no unique destination",
  );
});
