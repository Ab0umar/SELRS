import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Calendar, Pill, Activity, FileCheck, FileText } from "lucide-react";
import { Input } from "./ui/input";

export default function TodayPatientsPanel() {
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEditingDate, setIsEditingDate] = useState(false);

  const quickActionButtons = [
    {
      icon: FileText,
      label: "Medical File",
      color: "text-blue-600",
      hoverColor: "hover:bg-blue-50",
      onClick: () => setLocation("/patient-file"),
    },
    {
      icon: Pill,
      label: "Prescription",
      color: "text-green-600",
      hoverColor: "hover:bg-green-50",
      onClick: () => setLocation("/prescription"),
    },
    {
      icon: Activity,
      label: "Tests",
      color: "text-blue-600",
      hoverColor: "hover:bg-blue-50",
      onClick: () => setLocation("/request-tests"),
    },
    {
      icon: FileCheck,
      label: "Reports",
      color: "text-purple-600",
      hoverColor: "hover:bg-purple-50",
      onClick: () => setLocation("/medical-reports"),
    },
  ];

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h3 className="text-sm font-bold text-right">مرضى اليوم</h3>
      </div>

      {/* Date Picker */}
      <div className="flex-shrink-0">
        <div
          className="flex items-center gap-2 justify-center cursor-pointer hover:text-slate-900 px-2"
          onClick={() => setIsEditingDate(true)}
        >
          {isEditingDate ? (
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setIsEditingDate(false);
              }}
              onBlur={() => setIsEditingDate(false)}
              autoFocus
              className="text-sm h-8 text-center"
            />
          ) : (
            <>
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">{selectedDate}</span>
            </>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {quickActionButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <Button
              key={idx}
              onClick={btn.onClick}
              variant="outline"
              className={`w-full justify-start gap-2 text-xs ${btn.color} ${btn.hoverColor}`}
            >
              <Icon className="h-4 w-4" />
              <span>{btn.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
