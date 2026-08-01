import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

interface NewEqptRow {
  id: string;
  ivNo: string;
  ivDate: string;
  unitName: string;
  susNo: string;
  materialNo: string;
  censusNo: string;
  issuedQty: string;
  status: string;
}

const emptyForm = {
  susNo: "",
  unitName: "",
  from: "2026-07-01",
  to: "2026-07-24",
  status: "",
};

export function ApproveNewEqpt() {
  const [form, setForm] = useState(emptyForm);
  const [results, setResults] = useState<NewEqptRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const upd = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleClear = () => {
    setForm(emptyForm);
    setResults([]);
    setSelected(new Set());
  };

  const handleSearch = () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!form.susNo.trim() || !form.unitName.trim() || !form.from || !form.status) {
      toast.error("SUS No, Unit's Name, From and Status are required");
      return;
    }
    // UI placeholder — sample rows until backend is wired
    setResults([
      {
        id: "1",
        ivNo: "IV-2026-001",
        ivDate: form.from,
        unitName: form.unitName,
        susNo: form.susNo,
        materialNo: "MAT-1001",
        censusNo: "CN-88421",
        issuedQty: "2",
        status: form.status,
      },
    ]);
    setSelected(new Set());
    toast.message("Search — functionality coming soon");
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const pendingRows = results.filter((r) => r.status === "Pending");

  const handleApprove = () => {
    if (!selected.size) {
      toast.error("Select record(s) to approve");
      return;
    }
    toast.message("Approve — functionality coming soon");
  };

  return (
    <FormPanel
      title="SEARCH DETAILS OF NEW EQPT"
      footer={
        <>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={handleSearch}
          >
            Search
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            Cancel
          </Button>
          {pendingRows.length > 0 && (
            <Button disabled={selected.size === 0} onClick={handleApprove}>
              Approve Selected
            </Button>
          )}
        </>
      }
    >
      <div className="max-w-3xl mx-auto space-y-3">
        <FormGrid>
          <FormRow label="SUS No" required>
            <Input
              placeholder="Search..."
              value={form.susNo}
              onChange={(e) => upd("susNo", e.target.value)}
            />
          </FormRow>
          <FormRow label="Unit's Name" required>
            <Input
              placeholder="Search..."
              value={form.unitName}
              onChange={(e) => upd("unitName", e.target.value)}
            />
          </FormRow>
          <FormRow label="From" required>
            <DateInput value={form.from} onChange={(v) => upd("from", v)} />
          </FormRow>
          <FormRow label="To">
            <DateInput value={form.to} onChange={(v) => upd("to", v)} />
          </FormRow>
          <FormRow label="Status" required>
            <Select
              value={form.status || undefined}
              onValueChange={(v) => upd("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select the Value--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        </FormGrid>

        {results.length > 0 && (
          <div className="overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-10 text-primary-foreground">
                    {pendingRows.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={
                          pendingRows.length > 0 &&
                          pendingRows.every((r) => selected.has(r.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelected(new Set(pendingRows.map((r) => r.id)));
                          } else {
                            setSelected(new Set());
                          }
                        }}
                      />
                    ) : null}
                  </TableHead>
                  <TableHead className="text-primary-foreground">IV No</TableHead>
                  <TableHead className="text-primary-foreground">IV Date</TableHead>
                  <TableHead className="text-primary-foreground">SUS No</TableHead>
                  <TableHead className="text-primary-foreground">Unit</TableHead>
                  <TableHead className="text-primary-foreground">Material No</TableHead>
                  <TableHead className="text-primary-foreground">Census No</TableHead>
                  <TableHead className="text-primary-foreground">Qty</TableHead>
                  <TableHead className="text-primary-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.status === "Pending" ? (
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={(e) => toggleRow(r.id, e.target.checked)}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">{r.ivNo}</TableCell>
                    <TableCell className="text-xs">{r.ivDate}</TableCell>
                    <TableCell className="text-xs">{r.susNo}</TableCell>
                    <TableCell className="text-xs">{r.unitName}</TableCell>
                    <TableCell className="text-xs">{r.materialNo}</TableCell>
                    <TableCell className="text-xs">{r.censusNo}</TableCell>
                    <TableCell className="text-xs">{r.issuedQty}</TableCell>
                    <TableCell className="text-xs">{r.status}</TableCell>
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
