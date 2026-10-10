export function rosterDates(from: string, to: string): string[] {
  const end = new Date(`${to}T12:00:00Z`);
  const dates: string[] = [];
  for (
    const day = new Date(`${from}T12:00:00Z`);
    day <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

export function rosterAddDates(
  range: { from: string; to: string },
  period: "day" | "week" | "weekly" | "month",
  anchor: string,
): string[] {
  const dates = rosterDates(range.from, range.to);
  if (period === "month") return dates;
  if (period === "day") return dates.filter((date) => date === anchor);
  const anchorDay = new Date(`${anchor}T12:00:00Z`);
  if (period === "weekly") {
    return dates.filter(
      (date) =>
        new Date(`${date}T12:00:00Z`).getUTCDay() === anchorDay.getUTCDay(),
    );
  }
  anchorDay.setUTCDate(
    anchorDay.getUTCDate() - ((anchorDay.getUTCDay() + 6) % 7),
  );
  const weekStart = anchorDay.toISOString().slice(0, 10);
  anchorDay.setUTCDate(anchorDay.getUTCDate() + 6);
  const weekEnd = anchorDay.toISOString().slice(0, 10);
  return dates.filter((date) => date >= weekStart && date <= weekEnd);
}
