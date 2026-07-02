import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import PatientPicker from "@/components/PatientPicker";
import PentacamFilesPanel from "@/components/PentacamFilesPanel";
import { FilterBar } from "@/components/shared/FilterBar";
import {
  ArrowRight,
  BookOpenText,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  FolderCog,
  User,
  Phone,
  MapPin,
  Calendar,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME_EN } from "@/lib/brand";

type PatientSummary = {
  id: number;
  fullName: string;
  patientCode?: string | null;
  locationType?: "center" | "external" | null;
  phone?: string | null;
  age?: number | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
};

const locationFilters = [
  { value: "all", label: "All / الكل" },
  { value: "center", label: "Center / المركز" },
  { value: "external", label: "External / الخارجي" },
] as const;

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function EmptyPanel() {
  return (
    <div className="flex h-full min-h-[28rem] items-center justify-center rounded-2xl border-2 border-dashed border-[#c3c6d6] bg-[#f8f9fb] px-8 py-12 text-center">
      <div className="max-w-xs space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#003d9b] text-white shadow-lg">
          <Search className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-[#191c1e]">Search by Patient Code</p>
          <p className="text-sm text-[#737685] leading-relaxed">
            Enter a patient code or name to view and review associated Pentacam JPG images.
          </p>
        </div>
        <div className="text-xs text-[#434654] bg-[#e7e8ea] rounded-lg px-4 py-2">
          ابحث برمز المريض لعرض صور JPG
        </div>
      </div>
    </div>
  );
}

function PatientInfoCard({
  patient,
  onAdminClick,
  isAdmin,
}: {
  patient: PatientSummary;
  onAdminClick: () => void;
  isAdmin: boolean;
}) {
  const fields = [
    { icon: Hash, label: "Patient Code", value: patient.patientCode ?? `#${patient.id}` },
    { icon: Calendar, label: "Age", value: patient.age ? `${patient.age} years` : "—" },
    { icon: Phone, label: "Phone", value: patient.phone ?? "—" },
    { icon: Calendar, label: "Date of Birth", value: formatDate(patient.dateOfBirth) },
    { icon: MapPin, label: "Address", value: patient.address ?? "—" },
  ];

  return (
    <div className="rounded-xl border border-[#c3c6d6] bg-white shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="bg-[#003d9b] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">{patient.fullName}</div>
            <div className="text-white/70 text-xs">{patient.patientCode ?? `ID: ${patient.id}`}</div>
          </div>
        </div>
        {isAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20"
            onClick={onAdminClick}
          >
            <FolderCog className="ml-1 h-3.5 w-3.5" />
            Admin Link
          </Button>
        )}
      </div>
      {/* Card Body */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2 p-2 rounded-lg bg-[#f8f9fb] border border-[#e7e8ea]">
            <Icon className="h-3.5 w-3.5 text-[#003d9b] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#737685]">{label}</div>
              <div className="text-xs font-medium text-[#191c1e] mt-0.5">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PentacamSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [locationType, setLocationType] = useState<"all" | "center" | "external">("all");
  const selectedPatientId = selectedPatient?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const handleSelectPatient = (patient: PatientSummary) => {
    if (locationType !== "all" && patient.locationType && patient.locationType !== locationType) return;
    setSelectedPatient(patient);
    setLocation(`/sheets/pentacam/${patient.id}`);
  };

  useEffect(() => {
    if (!selectedPatient) return;
    if (locationType === "all") return;
    if (selectedPatient.locationType === locationType) return;
    setSelectedPatient(null);
  }, [locationType, selectedPatient]);

  if (!isAuthenticated) return null;

  return (
    <div dir="ltr" className="min-h-screen bg-[#F8F9FB] text-[#191c1e]">

      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#c3c6d6] shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => goBack()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#434654] hover:text-[#003d9b] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-[#c3c6d6]" />
          <span className="text-lg font-bold text-[#003d9b]">{BRAND_NAME_EN}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            JPG Viewer Only
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── PAGE TITLE ── */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#003d9b]/30 bg-[#003d9b] px-3 py-1 text-xs font-semibold text-white mb-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Pentacam Image Viewer
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#191c1e]">
              Pentacam <span className="text-[#003d9b]">البنتاكام</span>
            </h1>
            <p className="text-sm text-[#737685] mt-1">
              Search for a patient to view and review their associated Pentacam JPG images.
            </p>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-6">

          {/* ── LEFT SIDEBAR: SEARCH + PATIENT INFO ── */}
          <aside className="space-y-4">
            {/* Search Card */}
            <div className="bg-white rounded-2xl border border-[#c3c6d6] shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#e7e8ea]">
                <Search className="h-4 w-4 text-[#003d9b]" />
                <span className="text-sm font-bold text-[#191c1e]">Patient Search</span>
              </div>

              {/* Location Filter */}
              <div>
                <p className="text-xs font-semibold text-[#434654] uppercase tracking-wide mb-2">Filter by Location</p>
                <FilterBar
                  filters={locationFilters.map((item) => ({ value: item.value, label: item.label }))}
                  selected={locationType}
                  onSelect={(value) => setLocationType(value as typeof locationType)}
                  className="w-full flex-wrap"
                />
              </div>

              {/* Patient Picker */}
              <div>
                <p className="text-xs font-semibold text-[#434654] uppercase tracking-wide mb-2">Search Patient</p>
                <PatientPicker
                  initialPatientId={selectedPatientId ?? initialPatientId}
                  onSelect={handleSelectPatient}
                  placeholder="Search by code or name..."
                  wrapperClassName="max-w-none ml-0"
                  locationType={locationType === "all" ? undefined : locationType}
                  allowPatient={(patient) =>
                    locationType === "all" ||
                    patient.locationType === locationType ||
                    !patient.locationType ||
                    (initialPatientId != null && patient.id === initialPatientId)
                  }
                />
              </div>
            </div>

            {/* Patient Info Card */}
            {selectedPatient && (
              <PatientInfoCard
                patient={selectedPatient}
                isAdmin={user?.role === "admin"}
                onAdminClick={() => setLocation(`/admin/pentacam/${selectedPatientId}`)}
              />
            )}

            {/* Help hint */}
            {!selectedPatient && (
              <div className="rounded-xl border border-[#c3c6d6] bg-white p-4 text-center">
                <BookOpenText className="h-8 w-8 text-[#003d9b] mx-auto mb-2 opacity-60" />
                <p className="text-xs text-[#737685]">
                  Select a patient to view their Pentacam images and corneal analysis data.
                </p>
              </div>
            )}
          </aside>

          {/* ── RIGHT: IMAGE VIEWER ── */}
          <div className="min-h-[28rem]">
            {selectedPatientId ? (
              <div className="bg-white rounded-2xl border border-[#c3c6d6] shadow-sm overflow-hidden">
                <div className="bg-[#003d9b] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-white" />
                    <span className="text-sm font-bold text-white">Pentacam Images</span>
                    <span className="text-white/70 text-xs">— {selectedPatient?.fullName}</span>
                  </div>
                  <span className="text-[10px] text-white/60 uppercase tracking-widest">JPG Viewer</span>
                </div>
                <div className="p-4">
                  <PentacamFilesPanel patientId={selectedPatientId} active />
                </div>
              </div>
            ) : (
              <EmptyPanel />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
