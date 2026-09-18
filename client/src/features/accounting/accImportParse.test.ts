import { describe, expect, it } from "vitest";
import {
  buildAccNotes,
  parseAccDate,
  parseAccSheet,
} from "./accImportParse";

describe("parseAccDate", () => {
  it("parses ISO date strings with time", () => {
    expect(parseAccDate("2024-10-26 13:25")).toBe("2024-10-26");
  });

  it("parses Excel serial day numbers", () => {
    // anchors verified against the app export: 45593=2024-10-28, 45620=2024-11-24
    expect(parseAccDate(45593)).toBe("2024-10-28");
    expect(parseAccDate(45620)).toBe("2024-11-24");
  });

  it("parses dd/mm/yyyy strings", () => {
    expect(parseAccDate("26/10/2024")).toBe("2024-10-26");
  });

  it("parses Date objects without timezone drift", () => {
    const d = new Date(2024, 9, 26, 0, 56); // local 2024-10-28 00:56-like edge
    expect(parseAccDate(d)).toBe("2024-10-26");
  });

  it("returns null for garbage", () => {
    expect(parseAccDate("نص")).toBeNull();
    expect(parseAccDate(null)).toBeNull();
  });
});

describe("buildAccNotes", () => {
  it("extracts sender name from Arabic SMS hint and keeps ref", () => {
    const hint =
      "عميلنا العزيز, تم إضافة تحويل لحظي لحسابكم المنتهي ب 0001 بمبلغ 450.00 ج.م من. مصطفى عادل احمد توفيق السرسى  يوم 24/08/2026 الساعة 15:51. الرقم المرجعي 9207ab12cd3ef";
    const notes = buildAccNotes("InstaPay", hint);
    expect(notes).toContain("مصطفى عادل احمد توفيق السرسى");
    expect(notes).toContain("مرجع 9207ab12cd3ef");
  });

  it("extracts beneficiary and description from English hint", () => {
    const hint =
      "Instant Transfer To-HESHAM MOHAMED MOUSTAFA KAMAL ELSAADANY GHARABA , ref : IPN66d46e257f754 , description : Living Expenses-";
    const notes = buildAccNotes("Instant Transfer To", hint);
    expect(notes).toContain("HESHAM MOHAMED MOUSTAFA KAMAL ELSAADANY GHARABA");
    expect(notes).toContain("Living Expenses");
    expect(notes).toContain("مرجع IPN66d46e257f754");
  });

  it("falls back to description column when hint has no name", () => {
    expect(buildAccNotes("عميل نقدي", "")).toBe("عميل نقدي");
  });
});

describe("parseAccSheet", () => {
  it("parses bank export with signed amount column", () => {
    const sheet = [
      ["Date", "Description", "Amount", "Currency", "Account", "Category", "Type", "Hint"],
      [
        "2024-10-26 13:25",
        "InstaPay",
        -1000,
        "EGP",
        "FABMISR",
        "Transfer Out",
        "Expense",
        "تم تنفيذ تحويل لحظي ... الرقم المرجعي 5f89720ed5830",
      ],
      [
        "2024-10-30 17:04",
        "مريض",
        10000,
        "EGP",
        "FABMISR",
        "Transfer In",
        "Income",
        "تم إضافة تحويل لحظي ...",
      ],
    ];
    const { rows, invalid } = parseAccSheet(sheet);
    expect(invalid).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      txDate: "2024-10-26",
      inAmount: 0,
      outAmount: 1000,
    });
    expect(rows[0].notes).toContain("مرجع 5f89720ed5830");
    expect(rows[1]).toMatchObject({
      txDate: "2024-10-30",
      inAmount: 10000,
      outAmount: 0,
    });
  });

  it("parses serial-date sheet with in/out split by sign", () => {
    const sheet = [
      ["Date", "Description", "Amount", "Currency", "Account", "Category", "Type", "Hint"],
      [
        45865,
        "Instant Transfer To",
        -2000,
        "EGP",
        "SELRS Out",
        "IPN",
        "Expense",
        "Instant Transfer To-HESHAM , ref : IPN66d46e257f754 , description : Living Expenses-",
      ],
      [null, null, null, null, null, null, null, null],
    ];
    const { rows, invalid } = parseAccSheet(sheet);
    expect(invalid).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      txDate: "2025-07-27",
      outAmount: 2000,
      inAmount: 0,
    });
  });

  it("parses simple ledger format with separate in/out columns", () => {
    const sheet = [
      ["التاريخ", "البيان", "منه", "معاه"],
      ["26/10/2024", "إيراد نقدي", 5000, null],
      ["27/10/2024", "مصروف كهرباء", null, 750],
    ];
    const { rows } = parseAccSheet(sheet);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ inAmount: 5000, outAmount: 0 });
    expect(rows[1]).toMatchObject({ inAmount: 0, outAmount: 750 });
  });

  it("skips rows without date or amount", () => {
    const sheet = [
      ["Date", "Amount"],
      ["2024-10-26", 100],
      ["", 200],
      ["2024-10-27", null],
    ];
    const { rows, invalid } = parseAccSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(invalid).toBe(2);
  });

  it("returns empty when no recognizable header", () => {
    const { rows, mappedColumns } = parseAccSheet([
      ["a", "b"],
      [1, 2],
    ]);
    expect(rows).toHaveLength(0);
    expect(mappedColumns).toHaveLength(0);
  });
});
