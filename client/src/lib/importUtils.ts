const MOJIBAKE_HINT = /[ØÙÃÂ]/;

const decodeMojibake = (value: string) => {
  if (!value || !MOJIBAKE_HINT.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value;
  }
};

const normalizeHeader = (value: string) => {
  const decoded = decodeMojibake(String(value ?? ""));
  return decoded.trim().toLowerCase().replace(/[\s\-_]+/g, "");
};

export const buildRowLookup = (row: Record<string, unknown>) => {
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeHeader(key);
    if (!normalized || lookup.has(normalized)) continue;
    lookup.set(normalized, value);
  }
  return lookup;
};

export const getRowValue = (lookup: Map<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (lookup.has(normalized)) return lookup.get(normalized);
  }
  return undefined;
};
