import { useEffect, useState } from "react";
import { FormPanel, FormRow } from "@/components/FormPanel";
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

interface EpDomainRow {
  id: number | string;
  domain_id: number | string;
  eqpt_cat: string;
}

interface EpSubDomainRow {
  id: number | string;
  equipment_domain_id: number | string;
  sub_domain_id: number | string;
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

  const loadDomains = () => {
    api<EpDomainRow[]>("/ep/domain-master/")
      .then((rows) =>
        setDomains(
          [...rows].sort((a, b) =>
            a.eqpt_cat.localeCompare(b.eqpt_cat, undefined, { sensitivity: "base" }),
          ),
        ),
      )
      .catch(() => toast.error("Failed to load EQPT CAT list"));
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleClear = () => {
    setEqptCatId("");
    setSubDomain("");
    setResults([]);
  };

  const handleSave = async () => {
    const name = subDomain.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, "");
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
      const params = new URLSearchParams();
      if (eqptCatId) params.set("equipment_domain_id", eqptCatId);
      if (subDomain.trim())
        params.set(
          "sub_domain_name",
          subDomain.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, ""),
        );
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
      <div className="max-w-3xl mx-auto space-y-1.5">
        <FormRow label="EQPT CAT(Domain Name)" required>
          <Select
            value={eqptCatId || "__all__"}
            onValueChange={(v) => setEqptCatId(v === "__all__" ? "" : v)}
            disabled={busy}
            onOpenChange={(open) => {
              if (open) loadDomains();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="-- ALL --" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__all__">-- ALL --</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.eqpt_cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Sub Domain Name" required>
          <Input
            value={subDomain}
            onChange={(e) =>
              setSubDomain(e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, ""))
            }
            placeholder="Enter Sub Domain"
            disabled={busy}
          />
        </FormRow>

        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground">ID</TableHead>
                  <TableHead className="text-primary-foreground">EQPT CAT</TableHead>
                  <TableHead className="text-primary-foreground">Sub Domain ID</TableHead>
                  <TableHead className="text-primary-foreground">Sub Domain Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.id}</TableCell>
                    <TableCell className="text-xs">{r.eqpt_cat}</TableCell>
                    <TableCell className="text-xs">{r.sub_domain_id}</TableCell>
                    <TableCell className="text-xs">{r.sub_domain_name}</TableCell>
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
