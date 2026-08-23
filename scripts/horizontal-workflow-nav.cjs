const fs = require("fs");
const path = "client/src/pages/WorkflowPrototypeLive.tsx";
const source = fs.readFileSync(path, "utf8");
const startMarker = '        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">';
const endMarker = '        <main className="min-w-0 rounded-xl border border-slate-200 bg-[#f7f9fc] p-0">';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("Workspace navigation boundaries not found");
const replacement = String.raw`        <div className="flex flex-col gap-2 xl:flex-row xl:items-start">
          {renderLivePatientPicker()}
          <aside className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label="Toggle visit sections"
                title="Toggle visit sections"
              >
                {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5" dir="ltr">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeSection === tab.id;
                  return (
                    <div key={tab.id} className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant={active ? "default" : "ghost"}
                        className={\`\${sidebarOpen ? "gap-2 px-3" : "px-2"} h-8 shrink-0 \${active ? "bg-blue-900 text-white" : ""}\`}
                        onClick={() => {
                          setActiveSection(tab.id);
                          setEmbeddedSheetPath(null);
                        }}
                        title={tab.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {sidebarOpen ? <span className="whitespace-nowrap">{tab.label}</span> : null}
                      </Button>
                      {sidebarOpen && tab.optional ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeOptional(tab.id)}
                          aria-label={\`Remove \${tab.label}\`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {sidebarOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 shrink-0 gap-1 px-2 text-xs"
                  onClick={() => {
                    const next = workflowSectionMeta.find(
                      (item) => item.optional && !optionalSet.has(item.id),
                    );
                    if (next) addOptional(next.id);
                    else toast.info("كل الأقسام الاختيارية مضافة");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Section
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
`;
fs.writeFileSync(path, source.slice(0, start) + replacement + source.slice(end), "utf8");
console.log("Workflow navigation moved to horizontal top bar");
