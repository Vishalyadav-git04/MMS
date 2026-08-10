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
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = results.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, results.length);
  const pageRows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleClear = () => {
    setEqptCat("");
    setResults([]);
    setPage(1);
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
      setPage(1);
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
      <div className="w-full space-y-3">
        <FormRow label="EQPT CAT" required>
          <Input
            value={eqptCat}
            onChange={(e) =>
              setEqptCat(e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, ""))
            }
            placeholder="Enter EQPT CAT"
            disabled={busy}
            className="w-full"
          />
        </FormRow>

        {results.length > 0 && (
          <div className="rounded-md border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground">Domain ID</TableHead>
                    <TableHead className="text-primary-foreground">EQPT CAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.domain_id ?? r.id}>
                      <TableCell className="text-xs">{r.domain_id}</TableCell>
                      <TableCell className="text-xs">{r.eqpt_cat}</TableCell>
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
                  variant="outline"
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
