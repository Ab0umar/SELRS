export function hasNotEnded(
  assignment: { effectiveTo?: string | null },
  today: string,
): boolean {
  return !assignment.effectiveTo || assignment.effectiveTo >= today;
}
