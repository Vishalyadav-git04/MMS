import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, CheckCircle2, XCircle, FileText, ExternalLink } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { isoToDmyDash, pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HoldingUnit {
  id: number | string;
  unit_name: string;
  sus_no: string;
}

interface EpTxnRow {
  id: number | string;
  sus_no?: string | null;
  unit_name?: string | null;
  issued_from?: string | null;
  from_sus_no?: string | null;
  census_no?: string | null;
  auth_letter_no?: string | null;
  auth_date?: string | null;
  iv_no?: string | null;
  iv_date?: string | null;
  qty?: number | null;
  eqpt_regn_no?: string | null;
  service_status?: string | null;
  op_status?: string | null;
  op_status_label?: string | null;
  remarks?: string | null;
  sanction_auth?: string | null;
  upload_auth_letter?: string | null;
  upload_voucher?: string | null;
  created_by?: string | null;
  created_date?: string | null;
  approved_by?: string | null;
  approved_date?: string | null;
  domain_name?: string | null;
  sub_domain_name?: string | null;
}

function DetailField({ label, value }: { label: string; value?: ReactNode | string | null }) {
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

function FileDetailField({
  label,
  filename,
  onPreview,
}: {
  label: string;
  filename?: string | null;
  onPreview: (filename: string, title: string) => void;
}) {
  if (!filename) {
    return <DetailField label={label} value="—" />;
  }

  const fileUrl = `/upload/${encodeURIComponent(filename)}`;

  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
        {label}
      </span>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <button
          type="button"
          onClick={() => onPreview(filename, label)}
          className="flex items-center gap-1.5 min-w-0 text-left hover:underline group cursor-pointer"
          title={`Click to view ${filename}`}
        >
          <FileText className="h-4 w-4 shrink-0 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-[13.5px] font-semibold text-primary truncate max-w-[140px]">
            {filename}
          </span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary hover:bg-primary/20"
            title="Preview Document"
            onClick={() => onPreview(filename, label)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab / Download"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-primary hover:bg-primary/20 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function SuggestInput({
  value,
  placeholder,
  disabled,
  suggestions,
  renderItem,
  maxHeightClass = "max-h-44",
  onChange,
  onPick,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  suggestions: string[];
  renderItem?: (s: string, idx: number) => ReactNode;
  maxHeightClass?: string;
  onChange: (v: string) => void;
  onPick: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<number | null>(null);

  const designMaxHeight = (() => {
    const n = Number(maxHeightClass.match(/max-h-(\d+)/)?.[1]);
    return Number.isFinite(n) && n > 0 ? n * 4 : 176;
  })();

  const updateCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = r.bottom + 4;
    const footer = el.closest(".mms-panel")?.querySelector(".mms-panel__foot");
    const ceiling = footer ? footer.getBoundingClientRect().top : window.innerHeight;
    setCoords({
      top,
      left: r.left,
      width: r.width,
      maxHeight: Math.min(designMaxHeight, Math.max(40, ceiling - top - 8)),
    });
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
          const val = e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, "");
          onChange(val);
          setOpen(Boolean(val.trim()));
        }}
        onFocus={() => {
          setOpen(Boolean(value.trim()));
          updateCoords();
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {showList &&
        createPortal(
          <ul
            className={cn("overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md", maxHeightClass)}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              zIndex: 100,
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
                  {renderItem ? renderItem(s, idx) : s}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}

function getDefaultDates() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth();
  const dd = now.getDate();

  const fromDate = new Date(yyyy, mm - 1, dd);
  if (fromDate.getMonth() === mm) {
    fromDate.setDate(0);
  }

  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    from: formatIso(fromDate),
    to: formatIso(now),
  };
}

function isPendingRow(r: EpTxnRow): boolean {
  const s = (r.op_status || "").trim().toUpperCase();
  const l = (r.op_status_label || "").trim().toLowerCase();
  return s === "P" || s === "0" || s === "PENDING" || l === "pending";
}

export function SearchApproveEpStores() {
  const [form, setForm] = useState(() => {
    const dates = getDefaultDates();
    return {
      susNo: "",
      unitName: "",
      from: dates.from,
      to: dates.to,
      status: "",
    };
  });
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<EpTxnRow[]>([]);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [holdingUnits, setHoldingUnits] = useState<HoldingUnit[]>([]);
  const [queryField, setQueryField] = useState<"name" | "sus" | null>(null);
  const [page, setPage] = useState(1);
  const [viewRow, setViewRow] = useState<EpTxnRow | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ filename: string; title: string } | null>(null);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = results.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, results.length);
  const pageRows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm({ ...form, [k]: v });

  useEffect(() => {
    if (!queryField) return;
    const q = queryField === "name" ? form.unitName.trim() : form.susNo.trim();
    if (q.length < 1) {
      setHoldingUnits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<HoldingUnit[]>(
        `/ep/capture/holding-units?q=${encodeURIComponent(q)}`,
      )
        .then(setHoldingUnits)
        .catch(() => setHoldingUnits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [form.unitName, form.susNo, queryField]);

  const handleClear = () => {
    const dates = getDefaultDates();
    setForm({
      susNo: "",
      unitName: "",
      from: dates.from,
      to: dates.to,
      status: "",
    });
    setResults([]);
    setSelected(new Set());
    setHoldingUnits([]);
    setPage(1);
    setViewRow(null);
  };

  const handleSearch = async (overrideForm?: typeof form) => {
    const targetForm = overrideForm || form;
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    setBusy(true);
    try {
      const rows = await api<EpTxnRow[]>("/ep/search-approve/search", {
        method: "POST",
        body: JSON.stringify({
          sus_no: targetForm.susNo.trim() || null,
          unit_name: targetForm.unitName.trim() || null,
          status: targetForm.status || "All",
          date_from: targetForm.from || null,
          date_to: targetForm.to || null,
        }),
      });
      setResults(rows);
      setSelected(new Set());
      setPage(1);
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (id: number | string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const pendingSelectable = results.filter(isPendingRow);

  const toggleAllPending = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(pendingSelectable.map((r) => r.id)));
  };

  const handleSingleApprove = async (id: number | string) => {
    const idsToProcess =
      selected.size > 0 && selected.has(id) ? Array.from(selected) : [id];
    setBusy(true);
    try {
      const res = await api<{ count: number }>("/ep/search-approve/approve", {
        method: "POST",
        body: JSON.stringify({ ids: idsToProcess }),
      });
      toast.success(`${res.count} record(s) approved`);
      setSelected(new Set());
      setResults((prev) =>
        prev.map((r) =>
          idsToProcess.includes(r.id)
            ? { ...r, op_status: "A", op_status_label: "Approved" }
            : r,
        ),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSingleReject = async (id: number | string) => {
    const idsToProcess =
      selected.size > 0 && selected.has(id) ? Array.from(selected) : [id];
    setBusy(true);
    try {
      const res = await api<{ count: number }>("/ep/search-approve/reject", {
        method: "POST",
        body: JSON.stringify({ ids: idsToProcess }),
      });
      toast.success(`${res.count} record(s) rejected`);
      setSelected(new Set());
      setResults((prev) =>
        prev.map((r) =>
          idsToProcess.includes(r.id)
            ? { ...r, op_status: "R", op_status_label: "Rejected" }
            : r,
        ),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FormPanel
        title="SEARCH DETAILS OF EP STORES"
        overflowVisible={results.length === 0}
        footer={
          <>
            <Button disabled={busy} onClick={() => void handleSearch()}>
              Search
            </Button>
            <Button variant="secondary" disabled={busy} onClick={handleClear}>
              Clear
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <FormGrid cols={3}>
              <FormRow label="SUS No">
                <SuggestInput
                  value={form.susNo}
                  placeholder="Search..."
                  disabled={busy}
                  suggestions={
                    queryField === "sus"
                      ? holdingUnits.map((u) => `${u.sus_no} — ${u.unit_name}`)
                      : []
                  }
                  onChange={(v) => {
                    setQueryField("sus");
                    setForm({ ...form, susNo: v, unitName: "" });
                  }}
                  onPick={(idx) => {
                    const u = holdingUnits[idx];
                    if (!u) return;
                    setForm({ ...form, susNo: u.sus_no, unitName: u.unit_name });
                    setHoldingUnits([]);
                    setQueryField(null);
                  }}
                />
              </FormRow>
              <FormRow label="Unit's Name">
                <SuggestInput
                  value={form.unitName}
                  placeholder="Search..."
                  disabled={busy}
                  suggestions={
                    queryField === "name"
                      ? holdingUnits.map((u) => `${u.unit_name} (${u.sus_no})`)
                      : []
                  }
                  onChange={(v) => {
                    setQueryField("name");
                    setForm({ ...form, unitName: v, susNo: "" });
                  }}
                  onPick={(idx) => {
                    const u = holdingUnits[idx];
                    if (!u) return;
                    setForm({ ...form, susNo: u.sus_no, unitName: u.unit_name });
                    setHoldingUnits([]);
                    setQueryField(null);
                  }}
                />
              </FormRow>
              <FormRow label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => {
                    setForm({ ...form, status: v });
                  }}
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="--Select the Value--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="All">All</SelectItem>
                  </SelectContent>
                </Select>
              </FormRow>
              <FormRow label="From">
                <DateInput
                  value={form.from}
                  disabled={busy}
                  onChange={(v) => upd("from", v)}
                />
              </FormRow>
              <FormRow label="To">
                <DateInput
                  value={form.to}
                  disabled={busy}
                  onChange={(v) => upd("to", v)}
                />
              </FormRow>
            </FormGrid>
          </div>

          {results.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-10 text-primary-foreground">
                        {pendingSelectable.length > 0 ? (
                          <input
                            type="checkbox"
                            checked={
                              pendingSelectable.length > 0 &&
                              pendingSelectable.every((r) => selected.has(r.id))
                            }
                            onChange={(e) => toggleAllPending(e.target.checked)}
                          />
                        ) : null}
                      </TableHead>
                      <TableHead className="text-primary-foreground">S.No</TableHead>
                      <TableHead className="text-primary-foreground">SUS No</TableHead>
                      <TableHead className="text-primary-foreground">Unit</TableHead>
                      <TableHead className="text-primary-foreground">Census No</TableHead>
                      <TableHead className="text-primary-foreground">IV No</TableHead>
                      <TableHead className="text-primary-foreground">Qty</TableHead>
                      <TableHead className="text-primary-foreground">Regn No</TableHead>
                      <TableHead className="text-primary-foreground">Status</TableHead>
                      <TableHead className="text-center text-primary-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((r, idx) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {isPendingRow(r) ? (
                            <input
                              type="checkbox"
                              checked={selected.has(r.id)}
                              onChange={(e) => toggleRow(r.id, e.target.checked)}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="text-xs">{r.sus_no}</TableCell>
                        <TableCell className="text-xs">{r.unit_name}</TableCell>
                        <TableCell className="text-xs">{r.census_no}</TableCell>
                        <TableCell className="text-xs">{r.iv_no}</TableCell>
                        <TableCell className="text-xs">{r.qty}</TableCell>
                        <TableCell className="text-xs">{r.eqpt_regn_no}</TableCell>
                        <TableCell className="text-xs font-medium">
                          {r.op_status_label ?? r.op_status}
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="View Details"
                              aria-label={`View details for ${r.id}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-accent hover:bg-accent/10 cursor-pointer"
                              onClick={() => setViewRow(r)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {r.op_status !== "A" && r.op_status !== "1" && (
                              <button
                                type="button"
                                title="Approve"
                                aria-label={`Approve ${r.id}`}
                                disabled={busy}
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-emerald-600 hover:bg-emerald-500/10 cursor-pointer disabled:opacity-50"
                                onClick={() => void handleSingleApprove(r.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            {r.op_status !== "R" && r.op_status !== "2" && (
                              <button
                                type="button"
                                title="Reject"
                                aria-label={`Reject ${r.id}`}
                                disabled={busy}
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
                                onClick={() => void handleSingleReject(r.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    variant="default"
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
      </FormPanel>

      <Dialog
        open={!!viewRow}
        onOpenChange={(open) => {
          if (!open) setViewRow(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Details of EP Stores — {viewRow?.census_no || viewRow?.eqpt_regn_no || (viewRow ? `Record #${viewRow.id}` : "")}
            </DialogTitle>
          </DialogHeader>

          {viewRow && (
            <div className="flex flex-col gap-4 pt-1">
              <FormSection title="1. Issue & Authority Details" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <DetailField label="Sanctioning Auth" value={viewRow.sanction_auth} />
                <DetailField label="Auth Letter No" value={viewRow.auth_letter_no} />
                <DetailField
                  label="Auth Date"
                  value={viewRow.auth_date ? isoToDmyDash(viewRow.auth_date) : viewRow.auth_date}
                />
                <DetailField label="Issuing SUS No" value={viewRow.issued_from || viewRow.from_sus_no} />
                <DetailField label="Holding Unit Name" value={viewRow.unit_name} />
                <DetailField label="Holding SUS No" value={viewRow.sus_no} />
              </div>

              <FormSection title="2. Census & Equipment Details" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <DetailField label="Eqpt Category" value={viewRow.domain_name} />
                <DetailField label="Sub Domain / EP Census" value={viewRow.sub_domain_name} />
                <DetailField label="Census No" value={viewRow.census_no} />
                <DetailField label="Eqpt Regn No" value={viewRow.eqpt_regn_no} />
                <DetailField label="IV No" value={viewRow.iv_no} />
                <DetailField
                  label="IV Date"
                  value={viewRow.iv_date ? isoToDmyDash(viewRow.iv_date) : viewRow.iv_date}
                />
                <DetailField label="Issued Qty" value={viewRow.qty != null ? String(viewRow.qty) : null} />
                <DetailField label="Serviceability" value={viewRow.service_status} />
                <DetailField label="Status" value={viewRow.op_status_label || viewRow.op_status} />
                <FileDetailField
                  label="Upload Auth Letter"
                  filename={viewRow.upload_auth_letter}
                  onPreview={(fn, title) => setPreviewDoc({ filename: fn, title })}
                />
                <FileDetailField
                  label="Upload Voucher"
                  filename={viewRow.upload_voucher}
                  onPreview={(fn, title) => setPreviewDoc({ filename: fn, title })}
                />
                <DetailField label="Remarks" value={viewRow.remarks} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[85vh] p-4 flex flex-col gap-3">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
            <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {previewDoc?.title}: {previewDoc?.filename}
            </DialogTitle>
            {previewDoc && (
              <a
                href={`/upload/${encodeURIComponent(previewDoc.filename)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mr-6"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in New Tab
              </a>
            )}
          </DialogHeader>

          <div className="flex-1 w-full h-full min-h-0 bg-muted/20 rounded-md overflow-hidden border border-border">
            {previewDoc && (
              <iframe
                src={`/upload/${encodeURIComponent(previewDoc.filename)}`}
                className="w-full h-full border-0"
                title={previewDoc.filename}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

