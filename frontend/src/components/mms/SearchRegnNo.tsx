import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface RegnRecord {
  id: string;
  eqpt_regn_no?: string | null;
  census_no?: string | null;
  prf_code?: string | null;
  sus_no?: string | null;
  type_of_hldg?: string | null;
  type_of_eqpt?: string | null;
  service_status?: string | null;
  op_status?: string | null;
  remarks?: string | null;
}

export function SearchRegnNo() {
  const [regnNo, setRegnNo] = useState("");
  const [censusNo, setCensusNo] = useState("");
  const [prfCode, setPrfCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<RegnRecord[]>([]);

  const handleSearch = async () => {
    if (!regnNo) return toast.error("Regn No is required");
    setBusy(true);
    try {
      const rows = await api<RegnRecord[]>("/admin/search-regn-no/search", {
        method: "POST",
        body: JSON.stringify({
          regn_no: regnNo,
          census_no: censusNo || null,
          prf_code: prfCode || null,
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
    <FormPanel
      title="Regn No : Search"
      footer={
        <>
          <Button
            disabled={busy}
            className="bg-primary hover:bg-primary/90"
            onClick={() => void handleSearch()}
          >
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setRegnNo("");
              setCensusNo("");
              setPrfCode("");
              setResults([]);
            }}
          >
            Clear
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-4xl space-y-4 pt-2">
        <FormRow label="Regn No" required>
          <Input
            placeholder="e.g. REGN-2000"
            value={regnNo}
            onChange={(e) => setRegnNo(e.target.value)}
          />
        </FormRow>
        <FormGrid>
          <FormRow label="Census No">
            <Input
              placeholder="Census No"
              value={censusNo}
              onChange={(e) => setCensusNo(e.target.value)}
            />
          </FormRow>
          <FormRow label="PRF Code">
            <Input
              placeholder="PRF Code"
              value={prfCode}
              onChange={(e) => setPrfCode(e.target.value)}
            />
          </FormRow>
        </FormGrid>

        {results.length > 0 && (
          <div className="overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regn No</TableHead>
                  <TableHead>Census</TableHead>
                  <TableHead>PRF</TableHead>
                  <TableHead>SUS</TableHead>
                  <TableHead>Holding</TableHead>
                  <TableHead>Eqpt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.eqpt_regn_no}</TableCell>
                    <TableCell>{r.census_no}</TableCell>
                    <TableCell>{r.prf_code}</TableCell>
                    <TableCell>{r.sus_no}</TableCell>
                    <TableCell>{r.type_of_hldg}</TableCell>
                    <TableCell>{r.type_of_eqpt}</TableCell>
                    <TableCell>{r.service_status ?? r.op_status}</TableCell>
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
