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

interface OrbatUnit {
  id: string;
  unit_name: string;
  sus_no: string;
  form_code: string | null;
  status: string;
}

interface NewEqptRow {
  id: string;
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
  const blurTimer = useRef<number | null>(null);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
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

export function ApproveNewEqpt() {
  const [form, setForm] = useState(emptyForm);
  const [results, setResults] = useState<NewEqptRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orbatHits, setOrbatHits] = useState<OrbatUnit[]>([]);
  const [queryField, setQueryField] = useState<"name" | "sus" | null>(null);
  const [busy, setBusy] = useState(false);

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
  };

  const handleSearch = async (opts?: { silent?: boolean }) => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!form.susNo.trim() || !form.unitName.trim() || !form.from || !form.status) {
      toast.error("SUS No, Unit's Name, From and Status are required");
      return;
    }
    setBusy(true);
    try {
      const rows = await api<NewEqptRow[]>("/unit-holding/approve-new-eqpt/search", {
        method: "POST",
        body: JSON.stringify({
          sus_no: form.susNo.trim(),
          unit_name: form.unitName.trim(),
          status: form.status,
          date_from: form.from,
          date_to: form.to || null,
        }),
      });
      setResults(rows);
      setSelected(new Set());
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

  const handleApprove = async () => {
    const items = pendingRows
      .filter((r) => selected.has(rowKey(r)))
      .map((r) => ({ id: r.id, source_table: r.source_table }));
    if (!items.length) {
      toast.error("Select record(s) to approve");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ count: number }>("/unit-holding/approve-new-eqpt/approve", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      toast.success(`${res.count} record(s) approved`);
      await handleSearch({ silent: true });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const nameSuggestions = orbatHits.map(
    (u) => `${u.unit_name} (${u.sus_no})`,
  );
  const susSuggestions = orbatHits.map(
    (u) => `${u.sus_no} — ${u.unit_name}`,
  );

  return (
    <FormPanel
      title="SEARCH DETAILS OF NEW EQPT"
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={handleClear}>
            Clear
          </Button>
          <Button disabled={busy} onClick={() => void handleSearch()}>
            Search
          </Button>
          <Button variant="destructive" disabled={busy} onClick={handleClear}>
            Cancel
          </Button>
          {pendingRows.length > 0 && (
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
        <FormGrid>
          <FormRow label="SUS No" required>
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
          <FormRow label="Unit's Name" required>
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
          <FormRow label="From" required>
            <DateInput value={form.from} onChange={(v) => upd("from", v)} />
          </FormRow>
          <FormRow label="To">
            <DateInput value={form.to} onChange={(v) => upd("to", v)} />
          </FormRow>
          <FormRow label="Status" required>
            <Select
              value={form.status || undefined}
              onValueChange={(v) => upd("status", v)}
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
        </FormGrid>

        {results.length > 0 && (
          <div className="overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-10 text-primary-foreground">
                    {pendingRows.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={
                          pendingRows.length > 0 &&
                          pendingRows.every((r) => selected.has(rowKey(r)))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelected(new Set(pendingRows.map((r) => rowKey(r))));
                          } else {
                            setSelected(new Set());
                          }
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => {
                  const key = rowKey(r);
                  const isPending =
                    r.status === "Pending" ||
                    r.op_status === "0" ||
                    r.op_status === "P";
                  return (
                    <TableRow key={key}>
                      <TableCell>
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </FormPanel>
  );
}
