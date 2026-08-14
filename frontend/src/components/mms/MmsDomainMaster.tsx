import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import { FormPanel, FormRow, FormGrid, SwitchTabs } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  id: number | string;
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

const sanitizeText = (val: string) => val.replace(/[^a-zA-Z0-9\s\-/&]/g, "");
const sanitizeOrder = (val: string) => val.replace(/[^0-9]/g, "");

function rowToForm(row: DomainRow) {
  return {
    domainName: row.domain_name ?? "",
    codeValue: row.code_value ?? "",
    labelName: row.label_name ?? "",
    labelShort: row.label_short ?? "",
    dispOrder: row.disp_order ?? "",
  };
}

/** Within one domain, code/label/short/display order must each be unique. */
function uniquenessError(
  form: typeof emptyAdd,
  siblings: DomainRow[],
  excludeId?: string,
): string | null {
  const domain = form.domainName.trim().toUpperCase();
  if (!domain) return null;
  const code = form.codeValue.trim().toUpperCase();
  const label = form.labelName.trim().toUpperCase();
  const short = (form.labelShort.trim() || form.labelName.trim()).toUpperCase();
  const order = form.dispOrder.trim();

  const others = siblings.filter(
    (r) =>
      r.id !== excludeId &&
      (r.domain_name ?? "").trim().toUpperCase() === domain,
  );

  if (code && others.some((r) => (r.code_value ?? "").trim().toUpperCase() === code)) {
    return `Code Value '${form.codeValue.trim()}' already exists in domain '${form.domainName.trim()}'`;
  }
  if (label && others.some((r) => (r.label_name ?? "").trim().toUpperCase() === label)) {
    return `Label Name '${form.labelName.trim()}' already exists in domain '${form.domainName.trim()}'`;
  }
  if (
    short &&
    others.some(
      (r) => (r.label_short ?? r.label_name ?? "").trim().toUpperCase() === short,
    )
  ) {
    return `Label Short '${form.labelShort.trim() || form.labelName.trim()}' already exists in domain '${form.domainName.trim()}'`;
  }
  if (
    order &&
    others.some((r) => (r.disp_order ?? "").trim() === order)
  ) {
    return `Display Order '${order}' already exists in domain '${form.domainName.trim()}'`;
  }
  return null;
}

export function MmsDomainMaster() {
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<DomainRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [tableQuery, setTableQuery] = useState("");

  const [addForm, setAddForm] = useState(emptyAdd);
  const [searchDomain, setSearchDomain] = useState("");
  const [editRow, setEditRow] = useState<DomainRow | null>(null);
  const [editForm, setEditForm] = useState(emptyAdd);

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
    const domainNameUpper = sanitizeText(addForm.domainName).trim().toUpperCase();
    const codeValueUpper = sanitizeText(addForm.codeValue).trim().toUpperCase();
    const labelNameUpper = sanitizeText(addForm.labelName).trim().toUpperCase();
    const labelShortUpper = sanitizeText(addForm.labelShort).trim().toUpperCase();
    const dispOrderClean = sanitizeOrder(addForm.dispOrder).trim();

    if (!domainNameUpper || !codeValueUpper || !labelNameUpper) {
      toast.error("Domain Name, Code Value and Label Name are required");
      return;
    }
    setBusy(true);
    try {
      const sanitizedForm = {
        domainName: domainNameUpper,
        codeValue: codeValueUpper,
        labelName: labelNameUpper,
        labelShort: labelShortUpper,
        dispOrder: dispOrderClean,
      };
      // Prefer live domain siblings so uniqueness is checked even before Search tab runs.
      const siblings = await api<DomainRow[]>(
        `/admin/mms-domain-master/search?domain_name=${encodeURIComponent(domainNameUpper)}`,
      );
      const localErr = uniquenessError(sanitizedForm, siblings);
      if (localErr) {
        toast.error(localErr);
        return;
      }
      await api<DomainRow>("/admin/mms-domain-master/", {
        method: "POST",
        body: JSON.stringify({
          domain_name: domainNameUpper,
          code_value: codeValueUpper,
          label_name: labelNameUpper,
          label_short: labelShortUpper || null,
          disp_order: dispOrderClean || null,
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

  const handleSearch = async (overrideDomain?: string) => {
    setBusy(true);
    const targetDomain = overrideDomain !== undefined ? overrideDomain : searchDomain;
    try {
      const q = targetDomain
        ? `?domain_name=${encodeURIComponent(targetDomain)}`
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

  const clearAdd = () => {
    setAddForm(emptyAdd);
    setDomainSuggestions([]);
    toast.info("Form fields cleared");
  };

  const clearSearch = () => {
    setSearchDomain("");
    setResults([]);
    setSearched(false);
    setTableQuery("");
    setPage(1);
    toast.info("Search fields cleared");
  };

  const openEdit = (row: DomainRow) => {
    setEditRow(row);
    setEditForm(rowToForm(row));
  };

  const isEditModified = useMemo(() => {
    if (!editRow) return false;
    const initial = rowToForm(editRow);
    return (
      editForm.labelName !== initial.labelName ||
      editForm.labelShort !== initial.labelShort ||
      editForm.dispOrder !== initial.dispOrder
    );
  }, [editRow, editForm]);

  const resetEditForm = () => {
    if (editRow) {
      setEditForm(rowToForm(editRow));
      toast.info("Form changes cleared");
    }
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    const domainNameUpper = sanitizeText(editForm.domainName).trim().toUpperCase();
    const codeValueUpper = sanitizeText(editForm.codeValue).trim().toUpperCase();
    const labelNameUpper = sanitizeText(editForm.labelName).trim().toUpperCase();
    const labelShortUpper = sanitizeText(editForm.labelShort).trim().toUpperCase();
    const dispOrderClean = sanitizeOrder(editForm.dispOrder).trim();

    if (!domainNameUpper || !codeValueUpper || !labelNameUpper) {
      toast.error("Domain Name, Code Value and Label Name are required");
      return;
    }
    setBusy(true);
    try {
      const sanitizedForm = {
        domainName: domainNameUpper,
        codeValue: codeValueUpper,
        labelName: labelNameUpper,
        labelShort: labelShortUpper,
        dispOrder: dispOrderClean,
      };
      const siblings = await api<DomainRow[]>(
        `/admin/mms-domain-master/search?domain_name=${encodeURIComponent(domainNameUpper)}`,
      );
      const localErr = uniquenessError(sanitizedForm, siblings, String(editRow.id));
      if (localErr) {
        toast.error(localErr);
        return;
      }
      const updated = await api<DomainRow>(`/admin/mms-domain-master/${editRow.id}`, {
        method: "PUT",
        body: JSON.stringify({
          domain_name: domainNameUpper,
          code_value: codeValueUpper,
          label_name: labelNameUpper,
          label_short: labelShortUpper || null,
          disp_order: dispOrderClean || null,
          module: editRow.module || "MMS",
        }),
      });
      setResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditRow(null);
      refreshDomains();
      toast.success("Domain value updated");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };



  return (
    <FormPanel
      title="MMS Domain Master"
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
      footer={
        mode === "add" ? (
          <>
            <Button
              type="button"
              disabled={busy || JSON.stringify(addForm) === JSON.stringify(emptyAdd)}
              onClick={() => void handleSubmit()}
            >
              {busy ? "Saving…" : "Submit"}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={clearAdd}>
              Clear
            </Button>
          </>
        ) : (
          <>
            <Button type="button" disabled={busy} onClick={() => void handleSearch()}>
              {busy ? "Searching…" : "Search"}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={clearSearch}>
              Clear
            </Button>
          </>
        )
      }
    >
      {mode === "add" ? (
        <div className="w-full">
          <FormGrid cols={2} className="gap-x-6 gap-y-4">
            <FormRow label="Domain Name" required className="sm:grid-cols-[120px_minmax(0,1fr)]">
              <SuggestInput
                value={addForm.domainName}
                placeholder="Please Enter Domain Name..."
                suggestions={domainSuggestions}
                onChange={(v) => setAddForm({ ...addForm, domainName: sanitizeText(v) })}
                onPick={(idx) => {
                  setAddForm({ ...addForm, domainName: sanitizeText(domainSuggestions[idx] ?? "") });
                  setDomainSuggestions([]);
                }}
              />
            </FormRow>
            <FormRow label="Code Value" required className="sm:grid-cols-[120px_minmax(0,1fr)]">
              <Input
                placeholder="Please Enter Code Value..."
                value={addForm.codeValue}
                onChange={(e) => setAddForm({ ...addForm, codeValue: sanitizeText(e.target.value) })}
              />
            </FormRow>
            <FormRow label="Label Name" required className="sm:grid-cols-[120px_minmax(0,1fr)]">
              <Input
                placeholder="Please Enter Label Name..."
                value={addForm.labelName}
                onChange={(e) => setAddForm({ ...addForm, labelName: sanitizeText(e.target.value) })}
              />
            </FormRow>
            <FormRow label="Label Short" className="sm:grid-cols-[120px_minmax(0,1fr)]">
              <Input
                placeholder="Please Enter Label Short..."
                value={addForm.labelShort}
                maxLength={10}
                onChange={(e) => setAddForm({ ...addForm, labelShort: sanitizeText(e.target.value) })}
              />
            </FormRow>
            <FormRow label="Display Order" className="sm:grid-cols-[120px_minmax(0,1fr)]">
              <Input
                placeholder="Please Enter Display Order..."
                value={addForm.dispOrder}
                onChange={(e) => setAddForm({ ...addForm, dispOrder: sanitizeOrder(e.target.value) })}
              />
            </FormRow>
          </FormGrid>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-3">
          <FormRow label="Domain Name" className="sm:grid-cols-[120px_minmax(0,1fr)]">
            <Select
              value={searchDomain || "__all__"}
              onValueChange={(v) => {
                const selected = v === "__all__" ? "" : v;
                setSearchDomain(selected);
                void handleSearch(selected);
              }}
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

          {searched && (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom border-collapse text-[14px]">
                  <thead>
                    <tr>
                      {[
                        "Domain",
                        "Code Value",
                        "Label Name",
                        "Label Short",
                        "Display Order",
                        "Action",
                      ].map((h) => (
                        <th key={h} className="text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
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
                          <td className="px-2 py-1.5 align-middle">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit"
                              aria-label="Edit"
                              disabled={busy}
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1 text-[12px] text-muted-foreground">
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
                  <span className="px-2 text-xs font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="default"
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

      <Dialog
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit Domain Value</DialogTitle>
            <DialogDescription>Update the selected MMS domain master record.</DialogDescription>
          </DialogHeader>
          <div className="mms-form flex flex-col gap-4 py-2">
            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
              <label className="text-right text-[13.5px] font-semibold text-[var(--ink-soft,#54606c)]">
                Domain Name
              </label>
              <Input
                value={editForm.domainName}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
              <label className="text-right text-[13.5px] font-semibold text-[var(--ink-soft,#54606c)]">
                Code Value
              </label>
              <Input
                value={editForm.codeValue}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
              <label className="text-right text-[13.5px] font-semibold text-[var(--ink-soft,#54606c)]">
                <span className="mr-0.5 text-[var(--danger,#b3261e)]">*</span>
                Label Name
              </label>
              <Input
                value={editForm.labelName}
                onChange={(e) => setEditForm({ ...editForm, labelName: sanitizeText(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
              <label className="text-right text-[13.5px] font-semibold text-[var(--ink-soft,#54606c)]">
                Label Short
              </label>
              <Input
                value={editForm.labelShort}
                maxLength={10}
                onChange={(e) => setEditForm({ ...editForm, labelShort: sanitizeText(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
              <label className="text-right text-[13.5px] font-semibold text-[var(--ink-soft,#54606c)]">
                Display Order
              </label>
              <Input
                value={editForm.dispOrder}
                onChange={(e) => setEditForm({ ...editForm, dispOrder: sanitizeOrder(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={!isEditModified || busy}
              onClick={resetEditForm}
            >
              Clear
            </Button>
            <Button
              type="button"
              disabled={!isEditModified || busy}
              onClick={() => void handleUpdate()}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            className="z-[100] max-h-48 overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
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
                  className="relative flex w-full cursor-default select-none items-center rounded-[8px] px-3 py-2 text-left text-[15.5px] outline-none hover:bg-[var(--accent-soft,#e8f2fa)] hover:text-[var(--accent,#14568c)]"
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
