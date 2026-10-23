import { useState } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { Home, UserCog, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ROUTES } from "@shared/routes";

/** شريط مختصر للموبايل فقط — روابط Patient Hub / Workflow / Admin / Doctor Hub أُزيلت (موجودة في الـ sidebar). */
export function ShortcutsMenu({
  isMobile,
  onLogout,
}: {
  isMobile?: boolean;
  onLogout?: () => void;
}) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!user?.id) return null;
  if (!isMobile) return null;

  // "/" هي مجرد إعادة توجيه إلى /home (misc-routes)، لذا نربط مباشرة بـ ROUTES.mainHome.
  const currentPath = location.split("?")[0].split("#")[0];
  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(`${href}/`);

  // الحوار شقيق للحاوية وليس داخلها حتى لا يقصّه صف الـ flex.
  return (
    <>
      <div className="flex w-full flex-row items-center justify-between gap-2">
        {/* تسمية ظاهرة لا تتسع دون كسر هدف اللمس 44×44 أو فيض أفقي عند 375px، لذا أيقونة فقط مع tooltip و title و aria-label. */}
        <nav aria-label="اختصارات سريعة" className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="icon" className="shrink-0 rounded-md">
                <Link
                  href={ROUTES.mainHome}
                  aria-label="الرئيسية"
                  title="الرئيسية"
                  aria-current={isActive(ROUTES.mainHome) ? "page" : undefined}
                >
                  <Home className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">الرئيسية</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="icon" className="shrink-0 rounded-md">
                <Link
                  href={ROUTES.profile}
                  aria-label="الملف الشخصي"
                  title="الملف الشخصي"
                  aria-current={isActive(ROUTES.profile) ? "page" : undefined}
                >
                  <UserCog className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">الملف الشخصي</TooltipContent>
          </Tooltip>
        </nav>
        {/* فاصل رأسي رفيع يفصل الخروج عن روابط التنقل (gap-2 في الأب يضمن ≥8px قبل الفاصل). */}
        <div className="flex items-center border-s ps-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 rounded-md text-destructive"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                onClick={() => setConfirmOpen(true)}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">تسجيل الخروج</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="تسجيل الخروج"
        description="هل أنت متأكد من رغبتك في إنهاء الجلسة وتسجيل الخروج؟"
        confirmLabel="تسجيل الخروج"
        cancelLabel="إلغاء"
        isDestructive={true}
        onConfirm={() => {
          setConfirmOpen(false);
          onLogout?.();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
