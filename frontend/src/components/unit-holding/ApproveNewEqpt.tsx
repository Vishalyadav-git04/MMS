import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { isoToDmy, pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

interface OrbatUnit {
  id: number | string;
  unit_name: string;
  sus_no: string;
  form_code: string | null;
  status: string;
}

interface NewEqptRow {
  id: number | string;
  source_table: string;
  iv_no?: string | null;
  iv_date?: string | null;
  unit_name?: string | null;
  sus_no?: string | null;
  material_no?: string | null;
  census_no?: string | null;
  type_of_hldg?: string | null;
  type_of_hldg_label?: string | null;
  status: string;
  op_status?: string | null;
  eqpt_regn_no?: string | null;
  regn_seq_no?: string | null;
  census_seq_no?: string | number | null;
  prf_code?: string | null;
  prf_group?: string | null;
  nomenclature?: string | null;
  type_of_eqpt?: string | null;
  type_of_eqpt_label?: string | null;
  from_sus_no?: string | null;
  from_unit_name?: string | null;
  depres_dur_year?: string | null;
  upload_iv?: string | null;
  eqpt_make?: string | null;
  eqpt_model?: string | null;
  unit_price?: string | null;
  life_of_asset?: string | null;
}

type OptionsMap = Record<string, { value: string; label: string }[]>;

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[13.5px] font-semibold text-foreground truncate">
        {value || "—"}
      </span>
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyForm() {
  return {
    susNo: "",
    unitName: "",
    from: "2026-07-01",
    to: todayIso(),
    status: "",
  };
}

function rowKey(r: NewEqptRow) {
  return `${r.source_table}:${r.id}`;
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
          onChange(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""));
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
          <div
            className="z-[100] overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-xl backdrop-blur-md"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-2.5 py-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase select-none">
              <span>Suggestions</span>
              <span>{suggestions.length} match{suggestions.length > 1 ? "es" : ""}</span>
            </div>
            <ul className="mms-scrollbar max-h-72 overflow-y-auto overscroll-contain py-1">
              {suggestions.map((s, idx) => (
                <li key={`${s}-${idx}`}>
                  <button
                    type="button"
                    className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
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
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ApproveNewEqpt() {
  const [form, setForm] = useState(emptyForm);
  const [results, setResults] = useState<NewEqptRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orbatHits, setOrbatHits] = useState<OrbatUnit[]>([]);
  const [queryField, setQueryField] = useState<"name" | "sus" | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [viewItem, setViewItem] = useState<NewEqptRow | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const upd = <K extends keyof ReturnType<typeof emptyForm>>(
    k: K,
    v: ReturnType<typeof emptyForm>[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!queryField) return;
    const q = queryField === "name" ? form.unitName.trim() : form.susNo.trim();
    if (q.length < 1) {
      setOrbatHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<OrbatUnit[]>(
        `/unit-holding/approve-new-eqpt/orbat-units?q=${encodeURIComponent(q)}`,
      )
        .then(setOrbatHits)
        .catch(() => setOrbatHits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [form.unitName, form.susNo, queryField]);

  const pickUnit = (u: OrbatUnit) => {
    setForm((prev) => ({
      ...prev,
      unitName: u.unit_name,
      susNo: u.sus_no,
    }));
    setOrbatHits([]);
    setQueryField(null);
  };

  const handleClear = () => {
    setForm(emptyForm());
    setResults([]);
    setSelected(new Set());
    setOrbatHits([]);
    setQueryField(null);
    setViewItem(null);
    setViewModalOpen(false);
    setPage(1);
  };

  const handleSearch = async (opts?: { silent?: boolean; overrideStatus?: string }) => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!form.from) {
      toast.error("From date is required");
      return;
    }
    const statusVal = opts?.overrideStatus !== undefined ? opts.overrideStatus : form.status;

    setBusy(true);
    try {
      const rows = await api<NewEqptRow[]>("/unit-holding/approve-new-eqpt/search", {
        method: "POST",
        body: JSON.stringify({
          sus_no: form.susNo.trim(),
          unit_name: form.unitName.trim(),
          status: statusVal,
          date_from: form.from,
          date_to: form.to || null,
        }),
      });
      setResults(rows);
      setSelected(new Set());
      setPage(1);
      if (!opts?.silent) {
        toast.success(`${rows.length} record(s) found`);
      }
    } catch (e) {
      setResults([]);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const pendingRows = results.filter(
    (r) => r.status === "Pending" || r.op_status === "0" || r.op_status === "P",
  );

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = results.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, results.length);
  const pageRows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const currentPendingRows = pageRows.filter(
    (r) => r.status === "Pending" || r.op_status === "0" || r.op_status === "P",
  );

  const handleApproveRow = async (row: NewEqptRow) => {
    const selectedPending = pendingRows.filter((r) => selected.has(rowKey(r)));
    const items =
      selectedPending.length > 0
        ? selectedPending.map((r) => ({ id: r.id, source_table: r.source_table }))
        : [{ id: row.id, source_table: row.source_table }];

    setBusy(true);
    try {
      const res = await api<{ count: number }>("/unit-holding/approve-new-eqpt/approve", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      toast.success(
        items.length > 1
          ? `${res.count} record(s) approved successfully`
          : "Record approved successfully",
      );
      handleClear();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectRow = async (row: NewEqptRow) => {
    const selectedPending = pendingRows.filter((r) => selected.has(rowKey(r)));
    const items =
      selectedPending.length > 0
        ? selectedPending.map((r) => ({ id: r.id, source_table: r.source_table }))
        : [{ id: row.id, source_table: row.source_table }];

    setBusy(true);
    try {
      const res = await api<{ count: number }>("/unit-holding/approve-new-eqpt/reject", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      toast.success(
        items.length > 1
          ? `${res.count} record(s) rejected successfully`
          : "Record rejected successfully",
      );
      handleClear();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const handleViewDetails = (row: NewEqptRow) => {
    setViewItem(row);
    setViewModalOpen(true);
  };

  const nameSuggestions = orbatHits
    .map((u) => `${u.unit_name} (${u.sus_no})`)
    .slice(0, 10);
  const susSuggestions = orbatHits
    .map((u) => `${u.sus_no} — ${u.unit_name}`)
    .slice(0, 10);

  return (
    <FormPanel
      title="SEARCH DETAILS OF NEW EQPT"
      overflowVisible={results.length === 0}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={handleClear}>
            Clear
          </Button>
          <Button disabled={busy} onClick={() => void handleSearch()}>
            Search
          </Button>
        </>
      }
    >
      <div className="w-full space-y-3">
        <FormGrid cols={3}>
          <FormRow label="SUS No">
            <SuggestInput
              placeholder="Search..."
              value={form.susNo}
              suggestions={queryField === "sus" ? susSuggestions : []}
              onChange={(v) => {
                upd("susNo", v);
                setQueryField("sus");
              }}
              onPick={(idx) => {
                const u = orbatHits[idx];
                if (u) pickUnit(u);
              }}
            />
          </FormRow>
          <FormRow label="Unit's Name">
            <SuggestInput
              placeholder="Search..."
              value={form.unitName}
              suggestions={queryField === "name" ? nameSuggestions : []}
              onChange={(v) => {
                upd("unitName", v);
                setQueryField("name");
              }}
              onPick={(idx) => {
                const u = orbatHits[idx];
                if (u) pickUnit(u);
              }}
            />
          </FormRow>
          <FormRow label="Status">
            <Select
              value={form.status || undefined}
              onValueChange={(v) => {
                upd("status", v);
                if (form.from) {
                  void handleSearch({ silent: false, overrideStatus: v });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select the Value--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="From" required className="md:col-span-2">
            <DateInput value={form.from} onChange={(v) => upd("from", v)} />
          </FormRow>
          <FormRow label="To" className="md:col-start-3">
            <DateInput value={form.to} onChange={(v) => upd("to", v)} />
          </FormRow>
        </FormGrid>

        {results.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="w-10 text-primary-foreground">
                      {currentPendingRows.length > 0 ? (
                        <input
                          type="checkbox"
                          checked={
                            currentPendingRows.length > 0 &&
                            currentPendingRows.every((r) => selected.has(rowKey(r)))
                          }
                          onChange={(e) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                currentPendingRows.forEach((r) => next.add(rowKey(r)));
                              } else {
                                currentPendingRows.forEach((r) => next.delete(rowKey(r)));
                              }
                              return next;
                            });
                          }}
                        />
                      ) : null}
                    </TableHead>
                    <TableHead className="text-primary-foreground">IV No</TableHead>
                    <TableHead className="text-primary-foreground">SUS No</TableHead>
                    <TableHead className="text-primary-foreground">Unit</TableHead>
                    <TableHead className="text-primary-foreground">Material No</TableHead>
                    <TableHead className="text-primary-foreground">Census No</TableHead>
                    <TableHead className="text-primary-foreground">Type of Holding</TableHead>
                    <TableHead className="text-primary-foreground">Status</TableHead>
                    <TableHead className="text-primary-foreground text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const key = rowKey(r);
                    const isPending =
                      r.status === "Pending" ||
                      r.op_status === "0" ||
                      r.op_status === "P";
                    return (
                      <TableRow key={key}>
                        <TableCell className="w-10">
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={selected.has(key)}
                              onChange={(e) => toggleRow(key, e.target.checked)}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs">{r.iv_no}</TableCell>
                        <TableCell className="text-xs">{r.sus_no}</TableCell>
                        <TableCell className="text-xs">{r.unit_name}</TableCell>
                        <TableCell className="text-xs">{r.material_no}</TableCell>
                        <TableCell className="text-xs">{r.census_no}</TableCell>
                        <TableCell className="text-xs">
                          {r.type_of_hldg_label || r.type_of_hldg || "—"}
                        </TableCell>
                        <TableCell className="text-xs">{r.status}</TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="View Details"
                              aria-label={`View details for ${r.census_no || r.id}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-accent hover:bg-accent/10 cursor-pointer"
                              onClick={() => handleViewDetails(r)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  title="Approve"
                                  aria-label={`Approve ${r.census_no || r.id}`}
                                  disabled={busy}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded text-emerald-600 hover:bg-emerald-500/10 cursor-pointer disabled:opacity-50"
                                  onClick={() => void handleApproveRow(r)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Reject"
                                  aria-label={`Reject ${r.census_no || r.id}`}
                                  disabled={busy}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
                                  onClick={() => void handleRejectRow(r)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1.5 text-[12px] text-muted-foreground">
              <div>
                Showing {pageStart} to {pageEnd} of {results.length} record(s)
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
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[12px]"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Details of New Equipment — {viewItem?.census_no || viewItem?.eqpt_regn_no || "Record Details"}
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 pt-1">
              <FormSection title="1. Issue & Depot Particulars" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <DetailField label="IV No" value={viewItem.iv_no} />
                <DetailField
                  label="IV Date"
                  value={viewItem.iv_date ? isoToDmy(viewItem.iv_date) : ""}
                />
                <DetailField
                  label="Issuing Depot"
                  value={
                    viewItem.from_unit_name
                      ? `${viewItem.from_unit_name} (${viewItem.from_sus_no || ""})`
                      : viewItem.from_sus_no
                  }
                />
                <DetailField label="To Unit Name" value={viewItem.unit_name} />
                <DetailField label="To Unit SUS" value={viewItem.sus_no} />
                <DetailField
                  label="Type of Holding"
                  value={viewItem.type_of_hldg_label || viewItem.type_of_hldg}
                />
                <DetailField
                  label="Type of Eqpt"
                  value={viewItem.type_of_eqpt_label || viewItem.type_of_eqpt}
                />
              </div>

              <FormSection title="2. Census & Equipment Details" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-3">
                  <DetailField label="PRF Group" value={viewItem.prf_group} />
                </div>
                <DetailField
                  label="Census No"
                  value={
                    viewItem.nomenclature
                      ? `${viewItem.census_no || ""} — ${viewItem.nomenclature}`
                      : viewItem.census_no
                  }
                />
                <DetailField label="Material No" value={viewItem.material_no} />
                <DetailField label="Issued Qty" value="1" />
                <DetailField label="Eqpt Make" value={viewItem.eqpt_make} />
                <DetailField label="Eqpt Model" value={viewItem.eqpt_model} />
                <DetailField label="Unit Price" value={viewItem.unit_price} />
                <DetailField label="Depreciation %" value={viewItem.depres_dur_year} />
                <DetailField label="Life (Yr)" value={viewItem.life_of_asset} />
                <div className="sm:col-span-2">
                  <DetailField label="Upload IV" value={viewItem.upload_iv} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FormPanel>
  );
}


