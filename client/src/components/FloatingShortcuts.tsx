import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Home, UserCog, LogOut } from "lucide-react";
import { useLocation } from "wouter";

/** شريط مختصر للموبايل فقط — روابط Patient Hub / Workflow / Admin / Doctor Hub أُزيلت (موجودة في الـ sidebar). */
export function ShortcutsMenu({
  isMobile,
  onLogout,
}: {
  isMobile?: boolean;
  onLogout?: () => void;
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user?.id) return null;
  if (!isMobile) return null;

  return (
    <div className="flex w-full flex-row items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setLocation("/")}
          className="shrink-0 rounded-md"
          aria-label="الرئيسية"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setLocation("/profile")}
          className="shrink-0 rounded-md"
          aria-label="الملف الشخصي"
        >
          <UserCog className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onLogout?.()}
        className="h-9 w-9 shrink-0 rounded-md"
        aria-label="خروج"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
