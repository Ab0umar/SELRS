import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";

type NotificationSettings = {
  mssqlOwnerEnabled?: boolean;
  mssqlInAppEnabled?: boolean;
  manualPatientInAppEnabled?: boolean;
  operationsPushEnabled?: boolean;
  operationsPushUserIds?: number[];
};

type User = {
  id: number;
  name: string;
  username?: string;
  role?: string;
};

export default function AdminNotificationSettings() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<NotificationSettings>({});
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const settingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "app_notification_settings_v1" },
    { refetchOnWindowFocus: false }
  );

  const usersQuery = trpc.medical.getAllUsers.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const updateSettingsMutation = trpc.medical.updateSystemSetting.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الإشعارات بنجاح");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ الإعدادات"));
    },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (settingsQuery.data?.value) {
      setSettings(settingsQuery.data.value as NotificationSettings);
      setIsLoading(false);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (usersQuery.data) {
      setUsers(usersQuery.data as User[]);
    }
  }, [usersQuery.data]);

  const handleToggleUser = (userId: number) => {
    setSettings((prev) => ({
      ...prev,
      operationsPushUserIds: prev.operationsPushUserIds?.includes(userId)
        ? prev.operationsPushUserIds.filter((id) => id !== userId)
        : [...(prev.operationsPushUserIds || []), userId],
    }));
  };

  const filteredUsers = users.filter((u) =>
    (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        key: "app_notification_settings_v1",
        value: settings,
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  if (isLoading || !isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 text-right" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الإشعارات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operations Push Notifications */}
          <div className="rounded-lg border border-border bg-muted p-4">
            <div className="mb-4 flex items-center gap-3">
              <Checkbox
                id="operationsPushEnabled"
                checked={settings.operationsPushEnabled || false}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    operationsPushEnabled: Boolean(checked),
                  }))
                }
              />
              <Label htmlFor="operationsPushEnabled" className="text-base font-semibold cursor-pointer">
                تفعيل إشعارات العمليات الجراحية
              </Label>
            </div>

            {settings.operationsPushEnabled && (
              <div className="space-y-3 rounded bg-background p-3">
                <div>
                  <p className="text-sm font-medium mb-2">ابحث عن المستخدمين:</p>
                  <Input
                    type="text"
                    placeholder="ابحث بالاسم أو اسم المستخدم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    dir="rtl"
                  />
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2 border border-border rounded p-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">لا توجد مستخدمين</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                        <Checkbox
                          id={`user-${u.id}`}
                          checked={settings.operationsPushUserIds?.includes(u.id) || false}
                          onCheckedChange={() => handleToggleUser(u.id)}
                        />
                        <Label htmlFor={`user-${u.id}`} className="cursor-pointer flex-1">
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.role}</p>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  ({settings.operationsPushUserIds?.length || 0} مستخدم مختار)
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="w-full"
          >
            {updateSettingsMutation.isPending ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
