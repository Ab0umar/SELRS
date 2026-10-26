import { beforeEach, describe, expect, it, vi } from "vitest";

const searchPatients = vi.fn();
vi.mock("../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db")>()),
  searchPatients: (...args: unknown[]) => searchPatients(...args),
}));

import {
  canonicalPatientName,
  canonicalPatientPhone,
  findExistingPatientByNameAndPhone,
  findExistingPatientByPhoneAndDob,
  findPossibleDuplicatePatients,
} from "../routers/_medical/patient-helpers";

const father = {
  id: 1,
  patientCode: "0100",
  fullName: "محمد أحمد علي",
  phone: "01001234567",
  alternatePhone: null,
  dateOfBirth: "1970-05-01",
};
const son = {
  id: 2,
  patientCode: "0101",
  fullName: "أحمد محمد أحمد",
  phone: "01001234567",
  alternatePhone: null,
  dateOfBirth: "2008-03-09",
};

beforeEach(() => searchPatients.mockReset());

describe("normalisation", () => {
  it("ignores spacing, diacritics and alef/ya/ta-marbuta spelling in names", () => {
    expect(canonicalPatientName("  أحمــد   مُحمّد ")).toBe(canonicalPatientName("احمد محمد"));
    expect(canonicalPatientName("فاطمة")).toBe(canonicalPatientName("فاطمه"));
    expect(canonicalPatientName("مصطفى")).toBe(canonicalPatientName("مصطفي"));
  });

  it("reads +20 / 0020 / leading-zero phone numbers as the same number", () => {
    for (const raw of ["01001234567", "+20 100 123 4567", "00201001234567", "201001234567"]) {
      expect(canonicalPatientPhone(raw)).toBe("01001234567");
    }
  });
});

describe("findExistingPatientByNameAndPhone", () => {
  it("does not merge a relative who only shares the family phone number", async () => {
    searchPatients.mockResolvedValue([father]);
    expect(
      await findExistingPatientByNameAndPhone("أحمد محمد أحمد", "01001234567"),
    ).toBeNull();
  });

  it("does not merge a different person who only shares the name", async () => {
    searchPatients.mockResolvedValue([{ ...father, phone: "01119998888" }]);
    expect(
      await findExistingPatientByNameAndPhone("محمد أحمد علي", "01001234567"),
    ).toBeNull();
  });

  it("matches when the name and a phone number both agree (alternate phone too)", async () => {
    searchPatients.mockResolvedValue([
      { ...father, phone: "01119998888", alternatePhone: "+201001234567" },
    ]);
    expect(
      (await findExistingPatientByNameAndPhone("محمد  احمد علي", "01001234567"))?.id,
    ).toBe(1);
  });

  it("needs both a name and a phone to even look", async () => {
    expect(await findExistingPatientByNameAndPhone("محمد", "")).toBeNull();
    expect(await findExistingPatientByNameAndPhone("", "01001234567")).toBeNull();
    expect(searchPatients).not.toHaveBeenCalled();
  });
});

describe("findExistingPatientByPhoneAndDob", () => {
  it("treats twins (same phone, same birth date, different name) as different people", async () => {
    const twin = { ...son, dateOfBirth: "2008-03-09" };
    searchPatients.mockResolvedValue([twin]);
    expect(
      await findExistingPatientByPhoneAndDob("01001234567", "2008-03-09", "سارة محمد أحمد"),
    ).toBeNull();
    expect(
      (await findExistingPatientByPhoneAndDob("01001234567", "2008-03-09", "أحمد محمد أحمد"))?.id,
    ).toBe(2);
  });
});

describe("findPossibleDuplicatePatients", () => {
  it("lists records that share only a phone or only a name, without merging", async () => {
    searchPatients.mockImplementation(async (...args: unknown[]) => {
      return String(args[0]).includes("1001234567") ? [father, son] : [];
    });
    const result = await findPossibleDuplicatePatients("سارة محمد أحمد", "01001234567");
    expect(result.map((r) => [r.id, r.matchedOn])).toEqual([
      [1, "phone"],
      [2, "phone"],
    ]);
  });

  it("caps the list", async () => {
    searchPatients.mockResolvedValue(
      Array.from({ length: 9 }, (_, i) => ({ ...father, id: i + 1 })),
    );
    expect(await findPossibleDuplicatePatients("x", "01001234567", 3)).toHaveLength(3);
  });
});
