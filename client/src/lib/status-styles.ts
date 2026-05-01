/** Queue badges for dashboard appointments widgets (RTL). */

export const statusStyles: Record<string, string> = {
  checkedin: "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary",
  next: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  clinic: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  treated: "bg-secondary/15 text-secondary dark:bg-secondary/25 dark:text-secondary",
};

export const statusLabels: Record<string, string> = {
  checkedin: "مسجّل",
  next: "التالي",
  clinic: "بالعيادة",
  treated: "مكتمل",
};
