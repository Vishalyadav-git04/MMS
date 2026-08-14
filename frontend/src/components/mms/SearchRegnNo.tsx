import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

interface Option {
  value: string;
  label: string;
}

interface RegnRecord {
  id: number | string;
  source_table: string;
  source_label: string;
  eqpt_regn_no?: string | null;
  census_no?: string | null;
  prf_code?: string | null;
  prf_group?: string | null;
  nomenclature?: string | null;
  sus_no?: string | null;
  type_of_hldg?: string | null;
  type_of_hldg_label?: string | null;
  type_of_eqpt?: string | null;
  service_status?: string | null;
  service_status_label?: string | null;
  op_status?: string | null;
  remarks?: string | null;
}

interface LookupOut {
  eqpt_regn_no?: string | null;
  census_no?: string | null;
  prf_code?: string | null;
}

function rowKey(r: RegnRecord) {
  return `${r.source_table}:${r.id}`;
}

const PAGE_SIZE = 10;

export function SearchRegnNo() {
  const [regnNo, setRegnNo] = useState("");
  const [censusNo, setCensusNo] = useState("");
  const [prfCode, setPrfCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<RegnRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [serviceOpts, setServiceOpts] = useState<Option[]>([]);
  const [editRow, setEditRow] = useState<RegnRecord | null>(null);
  const [editRegnNo, setEditRegnNo] = useState("");
  const [editServiceStatus, setEditServiceStatus] = useState("");
  const [initialRegnNo, setInitialRegnNo] = useState("");
  const [initialServiceStatus, setInitialServiceStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const lastLookupRef = useRef("");

  useEffect(() => {
    void api<{ service_status: Option[] }>("/admin/search-regn-no/options")
      .then((res) => setServiceOpts(res.service_status ?? []))
      .catch(() => toast.error("Failed to load serviceability options"));
  }, []);

  const handleSearch = async () => {
    if (!regnNo.trim()) return toast.error("Regn No is required");
    setBusy(true);
    try {
      const rows = await api<RegnRecord[]>("/admin/search-regn-no/search", {
        method: "POST",
        body: JSON.stringify({
          regn_no: regnNo.trim(),
          census_no: censusNo.trim() || null,
          prf_code: prfCode.trim() || null,
        }),
      });
      setResults(rows);
      setCurrentPage(1);
      const first = rows[0];
      if (first) {
        lastLookupRef.current = (first.eqpt_regn_no || regnNo).trim().toUpperCase();
      }
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
      setCurrentPage(1);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!editRow) return;
    const rawVal = (editRow.service_status || "").trim().toUpperCase();
    const rawLbl = (editRow.service_status_label || "").trim().toUpperCase();
    const match = serviceOpts.find(
      (o) =>
        o.value.trim().toUpperCase() === rawVal ||
        o.value.trim().toUpperCase() === rawLbl ||
        o.label.trim().toUpperCase() === rawLbl ||
        o.label.trim().toUpperCase() === rawVal,
    );
    if (match) {
      setEditServiceStatus(match.value);
      setInitialServiceStatus(match.value);
    } else if (editRow.service_status) {
      setEditServiceStatus(editRow.service_status);
      setInitialServiceStatus(editRow.service_status);
    }
  }, [editRow, serviceOpts]);

  const openEdit = (row: RegnRecord) => {
    setEditRow(row);
    setEditRegnNo(row.eqpt_regn_no || "");
    setInitialRegnNo(row.eqpt_regn_no || "");
    const rawVal = (row.service_status || "").trim().toUpperCase();
    const rawLbl = (row.service_status_label || "").trim().toUpperCase();
    const match = serviceOpts.find(
      (o) =>
        o.value.trim().toUpperCase() === rawVal ||
        o.value.trim().toUpperCase() === rawLbl ||
        o.label.trim().toUpperCase() === rawLbl ||
        o.label.trim().toUpperCase() === rawVal,
    );
    const initialStatus = match ? match.value : row.service_status || "";
    setEditServiceStatus(initialStatus);
    setInitialServiceStatus(initialStatus);
  };

  const hasEditChanges =
    editRegnNo.trim() !== initialRegnNo.trim() || editServiceStatus !== initialServiceStatus;

  const handleUpdate = async () => {
    if (!editRow) return;
    if (!editRegnNo.trim()) {
      toast.error("Regn No is required");
      return;
    }
    if (!editServiceStatus) {
      toast.error("Please select Serviceability");
      return;
    }
    setUpdating(true);
    try {
      await api("/admin/search-regn-no/update", {
        method: "PUT",
        body: JSON.stringify({
          id: editRow.id,
          source_table: editRow.source_table,
          eqpt_regn_no: editRegnNo.trim(),
          service_status: editServiceStatus,
        }),
      });
      toast.success("Registration details updated");
      setEditRow(null);
      const searchKey = editRegnNo.trim();
      setRegnNo(searchKey);
      lastLookupRef.current = "";
      setBusy(true);
      try {
        const rows = await api<RegnRecord[]>("/admin/search-regn-no/search", {
          method: "POST",
          body: JSON.stringify({
            regn_no: searchKey,
            census_no: censusNo.trim() || null,
            prf_code: prfCode.trim() || null,
          }),
        });
        setResults(rows);
        const first = rows[0];
        if (first) {
          lastLookupRef.current = searchKey.toUpperCase();
        }
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = Math.ceil(results.length / PAGE_SIZE) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, currentPage]);

  return (
    <>
      <FormPanel
        title="Regn No : Search"
        footer={
          <>
            <Button
              type="button"
              disabled={busy}
              className="bg-primary hover:bg-primary/90 font-semibold"
              onClick={() => void handleSearch()}
            >
              {busy ? "Searching…" : "Search"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setRegnNo("");
                setCensusNo("");
                setPrfCode("");
                setResults([]);
                setCurrentPage(1);
                lastLookupRef.current = "";
                toast.info("Search fields cleared");
              }}
            >
              Clear
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 w-full pt-1">
          <FormRow label="Regn No" required className="sm:grid-cols-[120px_minmax(0,1fr)]">
            <Input
              placeholder="e.g. REGN-2000"
              value={regnNo}
              onChange={(e) => setRegnNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
            />
          </FormRow>

          {results.length > 0 && (
            <div className="overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Regn No</TableHead>
                    <TableHead>Census</TableHead>
                    <TableHead>Nomenclature</TableHead>
                    <TableHead>SUS</TableHead>
                    <TableHead>Holding</TableHead>
                    <TableHead>Serviceability</TableHead>
                    <TableHead className="w-[90px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResults.map((r) => (
                    <TableRow key={rowKey(r)}>
                      <TableCell>{r.eqpt_regn_no || "-"}</TableCell>
                      <TableCell>{r.census_no || "-"}</TableCell>
                      <TableCell>{r.nomenclature || "-"}</TableCell>
                      <TableCell>{r.sus_no || "-"}</TableCell>
                      <TableCell>{r.type_of_hldg_label || r.type_of_hldg || "-"}</TableCell>
                      <TableCell>
                        {r.service_status_label ?? r.service_status ?? r.op_status ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(r)}
                          aria-label="Update"
                          title="Update"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20 text-xs">
                <div className="text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, results.length)} to{" "}
                  {Math.min(currentPage * PAGE_SIZE, results.length)} of {results.length} records
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </FormPanel>

      <Dialog
        open={!!editRow}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Update Regn No / Serviceability</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            <FormRow label="Census No">
              <Input
                value={editRow?.census_no || ""}
                disabled
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed select-none"
              />
            </FormRow>
            <FormRow label="Regn No" required>
              <Input
                value={editRegnNo}
                onChange={(e) => setEditRegnNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
                maxLength={25}
                placeholder="Registration No"
              />
            </FormRow>
            <FormRow label="Serviceability" required>
              <Select
                value={editServiceStatus || undefined}
                onValueChange={setEditServiceStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="--Select--" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOpts.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={updating || !hasEditChanges}
              onClick={() => {
                setEditRegnNo(initialRegnNo);
                setEditServiceStatus(initialServiceStatus);
              }}
            >
              Clear
            </Button>
            <Button disabled={updating || !hasEditChanges} onClick={() => void handleUpdate()}>
              {updating ? "Updating…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
