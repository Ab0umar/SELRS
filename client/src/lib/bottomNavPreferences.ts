export function normalizeBottomNavKeys(
  value: unknown,
  allowed: readonly string[],
): string[] | null {
  if (!Array.isArray(value)) return null;
  return [
    ...new Set(
      value.filter(
        (key): key is string =>
          typeof key === "string" && allowed.includes(key),
      ),
    ),
  ];
}

export function moveBottomNavKey(
  keys: readonly string[],
  key: string,
  direction: -1 | 1,
): string[] {
  const result = [...keys];
  const index = result.indexOf(key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= result.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
