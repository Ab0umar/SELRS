import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar } from "lucide-react";

interface DemographicsProps {
  phone?: string;
  age?: string;
  gender?: string;
}

export const Demographics: React.FC<DemographicsProps> = ({
  phone,
  age,
  gender,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
      {phone && (
        <span className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          <span dir="auto">{phone}</span>
        </span>
      )}
      <span className="flex items-center gap-1.5" dir="auto">
        <Calendar className="h-3.5 w-3.5" />
        {age ? `${age} سنة` : "—"}
      </span>
      <span className="flex items-center gap-1.5" dir="auto">
        {gender || "—"}
      </span>
    </div>
  );
};
