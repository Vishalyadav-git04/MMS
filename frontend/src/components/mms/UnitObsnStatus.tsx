import { useState } from "react";
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
  sus_no?: string | null;
  deo?: string | null;
  mth?: string | null;
  yr?: string | null;
  census_no?: string | null;
  obsn_status?: string | null;
  unit_remarks?: string | null;
  obsn1?: string | null;
  obsn2?: string | null;
}

export function UnitObsnStatus() {
  const [unitName, setUnitName] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ObsnRecord[]>([]);

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
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormPanel title="Unit Obsn Status" fill>
      <div className="flex h-full min-h-0 flex-col gap-1.5">
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

        <div className="flex flex-wrap justify-center gap-2 py-1">
          <Button
            disabled={busy}
            onClick={() => void handleSearch()}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setUnitName("");
              setPeriod("");
              setStatus("all");
              setResults([]);
            }}
          >
            Clear
          </Button>
          <Button variant="destructive" onClick={() => setResults([])}>
            Cancel
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
          <div className="flex shrink-0 items-center justify-between px-3 py-1 bg-secondary/60 text-[10px]">
            <div>
              Show{" "}
              <select className="bg-card border border-border rounded px-1.5 py-0.5 text-[10px]">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>{" "}
              entries
            </div>
            <div className="flex items-center gap-1.5">
              Search: <Input className="h-6 w-36" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  {[
                    "SUS No",
                    "DEO",
                    "Period",
                    "Census No",
                    "Status",
                    "Observation",
                    "Remarks",
                  ].map((h) => (
                    <TableHead key={h} className="text-primary-foreground font-semibold text-[10px]">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-xs">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.sus_no}</TableCell>
                      <TableCell className="text-xs">{r.deo}</TableCell>
                      <TableCell className="text-xs">
                        {[r.mth, r.yr].filter(Boolean).join(" ")}
                      </TableCell>
                      <TableCell className="text-xs">{r.census_no}</TableCell>
                      <TableCell className="text-xs">{r.obsn_status}</TableCell>
                      <TableCell className="text-xs">{r.obsn1 ?? r.obsn2}</TableCell>
                      <TableCell className="text-xs">{r.unit_remarks}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex shrink-0 items-center justify-between px-3 py-1 bg-muted/40 text-[10px] text-muted-foreground">
            <div>
              Showing {results.length === 0 ? 0 : 1} to {results.length} of {results.length} entries
            </div>
          </div>
        </div>
      </div>
    </FormPanel>
  );
}
