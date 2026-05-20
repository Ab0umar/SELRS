import { ReactNode } from "react";

interface AttendanceLayoutProps {
  children: ReactNode;
}

export default function AttendanceLayout({ children }: AttendanceLayoutProps) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto py-6 px-4">
        {children}
      </div>
    </div>
  );
}
