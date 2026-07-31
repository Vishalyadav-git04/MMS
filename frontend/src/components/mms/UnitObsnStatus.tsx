import { useMemo, useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";

interface ObsnRecord {
  id: string;
  unit_name?: string | null;
  uploaded_doc?: string | null;
  obsn_id?: number | null;
  observation?: string | null;
  obsn_date?: string | null;
  date_of_completion?: string | null;
  completion_by?: string | null;
  miso_reply?: string | null;
}

const COLUMNS = [
  "Unit Name",
  "Uploaded Doc",
  "Obsn ID",
  "Observation",
  "Obsn Date",
  "Date of Completion",
  "Completion by",
  "MISO Reply",
] as const;

function fmtDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

export function UnitObsnStatus() {
  const [unitName, setUnitName] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ObsnRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [tableQuery, setTableQuery] = useState("");

  const filtered = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    if (!q) return results;
    return results.filter((r) =>
      [
        r.unit_name,
        r.uploaded_doc,
        r.obsn_id,
        r.observation,
        r.completion_by,
        r.miso_reply,
      ]
        .filter((v) => v != null && String(v).length > 0)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [results, tableQuery]);

  const pageRows = filtered.slice(0, pageSize);

  const resetFilters = () => {
    setUnitName("");
    setPeriod("");
    setStatus("all");
    setResults([]);
    setShowResults(false);
    setTableQuery("");
  };

  const handleSearch = async () => {
    setBusy(true);
    try {
      const rows = await api<ObsnRecord[]>("/admin/unit-obsn-status/search", {
        method: "POST",
        body: JSON.stringify({
          unit_name: unitName || null,
          period: period || null,
          status,
        }),
      });
      setResults(rows);
      setShowResults(true);
      setTableQuery("");
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
      setShowResults(true);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormPanel
      title="Unit Obsn Status"
      fill={showResults}
      footer={
        <>
          <Button
            disabled={busy}
            onClick={() => void handleSearch()}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {busy ? "Searching…" : "Search"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={resetFilters}>
            Clear
          </Button>
          <Button variant="destructive" disabled={busy} onClick={resetFilters}>
            Cancel
          </Button>
        </>
      }
    >
      <div
        className={
          showResults
            ? "flex h-full min-h-0 flex-col gap-2"
            : "mx-auto w-full max-w-4xl space-y-1 pt-1"
        }
      >
        <FormGrid cols={3}>
          <FormRow label="Unit Name">
            <Input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="SUS No / DEO..."
            />
          </FormRow>
          <FormRow label="Period">
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </FormRow>
          <FormRow label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">-- ALL STATUS --</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        </FormGrid>

        {showResults && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
            <div className="flex shrink-0 flex-wrap items-center gap-3 px-3 py-1 bg-secondary/60 text-[12px]">
              <div className="flex items-center gap-1.5">
                Show{" "}
                <select
                  className="bg-card border border-border rounded px-1.5 py-0.5 text-[12px]"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>{" "}
                entries
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                Search:{" "}
                <Input
                  className="h-6 w-36"
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    {COLUMNS.map((h) => (
                      <TableHead
                        key={h}
                        className="text-primary-foreground font-semibold text-[12px]"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={COLUMNS.length}
                        className="text-center text-muted-foreground py-6 text-xs"
                      >
                        No data available in table
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.unit_name}</TableCell>
                        <TableCell className="text-xs">{r.uploaded_doc}</TableCell>
                        <TableCell className="text-xs">{r.obsn_id}</TableCell>
                        <TableCell className="text-xs">{r.observation}</TableCell>
                        <TableCell className="text-xs">{fmtDate(r.obsn_date)}</TableCell>
                        <TableCell className="text-xs">
                          {fmtDate(r.date_of_completion)}
                        </TableCell>
                        <TableCell className="text-xs">{r.completion_by}</TableCell>
                        <TableCell className="text-xs">{r.miso_reply}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex shrink-0 items-center justify-between px-3 py-1 bg-muted/40 text-[12px] text-muted-foreground">
              <div>
                Showing {filtered.length === 0 ? 0 : 1} to {pageRows.length} of{" "}
                {filtered.length} entries
              </div>
            </div>
          </div>
        )}
      </div>
    </FormPanel>
  );
}
