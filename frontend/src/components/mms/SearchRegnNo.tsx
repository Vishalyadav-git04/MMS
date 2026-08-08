import { useEffect, useRef, useState } from "react";
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
  sus_no?: string | null;
  type_of_hldg?: string | null;
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

export function SearchRegnNo() {
  const [regnNo, setRegnNo] = useState("");
  const [censusNo, setCensusNo] = useState("");
  const [prfCode, setPrfCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<RegnRecord[]>([]);
  const [serviceOpts, setServiceOpts] = useState<Option[]>([]);
  const [editRow, setEditRow] = useState<RegnRecord | null>(null);
  const [editRegnNo, setEditRegnNo] = useState("");
  const [editServiceStatus, setEditServiceStatus] = useState("");
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
      const first = rows[0];
      if (first) {
        setCensusNo(first.census_no || "");
        setPrfCode(first.prf_code || "");
        lastLookupRef.current = (first.eqpt_regn_no || regnNo).trim().toUpperCase();
      }
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      setResults([]);
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
    } else if (editRow.service_status) {
      setEditServiceStatus(editRow.service_status);
    }
  }, [editRow, serviceOpts]);

  const openEdit = (row: RegnRecord) => {
    setEditRow(row);
    setEditRegnNo(row.eqpt_regn_no || "");
    const rawVal = (row.service_status || "").trim().toUpperCase();
    const rawLbl = (row.service_status_label || "").trim().toUpperCase();
    const match = serviceOpts.find(
      (o) =>
        o.value.trim().toUpperCase() === rawVal ||
        o.value.trim().toUpperCase() === rawLbl ||
        o.label.trim().toUpperCase() === rawLbl ||
        o.label.trim().toUpperCase() === rawVal,
    );
    setEditServiceStatus(match ? match.value : row.service_status || "");
  };

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
            census_no: null,
            prf_code: null,
          }),
        });
        setResults(rows);
        const first = rows[0];
        if (first) {
          setCensusNo(first.census_no || "");
          setPrfCode(first.prf_code || "");
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

  return (
    <>
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
                lastLookupRef.current = "";
              }}
            >
              Clear
            </Button>
          </>
        }
      >
        <div className="mx-auto max-w-5xl space-y-4 pt-2">
          <FormRow label="Regn No" required>
            <Input
              placeholder="e.g. REGN-2000"
              value={regnNo}
              onChange={(e) => setRegnNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
            />
          </FormRow>
          <FormGrid>
            <FormRow label="Census No">
              <Input
                placeholder="Census No"
                value={censusNo}
                disabled
                tabIndex={-1}
              />
            </FormRow>
            <FormRow label="PRF Code">
              <Input
                placeholder="PRF Code"
                value={prfCode}
                disabled
                tabIndex={-1}
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
                    <TableHead>Serviceability</TableHead>
                    <TableHead className="w-[90px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={rowKey(r)}>
                      <TableCell>{r.eqpt_regn_no}</TableCell>
                      <TableCell>{r.census_no}</TableCell>
                      <TableCell>{r.prf_code}</TableCell>
                      <TableCell>{r.sus_no}</TableCell>
                      <TableCell>{r.type_of_hldg}</TableCell>
                      <TableCell>
                        {r.service_status_label ?? r.service_status ?? r.op_status}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="h-3 w-3" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Regn No / Serviceability</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
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
                onChange={(e) => setEditRegnNo(e.target.value)}
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
              disabled={updating}
              onClick={() => setEditRow(null)}
            >
              Cancel
            </Button>
            <Button disabled={updating} onClick={() => void handleUpdate()}>
              {updating ? "Updating…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
