import ShiftStaff from "./ShiftStaff";
import ShiftPayroll from "./ShiftPayroll";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function ShiftHub() {
  const [location, navigate] = useLocation();
  const payroll = location === "/salary/shift-payroll";

  return (
    <div className="space-y-5" dir="rtl">
      <div
        className="flex w-fit gap-1 rounded-xl border border-border/60 bg-muted/40 p-1"
        role="tablist"
        aria-label="أقسام الشفتات"
      >
        <Button variant="bare"
          type="button"
          onClick={() => navigate("/salary/shift-staff")}
          role="tab"
          aria-selected={!payroll}
          aria-controls="salary-shift-panel"
          tabIndex={!payroll ? 0 : -1}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${!payroll ? "bg-background text-primary shadow-xs" : "text-muted-foreground"}`}
        >
          طاقم الشفتات
        </Button>
        <Button variant="bare"
          type="button"
          onClick={() => navigate("/salary/shift-payroll")}
          role="tab"
          aria-selected={payroll}
          aria-controls="salary-shift-panel"
          tabIndex={payroll ? 0 : -1}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${payroll ? "bg-background text-primary shadow-xs" : "text-muted-foreground"}`}
        >
          كشف الشفتات
        </Button>
      </div>
      <div
        id="salary-shift-panel"
        role="tabpanel"
        aria-label={payroll ? "كشف الشفتات" : "طاقم الشفتات"}
      >
        {payroll ? <ShiftPayroll /> : <ShiftStaff />}
      </div>
    </div>
  );
}
