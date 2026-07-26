import { useEffect, useState } from "react";
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
import { Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

interface EpDomainRow {
  id: string;
  domain_id: number;
  eqpt_cat: string;
}

interface EpSubDomainRow {
  id: string;
  equipment_domain_id: string;
  sub_domain_id: number;
  sub_domain_name: string;
  eqpt_cat?: string | null;
  created_by?: string | null;
}

export function SubDomainMaster() {
  const [domains, setDomains] = useState<EpDomainRow[]>([]);
  const [eqptCatId, setEqptCatId] = useState("");
  const [subDomain, setSubDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<EpSubDomainRow[]>([]);

  useEffect(() => {
    api<EpDomainRow[]>("/ep/domain-master/")
      .then(setDomains)
      .catch(() => toast.error("Failed to load EQPT CAT list"));
  }, []);

  const handleClear = () => {
    setEqptCatId("");
    setSubDomain("");
    setResults([]);
  };

  const handleSave = async () => {
    const name = subDomain.trim();
    if (!eqptCatId || !name) {
      toast.error("EQPT CAT and Sub Domain Name are required");
      return;
    }
    setBusy(true);
    try {
      await api<EpSubDomainRow>("/ep/sub-domain-master/", {
        method: "POST",
        body: JSON.stringify({
          equipment_domain_id: eqptCatId,
          sub_domain_name: name,
        }),
      });
      toast.success("Sub domain saved");
      setSubDomain("");
      const params = new URLSearchParams();
      if (eqptCatId) params.set("equipment_domain_id", eqptCatId);
      const q = params.toString() ? `?${params.toString()}` : "";
      const rows = await api<EpSubDomainRow[]>(`/ep/sub-domain-master/search${q}`);
      setResults(rows);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (eqptCatId) params.set("equipment_domain_id", eqptCatId);
      if (subDomain.trim()) params.set("sub_domain_name", subDomain.trim());
      const q = params.toString() ? `?${params.toString()}` : "";
      const rows = await api<EpSubDomainRow[]>(`/ep/sub-domain-master/search${q}`);
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
      title="SUB DOMAIN MASTER"
      fill
      footer={
        <>
          <Button disabled={busy} onClick={() => void handleSave()}>
            Save
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={busy}
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button disabled={busy} onClick={() => void handleSearch()}>
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="text-center text-sm font-bold uppercase tracking-wide text-foreground">
          ADD
        </div>
        <FormGrid>
          <FormRow label="EQPT CAT(Domain Name)" required>
            <Select
              value={eqptCatId}
              onValueChange={setEqptCatId}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.eqpt_cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Sub Domain Name" required>
            <Input
              value={subDomain}
              onChange={(e) => setSubDomain(e.target.value)}
              placeholder="Enter Sub Domain"
              disabled={busy}
            />
          </FormRow>
        </FormGrid>

        {results.length > 0 && (
          <div className="overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground">ID</TableHead>
                  <TableHead className="text-primary-foreground">EQPT CAT</TableHead>
                  <TableHead className="text-primary-foreground">Sub Domain ID</TableHead>
                  <TableHead className="text-primary-foreground">Sub Domain Name</TableHead>
                  <TableHead className="text-primary-foreground">Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.id}</TableCell>
                    <TableCell className="text-xs">{r.eqpt_cat}</TableCell>
                    <TableCell className="text-xs">{r.sub_domain_id}</TableCell>
                    <TableCell className="text-xs">{r.sub_domain_name}</TableCell>
                    <TableCell className="text-xs">{r.created_by}</TableCell>
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
