import { useEffect, useMemo, useState } from "react";
import PatientPicker from "@/components/PatientPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { evaluateRefractiveSafety } from "../../../../shared/clinical-calculators";
import { Eye as EyeIcon, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  applyProcedureToEyePlan,
  buildClinicalPlanFromSheetEntry,
  createInitialClinicalPlan,
  type ClinicalEye as Eye,
  type ClinicalEyePlan as EyePlan,
  type ClinicalPlan as Plan,
  type ClinicalProcedure as Procedure,
} from "./clinicalDecisionData";

const isLaser = (procedure: Procedure) => !["IOL", "ICL"].includes(procedure);

export function ClinicalDecisionSupport() {
  const [patientId, setPatientId] = useState<number>();
  const [patientName, setPatientName] = useState("");
  const [eye, setEye] = useState<Eye>("od");
  const [procedure, setProcedure] = useState<Procedure>("FS");
  const [plan, setPlan] = useState<Plan>(createInitialClinicalPlan);
  const entryQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: patientId ?? 0, sheetType: "clinical" },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false },
  );
  const saveMutation = trpc.medical.saveSheetEntry.useMutation({
    onSuccess: () => {
      toast.success("Clinical decision plan saved to the patient record.");
      void entryQuery.refetch();
    },
    onError: (error) =>
      toast.error(
        error.message || "Unable to save the clinical decision plan.",
      ),
  });

  useEffect(() => {
    if (!patientId || !entryQuery.data) return;
    const loaded = buildClinicalPlanFromSheetEntry(entryQuery.data);
    setProcedure(loaded.procedure);
    setPlan(loaded.eyes);
  }, [entryQuery.data, patientId]);

  const selected = plan[eye];
  const result = useMemo(
    () =>
      isLaser(procedure)
        ? evaluateRefractiveSafety({
            cctUm: selected.cct,
            flapUm: selected.flap,
            sphereD: selected.sphere,
            cylinderD: selected.cylinder,
            opticalZoneMm: selected.opticalZone,
          })
        : null,
    [procedure, selected],
  );
  const updateEye = (key: keyof EyePlan, value: number) =>
    setPlan((previous) => ({
      ...previous,
      [eye]: { ...previous[eye], [key]: value },
    }));
  const applyProcedure = (value: Procedure) => {
    setProcedure(value);
    setPlan((previous) => ({
      ...previous,
      [eye]: applyProcedureToEyePlan(previous[eye], value),
    }));
  };
  const save = () =>
    patientId &&
    saveMutation.mutate({
      patientId,
      sheetType: "clinical",
      content: JSON.stringify({
        clinicalDecision: {
          procedure,
          eyes: plan,
          updatedAt: new Date().toISOString(),
        },
      }),
    });

  return (
    <section
      dir="ltr"
      lang="en"
      className="space-y-4 text-left"
      aria-labelledby="clinical-decision-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="clinical-decision-heading"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <EyeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            Clinical Decision Support
          </h2>
          <p className="text-xs text-muted-foreground">
            Select a patient and eye, review the measurements, then save the
            surgical plan to the patient record.
          </p>
        </div>
        {patientId && (
          <Button onClick={save} disabled={saveMutation.isPending}>
            <Save aria-hidden="true" />
            {saveMutation.isPending ? "Saving..." : "Save to Patient Record"}
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <PatientPicker
            locale="en"
            label="Patient Search"
            placeholder="Search by patient name, code, or phone..."
            onSelect={(patient) => {
              setPatientId(patient.id);
              setPatientName(patient.fullName);
              setPlan(createInitialClinicalPlan());
            }}
          />
          <div className="space-y-1.5">
            <Label htmlFor="clinical-eye">Eye</Label>
            <Select value={eye} onValueChange={(value) => setEye(value as Eye)}>
              <SelectTrigger id="clinical-eye">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="od">OD — Right Eye</SelectItem>
                <SelectItem value="os">OS — Left Eye</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clinical-procedure">Procedure Type</Label>
            <Select
              value={procedure}
              onValueChange={(value) => applyProcedure(value as Procedure)}
            >
              <SelectTrigger id="clinical-procedure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem dir="ltr" value="PRK">
                  PRK
                </SelectItem>
                <SelectItem dir="ltr" value="LASIK">
                  LASIK
                </SelectItem>
                <SelectItem dir="ltr" value="FS">
                  FS, Femto-Smile
                </SelectItem>
                <SelectItem dir="ltr" value="FL">
                  FL, Femto-LASIK
                </SelectItem>
                <SelectItem dir="ltr" value="IOL">
                  IOL
                </SelectItem>
                <SelectItem dir="ltr" value="ICL">
                  ICL
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {!patientId && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <UserRound className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
          Search for a patient to load recorded measurements and prepare a
          decision for each eye.
        </Card>
      )}
      {patientId && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader className="pb-2">
                <CardTitle dir="auto" className="text-sm">
                  {patientName}, {eye.toUpperCase()}, {procedure}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["cct", "Central Corneal Thickness (CCT)", "µm", 400, 700],
                    ["flap", "Flap Thickness", "µm", 0, 180],
                    ["sphere", "Sphere", "D", 0, 20],
                    ["cylinder", "Cylinder", "D", 0, 10],
                    ["opticalZone", "Optical Zone", "mm", 5, 8],
                  ] as const
                ).map(([key, label, unit, min, max]) => (
                  <div key={key} className="space-y-1.5">
                    <Label dir="auto" htmlFor={`clinical-${key}`}>
                      {label}
                    </Label>
                    <div className="space-y-2">
                      <Slider
                        id={`clinical-${key}`}
                        min={min}
                        max={max}
                        step={
                          key === "opticalZone"
                            ? 0.1
                            : key === "sphere" || key === "cylinder"
                              ? 0.25
                              : 1
                        }
                        value={[selected[key]]}
                        onValueChange={(values) => updateEye(key, values[0])}
                      />
                      <span className="font-mono text-sm font-bold text-foreground">
                        {selected[key]} {unit}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-4 lg:col-span-5">
              {result ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Card className="p-3">
                      <span className="block text-[10px] text-muted-foreground">
                        Ablation Depth
                      </span>
                      <strong className="font-mono">
                        {result.ablationDepthUm} µm
                      </strong>
                    </Card>
                    <Card className="p-3">
                      <span className="block text-[10px] text-muted-foreground">
                        Residual Stromal Bed (RSB)
                      </span>
                      <strong className="font-mono">
                        {result.residualBedUm} µm
                      </strong>
                    </Card>
                    <Card className="p-3">
                      <span className="block text-[10px] text-muted-foreground">
                        Percent Tissue Altered (PTA)
                      </span>
                      <strong className="font-mono">
                        {result.ptaPercent}%
                      </strong>
                    </Card>
                  </div>
                  <Card className="p-4">
                    <p className="text-sm font-semibold">
                      {eye.toUpperCase()} Calculation Result
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Decision-support guidance only; it does not replace the
                      surgeon&apos;s assessment or corneal diagnostics.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline">
                        Ablation {result.ablationDepthUm} µm
                      </Badge>
                      <Badge variant="outline">
                        RSB {result.residualBedUm} µm
                      </Badge>
                      <Badge
                        variant={
                          result.riskLevel === "safe"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        PTA {result.ptaPercent}%
                      </Badge>
                    </div>
                    <p dir="auto" className="mt-3 text-sm">
                      {result.recommendation}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <span className="mb-2 block text-[11px] text-muted-foreground">
                      Schematic Corneal Cross-Section
                    </span>
                    <svg
                      viewBox="0 0 400 120"
                      className="h-32 w-full"
                      aria-label="Schematic illustration of the corneal layers"
                    >
                      <path
                        d="M 20,20 Q 200,60 380,20 L 380,105 Q 200,115 20,105 Z"
                        fill="var(--primary)"
                        fillOpacity="0.15"
                        stroke="var(--border)"
                        strokeWidth="1.5"
                      />
                      {selected.flap > 0 && (
                        <path
                          d="M 40,32 Q 200,68 360,32"
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                      )}
                      <text
                        x="200"
                        y="58"
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="10"
                      >
                        Ablation: {result.ablationDepthUm} µm
                      </text>
                      <text
                        x="200"
                        y="98"
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="10"
                      >
                        RSB: {result.residualBedUm} µm
                      </text>
                    </svg>
                  </Card>
                </>
              ) : (
                <Card className="p-4 text-sm text-muted-foreground">
                  RSB and PTA calculations do not apply to IOL or ICL. Values
                  may be documented for clinical review only.
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
