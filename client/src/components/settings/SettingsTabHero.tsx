import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsTabHeroProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

/** رأس فرعي داخل كل تبويب إعدادات (مطابق لفصل عنوان/الوصف خارج البطاقة البيضاء في المرجع). */
export function SettingsTabHero({ title, subtitle, actions, className }: SettingsTabHeroProps) {
  return (
    <div className={cn("flex flex-col gap-4 text-right sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">{title}</h2>
        {subtitle ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
