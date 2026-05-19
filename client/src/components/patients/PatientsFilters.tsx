import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Upload } from "lucide-react";
import { highlightSearchMatch } from "@/lib/patientsHelpers";

interface PatientsFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (val: boolean) => void;
  activeSuggestionIndex: number;
  setActiveSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  groupedSearchSuggestions: any[];
  flatSearchSuggestions: any[];
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  isAdmin: boolean;
  importDateFormat: string;
  setImportDateFormat: (val: any) => void;
  handleImportPatients: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSuggestionSelect: (id: number) => void;
}

export const PatientsFilters: React.FC<PatientsFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  isSearchFocused,
  setIsSearchFocused,
  activeSuggestionIndex,
  setActiveSuggestionIndex,
  groupedSearchSuggestions,
  flatSearchSuggestions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  isAdmin,
  importDateFormat,
  setImportDateFormat,
  handleImportPatients,
  fileInputRef,
  onSuggestionSelect,
}) => {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
          <div className="relative w-full sm:w-[340px] md:w-[520px]">
            <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو الكود أو الموبايل أو الدكتور أو الخدمة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                setIsSearchFocused(true);
                setActiveSuggestionIndex(-1);
              }}
              onBlur={() => {
                window.setTimeout(() => setIsSearchFocused(false), 120);
              }}
              onKeyDown={(event) => {
                if (!groupedSearchSuggestions.length) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setIsSearchFocused(true);
                      setActiveSuggestionIndex((prev) =>
                        prev >= flatSearchSuggestions.length - 1 ? 0 : prev + 1
                      );

                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setIsSearchFocused(true);
                  setActiveSuggestionIndex((prev) =>
                    prev <= 0 ? flatSearchSuggestions.length - 1 : prev - 1
                  );
                  return;
                }
                if (event.key === "Enter" && activeSuggestionIndex >= 0) {
                  event.preventDefault();
                  const suggestion = flatSearchSuggestions[activeSuggestionIndex];
                  if (!suggestion) return;
                  setSearchTerm(suggestion.fullName || suggestion.patientCode);
                  setIsSearchFocused(false);
                  onSuggestionSelect(suggestion.id);
                  return;
                }
                if (event.key === "Escape") {
                  setIsSearchFocused(false);
                  setActiveSuggestionIndex(-1);
                }
              }}
              role="combobox"
              aria-expanded={isSearchFocused && groupedSearchSuggestions.length > 0}
              aria-autocomplete="list"
              aria-controls="patient-search-listbox"
              aria-activedescendant={activeSuggestionIndex >= 0 ? `suggestion-${activeSuggestionIndex}` : undefined}
              className="h-11 rounded-xl border-border bg-background pr-10 text-right"
              dir="rtl"
            />
            {isSearchFocused && groupedSearchSuggestions.length > 0 ? (
              <div id="patient-search-listbox" role="listbox" className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border bg-popover shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <div className="border-b border-border px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  اقتراحات سريعة
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {(() => {
                    let runningIndex = -1;
                    return groupedSearchSuggestions.map((group) => (
                      <div key={group.key}>
                        <div className="bg-muted/50 px-4 py-2 text-right text-[11px] font-bold text-muted-foreground">
                          {group.label}
                        </div>
                        {group.items.map((suggestion: any) => {
                          runningIndex += 1;
                          const isActive = activeSuggestionIndex === runningIndex;
                          return (
                            <div
                              key={`${group.key}-${suggestion.id}`}
                              id={`suggestion-${runningIndex}`}
                              role="option"
                              aria-selected={isActive}
                              className={`flex w-full items-start justify-between gap-3 border-b border-border/60 px-4 py-3 text-right transition last:border-b-0 cursor-pointer ${
                                isActive ? "bg-primary/10" : "hover:bg-accent"
                              }`}
                              onMouseEnter={() => setActiveSuggestionIndex(runningIndex)}
                                   onClick={() => {
                                     setSearchTerm(suggestion.fullName || suggestion.patientCode);
                                     setIsSearchFocused(false);
                                     setActiveSuggestionIndex(-1);
                                     onSuggestionSelect(suggestion.id);
                                   }}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-foreground">
                                  {highlightSearchMatch(suggestion.fullName || "بدون اسم", searchTerm)}
                                </div>
                                <div className="mt-1 truncate text-xs text-muted-foreground">
                                  {highlightSearchMatch(suggestion.treatingDoctor || "بدون دكتور", searchTerm)}
                                  {suggestion.serviceLabel ? <> - {highlightSearchMatch(suggestion.serviceLabel, searchTerm)}</> : ""}
                                </div>
                              </div>
                              <div className="shrink-0 text-left text-xs text-muted-foreground" dir="ltr">
                                <div>{highlightSearchMatch(suggestion.patientCode || "-", searchTerm)}</div>
                                <div>{highlightSearchMatch(suggestion.phone || "-", searchTerm)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">من تاريخ</span>
            <Input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onBlur={(e) => setDateFrom(e.target.value)}
              className="w-[140px] rounded-xl border-border bg-background sm:w-[150px]"
              placeholder="DD/MM/YYYY"
              dir="ltr"
            />
            <span className="text-sm text-muted-foreground">إلى تاريخ</span>
            <Input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onBlur={(e) => setDateTo(e.target.value)}
              className="w-[140px] rounded-xl border-border bg-background sm:w-[150px]"
              placeholder="DD/MM/YYYY"
              dir="ltr"
            />
          </div>
          {isAdmin && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportPatients}
              />
              <Select value={importDateFormat} onValueChange={(v) => setImportDateFormat(v as any)}>
                <SelectTrigger className="w-full rounded-xl border-border bg-background sm:w-[210px]">
                  <SelectValue placeholder="Excel Date Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DMY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MDY">MM/DD/YYYY</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full gap-2 rounded-xl whitespace-normal text-xs sm:w-auto sm:text-sm"
              >
                <Upload className="h-4 w-4" />
                استيراد من Excel
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
