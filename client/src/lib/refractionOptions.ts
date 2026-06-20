export const EMPTY_SELECT_VALUE = "__empty__";
/** Placeholder shown for the zero value in signed (sphere/cylinder) ranges —
 *  sits in the middle of the list since the range is symmetric. */
export const ZERO_DASH_VALUE = "---";

function formatSigned(value: number, digits = 2) {
  if (Math.abs(value) < 0.0001) return ZERO_DASH_VALUE;
  const formatted = value.toFixed(digits);
  return value > 0 ? `+${formatted}` : formatted;
}

function buildRange(
  start: number,
  end: number,
  step: number,
  formatter: (value: number) => string,
) {
  const values: string[] = [];
  const max = Math.round((end - start) / step);
  for (let i = 0; i <= max; i += 1) {
    const value = start + i * step;
    values.push(formatter(Number(value.toFixed(6))));
  }
  return values;
}

export const UCVA_BCVA_OPTIONS = [
  "2/60",
  "1/60",
  "0.08",
  "0.05",
  ...buildRange(0.1, 1.0, 0.1, (value) => value.toFixed(1)),
];
export const IOP_OPTIONS = buildRange(1, 30, 1, (value) => String(value));
export const SPHERE_OPTIONS = buildRange(-30, 30, 0.25, (value) =>
  formatSigned(value, 2),
);
export const CYLINDER_OPTIONS = buildRange(-10, 10, 0.25, (value) =>
  formatSigned(value, 2),
);
export const SPHERE_COMBOBOX_OPTIONS = buildRange(-30, 30, 0.25, (value) =>
  formatSigned(value, 2),
);
export const CYLINDER_COMBOBOX_OPTIONS = buildRange(-12, 12, 0.25, (value) =>
  formatSigned(value, 2),
);
export const AIR_PUFF_OPTIONS = [
  ...Array.from({ length: 31 }, (_, index) => String(index)),
  "35",
  "40",
  "45",
  "50",
];

export const ADD_OPTIONS = buildRange(0.5, 10.0, 0.25, (value) =>
  formatSigned(value, 2),
);
