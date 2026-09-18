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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { evaluateRefractiveSafety } from "../../../../shared/clinical-calculators";
import { Save } from "lucide-react";
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
  type ClinicalSourceAvailability,
} from "./clinicalDecisionData";

const isLaser = (procedure: Procedure) => !["IOL", "ICL"].includes(procedure);

export function ClinicalDecisionSupport() {
  const [patientId, setPatientId] = useState<number>();
  const [patientName, setPatientName] = useState("Unregistered / Trial Patient");
  const [patientAge, setPatientAge] = useState<number>();
  const [trialMode, setTrialMode] = useState(true);
  const [eye, setEye] = useState<Eye>("od");
  const [procedure, setProcedure] = useState<Procedure>("PRK");
  const [plan, setPlan] = useState<Plan>(createInitialClinicalPlan);
  const [sourceAvailability, setSourceAvailability] =
    useState<ClinicalSourceAvailability>({
      od: { cct: false, refraction: false },
      os: { cct: false, refraction: false },
    });
  const [screening, setScreening] = useState({
    refractionStable: false,
    tomographyReviewedNormal: false,
    ocularSurfaceControlled: false,
  });
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
    setSourceAvailability(loaded.sourceAvailability);
  }, [entryQuery.data, patientId]);

  const selected = plan[eye];
  const result = useMemo(
    () =>
      isLaser(procedure)
        ? evaluateRefractiveSafety({
            procedure: procedure as "PRK" | "LASIK" | "FS" | "FL",
            cctUm: selected.cct,
            flapUm: selected.flap,
            sphereD: selected.sphere,
            cylinderD: selected.cylinder,
            opticalZoneMm: selected.opticalZone,
            screening: {
              ageYears: patientAge,
              refractionStable: screening.refractionStable || undefined,
              tomographyReviewedNormal:
                screening.tomographyReviewedNormal || undefined,
              ocularSurfaceControlled:
                screening.ocularSurfaceControlled || undefined,
              measurementsAvailable:
                sourceAvailability[eye].cct &&
                sourceAvailability[eye].refraction,
            },
          })
        : null,
    [eye, patientAge, procedure, screening, selected, sourceAvailability],
  );
  const updateEye = (key: keyof EyePlan, value: number) => {
    setPlan((previous) => ({
      ...previous,
      [eye]: { ...previous[eye], [key]: value },
    }));
    if (key === "cct") {
      setSourceAvailability((previous) => ({
        ...previous,
        [eye]: { ...previous[eye], cct: true },
      }));
    } else if (key === "sphere" || key === "cylinder") {
      setSourceAvailability((previous) => ({
        ...previous,
        [eye]: { ...previous[eye], refraction: true },
      }));
    }
  };
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
          sourceAvailability,
          updatedAt: new Date().toISOString(),
          screening,
        },
      }),
    });

  return (
    <section dir="ltr" lang="en" className="space-y-4 text-left">
      {patientId && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saveMutation.isPending}>
            <Save aria-hidden="true" />
            {saveMutation.isPending ? "Saving..." : "Save to Patient Record"}
          </Button>
        </div>
      )}
      <div className="flex flex-nowrap items-start gap-3">
          <div className="w-64 space-y-1.5">
            <PatientPicker
              locale="en"
              label="Patient Search (optional)"
              placeholder="Search by patient name, code, or phone..."
              onSelect={(patient) => {
                setTrialMode(false);
                setPatientId(patient.id);
                setPatientName(patient.fullName);
                const dateOfBirth = patient.dateOfBirth
                  ? new Date(patient.dateOfBirth)
                  : null;
                const calculatedAge =
                  dateOfBirth && !Number.isNaN(dateOfBirth.getTime())
                    ? Math.floor(
                        (Date.now() - dateOfBirth.getTime()) / 31_556_952_000,
                      )
                    : undefined;
                setPatientAge(patient.age ?? calculatedAge);
                setPlan(createInitialClinicalPlan());
                setSourceAvailability({
                  od: { cct: false, refraction: false },
                  os: { cct: false, refraction: false },
                });
                setScreening({
                  refractionStable: false,
                  tomographyReviewedNormal: false,
                  ocularSurfaceControlled: false,
                });
              }}
            />
          </div>
          <div className="w-44 space-y-1.5">
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
          <div className="w-40 space-y-1.5">
            <Label>Eye</Label>
            <Tabs value={eye} onValueChange={(value) => setEye(value as Eye)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="od">OD</TabsTrigger>
                <TabsTrigger value="os">OS</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
      </div>
      <>
          <Card className="p-2.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">
                Screening:
              </span>
              {(
                [
                  ["refractionStable", "Refraction stable"],
                  ["tomographyReviewedNormal", "Tomography normal"],
                  ["ocularSurfaceControlled", "Ocular surface reviewed"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Checkbox
                    checked={screening[key]}
                    onCheckedChange={(checked) =>
                      setScreening((previous) => ({
                        ...previous,
                        [key]: checked === true,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
              <span className="text-xs text-muted-foreground">
                Age: {patientAge ?? "N/A"}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {eye.toUpperCase()} CCT:{" "}
                {sourceAvailability[eye].cct ? "Loaded" : "Missing"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {eye.toUpperCase()} Refraction:{" "}
                {sourceAvailability[eye].refraction ? "Loaded" : "Missing"}
              </Badge>
            </div>
          </Card>
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
                    [
                      "flap",
                      procedure === "FS" ? "Cap Thickness" : "Flap Thickness",
                      "µm",
                      0,
                      180,
                    ],
                    ["sphere", "Sphere", "D", 0, 20],
                    ["cylinder", "Cylinder", "D", 0, 10],
                    ["opticalZone", "Optical Zone", "mm", 5, 8],
                  ] as const
                ).map(([key, label, unit, min, max]) => (
                  <div key={key} className="space-y-1.5">
                    <Label dir="auto" htmlFor={`clinical-${key}`}>
                      {label} ({unit})
                    </Label>
                    <Input
                      id={`clinical-${key}`}
                      type="number"
                      min={min}
                      max={max}
                      step={
                        key === "opticalZone"
                          ? 0.1
                          : key === "sphere" || key === "cylinder"
                            ? 0.25
                            : 1
                      }
                      value={selected[key] === 0 ? "" : selected[key]}
                      placeholder={`Enter ${unit}`}
                      onChange={(event) => {
                        if (event.target.value === "") {
                          updateEye(key, 0);
                          return;
                        }
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) {
                          updateEye(key, Math.abs(value));
                        }
                      }}
                    />
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
                        {procedure === "FS" ? "Lenticule Thickness" : "Ablation Depth"}
                      </span>
                      <strong className="font-mono">
                        {result.ablationDepthUm === null
                          ? "N/A"
                          : `${result.ablationDepthUm} µm`}
                      </strong>
                    </Card>
                    <Card className="p-3">
                      <span className="block text-[10px] text-muted-foreground">
                        Residual Stromal Bed (RSB)
                      </span>
                      <strong className="font-mono">
                        {result.residualBedUm === null
                          ? "N/A"
                          : `${result.residualBedUm} µm`}
                      </strong>
                    </Card>
                    <Card className="p-3">
                      <span className="block text-[10px] text-muted-foreground">
                        Percent Tissue Altered (PTA)
                      </span>
                      <strong className="font-mono">
                        {result.ptaPercent === null
                          ? "Not applicable"
                          : `${result.ptaPercent}%`}
                      </strong>
                    </Card>
                  </div>
                  <Card className="p-4">
                    <p className="text-sm font-semibold">
                      {eye.toUpperCase()} Calculation Result
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {result.statusTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Decision-support guidance only; it does not replace the
                      surgeon&apos;s assessment or corneal diagnostics.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline">
                        Ablation {result.ablationDepthUm ?? "N/A"}
                        {result.ablationDepthUm === null ? "" : " µm"}
                      </Badge>
                      <Badge variant="outline">
                        RSB {result.residualBedUm ?? "N/A"}
                        {result.residualBedUm === null ? "" : " µm"}
                      </Badge>
                      <Badge
                        variant={
                          result.riskLevel === "high_risk"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        PTA{" "}
                        {result.ptaPercent === null
                          ? "N/A"
                          : `${result.ptaPercent}%`}
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
                        Ablation: {result.ablationDepthUm ?? "N/A"}
                        {result.ablationDepthUm === null ? "" : " µm"}
                      </text>
                      <text
                        x="200"
                        y="98"
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="10"
                      >
                        RSB: {result.residualBedUm ?? "N/A"}
                        {result.residualBedUm === null ? "" : " µm"}
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
    </section>
  );
}
