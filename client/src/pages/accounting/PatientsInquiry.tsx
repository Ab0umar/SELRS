import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import AccountingShell from "./AccountingShell";
import { Search } from "lucide-react";

export default function PatientsInquiry() {
  const [, setLocation] = useLocation();
  const [patientCode, setPatientCode] = useState("");

  const handleSearch = () => {
    if (patientCode.trim()) {
      setLocation(`/accounting/patient/${encodeURIComponent(patientCode.trim())}`);
    }
  };

  return (
    <AccountingShell>
      <div className="space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">استعلام المرضى</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input 
              placeholder="أدخل كود المريض..." 
              value={patientCode} 
              onChange={(e) => setPatientCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch}><Search className="ml-2" /> بحث</Button>
          </CardContent>
        </Card>
      </div>
    </AccountingShell>
  );
}
