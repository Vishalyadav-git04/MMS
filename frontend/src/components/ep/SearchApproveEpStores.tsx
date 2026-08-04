import { useEffect, useRef, useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
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
import { api, ApiError } from "@/lib/api";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

interface HoldingUnit {
  id: string;
  unit_name: string;
  sus_no: string;
}

interface EpTxnRow {
  id: string;
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
  const blurTimer = useRef<number | null>(null);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""));
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
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
        </ul>
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [holdingUnits, setHoldingUnits] = useState<HoldingUnit[]>([]);
  const [queryField, setQueryField] = useState<"name" | "sus" | null>(null);

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
  };

  const handleSearch = async () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!form.status) {
      toast.error("Status is required");
      return;
    }
    if (!form.susNo.trim() && !form.unitName.trim()) {
      toast.error("Please enter or select SUS No or Unit's Name");
      return;
    }
    setBusy(true);
    try {
      const rows = await api<EpTxnRow[]>("/ep/search-approve/search", {
        method: "POST",
        body: JSON.stringify({
          sus_no: form.susNo.trim() || null,
          unit_name: form.unitName.trim() || null,
          status: form.status,
          date_from: form.from || null,
          date_to: form.to || null,
        }),
      });
      setResults(rows);
      setSelected(new Set());
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (id: string, checked: boolean) => {
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

  const handleApprove = async () => {
    const ids = [...selected].filter((id) =>
      results.some((r) => r.id === id && isPendingRow(r)),
    );
    if (!ids.length) {
      toast.error("Select pending record(s) to approve");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ count: number }>("/ep/search-approve/approve", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      toast.success(`${res.count} record(s) approved`);
      await handleSearch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormPanel
      title="SEARCH DETAILS OF EP STORES"
      footer={
        <>
          <Button disabled={busy} onClick={() => void handleSearch()}>
            Search
          </Button>
          <Button variant="secondary" disabled={busy} onClick={handleClear}>
            Clear
          </Button>
          {results.some(isPendingRow) && (
            <Button
              disabled={busy || selected.size === 0}
              onClick={() => void handleApprove()}
            >
              Approve Selected
            </Button>
          )}
        </>
      }
    >
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="space-y-1.5">
          <FormGrid>
            <FormRow label="SUS No" required>
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
            <FormRow label="Unit's Name" required>
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
            <FormRow label="Status" required>
              <Select
                value={form.status}
                onValueChange={(v) => upd("status", v)}
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
          </FormGrid>
        </div>

        {results.length > 0 && (
          <div className="overflow-auto rounded-md border border-border">
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
                  <TableHead className="text-primary-foreground">ID</TableHead>
                  <TableHead className="text-primary-foreground">SUS No</TableHead>
                  <TableHead className="text-primary-foreground">Unit</TableHead>
                  <TableHead className="text-primary-foreground">Census No</TableHead>
                  <TableHead className="text-primary-foreground">IV No</TableHead>
                  <TableHead className="text-primary-foreground">Qty</TableHead>
                  <TableHead className="text-primary-foreground">Regn No</TableHead>
                  <TableHead className="text-primary-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
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
                    <TableCell className="text-xs">{r.id}</TableCell>
                    <TableCell className="text-xs">{r.sus_no}</TableCell>
                    <TableCell className="text-xs">{r.unit_name}</TableCell>
                    <TableCell className="text-xs">{r.census_no}</TableCell>
                    <TableCell className="text-xs">{r.iv_no}</TableCell>
                    <TableCell className="text-xs">{r.qty}</TableCell>
                    <TableCell className="text-xs">{r.eqpt_regn_no}</TableCell>
                    <TableCell className="text-xs">
                      {r.op_status_label ?? r.op_status}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </FormPanel>
  );
}
