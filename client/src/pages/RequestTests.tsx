import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";

interface TestItem {
  id: number;
  name: string;
  category: string;
  selected: boolean;
  notes: string;
  isCustom?: boolean;
}

export type RequestTestsProps = {
  hidePageChrome?: boolean;
  hubVisitDate?: string;
  embeddedInPatientHub?: boolean;
  patientHubReadOnly?: boolean;
  patientHubViewOnlyHint?: string;
};

export default function RequestTests({
  hidePageChrome,
  hubVisitDate,
  embeddedInPatientHub,
  patientHubReadOnly,
  patientHubViewOnlyHint = "العرض فقط داخل المركز",
}: RequestTestsProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/request-tests/:id");
  const [, hubParams] = useRoute("/patient-hub/request-tests/:id");
  const mergedParams = params ?? hubParams;
  const printMode = usePrintMode();
  const initialPatientId = mergedParams?.id ? Number(mergedParams.id) : 0;

  const isAdmin = user?.role === "admin";
  const isReadOnly = !isAdmin;
  const editingForbidden = isReadOnly || Boolean(patientHubReadOnly);

  const [patientId, setPatientId] = useState<number | null>(initialPatientId > 0 ? initialPatientId : null);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (hubVisitDate && /^\d{4}-\d{2}-\d{2}$/.test(hubVisitDate)) {
      setRequestDate(hubVisitDate);
    }
  }, [hubVisitDate]);

  const [selectedTests, setSelectedTests] = useState<TestItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "request-tests" },
    { enabled: Boolean(patientId) && !editingForbidden, refetchOnWindowFocus: false }
  );
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const patientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedDraftRef = useRef<string | null>(null);
  const hydratedPatientStateRef = useRef<number | null>(null);

  const readDraft = (keys: string[]) => {
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          if ((window as any).__selrsDraftDebug) {
            console.warn("[draft] read localStorage", key);
          }
          return raw;
        }
      } catch {
        // Ignore localStorage failures.
      }
      try {
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
          if ((window as any).__selrsDraftDebug) {
            console.warn("[draft] read sessionStorage", key);
          }
          return raw;
        }
      } catch {
        // Ignore sessionStorage failures.
      }
      try {
        const name = window.name || "";
        if (name.startsWith("selrs:")) {
          const parsed = JSON.parse(name.slice(6)) as Record<string, string>;
          if (parsed && parsed[key]) {
            if ((window as any).__selrsDraftDebug) {
              console.warn("[draft] read window.name", key);
            }
            return parsed[key];
          }
        }
      } catch {
        // Ignore window.name failures.
      }
    }
    return null;
  };

  const writeDraft = (key: string, draft: { updatedAt: string; data: any }) => {
    const raw = JSON.stringify(draft);
    try {
      window.localStorage.setItem(key, raw);
      if ((window as any).__selrsDraftDebug) {
        console.warn("[draft] wrote localStorage", key);
      }
      return true;
    } catch {
      // Ignore localStorage failures.
    }
    try {
      window.sessionStorage.setItem(key, raw);
      if ((window as any).__selrsDraftDebug) {
        console.warn("[draft] wrote sessionStorage", key);
      }
      return true;
    } catch {
      // Ignore sessionStorage failures.
    }
    try {
      const name = window.name || "";
      const parsed = name.startsWith("selrs:")
        ? (JSON.parse(name.slice(6)) as Record<string, string>)
        : {};
      parsed[key] = raw;
      window.name = `selrs:${JSON.stringify(parsed).slice(0, 150000)}`;
      if ((window as any).__selrsDraftDebug) {
        console.warn("[draft] wrote window.name", key);
      }
      return true;
    } catch {
      // Ignore window.name failures.
    }
    return false;
  };

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const createRequestMutation = trpc.medical.createTestRequest.useMutation({
    onSuccess: () => {
      toast.success("Test request saved successfully.");
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "Failed to save test request."));
    },
  });

  useEffect(() => {
    if (editingForbidden) return;
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let hadDark = false;
    const handleBeforePrint = () => {
      hadDark = root.classList.contains("dark") || body.classList.contains("dark");
      root.classList.remove("dark");
      body.classList.remove("dark");
    };
    const handleAfterPrint = () => {
      if (hadDark) {
        root.classList.add("dark");
        body.classList.add("dark");
      }
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    const fromRoute = Number(params?.id ?? 0);
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      setPatientId(fromRoute);
    }
  }, [params?.id]);

  useEffect(() => {
    hydratedPatientStateRef.current = null;
  }, [patientId]);

  useEffect(() => {
    const patient = patientQuery.data as any;
    if (!patient) return;
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setPatientCode(String(patient.patientCode ?? "").trim());
  }, [patientQuery.data]);

  useEffect(() => {
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === patientId) return;
    if (data.requestDate) setRequestDate(data.requestDate);
    if (data.generalNotes !== undefined) setGeneralNotes(data.generalNotes ?? "");
    if (Array.isArray(data.selectedTests)) setSelectedTests(data.selectedTests);
    hydratedPatientStateRef.current = patientId;
  }, [patientStateQuery.data, patientId]);

  useEffect(() => {
    const patientKey = patientId ? `selrs:patient-draft:request-tests:${patientId}` : null;
    const tempKey = "selrs:patient-draft:request-tests:temp";
    const keysToCheck = patientKey ? [patientKey, tempKey] : [tempKey];
    try {
      const raw = readDraft(keysToCheck);
      if (raw) {
        const key = keysToCheck.find((k) => raw && readDraft([k]) === raw) ?? keysToCheck[0];
        const parsed = JSON.parse(raw) as { updatedAt?: string; data?: any } | null;
        if (!parsed?.data) return;
        const draftUpdatedAt = Date.parse(parsed.updatedAt ?? "");
        const serverUpdatedAt = Date.parse((patientStateQuery.data as any)?.updatedAt ?? "");
        if (!Number.isFinite(draftUpdatedAt)) return;
        if (Number.isFinite(serverUpdatedAt) && draftUpdatedAt <= serverUpdatedAt) return;
        const signature = `${key}:${parsed.updatedAt ?? ""}`;
        if (lastAppliedDraftRef.current === signature) return;
        lastAppliedDraftRef.current = signature;
        if (parsed.data.requestDate) setRequestDate(parsed.data.requestDate);
        if (parsed.data.generalNotes !== undefined) setGeneralNotes(parsed.data.generalNotes ?? "");
        if (Array.isArray(parsed.data.selectedTests)) setSelectedTests(parsed.data.selectedTests);
        if (patientKey && key === tempKey) {
          writeDraft(patientKey, parsed as any);
          try {
            window.localStorage.removeItem(tempKey);
            window.sessionStorage.removeItem(tempKey);
          } catch {
            // Ignore storage failures.
          }
        }
        toast.info("تم استرجاع مسودة محفوظة تلقائياً");
      }
    } catch {
      // Ignore invalid local draft.
    }
  }, [patientId, patientStateQuery.data]);

  useEffect(() => {
    if (!patientId || editingForbidden) return;
    if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    const payload = {
      requestDate,
      generalNotes,
      selectedTests,
    };
    patientStateTimerRef.current = setTimeout(() => {
      savePatientStateMutation.mutate({ patientId, page: "request-tests", data: payload });
    }, 800);
    return () => {
      if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    };
  }, [patientId, editingForbidden, requestDate, generalNotes, selectedTests, savePatientStateMutation]);

  useEffect(() => {
    if (editingForbidden) return;
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    const payload = {
      requestDate,
      generalNotes,
      selectedTests,
    };
    localDraftTimerRef.current = setTimeout(() => {
      const key = patientId
        ? `selrs:patient-draft:request-tests:${patientId}`
        : "selrs:patient-draft:request-tests:temp";
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      writeDraft(key, draft);
    }, 400);
    return () => {
      if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    };
  }, [patientId, editingForbidden, requestDate, generalNotes, selectedTests]);

  useEffect(() => {
    if (editingForbidden) return;
    const persistNow = () => {
      const payload = {
        requestDate,
        generalNotes,
        selectedTests,
      };
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      const key = patientId
        ? `selrs:patient-draft:request-tests:${patientId}`
        : "selrs:patient-draft:request-tests:temp";
      writeDraft(key, draft);
    };
    const handleVisibility = () => {
      if (document.hidden) persistNow();
    };
    window.addEventListener("beforeunload", persistNow);
    window.addEventListener("pagehide", persistNow);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", persistNow);
      window.removeEventListener("pagehide", persistNow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [patientId, editingForbidden, requestDate, generalNotes, selectedTests]);

  if (!isAuthenticated) return null;

  const handleUpdateTestNotes = (testId: number, notes: string) => {
    if (editingForbidden) return;
    setSelectedTests(
      selectedTests.map((t) => (t.id === testId ? { ...t, notes } : t))
    );
  };

  const handleRemoveTest = (testId: number) => {
    if (editingForbidden) return;
    setSelectedTests(selectedTests.filter((t) => t.id !== testId));
    toast.success("Test removed from request.");
  };


  const handleSaveRequest = async () => {
    if (editingForbidden) {
      toast.error(patientHubReadOnly ? patientHubViewOnlyHint : "التعديل متاح للأدمن فقط.");
      return;
    }
    if (!patientId) {
      toast.error("Please select a patient first.");
      return;
    }
    if (selectedTests.length === 0) {
      toast.error("لا توجد فحوصات مسجّلة لحفظها.");
      return;
    }
    const validItems = selectedTests.filter((t) => t.id > 0);
    const skippedCount = selectedTests.length - validItems.length;
    if (validItems.length === 0) {
      toast.error("لا توجد معرّفات فحوصات صالحة للحفظ (يلزم وجود الرقم في النظام).");
      return;
    }
    if (skippedCount > 0) {
      toast.warning(`تم تجاهل ${skippedCount} فحص غير موجود بالنظام أثناء الحفظ.`);
    }
    await createRequestMutation.mutateAsync({
      patientId,
      date: requestDate,
      notes: generalNotes,
      items: validItems.map((t) => ({ testId: t.id, notes: t.notes })),
    });
  };

  const handlePrint = () => {
    void printOrExportPdf(`${String(patientName || patientId || "request-tests").trim()}.pdf`);
  };

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    age?: number | null;
  }) => {
    setPatientId(patient.id);
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setLocation(
      embeddedInPatientHub ? `/patient-hub/request-tests/${patient.id}` : `/request-tests/${patient.id}`,
    );
  };

  return (
    <div
      className={cn("prescription-root bg-background", hidePageChrome ? "min-h-0" : "min-h-screen")}
      dir="rtl"
      style={{ direction: "rtl" }}
    >
      {printMode.printView ? null : hidePageChrome ? null : <PageHeader backTo="/patients" />}

      <main
        data-mobile-pdf-root
        className={cn(
          "mx-auto print:p-0",
          hidePageChrome ? "max-w-none px-2 pb-4 pt-1" : "container max-w-[1280px]",
          printMode.printView ? "px-3 py-3" : hidePageChrome ? "" : "px-4 py-8",
        )}
      >
        {printMode.printView ? (
          <PrintPreviewBanner
            title="طباعة طلب التحاليل"
            subtitle={patientName || undefined}
            onPrint={handlePrint}
          />
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-[0.65fr_1.35fr] gap-6">
          <div className="space-y-6">
            <Card className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
              <CardHeader>
                <CardTitle>Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PatientPicker initialPatientId={patientId ?? undefined} onSelect={handleSelectPatient} />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input value={patientName} readOnly placeholder="Patient name" className="text-center" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Age</label>
                    <Input value={patientAge} readOnly placeholder="Age" className="text-center" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <div className="space-y-1">
                      <Input type="date" value={requestDate} readOnly={editingForbidden} onChange={(e) => setRequestDate(e.target.value)} />
                      <span className="text-[10px] text-muted-foreground">{formatDateLabel(requestDate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 request-tests-print-content">
            <div className="hidden print:block request-tests-print-header">
              <div className="pt-2 flex items-center justify-between gap-4 text-sm" dir="rtl">
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-medium">الاسم:</span> {patientName}
                </span>
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-medium">التاريخ:</span>{" "}
                  <span dir="ltr">{formatDateLabel(requestDate)}</span>
                </span>
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-medium">الكود:</span>{" "}
                  <span dir="ltr">{patientCode || (patientId != null ? String(patientId) : "")}</span>
                </span>
              </div>
            </div>

            <Card className="request-tests-print-list">
              <CardHeader className="print:hidden">
                <CardTitle>الفحوصات المسجّلة للمريض ({selectedTests.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTests.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">لا توجد فحوصات مسجّلة لهذا الطلب بعد.</p>
                ) : (
                  selectedTests.map((test, index) => (
                    <div key={test.id} className="border rounded-lg p-4 print:border-0 print:rounded-none print:p-2">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-bold">{index + 1}. {test.name}</p>
                        </div>
                        {editingForbidden ? null : (
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveTest(test.id)} className="print:hidden">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                      <div className="print:hidden">
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <Textarea
                          value={test.notes}
                          readOnly={editingForbidden}
                          onChange={(e) => handleUpdateTestNotes(test.id, e.target.value)}
                          placeholder="Notes for this test"
                          className="min-h-16 text-xs text-center"
                        />
                      </div>
                      {test.notes && (
                        <div className="hidden print:block text-sm mt-2">
                          <span className="font-medium">Notes:</span> {test.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
              <CardHeader>
                <CardTitle>General Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generalNotes}
                  readOnly={editingForbidden}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Additional notes"
                  className="min-h-24 text-center"
                />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className={`print:hidden mt-4 flex justify-end gap-2 ${printMode.printView ? "hidden" : ""}`}>
          {!editingForbidden ? (
          <Button
            variant="outline"
            onClick={handleSaveRequest}
            disabled={createRequestMutation.isPending}
            type="button"
          >
            <Save className="h-4 w-4 ml-2" />
            Save Request
          </Button>
          ) : patientHubReadOnly ? (
            <span className="self-center text-xs text-muted-foreground">{patientHubViewOnlyHint}</span>
          ) : null}
          <Button variant="outline" onClick={handlePrint} type="button">
            <Printer className="h-4 w-4 ml-2" />
            Print
          </Button>
        </div>
      </main>
        <style>{`
          @media print {
            .request-tests-root,
            .request-tests-root * {
              color: #000 !important;
              background: transparent !important;
              background-image: none !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
            }
            .request-tests-root {
              background: #fff !important;
              color-scheme: light !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .request-tests-root main,
            .request-tests-root [data-slot="card"],
            .request-tests-root .card {
              background: #fff !important;
            }
            @page {
              size: A5;
              margin: 10mm;
            }
          .request-tests-print-content {
            margin-top: 30mm !important;
          }
        }
      `}</style>
    </div>
  );
}



