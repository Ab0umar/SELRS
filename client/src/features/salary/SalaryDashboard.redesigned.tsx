import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  Activity,
  Zap,
  RefreshCw,
  BadgeDollarSign,
  TrendingUp,
  Percent,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalaryDashboard() {
  const now = new Date();
  const summaryQ = (trpc as any).salary.monthSummary.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const summary = summaryQ.data as any;
  const isLoading = summaryQ.isLoading;

  function fmt(n: number) {
    return Number(n).toLocaleString("en-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto" dir="rtl">
      
      {/* ── Main Redesigned Layout Structure ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left 8/12: Coverage Timelines & Circular Gauges */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section A: Visual Shift Coverage Timelines -> Payroll Budget Progress */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">الإجماليات الحالية</h3>
            
            <div className="space-y-4">
              {/* Basic salaries total */}
              <div className="p-5 bg-card border border-border/60 rounded-xl space-y-4 shadow-sm">
                <span className="text-sm font-bold text-foreground">إجمالي الرواتب الأساسية والبدلات</span>
                <div className="text-3xl font-black text-primary font-mono">
                  {isLoading ? "جاري التحميل..." : `${fmt(summary?.totalPay ?? 0)} ج.م`}
                </div>
              </div>

              {/* Commissions total */}
              <div className="p-5 bg-card border border-border/60 rounded-xl space-y-4 shadow-sm">
                <span className="text-sm font-bold text-foreground">إجمالي العمولات</span>
                <div className="text-3xl font-black text-amber-500 font-mono">
                  {isLoading ? "جاري التحميل..." : `${fmt(summary?.totalCommissions ?? 0)} ج.م`}
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Circular Stats Indicators */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">مؤشرات الأداء المالي والجزاءات</h3>
            <div className="grid grid-cols-3 gap-6">
              
              {/* Lateness Gauge -> Total Penalties */}
              <div className="p-5 bg-card border border-border/60 rounded-xl text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-full border-4 border-rose-500/20 border-t-rose-500 flex items-center justify-center font-bold text-xs mx-auto font-mono text-foreground">
                  {isLoading ? "—" : summary?.totalPenalties ? `${Math.round(summary.totalPenalties)}` : "0"}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground block">إجمالي الجزاءات (ج.م)</span>
              </div>

              {/* Missing Checkouts -> Active Staff Count */}
              <div className="p-5 bg-card border border-border/60 rounded-xl text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-full border-4 border-sky-500/20 border-t-sky-500 flex items-center justify-center font-bold text-sm mx-auto font-mono text-foreground">
                  {isLoading ? "—" : summary?.staffCount ?? "0"}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground block">الموظفين المشمولين</span>
              </div>

              {/* Active Inside -> Net Total Pay */}
              <div className="p-5 bg-card border border-border/60 rounded-xl text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center font-bold text-xs mx-auto font-mono text-foreground">
                  {isLoading ? "—" : summary?.totalPay ? `${Math.round(summary.totalPay / 1000)}k` : "0k"}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground block">صافي الرواتب الحالية</span>
              </div>

            </div>
          </div>

        </div>

        {/* Right 4/12: Control Badges & Device Status Radar */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Section C: Oval Command Badges */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">أزرار الإجراءات والتحكم</h3>
            <div className="flex flex-col gap-3">
              
              <Link
                href="/salary/basics"
                className="w-full flex items-center justify-between p-4 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 rounded-xl transition-all duration-200 text-right text-xs font-bold"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="h-4.5 w-4.5 text-teal-400" />
                  <span>تحضير الرواتب الأساسية</span>
                </span>
                <span className="text-[9px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  إعداد
                </span>
              </Link>

              <Link
                href="/salary/pools"
                className="w-full flex items-center justify-between p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl transition-all duration-200 text-right text-xs font-bold"
              >
                <span className="flex items-center gap-2.5">
                  <Percent className="h-4.5 w-4.5 text-amber-400" />
                  <span>العمولات الشهرية والنشاط</span>
                </span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  تسجيل
                </span>
              </Link>

              <Link
                href="/salary/penalties"
                className="w-full flex items-center justify-between p-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl transition-all duration-200 text-right text-xs font-bold"
              >
                <span className="flex items-center gap-2.5">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-400" />
                  <span>الخصومات والسلف الشهرية</span>
                </span>
                <span className="text-[9px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  خصم
                </span>
              </Link>

              <Link
                href="/salary/payroll"
                className="w-full flex items-center justify-between p-4 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl shadow-glow-gold-sm hover:shadow-glow-gold-md transition-all duration-200 text-right text-xs font-bold"
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="h-4.5 w-4.5 text-primary-foreground" />
                  <span>كشف رواتب الموظفين النهائي</span>
                </span>
                <ArrowLeft className="w-4 h-4 text-primary-foreground" />
              </Link>

            </div>
          </div>

          {/* Section D: Device Status Radar -> Salary Audit Radar */}
          <div className="p-6 bg-card border border-border/60 rounded-xl space-y-4 relative overflow-hidden shadow-md">
            <h3 className="text-xs font-bold text-foreground border-b border-border/40 pb-2.5">
              📡 حالة الاحتساب والتدقيق (Roster Audit)
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative shrink-0">
                <span className="absolute w-10 h-10 rounded-full border border-emerald-500/20 animate-ping"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">قواعد التدقيق التلقائي</span>
                <span className="font-bold text-foreground block mt-0.5">جاهز ومطابق</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
