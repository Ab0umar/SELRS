import { describe, expect, it } from "vitest";
import { matchAdvanceEmployee } from "../../server/services/accounting/advanceEmployee";

describe("cashbook advance employee matching", () => {
  const employees = [
    { name: "أحمد مصطفى", empCd: "12" },
    { name: "محمد علي", empCd: "13" },
  ];
  it("links the employee from a statement with Arabic spelling variants", () => {
    expect(matchAdvanceEmployee("سلفة احمد مصطفي", employees)).toEqual(
      employees[0],
    );
  });
  it("prefers the full attendance name over an accounting alias", () => {
    expect(
      matchAdvanceEmployee("سداد أحمد مصطفى", [
        ...employees,
        { name: "أحمد", empCd: null },
      ]),
    ).toEqual(employees[0]);
  });
  it("does not guess for ambiguous, unknown or partial names", () => {
    expect(
      matchAdvanceEmployee("سلفة أحمد مصطفى ومحمد علي", employees),
    ).toBeNull();
    expect(matchAdvanceEmployee("سلفة أحمد", employees)).toBeNull();
    expect(matchAdvanceEmployee("سلفة موظف", employees)).toBeNull();
    expect(
      matchAdvanceEmployee("أحمد مصطفى", [
        ...employees,
        { name: "احمد مصطفي", empCd: "99" },
      ]),
    ).toBeNull();
  });
});
