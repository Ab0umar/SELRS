/** Queue badges for dashboard appointments widgets (RTL). */

export const statusStyles: Record<string, string> = {
  checkedin: "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary",
  next: "bg-warning/20 text-warning dark:bg-warning/50 dark:text-warning",
  clinic:
    "bg-secondary/15 text-primary dark:bg-secondary/25 dark:text-primary",
  treated:
    "bg-secondary/15 text-primary dark:bg-secondary/25 dark:text-primary",
};

export const statusLabels: Record<string, string> = {
  checkedin: "مسجّل",
  next: "التالي",
  clinic: "بالعيادة",
  treated: "مكتمل",
};
