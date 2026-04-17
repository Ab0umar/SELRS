export const EMPTY_SELECT_VALUE = "__empty__";

function formatSigned(value: number, digits = 2) {
  if (Math.abs(value) < 0.0001) return (0).toFixed(digits);
  if (value > 0) return `+${value.toFixed(digits)}`;
  return value.toFixed(digits);
}

function buildRange(start: number, end: number, step: number, formatter: (value: number) => string) {
  const values: string[] = [];
  const max = Math.round((end - start) / step);
  for (let i = 0; i <= max; i += 1) {
    const value = start + i * step;
    values.push(formatter(Number(value.toFixed(6))));
  }
  return values;
}

export const UCVA_BCVA_OPTIONS = ["2/60", "1/60", "0.08", "0.05", ...buildRange(0.1, 1.0, 0.1, (value) => value.toFixed(1))];
export const SPHERE_OPTIONS = buildRange(-30, 30, 0.25, (value) => formatSigned(value, 2));
export const CYLINDER_OPTIONS = buildRange(-10, 10, 0.25, (value) => formatSigned(value, 2));
export const AIR_PUFF_OPTIONS = [
  ...Array.from({ length: 31 }, (_, index) => String(index)),
  "35",
  "40",
  "45",
  "50",
];
