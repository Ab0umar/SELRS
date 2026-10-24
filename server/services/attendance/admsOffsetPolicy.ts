export interface AdmsOffsetDecision {
  offset: number | undefined;
  pending: number | undefined;
  changed: boolean;
}

/**
 * Track the device-ahead offset continuously: the first observation calibrates,
 * a different value must be seen twice in a row before it replaces the current
 * one (DST switch, firmware TZ change) so a single delayed or forged batch
 * cannot retune a calibrated device. A manual override always wins.
 */
export function decideAdmsOffset(
  current: number | undefined,
  observed: number,
  pending: number | undefined,
  manualOverride: string | undefined,
): AdmsOffsetDecision {
  if (manualOverride) return { offset: current, pending: undefined, changed: false };
  if (current === undefined) return { offset: observed, pending: undefined, changed: true };
  if (observed === current) return { offset: current, pending: undefined, changed: false };
  if (pending === observed) return { offset: observed, pending: undefined, changed: true };
  return { offset: current, pending: observed, changed: false };
}
