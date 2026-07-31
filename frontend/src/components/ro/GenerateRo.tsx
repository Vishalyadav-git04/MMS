import { useState, type ReactNode } from "react";
import { FormPanel, FormRow } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

const emptyForm = {
  typeOfRo: "",
  prf: "",
  depoSearch: "",
  roNo: "",
  fileNo: "",
  armService: "",
  forceType: "",
  comd: "",
  corps: "",
  div: "",
  bde: "",
  unitName: "",
  remarks: "",
};

function SelectField({
  value,
  onChange,
  options,
  placeholder = "--Select--",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DetailBox({
  title,
  children,
  toolbar,
}: {
  title: string;
  children?: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div className="flex min-h-[180px] flex-col overflow-hidden rounded border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-destructive/10 px-3 py-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-destructive">
          {title}
        </span>
        {toolbar}
      </div>
      <div className="flex-1 overflow-auto bg-card p-0">{children}</div>
    </div>
  );
}

export function GenerateRo() {
  const [form, setForm] = useState(emptyForm);

  const upd = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm({ ...form, [k]: v });

  const handleClear = () => setForm(emptyForm);

  const handleSubmit = () => {
    if (!form.typeOfRo || !form.prf || !form.roNo || !form.fileNo || !form.unitName) {
      return toast.error("Please fill all required fields");
    }
    toast.success("RO details submitted");
  };

  return (
    <FormPanel title="MMS RO GENERATION" fill>
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_minmax(220px,0.9fr)]">
          <div className="space-y-2">
            <FormRow label="Type of RO" required>
              <SelectField
                value={form.typeOfRo}
                onChange={(v) => upd("typeOfRo", v)}
                options={["Fresh Issue", "Replacement", "Loan"]}
              />
            </FormRow>
            <FormRow label="RO No" required>
              <Input value={form.roNo} onChange={(e) => upd("roNo", e.target.value)} />
            </FormRow>
            <FormRow label="File NO" required>
              <Input value={form.fileNo} onChange={(e) => upd("fileNo", e.target.value)} />
            </FormRow>
          </div>
          <div>
            <FormRow label="PRF" required>
              <SelectField
                value={form.prf}
                onChange={(v) => upd("prf", v)}
                options={["Group A", "Group B", "Group C"]}
                placeholder="Select PRF Groups"
              />
            </FormRow>
          </div>
          <DetailBox
            title="DEPO Detail"
            toolbar={
              <Input
                className="h-7 max-w-[160px] bg-card"
                placeholder="Search Depo"
                value={form.depoSearch}
                onChange={(e) => upd("depoSearch", e.target.value)}
              />
            }
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FormRow label="Arm/Service">
            <SelectField
              value={form.armService}
              onChange={(v) => upd("armService", v)}
              options={["Infantry", "Armoured", "Artillery", "ASC"]}
            />
          </FormRow>
          <FormRow label="Force Type">
            <SelectField
              value={form.forceType}
              onChange={(v) => upd("forceType", v)}
              options={["Regular", "TA", "RR"]}
            />
          </FormRow>
          <FormRow label="Comd">
            <SelectField
              value={form.comd}
              onChange={(v) => upd("comd", v)}
              options={["Northern", "Western", "Eastern", "Southern", "Central"]}
              placeholder="Select Comd"
            />
          </FormRow>
          <FormRow label="Corps">
            <SelectField
              value={form.corps}
              onChange={(v) => upd("corps", v)}
              options={["I Corps", "II Corps", "IX Corps", "XIV Corps"]}
              placeholder="Select Corps"
            />
          </FormRow>
          <FormRow label="Div">
            <SelectField
              value={form.div}
              onChange={(v) => upd("div", v)}
              options={["Div 1", "Div 2", "Div 3"]}
              placeholder="Select Div"
            />
          </FormRow>
          <FormRow label="Bde">
            <SelectField
              value={form.bde}
              onChange={(v) => upd("bde", v)}
              options={["Bde 1", "Bde 2", "Bde 3"]}
              placeholder="Select bde"
            />
          </FormRow>
          <FormRow label="Unit Name" required className="sm:col-span-2">
            <SelectField
              value={form.unitName}
              onChange={(v) => upd("unitName", v)}
              options={["Unit Alpha", "Unit Bravo", "Unit Charlie"]}
              placeholder="Select Units"
            />
          </FormRow>
        </div>

        <div className="flex flex-wrap justify-center gap-2 border-y border-border bg-muted/40 py-2">
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <DetailBox title="DEPO Detail" />
          <DetailBox title="UNIT Detail">
            <Table>
              <TableHeader>
                <TableRow className="bg-destructive/10 hover:bg-destructive/10">
                  {["Unit Name", "ITEM", "UE", "UH", "DEFI", "SURP", "ISSUE QTY"].map((h) => (
                    <TableHead key={h} className="h-8 px-2 text-[12px] font-bold text-destructive">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                    —
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DetailBox>
        </div>

        <FormRow label="Remarks If Any">
          <Textarea
            rows={2}
            value={form.remarks}
            onChange={(e) => upd("remarks", e.target.value)}
            placeholder="Enter remarks..."
          />
        </FormRow>

        <div className="flex justify-center border-y border-border bg-muted/40 py-2">
          <Button
            className="min-w-[220px]"
            onClick={() => toast.success("Preview & Generate RO")}
          >
            PREVIEW &amp; GENERATE RO
          </Button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-end text-xs font-semibold text-foreground">
            Total Count : 0
          </div>
          <div className="overflow-hidden rounded border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-destructive/10 hover:bg-destructive/10">
                  {[
                    "Sr No",
                    "RO NO",
                    "Depots Name",
                    "RO Qty",
                    "Issued Qty",
                    "Yet to Collect",
                    "Issue Date",
                    "Action",
                  ].map((h) => (
                    <TableHead key={h} className="h-8 px-2 text-[12px] font-bold text-destructive">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-16 text-center text-sm font-semibold text-destructive"
                  >
                    Data Not Available
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </FormPanel>
  );
}
