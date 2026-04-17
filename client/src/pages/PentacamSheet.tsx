import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import PatientPicker from "@/components/PatientPicker";
import LocalPentacamExportsPanel from "@/components/LocalPentacamExportsPanel";
import PentacamFilesPanel from "@/components/PentacamFilesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight } from "lucide-react";

export default function PentacamSheet() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(initialPatientId ?? null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleSelectPatient = (patient: { id: number; fullName: string; patientCode?: string | null }) => {
    setSelectedPatientId(patient.id);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => goBack()}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">البنتاكام</h1>
            <p className="text-slate-600 mt-1">عرض وإدارة ملفات البنتاكام</p>
          </div>
        </div>

        {/* Patient Picker */}
        <div className="mb-8">
          <PatientPicker
            initialPatientId={selectedPatientId ?? initialPatientId}
            onSelect={handleSelectPatient}
          />
        </div>

        {/* Pentacam Files Tabs */}
        {(selectedPatientId || initialPatientId) ? (
          <Tabs defaultValue="local" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local">Local Import</TabsTrigger>
              <TabsTrigger value="database">Database Files</TabsTrigger>
            </TabsList>

            <TabsContent value="local" className="mt-6">
              <LocalPentacamExportsPanel
                patientId={selectedPatientId || initialPatientId}
                active={true}
              />
            </TabsContent>

            <TabsContent value="database" className="mt-6">
              <PentacamFilesPanel
                patientId={selectedPatientId || initialPatientId}
                active={true}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-slate-500">
              <p className="text-lg font-medium mb-2">اختر مريضاً للبدء</p>
              <p className="text-sm">استخدم منتقي المرضى أعلاه لتحميل ملفات البنتاكام</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
