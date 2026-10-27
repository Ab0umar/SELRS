type ClosureRow = { bookingType?: string | null; branch?: string | null };

/**
 * A closure applies when its type matches (null = every type) and its branch
 * matches (null/"" = every branch). With no branch requested we cannot tell
 * which one the visitor means, so every closure applies.
 */
export function closureApplies(
  row: ClosureRow,
  bookingType: string,
  branch?: string | null,
) {
  const typeMatches = row.bookingType == null || row.bookingType === bookingType;
  const rowBranch = String(row.branch ?? "").trim();
  const branchMatches = !rowBranch || !branch || rowBranch === branch;
  return typeMatches && branchMatches;
}
