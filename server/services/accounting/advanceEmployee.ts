export interface AdvanceEmployee {
  name: string;
  empCd: string | null;
}

const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export function matchAdvanceEmployee(
  statement: string,
  employees: AdvanceEmployee[],
): AdvanceEmployee | null {
  const text = ` ${normalize(statement)} `;
  const matches = employees.filter((employee) => {
    const name = normalize(employee.name);
    return (
      name.length >= 2 &&
      (text.includes(` ${name} `) || text.includes(` و${name} `))
    );
  });
  // A short alias contained in a matched full name is not a second employee.
  const specific = matches.filter(
    (employee) =>
      !matches.some(
        (other) =>
          normalize(other.name) !== normalize(employee.name) &&
          ` ${normalize(other.name)} `.includes(
            ` ${normalize(employee.name)} `,
          ),
      ),
  );
  const names = new Set(specific.map((employee) => normalize(employee.name)));
  if (names.size !== 1) return null;
  const codes = new Set(
    specific.map((employee) => employee.empCd).filter(Boolean),
  );
  if (codes.size > 1) return null;
  return specific.find((employee) => employee.empCd) ?? specific[0] ?? null;
}
