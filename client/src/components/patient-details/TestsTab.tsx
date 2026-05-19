import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TestsTabProps {
  testRequestsData: any[] | undefined;
}

export function TestsTab({ testRequestsData }: TestsTabProps) {
  return (
    <Card className="border-border/80 bg-background/92 shadow-sm">
      <CardHeader className="border-b border-border">
        <CardTitle>الفحوصات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!testRequestsData || testRequestsData.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد طلبات فحوصات محفوظة</p>
        ) : (
          <div className="space-y-4">
            {testRequestsData.map((request: any, idx: number) => (
              <div key={idx} className="rounded border border-border p-4 bg-muted">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {request.requestDate ? new Date(request.requestDate).toLocaleDateString("ar-EG") : "—"}
                  </p>
                  <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
                    {request.items?.length || 0} فحص
                  </span>
                </div>
                {request.items?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-foreground mb-2">الفحوصات المطلوبة:</p>
                    <div className="flex flex-wrap gap-2">
                      {request.items.map((item: any) => (
                        <span key={item.id} className="text-xs bg-background px-2 py-1 border border-ring/30 rounded text-primary">
                          {item.testName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {request.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">ملاحظات:</p>
                    <p className="text-sm text-foreground">{request.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
