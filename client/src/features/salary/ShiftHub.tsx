import ShiftStaff from "./ShiftStaff";
import ShiftPayroll from "./ShiftPayroll";
import { useLocation } from "wouter";

export default function ShiftHub() {
  const [location, navigate] = useLocation();
  const payroll = location === "/salary/shift-payroll";

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex w-fit gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => navigate("/salary/shift-staff")}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${!payroll ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
        >
          طاقم الشفتات
        </button>
        <button
          type="button"
          onClick={() => navigate("/salary/shift-payroll")}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${payroll ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
        >
          كشف الشفتات
        </button>
      </div>
      {payroll ? <ShiftPayroll /> : <ShiftStaff />}
    </div>
  );
}
