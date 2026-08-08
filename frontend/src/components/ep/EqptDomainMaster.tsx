import { useState } from "react";
import { FormPanel, FormRow } from "@/components/FormPanel";
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

interface EpDomainRow {
  id: number | string;
  domain_id: number | string;
  eqpt_cat: string;
  created_by?: string | null;
}

export function EqptDomainMaster() {
  const [eqptCat, setEqptCat] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<EpDomainRow[]>([]);

  const handleClear = () => {
    setEqptCat("");
    setResults([]);
  };

  const handleSave = async () => {
    const cat = eqptCat.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, "");
    if (!cat) {
      toast.error("EQPT CAT is required");
      return;
    }
    setBusy(true);
    try {
      await api<EpDomainRow>("/ep/domain-master/", {
        method: "POST",
        body: JSON.stringify({ eqpt_cat: cat }),
      });
      toast.success("Domain saved");
      setEqptCat("");
      setResults([]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = async () => {
    setBusy(true);
    try {
      // Empty filter → list all domains from MMS_EP_DOMAIN_MASTER
      const q = eqptCat.trim()
        ? `?eqpt_cat=${encodeURIComponent(eqptCat.trim().toUpperCase())}`
        : "";
      const rows = await api<EpDomainRow[]>(
        q ? `/ep/domain-master/search${q}` : "/ep/domain-master/",
      );
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
      title="EQPT DOMAIN MASTER"
      footer={
        <>
          <Button disabled={busy} onClick={() => void handleSave()}>
            Save
          </Button>
          <Button variant="secondary" disabled={busy} onClick={handleClear}>
            Clear
          </Button>
          <Button disabled={busy} onClick={() => void handleSearch()}>
            Search
          </Button>
        </>
      }
    >
      <div className="max-w-3xl mx-auto space-y-3">
        <FormRow label="EQPT CAT" required>
          <Input
            value={eqptCat}
            onChange={(e) =>
              setEqptCat(e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, ""))
            }
            placeholder="Enter EQPT CAT"
            disabled={busy}
          />
        </FormRow>

        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground">ID</TableHead>
                  <TableHead className="text-primary-foreground">Domain ID</TableHead>
                  <TableHead className="text-primary-foreground">EQPT CAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.id}</TableCell>
                    <TableCell className="text-xs">{r.domain_id}</TableCell>
                    <TableCell className="text-xs">{r.eqpt_cat}</TableCell>
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
