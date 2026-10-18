export type ComboboxKeyAction =
  | { type: "none" }
  | { type: "open"; activeIndex: number }
  | { type: "move"; activeIndex: number }
  | { type: "select"; activeIndex: number }
  | { type: "close" };

export function getNextActiveIndex(
  current: number,
  count: number,
  direction: 1 | -1,
): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) {
    return direction === 1 ? 0 : count - 1;
  }
  const next = current + direction;
  if (next >= count) return 0;
  if (next < 0) return count - 1;
  return next;
}

/**
 * Maps a keydown on the combobox input to an action. `none` leaves the key's
 * default behaviour untouched, so Enter keeps submitting forms when no option
 * is active.
 */
export function resolveComboboxKey(input: {
  key: string;
  isOpen: boolean;
  activeIndex: number;
  optionCount: number;
  canOpen: boolean;
}): ComboboxKeyAction {
  const { key, isOpen, activeIndex, optionCount, canOpen } = input;
  if (key === "ArrowDown" || key === "ArrowUp") {
    const direction = key === "ArrowDown" ? 1 : -1;
    if (!isOpen) {
      if (!canOpen) return { type: "none" };
      return {
        type: "open",
        activeIndex:
          optionCount > 0 ? getNextActiveIndex(-1, optionCount, direction) : -1,
      };
    }
    if (optionCount <= 0) return { type: "none" };
    return {
      type: "move",
      activeIndex: getNextActiveIndex(activeIndex, optionCount, direction),
    };
  }
  if (key === "Enter") {
    if (isOpen && activeIndex >= 0 && activeIndex < optionCount) {
      return { type: "select", activeIndex };
    }
    return { type: "none" };
  }
  if (key === "Escape") {
    return isOpen ? { type: "close" } : { type: "none" };
  }
  return { type: "none" };
}

export function getPatientOptionId(baseId: string, patientId: number): string {
  return `${baseId}-option-${patientId}`;
}
