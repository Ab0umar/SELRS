import { Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarCheck, LogOut, UserCog } from "lucide-react";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { useAuth } from "@/hooks/useAuth";

const Profile = lazy(() => import("./Profile"));
const MyAttendanceProfile = lazy(
  () => import("../features/attendance/MyAttendanceProfile"),
);

type AccountTabKey = "profile" | "attendance";

const TAB_META: Record<AccountTabKey, { href: string; label: string; icon: typeof UserCog }> = {
  profile: { href: "/account", label: "الملف الشخصي", icon: UserCog },
  attendance: { href: "/account/attendance", label: "حضوري", icon: CalendarCheck },
};

const TAB_ORDER: AccountTabKey[] = ["profile", "attendance"];

export default function AccountPage() {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const loc = location.split("?")[0];

  const activeTab: AccountTabKey =
    TAB_ORDER.find((tab) => loc === TAB_META[tab].href || loc.startsWith(TAB_META[tab].href + "/")) ??
    "profile";

  const handleTabChange = (next: string) => {
    setLocation(TAB_META[next as AccountTabKey].href);
  };

  return (
    <div className="w-full bg-background text-foreground" dir="rtl">
      <div className="w-full space-y-4 p-3 sm:p-5">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full space-y-4"
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:none]">
              <TabsList
                className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1"
                dir="rtl"
              >
                {TAB_ORDER.map((tab) => {
                  const meta = TAB_META[tab];
                  const Icon = meta.icon;
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span>{meta.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2 text-xs font-bold text-destructive hover:text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>خروج</span>
            </Button>
          </div>

          <TabsContent value="profile" className="m-0 focus-visible:outline-none">
            <Suspense fallback={<AppShellSkeleton />}>
              <Profile embeddedInHub />
            </Suspense>
          </TabsContent>

          <TabsContent value="attendance" className="m-0 focus-visible:outline-none">
            <Suspense fallback={<AppShellSkeleton />}>
              <MyAttendanceProfile embeddedInHub />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
