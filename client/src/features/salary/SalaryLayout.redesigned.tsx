import { ReactNode } from "react";
import { ConfirmHost } from "../attendance/askConfirm";
import OperationalModuleShell from "@/components/layout/OperationalModuleShell";
import {
  BadgeDollarSign,
  BarChart3,
  Users,
  Percent,
  UserRound,
  SlidersHorizontal,
  WalletCards,
  FileText,
} from "lucide-react";
import "./salary.css";
import "./salary-design.css";

interface SalaryLayoutProps {
  children: ReactNode;
}

const navigationSections = [
  {
    id: "dashboard",
    label: "الرئيسية",
    description: "نظرة عامة على الرواتب والعمولات",
    icon: BarChart3,
    items: [
      {
        href: "/salary",
        label: "لوحة التحكم",
        description: "مؤشرات وأداء الرواتب والعمولات",
        activeFor: ["/salary"],
        icon: BarChart3,
      },
    ],
  },
  {
    id: "preparation",
    label: "التحضير",
    description: "إعداد بيانات الرواتب الأساسية",
    icon: Users,
    items: [
      {
        href: "/salary/basics",
        label: "الرواتب الأساسية",
        description: "تحضير الرواتب والبدلات",
        activeFor: ["/salary/basics"],
        icon: Users,
      },
    ],
  },
  {
    id: "variables",
    label: "المتغيرات الشهرية",
    description: "إدخال البيانات المتغيرة كل شهر",
    icon: Percent,
    items: [
      {
        href: "/salary/pools",
        label: "العمولات الشهرية",
        description: "تسجيل عمولات الكشف والبنتاكام",
        activeFor: ["/salary/pools"],
        icon: Percent,
      },
      {
        href: "/salary/funds",
        label: "الصندوق والعيدية",
        description: "صندوق العمليات وعيديات الموظفين",
        activeFor: ["/salary/funds"],
        icon: WalletCards,
      },
      {
        href: "/salary/penalties",
        label: "الخصومات والسلف",
        description: "جزاءات الشهر والسلف والتأمينات",
        activeFor: ["/salary/penalties"],
        icon: Percent,
      },
    ],
  },
  {
    id: "payroll",
    label: "كشف الشهر",
    description: "توليد واعتماد كشف الرواتب",
    icon: BarChart3,
    items: [
      {
        href: "/salary/payroll",
        label: "كشف الشهر",
        description: "احتساب ومراجعة وطباعة الرواتب",
        activeFor: ["/salary/payroll"],
        icon: BarChart3,
      },
    ],
  },
  {
    id: "shifts",
    label: "الشفتات",
    description: "إدارة شفتات الأطباء والفنيين",
    icon: UserRound,
    items: [
      {
        href: "/salary/shift-staff",
        label: "الشفتات",
        description: "طاقم الشفتات وكشف المستحقات",
        activeFor: ["/salary/shift-staff", "/salary/shift-payroll"],
        icon: UserRound,
      },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    description: "بيانات الرواتب والغياب",
    icon: FileText,
    items: [
      {
        href: "/salary/current-data",
        label: "بيانات الشهر",
        activeFor: ["/salary/current-data"],
        icon: FileText,
      },
      {
        href: "/salary/absent-report",
        label: "تقرير الغياب",
        activeFor: ["/salary/absent-report"],
        icon: FileText,
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات",
    description: "ضبط قواعد الرواتب",
    icon: SlidersHorizontal,
    items: [
      {
        href: "/salary/settings",
        label: "إعدادات الرواتب",
        description: "نسب الحضور والقواعد المستخدمة",
        activeFor: ["/salary/settings"],
        icon: SlidersHorizontal,
      },
    ],
  },
];

export default function SalaryLayout({ children }: SalaryLayoutProps) {
  return (
    <OperationalModuleShell
      moduleName="salary"
      fullWidth
      ledger
      title="الرواتب والعمولات"
      description="تجهيز الرواتب، المتغيرات الشهرية، وكشف الاستحقاقات"
      mark={<BadgeDollarSign className="h-5 w-5" />}
      navigation={navigationSections.flatMap((section) => section.items)}
    >
      <div className="attendance-touch salary-touch contents">
        {children}
      </div>
      <ConfirmHost />
    </OperationalModuleShell>
  );
}
