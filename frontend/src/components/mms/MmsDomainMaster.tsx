import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, SwitchTabs } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

type Mode = "add" | "search";

interface DomainRow {
  id: string;
  domain_name: string;
  code_value: string;
  label_name: string;
  label_short?: string | null;
  disp_order?: string | null;
  module?: string | null;
}

const emptyAdd = {
  domainName: "",
  codeValue: "",
  labelName: "",
  labelShort: "",
  dispOrder: "",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function MmsDomainMaster() {
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<DomainRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tableQuery, setTableQuery] = useState("");

  const [addForm, setAddForm] = useState(emptyAdd);
  const [searchDomain, setSearchDomain] = useState("");

  const filtered = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    if (!q) return results;
    return results.filter((r) =>
      [r.domain_name, r.code_value, r.label_name, r.label_short, r.disp_order]
        .filter((v) => v != null && String(v).length > 0)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [results, tableQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [tableQuery, results, pageSize]);

  const refreshDomains = () => {
    void api<string[]>("/admin/mms-domain-master/domains")
      .then(setDomains)
      .catch(() => undefined);
  };

  useEffect(() => {
    refreshDomains();
  }, []);

  // Domain Name typeahead while adding
  useEffect(() => {
    if (mode !== "add") return;
    const q = addForm.domainName.trim();
    if (q.length < 1) {
      setDomainSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<string[]>(
        `/admin/mms-domain-master/suggest-domains?q=${encodeURIComponent(q)}`,
      )
        .then((rows) => {
          const upper = q.toUpperCase();
          setDomainSuggestions(
            rows.filter((d) => d.toUpperCase() !== upper).slice(0, 50),
          );
        })
        .catch(() => {
          const upper = q.toUpperCase();
          setDomainSuggestions(
            domains
              .filter((d) => d.toUpperCase().includes(upper) && d.toUpperCase() !== upper)
              .slice(0, 50),
          );
        });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [addForm.domainName, mode, domains]);

  const handleSubmit = async () => {
    if (!addForm.domainName.trim() || !addForm.codeValue.trim() || !addForm.labelName.trim()) {
      toast.error("Domain Name, Code Value and Label Name are required");
      return;
    }
    setBusy(true);
    try {
      await api<DomainRow>("/admin/mms-domain-master/", {
        method: "POST",
        body: JSON.stringify({
          domain_name: addForm.domainName.trim(),
          code_value: addForm.codeValue.trim(),
          label_name: addForm.labelName.trim(),
          label_short: addForm.labelShort.trim() || null,
          disp_order: addForm.dispOrder.trim() || null,
          module: "MMS",
        }),
      });
      toast.success("Saved to MMS_DOMAIN_VALUES");
      setAddForm(emptyAdd);
      setDomainSuggestions([]);
      refreshDomains();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = async () => {
    setBusy(true);
    try {
      const q = searchDomain
        ? `?domain_name=${encodeURIComponent(searchDomain)}`
        : "";
      const rows = await api<DomainRow[]>(`/admin/mms-domain-master/search${q}`);
      setResults(rows);
      setSearched(true);
      setTableQuery("");
      setPage(1);
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
      setSearched(true);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormPanel
      title="MMS Domain Master"
      fill={mode === "search"}
      tabs={
        <SwitchTabs<Mode>
          tabs={[
            { id: "add", label: "Add" },
            { id: "search", label: "Search" },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === "search") refreshDomains();
          }}
        />
      }
    >
      {mode === "add" ? (
        <div className="w-full space-y-3 overflow-visible px-2 pt-2 sm:px-4">
          <FormRow label="Domain Name" required className="sm:grid-cols-[140px_minmax(0,1fr)]">
            <SuggestInput
              value={addForm.domainName}
              placeholder="Please Enter Domain Name..."
              suggestions={domainSuggestions}
              onChange={(v) => setAddForm({ ...addForm, domainName: v })}
              onPick={(idx) => {
                setAddForm({ ...addForm, domainName: domainSuggestions[idx] ?? "" });
                setDomainSuggestions([]);
              }}
            />
          </FormRow>
          <FormRow label="Code Value" required className="sm:grid-cols-[140px_minmax(0,1fr)]">
            <Input
              placeholder="Please Enter Code Value..."
              value={addForm.codeValue}
              onChange={(e) => setAddForm({ ...addForm, codeValue: e.target.value })}
            />
          </FormRow>
          <FormRow label="Label Name" required className="sm:grid-cols-[140px_minmax(0,1fr)]">
            <Input
              placeholder="Please Enter Label Name..."
              value={addForm.labelName}
              onChange={(e) => setAddForm({ ...addForm, labelName: e.target.value })}
            />
          </FormRow>
          <FormRow label="Label Short" className="sm:grid-cols-[140px_minmax(0,1fr)]">
            <Input
              placeholder="Please Enter Label Short..."
              value={addForm.labelShort}
              maxLength={10}
              onChange={(e) => setAddForm({ ...addForm, labelShort: e.target.value })}
            />
          </FormRow>
          <FormRow label="Display Order" className="sm:grid-cols-[140px_minmax(0,1fr)]">
            <Input
              placeholder="Please Enter Display Order..."
              value={addForm.dispOrder}
              onChange={(e) => setAddForm({ ...addForm, dispOrder: e.target.value })}
            />
          </FormRow>

          <div className="flex flex-wrap justify-center gap-2 pt-4 pb-1">
            <Button
              disabled={busy}
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => void handleSubmit()}
            >
              {busy ? "Saving…" : "Submit"}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                setAddForm(emptyAdd);
                setDomainSuggestions([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-3 px-2 pt-2 sm:px-4">
          <div className="w-full shrink-0">
            <FormRow label="Domain Name" className="sm:grid-cols-[140px_minmax(0,1fr)]">
              <Select
                value={searchDomain || "__all__"}
                onValueChange={(v) => setSearchDomain(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- ALL --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">-- ALL --</SelectItem>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          <div className="flex shrink-0 flex-wrap justify-center gap-2">
            <Button
              disabled={busy}
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => void handleSearch()}
            >
              {busy ? "Searching…" : "Search"}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                setSearchDomain("");
                setResults([]);
                setSearched(false);
                setTableQuery("");
                setPage(1);
              }}
            >
              Cancel
            </Button>
          </div>

          {searched && (
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-md border border-border">
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-b border-border bg-secondary/60 px-3 py-1.5 text-[12px]">
                <div className="flex items-center gap-1.5">
                  Show{" "}
                  <select
                    className="rounded border border-border bg-white px-1.5 py-0.5 text-[12px]"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>{" "}
                  entries
                </div>
                <div className="flex items-center gap-1.5">
                  Search:{" "}
                  <Input
                    className="h-6 w-40 border-border bg-white"
                    value={tableQuery}
                    onChange={(e) => setTableQuery(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                style={{ maxHeight: "calc(100vh - 360px)" }}
              >
                <table className="w-full caption-bottom border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-primary">
                      {[
                        "Domain",
                        "Code Value",
                        "Label Name",
                        "Label Short",
                        "Display Order",
                      ].map((h) => (
                        <th
                          key={h}
                          className="h-8 px-2 py-0 text-left text-[12px] font-semibold text-primary-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          No data available in table
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((r) => (
                        <tr key={r.id} className="border-b border-border">
                          <td className="px-2 py-1.5 align-middle">{r.domain_name}</td>
                          <td className="px-2 py-1.5 align-middle">{r.code_value}</td>
                          <td className="px-2 py-1.5 align-middle">{r.label_name}</td>
                          <td className="px-2 py-1.5 align-middle">{r.label_short}</td>
                          <td className="px-2 py-1.5 align-middle">{r.disp_order}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1 text-[12px] text-muted-foreground">
                <div>
                  Showing {pageStart} to {pageEnd} of {filtered.length} entries
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[12px]"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => {
                      if (totalPages <= 7) return true;
                      if (n === 1 || n === totalPages) return true;
                      return Math.abs(n - currentPage) <= 1;
                    })
                    .reduce<number[]>((acc, n, idx, arr) => {
                      if (idx > 0 && n - arr[idx - 1]! > 1) acc.push(-n);
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n) =>
                      n < 0 ? (
                        <span key={`e${n}`} className="px-1">
                          …
                        </span>
                      ) : (
                        <Button
                          key={n}
                          type="button"
                          variant={n === currentPage ? "default" : "outline"}
                          size="sm"
                          className="h-7 min-w-7 px-2 text-[12px]"
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </Button>
                      ),
                    )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[12px]"
                    disabled={currentPage >= totalPages || filtered.length === 0}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </FormPanel>
  );
}

function SuggestInput({
  value,
  placeholder,
  disabled,
  suggestions,
  onChange,
  onPick,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  suggestions: string[];
  onChange: (v: string) => void;
  onPick: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<number | null>(null);

  const updateCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) {
      setCoords(null);
      return;
    }
    updateCoords();
    const onScroll = () => updateCoords();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, suggestions]);

  const showList = open && suggestions.length > 0 && coords;

  return (
    <div className="relative overflow-visible">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          updateCoords();
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {showList &&
        createPortal(
          <ul
            className="z-[100] max-h-48 overflow-y-auto overscroll-contain rounded-md border border-border bg-background shadow-md"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
          >
            {suggestions.map((s, idx) => (
              <li key={`${s}-${idx}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (blurTimer.current) window.clearTimeout(blurTimer.current);
                    onPick(idx);
                    setOpen(false);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
