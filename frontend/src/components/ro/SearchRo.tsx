import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

const emptyForm = {
  susNo: "",
  unitName: "",
  depotSusNo: "",
  depotName: "",
  command: "",
  corps: "",
  lineDte: "",
  from: "",
  to: "",
  status: "Not Yet Collected",
};

export function SearchRo() {
  const [form, setForm] = useState(emptyForm);

  const upd = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm({ ...form, [k]: v });

  const handleClear = () => setForm(emptyForm);

  return (
    <FormPanel
      title="SEARCH RELEASE ORDER"
      footer={
        <>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button
            onClick={() => {
              if (pageHasInvalidDateInputs()) {
                return toast.error("Please enter a valid date (dd/mm/yyyy)");
              }
              if (!form.from || !form.status) {
                return toast.error("From date and Status are required");
              }
              toast.success("Searching Release Orders...");
            }}
          >
            Search
          </Button>
        </>
      }
    >
      <FormGrid>
        <FormRow label="SUS No">
          <Input value={form.susNo} onChange={(e) => upd("susNo", e.target.value)} />
        </FormRow>
        <FormRow label="Unit Name">
          <Textarea
            rows={2}
            value={form.unitName}
            onChange={(e) => upd("unitName", e.target.value)}
          />
        </FormRow>
        <FormRow label="Depot SUS No">
          <Input
            value={form.depotSusNo}
            onChange={(e) => upd("depotSusNo", e.target.value)}
          />
        </FormRow>
        <FormRow label="Depot Name">
          <Textarea
            rows={2}
            value={form.depotName}
            onChange={(e) => upd("depotName", e.target.value)}
          />
        </FormRow>
        <FormRow label="Command">
          <Select value={form.command} onValueChange={(v) => upd("command", v)}>
            <SelectTrigger>
              <SelectValue placeholder="--Select--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Northern">Northern</SelectItem>
              <SelectItem value="Western">Western</SelectItem>
              <SelectItem value="Eastern">Eastern</SelectItem>
              <SelectItem value="Southern">Southern</SelectItem>
              <SelectItem value="Central">Central</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Corps">
          <Select value={form.corps} onValueChange={(v) => upd("corps", v)}>
            <SelectTrigger>
              <SelectValue placeholder="--Select--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I Corps">I Corps</SelectItem>
              <SelectItem value="II Corps">II Corps</SelectItem>
              <SelectItem value="IX Corps">IX Corps</SelectItem>
              <SelectItem value="XIV Corps">XIV Corps</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Line Dte">
          <Select value={form.lineDte} onValueChange={(v) => upd("lineDte", v)}>
            <SelectTrigger>
              <SelectValue placeholder="--Select--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DGOS">DGOS</SelectItem>
              <SelectItem value="DGAS">DGAS</SelectItem>
              <SelectItem value="DGEME">DGEME</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
        <div />
        <FormRow label="From" required>
          <DateInput value={form.from} onChange={(v) => upd("from", v)} />
        </FormRow>
        <FormRow label="To">
          <DateInput value={form.to} onChange={(v) => upd("to", v)} />
        </FormRow>
        <FormRow label="Status" required>
          <Select value={form.status} onValueChange={(v) => upd("status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="--Select--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Not Yet Collected">Not Yet Collected</SelectItem>
              <SelectItem value="Partially Collected">Partially Collected</SelectItem>
              <SelectItem value="Fully Collected">Fully Collected</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
      </FormGrid>
    </FormPanel>
  );
}
