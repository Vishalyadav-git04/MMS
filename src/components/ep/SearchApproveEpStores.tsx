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
import { toast } from "sonner";

export function SearchApproveEpStores() {
  const [form, setForm] = useState({
    susNo: "",
    unitName: "",
    from: "2026-07-01",
    to: "2026-07-24",
    status: "",
  });

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm({ ...form, [k]: v });

  const handleClear = () =>
    setForm({
      susNo: "",
      unitName: "",
      from: "2026-07-01",
      to: "2026-07-24",
      status: "",
    });

  return (
    <FormPanel
      title="SEARCH DETAILS OF EP STORES"
      footer={
        <>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => {
              if (!form.susNo.trim() || !form.unitName.trim() || !form.status) {
                return toast.error("SUS No, Unit's Name and Status are required");
              }
              toast.success("Searching EP Stores...");
            }}
          >
            Search
          </Button>
        </>
      }
    >
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
        <FormRow label="From">
          <Input
            type="date"
            value={form.from}
            onChange={(e) => upd("from", e.target.value)}
          />
        </FormRow>
        <FormRow label="To">
          <Input
            type="date"
            value={form.to}
            onChange={(e) => upd("to", e.target.value)}
          />
        </FormRow>
        <FormRow label="Status" required>
          <Select value={form.status} onValueChange={(v) => upd("status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="--Select the Value--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="All">All</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
      </FormGrid>
    </FormPanel>
  );
}
