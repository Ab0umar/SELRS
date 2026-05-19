import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle, XCircle } from "lucide-react";

export default function LeaveManagement() {
  const [empCd, setEmpCd] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    dateFrom: "",
    dateTo: "",
    type: "annual" as const,
    note: "",
  });

  const employeeLeavesQuery = (trpc as any).attendance.employeeLeaves.useQuery(
    { empCd: empCd || "", year: new Date().getFullYear() },
    { enabled: !!empCd }
  );

  const leaveBalanceQuery = (trpc as any).attendance.leaveBalance.useQuery(
    { empCd: empCd || "", year: new Date().getFullYear() },
    { enabled: !!empCd }
  );

  const pendingLeavesQuery = (trpc as any).attendance.pendingLeaves.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  );

  const createLeaveMutation = (trpc as any).attendance.createLeave.useMutation({
    onSuccess: () => {
      employeeLeavesQuery.refetch();
      setFormData({ dateFrom: "", dateTo: "", type: "annual", note: "" });
      setShowRequestForm(false);
    },
  });

  const approveLeaveMutation = (trpc as any).attendance.approveLeave.useMutation({
    onSuccess: () => {
      pendingLeavesQuery.refetch();
    },
  });

  const handleCreateLeave = async () => {
    if (!formData.dateFrom || !formData.dateTo) {
      alert("Please fill in all required fields");
      return;
    }

    await createLeaveMutation.mutateAsync({
      empCd,
      dateFrom: formData.dateFrom,
      dateTo: formData.dateTo,
      type: formData.type,
      note: formData.note,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Leave Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee Leaves */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Employee Leaves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Employee Code"
                  value={empCd}
                  onChange={(e) => {
                    setEmpCd(e.target.value);
                    setShowRequestForm(false);
                  }}
                />
                <Button
                  onClick={() => setShowRequestForm(!showRequestForm)}
                  disabled={!empCd}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request Leave
                </Button>
              </div>

              {showRequestForm && empCd && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">From</label>
                        <Input
                          type="date"
                          value={formData.dateFrom}
                          onChange={(e) =>
                            setFormData({ ...formData, dateFrom: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">To</label>
                        <Input
                          type="date"
                          value={formData.dateTo}
                          onChange={(e) =>
                            setFormData({ ...formData, dateTo: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="annual">Annual</option>
                        <option value="sick">Sick</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Note</label>
                      <Input
                        placeholder="Optional note"
                        value={formData.note}
                        onChange={(e) =>
                          setFormData({ ...formData, note: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateLeave}
                        disabled={createLeaveMutation.isPending}
                      >
                        Submit Request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRequestForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {employeeLeavesQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : employeeLeavesQuery.data && employeeLeavesQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {employeeLeavesQuery.data.map((leave: any) => (
                    <div
                      key={leave.id}
                      className="border rounded-lg p-3 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {leave.dateFrom} to {leave.dateTo}
                        </div>
                        <div className="text-sm text-gray-600">
                          Type: {leave.type} • {leave.approved ? "Approved" : "Pending"}
                        </div>
                        {leave.note && (
                          <div className="text-sm text-gray-500">{leave.note}</div>
                        )}
                      </div>
                      <div>
                        {leave.approved ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
                            <XCircle className="w-4 h-4" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No leave records. Enter employee code to view.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Leave Balance & Pending */}
        <div className="space-y-6">
          {/* Leave Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Annual Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveBalanceQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : leaveBalanceQuery.data ? (
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-600">Allocated</div>
                    <div className="text-2xl font-bold">
                      {leaveBalanceQuery.data.annualAllocation}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Used</div>
                    <div className="text-xl font-semibold text-yellow-600">
                      {leaveBalanceQuery.data.usedDays}
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="text-sm text-gray-600">Remaining</div>
                    <div className="text-2xl font-bold text-green-600">
                      {leaveBalanceQuery.data.remainingDays}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Enter employee code to view balance
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLeavesQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pendingLeavesQuery.data && pendingLeavesQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {pendingLeavesQuery.data.slice(0, 5).map((leave: any) => (
                    <div
                      key={leave.id}
                      className="border rounded-lg p-2 text-sm bg-orange-50"
                    >
                      <div className="font-medium">{leave.empCd}</div>
                      <div className="text-xs text-gray-600">
                        {leave.dateFrom} to {leave.dateTo}
                      </div>
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => approveLeaveMutation.mutate({ leaveId: leave.id })}
                        disabled={approveLeaveMutation.isPending}
                      >
                        Approve
                      </Button>
                    </div>
                  ))}
                  {pendingLeavesQuery.data.length > 5 && (
                    <div className="text-xs text-gray-500 text-center p-2">
                      +{pendingLeavesQuery.data.length - 5} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No pending approvals
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
