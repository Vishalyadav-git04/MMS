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
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = results.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, results.length);
  const pageRows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    setPage(1);
  };

  const handleSave = async () => {
    const name = subDomain.trim().toUpperCase().replace(/[^A-Z0-9\s\-/&]/g, "");
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
      setPage(1);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = async (overrideEqptCatId?: string) => {
    const selectedCatId = overrideEqptCatId !== undefined ? overrideEqptCatId : eqptCatId;
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (selectedCatId) params.set("equipment_domain_id", selectedCatId);
      if (subDomain.trim())
        params.set(
          "sub_domain_name",
          subDomain.trim().toUpperCase().replace(/[^A-Z0-9\s\-/&]/g, ""),
        );
      const q = params.toString() ? `?${params.toString()}` : "";
      const rows = await api<EpSubDomainRow[]>(`/ep/sub-domain-master/search${q}`);
      setResults(rows);
      setPage(1);
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
      setPage(1);
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
          <Button disabled={busy || !eqptCatId || !subDomain.trim()} onClick={() => void handleSave()}>
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
      <div className="w-full flex flex-col gap-3">
        <FormGrid style={{ gridTemplateColumns: "280px 1fr" }}>
          <FormRow label="EQPT CAT" required>
            <Select
              value={eqptCatId || "__all__"}
              onValueChange={(v) => {
                const nextId = v === "__all__" ? "" : v;
                setEqptCatId(nextId);
                void handleSearch(nextId);
              }}
              disabled={busy}
              onOpenChange={(open) => {
                if (open) loadDomains();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- ALL --" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__all__">-- ALL --</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d.domain_id} value={String(d.domain_id)}>
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
                setSubDomain(e.target.value.toUpperCase().replace(/[^A-Z0-9\s\-/&]/g, ""))
              }
              placeholder="Enter Sub Domain"
              disabled={busy}
              className="w-full"
            />
          </FormRow>
        </FormGrid>

        {results.length > 0 && (
          <div className="rounded-md border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground">EQPT CAT</TableHead>
                    <TableHead className="text-primary-foreground">Sub Domain ID</TableHead>
                    <TableHead className="text-primary-foreground">Sub Domain Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.sub_domain_id ?? r.id}>
                      <TableCell className="text-xs">{r.eqpt_cat}</TableCell>
                      <TableCell className="text-xs">{r.sub_domain_id}</TableCell>
                      <TableCell className="text-xs">{r.sub_domain_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <div>
                Showing {pageStart} to {pageEnd} of {results.length} record(s)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7.5 px-3 text-xs rounded-md"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="px-2 text-xs font-semibold text-foreground/80">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-7.5 px-3 text-xs rounded-md"
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
  );
}
